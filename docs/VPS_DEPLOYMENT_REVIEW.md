# Review Deployment VPS/EasyPanel — UI/UX, Performa, Security

Review kode per 2026-07-21, fokus pada jalur deploy VPS yang sudah mulai disiapkan (`Dockerfile`, `docker-compose.yml`, `server.mjs`, `deploy-vps.sh`, `docs/nginx.vps.conf.example`) menggantikan Cloudflare Workers + D1.

> **UPDATE (2026-07-21 siang): SEMUA BLOCKER SUDAH DIPERBAIKI & DIVERIFIKASI.**
> Saat pengerjaan, ditemukan total **7 blocker** (bukan 2) — semuanya sudah di-fix dan diuji nyata: server Node dijalankan lokal dengan SQLite sungguhan, lalu register→login→practice→stats→badges→OAuth redirect semua lolos lewat `curl`. Ringkasan perbaikan:
> 1. `server.mjs` memanggil worker dengan signature salah (`worker(cfReq, url, env, {})`) → `env.DB` selalu undefined → **fixed**: `worker.fetch(cfReq, env)`.
> 2. Skema `http://` di-hardcode → OAuth `redirect_uri_mismatch` & cookie tanpa `Secure` di produksi → **fixed**: baca `X-Forwarded-Proto` (diverifikasi: `redirect_uri=https://...` dan cookie `Secure` muncul saat header ada).
> 3. Adapter D1→better-sqlite3 tidak cocok dengan kontrak drizzle-orm/d1 (drizzle destructure `{results}` dari `all()` dan panggil `.raw()` yang tidak ada) → semua SELECT/INSERT gagal → **fixed**: adapter ditulis ulang mengikuti API D1 asli (termasuk konversi boolean→integer yang wajib untuk better-sqlite3).
> 4. Tabel `password_reset_tokens` & kolom `users.all_sessions_revoked_at` ada di schema tapi **tidak punya migration** → register & forgot-password crash → **fixed**: migration `0008_password_reset.sql`.
> 5. `docker-compose.yml` tidak menjalankan image hasil build sama sekali (mount `node:20-alpine` polos tanpa `server.mjs`/`better-sqlite3`) → **fixed**: `build: .` + volume data saja.
> 6. `Dockerfile` menyalin `dist/client` dari root yang tidak pernah ada (build frontend keluar di `apps/web/dist/client`) + `package-lock.json` root belum ada → **fixed**: path COPY dibetulkan, lockfile digenerate, toolchain gcc ditambah-lalu-dihapus untuk kompilasi native module di Alpine.
> 7. Tidak ada mekanisme migrasi di VPS (wrangler hanya bisa ke D1) → **fixed**: `server.mjs` auto-apply `migrations/*.sql` + seed 114 surah saat boot (idempotent via tabel `_migrations`; diverifikasi: boot pertama apply semua + 114 surah, boot kedua skip semua).
> Plus: `wrangler.jsonc` `main` path salah (build web gagal total) dan `migrations_dir` hilang — keduanya dibetulkan; healthcheck `/health` ditambahkan di `server.mjs` (bypass DB) sesuai path yang dipakai Dockerfile.
>
> **Belum bisa diuji lokal**: `docker build` itu sendiri (daemon OrbStack tidak berjalan) — jalankan `docker build -t murojaah:latest .` sekali sebelum push untuk memastikan; semua path yang dirujuk Dockerfile sudah diverifikasi ada.

Catatan review awal di bawah dipertahankan sebagai konteks historis.

## 🔴 P0 — Blocker, Aplikasi Tidak Akan Jalan di VPS Tanpa Ini

### 1. `env` dan `url` tertukar posisi saat memanggil worker
**Lokasi**: [server.mjs:213](../server.mjs)
```js
const cfResp = await worker(cfReq, url, env, {});
```
Tapi handler asli di [apps/worker/index.ts:37](../apps/worker/index.ts) sinyaturnya:
```js
async fetch(request, env) { ... }
```
Cuma 2 parameter (`request`, `env`) — gaya `ExportedHandler` Cloudflare. Karena `server.mjs` memanggil dengan 4 argumen posisional, di dalam `fetch()`, parameter `env` sebenarnya menerima **objek `url`** (bukan `env` yang berisi `.DB`, `.GOOGLE_CLIENT_ID`, dst). Efeknya: `env.DB` selalu `undefined` di VPS → **setiap endpoint yang butuh database** (register, login, practice, dsb.) langsung jatuh ke cabang `if (!env.DB) return json({error:"Layanan belum tersedia."}, 503)`. Aplikasi akan terlihat "hidup" (server merespons) tapi **tidak ada satu pun fitur berbasis data yang berfungsi**.

