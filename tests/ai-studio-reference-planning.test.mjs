import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createDirectorPlan, createTemplatePlan } from '../api/director-plan.mjs';
import { prepareReferenceContext } from '../api/ai-studio/reference-brief.mjs';
import { prepareCloudCandidateReferences, compileCloudCandidateRequest } from '../api/director-cloud-generation.mjs';
import { searchStudio, createStudioProposal, confirmStudioProposal } from '../api/ai-studio/service.mjs';

function sourceFixture() {
    const calls = [];
    const fetchImpl = async url => {
        calls.push(String(url));
        if (String(url).endsWith('poses.json')) return Response.json({ poses: [{ id: 'full_single_P019', no: 'P019', category: '坐姿', names: { zh: '安静坐姿测试' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P019_front.jpg' }, { angle: 'side' }] }] });
        if (String(url).endsWith('costumes.json')) return Response.json({ costumes: [{ id: 'AUT-0006', thumb: 'costume/thumbs/AUT-0006.webp', cat: 'autumn', group: 'top', color: 'brown', main: 'knit', tags: ['brown', 'knit'] }] });
        if (String(url).endsWith('faces.json')) return Response.json({ images: [{ id: 'teststyle', thumb: 'portrait/thumbs/teststyle.webp', sec: 'face', hair: 'semilong', style: '测试造型' }] });
        throw new Error('UNEXPECTED_FETCH');
    };
    return { calls, fetchImpl };
}

test('template plan and candidate compilation retain retrieved pose, processing and user clothing', async () => {
    const source = sourceFixture();
    const input = { theme: '秋日人像', scene: '公园长椅', modelDesc: '棕色针织上衣、黑色长裤', extra: '双脚着地，不交叉双腿', useReferenceLibrary: true, referenceIds: ['atlas-pose-full_single_p019'] };
    const context = await prepareReferenceContext(input, { fetchImpl: source.fetchImpl });
    const plan = createTemplatePlan(input, context);
    const request = { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell', candidate_count: 1,
        billing_mode: 'free-credit-first', brief: plan.shotList[0].description, reference_brief: input,
        reference_ids: input.referenceIds, shot_contract: plan.shotList[0].directorContract };
    const resolved = await prepareCloudCandidateReferences(request, { fetchImpl: source.fetchImpl });
    assert.deepEqual(resolved.templates.map(template => template.kind), ['pose', 'costume', 'portrait']);
    assert.equal(resolved.templates[2].section, 'face');
    const compiled = compileCloudCandidateRequest(request, resolved);
    assert.equal(plan.director.source, 'template-library-plan');
    assert.match(compiled.prompt, /atlas-pose-full_single_p019/);
    assert.match(compiled.prompt, /安静坐姿测试/);
    assert.match(compiled.prompt, /坐稳/);
    assert.match(compiled.prompt, /黑色长裤/);
    assert.match(compiled.prompt, /不交叉双腿/);
    assert.match(compiled.prompt, /feet parallel and hip-width apart/);
    assert.match(compiled.prompt, /head-to-toe/);
    assert.ok(compiled.prompt.length <= 2048);
    await assert.rejects(prepareCloudCandidateReferences({ ...request, shot_contract: { ...request.shot_contract, referenceIds: ['atlas-pose-forged'] } }, { fetchImpl: source.fetchImpl }), /UNAVAILABLE_REFERENCE/);
    await assert.rejects(prepareCloudCandidateReferences(request, { fetchImpl: async () => { throw new Error('offline'); } }), /UNAVAILABLE_REFERENCE|REFERENCE_LIBRARY_UNAVAILABLE/);
});

test('normal Director entry compiles selected live references into style and executable shot guidance', async () => {
    const source = sourceFixture();
    let submitted;
    const plan = await createDirectorPlan({
        theme: '秋日人像', style: '电影感', scene: '公园', duration: '1小时', people: '1',
        useReferenceLibrary: true, referenceIds: ['atlas-pose-full_single_p019', 'atlas-costume-aut-0006'],
    }, { baseUrl: 'https://director.test', referenceFetchImpl: source.fetchImpl, fetchImpl: async (_url, init) => {
        submitted = JSON.parse(init.body);
        return Response.json({ shot_plans: [{ shot_language: '坐姿呼吸', model_pose: '坐稳后放松肩膀', lens: '50mm', shot_size: 'FS', camera_angle: 'eye_level' }] });
    } });
    assert.equal(source.calls.length, 3);
    assert.match(submitted.brief, /atlas-pose-full_single_p019/);
    assert.match(submitted.brief, /双脚有支撑/);
    assert.match(submitted.brief, /电影感/);
    assert.doesNotMatch(submitted.brief, /never-download/);
    assert.equal(plan.aiStudio.references[0].poseNumber, 'P019');
    assert.equal(plan.aiStudio.references[0].rightsStatus, 'external_reference');
    assert.match(plan.aiStudio.references[0].externalUrl, /#pose=full_single_P019/);
    assert.equal(plan.shotList[0].description, '坐稳后放松肩膀');
});

test('normal entry rejects fabricated reference IDs before invoking the model', async () => {
    const source = sourceFixture();
    let modelCalls = 0;
    await assert.rejects(createDirectorPlan({ theme: '人像', referenceIds: ['atlas-pose-forged'] }, {
        baseUrl: 'https://director.test', referenceFetchImpl: source.fetchImpl,
        fetchImpl: async () => { modelCalls++; throw new Error('unexpected'); },
    }), /UNAVAILABLE_REFERENCE/);
    assert.equal(modelCalls, 0);
});

test('existing callers without the reference option keep their single Director request', async () => {
    let calls = 0;
    const plan = await createDirectorPlan({ theme: '自然人像' }, { baseUrl: 'https://director.test',
        referenceFetchImpl: async () => { throw new Error('unexpected source call'); },
        fetchImpl: async () => { calls++; return Response.json({ shot_plans: [{ shot_language: '环境镜头' }] }); },
    });
    assert.equal(calls, 1);
    assert.equal(plan.aiStudio, undefined);
});

test('real source IDs survive signed search, explicit proposal, and confirmation without claiming ownership', async () => {
    const source = sourceFixture();
    const env = { JWT_SECRET: 'test-signing-secret-at-least-32-characters' };
    const search = await searchStudio({ prompt: '自然坐姿、秋日棕色针织、中长发', planId: 'plan-1', expectedRevision: 1, uid: 'user-1', env, fetchImpl: source.fetchImpl });
    assert.equal(search.modelCalls, 0);
    assert.equal(search.library.count, 3);
    const id = 'atlas-pose-full_single_p019';
    assert.ok(search.selectedIds.includes(id));
    const proposal = await createStudioProposal({ searchReceipt: search.searchReceipt, selectedIds: [id], uid: 'user-1', env, fetchImpl: source.fetchImpl });
    const commit = await confirmStudioProposal({ proposalToken: proposal.proposalToken, idempotencyKey: 'test-confirm-0001', uid: 'user-1', env });
    assert.equal(commit.references[0].licenseStatus, 'external-reference');
    assert.equal(commit.references[0].poseNumber, 'P019');
    assert.match(commit.guidance.brief, /坐稳/);
    assert.equal(commit.conversation.length, 2);
    assert.equal(source.calls.length, 3);
});

test('the integrated planning page passes reference selection through its normal submit path', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const app = await readFile(new URL('../assets/ai-studio.js', import.meta.url), 'utf8');
    assert.match(html, /id="studioReferenceAuto" checked/);
    assert.match(html, /PhotoAtelierStudio\?\.augmentInput\(input\)/);
    assert.match(html, /PhotoAtelierStudio\?\.renderPlanReferences\(plan\)/);
    assert.match(app, /checkbox\.type = 'checkbox'/);
    assert.match(app, /外部来源参考/);
    assert.doesNotMatch(app, /checkbox\.checked = true/);
    assert.match(app, /PhotoAtelierWorkspaceSync\?\.sync/);
    assert.match(app, /sourceUpdatedAt|sync\.updatedAt/);
});

test('an unavailable saved intent provider asks for clarification and keeps deterministic search usable', async () => {
    const env = { POSEATLAS_ENABLED: 'false', AI_STUDIO_QUOTA: {
        idFromName: value => value, get: () => ({ fetch: async () => Response.json({ allowed: true }) }),
    } };
    const result = await searchStudio({ prompt: '帮我找参考', uid: 'user-1', env,
        intentProviderFactory: async () => { throw new Error('private provider configuration unavailable'); },
    });
    assert.equal(result.modelCalls, 0);
    assert.equal(result.status, 'needs-clarification');
    assert.doesNotMatch(JSON.stringify(result), /private provider configuration/);
});

test('the existing save entry stamps new plan revisions and refuses stale plan replacement', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const source = html.slice(html.indexOf('async function savePlan(plan){'), html.indexOf('function delPlan(id)'));
    let plans = [{ id: 'existing', title: '保留版本', revision: 2 }];
    const context = vm.createContext({
        getPlans: () => structuredClone(plans), savePlans: value => { plans = structuredClone(value); return true; },
        window: { __PHOTOATELIER_GUEST_MODE__: true }, Date,
    });
    vm.runInContext(source, context);
    await assert.rejects(context.savePlan({ id: 'existing', title: '过期修改', revision: 1 }), /方案已有更新/);
    assert.equal(plans[0].title, '保留版本');
    await context.savePlan({ id: 'existing', title: '有效修改', revision: 2 });
    assert.equal(plans[0].revision, 3);
    await context.savePlan({ id: 'new-plan', title: '新方案' });
    assert.equal(plans[0].revision, 1);
});
