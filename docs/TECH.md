# Technical Documentation — Murojaah

*(Ditulis ulang 2026-07-21 — versi sebelumnya mendeskripsikan arsitektur single-file pre-monorepo yang sudah lama digantikan.)*

## 1. Stack
| Layer | Teknologi |
| --- | --- |
| Frontend | React 19 + TypeScript, `apps/web/src/` (App.tsx + halaman terpisah per fitur) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) + custom CSS di [apps/web/src/app.css](../apps/web/src/app.css), termasuk `[data-theme="dark"]` |
| Icons | lucide-react |
| Routing | Hash-based manual routing (state `page` di `App.tsx`, bukan library router) |
| Build tool (frontend) | Vite 8 |
| Backend | Cloudflare Worker-style handler (`fetch(request, env)`) di [apps/worker/index.ts](../apps/worker/index.ts), tapi **dijalankan di Node.js**, bukan Cloudflare Workers (lihat §1.1) |
| Database | MySQL via Drizzle ORM (dialek `mysql2`) — [packages/db/src/schema.ts](../packages/db/src/schema.ts), [packages/db/src/client.ts](../packages/db/src/client.ts). Semua tabel diberi prefix `mu_`. |
| Migrations | `drizzle-kit generate` → [packages/db/migrations/](../packages/db/migrations/), diterapkan otomatis oleh `server.mjs` saat container start (tracked di tabel `mu__migrations`) |
| Deploy target | VPS + Docker (EasyPanel atau docker-compose manual) — lihat [deploy-vps.sh](../deploy-vps.sh) |
| PWA | manifest ([apps/web/public/manifest.webmanifest](../apps/web/public/manifest.webmanifest)), service worker ([apps/web/public/sw.js](../apps/web/public/sw.js)) |

### 1.1 Kenapa "Cloudflare Worker-style" tapi jalan di Node?
Proyek ini awalnya dibangun untuk Cloudflare Workers + D1. Backend (`apps/worker`) masih menulis handler dengan signature `fetch(request, env)` ala Workers karena itu API yang portable, tapi **jalur deploy Cloudflare/D1 sudah ditinggalkan** (2026-07-21, migrasi ke MySQL). File-file Cloudflare (`apps/web/wrangler.jsonc`, `@cloudflare/vite-plugin` di `vite.config.ts`) masih ada di repo tapi **tidak dipakai** — jangan jadikan rujukan.

Yang benar-benar jalan sekarang: [server.mjs](../server.mjs) — server Node HTTP polos yang me-load bundle worker (di-bundle via [scripts/build.mjs](../scripts/build.mjs), esbuild) dan menjalankannya dengan `env.DB` berupa `mysql2` connection pool asli, bukan D1 binding.

## 2. Struktur Proyek
```
apps/worker/index.ts        # entry point API — daftar semua route handler
apps/worker/routes/*.ts     # satu file per grup endpoint (auth, classes, practice, dst)
apps/worker/lib/guards.ts   # requireAuth/requireRole/requireDb — guard bersama semua route
apps/worker/lib/*.ts        # helper lain (session, stats, rate-limit, email, dsb)
apps/web/src/App.tsx        # shell aplikasi (nav, topbar, routing hash-based)
apps/web/src/pages/*.tsx    # satu file per halaman (Home, Practice, Dashboard, dst)
apps/web/src/lib/api.ts     # klien fetch tipis ke /api/*
packages/db/src/schema.ts   # skema Drizzle (lihat ERD.md), dialek MySQL
packages/db/src/client.ts   # factory drizzle(pool, {schema, mode:"default"})
packages/db/migrations/     # DDL MySQL, di-generate via `pnpm db:generate`
packages/db/seeds/quran-full.mysql.sql  # seed 114 surah + 6.236 ayat
server.mjs                  # entry point Node produksi: pool MySQL, auto-migrasi, gzip, static file serving
scripts/build.mjs           # bundling worker (esbuild) untuk dijalankan server.mjs
scripts/dev.mjs             # entry point dev lokal: server.mjs + vite (lihat §6)
scripts/migrate-sqlite-to-mysql.mjs  # skrip one-off migrasi data (sudah dijalankan, disimpan untuk referensi)
Dockerfile / docker-compose.yml      # image produksi (Node + mysql2, tanpa toolchain native)
```

Catatan arsitektur: backend menggunakan pencocokan path manual (bukan router library) — setiap route handler mengecek `url.pathname`/`request.method` sendiri dan mengembalikan `null` kalau bukan miliknya, `index.ts` mencoba tiap handler berurutan. Guard berulang (cek login, cek DB tersedia, cek role) dikonsolidasi di `lib/guards.ts` (`requireAuth`, `requireRole`, `requireDb`) — jangan tulis ulang pengecekan itu manual di route baru.

## 3. API Reference

Endpoint lengkap ada di `apps/worker/routes/*.ts`, dikelompokkan per fitur: `auth.ts` (register/login/logout/me/switch-profile/forgot-password), `oauth.ts` (Google), `classes.ts`, `assignments.ts`, `ayah-progress.ts`, `badges.ts`, `encouragements.ts`, `practice.ts`, `profile.ts` (termasuk `/api/me/suggestion`), `admin.ts`, `teacher.ts`, `quran.ts`.

Semua endpoint yang butuh login memakai pola:
```ts
const guard = requireAuth(env, ctx); // atau requireRole(env, ctx, "teacher", "pesan error")
if (guard instanceof Response) return guard;
const { user, db } = guard;
```

