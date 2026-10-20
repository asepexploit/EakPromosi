---
name: telegram-safety
description: Panduan safety-net untuk setiap kode yang memanggil GramJS/Telegraf — rate limit per akun, flood-wait handling, warm-up, dan deteksi ban. Muat skill ini sebelum menulis atau memodifikasi logika di apps/worker/src/telegram/*.
---

# Telegram Safety Skill

Skill ini **wajib dimuat** sebelum menyentuh kode di `apps/worker/src/telegram/`.

## Checklist pra-kode

1. Jenis panggilan (join/send/dm/read)?
2. Apakah per-akun atau broadcast?
3. Apakah akun warm (≥7 hari) atau fresh?
4. Rate limit yang berlaku (lihat tabel di `.claude/rules/telegram.md`).

## Pola wajib

```ts
try {
  await userbot.invoke(request);
} catch (err) {
  if (err instanceof FloodWaitError) {
    throw new RetryableError({
      delayMs: (err.seconds + jitter(5, 30)) * 1000,
      cause: err,
    });
  }
  if (isAccountKilledError(err)) {
    await accountRepo.markBanned(accountId, { reason: err.message });
    throw new NonRetryableError({ cause: err });
  }
  throw err;
}
```

* `jitter(min, max)` dari `packages/shared/src/util/jitter.ts`.
* `isAccountKilledError` mendeteksi `UserDeactivated`, `PhoneNumberBanned`, `AuthKeyUnregistered`.

## Larangan

* `setInterval` untuk polling Telegram → gunakan BullMQ repeatable job.
* Memakai satu session di dua worker bersamaan → wajib Redis lock.
* Mengubah `device_model` / `system_version` akun yang sudah aktif.

## Testing

* Unit test wajib menyimulasikan `FloodWaitError` dan memverifikasi job di-reschedule, bukan di-fail-permanen.
