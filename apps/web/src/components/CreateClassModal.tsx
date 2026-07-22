import { useState } from "react";
import { Check, Copy, Users } from "lucide-react";
import { Modal } from "./Modal";
import { createClass } from "../lib/api";
import type { ClassResponse } from "../lib/api";

export function CreateClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: (cls: ClassResponse) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ClassResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) { setError("Nama kelas wajib diisi."); return; }
    setBusy(true);
    try {
      const res = await createClass(name.trim());
      setCreated(res.class);
      onCreated(res.class);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kelas.");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(created!.joinCode)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })
      .catch(() => setError("Gagal menyalin otomatis. Salin kode secara manual."));
  };

  if (created) {
    return <Modal onClose={onClose}>
      <div className="card auth-card" aria-label="Kelas berhasil dibuat">
        <div className="brand"><span className="brandmark"><Users /></span><span>{created.name}</span></div>
        <p className="text-xs" style={{color:"var(--muted)",margin:0}}>Bagikan kode ini ke murid supaya mereka bisa gabung ke kelas.</p>
        <div className="join-code-box">{created.joinCode}</div>
        <button type="button" className="outline full" onClick={copyCode}>{copied?<><Check/> Tersalin!</>:<><Copy/> Salin kode</>}</button>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary full" onClick={onClose}>Selesai</button>
      </div>
    </Modal>;
  }

  return <Modal onClose={onClose}>
    <form className="card auth-card" aria-label="Buat kelas baru" onSubmit={submit}>
      <div className="brand"><span className="brandmark"><Users /></span><span>Buat Kelas Baru</span></div>
      <label>Nama kelas<input required autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Kelas Tahfiz A" /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="primary full" disabled={busy} type="submit">{busy?"Membuat...":"Buat Kelas"}</button>
    </form>
  </Modal>;
}
