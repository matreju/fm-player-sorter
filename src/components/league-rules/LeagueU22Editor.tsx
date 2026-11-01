import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { AppButton } from "../ui";
import "./LeagueU22Editor.css";

type Snapshot={sessionId:number;club:string;competition:string;gameDate:string;minimum:number;recordCount:number;token:string|null;undoToken:string|null};
type Receipt={sessionId:number;before:number;after:number;recordCount:number;undoToken:string|null};

export function LeagueU22Editor({sessionId}:{sessionId:number}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[receipt,setReceipt]=useState<Receipt|null>(null);
  const [revision,setRevision]=useState(0);
  const generation=useRef(0),dialog=useRef<HTMLElement>(null),trigger=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    if(!open)return;
    dialog.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;trigger.current?.querySelector("button")?.focus();};
  },[open]);
  useEffect(()=>{
    const request=++generation.current;
    if(!open)return;
    setBusy(true);setError("");setSnapshot(null);
    invoke<Snapshot>("get_fm_league_u22_editor",{sessionId}).then(next=>{if(generation.current===request&&next.sessionId===sessionId)setSnapshot(next);}).catch(reason=>{if(generation.current===request)setError(String(reason));}).finally(()=>{if(generation.current===request)setBusy(false);});
    return()=>{generation.current++;};
  },[open,sessionId,revision]);
  useEffect(()=>{setReceipt(null);},[sessionId]);
  async function apply(undo:boolean){
    const token=undo?(snapshot?.undoToken??receipt?.undoToken):snapshot?.token;
    if(!token||busy)return;
    const request=generation.current;setBusy(true);setError("");
    try {
      const result=await invoke<Receipt>(undo?"undo_fm_league_u22":"disable_fm_league_u22",{token});
      if(generation.current!==request||result.sessionId!==sessionId)return;
      setReceipt(result);setSnapshot(null);setRevision(value=>value+1);
    }catch(reason){if(generation.current===request){setError(String(reason));setSnapshot(null);}}
    finally{if(generation.current===request)setBusy(false);}
  }
  const undoToken=snapshot?.undoToken??receipt?.undoToken;
  return <><span ref={trigger}><AppButton disabled={!sessionId} onClick={()=>setOpen(true)}>Zasady ligi</AppButton></span>
    {open&&createPortal(<div className="league-u22__overlay" onKeyDown={event=>{
      if(event.key==="Escape"){event.stopPropagation();if(!busy)setOpen(false);}
      if(event.key==="Tab"&&dialog.current){const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)"));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first?.focus();}}
    }}><section ref={dialog} tabIndex={-1} className="league-u22" role="dialog" aria-modal="true" aria-labelledby="league-u22-title">
      <header><div><small>EDYCJA ZASAD W FM27</small><h2 id="league-u22-title">Wymóg zawodników U22</h2><p>{snapshot?.competition??"PKO Bank Polski Ekstraklasa"}</p></div><AppButton disabled={busy} onClick={()=>setOpen(false)} aria-label="Zamknij edytor zasad">×</AppButton></header>
      <p>Wstrzymaj grę i użyj tej opcji poza rozgrywanym meczem. Zmiana dotyczy wszystkich klubów w rozpoznanej fazie ligowej. Nie zmienia wieku zawodników ani zasad dotyczących wychowanków i rejestracji U21.</p>
      {error&&<p role="alert" className="league-u22__error">{error}</p>}
      {busy&&<p role="status">{snapshot?"Zapisywanie limitu w FM…":"Odczytywanie powiązanych zasad ligi…"}</p>}
      {receipt&&<div className="league-u22__receipt" role="status"><strong>Odczyt po zapisie potwierdził zmianę: {receipt.before} → {receipt.after}</strong><span>Sprawdź zasady i wybór ławki po ponownym otwarciu ekranu w FM. Karierę zapisujesz w grze.</span></div>}
      {snapshot&&<>
        <div className="league-u22__context"><span>{snapshot.club}</span><span>Data gry: {snapshot.gameDate}</span><span>Bieżąca faza ligowa</span></div>
        <div className="league-u22__quota"><span>Minimum U22 w kadrze meczowej</span><strong>{snapshot.minimum}</strong><small>{snapshot.minimum===0?"W odczytanej regule minimum wynosi zero":"Zmiana do zapisania: 3 → 0"}</small></div>
        <p>Zapisywany jest limit w aktywnych zasadach oraz odpowiadającej im definicji. Wymóg z limitem zero nie tworzy niedoboru U22, od którego zależy ograniczenie opisane w zasadach FM. Skuteczność w Twojej karierze wymaga sprawdzenia w grze.</p>
      </>}
      <footer><AppButton disabled={busy} onClick={()=>{setSnapshot(null);setRevision(value=>value+1);}}>Odczytaj ponownie</AppButton><div>{undoToken&&<AppButton disabled={busy} onClick={()=>void apply(true)}>Przywróć poprzedni limit</AppButton>}{snapshot?.token&&<AppButton variant="primary" disabled={busy} onClick={()=>void apply(false)}>Wyłącz wymóg U22 · 3 → 0</AppButton>}</div></footer>
    </section></div>,document.body)}
  </>;
}
