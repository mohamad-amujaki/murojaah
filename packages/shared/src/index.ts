export interface ApiError {
  error: string;
}

export type UserRole = "student" | "teacher" | "parent" | "admin";

export interface UserPreferences {
  textSize: "Sedang" | "Besar" | "Sangat besar";
  showTransliteration: boolean;
  showTranslation: boolean;
}

export type Gender = "L" | "P";

export interface PublicUser {
  id: number;
  displayName: string;
  role: UserRole;
  managedBy: number | null;
  dailyTarget: number;
  preferences: UserPreferences;
  gender: Gender | null;
  birthDate: string | null;
}

export interface CreateChildPayload {
  displayName: string;
  gender: Gender;
  birthDate: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  dailyTarget?: number;
  preferences?: Partial<UserPreferences>;
  role?: Exclude<UserRole, "admin">;
}

export interface RecentSession {
  id: number;
  surahId: number;
  startAyah: number;
  endAyah: number;
  loops: number;
  completedAt: string;
  xpEarned: number;
}

export interface StatsResponse {
  totalXp: number;
  weeklyXp: number;
  streak: number;
  ayahsMastered: number;
  totalRepetitions: number;
  totalDurationSeconds: number;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  recentSessions: RecentSession[];
  lastSurahId: number | null;
  lastSurahAyahCount: number;
  lastPracticedAt: string | null;
  masteredInSurah: number;
  weeklyMinutes: number;
  weeklyRepetitions: number;
  weeklyChart: { day: string; minutes: number; xp: number }[];
}

export interface MeResponse {
  user: PublicUser;
  loginUser: PublicUser;
  children: PublicUser[];
  isActingAsChild: boolean;
}

export interface RegisterPayload {
  displayName: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface QuranAyahResponse {
  no: number;
  arabic: string;
  latin: string;
  meaning: string;
  audio: string;
}

export interface CompletePracticePayload {
  surahId: number;
  startAyah: number;
  endAyah: number;
  loops: number;
  duration: number;
  clientId?: string;
}

export interface CompletePracticeResponse {
  xp: number;
  message: string;
}
