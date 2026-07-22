import { useState } from "react";
import { BookOpen, Moon, ShieldCheck, Sparkles, Sun, Trophy, Users, WifiOff } from "lucide-react";
import { getTheme, setTheme } from "../lib/theme";

const FEATURES = [
  { icon: BookOpen, title: "Latihan yang beneran nempel", desc: "Pilih surah, atur jumlah pengulangan & kecepatan audio, sembunyikan teks untuk uji hafalanmu." },
  { icon: Trophy, title: "Progres yang bikin nagih", desc: "XP, streak harian, dan lencana yang terbuka otomatis seiring konsistensi latihanmu." },
  { icon: Users, title: "Satu akun, sekeluarga saling dukung", desc: "Satu akun orang tua, banyak profil anak, kirim pesan dukungan langsung ke anak." },
  { icon: WifiOff, title: "Jalan terus walau sinyal mati", desc: "Sesi latihan tetap tersimpan tanpa koneksi internet dan tersinkron otomatis." },
];

const STEPS = [
  { n: 1, title: "Gabung dalam 30 detik", desc: "Buat akun dengan email atau Google. Atur peranmu (murid, guru, atau orang tua) setelah masuk." },
  { n: 2, title: "Atur sesi", desc: "Pilih surah, rentang ayat, dan jumlah pengulangan sesuai ritmemu." },
  { n: 3, title: "Latihan konsisten", desc: "Pantau progres, dapatkan XP & lencana setiap kali menyelesaikan sesi." },
];

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
        <span className="pill dark"><Sparkles/> SEDIKIT TAPI KONSISTEN</span>
        <h1>Hafalanmu nggak akan hilang lagi.</h1>
        <p>Al-Qur'an mudah dihafal tapi gampang lupa. Murojaah bantu kamu — atau anakmu, atau muridmu — mengulang ayat yang tepat, di waktu yang tepat, tanpa drama.</p>
        <div className="landing-cta-row">
          <button className="primary large" onClick={onRegister}>Mulai Gratis</button>
          <button className="link-btn" onClick={onLogin}>Sudah punya akun? Masuk</button>
        </div>
        <p className="safe">Gratis selamanya untuk hafalan pribadi. Nggak perlu kartu kredit.</p>
      </div>
      <div className="landing-hero-art">
        <div className="moon">✦</div>
        <div className="quran"><BookOpen /></div>
        <i className="star s1">✦</i><i className="star s2">✦</i>
      </div>
    </section>

    <section className="landing-trust">
      <span><ShieldCheck/> 5.000+ ayat siap dihafal</span>
      <span><ShieldCheck/> Progres tak pernah hilang</span>
      <span><ShieldCheck/> Tetap jalan walau offline</span>
    </section>

    <section className="landing-section">
      <h2>Dibangun buat yang serius menghafal, bukan sekadar niat</h2>
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
      <h2>Ayat pertamamu hari ini, dimulai dari sekarang.</h2>
      <p>Gratis, tanpa kartu kredit, kurang dari semenit.</p>
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
