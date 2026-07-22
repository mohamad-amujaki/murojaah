import { desc, eq } from "drizzle-orm";
import { encouragements, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, readJsonBody } from "../lib/http";
import { requireAuth, requireOwnedChild, requireRole } from "../lib/guards";
import { findOrNotFound, insertReturning } from "../lib/db-helpers";

export const handleCreateEncouragement: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/encouragements" || request.method !== "POST") return null;
  const guard = requireRole(env, ctx, "parent", "Hanya orang tua yang dapat mengirim dukungan.");
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const body = await readJsonBody(request);
  const childId = Number(body?.childId);
  const message = String(body?.message ?? "").trim();
  if (!Number.isInteger(childId) || !message) return json({ error: "Pesan dan penerima wajib diisi." }, 400, {}, "no-store");

  const child = await requireOwnedChild(db, childId, user.id);
  if (child instanceof Response) return child;

  const created = await insertReturning(db, encouragements, { parentId: user.id, childId, message });
  return json({ encouragement: created }, 201, {}, "no-store");
};

export const handleListEncouragements: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/encouragements" || request.method !== "GET") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const rows = await db.select({
    id: encouragements.id, message: encouragements.message, isRead: encouragements.isRead,
    createdAt: encouragements.createdAt, parentName: users.displayName,
  }).from(encouragements)
    .innerJoin(users, eq(encouragements.parentId, users.id))
    .where(eq(encouragements.childId, user.id))
    .orderBy(desc(encouragements.createdAt));
  return json({ encouragements: rows }, 200, {}, "no-store");
};

export const handleMarkEncouragementRead: RouteHandler = async (request, url, env, ctx) => {
  const match = url.pathname.match(/^\/api\/encouragements\/(\d+)\/read$/);
  if (!match || request.method !== "PATCH") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;

  const encouragementId = Number(match[1]);
  const row = await findOrNotFound(db, encouragements, eq(encouragements.id, encouragementId), "Pesan tidak ditemukan.");
  if (row instanceof Response) return row;
  if (row.childId !== user.id) return json({ error: "Bukan pesan untukmu." }, 403, {}, "no-store");

  await db.update(encouragements).set({ isRead: true }).where(eq(encouragements.id, encouragementId));
  return json({ ok: true }, 200, {}, "no-store");
};
