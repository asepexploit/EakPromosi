import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

import { AppError } from './errors.js';

/**
 * AES-256-GCM for MTProto session strings at rest.
 * Layout: `v<keyVersion>:<iv-b64>:<tag-b64>:<cipher-b64>`.
 * We embed the key version so decrypt can route to the right key during
 * rotation (new key for encrypt, old key still valid for decrypt).
 */
export interface EncryptionKey {
  version: number;
  key: Buffer; // 32 bytes
}

export function keyFromBase64(version: number, b64: string): EncryptionKey {
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    throw new AppError('INTERNAL', 'Encryption key must be 32 bytes', { context: { got: key.length } });
  }
  return { version, key };
}

export function encryptAesGcm(plaintext: string, k: EncryptionKey): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k.key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${k.version}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptAesGcm(payload: string, keys: EncryptionKey[]): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || !parts[0]?.startsWith('v')) {
    throw new AppError('INTERNAL', 'Malformed ciphertext');
  }
  const [vTag, ivB64, tagB64, cipherB64] = parts as [string, string, string, string];
  const version = Number(vTag.slice(1));
  const k = keys.find((x) => x.version === version);
  if (!k) throw new AppError('INTERNAL', 'No decryption key for version', { context: { version } });
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const cipher = Buffer.from(cipherB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', k.key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(cipher), decipher.final()]);
  return out.toString('utf8');
}

/** HMAC-SHA256 helper (constant-time compare). */
export function hmacSha256(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
