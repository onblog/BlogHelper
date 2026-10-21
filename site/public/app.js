/**
 * Site behaviour: bilingual copy, the release manifest, and a chunked dmg
 * download with a progress bar (single connections are throttled often enough
 * that parallel ranges are worth the extra code).
 */

const dict = {
  zh: {
    brand: '吧台',
    'nav.actions': '动作',
    'nav.bucket': '图床',
    'nav.faq': '常见问题',
    'hero.title': '吧台',
    'hero.tagline': '把剪贴板里乱糟糟的内容，变成你下一步要用的样子',
    'hero.desc':
      '截个图、复制一段网页、抄一列名单——点一下菜单栏，清理干净、排好版、整理成能直接粘的样子。图片就传进你自己的图床。',
    'hero.meta': 'macOS 12+ · 首次打开需右键 → 打开 · 不收集任何数据',
    'download.arm': '下载 Apple Silicon 版',
    'download.intel': 'Intel 版',
    'download.wait': '正在准备下载…',
    'download.done': '已开始下载',
    'download.failed': '下载失败，请到 GitHub 反馈',
    'download.unavailable': '安装包还在上传，稍后再来',
    'shots.main': '剪贴板里是什么，就列出能变成什么',
    'shots.history': '最近复制过的东西，点一下就回去',
    'shots.settings': '历史、图床、开机启动，都在设置里',
    'actions.title': '21 个动作，五个分组',
    'actions.lead':
      '面板不会把所有功能都摊在你脸上：剪贴板是图片就只出图片动作，是普通文字就不会出现「转纯文本」。',
    'group.clean': '清理',
    'group.typography': '中文排版',
    'group.list': '列表整理',
    'group.link': '链接',
    'group.image': '图片',
    'item.plain': '转纯文本（剥掉网页样式）',
    'item.trim': '去首尾空白 · 合并空行 · 删掉空行',
    'item.numbers': '去掉行号 · 压成一行',
    'item.invisible': '清除隐形字符（零宽、BOM）',
    'item.markdown': '去掉 Markdown 标记',
    'item.spacing': '中英文之间自动加空格',
    'item.fullwidth': '标点转全角',
    'item.halfwidth': '标点转半角',
    'item.dedupe': '去重行 · 排序行 · 反转行序',
    'item.number': '加序号',
    'item.commas': '合并成逗号分隔',
    'item.tracking': '净化链接（去掉 utm_* 跟踪参数）',
    'item.decode': '链接里的 %20 解码',
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
      '不需要辅助功能，也不需要屏幕录制。全局快捷键是 ⌥⌘V，如果和其他 App 冲突，直接点菜单栏图标也一样。',
    'footer.license': 'AGPL-3.0-only + 商业授权',
    'footer.issue': '反馈',
  },
  en: {
    brand: 'bar-tool',
    'nav.actions': 'Actions',
    'nav.bucket': 'Image host',
    'nav.faq': 'FAQ',
    'hero.title': 'bar-tool',
    'hero.tagline': 'Turn whatever is on your clipboard into what you need next',
    'hero.desc':
      'A screenshot, a pasted paragraph, a column of names — click the menu bar and it comes back cleaned, spaced, tidied, ready to paste. Images go to your own bucket.',
    'hero.meta': 'macOS 12+ · right-click to open the first time · no data collected',
    'download.arm': 'Download for Apple Silicon',
    'download.intel': 'Intel build',
    'download.wait': 'Preparing the download…',
    'download.done': 'Download started',
    'download.failed': 'Download failed — please open an issue on GitHub',
    'download.unavailable': 'The build is still uploading, check back soon',
    'shots.main': 'What is on the clipboard decides what the panel offers',
    'shots.history': 'Everything you copied recently, one click away',
    'shots.settings': 'History, bucket and launch-at-login live in settings',
    'actions.title': '21 actions, five groups',
    'actions.lead':
      'The panel never dumps everything on you: an image only shows image actions, plain prose never offers "To plain text".',
    'group.clean': 'Clean up',
    'group.typography': 'Typography',
    'group.list': 'Lists',
    'group.link': 'Links',
    'group.image': 'Image',
    'item.plain': 'To plain text (strips web styling)',
    'item.trim': 'Trim · collapse · remove blank lines',
    'item.numbers': 'Strip line numbers · join into one line',
    'item.invisible': 'Remove invisible characters (zero-width, BOM)',
    'item.markdown': 'Strip Markdown syntax',
    'item.spacing': 'Space between Chinese and Latin',
    'item.fullwidth': 'Punctuation → full-width',
    'item.halfwidth': 'Punctuation → half-width',
    'item.dedupe': 'Dedupe · sort · reverse lines',
    'item.number': 'Number the lines',
    'item.commas': 'Join into a comma list',
    'item.tracking': 'Clean tracking parameters (utm_*)',
    'item.decode': 'Decode %20 in links',
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
      'No Accessibility and no Screen Recording. The global shortcut is ⌥⌘V; if it clashes with another app, the menu bar icon does the same thing.',
    'footer.license': 'AGPL-3.0-only + commercial license',
    'footer.issue': 'Issues',
  },
};

const stored = localStorage.getItem('bar-tool-site.lang');
const initial = stored ?? (navigator.language.startsWith('zh') ? 'zh' : 'en');
let lang = initial === 'en' ? 'en' : 'zh';

const t = (key) => dict[lang][key] ?? dict.zh[key] ?? key;

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

      if (arch === preferred && file) button.classList.add('btn--primary');
      else if (arch !== preferred) button.classList.remove('btn--primary');
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
const CHUNK_COUNT = 6;

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
    setTimeout(() => {
      button.querySelector('span').textContent = label;
      button.disabled = false;
    }, 2500);
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
