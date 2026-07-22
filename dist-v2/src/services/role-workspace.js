import { formatDate } from '../core/utils.js';

export const WORKSPACE_ROLES = Object.freeze({
  photographer: { label: '摄影师', description: '创意、镜头、光线、设备和风险总控' },
  model: { label: '模特', description: '到场、妆造、动作、安全边界和授权信息' },
  assistant: { label: '助理', description: '器材、交通、场地、现场节奏和备份执行' },
  client: { label: '客户', description: '拍摄确认、交付范围、反馈和最终状态' },
});

export const ASSISTANT_CHECKLIST_TEMPLATE = Object.freeze([
  ['equipment', '核对机身、镜头、灯具与支撑设备'],
  ['power', '充满全部电池并准备备用电池'],
  ['media', '格式化存储卡并准备备用卡'],
  ['light', '检查灯具、引闪器、色片和延长线'],
  ['location', '确认场地权限、停车、供电和洗手间'],
  ['transport', '确认交通、装卸和集合路线'],
  ['release', '确认模特授权与客户使用范围'],
  ['backup', '准备现场双备份介质与文件命名规则'],
]);

export function detectScheduleConflicts(tasks, startAt, endAt, excludeId = '') {
  const start = Date.parse(startAt || '');
  const end = Date.parse(endAt || startAt || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  return (tasks || []).filter(task => {
    if (task.id === excludeId || task.taskType !== 'shoot-call') return false;
    const otherStart = Date.parse(task.startAt || '');
    const otherEnd = Date.parse(task.endAt || task.startAt || '');
    if (!Number.isFinite(otherStart) || !Number.isFinite(otherEnd)) return false;
    return start < otherEnd && end > otherStart;
  });
}

export function analyzeShotSequence(shots = []) {
  const ordered = [...shots].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const transitions = [];
  let setupChanges = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const changes = [];
    if (normalized(previous.focalLength) && normalized(current.focalLength) && normalized(previous.focalLength) !== normalized(current.focalLength)) changes.push('焦段');
    if (normalized(previous.lighting) && normalized(current.lighting) && normalized(previous.lighting) !== normalized(current.lighting)) changes.push('光线');
    if (normalized(previous.location || previous.sceneZone) && normalized(current.location || current.sceneZone) && normalized(previous.location || previous.sceneZone) !== normalized(current.location || current.sceneZone)) changes.push('机位区域');
    if (changes.length) {
      setupChanges += 1;
      transitions.push({ from: previous.id, to: current.id, changes });
    }
  }
  const highChange = ordered.length >= 4 && setupChanges >= Math.ceil((ordered.length - 1) * 0.65);
  return {
    shotCount: ordered.length,
    setupChanges,
    transitions,
    highChange,
    recommendation: highChange ? '镜头顺序包含较多焦段、光线或机位切换；建议按场景与灯光分组后再确认最终顺序。' : '镜头顺序的设备与光线切换处于可控范围。',
  };
}

