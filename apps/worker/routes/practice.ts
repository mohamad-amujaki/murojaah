import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { assignments, classMembers, practiceSessions, xpLedger } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { evaluateBadges } from "../lib/badges";
import { getClientIp, rateLimit, rateLimitResponse } from "../lib/rate-limit";

const SUCCESS_MESSAGE = "MasyaAllah, sesi berhasil diselesaikan!";

export const handlePracticeComplete: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/practice/complete" || request.method !== "POST") return null;
  if (!ctx.currentUser) return json({ error: "Silakan masuk untuk menyimpan sesi latihan." }, 401, {}, "no-store");
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/practice/complete");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const userId = ctx.currentUser.id;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: "Format data sesi tidak valid." }, 400, {}, "no-store");
  }

  const surahId = Number(body.surahId);
  const start = Number(body.startAyah);
  const end = Number(body.endAyah);
  const loops = Number(body.loops);
  const duration = Number(body.duration);
  const clientId = typeof body.clientId === "string" && body.clientId.length > 0 ? body.clientId : null;
  const valid = Number.isInteger(surahId) && surahId > 0
    && Number.isInteger(start) && start > 0
    && Number.isInteger(end) && end >= start
    && Number.isInteger(loops) && loops > 0 && loops <= 1000
    && Number.isFinite(duration) && duration >= 0;

  if (!valid) return json({ error: "Data sesi latihan tidak valid." }, 400, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan sesi latihan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  try {

    if (clientId) {
      const [existing] = await db.select({ id: practiceSessions.id }).from(practiceSessions).where(eq(practiceSessions.clientId, clientId)).limit(1);
      if (existing) return json({ xp: 35, message: SUCCESS_MESSAGE }, 201, {}, "no-store");
    }

    const inserted = await db.insert(practiceSessions).values({
      userId,
      surahId,
      startAyah: start,
      endAyah: end,
      loops,
      duration: Math.round(duration),
      status: "completed",
      clientId,
    }).returning({ id: practiceSessions.id });
    const sessionId = inserted[0]?.id;
    if (!sessionId) throw new Error("Sesi tidak berhasil dibuat");
    await db.insert(xpLedger).values({ userId, source: `practice:${sessionId}`, amount: 35 });
    await evaluateBadges(db, userId).catch(err => console.error("Gagal mengevaluasi lencana", err));

    const memberOf = await db.select({ classId: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, userId));
    const classIds = memberOf.map(r => r.classId);
    const classCond = classIds.length > 0 ? inArray(assignments.classId, classIds) : undefined;
    const matchingAssignments = await db.select({ id: assignments.id }).from(assignments)
      .where(and(
        eq(assignments.status, "active"),
        eq(assignments.surahId, surahId),
        classCond ? or(eq(assignments.studentId, userId), classCond) : eq(assignments.studentId, userId),
      ));
    for (const a of matchingAssignments) {
      await db.update(assignments).set({ status: "completed" }).where(eq(assignments.id, a.id)).catch(() => undefined);
    }

    return json({ xp: 35, message: SUCCESS_MESSAGE }, 201, {}, "no-store");
  } catch (error) {
    console.error("Gagal menyimpan sesi latihan", error);
    return json({ error: "Sesi belum dapat disimpan. Silakan coba lagi." }, 503, {}, "no-store");
  }
};
