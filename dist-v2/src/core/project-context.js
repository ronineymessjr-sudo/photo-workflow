export class ProjectContext {
  constructor(storage) {
    this.storage = storage;
    this.listeners = new Set();
  }

  get currentProjectId() {
    return this.storage.get('currentProjectId', null);
  }

  set currentProjectId(value) {
    this.storage.set('currentProjectId', value);
    this.listeners.forEach(fn => fn(value));
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
