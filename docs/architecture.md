# Arsitektur — EakPromosi

## 1. Diagram konteks

```
          +-----------------+
          |  Tenant User    |  (browser)
          +--------+--------+
                   |
                   | HTTPS (REST + WS)
                   v
+------------------+------------------+
|            apps/web (Vite)          |  React 18, Zustand, TanStack Query
|   - /app/*   (tenant UI)            |
|   - /admin/* (platform admin UI)    |
+------------------+------------------+
                   |
                   | /api/v1/*, /ws
                   v
+------------------+------------------+
|           apps/api (Fastify)        |  Auth, RBAC, validation, orkestrasi
|   tenant modules:                   |
|     accounts, discovery, membership,|
|     groups, broadcasts, campaigns,  |
|     dm, monitoring, reports,        |
|     plans, subscriptions, billing,  |
|     webhooks (pakasir, telegram)    |
|   admin modules:                    |
|     admin/users, admin/plans,       |
|     admin/subscriptions,            |
|     admin/payments, admin/queues,   |
|     admin/support, admin/audit      |
+---+-----------+---------+-----------+
    |           |         |
    | SQL       | enqueue | webhook relay
    v           v         v
+---+---+   +---+---+   +---+-------------------+
|Postgres|  | Redis |   | apps/worker (BullMQ)  |
| Prisma |  |BullMQ |<--+  - telegram.userbot   |
+--------+  +-------+   |  - telegram.bot       |
                        |  - campaigns.sched    |
                        |  - billing.webhook    |
                        |  - reports.aggregate  |
                        +---+-------------------+
                            |
                            v
                   +--------+--------+
                   |  Telegram DC    |
                   | (MTProto + Bot) |
                   +-----------------+

                   +-----------------+
                   |     Pakasir     |  (webhook → apps/api → queue)
                   +-----------------+
```

## 2. Alur data utama

### 2.1 Create & Run Campaign Broadcast (modul 07 + 06)

1. User buat campaign → `POST /api/v1/campaigns`. API panggil `PlanService.enforce('campaign.create', {...})`.
2. API validasi (Zod), simpan ke Postgres.
3. Scheduler worker (`campaigns.scheduler`) baca `campaign_schedules` yang jatuh tempo → buat `campaign_run` + enqueue job `telegram:broadcast` per target × per akun dengan `idempotencyKey = hash(runId, targetId, accountId)`.
4. Worker broadcast:
   * Ambil akun (lock Redis per akun), load session terenkripsi, dekrip in-memory.
   * Delay rate-limit (20–60s jitter).
   * Kirim pesan via GramJS.
   * Catat hasil ke `broadcast_targets`.
5. Web WebSocket menerima stream progress → UI Live Monitoring (modul 09).

### 2.2 Auto Discovery → Auto Join (modul 03 → 04)

1. Userbot bergabung di grup "source" (`discovery_sources`).
2. Event handler GramJS tangkap pesan baru → enqueue `telegram:link-detect`.
3. Worker parse `t.me/<user>`, `t.me/+<invite>`, `telegram.me/<user>` → upsert ke `discovered_links` (dedup).
4. Jika tenant mengaktifkan auto-join → enqueue `telegram:join` dengan link + akun yang di-assign.
5. Worker join:
   * Honor kuota harian per akun & rate-limit Telegram.
   * Simpan `groups` (unik by chat_id) + `group_memberships` (akun ↔ group).
   * Status job sesuai hasil (`joined | failed | approval_required`).
6. `telegram:membership-sync` berjalan periodik mengecek status member tiap `group_memberships` aktif.

### 2.3 Billing — Pakasir subscription (modul 12 + 13)

1. User pilih paket → `POST /api/v1/billing/invoices { planId, period }`.
2. API panggil Pakasir create invoice → simpan `invoices` row (status `pending`, `plan_id`, `period`).
3. Pakasir webhook → API verifikasi signature + timestamp + simpan `webhook_events` (idempotent by `event_id`) + enqueue `billing:webhook`.
4. Worker:
   * Load event + invoice.
   * Jika `invoice.paid` & invoice status `pending` → set `paid`, `SubscriptionService.activateOrExtend(tenantId, planId, period)`.
   * Audit log.
