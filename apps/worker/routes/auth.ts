import { and, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { credentials, parentChildren, passwordResetTokens, sessions, users } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";
import {
  clearSessionCookieHeader, generateSessionToken, hashPassword,
  sessionExpiry, setSessionCookieHeader, verifyPassword,
} from "../lib/auth";
import { publicUser } from "../lib/profile";
import { getClientIp, rateLimit, rateLimitResponse } from "../lib/rate-limit";
import { emailConfigFromEnv, RESET_EMAIL_HTML, sendEmail } from "../lib/email";

const REGISTERABLE_ROLES = ["student", "teacher", "parent"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = ["L", "P"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const handleRegister: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/register" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/register");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const displayName = String(body?.displayName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");

  if (!displayName || !EMAIL_RE.test(email) || password.length < 8 || !REGISTERABLE_ROLES.includes(role as typeof REGISTERABLE_ROLES[number])) {
    return json({ error: "Data pendaftaran tidak valid. Periksa nama, email, kata sandi (min. 8 karakter), dan peran." }, 400, {}, "no-store");
  }

  const [existing] = await db.select({ id: credentials.id }).from(credentials).where(eq(credentials.email, email)).limit(1);
  if (existing) return json({ error: "Email sudah terdaftar." }, 409, {}, "no-store");

  const [user] = await db.insert(users).values({ displayName, role: role as typeof REGISTERABLE_ROLES[number] }).returning();
  const passwordHash = await hashPassword(password);
  await db.insert(credentials).values({ userId: user.id, email, passwordHash });

  const token = generateSessionToken();
  const expiresAt = sessionExpiry();
  await db.insert(sessions).values({ token, userId: user.id, activeUserId: user.id, expiresAt });

  return json({ user: publicUser(user) }, 201, { "set-cookie": setSessionCookieHeader(token, url) }, "no-store");
};

export const handleLogin: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/login" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/login");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return json({ error: "Email dan kata sandi wajib diisi." }, 400, {}, "no-store");

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
  if (ctx.sessionToken) {
    if (env.DB) {
      const db = getDb({ DB: env.DB });
      await db.delete(sessions).where(eq(sessions.token, ctx.sessionToken));
    }
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookieHeader(url) }, "no-store");
};

export const handleMe: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/me" || request.method !== "GET") return null;
  if (!ctx.currentUser) return json({ error: "Belum masuk." }, 401, {}, "no-store");

  let children: ReturnType<typeof publicUser>[] = [];
  let loginUser = ctx.currentUser;
  if (ctx.loginUserId) {
    if (env.DB) {
      const db = getDb({ DB: env.DB });
      const rows = await db.select().from(users).where(eq(users.managedBy, ctx.loginUserId));
      children = rows.map(publicUser);
      if (ctx.loginUserId !== ctx.currentUser.id) {
        const [row] = await db.select().from(users).where(eq(users.id, ctx.loginUserId)).limit(1);
        if (row) loginUser = publicUser(row);
      }
    }
  }
  return json({ user: ctx.currentUser, loginUser, children, isActingAsChild: ctx.loginUserId !== ctx.currentUser.id }, 200, {}, "no-store");
};

export const handleCreateChild: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/children" || request.method !== "POST") return null;
  if (!ctx.currentUser || !ctx.loginUserId) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (ctx.currentUser.role !== "parent" || ctx.loginUserId !== ctx.currentUser.id) {
    return json({ error: "Hanya akun orang tua yang dapat menambah profil anak." }, 403, {}, "no-store");
  }
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const displayName = String(body?.displayName ?? "").trim();
  const gender = String(body?.gender ?? "");
  const birthDate = String(body?.birthDate ?? "");
  const validBirthDate = DATE_RE.test(birthDate) && !Number.isNaN(Date.parse(birthDate)) && new Date(birthDate).getTime() <= Date.now();

  if (!displayName) return json({ error: "Nama anak wajib diisi." }, 400, {}, "no-store");
  if (!GENDER_VALUES.includes(gender as typeof GENDER_VALUES[number])) return json({ error: "Jenis kelamin wajib dipilih." }, 400, {}, "no-store");
  if (!validBirthDate) return json({ error: "Tanggal lahir tidak valid." }, 400, {}, "no-store");

  const [child] = await db.insert(users).values({
    displayName, role: "student", managedBy: ctx.loginUserId,
    gender: gender as typeof GENDER_VALUES[number], birthDate,
  }).returning();
  await db.insert(parentChildren).values({ parentId: ctx.loginUserId, childId: child.id });

  return json({ child: publicUser(child) }, 201, {}, "no-store");
};

