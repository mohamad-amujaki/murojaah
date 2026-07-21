import { eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { badges, userBadges } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";

export const handleListBadges: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/badges" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const all = await db.select().from(badges);
  const earned = await db.select().from(userBadges).where(eq(userBadges.userId, ctx.currentUser.id));
  const earnedByBadgeId = new Map(earned.map(row => [row.badgeId, row.earnedAt]));

  return json({
    badges: all.map(badge => ({
      ...badge,
      earned: earnedByBadgeId.has(badge.id),
      earnedAt: earnedByBadgeId.get(badge.id) ?? null,
    })),
  }, 200, {}, "no-store");
};
