import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { index, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["student", "teacher", "parent", "admin"] }).notNull(),
  status: text("status").notNull().default("active"),
  dailyTarget: int("daily_target").notNull().default(10),
  preferences: text("preferences"),
  gender: text("gender", { enum: ["L", "P"] }),
  birthDate: text("birth_date"),
  managedBy: int("managed_by").references((): AnySQLiteColumn => users.id),
  allSessionsRevokedAt: text("all_sessions_revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const credentials = sqliteTable("credentials", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("user_id").notNull().unique().references(() => users.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const oauthAccounts = sqliteTable("oauth_accounts", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, t => [uniqueIndex("oauth_provider_account").on(t.provider, t.providerAccountId)]);
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  activeUserId: int("active_user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const refreshTokens = sqliteTable("refresh_tokens", {
  token: text("token").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deviceInfo: text("device_info"),
});
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  token: text("token").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const surahs = sqliteTable("surahs", { id: int("id").primaryKey(), latinName: text("latin_name").notNull(), arabicName: text("arabic_name").notNull(), meaning: text("meaning").notNull(), ayahCount: int("ayah_count").notNull() });
export const ayahs = sqliteTable("ayahs", { id: int("id").primaryKey({ autoIncrement: true }), surahId: int("surah_id").notNull().references(()=>surahs.id), number: int("number").notNull(), arabic: text("arabic").notNull(), transliteration: text("transliteration"), translation: text("translation").notNull(), audioUrl: text("audio_url").notNull() }, t=>[uniqueIndex("ayah_surah_number").on(t.surahId,t.number)]);
export const classes = sqliteTable("classes", { id:int("id").primaryKey({autoIncrement:true}), name:text("name").notNull(), teacherId:int("teacher_id").notNull().references(()=>users.id), joinCode:text("join_code").notNull().unique(), status:text("status").notNull().default("active") });
export const classMembers = sqliteTable("class_members", { id:int("id").primaryKey({autoIncrement:true}), classId:int("class_id").notNull().references(()=>classes.id), studentId:int("student_id").notNull().references(()=>users.id) },t=>[uniqueIndex("class_student").on(t.classId,t.studentId)]);
export const parentChildren = sqliteTable("parent_children", { id:int("id").primaryKey({autoIncrement:true}), parentId:int("parent_id").notNull().references(()=>users.id), childId:int("child_id").notNull().references(()=>users.id) },t=>[uniqueIndex("parent_child").on(t.parentId,t.childId)]);
export const assignments = sqliteTable("assignments", { id:int("id").primaryKey({autoIncrement:true}), creatorId:int("creator_id").notNull().references(()=>users.id), classId:int("class_id").references(()=>classes.id), studentId:int("student_id").references(()=>users.id), surahId:int("surah_id").notNull().references(()=>surahs.id), startAyah:int("start_ayah").notNull(), endAyah:int("end_ayah").notNull(), targetLoops:int("target_loops").notNull(), dueAt:text("due_at"), status:text("status").notNull().default("active") });
export const practiceSessions = sqliteTable("practice_sessions", { id:int("id").primaryKey({autoIncrement:true}), userId:int("user_id").notNull().references(()=>users.id), surahId:int("surah_id").notNull().references(()=>surahs.id), startAyah:int("start_ayah").notNull(), endAyah:int("end_ayah").notNull(), loops:int("loops").notNull(), duration:int("duration").notNull(), status:text("status").notNull(), clientId:text("client_id").unique(), completedAt:text("completed_at").default(sql`CURRENT_TIMESTAMP`) },t=>[index("session_user_date").on(t.userId,t.completedAt)]);
export const ayahProgress = sqliteTable("ayah_progress", { id:int("id").primaryKey({autoIncrement:true}), userId:int("user_id").notNull().references(()=>users.id), ayahId:int("ayah_id").notNull().references(()=>ayahs.id), mastery:text("mastery").notNull(), repetitions:int("repetitions").notNull().default(0), lastPracticedAt:text("last_practiced_at") },t=>[uniqueIndex("progress_user_ayah").on(t.userId,t.ayahId)]);
export const badges = sqliteTable("badges", { id:int("id").primaryKey({autoIncrement:true}), code:text("code").notNull().unique(), name:text("name").notNull(), description:text("description").notNull(), icon:text("icon").notNull() });
export const userBadges = sqliteTable("user_badges", { id:int("id").primaryKey({autoIncrement:true}), userId:int("user_id").notNull().references(()=>users.id), badgeId:int("badge_id").notNull().references(()=>badges.id), earnedAt:text("earned_at").notNull().default(sql`CURRENT_TIMESTAMP`) },t=>[uniqueIndex("user_badge").on(t.userId,t.badgeId)]);
export const xpLedger = sqliteTable("xp_ledger", { id:int("id").primaryKey({autoIncrement:true}), userId:int("user_id").notNull().references(()=>users.id), source:text("source").notNull().unique(), amount:int("amount").notNull(), createdAt:text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) });
export const encouragements = sqliteTable("encouragements", { id:int("id").primaryKey({autoIncrement:true}), parentId:int("parent_id").notNull().references(()=>users.id), childId:int("child_id").notNull().references(()=>users.id), message:text("message").notNull(), isRead:int("is_read",{mode:"boolean"}).notNull().default(false), createdAt:text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) });
