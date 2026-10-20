import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PakasirAdapter } from './pakasir.adapter.js';

const env = {
  PAKASIR_WEBHOOK_SECRET: 'test-secret-min-16-chars',
} as unknown as Parameters<typeof PakasirAdapter.prototype.verifyWebhook>[0] & { PAKASIR_WEBHOOK_SECRET: string };

function sign(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

describe('PakasirAdapter.verifyWebhook', () => {
  const adapter = new PakasirAdapter(env as never);

  it('accepts a valid signature within the time window', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: 'invoice.paid', data: { invoice_id: 'inv_1', status: 'paid' } });
    const signature = sign('test-secret-min-16-chars', timestamp, body);
    expect(() => adapter.verifyWebhook({ rawBody: body, timestamp, signature })).not.toThrow();
  });

  it('rejects a tampered body', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: 'invoice.paid', data: { invoice_id: 'inv_1', status: 'paid' } });
    const signature = sign('test-secret-min-16-chars', timestamp, body);
    expect(() => adapter.verifyWebhook({ rawBody: body + '!', timestamp, signature })).toThrow(/HMAC/);
  });

  it('rejects a replay outside the 5-minute window', () => {
    const timestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
    const body = '{}';
    const signature = sign('test-secret-min-16-chars', timestamp, body);
    expect(() => adapter.verifyWebhook({ rawBody: body, timestamp, signature })).toThrow(/outside window/);
  });
});
