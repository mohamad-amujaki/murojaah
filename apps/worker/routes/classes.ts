import { and, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { classMembers, classes, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { generateJoinCode } from "../lib/codes";
import { computeUserStats } from "../lib/stats";

export const handleCreateClass: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes" || request.method !== "POST") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "teacher") return json({ error: "Hanya guru yang dapat membuat kelas." }, 403, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return json({ error: "Nama kelas wajib diisi." }, 400, {}, "no-store");

  const joinCode = generateJoinCode();
  const [created] = await db.insert(classes).values({ name, teacherId: ctx.currentUser.id, joinCode }).returning();
  return json({ class: created }, 201, {}, "no-store");
};

export const handleJoinClass: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes/join" || request.method !== "POST") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const joinCode = String(body?.joinCode ?? "").trim().toUpperCase();
  if (!joinCode) return json({ error: "Kode kelas wajib diisi." }, 400, {}, "no-store");

  const [target] = await db.select().from(classes).where(eq(classes.joinCode, joinCode)).limit(1);
  if (!target) return json({ error: "Kode kelas tidak ditemukan." }, 404, {}, "no-store");

  await db.insert(classMembers).values({ classId: target.id, studentId: ctx.currentUser.id }).onConflictDoNothing();
  return json({ class: target }, 201, {}, "no-store");
};

export const handleListClasses: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/classes" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  if (ctx.currentUser.role === "teacher") {
    const rows = await db.select().from(classes).where(eq(classes.teacherId, ctx.currentUser.id));
    return json({ classes: rows }, 200, {}, "no-store");
  }
  const rows = await db.select({ id: classes.id, name: classes.name, teacherId: classes.teacherId, joinCode: classes.joinCode, status: classes.status })
    .from(classMembers).innerJoin(classes, eq(classMembers.classId, classes.id)).where(eq(classMembers.studentId, ctx.currentUser.id));
  return json({ classes: rows }, 200, {}, "no-store");
};

export const handleClassMembers: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/classes\/(\d+)\/members$/);
  if (!match || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const classId = Number(match[1]);
  const [target] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!target) return json({ error: "Kelas tidak ditemukan." }, 404, {}, "no-store");
  if (target.teacherId !== ctx.currentUser.id) return json({ error: "Kamu bukan pengajar kelas ini." }, 403, {}, "no-store");

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
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const classId = Number(match[1]);
  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, ctx.currentUser.id)));
  return json({ ok: true }, 200, {}, "no-store");
};

export const handleRemoveMember: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/classes\/(\d+)\/members\/(\d+)$/);
  if (!match || request.method !== "DELETE") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "teacher") return json({ error: "Hanya guru yang dapat menghapus murid." }, 403, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const classId = Number(match[1]);
  const studentId = Number(match[2]);
  const [target] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!target || target.teacherId !== ctx.currentUser.id) return json({ error: "Kelas tidak ditemukan atau bukan milikmu." }, 403, {}, "no-store");

  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)));
  return json({ ok: true }, 200, {}, "no-store");
};
