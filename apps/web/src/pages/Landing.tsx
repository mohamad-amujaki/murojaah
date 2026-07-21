import { BookOpen, ShieldCheck, Sparkles, Trophy, Users, WifiOff } from "lucide-react";

const FEATURES = [
  { icon: BookOpen, title: "Latihan terstruktur", desc: "Pilih surah, atur jumlah pengulangan & kecepatan audio, sembunyikan teks untuk uji hafalanmu." },
  { icon: Trophy, title: "Progres & pencapaian", desc: "XP, streak harian, dan lencana yang terbuka otomatis seiring konsistensi latihanmu." },
  { icon: Users, title: "Sekeluarga bisa pantau", desc: "Satu akun orang tua, banyak profil anak, kirim pesan dukungan langsung ke anak." },
  { icon: WifiOff, title: "Bisa offline", desc: "Sesi latihan tetap tersimpan tanpa koneksi internet dan tersinkron otomatis." },
];

const STEPS = [
  { n: 1, title: "Daftar", desc: "Buat akun dengan email atau Google. Atur peranmu (murid, guru, atau orang tua) setelah masuk." },
  { n: 2, title: "Atur sesi", desc: "Pilih surah, rentang ayat, dan jumlah pengulangan sesuai ritmemu." },
  { n: 3, title: "Latihan konsisten", desc: "Pantau progres, dapatkan XP & lencana setiap kali menyelesaikan sesi." },
];

export function LandingPage({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return <div className="landing">
    <header className="landing-nav">
      <div className="brand"><span className="brandmark"><BookOpen /></span><span>Muro<span>jaah</span></span></div>
      <div className="landing-nav-actions">
        <button className="link-btn" onClick={onLogin}>Masuk</button>
        <button className="primary" onClick={onRegister}>Daftar Gratis</button>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <span className="pill dark"><Sparkles/> TEMAN MURAJA'AH HARIANMU</span>
        <h1>Muraja'ah Al-Qur'an, sedikit demi sedikit, setiap hari.</h1>
        <p>Murojaah membantu murid, orang tua, dan guru tahfiz menjaga konsistensi hafalan lewat latihan terstruktur, progres yang terlihat, dan dukungan keluarga dalam satu aplikasi.</p>
        <div className="landing-cta-row">
          <button className="primary large" onClick={onRegister}>Mulai Gratis</button>
          <button className="link-btn" onClick={onLogin}>Sudah punya akun? Masuk</button>
        </div>
        <p className="safe">Dipakai untuk hafalan pribadi &amp; kelas tahfiz</p>
      </div>
      <div className="landing-hero-art">
        <div className="moon">✦</div>
        <div className="quran"><BookOpen /></div>
        <i className="star s1">✦</i><i className="star s2">✦</i>
      </div>
    </section>

    <section className="landing-trust">
      <span><ShieldCheck/> Data ayat &amp; audio dari EQuran.id</span>
      <span><ShieldCheck/> Progres tersimpan aman</span>
      <span><ShieldCheck/> Bisa dipakai offline</span>
    </section>

    <section className="landing-section">
      <h2>Kenapa Murojaah</h2>
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
      <h2>Siap mulai muraja'ah hari ini?</h2>
      <p>Gratis, tanpa kartu kredit. Buat akun dalam kurang dari satu menit.</p>
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
