# Product Spec — EakPromosi

Dokumen ini adalah **sumber kebenaran produk**: struktur menu, modul, dan perilaku fitur.
Semua rules, skills, commands, dan docs lain merujuk ke sini. Jika ada konflik, dokumen ini menang untuk urusan **apa** yang dibangun; `.claude/rules/*` menang untuk **bagaimana** membangunnya.

> Model billing: **subscription-only** (paket Free / Pro / Business). TIDAK ADA wallet, top-up kredit, atau pemotongan saldo per operasi. Batas pemakaian = batas paket (jumlah akun & kuota operasi), bukan kuota credit.

> Referensi tampilan: `docs/design/ui-design-system.md` (sistem desain) + `docs/design/prototype/` (kode prototipe sebagai acuan visual `apps/web`; mockup data dummy, bukan kode produksi).

---

## 1. Struktur Menu Aplikasi

Side-nav dikelompokkan jadi 4 section + 1 panel terpisah untuk owner SaaS.

### WORKSPACE
1. Dashboard Overview
2. Telegram Accounts
3. Group & Channel Inventory

### AUTOMATION
4. Auto Discovery
5. Auto Join & Membership Sync
6. Auto Broadcast
7. Campaign Management
8. Auto-DM & Auto Reply

### MONITORING
9. Live Monitoring
10. Task Queue & Activity Logs
11. Statistics & Reports

### BILLING & ACCOUNT
12. Subscription & Plans
13. Payment History
14. Settings & Support

### ADMIN (panel terpisah)
15. Admin Panel

---

## 2. Modul 01 — Dashboard Overview

**Tujuan.** Ringkasan satu halaman untuk tenant.

**Data yang ditampilkan:**
- Total akun Telegram terhubung.
- Breakdown akun: aktif, terputus, bermasalah.
- Total tautan ditemukan (Discovery).
- Total grup/channel yang berhasil di-join.
- Statistik antrean Discovery dan Join (pending / processing / failed).
- Jumlah campaign aktif & terjadwal.
- Statistik broadcast berhasil & gagal (periode default 7 hari).
- Ringkasan paket aktif + batas akun (misal 3/5 akun terpakai).
- Feed aktivitas terbaru & notifikasi sistem.

**Catatan implementasi:** semua angka dari materialized view / agregat tenant-scoped, bukan query live ke Postgres besar.

---

## 3. Modul 02 — Telegram Account Manager

**Fitur:**
- Tambah akun via MTProto (nomor + kode + 2FA opsional).
- Session string disimpan **terenkripsi** (lihat `.claude/rules/security.md`).
- Status koneksi: `active | warming | flood_wait | disconnected | banned | error`.
- Info akun: username, display name, phone (masked), id Telegram.
- Penugasan akun untuk operasi tertentu (opt-in per akun: discovery / broadcast / dm).
- Riwayat aktivitas & error per akun.
- Aksi: reconnect, disconnect, delete session.
- **Enforcement batas paket:** API tolak `addAccount` jika `activeAccounts >= plan.maxAccounts` dengan `error.code = "PLAN_LIMIT_ACCOUNTS"`. UI tampilkan dialog upgrade.

---

## 4. Modul 03 — Auto Discovery Engine

**Tujuan.** Menemukan tautan grup/channel dari sumber yang dikonfigurasi tenant.

**Fitur:**
- Konfigurasi "sumber" per tenant: grup/channel yang akun userbot sudah ikuti dan diizinkan untuk dibaca.
- Deteksi pola tautan:
  - `t.me/<username>`
  - `t.me/+<invite_code>`
  - `telegram.me/<username>`
  - mention `@username` (opsional, flag per source)
- Normalisasi & deduplikasi (satu grup = satu entri di `discovered_links`, meski ditemukan berkali-kali).
- Validasi format sebelum masuk antrean.
- Klasifikasi: `public_username | private_invite | public_mention`.
- Status link: `pending | valid | invalid | duplicate | expired`.
- Riwayat: siapa menemukan, kapan, dari source mana.
- Pengaturan jadwal & batas pemrosesan per source (misal max 500 link/hari/source).

