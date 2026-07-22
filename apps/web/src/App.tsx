import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { LandingPage } from "./pages/Landing";
import { useAuth } from "./lib/auth-context";

const AuthDialog = lazy(() => import("./pages/Auth").then(m => ({ default: m.AuthDialog })));

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Murojaah gagal dimuat", error, info); }
  render() {
    if (this.state.failed) return <main className="recovery"><span className="brandmark"><BookOpen /></span><h1>Murojaah perlu dimuat ulang</h1><p>Kami menemukan kendala saat membuka aplikasi. Data latihanmu tetap aman.</p><button className="primary" onClick={() => { localStorage.removeItem("hafizayat-settings"); location.assign("/"); }}>Muat ulang aplikasi</button></main>;
    return this.props.children;
  }
}

export function App() {
  const auth = useAuth();
  const [authView, setAuthView] = useState<"login" | "register" | null>(null);
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (auth.user) wasAuthenticated.current = true;
    else if (wasAuthenticated.current) { setAuthView(null); wasAuthenticated.current = false; }
  }, [auth.user]);
  if (auth.loading) return null;
  if (!auth.user) {
    if (authView) return <Suspense fallback={null}><AuthDialog initialMode={authView} onClose={() => setAuthView(null)} /></Suspense>;
    return <LandingPage onLogin={() => setAuthView("login")} onRegister={() => setAuthView("register")} />;
  }
  return (
    <Suspense fallback={<main className="auth-shell"><span className="brandmark"><BookOpen /></span></main>}>
      <AuthenticatedApp />
    </Suspense>
  );
}
