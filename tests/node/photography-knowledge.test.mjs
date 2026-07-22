import test from 'node:test';
import assert from 'node:assert/strict';
import { PhotographyKnowledgeService, buildKnowledgeShotList, knowledgeImageDirection } from '../../src/services/photography-knowledge-service.js';
import { buildFallbackPlan } from '../../src/data/photography-rules.js';

const catalog = {
  items: [
    { id: 'ACT-001', kind: 'action', title: '自然行走', tags: ['人像', '草地'], snippet: '慢走回眸', groundingStatus: 'metadata-only' },
    { id: 'SCN-001', kind: 'scene', title: '草地/公园', tags: ['草地', '自然光'], snippet: '下午侧光', groundingStatus: 'metadata-only' },
  ],
};

test('knowledge service selects compact local sources and builds a fresh portrait sequence', async () => {
  const service = new PhotographyKnowledgeService({
    searchObsidian: async () => ({ items: [{
      id: 'doc-fresh', type: 'document', title: '小清新少女风拍摄手册', filename: '摄影姿势库/拍摄指南/小清新少女风拍摄手册.md',
      text: '重心转移站、慢走回眸、坐姿与道具互动，优先自然光和具体引导词。', tags: ['小清新', '姿势'], score: 20,
    }] }),
    fetchImpl: async () => ({ ok: true, json: async () => catalog }),
  });

  const knowledge = await service.buildForInput({ theme: '校园少女写真', style: '清新', scene: '草地', duration: '1小时' });

  assert.equal(knowledge.profile, 'fresh-portrait');
  assert.equal(knowledge.vaultSources.length, 1);
  assert.equal(knowledge.catalogSources.length, 2);
  assert.equal(knowledge.shots.length, 5);
  assert.match(knowledge.shots[0].description, /重心转移/);
  assert.match(knowledgeImageDirection({ knowledgeContext: knowledge, knowledgeShotList: knowledge.shots }, 0), /soft side light/);
});

test('fallback plan uses evidence-guided shots only when a matching knowledge profile exists', () => {
  const knowledge = {
    profile: 'hanfu-garden',
    guidance: { label: '园林汉服执行法', lightingSummary: '清晨或傍晚侧光', sceneSummary: '回廊与亭台分镜', timelineSummary: '先环境后人物', risks: ['人流'] },
    sources: [{ id: 'obsidian:hanfu', title: '汉服园林拍照姿势库', groundingStatus: 'vault-note' }],
    warnings: [],
  };
  knowledge.shots = buildKnowledgeShotList({ theme: '园林汉服', style: '古风', scene: '园林', duration: '1小时' }, knowledge);
  const plan = buildFallbackPlan({ title: '园林汉服', shootingType: '人像', style: '古风' }, [], knowledge);

  assert.equal(plan.shots.length, 5);
  assert.match(plan.shots[1].description, /站立持花/);
  assert.equal(plan.sources[0].id, 'obsidian:hanfu');
});
