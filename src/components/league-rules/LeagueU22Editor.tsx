import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { AppButton } from "../ui";
import "./LeagueU22Editor.css";

type Phase={id:string;label:string};
type Competition={uid:number;name:string;phases:Phase[];message:string|null};
type Catalog={sessionId:number;club:string;competitions:Competition[];warnings:string[]};
type Rule={id:string;label:string;value:number;mode:string;token:string|null;persistent:boolean;note:string|null};
type Snapshot={sessionId:number;club:string;competition:string;competitionUid:number;phaseId:string;gameDate:string;sharedDefault:boolean;rules:Rule[];undoToken:string|null;warnings:string[]};
type Receipt={sessionId:number;before:number;after:number;sharedDefault:boolean;recordCount:number;undoToken:string|null;persistent:boolean};

export function LeagueU22Editor({sessionId}:{sessionId:number}){
  const [open,setOpen]=useState(false),[catalogBusy,setCatalogBusy]=useState(false),[busy,setBusy]=useState(false);
  const [catalog,setCatalog]=useState<Catalog|null>(null),[uid,setUid]=useState(0),[phaseId,setPhaseId]=useState("");
  const [catalogRevision,setCatalogRevision]=useState(0),[revision,setRevision]=useState(0);
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[receipt,setReceipt]=useState<Receipt|null>(null);
  const [error,setError]=useState(""),[writeError,setWriteError]=useState(false),[copied,setCopied]=useState(false);
  const [values,setValues]=useState<Record<string,string>>({}),[sharedAccepted,setSharedAccepted]=useState(false);
  const generation=useRef(0),catalogGeneration=useRef(0),dialog=useRef<HTMLElement>(null),trigger=useRef<HTMLSpanElement>(null);
  const competition=catalog?.competitions.find(item=>item.uid===uid);
  const waiting=busy||catalogBusy;
  const undoToken=snapshot?snapshot.undoToken:receipt?.undoToken;
  useEffect(()=>{
    if(!open)return;
    dialog.current?.focus();const previous=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;trigger.current?.querySelector("button")?.focus();};
  },[open]);
  useEffect(()=>{
    const request=++catalogGeneration.current;
    if(!open)return;
    setCatalogBusy(true);setCatalog(null);setSnapshot(null);setError("");setWriteError(false);setReceipt(null);
    invoke<Catalog>("get_fm_league_competitions",{sessionId}).then(next=>{
      if(catalogGeneration.current!==request||next.sessionId!==sessionId)return;
      setCatalog(next);setUid(previous=>next.competitions.some(item=>item.uid===previous)?previous:(next.competitions[0]?.uid??0));
    }).catch(reason=>{if(catalogGeneration.current===request)setError(String(reason));}).finally(()=>{if(catalogGeneration.current===request)setCatalogBusy(false);});
    return()=>{catalogGeneration.current++;};
  },[open,sessionId,catalogRevision]);
  useEffect(()=>{
    setPhaseId(previous=>competition?.phases.some(item=>item.id===previous)?previous:(competition?.phases[0]?.id??""));
  },[competition]);
  useEffect(()=>{setReceipt(null);setSharedAccepted(false);},[open,sessionId,uid,phaseId]);
  useEffect(()=>{
    const request=++generation.current;
    setSnapshot(null);setValues({});setCopied(false);setBusy(false);
    if(!open||!catalog||!competition?.phases.some(item=>item.id===phaseId))return;
    setBusy(true);setError("");setWriteError(false);
    invoke<Snapshot>("get_fm_league_u22_editor",{sessionId,competitionUid:uid,phaseId}).then(next=>{
      if(generation.current!==request||next.sessionId!==sessionId||next.competitionUid!==uid||next.phaseId!==phaseId)return;
      setSnapshot(next);setValues(Object.fromEntries(next.rules.map(rule=>[rule.id,String(rule.value)])));
    }).catch(reason=>{if(generation.current===request)setError(String(reason));}).finally(()=>{if(generation.current===request)setBusy(false);});
    return()=>{generation.current++;};
  },[open,sessionId,uid,phaseId,revision,catalog,competition]);
  async function save(rule:Rule){
    const text=values[rule.id]??"";
    if(waiting||!rule.token||!/^\d{1,2}$/.test(text)||(snapshot?.sharedDefault&&!sharedAccepted))return;
    await change(false,rule.token,Number(text));
  }
  async function change(undo:boolean,token:string,value?:number){
    if(waiting)return;
    const request=generation.current;setBusy(true);setError("");setWriteError(true);setCopied(false);
    try{
      const result=await invoke<Receipt>(undo?"undo_fm_league_u22":"disable_fm_league_u22",{token,value,acceptSharedDefault:sharedAccepted});
      if(request!==generation.current||result.sessionId!==sessionId)return;
      setReceipt(result);setSnapshot(null);setRevision(previous=>previous+1);
    }catch(reason){if(request===generation.current){setError(String(reason));setSnapshot(null);}}
    finally{if(request===generation.current)setBusy(false);}
  }
  const shared=snapshot?.sharedDefault??receipt?.sharedDefault??false;
  return <><span ref={trigger}><AppButton disabled={!sessionId} onClick={()=>setOpen(true)}>Zasady ligi</AppButton></span>
    {open&&createPortal(<div className="league-rules__overlay" onKeyDown={event=>{
      if(event.key==="Escape"){event.stopPropagation();if(!waiting)setOpen(false);}
      if(event.key==="Tab"&&dialog.current){
        const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled),select:not(:disabled),input:not(:disabled),summary"));
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first?.focus();}
      }
    }}><section ref={dialog} tabIndex={-1} className="league-rules" role="dialog" aria-modal="true" aria-labelledby="league-rules-title">
      <header><div><small>EDYTOR FM27</small><h2 id="league-rules-title">Zasady rozgrywek</h2><p>{catalog?.club??"Rozgrywki prowadzonej drużyny"}</p></div><AppButton disabled={waiting} onClick={()=>setOpen(false)} aria-label="Zamknij zasady rozgrywek">×</AppButton></header>
      <div className="league-rules__selectors">
        <label>Rozgrywki<select value={uid||""} disabled={waiting||!catalog?.competitions.length} onChange={event=>{setUid(Number(event.target.value));setPhaseId("");}}><option value="" disabled>Wybierz rozgrywki</option>{catalog?.competitions.map(item=><option key={item.uid} value={item.uid}>{item.name}</option>)}</select></label>
        <label>Faza / runda<select value={phaseId} disabled={waiting||!competition?.phases.length} onChange={event=>setPhaseId(event.target.value)}><option value="" disabled>Wybierz fazę</option>{competition?.phases.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <p className="league-rules__intro">Wstrzymaj FM i edytuj poza rozgrywanym meczem. Zapis dotyczy zasad dla wszystkich drużyn korzystających z wybranej reguły. Wiek i dane zawodników pozostają bez zmian.</p>
      {competition?.message&&<p className="league-rules__notice">{competition.message}</p>}
      {[...(catalog?.warnings??[]),...(snapshot?.warnings??[])].map((message,i)=><p className="league-rules__notice" key={`${i}-${message}`}>{message}</p>)}
      {shared&&<div className="league-rules__scope"><strong>Domyślne zasady mogą być współdzielone</strong><p>Zmiana może objąć także inne rozgrywki korzystające z tej samej listy lub definicji.</p>{snapshot?.rules.some(rule=>rule.token)&&<label><input type="checkbox" checked={sharedAccepted} disabled={waiting} onChange={event=>setSharedAccepted(event.target.checked)}/>Chcę zmienić reguły także wtedy, gdy korzystają z nich inne rozgrywki.</label>}</div>}
      {error&&<div role="alert" className="league-rules__error"><strong>{writeError?"Zapis nie został potwierdzony":"Nie udało się odczytać zasad"}</strong><p>{error}</p><AppButton onClick={()=>{void navigator.clipboard.writeText(error).then(()=>setCopied(true)).catch(()=>setCopied(false));}}>{copied?"Skopiowano":"Kopiuj komunikat"}</AppButton></div>}
      {receipt&&<div className="league-rules__receipt" role="status"><strong>Potwierdzono odczytem: {receipt.before} → {receipt.after}</strong><p>{receipt.persistent?"Zapis objął aktywną regułę i dopasowaną definicję.":"Zmieniono tylko aktywną kopię. FM może przywrócić limit przy przebudowie zasad lub wczytaniu zapisu."} Sprawdź efekt po ponownym otwarciu zasad i wyboru składu w FM.</p></div>}
      {waiting&&<p role="status">{catalogBusy?"Odczytywanie rozgrywek drużyny…":"Odczytywanie lub zapisywanie zasad…"}</p>}
      {snapshot&&<>
        <div className="league-rules__table-heading"><h3>Limity zawodników i kadry</h3><span>Data gry: {snapshot.gameDate}</span></div>
        {snapshot.rules.some(rule=>rule.token&&!rule.persistent)&&<p className="league-rules__notice">Reguły oznaczone „Tymczasowo” można zmienić bez rozstrzygania niejednoznacznej definicji źródłowej. FM może odbudować ich poprzednią wartość. Nie obejmuje to automatycznej zmiany przyszłych sezonów.</p>}
        <div className="league-rules__table"><table><thead><tr><th>Reguła</th><th>Rodzaj</th><th>W grze</th><th>Nowy limit</th><th>Zmiana</th></tr></thead><tbody>{snapshot.rules.map(rule=>{
          const text=values[rule.id]??"",valid=/^\d{1,2}$/.test(text),dirty=valid&&Number(text)!==rule.value;
          return <tr key={rule.id}><td><strong>{rule.label}</strong><small>{rule.token?(rule.persistent?"Aktywna reguła i definicja":"Tymczasowo · aktywna kopia"):"Tylko odczyt"}</small>{rule.note&&<details><summary>Szczegóły odczytu</summary><p>{rule.note}</p></details>}</td><td>{rule.mode}</td><td>{rule.value>2147483647?"Nieustawiony":rule.value}</td><td>{rule.token?<input aria-label={`Nowy limit: ${rule.label}`} type="number" min="0" max="99" step="1" value={text} disabled={waiting} onChange={event=>setValues(previous=>({...previous,[rule.id]:event.target.value}))}/>:"—"}</td><td>{rule.token?<AppButton variant="primary" disabled={waiting||!dirty||(shared&&!sharedAccepted)} onClick={()=>void save(rule)}>Zapisz</AppButton>:"—"}</td></tr>;
        })}</tbody></table></div>
        <p className="league-rules__footnote">Edycja obejmuje rozpoznane liczbowe minima i maksima (0–99). Minimum 0 usuwa wymagany niedobór zawodników, np. U22. Pozostałe przepisy, m.in. punkty, dogrywka i liczba zmian, nie mają jeszcze obsługi edycji.</p>
      </>}
      <footer><div><AppButton disabled={waiting} onClick={()=>setCatalogRevision(previous=>previous+1)}>Odśwież rozgrywki</AppButton><AppButton disabled={waiting||!phaseId} onClick={()=>setRevision(previous=>previous+1)}>Odczytaj zasady ponownie</AppButton></div>{undoToken&&<AppButton disabled={waiting} onClick={()=>void change(true,undoToken)}>Cofnij poprzednią zmianę</AppButton>}</footer>
    </section></div>,document.body)}
  </>;
}
