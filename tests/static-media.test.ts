import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { makeServer } from '../server/app';
import { catalog } from '../src/seed';

test('static video supports metadata HEAD, byte-range seeking, suffix ranges and invalid ranges', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duin-media-'));
  const store = new Store();
  writeFileSync(join(root, 'clip.mp4'), '0123456789');
  const server = makeServer({
    store,
    listings: catalog(),
    staticRoot: root,
    credentials: [{ token: 'media-fixture', subject: 'media', roles: ['reader'] }],
    webhookSecret: 'fixture',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/clip.mp4`;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    assert.equal(head.headers.get('content-type'), 'video/mp4');
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
    for (const [range, content, contentRange] of [
      ['bytes=3-5', '345', 'bytes 3-5/10'],
      ['bytes=7-', '789', 'bytes 7-9/10'],
      ['bytes=-2', '89', 'bytes 8-9/10'],
      ['bytes=8-99', '89', 'bytes 8-9/10'],
    ]) {
      const response = await fetch(url, { headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get('content-range'), contentRange);
      assert.equal(await response.text(), content);
    }
    for (const range of ['bytes=20-', 'bytes=9-2', 'bytes=-0', 'bytes=-', 'invalid']) {
      const response = await fetch(url, { headers: { Range: range } });
      assert.equal(response.status, 416);
      assert.equal(response.headers.get('content-range'), 'bytes */10');
      await response.arrayBuffer();
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
