const API_BASE = 'https://photoatelier-v2-api.photomagic.workers.dev';
const SESSION_KEY = 'pa_beta_session_id';
const QUEUE_KEY = 'pa_beta_feedback_queue';
const ANALYTICS_KEY = 'pa_beta_analytics_consent';
const BUILD = 'public-beta-2026.07';
const locale = document.documentElement.lang || 'zh-CN';
const languageRoutes = { 'zh-CN': '/', en: '/en/', ja: '/ja/', ko: '/ko/' };
const messages = {
  'zh-CN': { sending: '正在提交...', received: '已收到。谢谢你把问题说明清楚。', queued: '当前网络不可用，反馈已保存在本机，下次打开会自动重试。' },
  en: { sending: 'Submitting...', received: 'Received. Thank you for explaining the issue clearly.', queued: 'You appear to be offline. The feedback is saved locally and will retry next time.' },
  ja: { sending: '送信中...', received: '受け付けました。詳しく教えていただきありがとうございます。', queued: 'オフラインのため端末に保存しました。次回の起動時に再送します。' },
  ko: { sending: '전송 중...', received: '접수했습니다. 문제를 자세히 알려주셔서 감사합니다.', queued: '오프라인 상태입니다. 기기에 저장했고 다음 실행 때 다시 전송합니다.' },
};

const consentInput = document.querySelector('#analytics-consent');
const form = document.querySelector('[data-feedback-form]');
const languageSelect = document.querySelector('#landing-language');

if (languageSelect) {
  languageSelect.value = languageRoutes[locale] ? locale : 'zh-CN';
  languageSelect.addEventListener('change', () => {
    const route = languageRoutes[languageSelect.value] || '/';
    location.assign(new URL(route, location.origin).href);
  });
}

if (consentInput) {
  consentInput.checked = localStorage.getItem(ANALYTICS_KEY) === 'true';
  consentInput.addEventListener('change', () => {
    localStorage.setItem(ANALYTICS_KEY, String(consentInput.checked));
    track('analytics_consent_changed', { enabled: consentInput.checked });
  });
}

document.querySelectorAll('[data-track]').forEach(element => {
  element.addEventListener('click', () => track(element.dataset.track));
});

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[data-feedback-status]');
    const data = new FormData(form);
    const payload = {
      feedbackId: crypto.randomUUID(),
      task: data.get('task'),
      area: data.get('area'),
      friction: data.get('friction'),
      rating: Number(data.get('rating')),
      website: data.get('website'),
      page: location.href,
      build: BUILD,
      locale,
      sessionId: getSessionId(),
      analyticsConsent: localStorage.getItem(ANALYTICS_KEY) === 'true',
    };

    button.disabled = true;
    status.dataset.error = 'false';
    status.textContent = (messages[locale] || messages['zh-CN']).sending;
    try {
      await flushQueue();
      await sendFeedback(payload);
      form.reset();
      if (consentInput) consentInput.checked = localStorage.getItem(ANALYTICS_KEY) === 'true';
      status.textContent = (messages[locale] || messages['zh-CN']).received;
      track('feedback_submitted', { area: payload.area, rating: payload.rating });
    } catch (error) {
      enqueue(payload);
      status.dataset.error = 'true';
      status.textContent = (messages[locale] || messages['zh-CN']).queued;
    } finally {
      button.disabled = false;
    }
  });
}

flushQueue().catch(() => {});

async function sendFeedback(payload) {
  const response = await fetch(`${API_BASE}/api/public/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Feedback API returned ${response.status}`);
  return response.json();
}

function enqueue(payload) {
  const queue = readQueue();
  queue.push({ ...payload, queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
}

async function flushQueue() {
  const queue = readQueue();
  if (!queue.length) return;
  const remaining = [];
  for (const item of queue) {
    try { await sendFeedback(item); } catch (_) { remaining.push(item); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch (_) { return []; }
}

function getSessionId() {
  let value = localStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function track(name, metadata = {}) {
  if (localStorage.getItem(ANALYTICS_KEY) !== 'true') return;
  const events = JSON.parse(localStorage.getItem('pa_beta_local_events') || '[]');
  events.push({ name, metadata, at: new Date().toISOString() });
  localStorage.setItem('pa_beta_local_events', JSON.stringify(events.slice(-100)));
}