export const handleSwitchProfile: RouteHandler = async (request, url, env, ctx) => {
  if (url.pathname !== "/api/auth/switch-profile" || request.method !== "POST") return null;
  if (!ctx.currentUser || !ctx.loginUserId || !ctx.sessionToken) return json({ error: "Belum masuk." }, 401, {}, "no-store");
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const targetId = Number(body?.userId);
  if (!Number.isInteger(targetId)) return json({ error: "Profil tidak valid." }, 400, {}, "no-store");

  const allowed = targetId === ctx.loginUserId
    || (await db.select({ id: users.id }).from(users).where(and(eq(users.id, targetId), eq(users.managedBy, ctx.loginUserId))).limit(1)).length > 0;
  if (!allowed) return json({ error: "Kamu tidak memiliki akses ke profil ini." }, 403, {}, "no-store");

  await db.update(sessions).set({ activeUserId: targetId }).where(eq(sessions.token, ctx.sessionToken));
  const [user] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  return json({ user: publicUser(user) }, 200, {}, "no-store");
};

export const handleForgotPassword: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/forgot-password" || request.method !== "POST") return null;
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = await rateLimit(env, ip, "/api/auth/forgot-password");
  if (!allowed) return rateLimitResponse(retryAfterMs);
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email) return json({ error: "Email wajib diisi." }, 400, {}, "no-store");

  const [cred] = await db.select().from(credentials).where(eq(credentials.email, email)).limit(1);
  if (cred) {
    const resetToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.insert(passwordResetTokens).values({ token: resetToken, userId: cred.userId, expiresAt });

    const emailCfg = emailConfigFromEnv(env as unknown as Record<string, unknown>);
    const resetUrl = `${url.origin}/reset-password?token=${resetToken}`;
    const [user] = await db.select().from(users).where(eq(users.id, cred.userId)).limit(1);
    await sendEmail(emailCfg, {
      to: email,
      subject: "Atur Ulang Kata Sandi — Murojaah",
      html: RESET_EMAIL_HTML(resetUrl, user?.displayName ?? "Pengguna"),
    });
  }

  return json({ message: "Jika email tersebut terdaftar, tautan reset sudah dikirim." }, 200, {}, "no-store");
};

export const handleResetPassword: RouteHandler = async (request, url, env) => {
  if (url.pathname !== "/api/auth/reset-password" || request.method !== "POST") return null;
  if (!env.DB) return json({ error: "Layanan belum tersedia." }, 503, {}, "no-store");
  const db = getDb({ DB: env.DB });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const token = String(body?.token ?? "").trim();
  const newPassword = String(body?.password ?? "");

  if (!token || newPassword.length < 8) {
    return json({ error: "Token atau kata sandi tidak valid. Kata sandi minimal 8 karakter." }, 400, {}, "no-store");
  }

  const [resetRow] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  if (!resetRow || new Date(resetRow.expiresAt).getTime() < Date.now()) {
    return json({ error: "Tautan sudah kadaluarsa atau tidak valid." }, 400, {}, "no-store");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(credentials).set({ passwordHash }).where(eq(credentials.userId, resetRow.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

  return json({ message: "Kata sandi berhasil diatur ulang. Silakan masuk." }, 200, {}, "no-store");
};
