/**
 * Site behaviour: bilingual copy, the release manifest, and a chunked dmg
 * download with a progress bar (single connections are throttled often enough
 * that parallel ranges are worth the extra code).
 */

const dict = {
  zh: {
    brand: '吧台',
    'nav.actions': '动作',
    'nav.details': '细节',
    'nav.bucket': '图床',
    'nav.faq': '常见问题',
    'hero.title': '吧台',
    'hero.tagline': '截图和文字进了剪贴板，就变成你要的样子',
    'hero.desc': '给文字工作者用的：按 ⌘⇧S 截图，或者复制一段文字——清理干净、排好版、富文本与 Markdown 互转；图片可以直接改，也能传进你自己的图床拿回链接。一条龙，都在菜单栏里。',
    'hero.meta': 'macOS 12+ · 8 线程分片下载 · 首次打开需右键 → 打开 · 不收集任何数据',
    'download.arm': '下载 Apple Silicon 版',
    'download.intel': 'Intel 版',
    'download.wait': '正在准备下载…',
    'download.done': '已开始下载',
    'download.toast': '下载完成：{name} 已存入「下载」文件夹',
    'download.failed': '下载失败，请到 GitHub 反馈',
    'download.unavailable': '安装包还在上传，稍后再来',
    'shots.main': '剪贴板里是什么，就列出能变成什么',
    'shots.history': '最近复制过的东西，点一下就回去',
    'shots.settings': '历史、图床、开机启动，都在设置里',
    'details.title': '三个顺手的小细节',
    'details.themeTitle': '默认白天营业',
    'details.theme1': '奶油纸 + 焦糖墨，点开像张便签',
    'details.theme2': '右上角的小太阳可以换成打烊的炭黑',
    'details.theme3': '手动切换、记住选择，不跟随系统',
    'details.captureTitle': '截图到剪贴板',
    'details.capture1': '⌘⇧S 直接在屏幕上框选，工具栏就在旁边',
    'details.capture2': '截完就落在剪贴板，面板自动弹开',
    'details.capture3': '不满意就点「编辑图片」，改完覆盖回剪贴板',
    'details.editTitle': '改完直接覆盖剪贴板',
    'details.edit1': '文字点「编辑」改字；图片能裁剪、打码、画笔、箭头',
    'details.edit2': '保存即覆盖剪贴板，⌘↵ 快速保存',
    'details.edit3': '⌥⌘Z 可以撤销这次覆盖',
    'actions.title': '17 个动作，六个分组',
    'actions.lead':
      '面板不会把所有功能都摊在你脸上：剪贴板是图片就只出图片动作，是普通文字就不会出现「转纯文本」。',
    'group.convert': '格式转换',
    'group.clean': '清理',
    'group.typography': '中文排版',
    'group.list': '列表整理',
    'group.link': '链接',
    'group.image': '图片',
    'item.plain': '转纯文本（剥掉格式，只剩字）',
    'item.toMarkdown': '转 Markdown（带格式的文字 → 干净源码）',
    'item.toRich': '转富文本（Markdown → 带格式，粘进 Word/微信）',
    'item.trim': '去首尾空白 · 合并空行',
    'item.numbers': '去掉行号 · 压成一行',
    'item.invisible': '清除隐形字符（零宽、BOM）',
    'item.markdown': '去掉 Markdown 标记',
    'item.spacing': '中英文之间自动加空格',
    'item.fullwidth': '标点转全角',
    'item.dedupe': '去重行 · 排序行',
    'item.tracking': '净化链接（去掉 utm_* 跟踪参数）',
    'item.extract': '提取文中所有链接',
    'item.upload': '上传到图床 → 链接',
    'item.save': '存到下载目录',
    'bucket.title': '图片存在你自己的桶里',
    'bucket.lead':
      '没有官方图床，也没有账号。填一个 S3 兼容存储，链接就指向你自己的域名，费用和隐私都归你。',
    'bucket.col.field': '字段',
    'bucket.col.value': '填什么',
    'bucket.region': 'R2 填 auto，COS/OSS 填真实地域',
    'bucket.name': '桶名',
    'bucket.nameValue': '你的存储桶名称',
    'bucket.public': '公开域名',
    'bucket.publicValue': '图片对外服务的域名，回给你的链接就用它',
    'bucket.keys': '有写权限的 S3 密钥；Secret 用 macOS 钥匙串加密',
    'bucket.note': 'R2 最省：10 GB 免费、不收流出流量费。对象名按内容寻址，同一张图传两次只有一个文件。',
    'faq.title': '常见问题',
    'faq.q1': '双击提示「未验证的开发者」怎么办？',
    'faq.a1':
      '安装包是 ad-hoc 签名、没做 Apple 公证。在访达里右键图标 → 打开 → 再点一次「打开」即可；也可以在「系统设置 → 隐私与安全性」里选仍要打开。',
    'faq.q2': '它是怎么记录剪贴板历史的？',
    'faq.a2':
      'macOS 没有剪贴板变更事件，只能轮询：文字每 1.2 秒读一次并比对哈希，图片每 3 秒采样一次、且只在剪贴板没有文字时才读。副作用是连拍两张图时，第二张可能不会被记录。',
    'faq.q3': '数据存在哪？会上传吗？',
    'faq.a3':
      '历史存在本机 ~/Library/Application Support/bar-tool/，图片是一个索引加若干文件。应用唯一的网络请求，就是把图片 PUT 到你配置的存储桶；没有统计、没有崩溃上报。',
    'faq.q4': '需要什么系统权限？',
    'faq.a4':
      '功能本身不需要权限：⌥⌘V 呼出面板、文字与图片处理都直接可用。只有「截图」要授权「屏幕录制」，自带的框选界面也只会出现在你按下 ⌘⇧S 的时候。',
    'footer.license': 'AGPL-3.0-only + 商业授权',
    'footer.issue': '反馈',
  },
  en: {
    brand: 'bar-tool',
    'nav.actions': 'Actions',
    'nav.details': 'Details',
    'nav.bucket': 'Image host',
    'nav.faq': 'FAQ',
    'hero.title': 'bar-tool',
    'hero.tagline': 'A screenshot or a snippet of text lands on the clipboard, and leaves in the shape you need',
    'hero.desc': 'For people who write: hit ⌘⇧S for a screenshot, or copy some text — it comes back cleaned, spaced and converted between rich text and Markdown; images can be edited in place, or sent to your own bucket as links.',
    'hero.meta': 'macOS 12+ · 8-thread chunked download · right-click to open the first time · no data collected',
    'download.arm': 'Download for Apple Silicon',
    'download.intel': 'Intel build',
    'download.wait': 'Preparing the download…',
    'download.done': 'Download started',
    'download.toast': 'Download complete — {name} is in your Downloads folder',
    'download.failed': 'Download failed — please open an issue on GitHub',
    'download.unavailable': 'The build is still uploading, check back soon',
    'shots.main': 'What is on the clipboard decides what the panel offers',
    'shots.history': 'Everything you copied recently, one click away',
    'shots.settings': 'History, bucket and launch-at-login live in settings',
    'details.title': 'Three small things you will notice',
    'details.themeTitle': 'Open in daylight by default',
    'details.theme1': 'Cream paper and caramel ink, like a sticky note',
    'details.theme2': 'The sun button up top switches to the after-hours charcoal',
    'details.theme3': 'Switched by hand and remembered, never follows macOS',
    'details.captureTitle': 'Screenshot to clipboard',
    'details.capture1': '⌘⇧S selects a region, toolbar right beside it',
    'details.capture2': 'The shot lands on the clipboard and the panel opens',
    'details.capture3': 'Not happy? Hit Edit image and paste the fix back',
    'details.editTitle': 'Overwrite the clipboard in place',
    'details.edit1': 'Edit text; crop, mosaic, draw or arrow on an image',
    'details.edit2': 'Saving overwrites the clipboard; ⌘↵ saves fast',
    'details.edit3': '⌥⌘Z undoes that overwrite',
    'actions.title': '17 actions, six groups',
    'actions.lead':
      'The panel never dumps everything on you: an image only shows image actions, plain prose never offers "To plain text".',
    'group.convert': 'Convert',
    'group.clean': 'Clean up',
    'group.typography': 'Typography',
    'group.list': 'Lists',
    'group.link': 'Links',
    'group.image': 'Image',
    'item.plain': 'To plain text (strip the formatting, keep the words)',
    'item.toMarkdown': 'To Markdown (formatted text → clean source)',
    'item.toRich': 'To rich text (Markdown → formatted for Word/WeChat)',
    'item.trim': 'Trim · collapse blank lines',
    'item.numbers': 'Strip line numbers · join into one line',
    'item.invisible': 'Remove invisible characters (zero-width, BOM)',
    'item.markdown': 'Strip Markdown syntax',
    'item.spacing': 'Space between Chinese and Latin',
    'item.fullwidth': 'Punctuation → full-width',
    'item.dedupe': 'Dedupe · sort lines',
    'item.tracking': 'Clean tracking parameters (utm_*)',
    'item.extract': 'Extract every link',
    'item.upload': 'Upload to bucket → link',
    'item.save': 'Save to Downloads',
    'bucket.title': 'Images live in your own bucket',
    'bucket.lead':
      'No official image host and no account. Point it at any S3-compatible storage and links point at your own domain — the cost and the privacy are yours.',
    'bucket.col.field': 'Field',
    'bucket.col.value': 'What goes there',
    'bucket.region': 'auto for R2, the real region for COS/OSS',
    'bucket.name': 'Bucket',
    'bucket.nameValue': 'Your bucket name',
    'bucket.public': 'Public domain',
    'bucket.publicValue': 'The domain your images are served from — the link you get back',
    'bucket.keys': 'An S3 key with write access; the secret is encrypted with the macOS Keychain',
    'bucket.note':
      'R2 is the cheapest: 10 GB free, no egress fee. Keys are content addressed, so the same screenshot twice is one object.',
    'faq.title': 'FAQ',
    'faq.q1': 'macOS says the developer cannot be verified',
    'faq.a1':
      'The dmg is ad-hoc signed, not notarised. Right-click the app in Finder → Open → Open again; or allow it under System Settings → Privacy & Security.',
    'faq.q2': 'How does it record clipboard history?',
    'faq.a2':
      'macOS has no clipboard change event, so it polls: text every 1.2 s compared by hash, images every 3 s and only when the clipboard holds no text. Side effect: when you copy two images back to back, the second may be missed.',
    'faq.q3': 'Where does the data go?',
    'faq.a3':
      'History stays in ~/Library/Application Support/bar-tool/ as an index plus image files. The only network request is the PUT to your bucket — no telemetry, no crash reporting.',
    'faq.q4': 'Does it need special permissions?',
    'faq.a4':
      'Nothing needs a permission except capture: panel, text and image handling work as-is, and Screen Recording is only requested for ⌘⇧S, which is also the only moment the overlay appears.',
    'footer.license': 'AGPL-3.0-only + commercial license',
    'footer.issue': 'Issues',
  },
};

