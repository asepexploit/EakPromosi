# .claude/ — Konfigurasi Claude Code untuk EakPromosi

Konfigurasi lokal proyek untuk Claude Code. Isi direktori:

| Path | Fungsi |
|---|---|
| `settings.json` | Permissions, env, dan preferensi harness untuk repo ini. |
| `product-spec.md` | **Sumber kebenaran produk** — menu, modul, perilaku fitur, batas paket, status enum. |
| `rules/` | Rules modular. Muat per konteks tugas (lihat `CLAUDE.md` §8). |
| `commands/` | Slash commands khusus proyek (lihat `commands/README.md`). |
| `skills/` | Skills proyek (lihat `skills/README.md`). |

**Prinsip:**

* Satu rule, satu topik. Hindari duplikasi.
* Rules yang tidak dipakai → hapus, jangan dibiarkan.
* Perubahan `settings.json` harus dibahas dulu — ia memengaruhi semua kontributor.
