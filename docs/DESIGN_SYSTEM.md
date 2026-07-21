# Design System — HafizAyat

Sumber: [src/styles.css](../src/styles.css), [index.html](../index.html). Styling murni CSS kustom (tanpa komponen desain terpisah/Storybook); dokumen ini menstandarkan token yang sudah dipakai di kode agar konsisten saat menambah UI baru.

## 1. Filosofi
- Hangat, tenang, "islami-modern": hijau tua sebagai warna identitas, aksen emas untuk pencapaian/highlight, krem sebagai latar netral.
- Kepadatan informasi tinggi tapi rapi (dashboard, kartu statistik) dengan tipografi kecil (9–13px pada teks sekunder) dan white space konsisten lewat border-radius besar (10–22px).
- Animasi halus, dihormati preferensi pengguna (`prefers-reduced-motion` mematikan semua animasi/transisi).

## 2. Warna
Didefinisikan sebagai CSS custom properties di `:root`:

| Token | Hex | Penggunaan |
| --- | --- | --- |
| `--green` | `#106b55` | Warna primer/brand — tombol utama, ikon aktif, progress bar |
| `--deep` | `#084b3c` | Hijau lebih gelap — gradient hero, toast background |
| `--mint` | `#e8f4ef` | Latar lembut untuk elemen aktif/ikon (hijau muda) |
| `--cream` | `#f8f7f2` | Latar belakang utama aplikasi |
| `--gold` | `#e7aa33` | Aksen pencapaian/XP/highlight |
| `--ink` | `#18332c` | Warna teks utama |
| `--muted` | `#70817c` | Teks sekunder/deskripsi |
| `--line` | `#e2e9e5` | Border/divider |

Warna kontekstual tambahan (dipakai inline per komponen, belum ditokenkan — kandidat token baru bila dipakai berulang):
- Oranye pencapaian/streak: `#f0884d`, `#ee864a`, `#f08d67`
- Ungu (goal ketiga): `#8469bd`
- Merah/peringatan offline: `#a64c3b`
- Status "perlu perhatian": `#a87315` di atas `#fff3dc`
- Status "baik/sesuai target": `var(--green)` di atas `var(--mint)`

## 3. Tipografi
- Font UI: **Manrope** (400/500/600/700/800), fallback `system-ui, sans-serif`.
- Font Arab: **Noto Naskh Arabic** (500/600), dipakai khusus di kelas `.arabic` untuk teks ayat.
- Skala umum: judul halaman 22–29px (`h1`), judul kartu 13–17px (`h2`/`h3`), body/label 9–13px, mikro-copy (eyebrow, badge count) 7–10px dengan letter-spacing lebar (1–1.5px) dan huruf kapital.
- Teks Arab: `font-size: 40px` (28–32px di layar sempit), `line-height: 2` untuk keterbacaan tajwid.

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
Tiga breakpoint utama (mobile-first dari breakpoint terbesar ke terkecil, sesuai urutan di CSS):
- **Desktop (>1000px)**: sidebar tetap 254px di kiri, konten `margin-left: 254px`, topbar sticky.
- **Tablet (≤1000px)**: sidebar jadi drawer (`transform: translateX(-100%)`, dibuka via `.sidebar.open` + backdrop), grid dashboard/goals menyesuaikan jadi 1–2 kolom.
- **Mobile (≤680px)**: sidebar sepenuhnya diganti **bottom navigation** tetap (`.bottom-nav`, 4 item pertama dari `nav`), padding & font-size diperkecil, beberapa tabel berubah jadi grid 2 kolom tanpa header.

Container konten dibatasi `max-width: 1280px`, padding horizontal responsif `5vw` (desktop) turun ke `14px` (mobile).

## 8. Motion
- Masuk halaman: `page-in` (fade) pada `.content`, `rise-in` (fade+translateY 14px) pada tiap section dengan delay bertingkat (0, 0.06s, 0.1s) untuk efek staggered.
- Hover kartu/tombol: translateY -2px sampai -3px + shadow, transisi 0.2–0.25s ease.
- Elemen dekoratif hero: `float-art` mengambang halus (4.5s loop).
- **Aturan wajib**: seluruh animasi/transisi dinonaktifkan total via `@media (prefers-reduced-motion: reduce)` — pertahankan aturan ini di semua penambahan animasi baru.

## 9. Aksesibilitas
- Semua tombol ikon-saja punya `aria-label` (mis. "Tutup menu", "Ayat sebelumnya", "Notifikasi").
- Focus ring kustom: outline emas 3px dengan opacity, `outline-offset: 2px`, diterapkan ke `button`, `input`, `select`.
- Kontras: teks utama `--ink` (#18332c) di atas `--cream` (#f8f7f2) — rasio tinggi; teks muted digunakan hanya untuk info sekunder, bukan konten esensial.
- Bahasa dokumen: `lang="id"` di `index.html`.

## 10. Prinsip Saat Menambah UI Baru
- Gunakan token warna yang sudah ada (`var(--green)`, dst.) alih-alih hex baru, kecuali memang warna kontekstual baru (lalu pertimbangkan menambah token jika dipakai >1 tempat).
- Ikuti pola radius besar + border tipis `--line` untuk permukaan kartu baru, agar konsisten dengan bahasa visual yang sudah mapan.
- Sertakan `aria-label` untuk setiap tombol ikon-saja baru, dan jangan menambah animasi yang tidak tunduk pada `prefers-reduced-motion`.
