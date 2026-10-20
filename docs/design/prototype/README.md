# Prototipe Dashboard — Referensi Desain (BUKAN kode produksi)

Folder ini berisi **kode lengkap prototipe** dashboard pelanggan EakPromosi, disimpan sebagai **referensi visual & interaksi** untuk membangun `apps/web`. Buka `index.html` + file-file di bawah untuk melihat persis tampilan dan perilaku tiap halaman, lalu bangun ulang di stack resmi (React + Vite + Tailwind + Radix).

> Ringkasan sistem desain (token, komponen, aturan) ada di `../ui-design-system.md`. Dokumen itu dan `../../.claude/product-spec.md` yang menang bila ada perbedaan.

## Penting

- **Ini mockup front-end dengan data palsu.** Tidak ada koneksi nyata ke Telegram atau Pakasir. "Automation" di sini hanya **simulasi di browser** (loop `setInterval` dengan data dummy) untuk memperlihatkan tampilan — bukan mesin yang benar-benar mengirim apa pun.
- **Jangan di-build / di-deploy.** File ini dibuat untuk runtime artifact claude.ai dan memakai API khusus runtime itu (`dash.data`, `dash.calc`, `dash.onData`) yang tidak ada di luar sana. Jadi tidak akan jalan apa adanya.
- **Jangan salin logika simulasinya** (terutama di `app2.js`). Ambil hanya **desain, struktur komponen, dan alur UI**. Data asli harus datang dari `apps/api` lewat TanStack Query, terketik dari `packages/shared`.
- **Patuhi arah produk resmi.** Beberapa layar prototipe menggambarkan automasi berbasis akun userbot (auto-discovery → auto-join → broadcast massal ke grup orang lain). Arah implementasi yang disepakati memakai **Bot API untuk channel/grup yang dikelola pelanggan sendiri**, bukan join otomatis ke grup pihak lain. Saat membangun ulang, ikuti `.claude/product-spec.md` + `.claude/rules/*`, bukan sekadar meniru layar prototipe.

## Peta file

| File | Isi |
|---|---|
| `index.html` | Shell: sidebar, topbar, kerangka halaman. |
| `app.css` | Seluruh design token + komponen (sumber token di `../ui-design-system.md`). |
| `ui.js` | Kit UI: ikon (Lucide), format angka/tanggal (id-ID), modal, toast, dropdown, badge, helper status. |
| `charts.js` | Grafik d3 (bar, line, sparkline, horizontal bar). |
| `pages1.js` | Overview, Live Monitoring, Campaign, Akun Telegram. |
| `pages2.js` | Auto Broadcast (builder + template), Statistik & Laporan. |
| `pages3.js` | Auto-Detect Link, Auto-Join, Auto-Reply. |
| `pages4.js` | Langganan & Paket (status, upgrade/downgrade, aturan kedaluwarsa). |
| `pages5.js` | Riwayat Pembayaran (alur Pakasir, verifikasi, idempotensi, rekonsiliasi). |
| `app2.js` | State, simulasi, navigasi, command palette, semua aksi tombol. |
| `data/*.json` | Data dummy (semua diawali "Sample"): akun, grup, campaign, pembayaran, dll. |

## Cara melihatnya

Karena bergantung pada runtime artifact, cara termudah melihat tampilan aslinya adalah lewat link artifact yang Anda punya. Kode di sini dipakai untuk **membaca implementasi** — mis. "bagaimana KPI tile disusun", "bagaimana modal pembayaran Pakasir dirangkai", "bagaimana tabel bisa di-sort" — lalu diterjemahkan ke komponen React yang rapi dan terketik.

## Urutan membangun ulang (saran)

1. Komponen `ui/` (Card, Button, Badge, Table, Dialog, Toast, dll) — rujuk `ui.js` + `app.css`.
2. Layout (sidebar + topbar) — rujuk `index.html` + `app2.js` bagian shell/navigasi.
3. Halaman per modul mulai dari Dashboard (01), pakai data mock dulu (`VITE_USE_MOCKS=true`).
4. Ganti mock dengan panggilan `apps/api` saat endpoint siap.
