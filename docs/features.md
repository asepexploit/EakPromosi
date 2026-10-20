# Daftar Fitur — EakPromosi

> **Sumber kebenaran produk**: `.claude/product-spec.md`. File ini adalah ringkasan singkat untuk kontributor baru. Jangan menambahkan detail baru di sini; tambahkan di `product-spec.md`.

## Struktur menu (5 section)

**WORKSPACE** · Dashboard · Telegram Accounts · Group & Channel Inventory
**AUTOMATION** · Auto Discovery · Auto Join & Membership Sync · Auto Broadcast · Campaign Management · Auto-DM & Auto Reply
**MONITORING** · Live Monitoring · Task Queue & Activity Logs · Statistics & Reports
**BILLING & ACCOUNT** · Subscription & Plans · Payment History · Settings & Support
**ADMIN** (panel terpisah) · Admin Panel

## Fitur per modul (ringkas)

| # | Modul | Inti |
|---|---|---|
| 01 | Dashboard Overview | Ringkasan akun, link, join, campaign, broadcast, paket, aktivitas. |
| 02 | Telegram Accounts | MTProto login, 2FA, session cipher, status, assignment, enforcement batas paket. |
| 03 | Auto Discovery | Deteksi `t.me/<user>`, `t.me/+<invite>`, `telegram.me/<user>` dari source yang dikonfigurasi; normalisasi + dedup. |
| 04 | Auto Join & Membership Sync | Antrean join dari Discovery/manual; retry rate-limit aware; sync membership periodik. |
| 05 | Group & Channel Inventory | `groups` + `group_memberships` dipisah; exclusion list; promotion flag. |
| 06 | Auto Broadcast | Editor pesan+media, template, scheduling, queue per target, retry sementara. |
| 07 | Campaign Management | Perencanaan: nama, periode, target, template, jadwal, akun. Eksekusi reuse Broadcast. |
| 08 | Auto-DM & Auto Reply | Rule by keyword/mention/join, welcome, FAQ, fallback, jam operasional, anti-spam window. |
| 09 | Live Monitoring | WS stream job state + health worker + warning rate-limit. |
| 10 | Task Queue & Activity Logs | Detail job, state transitions, audit log pengguna. |
| 11 | Statistics & Reports | Agregat metrik, filter periode, export CSV. |
| 12 | Subscription & Plans | Free/Pro/Business, batas via konfigurasi `plans`, upgrade/downgrade, enforcement API. |
| 13 | Payment History | Pakasir invoice + webhook idempotent, aktivasi/perpanjangan otomatis. |
| 14 | Settings & Support | Profil, keamanan, notifikasi, help, tiket, retensi, delete. |
| 15 | Admin Panel | User, plans, langganan global, worker, audit, support, suspensi. |

Detail lengkap tiap modul — field, status enum, aturan — di `.claude/product-spec.md` §2–§16.

## Model billing

**Subscription-only.** Tidak ada wallet / credit / top-up. Enforcement via `PlanService.enforce(tenantId, action, context)` di sisi API, error dipetakan ke HTTP 402.

## RBAC (ringkas)

| Role | Scope |
|---|---|
| `owner` | Semua operasi tenant + billing + hapus tenant. |
| `admin` | Semua operasi tenant. Tidak hapus tenant. |
| `operator` | Operasional (CRUD campaign/akun/broadcast). Billing read parsial. |
| `viewer` | Read-only. |
| `platform_admin` | Panel admin SaaS. Flag `users.is_platform_admin = true`, bukan role tenant. |

Matrix detail di `docs/rbac.md`.