**Catatan:** Discovery TIDAK join otomatis. Join adalah modul terpisah (04).

---

## 5. Modul 04 — Auto Join & Membership Sync

**Tujuan.** Memproses hasil Discovery jadi membership nyata, dan menjaga state keanggotaan tetap akurat.

**Fitur:**
- Antrean join otomatis (fed dari Discovery, atau dibuat manual dari Inventory).
- Assignment akun per pekerjaan (round-robin dengan health check).
- Deteksi grup yang sudah diikuti oleh akun → skip (tapi tetap sinkronkan metadata).
- Deteksi akses & approval:
  - Public → langsung join.
  - Private invite → via `messages.importChatInvite`.
  - Approval-required → status `approval_required`, tunggu notifikasi admin grup.
- Status job: `queued | joining | joined | failed | approval_required | skipped`.
- Retry terkontrol:
  - Flood-wait → delay sesuai `FloodWaitError.seconds + jitter`.
  - Error permanen (invite expired, banned by group) → mark failed, jangan retry.
- Rate limit per akun (lihat `.claude/rules/telegram.md`).
- **Membership sync periodik:** cek berkala apakah akun masih member (dikeluarkan admin? ban?).
- Riwayat join + alasan kegagalan.
- Kontrol: pause / resume / stop task.

**Disclaimer UI wajib:** auto join tidak menjamin semua tautan berhasil (link privat, kedaluwarsa, batas akun, approval admin).

---

## 6. Modul 05 — Group & Channel Inventory

**Tujuan.** Database terpusat yang dipakai modul Discovery, Join, Broadcast, Reports.

**Dua entitas yang DIPISAH:**
- `groups` — satu baris per grup/channel (unik by `telegram_chat_id`).
- `group_memberships` — relasi N:M `groups × telegram_accounts` (satu grup bisa diikuti banyak akun).

**Field grup:** nama, username, link, type (`group | supergroup | channel`), member_count (opsional, snapshot), first_discovered_at, last_synced_at.

**Field membership:** `group_id`, `account_id`, status (`member | left | kicked | banned | pending`), joined_at, left_at, last_checked_at.

**UI capabilities:**
- List + filter (akun, source, type, status).
- Search by name/username.
- Pagination (cursor).
- Bulk select untuk aksi batch (resync metadata, exclude).
- Resync metadata (fetch nama/username/member_count terbaru).
- **Exclusion list** per tenant: target yang TIDAK boleh dipakai untuk broadcast.
- **Promotion flag** per group: `allow_promotion = true/false` (default false sampai user menandai).

---

## 7. Modul 06 — Auto Broadcast

**Tujuan.** Mesin pengiriman pesan. Dipakai langsung (one-off) atau dipanggil Campaign Management.

**Editor pesan:**
- Teks (markdown Telegram terbatas).
- Media: foto, video, dokumen, GIF (sesuai yang didukung Telegram API).
- Template reusable (disimpan per tenant).
- Preview tampilan Telegram.

**Target & jadwal:**
- Pemilihan target dari Group Inventory (hanya grup dengan `allow_promotion=true` dan tidak di exclusion list).
- Immediate send atau scheduled (`scheduled_at`).
- Antrean pengiriman per target dengan status: `queued | sending | sent | failed | skipped`.

**Kontrol & reliability:**
- Pause / resume / stop broadcast job.
- Retry untuk kegagalan sementara (network, flood-wait).
- Jangan retry untuk permanen (`CHAT_WRITE_FORBIDDEN`, akun dikeluarkan dari grup).
- Rate limit: delay 20–60s jitter antar pesan per akun.

**Logging:**
- Riwayat per target (sent / failed + error code).
- Metadata: akun pengirim, waktu, message_id Telegram (untuk audit).

**Kebijakan:** hanya ke grup yang mengizinkan promosi; sistem **tidak** mendeteksi aturan grup otomatis — tanggung jawab tenant menandai `allow_promotion`.

---

## 8. Modul 07 — Campaign Management

