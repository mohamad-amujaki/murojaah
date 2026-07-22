import { useEffect, useState } from "react";
import { Check, Pencil, Settings } from "lucide-react";
import type { PublicUser, StatsResponse, UserPreferences } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { Toggle } from "../components/Toggle";
import { EditProfileModal } from "../components/EditProfileModal";
import { useAuth } from "../lib/auth-context";
import { getAdminUsers, getMyStats, getTeacherStudents, updateAdminUser, updateChildProfile, updateStudentProfile } from "../lib/api";
import type { StudentWithClasses } from "../lib/api";
import { getTheme, setTheme } from "../lib/theme";
import { calculateAge } from "../lib/age";
import { ROLE_LABEL, initials } from "../lib/constants";
import type { Role } from "../types";

function ProfileRow({ user, extra, onEdit }: { user: PublicUser; extra?: string; onEdit: () => void }) {
  return <div className="tbl-row" key={user.id}>
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
      <div className="tbl-row table-header"><span>ANAK</span><span>PERAN</span><span>TARGET</span><span></span></div>
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
      <div className="tbl-row table-header"><span>MURID</span><span>KELAS</span><span>TARGET</span><span></span></div>
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
      <div className="tbl-row table-header"><span>PENGGUNA</span><span>PERAN</span><span>TARGET</span><span></span></div>
      {users.map(u => <ProfileRow key={u.id} user={u} onEdit={()=>setEditing(u)} />)}
    </div>}
    {editing && <EditProfileModal user={editing} allowRoleEdit onClose={()=>setEditing(null)} onSave={async updates => {
      await updateAdminUser(editing.id, updates);
      notify(`Profil ${updates.displayName ?? editing.displayName} berhasil diperbarui.`);
      await load(roleFilter);
    }} />}
  </section>;
}

export function Profile({notify}:{notify:(s:string)=>void}){
  const { user, loginUser, updateProfile } = useAuth();
  const [name,setName]=useState(user?.displayName ?? "");
  const [dailyTarget,setDailyTarget]=useState(user?.dailyTarget ?? 10);
  const [prefs,setPrefs]=useState<UserPreferences>(user?.preferences ?? { textSize:"Besar", showTransliteration:true, showTranslation:true });
  const [saving,setSaving]=useState(false);
  const [stats,setStats]=useState<StatsResponse|null>(null);
  const [darkMode,setDarkMode]=useState(()=>getTheme()==="dark");

  useEffect(()=>{
    if(!user) return;
    setName(user.displayName);
    setDailyTarget(user.dailyTarget);
    setPrefs(user.preferences);
  },[user]);
  useEffect(()=>{ getMyStats().then(setStats).catch(()=>setStats(null)); },[]);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName:name, dailyTarget, preferences:prefs });
      notify("Pengaturan berhasil disimpan");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  if(!user) return null;
  const role: Role = (ROLE_LABEL[user.role] as Role) ?? "Murid";

  return <><PageTitle eyebrow="PROFIL & PREFERENSI" title="Atur pengalaman belajarmu" desc="Sesuaikan tampilan agar hafalan terasa lebih nyaman."/><div className="profile-grid"><section className="card profile-card"><div className="big-avatar">{initials(user.displayName)}<button onClick={()=>notify("Pilih avatar tersedia di versi berikutnya")}><Settings/></button></div><h2>{user.displayName}</h2><p>Level {stats?.level ?? 1}</p><div className="mini-stats"><span><b>{stats?.totalXp ?? 0}</b>XP</span><span><b>{stats?.streak ?? 0}</b>Streak</span><span><b>{stats?.ayahsMastered ?? 0}</b>Ayat</span></div></section><section className="card preferences"><h3>Informasi profil</h3><div className="info-row"><span>Peran</span><b>{ROLE_LABEL[user.role]}</b></div>{user.managedBy && <div className="info-row"><span>Dikelola oleh</span><b>{loginUser?.displayName}</b></div>}<label>Nama tampilan<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Target latihan harian<select value={dailyTarget} onChange={e=>setDailyTarget(+e.target.value)}><option value={10}>10 menit</option><option value={15}>15 menit</option><option value={20}>20 menit</option></select></label><h3>Tampilan ayat</h3><label>Ukuran teks Arab<select value={prefs.textSize} onChange={e=>setPrefs(p=>({...p,textSize:e.target.value as UserPreferences["textSize"]}))}><option>Sedang</option><option>Besar</option><option>Sangat besar</option></select></label><Toggle label="Tampilkan transliterasi" value={prefs.showTransliteration} set={v=>setPrefs(p=>({...p,showTransliteration:v}))}/><Toggle label="Tampilkan terjemahan" value={prefs.showTranslation} set={v=>setPrefs(p=>({...p,showTranslation:v}))}/><h3>Tampilan aplikasi</h3><Toggle label="Mode gelap" value={darkMode} set={v=>{setDarkMode(v);setTheme(v?"dark":"light");}}/><button className="primary" disabled={saving} onClick={save}><Check/> {saving?"Menyimpan...":"Simpan perubahan"}</button></section></div>
    {role !== "Murid" && <>
      <div style={{marginTop:24}}><PageTitle eyebrow="PROFIL YANG DIKELOLA" title={role==="Guru"?"Kelola profil murid di kelasmu":role==="Orang Tua"?"Kelola profil anak":"Kelola semua pengguna"} desc="Perbarui nama, jenis kelamin, dan tanggal lahir." /></div>
      {role==="Orang Tua" && <ParentChildrenView notify={notify} />}
      {role==="Guru" && <TeacherStudentsView notify={notify} />}
      {role==="Admin" && <AdminUsersView notify={notify} />}
    </>}
  </>;
}
