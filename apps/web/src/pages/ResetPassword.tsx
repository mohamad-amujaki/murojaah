import { useState } from "react";
import { BookOpen, Check, ShieldCheck } from "lucide-react";
import { PasswordField } from "../components/PasswordField";
import { resetPassword } from "../lib/api";

export function ResetPasswordPage() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Kata sandi minimal 8 karakter."); return; }
    if (password !== confirm) { setError("Konfirmasi kata sandi tidak cocok."); return; }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengatur ulang kata sandi.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <div className="auth-shell"><span className="brandmark"><BookOpen /></span><p>Tautan reset tidak valid.</p></div>;
  if (done) return <div className="auth-shell"><span className="brandmark"><BookOpen /></span><h1>Kata sandi berhasil diubah</h1><p>Sekarang kamu bisa masuk dengan kata sandi baru.</p><a className="primary" href="/" style={{marginTop:16,display:"inline-block",padding:"10px 24px",borderRadius:12,textDecoration:"none",fontWeight:600}}>Masuk</a></div>;

  return <div className="auth-shell"><div className="auth-card">
    <div className="auth-dialog-brand"><span className="brandmark"><BookOpen /></span><div><b>Murojaah</b><p>Atur ulang kata sandi.</p></div></div>
    <form onSubmit={submit}>
      <h1>Buat kata sandi baru</h1>
      <p className="auth-subtitle">Minimal 8 karakter, beda dari sebelumnya.</p>
      <div className="auth-fields">
        <PasswordField label="Kata sandi baru" value={password} onChange={setPassword} autoFocus />
        <label>Konfirmasi kata sandi<input required type="password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Ulangi kata sandi"/></label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary full" disabled={busy} type="submit"><Check/> {busy?"Menyimpan...":"Simpan kata sandi"}</button>
      </div>
    </form>
    <ul className="auth-dialog-trust"><li><ShieldCheck /> Data tetap aman</li></ul>
  </div></div>;
}
