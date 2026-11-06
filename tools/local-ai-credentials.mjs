import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { aiPlanProviders } from '../api/ai-plan.mjs';

const protectScript = "[void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $e=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($e))";
const unprotectScript = "[void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $d=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($d))";

function windowsProtect(script, input) {
    return new Promise((resolve, reject) => {
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        const process = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let output = ''; let exceeded = false;
        process.stdout.setEncoding('utf8');
        process.stdout.on('data', chunk => { output += chunk; if (output.length > 8192) { exceeded = true; process.kill(); } });
        process.stderr.resume();
        process.on('error', () => reject(new Error('LOCAL_AI_STORAGE_UNAVAILABLE')));
        process.on('close', code => code === 0 && !exceeded && output ? resolve(output) : reject(new Error('LOCAL_AI_STORAGE_UNAVAILABLE')));
        process.stdin.on('error', () => {});
        process.stdin.end(input);
    });
}

export function createLocalAiCredentials({ directory = path.join(process.env.LOCALAPPDATA || '', 'PhotoWorkflow'), protect = input => windowsProtect(protectScript, input), unprotect = input => windowsProtect(unprotectScript, input), supported = process.platform === 'win32' } = {}) {
    const file = path.join(directory, 'local-ai.json');
    async function load() {
        if (!supported) return null;
        try {
            const data = JSON.parse(await readFile(file, 'utf8'));
            if (!aiPlanProviders().some(item => item.id === data.provider) || typeof data.model !== 'string' || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(data.model) || typeof data.secret !== 'string' || data.secret.length > 8192) return null;
            const apiKey = await unprotect(data.secret);
            if (!/^[\x21-\x7e]{8,512}$/.test(apiKey)) return null;
            return { provider: data.provider, model: data.model, apiKey };
        } catch { return null; }
    }
    return {
        async status() { const item = await load(); return item ? { configured: true, provider: item.provider, model: item.model } : { configured: false, supported }; },
        load,
        async save(item) {
            if (!supported || !process.env.LOCALAPPDATA) throw new Error('LOCAL_AI_STORAGE_UNAVAILABLE');
            if (!aiPlanProviders().some(provider => provider.id === item?.provider && provider.requiresKey !== false) || typeof item.model !== 'string' || !/^[a-z0-9][a-z0-9._:/-]{0,119}$/i.test(item.model) || typeof item.apiKey !== 'string' || !/^[\x21-\x7e]{8,512}$/.test(item.apiKey)) throw new Error('INVALID_AI_CONFIGURATION');
            const secret = await protect(item.apiKey);
            await mkdir(directory, { recursive: true });
            const temporary = file + '.' + crypto.randomUUID() + '.tmp';
            try {
                await writeFile(temporary, JSON.stringify({ provider: item.provider, model: item.model, secret }), { flag: 'wx' });
                await rename(temporary, file);
            } finally { await unlink(temporary).catch(() => {}); }
        },
        async clear() { await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; }); },
    };
}
