import { memo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const PasswordField = memo(function PasswordField({ value, onChange, placeholder, label, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <div className="password-wrap">
        <input required type={show ? "text" : "password"} minLength={8} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? "Minimal 8 karakter"} autoFocus={autoFocus} />
        <button type="button" className="icon-btn password-toggle" onClick={() => setShow(s => !s)} aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
});
