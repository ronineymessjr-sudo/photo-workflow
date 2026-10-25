import { randomUUID } from 'node:crypto';

export const emailLoginEnabled = env => env.RESEND_AUTH_ENABLED === 'true'
    && Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_KEY && env.JWT_SECRET);

export async function handleEmailAuth(env, body, action, { query, sign }) {
    if (!emailLoginEnabled(env) || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_KEY || !env.JWT_SECRET) {
        return { status: 503, body: { error: '邮箱验证码登录尚未配置，请使用密码登录或游客体验' } };
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        return { status: 400, body: { error: '请输入有效的邮箱地址' } };
    }
    if (action === 'verify' && (typeof body.code !== 'string' || !/^\d{6,10}$/.test(body.code))) {
        return { status: 400, body: { error: '请输入邮件中的数字验证码' } };
    }
    const base = env.SUPABASE_URL.trim().replace(/\/+$/, '');
    const origin = base.startsWith('https://') ? base : `https://${base}`;
    try {
        const response = await fetch(`${origin}/auth/v1/${action === 'send' ? 'otp' : 'verify'}`, {
            method: 'POST',
            headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(action === 'send' ? { email, create_user: true } : { email, token: body.code, type: 'email' }),
            signal: AbortSignal.timeout(15000),
        });
        if (response.status === 429) return { status: 429, body: { error: '请求过于频繁，请稍后再试' } };
        if (!response.ok) return { status: response.status >= 500 ? 503 : 400, body: {
            error: action === 'send' ? '验证码发送失败，请稍后重试或使用密码登录' : '验证码无效或已过期，请重新获取',
        } };
        if (action === 'send') return { status: 200, body: { success: true, retryAfter: 60 } };
        const verified = await response.json();
        if (!verified.access_token || !verified.user?.email_confirmed_at || verified.user.email?.toLowerCase() !== email) {
            return { status: 401, body: { error: '邮箱验证未通过，请重新获取验证码' } };
        }
        // Match the verified email exactly after the query; never authorize wildcard matches.
        const find = () => query(env, `users?email=ilike.${encodeURIComponent(email)}&select=id,email&limit=2`);
        const existing = await find();
        if (!Array.isArray(existing)) throw new Error('Account lookup failed');
        const matches = existing.filter(user => user.email?.toLowerCase() === email);
        if (matches.length > 1 || (existing.length && !matches.length)) throw new Error('Account mapping requires review');
        let user = matches[0], created = false;
        if (!user) {
            // New passwordless accounts have no usable legacy password hash.
            const result = await query(env, 'users', 'POST', { email, password_hash: `email-otp:${randomUUID()}` });
            if (Array.isArray(result) && result[0]?.id && result[0].email?.toLowerCase() === email) {
                user = result[0]; created = true;
            } else {
                const retry = await find();
                if (Array.isArray(retry) && retry.length === 1 && retry[0].email?.toLowerCase() === email) user = retry[0];
            }
        }
        if (!user?.id) throw new Error('Account provisioning failed');
        return { status: created ? 201 : 200, body: {
            success: true, user: { id: user.id, email: user.email }, token: sign(user.id, env),
        } };
    } catch {
        return { status: 503, body: { error: '邮箱登录暂时不可用，请稍后重试或使用密码登录' } };
    }
}
