import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronRight, Flame, Heart, Play, Repeat2, Sparkles, Target, Zap } from "lucide-react";
import { Goal } from "../components/Goal";
import type { StatsResponse } from "@murojaah/shared";
import { getAssignments, getEncouragements, getMyStats, getSuggestion, getSurahs, markEncouragementRead } from "../lib/api";
import type { AssignmentResponse, EncouragementResponse, Suggestion, SurahResponse } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import type { Page } from "../types";

const formatDue = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Tanpa tenggat";

export function HomePage({ go }: { go: (p: Page) => void }) {
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

  return <>
    <section className="welcome"><div><span className="eyebrow">{todayLabel}</span><h1>Assalamu'alaikum, {firstName}!</h1><p>{isNewUser ? "Siap memulai perjalanan hafalan? Setup-nya cuma semenit." : "Siap menambah hafalan hari ini? Kamu hebat karena terus berusaha."}</p></div>
      {streakCount > 0 ? <div className="streak"><span><Flame /></span><div><b>{streakCount} hari</b><small>Streak saat ini</small></div></div>
      : <div className="streak" style={{background:"#f3f6f4",color:"var(--muted)"}}><span><Flame /></span><div><b>Belum dimulai</b><small>Latihan hari ini untuk streak pertamamu</small></div></div>}</section>
    {isNewUser ? <section className="hero-card" style={{background:"linear-gradient(135deg,#0c735b,#08503f)",color:"#fff"}}><div className="hero-copy" style={{color:"#fff"}}><span className="pill" style={{background:"#ffffff26",color:"#fff",borderColor:"transparent"}}><Sparkles /> MULAI PERJALANAN</span><h2 style={{color:"#fff"}}>Pilih surah pertamamu</h2><p style={{color:"#ffffffb3",maxWidth:400}}>Pilih surah, atur jumlah pengulangan, dan mulai hafalan. Gampang, tanpa ribet.</p><button className="primary light" onClick={() => go("practice")}><Play /> Mulai Hafalan Pertama</button></div></section>
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
    {latestEncouragement && <section className="support"><div className="parent-avatar">{latestEncouragement.parentName[0]}</div><div><span><Heart /> PESAN DARI {latestEncouragement.parentName.toUpperCase()}</span><p>"{latestEncouragement.message}"</p></div></section>}
  </>;
}
