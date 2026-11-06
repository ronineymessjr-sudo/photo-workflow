(function () {
    const byId = id => document.getElementById(id);
    const form = byId('profileForm');
    let editingKey;
    let draftAvatar = '';
    let imageRevision = 0;

    function account() {
        let user = {};
        try { user = JSON.parse(localStorage.getItem('pw_user') || '{}') || {}; } catch {}
        const owner = localStorage.getItem('pa_workspace_owner') || user.id || '__local__';
        return { key: 'pa_personal_profile:' + encodeURIComponent(owner), user };
    }

    function read(key) {
        try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
    }

    function drawAvatar(target, avatar, name) {
        target.replaceChildren();
        if (/^data:image\/(jpeg|png|webp);base64,/.test(avatar || '')) {
            const image = document.createElement('img');
            image.src = avatar;
            image.alt = name + '的头像';
            image.className = 'profile-avatar-image';
            target.append(image);
        } else {
            target.textContent = [...name][0] || '我';
        }
    }

    function render() {
        const current = account();
        const profile = read(current.key);
        const name = profile.name || current.user.name || '我';
        drawAvatar(byId('userAvatar'), profile.avatar, name);
        drawAvatar(byId('settingsUserAvatar'), profile.avatar, name);
        byId('settingsUserName').textContent = name;
        byId('userAvatar').title = name + ' · 个人资料';
        editingKey = current.key;
        draftAvatar = profile.avatar || '';
        byId('profileName').value = name;
        byId('profileImage').value = '';
        byId('profileStatus').textContent = '';
        imageRevision++;
        byId('profileSave').disabled = false;
    }

    async function chooseImage() {
        const file = byId('profileImage').files[0];
        if (!file) return;
        const status = byId('profileStatus');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            status.textContent = '请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片。';
            byId('profileImage').value = '';
            return;
        }
        const revision = ++imageRevision;
        const key = editingKey;
        byId('profileSave').disabled = true;
        status.textContent = '正在处理头像…';
        let bitmap;
        try {
            bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            const size = Math.min(bitmap.width, bitmap.height);
            canvas.getContext('2d').drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256);
            if (revision !== imageRevision || key !== account().key) return;
            draftAvatar = canvas.toDataURL('image/jpeg', 0.86);
            drawAvatar(byId('settingsUserAvatar'), draftAvatar, byId('profileName').value.trim() || '我');
            status.textContent = '头像已选好，点击保存资料。';
        } catch {
            if (revision === imageRevision) status.textContent = '图片无法读取，请换一张图片。';
        } finally {
            bitmap?.close();
            if (revision === imageRevision) byId('profileSave').disabled = false;
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (byId('profileSave').disabled) return;
        if (editingKey !== account().key) { render(); return; }
        const name = byId('profileName').value.trim();
        if (!name || [...name].length > 32) {
            byId('profileStatus').textContent = '请填写 1 至 32 个字的显示名。';
            return;
        }
        try {
            localStorage.setItem(editingKey, JSON.stringify({ name, avatar: draftAvatar }));
            render();
            byId('profileStatus').textContent = '个人资料已保存到本机账户。';
        } catch {
            byId('profileStatus').textContent = '保存失败，请检查浏览器可用存储空间后重试。';
        }
    });
    byId('profileImage').addEventListener('change', chooseImage);
    byId('profileRemoveImage').addEventListener('click', () => {
        imageRevision++;
        draftAvatar = '';
        byId('profileImage').value = '';
        byId('profileSave').disabled = false;
        drawAvatar(byId('settingsUserAvatar'), '', byId('profileName').value.trim() || '我');
        byId('profileStatus').textContent = '点击保存资料，应用默认头像。';
    });
    window.addEventListener('storage', event => {
        if (event.key === account().key || ['pw_user', 'pa_workspace_owner', null].includes(event.key)) render();
    });
    window.PhotoAtelierProfile = {
        render,
        open() {
            showTab('settings');
            byId('settingsUserInfo').closest('details').open = true;
            byId('profileName').focus();
        },
    };
    render();
})();
