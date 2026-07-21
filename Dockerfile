# ---------- Build stage: compiles frontend + bundles worker ----------
FROM node:20-alpine AS build

WORKDIR /build

# Toolchain for native modules during pnpm install (stage is discarded)
RUN apk add --no-cache python3 make g++ \
  && corepack enable

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

# Worker bundle (esbuild) + frontend static build (vite)
RUN node scripts/build.mjs \
  && pnpm --filter @murojaah/web exec vite build --config vite.config.docker.ts

# ---------- Runtime stage ----------
FROM node:20-alpine

LABEL maintainer="Murojaah"

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Built artifacts from the build stage
COPY --from=build /build/dist/worker ./dist/worker
COPY --from=build /build/apps/web/dist ./static

# Migrations + Quran seed, auto-applied by server.mjs on startup
COPY packages/db/migrations ./migrations
COPY packages/db/seeds/quran-full.mysql.sql ./seeds/quran-full.mysql.sql

COPY server.mjs ./

ENV NODE_ENV=production
ENV PORT=8787
ENV STATIC_DIR=/app/static

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8787/health || exit 1

ENTRYPOINT ["dumb-init", "node", "/app/server.mjs"]
