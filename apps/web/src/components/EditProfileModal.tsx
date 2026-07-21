import { useState } from "react";
import { UserRound } from "lucide-react";
import type { Gender, PublicUser, UserRole } from "@murojaah/shared";
import { Modal } from "./Modal";
import type { ProfileFieldUpdates } from "../lib/api";

const todayStr = new Date().toISOString().slice(0, 10);
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "student", label: "Murid" },
  { value: "teacher", label: "Guru" },
  { value: "parent", label: "Orang Tua" },
  { value: "admin", label: "Admin" },
];

export function EditProfileModal({ user, allowRoleEdit, onClose, onSave }: {
  user: PublicUser;
  allowRoleEdit?: boolean;
  onClose: () => void;
  onSave: (updates: ProfileFieldUpdates & { role?: UserRole }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [gender, setGender] = useState<Gender>(user.gender ?? "L");
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!displayName.trim()) { setError("Nama wajib diisi."); return; }
    setBusy(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        gender,
        birthDate: birthDate || undefined,
        ...(allowRoleEdit ? { role } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setBusy(false);
    }
  };

  return <Modal onClose={onClose}>
    <form className="card auth-card" aria-label="Ubah profil" onSubmit={submit}>
      <div className="brand"><span className="brandmark"><UserRound /></span><span>Ubah Profil</span></div>
      <label>Nama<input required autoFocus value={displayName} onChange={e=>setDisplayName(e.target.value)} /></label>
      <label>Jenis kelamin<select value={gender} onChange={e=>setGender(e.target.value as Gender)}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
      <label>Tanggal lahir<input type="date" max={todayStr} value={birthDate} onChange={e=>setBirthDate(e.target.value)} /></label>
      {allowRoleEdit && <label>Peran<select value={role} onChange={e=>setRole(e.target.value as UserRole)}>{ROLE_OPTIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>}
      {error && <p className="auth-error">{error}</p>}
      <button className="primary full" disabled={busy} type="submit">{busy?"Menyimpan...":"Simpan Perubahan"}</button>
    </form>
  </Modal>;
}