**Tujuan.** Pusat **perencanaan** promosi. BUKAN mesin pengiriman kedua — eksekusi tetap lewat Auto Broadcast.

**Fitur:**
- CRUD + duplicate + archive campaign.
- Field: nama, deskripsi, tujuan, periode (`starts_at`, `ends_at`).
- Pemilihan target dari Inventory (reuse selector).
- Pemilihan template pesan (reuse Broadcast template).
- Multiple jadwal pengiriman dalam satu campaign (misal: setiap hari jam 10 & 20 selama 7 hari).
- Penetapan akun yang dipakai (subset dari akun aktif tenant).
- Status campaign: `draft | scheduled | running | paused | completed | failed | archived`.
- Progress indicator: `sent / total_planned`.
- Statistik per campaign (sent, failed, by-account breakdown).
- Riwayat perubahan konfigurasi (audit).
- Kontrol: start, pause, resume, stop.

**Hubungan ke Broadcast:**
- Campaign `scheduled` → sampai `starts_at` tiba, scheduler enqueue broadcast jobs.
- Satu campaign ⇒ banyak `broadcast_runs` (satu per jadwal/eksekusi).

---

## 9. Modul 08 — Auto-DM & Auto Reply

**Tujuan.** Balasan otomatis untuk DM / pesan yang mention akun userbot.

**Rules:**
- Trigger types: `keyword_match`, `new_dm`, `mention`, `group_join_event`.
- Response types: `template_text`, `template_media`, `tag_only`, `forward_to_bot`.
- Welcome message (saat user DM pertama kali).
- FAQ (keyword → jawaban).
- Default fallback.
- Jam operasional (tenant TZ).
- Enable/disable per rule.
- **Frekuensi limit:** satu user tidak dibalas lagi oleh rule yang sama dalam window N menit (anti-spam).

**Riwayat:** respons terkirim, error, user yang di-tag.

**Policy:** dilarang pengiriman DM massal ke user yang belum interaksi (lihat `.claude/rules/telegram.md`).

---

## 10. Modul 09 — Live Monitoring

- Status worker & koneksi layanan (API ↔ Redis ↔ Postgres ↔ Telegram DC).
- Breakdown job per domain: Discovery / Join / Membership Sync / Broadcast / DM.
- Counter: pending, active, completed (24h), failed, delayed.
- Progress job yang panjang (campaign running).
- Daftar error terbaru + opsi retry manual.
- Filter: campaign atau akun.
- Aksi: pause / stop job yang mendukung.
- Peringatan rate-limit & masalah sesi (banner).

**Transport:** WebSocket dari API ke web, backed by Redis pub/sub dari worker.

---

## 11. Modul 10 — Task Queue & Activity Logs

Detail per job:
- Job ID, jenis operasi (`broadcast.send`, `join.chat`, dst).
- Waktu `created_at`, `started_at`, `finished_at`.
- Status + attempt count.
- Error terakhir (code + message, tanpa stack ke user).
- Relasi: `account_id`, `target_group_id`, `campaign_id`, `broadcast_run_id`.
- Riwayat perubahan status (state transitions).

**Audit log pengguna:** tindakan sensitif (add account, delete session, start/stop campaign, change plan, change rule) dicatat terpisah di `audit_logs` dengan `actor_user_id`, `action`, `resource`, `before`, `after`.

---

## 12. Modul 11 — Statistics & Reports

**Metrik:**
- Jumlah tautan ditemukan (per source, per periode).
- Jumlah tautan valid (lolos validasi).
- Join berhasil / gagal.
- Jumlah grup/channel aktif.
- Broadcast per campaign (sent, failed, rate).
- Jumlah pesan berhasil & gagal (global tenant).
- Aktivitas per akun.

**Kontrol:**
- Filter tanggal (preset 24h / 7d / 30d / custom).
- Export CSV (streaming untuk dataset besar).

**Catatan:** data berasal dari agregat (materialized view atau tabel ringkas yang di-update worker reports).

---

## 13. Modul 12 — Subscription & Plans

**Model:** subscription-only. Tidak ada credit.

