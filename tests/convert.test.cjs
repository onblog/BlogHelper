'use strict';

/**
 * Format conversions: Markdown → HTML (rich clipboard) and HTML → Markdown
 * (whatever a browser or Word put on the clipboard).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { toHtml } = require('../electron/convert/markdown-to-html.cjs');
const { toMarkdown } = require('../electron/convert/html-to-markdown.cjs');
const convert = require('../electron/actions/text/convert.cjs');

const markdown = (id) => convert.actions.find((action) => action.id === id);

test('markdown → html', async (t) => {
  await t.test('headings and paragraphs', () => {
    assert.equal(toHtml('# 标题'), '<h1>标题</h1>');
    assert.equal(toHtml('### 三级'), '<h3>三级</h3>');
    assert.equal(toHtml('第一段\n第二行'), '<p>第一段<br>第二行</p>');
    assert.equal(toHtml('一\n\n二'), '<p>一</p>\n<p>二</p>');
  });

  await t.test('emphasis, code and strikethrough', () => {
    assert.equal(toHtml('**加粗** 和 *斜体*'), '<p><strong>加粗</strong> 和 <em>斜体</em></p>');
    assert.equal(toHtml('~~删除~~'), '<p><del>删除</del></p>');
    assert.equal(toHtml('用 `npm test` 跑'), '<p>用 <code>npm test</code> 跑</p>');
  });

  await t.test('code spans are not rewritten by the emphasis rules', () => {
    assert.equal(toHtml('`a * b * c`'), '<p><code>a * b * c</code></p>');
  });

  await t.test('links and images', () => {
    assert.equal(toHtml('[官网](https://a.com)'), '<p><a href="https://a.com">官网</a></p>');
    assert.equal(toHtml('![图](https://a.com/x.png)'), '<p><img src="https://a.com/x.png" alt="图"></p>');
  });

  await t.test('lists', () => {
    assert.equal(toHtml('- 甲\n- 乙'), '<ul><li>甲</li><li>乙</li></ul>');
    assert.equal(toHtml('1. 一\n2. 二'), '<ol><li>一</li><li>二</li></ol>');
  });

  await t.test('quotes, rules and fences', () => {
    assert.equal(toHtml('> 引用'), '<blockquote><p>引用</p></blockquote>');
    assert.equal(toHtml('---'), '<hr>');
    assert.equal(
      toHtml('```js\nconst a = 1;\n```'),
      '<pre><code class="language-js">const a = 1;</code></pre>',
    );
  });

  await t.test('html in the source is escaped, never executed', () => {
    assert.equal(toHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  await t.test('tables', () => {
    const html = toHtml('| 名称 | 值 |\n| --- | --- |\n| a | 1 |');
    assert.match(html, /<table><thead><tr><th>名称<\/th><th>值<\/th><\/tr><\/thead>/);
    assert.match(html, /<td>a<\/td><td>1<\/td>/);
  });
});

test('html → markdown', async (t) => {
  await t.test('a copied article comes out usable', () => {
    const html =
      '<h2>小标题</h2><p>一段<strong>重要</strong>的话，<a href="https://b.com">戳这里</a>。</p>' +
      '<ul><li>甲</li><li>乙</li></ul><ol><li>一</li><li>二</li></ol>';
    assert.equal(
      toMarkdown(html),
      '## 小标题\n\n一段**重要**的话，[戳这里](https://b.com)。\n\n- 甲\n- 乙\n\n1. 一\n2. 二',
    );
  });

  await t.test('styling is dropped, words survive', () => {
    const html = '<p style="color:red"><span style="font-size:30px">红字</span></p>';
    assert.equal(toMarkdown(html), '红字');
  });

  await t.test('script and style bodies never leak', () => {
    assert.equal(toMarkdown('<style>p{color:red}</style><script>alert(1)</script><p>hi</p>'), 'hi');
  });

  await t.test('pre blocks keep their content and language', () => {
    const html = '<pre class="language-js"><code>const a = 1;</code></pre>';
    assert.equal(toMarkdown(html), '```js\nconst a = 1;\n```');
  });

  await t.test('tables become pipe tables', () => {
    const html =
      '<table><tr><th>名称</th><th>值</th></tr><tr><td>a</td><td>1</td></tr></table>';
    assert.equal(toMarkdown(html), '| 名称 | 值 |\n| --- | --- |\n| a | 1 |');
  });

  await t.test('entities are decoded', () => {
    assert.equal(toMarkdown('<p>a &amp; b &lt;c&gt;</p>'), 'a & b <c>');
  });

  await t.test('blockquotes get the quote marker', () => {
    assert.equal(toMarkdown('<blockquote>引用一句</blockquote>'), '> 引用一句');
  });
});

test('round trip', async (t) => {
  await t.test('markdown survives html and back', () => {
    const source = [
      '# 标题',
      '',
      '这是**加粗**和*斜体*，还有`代码`。',
      '',
      '- 甲',
      '- 乙',
      '',
      '1. 一',
      '2. 二',
      '',
      '> 引用一句',
      '',
      '[链接](https://a.com)',
      '',
      '```js',
      'const a = 1;',
      '```',
    ].join('\n');

    assert.equal(toMarkdown(toHtml(source)), source);
  });
});

test('convert actions', async (t) => {
  await t.test('rich clipboard unlocks plain and markdown', () => {
    const rich = { kind: 'text', text: '标题', html: '<h1>标题</h1>' };
    assert.equal(markdown('convert.plain').isAvailable(rich), true);
    assert.equal(markdown('convert.markdown').isAvailable(rich), true);
    assert.equal(markdown('convert.plain').isAvailable({ kind: 'text', text: '标题' }), false);
  });

  await t.test('markdown text unlocks rich text', () => {
    const action = markdown('convert.richtext');
    assert.equal(action.isAvailable({ kind: 'text', text: '# 标题' }), true);
    assert.equal(action.isAvailable({ kind: 'text', text: '- 甲\n- 乙' }), true);
    assert.equal(action.isAvailable({ kind: 'text', text: '只是一句话，没有标记' }), false);
  });

  await t.test('rich text returns both flavours', () => {
    const result = markdown('convert.richtext').run({ kind: 'text', text: '# 标题' });
    assert.equal(result.text, '# 标题');
    assert.equal(result.html, '<h1>标题</h1>');
    assert.equal(result.toast, 'convert.richDone');
  });

  await t.test('markdown conversion reports the source text', () => {
    const result = markdown('convert.markdown').run({ kind: 'text', text: '', html: '<h2>小</h2>' });
    assert.equal(result.text, '## 小');
  });
});
