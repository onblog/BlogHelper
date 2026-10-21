/**
 * Panel renderer.
 *
 * The panel is a menu of what the current clipboard can become: the main
 * process decides which actions apply, this file just paints them and sends
 * the chosen one back.
 */

import { applyStatic, nextLang, pickLocalised, setLang, storedLang, t } from './i18n.js';

const POLL_MS = 900;

const nodes = {
  version: document.getElementById('version'),
  langToggle: document.getElementById('lang-toggle'),
  settings: document.getElementById('settings'),
  clipMeta: document.getElementById('clip-meta'),
  preview: document.getElementById('preview'),
  actionCount: document.getElementById('action-count'),
  actions: document.getElementById('actions'),
  dot: document.getElementById('dot'),
  status: document.getElementById('status'),
  undo: document.getElementById('undo'),
  hint: document.getElementById('hint'),
  toast: document.getElementById('toast'),
};

const state = {
  version: '',
  locale: 'zh',
  preview: { kind: 'empty' },
  actions: [],
  groups: [],
  canUndo: false,
  selectedId: null,
  /** Signature of the last painted payload, to skip no-op repaints. */
  signature: '',
  running: false,
  pollTimer: null,
  toastTimer: null,
  statusKey: 'status.ready',
  statusIsError: false,
};

/* ---------- rendering ---------- */

function previewSignature(preview) {
  if (preview.kind === 'image') return `i:${preview.width}x${preview.height}:${preview.dataUrl.length}`;
  if (preview.kind === 'text') return `t:${preview.text}`;
  return 'empty';
}

function renderPreview(preview) {
  nodes.preview.className = 'preview';
  nodes.preview.replaceChildren();

  if (preview.kind === 'image') {
    nodes.preview.classList.add('preview--image');
    const img = new Image();
    img.className = 'preview__img';
    img.src = preview.dataUrl;
    img.alt = '';
    nodes.preview.append(img);
    nodes.clipMeta.textContent = t('clip.imageMeta', { w: preview.width, h: preview.height });
    return;
  }

  if (preview.kind === 'text') {
    const pre = document.createElement('pre');
    pre.className = 'preview__text';
    pre.textContent = preview.text;
    nodes.preview.append(pre);

    const size = t('clip.textMeta', { n: preview.length });
    nodes.clipMeta.textContent = preview.rich ? `${size} · ${t('clip.rich')}` : size;
    return;
  }

  const box = document.createElement('div');
  box.className = 'preview__empty';
  const strong = document.createElement('strong');
  strong.textContent = t('clip.emptyTitle');
  const span = document.createElement('span');
  span.textContent = t('clip.emptyDesc');
  box.append(strong, span);
  nodes.preview.append(box);
  nodes.clipMeta.textContent = '';
}

function actionButton(action) {
  const button = document.createElement('button');
  button.className = 'action';
  button.type = 'button';
  button.dataset.id = action.id;
  if (action.id === state.selectedId) button.classList.add('is-selected');

  const name = document.createElement('span');
  name.className = 'action__name';
  name.textContent = pickLocalised(action.title);

  const key = document.createElement('span');
  key.className = 'action__key';
  key.textContent = '↵';

  button.append(name, key);
  button.addEventListener('click', () => runAction(action.id));
  return button;
}

function renderActions() {
  nodes.actions.replaceChildren();
  nodes.actionCount.textContent = state.actions.length
    ? t('actions.count', { n: state.actions.length })
    : '';

  if (state.actions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'actions__empty';
    empty.textContent =
      state.preview.kind === 'image'
        ? t('actions.imageEmpty')
        : state.preview.kind === 'empty'
          ? t('status.empty')
          : t('err.not_applicable');
    nodes.actions.append(empty);
    return;
  }

  // Keep the registry's group order, skip groups that filtered out entirely.
  for (const group of state.groups) {
    const items = state.actions.filter((action) => action.group === group);
    if (items.length === 0) continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'group';

    const title = document.createElement('div');
    title.className = 'group__title';
    title.textContent = t(`group.${group}`);

    const grid = document.createElement('div');
    grid.className = 'group__grid';
    for (const item of items) grid.append(actionButton(item));

    wrapper.append(title, grid);
    nodes.actions.append(wrapper);
  }
}

