import { useEffect, useState } from "react";
import { Bell, BookOpen, ChevronRight, Heart } from "lucide-react";
import { Modal } from "./Modal";
import { getAssignments, getEncouragements, getSurahs, markEncouragementRead } from "../lib/api";
import type { AssignmentResponse, EncouragementResponse, SurahResponse } from "../lib/api";
import type { Page } from "../types";

const formatDue = (iso: string | null) => iso ? `Tenggat ${new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}` : "Tanpa tenggat";

/**
 * Notifikasi murid: hanya tugas aktif dan pesan dukungan yang belum dibaca —
 * dua jenis data yang memang sudah ada. Lonceng disembunyikan bila kosong.
 */
export function NotificationBell({ page, go }: { page: Page; go: (p: Page) => void }) {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [messages, setMessages] = useState<EncouragementResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [surahs, setSurahs] = useState<SurahResponse[]>([]);
  const surahName = (id: number) => surahs.find(s => s.id === id)?.latinName ?? `Surah #${id}`;
  useEffect(() => { getSurahs().then(setSurahs).catch(() => undefined); }, []);

  useEffect(() => {
    getAssignments().then(r => setAssignments(r.assignments.filter(a => a.status === "active"))).catch(() => undefined);
    getEncouragements().then(r => setMessages(r.encouragements.filter(e => !e.isRead))).catch(() => undefined);
  }, [page]);

  const count = assignments.length + messages.length;
  if (count === 0) return null;

  const openPanel = () => {
    setOpen(true);
    messages.forEach(m => markEncouragementRead(m.id).catch(() => undefined));
  };
  const close = () => { setOpen(false); setMessages([]); };

  return <>
    <button className="icon-btn notify" onClick={openPanel} aria-label={`Notifikasi, ${count} baru`}>
      <Bell /><i aria-hidden="true">{count > 9 ? "9+" : count}</i>
    </button>
    {open && <Modal onClose={close}>
      <div className="card auth-card notif-panel">
        <div className="brand"><span className="brandmark"><Bell /></span><span>Notifikasi</span></div>
        {messages.length > 0 && <>
          <h3>Pesan dukungan</h3>
          <ul>{messages.map(m => <li key={m.id} className="notif-message">
            <span className="notif-icon gold"><Heart /></span>
            <div><b>{m.parentName}</b><p>“{m.message}”</p></div>
          </li>)}</ul>
        </>}
        {assignments.length > 0 && <>
          <h3>Tugas aktif</h3>
          <ul>{assignments.map(a => <li key={a.id}>
            <button type="button" onClick={() => { close(); go("practice"); }}>
              <span className="notif-icon"><BookOpen /></span>
              <div><b>Muraja'ah {surahName(a.surahId)}</b><p>Ayat {a.startAyah}–{a.endAyah} · Ulangi {a.targetLoops}× · {formatDue(a.dueAt)}</p></div>
              <ChevronRight />
            </button>
          </li>)}</ul>
        </>}
      </div>
    </Modal>}
  </>;
}
