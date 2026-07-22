import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    const first = modal?.querySelector<HTMLElement>(FOCUSABLE);
    requestAnimationFrame(() => first?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) return;
        const f = focusable[0];
        const l = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);

  return <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
    <div className="auth-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
      <button type="button" className="icon-btn auth-modal-close" onClick={onClose} aria-label="Tutup"><X/></button>
      {children}
    </div>
  </div>;
}
