import { sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { boolean, index, int, mysqlEnum, mysqlTable, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

const nowText = (name: string) => text(name).notNull().default(sql`(CURRENT_TIMESTAMP())`);

export const users = mysqlTable("mu_users", {
  id: int("id").autoincrement().primaryKey(),
  displayName: text("display_name").notNull(),
  role: mysqlEnum("role", ["student", "teacher", "parent", "admin"]).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  dailyTarget: int("daily_target").notNull().default(10),
  preferences: text("preferences"),
  gender: mysqlEnum("gender", ["L", "P"]),
  birthDate: varchar("birth_date", { length: 10 }),
  managedBy: int("managed_by").references((): AnyMySqlColumn => users.id),
  allSessionsRevokedAt: text("all_sessions_revoked_at"),
  createdAt: nowText("created_at"),
});
export const credentials = mysqlTable("mu_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: nowText("created_at"),
});
export const oauthAccounts = mysqlTable("mu_oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 191 }).notNull(),
  email: text("email").notNull(),
  createdAt: nowText("created_at"),
}, t => [uniqueIndex("oauth_provider_account").on(t.provider, t.providerAccountId)]);
export const sessions = mysqlTable("mu_sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  activeUserId: int("active_user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: nowText("created_at"),
});
export const surahs = mysqlTable("mu_surahs", { id: int("id").primaryKey(), latinName: text("latin_name").notNull(), arabicName: text("arabic_name").notNull(), meaning: text("meaning").notNull(), ayahCount: int("ayah_count").notNull() });
export const ayahs = mysqlTable("mu_ayahs", { id: int("id").autoincrement().primaryKey(), surahId: int("surah_id").notNull().references(()=>surahs.id), number: int("number").notNull(), arabic: text("arabic").notNull(), transliteration: text("transliteration"), translation: text("translation").notNull(), audioUrl: text("audio_url").notNull() }, t=>[uniqueIndex("ayah_surah_number").on(t.surahId,t.number)]);
export const classes = mysqlTable("mu_classes", { id:int("id").autoincrement().primaryKey(), name:text("name").notNull(), teacherId:int("teacher_id").notNull().references(()=>users.id), joinCode:varchar("join_code", { length: 20 }).notNull().unique(), status:varchar("status", { length: 20 }).notNull().default("active") });
export const classMembers = mysqlTable("mu_class_members", { id:int("id").autoincrement().primaryKey(), classId:int("class_id").notNull().references(()=>classes.id), studentId:int("student_id").notNull().references(()=>users.id) },t=>[uniqueIndex("class_student").on(t.classId,t.studentId)]);
export const parentChildren = mysqlTable("mu_parent_children", { id:int("id").autoincrement().primaryKey(), parentId:int("parent_id").notNull().references(()=>users.id), childId:int("child_id").notNull().references(()=>users.id) },t=>[uniqueIndex("parent_child").on(t.parentId,t.childId)]);
export const assignments = mysqlTable("mu_assignments", { id:int("id").autoincrement().primaryKey(), creatorId:int("creator_id").notNull().references(()=>users.id), classId:int("class_id").references(()=>classes.id), studentId:int("student_id").references(()=>users.id), surahId:int("surah_id").notNull().references(()=>surahs.id), startAyah:int("start_ayah").notNull(), endAyah:int("end_ayah").notNull(), targetLoops:int("target_loops").notNull(), dueAt:text("due_at"), status:varchar("status", { length: 20 }).notNull().default("active") });
export const practiceSessions = mysqlTable("mu_practice_sessions", { id:int("id").autoincrement().primaryKey(), userId:int("user_id").notNull().references(()=>users.id), surahId:int("surah_id").notNull().references(()=>surahs.id), startAyah:int("start_ayah").notNull(), endAyah:int("end_ayah").notNull(), loops:int("loops").notNull(), duration:int("duration").notNull(), status:varchar("status", { length: 20 }).notNull(), clientId:varchar("client_id", { length: 64 }).unique(), completedAt:varchar("completed_at", { length: 30 }).default(sql`(CURRENT_TIMESTAMP())`) },t=>[index("session_user_date").on(t.userId,t.completedAt)]);
export const ayahProgress = mysqlTable("mu_ayah_progress", { id:int("id").autoincrement().primaryKey(), userId:int("user_id").notNull().references(()=>users.id), ayahId:int("ayah_id").notNull().references(()=>ayahs.id), mastery:varchar("mastery", { length: 30 }).notNull(), repetitions:int("repetitions").notNull().default(0), lastPracticedAt:text("last_practiced_at") },t=>[uniqueIndex("progress_user_ayah").on(t.userId,t.ayahId)]);
export const badges = mysqlTable("mu_badges", { id:int("id").autoincrement().primaryKey(), code:varchar("code", { length: 50 }).notNull().unique(), name:text("name").notNull(), description:text("description").notNull(), icon:text("icon").notNull() });
export const userBadges = mysqlTable("mu_user_badges", { id:int("id").autoincrement().primaryKey(), userId:int("user_id").notNull().references(()=>users.id), badgeId:int("badge_id").notNull().references(()=>badges.id), earnedAt:nowText("earned_at") },t=>[uniqueIndex("user_badge").on(t.userId,t.badgeId)]);
export const xpLedger = mysqlTable("mu_xp_ledger", { id:int("id").autoincrement().primaryKey(), userId:int("user_id").notNull().references(()=>users.id), source:varchar("source", { length: 64 }).notNull().unique(), amount:int("amount").notNull(), createdAt:nowText("created_at") });
export const encouragements = mysqlTable("mu_encouragements", { id:int("id").autoincrement().primaryKey(), parentId:int("parent_id").notNull().references(()=>users.id), childId:int("child_id").notNull().references(()=>users.id), message:text("message").notNull(), isRead:boolean("is_read").notNull().default(false), createdAt:nowText("created_at") });
