import { onAuthChange, loginWithGoogle, logout } from './auth';
import { showToast, openOverlay, closeOverlay, textEl, formatDate } from './ui';
import { submitFeedback } from './feedback';
import {
  CATEGORIES, CAUSES, categoryLabel, causeLabel, kindLabel, prescribe,
} from './prescriber';
import {
  THING_STATUSES, statusLabel, subscribeThings, createThing, updateThing, deleteThing,
} from './things';
import {
  subscribeCharts, createChart, updateChartItems, deleteChart,
} from './charts';
import { Thing, Chart, ThingCategory, ThingStatus, PrescriptionItem } from './types';

// ============================================================
// DOM refs
// ============================================================
const loginScreen = document.getElementById('login-screen') as HTMLElement;
const appEl = document.getElementById('app') as HTMLElement;
const userInfo = document.getElementById('user-info') as HTMLElement;
const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
const userName = document.getElementById('user-name') as HTMLElement;
const btnGoogleLogin = document.getElementById('btn-google-login') as HTMLButtonElement;
const btnLogout = document.getElementById('btn-logout') as HTMLButtonElement;

const diagnoseForm = document.getElementById('diagnose-form') as HTMLFormElement;
const inputThing = document.getElementById('input-thing') as HTMLSelectElement;
const thingHint = document.getElementById('thing-hint') as HTMLElement;
const causeChips = document.getElementById('cause-chips') as HTMLElement;
const inputNote = document.getElementById('input-note') as HTMLTextAreaElement;
const diagnoseSubmit = document.getElementById('diagnose-submit') as HTMLButtonElement;

const statCharts = document.getElementById('stat-charts') as HTMLElement;
const statTried = document.getElementById('stat-tried') as HTMLElement;
const chartList = document.getElementById('chart-list') as HTMLElement;
const chartEmpty = document.getElementById('chart-empty') as HTMLElement;

const statActive = document.getElementById('stat-active') as HTMLElement;
const statRevived = document.getElementById('stat-revived') as HTMLElement;
const statClosed = document.getElementById('stat-closed') as HTMLElement;

const thingForm = document.getElementById('thing-form') as HTMLFormElement;
const inputThingName = document.getElementById('input-thing-name') as HTMLInputElement;
const inputThingCategory = document.getElementById('input-thing-category') as HTMLSelectElement;
const inputThingStarted = document.getElementById('input-thing-started') as HTMLInputElement;
const inputThingHeat = document.getElementById('input-thing-heat') as HTMLSelectElement;
const thingListEl = document.getElementById('thing-list') as HTMLElement;
const thingEmpty = document.getElementById('thing-empty') as HTMLElement;
const archivedThingListEl = document.getElementById('archived-thing-list') as HTMLElement;
const archivedCountEl = document.getElementById('archived-count') as HTMLElement;

const confirmDialogTitle = document.getElementById('confirm-dialog-title') as HTMLElement;
const confirmOverlay = document.getElementById('confirm-dialog-overlay') as HTMLElement;
const btnConfirmCancel = document.getElementById('btn-confirm-cancel') as HTMLButtonElement;
const btnConfirmDelete = document.getElementById('btn-confirm-delete') as HTMLButtonElement;

const feedbackBtn = document.getElementById('feedback-btn') as HTMLButtonElement;
const feedbackOverlay = document.getElementById('feedback-modal-overlay') as HTMLElement;
const inputFeedbackMessage = document.getElementById('input-feedback-message') as HTMLTextAreaElement;
const btnFeedbackClose = document.getElementById('btn-feedback-close') as HTMLButtonElement;
const btnFeedbackSend = document.getElementById('btn-feedback-send') as HTMLButtonElement;

// ============================================================
// State
// ============================================================
let currentUid: string | null = null;
let unsubscribeThings: (() => void) | null = null;
let unsubscribeCharts: (() => void) | null = null;
let allThings: Thing[] = [];
let allCharts: Chart[] = [];
const selectedCauses = new Set<string>();
let freshChartId: string | null = null;

type PendingDelete =
  | { type: 'chart'; id: string; label: string }
  | { type: 'thing'; id: string; label: string };
let pendingDelete: PendingDelete | null = null;

