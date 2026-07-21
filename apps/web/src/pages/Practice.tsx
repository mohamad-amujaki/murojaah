import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Lock, Pause, Play,
  Repeat2, Search, ShieldCheck, Sparkles, Target, Volume2
} from "lucide-react";
import { completePractice, getQuranSurah, getSurahs, saveAyahProgress } from "../lib/api";
import type { SurahResponse } from "../lib/api";
import { addPendingSession } from "../lib/offline-queue";
import { PageTitle } from "../components/PageTitle";
import { fallbackAyahs, surahs as fallbackSurahList } from "../types";
import type { Ayah, Mastery } from "../types";

const AL_IKHLAS: SurahResponse = { id: 112, latinName: "Al-Ikhlas", arabicName: "الإخلاص", meaning: "Ketulusan", ayahCount: 4 };
const FALLBACK_SURAH_LIST: SurahResponse[] = fallbackSurahList.map(s => ({
  id: Number(s[0]), latinName: String(s[1]), arabicName: "", meaning: String(s[3]), ayahCount: parseInt(String(s[2]), 10) || 0,
}));

export function PracticePage({notify}:{notify:(s:string)=>void}) {
  const [surahList,setSurahList]=useState<SurahResponse[]>(FALLBACK_SURAH_LIST);
  const [selectedSurah,setSelectedSurah]=useState<SurahResponse>(AL_IKHLAS);
  const [ayahs,setAyahs]=useState<Ayah[]>(fallbackAyahs);
  const [quranSource,setQuranSource]=useState("Menyiapkan data…");
  const [started,setStarted]=useState(false), [playing,setPlaying]=useState(false), [index,setIndex]=useState(0), [start,setStart]=useState(1), [end,setEnd]=useState(4), [loops,setLoops]=useState("5"), [count,setCount]=useState(1), [speed,setSpeed]=useState("1"), [hidden,setHidden]=useState(false), [mastery,setMastery]=useState<Mastery>("Perlu latihan"), [audioCycle,setAudioCycle]=useState(0), [saving,setSaving]=useState(false), [query,setQuery]=useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const continuePlayback = useRef(false);
  const sessionStartedAt = useRef(Date.now());
  const showNotice = useCallback((message:string)=>notify(message),[notify]);
  useEffect(()=>{
    getSurahs().then(list=>{ if(list.length) setSurahList(list); }).catch(()=>undefined);
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    setQuranSource("Memuat ayat…");
    getQuranSurah(selectedSurah.id,controller.signal).then(result=>{
      if(!result.ayahs.length) throw new Error("Data ayat kosong");
      setAyahs(result.ayahs);
      setQuranSource(result.source==="D1"?"Ayat & audio tersimpan":"Ayat & audio • EQuran.id");
      setStart(1);setEnd(result.ayahs.length);setIndex(0);
    }).catch(()=>{
      if(selectedSurah.id===112){setAyahs(fallbackAyahs);setStart(1);setEnd(4);setIndex(0);setQuranSource("Mode offline • data tersimpan")}
      else setQuranSource("Gagal memuat ayat. Coba lagi saat online.");
    });
    return()=>controller.abort();
  },[selectedSurah.id]);
  useEffect(()=>{
    if(!started) return;
    const a = new Audio(ayahs[index].audio);
    a.preload="auto";
    a.playbackRate=Number(speed);
    a.onplay=()=>setPlaying(true);
    a.onpause=()=>setPlaying(false);
    a.onerror=()=>{setPlaying(false);showNotice("Audio gagal dimuat. Periksa koneksi internet.")};
    a.onended=()=>{
      setPlaying(false);
      if(index+1<end){continuePlayback.current=true;setIndex(index+1);return}
      if(loops==="∞" || count<Number(loops)){
        continuePlayback.current=true;
        setCount(count+1);
        if(index===start-1)setAudioCycle(value=>value+1); else setIndex(start-1);
      } else showNotice("Semua putaran selesai. Nilai hafalanmu lalu selesaikan sesi.");
    };
    audio.current=a;
    if(continuePlayback.current){continuePlayback.current=false;a.play().catch(()=>setPlaying(false))}
    return()=>{a.onended=null;a.pause()};
  },[started,index,speed,audioCycle,end,loops,count,start,showNotice]);
  const move=(next:number)=>{continuePlayback.current=playing;audio.current?.pause();setIndex(next)};
  const toggle=()=>{const current=audio.current;if(!current)return;if(!current.paused){current.pause()}else{current.playbackRate=Number(speed);current.play().catch(()=>notify("Audio gagal dimuat. Periksa koneksi internet."))}};
  const finish=async()=>{
    audio.current?.pause();setSaving(true);
    const duration=Math.max(1,Math.round((Date.now()-sessionStartedAt.current)/1000));
    const payload={surahId:selectedSurah.id,startAyah:start,endAyah:end,loops:loops==="∞"?count:Number(loops),duration,clientId:crypto.randomUUID()};
    try {const result=await completePractice(payload);notify(`${result.message} +${result.xp} XP`)}
    catch {
      try {await addPendingSession(payload);notify("Sesi tersimpan di perangkat. Akan disinkronkan saat online.")}
      catch {notify("Sesi latihan gagal disimpan.")}
    }
    finally {setSaving(false);setPlaying(false);setStarted(false);setCount(1)}
  };
  if(!started) {
    const filteredSurahs=surahList.filter(s=>s.latinName.toLowerCase().includes(query.toLowerCase())||String(s.id).includes(query));
    return <><PageTitle eyebrow="RUANG LATIHAN" title="Mau hafalan apa hari ini?" desc="Pilih surah dan atur sesi sesuai ritmemu."/><div className="practice-layout"><section className="card picker"><h3><span>1</span>Pilih surah</h3><label className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari surah..." aria-label="Cari surah" /></label><div className="surah-list">{filteredSurahs.map(s=><button className={s.id===selectedSurah.id?"selected":""} key={s.id} onClick={()=>{setSelectedSurah(s);notify(`${s.latinName} siap dilatih`)}}><span>{s.id}</span><div><b>{s.latinName}</b><small>{s.meaning} • {s.ayahCount} ayat</small></div>{s.id===selectedSurah.id?<Check/>:<ChevronRight/>}</button>)}{filteredSurahs.length===0&&<p className="empty-state">Surah tidak ditemukan.</p>}</div></section><section className="card settings-card"><h3><span>2</span>Atur latihan</h3><div className="selected-surah"><BookOpen/><div><small>SURAH DIPILIH</small><b>{selectedSurah.latinName}</b></div><span>{selectedSurah.ayahCount} ayat</span></div><div className="field-row"><label>Mulai ayat<select value={start} onChange={e=>{const value=+e.target.value;setStart(value);setEnd(current=>Math.max(current,value));setIndex(value-1)}}>{ayahs.map(a=><option key={a.no}>{a.no}</option>)}</select></label><span>—</span><label>Sampai ayat<select value={end} onChange={e=>setEnd(+e.target.value)}>{ayahs.filter(a=>a.no>=start).map(a=><option key={a.no}>{a.no}</option>)}</select></label></div><label className="field-label">Jumlah pengulangan</label><div className="segmented">{["1","3","5","10","∞"].map(n=><button className={loops===n?"active":""} onClick={()=>setLoops(n)} key={n}>{n}{n==="∞"?"":"×"}</button>)}</div><label className="field-label">Kecepatan audio</label><div className="segmented three">{["0.75","1","1.25"].map(n=><button className={speed===n?"active":""} onClick={()=>setSpeed(n)} key={n}>{n}×</button>)}</div><button className="primary full" disabled={ayahs.length===0} onClick={()=>{setIndex(start-1);setCount(1);sessionStartedAt.current=Date.now();setStarted(true)}}><Play/> Mulai Hafalan</button><p className="safe"><ShieldCheck/> {quranSource}</p></section></div></>;
  }
  const a=ayahs[index];
  const handleMastery=(m:Mastery)=>{setMastery(m);saveAyahProgress(selectedSurah.id,a.no,m).catch(()=>undefined)};
  return <><button className="back-link" onClick={()=>{audio.current?.pause();setPlaying(false);setStarted(false)}}><ChevronLeft/> Kembali ke pilihan</button><div className="player-head"><div><span className="eyebrow">SEDANG MENGHAFAL</span><h1>Surah {selectedSurah.latinName}</h1><p>Ayat {start}–{end} • Putaran {count} dari {loops}</p></div><button className="outline" onClick={()=>setHidden(!hidden)}>{hidden?<BookOpen/>:<Lock/>}{hidden?"Tampilkan":"Sembunyikan"} ayat</button></div><div className="player-card"><div className="ayah-number">{a.no}</div><div className={hidden?"arabic hidden-text":"arabic"} dir="rtl">{hidden?"Coba lantunkan ayat ini dari ingatanmu…":a.arabic}</div>{!hidden&&<><p className="latin">{a.latin}</p><p className="meaning">“{a.meaning}”</p></>}<div className="timeline"><span style={{width:playing?"42%":"5%"}}/><i>{playing?"Sedang diputar":"Siap diputar"}</i><i>Ayat {a.no}</i></div><div className="controls"><button disabled={index===start-1} onClick={()=>move(Math.max(start-1,index-1))} aria-label="Ayat sebelumnya"><ChevronLeft/></button><button className="play-main" onClick={toggle} aria-label={playing?"Jeda":"Putar"}>{playing?<Pause/>:<Play/>}</button><button disabled={index===end-1} onClick={()=>move(Math.min(end-1,index+1))} aria-label="Ayat berikutnya"><ChevronRight/></button></div><div className="player-options"><span><Repeat2/> Putaran <b>{count}/{loops}</b></span><span><Volume2/> Qari <b>Mishary Alafasy</b></span><select value={speed} onChange={e=>{continuePlayback.current=playing;setSpeed(e.target.value)}} aria-label="Kecepatan"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option></select></div><p className="safe">Ayat, terjemahan &amp; audio: EQuran.id</p></div><section className="mastery card"><div><h3>Bagaimana hafalan ayat ini?</h3><p>Jujur pada dirimu membantu kami menyusun latihan berikutnya.</p></div><div>{(["Belum hafal","Perlu latihan","Sudah hafal"] as Mastery[]).map((m,i)=><button key={m} className={mastery===m?`mastery-${i} active`:`mastery-${i}`} onClick={()=>handleMastery(m)}>{i===0?<Repeat2/>:i===1?<Target/>:<Check/>}{m}</button>)}</div></section><button className="primary finish" disabled={saving} onClick={finish}><Sparkles/> {saving?"Menyimpan...":"Selesaikan sesi (+35 XP)"}</button></>;
}
