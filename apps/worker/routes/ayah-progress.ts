import { and, eq, sql } from "drizzle-orm";
import { ayahProgress, ayahs } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, readJsonBody } from "../lib/http";
import { requireAuth } from "../lib/guards";
import { findOrNotFound } from "../lib/db-helpers";

const MASTERY_VALUES = ["Belum hafal", "Perlu latihan", "Sudah hafal"] as const;

export const handleUpsertAyahProgress: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/ayah-progress" || request.method !== "POST") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const body = await readJsonBody(request);
  const surahId = Number(body?.surahId);
  const number = Number(body?.number);
  const mastery = String(body?.mastery ?? "");
  if (!Number.isInteger(surahId) || !Number.isInteger(number) || !MASTERY_VALUES.includes(mastery as typeof MASTERY_VALUES[number])) {
    return json({ error: "Data progres ayat tidak valid." }, 400, {}, "no-store");
  }

  const ayah = await findOrNotFound(db, ayahs, and(eq(ayahs.surahId, surahId), eq(ayahs.number, number))!, "Ayat belum tersedia di database.");
  if (ayah instanceof Response) return ayah;

  await db.insert(ayahProgress).values({
    userId: user.id, ayahId: ayah.id, mastery, repetitions: 1, lastPracticedAt: sql`CURRENT_TIMESTAMP`,
  }).onDuplicateKeyUpdate({
    set: { mastery, repetitions: sql`${ayahProgress.repetitions} + 1`, lastPracticedAt: sql`CURRENT_TIMESTAMP` },
  });

  return json({ ok: true }, 201, {}, "no-store");
};

export const handleGetAyahProgress: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/ayah-progress" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const surahId = Number(url.searchParams.get("surahId"));
  if (!Number.isInteger(surahId)) return json({ error: "surahId wajib diisi." }, 400, {}, "no-store");

  const rows = await db.select({ number: ayahs.number, mastery: ayahProgress.mastery, repetitions: ayahProgress.repetitions })
    .from(ayahProgress)
    .innerJoin(ayahs, eq(ayahProgress.ayahId, ayahs.id))
    .where(and(eq(ayahProgress.userId, user.id), eq(ayahs.surahId, surahId)));
  return json({ progress: rows }, 200, {}, "no-store");
};
