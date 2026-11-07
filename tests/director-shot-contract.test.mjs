import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createTemplatePlan } from '../api/director-plan.mjs';

async function loadShotContractCompiler() {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const normalizeStart = html.indexOf('function normalizeDirectorContractList(value) {');
    const compileStart = html.indexOf('function compileDirectorShotContract(contract) {', normalizeStart);
    const nextFunction = html.indexOf('\nasync function buildIdentityLockWorkflowForPlan(', compileStart);
    assert.ok(normalizeStart >= 0 && compileStart > normalizeStart && nextFunction > compileStart);
    const normalize = html.slice(normalizeStart, compileStart);
    const compile = html.slice(compileStart, nextFunction);
    return vm.runInNewContext(`(() => { ${normalize} return (${compile}); })()`);
}

test('shot-contract checks ignore wardrobe and global shot variety but reject real framing conflicts', async () => {
    const compile = await loadShotContractCompiler();
    const input = {
        theme: '城市午后公园与咖啡馆组照',
        modelDesc: '成年短发模特，棕色针织上装与半身裙。',
        scene: '城市公园树荫与长椅；咖啡馆窗边',
        duration: '2小时',
        people: '1',
        extra: '自然站姿、回眸、双手扶腰。整组人物和服装保持一致。保留环境全景、全身、中景、近景变化。',
    };
    const templates = [
        ['atlas-pose-full_single_p015', 'pose', '站立・对立式平衡・手扶腰'],
        ['atlas-pose-full_single_p017', 'pose', '站立・回眸顾盼'],
        ['atlas-pose-full_single_p018', 'pose', '站立・双手扶腰'],
        ['atlas-costume-aut-0022', 'costume', '秋季棕色针织上装'],
        ['atlas-portrait-f009cba9893', 'portrait', '短发人像'],
    ].map(([id, kind, title]) => ({ id, kind, title, sourceUrl: 'https://example.org/reference' }));
    const plan = createTemplatePlan(input, { templates, guidance: { suggestions: [] } });
    const firstShot = plan.shotList[0].directorContract;

    assert.doesNotThrow(() => compile(firstShot));
    assert.throws(() => compile({ ...firstShot, crop_boundary: '腰部以上取景' }), /当前分镜合同内部冲突/);
});
