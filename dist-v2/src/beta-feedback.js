const API_BASE = 'https://photoatelier-v2-api.photomagic.workers.dev';
const QUEUE_KEY = 'pa_beta_feedback_queue';
const SESSION_KEY = 'pa_beta_session_id';
const BUILD = 'legacy-v5-public-beta-2026.07';
const areaValues = ['plan', 'references', 'schedule', 'lut', 'connections', 'ui', 'other'];
const feedbackCopy = {
  zh: { trigger: '反馈', triggerAria: '提交使用反馈', title: '告诉我们哪里不好用', privacy: '不会自动附带你的方案、图片或 Obsidian 内容。', close: '关闭反馈窗口', task: '你正在做什么？', taskPlaceholder: '例如：把预选方案加入下周日程', area: '问题出现在哪？', friction: '哪里卡住了？', frictionPlaceholder: '原本想完成什么、实际发生了什么、希望怎么改', impact: '影响程度', submit: '提交反馈', sending: '正在提交...', received: '已收到，感谢你把问题说清楚。', queued: '网络不可用，已保存在本机，稍后自动重试。', areas: ['方案生成', '参考图库', '日程与现场', 'LUT 与后期', '数据连接', '界面与操作', '其他'] },
  en: { trigger: 'Feedback', triggerAria: 'Submit product feedback', title: 'Tell us what gets in your way', privacy: 'Your plans, images, and Obsidian content are never attached automatically.', close: 'Close feedback dialog', task: 'What were you trying to do?', taskPlaceholder: 'Example: add a candidate plan to next week\'s schedule', area: 'Where did it happen?', friction: 'What blocked you?', frictionPlaceholder: 'Describe what you wanted to do, what happened, and what should change', impact: 'Impact', submit: 'Submit feedback', sending: 'Submitting...', received: 'Received. Thank you for explaining the issue clearly.', queued: 'You appear to be offline. Saved locally and queued for retry.', areas: ['Plan generation', 'Reference library', 'Schedule and on-set', 'LUTs and post', 'Data connections', 'Interface and interactions', 'Other'] },
  ja: { trigger: 'フィードバック', triggerAria: '利用フィードバックを送信', title: '使いにくかった点を教えてください', privacy: 'プラン、画像、Obsidian の内容は自動添付されません。', close: 'フィードバックを閉じる', task: '何をしようとしていましたか？', taskPlaceholder: '例: 候補プランを来週の日程に追加する', area: 'どこで起きましたか？', friction: 'どこで止まりましたか？', frictionPlaceholder: 'やりたかったこと、起きたこと、期待する改善を書いてください', impact: '影響度', submit: '送信する', sending: '送信中...', received: '受け付けました。詳しく教えていただきありがとうございます。', queued: 'オフラインのため端末に保存し、再送待ちにしました。', areas: ['プラン生成', 'リファレンス', '日程と現場', 'LUTと仕上げ', 'データ接続', '画面と操作', 'その他'] },
  ko: { trigger: '피드백', triggerAria: '사용 피드백 보내기', title: '어디가 불편했는지 알려주세요', privacy: '계획, 이미지, Obsidian 내용은 자동으로 첨부되지 않습니다.', close: '피드백 창 닫기', task: '무엇을 하려고 했나요?', taskPlaceholder: '예: 후보 계획을 다음 주 일정에 추가하기', area: '어디에서 문제가 생겼나요?', friction: '어디에서 막혔나요?', frictionPlaceholder: '하려던 일, 실제로 일어난 일, 바라는 변경점을 적어주세요', impact: '영향도', submit: '피드백 보내기', sending: '전송 중...', received: '접수했습니다. 문제를 자세히 알려주셔서 감사합니다.', queued: '오프라인 상태라 기기에 저장했으며 다음에 다시 전송합니다.', areas: ['계획 생성', '레퍼런스 라이브러리', '일정과 현장', 'LUT와 후반 작업', '데이터 연결', '화면과 조작', '기타'] },
};

const getLanguage = () => {
  const requested = new URLSearchParams(location.search).get('lang');
  const stored = localStorage.getItem('pw_lang');
  return feedbackCopy[requested] ? requested : (feedbackCopy[stored] ? stored : 'zh');
};
let copy = feedbackCopy[getLanguage()];

