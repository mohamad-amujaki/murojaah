import type {
  ApiError, CompletePracticePayload, CompletePracticeResponse, CreateChildPayload, LoginPayload,
  MeResponse, PublicUser, QuranAyahResponse, RegisterPayload, StatsResponse, UpdateProfilePayload,
} from "@murojaah/shared";

const getCache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 15_000;

function invalidateCache(mutPath: string) {
  const groups: [string, string[]][] = [
    ["/practice/complete", ["/me/stats", "/badges", "/me/suggestion", "/children/"]],
    ["/ayah-progress", []],
    ["/auth/", ["*"]],
    ["/classes/", ["/classes", "/admin/classes"]],
    ["/classes", ["/classes", "/admin/classes"]],
    ["/assignments", ["/assignments", "/me/suggestion"]],
    ["/encouragements/", ["/encouragements"]],
    ["/encouragements", ["/encouragements"]],
    ["/children/", ["/children/", "/me/stats"]],
    ["/students/", ["/teacher/students"]],
    ["/admin/", ["/admin/"]],
    ["/me", ["/auth/me", "/me/stats", "/me/suggestion"]],
  ];
  const targets = groups.find(([prefix]) => mutPath.startsWith(prefix))?.[1];
  if (!targets) { getCache.clear(); return; }
  if (targets.length === 0) return;
  const isWildcard = targets[0] === "*";
  for (const key of getCache.keys()) {
    if (isWildcard || targets.some(t => key.startsWith(t))) getCache.delete(key);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const isGet = !options?.method || options.method === "GET";
  const cacheKey = isGet ? path : "";
  if (isGet) {
    const hit = getCache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data as T;
  }
  const response = await fetch(`/api${path}`, { ...options, headers: { "content-type": "application/json", ...options?.headers } });
  const data = await response.json() as T | ApiError;
  if (!response.ok) throw new Error((data as ApiError).error || "Terjadi kesalahan. Silakan coba lagi.");
  if (isGet) getCache.set(cacheKey, { data, at: Date.now() });
  else invalidateCache(path);
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

export interface ClassResponse { id:number; name:string; teacherId:number|null; joinCode:string; status:string }
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

export interface AdminClassResponse { id:number; name:string; teacherId:number|null; teacherName:string|null; joinCode:string; status:string; memberCount:number }
export const getAdminClasses = () => api<{ classes: AdminClassResponse[] }>("/admin/classes");

export const getChildStats = (childId:number) => api<StatsResponse>(`/children/${childId}/stats`);

export interface ProfileFieldUpdates { displayName?:string; gender?:"L"|"P"; birthDate?:string; role?:string }
export const updateChildProfile = (childId:number, payload: ProfileFieldUpdates) => api<{ child: PublicUser }>(`/children/${childId}`, { method:"PATCH", body:JSON.stringify(payload) });

export interface StudentWithClasses extends PublicUser { classNames: string[] }
export const getTeacherStudents = () => api<{ students: StudentWithClasses[] }>("/teacher/students");
export const updateStudentProfile = (studentId:number, payload: ProfileFieldUpdates) => api<{ student: PublicUser }>(`/students/${studentId}`, { method:"PATCH", body:JSON.stringify(payload) });

export interface AdminUsersResponse { users: PublicUser[]; total: number }
export const getAdminUsers = (params?: { role?: string; q?: string; offset?: number; limit?: number }) => {
  const sp = new URLSearchParams();
  if (params?.role) sp.set("role", params.role);
  if (params?.q) sp.set("q", params.q);
  if (params?.offset) sp.set("offset", String(params.offset));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return api<AdminUsersResponse>(`/admin/users${qs ? `?${qs}` : ""}`);
};
export const deleteAdminUsers = (ids: number[]) => api<{ ok: boolean }>("/admin/users/delete", { method: "POST", body: JSON.stringify({ ids }) });
export const updateAdminUser = (userId:number, payload: ProfileFieldUpdates) => api<{ user: PublicUser }>(`/admin/users/${userId}`, { method:"PATCH", body:JSON.stringify(payload) });

export const forgotPassword = (email: string) => api<{ ok: boolean; message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
export const resetPassword = (token: string, password: string) => api<{ ok: boolean; message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
