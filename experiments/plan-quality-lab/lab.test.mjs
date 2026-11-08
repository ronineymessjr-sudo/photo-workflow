import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from './lab.mjs';
import { evaluatePlan } from './eval-checks.mjs';
import { validateHardConstraints, validatePhotographerFeasibility } from '../../api/ai-plan.mjs';

test('all scenarios produce a current-handler and schema verdict', async () => {
  const { results, translatorTests } = await evaluate();
  assert.equal(results.length, 6);
  assert.deepEqual(results.map(row => row.currentPass), [true, false, false, false, false, false]);
  assert.deepEqual(results.map(row => row.schemaPass), [true, false, false, true, true, true]);
  assert.match(results[1].schemaErrors.join(' '), /model_pose/);
  assert.deepEqual(translatorTests.map(row => row.calls), [2, 1]);
  assert.deepEqual(translatorTests.map(row => row.repairAsked), [true, false]);
});

function offlineShot(name, overrides = {}) {
  return {
    shot_language: name,
    model_pose: '人物沿场地边缘缓步走过，手臂随步幅自然摆动',
    photographer_position: '站在主体前方约3米，机位与眼睛齐平',
    lens: '50mm', model_position: '人物位于画面右侧三分线',
    wardrobe_styling: '沿用已确认的服装，不添加新配饰',
    lighting_setup: '利用现场柔和侧光，保留自然阴影', shot_props: '无',
    crop_boundary: '全身入画，头顶和鞋底留出空间',
    must_show: '人物与现场主要环境', reject_if: '截脚、肢体受裁或脸部失焦',
    execution_note: '人流遮挡时等待通道空隙再拍',
    generator_prompt: 'photorealistic full body portrait, 50mm lens, eye-level camera, natural light',
    shot_size: 'FS', camera_angle: 'eye_level',
    ...overrides,
  };
}

