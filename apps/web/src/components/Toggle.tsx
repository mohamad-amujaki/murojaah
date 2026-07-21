export function Toggle({ label, value, set }: { label:string; value:boolean; set:(v:boolean)=>void }) {
  return <button className="toggle-row" onClick={()=>set(!value)}><span>{label}</span><i className={value?"toggle on":"toggle"}><b/></i></button>;
}
