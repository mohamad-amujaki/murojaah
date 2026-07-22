# Business Requirements Document (BRD) — Murojaah

## 1. Latar Belakang

Murojaah adalah aplikasi web (PWA) untuk membantu proses hafalan (tahfiz) dan muraja'ah Al-Qur'an. Target pengguna adalah murid (penghafal), guru/ustazah, orang tua, dan admin, dalam konteks pembelajaran tahfiz baik individu maupun kelas (TPQ/sekolah tahfiz).

## 2. Tujuan Bisnis

- Meningkatkan konsistensi hafalan murid lewat sesi latihan terstruktur (surah, rentang ayat, jumlah pengulangan, audio murottal).
- Memberi guru visibilitas atas progres murid dan kemampuan memberi tugas (assignment) muraja'ah.
- Melibatkan orang tua dalam memantau dan memberi dukungan/encouragement pada progres anak.
- Mendorong motivasi lewat gamifikasi (XP, level, streak, badge/pencapaian).

## 3. Stakeholder & Peran Pengguna

| Peran | Kebutuhan Utama |
|---|---|
| Murid (student) | Latihan hafalan per ayat, memutar audio, menandai penguasaan ayat, melihat progres & pencapaian |
| Guru (teacher) | Mengelola kelas, memberi tugas, memantau progres murid |
| Orang Tua (parent) | Memantau progres anak, memberi pesan dukungan (encouragement) |
| Admin | Memantau statistik pengguna secara keseluruhan |

## 4. Ruang Lingkup Bisnis

### Termasuk (in-scope, sesuai desain skema data & UI saat ini)

- Manajemen sesi latihan hafalan (praktik per surah/ayat, loop, kecepatan audio).
- Pelacakan progres ayat per pengguna (mastery/penguasaan).
- Sistem kelas: guru membuat kelas, murid bergabung, guru memberi tugas ke kelas/murid.
- Relasi orang tua–anak dan fitur dukungan/pesan semangat.
- Gamifikasi: XP ledger, badge, streak, level.
- Dashboard berbeda per peran (murid, guru, orang tua, admin).

### Belum dalam scope implementasi saat ini (lihat [TECH.md](TECH.md) untuk gap detail)

- Autentikasi & otorisasi pengguna (belum ada; user id di-hardcode ke 1).
- CRUD kelas, tugas (assignment), badge, dan encouragement dari sisi backend (skema DB sudah ada, API belum ada).
- Multi-user nyata (dashboard/guru/ortu masih data statis di UI).

## 5. Manfaat Bisnis yang Diharapkan

- Retensi murid meningkat lewat gamifikasi dan streak harian.
- Keterlibatan orang tua meningkat lewat visibilitas progres anak.
- Guru dapat menskalakan pemantauan banyak murid dari satu dashboard.

## 6. Batasan

- Berjalan sebagai aplikasi Node.js (Docker) di VPS dengan database MySQL, sehingga batasan skala/latensi mengikuti kapasitas VPS dan koneksi ke database terkelola.
- Data ayat Al-Qur'an dan audio murottal bergantung pada API pihak ketiga (EQuran.id) sebagai sumber data real-time, dengan fallback data statis (Surah Al-Ikhlas) bila API tidak tersedia.

## 7. Kriteria Sukses

- Murid dapat menyelesaikan sesi latihan end-to-end (pilih surah → dengar/hafalkan → selesaikan sesi → dapat XP) tanpa error, termasuk saat offline (fallback lokal).
- Sesi latihan tersimpan secara persisten di MySQL (`mu_practice_sessions`, `mu_xp_ledger`).
