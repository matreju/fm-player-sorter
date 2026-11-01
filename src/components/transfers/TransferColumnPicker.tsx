import { useState } from "react";
import { AppButton } from "../ui";

export const TRANSFER_DEFAULT_COLUMNS=["Nazwisko","Pozycja","Narodowość","Wiek","Klub","OU","PA","Wartość","Cena wywoławcza","Pensja","Koniec kontraktu","Pozostały kontrakt","Status transferu"];
const KEY="fm-player-sorter.transfer-columns.v1";
export function loadTransferColumns():string[] {
  try {const value=JSON.parse(localStorage.getItem(KEY)??"null");if(Array.isArray(value)&&value.every(column=>typeof column==="string"))return ["Nazwisko",...value.filter(column=>column!=="Nazwisko"&&column!=="Numer w składzie")];}catch{/* defaults */}
  return [...TRANSFER_DEFAULT_COLUMNS];
}
export function saveTransferColumns(columns:string[]) {try{localStorage.setItem(KEY,JSON.stringify(columns));}catch{/* session preference remains usable */}}
export function TransferColumnPicker({available,selected,onChange,label}:{available:string[];selected:string[];onChange:(columns:string[])=>void;label:(column:string)=>string}) {
  const [open,setOpen]=useState(false),[search,setSearch]=useState("");
  const allowed=available.filter(column=>!column.startsWith("_")&&column!=="Numer w składzie");
  function toggle(column:string){if(column==="Nazwisko")return;onChange(selected.includes(column)?selected.filter(item=>item!==column):[...selected,column]);}
  function move(index:number,step:number){const target=index+step;if(target<1||target>=selected.length)return;const next=[...selected];[next[index],next[target]]=[next[target],next[index]];onChange(next);}
  return <div className="transfer-columns">
    <AppButton onClick={()=>setOpen(value=>!value)} aria-expanded={open}>Kolumny ({selected.length}) {open?"▴":"▾"}</AppButton>
    {open&&<section className="transfer-columns__panel" aria-label="Wybór kolumn transferów">
      <div className="transfer-columns__heading"><strong>Własny widok transferów</strong><AppButton onClick={()=>onChange([...TRANSFER_DEFAULT_COLUMNS])}>Przywróć domyślne</AppButton></div>
      <div className="transfer-columns__layout">
        <div><label className="transfer-columns__search">Dodaj kolumny<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Np. szybkość, wzrost, regularność…"/></label>
        <div className="transfer-columns__choices">{allowed.filter(column=>label(column).toLocaleLowerCase("pl").includes(search.toLocaleLowerCase("pl"))).map(column=><label key={column}><input type="checkbox" checked={selected.includes(column)} disabled={column==="Nazwisko"} onChange={()=>toggle(column)}/>{label(column)}</label>)}</div></div>
        <div><strong>Kolejność kolumn</strong><ol className="transfer-columns__order">{selected.map((column,index)=><li key={column}><span>{label(column)}</span>{index>0&&<div><button type="button" disabled={index===1} aria-label={`Przesuń ${label(column)} w lewo`} onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===selected.length-1} aria-label={`Przesuń ${label(column)} w prawo`} onClick={()=>move(index,1)}>↓</button><button type="button" aria-label={`Usuń kolumnę ${label(column)}`} onClick={()=>toggle(column)}>×</button></div>}</li>)}</ol></div>
      </div>
    </section>}
  </div>;
}
