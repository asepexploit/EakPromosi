# .claude/commands/

Slash command khusus proyek. Panggil via `/<nama>` di Claude Code.

| Command | Fungsi |
|---|---|
| `/plan-feature <fitur>` | Rencana implementasi fitur sebelum coding. |
| `/add-prisma-model <nama + field>` | Tambah model Prisma dengan konvensi tenant/timestamps. |
| `/add-api-route <METHOD path>` | Scaffolding route Fastify (modul + Zod schema + test). |
| `/add-worker-job <queue.action>` | Scaffolding job BullMQ (idempotent + retry + flood-wait aware). |
| `/review-security` | Review diff khusus isu keamanan EakPromosi. |

Tiap command memuat rules relevan sendiri — pengguna tidak perlu menyebutkannya.
