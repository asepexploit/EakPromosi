# UI Design System — EakPromosi Web

Acuan tampilan untuk `apps/web`. Dokumen ini menjelaskan **bagaimana dashboard terlihat dan terasa** supaya siapa pun (termasuk Claude di editor) bisa membangun UI yang konsisten tanpa menebak.

> Sumber visual: prototipe desain dashboard pelanggan. Token warna di dokumen ini sudah diterjemahkan ke `apps/web/tailwind.config.ts` dan `apps/web/src/styles/tailwind.css`. Jika ada perbedaan, **file Tailwind yang menang** (itu yang dipakai runtime).

Ruang lingkup: hanya panel pelanggan (tenant). Admin Panel (modul 15) punya tata letak sendiri dan tidak dibahas di sini.

---

## 1. Prinsip visual

- **Bersih, profesional, padat informasi.** Banyak angka dan tabel, jadi hierarki dan spacing harus rapi — bukan dekoratif.
- **Satu aksen:** biru Telegram. Dipakai untuk aksi utama, status aktif, dan tautan. Warna lain hanya untuk status (ok/warn/bad) dan satu aksen sekunder (violet) untuk metrik tertentu.
- **Mode terang & gelap** lewat token. Jangan pernah hardcode warna hex di komponen — selalu pakai token Tailwind (`bg-panel`, `text-muted`, dst).
- **Mobile sampai desktop.** Sidebar penuh di desktop, menyusut jadi ikon, lalu jadi nav atas di layar sempit.

---

## 2. Token warna (RGB channel, sudah ada di `tailwind.css`)

| Token Tailwind | Peran | Light | Dark |
|---|---|---|---|
| `bg` | Latar halaman | `248 250 252` | `10 15 23` |
| `panel` | Latar kartu/panel | `255 255 255` | `16 23 34` |
| `sunk` | Latar cekung (input, cell) | `243 246 249` | `13 19 29` |
| `fg` | Teks utama | `15 23 42` | `226 232 240` |
| `muted` | Teks sekunder | `100 116 139` | `148 163 184` |
| `line` | Garis & border | `226 232 240` | `35 47 64` |
| `tg` | Aksen biru Telegram | `42 171 238` | sama |
| `tg-ink` | Biru untuk teks di atas panel | `21 120 189` | `125 208 251` |
| `tg-deep` | Biru gradien gelap | `30 136 214` | sama |
| `ok` / `warn` / `bad` | Status | hijau / oranye / merah | versi lebih terang |
| `violet` | Aksen metrik sekunder | `124 108 242` | `167 155 255` |

Pakai via `bg-tg`, `text-tg-ink`, `border-line`, `text-ok`, dll. Untuk opasitas: `bg-tg/10`, `text-muted/70`.

---

## 3. Tipografi

- **Font:** Inter (dengan fallback Geist → system). Sudah di-load di `index.html`.
- **Angka:** selalu `tabular` (`font-variant-numeric: tabular-nums`) agar kolom angka lurus. Ada utility `.tabular`.
- **Skala:**
  - Judul halaman: ~24px, bold (`text-2xl font-bold tracking-tight`).
  - Angka besar (KPI): ~28px, bold, `tracking-tight`.
  - Judul kartu / section: ~14.5px, semibold.
  - Body: 14px. Caption/meta: 12–12.5px, `text-muted`.
- **Case:** sentence case untuk label dan judul (bukan ALL CAPS), kecuali label kecil uppercase di header tabel.

---

## 4. Tata letak aplikasi

```
┌──────────┬─────────────────────────────────────────┐
│          │  Topbar: breadcrumb · search (⌘K) ·      │
│ Sidebar  │          status engine · notif · avatar   │
│          ├─────────────────────────────────────────┤
│ (nav)    │                                           │
│          │  Konten halaman (max-width ~1440px,       │
│          │  padding 26–28px, animasi fade-up)        │
└──────────┴─────────────────────────────────────────┘
```

