# RBAC — Matriks Role per Tenant

Role tenant: `owner`, `admin`, `operator`, `viewer`. Role **bukan** mekanisme untuk admin platform; lihat §Admin Panel.

## Matriks

| Fitur / aksi                              | owner | admin | operator | viewer |
| ----------------------------------------- | :---: | :---: | :------: | :----: |
| Melihat Dashboard / Reports / Monitoring  |  ✓    |  ✓    |    ✓     |   ✓    |
| Mengelola anggota tenant                  |  ✓    |  ✓    |          |        |
| Menghapus / mengganti owner               |  ✓    |       |          |        |
| Tambah / hapus akun Telegram              |  ✓    |  ✓    |    ✓     |        |
| Verifikasi / konfigurasi akun             |  ✓    |  ✓    |    ✓     |        |
| Hapus akun Telegram (destructive)         |  ✓    |       |          |        |
| CRUD Discovery sources                    |  ✓    |  ✓    |    ✓     |        |
| CRUD Groups (incl. allow_promotion, excl) |  ✓    |  ✓    |    ✓     |        |
| CRUD Broadcasts & Templates               |  ✓    |  ✓    |    ✓     |        |
| Pause / resume / cancel Broadcast         |  ✓    |  ✓    |    ✓     |        |
| CRUD Campaigns                            |  ✓    |  ✓    |    ✓     |        |
| CRUD DM Rules                             |  ✓    |  ✓    |    ✓     |        |
| Checkout / upgrade plan                   |  ✓    |  ✓    |          |        |
| Lihat invoice history                     |  ✓    |  ✓    |    ✓     |   ✓    |
| Lihat audit log                           |  ✓    |  ✓    |          |        |
| Settings tenant                           |  ✓    |  ✓    |          |        |

## Enforcement

- Semua route Fastify menyatakan `preHandler: app.requireRole([...])` secara eksplisit; tidak ada "default allow".
- `requireAuth` saja (tanpa role) berarti route hanya butuh user login (misal `GET /auth/me`).
- Tenant isolation: `tenant_id` eksplisit di setiap query (lihat `.claude/rules/database.md`).

## Admin Panel (platform admin)

- Route `/admin/*` TIDAK dicek dengan role tenant. Diproteksi `app.requirePlatformAdmin` yang baca `users.is_platform_admin = true`.
- Setiap mutasi admin WAJIB masuk `audit_logs` dengan `severity: 'warn' | 'critical'` (contoh: suspend tenant → `critical`).
- Impersonation (opsional) harus menghasilkan audit terpisah tiap event, bukan sekadar switch tenant.
