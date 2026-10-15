import { isWorkspaceLocalKey, workspaceEntryKey, mergeWorkspace, equivalent } from './workspace-sync-protocol.mjs';

let running = false, lastError = '', database;
function capture() {
    const entries = {};
    for (const key of Object.keys(localStorage).filter(isWorkspaceLocalKey).sort()) {
        let value;
        try { value = JSON.parse(localStorage.getItem(key)); } catch { value = localStorage.getItem(key); }
        if (Array.isArray(value) && value.every(item => item && typeof item === 'object' && item.id != null)
            && new Set(value.map(item => String(item.id))).size === value.length) {
            entries[workspaceEntryKey('local', key, '$array')] = true;
            for (const item of value) entries[workspaceEntryKey('local', key, `record:${item.id}`)] = item;
        } else entries[workspaceEntryKey('local', key, '$value')] = value;
    }
    return entries;
}
async function baseline(user, mode, value) {
    if (!database) database = new Promise((resolve, reject) => {
        const request = indexedDB.open('photoatelier_workspace_sync', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('state');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const db = await database;
    return new Promise((resolve, reject) => {
        const tx = db.transaction('state', mode === 'read' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('state');
        const request = mode === 'read' ? store.get(user) : store.put(value, user);
        tx.oncomplete = () => resolve(mode === 'read' ? request.result || {} : value);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Sync baseline transaction aborted'));
    });
}
function apply(entries) {
    const groups = new Map();
    for (const [key, value] of Object.entries(entries)) {
        const [, name, id] = JSON.parse(key);
        if (!groups.has(name)) groups.set(name, { records: [] });
        if (id === '$value') groups.get(name).value = value;
        else if (id !== '$array') groups.get(name).records.push(value);
    }
    const before = Object.fromEntries(Object.keys(localStorage).filter(isWorkspaceLocalKey).map(key => [key, localStorage.getItem(key)]));
    try {
        for (const key of Object.keys(before)) if (!groups.has(key)) localStorage.removeItem(key);
        for (const [key, group] of groups) localStorage.setItem(key, JSON.stringify('value' in group ? group.value : group.records));
    } catch (error) {
        for (const key of Object.keys(localStorage).filter(isWorkspaceLocalKey)) localStorage.removeItem(key);
        for (const [key, value] of Object.entries(before)) localStorage.setItem(key, value);
        throw error;
    }
}
function editing() {
    return /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
}
export async function syncWorkspace(options = {}) {
    if (!window.__PHOTOATELIER_SESSION_VERIFIED__) return false;
    const token = localStorage.getItem('pw_token');
    if (!token || token === 'local-token' || (!options.force && editing()) || window.PhotoAtelierAccountStorage?.changing) return false;
    if (running) return false;
    let user;
    try { user = JSON.parse(localStorage.getItem('pw_user') || '{}').id; } catch { return; }
    if (!user || !window.api) return false;
    const sameSession = () => localStorage.getItem('pw_token') === token
        && localStorage.getItem('pa_workspace_owner') === String(user)
        && !window.PhotoAtelierAccountStorage?.changing;
    running = true;
    try {
        const owner = localStorage.getItem('pa_workspace_owner');
        if (owner && owner !== String(user)) throw new Error('浏览器保留着另一账号的资料，请先导出备份；未向当前账号上传。');
        const old = await baseline(String(user), 'read');
        const remote = await window.api.request('/api/workspace/state');
        if (!sameSession()) return false;
        const local = capture();
        const merged = mergeWorkspace(old, local, remote.entries);
        if (merged.conflicts.length) throw new Error(`同步冲突：${merged.conflicts.length} 条资料在两边都被修改，两份原始数据均已保留。`);
        if (!options.force && editing()) return false;
        if (!equivalent(merged.entries, remote.entries)) await window.api.request('/api/workspace/state', 'POST', { revision: remote.revision, entries: merged.entries }, 45000);
        // Requests may outlive user input; do not replace changes made meanwhile.
        if (!sameSession() || !equivalent(capture(), local) || (!options.force && editing())) return false;
        const changed = !equivalent(merged.entries, local);
        if (changed) apply(merged.entries);
        await baseline(String(user), 'write', merged.entries);
        localStorage.setItem('pa_workspace_owner', String(user));
        lastError = '';
        if (changed && !options.noReload) location.reload();
        return true;
    } catch (error) {
        const message = String(error.message || error);
        if (message !== lastError) {
            console.warn('[PhotoAtelier workspace sync]', message);
            if (typeof toast === 'function') toast(message, 'er');
        }
        lastError = message;
        return false;
    } finally { running = false; }
}
if (typeof window !== 'undefined') {
    window.PhotoAtelierWorkspaceSync = { sync: syncWorkspace };
    window.addEventListener('photoatelier:session-ready', syncWorkspace);
    window.addEventListener('focus', syncWorkspace);
    setInterval(() => { if (!document.hidden) syncWorkspace(); }, 15000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncWorkspace, { once: true });
    else syncWorkspace();
}
