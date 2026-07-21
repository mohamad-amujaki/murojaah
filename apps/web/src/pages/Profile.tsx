import { useEffect, useState } from "react";
import { Check, Settings } from "lucide-react";
import type { StatsResponse, UserPreferences } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { Toggle } from "../components/Toggle";
import { useAuth } from "../lib/auth-context";
import { getMyStats } from "../lib/api";
import { getTheme, setTheme } from "../lib/theme";

const initials = (name: string) => name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();

const ROLE_LABEL: Record<string, string> = { student: "Murid", teacher: "Guru", parent: "Orang Tua", admin: "Admin" };

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

  return <><PageTitle eyebrow="PROFIL & PREFERENSI" title="Atur pengalaman belajarmu" desc="Sesuaikan tampilan agar hafalan terasa lebih nyaman."/><div className="profile-grid"><section className="card profile-card"><div className="big-avatar">{initials(user.displayName)}<button onClick={()=>notify("Pilih avatar tersedia di versi berikutnya")}><Settings/></button></div><h2>{user.displayName}</h2><p>Level {stats?.level ?? 1}</p><div className="mini-stats"><span><b>{stats?.totalXp ?? 0}</b>XP</span><span><b>{stats?.streak ?? 0}</b>Streak</span><span><b>{stats?.ayahsMastered ?? 0}</b>Ayat</span></div></section><section className="card preferences"><h3>Informasi profil</h3><div className="info-row"><span>Peran</span><b>{ROLE_LABEL[user.role]}</b></div>{user.managedBy && <div className="info-row"><span>Dikelola oleh</span><b>{loginUser?.displayName}</b></div>}<label>Nama tampilan<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Target latihan harian<select value={dailyTarget} onChange={e=>setDailyTarget(+e.target.value)}><option value={10}>10 menit</option><option value={15}>15 menit</option><option value={20}>20 menit</option></select></label><h3>Tampilan ayat</h3><label>Ukuran teks Arab<select value={prefs.textSize} onChange={e=>setPrefs(p=>({...p,textSize:e.target.value as UserPreferences["textSize"]}))}><option>Sedang</option><option>Besar</option><option>Sangat besar</option></select></label><Toggle label="Tampilkan transliterasi" value={prefs.showTransliteration} set={v=>setPrefs(p=>({...p,showTransliteration:v}))}/><Toggle label="Tampilkan terjemahan" value={prefs.showTranslation} set={v=>setPrefs(p=>({...p,showTranslation:v}))}/><h3>Tampilan aplikasi</h3><Toggle label="Mode gelap" value={darkMode} set={v=>{setDarkMode(v);setTheme(v?"dark":"light");}}/><button className="primary" disabled={saving} onClick={save}><Check/> {saving?"Menyimpan...":"Simpan perubahan"}</button></section></div></>;
}
