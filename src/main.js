/**
 * Panel renderer.
 *
 * Milestone 1 owns everything you see: the clipboard preview is real, the
 * upload pipeline (buckets, links, recent history) is wired in M2 behind the
 * same DOM contract.
 */

import { applyStatic, nextLang, setLang, storedLang, t } from './i18n.js';

const POLL_MS = 1000;
const FORMAT_KEY = 'bar-tool.format';

const nodes = {
  version: document.getElementById('version'),
  langToggle: document.getElementById('lang-toggle'),
  settings: document.getElementById('settings'),
  clipMeta: document.getElementById('clip-meta'),
  preview: document.getElementById('preview'),
  bucket: document.getElementById('bucket'),
  manage: document.getElementById('manage'),
  format: document.getElementById('format'),
  upload: document.getElementById('upload'),
  recent: document.getElementById('recent'),
  recentAll: document.getElementById('recent-all'),
  dot: document.getElementById('dot'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast'),
};

const state = {
  version: '',
  locale: 'zh',
  format: 'url',
  /** Configured bucket, filled once the settings store lands in M2. */
  bucket: null,
  /** Upload history, filled in M2. */
  uploads: [],
  clipSignature: '',
  pollTimer: null,
  toastTimer: null,
};

/* ---------- rendering ---------- */

function renderClip(clip) {
  const signature =
    clip.kind === 'image'
      ? `i:${clip.width}x${clip.height}:${clip.dataUrl.length}`
      : clip.kind === 'text'
        ? `t:${clip.text}`
        : 'empty';

  if (signature === state.clipSignature) return;
  state.clipSignature = signature;

  nodes.preview.className = 'preview';
  nodes.preview.replaceChildren();

  if (clip.kind === 'image') {
    nodes.preview.classList.add('preview--image');
    const img = new Image();
    img.className = 'preview__img';
    img.src = clip.dataUrl;
    img.alt = '';
    nodes.preview.append(img);
    nodes.clipMeta.textContent = t('clip.imageMeta', { w: clip.width, h: clip.height });
    return;
  }

  if (clip.kind === 'text') {
    const pre = document.createElement('pre');
    pre.className = 'preview__text';
    pre.textContent = clip.text;
    nodes.preview.append(pre);
    nodes.clipMeta.textContent = t('clip.textMeta', { n: clip.length });
    return;
  }

  nodes.preview.append(emptyState(t('clip.emptyTitle'), t('clip.emptyDesc')));
  nodes.clipMeta.textContent = '';
}

function emptyState(title, description) {
  const box = document.createElement('div');
  box.className = 'preview__empty';

  const strong = document.createElement('strong');
  strong.textContent = title;

  const span = document.createElement('span');
  span.textContent = description;

  box.append(strong, span);
  return box;
}

function renderRecent() {
  nodes.recent.replaceChildren();

  if (state.uploads.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'recent__empty';
    empty.textContent = t('recent.empty');
    nodes.recent.append(empty);
    return;
  }

  for (const item of state.uploads) {
    nodes.recent.append(recentRow(item));
  }
}

function recentRow(item) {
  const row = document.createElement('li');
  row.className = 'recent__row';

  const thumb = document.createElement('img');
  thumb.className = 'recent__thumb';
  thumb.src = item.thumb;
  thumb.alt = '';

  const meta = document.createElement('div');
  meta.className = 'recent__meta';

  const name = document.createElement('div');
  name.className = 'recent__name';
  name.textContent = item.name;

  const time = document.createElement('div');
  time.className = 'recent__time';
  time.textContent = item.time;

  meta.append(name, time);

  const copy = document.createElement('button');
  copy.className = 'recent__copy';
  copy.type = 'button';
  copy.textContent = t('recent.copy');
  copy.addEventListener('click', () => showToast(t('toast.copied')));

  row.append(thumb, meta, copy);
  return row;
}

function renderStatus() {
  if (!state.bucket) {
    nodes.dot.dataset.state = 'idle';
    nodes.status.textContent = t('status.noBucket');
    return;
  }
  nodes.dot.dataset.state = 'ok';
  nodes.status.textContent = t('status.ready', { bucket: state.bucket.name });
}

function renderControls() {
  nodes.upload.disabled = !state.bucket;
}

/* ---------- interactions ---------- */

function showToast(message) {
  nodes.toast.textContent = message;
  nodes.toast.hidden = false;

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    nodes.toast.hidden = true;
  }, 1900);
}

function selectFormat(format) {
  state.format = format;
  try {
    localStorage.setItem(FORMAT_KEY, format);
  } catch {
    /* ignore: storage is best-effort */
  }

  for (const button of nodes.format.querySelectorAll('.seg')) {
    button.classList.toggle('is-active', button.dataset.format === format);
  }
}

function bindEvents() {
  nodes.langToggle.addEventListener('click', () => {
    setLang(nextLang());
    updateChrome();
  });

  nodes.settings.addEventListener('click', () => showToast(t('toast.settings')));
  nodes.manage.addEventListener('click', () => showToast(t('toast.settings')));
  nodes.upload.addEventListener('click', () => showToast(t('toast.upload')));

  nodes.format.addEventListener('click', (event) => {
    const button = event.target.closest('.seg');
    if (button) selectFormat(button.dataset.format);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.bar.hide();
  });
}

/* ---------- lifecycle ---------- */

async function refreshClip() {
  try {
    renderClip(await window.bar.readClipboard());
  } catch (error) {
    console.error('clipboard read failed', error);
  }
}

function startPolling() {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(refreshClip, POLL_MS);
}

function stopPolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = null;
}

function updateChrome() {
  nodes.langToggle.textContent = nextLang() === 'en' ? 'EN' : '中';
  nodes.version.textContent = state.version ? `v${state.version}` : '';
  renderStatus();
  renderControls();
}

async function init() {
  const info = await window.bar.info();
  state.version = info.version;
  state.locale = info.locale ?? 'zh';

  setLang(storedLang() ?? (state.locale.startsWith('zh') ? 'zh' : 'en'));
  applyStatic();

  let savedFormat = null;
  try {
    savedFormat = localStorage.getItem(FORMAT_KEY);
  } catch {
    /* ignore */
  }
  selectFormat(savedFormat ?? 'url');

  bindEvents();
  updateChrome();
  renderRecent();
  renderClip({ kind: 'empty' });
  await refreshClip();

  window.bar.onVisibility((visible) => {
    if (visible) {
      refreshClip();
      startPolling();
    } else {
      stopPolling();
    }
  });
}

init().catch((error) => {
  console.error('panel init failed', error);
});
