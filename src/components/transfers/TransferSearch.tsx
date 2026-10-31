import { useEffect, useState, type FormEvent } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import { searchFootballManagerPlayers, type FmScoutingQuery, type FmScoutingResult } from "../../services/fmConnection";
import { AppModuleDrawer } from "../app-shell";
import { AppTextField, AppSelectField, AppButton } from "../ui";
import "./TransferSearch.css";
import { contractDuration } from "../../utils/contractDuration";

type Filters = {text:string;position:string;minCa:string;minPa:string;maxAge:string;maxFee:string;maxWage:string;contractBefore:string;status:string;sort:string};
const EMPTY: Filters = {text:"",position:"any",minCa:"",minPa:"",maxAge:"",maxFee:"",maxWage:"",contractBefore:"",status:"all",sort:"ca"};
const POSITIONS = ["BR","LIB","O (L)","O (Ś)","O (P)","DP","P (L)","P (Ś)","P (P)","OP (L)","OP (Ś)","OP (P)","N (Ś)","WO (L)","WO (P)"];
const COLUMNS = ["Nazwisko","Pozycja","Wiek","Klub","OU","PA","Wartość","Cena wywoławcza","Pensja","Koniec kontraktu","Pozostały kontrakt","Status transferu"];
const number = (text:string) => text.trim() ? Number(text) : undefined;
function request(filters: Filters, sessionId: number, page=0): FmScoutingQuery {
  return {...filters,sessionId,page,pageSize:50,minCa:number(filters.minCa),minPa:number(filters.minPa),maxAge:number(filters.maxAge),maxFee:number(filters.maxFee),maxWage:number(filters.maxWage)};
}
function cell(column:string,value:string|undefined) {
  if (!value?.trim()) return "—";
  if (["Wartość","Cena wywoławcza","Pensja"].includes(column)) {
    const amount=Number(value);
    return Number.isFinite(amount) ? new Intl.NumberFormat("pl-PL",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(amount) : value;
  }
  return value;
}
export function TransferSearch({sessionId,clubName}:{sessionId:number;clubName:string|null}) {
  const {isOpen,close}=useModuleDrawer("transfers");
  const [draft,setDraft]=useState<Filters>(EMPTY);
  const [query,setQuery]=useState<FmScoutingQuery>(()=>request(EMPTY,sessionId));
  const [result,setResult]=useState<FmScoutingResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if (!isOpen || !sessionId) return;
    let cancelled=false;
    setResult(null);setLoading(true);setError("");
    searchFootballManagerPlayers({...query,sessionId}).then(next=>{
      if (!cancelled && next.sessionId===sessionId) setResult(next);
    }).catch(reason=>{if(!cancelled)setError(String(reason));}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[isOpen,sessionId,query,revision]);
  const set=(key:keyof Filters)=>(value:string)=>setDraft(current=>({...current,[key]:value}));
  function submit(event:FormEvent) {event.preventDefault();setQuery(request(draft,sessionId));}
  const shown=result?.sessionId===sessionId ? result : null;
  return <AppModuleDrawer isOpen={isOpen} onClose={close} title="Wyszukiwarka transferowa"
    subtitle={clubName ? `Kandydaci spoza klubu ${clubName}` : "Piłkarze z wczytanej bazy gry"} labelledById="transfers-title">
    {!sessionId ? <p>Najpierw połącz aplikację z grą i wczytaj prowadzony zespół.</p> : <div className="transfer-search">
      <form onSubmit={submit} className="transfer-search__filters">
        <AppTextField label="Nazwisko, klub lub narodowość" type="search" value={draft.text} onChange={set("text")} placeholder="Nazwisko, nazwa klubu lub kraj…" />
        <AppSelectField label="Pozycja" value={draft.position} onChange={set("position")} options={[{value:"any",label:"Wszystkie"},...POSITIONS.map(value=>({value,label:value}))]} />
        <AppSelectField label="Status" value={draft.status} onChange={set("status")} options={[{value:"all",label:"Wszyscy spoza mojego klubu"},{value:"listed",label:"Lista transferowa"},{value:"free",label:"Wolni zawodnicy"}]} />
        <AppTextField label="OU od (1–200)" type="number" min="1" max="200" value={draft.minCa} onChange={set("minCa")} />
        <AppTextField label="Potencjał PA od (1–200)" type="number" min="1" max="200" value={draft.minPa} onChange={set("minPa")} />
        <AppTextField label="Wiek do" type="number" min="0" max="90" disabled={shown !== null && !shown.gameDate} value={draft.maxAge} onChange={set("maxAge")} />
        <AppTextField label="Cena / wartość do (£)" type="number" min="0" value={draft.maxFee} onChange={set("maxFee")} />
        <AppTextField label="Obecna płaca do (£/tydz.)" type="number" min="0" value={draft.maxWage} onChange={set("maxWage")} />
        <AppTextField label="Koniec kontraktu do" type="date" value={draft.contractBefore} onChange={set("contractBefore")} />
        <AppSelectField label="Sortuj według" value={draft.sort} onChange={set("sort")} options={[{value:"ca",label:"OU malejąco"},{value:"pa",label:"Potencjał malejąco"},{value:"fee",label:"Cena / wartość rosnąco"},{value:"wage",label:"Płaca rosnąco"},{value:"expiry",label:"Najbliższy koniec kontraktu"}]} />
        <div className="transfer-search__actions"><AppButton type="submit" disabled={loading}>{loading ? "Wyszukiwanie…" : "Szukaj piłkarzy"}</AppButton>
          <AppButton disabled={loading} onClick={()=>{setDraft(EMPTY);setQuery(request(EMPTY,sessionId));}}>Wyczyść filtry</AppButton></div>
      </form>
      <p className="transfer-search__note">Cena wywoławcza to osobna informacja z gry. Gdy jej brak, filtr budżetu korzysta z wartości zawodnika; nie jest to gwarantowana cena zakupu. Płaca dotyczy obecnego kontraktu, nie przyszłych żądań piłkarza. Kwoty: GBP. Długość kontraktu obliczamy względem daty gry, gdy można ją potwierdzić. Aktualność bazy odświeżysz przyciskiem „Połącz z grą”.</p>
      {loading && <div className="transfer-search__notice" role="status">Przy pierwszym otwarciu przygotowywany jest indeks całej bazy. Kolejne wyszukiwania korzystają z tego indeksu.</div>}
      {error && <div className="transfer-search__notice" role="alert">{error} <AppButton onClick={()=>setRevision(value=>value+1)}>Ponów</AppButton></div>}
      {shown && <>
        <div className="transfer-search__summary" role="status"><strong>{shown.total.toLocaleString("pl-PL")} zawodników</strong><span>Strona {shown.page+1} z {Math.max(1,Math.ceil(shown.total/shown.pageSize))}</span></div>
        <div className="transfer-search__table"><table><thead><tr>{COLUMNS.map(column=><th key={column}>{column==="Pensja" ? "Obecna płaca / tydz." : column==="OU" ? "OU (CA)" : column}</th>)}</tr></thead>
          <tbody>{shown.rows.map(row=><tr key={row.UID}>{COLUMNS.map(column=><td key={column} title={row[column] || undefined}>{column==="Pozostały kontrakt" ? contractDuration(row["Koniec kontraktu"],shown.gameDate) : cell(column,row[column])}</td>)}</tr>)}</tbody></table>
          {!shown.rows.length && <p className="transfer-search__empty">Brak zawodników spełniających te filtry.</p>}</div>
        <div className="transfer-search__pagination"><AppButton disabled={loading||shown.page===0} onClick={()=>setQuery(current=>({...current,page:shown.page-1}))}>← Poprzednia</AppButton>
          <AppButton disabled={loading||(shown.page+1)*shown.pageSize>=shown.total} onClick={()=>setQuery(current=>({...current,page:shown.page+1}))}>Następna →</AppButton></div>
      </>}
    </div>}
  </AppModuleDrawer>;
}