**Perbaikan**: ubah signature handler jadi menerima `env` sebagai argumen ke-2 sesuai kontrak aslinya:
```js
const cfResp = await worker.fetch(cfReq, env);
```
(worker di-import sebagai `mod.default` yang punya method `.fetch`, bukan dipanggil langsung sebagai fungsi — sesuaikan baris `worker = mod.default?.fetch ?? ...` supaya konsisten memanggil `mod.default.fetch(cfReq, env)`).

### 2. Google OAuth akan gagal di belakang reverse proxy HTTPS
**Lokasi**: [server.mjs:177](../server.mjs) — `const url = new URL(req.url, \`http://${req.headers.host}\`);` selalu hardcode skema `http://`, padahal Nginx ([nginx.vps.conf.example](nginx.vps.conf.example)) menerima HTTPS dari luar lalu meneruskan ke Node sebagai HTTP biasa (`proxy_pass http://murojaah_app`).

Akibatnya, semua kode yang bergantung pada `url.protocol`/`url.origin` — termasuk [lib/auth.ts:74,87,92](../apps/worker/lib/auth.ts) (flag `Secure` di cookie sesi) dan [routes/oauth.ts:68](../apps/worker/routes/oauth.ts) (`redirect_uri` yang dikirim ke Google) — akan selalu menganggap koneksi itu `http://`, bukan `https://`. Ini **persis bug `redirect_uri_mismatch`** yang sempat dialami saat setup lokal — tapi sekarang di domain produksi.

