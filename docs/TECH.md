# Technical Documentation — HafizAyat

## 1. Stack
| Layer | Teknologi |
| --- | --- |
| Frontend | React 19 + TypeScript, single-file app di [src/main.tsx](../src/main.tsx) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) + custom CSS di [src/styles.css](../src/styles.css) |
| Icons | lucide-react |
| Routing | Hash-based manual routing (bukan `@tanstack/react-router` meski ter-install di `package.json`) |
| Build tool | Vite 8 + `@cloudflare/vite-plugin` |
| Backend | Cloudflare Worker, single handler di [worker/index.ts](../worker/index.ts) |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM ([src/db/schema.ts](../src/db/schema.ts), [src/db/client.ts](../src/db/client.ts)) |
| Migrations | `drizzle-kit` + Wrangler D1 migrations ([migrations/](../migrations)) |
| Deploy target | Cloudflare Workers (assets + Worker via `wrangler.jsonc`) |
| PWA | manifest ([public/manifest.webmanifest](../public/manifest.webmanifest)), service worker ([public/sw.js](../public/sw.js)) |

## 2. Struktur Proyek
```
worker/index.ts       # satu-satunya entry point API (semua route di sini)
src/main.tsx          # seluruh UI React (semua halaman & komponen dalam 1 file)
src/lib/api.ts         # klien fetch tipis ke /api/*
src/db/schema.ts        # skema Drizzle (lihat ERD.md)
src/db/client.ts        # factory drizzle(env.DB)
src/styles.css         # semua styling (tanpa CSS module/komponen terpisah)
migrations/0001_initial.sql  # DDL SQLite untuk D1
seeds/local.sql        # data seed untuk dev lokal
wrangler.jsonc          # konfigurasi Cloudflare Worker + binding D1
```

Catatan arsitektur: proyek ini sengaja sangat terpusat (bukan feature-folder). Backend hanya satu file dengan pencocokan path manual (bukan router library); frontend hanya satu file dengan semua komponen halaman. Ini konsisten dengan skala proyek saat ini — jangan pecah menjadi banyak file kecuali proyek benar-benar tumbuh, karena `@tanstack/react-router` sudah ter-install tapi tidak dipakai (masih hash-routing manual).

## 3. API Reference (`worker/index.ts`)

| Method | Path | Deskripsi | Auth |
| --- | --- | --- | --- |
| GET | `/api/health` | Health check | tidak ada |
| GET | `/api/profile` | Profil pengguna — **hardcoded**, bukan dari DB | tidak ada |
| GET | `/api/surahs` | Daftar surah — **hardcoded** (hanya 1 entri Al-Ikhlas) | tidak ada |
| GET | `/api/quran/surah/:id` | Proxy ke `https://equran.id/api/v2/surat/:id`, transformasi ke bentuk internal, cache 1 jam + SWR 24 jam | tidak ada |
| GET | `/api/quran/audio/:surahId/:ayahId` | Redirect 302 ke CDN audio EQuran.id (Misyari Rasyid Al-Afasi) | tidak ada |
| POST | `/api/practice/complete` | Validasi & simpan sesi latihan ke `practice_sessions` + `xp_ledger` (userId hardcode `1`); fallback respons sukses jika `env.DB` tidak tersedia | tidak ada |
| * | `/api/*` lainnya | 404 JSON `{ error: "Endpoint tidak ditemukan." }` | — |
| * | non-`/api/*` | 404 kosong (asset handling diserahkan ke Cloudflare Workers Assets, lihat `wrangler.jsonc` → `run_worker_first: ["/api/*"]`) | — |

**Tidak ada autentikasi/otorisasi apa pun** di layer API saat ini — semua endpoint publik, `userId` pada penyimpanan sesi di-hardcode ke `1`. Ini harus jadi prioritas sebelum multi-user nyata (lihat [PRD.md](PRD.md) §4).

**Keamanan diterapkan sebagian:**
- Header `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin` pada semua respons JSON.
- Validasi tipe & rentang input di `/api/practice/complete` (integer positif, `loops` dibatasi ≤1000, dsb).
- Validasi rentang `surahId` (1–114) dan `ayahId` (1–286) sebelum proxy/redirect.
- `cache-control: no-store` default untuk endpoint dinamis; publik+cache untuk data surah statis (aman karena tidak mengandung data pengguna).