### Sidebar (kiri, ~252px)
- Logo + nama produk di atas.
- Pemilih workspace (tenant).
- Navigasi dikelompokkan dengan label section: **WORKSPACE**, **AUTOMATION**, **MONITORING**, **BILLING & ACCOUNT** (urutan modul mengikuti `.claude/product-spec.md §1`).
- Item nav aktif: latar `panel`, teks `fg`, garis aksen `tg` di kiri. Item non-aktif: teks `muted`, hover beri latar tipis.
- Badge angka di kanan item (mis. jumlah campaign berjalan, pending). Badge bisa berwarna status (merah untuk masalah).
- Di bawah: kartu ringkasan langganan (paket + sisa hari) → tautan ke modul Subscription.
- **Responsif:** < 1020px jadi rail ikon saja; < 720px jadi baris nav horizontal yang bisa di-scroll di atas.

### Topbar (sticky, tinggi ~64px, latar blur)
- Breadcrumb: `Workspace › Section` lalu judul halaman besar.
- Tombol search (buka command palette, pintasan `Ctrl/⌘ K`).
- Pil status mesin automation (titik berdenyut + label).
- Ikon notifikasi (dengan titik merah bila ada yang belum dibaca).
- Avatar pengguna (buka menu profil).

---

## 5. Komponen inti (bangun di `src/components/ui/` sebagai wrapper Radix + Tailwind)

| Komponen | Catatan tampilan |
|---|---|
| **Card** | `bg-panel`, `border border-line`, `rounded-2xl`, `shadow-card`. Header: judul semibold + sub `text-muted`. Opsi footer dengan border atas tipis. |
| **KPI tile** | Label kecil + ikon kotak beraksen; angka besar `tabular`; baris bawah untuk delta (naik/turun) + konteks ("vs 7 hari lalu"). Delta hijau bila baik, merah bila buruk, dengan ikon panah. |
| **Button** | Varian: `primary` (gradien biru Telegram, teks putih), default (panel + border), `ghost`, `danger`, `danger-solid`, `warn`. Ukuran: `sm`, `xs`, dan icon-only. State loading pakai ikon spinner. Pakai `class-variance-authority`. |
| **Badge** | Pil kecil dengan titik di depan. Warna: `ok`/`warn`/`bad`/`info`(biru)/`violet`/netral. Varian `live` dengan titik berdenyut. |
| **Progress bar** | Tinggi 6px, rounded. Varian warna + varian "striped" beranimasi untuk proses berjalan. |
| **Ring/donut** | Lingkaran progres pakai `conic-gradient` untuk skor kesehatan / persentase. |
| **Table** | Header `text-muted` kecil uppercase, sticky saat scroll. Baris hover beri latar tipis, baris klik → buka detail. Sel angka rata kanan + `tabular`. Dukung sort (klik header) dan search. |
| **Dialog/Modal** | Radix Dialog. **Harus center** (horizontal & vertikal), tinggi mengikuti isi, maks `100vh - 32px`, backdrop blur. Header (ikon + judul + tombol tutup), body scroll, footer aksi. |
| **Dropdown menu** | Radix DropdownMenu, item dengan ikon kiri, pemisah, item danger merah. |
| **Toast** | Pojok kanan bawah, latar gelap, ikon status berwarna, opsi tombol aksi ("Urungkan"). |
| **Tooltip** | Radix Tooltip, latar gelap, teks kecil. |
| **Tabs** | Garis bawah aktif beraksen `tg`. |
| **Switch / Chip / Input / Select / Textarea / Range** | Gaya form konsisten: tinggi ~36–38px, `rounded-xl`, fokus cincin `tg`. Chip = pil yang bisa aktif (filter). |
| **Empty state** | Ikon dalam kotak beraksen tipis, judul, deskripsi, tombol aksi. |
| **Skeleton** | Utility `.skeleton` (shimmer) saat loading, bukan spinner. |

