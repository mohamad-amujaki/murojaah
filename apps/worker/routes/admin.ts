import { eq, sql } from "drizzle-orm";
import { classes, practiceSessions, users, xpLedger } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { requireAuth, requireRole } from "../lib/guards";
import { computeUserStats } from "../lib/stats";
import { updateReturning } from "../lib/db-helpers";
import { parseProfileFieldUpdates, publicUser } from "../lib/profile";

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
  const [child] = await db.select({ id: users.id, managedBy: users.managedBy }).from(users).where(eq(users.id, childId)).limit(1);
  if (!child) return json({ error: "Profil anak tidak ditemukan." }, 404, {}, "no-store");
  if (child.managedBy !== ctx.loginUserId) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");

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
  const [child] = await db.select({ id: users.id, managedBy: users.managedBy }).from(users).where(eq(users.id, childId)).limit(1);
  if (!child) return json({ error: "Profil anak tidak ditemukan." }, 404, {}, "no-store");
  if (child.managedBy !== ctx.loginUserId) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
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
  const rows = roleFilter
    ? await db.select().from(users).where(eq(users.role, roleFilter as "student" | "teacher" | "parent" | "admin"))
    : await db.select().from(users);
  return json({ users: rows.map(publicUser) }, 200, {}, "no-store");
};

export const handleUpdateAdminUser: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (!match || request.method !== "PATCH") return null;
  const guard = requireRole(env, ctx, "admin", "Hanya admin yang dapat mengubah data ini.");
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const targetId = Number(match[1]);
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) return json({ error: "Pengguna tidak ditemukan." }, 404, {}, "no-store");

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parseProfileFieldUpdates(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400, {}, "no-store");

  const updated = await updateReturning(db, users, parsed.updates, targetId);
  return json({ user: publicUser(updated) }, 200, {}, "no-store");
};
