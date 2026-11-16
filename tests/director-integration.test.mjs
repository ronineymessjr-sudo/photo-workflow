import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createDirectorPlan, createGuestPlanDraft } from '../api/director-plan.mjs';
import { generateDirectorCandidate } from '../api/director-generation.mjs';
import { buildDirectorIdentityWorkflow } from '../api/director-identity-workflow.mjs';
import { attachLocalImageGenerationStatus, createServer } from '../tools/serve-director.mjs';

async function listenOnFetchablePort(server) {
    let lastError;
    for (let attempt = 0; attempt < 8; attempt++) {
        const port = randomInt(49152, 65536);
        try {
            await new Promise((resolve, reject) => {
                const onError = error => { server.off('listening', onListening); reject(error); };
                const onListening = () => { server.off('error', onError); resolve(); };
                server.once('error', onError);
                server.once('listening', onListening);
                server.listen(port, '127.0.0.1');
            });
            return port;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

test('local BYOK plans expose candidate generation only when Director credentials are verified', async () => {
    const plan = { director: { source: 'byok-ai-plan', imageGenerationConnected: false, imageGenerationMode: 'text-only-ai-plan' } };
    const configured = await attachLocalImageGenerationStatus(plan, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async url => {
            assert.equal(String(url), 'http://127.0.0.1:8004/v1/photoatelier/external-provider-status');
            return Response.json({ credential_configured: true, provider: 'huggingface', model: 'black-forest-labs/FLUX.1-schnell', secret_exposed: false });
        },
    });
    assert.equal(configured.director.imageGenerationConnected, true);
    assert.equal(configured.director.imageGenerationMode, 'local-external-provider-candidate-review');
    assert.equal(configured.director.imageGenerationProvider, 'huggingface');
    assert.equal(configured.director.imageGenerationModel, 'black-forest-labs/FLUX.1-schnell');
    assert.equal(Object.hasOwn(configured.director, 'apiKey'), false);

    const unavailable = { director: { source: 'byok-ai-plan', imageGenerationConnected: false } };
    await attachLocalImageGenerationStatus(unavailable, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async () => Response.json({ credential_configured: false }),
    });
    assert.equal(unavailable.director.imageGenerationConnected, false);
    const unrelated = { director: { source: 'guest-rule-draft', imageGenerationConnected: false } };
    await attachLocalImageGenerationStatus(unrelated, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async () => { throw new Error('must not be called'); },
    });
    assert.equal(unrelated.director.imageGenerationConnected, false);
});

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
    assert.equal(plan.shotList[0].directorContract.label, undefined);
    assert.equal(plan.shotList[0].directorContract.subjectScale, undefined);
});

test('theme and style can be omitted while the Director receives safe creative guidance', async () => {
    let submitted;
    const plan = await createDirectorPlan({ scene: '有树荫的公园', duration: '1小时', people: '1' }, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async (url, options) => {
            submitted = JSON.parse(options.body);
            return Response.json({ shot_plans: [{ model_pose: '打开书本并拿取饮品', shot_props: '书本、饮品', photographer_position: '沿步道侧前方拍摄' }] });
        },
    });
    assert.match(submitted.brief, /主题未指定/);
    assert.match(submitted.brief, /不要臆造未提供的具体地点、人物关系、服装或道具/);
    assert.match(submitted.brief, /道具限制为硬约束/);
    assert.match(submitted.brief, /用户未指定服装、发型或妆容：将其标为待确认/);
    assert.equal(plan.input.theme, '');
    assert.equal(plan.input.style, '');
    assert.equal(plan.title, '有树荫的公园拍摄方案');
    assert.equal(plan.shotList[0].scene, '有树荫的公园');
    assert.match(plan.shotList[0].description, /模特自然站立/);
    assert.match(plan.shotList[0].props, /无新增道具/);
});

test('person-focused Director rejects a zero-person brief instead of returning portraits', async () => {
    await assert.rejects(createDirectorPlan({ theme: '陶瓷杯静物产品图', people: '0' }, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async () => { throw new Error('must not call portrait planner'); },
    }), /PERSON_REQUIRED/);
});

