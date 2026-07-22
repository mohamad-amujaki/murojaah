import { useEffect, useState } from "react";
import { Award, BarChart3, BookOpen, Check, Flame, Plus, Repeat2, Target, Trophy, Users } from "lucide-react";
import type { StatsResponse } from "@murojaah/shared";
import type { AdminStatsResponse, AssignmentResponse, ClassMember, ClassResponse, SurahResponse } from "../lib/api";
import { getAdminStats, getAssignments, getChildStats, getClassMembers, getClasses, getMyStats, getSurahs, removeClassMember } from "../lib/api";
import { PageTitle } from "../components/PageTitle";
import { Stat } from "../components/Stat";
import { StatsTable } from "../components/StatsTable";
import { CreateClassModal } from "../components/CreateClassModal";
import { CreateAssignmentModal } from "../components/CreateAssignmentModal";
import { Modal } from "../components/Modal";
import { SendEncouragementModal } from "../components/SendEncouragementModal";
import { useAuth } from "../lib/auth-context";
import { calculateAge } from "../lib/age";
import type { Role } from "../types";

export function Dashboard({role,notify}:{role:Role;notify:(s:string)=>void}){
  const title=role==="Murid"?"Ringkasan belajarmu":role==="Guru"?"Dashboard Ustazah":role==="Orang Tua"?"Perkembangan Anak":"Pusat kendali admin";
  return <><PageTitle eyebrow={`${role.toUpperCase()} AREA`} title={title} desc="Pantau progres, tugas, dan konsistensi dalam satu tempat."/>
    {role==="Murid" && <StudentDashboard/>}
    {role==="Guru" && <TeacherDashboard notify={notify}/>}
    {role==="Orang Tua" && <ParentDashboard notify={notify}/>}
    {role==="Admin" && <AdminDashboard/>}
  </>;
}

function StudentDashboard(){
  const [stats,setStats]=useState<StatsResponse|null>(null);
  const [assignments,setAssignments]=useState<AssignmentResponse[]>([]);
  const [surahList,setSurahList]=useState<SurahResponse[]>([]);
  useEffect(()=>{ getMyStats().then(setStats).catch(()=>setStats(null)); },[]);
  useEffect(()=>{ getAssignments().then(res=>setAssignments(res.assignments)).catch(()=>setAssignments([])); },[]);
  useEffect(()=>{ getSurahs().then(setSurahList).catch(()=>setSurahList([])); },[]);
  const surahName=(id:number)=>surahList.find(s=>s.id===id)?.latinName??`Surah #${id}`;
  return <>
    <div className="stat-grid">
      <Stat icon={Flame} value={`${stats?.streak??0} hari`} label="Streak saat ini"/>
      <Stat icon={BookOpen} value={`${stats?.ayahsMastered??0} ayat`} label="Sudah dikuasai"/>
      <Stat icon={Repeat2} value={`${stats?.totalRepetitions??0}×`} label="Total pengulangan"/>
      <Stat icon={Trophy} value={`Level ${stats?.level??1}`} label={`${stats?.totalXp??0} XP total`}/>
    </div>
    <section className="card table-card" style={{marginTop:15}}><div className="card-head"><div><h3>Tugas</h3><p>{assignments.filter(a=>a.status==="active").length} tugas aktif</p></div></div>
      {assignments.length===0 && <p className="empty-state">Belum ada tugas dari guru.</p>}
      {assignments.map(a=><div className={`assignment ${a.status==="completed"?"done":""}`} key={a.id}><span className="task-icon">{a.status==="completed"?<Check/>:<BookOpen/>}</span><div><b>{surahName(a.surahId)}</b><p>Ayat {a.startAyah}–{a.endAyah} • Ulangi {a.targetLoops}×{a.status==="completed"?" • Selesai":""}</p></div></div>)}
    </section>
  </>;
}

