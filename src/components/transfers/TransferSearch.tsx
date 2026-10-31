import { formatPlayerFinance, financeFilterToNative, FINANCE_NOTE } from "../../utils/playerFinance";
import { useEffect, useState, type FormEvent } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import { searchFootballManagerPlayers, type FmScoutingQuery, type FmScoutingResult } from "../../services/fmConnection";
import { AppModuleDrawer } from "../app-shell";
import { AppTextField, AppSelectField, AppButton } from "../ui";
import { contractDuration } from "../../utils/contractDuration";
import "./TransferSearch.css";

type Filters = {text:string;position:string;minCa:string;maxCa:string;minPa:string;maxPa:string;minAge:string;maxAge:string;minFee:string;maxFee:string;minWage:string;maxWage:string;contractAfter:string;contractBefore:string;status:string;clubScope:string;sort:string;pageSize:string};
const EMPTY: Filters = {text:"",position:"any",minCa:"",maxCa:"",minPa:"",maxPa:"",minAge:"",maxAge:"",minFee:"",maxFee:"",minWage:"",maxWage:"",contractAfter:"",contractBefore:"",status:"all",clubScope:"all",sort:"ca",pageSize:"100"};
const POSITIONS = ["BR","O (P)","WO (P)","O (Ś)","LIB","O (L)","WO (L)","DP","P (Ś)","OP (Ś)","P (P)","OP (P)","P (L)","OP (L)","N (Ś)"];
const COLUMNS = ["Nazwisko","Pozycja","Narodowość","Wiek","Klub","OU","PA","Wartość","Cena wywoławcza","Pensja","Koniec kontraktu","Pozostały kontrakt","Status transferu"];
const number = (text:string) => text.trim() ? Number(text) : undefined;
function request(filters: Filters, sessionId: number, page=0): FmScoutingQuery {
  return {...filters,sessionId,page,pageSize:Number(filters.pageSize),
    minCa:number(filters.minCa),maxCa:number(filters.maxCa),minPa:number(filters.minPa),maxPa:number(filters.maxPa),
    minAge:number(filters.minAge),maxAge:number(filters.maxAge),minFee:financeFilterToNative(filters.minFee,false,"min"),maxFee:financeFilterToNative(filters.maxFee,false,"max"),
    minWage:financeFilterToNative(filters.minWage,true,"min"),maxWage:financeFilterToNative(filters.maxWage,true,"max")};
}
function cell(column:string,value:string|undefined) {
  if (!value?.trim()) return "—";
  if (["Wartość","Cena wywoławcza","Pensja"].includes(column)) {
    return formatPlayerFinance(column,value);
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
  const ranges: Array<{title:string;label:string;from:keyof Filters;to:keyof Filters;max?:string;type?:string;disabled?:boolean}> = [
    {title:"Obecne umiejętności · OU",label:"OU",from:"minCa",to:"maxCa",max:"200"},
    {title:"Potencjał · PA",label:"Potencjał",from:"minPa",to:"maxPa",max:"200"},
    {title:"Wiek",label:"Wiek",from:"minAge",to:"maxAge",max:"100",disabled:shown!==null&&!shown.gameDate},
    {title:"Cena / wartość · €",label:"Cena",from:"minFee",to:"maxFee"},
    {title:"Obecna płaca · € / rok",label:"Płaca",from:"minWage",to:"maxWage"},
    {title:"Koniec kontraktu",label:"Koniec kontraktu",from:"contractAfter",to:"contractBefore",type:"date"},
  ];
  const pageCount=shown?Math.max(1,Math.ceil(shown.total/shown.pageSize)):1;
  const go=(page:number)=>setQuery(current=>({...current,page}));
  return <AppModuleDrawer isOpen={isOpen} onClose={close} title="Transfery · pełna baza piłkarzy"
    subtitle={clubName ? `Wszystkie kluby, w tym ${clubName}, oraz wolni zawodnicy` : "Wszyscy piłkarze z wczytanej bazy gry"} labelledById="transfers-title">
    {!sessionId ? <p>Najpierw połącz aplikację z grą i wczytaj prowadzony zespół.</p> : <div className="transfer-search">
      <form onSubmit={submit} className="transfer-search__filters">
        <div className="transfer-search__top-filters">
          <AppTextField label="Nazwisko, klub lub narodowość" type="search" value={draft.text} onChange={set("text")} placeholder="Nazwisko, nazwa klubu lub kraj…" />
          <AppSelectField label="Pozycja" value={draft.position} onChange={set("position")} options={[{value:"any",label:"Wszystkie"},...POSITIONS.map(value=>({value,label:value}))]} />
          <AppSelectField label="Status" value={draft.status} onChange={set("status")} options={[{value:"all",label:"Wszyscy zawodnicy"},{value:"listed",label:"Lista transferowa"},{value:"free",label:"Wolni zawodnicy"}]} />
          <AppSelectField label="Zakres klubów" value={draft.clubScope} onChange={set("clubScope")} options={[{value:"all",label:"Cała baza"},{value:"own",label:"Mój klub",disabled:!clubName},{value:"other",label:"Poza moim klubem"}]} />
        </div>
        <div className="transfer-search__ranges">{ranges.map(range=><fieldset key={range.from}>
          <legend>{range.title}</legend><div className="transfer-search__range-fields">
            <AppTextField label={`${range.label} od`} type={range.type||"number"} min={range.type?undefined:"0"} max={range.max} value={draft[range.from]} onChange={set(range.from)} disabled={range.disabled} placeholder="Od" />
            <AppTextField label={`${range.label} do`} type={range.type||"number"} min={range.type?undefined:"0"} max={range.max} value={draft[range.to]} onChange={set(range.to)} disabled={range.disabled} placeholder="Do" />
          </div></fieldset>)}</div>
        <div className="transfer-search__actions">
          <AppSelectField label="Sortuj według" value={draft.sort} onChange={set("sort")} options={[{value:"ca",label:"OU malejąco"},{value:"pa",label:"Potencjał malejąco"},{value:"fee",label:"Cena / wartość rosnąco"},{value:"wage",label:"Płaca rosnąco"},{value:"expiry",label:"Najbliższy koniec kontraktu"}]} />
          <AppSelectField label="Wyników na stronę" value={draft.pageSize} onChange={set("pageSize")} options={["50","100","250"].map(value=>({value,label:value}))} />
          <AppButton type="submit" disabled={loading}>{loading ? "Wyszukiwanie…" : "Szukaj piłkarzy"}</AppButton>
          <AppButton disabled={loading} onClick={()=>{setDraft(EMPTY);setQuery(request(EMPTY,sessionId));}}>Wyczyść filtry</AppButton>
        </div>
      </form>
      <p className="transfer-search__note">Bez filtrów pokazujemy całą odczytaną bazę, również własny klub. Strony dzielą wyniki wyłącznie dla sprawnego wyświetlania. Cena wywoławcza i wartość są osobnymi danymi; przy braku ceny filtr korzysta z wartości. Płaca: obecny kontrakt, EUR / rok. {FINANCE_NOTE} Brakujące dane oznaczamy „—”.</p>
      {loading && <div className="transfer-search__notice" role="status">Wczytywanie wyników z całej bazy gry. Przy pierwszym otwarciu przygotowujemy pełny indeks piłkarzy.</div>}
      {error && <div className="transfer-search__notice" role="alert">{error} <AppButton onClick={()=>setRevision(value=>value+1)}>Ponów</AppButton></div>}
      {shown && <>
        <div className="transfer-search__summary" role="status"><strong>Znaleziono {shown.total.toLocaleString("pl-PL")} z {(shown.databaseTotal??shown.total).toLocaleString("pl-PL")} piłkarzy w bazie</strong><span>{shown.total?shown.page*shown.pageSize+1:0}–{Math.min((shown.page+1)*shown.pageSize,shown.total)} · strona {shown.page+1} z {pageCount}</span></div>
        <div className="transfer-search__table"><table><thead><tr>{COLUMNS.map(column=><th key={column}>{column==="Pensja" ? "Obecna płaca (€/rok)" : column==="OU" ? "OU (CA)" : column==="PA"?"Potencjał":column}</th>)}</tr></thead>
          <tbody>{shown.rows.map(row=><tr key={row.UID}>{COLUMNS.map(column=><td key={column} title={["Pensja","Wartość","Cena wywoławcza"].includes(column) ? FINANCE_NOTE : row[column] || undefined}>{column==="Pozostały kontrakt" ? contractDuration(row["Koniec kontraktu"],shown.gameDate) : cell(column,row[column])}</td>)}</tr>)}</tbody></table>
          {!shown.rows.length && <p className="transfer-search__empty">Brak zawodników spełniających te filtry.</p>}</div>
        <div className="transfer-search__pagination"><AppButton disabled={loading||shown.page===0} onClick={()=>go(0)}>Pierwsza</AppButton><AppButton disabled={loading||shown.page===0} onClick={()=>go(shown.page-1)}>← Poprzednia</AppButton>
          <AppButton disabled={loading||shown.page+1>=pageCount} onClick={()=>go(shown.page+1)}>Następna →</AppButton><AppButton disabled={loading||shown.page+1>=pageCount} onClick={()=>go(pageCount-1)}>Ostatnia</AppButton></div>
      </>}
    </div>}
  </AppModuleDrawer>;
}
