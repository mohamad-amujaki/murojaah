import { useEffect, useState } from "react";
import { Award, BarChart3, BookOpen, Check, ChevronRight, Flame, Heart, Play, Plus, Repeat2, Sparkles, Target, Trophy, Users, Zap } from "lucide-react";
import { Goal } from "../components/Goal";
import { Stat } from "../components/Stat";
import { StatsTable } from "../components/StatsTable";
import { CreateClassModal } from "../components/CreateClassModal";
import { CreateAssignmentModal } from "../components/CreateAssignmentModal";
import { Modal } from "../components/Modal";
import { SendEncouragementModal } from "../components/SendEncouragementModal";
import type { StatsResponse } from "@murojaah/shared";
import type { AdminStatsResponse, ClassMember, ClassResponse, AssignmentResponse, EncouragementResponse, Suggestion, SurahResponse } from "../lib/api";
import { getAdminStats, getAssignments, getChildStats, getClassMembers, getClasses, getEncouragements, getMyStats, getSuggestion, getSurahs, joinClass, markEncouragementRead, removeClassMember } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { ROLE_LABEL } from "../lib/constants";
import { calculateAge } from "../lib/age";
import type { Page, Role } from "../types";

const formatDue = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Tanpa tenggat";

function StudentSection({ stats }: { stats: StatsResponse | null }) {
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinedName, setJoinedName] = useState("");

  const loadClasses = () => getClasses().then(r => setClasses(r.classes)).catch(() => undefined);
  useEffect(() => { loadClasses(); }, []);

  const handleJoin = async () => {
    setJoinError("");
    setJoining(true);
    try {
      const res = await joinClass(joinCode.trim().toUpperCase());
      setJoinedName(res.class.name);
      setJoinCode("");
      loadClasses();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Gagal bergabung. Periksa kode dan coba lagi.");
    } finally {
      setJoining(false);
    }
  };

  return <>
    <div className="stat-grid" style={{ marginTop: 20 }}>
      <Stat icon={Flame} value={`${stats?.streak??0} hari`} label="Streak saat ini"/>
      <Stat icon={BookOpen} value={`${stats?.ayahsMastered??0} ayat`} label="Sudah dikuasai"/>
      <Stat icon={Repeat2} value={`${stats?.totalRepetitions??0}×`} label="Total pengulangan"/>
      <Stat icon={Trophy} value={`Level ${stats?.level??1}`} label={`${stats?.totalXp??0} XP total`}/>
    </div>
    {classes.length > 0 && <section className="card" style={{marginTop:20}}>
      <div className="card-head"><div><h3>Kelas saya</h3><p>{classes.length} kelas</p></div></div>
      <ul style={{listStyle:"none",margin:0,padding:0}}>{classes.map(c => <li key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",fontSize:"0.75rem",borderBottom:"1px solid var(--line)"}}>
        <BookOpen style={{flex:"none",width:14,height:14,color:"var(--muted)"}}/>
        <span style={{fontWeight:600}}>{c.name}</span>
      </li>)}</ul>
    </section>}
    <div style={{display:"flex",gap:8,marginTop:classes.length>0?12:20}}>
      <button className="outline" style={{flex:1}} onClick={()=>setShowJoin(true)}><Plus/> Gabung kelas</button>
    </div>
    {showJoin && <Modal onClose={()=>{setShowJoin(false); setJoinError(""); setJoinedName("");}}>
      <div className="card" style={{maxWidth:400,margin:"0 auto"}}>
        {joinedName ? <>
          <h3 style={{margin:"0 0 8px",textAlign:"center"}}>Berhasil bergabung!</h3>
          <p style={{margin:"0 0 16px",textAlign:"center",fontSize:"0.75rem",color:"var(--muted)"}}>Kamu sekarang anggota kelas <b>{joinedName}</b>.</p>
          <button className="primary full" onClick={()=>{setShowJoin(false); setJoinedName("");}}>Selesai</button>
        </> : <>
          <h3 style={{margin:"0 0 4px"}}>Gabung kelas</h3>
          <p style={{margin:"0 0 16px",fontSize:"0.75rem",color:"var(--muted)"}}>Masukkan kode yang diberikan oleh guru kamu.</p>
          <label style={{fontSize:"0.75rem",fontWeight:700,color:"var(--muted)",display:"block",marginBottom:4}}>Kode kelas
            <input autoFocus value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Contoh: X3K9M7" maxLength={6}
              style={{display:"block",width:"100%",height:44,border:"1px solid var(--line)",borderRadius:10,padding:"0 12px",marginTop:5,fontSize:"0.75rem",textAlign:"center",letterSpacing:4,fontWeight:700,textTransform:"uppercase"}} />
          </label>
          {joinError && <p style={{margin:"8px 0 0",fontSize:"0.75rem",color:"#b8583d"}}>{joinError}</p>}
          <button className="primary full" style={{marginTop:16}} disabled={joining||joinCode.length!==6} onClick={handleJoin}>
            {joining?"Memproses...":"Gabung"}
          </button>
        </>}
      </div>
    </Modal>}
  </>;
}

