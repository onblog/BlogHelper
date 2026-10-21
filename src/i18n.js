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
    'history.strip': '最近',
    'history.all': '全部',
    'history.empty': '还没有历史，复制点东西就会开始记录',
    'history.clear': '清空历史',
    'history.clearConfirm': '再点一次确认',
    'history.restored': '已回填剪贴板',
    'history.stats': '{n} 条 · {size}',
    'history.image': '图片 {w}×{h}',
    'history.imagePlain': '图片',
    'history.disabled': '历史记录已关闭',
    'settings.title': '设置',
    'settings.history': '记录剪贴板历史',
    'settings.historyHint': '关掉后不再记录新内容',
    'settings.maxItems': '最多保留',
    'settings.launch': '开机启动',
    'settings.launchHint': '登录后自动常驻菜单栏',
    'settings.github': 'GitHub 仓库',
    'settings.docs': '使用文档',
    'age.now': '刚刚',
    'age.minutes': '{n} 分钟前',
    'age.hours': '{n} 小时前',
    'age.days': '{n} 天前',
    'err.not_found': '这条记录已经不在了',
    'settings.storage': '存储',
    'settings.addBucket': '添加存储桶',
    'settings.linkFormat': '复制格式',
    'settings.linkFormatHint': '上传后写回剪贴板的格式',
    'bucket.title': '存储桶',
    'bucket.name': '名称',
    'bucket.endpoint': 'Endpoint',
    'bucket.region': 'Region',
    'bucket.bucket': '桶名',
    'bucket.publicBase': '公开域名',
    'bucket.secretHint': '留空则保留已保存的密钥',
    'bucket.pathStyle': '路径风格寻址',
    'bucket.pathStyleHint': 'endpoint/桶名/文件名，MinIO 与自建常用',
    'bucket.save': '保存',
    'bucket.delete': '删除',
    'bucket.edit': '编辑',
    'bucket.saved': '已保存',
    'bucket.deleted': '已删除',
    'bucket.empty': '还没有存储桶，图片上传会一直隐藏',
    'group.image': '图片',
    'upload.done': '已上传，链接已复制',
    'save.done': '已保存到下载目录',
    'err.invalid_endpoint': 'Endpoint 不是合法 URL',
    'err.insecure_endpoint': 'Endpoint 必须是 https',
    'err.missing_bucket': '请填写桶名',
    'err.missing_access_key': '请填写 Access Key',
    'err.missing_secret': '请填写 Secret Key',
    'err.encryption_unavailable': '钥匙串不可用，无法安全保存密钥',
    'err.upload_failed': '上传失败，检查 endpoint、密钥与桶权限',
    'err.no_bucket': '还没有配置存储桶',
    'err.save_failed': '保存图片失败',
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
    'history.strip': 'Recent',
    'history.all': 'All',
    'history.empty': 'Nothing yet — copy something and this fills up',
    'history.clear': 'Clear history',
    'history.clearConfirm': 'Click again to confirm',
    'history.restored': 'Restored to clipboard',
    'history.stats': '{n} items · {size}',
    'history.image': 'Image {w}×{h}',
    'history.imagePlain': 'Image',
    'history.disabled': 'History is off',
    'settings.title': 'Settings',
    'settings.history': 'Record clipboard history',
    'settings.historyHint': 'Turn off to stop recording new items',
    'settings.maxItems': 'Keep at most',
    'settings.launch': 'Launch at login',
    'settings.launchHint': 'Stay in the menu bar after login',
    'settings.github': 'GitHub repository',
    'settings.docs': 'Documentation',
    'age.now': 'just now',
    'age.minutes': '{n} min ago',
    'age.hours': '{n} h ago',
    'age.days': '{n} d ago',
    'err.not_found': 'That item is gone',
    'settings.storage': 'Storage',
    'settings.addBucket': 'Add bucket',
    'settings.linkFormat': 'Link format',
    'settings.linkFormatHint': 'What an upload writes to the clipboard',
    'bucket.title': 'Bucket',
    'bucket.name': 'Name',
    'bucket.endpoint': 'Endpoint',
    'bucket.region': 'Region',
    'bucket.bucket': 'Bucket name',
    'bucket.publicBase': 'Public domain',
    'bucket.secretHint': 'Leave blank to keep the saved secret',
    'bucket.pathStyle': 'Path-style addressing',
    'bucket.pathStyleHint': 'endpoint/bucket/key — usual for MinIO and self-hosted',
    'bucket.save': 'Save',
    'bucket.delete': 'Delete',
    'bucket.edit': 'Edit',
    'bucket.saved': 'Saved',
    'bucket.deleted': 'Deleted',
    'bucket.empty': 'No bucket yet — image upload stays hidden',
    'group.image': 'Image',
    'upload.done': 'Uploaded, link copied',
    'save.done': 'Saved to Downloads',
    'err.invalid_endpoint': 'That endpoint is not a valid URL',
    'err.insecure_endpoint': 'The endpoint must be https',
    'err.missing_bucket': 'Bucket name is required',
    'err.missing_access_key': 'Access key is required',
    'err.missing_secret': 'Secret key is required',
    'err.encryption_unavailable': 'Keychain unavailable — cannot store the secret safely',
    'err.upload_failed': 'Upload failed — check endpoint, keys and bucket permissions',
    'err.no_bucket': 'No bucket configured yet',
    'err.save_failed': 'Could not save the image',
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
