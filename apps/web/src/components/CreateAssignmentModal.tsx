import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronRight, Search } from "lucide-react";
import { Modal } from "./Modal";
import { createAssignment, getSurahs } from "../lib/api";
import type { ClassResponse, SurahResponse } from "../lib/api";

export function CreateAssignmentModal({ classes, selectedClass, onClose, notify }: { classes: ClassResponse[]; selectedClass: ClassResponse; onClose: () => void; notify: (s: string) => void }) {
  const [classId, setClassId] = useState(selectedClass.id);
  const [surahList, setSurahList] = useState<SurahResponse[]>([]);
  const [query, setQuery] = useState("");
  const [surah, setSurah] = useState<SurahResponse | null>(null);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(4);
  const [loops, setLoops] = useState("5");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getSurahs().then(setSurahList).catch(() => setSurahList([])); }, []);

  const pickSurah = (s: SurahResponse) => { setSurah(s); setStart(1); setEnd(Math.min(4, s.ayahCount)); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!surah) { setError("Pilih surah terlebih dahulu."); return; }
    setBusy(true);
    try {
      await createAssignment({ classId, surahId: surah.id, startAyah: start, endAyah: end, targetLoops: Number(loops), dueAt: dueAt || undefined });
      notify(`Tugas ${surah.latinName} berhasil dibuat.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tugas.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = surahList.filter(s => s.latinName.toLowerCase().includes(query.toLowerCase()));

  return <Modal onClose={onClose}>
    <form className="card auth-card assignment-modal" aria-label="Buat tugas baru" onSubmit={submit}>
      <div className="brand"><span className="brandmark"><BookOpen /></span><span>Buat Tugas Baru</span></div>
      {classes.length > 1 && <label>Kelas<select value={classId} onChange={e=>setClassId(+e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}

      {!surah && <>
        <label className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari surah..." /></label>
        <div className="surah-list modal-surah-list">
          {filtered.slice(0,30).map(s=><button type="button" key={s.id} onClick={()=>pickSurah(s)}><span>{s.id}</span><div><b>{s.latinName}</b><small>{s.meaning} • {s.ayahCount} ayat</small></div><ChevronRight/></button>)}
          {filtered.length===0 && <p className="empty-state">Surah tidak ditemukan.</p>}
        </div>
      </>}

      {surah && <>
        <div className="selected-surah"><BookOpen/><div><small>SURAH DIPILIH</small><b>{surah.latinName}</b></div><span>{surah.ayahCount} ayat</span><button type="button" className="link-btn" onClick={()=>setSurah(null)}>Ganti</button></div>
        <div className="field-row">
          <label>Mulai ayat<select value={start} onChange={e=>{const v=+e.target.value;setStart(v);setEnd(cur=>Math.max(cur,v))}}>{Array.from({length:surah.ayahCount},(_,i)=>i+1).map(n=><option key={n}>{n}</option>)}</select></label>
          <span>—</span>
          <label>Sampai ayat<select value={end} onChange={e=>setEnd(+e.target.value)}>{Array.from({length:surah.ayahCount},(_,i)=>i+1).filter(n=>n>=start).map(n=><option key={n}>{n}</option>)}</select></label>
        </div>
        <label className="field-label">Jumlah pengulangan</label>
        <div className="segmented">{["1","3","5","10"].map(n=><button type="button" className={loops===n?"active":""} onClick={()=>setLoops(n)} key={n}>{n}×</button>)}</div>
        <label>Tenggat (opsional)<input type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)} /></label>
      </>}

      {error && <p className="auth-error">{error}</p>}
      {surah && <button className="primary full" disabled={busy} type="submit"><Check/> {busy?"Membuat...":`Buat Tugas untuk ${classes.find(c=>c.id===classId)?.name ?? "kelas ini"}`}</button>}
    </form>
  </Modal>;
}
