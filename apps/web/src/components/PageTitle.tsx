export function PageTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>;
}
