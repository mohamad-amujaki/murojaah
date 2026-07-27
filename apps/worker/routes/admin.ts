import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  assignments, ayahProgress, classes, classMembers, credentials, encouragements,
  oauthAccounts, parentChildren, practiceSessions, sessions, userBadges, users, xpLedger,
} from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, parseBody, readJsonBody } from "../lib/http";
import { requireAuth, requireOwnedChild, requireRole } from "../lib/guards";
import { computeUserStats } from "../lib/stats";
import { findOrNotFound, updateReturning } from "../lib/db-helpers";
import { parseProfileFieldUpdates, publicUser } from "../lib/profile";
import { adminDeleteUsersSchema } from "@murojaah/shared/schemas";

export const handleAdminStats: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/admin/stats" || request.method !== "GET") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat mengakses statistik ini.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const roleCounts = await db.select({ role: users.role, count: sql<number>`count(*)` }).from(users).groupBy(users.role);
  const countFor = (role: string) => roleCounts.find(r => r.role === role)?.count ?? 0;

  const [{ totalSessions }] = await db.select({ totalSessions: sql<number>`count(*)` }).from(practiceSessions);
  const [{ totalXp }] = await db.select({ totalXp: sql<number>`coalesce(sum(${xpLedger.amount}), 0)` }).from(xpLedger);
  const [{ totalClasses }] = await db.select({ totalClasses: sql<number>`count(*)` }).from(classes);

  return json({
    totalUsers: roleCounts.reduce((sum, r) => sum + r.count, 0),
    totalStudents: countFor("student"),
    totalTeachers: countFor("teacher"),
    totalParents: countFor("parent"),
    totalPracticeSessions: totalSessions,
    totalXpAwarded: totalXp,
    totalClasses,
  }, 200, {}, "no-store");
};

export const handleChildStats: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/children\/(\d+)\/stats$/);
  if (!match || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;
  if (user.role !== "parent" || ctx.loginUserId !== user.id) {
    return json({ error: "Hanya akun orang tua yang dapat melihat statistik anak." }, 403, {}, "no-store");
  }

  const childId = Number(match[1]);
  const child = await requireOwnedChild(db, childId, ctx.loginUserId);
  if (child instanceof Response) return child;

  return json(await computeUserStats(db, childId), 200, {}, "no-store");
};

export const handleUpdateChild: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/children\/(\d+)$/);
  if (!match || request.method !== "PATCH") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;
  if (user.role !== "parent" || ctx.loginUserId !== user.id) {
    return json({ error: "Hanya akun orang tua yang dapat mengubah profil anak." }, 403, {}, "no-store");
  }

  const childId = Number(match[1]);
  const child = await requireOwnedChild(db, childId, ctx.loginUserId);
  if (child instanceof Response) return child;

  const body = await readJsonBody(request);
  const parsed = parseProfileFieldUpdates(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400, {}, "no-store");

  const updated = await updateReturning(db, users, parsed.updates, childId);
  return json({ child: publicUser(updated) }, 200, {}, "no-store");
};

export const handleListAdminUsers: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/admin/users" || request.method !== "GET") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat mengakses data ini.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const roleFilter = url.searchParams.get("role");
  const q = url.searchParams.get("q");
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 25), 100);

  const conditions = [];
  if (roleFilter) conditions.push(eq(users.role, roleFilter as "student" | "teacher" | "parent" | "admin"));
  if (q) conditions.push(like(users.displayName, `%${q}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(users).where(where).offset(offset).limit(limit),
    db.select({ total: sql<number>`count(*)` }).from(users).where(where),
  ]);
  return json({ users: rows.map(publicUser), total }, 200, {}, "no-store");
};

export const handleUpdateAdminUser: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (!match || request.method !== "PATCH") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat mengubah data ini.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const targetId = Number(match[1]);
  const target = await findOrNotFound(db, users, eq(users.id, targetId), "Pengguna tidak ditemukan.");
  if (target instanceof Response) return target;

  const body = await readJsonBody(request);
  const parsed = parseProfileFieldUpdates(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400, {}, "no-store");

  const updated = await updateReturning(db, users, parsed.updates, targetId);
  return json({ user: publicUser(updated) }, 200, {}, "no-store");
};

export const handleAdminListClasses: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/admin/classes" || request.method !== "GET") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat mengakses data ini.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const rows = await db.select({
    id: classes.id,
    name: classes.name,
    teacherId: classes.teacherId,
    teacherName: users.displayName,
    joinCode: classes.joinCode,
    status: classes.status,
    memberCount: sql<number>`(select count(*) from ${classMembers} where ${classMembers.classId} = ${classes.id})`,
  }).from(classes).leftJoin(users, eq(classes.teacherId, users.id));

  return json({ classes: rows }, 200, {}, "no-store");
};

export const handleDeleteAdminUsers: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/admin/users/delete" || request.method !== "POST") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat menghapus pengguna.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, adminDeleteUsersSchema);
  if (parsed instanceof Response) return parsed;
  const ids = parsed.ids;

  await db.transaction(async (tx) => {
    await tx.delete(credentials).where(inArray(credentials.userId, ids));
    await tx.delete(oauthAccounts).where(inArray(oauthAccounts.userId, ids));
    await tx.delete(sessions).where(or(inArray(sessions.userId, ids), inArray(sessions.activeUserId, ids)));
    await tx.delete(parentChildren).where(or(inArray(parentChildren.parentId, ids), inArray(parentChildren.childId, ids)));
    await tx.update(users).set({ managedBy: null }).where(inArray(users.managedBy, ids));
    await tx.delete(practiceSessions).where(inArray(practiceSessions.userId, ids));
    await tx.delete(ayahProgress).where(inArray(ayahProgress.userId, ids));
    await tx.delete(userBadges).where(inArray(userBadges.userId, ids));
    await tx.delete(xpLedger).where(inArray(xpLedger.userId, ids));
    await tx.delete(encouragements).where(or(inArray(encouragements.parentId, ids), inArray(encouragements.childId, ids)));
    await tx.delete(classMembers).where(inArray(classMembers.studentId, ids));
    await tx.delete(assignments).where(or(inArray(assignments.creatorId, ids), inArray(assignments.studentId, ids)));
    await tx.update(classes).set({ teacherId: null }).where(inArray(classes.teacherId, ids));
    await tx.delete(users).where(inArray(users.id, ids));
  });

  return json({ ok: true }, 200, {}, "no-store");
};
