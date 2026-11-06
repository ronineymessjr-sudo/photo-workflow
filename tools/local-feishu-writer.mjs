import { spawn } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FeishuSyncError, syncStudioPlanWithWriter } from '../api/ai-studio/feishu-sync.mjs';

const CONFIG_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../photo-workflow/worker/wrangler.toml');
const CLI_PATH = path.join(os.homedir(), '.larkcli', 'bin', 'lark-cli.exe');
const READ_ONLY_PROBE_ID = 'ai-studio-status-readonly-probe-v1';
// These are the existing V2 writer's text fields. The full projection stays in payloadJson.
const ENTITY_FIELDS = {
    plans: ['projectId', 'concept', 'rationale', 'generationMode', 'visualDirection', 'equipment', 'risks'],
    references: ['projectId', 'title', 'sourcePlatform', 'sourceUrl', 'styleTags', 'category', 'notes'],
};

function larkApi({ method, apiPath, body }) {
    return (async () => {
        const bodyPath = body ? path.join(process.cwd(), `.ai-studio-feishu-${randomUUID()}.json`) : null;
        if (bodyPath) await writeFile(bodyPath, JSON.stringify(body), { encoding: 'utf8', flag: 'wx' });
        try { return await new Promise((resolve, reject) => {
        const args = ['api', method, apiPath, '--as', 'bot', '--format', 'json'];
        if (bodyPath) args.push('--data', `@./${path.basename(bodyPath)}`);
        const child = spawn(CLI_PATH, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        let errorOutput = '';
        const timeout = setTimeout(() => { child.kill(); reject(new FeishuSyncError('FEISHU_CLI_TIMEOUT')); }, 30000);
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', chunk => {
            output += chunk;
            if (output.length > 8 * 1024 * 1024) { child.kill(); reject(new FeishuSyncError('FEISHU_CLI_RESPONSE_TOO_LARGE')); }
        });
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => { errorOutput = `${errorOutput}${chunk}`.slice(-2048); });
        child.on('error', () => { clearTimeout(timeout); reject(new FeishuSyncError('FEISHU_CLI_UNAVAILABLE')); });
        child.on('close', code => {
            clearTimeout(timeout);
            try {
                const payload = JSON.parse(output);
                if (code !== 0 || payload.code !== 0 || !payload.data) {
                    const apiCode = Number.isSafeInteger(payload.code) ? payload.code
                        : Number.isSafeInteger(payload.error?.code) ? payload.error.code : null;
                    const errorType = typeof payload.error?.type === 'string' && /^[a-z_-]{1,32}$/i.test(payload.error.type) ? payload.error.type.toUpperCase() : '';
                    reject(new FeishuSyncError(apiCode != null ? `FEISHU_API_${apiCode}` : errorType ? `FEISHU_API_${errorType}` : 'FEISHU_CLI_REQUEST_FAILED'));
                    return;
                }
                resolve(payload.data);
            } catch {
                const knownApiError = errorOutput.match(/FieldNameNotFound|FieldTypeNotMatch|InvalidFieldValue|TextFieldLimitExceeded|PermissionDenied|InvalidParams|FieldValueNotFound/i)?.[0];
                const category = knownApiError ? `FEISHU_API_${knownApiError.toUpperCase()}`
                    : /permission|scope|forbidden/i.test(errorOutput) ? 'FEISHU_API_PERMISSION'
                    : /invalid|bad request|parameter/i.test(errorOutput) ? 'FEISHU_API_VALIDATION'
                        : code === 0 ? 'FEISHU_CLI_INVALID_RESPONSE' : 'FEISHU_CLI_REQUEST_FAILED';
                reject(new FeishuSyncError(category));
            }
        });
        child.stdin.on('error', () => {});
        child.stdin.end();
        }); } finally { if (bodyPath) await rm(bodyPath, { force: true }); }
    })();
}

function cellText(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? item.text || item.name || '' : item).join('');
    return value?.text || value?.name || '';
}

function decode(record) {
    const fields = record.fields || {};
    let business;
    try { business = JSON.parse(cellText(fields.payloadJson) || '{}'); }
    catch { throw new FeishuSyncError('FEISHU_SYNC_INVALID_REMOTE_RECORD'); }
    return { recordId: record.record_id, business: {
        ...business, id: business.id || cellText(fields.id),
        createdAt: business.createdAt || cellText(fields.createdAt),
        updatedAt: business.updatedAt || cellText(fields.updatedAt),
    } };
}

function normalizeFields(entity, record) {
    const fields = { payloadJson: JSON.stringify(record) };
    for (const key of ['id', 'createdAt', 'updatedAt', ...ENTITY_FIELDS[entity]]) {
        if (record[key] != null && record[key] !== '') fields[key] = key === 'sourceUrl' && entity === 'references'
            ? { text: record[key], link: record[key] }
            : typeof record[key] === 'object' ? JSON.stringify(record[key]) : String(record[key]);
    }
    return fields;
}

