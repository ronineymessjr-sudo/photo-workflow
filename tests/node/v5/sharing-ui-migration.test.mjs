import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, seedProject } from './test-helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('sharing workspace queries participants and participant removal preserves talent resources', () => {
  const fixture = createFixture(); const { project } = seedProject(fixture);
  const talent = fixture.app.catalog.saveTalentProfile({ displayName: 'Model A', consentStatus: 'granted' });
  const participant = fixture.app.sharing.assignParticipant({ projectId: project.id, role: 'model', talentProfileId: talent.id });
  assert.equal(fixture.app.queries.sharingWorkspace.get(project.id).participants.length, 1);
  fixture.app.sharing.removeParticipant(participant.id);
  assert.equal(fixture.app.queries.sharingWorkspace.get(project.id).participants.length, 0);
  assert.ok(fixture.repos.talentProfiles.get(talent.id));
});

test('crew compatibility page uses V5 sharing packets and contains no legacy people writes', () => {
  const source = fs.readFileSync(path.join(root, 'src/pages/crew.js'), 'utf8');
  assert.match(source, /queries\.sharingWorkspace\.get/);
  assert.match(source, /sharing\.assignParticipant/);
  assert.match(source, /sharing\.buildModelPacket/);
  assert.match(source, /sharing\.buildAssistantPacket/);
  assert.match(source, /sharing\.publish/);
  assert.match(source, /sharing\.revoke/);
  assert.doesNotMatch(source, /ctx\.data\.(create|update|upsert|remove)\(/);
  assert.doesNotMatch(source, /buildSharePacketMarkdown/);
});