5. Jika invoice `failed|expired` → update status; tidak ada aktivasi.

**Tidak ada mutasi credit/balance.** Model subscription-only.

### 2.4 Enforcement Paket

Setiap operasi berbatas (tambah akun, buat campaign, start broadcast, tambah source Discovery) memanggil:

```ts
await planService.enforce(tenantId, action, context);
// contoh action: 'account.create' | 'campaign.create' | 'broadcast.start' | 'discovery.source.create'
```

* Membaca `subscriptions.active[tenantId]` → `plans.limits`.
* Melempar `AppError('PLAN_LIMIT_<X>')` → errorHandler mem-map ke HTTP **402 Payment Required**.
* UI (`apps/web`) menangkap 402 → modal upgrade.

## 3. Modul domain

| Modul | Tanggung jawab |
|---|---|
| `accounts` | Telegram Account Manager (MTProto): add, verify OTP, 2FA, session lifecycle, health. |
| `bots` | Bot Telegraf per tenant (opsional): register, set webhook. |
| `discovery` | Konfigurasi source + parsing + dedup link. |
| `membership` | Join + sync keanggotaan grup × akun. |
| `groups` | Inventory grup + exclusion + promotion flag. |
| `broadcasts` | Mesin kirim: queue, retry, result log. |
| `campaigns` | Perencanaan: template, periode, jadwal, akun. Memicu `broadcasts`. |
| `dm` | Auto-DM / Auto-Reply rules + histori. |
| `monitoring` | WS stream state job + akun ke web. |
| `jobs` | View ke BullMQ (list, retry manual). |
| `audit` | Audit log pengguna. |
| `reports` | Agregasi per campaign / akun / periode. |
| `plans` | Konfigurasi paket (read-only untuk tenant; CRUD di admin). |
| `subscriptions` | Status langganan per tenant. |
| `billing` | Invoice Pakasir + webhook handler. |
| `tenants` | Tenant + member + RBAC tenant. |
| `settings` | Profil, keamanan, notifikasi, retensi. |
| `support` | Tiket dukungan. |
| `auth` | Login, session, 2FA aplikasi. |
| `admin/*` | Panel platform admin (lihat §4). |

## 4. Admin Panel (modul 15)

Dipisah secara teknis dari modul tenant:

* Route: `/admin/*` di API dan di web.
* Middleware: `requirePlatformAdmin` (membaca `users.is_platform_admin`), BUKAN role tenant.
* Modul: `admin/users`, `admin/plans`, `admin/subscriptions`, `admin/payments`, `admin/queues`, `admin/support`, `admin/audit`.
* Audit WAJIB untuk setiap endpoint (siapa, kapan, aksi apa, resource mana).
* UI terpisah folder: `apps/web/src/pages/admin/*`.

## 5. Keputusan non-trivial

* **Subscription-only** (bukan credit). Lebih sederhana, prediktif untuk tenant & akuntansi.
* **Groups ↔ Memberships dipisah tabel** — menghindari duplikasi data grup saat beberapa akun join grup yang sama.
* **Campaign ≠ Broadcast engine** — Campaign hanya merencanakan, Broadcast mengirim. Hindari duplikasi logika.
* **Monorepo pnpm**: biaya setup rendah, type sharing cepat.
* **BullMQ** daripada queue eksternal: cukup untuk fase 1; Redis sudah dipakai.
* **Prisma** daripada Drizzle: migrasi + Studio matang.
* **GramJS + Telegraf dipisah**: paradigma berbeda, dependency berbeda, test berbeda.
* **Webhook async**: Pakasir balas 200 cepat; pekerjaan di worker.
* **Admin Panel terisolasi** dari UI tenant sejak awal.

## 6. Non-goals fase 1

* Multi-region deploy.
* Kubernetes.
* Clickhouse / analytics real-time berat — pakai Postgres materialized view.
* Marketplace template publik.
* Impersonation UI dengan full session (admin boleh view-only di fase 1).
