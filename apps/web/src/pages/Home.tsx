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
import { useToast } from "../lib/toast-context";
import { ROLE_LABEL } from "../lib/constants";
import { calculateAge } from "../lib/age";
import type { Page, Role } from "../types";

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 6236];
const nextMilestone = (value: number) => MILESTONES.find(m => m > value) ?? value;

const formatDue = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Tanpa tenggat";

function StudentSection() {
  const notify = useToast();
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinedName, setJoinedName] = useState("");

  const loadClasses = () => getClasses().then(r => setClasses(r.classes)).catch(() => notify("Gagal memuat daftar kelas."));
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

  return <div className="role-section">
    {classes.length > 0 && <section className="card">
      <div className="card-head"><div><h3>Kelas saya</h3><p>{classes.length} kelas</p></div></div>
      <ul className="class-list">{classes.map(c => <li key={c.id}><BookOpen/><span>{c.name}</span></li>)}</ul>
    </section>}
    <button className="outline full join-class-btn" onClick={()=>setShowJoin(true)}><Plus/> Gabung kelas</button>
    {showJoin && <Modal onClose={()=>{setShowJoin(false); setJoinError(""); setJoinedName("");}}>
      <div className="card dialog-card">
        {joinedName ? <div className="text-center">
          <h3>Berhasil bergabung!</h3>
          <p>Kamu sekarang anggota kelas <b>{joinedName}</b>.</p>
          <button className="primary full" onClick={()=>{setShowJoin(false); setJoinedName("");}}>Selesai</button>
        </div> : <form onSubmit={e=>{e.preventDefault(); if(joinCode.length===6) handleJoin();}}>
          <h3>Gabung kelas</h3>
          <p>Masukkan 6 karakter kode dari gurumu.</p>
          <label className="field-label">Kode kelas
            <input className="code-input" autoFocus autoComplete="off" autoCapitalize="characters" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="X3K9M7" maxLength={6} />
          </label>
          {joinError && <p className="auth-error">{joinError}</p>}
          <button type="submit" className="primary full" disabled={joining||joinCode.length!==6}>
            {joining?"Memproses...":"Gabung"}
          </button>
        </form>}
      </div>
    </Modal>}
  </div>;
}

function TeacherSection() {
  const notify = useToast();
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
  useEffect(()=>{ loadClasses().catch(()=>{}); },[]);
  useEffect(()=>{
    if(!selected){ setMembers([]); return; }
    getClassMembers(selected.id).then(res=>setMembers(res.members)).catch(()=>{ setMembers([]); notify("Gagal memuat anggota kelas."); });
  },[selected]);

  return <section className="dashboard-grid">
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
        action: <button className="outline danger btn-sm" onClick={()=>setConfirmRemove({id:m.id,name:m.displayName})}>Hapus</button>,
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
    {showCreateAssignment && selected && <CreateAssignmentModal classes={classes} selectedClass={selected} onClose={()=>setShowCreateAssignment(false)}/>}
    {confirmRemove && <Modal onClose={()=>setConfirmRemove(null)}><div className="card dialog-card text-center"><h3>Hapus {confirmRemove.name}?</h3><p>Murid akan dihapus dari kelas ini. Data latihannya tetap tersimpan.</p><div className="dialog-actions"><button className="outline" onClick={()=>setConfirmRemove(null)}>Batal</button><button className="primary danger" onClick={()=>{removeClassMember(selected!.id,confirmRemove.id).then(()=>{getClassMembers(selected!.id).then(r=>setMembers(r.members));notify(`${confirmRemove.name} dihapus dari kelas.`);}).catch(()=>notify("Gagal menghapus murid.")).finally(()=>setConfirmRemove(null))}}>Hapus</button></div></div></Modal>}
  </section>;
}

function ParentSection() {
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

  return <section className="role-section">
    <div className="dash-top">
      <div className="stat-grid">
        <Stat icon={Users} value={String(kids.length)} label="Profil anak"/>
        <Stat icon={Trophy} value={String(totalXp)} label="Total XP anak"/>
        <Stat icon={Flame} value={kids.length?`${Math.round(Object.values(childStats).reduce((s,st)=>s+st.streak,0)/Math.max(Object.keys(childStats).length,1))} hari`:"0 hari"} label="Rata-rata streak"/>
        <Stat icon={BookOpen} value={String(Object.values(childStats).reduce((s,st)=>s+st.ayahsMastered,0))} label="Total ayat dikuasai"/>
      </div>
    </div>
    <section className="card table-card">
      <div className="card-head"><div><h3>Progres anak</h3><p>{kids.length} profil</p></div></div>
      {kids.length===0 && <p className="empty-state">Belum ada profil anak. Tambah lewat menu profil di sidebar.</p>}
      {kids.length>0 && <StatsTable nameHeader="ANAK" rows={kids.map(child=>{const s=childStats[child.id];return {
        id: child.id, name: child.displayName,
        meta: child.birthDate && <small className="child-meta">{calculateAge(child.birthDate)} tahun • {child.gender==="P"?"Perempuan":"Laki-laki"}</small>,
        ayahsMastered: s?.ayahsMastered??"\u2026", streak: s?.streak??"\u2026", totalXp: s?.totalXp??"\u2026",
      };})} />}
    </section>
    <div className="card encourage-card">
      <p>Pesanmu akan muncul di beranda anak saat mereka membuka aplikasi.</p>
      <button className="primary full" disabled={kids.length===0} onClick={()=>setShowEncouragement(true)}><Heart/> Kirim Dukungan</button>
    </div>
    {showEncouragement && <SendEncouragementModal kids={kids} onClose={()=>setShowEncouragement(false)}/>}
  </section>;
}

