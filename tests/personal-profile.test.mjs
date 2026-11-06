import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('personal profiles persist by account and failed saves retain the previous profile', async () => {
    const source = await readFile(new URL('../assets/personal-profile.js', import.meta.url), 'utf8');
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            value: '', textContent: '', disabled: false, handlers: {},
            addEventListener(name, handler) { this.handlers[name] = handler; },
            replaceChildren() {}, append() {},
        });
        return elements.get(id);
    };
    const saved = new Map([['pa_workspace_owner', 'account-a']]);
    let failSave = false;
    const window = { addEventListener() {} };
    vm.runInNewContext(source, {
        window, document: { getElementById: element, createElement: () => ({}) },
        localStorage: {
            getItem: key => saved.get(key) || null,
            setItem: (key, value) => { if (failSave) throw Error('quota'); saved.set(key, value); },
        },
    });
    const submit = () => element('profileForm').handlers.submit({ preventDefault() {} });
    element('profileName').value = '小林'; submit();
    assert.equal(JSON.parse(saved.get('pa_personal_profile:account-a')).name, '小林');
    saved.set('pa_workspace_owner', 'account-b');
    window.PhotoAtelierProfile.render();
    assert.equal(element('profileName').value, '我');
    element('profileName').value = '小陈'; submit();
    saved.set('pa_workspace_owner', 'account-a');
    window.PhotoAtelierProfile.render();
    assert.equal(element('profileName').value, '小林');
    failSave = true;
    element('profileName').value = '未保存'; submit();
    assert.match(element('profileStatus').textContent, /保存失败/);
    assert.equal(JSON.parse(saved.get('pa_personal_profile:account-a')).name, '小林');
    saved.set('pa_workspace_owner', 'account-b');
    element('profileName').value = '错误账户'; submit();
    assert.equal(JSON.parse(saved.get('pa_personal_profile:account-b')).name, '小陈');
});
