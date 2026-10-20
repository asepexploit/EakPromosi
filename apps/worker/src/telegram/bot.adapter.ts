import type { EncryptionKey, Env } from '@eak/config';
import { decryptAesGcm } from '@eak/config';
import { Telegraf } from 'telegraf';

/**
 * Wrapper for Telegraf (Bot API). Bots per tenant live in `tenant_bots`
 * with their token stored encrypted; this adapter decrypts and hands back
 * a Telegraf instance scoped to that bot.
 */
export class BotAdapter {
  constructor(private readonly encryptionKeys: EncryptionKey[]) {}

  fromCipher(tokenCipher: string): Telegraf {
    const token = decryptAesGcm(tokenCipher, this.encryptionKeys);
    return new Telegraf(token);
  }

  fromEnv(env: Env): Telegraf | null {
    if (!env.TELEGRAM_BOT_TOKEN) return null;
    return new Telegraf(env.TELEGRAM_BOT_TOKEN);
  }
}
