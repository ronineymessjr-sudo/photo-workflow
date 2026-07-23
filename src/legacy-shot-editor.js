(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LegacyShotEditor = factory();
    root.addCustomShot = root.LegacyShotEditor.addCustomShot;
    root.reorderShots = root.LegacyShotEditor.reorderShots;
    root.toggleShotView = root.LegacyShotEditor.toggleShotView;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createShotEditor(userDeps) {
    const deps = userDeps || {};

    function env(key, fallback) {
      if (deps[key] !== undefined) return deps[key];
      if (typeof window !== 'undefined' && window[key] !== undefined) return window[key];
      return fallback;
    }

    function fn(name, fallback) {
      if (deps[name]) return deps[name];
      if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
      return fallback || function () {};
    }

    const storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const doc = deps.document || (typeof document !== 'undefined' ? document : null);
    const notify = deps.toast || fn('toast');
    const renderPlan = deps.renderPlanContent || fn('renderPlanContent');
    const loadPlan = deps.loadPlan || fn('loadPlan');
    const getRenderableShotList = deps.getRenderableShotList || fn('getRenderableShotList');
    const generateShotList = deps.generateShotList || fn('generateShotList');
    const getPlanById = deps.getPlanById || function (id) {
      const getPlans = fn('getPlans');
      const plans = getPlans ? getPlans() : [];
      return plans.find(function (p) { return p && p.id === id; }) || null;
    };

    function getCurrentPlanId() {
      return env('currentPlanId', null);
    }

    function getCurrentPlanData() {
      return env('currentPlanData', null);
    }

    function storageKey(planId) {
      return 'pa_shots_' + planId;
    }

    function getStoredShots(planId) {
      if (!storage || !planId) return null;
      const raw = storage.getItem(storageKey(planId));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }

    function getCurrentShots(planId) {
      const pid = planId || getCurrentPlanId();
      if (!pid) return [];
      const stored = getStoredShots(pid);
      if (Array.isArray(stored) && stored.length) return stored;
      const plan = getCurrentPlanData() || getPlanById(pid);
      if (!plan) return [];
      if (getRenderableShotList) return getRenderableShotList(plan);
      if (generateShotList) return generateShotList(plan);
      return plan.shots || [];
    }

    function saveShots(planId, shots) {
      const pid = planId || getCurrentPlanId();
      if (!storage || !pid) return;
      storage.setItem(storageKey(pid), JSON.stringify(shots));
    }

    function refreshPlanView(planId) {
      const pid = planId || getCurrentPlanId();
      if (!pid) return;
      const data = getCurrentPlanData();
      if (data && data.id === pid) {
        renderPlan(data);
      } else if (loadPlan) {
        loadPlan(pid);
      }
    }

    function addCustomShot(planId) {
      const pid = planId || getCurrentPlanId();
      if (!pid) { notify('没有当前方案，请先生成或打开方案', 'er'); return; }

      const scene = typeof prompt === 'function' ? prompt('场景名称（如：窗边、沙发区）:') : null;
      if (!scene) return;
      const desc = typeof prompt === 'function' ? prompt('画面描述（如：模特倚靠窗边，自然光侧照）:') : null;
      if (!desc) return;
      const focal = (typeof prompt === 'function' ? prompt('焦距（如：85mm f/1.4）:') : '') || '50mm f/1.4';
      const mood = (typeof prompt === 'function' ? prompt('情绪（如：慵懒、自信）:') : '') || '自然';

      const shots = getCurrentShots(pid);
      const newShot = {
        scene: scene,
        description: desc,
        shotSize: '中景',
        method: '定点拍摄',
        focalLength: focal,
        composition: '三分法',
        lighting: '自然光',
        props: '无',
        angle: '平视',
        mood: mood,
        duration: 5,
        notes: '自定义镜头 - ' + desc,
        priority: '推荐',
        knowledgeSourceIds: [],
        references: []
      };
      shots.push(newShot);
      saveShots(pid, shots);
      notify('镜头已添加', 'ok');
      refreshPlanView(pid);
    }

    function reorderShots(planId) {
      const pid = planId || getCurrentPlanId();
      if (!pid) { notify('没有当前方案，请先生成或打开方案', 'er'); return; }
      const shots = getCurrentShots(pid);
      if (shots.length < 2) { notify('至少需要两个镜头才能调整顺序', 'er'); return; }

      const currentOrder = shots.map(function (_, i) { return String(i + 1); }).join(', ');
      const input = typeof prompt === 'function'
        ? prompt('当前镜头顺序：' + currentOrder + '\n请输入新顺序（用逗号分隔编号）：', currentOrder)
        : currentOrder;
      if (!input) return;

      const rawItems = String(input).split(/[,，]/);
      const newIndices = [];
      for (let i = 0; i < rawItems.length; i++) {
        const n = parseInt(rawItems[i].trim(), 10) - 1;
        if (!isNaN(n) && n >= 0 && n < shots.length) newIndices.push(n);
      }
      if (newIndices.length !== shots.length || new Set(newIndices).size !== shots.length) {
        notify('输入的顺序不完整或有重复', 'er'); return;
      }

      const reordered = newIndices.map(function (idx) { return shots[idx]; });
      saveShots(pid, reordered);
      notify('镜头顺序已调整', 'ok');
      refreshPlanView(pid);
    }

    function toggleShotView(planId) {
      const pid = planId || getCurrentPlanId();
      if (!doc) {
        if (typeof notify === 'function') notify('简洁视图仅在浏览器中可用', 'er');
        return;
      }
      const wrapper = doc.querySelector('.plan-output-wrapper');
      if (!wrapper) { notify('找不到方案输出区域', 'er'); return; }
      const isConcise = wrapper.classList.toggle('is-concise');
      notify(isConcise ? '已切换到简洁视图' : '已切换到详细视图', 'ok');
      const summary = wrapper.querySelector('.plan-primary-toggle__summary--concise');
      if (summary) summary.textContent = isConcise ? '简洁视图' : '详细视图';
    }

    return {
      createShotEditor: createShotEditor,
      addCustomShot: addCustomShot,
      reorderShots: reorderShots,
      toggleShotView: toggleShotView,
      getCurrentShots: getCurrentShots,
      saveShots: saveShots,
      refreshPlanView: refreshPlanView
    };
  }

  return createShotEditor();
}));