// ============================================================
// 静的コントロールの初期化
// ============================================================
function initStaticControls(): void {
  CATEGORIES.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.key;
    opt.textContent = c.label;
    inputThingCategory.append(opt);
  });

  const HEAT_LABELS = ['ほぼ冷めた', '下がってきた', 'ふつう', 'まあ好き', 'まだ熱い'];
  HEAT_LABELS.forEach((label, i) => {
    const opt = document.createElement('option');
    opt.value = String(i + 1);
    opt.textContent = `${i + 1}：${label}`;
    inputThingHeat.append(opt);
  });
  inputThingHeat.value = '3';

  CAUSES.forEach((c) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = c.label;
    chip.dataset.key = c.key;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      if (selectedCauses.has(c.key)) {
        selectedCauses.delete(c.key);
        chip.classList.remove('is-selected');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selectedCauses.add(c.key);
        chip.classList.add('is-selected');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
    causeChips.append(chip);
  });
}
initStaticControls();

// ============================================================
// Auth
// ============================================================
onAuthChange((user) => {
  if (unsubscribeThings) { unsubscribeThings(); unsubscribeThings = null; }
  if (unsubscribeCharts) { unsubscribeCharts(); unsubscribeCharts = null; }

  if (user) {
    currentUid = user.uid;
    loginScreen.classList.add('hidden');
    appEl.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userAvatar.src = user.photoURL || '';
    userAvatar.alt = '';
    userName.textContent = user.displayName || user.email || '';

    unsubscribeThings = subscribeThings(currentUid, (things) => {
      allThings = things;
      renderThingSelect();
      renderThings();
      renderThingStats();
      renderCharts();
    });
    unsubscribeCharts = subscribeCharts(currentUid, (charts) => {
      allCharts = charts;
      renderChartStats();
      renderCharts();
    });
  } else {
    currentUid = null;
    allThings = [];
    allCharts = [];
    loginScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    userInfo.classList.add('hidden');
  }
});

btnGoogleLogin.addEventListener('click', () => {
  loginWithGoogle().catch((e: Error) => showToast('ログインに失敗しました: ' + e.message));
});

btnLogout.addEventListener('click', () => {
  logout();
});

// ============================================================
// 飽き診断フォーム
// ============================================================
function activeThings(): Thing[] {
  return allThings.filter((t) => !t.archived);
}

function renderThingSelect(): void {
  const prev = inputThing.value;
  inputThing.innerHTML = '';
  const list = activeThings();

  list.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name}（${categoryLabel(t.category)}）`;
    inputThing.append(opt);
  });

  const hasThings = list.length > 0;
  inputThing.disabled = !hasThings;
  diagnoseSubmit.disabled = !hasThings;
  thingHint.classList.toggle('hidden', hasThings);

  if (list.some((t) => t.id === prev)) {
    inputThing.value = prev;
  }
}

diagnoseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUid || diagnoseSubmit.disabled) return;

  const thing = allThings.find((t) => t.id === inputThing.value);
  if (!thing) {
    showToast('先に「飽きたもの」を登録してください');
    return;
  }
  const note = inputNote.value.trim();
  const causes = [...selectedCauses];
  const suggestions = prescribe(thing.category, causes);

  diagnoseSubmit.disabled = true;
  createChart(currentUid, { thingId: thing.id, causeTags: causes, note }, suggestions)
    .then((id) => {
      freshChartId = id;
      inputNote.value = '';
      selectedCauses.clear();
      causeChips.querySelectorAll('.chip').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-pressed', 'false');
      });
      showToast('処方せんを用意しました');
      window.setTimeout(() => {
        document.getElementById(`chart-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    })
    .catch((err: Error) => showToast('保存に失敗しました: ' + err.message))
    .finally(() => { diagnoseSubmit.disabled = false; });
});

// ============================================================
// 統計
// ============================================================
function renderChartStats(): void {
  statCharts.textContent = String(allCharts.length);
  const tried = allCharts.reduce(
    (sum, chart) => sum + chart.items.filter((a) => a.done).length,
    0,
  );
  statTried.textContent = String(tried);
}

function renderThingStats(): void {
  const list = activeThings();
  const count = (s: ThingStatus): number => list.filter((t) => t.status === s).length;
  statActive.textContent = String(count('active'));
  statRevived.textContent = String(count('revived'));
  statClosed.textContent = String(count('closed'));
}

// ============================================================
// 診断カルテ履歴
// ============================================================
function thingOf(thingId: string): Thing | null {
  return allThings.find((t) => t.id === thingId) ?? null;
}

function renderCharts(): void {
  chartList.innerHTML = '';
  chartEmpty.classList.toggle('hidden', allCharts.length > 0);
  allCharts.forEach((chart) => chartList.append(renderChartCard(chart)));
}

