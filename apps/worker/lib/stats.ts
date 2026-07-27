import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { getDb } from "@murojaah/db/client";
import { ayahProgress, ayahs, practiceSessions, surahs, xpLedger } from "@murojaah/db";
import { computeStreak } from "./streak";

type Db = ReturnType<typeof getDb>;
const XP_PER_LEVEL = 200;

export async function computeUserStats(db: Db, userId: number) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [[xpRow], [sessionAgg], [{ count: ayahsMastered }]] = await Promise.all([
    db.select({
      totalXp: sql<number>`coalesce(sum(${xpLedger.amount}), 0)`,
      weeklyXp: sql<number>`coalesce(sum(case when ${xpLedger.createdAt} >= ${weekAgo} then ${xpLedger.amount} else 0 end), 0)`,
    }).from(xpLedger).where(eq(xpLedger.userId, userId)),
    db.select({
      totalRepetitions: sql<number>`coalesce(sum(${practiceSessions.loops}), 0)`,
      totalDurationSeconds: sql<number>`coalesce(sum(${practiceSessions.duration}), 0)`,
    }).from(practiceSessions).where(eq(practiceSessions.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(ayahProgress).where(eq(ayahProgress.userId, userId)),
  ]);

  const totalXp = xpRow.totalXp;
  const weeklyXp = xpRow.weeklyXp;

  const sessionDates = await db.select({ completedAt: practiceSessions.completedAt })
    .from(practiceSessions)
    .where(eq(practiceSessions.userId, userId));
  const streak = computeStreak(sessionDates.map(s => s.completedAt ?? ""));

  const recentSessionsData = await db.select()
    .from(practiceSessions)
    .where(eq(practiceSessions.userId, userId))
    .orderBy(desc(practiceSessions.completedAt))
    .limit(5);

  const sessionIds = recentSessionsData.map(s => s.id);
  const xpPerSession = new Map<number, number>();
  if (sessionIds.length > 0) {
    const xpForSessions = await db.select({ source: xpLedger.source, amount: xpLedger.amount })
      .from(xpLedger)
      .where(inArray(xpLedger.source, sessionIds.map(id => `practice:${id}`)));
    for (const row of xpForSessions) {
      const id = parseInt(row.source.split(":")[1], 10);
      xpPerSession.set(id, row.amount);
    }
  }

  const recentSessions = recentSessionsData.map(s => ({
    id: s.id,
    surahId: s.surahId,
    startAyah: s.startAyah,
    endAyah: s.endAyah,
    loops: s.loops,
    completedAt: s.completedAt ?? "",
    xpEarned: xpPerSession.get(s.id) ?? 35,
  }));

  const [lastSession] = await db.select()
    .from(practiceSessions)
    .where(eq(practiceSessions.userId, userId))
    .orderBy(desc(practiceSessions.completedAt))
    .limit(1);

  let lastSurahId: number | null = null;
  let lastSurahAyahCount = 0;
  let lastPracticedAt: string | null = null;
  let masteredInSurah = 0;

  if (lastSession) {
    lastSurahId = lastSession.surahId;
    lastPracticedAt = lastSession.completedAt;
    const [surahInfo] = await db.select({ ayahCount: surahs.ayahCount }).from(surahs).where(eq(surahs.id, lastSession.surahId)).limit(1);
    lastSurahAyahCount = surahInfo?.ayahCount ?? 0;
    const [masteredRow] = await db.select({ count: sql<number>`count(*)` })
      .from(ayahProgress)
      .innerJoin(ayahs, eq(ayahProgress.ayahId, ayahs.id))
      .where(and(eq(ayahProgress.userId, userId), eq(ayahs.surahId, lastSession.surahId), eq(ayahProgress.mastery, "Sudah hafal")));
    masteredInSurah = masteredRow?.count ?? 0;
  }

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const chartStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const weeklySessions = await db.select({
    completedAt: practiceSessions.completedAt,
    duration: practiceSessions.duration,
    loops: practiceSessions.loops,
  }).from(practiceSessions)
    .where(and(eq(practiceSessions.userId, userId), gte(practiceSessions.completedAt, chartStart)));

  const weeklyXpRows = weeklyXp > 0 ? await db.select({ createdAt: xpLedger.createdAt, amount: xpLedger.amount })
    .from(xpLedger)
    .where(and(eq(xpLedger.userId, userId), gte(xpLedger.createdAt, chartStart)))
  : [];

  const weeklyChart: { day: string; minutes: number; xp: number }[] = [];
  let weeklyMinutes = 0;
  let weeklyRepetitions = 0;

  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dayStr = date.toISOString().slice(0, 10);
    const daySessions = weeklySessions.filter(s => (s.completedAt ?? "").startsWith(dayStr));
    const dayMinutes = Math.round(daySessions.reduce((sum, s) => sum + s.duration, 0) / 60);
    const dayXp = weeklyXpRows.filter(x => x.createdAt.startsWith(dayStr)).reduce((sum, x) => sum + x.amount, 0);
    weeklyChart.push({ day: dayNames[date.getDay()], minutes: dayMinutes, xp: dayXp });
    weeklyMinutes += dayMinutes;
    weeklyRepetitions += daySessions.reduce((sum, s) => sum + s.loops, 0);
  }

  return {
    totalXp,
    weeklyXp,
    streak,
    ayahsMastered,
    totalRepetitions: sessionAgg.totalRepetitions,
    totalDurationSeconds: sessionAgg.totalDurationSeconds,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpIntoLevel: totalXp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    recentSessions,
    lastSurahId,
    lastSurahAyahCount,
    lastPracticedAt,
    masteredInSurah,
    weeklyMinutes,
    weeklyRepetitions,
    weeklyChart,
  };
}
