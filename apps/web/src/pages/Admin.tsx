import { useEffect, useState } from "react";
import { Award, BookOpen, Pencil, Repeat2, Target, Trophy, Users } from "lucide-react";
import type { PublicUser } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { Stat } from "../components/Stat";
import { EditProfileModal } from "../components/EditProfileModal";
import { getAdminStats, getAdminUsers, updateAdminUser } from "../lib/api";
import type { AdminStatsResponse } from "../lib/api";
import { ROLE_LABEL } from "../lib/constants";

export function Admin() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<PublicUser | null>(null);

  useEffect(() => { getAdminStats().then(setStats).catch(() => setStats(null)); }, []);
  const loadUsers = (role: string) => getAdminUsers(role || undefined).then(res => setUsers(res.users)).catch(() => setUsers([]));
  useEffect(() => { loadUsers(roleFilter); }, [roleFilter]);

  return <>
    <PageTitle eyebrow="ADMIN AREA" title="Pusat kendali admin" desc="Pantau pertumbuhan pengguna dan kelola akun dalam satu tempat." />

    <div className="section-title"><div><h2>Ringkasan pengguna</h2></div></div>
    <div className="stat-grid">
      <Stat icon={Users} value={String(stats?.totalUsers ?? 0)} label="Total pengguna" />
      <Stat icon={BookOpen} value={String(stats?.totalStudents ?? 0)} label="Murid" />
      <Stat icon={Target} value={String(stats?.totalTeachers ?? 0)} label="Guru" />
      <Stat icon={Award} value={String(stats?.totalParents ?? 0)} label="Orang tua" />
    </div>

    <div className="section-title"><div><h2>Aktivitas platform</h2></div></div>
    <div className="stat-grid stat-grid-3">
      <Stat icon={Repeat2} value={String(stats?.totalPracticeSessions ?? 0)} label="Total sesi latihan" />
      <Stat icon={Trophy} value={String(stats?.totalXpAwarded ?? 0)} label="Total XP diberikan" />
      <Stat icon={Users} value={String(stats?.totalClasses ?? 0)} label="Total kelas" />
    </div>

    <section className="card table-card">
      <div className="card-head">
        <div><h3>Semua Pengguna</h3><p>{users.length} pengguna{roleFilter ? ` (${ROLE_LABEL[roleFilter]})` : ""}</p></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Semua peran</option>
          <option value="student">Murid</option>
          <option value="teacher">Guru</option>
          <option value="parent">Orang Tua</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {users.length === 0 && <p className="empty-state">Tidak ada pengguna.</p>}
      {users.length > 0 && <div className="student-table">
        <div className="tbl-row table-header"><span>PENGGUNA</span><span>PERAN</span><span>TARGET</span><span></span></div>
        {users.map(u => <div className="tbl-row" key={u.id}>
          <span><b>{u.displayName}</b></span>
          <span>{ROLE_LABEL[u.role]}</span>
          <span>{u.dailyTarget} menit/hari</span>
          <span><button className="outline" type="button" onClick={() => setEditing(u)}><Pencil /> Ubah</button></span>
        </div>)}
      </div>}
    </section>

    {editing && <EditProfileModal user={editing} allowRoleEdit onClose={() => setEditing(null)} onSave={async updates => {
      await updateAdminUser(editing.id, updates);
      await loadUsers(roleFilter);
    }} />}
  </>;
}
