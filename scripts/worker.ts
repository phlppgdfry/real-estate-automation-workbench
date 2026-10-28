export {};
const base = process.env.LOCAL_API_URL ?? 'http://127.0.0.1:4318';
const url = new URL(base);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('LOCAL_ONLY');
if (!process.env.OPERATOR_TOKEN) throw Error('OPERATOR_TOKEN_REQUIRED');
let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.OPERATOR_TOKEN}`,
};
let lastDigest = '';
async function tick() {
  if (stopped) return;
  try {
    const response = await fetch(`${base}/api/inbox/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ limit: 2 }),
      signal: AbortSignal.timeout(55000),
    });
    console.log(
      response.ok ? 'Worker batch checked.' : 'Worker batch failed; durable inbox retained.',
    );
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (lastDigest !== day) {
      const digest = await fetch(`${base}/api/workspace/digest/trigger`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventId: `daily-${day}`, kind: 'schedule' }),
        signal: AbortSignal.timeout(15000),
      });
      if (digest.ok) {
        lastDigest = day;
        console.log('Daily internal digest stored; no messages sent.');
      }
    }
  } catch {
    console.log('Local API unavailable; next tick retries.');
  }
  if (!stopped && !process.argv.includes('--once')) setTimeout(tick, 5000);
}
await tick();
