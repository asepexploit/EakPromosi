# Rule — Product

**Baca `.claude/product-spec.md` sebagai sumber kebenaran produk** sebelum merancang modul atau mengambil keputusan domain. Rule ini hanya memuat ringkasan non-negotiable + alat ukur konsistensi.

## Non-negotiables

1. **Subscription-only.** Tidak boleh ada: wallet, balance credit, `balance` kolom di tenant, pemotongan credit per operasi, top-up. Enforcement pemakaian = batas paket (jumlah akun, kuota harian).
2. **Groups ↔ Memberships dipisah.** `groups` unik by `telegram_chat_id`; `group_memberships` relasi N:M dengan akun. Jangan menyimpan `account_id` di tabel `groups`.
3. **Campaign bukan mesin kirim.** Campaign Management merencanakan; eksekusi lewat modul Broadcast (reuse). Jangan duplikasi logika kirim.
4. **Discovery tidak join otomatis dalam satu transaksi.** Discovery menghasilkan `discovered_links`; Join adalah modul & queue terpisah yang membacanya.
5. **Admin Panel terpisah.** Route `/admin/*`, middleware `requirePlatformAdmin` (dari `users.is_platform_admin`), bukan role tenant. UI dan API dipisah secara folder.
6. **Enforcement paket di API.** Setiap operasi berbatas (add account, create campaign, send broadcast, add discovery source) WAJIB memanggil `PlanService.enforce(...)` sebelum tindakan. Error dipetakan ke HTTP 402.
7. **Allow-promotion flag.** Broadcast hanya boleh ke `groups.allow_promotion = true` dan tidak ada di `group_exclusions`.
8. **Status enumerations** mengikuti nama di product-spec (lihat §2–§15). Jangan mengarang varian baru.

## Checklist konsistensi saat menambah fitur

- [ ] Modul mana (01–15)?
- [ ] Masuk section menu mana (WORKSPACE / AUTOMATION / MONITORING / BILLING / ADMIN)?
- [ ] Enforcement paket terkait? Panggil `PlanService.enforce` di titik mana?
- [ ] Audit log diperlukan? Tambah di `audit_logs`.
- [ ] Admin-only? → route `/admin/*` + `requirePlatformAdmin`.
- [ ] Idempotency diperlukan? → `processed_jobs` atau unique constraint.
- [ ] Status enum sudah ada di spec? Jika belum, update spec dulu, baru kode.

## Jika kebutuhan baru menyentuh non-negotiable di atas

Berhenti. Konfirmasi dengan pengguna sebelum menulis kode — perubahan ini mengubah model produk, bukan sekadar fitur.
