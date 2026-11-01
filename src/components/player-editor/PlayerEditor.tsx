import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppButton, AppTextField } from "../ui";
import { applyPlayerEdit, getPlayerEditor, undoPlayerEdit, type PlayerEditResult, type PlayerEditSnapshot } from "../../services/fmEditor";
import "./PlayerEditor.css";

type Props={sessionId:number;uid:number;onClose:()=>void;onApplied:(result:PlayerEditResult)=>void};
export function PlayerEditor({sessionId,uid,onClose,onApplied}:Props) {
  const [snapshot,setSnapshot]=useState<PlayerEditSnapshot|null>(null);
  const [values,setValues]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [receipt,setReceipt]=useState<PlayerEditResult|null>(null);
  const [revision,setRevision]=useState(0);
  const generation=useRef(0);
  const dialogRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const request=++generation.current;
    setSnapshot(null);setBusy(true);setError("");
    getPlayerEditor(sessionId,uid).then(next=>{if(generation.current!==request)return;setSnapshot(next);setValues(Object.fromEntries(next.fields.map(field=>[field.key,field.value])));}).catch(reason=>{if(generation.current===request)setError(String(reason));}).finally(()=>{if(generation.current===request)setBusy(false);});
    return ()=>{generation.current++;};
  },[sessionId,uid,revision]);
  useEffect(()=>{setReceipt(null);},[sessionId,uid]);
  useEffect(()=>{
    dialogRef.current?.focus();
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=overflow;};
  },[]);
  const changes=snapshot?.fields.filter(field=>values[field.key]!==field.value)??[];
  function reload(){setRevision(value=>value+1);}
  async function save(event:FormEvent){
    event.preventDefault();if(!snapshot||!changes.length||busy)return;
    setBusy(true);setError("");
    try {const result=await applyPlayerEdit(snapshot.token,changes.map(field=>({key:field.key,value:values[field.key]})));setReceipt(result);onApplied(result);reload();}
    catch(reason){setError(String(reason));setSnapshot(null);}
    finally{setBusy(false);}
  }
  async function undo(){
    if(!receipt?.undoToken||busy)return;
    setBusy(true);setError("");
    try {const result=await undoPlayerEdit(receipt.undoToken);setReceipt(result);onApplied(result);reload();}
    catch(reason){setError(String(reason));}
    finally{setBusy(false);}
  }
  return <div className="player-editor__overlay" onKeyDown={event=>{
    if(event.key==="Escape"){event.stopPropagation();if(!busy)onClose();}
    if(event.key==="Tab"&&dialogRef.current){const items=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="player-editor-title" className="player-editor">
    <header><div><span>EDYTOR W GRZE · FM27</span><h2 id="player-editor-title">{snapshot?.name??`Zawodnik ${uid}`}</h2></div><AppButton disabled={busy} onClick={onClose} aria-label="Zamknij edytor">×</AppButton></header>
    <p className="player-editor__note">Wstrzymaj grę przed zapisem. Zmiany trafią do aktywnej sesji FM; karierę zapisujesz później w grze. Po zmianie atrybutów FM może je z czasem dostosować do CA i rozwoju zawodnika.</p>
    {error&&<div role="alert" className="player-editor__error">{error}<AppButton disabled={busy} onClick={reload}>Wczytaj ponownie</AppButton></div>}
    {receipt&&<div role="status" className="player-editor__receipt"><strong>{receipt.undoToken?"Zapis potwierdzony odczytem z gry":"Zmiana cofnięta i odczytana z gry"}</strong><span>{receipt.changes.map(change=>`${change.label}: ${change.before} → ${change.after}`).join(" · ")}</span>{receipt.message&&<span>{receipt.message}</span>}{receipt.undoToken&&<AppButton disabled={busy} onClick={undo}>Cofnij ostatni zapis</AppButton>}</div>}
    {busy&&!snapshot&&<p role="status">Odczytywanie danych edytora…</p>}
    {snapshot&&<form onSubmit={save}>
      <div className="player-editor__identity">{snapshot.fields.filter(field=>!field.key.startsWith("attribute:")).map(field=><AppTextField key={field.key} label={field.label} type={field.kind} min={field.min??undefined} max={field.max??undefined} value={values[field.key]??""} disabled={busy} onChange={value=>setValues(current=>({...current,[field.key]:value}))}/>)}</div>
      <div className="player-editor__attribute-heading"><h3>Atrybuty zawodnika</h3><AppTextField label="Znajdź atrybut" type="search" value={search} onChange={setSearch} placeholder="Np. szybkość…"/></div>
      <div className="player-editor__attributes">{snapshot.fields.filter(field=>field.key.startsWith("attribute:")&&field.label.toLocaleLowerCase("pl").includes(search.toLocaleLowerCase("pl"))).map(field=><label key={field.key} data-changed={values[field.key]!==field.value||undefined}><span>{field.label}</span><small>{field.value}</small><input type="number" min={field.min??1} max={field.max??20} step="1" required disabled={busy} value={values[field.key]??""} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/></label>)}</div>
      {changes.length>0&&<section className="player-editor__preview" aria-label="Podgląd zmian"><h3>Zmiany do zapisania ({changes.length})</h3>{changes.map(field=><div key={field.key}><span>{field.label}</span><strong>{field.value} → {values[field.key]||"—"}</strong></div>)}</section>}
      <footer><AppButton disabled={busy} onClick={reload}>Odrzuć zmiany i odczytaj FM</AppButton><AppButton type="submit" variant="primary" disabled={busy||!changes.length}>{busy?"Zapisywanie…":`Zapisz do gry${changes.length?` (${changes.length})`:""}`}</AppButton></footer>
    </form>}
  </section></div>;
}
