import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../lib/toast-context";
import { saveAyahProgress } from "../lib/api";
import type { Ayah, Mastery } from "../types";

export interface SessionSummary {
  surahId: number;
  startAyah: number;
  endAyah: number;
  loopsDone: number;
  minutes: number;
  /** null bila sesi belum terkirim (tersimpan offline atau gagal). */
  xp: number | null;
  saved: "online" | "offline" | "failed";
  /** Tanda hafalan yang diberikan selama sesi ini, per nomor ayat. */
  marks: Record<number, Mastery>;
}

export function useAyahPlayer(ayahs: Ayah[]) {
  const notify = useToast();
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(4);
  const [loops, setLoops] = useState("5");
  const [count, setCount] = useState(1);
  const [speed, setSpeed] = useState("1");
  const [hidden, setHidden] = useState(false);
  // Tanda hafalan per nomor ayat untuk sesi berjalan (bukan satu nilai untuk semua ayat).
  const [marks, setMarks] = useState<Record<number, Mastery>>({});
  const [audioCycle, setAudioCycle] = useState(0);
  const [saving, setSaving] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const continuePlayback = useRef(false);
  const sessionStartedAt = useRef(Date.now());

  useEffect(() => {
    if (!started) return;
    const a = new Audio(ayahs[index].audio);
    a.preload = "auto";
    a.playbackRate = Number(speed);

    const stallTimer = setTimeout(() => {
      if (a.paused) {
        a.pause();
        if (index + 1 < end) { continuePlayback.current = true; setIndex(index + 1); }
        else if (loops === "∞" || count < Number(loops)) {
          continuePlayback.current = true;
          setCount(c => c + 1);
          setIndex(start - 1);
        } else notify("Audio tidak bisa diputar. Periksa koneksi internet.");
      }
    }, 12_000);

    a.onplay = () => { setPlaying(true); clearTimeout(stallTimer); };
    a.onpause = () => setPlaying(false);
    a.onerror = () => { setPlaying(false); clearTimeout(stallTimer); notify("Audio gagal dimuat. Periksa koneksi internet."); };
    a.onended = () => {
      clearTimeout(stallTimer);
      setPlaying(false);
      if (index + 1 < end) { continuePlayback.current = true; setIndex(index + 1); return; }
      if (loops === "∞" || count < Number(loops)) {
        continuePlayback.current = true;
        setCount(c => c + 1);
        if (index === start - 1) setAudioCycle(v => v + 1); else setIndex(start - 1);
      } else notify("Semua putaran selesai. Nilai hafalanmu lalu selesaikan sesi.");
    };
    audio.current = a;
    if (continuePlayback.current) { continuePlayback.current = false; a.play().catch(() => setPlaying(false)); }
    return () => { clearTimeout(stallTimer); a.onended = null; a.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, speed, audioCycle, end, loops, count, start]);

  const move = useCallback((next: number) => {
    continuePlayback.current = playing;
    audio.current?.pause();
    setIndex(next);
  }, [playing]);

  const toggle = useCallback(() => {
    const current = audio.current;
    if (!current) return;
    if (!current.paused) { current.pause(); } else { current.playbackRate = Number(speed); current.play().catch(() => notify("Audio gagal dimuat. Periksa koneksi internet.")); }
  }, [speed, notify]);

  const startPractice = useCallback((startIndex: number) => {
    setIndex(startIndex);
    setCount(1);
    setMarks({});
    sessionStartedAt.current = Date.now();
    setStarted(true);
  }, []);

  const stopPractice = useCallback(() => {
    audio.current?.pause();
    setPlaying(false);
    setStarted(false);
  }, []);

  const changeSpeed = useCallback((s: string) => {
    continuePlayback.current = playing;
    setSpeed(s);
  }, [playing]);

  const finish = useCallback(async (surahId: number): Promise<SessionSummary> => {
    audio.current?.pause();
    setSaving(true);
    const duration = Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 1000));
    const { completePractice } = await import("../lib/api");
    const { addPendingSession } = await import("../lib/offline-queue");
    const loopsDone = loops === "∞" ? count : Number(loops);
    const payload = { surahId, startAyah: start, endAyah: end, loops: loopsDone, duration, clientId: crypto.randomUUID() };
    const base = { surahId, startAyah: start, endAyah: end, loopsDone, minutes: Math.max(1, Math.round(duration / 60)), marks };
    try {
      const result = await completePractice(payload);
      return { ...base, xp: result.xp, saved: "online" };
    } catch {
      try { await addPendingSession(payload); return { ...base, xp: null, saved: "offline" }; }
      catch { return { ...base, xp: null, saved: "failed" }; }
    } finally { setSaving(false); setPlaying(false); setStarted(false); setCount(1); }
  }, [start, end, loops, count, marks]);

  const handleMastery = useCallback(async (surahId: number, ayahNo: number, m: Mastery) => {
    setMarks(prev => ({ ...prev, [ayahNo]: m }));
    try { await saveAyahProgress(surahId, ayahNo, m); }
    catch { notify("Tanda hafalan gagal disimpan. Periksa koneksi internet."); }
  }, [notify]);

  const currentAyah = ayahs[index];
  const mastery: Mastery | undefined = currentAyah ? marks[currentAyah.no] : undefined;

  return {
    started, playing, index, count, currentAyah,
    hidden, mastery, saving,
    start, setStart, end, setEnd, setIndex, loops, setLoops, speed, setSpeed, changeSpeed,
    startPractice, stopPractice, move, toggle, finish,
    setHidden, handleMastery,
  };
}
