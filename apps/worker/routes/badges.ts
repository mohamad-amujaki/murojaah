import { eq } from "drizzle-orm";
import { badges, userBadges } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { requireAuth } from "../lib/guards";

export const handleListBadges: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/badges" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const all = await db.select().from(badges);
  const earned = await db.select().from(userBadges).where(eq(userBadges.userId, user.id));
  const earnedByBadgeId = new Map(earned.map(row => [row.badgeId, row.earnedAt]));

  return json({
    badges: all.map(badge => ({
      ...badge,
      earned: earnedByBadgeId.has(badge.id),
      earnedAt: earnedByBadgeId.get(badge.id) ?? null,
    })),
  }, 200, {}, "no-store");
};