const stored = localStorage.getItem('bar-tool-site.lang');
const initial = stored ?? (navigator.language.startsWith('zh') ? 'zh' : 'en');
let lang = initial === 'en' ? 'en' : 'zh';

function t(key, vars) {
  const template = dict[lang][key] ?? dict.zh[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

function applyLanguage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }

  document.getElementById('lang-label').textContent = lang === 'zh' ? 'EN' : '中';
  document.getElementById('lang-toggle').addEventListener('click', toggleLanguage, { once: true });
}

function toggleLanguage() {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('bar-tool-site.lang', lang);
  applyLanguage();
  loadRelease();
}

/* ---------- release ---------- */

const state = { release: null, busy: false };

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function detectArch() {
  const ua = navigator.userAgent;
  if (/arm64|aarch64/i.test(ua)) return 'arm64';
  if (navigator.userAgentData?.architecture === 'arm') return 'arm64';
  return 'x64';
}

async function loadRelease() {
  const downloads = document.getElementById('downloads');
  const versionNode = document.getElementById('version');

  try {
    const response = await fetch('/api/release');
    const payload = await response.json();

    if (!payload.ok) {
      downloads.dataset.unavailable = 'true';
      for (const button of downloads.querySelectorAll('button')) button.disabled = true;
      versionNode.textContent = t('download.unavailable');
      return;
    }

    state.release = payload.data;
    const preferred = detectArch();

    for (const button of downloads.querySelectorAll('button')) {
      const arch = button.dataset.arch;
      const file = payload.data.files[arch];
      button.disabled = !file;

      const label = t(arch === 'arm64' ? 'download.arm' : 'download.intel');
      button.querySelector('span').textContent = file
        ? `${label} · ${formatBytes(file.size)}`
        : label;

      // Highlight the build that matches this machine. Ghost and primary both
      // set a background, so exactly one of them may be on a button.
      const recommended = arch === preferred && Boolean(file);
      button.classList.toggle('btn--primary', recommended);
      button.classList.toggle('btn--ghost', !recommended);
    }

    versionNode.textContent = payload.data.version
      ? `v${payload.data.version} · ${payload.data.released_at ?? ''}`
      : '';
  } catch (error) {
    console.error('release manifest failed', error);
    versionNode.textContent = t('download.unavailable');
  }
}

