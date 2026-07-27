import { and, eq, inArray, or } from "drizzle-orm";
import { assignments, classMembers, practiceSessions, xpLedger } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, parseBody } from "../lib/http";
import { requireAuth } from "../lib/guards";
import { evaluateBadges } from "../lib/badges";
import { getClientIp, rateLimit, rateLimitResponse } from "../lib/rate-limit";
import { practiceCompleteSchema } from "@murojaah/shared/schemas";

const SUCCESS_MESSAGE = "MasyaAllah, sesi berhasil diselesaikan!";

export const handlePracticeComplete: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/practice/complete" || request.method !== "POST") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/practice/complete");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const userId = user.id;

  const parsed = await parseBody(request, practiceCompleteSchema);
  if (parsed instanceof Response) return parsed;
  const { surahId, startAyah: start, endAyah: end, loops, duration, clientId: rawClientId } = parsed;
  const clientId = rawClientId ?? null;

  try {

    if (clientId) {
      const [existing] = await db.select({ id: practiceSessions.id }).from(practiceSessions).where(eq(practiceSessions.clientId, clientId)).limit(1);
      if (existing) return json({ xp: 35, message: SUCCESS_MESSAGE }, 201, {}, "no-store");
    }

    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(practiceSessions).values({
        userId, surahId, startAyah: start, endAyah: end,
        loops, duration: Math.round(duration), status: "completed", clientId,
      });
      const sid = inserted.insertId;
      if (!sid) throw new Error("Sesi tidak berhasil dibuat");
      await tx.insert(xpLedger).values({ userId, source: `practice:${sid}`, amount: 35 });
    });

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
