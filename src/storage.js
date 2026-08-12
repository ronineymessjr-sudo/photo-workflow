(function (root, factory) {
  const api = factory(root.PhotoWorkflowDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PhotoWorkflowStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Domain) {
  'use strict';

  const DB_NAME = 'photoatelier_local';
  const DB_VERSION = 1;
  let dbPromise = null;

  function available() { return typeof indexedDB !== 'undefined'; }
  function open() {
    if (!available()) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        Domain.ENTITY_TYPES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function transaction(storeName, mode, action) {
    const db = await open();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try { result = action(store); } catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function normalizeEntity(storeName, item) {
    const value = { ...(item || {}) };
    value.id = String(value.id || `${storeName}-${Domain.stableHash(value)}`);
    value.entityType = value.entityType || storeName;
    value.updatedAt = value.updatedAt || Domain.nowIso();
    return value;
  }

  async function put(storeName, item) {
    const value = normalizeEntity(storeName, item);
    await transaction(storeName, 'readwrite', store => store.put(value));
    return value;
  }
  async function bulkPut(storeName, items) {
    const values = (items || []).map(item => normalizeEntity(storeName, item));
    await transaction(storeName, 'readwrite', store => values.forEach(value => store.put(value)));
    return values;
  }
  async function get(storeName, id) {
    return transaction(storeName, 'readonly', store => store.get(String(id)));
  }
  async function getAll(storeName) {
    return transaction(storeName, 'readonly', store => store.getAll()).then(value => value || []);
  }
  async function remove(storeName, id) {
    return transaction(storeName, 'readwrite', store => store.delete(String(id)));
  }
  async function clearStore(storeName) {
    return transaction(storeName, 'readwrite', store => store.clear());
  }
  async function clearAll() {
    for (const storeName of Domain.ENTITY_TYPES) await clearStore(storeName);
  }

  function readJson(storage, key, fallback) {
    try { return JSON.parse(storage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; }
  }

  function isIgnoredPublicBetaProbeMessage(record) {
    if (!record || record.projectId !== 'public-beta' || record.type !== 'beta-feedback') return false;
    let metadata = {};
    if (typeof record.metadataJson === 'string') {
      try { metadata = JSON.parse(record.metadataJson || '{}'); } catch (_) {}
    } else {
      metadata = record.metadataJson || {};
    }
    const fingerprint = [record.id, record.traceId].map(value => String(value || '')).join(' ');
    const probeBuild = metadata.build === 'deploy-check' || /(^|-)deploy-check(?:-|$)/.test(fingerprint);
    const probeSession = (metadata.sessionId || record.relatedId) === 'system-check' || /(^|-)system-check(?:-|$)/.test(fingerprint);
    return probeBuild && probeSession;
  }

  async function pruneLegacyPublicBetaProbeMessages(storage) {
    const messages = readJson(storage, 'pw_messages', []);
    const kept = messages.filter(item => !isIgnoredPublicBetaProbeMessage(item));
    const removedIds = messages
      .filter(item => isIgnoredPublicBetaProbeMessage(item))
      .map(item => String(item.id))
      .filter(Boolean);
    if (!removedIds.length) return { messages, removedIds };
    storage.setItem('pw_messages', JSON.stringify(kept));
    await Promise.all(removedIds.map(id => remove('messages', id).catch(() => {})));
    return { messages: kept, removedIds };
  }

  async function migrateLegacy(storage) {
    if (!storage || !Domain) return { skipped: true, reason: 'storage unavailable' };
    const messageCleanup = await pruneLegacyPublicBetaProbeMessages(storage);
    const marker = readJson(storage, 'pa_indexeddb_migration_v1', null);
    if (marker && marker.completed) return marker;
    const snapshot = {
      pw_plans: readJson(storage, 'pw_plans', []),
      pw_schedule: readJson(storage, 'pw_schedule', []),
      pw_schedules: readJson(storage, 'pw_schedules', []),
      pw_messages: messageCleanup.messages,
      pa_reviews: readJson(storage, 'pa_reviews', []),
      pa_shoot_records: readJson(storage, 'pa_shoot_records', [])
    };
    const migrated = Domain.migrateLegacySnapshot(snapshot);
    const backup = { id: 'legacy-backup-v1', snapshot, createdAt: Domain.nowIso() };
    await put('meta', backup);
    await bulkPut('plans', migrated.plans);
    await bulkPut('schedules', migrated.schedules);
    await bulkPut('messages', migrated.messages);
    await bulkPut('reviews', migrated.reviews);
    await bulkPut('shootRecords', migrated.shootRecords);
    storage.setItem('pw_schedule', JSON.stringify(migrated.schedules));
    storage.setItem('pw_messages', JSON.stringify(migrated.messages));
    const result = {
      completed: true, schemaVersion: 1, completedAt: Domain.nowIso(),
      counts: { plans: migrated.plans.length, schedules: migrated.schedules.length, messages: migrated.messages.length }
    };
    storage.setItem('pa_indexeddb_migration_v1', JSON.stringify(result));
    return result;
  }

  async function exportDatabase() {
    const output = { schemaVersion: DB_VERSION, exportedAt: Domain.nowIso(), stores: {} };
    for (const store of Domain.ENTITY_TYPES) output.stores[store] = await getAll(store);
    return output;
  }

  return { DB_NAME, DB_VERSION, available, open, put, bulkPut, get, getAll, remove, clearStore, clearAll, migrateLegacy, exportDatabase };
});
