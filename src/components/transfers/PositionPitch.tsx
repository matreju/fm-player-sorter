import type { CSSProperties } from "react";
import { AppSelectField } from "../ui";

const SPOTS = [
  {id:"N (Ś)",label:"N",x:50,y:12},
  {id:"OP (L)",label:"OP L",x:15,y:27},{id:"OP (Ś)",label:"OP Ś",x:50,y:27},{id:"OP (P)",label:"OP P",x:85,y:27},
  {id:"P (L)",label:"P L",x:15,y:43},{id:"P (Ś)",label:"P Ś",x:50,y:43},{id:"P (P)",label:"P P",x:85,y:43},
  {id:"WO (L)",label:"WO L",x:15,y:59},{id:"DP",label:"DP",x:50,y:59},{id:"WO (P)",label:"WO P",x:85,y:59},
  {id:"O (L)",label:"O L",x:15,y:75},{id:"O (Ś)",label:"O Ś",x:50,y:75},{id:"O (P)",label:"O P",x:85,y:75},
  {id:"LIB",label:"LIB",x:68,y:85},{id:"BR",label:"BR",x:50,y:92},
];

export function PositionPitch({selected,onChange,match,onMatchChange}:{selected:string[];onChange:(value:string[])=>void;match:string;onMatchChange:(value:string)=>void}) {
  function toggle(position:string) {onChange(selected.includes(position)?selected.filter(item=>item!==position):[...selected,position]);}
  return <section className="position-pitch" aria-label="Wybór pozycji zawodnika">
    <div className="position-pitch__heading"><h3>Pozycje piłkarzy</h3><button type="button" disabled={!selected.length} onClick={()=>onChange([])}>Wyczyść</button></div>
    <p>Zaznacz jedną lub kilka pozycji.</p>
    <div className="position-pitch__field">
      <svg viewBox="0 0 240 340" preserveAspectRatio="none" aria-hidden="true"><path d="M10 10H230V330H10ZM10 170H230M70 10V65H170V10M95 10V30H145V10M70 330V275H170V330M95 330V310H145V330"/><circle cx="120" cy="170" r="32"/><circle cx="120" cy="170" r="2"/></svg>
      {SPOTS.map(spot=><button key={spot.id} type="button" className="position-pitch__spot" style={{left:`${spot.x}%`,top:`${spot.y}%`} as CSSProperties} aria-label={spot.id} title={spot.id} aria-pressed={selected.includes(spot.id)} onClick={()=>toggle(spot.id)}><span/>{spot.label}</button>)}
    </div>
    <AppSelectField label="Dopasowanie pozycji" value={match} onChange={onMatchChange} options={[{value:"any",label:"Dowolna z zaznaczonych"},{value:"all",label:"Wszystkie zaznaczone"}]}/>
    <div className="position-pitch__selection" aria-live="polite">{selected.length?selected.join(" · "):"Bez ograniczenia pozycji"}</div>
  </section>;
}
