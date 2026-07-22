import { Check, ChevronRight, Search } from "lucide-react";
import type { SurahResponse } from "../lib/api";

export function SurahPicker({ surahs, query, onQueryChange, onSelect, selectedId, limit, className }: {
  surahs: SurahResponse[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (s: SurahResponse) => void;
  /** Shown with a "selected" style + check icon; omit when the list disappears after picking (e.g. modals). */
  selectedId?: number | null;
  limit?: number;
  className?: string;
}) {
  const filtered = surahs.filter(s => s.latinName.toLowerCase().includes(query.toLowerCase()) || String(s.id).includes(query));
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return <>
    <label className="search"><Search /><input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Cari surah..." aria-label="Cari surah" /></label>
    <div className={className ? `surah-list ${className}` : "surah-list"}>
      {visible.map(s => <button type="button" className={s.id === selectedId ? "selected" : ""} key={s.id} onClick={() => onSelect(s)}>
        <span>{s.id}</span>
        <div><b>{s.latinName}</b><small>{s.meaning} • {s.ayahCount} ayat</small></div>
        {s.id === selectedId ? <Check /> : <ChevronRight />}
      </button>)}
      {filtered.length === 0 && <p className="empty-state">Surah tidak ditemukan.</p>}
    </div>
  </>;
}
