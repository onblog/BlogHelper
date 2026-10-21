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
const { stripHtml, decodeEntities, escapeHtml } = require('../electron/actions/html.cjs');

/** Run one action by id against a text-only clipboard. */
function run(id, text, html) {
  const action = actions.get(id);
  assert.ok(action, `action ${id} is registered`);
  return action.run({ kind: 'text', text, html });
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
    const text = stripHtml('<style>p{color:red}</style><script>alert(1)</script><p>hi</p>');
    assert.equal(text, 'hi');
  });

  await t.test('decodeEntities handles named and numeric entities', () => {
    assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#65; &#x42;'), 'a & b <c> A B');
    assert.equal(decodeEntities('&unknown;'), '&unknown;');
  });

  await t.test('escapeHtml is the inverse on the usual suspects', () => {
    assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    assert.equal(decodeEntities(escapeHtml('<a href="x">&\'</a>')), '<a href="x">&\'</a>');
  });
});

test('clean group', async (t) => {
  await t.test('plain text is only offered for rich clipboard content', () => {
    const action = actions.get('clean.plain');
    assert.equal(action.isAvailable({ kind: 'text', text: 'x' }), false);
    assert.equal(action.isAvailable({ kind: 'text', text: 'x', html: '<b>x</b>' }), true);
  });

  await t.test('plain text strips markup', () => {
    assert.equal(run('clean.plain', '', '<p>你好</p><p>世界</p>').text, '你好\n世界');
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
});

test('case group', async (t) => {
  await t.test('uppercase and lowercase', () => {
    assert.equal(run('case.upper', 'abc').text, 'ABC');
    assert.equal(run('case.lower', 'ABC').text, 'abc');
  });

  await t.test('snake case splits camel and acronym boundaries', () => {
    assert.equal(run('case.snake', 'userID').text, 'user_id');
    assert.equal(run('case.snake', 'HTTPServerName').text, 'http_server_name');
  });

  await t.test('camel case from mixed input', () => {
    assert.equal(run('case.camel', 'user_name-id').text, 'userNameId');
    assert.equal(run('case.camel', 'User Name').text, 'userName');
  });

  await t.test('kebab and constant case', () => {
    assert.equal(run('case.kebab', 'UserName').text, 'user-name');
    assert.equal(run('case.constant', 'user name').text, 'USER_NAME');
  });

  await t.test('title case per line keeps the line structure', () => {
    assert.equal(run('case.title', 'hello world\nfoo_bar').text, 'Hello World\nFoo Bar');
  });

  await t.test('already converted text reports no change', () => {
    assert.equal(run('case.upper', 'ABC').error, 'unchanged');
  });
});

test('codec group', async (t) => {
  await t.test('base64 round trip', () => {
    const encoded = run('codec.base64-encode', '你好 bar').text;
    assert.equal(encoded, Buffer.from('你好 bar', 'utf8').toString('base64'));
    assert.equal(run('codec.base64-decode', encoded).text, '你好 bar');
  });

  await t.test('base64 decode is only offered for real base64', () => {
    const action = actions.get('codec.base64-decode');
    assert.equal(action.isAvailable({ kind: 'text', text: 'not base64 !!' }), false);
    assert.equal(action.isAvailable({ kind: 'text', text: 'aGVsbG8=' }), true);
  });

  await t.test('url encode and decode', () => {
    const encoded = run('codec.url-encode', 'a b&c=中').text;
    assert.equal(encoded, 'a%20b%26c%3D%E4%B8%AD');
    assert.equal(run('codec.url-decode', encoded).text, 'a b&c=中');
  });

  await t.test('broken percent-encoding returns an error, not a crash', () => {
    assert.equal(run('codec.url-decode', '100%').error, 'invalid_url_encoding');
  });
});

test('json group', async (t) => {
  await t.test('beautify and minify', () => {
    assert.equal(run('data.json-beautify', '{"a":1,"b":[2]}').text, '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}');
    assert.equal(run('data.json-minify', '{\n  "a": 1\n}').text, '{"a":1}');
  });

  await t.test('sort keys is recursive', () => {
    const text = run('data.json-sort-keys', '{"b":1,"a":{"d":2,"c":3}}').text;
    assert.equal(text, '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}');
  });

  await t.test('invalid json is hidden from the panel', () => {
    const action = actions.get('data.json-beautify');
    assert.equal(action.isAvailable({ kind: 'text', text: '{oops' }), false);
    assert.equal(action.isAvailable({ kind: 'text', text: '{"a":1}' }), true);
  });
});

test('lines group', async (t) => {
  await t.test('dedupe keeps the first occurrence and its order', () => {
    assert.equal(run('lines.dedupe', 'b\na\nb\nc\na').text, 'b\na\nc');
  });

  await t.test('sort is natural and locale aware', () => {
    assert.equal(run('lines.sort', 'item10\nitem2\nItem1').text, 'Item1\nitem2\nitem10');
  });

  await t.test('already clean lines report no change', () => {
    assert.equal(run('lines.dedupe', 'a\nb').error, 'unchanged');
  });
});

test('time group', async (t) => {
  await t.test('seconds and milliseconds both convert', () => {
    const seconds = run('time.to-date', '1700000000').text;
    assert.match(seconds, /^2023-11-1[45] \d{2}:13:20 \(/);
    const millis = run('time.to-date', '1700000000000').text;
    assert.equal(millis, seconds);
  });

  await t.test('timestamp action is only offered for digits', () => {
    const action = actions.get('time.to-date');
    assert.equal(action.isAvailable({ kind: 'text', text: '1700000000' }), true);
    assert.equal(action.isAvailable({ kind: 'text', text: 'yesterday' }), false);
  });

  await t.test('date to timestamp is the inverse', () => {
    const seconds = run('time.to-timestamp', '2023-11-14 22:13:20').text;
    assert.equal(typeof seconds, 'string');
    assert.match(seconds, /^\d{10}$/);
  });

  await t.test('prose is not treated as a date', () => {
    const action = actions.get('time.to-timestamp');
    assert.equal(action.isAvailable({ kind: 'text', text: '这是一句话，不是日期' }), false);
  });
});

test('registry', async (t) => {
  await t.test('every action has the required shape', () => {
    for (const id of ['clean.plain', 'case.upper', 'codec.url-encode', 'data.json-beautify']) {
      const action = actions.get(id);
      assert.ok(action, id);
      assert.equal(typeof action.run, 'function');
      assert.equal(typeof action.title.zh, 'string');
      assert.equal(typeof action.title.en, 'string');
      assert.ok(action.accepts.includes('text'));
    }
  });

  await t.test('image clipboard offers no text actions', () => {
    const listed = actions.listFor({ kind: 'image', width: 1, height: 1, dataUrl: 'data:,' });
    assert.equal(listed.length, 0);
  });

  await t.test('empty clipboard offers nothing', () => {
    assert.deepEqual(actions.listFor({ kind: 'empty' }), []);
  });

  await t.test('plain text hides the actions that do not apply', () => {
    const ids = actions
      .listFor({ kind: 'text', text: 'plain sentence' })
      .map((action) => action.id);
    assert.ok(!ids.includes('clean.plain'), 'no rich text, no plain-text action');
    assert.ok(!ids.includes('data.json-beautify'), 'not json');
    assert.ok(ids.includes('case.upper'));
    assert.ok(ids.includes('clean.trim'));
  });

  await t.test('json text unlocks the json actions', () => {
    const ids = actions
      .listFor({ kind: 'text', text: '{"a":1}' })
      .map((action) => action.id);
    assert.ok(ids.includes('data.json-beautify'));
    assert.ok(ids.includes('data.json-minify'));
  });
});
