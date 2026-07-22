export function SegmentedControl({ options, value, onChange, className }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return <div className={className ? `segmented ${className}` : "segmented"}>
    {options.map(n => <button type="button" key={n} className={value === n ? "active" : ""} onClick={() => onChange(n)}>{n}{n === "∞" ? "" : "×"}</button>)}
  </div>;
}
