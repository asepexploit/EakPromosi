import type { EncryptionKey, Env } from '@eak/config';
import { decryptAesGcm } from '@eak/config';
import { StringSession } from 'telegram/sessions/index.js';
import { TelegramClient } from 'telegram';

/**
 * Thin GramJS wrapper. We don't inherit from TelegramClient so tests can
 * stub this file alone (`vi.mock('./userbot.adapter')`), and so swapping
 * MTProto libraries later touches one file.
 *
 * Session strings are decrypted lazily — never kept in a long-lived
 * variable at process scope.
 */
export interface UserbotConfig {
  env: Env;
  encryptionKeys: EncryptionKey[];
  deviceModel: string;
  systemVersion: string;
  appVersion: string;
}

export class UserbotAdapter {
  private client: TelegramClient | null = null;

  constructor(private readonly cfg: UserbotConfig) {}

  async connectWithCipher(sessionCipher: string): Promise<TelegramClient> {
    const sessionString = decryptAesGcm(sessionCipher, this.cfg.encryptionKeys);
    return this.connect(sessionString);
  }

  async connect(sessionString: string): Promise<TelegramClient> {
    if (this.client && this.client.connected) return this.client;
    this.client = new TelegramClient(new StringSession(sessionString), this.cfg.env.TELEGRAM_API_ID, this.cfg.env.TELEGRAM_API_HASH, {
      connectionRetries: 3,
      deviceModel: this.cfg.deviceModel,
      systemVersion: this.cfg.systemVersion,
      appVersion: this.cfg.appVersion,
      useWSS: true,
    });
    await this.client.connect();
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await this.client.disconnect();
    this.client = null;
  }
}
