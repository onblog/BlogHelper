'use strict';

/**
 * SigV4 conformance and S3 request-shape tests.
 *
 * The first case is AWS's published `get-vanilla` vector. It is the reason this
 * file exists: a signing bug would only surface as a 403 from a real bucket,
 * which is a terrible way to find out.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const sigv4 = require('../electron/sigv4.cjs');

const AK = 'AKIDEXAMPLE';
const SK = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';
const DATE = '20150830T123600Z';

test('AWS conformance vector', async (t) => {
  await t.test('get-vanilla produces the published signature', () => {
    const result = sigv4.sign({
      method: 'GET',
      host: 'example.amazonaws.com',
      path: '/',
      headers: { host: 'example.amazonaws.com', 'x-amz-date': DATE },
      payloadHash: sigv4.EMPTY_PAYLOAD_HASH,
      region: 'us-east-1',
      service: 'service',
      accessKey: AK,
      secretKey: SK,
      amzDate: DATE,
    });

    assert.equal(result.scope, '20150830/us-east-1/service/aws4_request');
    assert.equal(result.signedHeaders, 'host;x-amz-date');
    assert.equal(
      result.authorization,
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
        'SignedHeaders=host;x-amz-date, ' +
        'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
  });

  await t.test('the empty payload hash is the sha256 of nothing', () => {
    assert.equal(
      sigv4.EMPTY_PAYLOAD_HASH,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

test('canonical building blocks', async (t) => {
  await t.test('uriEncode follows RFC 3986', () => {
    assert.equal(sigv4.uriEncode('a b'), 'a%20b');
    assert.equal(sigv4.uriEncode('a/b'), 'a%2Fb');
    assert.equal(sigv4.uriEncode('a/b', false), 'a/b');
    assert.equal(sigv4.uriEncode('中文'), '%E4%B8%AD%E6%96%87');
    assert.equal(sigv4.uriEncode('~_-.'), '~_-.');
    assert.equal(sigv4.uriEncode('*'), '%2A');
  });

  await t.test('object keys keep their slashes', () => {
    assert.equal(sigv4.encodeKey('images/2026/10/abc.png'), 'images/2026/10/abc.png');
    assert.equal(sigv4.encodeKey('images/我的 图.png'), 'images/%E6%88%91%E7%9A%84%20%E5%9B%BE.png');
  });

  await t.test('query strings are sorted and encoded', () => {
    assert.equal(sigv4.canonicalQuery({ b: '2', a: '1' }), 'a=1&b=2');
    assert.equal(sigv4.canonicalQuery({ list: ['b', 'a'] }), 'list=a&list=b');
    assert.equal(sigv4.canonicalQuery({}), '');
    assert.equal(sigv4.canonicalQuery(), '');
  });

  await t.test('amz date format matches the spec', () => {
    assert.equal(sigv4.amzDate(new Date('2015-08-30T12:36:00.000Z')), '20150830T123600Z');
  });
});

test('S3 put requests', async (t) => {
  function fakeFetch(responder = () => ({ ok: true, status: 200 })) {
    const calls = [];
    const impl = async (url, init) => {
      calls.push({ url, init });
      return responder(url, init);
    };
    return { calls, impl };
  }

  const body = Buffer.from('hello');

  await t.test('path-style points at endpoint/bucket/key', async () => {
    const { calls, impl } = fakeFetch();
    const result = await sigv4.putObject({
      endpoint: 'https://acc.r2.cloudflarestorage.com',
      bucket: 'bar-tool',
      key: 'images/2026/10/abc.png',
      body,
      contentType: 'image/png',
      accessKey: AK,
      secretKey: SK,
      fetchImpl: impl,
      now: new Date('2026-10-21T08:00:00Z'),
    });

    assert.equal(result.ok, true);
    assert.equal(calls[0].url, 'https://acc.r2.cloudflarestorage.com/bar-tool/images/2026/10/abc.png');
    assert.equal(calls[0].init.method, 'PUT');
    assert.match(calls[0].init.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20261021\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
    assert.equal(calls[0].init.headers['content-type'], 'image/png');
    assert.equal(calls[0].init.headers['content-length'], '5');
  });

  await t.test('virtual-host style moves the bucket into the host', async () => {
    const { calls, impl } = fakeFetch();
    await sigv4.putObject({
      endpoint: 'https://s3.example.com',
      bucket: 'photos',
      key: 'a/b.png',
      body,
      accessKey: AK,
      secretKey: SK,
      pathStyle: false,
      fetchImpl: impl,
    });

    assert.equal(calls[0].url, 'https://photos.s3.example.com/a/b.png');
  });

  await t.test('publicBase rewrites the returned link', async () => {
    const { impl } = fakeFetch();
    const result = await sigv4.putObject({
      endpoint: 'https://acc.r2.cloudflarestorage.com',
      bucket: 'bar-tool',
      key: 'images/2026/10/abc.png',
      body,
      accessKey: AK,
      secretKey: SK,
      publicBase: 'https://img.example.com/',
      fetchImpl: impl,
    });

    assert.equal(result.url, 'https://img.example.com/images/2026/10/abc.png');
  });

  await t.test('a failing bucket reports the status and the body', async () => {
    const { impl } = fakeFetch(() => ({
      ok: false,
      status: 403,
      text: async () => '<Error>SignatureDoesNotMatch</Error>',
    }));

    const result = await sigv4.putObject({
      endpoint: 'https://acc.r2.cloudflarestorage.com',
      bucket: 'b',
      key: 'k.png',
      body,
      accessKey: AK,
      secretKey: SK,
      fetchImpl: impl,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
    assert.match(result.error, /SignatureDoesNotMatch/);
  });

  await t.test('object keys are content addressed and dated', () => {
    const key = sigv4.objectKey({
      buffer: body,
      mime: 'image/png',
      now: new Date('2026-10-21T08:00:00Z'),
    });

    assert.match(key, /^images\/2026\/10\/[0-9a-f]{8}\.png$/);

    const same = sigv4.objectKey({
      buffer: body,
      mime: 'image/png',
      now: new Date('2026-10-21T08:00:00Z'),
    });
    assert.equal(key, same, 'same image, same key');

    const jpeg = sigv4.objectKey({
      buffer: body,
      mime: 'image/jpeg',
      now: new Date('2026-10-21T08:00:00Z'),
    });
    assert.match(jpeg, /\.jpg$/);
  });
});
