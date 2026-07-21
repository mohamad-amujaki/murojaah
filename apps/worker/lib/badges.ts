import { eq } from "drizzle-orm";
import type { getDb } from "@murojaah/db/client";
import { badges, practiceSessions, userBadges } from "@murojaah/db";

type Db = ReturnType<typeof getDb>;

async function earn(db: Db, userId: number, code: string) {
  const [badge] = await db.select().from(badges).where(eq(badges.code, code)).limit(1);
  if (!badge) return;
  await db.insert(userBadges).values({ userId, badgeId: badge.id }).onConflictDoNothing();
}

// ponytail: full rescan of a user's sessions on every completion; switch to incremental counters if volume grows.
export async function evaluateBadges(db: Db, userId: number) {
  const sessions = await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId));
  const sessionCount = sessions.length;
  const ayatTotal = sessions.reduce((sum, s) => sum + (s.endAyah - s.startAyah + 1), 0);

  const dates = new Set(sessions.map(s => (s.completedAt ?? "").slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  if (sessionCount >= 5) await earn(db, userId, "muraja_star");
  if (ayatTotal >= 10) await earn(db, userId, "first_10_ayahs");
  if (streak >= 7) await earn(db, userId, "streak_7");
}
