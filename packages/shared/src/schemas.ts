import { z } from "zod";

const gender = z.enum(["L", "P"]);
const role = z.enum(["student", "teacher", "parent", "admin"]);
const selfRole = role.exclude(["admin"]);
const mastery = z.enum(["Belum hafal", "Perlu latihan", "Sudah hafal"]);

export const textSize = z.enum(["Sedang", "Besar", "Sangat besar"]);

export const registerSchema = z.object({
  displayName: z.string().min(1).max(100).transform(s => s.trim()),
  email: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
  password: z.string().min(8).max(256),
  role: selfRole,
});

export const loginSchema = z.object({
  email: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
  password: z.string().min(1),
});

export const createChildSchema = z.object({
  displayName: z.string().min(1).max(100).transform(s => s.trim()),
  gender,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(val => !Number.isNaN(Date.parse(val)) && new Date(val).getTime() <= Date.now(), "Tanggal lahir tidak valid"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).transform(s => s.trim()).optional(),
  dailyTarget: z.number().int().min(1).max(240).optional(),
  preferences: z.object({
    textSize: textSize.optional(),
    showTransliteration: z.boolean().optional(),
    showTranslation: z.boolean().optional(),
  }).optional(),
  role: selfRole.optional(),
});

export const practiceCompleteSchema = z.object({
  surahId: z.number().int().positive(),
  startAyah: z.number().int().positive(),
  endAyah: z.number().int(),
  loops: z.number().int().min(1).max(1000),
  duration: z.number().nonnegative(),
  clientId: z.string().min(1).optional(),
}).refine(val => val.endAyah >= val.startAyah, { message: "endAyah harus >= startAyah" });

export const createClassSchema = z.object({
  name: z.string().min(1).max(200).transform(s => s.trim()),
});

export const joinClassSchema = z.object({
  joinCode: z.string().min(1).max(20).transform(s => s.trim().toUpperCase()),
});

export const createAssignmentSchema = z.object({
  classId: z.number().int().positive().nullish(),
  studentId: z.number().int().positive().nullish(),
  surahId: z.number().int().positive(),
  startAyah: z.number().int().positive(),
  endAyah: z.number().int(),
  targetLoops: z.number().int().positive(),
  dueAt: z.string().optional(),
}).refine(val => (val.classId ?? val.studentId) != null, { message: "classId atau studentId wajib diisi" })
  .refine(val => val.endAyah >= val.startAyah, { message: "endAyah harus >= startAyah" });

export const createEncouragementSchema = z.object({
  childId: z.number().int().positive(),
  message: z.string().min(1).max(1000).transform(s => s.trim()),
});

export const upsertAyahProgressSchema = z.object({
  surahId: z.number().int().positive(),
  number: z.number().int().positive(),
  mastery,
});

export const switchProfileSchema = z.object({
  userId: z.number().int().positive(),
});

export const adminDeleteUsersSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token diperlukan."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});