Ikon: **lucide-react** (sudah di dependency). Ukuran default 16px, stroke ~1.85.

---

## 6. Grafik (`src/components/charts/`)

- Prototipe memakai d3. Untuk `apps/web`, boleh d3 langsung atau pustaka chart ringan — yang penting **warna dari token** dan **tooltip di dalam area chart**.
- Pola: bar untuk hitungan per hari/jam (berhasil vs gagal, bisa stacked), line untuk rasio/tren, sparkline kecil di KPI, horizontal bar untuk breakdown (mis. penyebab gagal).
- Jam/hari berjalan disorot dengan warna lebih pekat.
- Sumbu & gridline tipis pakai `line`/`muted`; label `muted` ukuran caption.

---

## 7. Pola status (ikuti enum di `packages/shared`, jangan mengarang varian)

- **Akun Telegram** (`TelegramAccountStatus`): `active`=hijau, `warming`=biru, `flood_wait`=oranye, `disconnected`=merah, `banned`=merah, `error`=merah.
- **Campaign** (`CampaignStatus`): `draft` netral, `scheduled` biru, `running` hijau+live, `paused` oranye, `completed` violet, `failed` merah, `archived` netral.
- **Langganan** (`SubscriptionStatus`): `active` hijau, `pending` oranye, `expired` merah, `canceled` netral.
- **Invoice/pembayaran** (`InvoiceStatus`): `pending` oranye, `paid` hijau, `expired` netral, `failed` merah.
- **Job join** (`JoinJobStatus`) & **link** (`LinkStatus`): petakan ke ok/warn/bad/netral sesuai makna.

Label badge dalam Bahasa Indonesia; nilai internalnya tetap enum di `packages/shared`.

---

## 8. Peta halaman → modul

Halaman web mengikuti `.claude/product-spec.md §18`. Direktori di `apps/web/src/pages/` dan section sidebar:

| Section | Halaman (pages/*) | Modul |
|---|---|---|
| WORKSPACE | `dashboard`, `accounts`, `inventory` | 01, 02, 05 |
| AUTOMATION | `discovery`, `membership`, `broadcasts`, `campaigns`, `dm` | 03, 04, 06, 07, 08 |
| MONITORING | `monitoring`, `queue`, `reports` | 09, 10, 11 |
| BILLING & ACCOUNT | `billing/plans`, `billing/history`, `settings` | 12, 13, 14 |

Billing adalah **subscription-only**: tampilkan paket Free/Pro/Business, status langganan, pemakaian vs batas paket, dan riwayat pembayaran Pakasir. **Tidak ada** UI wallet, saldo, atau top-up kredit (lihat `.claude/rules/product.md`).

---

## 9. Aturan interaksi

- Semua state server lewat TanStack Query; Zustand hanya untuk UI-state (modal, filter, draft). Lihat `apps/web/README.md`.
- Web **tidak pernah** memanggil Telegram/Pakasir langsung — hanya REST/WS ke `apps/api`.
- Saat API membalas **402** (batas paket), tangkap dan tampilkan modal upgrade, bukan toast error biasa.
- Micro-interaction halus: fade-up saat halaman masuk, transisi hover, denyut untuk status live. Hormati `prefers-reduced-motion` (sudah ada di `tailwind.css`).
- Sediakan loading state (skeleton), empty state, dan error state untuk setiap daftar/tabel.

---

## 10. Catatan untuk implementasi

- Prototipe asli berjalan di runtime khusus (artifact claude.ai) dan memuat data lewat API runtime itu. Di `apps/web`, data datang dari TanStack Query → `apps/api` (atau mock in-memory saat `VITE_USE_MOCKS=true`).
- Bangun komponen `ui/` dulu, lalu halaman per modul, mulai dari Dashboard (01).
- Jangan menyalin logika simulasi dari prototipe. Bangun ulang di atas data asli/mock yang terketik dari `packages/shared`.
