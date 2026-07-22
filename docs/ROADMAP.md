# Rekomendasi Pengembangan & Roadmap — Murojaah (v2)

Menggantikan versi sebelumnya (2026-07-20) — Fase 0–3 di sana **sudah selesai dikerjakan dan diverifikasi nyata di browser**. Dokumen ini ditulis ulang berdasarkan review kode aktual per 2026-07-21, melengkapi [BRD.md](BRD.md), [PRD.md](PRD.md), [ERD.md](ERD.md), [TECH.md](TECH.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [LANDING_UX.md](LANDING_UX.md), [MODAL_FORMS_UX.md](MODAL_FORMS_UX.md).

**Konteks pengerjaan**: proyek masih tahap eksplorasi/demo (bukan produksi publik dengan pengguna nyata) — roadmap ini karena itu memprioritaskan **penyelesaian fitur & polish UX** di Fase 4, dan mengumpulkan pekerjaan *hardening* (keamanan, testing, deploy) di Fase 5 sebagai daftar yang perlu dikerjakan **sebelum** proyek ini dibuka ke pengguna nyata, bukan sekarang.

## Ringkasan Apa yang Sudah Selesai (Fase 0–3 lama)

| Area | Status |
| --- | --- |
| Monorepo pnpm (`apps/web`, `apps/worker`, `packages/db`, `packages/shared`) | ✅ Selesai |
| Auth (session cookie, PBKDF2, akun anak tanpa password + profile switcher) | ✅ Selesai |
| Login/Daftar dengan Google (OAuth 2.0 penuh) | ✅ Selesai |
| Landing page marketing + form auth jadi popup modal | ✅ Selesai |
| Kelas & tugas (`classes`, `assignments`) + modal buat kelas/tugas | ✅ Selesai |
| Progres per-ayat (`ayah_progress`) tersambung ke Practice page | ✅ Selesai |
| Badge otomatis (`badges`, `user_badges`) | ✅ Selesai |
| 114 surah lengkap di database, `/api/quran/surah/:id` baca dari database dulu | ✅ Selesai |
| Migrasi database dari Cloudflare D1 (SQLite) ke MySQL (`mu_*`, `mysql2`) + copy data produksi | ✅ Selesai (2026-07-21) |
| Dukungan orang tua (`encouragements`) + modal kirim dukungan | ✅ Selesai |
| Offline-first: antrean sesi latihan (IndexedDB) + cache audio per-ayat (Service Worker) + idempotency key | ✅ Selesai |
| Statistik nyata (XP, streak, level, ayat dikuasai) di Profil/Pencapaian/Dashboard/Beranda | ✅ Selesai |
| Dashboard 4 peran (Murid/Guru/Orang Tua/Admin) dengan data nyata | ✅ Selesai |
| Halaman "Kelola Profil" (orang tua/guru/admin kelola data anak-murid-pengguna) | ✅ Selesai |

Semua item di atas sudah diverifikasi lewat browser nyata (bukan cuma baca kode) sepanjang sesi pengembangan ini.

## Fase 4 — Penyelesaian Fitur & Polish UX (prioritas saat ini)

Sesuai tahap eksplorasi/demo, fase ini fokus menghilangkan sisa "tampilan saja" yang ditemukan saat review kode terbaru.

### 4a. Kartu Hero "Lanjutkan Hafalan" di Beranda
**Temuan**: [Home.tsx](../apps/web/src/pages/Home.tsx) — judul surah, "Ayat 1–4 • Terakhir latihan kemarin", dan progress bar 75% masih string/angka hardcoded, tidak terikat pengguna yang login.
- Tambah kolom `last_practiced_surah_id`, `last_practiced_end_ayah` (atau derive dari `practice_sessions` terbaru milik user) untuk menentukan surah mana yang ditampilkan.
- Progress % dihitung dari ayat yang sudah dikuasai (`ayah_progress`) dibagi total ayat surah tsb.
- Jika belum pernah latihan sama sekali, tampilkan state kosong yang jujur ("Mulai latihan pertamamu") alih-alih data palsu.

### 4b. Nama Surah di Daftar Tugas Murid
**Temuan**: [Dashboard.tsx:39](../apps/web/src/pages/Dashboard.tsx) — `StudentDashboard` menampilkan `Surah #{a.surahId}` mentah, padahal `getSurahs()` sudah dipakai di Beranda untuk kasus yang sama persis.
- Perbaikan cepat: reuse pola `surahName()` yang sudah ada di [Home.tsx](../apps/web/src/pages/Home.tsx) dan [Achievements.tsx](../apps/web/src/pages/Achievements.tsx) — tinggal salin, bukan bikin baru.

### 4c. Tautkan Penyelesaian Tugas ke Sesi Latihan Nyata
**Temuan**: tidak ada kode yang mengubah status `assignments` menjadi selesai ketika murid menuntaskan sesi latihan yang cocok — tugas dari guru tidak pernah "tercentang selesai" di mata pengguna manapun.
- Saat `POST /api/practice/complete` sukses, cek apakah ada assignment aktif milik user (langsung atau lewat kelas) dengan `surahId`+rentang ayat yang cocok → update `status` jadi `"completed"`.
- Tampilkan status itu di kartu tugas (Beranda murid, Dashboard guru) — "2 tugas" saat ini cuma menghitung baris, bukan yang benar-benar sudah dikerjakan.

### 4d. Pilihan Peran Setelah Daftar via Google
**Temuan**: [oauth.ts:107](../apps/worker/routes/oauth.ts) — akun baru dari Google **selalu** dapat `role: "parent"`, tanpa cara mengubahnya sendiri (hanya admin yang bisa lewat halaman Kelola Profil).
- Setelah callback OAuth untuk akun *benar-benar baru* (bukan yang sudah pernah login), redirect ke layar kecil "Kamu ini siapa?" (Murid/Guru/Orang Tua) sebelum masuk ke aplikasi — satu kali saja, bukan tiap login.
- Alternatif lebih murah: biarkan seperti sekarang, tapi tambahkan banner sekali-tampil di Beranda "Bukan orang tua? Ubah peranmu di sini" yang mengarah ke Profil — perlu endpoint self-service ubah role terbatas (mis. hanya boleh sekali, mencegah orang iseng klaim jadi admin).

### 4e. Tandai Dukungan Sudah Dibaca
**Temuan**: kolom `is_read` di skema `encouragements` ([schema.ts](../packages/db/src/schema.ts)) diisi `false` saat dibuat tapi **tidak pernah diubah** — tidak ada endpoint PATCH maupun UI tandai-dibaca.
- Tambah `PATCH /api/encouragements/:id/read` (guarded: hanya anak penerima pesan).
- Panggil otomatis saat kartu "Pesan dari..." di Beranda anak ditampilkan (bukan perlu tombol eksplisit) — cukup satu baris tambahan, bukan fitur besar.
- Opsional: badge jumlah pesan belum dibaca di menu Beranda/notifikasi — **hanya jika datanya nyata**, jangan ulangi kasus badge "3" palsu yang baru saja dihapus.

### 4f. Laporan/Ekspor untuk Guru (opsional, jika dibutuhkan)
Tidak ditemukan tombol "unduh laporan" di kode saat ini (sempat ada di versi sebelumnya, sudah hilang saat Dashboard ditulis ulang) — kalau fitur ini masih diinginkan, rekomendasi: satu endpoint `GET /api/classes/:id/report.csv` yang men-generate CSV progres murid (bukan PDF — CSV cukup dan native `Blob`+`<a download>` di browser tanpa library baru).

### 4g. Goals & Grafik Mingguan Masih Hardcoded di Beranda
**Temuan**: [Home.tsx](../apps/web/src/pages/Home.tsx) — tiga kartu `Goal` (Hafalkan 4 ayat, Ulangi 5 kali, Latihan 10 menit), bar chart mingguan `[55,82,38,72,95,28,12]`, header tanggal "SENIN, 18 MEI", dan ringkasan mingguan (42 menit, 18 ayat, +120 XP) semuanya **data statis** tanpa hubungan dengan aktivitas pengguna yang login.
- Goal pertama seharusnya berasal dari tugas aktif atau target harian pengguna (`user.dailyTarget` + progress real).
- Grafik mingguan perlu query praktik 7 hari terakhir (XP/menit/ayat per hari) — endpoint baru atau perluas `GET /api/me/stats` dengan field `weeklyBreakdown`.
- Header tanggal pakai `toLocaleDateString("id-ID", {...})` seperti yang sudah dilakukan di komponen lain.
- Jika belum ada data minggu ini, tampilkan state kosong ("Grafik akan muncul setelah kamu mulai latihan") daripada bar rata.

### 4h. XP Sesi Dikeraskan di Achievements
**Temuan**: [Achievements.tsx:31](../apps/web/src/pages/Achievements.tsx) — setiap sesi di daftar aktivitas terbaru menampilkan `+35` hardcoded. Tipe `RecentSession` di [shared/src/index.ts:38](../packages/shared/src/index.ts) tidak menyertakan field `xpEarned`.
- Tambah field `xpEarned` ke `RecentSession`, isi dari join ke `xpLedger` di [stats.ts](../apps/worker/lib/stats.ts) — join via `xpLedger.source LIKE 'practice:${sessionId}'`.
- Tampilkan `+${s.xpEarned} XP` di frontend, ganti konstanta hardcoded.

### 4i. Landing Page Janji Pilih-Peran Tidak Sesuai Google OAuth
**Temuan**: [Landing.tsx:10-12](../apps/web/src/pages/Landing.tsx) — copy *steps* mengatakan "pilih peran: murid, guru, atau orang tua" sebagai langkah 1 dari 3, tapi pendaftaran via Google OAuth ([oauth.ts:107](../apps/worker/routes/oauth.ts)) selalu memberi role `"parent"` tanpa pernah menampilkan pilihan peran.
- Opsi A (rekomendasi): perbaiki copy landing page untuk akurat — mis. "Atur peran setelah daftar" atau hapus mention role dari step 1, selesaikan dulu Fase 4d yang membangun alur pilih-peran pasca-OAuth.
- Opsi B: kerjakan Fase 4d dulu, baru sesuaikan copy — agar janji landing page terpenuhi.

### 4j. ~~`env.DB` Fallback Palsu di Practice Route~~ ✅ Selesai (resolved sebagai efek samping refactor guard 2026-07-21)
`handlePracticeComplete` sekarang pakai `requireAuth()` ([guards.ts](../apps/worker/lib/guards.ts)) yang mengembalikan `503` sebenarnya kalau DB tidak tersedia — tidak ada lagi fallback sukses palsu.

### 4k. Tidak Ada Fitur Keluar/Kelola Anggota Kelas
**Temuan**: [classes.ts](../apps/worker/routes/classes.ts) — murid bisa gabung kelas via kode (`POST /api/classes/join`) tapi tidak ada endpoint untuk keluar. Guru juga tidak bisa menghapus murid dari kelas. Di UI, tidak ada tombol apapun untuk mengelola keanggotaan.
- Tambah `DELETE /api/classes/:id/members/:studentId` (guru only) untuk menghapus murid.
- Tambah `DELETE /api/classes/:id/leave` (murid only) untuk keluar dari kelas.
- Di Dashboard guru: tambah icon "×" per baris murid dengan konfirmasi.
- Di sisi murid: tambah opsi "Keluar dari kelas" di suatu tempat (mis. pengaturan profil atau halaman kelas).

### 4l. Achievements: Tidak Ada Visualisasi Growth XP
Progres level sudah ditampilkan di [Achievements.tsx](../apps/web/src/pages/Achievements.tsx) dengan progress bar XP, tapi tidak ada grafik XP *sepanjang waktu* (growth chart). Pengguna tidak bisa melihat tren konsistensi mereka.
- Opsional: endpoint `GET /api/me/xp-history?days=30` yang return array `{ date: string, xp: number }` untuk 30 hari terakhir.
- Tampilkan sebagai area chart sederhana (SVG inline tanpa library — cukup `<polyline>` + scaling manual).

### 4m. Profile Page Tidak Menampilkan Role atau Informasi Kepemilikan Akun
**Temuan**: [Profile.tsx](../apps/web/src/pages/Profile.tsx) — halaman profil hanya menampilkan nama, avatar, preferensi, dan target harian. Tidak ada informasi:
- Role saat ini (Murid/Guru/Orang Tua/Admin) — pengguna tidak bisa melihat perannya sendiri.
- Metode login (email/password vs Google OAuth) — tidak jelas bagaimana cara mengubah kata sandi.
- Managed-by (untuk profil anak: "Dikelola oleh [nama orang tua]").
- Tambahkan di bagian "Informasi profil" bawah dailyTarget: role badge read-only + metode autentikasi.

## Fase 5 — Daftar Persiapan Sebelum Pengguna Nyata (kerjakan nanti, bukan sekarang)

Ditemukan saat review, sengaja **tidak diprioritaskan** selama masih tahap eksplorasi — tapi dicatat di sini supaya tidak terlupa saat proyek ini akan dibuka ke pengguna sungguhan.

- ~~**Rate limiting login/register**~~ ✅ **Selesai (2026-07-21)**: rate limiting terpasang di login/register/forgot-password/practice, dengan **Redis sebagai store bersama** di VPS (`REDIS_URL`, layanan `redis:7-alpine` di docker-compose) dan fallback in-memory saat Redis tidak dikonfigurasi. Diverifikasi nyata: percobaan login ke-6 kena 429, counter bertahan setelah restart server, dan saat Redis dimatikan sistem *fail-open* (login tetap dilayani, tidak menggantung).
- **Lupa kata sandi**: belum ada alur reset password sama sekali — pengguna yang lupa sandi email/password akan terkunci permanen dari akunnya (Google OAuth tidak terpengaruh).
- **Verifikasi email**: pendaftaran email/password tidak memverifikasi kepemilikan email — siapa pun bisa daftar pakai email siapa pun.
- **Test otomatis**: nol test di seluruh repo (dikonfirmasi tidak ada `*.test.ts`, `vitest.config`, atau folder `tests/`). Minimal yang disarankan sebelum produksi: satu smoke test per alur kritis (register→login, practice→XP→badge, switch-profile guard).
- ~~**`database_id` masih placeholder** di `wrangler.jsonc`~~ **Tidak relevan lagi (2026-07-21)**: proyek sudah pindah ke MySQL untuk deployment VPS; jalur Cloudflare Workers/D1 (`wrangler.jsonc`, `pnpm dev` lama) dibiarkan di repo tapi tidak dipakai. Kredensial produksi sekarang lewat `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` di `.env` (lihat [docs/.env.example](.env.example)).
- **Manajemen kuota cache audio offline**: cache Service Worker berjalan otomatis tanpa kontrol pengguna — perlu UI sederhana di Profil ("Hapus data ayat tersimpan") sebelum banyak pengguna mengeluh penyimpanan penuh.
- **Content Security Policy (CSP)**: [http.ts](../apps/worker/lib/http.ts) hanya mengirim `x-content-type-options` dan `referrer-policy`. Sebelum produksi publik, tambah header CSP (`script-src`, `style-src`, `connect-src`, `form-action`) karena aplikasi merender konten Arab dan bisa menjadi vektor XSS jika data input tidak dibersihkan di masa depan.
- **Service Worker update notification**: [App.tsx:70](../apps/web/src/App.tsx) mendaftarkan SW via `navigator.serviceWorker.register("/sw.js")` tetapi tidak ada listener `controllerchange` dan tidak ada banner "Versi baru tersedia — muat ulang". SW bisa berjalan dengan kode lama berhari-hari tanpa pengguna sadar. Tambah listener, simpan `registration.waiting` di state, tampilkan tombol reload yang panggil `registration.waiting.postMessage({action: "skipWaiting"})`.
- **Pagination admin users**: [admin.ts:75](../apps/worker/routes/admin.ts) — `GET /api/admin/users` mengembalikan **semua** pengguna tanpa limit/offset. Akan bermasalah saat jumlah pengguna >100. Tambah parameter query `?offset=&limit=` (default 50).
- **OAuth state cookie tidak dibersihkan saat error**: [oauth.ts:83,93](../apps/worker/routes/oauth.ts) — jika token exchange gagal atau klaim invalid, response redirect tidak menghapus `STATE_COOKIE`. Cookie tetap ada sampai TTL 10 menit. Meskipun bukan celah keamanan (sudah dilindungi SameSite=Lax + HttpOnly), bersihkan tetap baik untuk hygiene — tambah `set-cookie: murojaah_oauth_state=; ... Max-Age=0` di cabang error.

## Fase 6 — Ide Fitur & UX Berikutnya (pasca-deploy VPS, 2026-07-21)

Ide baru di luar Fase 4 (yang sebagian besar masih berlaku). Diurutkan berdasarkan rasio dampak/effort:

1. ~~**Muraja'ah cerdas (saran ayat otomatis)**~~ ✅ **Selesai (2026-07-21)**: `GET /api/me/suggestion` di [profile.ts](../apps/worker/routes/profile.ts) mengurutkan `ayah_progress` berdasarkan status + umur, mengisi kartu hero Beranda dan hand-off ke Practice via sessionStorage. Diverifikasi nyata di browser.
2. ~~**Dark mode**~~ ✅ **Selesai (2026-07-21)**: blok `[data-theme="dark"]` di [app.css](../apps/web/src/app.css) + toggle di topbar & Profil, tersimpan di `localStorage` (bukan `preferences` JSON — lebih sederhana, tidak perlu round-trip API untuk ganti tema). Diverifikasi kedua arah di browser.
3. **Onboarding first-run** — setelah daftar, pengguna baru mendarat di Beranda yang serba kosong. Arahkan langsung ke Practice dengan surah pendek yang disarankan (An-Nas/Al-Ikhlas) + satu kalimat panduan; hilang setelah sesi pertama selesai.
4. **Pilihan qari** — URL audio kini hardcode Misyari Rasyid ([quran.ts](../apps/worker/routes/quran.ts)); EQuran.id menyediakan beberapa qari di CDN yang sama. Simpan pilihan di `preferences`, endpoint audio menerima parameter qari. Catatan: cache audio offline per-qari akan membesar — tetap on-demand.
5. **Pengingat harian (streak reminder)** — butuh SMTP diimplementasi dulu (stub [email.ts](../apps/worker/lib/email.ts) — prasyarat yang sama dengan reset password). Mulai dari email harian sederhana via cron (node-cron di server.mjs atau cron EasyPanel yang memanggil endpoint internal); Web Push (VAPID) nanti saja, infrastrukturnya jauh lebih berat.
6. **Leaderboard kelas mingguan** — data sudah lengkap (XP per murid per kelas). Tampilkan top-3 XP minggu ini di dashboard murid & guru. Buat *opsional per kelas* (toggle guru) — kompetisi bisa memotivasi sebagian murid dan menekan sebagian lainnya.
7. **Backup otomatis MySQL (ops, bukan fitur)** — *(diperbarui 2026-07-21, database sudah pindah dari SQLite ke MySQL)*. Database sekarang di server MySQL terkelola (`DB_HOST` di `.env`), bukan file lokal di VPS — cek dulu apakah provider-nya sudah menyediakan backup otomatis bawaan sebelum bangun sendiri. Kalau belum: cron harian `mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > backup-$(date +%F).sql.gz` + retensi 7 hari + salin keluar (rclone/S3). Ini hal pertama yang disesali kalau dilewati.
8. **Redis untuk kebutuhan lain** — sengaja *belum*: session tetap di MySQL (lookup dengan index sudah cepat), cache data Qur'an tidak perlu (query MySQL lokal lebih cepat dari round-trip Redis). Baru relevan kalau nanti ada fitur realtime (notifikasi live) via pub/sub — jangan dipakai hanya karena sudah terpasang.

## Risiko & Keputusan yang Masih Menggantung

- **Lisensi EQuran.id**: draft email permintaan izin sudah ada di [permission-request.md](permission-request.md) tapi **belum dikonfirmasi terkirim**. Perlu dikirim sebelum proyek ini punya pengguna di luar tim sendiri, mengingat 114 surah + audio sudah disalin permanen ke database (MySQL) dan di-cache offline.
- **Consent anak login mandiri**: belum ada batas usia minimum atau mekanisme consent orang tua untuk anak yang punya akun sendiri (bukan profil dikelola) — masih sama seperti dicatat di versi roadmap sebelumnya, belum dibahas ulang.
- **Role default Google OAuth**: lihat Fase 4d — ini keputusan produk (biarkan manual lewat admin, atau bangun alur pilih-peran) yang perlu Anda putuskan sebelum saya kerjakan.
- **~~Google OAuth id_token signature diverifikasi sendiri~~** ✅ **Selesai (2026-07-22)**: [oauth.ts](../apps/worker/routes/oauth.ts) sebelumnya membaca `kid` dari body response token (yang tidak dikembalikan Google) sehingga verifikasi JWKS tidak pernah benar-benar berjalan. Sekarang `kid` diparse dari JWT header, dan `verifyWithJwks` menggunakan `crypto.subtle.importKey("jwk", ...)` (tanpa konstruksi DER manual). Verifikasi penuh RSA-SHA256 berjalan di setiap login Google, dengan cache JWKS 1 jam di edge.
