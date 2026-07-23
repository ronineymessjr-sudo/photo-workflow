(function (root) {
  'use strict';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function isSeedAlbum(item) {
    const title = `${item.title || ''} ${item.sourceFile || ''}`;
    return /(索引|总览|收藏夹说明|README|cover|album|seed)/i.test(title) || (!item.sourceUrl && !item.data && !item.previewUrl);
  }

  function realReferences(plan) {
    const refs = Array.isArray(plan.relations?.references) ? plan.relations.references : [];
    return refs.filter(item => !isSeedAlbum(item) && item.synthetic !== true);
  }

  function referenceThumbnail(item) {
    if (item.previewUrl || item.data || item.thumbnailUrl) return item.previewUrl || item.data || item.thumbnailUrl;
    const demoMatch = String(item.sourceUrl || item.sourceFile || '').match(/pose-(\d+)/);
    if (demoMatch) return `assets/demo/references/pose-${demoMatch[1]}.jpg`;
    return '';
  }

  function renderCreativeDirection(plan) {
    const direction = plan.result?.creativeDirection || plan.creativeDirection;
    if (!direction) return '';
    const title = direction.title || '创意方向';
    const summary = direction.summary || direction.description || '';
    return `<section class="plan-resource-section plan-resource-section--creative">
      <h4>创意方向</h4>
      <div class="plan-resource-card">
        <strong>${esc(title)}</strong>
        ${summary ? `<p>${esc(summary)}</p>` : ''}
      </div>
    </section>`;
  }

  function renderReferenceAlbum(plan) {
    const refs = realReferences(plan);
    if (!refs.length) return '';
    return `<section class="plan-resource-section plan-resource-section--album">
      <h4>参考专辑</h4>
      <div class="plan-resource-album">
        ${refs.map(item => {
          const thumb = referenceThumbnail(item);
          return `<figure class="plan-resource-thumb ${thumb ? '' : 'is-missing'}">
            ${thumb ? `<img src="${esc(thumb)}" alt="${esc(item.title || '参考图')}">` : '<span>无预览</span>'}
            <figcaption>${esc(item.title || '未命名参考')}</figcaption>
          </figure>`;
        }).join('')}
      </div>
    </section>`;
  }

  function renderShootRecommendations(plan) {
    const relation = plan.relations || {};
    const slots = Array.isArray(relation.slots) ? relation.slots : [];
    const items = slots.flatMap(slot => (slot.topItems || []).map(item => ({ ...item, slot: slot.id })));
    const shootItems = items.filter(item => /shot|angle|pose|composition|lighting|scene/i.test(item.slot || item.role || ''));
    if (!shootItems.length) return '';
    return `<section class="plan-resource-section plan-resource-section--shoot">
      <h4>拍摄推荐</h4>
      <ul class="plan-resource-list">
        ${shootItems.map(item => `<li><strong>${esc(item.title || item.id || '推荐项')}</strong><span>${esc(item.reason || item.matchReason || '')}</span></li>`).join('')}
      </ul>
    </section>`;
  }

  function renderPropRecommendations(plan) {
    const relation = plan.relations || {};
    const refs = Array.isArray(relation.references) ? relation.references : [];
    const propItems = refs.filter(item => /prop|道具|styling|item|equipment/i.test(item.role || item.category || ''));
    if (!propItems.length) return '';
    return `<section class="plan-resource-section plan-resource-section--props">
      <h4>道具推荐</h4>
      <ul class="plan-resource-list">
        ${propItems.map(item => `<li><strong>${esc(item.title || item.id || '道具')}</strong><span>${esc(item.reason || item.matchReason || '')}</span></li>`).join('')}
      </ul>
    </section>`;
  }

  function renderPersonalLibraryStatus() {
    const health = typeof root.getPersonalLibraryHealth === 'function' ? root.getPersonalLibraryHealth() : null;
    if (!health) return '';
    const labels = {
      connected: '个人图库已连接',
      unavailable: '个人图库当前不可用',
      'needs-repair': '个人图库需要修复',
      'not-configured': '个人图库未配置',
      'ready-to-test': '个人图库待测试'
    };
    return `<section class="plan-resource-section plan-resource-section--library">
      <h4>个人图库</h4>
      <p class="plan-resource-status plan-resource-status--${esc(health.status)}">${esc(labels[health.status] || health.status)}${health.message ? ` · ${esc(health.message)}` : ''}</p>
    </section>`;
  }

  function renderPlanResources(plan) {
    if (!plan || !plan.id) return '';

    const creative = renderCreativeDirection(plan);
    const album = renderReferenceAlbum(plan);
    const shoot = renderShootRecommendations(plan);
    const props = renderPropRecommendations(plan);
    const library = renderPersonalLibraryStatus();
    const hasAny = creative || album || shoot || props || library;

    if (!hasAny) {
      return `<details class="plan-resources">
        <summary>方案资源 <small>创意方向、参考专辑、拍摄与道具推荐</small></summary>
        <div class="plan-resources__body">
          <p class="plan-resources__empty">当前方案没有归档的创意方向、参考专辑或推荐内容。</p>
          <button type="button" class="btn btn-s btn-sm" onclick="openReferenceLibrary?.()">打开参考图库</button>
        </div>
      </details>`;
    }

    return `<details class="plan-resources">
      <summary>方案资源 <small>查看已归档的创意方向、参考专辑与推荐</small></summary>
      <div class="plan-resources__body">
        ${creative}
        ${album}
        ${shoot}
        ${props}
        ${library}
      </div>
    </details>`;
  }

  root.renderPlanResources = renderPlanResources;
})(window);