/* ---------- download ---------- */

const CHUNK_MIN_SIZE = 20 * 1024 * 1024;
/** Parallel range requests: single connections get throttled, ranges add up. */
const CHUNK_COUNT = 8;
const CHUNK_RETRIES = 3;

function setProgress(loaded, total) {
  const wrap = document.getElementById('progress');
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');

  wrap.hidden = false;
  const ratio = total ? loaded / total : 0;
  bar.style.width = `${Math.min(100, Math.round(ratio * 100))}%`;
  text.textContent = total
    ? `${formatBytes(loaded)} / ${formatBytes(total)} (${Math.round(ratio * 100)}%)`
    : formatBytes(loaded);
}

async function fetchRange(url, start, end) {
  let lastError;

  for (let attempt = 0; attempt < CHUNK_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` } });
      if (response.status !== 206) throw new Error(`unexpected status ${response.status}`);

      const reader = response.body.getReader();
      const parts = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
      return new Blob(parts);
    } catch (error) {
      lastError = error;
      // Give a flaky range a moment before trying again.
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError;
}

async function downloadFile(url, size) {
  if (!size || size < CHUNK_MIN_SIZE) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`status ${response.status}`);
    return response.blob();
  }

  const chunkSize = Math.ceil(size / CHUNK_COUNT);
  const parts = new Array(CHUNK_COUNT).fill(null);
  let loaded = 0;

  await Promise.all(
    parts.map(async (_unused, index) => {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize - 1, size - 1);
      if (start > end) return;

      const blob = await fetchRange(url, start, end);
      parts[index] = blob;
      loaded += blob.size;
      setProgress(loaded, size);
    }),
  );

  return new Blob(parts);
}

function showToast(message, durationMs = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, durationMs);
}

function saveBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

async function startDownload(arch) {
  if (state.busy || !state.release) return;

  const file = state.release.files[arch];
  if (!file) return;

  state.busy = true;
  const button = document.querySelector(`[data-arch="${arch}"]`);
  const label = button.querySelector('span').textContent;
  button.disabled = true;
  button.querySelector('span').textContent = t('download.wait');

  try {
    const blob = await downloadFile(file.url, file.size);
    saveBlob(blob, file.name);
    document.getElementById('progress').hidden = true;
    button.querySelector('span').textContent = t('download.done');

    // Confirm the finished download for three seconds, then let the button settle.
    showToast(t('download.toast', { name: file.name }), 3000);

    setTimeout(() => {
      button.querySelector('span').textContent = label;
      button.disabled = false;
    }, 3000);
  } catch (error) {
    console.error('download failed', error);
    document.getElementById('progress').hidden = true;
    button.querySelector('span').textContent = t('download.failed');
    setTimeout(() => {
      button.querySelector('span').textContent = label;
      button.disabled = false;
    }, 2500);
  } finally {
    state.busy = false;
  }
}

/* ---------- boot ---------- */

applyLanguage();
loadRelease();

document.getElementById('downloads').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-arch]');
  if (button && !button.disabled) startDownload(button.dataset.arch);
});
