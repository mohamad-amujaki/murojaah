import type { UserPreferences } from "@murojaah/shared";

const DEFAULT_PREFERENCES: UserPreferences = {
  textSize: "Besar",
  showTransliteration: true,
  showTranslation: true,
};

export function parsePreferences(raw: string | null): UserPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface UserRow {
  id: number;
  displayName: string;
  role: "student" | "teacher" | "parent" | "admin";
  status: string;
  managedBy: number | null;
  dailyTarget: number;
  preferences: string | null;
  gender: "L" | "P" | null;
  birthDate: string | null;
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    managedBy: user.managedBy,
    dailyTarget: user.dailyTarget,
    preferences: parsePreferences(user.preferences),
    gender: user.gender,
    birthDate: user.birthDate,
  };
}

const GENDER_VALUES = ["L", "P"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ROLE_VALUES = ["student", "teacher", "parent", "admin"] as const;

export interface ProfileFieldUpdates {
  displayName?: string;
  gender?: "L" | "P";
  birthDate?: string;
  role?: typeof ROLE_VALUES[number];
}

export function parseProfileFieldUpdates(body: Record<string, unknown> | null): { updates: ProfileFieldUpdates } | { error: string } {
  const updates: ProfileFieldUpdates = {};
  if (body?.displayName !== undefined) {
    const displayName = String(body.displayName).trim();
    if (!displayName) return { error: "Nama tidak boleh kosong." };
    updates.displayName = displayName;
  }
  if (body?.gender !== undefined) {
    const gender = String(body.gender);
    if (!GENDER_VALUES.includes(gender as typeof GENDER_VALUES[number])) return { error: "Jenis kelamin tidak valid." };
    updates.gender = gender as typeof GENDER_VALUES[number];
  }
  if (body?.birthDate !== undefined) {
    const birthDate = String(body.birthDate);
    if (!DATE_RE.test(birthDate) || Number.isNaN(Date.parse(birthDate)) || new Date(birthDate).getTime() > Date.now()) {
      return { error: "Tanggal lahir tidak valid." };
    }
    updates.birthDate = birthDate;
  }
  if (body?.role !== undefined) {
    const role = String(body.role);
    if (!ROLE_VALUES.includes(role as typeof ROLE_VALUES[number])) return { error: "Peran tidak valid." };
    updates.role = role as typeof ROLE_VALUES[number];
  }
  if (Object.keys(updates).length === 0) return { error: "Tidak ada perubahan yang dikirim." };
  return { updates };
}
