(async function () {
    const form = document.getElementById('loginForm');
    const toggle = document.getElementById('loginMethodToggle');
    const send = document.getElementById('sendLoginCode');
    const status = document.getElementById('loginCodeStatus');
    const text = (zh, en) => document.documentElement.lang.startsWith('en') ? en : zh;
    if (!form || !window.api || window.__PHOTOATELIER_LOCAL_MODE__) return;
    try {
        const methods = await window.api.request('/api/auth/methods', 'GET');
        if (!methods.emailOtp) return;
    } catch { return; }
    toggle.hidden = false;
    toggle.style.display = 'inline-flex';
    let pending = false, retryAt = 0;
    function selectEmail(enabled) {
        form.dataset.method = enabled ? 'email' : 'password';
        document.getElementById('loginPasswordGroup').hidden = enabled;
        document.getElementById('loginCodeGroup').hidden = !enabled;
        toggle.textContent = enabled ? text('使用密码登录', 'Use password') : text('使用邮箱验证码', 'Use email code');
        document.getElementById('loginCode').value = '';
    }
    toggle.addEventListener('click', () => selectEmail(form.dataset.method !== 'email'));
    send.textContent = text('获取验证码', 'Send code');
    document.querySelector('label[for="loginCode"]').textContent = text('邮箱验证码', 'Email code');
    send.addEventListener('click', async () => {
        if (pending || Date.now() < retryAt) return;
        const email = document.getElementById('loginEmail').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            status.textContent = text('请输入有效的邮箱地址', 'Enter a valid email address'); return;
        }
        pending = true; send.disabled = true;
        status.textContent = text('正在发送…', 'Sending…');
        try {
            const result = await window.api.request('/api/auth/email/send', 'POST', { email });
            if (!result.success) throw new Error(result.error || text('发送失败', 'Could not send code'));
            retryAt = Date.now() + 60000;
            status.textContent = text('验证码已发送，请查看邮箱及垃圾邮件。', 'Code sent. Check your inbox and spam folder.');
            const timer = setInterval(() => {
                const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
                send.textContent = seconds ? `${seconds}s` : text('重新发送', 'Resend code');
                if (!seconds) { clearInterval(timer); send.disabled = false; }
            }, 1000);
        } catch (error) {
            status.textContent = error.message || text('发送失败，请稍后重试', 'Could not send code. Try again later.');
            send.disabled = false;
        } finally { pending = false; }
    });
    selectEmail(true);
})();
