import type { Home } from "lucide-react";

export function Stat({ icon:Icon, value, label }: { icon:typeof Home; value:string; label:string }) {
  return <div className="stat"><Icon /><div><b>{value}</b><span>{label}</span></div></div>;
}
