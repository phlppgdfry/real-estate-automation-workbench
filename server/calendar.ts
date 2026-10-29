const local = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
function wallTime(instant: number) {
  const parts = Object.fromEntries(
    local.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}
/** UTC boundaries for a Brussels calendar day, including 23- and 25-hour DST days. */
export function brusselsDayWindow(now: string) {
  const instant = Date.parse(now);
  if (!Number.isFinite(instant)) throw Error('INVALID_CLOCK');
  const date = new Date(wallTime(instant));
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const toInstant = (wall: number) => {
    let candidate = wall;
    for (let i = 0; i < 3; i++) candidate += wall - wallTime(candidate);
    return new Date(candidate).toISOString();
  };
  return { start: toInstant(midnight), end: toInstant(midnight + 86400000) };
}
