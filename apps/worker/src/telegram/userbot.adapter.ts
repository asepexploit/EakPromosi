import type { EncryptionKey, Env } from '@eak/config';
import { decryptAesGcm, encryptAesGcm } from '@eak/config';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

/**
 * Thin GramJS wrapper. We don't inherit from TelegramClient so tests can
 * stub this file alone (`vi.mock('./userbot.adapter')`), and swapping
 * MTProto libraries later touches one file.
 *
 * Session strings are decrypted lazily — never kept in a long-lived
 * variable at process scope. The adapter owns ONE client per instance;
 * create one adapter per account to keep sessions isolated.
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
  private sessionString: string | null = null;

  constructor(private readonly cfg: UserbotConfig) {}

  async connectWithCipher(sessionCipher: string): Promise<TelegramClient> {
    const plain = decryptAesGcm(sessionCipher, this.cfg.encryptionKeys);
    return this.connect(plain);
  }

  async connect(sessionString = ''): Promise<TelegramClient> {
    if (this.client && this.client.connected) return this.client;
    this.sessionString = sessionString;
    this.client = new TelegramClient(
      new StringSession(sessionString),
      this.cfg.env.TELEGRAM_API_ID,
      this.cfg.env.TELEGRAM_API_HASH,
      {
        connectionRetries: 3,
        deviceModel: this.cfg.deviceModel,
        systemVersion: this.cfg.systemVersion,
        appVersion: this.cfg.appVersion,
        useWSS: true,
      },
    );
    await this.client.connect();
    return this.client;
  }

  /** Returns the current session string, encrypted with the active key. */
  exportCipher(): string {
    if (!this.client) throw new Error('userbot not connected');
    const session = (this.client.session as StringSession).save() ?? '';
    const key = this.cfg.encryptionKeys[0];
    if (!key) throw new Error('no encryption key loaded');
    return encryptAesGcm(session, key);
  }

  async sendMessage(peer: string, text: string): Promise<string> {
    if (!this.client) throw new Error('userbot not connected');
    const result = await this.client.sendMessage(peer, { message: text });
    return String(result.id);
  }

  async sendMedia(peer: string, mediaUrl: string, caption: string): Promise<string> {
    if (!this.client) throw new Error('userbot not connected');
    const result = await this.client.sendFile(peer, { file: mediaUrl, caption });
    const first = Array.isArray(result) ? result[0] : result;
    return String(first?.id ?? '');
  }

  async joinPublic(username: string): Promise<void> {
    if (!this.client) throw new Error('userbot not connected');
    await this.client.invoke(new Api.channels.JoinChannel({ channel: username }));
  }

  async joinInvite(inviteHash: string): Promise<void> {
    if (!this.client) throw new Error('userbot not connected');
    await this.client.invoke(new Api.messages.ImportChatInvite({ hash: inviteHash }));
  }

  async getRecentMessages(peer: string, limit = 50): Promise<string[]> {
    if (!this.client) throw new Error('userbot not connected');
    const messages = await this.client.getMessages(peer, { limit });
    return messages.map((m) => m.message ?? '').filter(Boolean);
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await this.client.disconnect();
    this.client = null;
    this.sessionString = null;
  }
}
