import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { ayahProgress, ayahs } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";

const MASTERY_VALUES = ["Belum hafal", "Perlu latihan", "Sudah hafal"] as const;

export const handleUpsertAyahProgress: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/ayah-progress" || request.method !== "POST") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const surahId = Number(body?.surahId);
  const number = Number(body?.number);
  const mastery = String(body?.mastery ?? "");
  if (!Number.isInteger(surahId) || !Number.isInteger(number) || !MASTERY_VALUES.includes(mastery as typeof MASTERY_VALUES[number])) {
    return json({ error: "Data progres ayat tidak valid." }, 400, {}, "no-store");
  }

  const [ayah] = await db.select().from(ayahs).where(and(eq(ayahs.surahId, surahId), eq(ayahs.number, number))).limit(1);
  if (!ayah) return json({ error: "Ayat belum tersedia di database." }, 404, {}, "no-store");

  await db.insert(ayahProgress).values({
    userId: ctx.currentUser.id, ayahId: ayah.id, mastery, repetitions: 1, lastPracticedAt: sql`CURRENT_TIMESTAMP`,
  }).onConflictDoUpdate({
    target: [ayahProgress.userId, ayahProgress.ayahId],
    set: { mastery, repetitions: sql`${ayahProgress.repetitions} + 1`, lastPracticedAt: sql`CURRENT_TIMESTAMP` },
  });

  return json({ ok: true }, 201, {}, "no-store");
};

export const handleGetAyahProgress: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/ayah-progress" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const surahId = Number(url.searchParams.get("surahId"));
  if (!Number.isInteger(surahId)) return json({ error: "surahId wajib diisi." }, 400, {}, "no-store");

  const rows = await db.select({ number: ayahs.number, mastery: ayahProgress.mastery, repetitions: ayahProgress.repetitions })
    .from(ayahProgress)
    .innerJoin(ayahs, eq(ayahProgress.ayahId, ayahs.id))
    .where(and(eq(ayahProgress.userId, ctx.currentUser.id), eq(ayahs.surahId, surahId)));
  return json({ progress: rows }, 200, {}, "no-store");
};
