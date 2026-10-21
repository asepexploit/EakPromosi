import { randomBytes } from 'node:crypto';

import { AppError, hmacSha256, constantTimeEqualHex } from '@eak/config';

import type { FastifyTypedInstance } from '../plugin-types.js';

/**
 * CSRF double-submit:
 *  - On login success the server sets a `csrf` cookie AND returns the token
 *    in the session bundle so the SPA can echo it as `x-csrf-token`.
 *  - For mutating requests (anything but GET/HEAD/OPTIONS) we verify the
 *    header matches the cookie, both tied to the session via HMAC.
 */
export async function registerCsrf(app: FastifyTypedInstance): Promise<void> {
  app.decorate('issueCsrfToken', (sessionTokenHash: string): string => {
    const nonce = randomBytes(16).toString('hex');
    const sig = hmacSha256(app.env.CSRF_SECRET, `${sessionTokenHash}.${nonce}`);
    return `${nonce}.${sig}`;
  });

  app.decorate('verifyCsrf', function (sessionTokenHash: string, token: string): boolean {
    const [nonce, sig] = token.split('.');
    if (!nonce || !sig) return false;
    const expected = hmacSha256(app.env.CSRF_SECRET, `${sessionTokenHash}.${nonce}`);
    return constantTimeEqualHex(expected, sig);
  });

  app.addHook('onRequest', async (req) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
    // Webhooks have their own signature verification and skip CSRF
    if (req.url.startsWith('/webhooks/')) return;
    const sess = req.cookies[app.env.SESSION_COOKIE_NAME];
    if (!sess) return; // unauthenticated routes handle their own 401
    const header = req.headers['x-csrf-token'];
    const token = typeof header === 'string' ? header : undefined;
    if (!token) throw new AppError('FORBIDDEN', 'CSRF token missing');
    // Verify against session cookie value hashed in the same way auth-context does
    const { hashSessionToken } = await import('./auth-context.js');
    if (!app.verifyCsrf(hashSessionToken(sess), token)) {
      throw new AppError('FORBIDDEN', 'CSRF token invalid');
    }
    req.csrfOk = true;
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    issueCsrfToken: (sessionTokenHash: string) => string;
    verifyCsrf: (sessionTokenHash: string, token: string) => boolean;
  }
}
