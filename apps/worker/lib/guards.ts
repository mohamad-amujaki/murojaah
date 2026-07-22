import { eq } from "drizzle-orm";
import { users } from "@murojaah/db";
import { getDb } from "@murojaah/db/client";
import type { CurrentUser, Env, RequestContext } from "./http";
import { json } from "./http";

type Db = ReturnType<typeof getDb>;

// ponytail: every handler repeated this same "logged in? DB up?" pair — collapsed
// into one call so route files only carry their own logic.
export function requireAuth(env: Env, ctx: RequestContext): { user: CurrentUser; db: Db } | Response {
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  return { user: ctx.currentUser, db: getDb({ DB: env.DB }) };
}

// For pre-auth routes (register/login) that only need the DB, not a logged-in user.
export function requireDb(env: Env): { db: Db } | Response {
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  return { db: getDb({ DB: env.DB }) };
}

export function requireRole(
  env: Env, ctx: RequestContext, role: CurrentUser["role"] | CurrentUser["role"][], message: string,
): { user: CurrentUser; db: Db } | Response {
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(guard.user.role)) return json({ error: message }, 403, {}, "no-store");
  return guard;
}

// ponytail: "is this child managed by this parent" was checked ad-hoc in admin/encouragements routes.
export async function requireOwnedChild(
  db: Db, childId: number, parentId: number,
): Promise<{ id: number; managedBy: number | null } | Response> {
  const [child] = await db.select({ id: users.id, managedBy: users.managedBy }).from(users).where(eq(users.id, childId)).limit(1);
  if (!child) return json({ error: "Profil anak tidak ditemukan." }, 404, {}, "no-store");
  if (child.managedBy !== parentId) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");
  return child;
}
