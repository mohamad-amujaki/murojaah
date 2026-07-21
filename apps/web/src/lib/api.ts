import type {
  ApiError, CompletePracticePayload, CompletePracticeResponse, CreateChildPayload, LoginPayload,
  MeResponse, PublicUser, QuranAyahResponse, RegisterPayload, StatsResponse, UpdateProfilePayload,
} from "@murojaah/shared";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { "content-type": "application/json", ...options?.headers } });
  const data = await response.json() as T | ApiError;
  if (!response.ok) throw new Error((data as ApiError).error || "Terjadi kesalahan. Silakan coba lagi.");
  return data as T;
}
export const completePractice = (payload: CompletePracticePayload) => api<CompletePracticeResponse>("/practice/complete", { method:"POST", body:JSON.stringify(payload) });

export const getQuranSurah = (surahId:number, signal?:AbortSignal) => api<{ source:string; ayahs:QuranAyahResponse[] }>(`/quran/surah/${surahId}`, { signal });

export interface SurahResponse { id:number; latinName:string; arabicName:string; meaning:string; ayahCount:number }
export const getSurahs = () => api<SurahResponse[]>("/surahs");

export const register = (payload: RegisterPayload) => api<{ user: PublicUser }>("/auth/register", { method:"POST", body:JSON.stringify(payload) });
export const login = (payload: LoginPayload) => api<{ user: PublicUser }>("/auth/login", { method:"POST", body:JSON.stringify(payload) });
export const logout = () => api<{ ok: boolean }>("/auth/logout", { method:"POST" });
export const getMe = () => api<MeResponse>("/auth/me");
export const createChild = (payload: CreateChildPayload) => api<{ child: PublicUser }>("/auth/children", { method:"POST", body:JSON.stringify(payload) });
export const switchProfile = (userId: number) => api<{ user: PublicUser }>("/auth/switch-profile", { method:"POST", body:JSON.stringify({ userId }) });
export const updateProfile = (payload: UpdateProfilePayload) => api<{ user: PublicUser }>("/me", { method:"PATCH", body:JSON.stringify(payload) });
export const getMyStats = () => api<StatsResponse>("/me/stats");

export interface Suggestion { surahId:number; startAyah:number; endAyah:number; mastery:string }
export const getSuggestion = () => api<{ suggestion: Suggestion | null }>("/me/suggestion");

export const saveAyahProgress = (surahId:number, number:number, mastery:string) => api<{ ok:boolean }>("/ayah-progress", { method:"POST", body:JSON.stringify({ surahId, number, mastery }) });

export interface BadgeResponse { id:number; code:string; name:string; description:string; icon:string; earned:boolean; earnedAt:string|null }
export const getBadges = () => api<{ badges: BadgeResponse[] }>("/badges");

export interface AssignmentResponse { id:number; surahId:number; startAyah:number; endAyah:number; targetLoops:number; dueAt:string|null; status:string }
export const getAssignments = () => api<{ assignments: AssignmentResponse[] }>("/assignments");

export interface EncouragementResponse { id:number; message:string; isRead:boolean; createdAt:string; parentName:string }
export const getEncouragements = () => api<{ encouragements: EncouragementResponse[] }>("/encouragements");
export const sendEncouragement = (childId:number, message:string) => api<{ encouragement: unknown }>("/encouragements", { method:"POST", body:JSON.stringify({ childId, message }) });
export const markEncouragementRead = (id:number) => api<{ ok:boolean }>(`/encouragements/${id}/read`, { method:"PATCH" });

export interface ClassResponse { id:number; name:string; teacherId:number; joinCode:string; status:string }
export interface ClassMember { id:number; displayName:string; streak:number; ayahsMastered:number; totalXp:number }
export const getClasses = () => api<{ classes: ClassResponse[] }>("/classes");
export const createClass = (name:string) => api<{ class: ClassResponse }>("/classes", { method:"POST", body:JSON.stringify({ name }) });
export const joinClass = (joinCode:string) => api<{ class: ClassResponse }>("/classes/join", { method:"POST", body:JSON.stringify({ joinCode }) });
export const leaveClass = (classId:number) => api<{ ok:boolean }>(`/classes/${classId}/leave`, { method:"DELETE" });
export const removeClassMember = (classId:number, studentId:number) => api<{ ok:boolean }>(`/classes/${classId}/members/${studentId}`, { method:"DELETE" });
export const getClassMembers = (classId:number) => api<{ class: ClassResponse; members: ClassMember[] }>(`/classes/${classId}/members`);
export const createAssignment = (payload: { classId?:number; studentId?:number; surahId:number; startAyah:number; endAyah:number; targetLoops:number; dueAt?:string }) =>
  api<{ assignment: unknown }>("/assignments", { method:"POST", body:JSON.stringify(payload) });

export interface AdminStatsResponse { totalUsers:number; totalStudents:number; totalTeachers:number; totalParents:number; totalPracticeSessions:number; totalXpAwarded:number; totalClasses:number }
export const getAdminStats = () => api<AdminStatsResponse>("/admin/stats");

export const getChildStats = (childId:number) => api<StatsResponse>(`/children/${childId}/stats`);

export interface ProfileFieldUpdates { displayName?:string; gender?:"L"|"P"; birthDate?:string }
export const updateChildProfile = (childId:number, payload: ProfileFieldUpdates) => api<{ child: PublicUser }>(`/children/${childId}`, { method:"PATCH", body:JSON.stringify(payload) });

export interface StudentWithClasses extends PublicUser { classNames: string[] }
export const getTeacherStudents = () => api<{ students: StudentWithClasses[] }>("/teacher/students");
export const updateStudentProfile = (studentId:number, payload: ProfileFieldUpdates) => api<{ student: PublicUser }>(`/students/${studentId}`, { method:"PATCH", body:JSON.stringify(payload) });

export const getAdminUsers = (role?:string) => api<{ users: PublicUser[] }>(`/admin/users${role?`?role=${role}`:""}`);
export const updateAdminUser = (userId:number, payload: ProfileFieldUpdates) => api<{ user: PublicUser }>(`/admin/users/${userId}`, { method:"PATCH", body:JSON.stringify(payload) });