export function computeProjectReadiness(data, projectId, planId = '') {
  const project = data.get('projects', projectId);
  const plans = data.listByProject('plans', projectId).filter(item => item.planStatus === 'confirmed');
  const plan = data.get('plans', planId) || plans.find(item => ['scheduled', 'preparing', 'shooting'].includes(item.executionStatus)) || plans[0] || null;
  const shots = plan ? data.list('shots', item => item.planId === plan.id) : [];
  const tasks = data.listByProject('tasks', projectId);
  const calls = plan ? tasks.filter(item => item.taskType === 'shoot-call' && item.planId === plan.id) : [];
  const allPeople = data.listByProject('people', projectId);
  const people = allPeople.filter(item => !plan || !item.planId || item.planId === plan.id);
  const models = people.filter(item => item.role === 'model');
  const assistants = people.filter(item => item.role === 'assistant');
  const allEquipment = data.listByProject('equipment', projectId);
  const equipment = allEquipment.filter(item => !plan || !item.planId || item.planId === plan.id);
  const sequenceAnalysis = analyzeShotSequence(shots);
  const refs = data.listByProject('references', projectId);
  const hardBlockers = [];
  const warnings = [];
  const checks = [];

  addCheck(checks, Boolean(project?.location), 'location', '拍摄地点已确认', '项目缺少拍摄地点', false);
  addCheck(checks, Boolean(project?.date || calls[0]?.startAt), 'date', '拍摄日期已确认', '项目缺少拍摄日期', false);
  addCheck(checks, Boolean(plan), 'plan', '正式方案已确认', '尚无正式方案', true);
  addCheck(checks, shots.length > 0, 'shots', `已有 ${shots.length} 个正式镜头`, '正式方案没有镜头', true);
  addCheck(checks, calls.length > 0, 'schedule', '拍摄通告已创建', '正式方案尚未排期', true);
  addCheck(checks, refs.some(item => ['verified', 'private', 'commercial-ok'].includes(item.verificationStatus)), 'references', '存在已验证参考', '没有已验证参考图', false);
  addCheck(checks, equipment.length > 0, 'equipment', `已登记 ${equipment.length} 件设备`, '尚未登记设备清单', false);
  addCheck(checks, !equipment.some(item => ['charge', 'repair', 'rent'].includes(item.status)), 'equipment-ready', '设备状态均可用', '存在待充电、检修或租赁设备', false);
  addCheck(checks, assistants.length > 0, 'assistant', '已登记现场助理', '没有登记助理；单人拍摄可忽略', false);
  addCheck(checks, models.length === 0 || models.every(item => ['signed', 'not-required'].includes(item.consentStatus)), 'consent', '模特授权状态已确认', models.some(item => item.consentStatus === 'declined') ? '存在不同意授权的模特，不能开始拍摄' : '仍有模特授权未确认', true);
  const clients = people.filter(item => item.role === 'client');
  addCheck(checks, clients.length === 0 || project?.clientApprovalStatus === 'approved', 'client-approval', '客户已经确认拍摄方案', '项目有客户成员，但客户确认状态尚未完成', false);
  addCheck(checks, Boolean(plan?.backupPrimary && plan?.backupSecondary), 'backup', '双备份位置已规划', '尚未规划双备份位置', false);
  addCheck(checks, Boolean(project?.weatherBackup || project?.indoorBackup), 'contingency', '已有天气或场地备用方案', '缺少天气或场地备用方案', false);

  for (const check of checks) {
    if (check.ok) continue;
    (check.blocking ? hardBlockers : warnings).push(check.message);
  }
  const passed = checks.filter(item => item.ok).length;
  const score = Math.round((passed / Math.max(checks.length, 1)) * 100);
  return {
    project,
    plan,
    checks,
    score,
    status: hardBlockers.length ? 'blocked' : score >= 80 ? 'ready' : 'needs-attention',
    hardBlockers,
    warnings,
    counts: { shots: shots.length, calls: calls.length, people: people.length, models: models.length, assistants: assistants.length, equipment: equipment.length, references: refs.length },
  };
}

