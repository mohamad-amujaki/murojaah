# Design System — Murojaah

Sumber: [apps/web/src/app.css](../apps/web/src/app.css), [apps/web/index.html](../apps/web/index.html). Styling menggunakan Tailwind CSS v4 (`@tailwindcss/vite`) dengan `@theme` tokens + `@layer components` untuk CSS kustom; dokumen ini menstandarkan token yang sudah dipakai di kode agar konsisten saat menambah UI baru.

## 1. Filosofi
- Hangat, tenang, "islami-modern": hijau tua sebagai warna identitas, aksen emas untuk pencapaian/highlight, krem sebagai latar netral.
- Kepadatan informasi tinggi tapi rapi (dashboard, kartu statistik) dengan tipografi kecil (minimum 10.5px pada teks sekunder — `text-xs` pada base 14px, lihat §3) dan white space konsisten lewat border-radius besar (10–22px).
- Animasi halus, dihormati preferensi pengguna (`prefers-reduced-motion` mematikan semua animasi/transisi).

## 2. Warna
Didefinisikan sebagai CSS custom properties di `:root` (light) dan `[data-theme="dark"]` (dark). Tailwind v4 dari `@theme`:

| Token | Light | Dark | Penggunaan |
| --- | --- | --- | --- |
| `--green` | `#106b55` | `#106b55` | Primer/brand — tombol utama, ikon aktif, progress bar |
| `--deep` | `#084b3c` | — | Hijau lebih gelap — gradient hero, toast |
| `--mint` | `#e8f4ef` | — | Latar lembut elemen aktif/ikon |
| `--cream` | `#f8f7f2` | — | Latar belakang utama (dark: `#0e1613`) |
| `--gold` | `#e7aa33` | — | Aksen pencapaian/XP/highlight |
| `--ink` | `#18332c` | `#d6e0db` | Teks utama (dark: 12.5:1 di `#0e1613`) |
| `--muted` | `#42524c` | `#8a9d96` | Teks sekunder (dark: 6.7:1) |
| `--line` | `#d3ddd7` | `#2d3f38` | Border/divider |
| `--surface` | `#fff` | `#1a2622` | Latar kartu/sheet |

Token light/dark konsisten via CSS custom properties — kelas `text-ink`, `text-muted`, `border-line`, `bg-surface` otomatis menyesuaikan tanpa per-element override.

Warna kontekstual tambahan (dipakai inline per komponen, belum ditokenkan — kandidat token baru bila dipakai berulang):
- Oranye pencapaian/streak: `#f0884d`, `#ee864a`, `#f08d67`
- Ungu (goal ketiga): `#8469bd`
- Merah/peringatan offline: `#a64c3b`
- Status "perlu perhatian": `#a87315` di atas `#fff3dc`
- Status "baik/sesuai target": `var(--green)` di atas `var(--mint)`

## 3. Tipografi
- Base: `html { font-size: 87.5% }` → 1rem = 14px.
- Font UI: **Manrope** (400/500/600/700/800), fallback `system-ui, sans-serif`.
- Font Arab: **Noto Naskh Arabic** (500/600), dipakai khusus di kelas `.arabic` untuk teks ayat.
- Skala (setelah base 14px):
  - `text-[10px]` (mikro: eyebrow, badge count) — kapital + letter-spacing lebar
  - `text-xs` = 10.5px — label, metadata, navigasi
  - `text-sm` = 12.25px — deskripsi pendek
  - `text-base` = 14px — body copy utama
  - `text-lg` = 15.75px — heading kartu
  - `text-xl` = 17.5px — judul halaman mobile
  - `text-2xl` = 21px — judul section
- Teks Arab: `font-size: 40px` (36px tablet, 32px mobile), `line-height: 1.8` untuk keterbacaan tajwid.

## 4. Spacing & Radius
- Radius kecil (tombol ikon, chip): 7–11px.
- Radius kartu: 13–22px.
- Radius penuh (avatar, tombol bulat, badge lingkaran): `50%`.
- Padding kartu standar: `20px`; kartu besar (hero, level card): `25–38px`.
- Grid gap standar antar elemen: `12–18px`.

