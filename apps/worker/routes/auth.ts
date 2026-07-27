import { and, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { credentials, parentChildren, passwordResetTokens, sessions, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json, parseBody } from "../lib/http";
import { requireAuth, requireDb } from "../lib/guards";
import {
  clearSessionCookieHeader, generateSessionToken, hashPassword,
  sessionExpiry, setSessionCookieHeader, verifyPassword,
} from "../lib/auth";
import { publicUser } from "../lib/profile";
import { getClientIp, rateLimit, rateLimitResponse } from "../lib/rate-limit";
import { insertReturning } from "../lib/db-helpers";
import { generateResetToken, resetTokenExpiry, sendPasswordResetEmail } from "../lib/email";
import { forgotPasswordSchema, resetPasswordSchema, registerSchema, loginSchema, createChildSchema, switchProfileSchema } from "@murojaah/shared/schemas";

export const handleRegister: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/register" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/register");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, registerSchema);
  if (parsed instanceof Response) return parsed;
  const { displayName, email, password, role } = parsed;

  const [existing] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.email, email)).limit(1);
  if (existing) return json({ error: "Email sudah terdaftar." }, 409, {}, "no-store");

  const passwordHash = await hashPassword(password);
  const token = generateSessionToken();
  const expiresAt = sessionExpiry();

  const { user } = await db.transaction(async (tx) => {
    const user = await insertReturning(tx, users, { displayName, role });
    await tx.insert(credentials).values({ userId: user.id, email, passwordHash });
    await tx.insert(sessions).values({ token, userId: user.id, activeUserId: user.id, expiresAt });
    return { user };
  });

  return json({ user: publicUser(user) }, 201, { "set-cookie": setSessionCookieHeader(token, url) }, "no-store");
};

export const handleLogin: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/login" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/login");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, loginSchema);
  if (parsed instanceof Response) return parsed;
  const { email, password } = parsed;

  const [row] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return json({ error: "Email atau kata sandi salah." }, 401, {}, "no-store");
  }
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user) return json({ error: "Email atau kata sandi salah." }, 401, {}, "no-store");

  const token = generateSessionToken();
  const expiresAt = sessionExpiry();
  await db.insert(sessions).values({ token, userId: user.id, activeUserId: user.id, expiresAt });

  return json({ user: publicUser(user) }, 200, { "set-cookie": setSessionCookieHeader(token, url) }, "no-store");
};

export const handleLogout: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/logout" || request.method !== "POST") return null;
  if (ctx.sessionToken && env.DB) {
    const db = getDb({ DB: env.DB });
    await db.delete(sessions).where(eq(sessions.token, ctx.sessionToken));
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookieHeader(url) }, "no-store");
};

export const handleMe: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/me" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");

  let children: ReturnType<typeof publicUser>[] = [];
  let loginUser = ctx.currentUser;
  if (ctx.loginUserId && env.DB) {
    const db = getDb({ DB: env.DB });
    const rows = await db.select().from(users).where(eq(users.managedBy, ctx.loginUserId));
    children = rows.map(publicUser);
    if (ctx.loginUserId !== ctx.currentUser.id) {
      const [row] = await db.select().from(users).where(eq(users.id, ctx.loginUserId)).limit(1);
      if (row) loginUser = publicUser(row);
    }
  }
  return json({ user: ctx.currentUser, loginUser, children, isActingAsChild: ctx.loginUserId !== ctx.currentUser.id }, 200, {}, "no-store");
};

export const handleCreateChild: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/children" || request.method !== "POST") return null;
  const guard = requireAuth(env, ctx);
  if (guard instanceof Response) return guard;
  const { user, db } = guard;
  if (user.role !== "parent" || ctx.loginUserId !== user.id) {
    return json({ error: "Hanya akun orang tua yang dapat menambah profil anak." }, 403, {}, "no-store");
  }

  const parsed = await parseBody(request, createChildSchema);
  if (parsed instanceof Response) return parsed;
  const { displayName, gender, birthDate } = parsed;

  const { child } = await db.transaction(async (tx) => {
    const child = await insertReturning(tx, users, {
      displayName, role: "student", managedBy: user.id, gender, birthDate,
    });
    await tx.insert(parentChildren).values({ parentId: user.id, childId: child.id });
    return { child };
  });

  return json({ child: publicUser(child) }, 201, {}, "no-store");
};

export const handleSwitchProfile: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/switch-profile" || request.method !== "POST") return null;
  if (!ctx.currentUser || !ctx.loginUserId || !ctx.sessionToken) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, switchProfileSchema);
  if (parsed instanceof Response) return parsed;
  const targetId = parsed.userId;

  const allowed = targetId === ctx.loginUserId
    || (await db.select({ id: users.id }).from(users).where(and(eq(users.id, targetId), eq(users.managedBy, ctx.loginUserId))).limit(1)).length > 0;
  if (!allowed) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");

  await db.update(sessions).set({ activeUserId: targetId }).where(eq(sessions.token, ctx.sessionToken));
  const [user] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  return json({ user: publicUser(user) }, 200, {}, "no-store");
};

export const handleForgotPassword: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/forgot-password" || request.method !== "POST") return null;
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, forgotPasswordSchema);
  if (parsed instanceof Response) return parsed;
  const { email } = parsed;

  const [cred] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
  if (!cred) return json({ error: "Email tidak ditemukan." }, 404, {}, "no-store");

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, cred.userId));

  const token = generateResetToken();
  const expiresAt = resetTokenExpiry();
  await db.insert(passwordResetTokens).values({ token, userId: cred.userId, expiresAt });

  const baseUrl = env.MU_APP_URL || `${url.protocol}//${url.host}`;
  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(env, email, resetLink);

  return json({ ok: true, message: "Tautan reset dikirim ke email." }, 200, {}, "no-store");
};

export const handleResetPassword: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/reset-password" || request.method !== "POST") return null;
  const guard = requireDb(env);
  if (guard instanceof Response) return guard;
  const { db } = guard;

  const parsed = await parseBody(request, resetPasswordSchema);
  if (parsed instanceof Response) return parsed;
  const { token, password } = parsed;

  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  if (!row) return json({ error: "Tautan reset tidak valid." }, 404, {}, "no-store");
  if (new Date(row.expiresAt) < new Date()) return json({ error: "Tautan reset sudah kedaluwarsa." }, 410, {}, "no-store");

  const passwordHash = await hashPassword(password);
  await db.update(credentials).set({ passwordHash }).where(eq(credentials.userId, row.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

  return json({ ok: true, message: "Kata sandi berhasil diubah." }, 200, {}, "no-store");
};