const trigger = document.createElement('button');
trigger.type = 'button';
trigger.className = 'pa-beta-feedback-trigger';
trigger.setAttribute('aria-label', copy.triggerAria);
trigger.innerHTML = `<i data-lucide="message-square" aria-hidden="true"></i><span>${copy.trigger}</span>`;

const dialog = document.createElement('dialog');
dialog.className = 'pa-beta-feedback-dialog';
dialog.innerHTML = `
  <div class="pa-beta-feedback-head">
    <div><h2 data-copy="title">${copy.title}</h2><p data-copy="privacy">${copy.privacy}</p></div>
    <button class="pa-beta-feedback-close" type="button" aria-label="${copy.close}"><i data-lucide="x" aria-hidden="true"></i></button>
  </div>
  <form class="pa-beta-feedback-form">
    <label><span data-copy="task">${copy.task}</span><input name="task" maxlength="240" required placeholder="${copy.taskPlaceholder}"></label>
    <label><span data-copy="area">${copy.area}</span><select name="area" required>${copy.areas.map((area, index) => `<option value="${areaValues[index]}">${area}</option>`).join('')}</select></label>
    <label><span data-copy="friction">${copy.friction}</span><textarea name="friction" maxlength="1200" required placeholder="${copy.frictionPlaceholder}"></textarea></label>
    <fieldset class="pa-beta-rating"><legend data-copy="impact">${copy.impact}</legend>
      <label><input type="radio" name="rating" value="1" required><span>1</span></label><label><input type="radio" name="rating" value="2"><span>2</span></label><label><input type="radio" name="rating" value="3"><span>3</span></label><label><input type="radio" name="rating" value="4"><span>4</span></label><label><input type="radio" name="rating" value="5"><span>5</span></label>
    </fieldset>
    <label class="pa-beta-feedback-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <button class="pa-beta-submit" type="submit" data-copy="submit">${copy.submit}</button><p class="pa-beta-feedback-status" role="status" aria-live="polite"></p>
  </form>`;

document.body.append(trigger, dialog);
window.lucide?.createIcons?.();
trigger.addEventListener('click', () => dialog.showModal());
dialog.querySelector('.pa-beta-feedback-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
window.addEventListener('photoatelier:languagechange', applyLanguage);

const form = dialog.querySelector('form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);
  const status = form.querySelector('.pa-beta-feedback-status');
  const button = form.querySelector('button[type="submit"]');
  const payload = { feedbackId: crypto.randomUUID(), task: data.get('task'), area: data.get('area'), friction: data.get('friction'), rating: Number(data.get('rating')), website: data.get('website'), page: location.href, build: BUILD, locale: getLanguage(), sessionId: getSessionId(), analyticsConsent: false };
  button.disabled = true;
  status.dataset.error = 'false';
  status.textContent = copy.sending;
  try {
    await flushQueue();
    await send(payload);
    form.reset();
    status.textContent = copy.received;
    setTimeout(() => dialog.close(), 900);
  } catch (_) {
    const queue = readQueue();
    queue.push({ ...payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
    status.dataset.error = 'true';
    status.textContent = copy.queued;
  } finally { button.disabled = false; }
});

flushQueue().catch(() => {});
async function send(payload) { const response = await fetch(`${API_BASE}/api/public/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`Feedback API returned ${response.status}`); }
async function flushQueue() { const remaining = []; for (const item of readQueue()) { try { await send(item); } catch (_) { remaining.push(item); } } localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); }
function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (_) { return []; } }
function getSessionId() { let value = localStorage.getItem(SESSION_KEY); if (!value) { value = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, value); } return value; }

function applyLanguage() {
  copy = feedbackCopy[getLanguage()];
  trigger.setAttribute('aria-label', copy.triggerAria);
  trigger.querySelector('span').textContent = copy.trigger;
  dialog.querySelector('[data-copy="title"]').textContent = copy.title;
  dialog.querySelector('[data-copy="privacy"]').textContent = copy.privacy;
  dialog.querySelector('.pa-beta-feedback-close').setAttribute('aria-label', copy.close);
  for (const key of ['task', 'area', 'friction', 'impact', 'submit']) dialog.querySelector(`[data-copy="${key}"]`).textContent = copy[key];
  dialog.querySelector('input[name="task"]').placeholder = copy.taskPlaceholder;
  dialog.querySelector('textarea[name="friction"]').placeholder = copy.frictionPlaceholder;
  [...dialog.querySelector('select[name="area"]').options].forEach((option, index) => { option.textContent = copy.areas[index]; });
}
