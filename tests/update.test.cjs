'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('isNewer compares versions numerically', async () => {
  const { isNewer } = await import('../src/update.js');
  assert.equal(isNewer('1.6.1', '1.6.2'), true);
  assert.equal(isNewer('1.6.1', '1.7.0'), true);
  assert.equal(isNewer('1.6.1', '2.0.0'), true);
  assert.equal(isNewer('1.6.1', '1.6.1'), false);
  assert.equal(isNewer('1.6.1', '1.6.0'), false);
  assert.equal(isNewer('1.10.0', '1.9.9'), false);
  assert.equal(isNewer('v1.6.1', 'v1.6.2'), true);
  assert.equal(isNewer('1.6.1', ''), false);
  assert.equal(isNewer('1.6.1', null), false);
});