**Paket:**
- Free / Pro / Business.
- Harga per paket + period (`monthly` / `yearly`).
- Batas kuantitatif per paket (dikonfigurasi di tabel `plans`, bukan hard-coded):
  - `max_telegram_accounts`
  - `max_concurrent_campaigns`
  - `max_broadcasts_per_day`
  - `max_discovery_sources`
  - fitur boolean (misal `auto_discovery_enabled`, `auto_join_enabled`).
- Status langganan: `active | expired | pending | canceled`.
- `starts_at`, `ends_at`.
- Upgrade / downgrade:
  - Upgrade → langsung berlaku, prorata dihitung di invoice berikutnya atau charge selisih (keputusan: charge selisih di invoice baru).
  - Downgrade → berlaku di awal periode berikutnya.
- Pengingat kedaluwarsa (H-7, H-1).
- Aturan saat expired:
  - Akun melebihi `max_telegram_accounts` paket Free → sistem **tidak menghapus akun**, tapi menonaktifkan (`disabled_by_plan_limit=true`) sampai user upgrade atau hapus akun manual.
  - Campaign running tetap diselesaikan untuk periode berjalan; campaign baru dibatasi paket baru.

**Enforcement teknis:**
- Service `PlanService.enforce(tenantId, action, context)` dipanggil sebelum operasi berbatas.
- Melempar `AppError('PLAN_LIMIT_<X>')` yang dipetakan ke 402 Payment Required oleh error handler.

**Contoh (ilustrasi, aktual via konfigurasi `plans`):**

| Fitur | Free | Pro | Business |
|---|---|---|---|
| Akun Telegram | 1 | 5 | 20 |
| Auto Discovery | Terbatas | Ya | Ya |
| Auto Join | Terbatas | Ya | Ya |
| Auto Broadcast | Dasar | Ya | Ya |
| Campaign Management | Dasar | Ya | Ya |
| Monitoring | Dasar | Lengkap | Lengkap |

---

## 14. Modul 13 — Payment History

- Semua pembayaran via **Pakasir**.
- Flow: user pilih paket → create invoice Pakasir → redirect checkout → webhook `invoice.paid` → aktivasi/perpanjangan langganan.
- Status transaksi: `pending | paid | expired | failed`.
- Verifikasi di backend (signature + replay-protection).
- Webhook idempotent (dedup by `event_id`).
- Riwayat transaksi tenant (invoice id, amount, period, plan, paid_at).
- **Aktivasi otomatis:**
  - `invoice.paid` + plan upgrade → set `subscriptions.plan_id`, extend `ends_at`.
  - `invoice.paid` + perpanjangan → extend `ends_at` saja.
- Rekonsiliasi: query manual admin bisa membandingkan `invoices` lokal vs status Pakasir.
- **Anti aktivasi ganda:** `webhook_events.event_id` unique; transisi state hanya `pending → paid`.

**TIDAK ADA:** wallet balance, top-up credit, pemotongan credit per broadcast.

---

## 15. Modul 14 — Settings & Support

- Profil pengguna (nama, email, bahasa, TZ).
- Keamanan: ganti password, kelola 2FA aplikasi, kelola sesi aktif.
- Preferensi notifikasi (email, in-app).
- Konfigurasi fitur per tenant (toggle yang paketnya izinkan).
- Help center (artikel statis / link).
- Tiket dukungan (form + list tiket user).
- Kebijakan retensi data (tampilkan + opsi delete).
- Penghapusan akun Telegram (revoke session + hapus session cipher) & penghapusan tenant.

---

## 16. Modul 15 — Admin Panel (untuk owner SaaS)

**Panel terpisah** di route `/admin/*`, akses hanya untuk user dengan `is_platform_admin = true` (bukan role tenant).

**Kemampuan:**
- Manajemen pengguna platform (search, suspend, impersonate opsional dengan audit).
- CRUD paket: harga, periode, batas kuantitatif, feature flag.
- Monitoring langganan global (expired dalam 7 hari, pending payments).
- Monitoring pembayaran: list invoice, status, rekonsiliasi dengan Pakasir.
- Monitoring worker & antrean global (queue depth per queue, DLQ).
- Audit log platform-wide (filter actor, resource).
- Pengelolaan tiket dukungan (assign, status, response).
- Suspensi tenant yang melanggar kebijakan (`tenants.status = suspended` → semua akun pause, read-only).

