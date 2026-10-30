'use strict';

/**
 * Tests for the history store, the settings file and the clipboard watcher.
 * None of these modules import Electron, so a temp directory and a fake clock
 * are all it takes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { HistoryStore, snippet } = require('../electron/history.cjs');
const { SettingsStore, DEFAULTS } = require('../electron/settings.cjs');
const { ClipboardWatcher } = require('../electron/watcher.cjs');

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'bar-tool-test-'));
}

function pngBuffer(fill = 0x41, size = 16) {
  return Buffer.alloc(size, fill);
}

test('history store', async (t) => {
  await t.test('stores text and lists a snippet, newest first', async () => {
    const dir = await tempDir();
    let clock = 1_000;
    const store = await new HistoryStore({ dir, now: () => (clock += 1000) }).init();

    await store.addText('第一条');
    await store.addText('第二条 ' + 'x'.repeat(300));

    const list = store.list();
    assert.equal(list.length, 2);
    assert.equal(list[0].kind, 'text');
    assert.ok(list[0].snippet.startsWith('第二条'));
    assert.ok(list[0].snippet.length <= 120, 'snippet is truncated');
    assert.equal(store.stats().count, 2);
  });

  await t.test('re-copying the same text moves it to the front instead of duplicating', async () => {
    const dir = await tempDir();
    let clock = 1_000;
    const store = await new HistoryStore({ dir, now: () => (clock += 1000) }).init();

    await store.addText('甲');
    await store.addText('乙');
    await store.addText('甲');

    const list = store.list();
    assert.equal(list.length, 2);
    assert.equal(list[0].snippet, '甲');
  });

  await t.test('remove drops one entry, its blobs, and survives a reload', async () => {
    const dir = await tempDir();
    let clock = 1_000;
    const store = await new HistoryStore({ dir, now: () => (clock += 1000) }).init();

    await store.addImage({ buffer: pngBuffer(0x47), thumb: pngBuffer(0x48, 8) });
    await store.addText('留下的');

    const doomed = store.list().find((entry) => entry.kind === 'image');
    assert.equal(await store.remove(doomed.id), true);

    assert.equal(store.find(doomed.id), null);
    assert.equal(store.stats().count, 1);
    assert.deepEqual(await fs.readdir(path.join(dir, 'blobs')), [], 'blobs are gone');

    const reopened = await new HistoryStore({ dir }).init();
    assert.equal(reopened.list().length, 1);
    assert.equal(reopened.list()[0].snippet, '留下的');
    assert.equal(await reopened.remove(doomed.id), false, 'unknown ids are a no-op');
  });

  await t.test('blank text is not recorded', async () => {
    const store = await new HistoryStore({ dir: await tempDir() }).init();
    assert.equal(await store.addText('   \n  '), null);
    assert.equal(store.stats().count, 0);
  });

  await t.test('images are written to disk with a thumbnail and read back', async () => {
    const store = await new HistoryStore({ dir: await tempDir() }).init();
    const buffer = pngBuffer(0x42, 64);
    const thumb = pngBuffer(0x43, 8);

    await store.addImage({ buffer, thumb, width: 1024, height: 768, mime: 'image/png' });

    const [item] = store.list();
    assert.equal(item.kind, 'image');
    assert.equal(item.width, 1024);
    assert.ok(item.thumbFile, 'thumbnail file recorded');

    const payload = await store.read(item.id);
    assert.equal(payload.kind, 'image');
    assert.deepEqual(payload.buffer, buffer);

    const thumbBack = await store.readThumb(item.id);
    assert.deepEqual(thumbBack, thumb);
  });

  await t.test('maxItems trims the oldest entries', async () => {
    const dir = await tempDir();
    let clock = 1_000;
    const store = await new HistoryStore({ dir, maxItems: 2, now: () => (clock += 1000) }).init();

    await store.addText('一');
    await store.addText('二');
    await store.addText('三');

    const list = store.list();
    assert.equal(list.length, 2);
    assert.deepEqual(
      list.map((item) => item.snippet),
      ['三', '二'],
    );
  });

  await t.test('maxBytes drops image blobs and their files', async () => {
    const dir = await tempDir();
    let clock = 1_000;
    const store = await new HistoryStore({
      dir,
      maxBytes: 1000,
      now: () => (clock += 1000),
    }).init();

    await store.addImage({ buffer: pngBuffer(0x44, 600) });
    const firstId = store.list()[0].id;
    await store.addImage({ buffer: pngBuffer(0x45, 600) });

    assert.equal(store.list().length, 1);
    assert.equal(store.find(firstId), null);
    const left = await fs.readdir(path.join(dir, 'blobs'));
    assert.equal(left.length, 1, 'the dropped image lost its blob');
  });

  await t.test('clear empties the index and the blob directory', async () => {
    const dir = await tempDir();
    const store = await new HistoryStore({ dir }).init();
    await store.addImage({ buffer: pngBuffer() });

    await store.clear();

    assert.equal(store.stats().count, 0);
    assert.deepEqual(await fs.readdir(path.join(dir, 'blobs')), []);
  });

  await t.test('sweep removes blobs without an index entry', async () => {
    const dir = await tempDir();
    const store = await new HistoryStore({ dir }).init();
    await store.addImage({ buffer: pngBuffer(0x46) });

    await fs.writeFile(path.join(dir, 'blobs', 'orphan.png'), pngBuffer());

    assert.equal(await store.sweep(), 1);
    const left = await fs.readdir(path.join(dir, 'blobs'));
    assert.equal(left.length, 1);
  });

  await t.test('state survives a restart', async () => {
    const dir = await tempDir();
    const first = await new HistoryStore({ dir }).init();
    await first.addText('持久化');

    const second = await new HistoryStore({ dir }).init();
    assert.equal(second.stats().count, 1);
    assert.equal(second.list()[0].snippet, '持久化');
  });

  await t.test('a corrupt index file is treated as empty', async () => {
    const dir = await tempDir();
    await fs.mkdir(path.join(dir, 'blobs'), { recursive: true });
    await fs.writeFile(path.join(dir, 'index.json'), '{not json');

    const store = await new HistoryStore({ dir }).init();
    assert.equal(store.stats().count, 0);
  });

  await t.test('snippet flattens whitespace', () => {
    assert.equal(snippet('  第一行\n第二行  '), '第一行 第二行');
  });
});

test('settings store', async (t) => {
  await t.test('starts from defaults', async () => {
    const store = await new SettingsStore({ file: path.join(await tempDir(), 's.json') }).init();
    assert.deepEqual(store.get(), DEFAULTS);
  });

  await t.test('updates persist and are validated', async () => {
    const file = path.join(await tempDir(), 's.json');
    const store = await new SettingsStore({ file }).init();

    await store.update({ historyEnabled: false, maxItems: 50 });
    await store.update({ maxItems: 7, launchAtLogin: true });

    const reopened = await new SettingsStore({ file }).init();
    assert.equal(reopened.get().historyEnabled, false);
    assert.equal(reopened.get().maxItems, 50, 'an unsupported limit is ignored');
    assert.equal(reopened.get().launchAtLogin, true);
  });
});

test('clipboard watcher', async (t) => {
  function harness(options = {}) {
    const state = {
      text: '',
      hasImage: false,
      image: pngBuffer(0x47, 32),
      items: [],
      clock: 10_000,
    };

    const watcher = new ClipboardWatcher({
      readText: async () => state.text,
      hasImage: async () => state.hasImage,
      readImage: async () => ({ buffer: state.image, mime: 'image/png' }),
      onItem: (item) => state.items.push(item),
      now: () => state.clock,
      ...options,
    });

    return { state, watcher };
  }

  await t.test('records each distinct text once', async () => {
    const { state, watcher } = harness();

    state.text = '甲';
    await watcher.tick();
    await watcher.tick();
    state.text = '乙';
    await watcher.tick();

    assert.equal(state.items.length, 2);
    assert.equal(state.items[1].text, '乙');
  });

  await t.test('ignores blank text', async () => {
    const { state, watcher } = harness();
    state.text = '   ';
    await watcher.tick();
    assert.equal(state.items.length, 0);
  });

  await t.test('our own write is not recorded as a new entry', async () => {
    const { state, watcher } = harness();

    watcher.expectText('由动作写入');
    state.text = '由动作写入';
    await watcher.tick();

    assert.equal(state.items.length, 0);

    state.text = '用户自己复制的';
    await watcher.tick();
    assert.equal(state.items.length, 1);
  });

  await t.test('a restored image is not recorded again', async () => {
    const { state, watcher } = harness();

    state.hasImage = true;
    await watcher.tick();
    assert.equal(state.items.length, 1);

    // Restoring re-encodes the pixels, so the hash never matches; the flag does.
    watcher.skipNextImage();
    state.image = pngBuffer(0x49, 32);
    state.clock += 4000;
    await watcher.tick();
    assert.equal(state.items.length, 1, 'skip applied');

    state.image = pngBuffer(0x4a, 32);
    state.clock += 4000;
    await watcher.tick();
    assert.equal(state.items.length, 2, 'sampling resumes afterwards');
  });

  await t.test('images are sampled on the slower cadence', async () => {
    const { state, watcher } = harness();

    state.hasImage = true;
    await watcher.tick(); // first check
    assert.equal(state.items.length, 1);

    state.image = pngBuffer(0x48, 32);
    state.clock += 1000;
    await watcher.tick(); // inside the image interval
    assert.equal(state.items.length, 1, 'not sampled yet');

    state.clock += 4000;
    await watcher.tick();
    assert.equal(state.items.length, 2, 'sampled after the interval');
  });
});