function AdminSection() {
  const notify = useToast();
  const [stats,setStats]=useState<AdminStatsResponse|null>(null);
  useEffect(()=>{ getAdminStats().then(setStats).catch(()=>{ setStats(null); notify("Gagal memuat statistik admin."); }); },[]);
  return <section className="role-section">
    <div className="stat-grid">
      <Stat icon={Users} value={String(stats?.totalUsers??0)} label="Total pengguna"/>
      <Stat icon={BookOpen} value={String(stats?.totalStudents??0)} label="Murid"/>
      <Stat icon={Target} value={String(stats?.totalTeachers??0)} label="Guru"/>
      <Stat icon={Award} value={String(stats?.totalParents??0)} label="Orang tua"/>
    </div>
    <div className="stat-grid">
      <Stat icon={Trophy} value={String(stats?.totalXpAwarded??0)} label="Total XP diberikan"/>
      <Stat icon={Repeat2} value={String(stats?.totalPracticeSessions??0)} label="Total sesi latihan"/>
      <Stat icon={Users} value={String(stats?.totalClasses??0)} label="Total kelas"/>
    </div>
  </section>;
}

export function HomePage({ go }: { go: (p: Page) => void }) {
  const notify = useToast();
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
    const student = user?.role === "student";
    const admin = user?.role === "admin";
    Promise.all([
      student && getAssignments().then(res => setAssignments(res.assignments)).catch(() => { setAssignments([]); notify("Gagal memuat tugas."); }),
      student && getEncouragements().then(res => setEncouragements(res.encouragements)).catch(() => { setEncouragements([]); notify("Gagal memuat pesan dukungan."); }),
      !admin && getSurahs().then(setSurahList).catch(() => { setSurahList([]); notify("Gagal memuat daftar surah."); }),
      !admin && getMyStats().then(setStats).catch(() => { setStats(null); notify("Gagal memuat statistik."); }),
      !admin && getSuggestion().then(res => setSuggestion(res.suggestion)).catch(() => { setSuggestion(null); notify("Gagal memuat saran latihan."); }),
    ]).then(() => setLoaded(true));
  }, [user?.id]);
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
  const weeklyChart = stats?.weeklyChart ?? [];
  // Entri terakhir weeklyChart = hari ini (lihat computeUserStats).
  const todayMinutes = weeklyChart.at(-1)?.minutes ?? 0;
  const maxChartMinutes = Math.max(...weeklyChart.map(w => w.minutes), 1);
  const totalRepetitions = stats?.totalRepetitions ?? 0;
  const ayahsMastered = stats?.ayahsMastered ?? 0;
  const dailyTarget = user?.dailyTarget ?? 10;
  const hasPracticeHistory = stats && (stats.totalDurationSeconds > 0 || stats.totalRepetitions > 0);
  const isNewUser = loaded && !hasPracticeHistory;
  const streakCount = stats?.streak ?? 0;
  const role: Role = (ROLE_LABEL[user?.role ?? "student"] as Role) ?? "Murid";

  const isStudent = role === "Murid";
  const isAdmin = role === "Admin";
  const welcomeText = isAdmin ? "Ringkasan aktivitas platform Murojaah."
    : role === "Guru" ? "Pantau progres murid di kelasmu, lalu lanjutkan hafalanmu sendiri."
    : role === "Orang Tua" ? "Lihat perkembangan hafalan anak-anakmu dan kirim dukungan."
    : isNewUser ? "Siap memulai perjalanan hafalan? Setup-nya cuma semenit."
    : "Siap menambah hafalan hari ini? Kamu hebat karena terus berusaha.";
  const activeAssignments = assignments.filter(a => a.status === "active").length;

  const practiceHero = isNewUser ? <section className="hero-card"><div className="hero-copy"><span className="pill"><Sparkles /> Langkah pertama</span><h2>Pilih surah pertamamu</h2><p>Pilih surah dan rentang ayat, atur jumlah pengulangan, lalu mulai dengar & ulangi.</p><button className="primary light" onClick={() => go("practice")}><BookOpen /> Mulai Hafalan Pertama</button></div></section>
    : suggestion ? <section className="hero-card"><div className="hero-copy"><span className="pill"><Zap /> MURAJA'AH DISARANKAN</span><h2>{surahName(suggestion.surahId)}</h2><p>Ayat {suggestion.startAyah}–{suggestion.endAyah} • {suggestion.mastery}</p><button className="primary light" onClick={startSuggested}><Play /> Latihan yang Disarankan</button></div></section>
    : <section className="hero-card"><div className="hero-copy"><span className="pill"><Zap /> LANJUTKAN HAFALAN</span><h2>{lastSurahName ?? "Pilih surah"}</h2>{lastDate && <p>Terakhir latihan {lastDate}</p>}{heroProgress > 0 && <div className="progress-row"><div className="progress"><i style={{width:`${heroProgress}%`}} /></div><b>{heroProgress}%</b></div>}<button className="primary light" onClick={() => go("practice")}><Play /> Mulai Latihan</button></div></section>;

  const weekCard = <div className="card"><div className="card-head"><div><h3>7 hari terakhir</h3><p>Menit latihan per hari</p></div><button className="more" onClick={() => go("achievements")}>Detail</button></div><div className="week-chart">{weeklyChart.map((d,i)=>{const pct=Math.max(3,(d.minutes/maxChartMinutes)*100);return <div key={i}><span className={i===weeklyChart.length-1?"today":""} style={{height:`${pct}%`}}>{d.minutes>0&&<i>{d.minutes}m</i>}</span><small>{d.day}</small></div>})}</div><div className="week-summary"><span><b>{stats?.weeklyMinutes??0}</b><small>Menit latihan</small></span><span><b>{stats?.weeklyRepetitions??0}</b><small>Pengulangan</small></span><span><b>+{stats?.weeklyXp??0}</b><small>XP didapat</small></span></div></div>;

  // Bagian hafalan pribadi: murid melihatnya sebagai konten utama; guru & orang tua di bawah ringkasan perannya.
  const practiceBlock = <>
    {!isStudent && <div className="section-title"><div><h2>Hafalan pribadimu</h2><p>Latihan muraja'ah untuk dirimu sendiri</p></div></div>}
    {practiceHero}
    {!isNewUser && <>
      <div className="section-title"><div><h2>Target & tonggak</h2><p>Target harian {dailyTarget} menit, plus tonggak berikutnya</p></div><button onClick={() => go("achievements")}>Pencapaian <ChevronRight /></button></div>
      <section className="goals-grid">
        <Goal icon={BookOpen} color="green" title={`Latihan ${dailyTarget} menit`} subtitle={`Hari ini: ${todayMinutes} menit`} value={Math.min(todayMinutes, dailyTarget)} max={dailyTarget} />
        <Goal icon={Repeat2} color="gold" title={`${totalRepetitions} pengulangan`} subtitle={`Berikutnya: ${nextMilestone(totalRepetitions)}`} value={totalRepetitions} max={nextMilestone(totalRepetitions)} />
        <Goal icon={Target} color="purple" title={`${ayahsMastered} ayat dikuasai`} subtitle={`Berikutnya: ${nextMilestone(ayahsMastered)} ayat`} value={ayahsMastered} max={nextMilestone(ayahsMastered)} />
      </section>
      {isStudent ? <section className="two-col">
        <div className="card"><div className="card-head"><div><h3>Tugas dari guru</h3><p>Dari kelas yang kamu ikuti</p></div>{activeAssignments > 0 && <span className="count">{activeAssignments} tugas</span>}</div>
          {assignments.length===0 && <p className="empty-state">Belum ada tugas dari guru.</p>}
          {assignments.map(task=><div className={`assignment ${task.status==="completed"?"done":""}`} key={task.id}><span className="task-icon">{task.status==="completed"?<Check/>:<BookOpen />}</span><div><b>Muraja'ah {surahName(task.surahId)}</b><p>Ayat {task.startAyah}–{task.endAyah} • Ulangi {task.targetLoops}×</p><small>{formatDue(task.dueAt)} {task.status==="completed"?"• Selesai":""}</small></div><button onClick={() => go("practice")} aria-label={`Latihan ${surahName(task.surahId)}`}><ChevronRight /></button></div>)}
        </div>
        {weekCard}
      </section> : <section className="week-single">{weekCard}</section>}
    </>}
  </>;

  return <>
    <section className="welcome"><div><span className="eyebrow">{todayLabel}</span><h1>Assalamu'alaikum, {firstName}!</h1><p>{welcomeText}</p></div>
      {!isAdmin && (streakCount > 0 ? <div className="streak"><span><Flame /></span><div><b>{streakCount} hari</b><small>Streak saat ini</small></div></div>
      : !isNewUser && <div className="streak idle"><span><Flame /></span><b>Belum ada streak</b></div>)}</section>
    {isStudent && latestEncouragement && <section className="support"><div className="parent-avatar">{latestEncouragement.parentName[0]}</div><div><span><Heart /> PESAN DARI {latestEncouragement.parentName.toUpperCase()}</span><p>"{latestEncouragement.message}"</p></div></section>}
    {role === "Guru" && <TeacherSection />}
    {role === "Orang Tua" && <ParentSection />}
    {isAdmin && <><AdminSection /><button className="outline full admin-link" onClick={() => go("admin")}>Kelola pengguna & kelas <ChevronRight /></button></>}
    {!isAdmin && practiceBlock}
    {isStudent && <StudentSection />}
  </>;
}
