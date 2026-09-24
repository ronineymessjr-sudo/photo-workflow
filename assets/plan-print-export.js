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

            const overview = shots.map((shot, index) => `<tr><td>${String(index + 1).padStart(2, '0')}</td><td>${escapeHtml(shot.title || shot.scene || '未命名镜头')}</td><td>${escapeHtml(shot.description || '待补充')}</td><td>${escapeHtml([shot.shotSize, shot.focalLength].filter(Boolean).join(' / ') || '待确认')}</td><td>${escapeHtml(shot.method || shot.angle || '待确认')}</td></tr>`).join('');
            const details = shots.map((shot, index) => {
                const contract = shot.directorContract || {};
                const rows = [
                    ['拍什么', shot.title || shot.scene], ['人物动作', shot.description],
                    ['摄影师机位', shot.method || shot.angle], ['构图位置', shot.composition],
                    ['景别与焦段', [shot.shotSize, shot.focalLength].filter(Boolean).join(' · ')],
                    ['光线', shot.lightingSetup || shot.lighting], ['画面保留', readable(contract.must_show)],
                    ['避免情况', readable(contract.reject_if)], ['取景边界', readable(contract.crop_boundary)]
                ];
                return `<section class="shot-detail"><h3>${String(index + 1).padStart(2, '0')} · ${escapeHtml(shot.title || shot.scene || '未命名镜头')}</h3><table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '待补充')}</td></tr>`).join('')}</table></section>`;
            }).join('');
            return `<article class="print-plan">${summary}<h2>分镜总表 · ${shots.length} 镜</h2><table class="overview"><thead><tr><th>序号</th><th>拍摄画面</th><th>人物动作</th><th>景别 / 焦段</th><th>机位</th></tr></thead><tbody>${overview || '<tr><td colspan="5">暂无分镜</td></tr>'}</tbody></table><h2>逐镜头执行说明</h2>${details || '<p>暂无分镜细节</p>'}</article>`;
        }).join('');
        const docTitle = escapeHtml(plans.length === 1 ? plans[0].title || '拍摄方案' : `拍摄方案合集（${plans.length}份）`);
        return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${docTitle}</title><style>
            @page{size:A4 landscape;margin:13mm}*{box-sizing:border-box}body{margin:0;background:#f1f3f2;color:#202722;font:10pt/1.6 "Microsoft YaHei","PingFang SC",sans-serif}.toolbar{position:sticky;top:0;display:flex;align-items:center;justify-content:center;gap:14px;padding:12px;background:#fff;border-bottom:1px solid #d9dfdb}.toolbar button{border:0;border-radius:5px;background:#345b49;color:#fff;padding:9px 16px;font:inherit;cursor:pointer}.toolbar span{color:#5e6962;font-size:9pt}.print-plan{max-width:1100px;margin:24px auto;padding:28px;background:#fff}.print-plan+.print-plan{break-before:page}.brand{margin:0;color:#426653;font-size:8pt;font-weight:700}.print-plan h1{margin:3px 0 8px;font-size:22pt;line-height:1.3}.meta{margin:0 0 22px;color:#59665e}.print-plan h2{margin:20px 0 8px;padding-bottom:5px;border-bottom:1px solid #d8ded9;font-size:14pt}.print-plan h3{margin:0 0 6px;font-size:11pt}.overview, .shot-detail table{width:100%;border-collapse:collapse}.overview{font-size:8.5pt}.overview th,.overview td,.shot-detail th,.shot-detail td{border:1px solid #d8ded9;padding:6px 8px;text-align:left;vertical-align:top}.overview th,.shot-detail th{background:#f2f5f3}.overview th:first-child,.overview td:first-child{width:48px;text-align:center}.overview th:nth-child(4){width:125px}.overview th:nth-child(5){width:170px}.overview tr,.shot-detail tr{break-inside:avoid;page-break-inside:avoid}.shot-detail{margin:10px 0 14px;break-inside:avoid;page-break-inside:avoid}.shot-detail th{width:118px}.model-shot{margin:10px 0;padding:10px 12px;border-left:3px solid #91ac9d;background:#f7f9f7;break-inside:avoid}.model-shot p{margin:4px 0 0}.footer{max-width:1100px;margin:0 auto 24px;color:#758078;text-align:center;font-size:8pt}@media print{body{background:#fff;font-size:9pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{display:none}.print-plan{max-width:none;margin:0;padding:0}.footer{margin:12px 0 0}.print-plan+.print-plan{break-before:page}}
        </style></head><body><div class="toolbar"><button type="button" onclick="window.print()">打印 / 另存为 PDF</button><span>在打印窗口中将目标选择为“另存为 PDF”</span></div>${documents}<div class="footer">PhotoAtelier · ${new Date().toLocaleDateString('zh-CN')}</div></body></html>`;
    }

    function open(plans, mode = 'plan') {
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
