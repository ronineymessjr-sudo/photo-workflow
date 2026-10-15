const keys = new Set(['pw_plans', 'pw_eq', 'pw_venues', 'pw_models', 'pw_tpl', 'pw_schedule', 'pw_schedules', 'pw_messages', 'pw_todos', 'pa_custom_shots', 'pa_quote_settings']);
export const isWorkspaceLocalKey = key => keys.has(key) || /^pa_(?:shots|shot_status|shot_rating|shot_keeper|shot_notes|shot_time|shot_images)_[\w-]+$/.test(key);
export const workspaceEntryKey = (kind, name, id) => JSON.stringify([kind, name, id]);
export function isWorkspaceEntry(key) {
    try {
        const parts = JSON.parse(key);
        return Array.isArray(parts) && parts.length === 3 && parts[0] === 'local'
            && isWorkspaceLocalKey(parts[1]) && typeof parts[2] === 'string';
    } catch { return false; }
}
export function equivalent(left, right) {
    const normalize = value => {
        if (Array.isArray(value)) return value.map(normalize);
        if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
            .filter(key => !value.id || !['updatedAt', 'createdAt'].includes(key))
            .map(key => [key, normalize(value[key])]));
        return value;
    };
    return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}
export function mergeWorkspace(base, local, remote) {
    const entries = {}, conflicts = [];
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
        const before = base[key], here = local[key], there = remote[key];
        let selected;
        if (equivalent(here, there)) selected = there;
        else if (equivalent(here, before)) selected = there;
        else if (equivalent(there, before)) selected = here;
        else { conflicts.push(key); continue; }
        if (selected !== undefined) entries[key] = selected;
    }
    return { entries, conflicts };
}
