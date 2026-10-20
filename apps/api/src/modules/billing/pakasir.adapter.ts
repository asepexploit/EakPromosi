import { AppError, type Env, constantTimeEqualHex, hmacSha256 } from '@eak/config';

/**
 * Thin HTTP client around Pakasir. Kept intentionally small: billing.service
 * decides what to persist; this adapter just talks to the vendor.
 *
 * Webhook signature algorithm here matches the HMAC-SHA256 scheme in
 * `.claude/rules/payment.md`: `signature = hex(hmac_sha256(secret, timestamp + "." + rawBody))`
 * with a 5-minute timestamp window.
 */
export interface PakasirCreateInvoiceInput {
  invoiceReference: string;
  amountIdr: number;
  description: string;
  callbackUrl: string;
  redirectUrl: string;
  customerEmail: string;
}

export interface PakasirInvoiceResponse {
  invoiceId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export class PakasirAdapter {
  constructor(private readonly env: Env) {}

  async createInvoice(input: PakasirCreateInvoiceInput): Promise<PakasirInvoiceResponse> {
    const res = await fetch(`${this.env.PAKASIR_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.env.PAKASIR_API_KEY}`,
        'x-pakasir-project': this.env.PAKASIR_PROJECT,
      },
      body: JSON.stringify({
        reference: input.invoiceReference,
        amount: input.amountIdr,
        currency: 'IDR',
        description: input.description,
        callback_url: input.callbackUrl,
        redirect_url: input.redirectUrl,
        customer_email: input.customerEmail,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError('INTERNAL', 'Pakasir create invoice failed', {
        context: { status: res.status, body: text.slice(0, 500) },
      });
    }
    const body = (await res.json()) as {
      id: string;
      checkout_url: string;
      expires_at: string;
    };
    return { invoiceId: body.id, checkoutUrl: body.checkout_url, expiresAt: body.expires_at };
  }

  /**
   * Validates webhook signature and freshness. Mutating callers (webhook
   * module) hand us the raw body (Buffer / string) — never JSON.parse first,
   * because signature verification is byte-sensitive.
   */
  verifyWebhook(input: { rawBody: string; timestamp: string; signature: string }): void {
    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts)) throw new AppError('WEBHOOK_SIGNATURE_INVALID', 'Timestamp invalid');
    const skew = Math.abs(Date.now() - ts * 1000);
    if (skew > 5 * 60 * 1000) throw new AppError('WEBHOOK_REPLAY', 'Timestamp outside window');
    const expected = hmacSha256(this.env.PAKASIR_WEBHOOK_SECRET, `${input.timestamp}.${input.rawBody}`);
    if (!constantTimeEqualHex(expected, input.signature.toLowerCase())) {
      throw new AppError('WEBHOOK_SIGNATURE_INVALID', 'HMAC mismatch');
    }
  }
}
