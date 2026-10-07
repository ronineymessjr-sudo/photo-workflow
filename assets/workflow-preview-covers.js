(() => {
    const frame = document.querySelector('iframe');
    const covers = [
        { match: /自由主题|雨后城市|蓝调/, src: '/assets/demo-covers/rainy-city-blue-hour.png' },
        { match: /复古电影感私房/, src: '/assets/demo-covers/retro-hotel-portrait.png' },
        { match: /玻璃反射构图/, src: '/assets/demo-covers/glass-corridor.png' }
    ];

    function decorateLibrary(root) {
        for (const row of root.querySelectorAll('.library-plan-row')) {
            if (row.querySelector('.preview-plan-cover')) continue;
            const heading = row.querySelector('h3');
            const title = heading?.textContent?.trim() || '';
            if (!heading) continue;

            const image = row.querySelector(':scope > img') || root.ownerDocument.createElement('img');
            const isSavedCover = Boolean(image.getAttribute('src')?.trim());
            const concept = isSavedCover ? null : covers.find(item => item.match.test(title));
            if (!isSavedCover && !concept) continue;

            const wrapper = root.ownerDocument.createElement('div');
            wrapper.className = 'preview-plan-cover';
            const content = root.ownerDocument.createElement('div');
            content.className = 'preview-plan-content';
            const savedImageStyle = image.getAttribute('style');
            if (concept) {
                image.src = concept.src;
                image.alt = `${title}的 AI 概念示意图，非实拍参考`;
                const badge = root.ownerDocument.createElement('span');
                badge.className = 'preview-plan-cover-badge';
                badge.textContent = 'AI 概念图';
                wrapper.append(image, badge);
            } else {
                image.removeAttribute('style');
                image.alt = image.alt || `${title}的方案封面`;
                wrapper.append(image);
            }
            wrapper.append(heading);
            for (const child of row.querySelectorAll(':scope > p, :scope > .library-plan-actions, :scope > .library-plan-session')) {
                content.append(child);
            }
            row.classList.add('preview-image-row');
            row.insertBefore(wrapper, row.firstChild);
            row.append(content);
            image.addEventListener('error', () => {
                if (isSavedCover) {
                    if (savedImageStyle !== null) image.setAttribute('style', savedImageStyle);
                    row.insertBefore(image, wrapper);
                }
                row.insertBefore(heading, wrapper);
                for (const child of [...content.children]) row.insertBefore(child, wrapper);
                wrapper.remove();
                content.remove();
                row.classList.remove('preview-image-row');
            }, { once: true });
        }
    }

    function installPreviewCovers() {
        const doc = frame.contentDocument;
        if (!doc) return;
        if (!doc.getElementById('preview-concept-cover-style')) {
            const style = doc.createElement('style');
            style.id = 'preview-concept-cover-style';
            style.textContent = `
                #saved-plan-library .preview-image-row {
                    position:relative;display:flex!important;flex-direction:column;justify-content:flex-end;
                    min-height:284px;margin:0 0 14px!important;padding:0!important;
                    overflow:hidden;border:1px solid rgba(127,127,127,.28)!important;
                    border-radius:9px;background:#252a27!important;color:#fff!important
                }
                #saved-plan-library .preview-plan-cover {
                    position:absolute;z-index:0;inset:0;width:100%;height:100%;overflow:hidden;
                    background:#555
                }
                #saved-plan-library .preview-plan-cover::after {
                    content:"";position:absolute;inset:0;pointer-events:none;
                    background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,.04) 28%,rgba(0,0,0,.28) 48%,rgba(0,0,0,.9) 100%)
                }
                #saved-plan-library .preview-plan-cover img {
                    display:block;width:100%;height:100%;object-fit:cover
                }
                #saved-plan-library .preview-plan-cover h3 {
                    position:absolute;z-index:1;left:12px;right:12px;top:14px;
                    display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;
                    overflow:hidden;margin:0!important;color:#fff!important;
                    font-size:15px!important;line-height:1.35!important;font-weight:600;
                    text-shadow:0 1px 3px rgba(0,0,0,.55)
                }
                #saved-plan-library .preview-plan-cover-badge {
                    position:absolute;z-index:1;top:9px;right:9px;padding:4px 7px;
                    border:1px solid rgba(255,255,255,.2);border-radius:5px;
                    background:rgba(20,22,21,.76);color:#fff;font-size:10px;line-height:1.3
                }
                #saved-plan-library .preview-plan-content {
                    position:relative;z-index:1;margin-top:auto;padding:52px 12px 12px;
                    background:linear-gradient(180deg,transparent,rgba(15,18,16,.76) 26%,rgba(15,18,16,.88))
                }
                #saved-plan-library .preview-plan-content>p {
                    margin:0!important;color:#fff!important;font-size:12px!important;line-height:1.55
                }
                #saved-plan-library .preview-plan-content>.library-plan-actions {
                    display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0!important
                }
                #saved-plan-library .preview-plan-content .btn,
                #saved-plan-library .preview-plan-content input[type=date] {
                    min-height:40px;border:1px solid rgba(255,255,255,.34)!important;
                    border-radius:6px;background:rgba(26,30,28,.78)!important;color:#fff!important;
                    backdrop-filter:blur(8px)
                }
                #saved-plan-library .preview-plan-content input[type=date] {padding:7px 9px;min-width:0}
                #saved-plan-library .preview-plan-content>.library-plan-session {
                    margin:10px 0 0!important;padding-top:10px;border-top:1px solid rgba(255,255,255,.25);
                    color:#fff!important
                }
                @media(max-width:430px) {
                    #saved-plan-library .preview-image-row {min-height:276px}
                    #saved-plan-library .preview-plan-cover h3 {left:10px;right:10px;top:12px;font-size:14px!important}
                    #saved-plan-library .preview-plan-content {padding:50px 10px 10px}
                }
            `;
            doc.head.append(style);
        }

        const root = doc.getElementById('saved-plan-library');
        if (!root || root.dataset.previewCoversReady) return;
        root.dataset.previewCoversReady = 'true';
        decorateLibrary(root);
        new MutationObserver(() => decorateLibrary(root)).observe(root, { childList: true });
    }

    frame.addEventListener('load', installPreviewCovers);
    installPreviewCovers();
})();
