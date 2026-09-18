import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createDirectorPlan } from '../api/director-plan.mjs';
import { generateDirectorCandidate } from '../api/director-generation.mjs';
import { buildDirectorIdentityWorkflow } from '../api/director-identity-workflow.mjs';
import { createServer } from '../tools/serve-director.mjs';

test('preserves current input and actual director shots without legacy templates', async () => {
    let submitted;
    const input = { theme: '雨夜', scene: '斑马线', extra: '高机位，人物左下角，不要半身像' };
    const plan = await createDirectorPlan(input, { baseUrl: 'http://127.0.0.1:8004', fetchImpl: async (url, options) => {
        submitted = JSON.parse(options.body);
        assert.match(url, /\/v1\/photoatelier\/shoot-plan$/);
        return Response.json({ shot_plans: [{ model_pose: '向左行走', photographer_position: '高台俯拍', crop_boundary: '全身', reject_if: '居中', lens: '35mm' }] });
    } });
    assert.match(submitted.brief, /高机位，人物左下角，不要半身像/);
    assert.equal(plan.shotList[0].description, '向左行走');
    assert.match(plan.shotList[0].notes, /拒绝：居中/);
    assert.equal(plan.director.reviewRequired, true);
    assert.equal(plan.director.imageGenerationConnected, true);
    assert.equal(plan.images.length, 0);
});

test('candidate generation returns a review-only external result', async () => {
    let submitted;
    const result = await generateDirectorCandidate({
        request_id: 'workflow-test-image',
        brief: '雨夜高机位全身候选图',
        generator: 'external-image-service',
        billing_mode: 'free-credit-first',
        shot_contract: { shot_language: 'environmental-wide', generator_prompt: 'exact selected shot contract' },
        dry_run: true,
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async (url, options) => {
            submitted = JSON.parse(options.body);
            assert.match(url, /\/v1\/photoatelier\/external-generate$/);
            return Response.json({
                status: 'external-dry-run',
                generation: { model: 'black-forest-labs/FLUX.1-schnell' },
                release_gate: { status: 'blocked' },
            });
        },
    });
    assert.equal(submitted.dry_run, true);
    assert.equal(submitted.billing_mode, 'free-credit-first');
    assert.equal(submitted.shot_contract.shot_language, 'environmental-wide');
    assert.equal(result.release_gate.status, 'blocked');
});

test('identity workflow bridge preserves the local reference contract without execution', async () => {
    let submitted;
    const result = await buildDirectorIdentityWorkflow({
        request_id: 'workflow-identity-test',
        brief: '同一人物，横屏环境人像，三分之四侧身，保留环境',
        identity_method: 'ip-adapter-faceid',
        reference_image_path: 'D:/AI项目/director-master-aesthetic-agent-v0.28.0/outputs/reference.jpg',
        pose_control: 'openpose',
        aspect_ratio: 'landscape-wide',
        candidate_count: 2,
        max_retries: 2,
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async (url, options) => {
            submitted = JSON.parse(options.body);
            assert.match(url, /\/v1\/photoatelier\/identity-lock-workflow$/);
            return Response.json({
                status: 'identity-lock-workflow-ready-for-provider',
                workflow: { workflow_version: 'photoatelier-identity-lock-v1', execution: 'not_submitted' },
            });
        },
    });
    assert.equal(submitted.identity_method, 'ip-adapter-faceid');
    assert.equal(submitted.reference_image_path.endsWith('outputs/reference.jpg'), true);
    assert.equal(submitted.aspect_ratio, 'landscape-wide');
    assert.equal(result.workflow.execution, 'not_submitted');
});

test('fails closed for missing configuration, invalid input, and upstream failures', async () => {
    await assert.rejects(createDirectorPlan({ theme: 'x' }), /DIRECTOR_NOT_CONFIGURED/);
    await assert.rejects(generateDirectorCandidate({ brief: 'x' }, { baseUrl: 'http://localhost' }), /SHOT_CONTRACT_REQUIRED/);
    await assert.rejects(createDirectorPlan({ theme: 'x'.repeat(2001) }, { baseUrl: 'http://localhost' }), /INVALID_BRIEF/);
    await assert.rejects(createDirectorPlan({ theme: 'x' }, { baseUrl: 'http://localhost', fetchImpl: async () => new Response('', { status: 503 }) }), /DIRECTOR_UPSTREAM_503/);
    await assert.rejects(createDirectorPlan({ theme: 'x' }, { baseUrl: 'http://localhost', fetchImpl: async () => Response.json({}) }), /DIRECTOR_INVALID_RESPONSE/);
});