function TeacherDashboard({notify}:{notify:(s:string)=>void}){
  const [classes,setClasses]=useState<ClassResponse[]>([]);
  const [selected,setSelected]=useState<ClassResponse|null>(null);
  const [members,setMembers]=useState<ClassMember[]>([]);
  const [showCreateClass,setShowCreateClass]=useState(false);
  const [showCreateAssignment,setShowCreateAssignment]=useState(false);
  const [confirmRemove,setConfirmRemove]=useState<{id:number;name:string}|null>(null);

  const loadClasses = async () => {
    const res = await getClasses();
    setClasses(res.classes);
    setSelected(current => current ?? res.classes[0] ?? null);
    return res.classes;
  };
  useEffect(()=>{ loadClasses().catch(()=>undefined); },[]);
  useEffect(()=>{
    if(!selected){ setMembers([]); return; }
    getClassMembers(selected.id).then(res=>setMembers(res.members)).catch(()=>setMembers([]));
  },[selected]);

  return <>
    <div className="dash-top">
      <div className="stat-grid">
        <Stat icon={Users} value={String(classes.length)} label="Kelas dikelola"/>
        <Stat icon={BookOpen} value={String(members.length)} label="Murid di kelas ini"/>
        <Stat icon={Flame} value={members.length?`${Math.round(members.reduce((s,m)=>s+m.streak,0)/members.length)} hari`:"0 hari"} label="Rata-rata streak"/>
        <Stat icon={Award} value={String(members.reduce((s,m)=>s+m.ayahsMastered,0))} label="Total ayat dikuasai"/>
      </div>
      <button className="primary" disabled={!selected} onClick={()=>setShowCreateAssignment(true)}><Plus/> Buat tugas</button>
    </div>
    <section className="dashboard-grid">
      <div className="card table-card">
        <div className="card-head"><div><h3>Progres murid</h3><p>{selected?selected.name:"Belum ada kelas"}</p></div>
          {classes.length>1 && <select value={selected?.id} onChange={e=>setSelected(classes.find(c=>c.id===+e.target.value)??null)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        </div>
        {!selected && <p className="empty-state">Kamu belum punya kelas. Buat kelas untuk mulai memantau murid.</p>}
        {selected && members.length===0 && <p className="empty-state">Belum ada murid yang bergabung. Bagikan kode: <b>{selected.joinCode}</b></p>}
        {members.length>0 && <StatsTable nameHeader="MURID" rows={members.map(m=>({
          id: m.id, name: m.displayName, ayahsMastered: m.ayahsMastered, streak: m.streak, totalXp: m.totalXp,
          action: <button className="outline" style={{color:"#b8583d",borderColor:"#f0d0c4",minHeight:30,padding:"0 8px"}} onClick={()=>setConfirmRemove({id:m.id,name:m.displayName})}>Hapus</button>,
        }))} />}
      </div>
      <aside className="card class-card">
        <div className="card-head"><div><h3>Kelas kamu</h3><p>{classes.length} kelas aktif</p></div><BarChart3/></div>
        <ul>{classes.map(c=><li key={c.id}><i className={c.id===selected?.id?"green-dot":"gray-dot"}/>{c.name}<b>{c.joinCode}</b></li>)}
          {classes.length===0 && <li>Belum ada kelas</li>}
        </ul>
        <button className="outline full" onClick={()=>setShowCreateClass(true)}><Plus/> Buat kelas baru</button>
      </aside>
    </section>
    {showCreateClass && <CreateClassModal onClose={()=>setShowCreateClass(false)} onCreated={cls=>{loadClasses(); setSelected(cls);}}/>}
    {showCreateAssignment && selected && <CreateAssignmentModal classes={classes} selectedClass={selected} onClose={()=>setShowCreateAssignment(false)} notify={notify}/>}
    {confirmRemove && <Modal onClose={()=>setConfirmRemove(null)}><div className="card" style={{maxWidth:360,margin:"0 auto",textAlign:"center"}}><h3 style={{margin:"0 0 8px"}}>Hapus {confirmRemove.name}?</h3><p className="text-xs text-muted" style={{margin:"0 0 16px"}}>Murid akan dihapus dari kelas ini. Data latihannya tetap tersimpan.</p><div style={{display:"flex",gap:8,justifyContent:"center"}}><button className="outline" onClick={()=>setConfirmRemove(null)}>Batal</button><button className="primary" style={{background:"#b8583d"}} onClick={()=>{removeClassMember(selected!.id,confirmRemove.id).then(()=>{getClassMembers(selected!.id).then(r=>setMembers(r.members));notify(`${confirmRemove.name} dihapus dari kelas.`);}).catch(()=>notify("Gagal menghapus murid.")).finally(()=>setConfirmRemove(null))}}>Hapus</button></div></div></Modal>}
  </>;
}

function ParentDashboard({notify}:{notify:(s:string)=>void}){
  const { children: kids } = useAuth();
  const [childStats,setChildStats]=useState<Record<number,StatsResponse>>({});
  const [showEncouragement,setShowEncouragement]=useState(false);
  useEffect(()=>{
    if (kids.length === 0) return;
    Promise.all(kids.map(child =>
      getChildStats(child.id).then(stats => ({ childId: child.id, stats })).catch(() => null)
    )).then(results => {
      const map: Record<number, StatsResponse> = {};
      results.forEach(r => { if (r) map[r.childId] = r.stats; });
      setChildStats(map);
    });
  },[kids]);
  const totalXp = Object.values(childStats).reduce((s,st)=>s+st.totalXp,0);

  return <>
    <div className="dash-top">
      <div className="stat-grid">
        <Stat icon={Users} value={String(kids.length)} label="Profil anak"/>
        <Stat icon={Trophy} value={String(totalXp)} label="Total XP anak"/>
        <Stat icon={Flame} value={kids.length?`${Math.round(Object.values(childStats).reduce((s,st)=>s+st.streak,0)/Math.max(Object.keys(childStats).length,1))} hari`:"0 hari"} label="Rata-rata streak"/>
        <Stat icon={BookOpen} value={String(Object.values(childStats).reduce((s,st)=>s+st.ayahsMastered,0))} label="Total ayat dikuasai"/>
      </div>
    </div>
    <section className="card table-card">
      <div className="card-head"><div><h3>Progres anak</h3><p>Terakhir diperbarui hari ini</p></div></div>
      {kids.length===0 && <p className="empty-state">Belum ada profil anak. Tambah lewat menu profil di sidebar.</p>}
      {kids.length>0 && <StatsTable nameHeader="ANAK" rows={kids.map(child=>{const s=childStats[child.id];return {
        id: child.id, name: child.displayName,
        meta: child.birthDate && <small className="child-meta">{calculateAge(child.birthDate)} tahun • {child.gender==="P"?"Perempuan":"Laki-laki"}</small>,
        ayahsMastered: s?.ayahsMastered??"…", streak: s?.streak??"…", totalXp: s?.totalXp??"…",
      };})} />}
    </section>
    <button className="primary" style={{marginTop:15}} disabled={kids.length===0} onClick={()=>setShowEncouragement(true)}><Plus/> Kirim dukungan</button>
    {showEncouragement && <SendEncouragementModal kids={kids} onClose={()=>setShowEncouragement(false)} notify={notify}/>}
  </>;
}

function AdminDashboard(){
  const [stats,setStats]=useState<AdminStatsResponse|null>(null);
  useEffect(()=>{ getAdminStats().then(setStats).catch(()=>setStats(null)); },[]);
  return <>
    <div className="stat-grid">
      <Stat icon={Users} value={String(stats?.totalUsers??0)} label="Total pengguna"/>
      <Stat icon={BookOpen} value={String(stats?.totalStudents??0)} label="Murid"/>
      <Stat icon={Target} value={String(stats?.totalTeachers??0)} label="Guru"/>
      <Stat icon={Award} value={String(stats?.totalParents??0)} label="Orang tua"/>
    </div>
    <div className="stat-grid" style={{marginTop:15}}>
      <Stat icon={Trophy} value={String(stats?.totalXpAwarded??0)} label="Total XP diberikan"/>
      <Stat icon={Repeat2} value={String(stats?.totalPracticeSessions??0)} label="Total sesi latihan"/>
      <Stat icon={Users} value={String(stats?.totalClasses??0)} label="Total kelas"/>
    </div>
  </>;
}