test('offline realism matrix flags anomalies in nine distinct scene types', () => {
  const scenarios = [
    {
      id: 'park portrait extreme pose', input: { theme: '公园人像', scene: '步道与树荫', people: '1' },
      bad: { model_pose: '身体大幅后仰接近水平，同时双臂绕到背后交叉举过头顶' }, expect: /姿势|动作|支撑|可行性/,
    },
    {
      id: 'cafe framing conflict', input: { theme: '咖啡馆写真', scene: '窗边座位与桌面', people: '1' },
      bad: { shot_size: 'FS', crop_boundary: '腰部以上半身，画面下缘裁至腰部' }, expect: /景别|裁切/,
      control: { model_pose: '坐在窗边椅子上微侧身，手自然放在桌边，视线看向窗外', shot_size: 'MS', crop_boundary: '腰部以上取景，头部和双手完整入画', generator_prompt: 'photorealistic waist-up portrait of a woman seated by a cafe window, 50mm lens, eye-level camera, natural light' },
    },
    {
      id: 'park photographer distance', input: { theme: '步道环境照', scene: '公园步道', people: '1' },
      bad: { photographer_position: '摄影师站在步道侧面平视拍摄' }, expect: /距离|站位/,
    },
    {
      id: 'couple unsupported lift', input: { theme: '双人纪实', scene: '平整草地', people: '2' },
      bad: { model_pose: '一人单手把另一人举过头顶做无支撑的腾空托举，双方完全悬空，没有可见支撑点' }, expect: /支撑|姿势|动作|可行性/,
      control: { model_pose: '两人并肩沿草地缓步交谈，一人侧头回应，步幅自然', generator_prompt: 'photorealistic full body portrait of two people walking together on grass, 50mm lens, eye-level camera, natural light' },
    },
    {
      id: 'dance camera angle conflict', input: { theme: '舞者练习', scene: '舞蹈教室', people: '1' },
      bad: { photographer_position: '站在舞者前方约3米，机位与人物平视', camera_angle: 'high_angle' }, expect: /机位|角度/,
      control: { model_pose: '在原地完成一个幅度舒适的侧步，双臂随动作自然展开后收回', generator_prompt: 'photorealistic full body portrait of a dancer practicing a gentle side step, 50mm lens, eye-level camera, natural studio light' },
    },
    {
      id: 'poolside unsafe position', input: { theme: '泳者肖像', scene: '室内泳池岸边', people: '1' },
      bad: { photographer_position: '摄影师探出池边到水面上方约1米拍摄' }, expect: /安全|风险/,
      control: { model_pose: '站在干燥防滑的池岸边缘内侧，身体放松看向镜头', photographer_position: '摄影师站在防滑池岸内侧，距主体约3米，机位与眼睛齐平', generator_prompt: 'photorealistic full body portrait beside an indoor pool, standing on the dry non-slip deck, 50mm lens, eye-level camera, soft light' },
    },
    {
      id: 'pet pose prompt mismatch', input: { theme: '人与狗生活照', scene: '公园草地', people: '1', extra: '人物自带一只狗和牵引绳' },
      bad: { model_pose: '人物站立牵狗沿步道慢走', generator_prompt: 'a woman sitting in a chair beside her dog, 50mm portrait' }, expect: /动作|提示词/,
      control: { model_pose: '人物牵着自带牵引绳与狗沿草地慢走，低头和狗短暂对视', shot_props: '用户自带的牵引绳', generator_prompt: 'photorealistic full body portrait of a woman walking her dog on grass, 50mm lens, eye-level camera, natural light' },
    },
    {
      id: 'product no-person conflict', input: { theme: '产品静物', scene: '已有桌面', people: '0' },
      bad: { model_pose: '无人物，产品静物只拍物品与桌面', generator_prompt: 'portrait of a woman holding the product, 50mm lens' }, expect: /人物|入画|提示词/,
      control: { model_pose: '无人物，产品从侧面拍摄并保留桌面环境', generator_prompt: 'product still life on an existing table, no person, soft diffused light', must_show: '产品与桌面环境' },
    },
    {
      id: 'night street focal length conflict', input: { theme: '夜间街头肖像', scene: '安全人行道与路灯', people: '1' },
      bad: { lens: '35mm', generator_prompt: 'photorealistic full body portrait, 85mm lens, eye-level camera, street lights' }, expect: /焦段/,
    },
  ];

  for (const scenario of scenarios) {
    const bad = offlineShot(`${scenario.id} 异常镜`, scenario.bad);
    const control = offlineShot(`${scenario.id} 对照镜`, scenario.control || {
      model_pose: '人物停在场景边缘自然转头看向镜头，肩颈放松',
    });
    const controlResult = evaluatePlan([control, offlineShot(`${scenario.id} 对照镜2`)], scenario.input, validateHardConstraints, validatePhotographerFeasibility);
    assert.deepEqual(controlResult.findings, [], `${scenario.id} 对照方案不应误报：${controlResult.findings.join('；')}`);
    const result = evaluatePlan([bad, control], scenario.input, validateHardConstraints, validatePhotographerFeasibility);
    assert.ok(result.findings.some(finding => scenario.expect.test(finding)), `${scenario.id} 漏检：${result.findings.join('；')}`);
  }

  const cleanInput = { theme: '窗边人像', scene: '室内窗边与椅子', people: '1' };
  const clean = evaluatePlan([
    offlineShot('坐姿窗光', { model_pose: '坐在椅上侧身望向窗外，双手自然放在膝上', shot_size: 'MS', crop_boundary: '腰部以上取景，脸和双手完整入画', generator_prompt: 'photorealistic waist-up portrait, 50mm lens, eye-level camera, natural window light' }),
    offlineShot('站姿窗光', { shot_language: '站姿窗光', model_pose: '在窗边站立并轻转肩膀，目光看向镜头' }),
  ], cleanInput, validateHardConstraints, validatePhotographerFeasibility);
  assert.deepEqual(clean.findings, [], `自然可拍方案不应误报：${clean.findings.join('；')}`);
});
