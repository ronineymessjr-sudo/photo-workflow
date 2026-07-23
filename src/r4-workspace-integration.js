import {
  renderMobileFieldMode,
  renderMobileSchedule,
} from './r4-mobile-field-mode.js';

const MOBILE_QUERY = '(max-width: 767px)';
const LEGACY_ON_SET = window.openOnSetMode;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function plans() {
  return typeof window.getPlans === 'function' ? window.getPlans() : read('pw_plans', []);
}

function planById(planId) {
  return plans().find(item => String(item.id) === String(planId)) || null;
}

function shotList(plan) {
  return typeof window.generateShotList === 'function' ? window.generateShotList(plan) : [];
}

function referenceCandidates(plan) {
  const references = Array.isArray(plan?.relations?.references) ? plan.relations.references : [];
  return references.map(item => ({
    id: item.id || item.referenceId,
    title: item.title || '参考图',
    url: item.thumbnail || item.previewUrl || item.sourceUrl || item.sourceFile || '',
    thumbnailUrl: item.thumbnail || item.previewUrl || '',
    sourceUrl: item.sourceUrl || '',
    synthetic: item.synthetic === true,
  })).filter(item => item.id);
}

function buildFieldState(plan) {
  const references = referenceCandidates(plan);
  const shots = shotList(plan).map((shot, index) => ({
    ...shot,
    id: `shot-${index}`,
    number: index + 1,
    title: shot.name || shot.scene || `镜头 ${index + 1}`,
    referenceId: plan.shotReferenceAssignments?.[`shot-${index}`] || null,
    estimatedMinutes: Number(shot.duration || 0),
  }));
  const completedShotIds = new Set(
    shots.filter((shot, index) => window.isShotComplete?.(plan.id, index)).map(shot => shot.id),
  );
  const notes = Object.fromEntries(
    shots.map((shot, index) => [shot.id, window.getShotNotes?.(plan.id, index) || '']),
  );
  return {
    plan,
    shots,
    references,
    completedShotIds,
    notes,
    schedules: read('pw_schedule', []),
    activeTab: 'plans',
    selectedScheduleDate: new Date().toISOString().slice(0, 10),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function closeOverlay() {
  document.getElementById('r4-mobile-workspace')?.remove();
  document.body.style.overflow = '';
}

function createOverlay() {
  closeOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'r4-mobile-workspace';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return overlay;
}

function routeFromMobile(tab) {
  closeOverlay();
  const target = {
    plans: 'plans',
    references: 'reference',
    schedule: 'calendar',
    me: 'settings',
  }[tab] || 'plans';
  window.showTab?.(target);
}

function showMobileSchedule(overlay, state) {
  renderMobileSchedule(overlay, { ...state, activeTab: 'schedule' }, {
    onTabChange: routeFromMobile,
  });
}

function showMobileFieldMode(plan) {
  const overlay = createOverlay();
  const state = buildFieldState(plan);
  renderMobileFieldMode(overlay, state, {
    onMarkComplete(shotId, completed) {
      const index = Number(String(shotId).replace('shot-', ''));
      window.toggleShotComplete?.(plan.id, index, completed);
    },
    onNoteChange(shotId, note) {
      const index = Number(String(shotId).replace('shot-', ''));
      window.saveShotNotes?.(plan.id, index, note);
    },
    onViewReference(reference) {
      if (!reference) return;
      closeOverlay();
      window.showTab?.('reference');
      window.openEasyReferenceDetail?.(reference.id);
    },
    onTabChange(tab) {
      if (tab === 'schedule') showMobileSchedule(overlay, state);
      else routeFromMobile(tab);
    },
  });
}

window.closeR4MobileWorkspace = closeOverlay;
window.openOnSetMode = function openR4ResponsiveOnSetMode(planId) {
  const plan = planById(planId);
  if (!plan) {
    window.toast?.('方案不存在', 'er');
    return;
  }
  if (window.matchMedia(MOBILE_QUERY).matches) {
    showMobileFieldMode(plan);
    return;
  }
  LEGACY_ON_SET?.(planId);
};

window.PhotoAtelierR4Workspace = {
  buildFieldState,
  closeOverlay,
  showMobileFieldMode,
};
