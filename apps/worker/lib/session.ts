import { eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { sessions, users } from "@murojaah/db";
import { readSessionCookie } from "./auth";
import type { Env, RequestContext } from "./http";
import { publicUser } from "./profile";

export async function resolveContext(request: Request, env: Env): Promise<RequestContext> {
  const empty: RequestContext = { currentUser: null, loginUserId: null, sessionToken: null };
  const token = readSessionCookie(request);
  if (!token) return empty;

  if (!env.DB) return empty;
  const db = getDb({ DB: env.DB });

  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return empty;

  const [activeUser] = await db.select().from(users).where(eq(users.id, session.activeUserId)).limit(1);
  if (!activeUser) return empty;

  if (activeUser.allSessionsRevokedAt && new Date(activeUser.allSessionsRevokedAt) > new Date(session.createdAt)) {
    return empty;
  }

  return { currentUser: publicUser(activeUser), loginUserId: session.userId, sessionToken: token };
}
