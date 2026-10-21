'use strict';

/**
 * Bucket configuration tests. Encryption is faked with a prefix so the tests can
 * prove the secret never lands in the file in plain text.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { BucketStore } = require('../electron/storage.cjs');
const { formatLink } = require('../electron/link-format.cjs');

const encrypt = (value) => `enc:${value}`;
const decrypt = (value) => value.replace(/^enc:/, '');

async function tempStore(overrides = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bar-tool-buckets-'));
  const file = path.join(dir, 'buckets.json');
  const store = await new BucketStore({ file, encrypt, decrypt, ...overrides }).init();
  return { store, file };
}

const valid = {
  name: '我的 R2',
  endpoint: 'https://acc.r2.cloudflarestorage.com',
  region: 'auto',
  bucket: 'bar-tool',
  publicBase: 'https://img.example.com/',
  accessKey: 'AK',
  secret: 'SK',
};

test('bucket validation', async (t) => {
  await t.test('rejects a malformed endpoint', async () => {
    const { store } = await tempStore();
    const result = await store.save({ ...valid, endpoint: 'not a url' });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid_endpoint');
  });

  await t.test('rejects plain http', async () => {
    const { store } = await tempStore();
    const result = await store.save({ ...valid, endpoint: 'http://example.com' });
    assert.equal(result.error, 'insecure_endpoint');
  });

  await t.test('requires a bucket name, access key and secret', async () => {
    const { store } = await tempStore();
    assert.equal((await store.save({ ...valid, bucket: '' })).error, 'missing_bucket');
    assert.equal((await store.save({ ...valid, accessKey: '' })).error, 'missing_access_key');
    assert.equal((await store.save({ ...valid, secret: '' })).error, 'missing_secret');
  });

  await t.test('reports a broken keychain instead of storing plain text', async () => {
    const { store } = await tempStore({
      encrypt: () => {
        throw new Error('keychain locked');
      },
    });
    assert.equal((await store.save(valid)).error, 'encryption_unavailable');
  });
});

test('bucket store', async (t) => {
  await t.test('saves, normalises and activates the first bucket', async () => {
    const { store } = await tempStore();
    const saved = await store.save(valid);
    assert.equal(saved.ok, true);

    const [bucket] = store.list();
    assert.equal(bucket.active, true);
    assert.equal(bucket.name, '我的 R2');
    assert.equal(bucket.publicBase, 'https://img.example.com', 'trailing slash trimmed');
    assert.equal(bucket.hasSecret, true);
    assert.equal(bucket.secret, undefined, 'list() never leaks the secret');
  });

  await t.test('the file holds the encrypted secret, never the plain one', async () => {
    const { store, file } = await tempStore();
    await store.save(valid);

    const raw = await fs.readFile(file, 'utf8');
    assert.match(raw, /enc:SK/);
    assert.ok(!raw.includes('"secret":"SK"'), 'plain secret is not stored');
  });

  await t.test('active() decrypts for signing', async () => {
    const { store } = await tempStore();
    await store.save(valid);
    assert.equal(store.active().secret, 'SK');
    assert.equal(store.active().bucketName, 'bar-tool');
  });

  await t.test('editing without retyping the secret keeps the stored one', async () => {
    const { store, file } = await tempStore();
    const { id } = await store.save(valid);

    await store.save({ ...valid, id, secret: '', name: '改名了' });

    assert.equal(store.active().secret, 'SK');
    assert.equal(store.list()[0].name, '改名了');

    const raw = await fs.readFile(file, 'utf8');
    assert.match(raw, /enc:SK/);
  });

  await t.test('pathStyle defaults on and can be turned off', async () => {
    const { store } = await tempStore();
    await store.save(valid);
    assert.equal(store.list()[0].pathStyle, true);

    await store.save({ ...valid, id: store.list()[0].id, pathStyle: false });
    assert.equal(store.list()[0].pathStyle, false);
  });

  await t.test('removing the active bucket promotes the next one', async () => {
    const { store } = await tempStore();
    const first = await store.save(valid);
    const second = await store.save({ ...valid, bucket: 'backup' });

    await store.remove(first.id);

    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0].id, second.id);
    assert.equal(store.list()[0].active, true);
  });

  await t.test('switching the active bucket persists across a restart', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bar-tool-buckets-'));
    const file = path.join(dir, 'buckets.json');

    const store = await new BucketStore({ file, encrypt, decrypt }).init();
    const first = await store.save(valid);
    await store.save({ ...valid, bucket: 'backup' });
    await store.setActive(first.id);

    const reopened = await new BucketStore({ file, encrypt, decrypt }).init();
    assert.equal(reopened.active().bucketName, 'bar-tool');
    assert.equal(reopened.hasActive(), true);
  });

  await t.test('a corrupt file starts empty', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bar-tool-buckets-'));
    const file = path.join(dir, 'buckets.json');
    await fs.writeFile(file, 'nope');

    const store = await new BucketStore({ file, encrypt, decrypt }).init();
    assert.equal(store.list().length, 0);
    assert.equal(store.hasActive(), false);
    assert.equal(store.active(), null);
  });
});

test('link formats', async (t) => {
  await t.test('each format wraps the url differently', () => {
    assert.equal(formatLink('https://a.com/x.png', 'url'), 'https://a.com/x.png');
    assert.equal(formatLink('https://a.com/x.png', 'markdown'), '![](https://a.com/x.png)');
    assert.equal(formatLink('https://a.com/x.png', 'html'), '<img src="https://a.com/x.png">');
    assert.equal(formatLink('https://a.com/x.png', 'bbcode'), '[img]https://a.com/x.png[/img]');
    assert.equal(formatLink('https://a.com/x.png', 'unknown'), 'https://a.com/x.png');
  });
});

test('image actions', async (t) => {
  const imageActions = require('../electron/actions/image.cjs');
  const upload = imageActions.find((action) => action.id === 'image.upload');
  const save = imageActions.find((action) => action.id === 'image.save');
  const input = { kind: 'image', buffer: Buffer.from('x'), mime: 'image/png' };

  await t.test('upload is hidden without a bucket', () => {
    assert.equal(upload.isAvailable(input, { hasBucket: false }), false);
    assert.equal(upload.isAvailable(input, { hasBucket: true }), true);
    assert.equal(upload.isAvailable(input), false);
  });

  await t.test('upload writes the link in the configured format', async () => {
    const result = await upload.run(input, {
      hasBucket: true,
      linkFormat: 'markdown',
      upload: async () => ({ ok: true, url: 'https://img/a.png' }),
    });
    assert.equal(result.text, '![](https://img/a.png)');
  });

  await t.test('a failed upload surfaces the error code', async () => {
    const result = await upload.run(input, {
      hasBucket: true,
      linkFormat: 'url',
      upload: async () => ({ ok: false, error: 'upload_failed' }),
    });
    assert.equal(result.error, 'upload_failed');
  });

  await t.test('save writes the file path to the clipboard', async () => {
    const result = await save.run(input, { saveFile: async () => '/Users/me/Downloads/a.png' });
    assert.equal(result.text, '/Users/me/Downloads/a.png');
  });
});
