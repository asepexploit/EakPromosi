# .claude/skills/

Skills khusus proyek. Format: `<nama>/SKILL.md` dengan frontmatter `name` + `description`.

| Skill | Dimuat ketika |
|---|---|
| `telegram-safety` | Menyentuh `apps/worker/src/telegram/*` (GramJS/Telegraf). |
| `pakasir-webhook` | Menyentuh `apps/api/src/modules/webhooks/` atau `apps/worker/src/queues/billing/`. |

Tambahkan skill baru hanya jika domain tersebut punya pola berulang + rawan kesalahan. Jangan jadikan tempat sampah dokumentasi — itu tugas `docs/`.