Nginx config sudah benar mengirim header `X-Forwarded-Proto $scheme` ([nginx.vps.conf.example](nginx.vps.conf.example) baris proxy_set_header) — **server.mjs tinggal membacanya**:
```js
const proto = req.headers["x-forwarded-proto"] ?? "http";
const url = new URL(req.url, `${proto}://${req.headers.host}`);
```

**Kedua bug di atas harus diperbaiki sebelum deploy — beri tahu saya kalau ingin saya perbaiki langsung.**

## 🟠 P1 — Keamanan

1. **`sendEmail()` di [lib/email.ts:16](../apps/worker/lib/email.ts) adalah stub** — hanya `console.log` dan `return false`, tidak pernah benar-benar mengirim SMTP meski `.env.example` sudah punya field `SMTP_HOST/USER/PASS`. Alur lupa-password akan terlihat sukses ("Tautan reset sudah dikirim") tapi email tidak pernah sampai. Perlu diimplementasikan pakai `nodemailer` (satu dependency kecil, standar untuk SMTP di Node — VPS tidak punya batasan seperti Workers yang tidak bisa buka koneksi TCP raw ke SMTP).
2. **CORS wildcard `Access-Control-Allow-Origin: "*"`** di [server.mjs:182](../server.mjs) dikombinasikan dengan cookie sesi (`Cookie` di `Access-Control-Allow-Headers`) — karena frontend & API disajikan dari origin yang sama di VPS, header CORS ini **tidak diperlukan sama sekali** dan sebaiknya dihapus (permukaan serangan tak perlu) daripada dibiarkan longgar.
3. **Rate limiting in-memory** ([lib/rate-limit.ts](../apps/worker/lib/rate-limit.ts)) pakai `Map` per-proses — cocok untuk 1 container (sesuai `docker-compose.yml` saat ini), tapi kalau nanti EasyPanel discale ke >1 replica, counter tidak sinkron antar-instance dan proteksi brute-force jadi tidak efektif. Untuk sekarang aman (single container), catat sebagai batasan.
4. **Header keamanan HTTP** — Nginx config sudah bagus (HSTS, X-Frame-Options, CSP belum ada). Tambahkan `Content-Security-Policy` dasar di level Nginx (bukan kode aplikasi) supaya tidak perlu redeploy Docker image untuk tuning CSP.
5. **`SESSION_SECRET` di `.env.example` tidak dipakai di mana pun** — token sesi memakai `crypto.getRandomValues` murni (aman), tapi variabel env ini menyesatkan (terlihat seperti dipakai untuk signing, padahal tidak ada HMAC di kode). Hapus dari `.env.example` atau implementasikan kalau memang ingin sesi berbasis signed token.
6. **better-sqlite3 berjalan sinkron** ([server.mjs](../server.mjs)) — setiap query memblokir event loop Node. Untuk skala kecil (individu/keluarga, sesuai target awal produk) ini tidak masalah; kalau nanti trafik naik, pertimbangkan migrasi ke `libsql`/Turso (sudah disebut sebagai opsi di `.env.example`) yang non-blocking.

## 🟡 P2 — Performa

1. **Google Fonts di-`@import` di dalam CSS** ([styles.css:1](../apps/web/src/styles.css)) — `@import url(...)` di dalam stylesheet bersifat *render-blocking* (browser harus fetch CSS itu dulu sebelum lanjut parsing). Pindahkan ke `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="stylesheet" ...>` di `index.html`, atau lebih baik lagi self-host font (satu file `.woff2` lokal) — menghindari request pihak ketiga sekaligus mempercepat first paint dan tetap berfungsi saat offline (PWA).
2. **Nginx sudah gzip aktif** ([nginx.vps.conf.example](nginx.vps.conf.example)) — bagus. Pertimbangkan tambah `brotli` (lebih baik dari gzip, didukung Nginx dengan modul tambahan) kalau image dasar mendukung.
3. **Cache-Control untuk asset build** sudah `immutable` + `expires 7d` di Nginx — sudah tepat karena Vite menghasilkan nama file dengan hash.
4. **`better-sqlite3` di Docker image** — pastikan base image (`node:20-alpine`) punya build tools untuk native module (`python3`, `make`, `g++`) saat `npm install`, atau native binding gagal ter-compile di dalam container Alpine (musl libc kadang bermasalah dengan native addons). Rekomendasi: uji build image sekali secara lokal sebelum push ke EasyPanel, atau pindah ke `node:20-bookworm-slim` (glibc) yang secara historis lebih ramah untuk native modules seperti `better-sqlite3`.
5. **Health check endpoint** — Dockerfile & docker-compose sudah pakai `/health`, tapi rute worker aslinya adalah `/api/health` ([routes/health.ts](../apps/worker/routes/health.ts)), bukan `/health`. Pastikan `server.mjs` punya alias eksplisit untuk `/health` (di luar prefix `/api/`) atau ubah healthcheck ke `/api/health` — saat ini healthcheck kemungkinan selalu gagal karena path tidak cocok (perlu dicek langsung, tapi ini kandidat bug ketiga yang perlu diverifikasi sebelum deploy).

## 🟢 P3 — UI/UX (temuan lama yang masih relevan + tambahan)

Sebagian besar sudah tercatat di [ROADMAP.md](ROADMAP.md) Fase 4 (kartu hero Beranda, nama surah di tugas, dsb) — berikut tambahan spesifik konteks VPS/produksi:

1. **Boot splash di `index.html`** sudah menampilkan status "Aplikasi belum berhasil dimuat" setelah 8 detik — bagus untuk transparansi, tapi pesan generik. Di VPS (latensi berbeda dari edge Cloudflare), pertimbangkan menaikkan timeout atau membuat pesan lebih spesifik ("Periksa koneksi ke server").
2. **Tidak ada halaman error umum (500) yang ramah** — kalau backend down (mis. migrasi database sedang jalan), pengguna akan melihat pesan generik dari `notify()` toast, bukan halaman offline yang jelas. Pertimbangkan halaman fallback statis sederhana untuk downtime terjadwal.
3. **Precache PWA (`public/sw.js`)** saat ini hanya cache `/manifest.webmanifest` dan `/icon.svg` saat install — app shell (JS/CSS bundle) tidak di-precache di awal, hanya lewat cache-as-you-go untuk `/assets/`. Untuk pengalaman offline yang lebih solid di awal instalasi PWA, precache daftar asset dari `dist/client/.vite/manifest.json` saat build (`install` event `cache.addAll([...hashedAssetUrls])`).

## Ringkasan Prioritas

```
Sebelum deploy sama sekali:
  P0.1 → Perbaiki pemanggilan worker.fetch(request, env) di server.mjs
  P0.2 → Baca X-Forwarded-Proto untuk protocol/origin yang benar
  (verifikasi) → cocokkan path healthcheck /health vs /api/health

Sebelum dibuka ke pengguna nyata:
  P1.1 → Implementasi SMTP nyata (nodemailer) untuk reset password
  P1.2 → Hapus CORS wildcard yang tidak perlu
  P1.4 → Tambah CSP di Nginx

Peningkatan bertahap (tidak mendesak):
  P2.1 → Self-host font / pindah @import ke <link>
  P2.4 → Verifikasi build better-sqlite3 di base image Alpine
  P3.* → Polish UX sesuai catatan
```

Saya sarankan mulai dari **P0** — dua bug itu artinya deployment saat ini, kalau langsung dijalankan, akan tampak seperti berhasil (container running, healthcheck mungkin hijau) tapi **login/daftar/semua fitur berbasis data akan gagal senyap**. Mau saya perbaiki sekarang?
