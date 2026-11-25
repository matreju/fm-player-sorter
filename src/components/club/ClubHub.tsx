import { useEffect, useState } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import { getClubProfile, type ClubProfileSnapshot } from "../../services/fmClub";
import type { TableRow } from "../../types/table";
import { AppModuleDrawer } from "../app-shell";
import { LeagueU22Editor } from "../league-rules/LeagueU22Editor";
import "./ClubHub.css";

type Section = "overview"|"stadium"|"finances"|"staff"|"board"|"investor"|"rules";
const SECTIONS: Array<{id:Section;label:string;icon:string}> = [
  {id:"overview",label:"Podstawowe",icon:"◉"},
  {id:"stadium",label:"Stadion i obiekty",icon:"▣"},
  {id:"finances",label:"Finanse",icon:"€"},
  {id:"staff",label:"Sztab",icon:"♟"},
  {id:"board",label:"Zarząd",icon:"♜"},
  {id:"investor",label:"Inwestor",icon:"◆"},
  {id:"rules",label:"Zasady ligi",icon:"§"},
];

function Pending({children}:{children:string}) {
  return <div className="club-hub__pending"><strong>Odczyt przygotowywany</strong><span>{children}</span></div>;
}

export function ClubHub({sessionId,name,uid,crest,rows,databaseCount}:{sessionId:number;name:string;uid:number|null;crest?:string|null;rows:TableRow[];databaseCount?:number|null}) {
  const {isOpen,close}=useModuleDrawer("club");
  const [section,setSection]=useState<Section>("overview");
  const [profile,setProfile]=useState<ClubProfileSnapshot|null>(null);
  const [profileError,setProfileError]=useState<string|null>(null);
  useEffect(()=>{
    if(!isOpen)return;
    let active=true;
    setProfileError(null);
    getClubProfile(sessionId).then(value=>{if(active)setProfile(value);}).catch(error=>{if(active)setProfileError(String(error));});
    return()=>{active=false;};
  },[isOpen,sessionId]);
  const first=rows.filter(row=>row["Grupa klubowa"]==="Pierwsza drużyna").length;
  const development=rows.length-first;
  return <AppModuleDrawer isOpen={isOpen} onClose={close} title={`Klub · ${name}`} subtitle="Dane klubu, obiekty, finanse, ludzie i zasady" labelledById="club-hub-title">
    <div className="club-hub">
      <aside className="club-hub__nav" aria-label="Sekcje klubu">{SECTIONS.map(item=><button type="button" key={item.id} aria-current={section===item.id?"page":undefined} onClick={()=>setSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</aside>
      <main className="club-hub__content">
        <header className="club-hub__hero">{crest?<img src={crest} alt=""/>:<span className="club-hub__crest">FM</span>}<div><small>PROWADZONY KLUB</small><h3>{name}</h3><p>UID {uid??"—"} · {rows.length} zawodników</p></div></header>
        {section==="overview"&&<section className="club-hub__section"><h3>Podstawowe informacje</h3><div className="club-hub__stats"><article><small>Nazwa klubu</small><strong>{profile?.name??name}</strong></article><article><small>Nazwa krótka</small><strong>{profile?.shortName??"—"}</strong></article><article><small>Pierwsza drużyna</small><strong>{first}</strong></article><article><small>Rezerwy i juniorzy</small><strong>{development}</strong></article><article><small>Zespoły w klubie</small><strong>{profile?.teams.length??"—"}</strong></article><article><small>Baza zawodników FM</small><strong>{databaseCount?.toLocaleString("pl-PL")??"—"}</strong></article></div>{profileError&&<div className="club-hub__pending"><strong>Nie udało się odczytać profilu klubu</strong><span>{profileError}</span></div>}<Pending>Przydomek, rok założenia i kraj zostaną włączone po potwierdzeniu kolejnych pól rekordu CLUB. Nazwę udostępnię do zapisu po przygotowaniu bezpiecznej obsługi tekstu FM.</Pending></section>}
        {section==="stadium"&&<section className="club-hub__section"><h3>Stadion i obiekty</h3><Pending>Nazwa stadionu, pojemność, miejsca siedzące, stan murawy, obiekty treningowe, młodzieżowe i akademia wymagają potwierdzenia powiązania CLUB → STADIUM.</Pending></section>}
        {section==="finances"&&<section className="club-hub__section"><h3>Finanse</h3><Pending>Saldo, budżet transferowy i płacowy, długi, przychody, sponsorzy oraz procent wpływów z transferów będą zapisywane razem z kontrolą księgowych struktur FM.</Pending></section>}
        {section==="staff"&&<section className="club-hub__section"><h3>Sztab</h3><Pending>Trenerzy, skauci, analitycy i personel medyczny zostaną pobrani z klubowego rejestru pracowników, a nie z przypadkowego skanu osób.</Pending></section>}
        {section==="board"&&<section className="club-hub__section"><h3>Zarząd klubu</h3><Pending>Prezes, właściciel, dyrektorzy i ich role wymagają odczytu kontraktów pracowników oraz powiązania z właściwym klubem.</Pending></section>}
        {section==="investor"&&<section className="club-hub__section"><h3>Bogaty inwestor</h3><Pending>Typ właściciela, poziom finansowania i trwałość wsparcia są złożonym mechanizmem. Opcja pojawi się dopiero po rozpoznaniu natywnej akcji i wszystkich pól finansowania.</Pending></section>}
        {section==="rules"&&<section className="club-hub__section"><h3>Zasady ligi</h3><p>Dotychczasowy edytor zasad jest teraz częścią panelu Klubu.</p><LeagueU22Editor sessionId={sessionId}/></section>}
      </main>
    </div>
  </AppModuleDrawer>;
}
