import { escapeHtml, formToObject, toast } from '../core/utils.js';

export function renderCrew(ctx) {
  const catalog = ctx.v5.queries.resourceCatalog.get(ctx.project.id);
  const sharing = ctx.v5.queries.sharingWorkspace.get(ctx.project.id);
  const equipmentModels = ctx.v5.catalog.searchEquipmentModels();
  const selectedEventId = ctx.storage.get(`shareEvent:${ctx.project.id}`, sharing.events[0]?.id || '');
  return `
    <section class="page-header"><div><h1>团队、资源与角色分享</h1><p>全局资源通过项目关系复用；模特和助理只收到当前拍摄所需的最小信息包。</p></div></section>
    <section class="grid cols-3">${metric('参与者', sharing.participants.length)}${metric('已选资源', catalog.assignments.length)}${metric('分享版本', sharing.packets.length)}</section>

    <section class="grid cols-2 plan-section">
      <article class="card"><h2>项目参与者</h2><form id="person-form" class="form-grid">
        <label>姓名<input name="name" required></label><label>角色<select name="role"><option value="model">模特</option><option value="assistant">助理</option><option value="photographer">摄影师</option><option value="client">客户</option><option value="other">其他</option></select></label>
        <label>联系方式<input name="contact"></label><label>提前到场分钟<input name="callTimeOffsetMinutes" type="number" min="0" value="0"></label>
        <label class="full">职责（逗号分隔）<input name="responsibilities"></label><label class="full">准备事项（逗号分隔）<input name="preparation"></label>
        <label>模特授权<select name="consentStatus"><option value="pending">待确认</option><option value="signed">已确认</option><option value="declined">不同意</option></select></label><label>边界<input name="boundaries"></label>
        <div class="full"><button class="button primary">添加参与者</button></div>
      </form><div class="list plan-section">${sharing.participants.map(person => `<div class="list-item"><div><h3>${escapeHtml(person.displayName)} <span class="tag">${escapeHtml(person.role)}</span></h3><p>${escapeHtml(person.contact || '未登记联系方式')}</p></div><button class="button danger" data-remove-participant="${escapeHtml(person.id)}">移除</button></div>`).join('') || '<div class="empty">暂无参与者。</div>'}</div></article>

      <article class="card"><h2>角色分享包</h2><label>拍摄日程<select id="share-event-select"><option value="">选择日程</option>${sharing.events.map(event => `<option value="${escapeHtml(event.id)}" ${event.id === selectedEventId ? 'selected' : ''}>${escapeHtml(event.title)}</option>`).join('')}</select></label>
        <div class="list plan-section">${sharing.participants.filter(item => ['model','assistant'].includes(item.role)).map(person => `<div class="list-item"><div><h3>${escapeHtml(person.displayName)}</h3><p>${person.role === 'model' ? '模特通告、镜头目标、准备和授权边界' : '助理任务、器材、必拍镜头和集合时间'}</p></div><button class="button secondary" data-build-packet="${escapeHtml(person.id)}" data-role="${escapeHtml(person.role)}" ${selectedEventId ? '' : 'disabled'}>生成草稿</button></div>`).join('') || '<div class="empty">添加模特或助理后可生成角色包。</div>'}</div>
        <h3>版本记录</h3><div class="list">${sharing.packets.map(packet => `<div class="list-item"><div><h3>${escapeHtml(packet.recipientRole)} · V${packet.version}</h3><p>${escapeHtml(packet.status)} · 最小必要信息</p></div><div class="item-actions">${packet.status === 'draft' ? `<button class="button primary" data-publish-packet="${escapeHtml(packet.id)}">发布</button>` : ''}${packet.status === 'published' ? `<button class="button danger" data-revoke-packet="${escapeHtml(packet.id)}">撤销</button>` : ''}</div></div>`).join('') || '<div class="empty">尚无分享包。</div>'}</div>
      </article>
    </section>

    <section class="grid cols-3 plan-section">
      <article class="card"><h2>设备与物资库</h2><form id="equipment-form" class="form-grid"><label>名称<input name="name" list="equipment-model-options" required></label><datalist id="equipment-model-options">${equipmentModels.map(item => `<option value="${escapeHtml(`${item.brand} ${item.model}`)}"></option>`).join('')}</datalist><label>分类<input name="category"></label><label>数量<input name="quantity" type="number" min="1" value="1"></label><label>状态<select name="status"><option value="ready">可用</option><option value="charge">待充电</option><option value="repair">待检修</option><option value="rent">待租赁</option></select></label><label class="full">备注<input name="notes"></label><div class="full"><button class="button primary">保存到设备库</button></div></form><div class="list plan-section">${catalog.equipment.map(item => renderEquipmentResource(item)).join('') || '<div class="empty">暂无设备。</div>'}</div></article>
      <article class="card"><h2>模特资源库</h2><div class="list">${catalog.talent.map(item => renderTalentResource(item)).join('') || '<div class="empty">暂无模特资源。</div>'}</div></article>
      <article class="card"><h2>场地资源库</h2><form id="venue-form" class="form-grid"><label>场地名称<input name="name" required></label><label>地址<input name="address"></label><label>类型<select name="indoorOutdoor"><option value="unknown">未指定</option><option value="indoor">室内</option><option value="outdoor">室外</option><option value="mixed">室内外</option></select></label><label>费用说明<input name="priceNote"></label><label class="full">光线与限制<textarea name="lightingNotes"></textarea></label><div class="full"><button class="button primary">保存到场地库</button></div></form><div class="list plan-section">${catalog.venues.map(item => renderVenueResource(item)).join('') || '<div class="empty">暂无场地。</div>'}</div></article>
    </section>`;
}