## 4. Alur Data Kunci
1. **Ambil ayat**: `PracticePage` → `getQuranSurah(112)` → `GET /api/quran/surah/112` → proxy EQuran.id → jika gagal, frontend fallback ke `fallbackAyahs` lokal (hardcoded Al-Ikhlas) sehingga app tetap fungsional offline/API down.
2. **Selesaikan sesi**: `PracticePage.finish()` → `completePractice()` → `POST /api/practice/complete` → insert `practice_sessions` → insert `xp_ledger` (kunci unik `practice:{sessionId}` mencegah XP ganda) → jika gagal, UI tetap menampilkan pesan "tersimpan di perangkat" (optimistic, tanpa retry queue nyata saat ini).
3. **Audio**: URL audio tidak pernah menunjuk langsung ke CDN dari frontend — selalu lewat `/api/quran/audio/:s/:a` yang redirect 302, sehingga backend bisa mengganti sumber audio di kemudian hari tanpa ubah frontend.

## 5. Environment & Konfigurasi
- Binding D1: `DB` (lihat `wrangler.jsonc`), `database_id` masih placeholder `00000000-...` — harus diisi id database D1 asli sebelum deploy.
- `compatibility_date: 2026-05-20`.
- Assets mode SPA: `not_found_handling: single-page-application`, dengan `/api/*` selalu diarahkan ke Worker (`run_worker_first`).

## 6. Perintah Pengembangan
```bash
npm run dev              # vite dev (frontend + worker via cloudflare vite plugin)
npm run build             # build produksi
npm run typecheck         # tsc --noEmit
npm run db:generate        # generate migration Drizzle dari schema.ts
npm run db:migrate:local    # terapkan migrasi ke D1 lokal
npm run db:migrate:remote   # terapkan migrasi ke D1 remote
npm run db:seed:local       # jalankan seeds/local.sql ke D1 lokal
```

## 7. Ketergantungan Eksternal
- **EQuran.id API** (`https://equran.id/api/v2`) — sumber data ayat & audio murottal. Tidak ada API key. Jika layanan ini down/berubah kontrak, endpoint `/api/quran/surah/:id` akan mengembalikan 503 dan frontend fallback ke data statis Al-Ikhlas.
- **Google OAuth 2.0** — untuk tombol "Masuk/Daftar dengan Google" ([apps/worker/routes/oauth.ts](../apps/worker/routes/oauth.ts)). Tanpa konfigurasi, endpoint `/api/auth/google/start` mengembalikan 501 dan tombolnya gagal dengan aman (tidak merusak alur email/password).

### 7.1 Setup Google OAuth
1. Buat OAuth Client ID (tipe "Web application") di [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Tambahkan Authorized redirect URI: `https://<domain-produksi>/api/auth/google/callback` (dan `http://localhost:5173/api/auth/google/callback` untuk dev lokal).
3. Set secret ke Worker (jangan taruh di `wrangler.jsonc` — itu ter-commit ke repo):
   ```bash
   cd apps/web
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```
4. Untuk dev lokal, buat `apps/web/.dev.vars` (sudah di-gitignore secara default oleh Wrangler) berisi:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   ```
5. Pengguna baru yang daftar lewat Google otomatis diberi peran `parent` (bisa diubah lagi nanti setelah ada UI ubah peran — belum tersedia, lihat §8). `id_token` dari Google divalidasi klaim `aud`/`iss`/`email_verified`/`exp`-nya tanpa verifikasi tanda tangan JWKS penuh — cukup aman karena token diperoleh lewat pertukaran server-ke-server (authorization code + client secret), bukan dikirim langsung dari klien; tingkatkan ke verifikasi JWKS penuh jika threat model berubah.

## 8. Known Gaps (lihat juga [PRD.md](PRD.md) §4)
- Tidak ada sistem autentikasi/sesi pengguna.
- Endpoint CRUD untuk `classes`, `assignments`, `ayah_progress`, `badges`, `user_badges`, `encouragements`, `parent_children` belum ada — meski tabel sudah termigrasi.
- `@tanstack/react-router` ter-install tapi tidak digunakan (routing masih manual via `location.hash`).
- Tidak ada test otomatis (unit/e2e) di repo ini saat dokumen ini ditulis.
