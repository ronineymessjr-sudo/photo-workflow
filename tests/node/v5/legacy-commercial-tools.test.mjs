import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUOTE_SETTINGS,
  getQuoteSettings,
  saveQuoteSettings,
  calculateQuoteEstimate,
  generateQuoteSheetHtml,
  generateServiceConfirmationHtml,
  generateBatchConceptImages,
  getAiControlState,
  getDeliveryControlState,
} from '../../../src/legacy-commercial-tools.js';

class FakeStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

const samplePlan = {
  id: 'plan-1',
  title: '城市夜景人像',
  input: {
    theme: '霓虹街道',
    style: '电影感',
    scene: '上海街区',
    mood: '克制、安静',
    duration: '2 小时',
    modelDesc: '一位成年女性',
    people: 1,
  },
};

const sampleShots = [
  { scene: '街道环境建立', shotSize: '全景', description: '环境 establishing shot' },
  { scene: '霓虹半身肖像', shotSize: '半身', description: '人物特写' },
];

describe('legacy-commercial-tools', () => {
  describe('quote settings', () => {
    it('returns default settings when storage is empty', () => {
      const storage = new FakeStorage();
      const settings = getQuoteSettings(storage);
      assert.deepEqual(settings, DEFAULT_QUOTE_SETTINGS);
    });

    it('merges saved settings with defaults', () => {
      const storage = new FakeStorage({ pa_quote_settings: JSON.stringify({ baseFee: 1200, perEdit: 60 }) });
      const settings = getQuoteSettings(storage);
      assert.equal(settings.baseFee, 1200);
      assert.equal(settings.perEdit, 60);
      assert.equal(settings.perShot, DEFAULT_QUOTE_SETTINGS.perShot);
    });

    it('saves settings and returns success', () => {
      const storage = new FakeStorage();
      const result = saveQuoteSettings({ baseFee: 1000, perShot: 80, perEdit: 40, locationFee: 150 }, storage);
      assert.equal(result.success, true);
      assert.equal(getQuoteSettings(storage).baseFee, 1000);
    });

    it('returns failure when storage is unavailable', () => {
      const result = saveQuoteSettings({ baseFee: 1000 }, null);
      assert.equal(result.success, false);
      assert.ok(result.reason.includes('没有可用的本地存储'));
    });
  });

  describe('quote estimation', () => {
    it('calculates total from explicit inputs only', () => {
      const estimate = calculateQuoteEstimate({
        shotCount: 5,
        editCount: 10,
        locationCount: 2,
        extraFee: 100,
        settings: { baseFee: 800, perShot: 50, perEdit: 30, locationFee: 100 },
      });

      assert.equal(estimate.baseFee, 800);
      assert.equal(estimate.shotFee, 250);
      assert.equal(estimate.editFee, 300);
      assert.equal(estimate.locationTotal, 200);
      assert.equal(estimate.total, 1650);
      assert.equal(estimate.isEstimate, true);
      assert.ok(estimate.disclaimers.length > 0);
    });

    it('falls back to defaults when settings are missing', () => {
      const estimate = calculateQuoteEstimate({ shotCount: 2 });
      assert.equal(estimate.baseFee, DEFAULT_QUOTE_SETTINGS.baseFee);
      assert.equal(estimate.shotFee, 2 * DEFAULT_QUOTE_SETTINGS.perShot);
    });

    it('treats negative values as zero', () => {
      const estimate = calculateQuoteEstimate({ shotCount: -3, extraFee: -50 });
      assert.equal(estimate.shotCount, 0);
      assert.equal(estimate.extraFee, 0);
    });

    it('does not fabricate customer or payment data', () => {
      const estimate = calculateQuoteEstimate({ shotCount: 3 });
      assert.equal(Object.hasOwn(estimate, 'customer'), false);
      assert.equal(Object.hasOwn(estimate, 'payment'), false);
      assert.equal(Object.hasOwn(estimate, 'finalPrice'), false);
      assert.equal(estimate.isEstimate, true);
    });
  });

  describe('quote document generation', () => {
    it('returns available HTML quote sheet', () => {
      const estimate = calculateQuoteEstimate({ shotCount: 3, editCount: 6 });
      const result = generateQuoteSheetHtml(samplePlan, estimate);

      assert.equal(result.available, true);
      assert.ok(result.html.includes('城市夜景人像'));
      assert.ok(result.html.includes('预估报价'));
      assert.ok(result.html.includes('¥'));
      assert.ok(result.html.includes('本报价为预估价格'));
      assert.ok(result.html.includes('最终价格以双方协商确认为准'));
    });

    it('returns unavailable when plan is missing', () => {
      const result = generateQuoteSheetHtml(null, calculateQuoteEstimate());
      assert.equal(result.available, false);
      assert.ok(result.reason.includes('缺少方案'));
    });

    it('returns available service confirmation HTML', () => {
      const estimate = calculateQuoteEstimate({ shotCount: 3, editCount: 6 });
      const result = generateServiceConfirmationHtml(samplePlan, estimate);

      assert.equal(result.available, true);
      assert.ok(result.html.includes('拍摄服务确认单'));
      assert.ok(result.html.includes('非正式合同'));
      assert.ok(result.html.includes('¥'));
    });

    it('returns unavailable service confirmation when estimate is missing', () => {
      const result = generateServiceConfirmationHtml(samplePlan, null);
      assert.equal(result.available, false);
      assert.ok(result.reason.includes('缺少'));
    });
  });

  describe('batch concept image generation', () => {
    it('returns unavailable when no gateway is provided', async () => {
      const result = await generateBatchConceptImages({ plan: samplePlan, shotList: sampleShots });
      assert.equal(result.available, false);
      assert.ok(result.reason.includes('没有可用的图像生成服务'));
      assert.deepEqual(result.assets, []);
    });

    it('generates synthetic concept images when gateway succeeds', async () => {
      const gateway = {
        async generateConceptImages({ count }) {
          return {
            requestId: 'req-1',
            assets: Array.from({ length: count }, (_, i) => ({
              url: `https://example.test/concept-${i + 1}.jpg`,
              width: 832,
              height: 1104,
            })),
          };
        },
      };

      const result = await generateBatchConceptImages({
        plan: samplePlan,
        shotList: sampleShots,
        count: 3,
        gateway,
      });

      assert.equal(result.available, true);
      assert.equal(result.generatedCount, 3);
      assert.equal(result.assets.length, 3);
      result.assets.forEach((asset) => {
        assert.equal(asset.synthetic, true);
        assert.equal(asset.source, 'ai-concept');
        assert.equal(asset.kind, 'concept-image');
        assert.equal(asset.label, 'AI 视觉预演');
        assert.ok(asset.prompt);
        assert.ok(asset.id);
        assert.ok(asset.at);
      });
    });

    it('never marks generated images as real references', async () => {
      const gateway = {
        async generateConceptImages() {
          return { assets: [{ url: 'https://example.test/img.jpg' }] };
        },
      };
      const result = await generateBatchConceptImages({ plan: samplePlan, gateway });
      assert.equal(result.assets[0].synthetic, true);
      assert.notEqual(result.assets[0].label, '真实参考照片');
      assert.notEqual(result.assets[0].label, '真实参考');
    });

    it('returns failure with a plain reason when gateway throws', async () => {
      const gateway = {
        async generateConceptImages() {
          throw new Error('provider rate limit exceeded');
        },
      };
      const result = await generateBatchConceptImages({ plan: samplePlan, gateway });
      assert.equal(result.available, false);
      assert.ok(result.reason.includes('provider rate limit exceeded'));
      assert.deepEqual(result.assets, []);
    });

    it('caps count between 1 and 9', async () => {
      const gateway = {
        async generateConceptImages({ count }) {
          return { assets: Array.from({ length: count }, () => ({ url: 'https://example.test/img.jpg' })) };
        },
      };
      const low = await generateBatchConceptImages({ plan: samplePlan, gateway, count: 0 });
      assert.equal(low.assets.length, 1);
      const high = await generateBatchConceptImages({ plan: samplePlan, gateway, count: 100 });
      assert.equal(high.assets.length, 9);
    });
  });

  describe('AI control availability', () => {
    it('reports unavailable when plan is missing', () => {
      const state = getAiControlState({});
      assert.equal(state.aiRecommendation.available, false);
      assert.equal(state.conceptImage.available, false);
      assert.equal(state.generatedImage.available, false);
      assert.ok(state.aiRecommendation.reason.includes('请先打开一个方案'));
    });

    it('reports unavailable when gateway is missing', () => {
      const state = getAiControlState({ plan: samplePlan });
      assert.equal(state.aiRecommendation.available, false);
      assert.equal(state.conceptImage.available, false);
      assert.ok(state.conceptImage.reason.includes('没有可用的图像生成服务'));
    });

    it('reports available when dependencies are present', () => {
      const state = getAiControlState({
        plan: samplePlan,
        shotList: sampleShots,
        imageGateway: {},
        recommendationGateway: {},
      });
      assert.equal(state.aiRecommendation.available, true);
      assert.equal(state.conceptImage.available, true);
      assert.equal(state.generatedImage.available, true);
      assert.ok(state.conceptImage.note.includes('不会替代真实参考照片'));
    });

    it('reports generated image unavailable when shot list is empty', () => {
      const state = getAiControlState({ plan: samplePlan, shotList: [], imageGateway: {} });
      assert.equal(state.generatedImage.available, false);
      assert.ok(state.generatedImage.reason.includes('没有可生成预览的镜头'));
    });
  });

  describe('delivery control availability', () => {
    it('reports all unavailable when plan is missing', () => {
      const state = getDeliveryControlState({});
      Object.values(state).forEach((control) => {
        assert.equal(control.available, false);
        assert.ok(control.reason.includes('请先打开一个方案'));
      });
    });

    it('unlocks prepare and review for an open plan', () => {
      const state = getDeliveryControlState({ plan: samplePlan });
      assert.equal(state.prepare.available, true);
      assert.equal(state.review.available, true);
      assert.equal(state.shoot.available, false);
      assert.equal(state.select.available, false);
      assert.equal(state.edit.available, false);
      assert.equal(state.deliver.available, false);
    });

    it('unlocks shoot when schedule exists', () => {
      const state = getDeliveryControlState({ plan: samplePlan, schedule: { id: 'sched-1' } });
      assert.equal(state.shoot.available, true);
      assert.equal(state.select.available, false);
    });

    it('unlocks edit and deliver when images are selected', () => {
      const state = getDeliveryControlState({
        plan: samplePlan,
        schedule: { id: 'sched-1' },
        shootRecords: [{ id: 'sr-1' }],
        selectedImages: [{ id: 'img-1' }],
      });
      assert.equal(state.select.available, true);
      assert.equal(state.edit.available, true);
      assert.equal(state.deliver.available, true);
    });
  });
});