function renderFooter() {
  nodes.undo.hidden = !state.canUndo;
  nodes.hint.textContent = state.actions.length ? t('actions.hint') : '';
  nodes.undo.textContent = t('undo');

  if (state.statusIsError) {
    nodes.dot.dataset.state = 'bad';
    nodes.status.textContent = t(state.statusKey);
    return;
  }

  if (state.preview.kind === 'empty') {
    nodes.dot.dataset.state = 'idle';
  } else if (state.running) {
    nodes.dot.dataset.state = 'busy';
  } else {
    nodes.dot.dataset.state = 'ok';
  }

  nodes.status.textContent = t(state.statusKey);
}

/** Repaint from a state payload coming out of the main process. */
function paint(payload) {
  const previousIds = state.actions.map((action) => action.id).join(',');

  state.preview = payload.preview;
  state.actions = payload.actions;
  state.groups = payload.groups;
  state.canUndo = payload.canUndo;

  const ids = state.actions.map((action) => action.id).join(',');
  const signature = `${previewSignature(payload.preview)}|${ids}|${state.canUndo}`;
  const changed = ids !== previousIds || signature !== state.signature;

  if (!changed) {
    renderFooter();
    return;
  }

  state.signature = signature;

  // Keep the selection inside the new list, falling back to the first entry.
  if (!state.actions.some((action) => action.id === state.selectedId)) {
    state.selectedId = state.actions[0]?.id ?? null;
  }

  renderPreview(state.preview);
  renderActions();
  renderFooter();
}

/* ---------- behaviour ---------- */

function setStatus(key, isError = false) {
  state.statusKey = key;
  state.statusIsError = isError;
  renderFooter();
}

function showToast(message) {
  nodes.toast.textContent = message;
  nodes.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    nodes.toast.hidden = true;
  }, 1900);
}

async function refresh() {
  try {
    const payload = await window.bar.state();
    paint(payload);
  } catch (error) {
    console.error('panel state failed', error);
  }
}

async function runAction(id) {
  if (state.running) return;

  state.running = true;
  state.selectedId = id;
  setStatus('status.running');

  try {
    const result = await window.bar.run(id);
    state.running = false;
    paint(result.state);

    if (result.ok) {
      setStatus('status.done');
      showToast(t('status.done'));
    } else {
      setStatus(`err.${result.error}`, true);
    }
  } catch (error) {
    state.running = false;
    console.error('action failed', error);
    setStatus('err.unknown_action', true);
  }
}

async function undo() {
  try {
    const result = await window.bar.undo();
    paint(result.state);
    setStatus(result.ok ? 'status.undone' : `err.${result.error}`, !result.ok);
  } catch (error) {
    console.error('undo failed', error);
  }
}

function moveSelection(delta) {
  if (state.actions.length === 0) return;

  const index = state.actions.findIndex((action) => action.id === state.selectedId);
  const next = (index + delta + state.actions.length) % state.actions.length;
  state.selectedId = state.actions[next].id;

  for (const button of nodes.actions.querySelectorAll('.action')) {
    button.classList.toggle('is-selected', button.dataset.id === state.selectedId);
  }
  nodes.actions.querySelector('.action.is-selected')?.scrollIntoView({ block: 'nearest' });
}

function bindEvents() {
  nodes.langToggle.addEventListener('click', () => {
    setLang(nextLang());
    updateChrome();
    // Force a repaint so action names and meta text switch language too.
    state.signature = '';
    paint({
      preview: state.preview,
      actions: state.actions,
      groups: state.groups,
      canUndo: state.canUndo,
    });
  });

  nodes.settings.addEventListener('click', () => showToast(t('toast.settings')));
  nodes.undo.addEventListener('click', undo);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      window.bar.hide();
      return;
    }
    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === 'Enter' && state.selectedId) {
      event.preventDefault();
      runAction(state.selectedId);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
    }
  });
}

function startPolling() {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(refresh, POLL_MS);
}

function stopPolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = null;
}

function updateChrome() {
  nodes.langToggle.textContent = nextLang() === 'en' ? 'EN' : '中';
  nodes.version.textContent = state.version ? `v${state.version}` : '';
}

async function init() {
  const info = await window.bar.info();
  state.version = info.version;
  state.locale = info.locale ?? 'zh';

  setLang(storedLang() ?? (state.locale.startsWith('zh') ? 'zh' : 'en'));
  applyStatic();

  bindEvents();
  updateChrome();
  renderPreview(state.preview);
  renderFooter();
  await refresh();

  window.bar.onVisibility((visible) => {
    if (visible) {
      refresh();
      startPolling();
    } else {
      stopPolling();
    }
  });

  window.bar.onRefresh(() => {
    refresh();
  });
}

init().catch((error) => {
  console.error('panel init failed', error);
});
