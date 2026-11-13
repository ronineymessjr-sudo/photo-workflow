import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const page = new URL('../index.html', import.meta.url);

test('removing legacy model examples keeps real people and archives examples only once', async () => {
    const html = await readFile(page, 'utf8');
    const start = html.indexOf('function removePresetModels()');
    const end = html.indexOf('function renderModel()', start);
    const real = { id: 'real-person', name: '小林', note: '周末可拍' };
    const store = new Map([['models', [real, { id: 'demo-1', name: '清冷夜景人像（预置）' }]]]);
    const context = { $: () => null, SK: { M: 'models' }, sg: key => store.get(key), ss: (key, value) => { store.set(key, value); return true; } };
    vm.runInNewContext(html.slice(start, end), context);
    context.removePresetModels();
    assert.equal(store.get('models').length, 1);
    assert.equal(store.get('models')[0], real);
    assert.equal(store.get('pa_archived_model_examples_v1').length, 1);
    context.removePresetModels();
    assert.equal(store.get('pa_archived_model_examples_v1').length, 1);
    store.set('models', [real, { id: 'demo-2', name: '产品使用者（预置）' }]);
    context.ss = () => false;
    context.removePresetModels();
    assert.equal(store.get('models').length, 2);
});

test('simplified workspace removes empty board navigation and disconnected batch actions', async () => {
    const html = await readFile(page, 'utf8');
    const nav = html.slice(html.indexOf('<nav class="sidebar-nav">'), html.indexOf('</nav>', html.indexOf('<nav class="sidebar-nav">')));
    assert.doesNotMatch(nav, /data-tab="(?:dashboard|message)"/);
    assert.doesNotMatch(html, /initBatchOperations|onclick="batchDelete\(\)"/);
    for (const id of ['f-model', 'f-scene', 'f-extra', 'f-dur', 'f-people', 'ownAiSettings', 'ownAiEnable', 'ownAiClear', 'histFull']) {
        assert.ok(html.includes(`id="${id}"`), `${id} must remain available`);
    }
});

test('plan output shows the empty prompt only while no plan is active', async () => {
    const html = await readFile(page, 'utf8');
    assert.match(html, /\.output-empty\s*\{\s*display:\s*none;/);
    assert.match(html, /\.output-empty\.active\s*\{\s*display:\s*flex;\s*\}/);
    assert.match(html, /class="output-empty active" id="outEmpty"/);
    assert.match(html, /\$\('outEmpty'\)\.classList\.remove\('active'\).*\$\('outCnt'\)\.classList\.add\('active'\)/);
    assert.match(html, /\$\('outCnt'\)\.classList\.remove\('active'\);\$\('outEmpty'\)\.classList\.add\('active'\)/);
});

test('mobile schedule cards keep details readable and actions on their own row', async () => {
    const css = await readFile(new URL('../assets/workspace-theme.css', import.meta.url), 'utf8');
    assert.match(css, /#tab-calendar \.schedule-item\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*22px 48px minmax\(0, 1fr\) 40px;/);
    assert.match(css, /#tab-calendar \.schedule-info\s*\{[^}]*grid-column:\s*3 \/ 5;[^}]*min-width:\s*0;/);
    assert.match(css, /#tab-calendar \.schedule-item > \.btn\s*\{[^}]*grid-row:\s*2;[^}]*min-height:\s*40px;/);
    assert.match(css, /#tab-calendar \.schedule-item > \.btn-i2\s*\{[^}]*grid-row:\s*2;[^}]*width:\s*40px;[^}]*min-height:\s*40px;/);
});

test('requested settings and private-resource fields are removed while notes remain', async () => {
    const html = await readFile(page, 'utf8');
    for (const id of ['settingsPexelsKey', 'importFileInput', 'm-contact', 'v-contact', 'm-tags', 'm-styles']) {
        assert.ok(!html.includes(`id="${id}"`), `${id} must not be an interface field`);
    }
    for (const id of ['m-note', 'v-note', 'modelPhotoControl', 'm-photo']) assert.ok(html.includes(`id="${id}"`));
    assert.ok(!html.includes('id="modelImagePlaceholder"'));
    assert.ok(html.includes('href="./assets/workspace-theme.css"'));
    assert.ok(html.includes('href="./assets/open-design-studio.css"'));
    assert.ok(html.includes('updateBadge();renderHistMini();renderQuickVenue();renderCalendar();renderSchedules();'));
});

test('preset generation opens the generator and submits once without an intermediate form', async () => {
    const html = await readFile(page, 'utf8');
    const start = html.indexOf('function generateFromPreset(');
    const end = html.indexOf('function renderSavedPlanLibrary()', start);
    assert.ok(start >= 0 && end > start);
    const fields = Object.fromEntries(['f-theme','f-style','f-model','f-scene','f-mood','f-dur','f-people','f-extra'].map(id => [id, { value: '' }]));
    let submits = 0; let tab;
    fields.genBtn = { disabled: false };
    fields.briefForm = { requestSubmit() { submits++; } };
    const context = { $: id => fields[id], showTab: value => { tab = value; } };
    vm.runInNewContext(html.slice(start, end), context);
    context.generateFromPreset({ theme: '自然人像', modelDesc: '成年人物', scene: '公园', extra: '仅35mm' });
    assert.equal(tab, 'gen'); assert.equal(submits, 1);
    assert.equal(fields['f-scene'].value, '公园');
    assert.equal(fields['f-extra'].value, '仅35mm');
    fields.genBtn.disabled = true;
    context.generateFromPreset({ theme: '第二次' });
    assert.equal(submits, 1);
    assert.equal(fields['f-theme'].value, '自然人像');
});

test('model creation saves name and notes without accessing removed fields', async () => {
    const html = await readFile(page, 'utf8');
    const start = html.indexOf("if($('modelForm'))");
    const end = html.indexOf('// ===== Templates =====', start);
    let submit; let saved;
    const elements = {
        modelForm: { addEventListener(_name, handler) { submit = handler; } },
        'm-name': { value: '测试模特' }, 'm-note': { value: '下午可拍，使用自己的服装' },
    };
    vm.runInNewContext(html.slice(start, end), {
        $: id => elements[id], Date, SK: { M: 'models' }, sg: () => [],
        modelPhotoData: '', clearModelPhoto() {}, ss: (_key, value) => { saved = value; return true; }, renderModel() {}, toast() {},
    });
    submit({ preventDefault() {} });
    assert.equal(saved[0].name, '测试模特');
    assert.equal(saved[0].note, '下午可拍，使用自己的服装');
    assert.equal('contact' in saved[0], false);
});

test('workspace inbox stays absent when empty and opens the existing inbox when records exist', async () => {
    const html = await readFile(page, 'utf8');
    const start = html.indexOf('async function renderWorkspaceInbox()');
    const end = html.indexOf('// 资源库内部Tab切换', start);
    const buttons = [];
    let records = [];
    let opened;
    const context = {
        api: { getMessages: async () => records },
        showTab: tab => { opened = tab; },
        document: {
            getElementById: id => id === 'tab-role-home' ? { classList: { contains: () => true } } : { append: button => buttons.push(button) },
            createElement: () => ({ addEventListener(_name, handler) { this.click = handler; } }),
        },
    };
    vm.runInNewContext(html.slice(start, end), context);
    await context.renderWorkspaceInbox();
    assert.equal(buttons.length, 0);
    records = [{ id: 'existing-message' }];
    await context.renderWorkspaceInbox();
    assert.equal(buttons[0].textContent, '消息 1');
    buttons[0].click();
    assert.equal(opened, 'message');
});