export function buildRoleBrief(data, projectId, role = 'photographer', planId = '') {
  const readiness = computeProjectReadiness(data, projectId, planId);
  const { project, plan } = readiness;
  const tasks = data.listByProject('tasks', projectId);
  const call = plan ? tasks.find(item => item.taskType === 'shoot-call' && item.planId === plan.id) : null;
  const allPeople = data.listByProject('people', projectId);
  const people = allPeople.filter(item => !plan || !item.planId || item.planId === plan.id);
  const shots = plan ? data.list('shots', item => item.planId === plan.id).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)) : [];
  const allEquipment = data.listByProject('equipment', projectId);
  const equipment = allEquipment.filter(item => !plan || !item.planId || item.planId === plan.id);
  const sequenceAnalysis = analyzeShotSequence(shots);
  const refs = data.listByProject('references', projectId);
  const base = {
    role,
    roleLabel: WORKSPACE_ROLES[role]?.label || role,
    project,
    plan,
    call,
    people,
    shots,
    equipment,
    references: refs,
    readiness,
    sequenceAnalysis,
  };

  if (role === 'model') {
    const model = people.find(item => item.role === 'model') || null;
    return {
      ...base,
      title: `${project?.title || '拍摄项目'} · 模特通告`,
      summary: model?.brief || project?.brief || plan?.rationale || '',
      priorities: [
        call ? `${formatDate(call.startAt)} 到场，地点：${call.location || project?.location || '待确认'}` : '到场时间和地点待确认',
        model?.arrivalNotes ? `到场说明：${model.arrivalNotes}` : '到场说明尚未记录',
        model?.wardrobe ? `妆造与服装：${model.wardrobe}` : '妆造与服装尚未记录',
        model?.boundaries ? `拍摄边界：${model.boundaries}` : '请在拍摄前确认可接受动作、服装和发布边界',
        `授权状态：${consentLabel(model?.consentStatus)}${model?.compensation ? `；合作费用：${model.compensation}` : ''}`, 
      ],
      visibleShots: shots.slice(0, 8),
    };
  }

  if (role === 'assistant') {
    return {
      ...base,
      title: `${project?.title || '拍摄项目'} · 助理执行单`,
      summary: '优先确保器材完整、现场节奏稳定、通告可执行和素材安全。',
      priorities: [
        call ? `${formatDate(call.startAt)} 集合，${call.location || project?.location || '地点待确认'}` : '拍摄通告尚未确认',
        `设备登记：${equipment.length} 件；正式镜头：${shots.length} 个`,
        sequenceAnalysis.recommendation,
        readiness.warnings[0] || '当前没有明显准备警告',
      ],
      visibleShots: shots.filter(item => item.priority === 'must' || item.mustShoot).concat(shots.filter(item => !(item.priority === 'must' || item.mustShoot))).slice(0, 10),
    };
  }

  if (role === 'client') {
    return {
      ...base,
      title: `${project?.title || '拍摄项目'} · 客户确认页`,
      summary: project?.deliverables || plan?.deliverables || '交付范围尚未填写',
      priorities: [
        `方案状态：${plan?.planStatus || '未确认'}`,
        `拍摄状态：${plan?.executionStatus || '未开始'}`,
        `交付状态：${plan?.deliveryStatus || '未开始'}`,
        project?.usageScope ? `使用范围：${project.usageScope}` : '使用范围尚未记录',
      ],
      visibleShots: shots.filter(item => item.clientVisible !== false).slice(0, 8),
    };
  }

  return {
    ...base,
    title: `${project?.title || '拍摄项目'} · 摄影师控制台`,
    summary: plan?.rationale || project?.brief || '',
    priorities: [
      `${shots.length} 个正式镜头，${shots.filter(item => item.priority === 'must' || item.mustShoot).length} 个必拍，预计 ${sequenceAnalysis.setupChanges} 次设置切换`,
      `参考 ${refs.length} 条，设备 ${equipment.length} 件，团队 ${people.length} 人`,
      readiness.hardBlockers[0] || readiness.warnings[0] || '项目已达到开拍条件',
    ],
    visibleShots: shots.slice(0, 12),
  };
}

