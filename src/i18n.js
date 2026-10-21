/**
 * Bilingual copy for the panel.
 *
 * Action names are not here: each action carries its own `title: { zh, en }`
 * so that adding a tool stays a one-file change.
 */

const STORAGE_KEY = 'bar-tool.lang';

const dict = {
  zh: {
    brand: '吧台',
    'action.lang': '切换语言',
    'action.settings': '设置',
    'clip.title': '剪贴板',
    'clip.imageMeta': '{w} × {h}',
    'clip.textMeta': '{n} 字',
    'clip.rich': '富文本',
    'clip.emptyTitle': '剪贴板是空的',
    'clip.emptyDesc': '复制一段文字或一张图片，这里会列出能对它做什么',
    'actions.title': '能做什么',
    'actions.count': '{n} 个动作',
    'actions.hint': '↑↓ 选择 · ↵ 执行',
    'actions.imageEmpty': '图片动作还在开发中：上传到图床、存到下载目录',
    'group.clean': '清理',
    'group.typography': '中文排版',
    'group.list': '列表整理',
    'group.link': '链接',
    'status.empty': '等待剪贴板内容',
    'status.ready': '就绪',
    'status.running': '处理中…',
    'status.done': '已写入剪贴板',
    'status.undone': '已撤销',
    undo: '撤销',
    'err.empty_result': '结果为空，没有改动',
    'err.unchanged': '内容没有变化',
    'err.invalid_json': '这段内容不是合法 JSON',
    'err.invalid_base64': '不是合法的 Base64',
    'err.invalid_url_encoding': '百分号编码不完整',
    'err.invalid_timestamp': '时间戳超出范围',
    'err.invalid_date': '识别不出日期',
    'err.not_applicable': '当前剪贴板类型不支持这个动作',
    'err.unknown_action': '动作不存在',
    'err.nothing_to_undo': '没有可撤销的操作',
    'err.no_links': '这段内容里没有链接',
    'toast.settings': '设置面板正在开发中',
  },
  en: {
    brand: 'bar-tool',
    'action.lang': 'Switch language',
    'action.settings': 'Settings',
    'clip.title': 'Clipboard',
    'clip.imageMeta': '{w} × {h}',
    'clip.textMeta': '{n} chars',
    'clip.rich': 'rich text',
    'clip.emptyTitle': 'The clipboard is empty',
    'clip.emptyDesc': 'Copy some text or an image and this panel lists what it can become',
    'actions.title': 'Can become',
    'actions.count': '{n} actions',
    'actions.hint': '↑↓ select · ↵ run',
    'actions.imageEmpty': 'Image actions are coming: upload to your bucket, save to Downloads',
    'group.clean': 'Clean up',
    'group.typography': 'Typography',
    'group.list': 'Lists',
    'group.link': 'Links',
    'status.empty': 'Waiting for the clipboard',
    'status.ready': 'Ready',
    'status.running': 'Working…',
    'status.done': 'Written to the clipboard',
    'status.undone': 'Undone',
    undo: 'Undo',
    'err.empty_result': 'Nothing left after processing',
    'err.unchanged': 'Nothing would change',
    'err.invalid_json': 'That is not valid JSON',
    'err.invalid_base64': 'That is not valid Base64',
    'err.invalid_url_encoding': 'Incomplete percent-encoding',
    'err.invalid_timestamp': 'Timestamp out of range',
    'err.invalid_date': 'That does not read as a date',
    'err.not_applicable': 'This action does not fit the clipboard',
    'err.unknown_action': 'No such action',
    'err.nothing_to_undo': 'Nothing to undo',
    'err.no_links': 'No links in there',
    'toast.settings': 'Settings is coming soon',
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

/** Pick the bilingual field an action carries. */
export function pickLocalised(title) {
  if (!title) return '';
  return title[lang] ?? title.zh ?? title.en ?? '';
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