function TeacherSection({ notify }: { notify: (s: string) => void }) {
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

  return <section className="dashboard-grid" style={{marginTop:24}}>
    <div className="dash-top">
      <div className="stat-grid">
        <Stat icon={Users} value={String(classes.length)} label="Kelas dikelola"/>
        <Stat icon={BookOpen} value={String(members.length)} label="Murid di kelas ini"/>
        <Stat icon={Flame} value={members.length?`${Math.round(members.reduce((s,m)=>s+m.streak,0)/members.length)} hari`:"0 hari"} label="Rata-rata streak"/>
        <Stat icon={Award} value={String(members.reduce((s,m)=>s+m.ayahsMastered,0))} label="Total ayat dikuasai"/>
      </div>
      <button className="primary" disabled={!selected} onClick={()=>setShowCreateAssignment(true)}><Plus/> Buat tugas</button>
    </div>
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
    {showCreateClass && <CreateClassModal onClose={()=>setShowCreateClass(false)} onCreated={cls=>{loadClasses(); setSelected(cls);}}/>}
    {showCreateAssignment && selected && <CreateAssignmentModal classes={classes} selectedClass={selected} onClose={()=>setShowCreateAssignment(false)} notify={notify}/>}
    {confirmRemove && <Modal onClose={()=>setConfirmRemove(null)}><div className="card" style={{maxWidth:360,margin:"0 auto",textAlign:"center"}}><h3 style={{margin:"0 0 8px"}}>Hapus {confirmRemove.name}?</h3><p className="text-xs text-muted" style={{margin:"0 0 16px"}}>Murid akan dihapus dari kelas ini. Data latihannya tetap tersimpan.</p><div style={{display:"flex",gap:8,justifyContent:"center"}}><button className="outline" onClick={()=>setConfirmRemove(null)}>Batal</button><button className="primary" style={{background:"#b8583d"}} onClick={()=>{removeClassMember(selected!.id,confirmRemove.id).then(()=>{getClassMembers(selected!.id).then(r=>setMembers(r.members));notify(`${confirmRemove.name} dihapus dari kelas.`);}).catch(()=>notify("Gagal menghapus murid.")).finally(()=>setConfirmRemove(null))}}>Hapus</button></div></div></Modal>}
  </section>;
}

function ParentSection({ notify }: { notify: (s: string) => void }) {
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

  return <section style={{marginTop:24}}>
    <div className="dash-top">
      <div className="stat-grid">
        <Stat icon={Users} value={String(kids.length)} label="Profil anak"/>
        <Stat icon={Trophy} value={String(totalXp)} label="Total XP anak"/>
        <Stat icon={Flame} value={kids.length?`${Math.round(Object.values(childStats).reduce((s,st)=>s+st.streak,0)/Math.max(Object.keys(childStats).length,1))} hari`:"0 hari"} label="Rata-rata streak"/>
        <Stat icon={BookOpen} value={String(Object.values(childStats).reduce((s,st)=>s+st.ayahsMastered,0))} label="Total ayat dikuasai"/>
      </div>
    </div>
    <section className="card table-card" style={{marginTop:20}}>
      <div className="card-head"><div><h3>Progres anak</h3><p>Terakhir diperbarui hari ini</p></div></div>
      {kids.length===0 && <p className="empty-state">Belum ada profil anak. Tambah lewat menu profil di sidebar.</p>}
      {kids.length>0 && <StatsTable nameHeader="ANAK" rows={kids.map(child=>{const s=childStats[child.id];return {
        id: child.id, name: child.displayName,
        meta: child.birthDate && <small className="child-meta">{calculateAge(child.birthDate)} tahun • {child.gender==="P"?"Perempuan":"Laki-laki"}</small>,
        ayahsMastered: s?.ayahsMastered??"\u2026", streak: s?.streak??"\u2026", totalXp: s?.totalXp??"\u2026",
      };})} />}
    </section>
    <div className="card" style={{marginTop:20,padding:20}}>
      <p style={{margin:"0 0 12px",fontSize:"0.75rem",color:"var(--muted)",textAlign:"center"}}>Ingin memberi semangat?</p>
      <button className="primary" style={{width:"100%"}} disabled={kids.length===0} onClick={()=>setShowEncouragement(true)}><Heart/> Kirim Dukungan</button>
    </div>
    {showEncouragement && <SendEncouragementModal kids={kids} onClose={()=>setShowEncouragement(false)} notify={notify}/>}
  </section>;
}