function renderChartCard(chart: Chart): HTMLElement {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.id = `chart-${chart.id}`;
  if (chart.id === freshChartId) card.classList.add('is-fresh');

  // --- head ---
  const head = document.createElement('div');
  head.className = 'entry-card__head';
  const thing = thingOf(chart.thingId);
  head.append(textEl('span', 'entry-card__thing', thing ? thing.name : '（削除されたもの）'));
  if (thing) head.append(textEl('span', 'entry-card__cat', categoryLabel(thing.category)));
  const when = chart.createdAt ? formatDate(chart.createdAt.toDate()) : '';
  if (when) head.append(textEl('span', 'entry-card__date', when));
  card.append(head);

  // --- note ---
  if (chart.note) {
    card.append(textEl('div', 'entry-card__note', chart.note));
  }

  // --- cause tags ---
  if (chart.causeTags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'entry-card__tags';
    chart.causeTags.forEach((t) => tags.append(textEl('span', 'entry-card__tag', causeLabel(t))));
    card.append(tags);
  } else {
    card.append(textEl('div', 'entry-card__tags-empty', '原因の指定なし（カテゴリ全体の処方）'));
  }

  // --- progress ---
  const doneCount = chart.items.filter((a) => a.done).length;
  card.append(
    textEl('div', 'entry-card__progress', `試した処方 ${doneCount}/${chart.items.length}`),
  );

  // --- prescription list ---
  const list = document.createElement('div');
  list.className = 'action-list';
  chart.items.forEach((item, idx) => {
    list.append(renderPrescriptionItem(chart, item, idx));
  });
  card.append(list);

  // --- footer (delete) ---
  const footer = document.createElement('div');
  footer.className = 'entry-card__footer';
  const delBtn = textEl('button', 'btn btn--ghost btn--sm', '🗑 このカルテを削除');
  delBtn.setAttribute('type', 'button');
  delBtn.addEventListener('click', () => {
    const label = thing ? `${thing.name} の診断` : 'この診断';
    pendingDelete = { type: 'chart', id: chart.id, label };
    confirmDialogTitle.textContent = `${label}を削除しますか？`;
    openOverlay(confirmOverlay);
  });
  footer.append(delBtn);
  card.append(footer);

  return card;
}

function renderPrescriptionItem(chart: Chart, item: PrescriptionItem, idx: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'action-item' + (item.done ? ' is-done' : '');

  const checkbox = textEl(
    'button',
    'action-item__checkbox' + (item.done ? ' is-done' : ''),
    item.done ? '✓' : '',
  );
  checkbox.setAttribute('type', 'button');
  checkbox.setAttribute('aria-label', item.done ? '「試した」を取り消す' : '試したことにする');
  checkbox.addEventListener('click', () => toggleItem(chart, idx));

  const body = document.createElement('div');
  body.className = 'action-item__body';
  const kindBadge = textEl('span', `kind-badge kind-badge--${item.kind}`, kindLabel(item.kind));
  const textLine = document.createElement('div');
  textLine.className = 'action-item__text';
  textLine.append(kindBadge, document.createTextNode(item.text));
  body.append(textLine);
  if (item.reason) body.append(textEl('div', 'action-item__reason', `なぜ: ${item.reason}`));

  el.append(checkbox, body);
  return el;
}

function toggleItem(chart: Chart, idx: number): void {
  if (!currentUid) return;
  const next = chart.items.map((a, i) => (i === idx ? { ...a, done: !a.done } : a));
  updateChartItems(currentUid, chart.id, next).catch(() => showToast('更新に失敗しました'));
}

// ============================================================
// 飽きたもの
// ============================================================
thingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!currentUid) return;
  const name = inputThingName.value.trim();
  if (!name) return;
  const submitBtn = thingForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;

  createThing(currentUid, {
    name,
    category: inputThingCategory.value as ThingCategory,
    startedYm: inputThingStarted.value || null,
    heat: Number(inputThingHeat.value) || 3,
    note: '',
  })
    .then(() => {
      thingForm.reset();
      inputThingHeat.value = '3';
      showToast('登録しました');
    })
    .catch((err: Error) => showToast('登録に失敗しました: ' + err.message))
    .finally(() => { submitBtn.disabled = false; });
});

function renderThings(): void {
  thingListEl.innerHTML = '';
  archivedThingListEl.innerHTML = '';

  const active = allThings.filter((t) => !t.archived);
  const archived = allThings.filter((t) => t.archived);

  thingEmpty.classList.toggle('hidden', active.length > 0);
  active.forEach((t) => thingListEl.append(renderThingCard(t)));
  archived.forEach((t) => archivedThingListEl.append(renderThingCard(t)));
  archivedCountEl.textContent = String(archived.length);
}

