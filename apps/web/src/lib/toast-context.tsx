import { AlertCircle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";
type Notify = (msg: string, kind?: ToastKind) => void;

// Pesan error di app ini konsisten memakai kata "gagal"/"tidak bisa"; tebak varian bila tidak disebut.
const inferKind = (text: string): ToastKind => /gagal|tidak bisa|tidak dapat|periksa koneksi/i.test(text) ? "error" : "success";

const ToastCtx = createContext<Notify>(() => {});

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((text: string, kind?: ToastKind) => {
    const resolved = kind ?? inferKind(text);
    setToast({ msg: text, kind: resolved });
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), resolved === "error" ? 4500 : 2800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {/* Region aria-live harus sudah ada di DOM sebelum isinya berubah agar diumumkan pembaca layar. */}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className={toast.kind === "error" ? "toast error" : "toast"}>{toast.kind === "error" ? <AlertCircle /> : <Check />}{toast.msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}