test('loopback bridge serves UI, blocks cross-origin and private files', async t => {
    const server = createServer({ fetchImpl: async () => Response.json({ shot_plans: [{ model_pose: '走动' }] }) });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + '/.env.example')).status, 404);
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: '雨夜' }) };
    assert.equal((await fetch(base + '/api/director/plan', options)).status, 200);
    assert.equal((await fetch(base + '/api/director/plan', { ...options, headers: { ...options.headers, Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(base + '/api/director/plan', { ...options, body: '{' })).status, 400);
});

test('loopback bridge serves only generated PNG candidates', async t => {
    const generationRoot = await mkdtemp(path.join(os.tmpdir(), 'photoatelier-generation-'));
    const candidateName = 'workflow-test-candidate.png';
    await writeFile(path.join(generationRoot, candidateName), Buffer.from([137, 80, 78, 71]));
    const server = createServer({
        generationRoot,
        fetchImpl: async (url) => {
            assert.match(url, /\/v1\/photoatelier\/external-generate$/);
            return Response.json({
                status: 'external-api-generated-aesthetic-review-required',
                generation: {
                    model: 'black-forest-labs/FLUX.1-schnell',
                    output: path.join(generationRoot, candidateName),
                    shot_language: 'reflection-frame',
                    pose_composition_gate: { status: 'blocked', reasons: ['visual-energy-too-central'] },
                    face_quality_gate: { status: 'blocked' },
                },
            });
        },
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(base + '/api/director/generate-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            request_id: 'workflow-test', brief: '候选图', dry_run: false,
            shot_contract: { shot_language: 'reflection-frame', generator_prompt: 'selected reflection contract' }
        }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.candidateAsset.synthetic, true);
    assert.equal(data.candidateAsset.status, 'candidate-awaiting-review');
    assert.equal(data.candidateAsset.poseStatus, 'blocked');
    assert.deepEqual(data.candidateAsset.poseReasons, ['visual-energy-too-central']);
    assert.equal(data.candidateAsset.faceQualityStatus, 'blocked');
    assert.equal(data.candidateAsset.shotLanguage, 'reflection-frame');
    assert.equal((await fetch(base + data.candidateAsset.url)).status, 200);
    assert.equal((await fetch(base + '/api/director/candidates/../.env.example')).status, 404);
});

test('all inline scripts parse and submit awaits director, shot list reuses response', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (!/application\/ld\+json|src=/.test(match[1])) new vm.Script(match[2]);
    }
    assert.match(html, /const plan=await window\.generateDirectorPlan\(input\)/);
    assert.match(html, /if \(plan\.director\) return plan\.shotList \|\| \[\];/);
    assert.match(html, /generateDirectorCandidateForPlan/);
    assert.match(html, /candidate-model-/);
    assert.match(html, /huggingface:black-forest-labs\/FLUX\.1-schnell/);
    assert.match(html, /pollinations:flux/);
    assert.match(html, /pollinations:krea/);
    assert.match(html, /pollinations:sana/);
    assert.match(html, /公开实验模型仅支持文字提示词/);
    assert.match(html, /generationRequest\.reference_image_path = identityReferencePath/);
    assert.match(html, /buildIdentityLockWorkflowForPlan/);
    assert.match(html, /identity-workflow-status-/);
    assert.match(html, /synthetic=true/);
    assert.match(html, /\[SHOT CONTRACT - HARD\]/);
    assert.match(html, /compileDirectorShotContract/);
    assert.match(html, /当前分镜合同内部冲突/);
    assert.match(html, /contractBundle\.section/);
    assert.match(html, /构图闸门：阻断/);
    assert.match(html, /人脸闸门：阻断/);
    assert.match(html, /const IS_LOCAL_HOST = \['127\.0\.0\.1', 'localhost', '\[::1\]'\]/);
    assert.match(html, /if \(USE_LOCAL_MODE\) \{/);
});
