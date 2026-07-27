import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Notify = (msg: string) => void;

const ToastCtx = createContext<Notify>(() => {});

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(""), 2800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      {msg && <div className="toast"><Check />{msg}</div>}
    </ToastCtx.Provider>
  );
}