**Pemisahan teknis:**
- Route group terpisah di `apps/api/src/modules/admin/*`.
- Middleware auth khusus: `requirePlatformAdmin`.
- UI terpisah di `apps/web/src/pages/admin/*`.
- Audit WAJIB di semua endpoint admin.

---

## 17. Ringkasan tabel domain (final untuk fase 1)

| Tabel | Catatan |
|---|---|
| `users` | user platform (bisa anggota banyak tenant); `is_platform_admin` boolean. |
| `tenants` | organisasi; `status`, `plan_id` snapshot. |
| `tenant_members` | pivot user × tenant + role (owner/admin/operator/viewer). |
| `plans` | konfigurasi paket (harga, limits, features). |
| `subscriptions` | langganan aktif per tenant (plan, periode, status). |
| `invoices` | invoice Pakasir. |
| `webhook_events` | event webhook (idempotency). |
| `audit_logs` | audit tindakan user. |
| `telegram_accounts` | akun MTProto per tenant (session cipher). |
| `tenant_bots` | bot Telegraf per tenant (opsional). |
| `discovery_sources` | konfigurasi sumber Discovery. |
| `discovered_links` | hasil Discovery (sebelum jadi group). |
| `groups` | grup/channel unik (by telegram_chat_id). |
| `group_memberships` | relasi group × telegram_account. |
| `group_exclusions` | per tenant, grup yang dilarang jadi target. |
| `broadcast_templates` | template pesan. |
| `broadcasts` | job broadcast one-off (parent). |
| `broadcast_targets` | per target hasil kirim. |
| `campaigns` | plan promosi. |
| `campaign_schedules` | jadwal dalam campaign. |
| `campaign_runs` | eksekusi (menghasilkan broadcasts). |
| `dm_rules` | aturan auto-DM/auto-reply. |
| `dm_responses` | log respons. |
| `processed_jobs` | idempotency log worker. |

Diagram relasi lengkap akan dibuat saat implementasi Prisma dimulai.

---

## 18. Peta modul → folder (ringkas)

| Modul | `apps/api/src/modules/*` | `apps/worker/src/queues/*` | `apps/web/src/pages/*` |
|---|---|---|---|
| 01 Dashboard | `dashboard` | — | `dashboard` |
| 02 Accounts | `accounts` | `telegram/auth` | `accounts` |
| 03 Discovery | `discovery` | `telegram/link-detect` | `discovery` |
| 04 Join | `membership` | `telegram/join`, `telegram/membership-sync` | `membership` |
| 05 Inventory | `groups` | — | `inventory` |
| 06 Broadcast | `broadcasts` | `telegram/broadcast` | `broadcasts` |
| 07 Campaigns | `campaigns` | `campaigns/scheduler` | `campaigns` |
| 08 DM/Reply | `dm` | `telegram/dm-reply` | `dm` |
| 09 Live Monitor | `monitoring` (WS) | — | `monitoring` |
| 10 Queue/Logs | `jobs`, `audit` | — | `queue`, `audit` |
| 11 Reports | `reports` | `reports/aggregate` | `reports` |
| 12 Plans | `plans`, `subscriptions` | — | `billing/plans` |
| 13 Payments | `billing`, `webhooks/pakasir` | `billing/webhook` | `billing/history` |
| 14 Settings | `settings`, `support` | — | `settings` |
| 15 Admin | `admin/*` | `admin/reconciliation` (opsional) | `admin/*` |

---

## 19. Non-negotiables

- **Subscription-only** (tidak ada credit/wallet).
- **Tenant isolation** mutlak di semua query.
- **Session MTProto encrypted** at rest.
- **Idempotent** untuk semua webhook & worker job.
- **Admin Panel terpisah** dari UI tenant, auth terpisah.
- **Enforcement paket** di API, bukan hanya di UI.