function AdminSection() {
  const [stats,setStats]=useState<AdminStatsResponse|null>(null);
  useEffect(()=>{ getAdminStats().then(setStats).catch(()=>setStats(null)); },[]);
  return <section style={{marginTop:24}}>
    <div className="stat-grid">
      <Stat icon={Users} value={String(stats?.totalUsers??0)} label="Total pengguna"/>
      <Stat icon={BookOpen} value={String(stats?.totalStudents??0)} label="Murid"/>
      <Stat icon={Target} value={String(stats?.totalTeachers??0)} label="Guru"/>
      <Stat icon={Award} value={String(stats?.totalParents??0)} label="Orang tua"/>
    </div>
    <div className="stat-grid" style={{marginTop:20}}>
      <Stat icon={Trophy} value={String(stats?.totalXpAwarded??0)} label="Total XP diberikan"/>
      <Stat icon={Repeat2} value={String(stats?.totalPracticeSessions??0)} label="Total sesi latihan"/>
      <Stat icon={Users} value={String(stats?.totalClasses??0)} label="Total kelas"/>
    </div>
  </section>;
}

export function HomePage({ go, notify }: { go: (p: Page) => void; notify: (s: string) => void }) {
  const { user } = useAuth();
  const firstName = user?.displayName.split(" ")[0] ?? "";
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [encouragements, setEncouragements] = useState<EncouragementResponse[]>([]);
  const [surahList, setSurahList] = useState<SurahResponse[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loaded, setLoaded] = useState(false);
  const surahName = (surahId: number) => surahList.find(s => s.id === surahId)?.latinName ?? `Surah #${surahId}`;
  useEffect(() => {
    Promise.all([
      getAssignments().then(res => setAssignments(res.assignments)).catch(() => setAssignments([])),
      getEncouragements().then(res => setEncouragements(res.encouragements)).catch(() => setEncouragements([])),
      getSurahs().then(setSurahList).catch(() => setSurahList([])),
      getMyStats().then(setStats).catch(() => setStats(null)),
      getSuggestion().then(res => setSuggestion(res.suggestion)).catch(() => setSuggestion(null)),
    ]).then(() => setLoaded(true));
  }, []);
  const startSuggested = () => {
    if (suggestion) sessionStorage.setItem("suggestedPractice", JSON.stringify(suggestion));
    go("practice");
  };
  const latestEncouragement = encouragements[0];
  useEffect(() => {
    if (latestEncouragement && !latestEncouragement.isRead) {
      markEncouragementRead(latestEncouragement.id).catch(() => undefined);
    }
  }, [latestEncouragement]);

  const todayLabel = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const lastSurahName = stats?.lastSurahId ? surahName(stats.lastSurahId) : null;
  const lastDate = stats?.lastPracticedAt ? new Date(stats.lastPracticedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : null;
  const heroProgress = stats?.lastSurahAyahCount ? Math.min(100, Math.round((stats.masteredInSurah / stats.lastSurahAyahCount) * 100)) : 0;
  const todayMinutes = stats?.totalDurationSeconds ? Math.round(stats.totalDurationSeconds / 60) : 0;
  const dailyTarget = user?.dailyTarget ?? 10;
  const hasPracticeHistory = stats && (stats.totalDurationSeconds > 0 || stats.totalRepetitions > 0);
  const isNewUser = loaded && !hasPracticeHistory;
  const streakCount = stats?.streak ?? 0;
  const role: Role = (ROLE_LABEL[user?.role ?? "student"] as Role) ?? "Murid";

  return <>
    <section className="welcome"><div><span className="eyebrow">{todayLabel}</span><h1>Assalamu'alaikum, {firstName}!</h1><p>{isNewUser ? "Siap memulai perjalanan hafalan? Setup-nya cuma semenit." : "Siap menambah hafalan hari ini? Kamu hebat karena terus berusaha."}</p></div>
      {streakCount > 0 ? <div className="streak"><span><Flame /></span><div><b>{streakCount} hari</b><small>Streak saat ini</small></div></div>
      : !isNewUser && <div className="streak" style={{background:"#f3f6f4",color:"var(--muted)"}}><span><Flame /></span><b>Belum dimulai</b></div>}</section>
    {isNewUser ? <section className="hero-card" style={{background:"linear-gradient(135deg,#0c735b,#08503f)",color:"#fff"}}><div className="hero-copy" style={{color:"#fff"}}><span className="pill" style={{background:"#ffffff26",color:"#fff",borderColor:"transparent"}}><Sparkles /> MULAI PERJALANAN</span><h2 style={{color:"#fff"}}>Pilih surah pertamamu</h2><p style={{color:"#ffffffb3",maxWidth:400,margin:"0 0 16px"}}>Pilih surah, atur jumlah pengulangan, dan mulai hafalan. Gampang, tanpa ribet.</p><button className="primary light" style={{width:"100%"}} onClick={() => go("practice")}><BookOpen /> Mulai Hafalan Pertama</button></div></section>
    : suggestion ? <section className="hero-card"><div className="hero-copy"><span className="pill"><Zap /> MURAJA'AH DISARANKAN</span><h2>{surahName(suggestion.surahId)}</h2><p>Ayat {suggestion.startAyah}–{suggestion.endAyah} • {suggestion.mastery}</p><button className="primary light" onClick={startSuggested}><Play /> Latihan yang Disarankan</button></div></section>
    : <section className="hero-card"><div className="hero-copy"><span className="pill"><Zap /> LANJUTKAN HAFALAN</span><h2>{lastSurahName ?? "Pilih surah"}</h2>{lastDate && <p>Terakhir latihan {lastDate}</p>}{heroProgress > 0 && <div className="progress-row"><div className="progress"><i style={{width:`${heroProgress}%`}} /></div><b>{heroProgress}%</b></div>}<button className="primary light" onClick={() => go("practice")}><Play /> Mulai Latihan</button></div></section>}
    {!isNewUser && <>
      <div className="section-title"><div><h2>Target hari ini</h2><p>Selesaikan target harianmu</p></div><button onClick={() => go("achievements")}>Pencapaian <ChevronRight /></button></div>
      <section className="goals-grid">
        <Goal icon={BookOpen} color="green" title={`Hafalkan ${dailyTarget} menit`} subtitle={`Tercapai ${todayMinutes} menit`} value={Math.min(todayMinutes, dailyTarget)} max={dailyTarget} />
        <Goal icon={Repeat2} color="gold" title={`${stats?.totalRepetitions ?? 0} pengulangan`} subtitle="Total semua sesi" value={Math.min(stats?.totalRepetitions ?? 0, 50)} max={50} />
        <Goal icon={Target} color="purple" title={`${stats?.ayahsMastered ?? 0} ayat dikuasai`} subtitle="Perjalanan masih panjang" value={Math.min(stats?.ayahsMastered ?? 0, 30)} max={30} />
      </section>
      <section className="two-col">
        <div className="card"><div className="card-head"><div><h3>Tugas dari Ustazah</h3><p>Jangan lupa diselesaikan, ya!</p></div>{assignments.filter(a=>a.status==="active").length > 0 && <span className="count">{assignments.filter(a=>a.status==="active").length} tugas</span>}</div>
          {assignments.length===0 && <p className="empty-state">Belum ada tugas dari guru.</p>}
          {assignments.map(task=><div className={`assignment ${task.status==="completed"?"done":""}`} key={task.id}><span className="task-icon">{task.status==="completed"?<Check/>:<BookOpen />}</span><div><b>Muraja'ah {surahName(task.surahId)}</b><p>Ayat {task.startAyah}–{task.endAyah} • Ulangi {task.targetLoops}×</p><small>{formatDue(task.dueAt)} {task.status==="completed"?"• Selesai":""}</small></div><button onClick={() => go("practice")}><ChevronRight /></button></div>)}
        </div>
        <div className="card"><div className="card-head"><div><h3>Perjalanan minggu ini</h3><p>Terus konsisten!</p></div><button className="more" onClick={() => go("achievements")}>Detail</button></div><div className="week-chart">{(stats?.weeklyChart ?? []).map((d,i)=>{const maxMin=Math.max(...(stats?.weeklyChart??[]).map(w=>w.minutes),1);const pct=Math.max(3,(d.minutes/maxMin)*100);return <div key={i}><span className={i===new Date().getDay()?"today":""} style={{height:`${pct}%`}}>{d.minutes>0&&<i>{d.minutes}m</i>}</span><small>{d.day}</small></div>})}</div><div className="week-summary"><span><b>{stats?.weeklyMinutes??0}</b><small>Menit latihan</small></span><span><b>{stats?.weeklyRepetitions??0}</b><small>Ayat diulang</small></span><span><b>+{stats?.weeklyXp??0}</b><small>XP didapat</small></span></div></div>
      </section>
    </>}
    {role === "Murid" && <StudentSection stats={stats} />}
    {latestEncouragement && <section className="support"><div className="parent-avatar">{latestEncouragement.parentName[0]}</div><div><span><Heart /> PESAN DARI {latestEncouragement.parentName.toUpperCase()}</span><p>"{latestEncouragement.message}"</p></div></section>}
    {role === "Guru" && <TeacherSection notify={notify} />}
    {role === "Orang Tua" && <ParentSection notify={notify} />}
    {role === "Admin" && <AdminSection />}
  </>;
}
