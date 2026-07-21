import { useState } from "react";
import { UserRound } from "lucide-react";
import type { Gender } from "@murojaah/shared";
import { Modal } from "./Modal";
import { useAuth } from "../lib/auth-context";

const todayStr = new Date().toISOString().slice(0, 10);

export function AddChildModal({ onClose, notify }: { onClose: () => void; notify: (s: string) => void }) {
  const { createChild } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>("L");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!displayName.trim()) { setError("Nama anak wajib diisi."); return; }
    if (!birthDate) { setError("Tanggal lahir wajib diisi."); return; }
    setBusy(true);
    try {
      await createChild({ displayName: displayName.trim(), gender, birthDate });
      notify(`Profil ${displayName.trim()} berhasil ditambahkan.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah profil anak.");
    } finally {
      setBusy(false);
    }
  };

  return <Modal onClose={onClose}>
    <form className="card auth-card" aria-label="Tambah profil anak" onSubmit={submit}>
      <div className="brand"><span className="brandmark"><UserRound /></span><span>Profil Anak Baru</span></div>
      <label>Nama anak<input required autoFocus value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Nama anak" /></label>
      <label>Jenis kelamin<select value={gender} onChange={e=>setGender(e.target.value as Gender)}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
      <label>Tanggal lahir<input required type="date" max={todayStr} value={birthDate} onChange={e=>setBirthDate(e.target.value)} /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="primary full" disabled={busy} type="submit">{busy?"Menyimpan...":"Tambah Profil"}</button>
    </form>
  </Modal>;
}
