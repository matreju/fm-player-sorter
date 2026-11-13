import { useState } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import type { TableRow } from "../../types/table";
import { AppModuleDrawer } from "../app-shell";
import { LeagueU22Editor } from "../league-rules/LeagueU22Editor";
import "../club/ClubHub.css";

type Section = "overview" | "stadium" | "federation" | "competitions" | "rules";
const SECTIONS: Array<{id: Section; label: string; icon: string}> = [
  {id:"overview",label:"Podstawowe",icon:"◉"},
  {id:"stadium",label:"Stadion",icon:"▣"},
  {id:"federation",label:"Federacja i zarząd",icon:"♜"},
  {id:"competitions",label:"Rozgrywki",icon:"◆"},
  {id:"rules",label:"Zasady rozgrywek",icon:"§"},
];

function Pending({children}:{children:string}) {
  return <div className="club-hub__pending"><strong>Pole wymaga potwierdzenia w FM27</strong><span>{children}</span></div>;
}

export function NationHub({sessionId,name,teamName,uid,crest,rows,databaseCount}:{sessionId:number;name:string;teamName?:string|null;uid:number|null;crest?:string|null;rows:TableRow[];databaseCount?:number|null}) {
  const {isOpen,close}=useModuleDrawer("club");
  const [section,setSection]=useState<Section>("overview");
  const goalkeepers=rows.filter(row=>(row["Pozycja"]??"").includes("BR")).length;
  return <AppModuleDrawer isOpen={isOpen} onClose={close} title={`Reprezentacja · ${name}`} subtitle="Federacja, stadion, rozgrywki i zasady powołań" labelledById="nation-hub-title">
    <div className="club-hub">
      <aside className="club-hub__nav" aria-label="Sekcje reprezentacji">{SECTIONS.map(item=><button type="button" key={item.id} aria-current={section===item.id?"page":undefined} onClick={()=>setSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</aside>
      <main className="club-hub__content">
        <header className="club-hub__hero">{crest?<img src={crest} alt=""/>:<span className="club-hub__crest">FM</span>}<div><small>PROWADZONA REPREZENTACJA</small><h3>{name}</h3><p>{teamName??name} · UID {uid??"—"}</p></div></header>
        {section==="overview"&&<section className="club-hub__section"><h3>Podstawowe informacje</h3><div className="club-hub__stats"><article><small>Reprezentacja</small><strong>{name}</strong></article><article><small>Krajowa lista życzeń</small><strong>{rows.length}</strong></article><article><small>Bramkarze na liście</small><strong>{goalkeepers}</strong></article><article><small>Baza zawodników FM</small><strong>{databaseCount?.toLocaleString("pl-PL")??"—"}</strong></article></div><Pending>Przydomek, skrót federacji, ranking, rok założenia i barwy zostaną podłączone do natywnego rekordu NATION po potwierdzeniu pól bieżącego buildu.</Pending></section>}
        {section==="stadium"&&<section className="club-hub__section"><h3>Stadion reprezentacji</h3><Pending>Nazwa stadionu, miasto, pojemność, miejsca siedzące i obiekt rezerwowy wymagają potwierdzonego powiązania reprezentacja → stadion.</Pending></section>}
        {section==="federation"&&<section className="club-hub__section"><h3>Federacja i zarząd</h3><Pending>Prezes federacji, dyrektorzy, selekcjonerzy młodzieżowi i sztab zostaną pokazani po rozpoznaniu krajowego rejestru pracowników; aplikacja nie przypisze przypadkowych osób.</Pending></section>}
        {section==="competitions"&&<section className="club-hub__section"><h3>Rozgrywki reprezentacji</h3><p>Odczyt listy aktywnych rozgrywek i ich faz jest dostępny w edytorze zasad.</p><LeagueU22Editor sessionId={sessionId}/></section>}
        {section==="rules"&&<section className="club-hub__section"><h3>Zasady rozgrywek i limity powołań</h3><p>Wybierz rozgrywki oraz fazę. Pole „Wielkość kadry — maksimum” odpowiada limitowi zawodników, których można zgłosić.</p><LeagueU22Editor sessionId={sessionId}/></section>}
      </main>
    </div>
  </AppModuleDrawer>;
}
