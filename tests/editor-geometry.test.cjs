'use strict';

/**
 * The image editor's geometry, tested without a DOM.
 *
 * Crop and mosaic are the two operations where a rounding slip shows up as a
 * shifted annotation or a mosaic rectangle in the wrong place, so the maths is
 * kept pure and pinned here.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

test('image editor geometry', async (t) => {
  const { fitScale, cropBox, mosaicBlock, shiftForCrop } = await import('../src/editor-geometry.js');

  await t.test('fit never upscales and keeps the aspect ratio', () => {
    assert.equal(fitScale(1024, 1024, 680, 498), 498 / 1024);
    assert.equal(fitScale(400, 300, 680, 498), 1, 'small images stay at 100%');
    assert.equal(fitScale(0, 0, 680, 498), 1, 'degenerate input does not divide by zero');
  });

  await t.test('crop converts canvas space back to source pixels', () => {
    const box = { left: 100, top: 50, width: 200, height: 100 };
    const source = cropBox(box, 0.5, 1024, 1024);
    assert.deepEqual(source, { left: 200, top: 100, width: 400, height: 200 });
  });

  await t.test('crop clamps a selection that runs off the image', () => {
    const source = cropBox({ left: 900, top: -20, width: 500, height: 60 }, 1, 1024, 1024);
    assert.equal(source.left, 900);
    assert.equal(source.top, 0);
    assert.equal(source.width, 124);
    assert.equal(source.height, 60);
  });

  await t.test('crop never returns an empty box', () => {
    const source = cropBox({ left: 0, top: 0, width: 0, height: 0 }, 1, 1024, 1024);
    assert.ok(source.width >= 1 && source.height >= 1);
  });

  await t.test('mosaic blocks scale with the region but stay bounded', () => {
    assert.equal(mosaicBlock(1200, 800), 33);
    assert.equal(mosaicBlock(60, 60), 6, 'never smaller than 6');
    assert.equal(mosaicBlock(4000, 3000), 48, 'never larger than 48');
  });

  await t.test('annotations move with the crop', () => {
    const moved = shiftForCrop(300, 200, 100, 50, 2);
    assert.deepEqual(moved, { left: 400, top: 300 });
  });
});
