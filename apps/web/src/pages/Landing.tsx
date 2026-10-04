import { useState } from "react";
import { BookOpen, Check, Eye, EyeOff, Lightbulb, Moon, Repeat2, ShieldCheck, Sparkles, Sun, Target, Users, WifiOff } from "lucide-react";
import { getTheme, setTheme } from "../lib/theme";
import { fallbackAyahs } from "../types";
import type { Mastery } from "../types";

const FEATURES = [
  { icon: Repeat2, title: "Dengar & ulang per ayat", desc: "Pilih surah dan rentang ayat, atur jumlah pengulangan dan kecepatan audio. Sembunyikan teks untuk menguji hafalan." },
  { icon: Lightbulb, title: "Saran muraja'ah harian", desc: "Tandai tiap ayat: belum hafal, perlu latihan, atau sudah hafal. Beranda menyarankan ayat yang paling perlu diulang." },
  { icon: Users, title: "Orang tua & guru ikut memantau", desc: "Satu akun orang tua untuk beberapa profil anak. Guru membuat kelas, memberi tugas, dan melihat progres murid." },
  { icon: WifiOff, title: "Tetap jalan tanpa sinyal", desc: "Sesi latihan tersimpan di perangkat saat offline dan tersinkron otomatis begitu kembali online." },
];

const STEPS = [
  { n: 1, title: "Buat akun", desc: "Daftar dengan email atau Google, lalu pilih peran: murid, guru, atau orang tua." },
  { n: 2, title: "Pilih surah & rentang ayat", desc: "Atur jumlah pengulangan dan kecepatan audio sesuai ritmemu." },
  { n: 3, title: "Ulangi, tandai, ulangi lagi", desc: "Tandai ayat yang belum lancar. Besok, Beranda menyarankan ayat itu lebih dulu." },
];

const MASTERY: { label: Mastery; icon: typeof Target }[] = [
  { label: "Belum hafal", icon: Target },
  { label: "Perlu latihan", icon: Sparkles },
  { label: "Sudah hafal", icon: Check },
];

/** Cuplikan player latihan yang bisa dicoba langsung — menunjukkan produknya, bukan ilustrasi. */
function AyahDemo() {
  const ayah = fallbackAyahs[0];
  const [hidden, setHidden] = useState(false);
  const [mastery, setMastery] = useState<Mastery>("Perlu latihan");
  return <figure className="ayah-demo" aria-label="Contoh layar latihan Murojaah">
    <div className="ayah-demo-head">
      <div><small>Sedang menghafal</small><b>Al-Ikhlas · Ayat 1–4</b></div>
      <button type="button" className="outline" onClick={() => setHidden(h => !h)} aria-pressed={hidden}>
        {hidden ? <Eye /> : <EyeOff />}{hidden ? "Tampilkan" : "Sembunyikan"}
      </button>
    </div>
    <p className={hidden ? "ayah-demo-arabic is-hidden" : "ayah-demo-arabic"} lang="ar" dir="rtl">{ayah.arabic}</p>
    <p className="ayah-demo-latin">{hidden ? "Coba lafalkan dari ingatan…" : ayah.latin}</p>
    {!hidden && <p className="ayah-demo-meaning">“{ayah.meaning}”</p>}
    <div className="ayah-demo-loop"><Repeat2 /><span>Putaran <b>3</b>/5</span><span className="progress"><i style={{ width: "60%" }} /></span></div>
    <div className="ayah-demo-mastery" role="group" aria-label="Tandai hafalan ayat ini">
      {MASTERY.map(m => <button type="button" key={m.label} className={mastery === m.label ? "active" : ""} aria-pressed={mastery === m.label} onClick={() => setMastery(m.label)}><m.icon />{m.label}</button>)}
    </div>
  </figure>;
}

export function LandingPage({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const [darkMode, setDarkMode] = useState(() => getTheme() === "dark");
  const toggleTheme = () => { const next = darkMode ? "light" : "dark"; setDarkMode(!darkMode); setTheme(next); };
  return <div className="landing">
    <header className="landing-nav">
      <div className="brand"><span className="brandmark"><BookOpen /></span><span>Muro<span>jaah</span></span></div>
      <div className="landing-nav-actions">
        <button className="icon-btn" onClick={toggleTheme} aria-label={darkMode ? "Ganti ke mode terang" : "Ganti ke mode gelap"}>{darkMode ? <Sun /> : <Moon />}</button>
        <button className="link-btn login-btn" onClick={onLogin}>Masuk</button>
        <button className="primary" onClick={onRegister}>Daftar Gratis</button>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <span className="eyebrow">UNTUK MURID, ORANG TUA & GURU TAHFIZ</span>
        <h1>Ulang ayat yang paling rawan lupa, 10 menit sehari.</h1>
        <p>Dengar per ayat, ulangi sampai lancar, lalu tandai mana yang belum hafal. Besok, Murojaah menyarankan ayat itu lebih dulu.</p>
        <div className="landing-cta-row">
          <button className="primary large" onClick={onRegister}>Mulai Gratis</button>
          <button className="link-btn" onClick={onLogin}>Sudah punya akun? Masuk</button>
        </div>
        <p className="safe">Gratis untuk hafalan pribadi.</p>
      </div>
      <AyahDemo />
    </section>

    <section className="landing-trust">
      <span><BookOpen/> 6.236 ayat dari 114 surah</span>
      <span><ShieldCheck/> Progres tersimpan di akunmu</span>
      <span><WifiOff/> Tetap jalan walau offline</span>
    </section>

    <section className="landing-section">
      <h2>Yang Murojaah kerjakan untukmu</h2>
      <div className="landing-features">
        {FEATURES.map(f => <div className="card landing-feature" key={f.title}>
          <span className="goal-icon green"><f.icon/></span>
          <b>{f.title}</b>
          <p>{f.desc}</p>
        </div>)}
      </div>
    </section>

    <section className="landing-section">
      <h2>Cara kerjanya</h2>
      <div className="landing-steps">
        {STEPS.map(s => <div className="landing-step" key={s.n}>
          <span>{s.n}</span>
          <b>{s.title}</b>
          <p>{s.desc}</p>
        </div>)}
      </div>
    </section>

    <section className="landing-closing">
      <h2>Mulai dari satu surah pendek hari ini.</h2>
      <p>Gratis untuk hafalan pribadi. Daftar kurang dari semenit.</p>
      <button className="primary light large" onClick={onRegister}>Daftar Gratis</button>
    </section>

    <footer className="landing-footer">
      <div className="brand small"><span className="brandmark"><BookOpen /></span><span>Muro<span>jaah</span></span></div>
      <div className="landing-footer-links">
        <button className="link-btn" onClick={onLogin}>Masuk</button>
        <button className="link-btn" onClick={onRegister}>Daftar</button>
      </div>
      <p>Konten &amp; audio Al-Qur'an: EQuran.id · © {new Date().getFullYear()} Murojaah</p>
    </footer>
  </div>;
}
