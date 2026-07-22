import type { ReactNode } from "react";
import { Flame } from "lucide-react";
import { initials } from "../lib/constants";

export interface StatsTableRow {
  id: number;
  name: string;
  meta?: ReactNode;
  ayahsMastered: ReactNode;
  streak: ReactNode;
  totalXp: ReactNode;
  action?: ReactNode;
}

export function StatsTable({ nameHeader, rows }: { nameHeader: string; rows: StatsTableRow[] }) {
  const hasAction = rows.some(r => r.action);
  return <div className="stats-table">
    <div className="tbl-row table-header"><span>{nameHeader}</span><span>AYAT DIKUASAI</span><span>STREAK</span><span>XP</span>{hasAction && <span></span>}</div>
    {rows.map((r, i) => <div className="tbl-row" key={r.id}>
      <span><i className={`avatar av${i % 4}`}>{initials(r.name)}</i><span className="flex flex-col"><b>{r.name}</b>{r.meta}</span></span>
      <span>{r.ayahsMastered} ayat</span>
      <span><Flame /> {r.streak} hari</span>
      <span>{r.totalXp} XP</span>
      {hasAction && <span>{r.action}</span>}
    </div>)}
  </div>;
}
