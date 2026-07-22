import { AppError } from './errors.js';

export const V5_SCHEMA_VERSION = 5;

export function nowIso(clock = () => new Date()) {
  return clock().toISOString();
}

export function createId(prefix, random = () => globalThis.crypto?.randomUUID?.()) {
  const value = random?.();
  if (value) return `${prefix}-${value}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEntity(prefix, input = {}, options = {}) {
  const timestamp = input.createdAt || nowIso(options.clock);
  return {
    ...input,
    id: input.id || createId(prefix, options.random),
    schemaVersion: V5_SCHEMA_VERSION,
    recordVersion: Number.isInteger(input.recordVersion) ? input.recordVersion : 1,
    createdAt: timestamp,
    updatedAt: input.updatedAt || timestamp,
  };
}

export function assertExpectedVersion(entity, expectedVersion) {
  if (expectedVersion == null) return;
  if (entity.recordVersion !== expectedVersion) {
    throw new AppError('VERSION_CONFLICT', '记录已被其他操作修改，请刷新后重试', {
      id: entity.id,
      expectedVersion,
      actualVersion: entity.recordVersion,
    });
  }
}

export function updateEntity(entity, patch, options = {}) {
  assertExpectedVersion(entity, options.expectedVersion);
  return {
    ...entity,
    ...patch,
    id: entity.id,
    schemaVersion: V5_SCHEMA_VERSION,
    recordVersion: (entity.recordVersion || 1) + 1,
    updatedAt: nowIso(options.clock),
  };
}