export function createLocalFeishuWriter({ readFileImpl = readFile, api = larkApi } = {}) {
    let queue = Promise.resolve();
    async function configuration() {
        let source;
        try { source = await readFileImpl(CONFIG_PATH, 'utf8'); }
        catch { throw new FeishuSyncError('FEISHU_LOCAL_CONFIG_NOT_FOUND'); }
        const values = Object.fromEntries([...source.matchAll(/^(FEISHU_APP_TOKEN|FEISHU_TABLE_PLANS|FEISHU_TABLE_REFERENCES)\s*=\s*"([A-Za-z0-9_-]+)"\s*$/gm)].map(match => [match[1], match[2]]));
        if (!values.FEISHU_APP_TOKEN || !values.FEISHU_TABLE_PLANS || !values.FEISHU_TABLE_REFERENCES) throw new FeishuSyncError('FEISHU_LOCAL_CONFIG_INCOMPLETE');
        return values;
    }
    function transport(config) {
        const tablePath = entity => `/open-apis/bitable/v1/apps/${config.FEISHU_APP_TOKEN}/tables/${config[`FEISHU_TABLE_${entity.toUpperCase()}`]}`;
        async function find(entity, id) {
            const data = await api({ method: 'POST', apiPath: `${tablePath(entity)}/records/search?page_size=500`, body: {
                field_names: ['id', 'createdAt', 'updatedAt', 'payloadJson'],
                filter: { conjunction: 'and', conditions: [{ field_name: 'id', operator: 'is', value: [id] }] },
            } });
            if (!Array.isArray(data.items)) throw new FeishuSyncError('FEISHU_CLI_INVALID_RESPONSE');
            if (data.has_more || data.items.length > 1) throw new FeishuSyncError('FEISHU_SYNC_DUPLICATE_REMOTE_ID');
            if (!data.items.length) return null;
            const record = decode(data.items[0]);
            if (record.business.id !== id || !/^[A-Za-z0-9]+$/.test(record.recordId || '')) throw new FeishuSyncError('FEISHU_SYNC_INVALID_REMOTE_RECORD');
            return record;
        }
        return {
            async sync(entity, records) {
                const result = { created: 0, updated: 0, skipped: 0, conflicts: [], errors: [] };
                for (const record of records) {
                    const remote = await find(entity, record.id);
                    const remoteTime = Date.parse(remote?.business.updatedAt);
                    const localTime = Date.parse(record.updatedAt);
                    if (remote && (!Number.isFinite(remoteTime) || remoteTime > localTime)) { result.conflicts.push({ id: record.id }); continue; }
                    if (remote && remoteTime === localTime) { result.skipped++; continue; }
                    await api({ method: remote ? 'PUT' : 'POST', apiPath: `${tablePath(entity)}/records${remote ? `/${remote.recordId}` : ''}`, body: { fields: normalizeFields(entity, record) } });
                    result[remote ? 'updated' : 'created']++;
                }
                return result;
            },
            async records(entity, expected) {
                const rows = [];
                for (const record of expected) {
                    const remote = await find(entity, record.id);
                    if (remote) rows.push(remote.business);
                }
                return rows;
            },
        };
    }
    return {
        async configurationStatus() {
            try { await configuration(); return { configured: true, transport: 'local-lark-cli' }; }
            catch { return { configured: false, transport: 'local-lark-cli' }; }
        },
        async status() {
            try {
                const config = await configuration();
                const data = await api({ method: 'GET', apiPath: `/open-apis/bitable/v1/apps/${config.FEISHU_APP_TOKEN}/tables?page_size=100` });
                if (!Array.isArray(data.items)) throw new FeishuSyncError('FEISHU_CLI_INVALID_RESPONSE');
                const tables = new Set(data.items.map(item => item.table_id));
                const connected = tables.has(config.FEISHU_TABLE_PLANS) && tables.has(config.FEISHU_TABLE_REFERENCES);
                if (connected) {
                    const reader = transport(config);
                    for (const entity of ['plans', 'references']) await reader.records(entity, [{ id: READ_ONLY_PROBE_ID }]);
                }
                return { credential_configured: true, connected, transport: 'local-lark-cli', ...(connected ? {} : { code: 'FEISHU_SYNC_TABLE_CONFIG_MISMATCH' }) };
            } catch (error) {
                return { credential_configured: null, connected: false, transport: 'local-lark-cli', code: error instanceof FeishuSyncError ? error.code : 'FEISHU_CLI_REQUEST_FAILED' };
            }
        },
        sync({ uid, plan }) {
            const operation = queue.then(async () => {
                try { return await syncStudioPlanWithWriter({ uid, plan, writer: transport(await configuration()) }); }
                catch (error) { return { planId: plan?.id, revision: plan?.revision, sourceUpdatedAt: plan?.aiStudio?.sync?.updatedAt, status: 'pending', code: error instanceof FeishuSyncError ? error.code : 'FEISHU_CLI_REQUEST_FAILED' }; }
            });
            queue = operation.catch(() => {});
            return operation;
        },
    };
}