**Keamanan yang sudah diterapkan:**
- Session cookie httpOnly + Secure (saat HTTPS) + SameSite=Lax, hash password PBKDF2.
- Rate limiting di login/register/forgot-password/practice-complete, dengan Redis sebagai store bersama di VPS (fallback in-memory kalau `REDIS_URL` tidak diset).
- Header `x-content-type-options`, `referrer-policy`, `x-frame-options`, `x-xss-protection` di semua respons JSON.
- Validasi tipe & rentang input di tiap endpoint (lihat masing-masing route).
- **Belum ada** Content-Security-Policy header — lihat ROADMAP.md Fase 5.

## 4. Alur Data Kunci
1. **Ambil ayat**: `PracticePage` → `getQuranSurah(id)` → `GET /api/quran/surah/:id` → cek database dulu, proxy EQuran.id kalau kosong → jika API luar gagal, frontend fallback ke `fallbackAyahs` lokal (Al-Ikhlas) sehingga app tetap fungsional offline/API down.
2. **Selesaikan sesi**: `PracticePage.finish()` → `completePractice()` → `POST /api/practice/complete` → insert `mu_practice_sessions` → insert `mu_xp_ledger` (kunci unik `practice:{sessionId}` mencegah XP ganda) → evaluasi badge otomatis → tandai assignment terkait selesai. Kalau request gagal (offline), sesi masuk antrean IndexedDB dan disinkronkan otomatis saat online kembali.
3. **Audio**: URL audio tidak pernah menunjuk langsung ke CDN dari frontend — selalu lewat `/api/quran/audio/:s/:a` yang redirect 302, sehingga backend bisa mengganti sumber audio/qari di kemudian hari tanpa ubah frontend.
4. **Saran latihan**: `GET /api/me/suggestion` mengurutkan `mu_ayah_progress` berdasarkan status ("Perlu latihan" dulu) + `last_practiced_at` paling lama, mengisi kartu hero Beranda dan tombol "Latihan yang disarankan" di Practice (hand-off lewat `sessionStorage`, bukan router param).

## 5. Environment & Konfigurasi
Env var produksi (lihat [docs/.env.example](.env.example)):
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD   # koneksi MySQL
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET             # OAuth
REDIS_URL                                          # opsional, rate-limit store bersama
SMTP_*, FROM_EMAIL, FROM_NAME                      # untuk reset password (lib/email.ts masih stub)
APP_URL, EQURAN_API_BASE
```
`server.mjs` membaca semuanya langsung dari `process.env` — tidak ada file `.dev.vars`/`wrangler secret` lagi.

## 6. Perintah Pengembangan
```bash
pnpm dev              # scripts/dev.mjs — build worker sekali, lalu jalankan server.mjs (MySQL asli via .env)
                       # + vite dev (frontend saja, proxy /api ke server.mjs:8787) bareng
pnpm build            # build frontend produksi
pnpm typecheck        # tsc --noEmit di semua workspace
pnpm db:generate      # generate migration Drizzle dari schema.ts (dialek MySQL)
pnpm db:migrate:mysql # jalankan scripts/migrate-sqlite-to-mysql.mjs (one-off, data lama sudah dipindah)
node server.mjs       # jalankan server produksi langsung (dipakai di Docker)
```
Catatan: `pnpm dev` versi lama (Cloudflare Vite plugin + emulasi D1 lokal) sudah **tidak berfungsi** sejak backend memakai `mysql2` (Node-only, tidak kompatibel dengan runtime Workers) — jangan jalankan `vite dev` langsung di `apps/web` untuk full-stack dev, karena expektasinya butuh `server.mjs` jalan terpisah.

## 7. Ketergantungan Eksternal
- **EQuran.id API** (`https://equran.id/api/v2`) — sumber data ayat & audio murottal. Tidak ada API key. Data sudah disalin permanen ke MySQL (`mu_surahs`, `mu_ayahs`) jadi ketergantungan runtime minimal (fallback API luar hanya kalau cache database kosong).
- **Google OAuth 2.0** — [apps/worker/routes/oauth.ts](../apps/worker/routes/oauth.ts). Tanpa konfigurasi, `/api/auth/google/start` mengembalikan 501 dan tombolnya gagal dengan aman.
- **MySQL terkelola** (mis. sumobase.my.id atau provider lain) — koneksi via `mysql2` pool, bukan file lokal.
- **Redis** (opsional) — hanya untuk rate-limit counter bersama-lintas-instance; sengaja tidak dipakai untuk session/cache data karena query MySQL lokal sudah cukup cepat.

### 7.1 Setup Google OAuth
1. Buat OAuth Client ID (tipe "Web application") di [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Tambahkan Authorized redirect URI: `https://<domain-produksi>/api/auth/google/callback` (dan `http://localhost:5173/api/auth/google/callback` untuk dev lokal).
3. Set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` sebagai env var di EasyPanel/`.env` — bukan `wrangler secret` (jalur itu sudah tidak dipakai).
4. Pengguna baru yang daftar lewat Google otomatis diberi peran `parent` (bisa diubah manual lewat Profil, lihat ROADMAP.md Fase 4d). `id_token` divalidasi klaim `aud`/`iss`/`email_verified`/`exp` plus verifikasi signature JWKS penuh: `kid` diparse dari JWT header, JWK di-import via `crypto.subtle.importKey("jwk", ...)` (bukan konstruksi DER manual), RSA-SHA256 terhadap `https://www.googleapis.com/oauth2/v3/certs` dengan cache edge 1 jam.

## 8. Known Gaps (lihat juga [ROADMAP.md](ROADMAP.md))
- Tidak ada test otomatis (unit/e2e) di repo ini.
- CSP header belum ada.
- Reset password/email pengingat harian butuh SMTP nyata — `lib/email.ts` masih stub (`console.log`).
- Backup otomatis MySQL belum diimplementasi (lihat ROADMAP.md Fase 6.7).