## 5. Komponen Kunci
| Komponen | Kelas CSS | Karakteristik |
| --- | --- | --- |
| Tombol primer | `.primary` | Hijau solid, teks putih, radius 11px, hover naik 2px + shadow, varian `.light` (putih di atas hero gelap) |
| Tombol outline | `.outline` | Border tipis, background putih, teks hijau |
| Kartu | `.card` | Putih, border `--line`, radius 16px, hover naik 3px + shadow lembut |
| Progress bar | `.progress > i` | Track abu (`#e6ece9`), isi hijau (varian gold/purple untuk goal berbeda) |
| Badge/pill | `.pill`, `.count`, `.nav-badge` | Radius penuh, teks kecil bold, warna kontekstual |
| Toggle switch | `.toggle` | Kustom (bukan native checkbox), 38×22px, thumb bergeser 16px saat aktif |
| Toast | `.toast` | Fixed bottom-right (bottom-center di mobile), latar `--deep`, animasi slide-in |
| Input pencarian | `.search` | Ikon + input inline dalam pill abu muda |
| Segmented control | `.segmented` | Grid tombol pilihan tunggal (loop count, kecepatan audio) dengan indikator aktif putih+shadow |

## 6. Ikonografi
- Library: **lucide-react**, ukuran konsisten 12–23px tergantung konteks (ikon inline teks: ~12–14px; ikon tombol utama: 16–20px; ikon avatar/statistik besar: 19–26px).
- Satu marka brand kustom: elemen `۞` (ornamen ayat Al-Qur'an) dipakai sebagai boot splash icon, bukan dari lucide.

## 7. Layout & Responsivitas
Breakpoint `max-width` menurun, dari umum ke spesifik:

| Viewport | Nav | Grid columns |
| --- | --- | --- |
| >1000px | Sidebar tetap 254px | goals-grid 4, badges 4, landing-features 4 |
| ≤1000px | Sidebar drawer + **bottom-nav** muncul | goals-grid 3, badges 3 |
| ≤900px | — | landing-features 2, landing-steps 1 |
| ≤860px | Auth page: visual ke atas, form ke bawah | — |
| ≤820px | — | landing-features 3, arabic 36px, heading turun |
| ≤680px | Sidebar diganti bottom-nav (4 item) | goals-grid 1, badges 2, semua grid single-col |
| ≤560px | Landing nav links sembunyi | landing-features 1, h1 28px |

Container konten padding horizontal `5vw` (desktop) → `14px` (mobile). Bottom-nav hadir di ≤1000px (bersamaan sidebar collapse), bukan hanya di mobile.

## 8. Motion
- Masuk halaman: `page-in` (fade) pada `.content`, `rise-in` (fade+translateY 14px) pada tiap section dengan delay bertingkat (0, 0.06s, 0.1s) untuk efek staggered.
- Hover kartu/tombol: translateY -2px sampai -3px + shadow, transisi 0.2–0.25s ease.
- Elemen dekoratif hero: `float-art` mengambang halus (4.5s loop).
- **Aturan wajib**: seluruh animasi/transisi dinonaktifkan total via `@media (prefers-reduced-motion: reduce)` — pertahankan aturan ini di semua penambahan animasi baru.

## 9. Aksesibilitas
- Semua tombol ikon-saja punya `aria-label` (mis. "Tutup menu", "Ayat sebelumnya", "Notifikasi").
- Focus ring kustom: outline emas 3px dengan opacity, `outline-offset: 2px`, diterapkan ke `button`, `input`, `select`.
- Kontras: token `--ink`/`--muted` dioverride di `[data-theme="dark"]` untuk menjaga rasio ≥4.5:1 (AA) di kedua tema. `--muted` saat ini 7.3:1 (light) dan 5.5:1 (dark) di atas latar masing-masing.
- Mode gelap: `[data-theme="dark"]` mendefinisikan ulang `--color-ink`, `--color-muted`, `--color-line`, `--color-surface` (lihat blok `[data-theme="dark"]` di `app.css`), toggle tersedia di topbar & Profil, tersimpan di `localStorage`.
- Bahasa dokumen: `lang="id"` di `index.html`.

## 10. Prinsip Saat Menambah UI Baru
- Gunakan token warna yang sudah ada (`var(--green)`, dst.) alih-alih hex baru, kecuali memang warna kontekstual baru (lalu pertimbangkan menambah token jika dipakai >1 tempat).
- Ikuti pola radius besar + border tipis `--line` untuk permukaan kartu baru, agar konsisten dengan bahasa visual yang sudah mapan.
- Sertakan `aria-label` untuk setiap tombol ikon-saja baru, dan jangan menambah animasi yang tidak tunduk pada `prefers-reduced-motion`.
