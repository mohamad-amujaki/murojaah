import { and, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { classMembers, classes, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import { parseProfileFieldUpdates, publicUser } from "../lib/profile";

export const handleListTeacherStudents: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/teacher/students" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "teacher") return json({ error: "Hanya guru yang dapat mengakses data ini." }, 403, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const rows = await db.select({ student: users, className: classes.name })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .innerJoin(users, eq(classMembers.studentId, users.id))
    .where(eq(classes.teacherId, ctx.currentUser.id));

  const byId = new Map<number, ReturnType<typeof publicUser> & { classNames: string[] }>();
  for (const row of rows) {
    const existing = byId.get(row.student.id);
    if (existing) existing.classNames.push(row.className);
    else byId.set(row.student.id, { ...publicUser(row.student), classNames: [row.className] });
  }
  return json({ students: [...byId.values()] }, 200, {}, "no-store");
};

export const handleUpdateStudent: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/students\/(\d+)$/);
  if (!match || request.method !== "PATCH") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "teacher") return json({ error: "Hanya guru yang dapat mengubah profil murid." }, 403, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const studentId = Number(match[1]);
  const [enrolled] = await db.select({ id: classMembers.id })
    .from(classMembers)
    .innerJoin(classes, eq(classMembers.classId, classes.id))
    .where(and(eq(classMembers.studentId, studentId), eq(classes.teacherId, ctx.currentUser.id)))
    .limit(1);
  if (!enrolled) return json({ error: "Murid tidak ditemukan di kelas kamu." }, 403, {}, "no-store");

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parseProfileFieldUpdates(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400, {}, "no-store");

  const [updated] = await db.update(users).set(parsed.updates).where(eq(users.id, studentId)).returning();
  return json({ student: publicUser(updated) }, 200, {}, "no-store");
};