test('brand-product briefs keep the user product while removing invented props', async () => {
    const plan = await createDirectorPlan({
        theme: '品牌人物内容', modelDesc: '成年人物与产品使用者', scene: '明亮室内或店铺',
        extra: '明确产品使用动作，预留横竖画幅裁切空间', people: '1',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [{
            shot_language: 'prop-interaction', model_pose: '展示产品，打开书本并拿取饮品',
            model_position: '人物和产品位于画面中央，书本与饮料作为辅助道具',
            photographer_position: '在桌边拍摄', shot_props: '产品、书本、饮品',
            framing: '中景产品使用场景', shot_size: 'MS', camera_angle: 'eye_level',
            crop_boundary: '双手与产品完整', must_show: '产品使用动作', reject_if: '产品被遮挡',
        }] }),
    });

    const shot = plan.shotList[0];
    assert.match(shot.props, /用户指定产品/);
    assert.match(shot.description, /用户指定产品/);
    assert.doesNotMatch(`${shot.description} ${shot.composition} ${shot.notes} ${shot.directorContract.generator_prompt}`, /书本|饮品|books?|drink/i);
});

test('specific product briefs preserve the exact product and remove unrelated objects from every shot field', async () => {
    const plan = await createDirectorPlan({
        theme: '白色陶瓷杯品牌产品摄影', modelDesc: '成年模特', scene: '简洁室内',
        extra: '以白色陶瓷杯为主体，不新增其他物品', people: '1',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [
            { shot_language: '桌边生活方式', model_pose: '模特阅读书本并拿起咖啡', model_position: '书本和咖啡杯放在桌上', shot_props: '陶瓷杯、书本、咖啡', shot_size: 'MS', camera_angle: 'eye_level' },
            { shot_language: '产品细节', model_pose: '展示产品', shot_props: '产品、手机', shot_size: 'CU', camera_angle: 'high_angle' },
        ] }),
    });

    assert.equal(plan.shotList.length, 2);
    for (const shot of plan.shotList) {
        const content = [shot.title, shot.description, shot.composition, shot.props, shot.notes,
            shot.alternative, shot.directorContract.generator_prompt].join(' ');
        assert.match(content, /陶瓷杯/);
        assert.doesNotMatch(content, /书本|咖啡|手机|coffee|book/i);
    }
});

test('product actions stay distinct across close, medium, and environmental shot sizes', async () => {
    const shotSizes = ['CU', 'MCU', 'ECU', 'MS', 'MFS', 'MS', 'FS', 'WS', 'EWS'];
    const plan = await createDirectorPlan({
        theme: '白色陶瓷杯产品摄影', modelDesc: '成年模特', scene: '简洁室内', duration: '2小时', people: '1',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: shotSizes.map((shot_size, i) => ({
            shot_language: `产品镜头 ${i + 1}`, model_pose: '打开书本后展示产品', shot_size, camera_angle: 'eye_level',
        })) }),
    });

    assert.equal(plan.shotList.length, shotSizes.length);
    assert.ok(new Set(plan.shotList.map(shot => shot.description)).size >= 7);
    assert.ok(plan.shotList.every(shot => /陶瓷杯/.test(`${shot.description} ${shot.composition} ${shot.directorContract.generator_prompt}`)));
});

test('ten-shot product plans do not repeat actions when the same framing occurs several times', async () => {
    const shotSizes = ['CU', 'FS', 'FS', 'MS', 'FS', 'MS', 'FS', 'MFS', 'MS', 'MFS'];
    const plan = await createDirectorPlan({
        modelDesc: '一位成年模特', scene: '干净的白色室内背景', style: '自然柔光',
        extra: '产品是白色陶瓷杯；只使用这个杯子，不增加其他道具。', duration: '1小时', people: '1',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: shotSizes.map((shot_size, i) => ({
            shot_language: `产品镜头 ${i + 1}`, model_pose: '展示白色陶瓷杯', shot_size, camera_angle: 'eye_level',
        })) }),
    });

    assert.equal(plan.shotList.length, shotSizes.length);
    assert.equal(new Set(plan.shotList.map(shot => shot.description)).size, shotSizes.length);
});

