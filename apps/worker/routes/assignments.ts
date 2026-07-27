import { eq, inArray, or } from "drizzle-orm";
import { assignments, classMembers, classes } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, parseBody } from "../lib/http";
import { requireAuth, requireRole } from "../lib/guards";
import { insertReturning } from "../lib/db-helpers";
import { createAssignmentSchema } from "@murojaah/shared/schemas";

export const handleCreateAssignment: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/assignments" || request.method !== "POST") return null;
  const guard = requireRole(env, ctx, "teacher", "Hanya guru yang dapat membuat tugas.");
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const parsed = await parseBody(request, createAssignmentSchema);
  if (parsed instanceof Response) return parsed;
  const { classId, studentId, surahId, startAyah, endAyah, targetLoops, dueAt } = parsed;

  if (classId) {
    const [target] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!target || target.teacherId !== user.id) return json({ error: "Kelas tidak ditemukan atau bukan milikmu." }, 403, {}, "no-store");
  }

  const created = await insertReturning(db, assignments, {
    creatorId: user.id, classId, studentId, surahId, startAyah, endAyah, targetLoops, dueAt,
  });
  return json({ assignment: created }, 201, {}, "no-store");
};

export const handleListAssignments: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/assignments" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  if (user.role === "teacher") {
    const rows = await db.select().from(assignments).where(eq(assignments.creatorId, user.id));
    return json({ assignments: rows }, 200, {}, "no-store");
  }

  const memberOf = await db.select({ classId: classMembers.classId }).from(classMembers).where(eq(classMembers.studentId, user.id));
  const classIds = memberOf.map(row => row.classId);
  const rows = await db.select().from(assignments).where(
    classIds.length > 0
      ? or(eq(assignments.studentId, user.id), inArray(assignments.classId, classIds))
      : eq(assignments.studentId, user.id),
  );
  return json({ assignments: rows }, 200, {}, "no-store");
};
