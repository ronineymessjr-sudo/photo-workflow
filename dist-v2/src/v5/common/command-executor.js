import { createEntity } from './entity.js';

export class CommandExecutor {
  constructor({ storage, repositories }) {
    this.storage = storage;
    this.repositories = repositories;
    this.depth = 0;
  }

  execute(operation, options = {}) {
    const transactional = options.transactional !== false;
    const snapshot = transactional && this.depth === 0 && this.storage?.snapshot
      ? this.storage.snapshot({ includeLegacy: true })
      : null;
    this.depth += 1;
    try {
      const result = operation();
      if (result?.then) {
        return result.then(value => {
          this.persistEvents(value?.events);
          this.depth -= 1;
          return value;
        }).catch(error => {
          this.depth -= 1;
          if (snapshot && this.storage?.restoreSnapshot) this.storage.restoreSnapshot(snapshot, { replace: true });
          throw error;
        });
      }
      this.persistEvents(result?.events);
      this.depth -= 1;
      return result;
    } catch (error) {
      this.depth -= 1;
      if (snapshot && this.storage?.restoreSnapshot) this.storage.restoreSnapshot(snapshot, { replace: true });
      throw error;
    }
  }

  persistEvents(events = []) {
    for (const event of events || []) {
      this.repositories.domainEvents.create(createEntity('domain-event', {
        eventType: event.type || 'UnknownDomainEvent',
        aggregateType: event.aggregateType || inferAggregateType(event),
        aggregateId: event.aggregateId || inferAggregateId(event),
        projectId: event.projectId || null,
        payload: structuredClone(event),
        occurredAt: event.occurredAt || new Date().toISOString(),
        dispatchStatus: 'pending',
      }));
    }
  }
}

export function transactionalFacade(service, executor, config = {}) {
  return new Proxy(service, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      return (...args) => {
        const methodConfig = config[property];
        if (!methodConfig) return value.apply(target, args);
        return executor.execute(() => value.apply(target, args), methodConfig === true ? {} : methodConfig);
      };
    },
  });
}

function inferAggregateType(event) {
  if (event.planRevisionId || event.planId) return 'planning';
  if (event.calendarEventId) return 'calendar';
  if (event.postProductionJobId) return 'post-production';
  if (event.sharePacketId) return 'sharing';
  return 'project';
}
function inferAggregateId(event) {
  return event.planRevisionId || event.planId || event.calendarEventId || event.postProductionJobId || event.sharePacketId || event.projectId || null;
}