export function bindCrew(ctx) {
  document.getElementById('share-event-select')?.addEventListener('change', event => { ctx.storage.set(`shareEvent:${ctx.project.id}`, event.target.value); ctx.refresh(); });
  document.getElementById('person-form')?.addEventListener('submit', event => { event.preventDefault(); const value = formToObject(event.currentTarget); try { let talentProfileId = null; if (value.role === 'model') { const talent = saveTalentResource(ctx, value); talentProfileId = talent.id; assignCatalogResource(ctx, 'talent', talent.id); } ctx.v5.sharing.assignParticipant({ projectId: ctx.project.id, role: value.role, displayName: value.name, contact: value.contact, talentProfileId, callTimeOffsetMinutes: Number(value.callTimeOffsetMinutes || 0), responsibilities: splitList(value.responsibilities), preparation: splitList(value.preparation), status: 'confirmed' }); toast('参与者已添加'); ctx.refresh(); } catch (error) { toast(error.message); } });
  document.querySelectorAll('[data-remove-participant]').forEach(button => button.addEventListener('click', () => { ctx.v5.sharing.removeParticipant(button.dataset.removeParticipant); ctx.refresh(); }));
  document.querySelectorAll('[data-build-packet]').forEach(button => button.addEventListener('click', () => { const calendarEventId = ctx.storage.get(`shareEvent:${ctx.project.id}`, ''); try { const packet = button.dataset.role === 'model' ? ctx.v5.sharing.buildModelPacket({ calendarEventId, participantAssignmentId: button.dataset.buildPacket }) : ctx.v5.sharing.buildAssistantPacket({ calendarEventId, participantAssignmentId: button.dataset.buildPacket }); toast(`分享包草稿 V${packet.version} 已生成`); ctx.refresh(); } catch (error) { toast(error.message); } }));
  document.querySelectorAll('[data-publish-packet]').forEach(button => button.addEventListener('click', () => { ctx.v5.sharing.publish(button.dataset.publishPacket); toast('角色分享包已发布'); ctx.refresh(); }));
  document.querySelectorAll('[data-revoke-packet]').forEach(button => button.addEventListener('click', () => { ctx.v5.sharing.revoke(button.dataset.revokePacket, '用户撤销'); toast('角色分享包已撤销'); ctx.refresh(); }));
  document.getElementById('equipment-form')?.addEventListener('submit', event => { event.preventDefault(); try { saveEquipmentResource(ctx, formToObject(event.currentTarget)); toast('设备已保存到全局库'); ctx.refresh(); } catch (error) { toast(error.message); } });
  document.getElementById('venue-form')?.addEventListener('submit', event => { event.preventDefault(); try { saveVenueResource(ctx, formToObject(event.currentTarget)); toast('场地已保存到全局库'); ctx.refresh(); } catch (error) { toast(error.message); } });
  document.querySelectorAll('[data-assign-resource]').forEach(button => button.addEventListener('click', () => { assignCatalogResource(ctx, button.dataset.assignResource, button.dataset.resourceId); ctx.refresh(); }));
  document.querySelectorAll('[data-remove-resource-assignment]').forEach(button => button.addEventListener('click', () => { removeCatalogResource(ctx, button.dataset.removeResourceAssignment); ctx.refresh(); }));
}

