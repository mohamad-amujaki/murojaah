import { and, eq, sql } from "drizzle-orm";
import { classMembers, classes, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, readJsonBody } from "../lib/http";
import { requireAuth, requireRole } from "../lib/guards";
import { generateJoinCode } from "../lib/codes";
import { computeUserStats } from "../lib/stats";
import { findOrNotFound, insertReturning } from "../lib/db-helpers";

export const handleCreateClass: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes" || request.method !== "POST") return null;
  const guard = requireRole(env, ctx, "teacher", "Hanya guru yang dapat membuat kelas.");
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const body = await readJsonBody(request);
  const name = String(body?.name ?? "").trim();
  if (!name) return json({ error: "Nama kelas wajib diisi." }, 400, {}, "no-store");

  const joinCode = generateJoinCode();
  const created = await insertReturning(db, classes, { name, teacherId: user.id, joinCode });
  return json({ class: created }, 201, {}, "no-store");
};

export const handleJoinClass: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes/join" || request.method !== "POST") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const body = await readJsonBody(request);
  const joinCode = String(body?.joinCode ?? "").trim().toUpperCase();
  if (!joinCode) return json({ error: "Kode kelas wajib diisi." }, 400, {}, "no-store");

  const target = await findOrNotFound(db, classes, eq(classes.joinCode, joinCode), "Kode kelas tidak ditemukan.");
  if (target instanceof Response) return target;

  await db.insert(classMembers).values({ classId: target.id, studentId: user.id }).onDuplicateKeyUpdate({ set: { id: sql`id` } });
  return json({ class: target }, 201, {}, "no-store");
};

export const handleListClasses: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  if (user.role === "teacher") {
    const rows = await db.select().from(classes).where(eq(classes.teacherId, user.id));
    return json({ classes: rows }, 200, {}, "no-store");
  }
  const rows = await db.select({ id: classes.id, name: classes.name, teacherId: classes.teacherId, joinCode: classes.joinCode, status: classes.status })
    .from(classMembers).innerJoin(classes, eq(classMembers.classId, classes.id)).where(eq(classMembers.studentId, user.id));
  return json({ classes: rows }, 200, {}, "no-store");
};

export const handleClassMembers: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/classes\/(\d+)\/members$/);
  if (!match || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const classId = Number(match[1]);
  const target = await findOrNotFound(db, classes, eq(classes.id, classId), "Kelas tidak ditemukan.");
  if (target instanceof Response) return target;
  if (target.teacherId !== user.id) return json({ error: "Kamu bukan pengajar kelas ini." }, 403, {}, "no-store");

  const members = await db.select({ id: users.id, displayName: users.displayName })
    .from(classMembers).innerJoin(users, eq(classMembers.studentId, users.id)).where(eq(classMembers.classId, classId));
  const withStats = await Promise.all(members.map(async member => {
    const stats = await computeUserStats(db, member.id);
    return { ...member, streak: stats.streak, ayahsMastered: stats.ayahsMastered, totalXp: stats.totalXp };
  }));
  return json({ class: target, members: withStats }, 200, {}, "no-store");
};

export const handleLeaveClass: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/classes\/(\d+)\/leave$/);
  if (!match || request.method !== "DELETE") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const classId = Number(match[1]);
  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, user.id)));
  return json({ ok: true }, 200, {}, "no-store");
};

export const handleRemoveMember: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/classes\/(\d+)\/members\/(\d+)$/);
  if (!match || request.method !== "DELETE") return null;
  const guard = requireRole(env, ctx, "teacher", "Hanya guru yang dapat menghapus murid.");
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const classId = Number(match[1]);
  const studentId = Number(match[2]);
  const [target] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!target || target.teacherId !== user.id) return json({ error: "Kelas tidak ditemukan atau bukan milikmu." }, 403, {}, "no-store");

  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)));
  return json({ ok: true }, 200, {}, "no-store");
};
