import { APP_SCHEMA_VERSION, APP_VERSION, BACKUP_FORMAT, LEGACY_KEYS } from './schema.js';

export class StorageRepository {
  constructor(prefix = 'pa_v2_', storage = globalThis.localStorage) {
    this.prefix = prefix;
    this.storage = storage;
  }

  key(name) { return `${this.prefix}${name}`; }

  get(name, fallback = null) {
    return parseJson(this.storage?.getItem?.(this.key(name)), fallback);
  }

  set(name, value) {
    if (!this.storage?.setItem) throw new Error('浏览器存储不可用');
    this.storage.setItem(this.key(name), JSON.stringify(value));
    return value;
  }

  remove(name) { this.storage?.removeItem?.(this.key(name)); }

  keys({ namespace = 'v2' } = {}) {
    if (!this.storage) return [];
    const keys = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (!key) continue;
      if (namespace === 'all' || (namespace === 'v2' && key.startsWith(this.prefix)) || (namespace === 'legacy' && !key.startsWith(this.prefix))) {
        keys.push(key);
      }
    }
    return keys.sort();
  }

  readRaw(key, fallback = null) {
    return parseJson(this.storage?.getItem?.(key), fallback);
  }

  writeRaw(key, value) {
    if (!this.storage?.setItem) throw new Error('浏览器存储不可用');
    this.storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  snapshot({ includeLegacy = true } = {}) {
    const namespaces = { v2: {}, legacy: {} };
    for (const key of this.keys({ namespace: 'all' })) {
      const raw = this.storage.getItem(key);
      if (key.startsWith(this.prefix)) namespaces.v2[key] = raw;
      else if (includeLegacy && (LEGACY_KEYS.includes(key) || key.startsWith('pa_shots_'))) namespaces.legacy[key] = raw;
    }
    return {
      format: BACKUP_FORMAT,
      appVersion: APP_VERSION,
      schemaVersion: APP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      namespaces,
    };
  }

  exportAll() {
    const snapshot = this.snapshot({ includeLegacy: false });
    return {
      version: APP_SCHEMA_VERSION,
      exportedAt: snapshot.exportedAt,
      data: snapshot.namespaces.v2,
      ...snapshot,
    };
  }

  importAll(payload, { mode = 'merge' } = {}) {
    const normalized = normalizeBackup(payload, this.prefix);
    if (mode !== 'merge' && mode !== 'replace') throw new Error('不支持的导入模式');
    const rollback = this.snapshot({ includeLegacy: true });
    try {
      if (mode === 'replace') {
        for (const key of this.keys({ namespace: 'v2' })) this.storage.removeItem(key);
      }
      Object.entries(normalized.namespaces.v2).forEach(([key, value]) => {
        if (key.startsWith(this.prefix)) this.storage.setItem(key, String(value));
      });
      Object.entries(normalized.namespaces.legacy || {}).forEach(([key, value]) => {
        if (LEGACY_KEYS.includes(key) || key.startsWith('pa_shots_')) this.storage.setItem(key, String(value));
      });
      return { ok: true, imported: Object.keys(normalized.namespaces.v2).length, rollback };
    } catch (error) {
      this.restoreSnapshot(rollback, { replace: true });
      throw error;
    }
  }

  restoreSnapshot(snapshot, { replace = false } = {}) {
    const normalized = normalizeBackup(snapshot, this.prefix);
    if (replace) {
      for (const key of this.keys({ namespace: 'all' })) {
        if (key.startsWith(this.prefix) || LEGACY_KEYS.includes(key) || key.startsWith('pa_shots_')) this.storage.removeItem(key);
      }
    }
    for (const namespace of ['v2', 'legacy']) {
      Object.entries(normalized.namespaces[namespace] || {}).forEach(([key, value]) => this.storage.setItem(key, String(value)));
    }
  }
}

function parseJson(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function normalizeBackup(payload, prefix) {
  if (!payload || typeof payload !== 'object') throw new Error('无效备份文件');
  if (payload.namespaces?.v2) return payload;
  if (payload.data && typeof payload.data === 'object') {
    const v2 = {};
    for (const [key, value] of Object.entries(payload.data)) {
      if (key.startsWith(prefix)) v2[key] = value;
    }
    return { format: payload.format || 'photoatelier.backup.legacy', namespaces: { v2, legacy: {} } };
  }
  throw new Error('备份中缺少 namespaces.v2 或 data');
}
