import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { studioFeishuStatus, checkStudioFeishuConnection, syncStudioPlan } from '../api/ai-studio/feishu-sync.mjs';

// This is the private path used by the existing configure-worker-secrets.ps1.
export function createLocalFeishuConfig({ directory = path.join(os.homedir(), '.photoatelier'), readFileImpl = readFile, fetchImpl = fetch, localWriter = null } = {}) {
    async function environment() {
        try { return { APP_SYNC_TOKEN: (await readFileImpl(path.join(directory, 'sync-token.txt'), 'utf8')).trim() }; }
        catch { return {}; }
    }
    return {
        async status() { return { ...studioFeishuStatus(await environment()), ...(localWriter ? { local_writer_configured: (await localWriter.configurationStatus()).configured } : {}) }; },
        async check() {
            if (localWriter && (await localWriter.configurationStatus()).configured) return localWriter.status();
            return checkStudioFeishuConnection({ env: await environment(), fetchImpl });
        },
        async sync({ uid, plan }) {
            if (localWriter && (await localWriter.configurationStatus()).configured) return localWriter.sync({ uid, plan });
            return syncStudioPlan({ uid, plan, env: await environment(), fetchImpl });
        },
    };
}
