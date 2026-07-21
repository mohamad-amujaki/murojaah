import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return <div className="auth-modal-backdrop" onClick={onClose}>
    <div className="auth-modal" onClick={e => e.stopPropagation()}>
      <button type="button" className="icon-btn auth-modal-close" onClick={onClose} aria-label="Tutup"><X/></button>
      {children}
    </div>
  </div>;
}
