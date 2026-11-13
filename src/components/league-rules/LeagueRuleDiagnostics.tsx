import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { AppButton } from "../ui";
import "./LeagueRuleDiagnostics.css";
type Report={schema:number;readOnly:boolean;gameDate:string|null;managedTeam:string|null;ageRuleSamples:unknown[];candidateLinks:unknown[];scannedBytes:number;elapsedMs:number;truncated:boolean;warnings:string[]};
export function LeagueRuleDiagnostics({sessionId}:{sessionId:number}) {
  const [open,setOpen]=useState(false),[revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [report,setReport]=useState<Report|null>(null),[copied,setCopied]=useState(false);
  const area=useRef<HTMLTextAreaElement>(null);
  const dialog=useRef<HTMLElement>(null);
  useEffect(()=>{if(!open)return;dialog.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow="hidden";return ()=>{document.body.style.overflow=previous;};},[open]);
  useEffect(()=>{
    if(!open)return;
    let cancelled=false;setBusy(true);setError("");setReport(null);setCopied(false);
    invoke<Report>("inspect_fm_league_rules",{sessionId}).then(next=>{if(!cancelled)setReport(next);}).catch(reason=>{if(!cancelled)setError(String(reason));}).finally(()=>{if(!cancelled)setBusy(false);});
    return ()=>{cancelled=true;};
  },[open,sessionId,revision]);
  async function copy(){if(!report)return;try{await navigator.clipboard.writeText(JSON.stringify(report));setCopied(true);}catch{area.current?.focus();area.current?.select();setError("Kopiowanie automatyczne jest niedostępne. Zaznaczony raport skopiuj skrótem Ctrl+C.");}}
  return <><AppButton disabled={!sessionId} onClick={()=>setOpen(true)}>Zasady ligi · diagnostyka</AppButton>
    {open&&createPortal(<div className="league-diagnostics__overlay" onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();if(!busy)setOpen(false);}if(event.key==="Tab"&&dialog.current){const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled),textarea"));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first?.focus();}}}}><section ref={dialog} tabIndex={-1} className="league-diagnostics" role="dialog" aria-modal="true" aria-labelledby="league-diagnostics-title">
      <header><div><h2 id="league-diagnostics-title">Diagnostyka zasad ligi</h2><p>{report?.managedTeam??"Odczyt aktywnego klubu z FM"}</p></div><AppButton disabled={busy} onClick={()=>setOpen(false)} aria-label="Zamknij diagnostykę ligi">×</AppButton></header>
      <p>Otwórz w FM ekran zasad właściwej ligi i fazy rozgrywek, a następnie wstrzymaj grę. Ten raport pomaga ustalić regułę U22 i jej powiązanie z sezonem. Odczyt nie zmienia zasad gry.</p>
      {busy&&<p role="status">Zbieranie danych reguł z FM… Może potrwać kilkadziesiąt sekund. W tym czasie nie przeładowuj kariery.</p>}
      {error&&<p role="alert" className="league-diagnostics__error">{error}</p>}
      {report&&<>
        <div className="league-diagnostics__result"><strong>Raport gotowy · {report.ageRuleSamples.length} próbek reguł wieku</strong><span>{report.truncated?"Odczyt częściowy — osiągnięto limit diagnostyki.":"Odczyt zakończony."} Samo znalezienie próbki nie potwierdza, że jest aktywną regułą Twojej ligi. Edycja zasad pozostaje niedostępna.</span></div>
        <p>Skopiuj raport i dołącz go do rozmowy o regule U22 razem ze zrzutem zasad. Raport zawiera kontekst klubu, datę gry, techniczne adresy i parametry kandydatów reguł.</p>
        <textarea ref={area} aria-label="Raport diagnostyczny zasad ligi" readOnly value={JSON.stringify(report,null,2)} onFocus={event=>event.target.select()}/>
      </>}
      <footer><AppButton disabled={busy} onClick={()=>setRevision(value=>value+1)}>Odczytaj ponownie</AppButton>{report&&<AppButton onClick={copy}>{copied?"Skopiowano raport":"Kopiuj raport"}</AppButton>}</footer>
    </section></div>,document.body)}
  </>;
}