export function buildCallSheetMarkdown(data, projectId, planId = '') {
  const brief = buildRoleBrief(data, projectId, 'photographer', planId);
  const { project, plan, call, people, equipment, shots, readiness } = brief;
  const lines = [
    '---',
    'type: photoatelier-call-sheet',
    `projectId: ${project?.id || ''}`,
    `planId: ${plan?.id || ''}`,
    `generatedAt: ${new Date().toISOString()}`,
    '---',
    '',
    `# ${project?.title || '拍摄项目'} · 拍摄通告`,
    '',
    `- **日期与时间：** ${call ? formatDate(call.startAt) : project?.date || '待确认'}`,
    `- **结束时间：** ${call?.endAt ? formatDate(call.endAt) : '待确认'}`,
    `- **地点：** ${call?.location || project?.location || '待确认'}`,
    `- **拍摄类型：** ${project?.shootingType || '未设置'}`,
    `- **风格：** ${project?.style || '未设置'}`,
    `- **方案：** ${plan?.concept || plan?.title || '未确认'}`,
    `- **开拍就绪度：** ${readiness.score}% (${readiness.status})`,
    '',
    '## 团队',
    ...(people.length ? people.map(item => `- ${item.name || item.displayName || '未命名'} · ${roleLabel(item.role)} · ${item.callTime || '跟随通告时间'} · ${item.contact || '未登记联系方式'}`) : ['- 尚未登记团队成员']),
    '',
    '## 设备与物资',
    ...(equipment.length ? equipment.map(item => `- ${item.name || item.title || '未命名设备'}${item.quantity ? ` × ${item.quantity}` : ''}${item.status ? ` · ${item.status}` : ''}`) : ['- 尚未登记设备']),
    '',
    '## 镜头顺序',
    ...(shots.length ? shots.map((shot, index) => `${index + 1}. ${shot.scene || `镜头 ${index + 1}`} · ${shot.shotSize || ''} · ${shot.focalLength || ''} · ${shot.pose || ''}${shot.priority === 'must' || shot.mustShoot ? ' · **必拍**' : ''}`) : ['1. 尚未生成正式镜头']),
    '',
    '## 风险与备用方案',
    `- 天气/场地备用：${project?.weatherBackup || project?.indoorBackup || '未填写'}`,
    `- 交通与装卸：${project?.transportNotes || '未填写'}`,
    `- 安全与隐私：${project?.privacyConstraints || '未填写'}`,
    ...(readiness.hardBlockers.length || readiness.warnings.length ? [...readiness.hardBlockers, ...readiness.warnings].map(item => `- ⚠ ${item}`) : ['- 当前没有未解决的准备警告']),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function buildSharePacketMarkdown(data, projectId, role = 'model', planId = '') {
  const brief = buildRoleBrief(data, projectId, role, planId);
  const { project, plan, call, visibleShots = [] } = brief;
  const roleMeta = WORKSPACE_ROLES[role] || WORKSPACE_ROLES.photographer;
  const lines = [
    '---',
    'type: photoatelier-role-packet',
    `role: ${role}`,
    `projectId: ${project?.id || ''}`,
    `planId: ${plan?.id || ''}`,
    `generatedAt: ${new Date().toISOString()}`,
    'privacy: share-safe',
    '---',
    '',
    `# ${brief.title}`,
    '',
    `> ${roleMeta.description}`,
    '',
    `- **日期与时间：** ${call ? formatDate(call.startAt) : project?.date || '待确认'}`,
    `- **结束时间：** ${call?.endAt ? formatDate(call.endAt) : '待确认'}`,
    `- **地点：** ${call?.location || project?.location || '待确认'}`,
    `- **方案：** ${plan?.concept || plan?.title || '未确认'}`,
    '',
    '## 你需要知道的事项',
    ...brief.priorities.map(item => `- ${item}`),
    '',
    '## 镜头摘要',
    ...(visibleShots.length ? visibleShots.map((shot, index) => `${index + 1}. ${shot.scene || `镜头 ${index + 1}`}${shot.pose ? ` · ${shot.pose}` : ''}${shot.priority === 'must' || shot.mustShoot ? ' · 必拍' : ''}`) : ['1. 当前没有可分享镜头']),
  ];

  if (role === 'client') {
    lines.push('', '## 交付与使用', `- 交付范围：${project?.deliverables || plan?.deliverables || '待确认'}`, `- 使用范围：${project?.usageScope || '待确认'}`, `- 客户确认状态：${project?.clientApprovalStatus || 'pending'}`);
  }
  if (role === 'model') {
    const model = brief.people.find(item => item.role === 'model');
    lines.push('', '## 模特确认', `- 授权状态：${consentLabel(model?.consentStatus)}`, `- 服装与妆造：${model?.wardrobe || '待确认'}`, `- 动作与发布边界：${model?.boundaries || '拍摄前现场确认'}`, `- 合作费用或权益：${model?.compensation || '按双方既有约定'}`);
  }
  if (role === 'assistant') {
    lines.push('', '## 执行提示', `- 设备数量：${brief.equipment.length}`, `- 镜头数量：${brief.shots.length}`, `- 设置切换：${brief.sequenceAnalysis.setupChanges} 次`, `- ${brief.sequenceAnalysis.recommendation}`);
  }

  lines.push('', '> 此文件为按角色脱敏的执行摘要，不包含其他成员联系方式、内部费用、完整风险清单或私密备注。', '');
  return `${lines.join('\n')}\n`;
}

export function ensureAssistantChecklist(data, projectId, planId = '') {
  const existing = data.listByProject('tasks', projectId);
  const created = [];
  for (const [code, title] of ASSISTANT_CHECKLIST_TEMPLATE) {
    const id = `${planId || projectId}-assistant-${code}`;
    if (data.get('tasks', id) || existing.some(item => item.checklistCode === code && item.planId === planId)) continue;
    created.push(data.create('tasks', {
      id,
      projectId,
      planId,
      taskType: 'checklist',
      phase: '前期',
      role: 'assistant',
      checklistCode: code,
      title,
      status: 'todo',
    }));
  }
  return created;
}

function addCheck(checks, ok, code, okMessage, failMessage, blocking) {
  checks.push({ code, ok: Boolean(ok), blocking: Boolean(blocking), message: ok ? okMessage : failMessage });
}

function consentLabel(status) {
  if (status === 'signed') return '已签署';
  if (status === 'not-required') return '不需要';
  if (status === 'declined') return '不同意';
  return '待确认';
}

function normalized(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }

function roleLabel(role) {
  return WORKSPACE_ROLES[role]?.label || role || '成员';
}
