import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
export function crmTestService(database = ':memory:') {
  const db = new DatabaseSync(database);
  db.exec(
    'CREATE TABLE IF NOT EXISTS records(key TEXT PRIMARY KEY, hash TEXT NOT NULL, body TEXT NOT NULL);',
  );
  let fault: 'none' | 'rate-limit' | 'commit-disconnect' | 'unavailable' = 'none';
  const server = createServer(async (req, res) => {
    const send = (status: number, value: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/health')
      return send(200, {
        service: 'fictional-crm-http-test',
        records: (db.prepare('SELECT count(*) n FROM records').get() as { n: number }).n,
      });
    if (req.method === 'GET' && req.url?.startsWith('/records/')) {
      const key = decodeURIComponent(req.url.slice(9));
      const row = db.prepare('SELECT hash FROM records WHERE key=?').get(key) as
        { hash: string } | undefined;
      return send(
        row ? 200 : 404,
        row ? { key, bodyHash: row.hash, externalId: 'test:' + key } : { error: 'NOT_FOUND' },
      );
    }
    if (req.url === '/records' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16384) return send(413, { error: 'SIZE' });
      }
      const key = String(req.headers['idempotency-key'] ?? ''),
        hash = createHash('sha256').update(body).digest('hex');
      if (!key || req.headers['x-body-hash'] !== hash) return send(400, { error: 'HASH' });
      if (fault === 'rate-limit') {
        fault = 'none';
        res.setHeader('Retry-After', '2');
        return send(429, { error: 'RATE_LIMIT' });
      }
      if (fault === 'unavailable') {
        fault = 'none';
        return send(503, { error: 'UNAVAILABLE' });
      }
      const old = db.prepare('SELECT hash FROM records WHERE key=?').get(key) as
        { hash: string } | undefined;
      if (old && old.hash !== hash) return send(409, { error: 'CONFLICT' });
      db.prepare('INSERT OR IGNORE INTO records VALUES(?,?,?)').run(key, hash, body);
      if (fault === 'commit-disconnect') {
        fault = 'none';
        req.socket.destroy();
        return;
      }
      return send(200, { key, bodyHash: hash, externalId: 'test:' + key });
    }
    send(404, { error: 'NOT_FOUND' });
  });
  server.on('close', () => db.close());
  return {
    server,
    setFault: (value: typeof fault) => {
      fault = value;
    },
  };
}
