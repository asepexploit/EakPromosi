# RBAC Matrix

Role per tenant. Satu user bisa anggota beberapa tenant dengan role berbeda.
**Platform admin** adalah flag terpisah (`users.is_platform_admin`), BUKAN role tenant. Admin Panel punya auth middleware sendiri (`requirePlatformAdmin`).

| Capability | owner | admin | operator | viewer |
|---|---|---|---|---|
| Lihat dashboard | ✓ | ✓ | ✓ | ✓ |
| Kelola member & role | ✓ | — | — | — |
| Billing lihat | ✓ | ✓ | parsial | — |
| Billing bayar | ✓ | ✓ | — | — |
| Akun Telegram CRUD | ✓ | ✓ | ✓ | — |
| Campaign CRUD | ✓ | ✓ | ✓ | — |
| Broadcast start/stop | ✓ | ✓ | ✓ | — |
| Lihat laporan | ✓ | ✓ | ✓ | ✓ |
| Export CSV | ✓ | ✓ | ✓ | — |
| Hapus tenant | ✓ | — | — | — |

Enforcement:

* Decorator Fastify: `fastify.authorize('campaign:write')`.
* Mapping role→permission di `apps/api/src/plugins/rbac/permissions.ts`.