test('explicit no-prop constraints sanitize unsafe Director fields and internal English labels', async () => {
    const plan = await createDirectorPlan({
        theme: '雨后老城街巷人像', modelDesc: '成年模特', scene: '旧城街巷，傍晚自然光',
        extra: '不新增未提供的道具',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [{
            shot_language: 'reflection-frame', model_pose: '查看地图并触碰橱窗',
            model_position: '人物整理衣摆，手持咖啡', photographer_position: 'near the window',
            shot_props: '地图、咖啡', must_show: '橱窗倒影与地图', execution_note: 'touch the glass',
            camera_angle: 'over_shoulder', shot_size: 'FS', lens: '35mm',
        }] }),
    });

    const shot = plan.shotList[0];
    assert.equal(shot.title, '肩后全身人像 1');
    assert.match(shot.description, /自然站立/);
    assert.match(shot.composition, /不加入未提供的物件/);
    assert.match(shot.method, /安全通行区域/);
    assert.match(shot.wardrobe, /待确认/);
    assert.match(shot.props, /无新增道具/);
    assert.equal(shot.angle, '肩后机位');
    assert.equal(shot.directorContract.must_show, '人物姿态、视线方向与已确认场地');
    assert.equal(shot.directorContract.reject_if, '新增未提供的物品、人物关系或物件互动');
    assert.equal(shot.directorContract.execution_note, '根据当前景别和机位，使用站姿、步行、视线及重心变化完成镜头。');
    assert.doesNotMatch(shot.notes, /地图|橱窗|咖啡|道具互动/);
    assert.doesNotMatch(shot.alternative, /touch|glass|map/i);
    assert.doesNotMatch(shot.directorContract.generator_prompt, /地图|橱窗|咖啡|查看地图|触碰橱窗/);
});

test('unprovided lighting equipment is removed from the lighting plan and image prompt', async () => {
    const plan = await createDirectorPlan({
        theme: '室内自然人像', modelDesc: '成年模特；服装由现场确认', scene: '简洁室内自然光',
        extra: '不要新增道具，拍摄使用现场自然光。',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [{
            model_pose: '模特自然站立，轻微转动肩线。', photographer_position: '距主体约3米，平视拍摄',
            lens: '50mm', shot_size: 'FS', camera_angle: 'eye_level',
            lighting_setup: '使用白色反光板在人物正前方补光。',
            generator_prompt: 'Editorial portrait, full-body, white reflector fill light.',
        }] }),
    });

    const shot = plan.shotList[0];
    assert.match(shot.lighting, /现场已有自然光/);
    assert.doesNotMatch(shot.lighting, /反光板/);
    assert.match(shot.directorContract.generator_prompt, /natural ambient light/);
    assert.doesNotMatch(shot.directorContract.generator_prompt, /reflector/i);
});

test('explicitly provided lighting equipment remains available to the plan', async () => {
    const plan = await createDirectorPlan({
        theme: '室内自然人像', modelDesc: '成年模特', scene: '简洁室内自然光',
        extra: '摄影师自带白色反光板补光。',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [{
            model_pose: '模特自然站立，轻微转动肩线。', photographer_position: '距主体约3米，平视拍摄',
            lens: '50mm', shot_size: 'FS', camera_angle: 'eye_level',
            lighting_setup: '使用白色反光板在人物正前方补光。',
            generator_prompt: 'Editorial portrait, full-body, white reflector fill light.',
        }] }),
    });

    assert.match(plan.shotList[0].lighting, /反光板/);
});

test('an explicitly labeled theme in extra requirements becomes the saved plan title', async () => {
    let submitted;
    const plan = await createDirectorPlan({ scene: '校园林荫道', duration: '2小时', extra: '主题：校园毕业季人像；情绪清新克制' }, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async (url, options) => {
            submitted = JSON.parse(options.body);
            return Response.json({ shot_plans: [{ model_pose: '自然站立并回望', photographer_position: '距主体约3米平视拍摄' }] });
        },
    });
    assert.match(submitted.brief, /主题：校园毕业季人像/);
    assert.doesNotMatch(submitted.brief, /主题未指定/);
    assert.equal(plan.input.theme, '校园毕业季人像');
    assert.equal(plan.title, '校园毕业季人像');
});

