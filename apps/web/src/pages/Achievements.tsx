import { useEffect, useState } from "react";
import { BookOpen, Flame, Lock, Repeat2, Star, Target, Trophy, Zap } from "lucide-react";
import type { StatsResponse } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { Stat } from "../components/Stat";
import { getBadges, getMyStats, getSurahs } from "../lib/api";
import type { BadgeResponse, SurahResponse } from "../lib/api";

const ICONS: Record<string, typeof Flame> = { flame: Flame, "book-open": BookOpen, star: Star, trophy: Trophy };
const COLORS = ["orange", "green", "gold", "purple"];
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
const relativeDay = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
};

export function Achievements(){
  const [badges, setBadges] = useState<BadgeResponse[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [surahList, setSurahList] = useState<SurahResponse[]>([]);
  useEffect(() => { getBadges().then(res => setBadges(res.badges)).catch(() => setBadges([])); }, []);
  useEffect(() => { getMyStats().then(setStats).catch(() => setStats(null)); }, []);
  useEffect(() => { getSurahs().then(setSurahList).catch(() => setSurahList([])); }, []);
  const earnedCount = badges.filter(b => b.earned).length;
  const surahName = (id: number) => surahList.find(s => s.id === id)?.latinName ?? `Surah #${id}`;
  const levelProgressPct = stats ? Math.round((stats.xpIntoLevel / stats.xpPerLevel) * 100) : 0;
  const hoursLabel = stats ? (stats.totalDurationSeconds / 3600).toFixed(1).replace(".", ",") : "0";

  return <><PageTitle eyebrow="PENCAPAIAN" title="MasyaAllah, terus bertumbuh!" desc="Setiap langkah kecilmu adalah pencapaian besar."/><section className="level-card"><div className="level-ring"><Trophy/><b>{stats?.level ?? 1}</b></div><div><span>LEVEL SAAT INI</span><h2>Level {stats?.level ?? 1}</h2><p>{stats?stats.xpPerLevel-stats.xpIntoLevel:0} XP lagi menuju level berikutnya</p><div className="progress"><i style={{width:`${levelProgressPct}%`}}/></div><small>{stats?.xpIntoLevel ?? 0} / {stats?.xpPerLevel ?? 0} XP</small></div><div className="xp"><Zap/><b>+{stats?.weeklyXp ?? 0}</b><span>XP minggu ini</span></div></section><div className="stat-grid"><Stat icon={Flame} value={`${stats?.streak ?? 0} hari`} label="Streak saat ini"/><Stat icon={BookOpen} value={`${stats?.ayahsMastered ?? 0} ayat`} label="Sudah dikuasai"/><Stat icon={Repeat2} value={`${stats?.totalRepetitions ?? 0}×`} label="Total pengulangan"/><Stat icon={Target} value={`${hoursLabel} jam`} label="Waktu latihan"/></div><div className="section-title"><div><h2>Koleksi lencana</h2><p>{earnedCount} dari {badges.length} lencana berhasil dibuka</p></div></div><div className="badges">{badges.map((badge,i)=>{const Icon=ICONS[badge.icon]??Trophy;const color=COLORS[i%COLORS.length];return <div className={!badge.earned?"badge-card locked":"badge-card"} key={badge.code}><span className={color}><Icon/></span><div><b>{badge.name}</b><p>{badge.earned&&badge.earnedAt?`Berhasil diraih • ${formatDate(badge.earnedAt)}`:"Selesaikan tantangan untuk membuka"}</p></div>{!badge.earned&&<Lock/>}</div>})}</div><section className="card history"><h3>Aktivitas terbaru</h3>{(stats?.recentSessions ?? []).length===0 && <p className="empty-state">Belum ada sesi latihan.</p>}{(stats?.recentSessions ?? []).map((s,i)=><div className="history-row" key={s.id}><span className={`history-icon h${i%4}`}><BookOpen/></span><div className="history-text"><b>{surahName(s.surahId)}</b><p>{s.endAyah-s.startAyah+1} ayat • {s.loops}× pengulangan • {relativeDay(s.completedAt)}</p></div><strong>+{s.xpEarned} XP</strong></div>)}</section></>;
}
