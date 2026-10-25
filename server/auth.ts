import { timingSafeEqual } from 'node:crypto';
export type Role = 'reader' | 'reviewer' | 'operator';
export type Credential = { token: string; subject: string; roles: Role[] };
export function secureEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function authenticate(
  authorization: string,
  credentials: Credential[],
): Credential | undefined {
  return credentials.find((c) => secureEqual(authorization, `Bearer ${c.token}`));
}
export function allowed(principal: Credential, permission: 'read' | 'review' | 'operate'): boolean {
  if (permission === 'read')
    return principal.roles.some((r) => ['reader', 'reviewer', 'operator'].includes(r));
  return principal.roles.includes(permission === 'review' ? 'reviewer' : 'operator');
}
