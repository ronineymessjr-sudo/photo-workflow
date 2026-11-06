(function () {
    const byId = id => document.getElementById(id);
    const message = byId('briefChatMessage'), send = byId('briefChatSend');
    if (!message || !send) return;
    const history = byId('briefChatHistory'), status = byId('briefChatStatus');
    const review = byId('briefChatReview'), fields = byId('briefChatFields'), confirm = byId('briefChatConfirm');
    const settings = byId('briefChatSettings');
    const availability = byId('briefChatAvailability'), entry = byId('briefChatEntry');
    const labels = { theme: '主题', style: '风格', modelDesc: '拍摄对象', scene: '场景', mood: '情绪', duration: '时长', people: '人数', wardrobe_hints: '服装与妆发', props_available: '可用道具' };
    let conversation = '', confidence = 0, working = false;
    function updateAvailability() {
        const enabled = Boolean(window.PhotoAtelierOwnAI?.isEnabled());
        entry.hidden = !enabled; settings.hidden = enabled;
        availability.textContent = enabled ? 'AI 已配置，调用时验证服务' : '请先接入 AI，才能整理拍摄需求。';
    }
    window.addEventListener?.('photo-ai-state', updateAvailability);
    updateAvailability();
    function line(text, kind) {
        const node = document.createElement('p');
        node.className = 'brief-chat-' + kind;
        node.textContent = text;
        history.append(node);
    }
    send.addEventListener('click', async () => {
        if (working) return;
        const next = message.value.trim();
        const combined = [conversation, next].filter(Boolean).join('\n');
        if (!next || combined.length > 1000) { status.textContent = '请输入需求，总长度不超过 1000 字。'; return; }
        if (/\b(?:sk|sk-proj)-[a-z0-9_-]{12,}|\b(?:api[_ -]?key|bearer)\s*[:=]\s*\S{8,}/i.test(next)) {
            status.textContent = '请勿在对话中填写 API 密钥。'; return;
        }
        if (!window.PhotoAtelierOwnAI?.isEnabled()) { status.textContent = '请先到设置中接入自己的 AI，再回来整理需求。'; settings.hidden = false; return; }
        settings.hidden = true;
        working = true; send.disabled = true; confirm.disabled = true; status.textContent = '正在整理拍摄需求…';
        try {
            const result = await window.PhotoAtelierOwnAI.extractBrief(combined);
            conversation = combined;
            line(next, 'user'); message.value = '';
            confidence = result.confidence;
            fields.replaceChildren();
            for (const [key, labelText] of Object.entries(labels)) {
                const label = document.createElement('label');
                label.textContent = labelText;
                const input = document.createElement('input');
                input.type = 'text'; input.maxLength = 160; input.dataset.briefField = key;
                input.value = result.brief[key] || '';
                if (key === 'modelDesc' || key === 'scene') input.placeholder = '可填写“待定”';
                label.append(input); fields.append(label);
            }
            const questions = result.questions.length ? result.questions : result.missing.map(key => key === 'scene' ? '在哪里拍摄？不确定可以填写待定。' : '拍摄对象是什么？不确定可以填写待定。');
            if (questions.length) line(questions.slice(0, 2).join(' '), 'assistant');
            review.hidden = false;
            status.textContent = confidence < 0.6 ? '需求还不够明确，请补充描述后重新整理。' : '请核对并修改需求；未确定的项目可填写“待定”。';
        } catch (error) { status.textContent = error.message || '整理失败，请重试。'; }
        finally { working = false; send.disabled = false; confirm.disabled = false; }
    });
    confirm.addEventListener('click', () => {
        if (working || !conversation || confidence < 0.6) { status.textContent = '请先补充描述并重新整理需求。'; return; }
        if (byId('genBtn')?.disabled) { status.textContent = '方案正在生成，请稍候。'; return; }
        if (message.value.trim()) { status.textContent = '请先整理新输入的内容，再确认生成。'; return; }
        if (!window.PhotoAtelierOwnAI?.isEnabled()) { status.textContent = 'AI 已断开，请先在设置中重新接入。'; settings.hidden = false; return; }
        const brief = Object.fromEntries([...fields.querySelectorAll('input')].map(input => [input.dataset.briefField, input.value.trim()]));
        const durationAliases = { '一小时': '1小时', '两小时': '2小时', '二小时': '2小时', '三小时': '3小时' };
        brief.duration = durationAliases[brief.duration] || brief.duration;
        if (!brief.modelDesc || !brief.scene) { status.textContent = '请补充拍摄对象和场景；未确定可填“待定”。'; return; }
        if (brief.people && !/^[1-9]\d{0,2}$/.test(brief.people)) { status.textContent = '人数请填写正整数。'; return; }
        const extra = ['用户原始描述：\n' + conversation,
            brief.wardrobe_hints ? '服装与妆发：' + brief.wardrobe_hints : '',
            brief.props_available ? '可用道具：' + brief.props_available : '',
            brief.duration && ![...byId('f-dur').options].some(o => o.value === brief.duration) ? '拍摄时长：' + brief.duration : ''].filter(Boolean).join('\n');
        if ([brief.theme, brief.style, brief.modelDesc, brief.scene, brief.mood, extra].join('').length > 1750) {
            status.textContent = '需求整理结果过长，请精简后重试。'; return;
        }
        for (const [key, id] of Object.entries({ theme: 'f-theme', style: 'f-style', modelDesc: 'f-model', scene: 'f-scene', mood: 'f-mood' })) byId(id).value = brief[key] || '';
        byId('f-dur').value = brief.duration && [...byId('f-dur').options].some(o => o.value === brief.duration) ? brief.duration : '';
        byId('f-people').value = brief.people || '';
        byId('f-extra').value = extra;
        status.textContent = '已确认，正在生成方案。';
        byId('briefForm').requestSubmit();
    });
    settings.addEventListener('click', () => {
        document.querySelector('[data-tab="settings"]').click();
        const group = byId('ownAiSettings').closest('details');
        if (group) group.open = true;
        byId('ownAiSettings').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
})();
