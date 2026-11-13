(function (global) {
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function readable(value) {
        return Array.isArray(value) ? value.join('；') : (value || '待补充');
    }

    function buildHtml(plans, mode = 'plan') {
        const documents = plans.map(plan => {
            const shots = Array.isArray(plan.shotList) ? plan.shotList : (Array.isArray(plan.shots) ? plan.shots : []);
            const title = escapeHtml(plan.title || '拍摄方案');
            const input = plan.input || {};
            const summary = `<header><p class="brand">PHOTOATELIER · ${mode === 'model' ? '模特动作提示' : '拍摄执行稿'}</p><h1>${title}</h1><p class="meta">主题：${escapeHtml(input.theme || plan.title || '待定')}　风格：${escapeHtml(input.style || '待定')}　场景：${escapeHtml(input.scene || '待定')}　时长：${escapeHtml(input.duration || '待定')}　人数：${escapeHtml(input.people || 1)}</p></header>`;

            if (mode === 'model') {
                return `<article class="print-plan">${summary}<h2>动作提示</h2>${shots.length ? shots.map((shot, index) => `<section class="model-shot"><h3>${String(index + 1).padStart(2, '0')} · ${escapeHtml(shot.title || shot.scene || '拍摄动作')}</h3><p>${escapeHtml(shot.description || '按摄影师现场口令自然完成动作。')}</p></section>`).join('') : '<p>暂无动作内容</p>'}</article>`;
            }

            const references = Array.isArray(plan.aiStudio?.references) ? plan.aiStudio.references : [];
            const referenceCards = references.map(item => {
                const url = String(item.referenceImageUrl || '');
                if (!/^https:\/\/hruiccc\.github\.io\/RuiC-PoseAtlas\/(?:thumbs\/[A-Za-z0-9_-]+\.jpg|(?:costume|portrait)\/thumbs\/[A-Za-z0-9_-]+\.webp)$/.test(url)) return '';
                return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}"><figcaption>${escapeHtml(item.title)}</figcaption></figure>`;
            }).join('');
            const apiBase = String(global.api?.base || global.location?.origin || '').replace(/\/$/, '');
            const candidateCards = (plan.director?.generationCandidates || []).map(candidate => {
                const url = String(candidate.url || '');
                const imageUrl = url.startsWith('/api/director/candidates/') ? apiBase + url
                    : url.startsWith(apiBase + '/api/director/candidates/') ? url : '';
                if (!imageUrl) return '';
                const index = Number(candidate.shotIndex) || 0;
                const shot = candidate.shotSnapshot || shots[index] || {};
                return `<figure><img src="${escapeHtml(imageUrl)}" alt="镜头 ${index + 1} AI合成候选图"><figcaption>镜头 ${index + 1} · ${escapeHtml(shot.scene || '')} · ${escapeHtml(shot.shotSize || '')} · AI合成候选，待审核</figcaption></figure>`;
            }).join('');
            const referenceHtml = references.length ? `<h2>摆姿库参考与拍摄转译</h2><table class="overview"><thead><tr><th>原库编号</th><th>参考</th><th>角度</th><th>来源</th></tr></thead><tbody>${references.map(item => `<tr><td>${escapeHtml(item.poseNumber || item.upstreamId || item.sourceItemId)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(readable(item.angles))}</td><td>${escapeHtml(item.attribution || 'RuiC-PoseAtlas')} ${escapeHtml(item.externalUrl || item.sourceUrl || '')}</td></tr>`).join('')}</tbody></table><p>${escapeHtml(plan.aiStudio.guidance?.style || '')}</p>${(plan.aiStudio.guidance?.suggestions || []).map(item => `<p>${escapeHtml(item.direction)}</p>`).join('')}<p class="meta">飞书${plan.aiStudio.sync?.status === 'synced' ? '已核对同步' : '待同步'}</p>` : '';
            const overview = shots.map((shot, index) => `<tr><td>${String(index + 1).padStart(2, '0')}</td><td>${escapeHtml(shot.title || shot.scene || '未命名镜头')}</td><td>${escapeHtml(shot.description || '待补充')}</td><td>${escapeHtml([shot.shotSize, shot.focalLength].filter(Boolean).join(' / ') || '待确认')}</td><td>${escapeHtml(shot.method || shot.angle || '待确认')}</td></tr>`).join('');
            const details = shots.map((shot, index) => {
                const contract = shot.directorContract || {};
                const wardrobe = contract.wardrobe_styling || shot.wardrobe || '';
                const props = contract.shot_props || shot.props || '';
                const rows = [
                    ['拍什么', shot.title || shot.scene], ['场景', shot.scene], ['人物动作', shot.description],
                    ['摄影师机位', shot.method || shot.angle], ['构图位置', shot.composition],
                    ['景别与焦段', [shot.shotSize, shot.focalLength].filter(Boolean).join(' · ')],
                    ...(wardrobe ? [['服装与妆发', wardrobe]] : []),
                    ...(props && props !== '以实际场地和已有资源为准' ? [['本镜头道具', props]] : []),
                    ['光线', shot.lightingSetup || shot.lighting], ['画面保留', readable(contract.must_show)],
                    ['避免情况', readable(contract.reject_if)], ['取景边界', readable(contract.crop_boundary)]
                ];
                return `<section class="shot-detail"><h3>${String(index + 1).padStart(2, '0')} · ${escapeHtml(shot.title || shot.scene || '未命名镜头')}</h3><table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '待补充')}</td></tr>`).join('')}</table></section>`;
            }).join('');
            return `<article class="print-plan">${summary}${referenceCards ? `<h2>拍摄参考图</h2><div class="reference-grid">${referenceCards}</div>` : ''}${referenceHtml}${candidateCards ? `<h2>组照候选对照</h2><div class="candidate-grid">${candidateCards}</div>` : ''}<h2>分镜总表 · ${shots.length} 镜</h2><table class="overview"><thead><tr><th>序号</th><th>拍摄画面</th><th>人物动作</th><th>景别 / 焦段</th><th>机位</th></tr></thead><tbody>${overview || '<tr><td colspan="5">暂无分镜</td></tr>'}</tbody></table><h2>逐镜头执行说明</h2>${details || '<p>暂无分镜细节</p>'}</article>`;
        }).join('');
        const docTitle = escapeHtml(plans.length === 1 ? plans[0].title || '拍摄方案' : `拍摄方案合集（${plans.length}份）`);
        return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${docTitle}</title><style>
            @page{size:A4 landscape;margin:13mm}*{box-sizing:border-box}body{margin:0;background:#f1f3f2;color:#202722;font:10pt/1.6 "Microsoft YaHei","PingFang SC",sans-serif}.toolbar{position:sticky;top:0;display:flex;align-items:center;justify-content:center;gap:14px;padding:12px;background:#fff;border-bottom:1px solid #d9dfdb}.toolbar button{border:0;border-radius:5px;background:#345b49;color:#fff;padding:9px 16px;font:inherit;cursor:pointer}.toolbar span{color:#5e6962;font-size:9pt}.print-plan{max-width:1100px;margin:24px auto;padding:28px;background:#fff}.print-plan+.print-plan{break-before:page}.brand{margin:0;color:#426653;font-size:8pt;font-weight:700}.print-plan h1{margin:3px 0 8px;font-size:22pt;line-height:1.3}.meta{margin:0 0 22px;color:#59665e}.print-plan h2{margin:20px 0 8px;padding-bottom:5px;border-bottom:1px solid #d8ded9;font-size:14pt}.print-plan h3{margin:0 0 6px;font-size:11pt}.overview, .shot-detail table{width:100%;border-collapse:collapse}.overview{font-size:8.5pt}.overview th,.overview td,.shot-detail th,.shot-detail td{border:1px solid #d8ded9;padding:6px 8px;text-align:left;vertical-align:top}.overview th,.shot-detail th{background:#f2f5f3}.overview th:first-child,.overview td:first-child{width:48px;text-align:center}.overview th:nth-child(4){width:125px}.overview th:nth-child(5){width:170px}.overview tr,.shot-detail tr{break-inside:avoid;page-break-inside:avoid}.shot-detail{margin:10px 0 14px;break-inside:avoid;page-break-inside:avoid}.shot-detail th{width:118px}.model-shot{margin:10px 0;padding:10px 12px;border-left:3px solid #91ac9d;background:#f7f9f7;break-inside:avoid}.model-shot p{margin:4px 0 0}.footer{max-width:1100px;margin:0 auto 24px;color:#758078;text-align:center;font-size:8pt}@media print{body{background:#fff;font-size:9pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.print-plan{max-width:none;margin:0;padding:0}.footer{margin:12px 0 0}.print-plan+.print-plan{break-before:page}}
            .reference-grid,.candidate-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.reference-grid figure,.candidate-grid figure{margin:0;break-inside:avoid}.reference-grid img{width:100%;height:190px;object-fit:contain}.candidate-grid img{width:100%;height:270px;object-fit:contain}.reference-grid figcaption,.candidate-grid figcaption{font-size:8pt;line-height:1.5;margin:5px 0 10px}
        </style></head><body><div class="toolbar"><button type="button" onclick="window.print()">打印 / 另存为 PDF</button><span>在打印窗口中将目标选择为“另存为 PDF”</span></div>${documents}<div class="footer">PhotoAtelier · ${new Date().toLocaleDateString('zh-CN')}</div></body></html>`;
    }

    function openInlinePreview(plans, mode) {
        const doc = global.document;
        if (!doc?.createElement || !doc.body) return false;
        doc.getElementById('photoatelier-print-preview')?.remove();

        const overlay = doc.createElement('div');
        overlay.id = 'photoatelier-print-preview';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', '拍摄方案打印预览');
        overlay.tabIndex = -1;
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(16,20,18,.72);display:flex;align-items:center;justify-content:center;padding:16px';

        const panel = doc.createElement('div');
        panel.style.cssText = 'width:min(1180px,100%);height:min(900px,100%);background:#fff;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.28)';
        const toolbar = doc.createElement('div');
        toolbar.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid #d9dfdb;font:14px/1.4 system-ui,sans-serif;color:#28332c';
        const printButton = doc.createElement('button');
        printButton.type = 'button';
        printButton.textContent = '打印 / 另存为 PDF';
        printButton.style.cssText = 'border:0;border-radius:5px;background:#345b49;color:#fff;padding:9px 16px;font:inherit;cursor:pointer';
        const hint = doc.createElement('span');
        hint.textContent = '在打印窗口中将目标选择为“另存为 PDF”';
        hint.style.cssText = 'flex:1;color:#5e6962';
        const closeButton = doc.createElement('button');
        closeButton.type = 'button';
        closeButton.textContent = '关闭';
        closeButton.setAttribute('aria-label', '关闭打印预览');
        closeButton.style.cssText = 'border:1px solid #d9dfdb;border-radius:5px;background:#fff;color:#28332c;padding:8px 14px;font:inherit;cursor:pointer';
        const frame = doc.createElement('iframe');
        frame.title = '拍摄方案打印预览内容';
        frame.style.cssText = 'width:100%;flex:1;min-height:0;border:0;background:#f1f3f2';
        frame.srcdoc = buildHtml(plans, mode).replace('</style>', '.toolbar{display:none!important}</style>');

        printButton.onclick = () => {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
        };
        closeButton.onclick = () => overlay.remove();
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') overlay.remove();
        });
        toolbar.append(printButton, hint, closeButton);
        panel.append(toolbar, frame);
        overlay.append(panel);
        doc.body.append(overlay);
        closeButton.focus();
        return true;
    }

    function open(plans, mode = 'plan') {
        if (global.document?.createElement && global.document.body) return openInlinePreview(plans, mode);
        const printWindow = global.open('', '_blank');
        if (!printWindow) return false;
        printWindow.document.open();
        printWindow.document.write(buildHtml(plans, mode));
        printWindow.document.close();
        printWindow.focus();
        return true;
    }

    global.PhotoAtelierPrintExport = { buildHtml, open };
})(window);
