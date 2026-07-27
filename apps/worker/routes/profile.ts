import { and, asc, eq, ne } from "drizzle-orm";
import { ayahProgress, ayahs, surahs, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/guards";
import { publicUser } from "../lib/profile";
import { computeUserStats } from "../lib/stats";
import { updateReturning } from "../lib/db-helpers";
import { updateProfileSchema } from "@murojaah/shared/schemas";

export const handleUpdateProfile: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me" || request.method !== "PATCH") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const parsed = await parseBody(request, updateProfileSchema);
  if (parsed instanceof Response) return parsed;
  const updates: Record<string, unknown> = {};

  if (parsed.displayName !== undefined) updates.displayName = parsed.displayName;
  if (parsed.dailyTarget !== undefined) updates.dailyTarget = parsed.dailyTarget;
  if (parsed.preferences !== undefined) {
    const current = user.preferences;
    updates.preferences = JSON.stringify({
      textSize: parsed.preferences.textSize ?? current.textSize,
      showTransliteration: parsed.preferences.showTransliteration ?? current.showTransliteration,
      showTranslation: parsed.preferences.showTranslation ?? current.showTranslation,
    });
  }
  if (parsed.role !== undefined) updates.role = parsed.role;

  if (Object.keys(updates).length === 0) return json({ error: "Tidak ada perubahan yang dikirim." }, 400, {}, "no-store");

  const updated = await updateReturning(db, users, updates as Partial<typeof users.$inferInsert>, user.id);
  return json({ user: publicUser(updated) }, 200, {}, "no-store");
};

export const handleMyStats: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me/stats" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  return json(await computeUserStats(db, user.id), 200, {}, "no-store");
};

// ponytail: naive spaced-repetition — oldest-touched, not-yet-mastered ayah wins.
// No SM-2/forgetting-curve math; upgrade if murid volume ever demands it.
export const handleSuggestion: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/me/suggestion" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

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
    .where(and(eq(ayahProgress.userId, user.id), ne(ayahProgress.mastery, "Sudah hafal")))
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
