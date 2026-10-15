(function (root) {
    if (root.PhotoAtelierAccountStorage) return;
    if (typeof localStorage !== 'undefined') root.__PHOTOATELIER_BOOT_OWNER__ = localStorage.getItem('pa_workspace_owner');
    const keys = new Set(['pw_plans', 'pw_eq', 'pw_venues', 'pw_models', 'pw_tpl', 'pw_schedule', 'pw_schedules', 'pw_messages', 'pw_todos', 'pa_custom_shots', 'pa_quote_settings']);
    const isBusinessKey = key => keys.has(key) || /^pa_(?:shots|shot_status|shot_rating|shot_keeper|shot_notes|shot_time|shot_images)_[\w-]+$/.test(key);
    let database, changing = false;
    function snapshot() {
        return Object.fromEntries(Object.keys(localStorage).filter(isBusinessKey).map(key => [key, localStorage.getItem(key)]));
    }
    async function archive(owner, current, next) {
        if (!database) database = new Promise((resolve, reject) => {
            const request = indexedDB.open('photoatelier_account_cache', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('accounts');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        const db = await database;
        return new Promise((resolve, reject) => {
            const tx = db.transaction('accounts', 'readwrite');
            const store = tx.objectStore('accounts');
            if (owner) store.put(current, `user:${owner}`);
            else if (Object.keys(current.data).length) store.put(current, `unassigned:${Date.now()}`);
            const request = store.get(`user:${next}`);
            tx.oncomplete = () => resolve(request.result || { data: {}, role: null });
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error || new Error('账号缓存保存失败'));
        });
    }
    async function activate(userId) {
        const next = userId == null ? null : String(userId);
        const owner = localStorage.getItem('pa_workspace_owner');
        if (owner === next && next !== null) return;
        if (changing) throw new Error('正在切换账号，请稍后重试');
        changing = true;
        const current = { data: snapshot(), role: localStorage.getItem('pw_role') };
        try {
            const saved = await archive(owner, current, next);
            // Auth controls keep the application hidden during this synchronous swap.
            for (const key of Object.keys(localStorage).filter(isBusinessKey)) localStorage.removeItem(key);
            localStorage.removeItem('pw_role');
            if (next !== null) {
                for (const [key, value] of Object.entries(saved.data)) if (isBusinessKey(key)) localStorage.setItem(key, value);
                if (saved.role) localStorage.setItem('pw_role', saved.role);
                localStorage.setItem('pa_workspace_owner', next);
            } else localStorage.removeItem('pa_workspace_owner');
        } catch (error) {
            for (const key of Object.keys(localStorage).filter(isBusinessKey)) localStorage.removeItem(key);
            for (const [key, value] of Object.entries(current.data)) localStorage.setItem(key, value);
            if (current.role) localStorage.setItem('pw_role', current.role);
            if (owner) localStorage.setItem('pa_workspace_owner', owner);
            else localStorage.removeItem('pa_workspace_owner');
            throw error;
        } finally { changing = false; }
    }
    root.PhotoAtelierAccountStorage = { isBusinessKey, activate, get changing() { return changing; } };
})(globalThis);
