import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { PublicUser } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { EditProfileModal } from "../components/EditProfileModal";
import {
  getAdminUsers, getTeacherStudents, updateAdminUser, updateChildProfile, updateStudentProfile,
} from "../lib/api";
import type { StudentWithClasses } from "../lib/api";
import { calculateAge } from "../lib/age";
import { useAuth } from "../lib/auth-context";
import type { Role } from "../types";
import { ROLE_LABEL, initials } from "../lib/constants";

function ProfileRow({ user, extra, onEdit }: { user: PublicUser; extra?: string; onEdit: () => void }) {
  return <div className="table-row" key={user.id}>
    <span><i className="avatar">{initials(user.displayName)}</i><span><b>{user.displayName}</b>
      {user.birthDate && <small className="child-meta">{calculateAge(user.birthDate)} tahun • {user.gender==="P"?"Perempuan":"Laki-laki"}</small>}
      {!user.birthDate && <small className="child-meta">Data lahir belum diisi</small>}
    </span></span>
    <span>{extra ?? ROLE_LABEL[user.role]}</span>
    <span>{user.dailyTarget} menit/hari</span>
    <span><button className="outline" type="button" onClick={onEdit}><Pencil/> Ubah</button></span>
  </div>;
}

function ParentChildrenView({ notify }: { notify: (s: string) => void }) {
  const { children: kids, refresh } = useAuth();
  const [editing, setEditing] = useState<PublicUser | null>(null);

  return <section className="card table-card">
    <div className="card-head"><div><h3>Profil Anak</h3><p>{kids.length} profil anak terdaftar</p></div></div>
    {kids.length===0 && <p className="empty-state">Belum ada profil anak. Tambah lewat menu profil di sidebar.</p>}
    {kids.length>0 && <div className="student-table">
      <div className="table-row table-header"><span>ANAK</span><span>PERAN</span><span>TARGET</span><span></span></div>
      {kids.map(child => <ProfileRow key={child.id} user={child} onEdit={()=>setEditing(child)} />)}
    </div>}
    {editing && <EditProfileModal user={editing} onClose={()=>setEditing(null)} onSave={async updates => {
      await updateChildProfile(editing.id, updates);
      notify(`Profil ${updates.displayName ?? editing.displayName} berhasil diperbarui.`);
      await refresh();
    }} />}
  </section>;
}

function TeacherStudentsView({ notify }: { notify: (s: string) => void }) {
  const [students, setStudents] = useState<StudentWithClasses[]>([]);
  const [editing, setEditing] = useState<StudentWithClasses | null>(null);
  const load = () => getTeacherStudents().then(res => setStudents(res.students)).catch(() => setStudents([]));
  useEffect(() => { load(); }, []);

  return <section className="card table-card">
    <div className="card-head"><div><h3>Profil Murid</h3><p>{students.length} murid di kelas kamu</p></div></div>
    {students.length===0 && <p className="empty-state">Belum ada murid. Bagikan kode kelas agar murid bisa bergabung.</p>}
    {students.length>0 && <div className="student-table">
      <div className="table-row table-header"><span>MURID</span><span>KELAS</span><span>TARGET</span><span></span></div>
      {students.map(s => <ProfileRow key={s.id} user={s} extra={s.classNames.join(", ")} onEdit={()=>setEditing(s)} />)}
    </div>}
    {editing && <EditProfileModal user={editing} onClose={()=>setEditing(null)} onSave={async updates => {
      await updateStudentProfile(editing.id, updates);
      notify(`Profil ${updates.displayName ?? editing.displayName} berhasil diperbarui.`);
      await load();
    }} />}
  </section>;
}

function AdminUsersView({ notify }: { notify: (s: string) => void }) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const load = (role: string) => getAdminUsers(role || undefined).then(res => setUsers(res.users)).catch(() => setUsers([]));
  useEffect(() => { load(roleFilter); }, [roleFilter]);

  return <section className="card table-card">
    <div className="card-head">
      <div><h3>Semua Pengguna</h3><p>{users.length} pengguna{roleFilter?` (${ROLE_LABEL[roleFilter]})`:""}</p></div>
      <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
        <option value="">Semua peran</option>
        <option value="student">Murid</option>
        <option value="teacher">Guru</option>
        <option value="parent">Orang Tua</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    {users.length===0 && <p className="empty-state">Tidak ada pengguna.</p>}
    {users.length>0 && <div className="student-table">
      <div className="table-row table-header"><span>PENGGUNA</span><span>PERAN</span><span>TARGET</span><span></span></div>
      {users.map(u => <ProfileRow key={u.id} user={u} onEdit={()=>setEditing(u)} />)}
    </div>}
    {editing && <EditProfileModal user={editing} allowRoleEdit onClose={()=>setEditing(null)} onSave={async updates => {
      await updateAdminUser(editing.id, updates);
      notify(`Profil ${updates.displayName ?? editing.displayName} berhasil diperbarui.`);
      await load(roleFilter);
    }} />}
  </section>;
}

export function ChildProfiles({ role, notify }: { role: Role; notify: (s: string) => void }) {
  const title = role==="Guru" ? "Kelola profil murid di kelasmu" : role==="Orang Tua" ? "Kelola profil anak" : "Kelola semua pengguna";
  return <>
    <PageTitle eyebrow="KELOLA PROFIL" title={title} desc="Perbarui nama, jenis kelamin, dan tanggal lahir." />
    {role==="Orang Tua" && <ParentChildrenView notify={notify} />}
    {role==="Guru" && <TeacherStudentsView notify={notify} />}
    {role==="Admin" && <AdminUsersView notify={notify} />}
  </>;
}
