/**
 * Bilingual copy for the panel.
 *
 * Every visible string lives here so the UI can switch language instantly and
 * the panel never hard-codes user-facing text.
 */

const STORAGE_KEY = 'bar-tool.lang';

const dict = {
  zh: {
    brand: '吧台',
    'action.lang': '切换语言',
    'action.settings': '设置',
    'clip.title': '剪贴板',
    'clip.emptyTitle': '剪贴板里还没有图片',
    'clip.emptyDesc': '按 ⌘⇧⌃4 把截图存到剪贴板，再点下面的按钮',
    'clip.imageMeta': '{w} × {h}',
    'clip.textMeta': '{n} 字',
    'bucket.label': '存入',
    'bucket.empty': '未配置存储桶',
    'bucket.manage': '管理',
    'format.label': '复制格式',
    'upload.label': '上传并复制',
    'recent.title': '最近上传',
    'recent.all': '查看全部',
    'recent.empty': '还没有上传记录，第一张图会出现在这里',
    'recent.copy': '复制',
    'status.noBucket': '未配置存储桶 · 先配置一个再开工',
    'status.ready': '就绪 · {bucket}',
    'status.uploading': '正在上传…',
    'status.copied': '链接已复制',
    'toast.settings': '设置面板正在开发中',
    'toast.upload': '上传引擎正在开发中',
    'toast.copied': '已复制到剪贴板',
  },
  en: {
    brand: 'bar-tool',
    'action.lang': 'Switch language',
    'action.settings': 'Settings',
    'clip.title': 'Clipboard',
    'clip.emptyTitle': 'No image on the clipboard',
    'clip.emptyDesc': 'Press ⌘⇧⌃4 to copy a screenshot, then hit the button below',
    'clip.imageMeta': '{w} × {h}',
    'clip.textMeta': '{n} chars',
    'bucket.label': 'Save to',
    'bucket.empty': 'No bucket configured',
    'bucket.manage': 'Manage',
    'format.label': 'Copy format',
    'upload.label': 'Upload & copy',
    'recent.title': 'Recent',
    'recent.all': 'View all',
    'recent.empty': 'Nothing yet — your first image will land here',
    'recent.copy': 'Copy',
    'status.noBucket': 'No bucket configured — add one to get started',
    'status.ready': 'Ready · {bucket}',
    'status.uploading': 'Uploading…',
    'status.copied': 'Link copied',
    'toast.settings': 'Settings is coming soon',
    'toast.upload': 'The uploader is coming soon',
    'toast.copied': 'Copied to clipboard',
  },
};

let lang = 'zh';

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : match,
  );
}

export function t(key, vars) {
  const table = dict[lang] ?? dict.zh;
  return interpolate(table[key] ?? dict.zh[key] ?? key, vars);
}

export function getLang() {
  return lang;
}

export function nextLang() {
  return lang === 'zh' ? 'en' : 'zh';
}

/** Translate every element that declared a `data-i18n*` attribute. */
export function applyStatic() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll('[data-i18n-title]')) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
}

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* localStorage can be unavailable on file:// in some builds; ignore. */
  }
  applyStatic();
}

export function storedLang() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
