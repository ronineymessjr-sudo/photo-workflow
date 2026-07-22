import { DataService } from '../../../src/services/data-service.js';
import { createV5Application } from '../../../src/v5/application.js';

export class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(structuredClone(initial))); }
  get(key, fallback = null) { return this.values.has(key) ? structuredClone(this.values.get(key)) : structuredClone(fallback); }
  set(key, value) { this.values.set(key, structuredClone(value)); return value; }
  remove(key) { this.values.delete(key); }
  snapshot() { return { values: Object.fromEntries([...this.values].map(([key, value]) => [key, structuredClone(value)])) }; }
  restoreSnapshot(snapshot, { replace = false } = {}) {
    if (replace) this.values.clear();
    for (const [key, value] of Object.entries(snapshot.values || {})) this.values.set(key, structuredClone(value));
  }
}

export function createFixture(options = {}) {
  const storage = options.storage || new MemoryStorage();
  const data = new DataService(storage);
  const app = createV5Application({
    data,
    storage,
    planningGateway: options.planningGateway || null,
    imageGateway: options.imageGateway || null,
    equipmentSeed: options.equipmentSeed || null,
  });
  return { storage, data, app, repos: app.repositories };
}

export function seedProject(fixture, overrides = {}) {
  const { data } = fixture;
  const project = data.create('projects', {
    id: overrides.id || 'project-1',
    title: overrides.title || '上海城市人像',
    status: 'active',
    defaultCurrency: 'CNY',
    timezone: 'Asia/Shanghai',
  });
  const brief = data.create('projectBriefs', {
    id: `brief-${project.id}`,
    projectId: project.id,
    shootingType: '人像创作',
    goal: '完成一组城市夜景人像作品',
    theme: '霓虹街道',
    style: '电影感',
    mood: '克制、安静',
    locationIntent: '上海街区',
    dateIntent: '蓝调时刻至夜间',
    deliverableTarget: '精修 12 张',
    constraints: ['不使用大型灯架阻塞公共通道'],
    notes: '保留真实肤质。',
  });
  return { project, brief };
}

export function validPlanOutput({ referenceAssetId = 'ref-1', equipmentItemId = 'equipment-1' } = {}) {
  return {
    concept: '蓝调霓虹人像',
    rationale: '使用环境光和轻量补光完成连贯的城市夜景叙事。',
    visualDirection: { palette: '低饱和蓝橙', contrast: '中等' },
    preparationGuide: ['提前确认路段人流', '检查电池与存储卡'],
    expectedDeliverableCount: 12,
    mustHaveShotCount: 2,
    equipmentRecommendations: [{ equipmentItemId, name: 'Sony Alpha 7 IV', role: '主机', source: 'assigned', externalRequirement: false, reason: '已分配且适合低光环境' }],
    shots: [
      {
        sequence: 1, scene: '街道环境建立', shotSize: '全景', cameraAngle: '平视', composition: '引导线', focalLength: '35mm',
        lighting: '环境霓虹为主，便携灯弱补', poseGuidance: '缓慢行走并回看镜头', subjectAction: '行走', variationCount: 3,
        targetSelectCount: 2, priority: 'must', estimatedMinutes: 12, fallback: '转入有遮雨棚的街角',
        sourceTrace: { referenceAssetIds: [referenceAssetId], equipmentItemIds: [equipmentItemId], templateId: null },
      },
      {
        sequence: 2, scene: '霓虹半身肖像', shotSize: '半身', cameraAngle: '略低机位', composition: '中心构图', focalLength: '85mm',
        lighting: '侧后方霓虹轮廓光，正面柔光补偿', poseGuidance: '肩部放松，视线越过镜头', subjectAction: '静态', variationCount: 4,
        targetSelectCount: 3, priority: 'must', estimatedMinutes: 15, fallback: '使用橱窗漫反射作为主光',
        sourceTrace: { referenceAssetIds: [referenceAssetId], equipmentItemIds: [equipmentItemId], templateId: null },
      },
    ],
    expectedLook: {
      enabled: true,
      realReferenceAssetIds: [referenceAssetId],
      colorIntent: '低饱和蓝橙，肤色自然',
      lightingIntent: '保留环境霓虹层次',
      retouchIntent: '保留皮肤纹理，清理临时瑕疵',
      lutIntent: '以显示变换后创意 LUT 为起点，不直接套 Log 技术 LUT',
    },
    risks: ['夜间人流变化', '混合色温导致肤色偏移'],
  };
}

export class FakePlanningGateway {
  constructor(output) { this.output = output; this.calls = []; this.provider = 'test-provider'; this.model = 'test-model'; }
  async createPlanDraft(payload) { this.calls.push(structuredClone(payload)); return { requestId: 'request-1', normalizedOutput: structuredClone(this.output), rawOutput: { output: this.output } }; }
}

export class FakeImageGateway {
  constructor({ fail = false } = {}) { this.fail = fail; this.calls = []; this.provider = 'test-image-provider'; this.model = 'test-image-model'; }
  async generateConceptImages(payload) {
    this.calls.push(structuredClone(payload));
    if (this.fail) throw new Error('provider unavailable');
    return { requestId: 'image-request-1', assets: Array.from({ length: payload.count }, (_, index) => ({ id: `provider-asset-${index + 1}`, url: `https://example.test/concept-${index + 1}.jpg`, width: 1536, height: 1024 })) };
  }
}
