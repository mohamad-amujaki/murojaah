import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { UserRole } from "@murojaah/shared";
import {
  Bell, BookOpen, Check, ChevronDown, CircleHelp, LogOut, Mail, Menu, MessageCircle, Moon, ShieldCheck, Sparkles, Sun, WifiOff, X
} from "lucide-react";
import { Modal } from "./components/Modal";

const AddChildModal = lazy(() => import("./components/AddChildModal").then(m => ({ default: m.AddChildModal })));
import { nav, pageFromHash } from "./types";
import type { Page, Role } from "./types";
import { useAuth } from "./lib/auth-context";
import { getTheme, setTheme } from "./lib/theme";
import { syncPendingSessions } from "./lib/sync";
import { ROLE_LABEL, ROLE_OPTIONS, initials } from "./lib/constants";

const HomePage = lazy(() => import("./pages/Home").then(m => ({ default: m.HomePage })));
const PracticePage = lazy(() => import("./pages/Practice").then(m => ({ default: m.PracticePage })));
const Achievements = lazy(() => import("./pages/Achievements").then(m => ({ default: m.Achievements })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const ChildProfiles = lazy(() => import("./pages/ChildProfiles").then(m => ({ default: m.ChildProfiles })));

export default function AuthenticatedApp() {
  const { user, loginUser, children: kids, isActingAsChild, logout, switchProfile, updateProfile } = useAuth();
  if (!user || !loginUser) return null;
  const role: Role = (ROLE_LABEL[user.role] as Role) ?? "Murid";
  const visibleNav = nav.filter(item => item.id !== "children" || role !== "Murid");

  const [page, setPage] = useState<Page>(pageFromHash);
  const toastTimer = useRef<number | undefined>(undefined);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => {
    if (matchMedia("(max-width: 1000px)").matches) setMenu(m => !m);
    else setCollapsed(c => !c);
  };
  const [showAddChild, setShowAddChild] = useState(false);
  const [showRoleSetup, setShowRoleSetup] = useState(() => location.search.includes("role_setup=1"));
  const [roleSetupBusy, setRoleSetupBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(() => getTheme() === "dark");
  const toggleTheme = () => { const next = darkMode ? "light" : "dark"; setDarkMode(!darkMode); setTheme(next); };
  const go = (next: Page) => { setPage(next); location.hash = next; scrollTo({ top: 0, behavior: "smooth" }); setMenu(false); };
  const notify = useCallback((text: string) => { setToast(text); if(toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current=window.setTimeout(() => setToast(""), 2800); }, []);
  useEffect(() => {
    const hash = () => setPage(pageFromHash());
    const on = () => { setOnline(true); syncPendingSessions(notify); };
    const off = () => setOnline(false);
    addEventListener("hashchange", hash); addEventListener("online", on); addEventListener("offline", off);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    syncPendingSessions(notify);
    return () => { removeEventListener("hashchange", hash); removeEventListener("online", on); removeEventListener("offline", off); if(toastTimer.current) clearTimeout(toastTimer.current); };
  }, [notify]);

  const handleProfileSelect = async (value: string) => {
    if (value === "__add_child__") { setShowAddChild(true); return; }
    await switchProfile(Number(value)).catch(err => notify(err instanceof Error ? err.message : "Gagal berpindah profil."));
  };

  return <div className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
    <aside className={menu ? "sidebar open" : "sidebar"}>
      <div className="brand"><span className="brandmark"><BookOpen /></span><span>Muro<span>jaah</span></span><button className="icon-btn close-menu" onClick={() => setMenu(false)} aria-label="Tutup menu"><X /></button></div>
      <div className="profile-mini"><div className="avatar">{initials(user.displayName)}</div><div><b>{user.displayName}</b><span><i /> {role}</span></div></div>
      <nav>{visibleNav.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)}><item.icon />{item.label}</button>)}</nav>
      <div className="sidebar-tip"><Sparkles /><b>Sedikit demi sedikit</b><p>Latihan 10 menit setiap hari lebih baik daripada sekali seminggu.</p></div>
      <button className="help" onClick={() => setShowHelp(true)}><CircleHelp /> Pusat Bantuan</button>
      <button className="help" onClick={() => logout()}><LogOut /> Keluar</button>
      <p className="safe">Konten &amp; audio Al-Qur'an: EQuran.id</p>
    </aside>
    {menu && <button className="backdrop" onClick={() => setMenu(false)} aria-label="Tutup menu" />}
    <main className="main">
      <header className="topbar">
        <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label={collapsed ? "Buka menu" : "Tutup menu"}><Menu /></button>
        <div className="mobile-logo">Muro<span>jaah</span></div>
        <div className="top-actions">
          {!online && <span className="offline"><WifiOff /> Offline</span>}
          {isActingAsChild && <button className="outline" onClick={() => switchProfile(loginUser.id)}>Kembali ke {loginUser.displayName}</button>}
          <button className="icon-btn" onClick={toggleTheme} aria-label={darkMode ? "Ganti ke mode terang" : "Ganti ke mode gelap"}>{darkMode ? <Sun /> : <Moon />}</button>
          <button className="icon-btn notify" onClick={() => notify("Belum ada notifikasi baru")} aria-label="Notifikasi"><Bell /><i /></button>
          {!isActingAsChild && loginUser.role === "parent"
            ? <div className="role-select"><ShieldCheck /><select value={String(user.id)} onChange={e => handleProfileSelect(e.target.value)} aria-label="Pilih profil">
                <option value={String(loginUser.id)}>{loginUser.displayName} (Saya)</option>
                {kids.map(child => <option key={child.id} value={String(child.id)}>{child.displayName}</option>)}
                <option value="__add_child__">+ Tambah profil anak</option>
              </select><ChevronDown /></div>
            : <div className="role-select"><ShieldCheck /><span>{role}</span></div>}
        </div>
      </header>
      <div className="content">
        <Suspense fallback={null}>
          {page === "home" && <HomePage go={go} />}
          {page === "practice" && <PracticePage notify={notify} />}
          {page === "achievements" && <Achievements />}
          {page === "dashboard" && <Dashboard role={role} notify={notify} />}
          {page === "children" && role !== "Murid" && <ChildProfiles role={role} notify={notify} />}
          {page === "profile" && <Profile notify={notify} />}
        </Suspense>
      </div>
    </main>
    <nav className="bottom-nav">{visibleNav.map(item => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
    {toast && <div className="toast"><Check />{toast}</div>}
    {showAddChild && <AddChildModal onClose={() => setShowAddChild(false)} notify={notify} />}
    {showHelp && <Modal onClose={() => setShowHelp(false)}>
      <div className="card help-modal"><div className="brand"><span className="brandmark"><CircleHelp /></span><span>Pusat Bantuan</span></div>
      <p className="help-desc">Butuh bantuan, nemu bug, atau punya usulan fitur? Hubungi kami lewat salah satu saluran di bawah.</p>
      <div className="help-channels">
        <a href="mailto:mohamad.amujaki@gmail.com" className="help-channel" onClick={() => { setShowHelp(false); notify(`Email: mohamad.amujaki@gmail.com`); }}>
          <span className="help-icon"><Mail /></span><div><b>Email</b><p>mohamad.amujaki@gmail.com</p><small>Laporan bug &amp; usulan fitur</small></div><ChevronDown style={{transform:"rotate(-90deg)",width:16}} />
        </a>
        <a href="https://wa.me/6281315866766" target="_blank" rel="noopener noreferrer" className="help-channel" onClick={() => setShowHelp(false)}>
          <span className="help-icon"><MessageCircle /></span><div><b>WhatsApp</b><p>+6281-315-866-766</p><small>Diskusi cepat &amp; pertanyaan</small></div><ChevronDown style={{transform:"rotate(-90deg)",width:16}} />
        </a>
      </div>
      <p className="help-footer">Kami menghargai setiap masukan untuk membuat Murojaah lebih baik.</p>
      </div>
    </Modal>}
    {showRoleSetup && <div className="auth-modal-backdrop" onClick={()=>{}}><div className="auth-modal"><form className="card auth-card" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); const role = form.get("role") as Exclude<UserRole, "admin">; if (!role) return; setRoleSetupBusy(true); try { await updateProfile({ role }); setShowRoleSetup(false); const url = new URL(location.href); url.searchParams.delete("role_setup"); history.replaceState({}, "", url.href); notify(`Peran berhasil diatur: ${ROLE_LABEL[role]}`); } catch (err) { notify(err instanceof Error ? err.message : "Gagal mengatur peran."); } finally { setRoleSetupBusy(false); } }}>
      <div className="brand"><span className="brandmark"><BookOpen /></span><span>Atur Peran</span></div>
      <p className="text-xs" style={{color:"var(--muted)",margin:0}}>Terima kasih sudah mendaftar! Kamu ini siapa?</p>
      {ROLE_OPTIONS.map(r => <label key={r.value} className="text-xs" style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",border:"1px solid var(--line)",borderRadius:9}}><input type="radio" name="role" value={r.value} defaultChecked={r.value==="student"} style={{margin:0}}/>{r.label}</label>)}
      <button className="primary full" disabled={roleSetupBusy} type="submit">{roleSetupBusy?"Menyimpan...":"Simpan"}</button>
    </form></div></div>}
  </div>;
}
