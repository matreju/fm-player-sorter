import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppButton, AppTextField } from "../ui";
import { applyPlayerEdit, getPlayerEditor, setFirstTeamMorale, undoPlayerEdit, type PlayerEditResult, type PlayerEditSnapshot } from "../../services/fmEditor";
import { PriceCapture } from "./PriceCapture";
import "./PlayerEditor.css";

type Props={sessionId:number;uid:number;onClose:()=>void;onApplied:(result:PlayerEditResult)=>void;priceCapture?:boolean};
export function PlayerEditor({sessionId,uid,onClose,onApplied,priceCapture=false}:Props) {
  const [snapshot,setSnapshot]=useState<PlayerEditSnapshot|null>(null);
  const [values,setValues]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [receipt,setReceipt]=useState<PlayerEditResult|null>(null);
  const [revision,setRevision]=useState(0);
  const [priceActive,setPriceActive]=useState(false);
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
    event.preventDefault();if(!snapshot||!changes.length||busy||priceActive)return;
    setBusy(true);setError("");
    try {const result=await applyPlayerEdit(snapshot.token,changes.map(field=>({key:field.key,value:values[field.key]})));setReceipt(result);onApplied(result);reload();}
    catch(reason){setError(String(reason));setSnapshot(null);}
    finally{setBusy(false);}
  }
  async function undo(){
    if(!receipt?.undoToken||busy||priceActive)return;
    setBusy(true);setError("");
    try {const result=await undoPlayerEdit(receipt.undoToken);setReceipt(result);onApplied(result);reload();}
    catch(reason){setError(String(reason));}
    finally{setBusy(false);}
  }
  async function maxTeamMorale(){
    if(busy||priceActive||!window.confirm("Ustawić morale wszystkich zawodników pierwszej drużyny na 20? Wstrzymaj wcześniej grę i po zmianie zapisz karierę w FM."))return;
    setBusy(true);setError("");
    try {const result=await setFirstTeamMorale(sessionId,20);setReceipt(null);window.alert(`Ustawiono morale ${result.count} zawodników pierwszej drużyny na ${result.value}.`);reload();}
    catch(reason){setError(String(reason));}
    finally{setBusy(false);}
  }
  return <div className="player-editor__overlay" onKeyDown={event=>{
    if(event.key==="Escape"){event.stopPropagation();if(!busy)onClose();}
    if(event.key==="Tab"&&dialogRef.current){const items=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'));const first=items[0],last=items.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="player-editor-title" className="player-editor">
    <header><div><span>EDYTOR W GRZE · FM27</span><h2 id="player-editor-title">{snapshot?.name??`Zawodnik ${uid}`}</h2></div><AppButton disabled={busy} onClick={onClose} aria-label="Zamknij edytor">×</AppButton></header>
    <p className="player-editor__note">Wstrzymaj grę przed zapisem. Po „Zapisz do gry” zapisz także karierę w FM — dopiero wtedy zmiany zawodnika mogą trafić do pliku zapisu. Samo zamknięcie aplikacji nie zapisuje kariery. Po zmianie atrybutów FM może je z czasem dostosować do CA i rozwoju zawodnika.</p>
    {error&&<div role="alert" className="player-editor__error">{error}<AppButton disabled={busy} onClick={reload}>Wczytaj ponownie</AppButton></div>}
    {receipt&&<div role="status" className="player-editor__receipt"><strong>{receipt.undoToken?"Zapis potwierdzony odczytem z gry":"Zmiana cofnięta i odczytana z gry"}</strong><span>{receipt.changes.map(change=>`${change.label}: ${change.before} → ${change.after}`).join(" · ")}</span>{receipt.message&&<span>{receipt.message}</span>}{receipt.undoToken&&<AppButton disabled={busy||priceActive} onClick={undo}>Cofnij ostatni zapis</AppButton>}</div>}
    {busy&&!snapshot&&<p role="status">Odczytywanie danych edytora…</p>}
    {priceCapture&&<PriceCapture key={`${sessionId}:${uid}`} sessionId={sessionId} uid={uid} disabled={busy} onActiveChange={setPriceActive}/>}
    {snapshot&&<form onSubmit={save}><fieldset disabled={priceActive}>
      <div className="player-editor__identity">{snapshot.fields.filter(field=>!["attribute:","contract:","foot:","position:"].some(prefix=>field.key.startsWith(prefix))).map(field=><AppTextField key={field.key} label={field.label} type={field.kind} min={field.min??undefined} max={field.max??undefined} value={values[field.key]??""} disabled={busy} onChange={value=>setValues(current=>({...current,[field.key]:value}))}/>)}</div>
      <section className="player-editor__team-actions"><h3>Drużyna</h3><p>Zmienia morale wyłącznie zawodników aktualnej pierwszej drużyny prowadzonego klubu. Nie obejmuje rezerw ani juniorów.</p><AppButton type="button" disabled={busy||priceActive} onClick={()=>void maxTeamMorale()}>Ustaw morale pierwszej drużyny na 20</AppButton></section>
      {snapshot.fields.some(field=>field.key.startsWith("contract:"))&&<section className="player-editor__contract"><h3>Kontrakt</h3><p>Płaca roczna oraz kwoty premii i klauzul są pokazane w euro według aktualnego kursu z gry. FM przechowuje je w pełnych GBP, dlatego zapisana kwota może być lekko zaokrąglona. Usuwaj po jednym warunku na zapis.</p><div className="player-editor__identity">{snapshot.fields.filter(field=>field.key.startsWith("contract:")).map(field=>{const term=field.key.startsWith("contract:term:"),removed=values[field.key]==="__delete__";return <label key={field.key} data-removed={removed||undefined}><span>{field.label}</span><input type={field.kind} min={field.min??undefined} max={field.max??undefined} step={field.kind==="number"?"0.01":undefined} required disabled={busy||removed} value={removed?"":values[field.key]??""} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/>{term&&<AppButton type="button" disabled={busy} onClick={()=>setValues(current=>({...current,[field.key]:removed?field.value:"__delete__"}))}>{removed?"Przywróć":"Usuń"}</AppButton>}</label>})}</div></section>}
      <section className="player-editor__positions"><h3>Nogi i pozycje</h3><p>Sprawność nóg: 1–20. Każdą pozycję ustawiasz osobno: 0 — nie gra na niej, 20 — pozycja naturalna. Co najmniej jedna pozycja musi mieć 20.</p>
        <div className="player-editor__attributes">{snapshot.fields.filter(field=>field.key.startsWith("foot:")||field.key.startsWith("position:")).map(field=><label key={field.key} data-changed={values[field.key]!==field.value||undefined}><span>{field.label}</span><small>{field.value}</small><input type="number" min={field.min??0} max={20} step="1" required disabled={busy} value={values[field.key]??""} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/></label>)}</div>
      </section>
      <div className="player-editor__attribute-heading"><h3>Atrybuty zawodnika</h3><AppTextField label="Znajdź atrybut" type="search" value={search} onChange={setSearch} placeholder="Np. szybkość…"/></div>
      <div className="player-editor__attributes">{snapshot.fields.filter(field=>field.key.startsWith("attribute:")&&field.label.toLocaleLowerCase("pl").includes(search.toLocaleLowerCase("pl"))).map(field=><label key={field.key} data-changed={values[field.key]!==field.value||undefined}><span>{field.label}</span><small>{field.value}</small><input type="number" min={field.min??1} max={field.max??20} step="1" required disabled={busy} value={values[field.key]??""} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))}/></label>)}</div>
      {changes.length>0&&<section className="player-editor__preview" aria-label="Podgląd zmian"><h3>Zmiany do zapisania ({changes.length})</h3>{changes.map(field=><div key={field.key}><span>{field.label}</span><strong>{field.value} → {values[field.key]==="__delete__"?"USUŃ":values[field.key]||"—"}</strong></div>)}</section>}
      <footer><AppButton disabled={busy} onClick={reload}>Odrzuć zmiany i odczytaj FM</AppButton><AppButton type="submit" variant="primary" disabled={busy||!changes.length}>{busy?"Zapisywanie…":`Zapisz do gry${changes.length?` (${changes.length})`:""}`}</AppButton></footer>
    </fieldset></form>}
  </section></div>;
}
