import Ajv from 'ajv';
import { createJsonTranslator } from 'typechat';
import { handleAiPlan } from '../../api/ai-plan.mjs';

const fields = ['shot_language', 'model_pose', 'photographer_position', 'lens', 'model_position', 'lighting_setup', 'crop_boundary', 'must_show', 'reject_if', 'execution_note', 'generator_prompt'];
const shot = {
  shot_language: '环境与人物', model_pose: '向前迈一步后停住', photographer_position: '安全台阶上俯拍',
  lens: '35mm', model_position: '画面左下角', lighting_setup: '路灯侧光', crop_boundary: '完整全身',
  must_show: '头部、双脚和路面', reject_if: '人物截脚', execution_note: '台阶不可用则更换安全位置',
  generator_prompt: 'full body high angle subject lower left', shot_size: 'FS', camera_angle: 'high_angle',
};
const input = {
  theme: '雨夜城市纪实', scene: '有安全台阶的步行街', people: '1', duration: '1小时',
  extra: '所有镜头高机位俯拍，人物左下角，完整全身。仅使用35mm；无闪光灯或反光板。',
};
const schema = {
  type: 'object', required: ['shot_plans'], additionalProperties: false,
  properties: { shot_plans: {
    type: 'array', minItems: 9, maxItems: 9,
    items: { type: 'object', required: [...fields, 'shot_size', 'camera_angle'], additionalProperties: false,
      properties: Object.fromEntries([...fields.map(field => [field, { type: 'string', minLength: 1, maxLength: 2000 }]),
        ['shot_size', { enum: ['ECU', 'CU', 'MCU', 'MS', 'MFS', 'FS', 'WS', 'EWS'] }],
        ['camera_angle', { enum: ['eye_level', 'high_angle', 'ground_level', 'overhead', 'low_angle'] }]]) },
  } },
};
const validate = new Ajv({ allErrors: true }).compile(schema);
const clone = value => structuredClone(value);
const base = () => ({ shot_plans: Array.from({ length: 9 }, (_, index) => ({ ...shot, shot_language: `镜头${index + 1}` })) });
const scenarios = [
  { id: 'valid', label: '符合要求的九镜头', make: base },
  { id: 'missing', label: '镜头 3 缺少人物动作', make: () => { const value = base(); delete value.shot_plans[2].model_pose; return value; } },
  { id: 'enum', label: '镜头 4 使用错误机位代号', make: () => { const value = base(); value.shot_plans[3].camera_angle = 'top-ish'; return value; } },
  { id: 'semantic', label: '镜头 5 悄悄改为平视半身', make: () => { const value = base(); value.shot_plans[4].camera_angle = 'eye_level'; value.shot_plans[4].shot_size = 'MS'; return value; } },
  { id: 'duplicate', label: '镜头 6 重复镜头 1 名称', make: () => { const value = base(); value.shot_plans[5].shot_language = value.shot_plans[0].shot_language; return value; } },
  { id: 'resource', label: '镜头 7 加入未提供的雨伞', make: () => { const value = base(); value.shot_plans[6].model_pose = '撑开雨伞向前走'; return value; } },
];

export async function evaluate() {
  const results = [];
  for (const scenario of scenarios) {
    const generated = clone(scenario.make());
    const schemaPass = validate(generated);
    const schemaErrors = schemaPass ? [] : validate.errors.map(error => `${error.instancePath || '/'} ${error.message}`);
    const current = await handleAiPlan({ provider: 'deepseek', model: 'lab-model', apiKey: 'local-test-only', input }, {}, {
      fetchImpl: async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(generated) } }] }),
    });
    results.push({ id: scenario.id, label: scenario.label, schemaPass, schemaErrors,
      currentPass: current.status === 200, currentCode: current.body.code || 'OK', currentMessage: current.body.error || '通过',
      expectation: scenario.id === 'valid' ? '通过' : '拒绝',
    });
  }
  const translatorTests = [];
  for (const [id, first] of [['missing', scenarios[1].make()], ['semantic', scenarios[3].make()]]) {
    let calls = 0;
    let repairAsked = false;
    const translator = createJsonTranslator({ complete: async prompt => {
      calls++;
      repairAsked ||= JSON.stringify(prompt).includes('revised JSON object');
      return { success: true, data: JSON.stringify(calls === 1 ? first : base()) };
    } }, {
      getSchemaText: () => 'interface Plan { shot_plans: Shot[] }', getTypeName: () => 'Plan',
      validate: value => validate(value)
        ? { success: true, data: value }
        : { success: false, message: validate.errors.map(error => `${error.instancePath} ${error.message}`).join('; ') },
    });
    const output = await translator.translate('安全台阶、35mm、全部全身俯拍，人物在左下角');
    translatorTests.push({ id, label: id === 'missing' ? '缺字段后模型修复' : '语义冲突但字段合格',
      calls, repairAsked, finalValid: output.success, note: id === 'semantic' ? '默认只做结构校验，因此没有触发修复。' : '第二次响应为固定模拟结果，不代表真实模型必定修好。' });
  }
  return { note: '固定样例与模拟模型响应；未调用真实模型，没有质量评分或费用。', results, translatorTests };
}
