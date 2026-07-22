import { StorageRepository } from './core/storage.js';
import { DataService } from './services/data-service.js';
import { createV5Application } from './v5/application.js';

const storage = new StorageRepository();
const data = new DataService(storage);
const application = createV5Application({ data, storage });

let migrationReport = null;
let startupError = null;

try {
  migrationReport = application.migration.migrate({ commit: true });
  application.catalog.importEquipmentModels();
  application.catalog.importPlanTemplates();
} catch (error) {
  startupError = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
  };
  console.error('[PhotoAtelier V5] Failed to initialize the data engine.', error);
}

const bridge = Object.freeze({
  version: application.version,
  ready: startupError === null,
  application,
  data,
  storage,
  migrationReport,
  startupError,
});

Object.defineProperty(window, 'PhotoAtelierV5', {
  configurable: false,
  enumerable: true,
  writable: false,
  value: bridge,
});

document.documentElement.dataset.v5Engine = bridge.ready ? 'ready' : 'error';
document.documentElement.dataset.v5Version = bridge.version;

window.dispatchEvent(new CustomEvent('photoatelier:v5-ready', {
  detail: {
    version: bridge.version,
    ready: bridge.ready,
    migrationReport: bridge.migrationReport,
    startupError: bridge.startupError,
  },
}));
