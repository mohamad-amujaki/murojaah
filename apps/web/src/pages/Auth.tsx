import { useState } from "react";
import { BookOpen, ChevronLeft, GraduationCap, ShieldCheck, Users } from "lucide-react";
import type { UserRole } from "@murojaah/shared";
import { useAuth } from "../lib/auth-context";

const GoogleIcon = () => <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/>
  <path fill="#4CAF50" d="M24 45c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.7C29.7 35.5 27 36.5 24 36.5c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.5 40.6 16.2 45 24 45z"/>
  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.7 5.7C41.6 36 45 30.6 45 24c0-1.4-.1-2.7-.4-3.5z"/>
</svg>;

const ROLE_CARDS: { value: Exclude<UserRole, "admin">; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: "student", label: "Murid", desc: "Menghafal & mengulang ayat", icon: BookOpen },
  { value: "teacher", label: "Guru", desc: "Memantau kelas & murid", icon: GraduationCap },
  { value: "parent", label: "Orang Tua", desc: "Mendampingi hafalan anak", icon: Users },
];

export function AuthDialog({ initialMode = "login", onClose }: { initialMode?: "login" | "register"; onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login({ email, password });
      else await register({ displayName, email, password, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-page">
    <div className="auth-visual">
      <div className="auth-visual-brand"><span className="brandmark"><BookOpen /></span><span>Muro<span>jaah</span></span></div>
      <div className="auth-visual-copy">
        <p>Muraja'ah Al-Qur'an, sedikit demi sedikit, setiap hari.</p>
      </div>
      <ul className="auth-visual-trust">
        <li><ShieldCheck /> 5.000+ ayat siap dihafal</li>
        <li><ShieldCheck /> Progres tak pernah hilang</li>
        <li><ShieldCheck /> Tetap jalan walau offline</li>
      </ul>
    </div>
    <div className="auth-form-panel">
      <button type="button" className="back-link" onClick={onClose}><ChevronLeft /> Kembali</button>
      <form className="auth-card" aria-label={mode==="login"?"Masuk":"Daftar"} onSubmit={submit}>
        <h1>{mode==="login" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
        <p className="auth-subtitle">{mode==="login" ? "Masuk untuk melanjutkan muraja'ah." : "Mulai perjalanan hafalanmu bersama Murojaah."}</p>
        <div className="auth-fields">
          <a className="outline full google-btn" href={`/api/auth/google/start?intent=${mode}`}><GoogleIcon/> {mode==="login"?"Masuk":"Daftar"} dengan Google</a>
          <div className="auth-divider"><span>atau</span></div>
          {mode==="register" && <label>Nama tampilan<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Nama kamu" /></label>}
          <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" pattern="[^@\s]+@[^@\s]+\.[^@\s]+" title="Masukkan alamat email yang valid" /></label>
          <label>Kata sandi<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter" /></label>
          {mode==="register" && <div className="role-cards">
            <span className="field-label">Kamu daftar sebagai</span>
            <div className="role-cards-grid">
              {ROLE_CARDS.map(r => <button type="button" key={r.value} className={role===r.value?"role-card selected":"role-card"} onClick={()=>setRole(r.value)}>
                <r.icon /><b>{r.label}</b><span>{r.desc}</span>
              </button>)}
            </div>
          </div>}
          {error && <p className="auth-error">{error}</p>}
          <button className="primary full" disabled={busy} type="submit">{busy?"Memproses...":mode==="login"?"Masuk":"Buat akun"}</button>
        </div>
      </form>
      <p className="auth-switch">
        {mode==="login" ? <>Belum punya akun? <button type="button" onClick={()=>setMode("register")}>Daftar sekarang</button></>
          : <>Sudah punya akun? <button type="button" onClick={()=>setMode("login")}>Masuk</button></>}
      </p>
    </div>
  </div>;
}
