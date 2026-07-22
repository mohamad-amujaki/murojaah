import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { getDb } from "@murojaah/db/client";
import { ayahProgress, ayahs, practiceSessions, surahs, xpLedger } from "@murojaah/db";
import { computeStreak } from "./streak";

type Db = ReturnType<typeof getDb>;
const XP_PER_LEVEL = 200;

export async function computeUserStats(db: Db, userId: number) {
  const xpRows = await db.select({ amount: xpLedger.amount, createdAt: xpLedger.createdAt }).from(xpLedger).where(eq(xpLedger.userId, userId));
  const totalXp = xpRows.reduce((sum, row) => sum + row.amount, 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyXp = xpRows.filter(row => new Date(row.createdAt).getTime() >= weekAgo).reduce((sum, row) => sum + row.amount, 0);

  const sessionsRows = await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId));
  const totalRepetitions = sessionsRows.reduce((sum, s) => sum + s.loops, 0);
  const totalDurationSeconds = sessionsRows.reduce((sum, s) => sum + s.duration, 0);

  const streak = computeStreak(sessionsRows.map(s => s.completedAt ?? ""));

  const masteredRows = await db.select({ id: ayahProgress.id }).from(ayahProgress).where(eq(ayahProgress.userId, userId));
  const ayahsMastered = masteredRows.length;

  const recentSessionsData = sessionsRows
    .slice()
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5);

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
    const masteredRows = await db.select({ count: sql<number>`count(*)` })
      .from(ayahProgress)
      .innerJoin(ayahs, eq(ayahProgress.ayahId, ayahs.id))
      .where(and(eq(ayahProgress.userId, userId), eq(ayahs.surahId, lastSession.surahId), eq(ayahProgress.mastery, "Sudah hafal")));
    masteredInSurah = masteredRows[0]?.count ?? 0;
  }

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const weeklyChart: { day: string; minutes: number; xp: number }[] = [];
  let weeklyMinutes = 0;
  let weeklyRepetitions = 0;
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dayStr = date.toISOString().slice(0, 10);
    const daySessions = sessionsRows.filter(s => (s.completedAt ?? "").startsWith(dayStr));
    const dayMinutes = Math.round(daySessions.reduce((sum, s) => sum + s.duration, 0) / 60);
    const dayXp = xpRows.filter(x => new Date(x.createdAt).toISOString().slice(0, 10) === dayStr).reduce((sum, x) => sum + x.amount, 0);
    weeklyChart.push({ day: dayNames[date.getDay()], minutes: dayMinutes, xp: dayXp });
    weeklyMinutes += dayMinutes;
    weeklyRepetitions += daySessions.reduce((sum, s) => sum + s.loops, 0);
  }

  return {
    totalXp,
    weeklyXp,
    streak,
    ayahsMastered,
    totalRepetitions,
    totalDurationSeconds,
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
