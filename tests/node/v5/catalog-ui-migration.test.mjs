import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignCatalogResource,
  renderCrew,
  removeCatalogResource,
  saveEquipmentResource,
  saveTalentResource,
  saveVenueResource,
} from '../../../src/pages/crew.js';
import { createFixture, seedProject } from './test-helpers.mjs';

function setup() {
  const fixture = createFixture();
  const { project } = seedProject(fixture);
  fixture.app.catalog.importEquipmentModels();
  return { fixture, project, ctx: { v5: fixture.app, project } };
}

test('compatibility resource forms save V5 catalog entities without implicitly assigning them', () => {
  const { fixture, project, ctx } = setup();

  const equipment = saveEquipmentResource(ctx, {
    name: 'Sony Alpha 7 IV',
    quantity: '2',
    status: 'ready',
    category: '相机',
    notes: '主机与备机',
  });
  const venue = saveVenueResource(ctx, {
    name: '自然光摄影棚',
    address: '上海',
    indoorOutdoor: 'indoor',
    lightingNotes: '南向窗',
  });
  const talent = saveTalentResource(ctx, {
    name: '模特 A',
    contact: 'model@example.test',
    consentStatus: 'signed',
    boundaries: '不拍摄更衣区域',
  });

  assert.equal(equipment.equipmentModelId, 'camera-sony-a7-iv');
  assert.equal(equipment.quantity, 2);
  assert.equal(venue.name, '自然光摄影棚');
  assert.equal(talent.displayName, '模特 A');
  assert.equal(talent.consentStatus, 'granted');
  assert.equal(fixture.repos.resourceAssignments.list(item => item.projectId === project.id).length, 0);

  const catalog = fixture.app.queries.resourceCatalog.get(project.id);
  assert.equal(catalog.equipment.find(item => item.resource.id === equipment.id).displayName, 'Sony Alpha 7 IV');
  assert.ok(catalog.venues.some(item => item.resource.id === venue.id));
  assert.ok(catalog.talent.some(item => item.resource.id === talent.id));
});

test('compatibility resource selection uses V5 assignment use cases and removal preserves global resources', () => {
  const { fixture, project, ctx } = setup();
  const equipment = saveEquipmentResource(ctx, { name: '自定义反光板', quantity: 1, status: 'ready' });
  const venue = saveVenueResource(ctx, { name: '屋顶天台', indoorOutdoor: 'outdoor' });
  const talent = saveTalentResource(ctx, { name: '模特 B', consentStatus: 'pending' });

  const equipmentAssignment = assignCatalogResource(ctx, 'equipment', equipment.id, { planId: 'plan-1' });
  assignCatalogResource(ctx, 'venue', venue.id, { planId: 'plan-1' });
  assignCatalogResource(ctx, 'talent', talent.id, { planId: 'plan-1' });

  assert.equal(fixture.app.catalog.listProjectResources(project.id).length, 3);
  assert.equal(equipmentAssignment.resourceType, 'equipment');

  removeCatalogResource(ctx, equipmentAssignment.id);
  assert.ok(fixture.repos.equipmentItems.get(equipment.id));
  assert.equal(fixture.app.catalog.listProjectResources(project.id).length, 2);
});

test('compatibility crew page renders V5 catalog selection controls without legacy equipment deletion', () => {
  const { fixture, project, ctx } = setup();
  const equipment = saveEquipmentResource(ctx, { name: 'Sony Alpha 7 IV', quantity: 1, status: 'ready' });
  const venue = saveVenueResource(ctx, { name: '白墙摄影棚', indoorOutdoor: 'indoor' });
  assignCatalogResource(ctx, 'venue', venue.id);
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        innerHTML: '',
        set textContent(value) {
          this.innerHTML = String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
        },
      };
    },
  };

  let html;
  try {
    html = renderCrew({
      ...ctx,
      data: fixture.data,
      storage: fixture.storage,
      refresh() {},
    });
  } finally {
    globalThis.document = originalDocument;
  }

  assert.match(html, /id="venue-form"/);
  assert.match(html, /id="equipment-model-options"/);
  assert.match(html, new RegExp(`data-resource-id="${equipment.id}"`));
  assert.match(html, /data-assign-resource="equipment"/);
  assert.match(html, /data-remove-resource-assignment=/);
  assert.doesNotMatch(html, /data-delete-equipment=/);
});
