import { useState } from "react";
import { Heart } from "lucide-react";
import type { PublicUser } from "@murojaah/shared";
import { Modal } from "./Modal";
import { sendEncouragement } from "../lib/api";

export function SendEncouragementModal({ kids, onClose, notify }: { kids: PublicUser[]; onClose: () => void; notify: (s: string) => void }) {
  const [childId, setChildId] = useState<number>(kids[0]?.id ?? 0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!message.trim()) { setError("Pesan tidak boleh kosong."); return; }
    setBusy(true);
    try {
      await sendEncouragement(childId, message.trim());
      notify("Pesan dukungan terkirim.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim dukungan.");
    } finally {
      setBusy(false);
    }
  };

  return <Modal onClose={onClose}>
    <form className="card auth-card" aria-label="Kirim dukungan" onSubmit={submit}>
      <div className="brand"><span className="brandmark"><Heart /></span><span>Kirim Dukungan</span></div>
      {kids.length > 1 && <label>Untuk<select value={childId} onChange={e=>setChildId(+e.target.value)}>{kids.map(k=><option key={k.id} value={k.id}>{k.displayName}</option>)}</select></label>}
      <label>Pesan<textarea required autoFocus rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder={`Semangat hafalannya, ${kids.find(k=>k.id===childId)?.displayName ?? ""}!`} /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="primary full" disabled={busy} type="submit">{busy?"Mengirim...":"Kirim Dukungan"}</button>
    </form>
  </Modal>;
}
