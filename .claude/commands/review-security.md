---
description: Review perubahan untuk isu keamanan khusus EakPromosi (secrets, tenant isolation, Telegram session, webhook signature).
---

Langkah:

1. Baca `.claude/rules/security.md` + `.claude/rules/payment.md` + `.claude/rules/telegram.md`.
2. Jalankan `git diff` (atau diff target dari $ARGUMENTS).
3. Periksa checklist:
   * Secret / token hardcoded? → fail.
   * Query Prisma tanpa `tenantId` pada tabel bisnis? → fail.
   * Session MTProto disimpan plain? → fail.
   * Webhook tanpa verifikasi signature + idempotency? → fail.
   * Logger mencetak password / session / isi DM? → fail.
   * Endpoint sensitif tanpa rate-limit? → warn.
   * RBAC decorator hilang? → fail.
4. Laporkan temuan dengan `file:line`. Jangan auto-fix tanpa izin.
