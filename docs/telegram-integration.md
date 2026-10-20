# Integrasi Telegram

## MTProto (userbot) — GramJS

### Login flow

1. `client.start({ phoneNumber, password, phoneCode, onError })`.
2. API endpoint:
   * `POST /accounts/mtproto/send-code` → kirim kode.
   * `POST /accounts/mtproto/verify` → body: `{ phone, phoneCodeHash, code, password? }`.
3. Session string hasil `client.session.save()` dienkripsi AES-256-GCM lalu disimpan di `telegram_accounts.session_cipher`.

### API surface yang dipakai

* `messages.sendMessage`
* `channels.joinChannel`, `messages.importChatInvite`
* `channels.getFullChannel` (verifikasi grup setelah join)
* `updates.getDifference` / event handler (link detection)
* `account.updateStatus` (opsional, pretend online saat warming)

### Error map

| GramJS error | Aksi worker |
|---|---|
| `FloodWaitError` | Reschedule job: delay = `seconds + jitter(5–30)` |
| `PeerFloodError` | Mark akun cooldown 24 jam |
| `UserDeactivatedError` / `PhoneNumberBannedError` | Mark akun `banned`, hentikan semua job |
| `AuthKeyUnregisteredError` | Mark akun `disconnected`, minta re-auth |
| `ChannelPrivateError` | Mark target `inaccessible` untuk akun tsb |

## Bot API — Telegraf

### Pakai kapan
* Interaksi notifikasi ke pengguna SaaS (opsional).
* Command bot per tenant untuk trigger ringan.

### Setup
* Bot token per tenant (opsional) → `tenant_bots.token_cipher` (enkripsi sama).
* Webhook mode (bukan long-polling) → `apps/api/src/modules/webhooks/telegram.ts`.
* Signature verifikasi via secret path (`/webhooks/telegram/<secret>`).

## Pemetaan ke worker

```
apps/worker/src/telegram/
  userbot/
    client.factory.ts     # buat & cache TelegramClient per accountId (lock Redis)
    session.cipher.ts     # enkripsi/dekripsi session
    errors.ts             # kelas error + helper classifier
    actions/
      send-message.ts
      join-chat.ts
      resolve-link.ts
  bot/
    bot.factory.ts        # buat Telegraf per tenantBotId
    handlers/
      start.ts
      broadcast.ts
```
