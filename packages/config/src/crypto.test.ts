import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptAesGcm, encryptAesGcm, keyFromBase64 } from './crypto.js';

describe('AES-256-GCM session cipher', () => {
  const k1 = keyFromBase64(1, randomBytes(32).toString('base64'));
  const k2 = keyFromBase64(2, randomBytes(32).toString('base64'));

  it('should round-trip arbitrary utf8 payloads', () => {
    const plain = 'session-string-with-emoji-🚀-and-non-ascii-ñ';
    const ct = encryptAesGcm(plain, k1);
    expect(decryptAesGcm(ct, [k1])).toBe(plain);
  });

  it('should produce distinct ciphertexts for the same plaintext (random IV)', () => {
    const a = encryptAesGcm('same', k1);
    const b = encryptAesGcm('same', k1);
    expect(a).not.toBe(b);
  });

  it('should route decryption to the matching key version', () => {
    const ct = encryptAesGcm('hello', k2);
    expect(decryptAesGcm(ct, [k1, k2])).toBe('hello');
  });

  it('should reject when the key version is unknown', () => {
    const ct = encryptAesGcm('hello', k2);
    expect(() => decryptAesGcm(ct, [k1])).toThrow(/No decryption key/);
  });

  it('should reject tampered ciphertext', () => {
    const ct = encryptAesGcm('hello', k1);
    const bad = ct.slice(0, -2) + 'xx';
    expect(() => decryptAesGcm(bad, [k1])).toThrow();
  });
});
