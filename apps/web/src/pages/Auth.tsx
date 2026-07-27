import { useState } from "react";
import { BookOpen, ChevronLeft, Mail, ShieldCheck } from "lucide-react";
import type { UserRole } from "@murojaah/shared";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { PasswordField } from "../components/PasswordField";
import { forgotPassword } from "../lib/api";
import { ROLE_CARDS } from "../lib/constants";

const GoogleIcon = () => <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.7 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/>
  <path fill="#4CAF50" d="M24 45c5.6 0 10.7-2.1 14.5-5.6l-6.7-5.7C29.7 35.5 27 36.5 24 36.5c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.5 40.6 16.2 45 24 45z"/>
  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.7 5.7C41.6 36 45 30.6 45 24c0-1.4-.1-2.7-.4-3.5z"/>
</svg>;

export function AuthDialog({ initialMode = "login", onClose }: { initialMode?: "login" | "register"; onClose: () => void }) {
  const { login, register } = useAuth();
  const notify = useToast();
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode === "login" ? "login" : initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await forgotPassword(email);
        notify(res.message);
        setSent(true);
      } else if (mode === "login") await login({ email, password });
      else await register({ displayName, email, password, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-card">
    <div className="auth-dialog-brand">
      <button type="button" className="icon-btn auth-dialog-back" onClick={mode==="forgot"?()=>setMode("login"):onClose} aria-label="Kembali"><ChevronLeft /></button>
      <span className="brandmark"><BookOpen /></span>
      <div>
        <b>Murojaah</b>
        <p>Muraja'ah Al-Qur'an, sedikit demi sedikit, setiap hari.</p>
      </div>
    </div>
    {mode === "forgot" ? <>
      <h1>Lupa kata sandi</h1>
      <p className="auth-subtitle">Masukkan email dan kami kirim tautan reset.</p>
      {sent ? <div style={{textAlign:"center",padding:"24px 0"}}><Mail size={48} strokeWidth={1} style={{marginBottom:16,color:"var(--muted)"}}/><p style={{color:"var(--text)",fontSize:"0.875rem"}}>Cek kotak masuk email-mu. Tautan reset akan dikirim ke <b>{email}</b> jika terdaftar.</p></div>
      : <form aria-label="Lupa kata sandi" onSubmit={submit}>
        <div className="auth-fields">
          <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoFocus/></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="primary full" disabled={busy} type="submit">{busy?"Mengirim...":"Kirim tautan reset"}</button>
        </div>
      </form>}
    </> : <>
      <form aria-label={mode==="login"?"Masuk":"Daftar"} onSubmit={submit}>
        <h1>{mode==="login" ? "Selamat datang kembali" : "Buat akun baru"}</h1>
        <p className="auth-subtitle">{mode==="login" ? "Masuk untuk melanjutkan muraja'ah." : "Mulai perjalanan hafalanmu bersama Murojaah."}</p>
        <div className="auth-fields">
          <a className="outline full google-btn" href={`/api/auth/google/start?intent=${mode}`}><GoogleIcon/> {mode==="login"?"Masuk":"Daftar"} dengan Google</a>
          <div className="auth-divider"><span>atau</span></div>
          {mode==="register" && <label>Nama tampilan<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Nama kamu" /></label>}
          <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" pattern="[^@\s]+@[^@\s]+\.[^@\s]+" title="Masukkan alamat email yang valid" /></label>
          <PasswordField label="Kata sandi" value={password} onChange={setPassword} />
            {mode==="login" && <button type="button" className="link-btn forgot-link" style={{marginTop:-8,fontSize:"0.75rem"}} onClick={()=>setMode("forgot")}>Lupa kata sandi?</button>}
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
      <ul className="auth-dialog-trust">
        <li><ShieldCheck /> 5.000+ ayat siap dihafal</li>
        <li><ShieldCheck /> Progres tak pernah hilang</li>
        <li><ShieldCheck /> Tetap jalan walau offline</li>
      </ul>
    </>}
    {mode !== "forgot" && <p className="auth-switch">
      {mode==="login" ? <>Belum punya akun? <button type="button" onClick={()=>setMode("register")}>Daftar sekarang</button></>
        : <>Sudah punya akun? <button type="button" onClick={()=>setMode("login")}>Masuk</button></>}
    </p>}
  </div>;
}
