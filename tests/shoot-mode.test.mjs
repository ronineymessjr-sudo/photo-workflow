import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { createDirectorPlan } from '../api/director-plan.mjs';

const shootModeSource = await readFile(new URL('../assets/shoot-mode.js', import.meta.url), 'utf8');

function loadShootMode({ plan, storageInit = {} } = {}) {
    const storage = new Map(Object.entries(storageInit));
    const headChildren = [];
    const bodyChildren = [];
    const elementsById = new Map();

    const makeEl = (tag) => {
        const listeners = {};
        const el = {
            tagName: tag.toUpperCase(),
            id: '',
            innerHTML: '',
            textContent: '',
            dataset: {},
            attributes: {},
            setAttribute(k, v) { this.attributes[k] = v; },
            addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
            click() { (listeners.click || []).forEach(fn => fn()); },
            remove() {
                const idx = bodyChildren.indexOf(this);
                if (idx >= 0) bodyChildren.splice(idx, 1);
                if (this.id) elementsById.delete(this.id);
            },
            querySelector(sel) {
                if (sel === '[data-sm-close]') return this._closeBtn || null;
                if (sel === '[data-sm-toggle-done]') return this._doneBtn || null;
                if (sel === '[data-sm-prev]') return this._prevBtn || null;
                if (sel === '[data-sm-next]') return this._nextBtn || null;
                return null;
            },
            querySelectorAll() { return []; },
        };
        return el;
    };

    const document = {
        head: { appendChild(el) { headChildren.push(el); if (el.id) elementsById.set(el.id, el); } },
        body: { appendChild(el) { bodyChildren.push(el); if (el.id) elementsById.set(el.id, el); } },
        createElement: makeEl,
        getElementById(id) { return elementsById.get(id) || null; },
    };

    const context = vm.createContext({
        document,
        window: {
            currentPlanData: plan,
            addEventListener() {},
            removeEventListener() {},
        },
        localStorage: {
            getItem: k => storage.get(k) ?? null,
            setItem: (k, v) => storage.set(k, String(v)),
        },
        Set,
        Map,
        JSON,
        String,
        Number,
        Array,
        Math,
    });
    vm.runInContext(shootModeSource, context);
    return { api: context.PhotoAtelierShootMode, storage, bodyChildren };
}

test('clusterShotsForLocation groups by scene and sorts by focal length without losing originalIndex', () => {
    const { api } = loadShootMode();
    const input = [
        { title: '湖边特写', scene: '湖边木栈道', focalLength: '85mm' },
        { title: '竹林全身', scene: '竹林小径', focalLength: '35mm' },
        { title: '湖边全景', scene: '湖边木栈道', focalLength: '35mm' },
        { title: '竹林近景', scene: '竹林小径', focalLength: '50mm' },
    ];
    const clustered = JSON.parse(JSON.stringify(api.clusterShotsForLocation(input)));
    assert.deepEqual(
        clustered.map(s => ({ title: s.title, originalIndex: s.originalIndex })),
        [
            { title: '湖边全景', originalIndex: 2 },
            { title: '湖边特写', originalIndex: 0 },
            { title: '竹林全身', originalIndex: 1 },
            { title: '竹林近景', originalIndex: 3 },
        ]
    );
});

test('toggleDone persists completion state per planId in localStorage', () => {
    const { api, storage } = loadShootMode();
    assert.equal(api.getDoneSet('plan-1').size, 0);
    api.toggleDone('plan-1', 2);
    assert.deepEqual([...api.getDoneSet('plan-1')], [2]);
    assert.equal(storage.get('pa_shoot_done_plan-1'), '[2]');
    api.toggleDone('plan-1', 2);
    assert.equal(api.getDoneSet('plan-1').size, 0);
});

test('open renders Shoot Mode dialog with pose, optics, and reject_if warnings', () => {
    const plan = {
        id: 'plan-live',
        shotList: [
            {
                title: '林间行走回眸',
                scene: '竹林小径',
                shotSize: '全身',
                focalLength: '35mm',
                angle: '平视',
                description: '像听见身后有人叫你，自然回头看一眼',
                method: '距主体约4米跟随',
                composition: '三分法留白',
                lighting: '侧逆光',
                camera: { aperture: 'f/2.8–f/4.0', shutter: '1/500s 以上' },
                directorContract: { must_show: '人物完整全身', reject_if: '脚部被裁切' },
            },
        ],
    };
    const { api, bodyChildren } = loadShootMode({ plan });
    api.open('plan-live', 0);
    assert.equal(bodyChildren.length, 1);
    const html = bodyChildren[0].innerHTML;
    assert.match(html, /林间行走回眸/);
    assert.match(html, /像听见身后有人叫你，自然回头看一眼/);
    assert.match(html, /f\/2\.8–f\/4\.0/);
    assert.match(html, /1\/500s 以上/);
    assert.match(html, /脚部被裁切/);
    api.close();
    assert.equal(bodyChildren.length, 0);
});

test('createDirectorPlan suggests aperture and shutter based on shot size and motion', async () => {
    const plan = await createDirectorPlan(
        { theme: '秋日人像', scene: '公园小径', people: '1' },
        {
            baseUrl: 'https://director.test',
            fetchImpl: async () => Response.json({
                shot_plans: [
                    {
                        shot_language: '眼神特写',
                        model_pose: '静静望向镜头',
                        shot_size: 'CU',
                        camera_angle: 'eye_level',
                        lens: '85mm',
                    },
                    {
                        shot_language: '动态行走全景',
                        model_pose: '沿着小径自然行走',
                        shot_size: 'WS',
                        camera_angle: 'eye_level',
                        lens: '35mm',
                    },
                ],
            }),
        }
    );
    assert.match(plan.shotList[0].camera.aperture, /f\/1\.8–f\/2\.8/);
    assert.match(plan.shotList[0].camera.shutter, /1\/160s/);
    assert.match(plan.shotList[1].camera.aperture, /f\/5\.6–f\/8\.0/);
    assert.match(plan.shotList[1].camera.shutter, /1\/500s/);
});
