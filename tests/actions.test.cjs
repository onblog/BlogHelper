'use strict';

/**
 * Unit tests for the text actions. Run with `npm test` (node:test, no deps).
 *
 * The actions are pure functions of the clipboard text, which is exactly why
 * they live outside Electron — this file never imports Electron.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const actions = require('../electron/actions/index.cjs');
const { stripHtml, decodeEntities } = require('../electron/actions/html.cjs');

/** Run one action by id against a text-only clipboard. */
function run(id, text, html) {
  const action = actions.get(id);
  assert.ok(action, `action ${id} is registered`);
  return action.run({ kind: 'text', text, html });
}

/** Is this action offered for the given clipboard text? */
function offered(id, text, html) {
  const action = actions.get(id);
  assert.ok(action, `action ${id} is registered`);
  return !action.isAvailable || action.isAvailable({ kind: 'text', text, html });
}

test('html helpers', async (t) => {
  await t.test('stripHtml keeps the words and the block structure', () => {
    const html = '<div>第一段 <b>加粗</b>&nbsp;文字</div><p>第二段</p><ul><li>甲</li><li>乙</li></ul>';
    const text = stripHtml(html);
    assert.match(text, /第一段 加粗 文字/);
    assert.match(text, /第二段/);
    assert.match(text, /· 甲/);
    assert.ok(!text.includes('<'), 'no tags survive');
  });

  await t.test('stripHtml drops script and style bodies', () => {
    assert.equal(stripHtml('<style>p{color:red}</style><script>alert(1)</script><p>hi</p>'), 'hi');
  });

  await t.test('decodeEntities handles named and numeric entities', () => {
    assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#65; &#x42;'), 'a & b <c> A B');
  });
});

test('clean group', async (t) => {
  await t.test('plain text is only offered for rich clipboard content', () => {
    assert.equal(offered('convert.plain', 'x'), false);
    assert.equal(offered('convert.plain', 'x', '<b>x</b>'), true);
  });

  await t.test('plain text strips markup', () => {
    assert.equal(run('convert.plain', '', '<p>你好</p><p>世界</p>').text, '你好\n世界');
  });

  await t.test('trim removes trailing spaces and outer blank lines', () => {
    assert.equal(run('clean.trim', '\n\n  a  \n  b\t\n\n').text, '  a\n  b');
  });

  await t.test('collapse blank lines keeps one', () => {
    assert.equal(run('clean.blank-lines', 'a\n\n\n\nb').text, 'a\n\nb');
  });


  await t.test('join into one line removes line breaks', () => {
    assert.equal(run('clean.one-line', 'a\nb  c\n\nd').text, 'a b c d');
  });

  await t.test('strip line numbers understands the common shapes', () => {
    assert.equal(run('clean.strip-numbers', '1. 甲\n2) 乙\n3、丙').text, '甲\n乙\n丙');
  });

  await t.test('strip line numbers reports no change', () => {
    assert.equal(run('clean.strip-numbers', '甲\n乙').error, 'unchanged');
  });

  await t.test('invisible characters are only offered when present', () => {
    assert.equal(offered('clean.invisible', 'plain'), false);
    assert.equal(offered('clean.invisible', 'a\u200bb'), true);
  });

  await t.test('invisible characters are removed and nbsp becomes a space', () => {
    assert.equal(run('clean.invisible', 'a\u200bb\ufeffc\u00a0d').text, 'abc d');
  });

  await t.test('markdown stripping flattens syntax', () => {
    const markdown = '# 标题\n\n**加粗** 和 `代码`\n\n- 项目一\n- 项目二\n\n[链接](https://a.com)';
    assert.equal(run('clean.strip-markdown', markdown).text, '标题\n\n加粗 和 代码\n\n项目一\n项目二\n\n链接');
  });

  await t.test('markdown action is hidden for plain prose', () => {
    assert.equal(offered('clean.strip-markdown', '这是一段普通文字'), false);
    assert.equal(offered('clean.strip-markdown', '**加粗**'), true);
  });
});

