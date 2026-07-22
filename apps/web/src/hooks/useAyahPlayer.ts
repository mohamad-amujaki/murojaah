import { useCallback, useEffect, useRef, useState } from "react";
import { saveAyahProgress } from "../lib/api";
import type { Ayah, Mastery } from "../types";

export function useAyahPlayer(ayahs: Ayah[], notify: (s: string) => void) {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(4);
  const [loops, setLoops] = useState("5");
  const [count, setCount] = useState(1);
  const [speed, setSpeed] = useState("1");
  const [hidden, setHidden] = useState(false);
  const [mastery, setMastery] = useState<Mastery>("Perlu latihan");
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
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    a.onerror = () => { setPlaying(false); notify("Audio gagal dimuat. Periksa koneksi internet."); };
    a.onended = () => {
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
    return () => { a.onended = null; a.pause(); };
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

  const finish = useCallback(async (surahId: number) => {
    audio.current?.pause();
    setSaving(true);
    const duration = Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 1000));
    const { completePractice } = await import("../lib/api");
    const { addPendingSession } = await import("../lib/offline-queue");
    const payload = { surahId, startAyah: start, endAyah: end, loops: loops === "∞" ? count : Number(loops), duration, clientId: crypto.randomUUID() };
    try { const result = await completePractice(payload); notify(`${result.message} +${result.xp} XP`); }
    catch {
      try { await addPendingSession(payload); notify("Sesi tersimpan di perangkat. Akan disinkronkan saat online."); }
      catch { notify("Sesi latihan gagal disimpan."); }
    }
    finally { setSaving(false); setPlaying(false); setStarted(false); setCount(1); }
  }, [start, end, loops, count, notify]);

  const handleMastery = useCallback(async (surahId: number, ayahNo: number, m: Mastery) => {
    setMastery(m);
    try { await saveAyahProgress(surahId, ayahNo, m); } catch { /* ignore */ }
  }, []);

  const currentAyah = ayahs[index];

  return {
    started, playing, index, count, currentAyah,
    hidden, mastery, saving,
    start, setStart, end, setEnd, setIndex, loops, setLoops, speed, setSpeed, changeSpeed,
    startPractice, stopPractice, move, toggle, finish,
    setHidden, setMastery, handleMastery,
  };
}
