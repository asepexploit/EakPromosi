# .claude/rules/

Rules modular. Muat **hanya** yang relevan untuk tugas aktif.

| File | Kapan dimuat |
|---|---|
| `product.md` | **Wajib** untuk keputusan domain/fitur. Non-negotiables produk + rujukan ke `.claude/product-spec.md`. |
| `architecture.md` | Setiap perubahan lintas-service / struktur modul. |
| `coding.md` | Setiap kali menulis TypeScript. |
| `security.md` | Auth, sesi, secrets, webhook, enkripsi. |
| `database.md` | Perubahan skema, query, migrasi. |
| `api.md` | Menambah/mengubah route Fastify. |
| `queue.md` | Menambah/mengubah job BullMQ. |
| `telegram.md` | **Wajib** untuk apa pun yang menyentuh GramJS/Telegraf. |
| `payment.md` | **Wajib** untuk apa pun yang menyentuh Pakasir/subscriptions. |
| `testing.md` | Menulis / memperbarui test. |
| `deployment.md` | Dockerfile, compose, env, release. |

**Referensi desain UI** (bukan rule, tapi wajib dilihat untuk tugas `apps/web`): `docs/design/ui-design-system.md` + `docs/design/prototype/`.