test('typography group', async (t) => {
  await t.test('spaces appear between Chinese and Latin', () => {
    assert.equal(run('typography.cjk-spacing', '中文abc中文').text, '中文 abc 中文');
  });

  await t.test('spaces appear between Chinese and digits', () => {
    assert.equal(run('typography.cjk-spacing', '第1章').text, '第 1 章');
  });

  await t.test('already spaced text is untouched', () => {
    assert.equal(run('typography.cjk-spacing', '中文 abc 中文').error, 'unchanged');
  });

  await t.test('URLs are never split by the spacing rule', () => {
    const text = '看这个 https://example.com/a_b_c 很好';
    assert.equal(offered('typography.cjk-spacing', text), false);
  });

  await t.test('spacing is idempotent', () => {
    const once = run('typography.cjk-spacing', '中文abc中文').text;
    assert.equal(run('typography.cjk-spacing', once).error, 'unchanged');
  });

  await t.test('full-width punctuation only applies next to Chinese', () => {
    assert.equal(run('typography.fullwidth', '你好,世界!').text, '你好，世界！');
    assert.equal(offered('typography.fullwidth', '3.14 is pi, ok'), false);
  });

  await t.test('a period after Chinese becomes a full stop', () => {
    assert.equal(run('typography.fullwidth', '你好.世界').text, '你好。世界');
  });


});

test('list group', async (t) => {
  await t.test('dedupe keeps the first occurrence and its order', () => {
    assert.equal(run('list.dedupe', 'b\na\nb\nc\na').text, 'b\na\nc');
  });

  await t.test('sort is natural and locale aware', () => {
    assert.equal(run('list.sort', 'item10\nitem2\nItem1').text, 'Item1\nitem2\nitem10');
  });




});

test('link group', async (t) => {
  await t.test('tracking parameters are dropped, real ones stay', () => {
    const text = run('link.strip-tracking', 'https://a.com/x?utm_source=wx&id=3&utm_medium=share').text;
    assert.equal(text, 'https://a.com/x?id=3');
  });

  await t.test('a clean link offers no cleaning', () => {
    assert.equal(offered('link.strip-tracking', 'https://a.com/x?id=3'), false);
  });


  await t.test('links are extracted, deduped and kept in order', () => {
    const text = run('link.extract', '先看 https://a.com/x ，再看 https://b.com/y ，重复 https://a.com/x').text;
    assert.equal(text, 'https://a.com/x\nhttps://b.com/y');
  });

  await t.test('text without links offers no extraction', () => {
    assert.equal(offered('link.extract', '没有链接的一段话'), false);
  });
});

test('registry', async (t) => {
  await t.test('every action declares id, group, bilingual title and a run', () => {
    const listed = actions.listFor({ kind: 'text', text: '这是一段包含 https://a.com 的普通文字' });
    assert.ok(listed.length > 0);
    for (const item of listed) {
      assert.ok(actions.GROUP_ORDER.includes(item.group), `group ${item.group} is known`);
      assert.equal(typeof item.title.zh, 'string');
      assert.equal(typeof item.title.en, 'string');
      assert.equal(typeof actions.get(item.id).run, 'function');
    }
  });

  await t.test('image clipboard offers only image actions', () => {
    const image = { kind: 'image', width: 1, height: 1, dataUrl: 'data:', buffer: Buffer.from('x') };

    const withBucket = actions.listFor(image, { hasBucket: true }).map((action) => action.id);
    assert.deepEqual(withBucket, ['image.edit', 'image.upload', 'image.restore', 'image.save']);

    const withoutBucket = actions.listFor(image, { hasBucket: false }).map((action) => action.id);
    assert.deepEqual(withoutBucket, ['image.edit', 'image.restore', 'image.save'], 'no bucket means no upload offer');

    const none = actions.listFor(image).map((action) => action.id);
    assert.deepEqual(none, ['image.edit', 'image.restore', 'image.save']);
  });

  await t.test('empty clipboard offers nothing', () => {
    assert.deepEqual(actions.listFor({ kind: 'empty' }), []);
  });

  await t.test('a clean Chinese sentence offers the general tools only', () => {
    const ids = actions.listFor({ kind: 'text', text: '这是一句普通的话。' }).map((a) => a.id);
    assert.ok(ids.includes('clean.trim'));
    assert.ok(!ids.includes('convert.plain'), 'no rich text');
    assert.ok(!ids.includes('clean.strip-markdown'), 'not markdown');
    assert.ok(!ids.includes('link.extract'), 'no links');
    assert.ok(!ids.includes('typography.cjk-spacing'), 'nothing to space');
  });

  await t.test('mixed Chinese and English unlocks the typography group', () => {
    const ids = actions.listFor({ kind: 'text', text: '用macOS写作' }).map((a) => a.id);
    assert.ok(ids.includes('typography.cjk-spacing'));
  });
});
