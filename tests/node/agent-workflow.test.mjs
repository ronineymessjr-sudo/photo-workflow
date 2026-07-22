import test from 'node:test';
import assert from 'node:assert/strict';
import { approveAgentRun, createAgentDraft, getAgentRun, validateAgentPlan, validatePhotographyRules } from '../../worker/src/agent/workflow.js';

function harness() {
  const records = {
    projects: [{ id: 'project-1', title: 'City portrait', style: 'cinematic', location: 'Shanghai', equipment: ['camera', '35mm', '85mm'], createdAt: '2026-07-12T00:00:00.000Z', updatedAt: '2026-07-12T00:00:00.000Z' }],
    references: [{ id: 'reference-1', projectId: 'project-1', title: 'Night portrait', validationStatus: 'reviewed', updatedAt: '2026-07-12T00:00:00.000Z' }],
    plans: [], shots: [], tasks: [], luts: [], reviews: [], messages: []
  };
  const deps = {
    env: {},
    list: async entity => records[entity] || [],
    sync: async (entity, items) => {
      for (const item of items) {
        const index = records[entity].findIndex(record => record.id === item.id);
        if (index >= 0) records[entity][index] = structuredClone(item);
        else records[entity].push(structuredClone(item));
      }
      return { ok: true };
    },
    writeMessage: async message => deps.sync('messages', [message])
  };
  return { records, deps };
}

test('draft creates only a plan draft and messages', async () => {
  const { records, deps } = harness();
  const result = await createAgentDraft('project-1', {}, deps);

  assert.equal(result.status, 'awaiting_approval');
  assert.equal(records.plans.length, 1);
  assert.equal(records.plans[0].userApproved, false);
  assert.equal(records.plans[0].agentStatus, 'awaiting_approval');
  assert.equal(records.shots.length, 0);
  assert.equal(records.tasks.length, 0);
  assert.equal(records.luts.length, 0);
  assert.equal(records.messages.length, 2);
});

test('approval writes formal child records and is idempotent', async () => {
  const { records, deps } = harness();
  const draft = await createAgentDraft('project-1', {}, deps);
  const first = await approveAgentRun(draft.run_id, null, deps);

  assert.equal(first.status, 'completed');
  assert.equal(first.idempotent, false);
  assert.equal(records.plans.length, 1);
  assert.equal(records.shots.length, 3);
  assert.equal(records.tasks.length, 3);
  assert.equal(records.luts.length, 1);

  const second = await approveAgentRun(draft.run_id, null, deps);
  assert.equal(second.idempotent, true);
  assert.equal(records.shots.length, 3);
  assert.equal(records.tasks.length, 3);
  assert.equal(records.luts.length, 1);
});

test('run lookup returns state stored in the plan record', async () => {
  const { deps } = harness();
  const draft = await createAgentDraft('project-1', {}, deps);
  const run = await getAgentRun(draft.run_id, deps);
  assert.equal(run.plan_id, draft.plan.id);
  assert.equal(run.status, 'awaiting_approval');
  assert.equal(run.schema_version, 'photoatelier.agent-plan.v1');
});

test('schema and photography gates reject broken sequences', () => {
  const plan = {
    concept: 'test', visual_direction: {}, equipment: [], tasks: [], risks: [],
    shots: [{ sequence: 2, scene: 'scene', shot_size: 'wide', focal_length: '85mm', composition: 'center', lighting: 'soft', pose: 'stand', priority: 'must', duration_minutes: 5 }]
  };
  assert.equal(validateAgentPlan(plan).valid, true);
  assert.equal(validatePhotographyRules(plan, { project: {} }).status, 'fail');
});

test('fallback agent uses compact photography knowledge from user preferences', async () => {
  const { deps } = harness();
  const result = await createAgentDraft('project-1', {
    user_preferences: {
      photography_knowledge: {
        profile: 'fresh-portrait',
        guidance: { lightingSummary: 'soft natural side light', sceneSummary: 'use a clean walking path' },
        sources: [{ id: 'obsidian:fresh-guide', title: 'Fresh portrait guide', groundingStatus: 'vault-note' }],
      },
    },
  }, deps);

  assert.match(result.plan.output.shots[1].pose, /shift weight/);
  assert.deepEqual(result.plan.output.sources.at(-1), { type: 'knowledge', id: 'obsidian:fresh-guide', grounding_status: 'vault-note' });
});
