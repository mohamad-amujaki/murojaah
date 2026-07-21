import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { ayahProgress, ayahs, surahs, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { publicUser } from "../lib/profile";
import { computeUserStats } from "../lib/stats";

const TEXT_SIZES = ["Sedang", "Besar", "Sangat besar"];
const SELF_ROLE_VALUES = ["student", "teacher", "parent"] as const;

export const handleUpdateProfile: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me" || request.method !== "PATCH") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const updates: Record<string, unknown> = {};

  if (body?.displayName !== undefined) {
    const displayName = String(body.displayName).trim();
    if (!displayName) return json({ error: "Nama tampilan tidak boleh kosong." }, 400, {}, "no-store");
    updates.displayName = displayName;
  }
  if (body?.dailyTarget !== undefined) {
    const dailyTarget = Number(body.dailyTarget);
    if (!Number.isInteger(dailyTarget) || dailyTarget < 1 || dailyTarget > 240) return json({ error: "Target harian tidak valid." }, 400, {}, "no-store");
    updates.dailyTarget = dailyTarget;
  }
  if (body?.preferences !== undefined && typeof body.preferences === "object" && body.preferences !== null) {
    const incoming = body.preferences as Record<string, unknown>;
    const current = ctx.currentUser.preferences;
    const textSize = typeof incoming.textSize === "string" && TEXT_SIZES.includes(incoming.textSize) ? incoming.textSize : current.textSize;
    const showTransliteration = typeof incoming.showTransliteration === "boolean" ? incoming.showTransliteration : current.showTransliteration;
    const showTranslation = typeof incoming.showTranslation === "boolean" ? incoming.showTranslation : current.showTranslation;
    updates.preferences = JSON.stringify({ textSize, showTransliteration, showTranslation });
  }
  if (body?.role !== undefined) {
    const role = String(body.role);
    if (!SELF_ROLE_VALUES.includes(role as typeof SELF_ROLE_VALUES[number])) return json({ error: "Peran tidak valid." }, 400, {}, "no-store");
    updates.role = role as "student" | "teacher" | "parent";
  }

  if (Object.keys(updates).length === 0) return json({ error: "Tidak ada perubahan yang dikirim." }, 400, {}, "no-store");

  const [updated] = await db.update(users).set(updates as Partial<typeof users.$inferInsert>).where(eq(users.id, ctx.currentUser.id)).returning();
  return json({ user: publicUser(updated) }, 200, {}, "no-store");
};

export const handleMyStats: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me/stats" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  return json(await computeUserStats(db, ctx.currentUser.id), 200, {}, "no-store");
};

// ponytail: naive spaced-repetition — oldest-touched, not-yet-mastered ayah wins.
// No SM-2/forgetting-curve math; upgrade if murid volume ever demands it.
export const handleSuggestion: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me/suggestion" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const [weakest] = await db.select({
    surahId: ayahs.surahId,
    number: ayahs.number,
    mastery: ayahProgress.mastery,
    lastPracticedAt: ayahProgress.lastPracticedAt,
    ayahCount: surahs.ayahCount,
  })
    .from(ayahProgress)
    .innerJoin(ayahs, eq(ayahProgress.ayahId, ayahs.id))
    .innerJoin(surahs, eq(ayahs.surahId, surahs.id))
    .where(and(eq(ayahProgress.userId, ctx.currentUser.id), ne(ayahProgress.mastery, "Sudah hafal")))
    .orderBy(asc(ayahProgress.lastPracticedAt))
    .limit(1);

  if (!weakest) return json({ suggestion: null }, 200, {}, "no-store");

  const startAyah = weakest.number;
  const endAyah = Math.min(weakest.number + 3, weakest.ayahCount);
  return json({
    suggestion: {
      surahId: weakest.surahId,
      startAyah,
      endAyah,
      mastery: weakest.mastery,
    },
  }, 200, {}, "no-store");
};
