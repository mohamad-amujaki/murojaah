# Product Requirements Document (PRD) — Murojaah

Referensi bisnis: [BRD.md](BRD.md). Referensi teknis: [TECH.md](TECH.md), [ERD.md](ERD.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 1. Ringkasan Produk
Murojaah adalah PWA hafalan Al-Qur'an dengan 5 halaman utama: **Beranda**, **Latihan**, **Pencapaian**, **Dashboard** (adaptif per peran), dan **Profil**. Navigasi berbasis hash (`#home`, `#practice`, dst.), single-page app tanpa reload.

## 2. Fitur (berdasarkan implementasi UI saat ini di [src/main.tsx](../src/main.tsx))

### 2.1 Beranda (Home)
- Sapaan personal + info streak.
- Kartu "lanjutkan hafalan" (progress surah terakhir) dengan CTA mulai latihan.
- Target harian (goals): hafal N ayat, ulangi N kali, latihan N menit — dengan progress bar.
- Daftar tugas dari guru (assignment) — *tampilan saja, data statis*.
- Grafik aktivitas mingguan (menit latihan per hari).
- Pesan dukungan dari orang tua dengan tombol balas — *tampilan saja, belum terhubung ke backend*.

### 2.2 Latihan (Practice)
**Tahap pemilihan:**
- Cari & pilih surah dari daftar (saat ini hanya Al-Ikhlas yang fungsional, sisanya "segera tersedia").
- Atur rentang ayat (mulai–sampai), jumlah pengulangan (1/3/5/10/∞), kecepatan audio (0.75×/1×/1.25×).
- Data ayat diambil dari `/api/quran/surah/:id` (proxy ke EQuran.id), fallback ke data lokal jika gagal.

**Tahap latihan:**
- Pemutaran audio per ayat berurutan, auto-lanjut ke ayat berikut, auto-loop ulang sesuai jumlah pengulangan.
- Kontrol: sebelumnya/berikutnya ayat, play/pause, ubah kecepatan saat berjalan.
- Mode "sembunyikan ayat" untuk melatih ingatan (hide teks Arab/latin/arti).
- Penilaian mandiri "mastery" ayat: Belum hafal / Perlu latihan / Sudah hafal.
- Selesaikan sesi → `POST /api/practice/complete` → dapat +35 XP, tersimpan ke DB (atau notifikasi "tersimpan di perangkat" bila gagal/offline).

### 2.3 Pencapaian (Achievements)
- Kartu level (ring progress, XP menuju level berikutnya).
- Statistik: streak, ayat dikuasai, total pengulangan, waktu latihan.
- Koleksi badge (terbuka/terkunci).
- Riwayat aktivitas terbaru. — *seluruh data statis di UI saat ini.*

### 2.4 Dashboard (adaptif per peran)
- **Murid**: ringkasan belajar.
- **Guru**: dashboard kelas — tabel progres murid (cari murid, progress juz 30, streak, status), ringkasan kelas (donut chart target selesai), tombol buat tugas & unduh laporan.
- **Orang Tua**: perkembangan anak, tombol kirim dukungan.
- **Admin**: pusat kendali (statistik pengguna agregat).
- Peran dipilih manual lewat dropdown di topbar (belum berbasis akun/login sungguhan).

### 2.5 Profil
- Edit nama tampilan, target latihan harian.
- Preferensi tampilan ayat: ukuran teks Arab, tampilkan/sembunyikan transliterasi & terjemahan.
- Statistik ringkas (XP, streak, ayat dikuasai).

### 2.6 Lintas Fitur
- Deteksi status online/offline dengan indikator di topbar.
- Service worker terdaftar untuk dukungan PWA/offline ([public/sw.js](../public/sw.js)).
- Error boundary aplikasi dengan opsi "muat ulang & bersihkan cache".
- Toast notifikasi untuk aksi pengguna.
- Desain responsif: sidebar (desktop) berubah jadi bottom-nav (mobile).

## 3. Non-Functional Requirements
- **Aksesibilitas**: label ARIA pada tombol ikon, `aria-label`, dukungan `prefers-reduced-motion`, focus ring pada elemen interaktif.
- **Resiliensi jaringan**: fallback ayat statis bila API Quran gagal; sesi latihan tetap "berhasil" secara UX walau penyimpanan backend gagal.
- **Keamanan dasar**: header `x-content-type-options`, `referrer-policy` pada respons API; validasi input pada endpoint penyelesaian sesi.
- **Performa**: caching respons surah (`cache-control: public, max-age=3600, stale-while-revalidate=86400`).

## 4. Gap / Belum Diimplementasikan (untuk roadmap)
Skema database sudah menyediakan struktur untuk fitur berikut, namun **belum ada endpoint API atau autentikasi** yang mengimplementasikannya — UI terkait masih data statis:
- Login/autentikasi & manajemen banyak pengguna nyata.
- CRUD kelas (`classes`, `class_members`) dan join-code kelas.
- CRUD tugas/assignment guru→murid/kelas.
- Relasi orang tua–anak (`parent_children`) dan pengiriman pesan dukungan (`encouragements`) yang benar-benar tersimpan.
- Pelacakan penguasaan ayat per pengguna (`ayah_progress`) — UI mastery belum menulis ke tabel ini.
- Badge & perolehan badge (`badges`, `user_badges`) — belum ada logika pemberian badge otomatis.

## 5. Out of Scope
- Aplikasi mobile native.
- Pembayaran/monetisasi.
- Multi-bahasa (UI saat ini berbahasa Indonesia saja).
