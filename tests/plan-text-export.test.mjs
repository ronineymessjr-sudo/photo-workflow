import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function exportShotList(planId) {');
const end = html.indexOf('\n// 导出PDF分镜脚本', start);
assert.ok(start >= 0 && end > start);
const source = html.slice(start, end);

async function exportPlan(plan) {
    let result;
    const anchor = { click() {}, remove() {} };
    const context = {
        SK: { P: 'plans' },
        sg: () => [plan],
        getPlanForPrint: () => plan,
        generateShotList: () => [],
        directorShotResource: () => '',
        toast() {},
        Blob,
        URL: { createObjectURL: blob => { result = blob; return 'blob:test'; }, revokeObjectURL() {} },
        document: { createElement: () => anchor, body: { appendChild() {} } },
        Date,
    };
    vm.runInNewContext(source, context);
    context.exportShotList(plan.id);
    return result.text();
}

const basePlan = {
    id: 'plan-1', title: '夜景全身人像', input: { style: '纪实', scene: '步行街', duration: '2小时', modelDesc: '一位成年人物' },
    shotList: [{
        title: '路灯下全身定场', scene: '步行街', description: '人物完整全身站在画面左下角。',
        method: '站在安全台阶上高机位俯拍', shotSize: '全身', focalLength: '35mm',
        composition: '人物位于左下角', lighting: '利用现有路灯', angle: '俯拍',
        duration: 0, notes: '不进入车道', props: '无',
    }],
};

test('text export marks unknown shot durations as pending and uses readable unboxed sections', async () => {
    const text = await exportPlan(basePlan);
    assert.match(text, /预计总拍摄时长：待确认/);
    assert.match(text, /时长：待确认/);
    assert.doesNotMatch(text, /0 分钟|0分钟/);
    assert.doesNotMatch(text, /[┌┐└┘│─]/);
    assert.match(text, /镜头 01 · 路灯下全身定场/);
    assert.match(text, /摄影师机位：站在安全台阶上高机位俯拍/);
});

test('text export totals only fully estimated durations', async () => {
    const plan = {
        ...basePlan,
        shotList: [
            { ...basePlan.shotList[0], duration: 5 },
            { ...basePlan.shotList[0], title: '侧身半步', duration: 8 },
        ],
    };
    const text = await exportPlan(plan);
    assert.match(text, /预计总拍摄时长：13 分钟/);
    assert.match(text, /时长：5 分钟/);
    assert.match(text, /时长：8 分钟/);
});
