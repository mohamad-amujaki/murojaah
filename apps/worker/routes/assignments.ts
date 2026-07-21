import { eq, inArray, or } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { assignments, classMembers, classes } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";

export const handleCreateAssignment: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/assignments" || request.method !== "POST") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "teacher") return json({ error: "Hanya guru yang dapat membuat tugas." }, 403, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const classId = body?.classId != null ? Number(body.classId) : null;
  const studentId = body?.studentId != null ? Number(body.studentId) : null;
  const surahId = Number(body?.surahId);
  const startAyah = Number(body?.startAyah);
  const endAyah = Number(body?.endAyah);
  const targetLoops = Number(body?.targetLoops);
  const dueAt = body?.dueAt ? String(body.dueAt) : null;

  const valid = (classId || studentId) && Number.isInteger(surahId) && surahId > 0
    && Number.isInteger(startAyah) && startAyah > 0
    && Number.isInteger(endAyah) && endAyah >= startAyah
    && Number.isInteger(targetLoops) && targetLoops > 0;
  if (!valid) return json({ error: "Data tugas tidak valid." }, 400, {}, "no-store");

  if (classId) {
    const [target] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!target || target.teacherId !== ctx.currentUser.id) return json({ error: "Kelas tidak ditemukan atau bukan milikmu." }, 403, {}, "no-store");
  }

  const [created] = await db.insert(assignments).values({
    creatorId: ctx.currentUser.id, classId, studentId, surahId, startAyah, endAyah, targetLoops, dueAt,
  }).returning();
  return json({ assignment: created }, 201, {}, "no-store");
};

export const handleListAssignments: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/assignments" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  if (ctx.currentUser.role === "teacher") {
    const rows = await db.select().from(assignments).where(eq(assignments.creatorId, ctx.currentUser.id));
    return json({ assignments: rows }, 200, {}, "no-store");
  }

  const memberOf = await db.select({ classId: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, ctx.currentUser.id));
  const classIds = memberOf.map(row => row.classId);
  const rows = await db.select().from(assignments).where(
    classIds.length > 0
      ? or(eq(assignments.studentId, ctx.currentUser.id), inArray(assignments.classId, classIds))
      : eq(assignments.studentId, ctx.currentUser.id),
  );
  return json({ assignments: rows }, 200, {}, "no-store");
};