function renderThingCard(thing: Thing): HTMLElement {
  const card = document.createElement('div');
  card.className = 'thing-card' + (thing.archived ? ' is-archived' : '');

  // head
  const head = document.createElement('div');
  head.className = 'thing-card__head';
  head.append(textEl('span', 'thing-card__name', thing.name));
  head.append(textEl('span', 'thing-card__cat', categoryLabel(thing.category)));
  head.append(textEl('span', `thing-card__status thing-card__status--${thing.status}`, statusLabel(thing.status)));
  card.append(head);

  // meta
  if (thing.startedYm) {
    card.append(textEl('div', 'thing-card__meta', `開始: ${thing.startedYm}`));
  }

  // heat dots
  const heatRow = document.createElement('div');
  heatRow.className = 'heat-row';
  heatRow.append(textEl('span', 'heat-row__label', 'いまの熱量'));
  const dots = document.createElement('div');
  dots.className = 'heat-dots';
  for (let i = 1; i <= 5; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'heat-dot' + (i <= thing.heat ? ' is-on' : '');
    dot.setAttribute('aria-label', `熱量を${i}にする`);
    dot.addEventListener('click', () => {
      if (!currentUid || i === thing.heat) return;
      updateThing(currentUid, thing.id, { heat: i }).catch(() => showToast('更新に失敗しました'));
    });
    dots.append(dot);
  }
  heatRow.append(dots);
  card.append(heatRow);

  // footer: status select + archive + delete
  const footer = document.createElement('div');
  footer.className = 'thing-card__footer';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'thing-card__status-select';
  statusSelect.setAttribute('aria-label', 'ステータス');
  THING_STATUSES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = s.label;
    statusSelect.append(opt);
  });
  statusSelect.value = thing.status;
  statusSelect.addEventListener('change', () => {
    if (!currentUid) return;
    updateThing(currentUid, thing.id, { status: statusSelect.value as ThingStatus })
      .catch(() => showToast('更新に失敗しました'));
  });

  const archiveBtn = textEl('button', 'icon-btn', thing.archived ? '↩' : '📦');
  archiveBtn.setAttribute('type', 'button');
  archiveBtn.setAttribute('aria-label', thing.archived ? 'アーカイブ解除' : 'アーカイブ');
  archiveBtn.addEventListener('click', () => {
    if (!currentUid) return;
    updateThing(currentUid, thing.id, { archived: !thing.archived })
      .catch(() => showToast('更新に失敗しました'));
  });

  const delBtn = textEl('button', 'icon-btn is-danger', '🗑');
  delBtn.setAttribute('type', 'button');
  delBtn.setAttribute('aria-label', '削除');
  delBtn.addEventListener('click', () => {
    pendingDelete = { type: 'thing', id: thing.id, label: thing.name };
    confirmDialogTitle.textContent = `「${thing.name}」を削除しますか？`;
    openOverlay(confirmOverlay);
  });

  const spacer = document.createElement('span');
  spacer.className = 'thing-card__spacer';

  footer.append(statusSelect, spacer, archiveBtn, delBtn);
  card.append(footer);

  return card;
}

// ============================================================
// 削除確認ダイアログ（共通）
// ============================================================
btnConfirmCancel.addEventListener('click', () => {
  pendingDelete = null;
  closeOverlay(confirmOverlay);
});

btnConfirmDelete.addEventListener('click', () => {
  if (!currentUid || !pendingDelete || btnConfirmDelete.disabled) return;
  btnConfirmDelete.disabled = true;
  const uid = currentUid;
  const target = pendingDelete;

  const task = target.type === 'chart'
    ? deleteChart(uid, target.id)
    : deleteThing(uid, target.id);

  task
    .then(() => showToast('削除しました'))
    .catch((err: Error) => showToast('削除に失敗しました: ' + err.message))
    .finally(() => {
      btnConfirmDelete.disabled = false;
      pendingDelete = null;
      closeOverlay(confirmOverlay);
    });
});

// ============================================================
// 要望送信モーダル
// ============================================================
feedbackBtn.addEventListener('click', () => {
  inputFeedbackMessage.value = '';
  openOverlay(feedbackOverlay);
});

btnFeedbackClose.addEventListener('click', () => closeOverlay(feedbackOverlay));

btnFeedbackSend.addEventListener('click', () => {
  const message = inputFeedbackMessage.value.trim();
  if (!message || btnFeedbackSend.disabled) return;
  btnFeedbackSend.disabled = true;
  submitFeedback(message)
    .then((ok) => {
      showToast(ok ? '送信しました。ありがとうございます！' : '送信に失敗しました');
      if (ok) closeOverlay(feedbackOverlay);
    })
    .finally(() => {
      btnFeedbackSend.disabled = false;
    });
});