test('shot target varies with duration without copying upstream shots to fill it', async () => {
    const cases = [
        [{ theme: '纪实人像', duration: '1小时' }, 9],
        [{ theme: '纪实人像', duration: '2小时' }, 11],
        [{ theme: '纪实人像', duration: '5小时' }, 15],
        [{ theme: '品牌短片', duration: '5小时', people: '2', scene: '室内、室外' }, 16],
    ];
    for (const [input, count] of cases) {
        let requested;
        const plan = await createDirectorPlan(input, {
            baseUrl: 'http://localhost', fetchImpl: async (url, options) => {
                requested = JSON.parse(options.body).output_count;
                return Response.json({ shot_plans: [
                    { shot_language: 'same', model_pose: '走动', camera_angle: 'eye_level', shot_size: 'FS' },
                    { shot_language: 'same', model_pose: '走动' },
                    { shot_language: 'detail', model_pose: '手部细节' },
                ] });
            },
        });
        assert.equal(requested, count);
        assert.equal(plan.director.desiredShotCount, count);
        assert.equal(plan.director.shotCountLimited, true);
        assert.equal(plan.shotList.length, 2);
        assert.equal(plan.shotList[0].title, '人像拍摄镜头 1');
        assert.equal(plan.shotList[0].description, '走动');
        assert.equal(plan.shotList[1].sourceShotIndex, 2);
        assert.equal(plan.shotList[0].angle, '平视');
        assert.equal(plan.shotList[0].shotSize, '全身');
        assert.equal(plan.sections.length, 2);
        assert.ok(plan.sections.every(section => section.ti.startsWith('镜头')));
    }
});

test('guest draft is executable without a Director deployment and retains distinct shots', () => {
    const plan = createGuestPlanDraft({ theme: '雨夜城市纪实', scene: '斑马线', duration: '2小时', people: '1' });
    assert.equal(plan.director.source, 'guest-rule-draft');
    assert.equal(plan.director.imageGenerationConnected, false);
    assert.equal(plan.shotList.length, 11);
    assert.equal(new Set(plan.shotList.map(shot => shot.title)).size, plan.shotList.length);
    assert.equal(plan.images.length, 0);
});

test('guest draft can generate a neutral portrait plan with no theme or style', () => {
    const plan = createGuestPlanDraft({ duration: '1小时', people: '1' });
    assert.equal(plan.title, '自然人像方案');
    assert.equal(plan.input.theme, undefined);
    assert.equal(plan.input.style, undefined);
    assert.equal(plan.shotList.length, 9);
});

test('plan title uses the chosen scene and style when theme is omitted', async () => {
    const plan = await createDirectorPlan({ scene: '旧城街巷', style: '纪实自然', duration: '1小时' }, {
        baseUrl: 'http://127.0.0.1:8004', fetchImpl: async () => Response.json({
            shot_plans: [{ shot_language: '街巷环境', model_pose: '自然行走' }],
        }),
    });
    assert.equal(plan.title, '旧城街巷·纪实自然拍摄方案');
});

test('minimal briefs replace ambiguous alternative actions and number every shot', async () => {
    const plan = await createDirectorPlan({ extra: '想拍一组自然的人像照片。', duration: '1小时' }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: [
            { shot_language: '环境远景人像', model_pose: '完整站姿或沿横向路径缓慢行走，不看镜头，动作与环境发生关系', shot_size: 'EWS' },
            { shot_language: '表情特写', model_pose: '先闭眼呼吸再缓慢睁眼', shot_size: 'CU' },
        ] }),
    });

    assert.equal(plan.shotList.length, 2);
    assert.match(plan.shotList[0].title, /1$/);
    assert.match(plan.shotList[0].description, /模特/);
    assert.doesNotMatch(plan.shotList[0].description, /或|动作与环境发生关系/);
    assert.match(plan.shotList[1].title, /2$/);
});

