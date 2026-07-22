import { useEffect, useRef, useState } from "react";
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Lock, Pause, Play,
  Repeat2, ShieldCheck, Sparkles, Target, Volume2
} from "lucide-react";
import { getQuranSurah, getSurahs } from "../lib/api";
import type { SurahResponse } from "../lib/api";
import { PageTitle } from "../components/PageTitle";
import { SurahPicker } from "../components/SurahPicker";
import { SegmentedControl } from "../components/SegmentedControl";
import { fallbackAyahs, surahs as fallbackSurahList } from "../types";
import type { Ayah, Mastery } from "../types";
import { useAyahPlayer } from "../hooks/useAyahPlayer";

const AL_IKHLAS: SurahResponse = { id: 112, latinName: "Al-Ikhlas", arabicName: "الإخلاص", meaning: "Ketulusan", ayahCount: 4 };
const FALLBACK_SURAH_LIST: SurahResponse[] = fallbackSurahList.map(s => ({
  id: Number(s[0]), latinName: String(s[1]), arabicName: "", meaning: String(s[3]), ayahCount: parseInt(String(s[2]), 10) || 0,
}));

export function PracticePage({ notify }: { notify: (s: string) => void }) {
  const [surahList, setSurahList] = useState<SurahResponse[]>(FALLBACK_SURAH_LIST);
  const [selectedSurah, setSelectedSurah] = useState<SurahResponse>(AL_IKHLAS);
  const [ayahs, setAyahs] = useState<Ayah[]>(fallbackAyahs);
  const [quranSource, setQuranSource] = useState("Menyiapkan data...");
  const [query, setQuery] = useState("");
  const [surahConfirmed, setSurahConfirmed] = useState(false);

  const {
    started, playing, index, count, currentAyah, hidden, mastery, saving,
    start, setStart, end, setEnd, setIndex, loops, setLoops, speed, setSpeed, changeSpeed,
    startPractice, stopPractice, move, toggle, finish, setHidden, handleMastery,
  } = useAyahPlayer(ayahs, notify);

  useEffect(() => {
    getSurahs().then(list => { if (list.length) setSurahList(list); }).catch(() => undefined);
  }, []);

  const suggestedRange = useRef<{ surahId: number; startAyah: number; endAyah: number } | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("suggestedPractice");
    if (!raw) return;
    sessionStorage.removeItem("suggestedPractice");
    try {
      const s = JSON.parse(raw);
      const target = surahList.find(x => x.id === s.surahId) ?? FALLBACK_SURAH_LIST.find(x => x.id === s.surahId);
      if (target) { suggestedRange.current = { surahId: s.surahId, startAyah: s.startAyah, endAyah: s.endAyah }; setSelectedSurah(target); setSurahConfirmed(true); }
    } catch { /* ignore malformed */ }
  }, [surahList]);

  useEffect(() => {
    const controller = new AbortController();
    setQuranSource("Memuat ayat...");
    getQuranSurah(selectedSurah.id, controller.signal).then(result => {
      if (!result.ayahs.length) throw new Error("Data ayat kosong");
      setAyahs(result.ayahs);
      setQuranSource(result.source === "D1" ? "Ayat & audio tersimpan" : "Ayat & audio • EQuran.id");
      const pending = suggestedRange.current;
      if (pending && pending.surahId === selectedSurah.id) {
        suggestedRange.current = null;
        setStart(pending.startAyah); setEnd(Math.min(pending.endAyah, result.ayahs.length)); setIndex(pending.startAyah - 1);
      } else { setStart(1); setEnd(result.ayahs.length); setIndex(0); }
    }).catch(() => {
      if (selectedSurah.id === 112) { setAyahs(fallbackAyahs); setStart(1); setEnd(4); setIndex(0); setQuranSource("Mode offline • data tersimpan"); }
      else setQuranSource("Gagal memuat ayat. Coba lagi saat online.");
    });
    return () => controller.abort();
  }, [selectedSurah.id]);

  if (!started) {
    if (!surahConfirmed) {
      return (
        <>
          <PageTitle eyebrow="RUANG LATIHAN" title="Mau hafalan apa hari ini?" desc="Pilih surah untuk mulai atur sesi." />
          <section className="card picker single">
            <SurahPicker surahs={surahList} query={query} onQueryChange={setQuery} selectedId={selectedSurah.id} onSelect={s => { setSelectedSurah(s); setSurahConfirmed(true); notify(`${s.latinName} siap dilatih`) }} />
          </section>
        </>
      );
    }
    return (
      <>
        <PageTitle eyebrow="RUANG LATIHAN" title="Atur sesi latihanmu" desc="Sesuaikan rentang ayat dan ritme sebelum mulai." />
        <section className="card settings-card single">
          <button type="button" className="back-link" onClick={() => setSurahConfirmed(false)}><ChevronLeft /> Ganti surah</button>
          <div className="selected-surah">
            <BookOpen />
            <div><small>SURAH DIPILIH</small><b>{selectedSurah.latinName}</b></div>
            <span>{selectedSurah.ayahCount} ayat</span>
          </div>
          <div className="field-group">
            <div className="field-row">
              <label>Mulai ayat
                <select value={start} onChange={e => { const value = +e.target.value; setStart(value); setEnd(c => Math.max(c, value)); setIndex(value - 1) }}>
                  {ayahs.map(a => <option key={a.no}>{a.no}</option>)}
                </select>
              </label>
              <span>—</span>
              <label>Sampai ayat
                <select value={end} onChange={e => setEnd(+e.target.value)}>
                  {ayahs.filter(a => a.no >= start).map(a => <option key={a.no}>{a.no}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Jumlah pengulangan</label>
            <SegmentedControl options={["1", "3", "5", "10", "∞"]} value={loops} onChange={setLoops} />
          </div>
          <div className="field-group">
            <label className="field-label">Kecepatan audio</label>
            <SegmentedControl options={["0.75", "1", "1.25"]} value={speed} onChange={setSpeed} className="three" />
          </div>
          <button className="primary full" disabled={ayahs.length === 0} onClick={() => startPractice(start - 1)}>
            <Play /> Mulai Hafalan
          </button>
          <p className="safe"><ShieldCheck /> {quranSource}</p>
        </section>
      </>
    );
  }

  const a = currentAyah;
  const rangeSize = end - start + 1;
  const currentAyahInRange = index - start + 1;
  const totalSteps = (loops === "\u221e" ? count : Number(loops)) * rangeSize;
  const currentStep = ((count - 1) * rangeSize) + currentAyahInRange;
  const sessionProgress = Math.min(100, Math.round((currentStep / totalSteps) * 100));
  const maxDots = rangeSize > 60 ? 40 : rangeSize;
  const showCompact = rangeSize > maxDots;
  const dotEvery = showCompact ? Math.ceil(rangeSize / maxDots) : 1;

  const ayahDots = Array.from({ length: maxDots }, (_, i) => {
    const ayahPos = showCompact ? (i * dotEvery) + 1 : i + 1;
    const isCompleted = ayahPos < currentAyahInRange;
    const isActive = ayahPos === currentAyahInRange;
    return (
      <span
        key={i}
        className={`ayah-dot ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
      />
    );
  });

  return (
    <>
      <button className="back-link" onClick={stopPractice}>
        <ChevronLeft /> Kembali ke pilihan
      </button>
      <div className="player-head">
        <div>
          <span className="eyebrow">SEDANG MENGHAFAL</span>
          <h1>Surah {selectedSurah.latinName}</h1>
          <p>Ayat {start}–{end} • Putaran {count} dari {loops}</p>
        </div>
        <button className="outline" onClick={() => setHidden(!hidden)}>
          {hidden ? <BookOpen /> : <Lock />}
          {hidden ? "Tampilkan" : "Sembunyikan"} ayat
        </button>
      </div>
      <div className="player-card">
        <div className="ayah-number">{a.no}</div>
        <div className={hidden ? "arabic hidden-text" : "arabic"} dir="rtl">
          {hidden ? "Coba lantunkan ayat ini dari ingatanmu..." : a.arabic}
        </div>
        {!hidden && (
          <>
            <p className="latin">{a.latin}</p>
            <p className="meaning">&ldquo;{a.meaning}&rdquo;</p>
          </>
        )}
        <div className="ayah-track">
          {ayahDots}
          {showCompact && <span className="ayah-dot-more">{rangeSize} ayat</span>}
        </div>
        <div className="position-info">
          <span>Ayat {a.no}</span>
          <span className="position-info-sep">•</span>
          <span>Putaran {count}/{loops}</span>
        </div>
        <div className="session-bar" role="progressbar" aria-valuenow={sessionProgress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${sessionProgress}%` }} />
        </div>
        <div className="controls">
          <button disabled={index === start - 1} onClick={() => move(Math.max(start - 1, index - 1))} aria-label="Ayat sebelumnya">
            <ChevronLeft />
          </button>
          <button className="play-main" onClick={toggle} aria-label={playing ? "Jeda" : "Putar"}>
            {playing ? <Pause /> : <Play />}
          </button>
          <button disabled={index === end - 1} onClick={() => move(Math.min(end - 1, index + 1))} aria-label="Ayat berikutnya">
            <ChevronRight />
          </button>
        </div>
        <div className="player-options">
          <span><Repeat2 /> Putaran <b>{count}/{loops}</b></span>
          <span><Volume2 /> Qari <b>Mishary Alafasy</b></span>
          <SegmentedControl options={["0.75", "1", "1.25"]} value={speed} onChange={changeSpeed} className="three" />
        </div>
        <div className="mastery-inline">
          <span>Hafalan ayat ini?</span>
          <div>
            {(["Belum hafal", "Perlu latihan", "Sudah hafal"] as Mastery[]).map((m, i) => (
              <button
                key={i}
                className={mastery === m ? "active" : ""}
                onClick={() => handleMastery(selectedSurah.id, a.no, m)}
              >
                {i === 0 ? <Target /> : i === 1 ? <Sparkles /> : <Check />}{m}
              </button>
            ))}
          </div>
        </div>
        <button className="primary full" disabled={saving} onClick={() => finish(selectedSurah.id)} style={{ marginTop: 16 }}>
          <Sparkles /> {saving ? "Menyimpan..." : "Selesaikan sesi"}
        </button>
      </div>
    </>
  );
}
