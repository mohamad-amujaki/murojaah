import type { Home } from "lucide-react";

export function Goal({ icon:Icon, color, title, subtitle, value, max }: { icon:typeof Home; color:string; title:string; subtitle:string; value:number; max:number }) {
  return <div className="goal"><span className={`goal-icon ${color}`}><Icon /></span><div className="goal-main"><div><b>{title}</b><p>{subtitle}</p></div><strong>{value}<small>/{max}</small></strong><div className="progress"><i className={color} style={{width:`${value/max*100}%`}} /></div></div></div>;
}