test('sixteen-shot minimal portrait plans use distinct location-neutral fallback actions', async () => {
    const plan = await createDirectorPlan({
        scene: '室内；自然光', extra: '想拍自然的人像照片。', duration: '5小时', people: '1',
    }, {
        baseUrl: 'http://127.0.0.1:8004',
        fetchImpl: async () => Response.json({ shot_plans: Array.from({ length: 16 }, (_, i) => ({
            shot_language: `人像镜头 ${i + 1}`, model_pose: '站立或行走，根据现场情况与环境互动', shot_size: 'MS',
        })) }),
    });

    assert.equal(plan.shotList.length, 16);
    assert.equal(new Set(plan.shotList.map(shot => shot.description)).size, 16);
    assert.ok(plan.shotList.every((shot, i) => shot.title.endsWith(String(i + 1))));
    assert.doesNotMatch(plan.shotList.map(shot => shot.description).join(' '), /街巷|咖啡|书本|橱窗/);
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
    const port = await listenOnFetchablePort(server);
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(base)).status, 200);
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json().then(({ status, service }) => ({ status, service })), {
        status: 'ok', service: 'photo-workflow-local',
    });
    assert.equal((await fetch(base + '/favicon.jpg')).status, 200);
    assert.equal((await fetch(base + '/.env.example')).status, 404);
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: '雨夜' }) };
    assert.equal((await fetch(base + '/api/director/plan', options)).status, 200);
    assert.equal((await fetch(base + '/api/director/plan', { ...options, headers: { ...options.headers, Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(base + '/api/director/plan', { ...options, body: '{' })).status, 400);
});

test('main PhotoAtelier plan route keeps the Director generator when references are enabled', async t => {
    let directorCalls = 0;
    const fetched = [];
    const fetchImpl = async url => {
        const target = String(url);
        fetched.push(target);
        if (target.endsWith('/data/poses.json')) return Response.json({ poses: [
            { id: 'full_single_P015', no: 'P015', category: '站姿', names: { zh: '手扶腰自然站姿' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P015_front.jpg' }] },
            { id: 'full_single_P016', no: 'P016', category: '站姿', names: { zh: '自然整理发丝' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P016_front.jpg' }] },
            { id: 'full_single_P017', no: 'P017', category: '站姿', names: { zh: '站立回眸' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P017_front.jpg' }] },
            { id: 'full_single_P018', no: 'P018', category: '站姿', names: { zh: '双手轻扶腰侧' }, variants: [{ angle: 'front', thumb: 'thumbs/full_single_P018_front.jpg' }] },
        ] });
        if (target.endsWith('/data/costumes.json')) return Response.json({ costumes: [
            { id: 'AUT-0006', thumb: 'costume/thumbs/AUT-0006.webp', cat: 'autumn', group: 'top', color: 'brown', main: 'knit', tags: ['brown', 'knit', 'skirt', 'boots'] },
        ] });
        if (target.endsWith('/data/faces.json')) return Response.json({ images: [
            { id: 'test-face', thumb: 'portrait/thumbs/test-face.webp', sec: 'face', hair: 'medium', style: '自然人像参考' },
        ] });
        if (target.endsWith('/v1/photoatelier/shoot-plan')) {
            directorCalls++;
            return Response.json({ shot_plans: [{ model_pose: '来自旧 Director 路径' }] });
        }
        throw new Error('UNEXPECTED_FETCH');
    };
    const server = createServer({ fetchImpl });
    const port = await listenOnFetchablePort(server);
    t.after(() => new Promise(resolve => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${port}/api/director/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            theme: '秋日人像', scene: '公园小径；木亭长椅', modelDesc: '棕色针织上衣',
            duration: '1小时', people: '1', useReferenceLibrary: true, requireImageReferences: true,
            referenceIds: ['atlas-pose-full_single_p015', 'atlas-pose-full_single_p016', 'atlas-pose-full_single_p017', 'atlas-pose-full_single_p018', 'atlas-costume-aut-0006', 'atlas-portrait-test-face'],
        }),
    });
    assert.equal(response.status, 200, `${await response.clone().text()} ${JSON.stringify(fetched)}`);
    const plan = await response.json();
    assert.equal(plan.director.source, 'director-shoot-plan');
    assert.equal(directorCalls, 1);
    assert.equal(plan.shotList[0].title, '人像拍摄镜头 1');
    assert.equal(plan.shotList[0].scene, '公园小径');
    assert.ok(plan.aiStudio.references.some(reference => reference.kind === 'pose'));
    assert.ok(plan.aiStudio.references.some(reference => reference.kind === 'costume'));
    assert.ok(plan.aiStudio.references.some(reference => reference.kind === 'portrait'));
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
    const port = await listenOnFetchablePort(server);
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + port;
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
    assert.match(html, /const plan=generatedPlan=await window\.generateDirectorPlan\(input\)/);
    assert.match(html, /if \(plan\.director\) return plan\.shotList \|\| \[\];/);
    assert.match(html, /generateDirectorCandidateForPlan/);
    assert.match(html, /candidate-model-/);
    assert.match(html, /cloudflare:@cf\/black-forest-labs\/flux-2-klein-9b/);
    assert.match(html, /pollinations:flux/);
    assert.match(html, /pollinations:krea/);
    assert.match(html, /pollinations:sana/);
    assert.match(html, /公开实验模型仅支持文字提示词/);
    assert.match(html, /generationRequest\.reference_image_path = identityReferencePath/);
    assert.match(html, /buildIdentityLockWorkflowForPlan/);
    assert.match(html, /identity-workflow-status-/);
    assert.match(html, /synthetic: true/);
    assert.match(html, /shotSnapshot: JSON\.parse/);
    assert.match(html, /<caption>分镜总表<\/caption>/);
    assert.match(html, /function exportPlanWord\(id\)/);
    assert.match(html, /分镜总表（\$\{shots\.length\} 个）/);
    assert.doesNotMatch(html, /id="action-gen-img-btn">🎨 批量生成9张/);
    assert.match(html, /\[SHOT CONTRACT - HARD\]/);
    assert.match(html, /compileDirectorShotContract/);
    assert.match(html, /function compileDirectorSceneBrief\(plan, shot = null\)/);
    assert.match(html, /USER CONSTRAINTS: '\s*\+ input\.extra/);
    assert.match(html, /scene_brief: compileDirectorSceneBrief\(plan, shot\)/);
    assert.match(html, /function formatDirectorGenerationError\(error\)/);
    assert.match(html, /candidate-status-/);
    assert.match(html, /外部生图模型当前超时或暂不可用/);
    assert.match(html, /当前分镜合同内部冲突/);
    assert.match(html, /contractBundle\.section/);
    assert.match(html, /c\.poseStatus === 'blocked' \|\| c\.faceQualityStatus === 'blocked'/);
    assert.match(html, /const IS_LOCAL_HOST = \['127\.0\.0\.1', 'localhost', '\[::1\]'\]/);
    assert.match(html, /if \(USE_LOCAL_MODE\) \{/);
    assert.match(html, /window\.continueAsGuest = function/);
    assert.match(html, /let USE_GUEST_MODE = false/);
    assert.match(html, /localStorage\.setItem\('pa_guest_mode', 'false'\)/);
    assert.equal((html.match(/if \(USE_GUEST_MODE\) \{/g) || []).length, 0);
    assert.match(html, /id="tab-role-home"/);
    assert.match(html, /function applyRoleExperience\(role\)/);
    assert.match(html, /function renderRoleHome\(role\)/);
    assert.match(html, /photographer: \{ name: '摄影师'/);
    assert.match(html, /model: \{ name: '模特'/);
    assert.match(html, /assistant: \{ name: '摄影助理'/);
    assert.match(html, /audience: \['photographer', 'model', 'assistant'\]/);
    assert.match(html, /function openScheduleMonth\(dateValue\)/);
    assert.match(html, /function setCalendarMonth\(delta\)/);
    assert.match(html, /参与角色：\$\{formatScheduleAudience/);
    assert.doesNotMatch(html, /已同步给摄影师、模特、摄影助理|已同步：摄影师|同步到模特和摄影助理工作台/);
    assert.doesNotMatch(html, /创建方案、管理日程和交付/);
    assert.doesNotMatch(html, /查看拍摄通知、地点和动作重点/);
    assert.doesNotMatch(html, /准备器材、场地、日程与现场事项/);
    assert.doesNotMatch(html, /class="role-modal"/);
    assert.match(html, /id="settingsRoleSelect"/);
    assert.match(html, /id="schedPlanId"/);
    assert.match(html, /function applySchedulePlanSelection\(\)/);
    assert.match(html, /不会自动邀请其他账号或发送通知/);
});

test('plan submission explains sign-in failures without changing candidate-image guidance', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('async function handleSubmit(e){');
    const end = html.indexOf("\n$('briefForm').addEventListener", start);
    assert.ok(start >= 0 && end > start);

    const elements = new Map();
    const getElement = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', innerHTML: '', disabled: false,
            classList: { add() {}, remove() {}, contains() { return false; } }
        });
        return elements.get(id);
    };
    const notices = [];
    const context = {
        $: getElement,
        window: { generateDirectorPlan: async () => { throw new Error('SIGN_IN_REQUIRED'); } },
        toast: (...args) => notices.push(args),
        console: { error() {} },
        setTimeout: callback => { callback(); return 0; }
    };
    vm.runInNewContext(html.slice(start, end) + '\nresult = handleSubmit({ preventDefault() {} });', context);
    await context.result;

    assert.deepEqual(notices[0], ['请先登录后再生成摄影方案', 'er']);
    assert.match(html, /请登录后再生成并保存云端候选图/);
});

test('candidate card explains composition and unverified-face blockers', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('function getDirectorShotFitWarning(plan, shot, selectedIndex) {');
    const end = html.indexOf('\nfunction formatDirectorGenerationError(error)', start);
    assert.ok(start >= 0 && end > start);
    const context = {
        window: { location: { hostname: 'photo-workflow.pages.dev' } },
        plan: {
            id: 'test-plan',
            input: { extra: '人脸是画面重点，脸部占画面90%' },
            shotList: [
                { title: '高机位全身镜头', shotSize: '全身', directorContract: { shot_size: 'FS', generator_prompt: 'high-angle full-body frame' } },
                { title: '手部衣料特写', shotSize: '局部特写', directorContract: { shot_size: 'ECU', generator_prompt: 'hand and fabric detail, macro close-up' } },
                { title: '面部表情近景', shotSize: '近景', description: '近景表情，保留眼神与面部细节', directorContract: { shot_size: 'CU', generator_prompt: 'editorial close expression portrait, face fills frame' } }
            ],
            director: {
                selectedShotIndex: 0,
                generationCandidates: [{
                    url: '/api/director/candidates/test.png', shotIndex: 0,
                    poseStatus: 'blocked',
                    poseReasons: ['visual-energy-too-central', 'camera-angle-not-machine-verified'],
                    faceQualityStatus: 'blocked'
                }, {
                    url: 'https://photoatelier-api.photomagic.workers.dev/api/director/candidates/cloud-test', shotIndex: 2,
                    poseStatus: 'not-run', faceQualityStatus: 'not-run'
                }, {
                    url: 'https://untrusted.example/api/director/candidates/hidden', shotIndex: 1
                }]
            }
        },
        escHtml: value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
        inferAspectRatioFromPlan: () => 'landscape',
        renderShotInstructions: () => ''
    };
    vm.runInNewContext(html.slice(start, end) + '\nresult = renderDirectorCandidatePanel(plan);', context);
    assert.match(context.result, /检查说明/);
    assert.match(context.result, /人物与画面视觉重心偏中央/);
    assert.match(context.result, /检查器不能从图像验证俯拍角度/);
    assert.match(context.result, /不代表检测到脸部畸形/);
    assert.match(context.result, /需求与当前分镜的取景有冲突/);
    assert.match(context.result, /建议切换到镜头 03/);
    assert.match(context.result, /不会自动改写镜头合同/);
    assert.match(context.result, /src="https:\/\/photoatelier-api\.photomagic\.workers\.dev\/api\/director\/candidates\/cloud-test"/);
    assert.match(context.result, /alt="镜头 3 AI合成候选图"/);
    assert.doesNotMatch(context.result, /untrusted\.example/);
});

test('local BYOK candidate panel selects the verified image model and avoids cloud quota claims', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const start = html.indexOf('function renderDirectorCandidatePanel(plan) {');
    const end = html.indexOf('\nfunction formatDirectorGenerationError(error)', start);
    const context = {
        window: { location: { hostname: '127.0.0.1' } },
        plan: {
            id: 'local-test',
            input: { theme: '咖啡馆人像' },
            shotList: [{ title: '窗边全身环境像', directorContract: { shot_language: '窗边环境像', generator_prompt: 'full-body adult portrait by a cafe window' } }],
            director: { imageGenerationConnected: true, imageGenerationMode: 'local-external-provider-candidate-review',
                imageGenerationProvider: 'huggingface', imageGenerationModel: 'black-forest-labs/FLUX.1-schnell', submittedBrief: '咖啡馆窗边' },
        },
        escHtml: value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
        inferAspectRatioFromPlan: () => 'portrait', renderShotInstructions: () => '', getDirectorShotFitWarning: () => '',
    };
    assert.ok(start >= 0 && end > start);
    vm.runInNewContext(html.slice(start, end) + '\nresult = renderDirectorCandidatePanel(plan);', context);
    assert.match(context.result, /value="huggingface:black-forest-labs\/FLUX\.1-schnell" selected/);
    assert.match(context.result, /FLUX\.1-schnell · 本机已配置/);
    assert.match(context.result, /文件由本机 Director 管理/);
    assert.doesNotMatch(context.result, /每个账号每天最多 50 张|云端图片保留 90 天/);
});
