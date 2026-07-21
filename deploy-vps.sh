#!/usr/bin/env bash
# Deploy Murojaah ke VPS dengan Docker.
# Image bersifat self-contained (multi-stage build) — tidak perlu build lokal dulu.

set -e
cd "$(dirname "$0")"

echo "=== Build Docker image (build frontend + worker terjadi di dalam image) ==="
docker build -t murojaah:latest .

echo "=== Setup environment ==="
if [ ! -f .env ]; then
  cp docs/.env.example .env
  echo "Created .env from template. Isi GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET."
fi

echo ""
echo "=== Opsi A: EasyPanel (disarankan) ==="
echo "1. Push repo ini ke Git (dist/ tidak perlu di-commit — image build sendiri)."
echo "2. Di EasyPanel: buat App → source Git repo ini → build pakai Dockerfile."
echo "3. Set env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET."
echo "4. Mount volume persisten ke /app/data (WAJIB — di sinilah SQLite hidup)."
echo "5. Arahkan domain + HTTPS di EasyPanel; proxy harus meneruskan X-Forwarded-Proto."
echo "6. Tambahkan redirect URI di Google Console: https://DOMAIN/api/auth/google/callback"
echo ""
echo "=== Opsi B: docker compose manual ==="
echo "1. scp .env user@vps:/opt/murojaah/.env"
echo "2. rsync -av --exclude node_modules --exclude dist --exclude .git ./ user@vps:/opt/murojaah/"
echo "3. Di server: cd /opt/murojaah && docker compose up -d --build"
echo ""
echo "Migrasi database & seed 114 surah berjalan OTOMATIS saat container pertama start."