export function saveEquipmentResource(ctx, value) { const target = normalizeCatalogName(value.name); const model = ctx.v5.catalog.searchEquipmentModels(value.name || '').find(item => [item.model, `${item.brand} ${item.model}`, ...(item.aliases || [])].some(name => normalizeCatalogName(name) === target)); const status = value.status || 'ready'; return ctx.v5.catalog.addEquipmentItem({ equipmentModelId: model?.id || null, customName: model ? '' : value.name, ownership: status === 'rent' ? 'rented' : 'owned', quantity: Number(value.quantity || 1), condition: status === 'repair' ? 'needs_repair' : status === 'charge' ? 'needs_charge' : 'good', availabilityStatus: status === 'ready' ? 'available' : 'unavailable', notes: value.notes || '' }); }
export function saveVenueResource(ctx, value) { return ctx.v5.catalog.saveVenue({ name: value.name, address: value.address || '', indoorOutdoor: value.indoorOutdoor || 'unknown', lightingNotes: value.lightingNotes || '', priceNote: value.priceNote || '', source: 'custom' }); }
export function saveTalentResource(ctx, value) { return ctx.v5.catalog.saveTalentProfile({ displayName: value.name, contact: value.contact || '', consentStatus: value.consentStatus === 'signed' ? 'granted' : value.consentStatus === 'declined' ? 'denied' : 'not_requested', boundaries: value.boundaries || '', privateNotes: '' }); }
export function assignCatalogResource(ctx, resourceType, resourceId, options = {}) { return ctx.v5.catalog.assignResourceToProject({ projectId: ctx.project.id, resourceType, resourceId, planId: options.planId || null, role: { equipment:'available', venue:'primary-location', talent:'subject' }[resourceType], required: resourceType !== 'equipment' }); }
export function removeCatalogResource(ctx, assignmentId) { return ctx.v5.catalog.removeResourceAssignment(assignmentId); }

function currentAssignment(item) { return item.assignments[0] || null; }
function resourceAction(item, type) { const assignment = currentAssignment(item); return assignment ? `<button class="button danger" data-remove-resource-assignment="${escapeHtml(assignment.id)}">移出项目</button>` : `<button class="button secondary" data-assign-resource="${escapeHtml(type)}" data-resource-id="${escapeHtml(item.resource.id)}">选入项目</button>`; }
function renderEquipmentResource(item) { return `<div class="list-item"><div><h3>${escapeHtml(item.displayName)}</h3><p>${escapeHtml(item.category)} · 数量 ${item.resource.quantity || 1}</p></div>${resourceAction(item,'equipment')}</div>`; }
function renderVenueResource(item) { return `<div class="list-item"><div><h3>${escapeHtml(item.displayName)}</h3><p>${escapeHtml(item.resource.address || '未登记地址')}</p></div>${resourceAction(item,'venue')}</div>`; }
function renderTalentResource(item) { return `<div class="list-item"><div><h3>${escapeHtml(item.displayName)}</h3><p>${escapeHtml(item.resource.contact || '未登记联系方式')} · 授权 ${escapeHtml(item.resource.consentStatus || '待确认')}</p></div>${resourceAction(item,'talent')}</div>`; }
function normalizeCatalogName(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ''); }
function splitList(value) { return String(value || '').split(/[,，]/).map(item => item.trim()).filter(Boolean); }
const metric = (label, value) => `<article class="card"><div class="metric">${escapeHtml(value)}</div><div class="metric-label">${escapeHtml(label)}</div></article>`;
