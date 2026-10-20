# Rule — Telegram Integration (GramJS + Telegraf)

Muat rule ini untuk SETIAP tugas yang menyentuh Telegram.

## Pembagian paradigma

* **GramJS (MTProto userbot)** — bertindak sebagai akun user. Untuk: join grup, kirim pesan ke grup, baca pesan grup, deteksi link, DM dari akun user.
* **Telegraf (Bot API)** — bertindak sebagai bot (dibuat via `@BotFather`). Untuk: menerima perintah user SaaS via bot, notifikasi, webhook sederhana.

Jangan campur: logika userbot di `apps/worker/src/telegram/userbot/`, logika bot di `apps/worker/src/telegram/bot/`.

## Perlindungan akun

* **Hormati flood-wait.** Tangkap `FloodWaitError`; jadwal ulang job dengan delay = `seconds + jitter(5–30s)`. Jangan retry agresif.
* **Rate limit konservatif.**
  * Join grup: maks 20/hari per akun baru, naik bertahap setelah 7 hari aktif.
  * Broadcast: delay 20–60 detik antar pesan, acak.
  * DM: maks 50/hari ke non-kontak.
* **Warm-up akun baru**: 3 hari aktivitas pasif (join 2–3 grup, baca pesan) sebelum broadcast.
* **Pisahkan device/system info** per akun agar fingerprint realistis.

## Session management

* Session string disimpan **terenkripsi** (AES-256-GCM). Lihat `.claude/rules/security.md`.
* 2FA cloud password didukung; disimpan terpisah dari session.
* Satu session hanya diakses satu worker pada satu waktu (lock di Redis).

## Deteksi ban / limit

* `UserDeactivatedError`, `PhoneNumberBannedError`, `AuthKeyUnregisteredError` → mark akun `banned`, hentikan semua job akun.
* `PeerFloodError` → cooldown 24 jam.
* Health check periodik tiap 15 menit (ringan).

## ToS compliance

* Jangan kirim pesan ke user yang belum pernah interaksi tanpa opt-in jelas.
* Jangan join grup private tanpa link eksplisit dari pengguna SaaS.
* Pengguna SaaS bertanggung jawab atas konten; sistem logging menyimpan audit trail.

## Testing

* Mock GramJS di unit test (`vi.mock('telegram')`).
* Integration test terhadap akun throwaway di env `TG_TEST_*`, tidak dijalankan di CI default (`describe.skip` kecuali `RUN_TG_IT=1`).
