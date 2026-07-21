import type { Env, RouteHandler } from "./lib/http";
import { json } from "./lib/http";
import { resolveContext } from "./lib/session";
import { handleHealth } from "./routes/health";
import { handleQuranAudio, handleQuranSurah } from "./routes/quran";
import { handlePracticeComplete } from "./routes/practice";
import { handleCreateChild, handleForgotPassword, handleLogin, handleLogout, handleMe, handleRegister, handleResetPassword, handleSwitchProfile } from "./routes/auth";
import { handleClassMembers, handleCreateClass, handleJoinClass, handleLeaveClass, handleListClasses, handleRemoveMember } from "./routes/classes";
import { handleCreateAssignment, handleListAssignments } from "./routes/assignments";
import { handleGetAyahProgress, handleUpsertAyahProgress } from "./routes/ayah-progress";
import { handleListBadges } from "./routes/badges";
import { handleCreateEncouragement, handleListEncouragements, handleMarkEncouragementRead } from "./routes/encouragements";
import { handleGoogleCallback, handleGoogleStart } from "./routes/oauth";
import { handleMyStats, handleSuggestion, handleUpdateProfile } from "./routes/profile";
import {
  handleAdminStats, handleChildStats, handleListAdminUsers,
  handleUpdateAdminUser, handleUpdateChild,
} from "./routes/admin";
import { handleListTeacherStudents, handleUpdateStudent } from "./routes/teacher";

const routes: RouteHandler[] = [
  handleHealth, handleQuranSurah, handleQuranAudio, handlePracticeComplete,
  handleRegister, handleLogin, handleLogout, handleMe, handleCreateChild, handleSwitchProfile, handleForgotPassword, handleResetPassword,
  handleGoogleStart, handleGoogleCallback,
  handleUpdateProfile, handleMyStats, handleSuggestion,
  handleCreateClass, handleJoinClass, handleListClasses, handleClassMembers, handleLeaveClass, handleRemoveMember,
  handleCreateAssignment, handleListAssignments,
  handleUpsertAyahProgress, handleGetAyahProgress,
  handleListBadges,
  handleCreateEncouragement, handleListEncouragements, handleMarkEncouragementRead,
  handleAdminStats, handleChildStats, handleUpdateChild,
  handleListAdminUsers, handleUpdateAdminUser,
  handleListTeacherStudents, handleUpdateStudent,
];

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const ctx = await resolveContext(request, env);

    for (const route of routes) {
      const response = await route(request, url, env, ctx);
      if (response) return response;
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "Endpoint tidak ditemukan." }, 404);
    return new Response(null, { status: 404 });
  },
};
