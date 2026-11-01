import { formatPlayerFinance, financeFilterToNative, FINANCE_NOTE, FINANCE_UNAVAILABLE, getGameEuroRate } from "../../utils/playerFinance";
import { useEffect, useState, type FormEvent } from "react";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import { searchFootballManagerPlayers, type FmScoutingQuery, type FmScoutingResult } from "../../services/fmConnection";
import { AppModuleDrawer } from "../app-shell";
import { AppTextField, AppSelectField, AppButton } from "../ui";
import { contractDuration } from "../../utils/contractDuration";
import { TransferColumnPicker, TRANSFER_DEFAULT_COLUMNS, loadTransferColumns, saveTransferColumns } from "./TransferColumnPicker";
import { PlayerEditor } from "../player-editor/PlayerEditor";
import type { PlayerEditResult } from "../../services/fmEditor";
import { PositionPitch } from "./PositionPitch";
import "./TransferSearch.css";

type Filters = {nationality:string;club:string;league:string;foot:string;gender:string;loan:string;minHeight:string;maxHeight:string;minCondition:string;maxCondition:string;minGrowth:string;maxGrowth:string;shortlistId:string;text:string;position:string;minCa:string;maxCa:string;minPa:string;maxPa:string;minAge:string;maxAge:string;minFee:string;maxFee:string;minWage:string;maxWage:string;contractAfter:string;contractBefore:string;status:string;clubScope:string;sort:string;sortDirection:string;pageSize:string};
const EMPTY: Filters = {nationality:"",club:"",league:"",foot:"any",gender:"all",loan:"all",minHeight:"",maxHeight:"",minCondition:"",maxCondition:"",minGrowth:"",maxGrowth:"",shortlistId:"",text:"",position:"any",minCa:"",maxCa:"",minPa:"",maxPa:"",minAge:"",maxAge:"",minFee:"",maxFee:"",minWage:"",maxWage:"",contractAfter:"",contractBefore:"",status:"all",clubScope:"all",sort:"ca",sortDirection:"desc",pageSize:"100"};
const FILTER_TABS=[{id:"general",label:"Ogólne"},{id:"ability",label:"Umiejętności"},{id:"contract",label:"Kontrakt"},{id:"attributes",label:"Atrybuty"}] as const;
type AttributeDraft={column:string;min:string;max:string};
const SORT_COLUMNS:Record<string,string>={Nazwisko:"name",Pozycja:"position",Narodowość:"nation",Wiek:"age",Klub:"club",OU:"ca",PA:"pa",Wartość:"value","Cena wywoławcza":"fee",Pensja:"wage",Wzrost:"height",Kondycja:"condition","Zapas potencjału":"growth","Koniec kontraktu":"expiry","Pozostały kontrakt":"expiry"};
const columnLabel=(column:string)=>column==="Pensja"?"Obecna płaca (€/rok)":column==="OU"?"OU (CA)":column==="PA"?"Potencjał":column;
const number = (text:string) => text.trim() ? Number(text) : undefined;
function request(filters: Filters, sessionId: number, euroPerGbp: number|undefined, attributes:AttributeDraft[]=[], page=0, positions:string[]=[], positionMatch="any"): FmScoutingQuery {
  return {...filters,sessionId,page,positions,positionMatch,pageSize:Number(filters.pageSize),attributes:attributes.map(filter=>({column:filter.column,min:number(filter.min),max:number(filter.max)})),
    minHeight:number(filters.minHeight),maxHeight:number(filters.maxHeight),minCondition:number(filters.minCondition),maxCondition:number(filters.maxCondition),minGrowth:number(filters.minGrowth),maxGrowth:number(filters.maxGrowth),
    minCa:number(filters.minCa),maxCa:number(filters.maxCa),minPa:number(filters.minPa),maxPa:number(filters.maxPa),
    minAge:number(filters.minAge),maxAge:number(filters.maxAge),minFee:financeFilterToNative(filters.minFee,false,"min",euroPerGbp),maxFee:financeFilterToNative(filters.maxFee,false,"max",euroPerGbp),
    minWage:financeFilterToNative(filters.minWage,true,"min",euroPerGbp),maxWage:financeFilterToNative(filters.maxWage,true,"max",euroPerGbp)};
}
function cell(column:string,value:string|undefined, rate:number|undefined) {
  if (!value?.trim()) return "—";
  if (["Wartość","Cena wywoławcza","Pensja"].includes(column)) {
    return formatPlayerFinance(column,value,rate);
  }
  return value;
}
export function TransferSearch({sessionId,clubName,euroPerGbp,onPlayerEdited}:{sessionId:number;clubName:string|null;euroPerGbp:number|undefined;onPlayerEdited:(result:PlayerEditResult)=>void}) {
  const [editingUid,setEditingUid]=useState<number|null>(null);
  const {isOpen,close}=useModuleDrawer("transfers");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [filterTab,setFilterTab]=useState<string>("general");
  const [positions,setPositions]=useState<string[]>([]);
  const [positionMatch,setPositionMatch]=useState("any");
  const [draft,setDraft]=useState<Filters>(EMPTY);
  const [attributeDraft,setAttributeDraft]=useState<AttributeDraft[]>([]);
  const [columns,setColumns]=useState<string[]>(loadTransferColumns);
  const [query,setQuery]=useState<FmScoutingQuery>(()=>request(EMPTY,sessionId,euroPerGbp));
  const [result,setResult]=useState<FmScoutingResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if (!isOpen || !sessionId) return;
    let cancelled=false;
    setLoading(true);setError("");
    searchFootballManagerPlayers({...query,sessionId}).then(next=>{
      if (!cancelled && next.sessionId===sessionId) setResult(next);
    }).catch(reason=>{if(!cancelled){setError(String(reason));setResult(null);}}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[isOpen,sessionId,query,revision]);
  useEffect(()=>{setEditingUid(null);},[sessionId,isOpen]);
  const editApplied=(next:PlayerEditResult)=>{onPlayerEdited(next);setRevision(value=>value+1);};
  const set=(key:keyof Filters)=>(value:string)=>setDraft(current=>({...current,[key]:value}));
  function submit(event:FormEvent) {event.preventDefault();try {setQuery(request(draft,sessionId,effectiveRate,attributeDraft,0,positions,positionMatch));} catch(reason) {setError(String(reason));}}
  function sortBy(column:string) {
    const key=SORT_COLUMNS[column]??(shown?.attributeColumns?.includes(column)?`rating:${column}`:undefined); if(!key)return;
    const sortDirection=query.sort===key ? (query.sortDirection==="asc"?"desc":"asc") : (["ca","pa","height","condition","growth"].includes(key)||key.startsWith("rating:")?"desc":"asc");
    setDraft(current=>({...current,sort:key,sortDirection}));
    setQuery(current=>({...current,sort:key,sortDirection,page:0}));
  }
  const shown=result?.sessionId===sessionId ? result : null;
  const effectiveRate=shown?.euroPerGbp??getGameEuroRate(shown?.rows[0])??euroPerGbp;
  const availableColumns=Array.from(new Set([...TRANSFER_DEFAULT_COLUMNS,...(shown?.headers??[])])).filter(column=>column!=="Numer w składzie"&&!column.startsWith("_"));
  const visibleColumns=["Nazwisko",...columns.filter(column=>column!=="Nazwisko"&&availableColumns.includes(column))];
  const sortKey=(column:string)=>SORT_COLUMNS[column]??(shown?.attributeColumns?.includes(column)?`rating:${column}`:undefined);
  const changeColumns=(next:string[])=>{setColumns(next);saveTransferColumns(next);};
  const selectedShortlist=shown?.shortlists?.find(list=>list.id===query.shortlistId);
  function chooseShortlist(value:string) {setDraft(current=>({...current,shortlistId:value}));setQuery(current=>({...current,shortlistId:value,page:0}));}
  const ranges: Array<{title:string;label:string;group:string;from:keyof Filters;to:keyof Filters;max?:string;type?:string;disabled?:boolean}> = [
    {title:"Obecne umiejętności · OU",label:"OU",group:"ability",from:"minCa",to:"maxCa",max:"200"},
    {title:"Potencjał · PA",label:"Potencjał",group:"ability",from:"minPa",to:"maxPa",max:"200"},
    {title:"Wiek",label:"Wiek",group:"general",from:"minAge",to:"maxAge",max:"100",disabled:shown!==null&&!shown.gameDate},
    {title:"Cena / wartość · €",label:"Cena",group:"contract",from:"minFee",to:"maxFee",disabled:effectiveRate===undefined},
    {title:"Obecna płaca · € / rok",label:"Płaca",group:"contract",from:"minWage",to:"maxWage",disabled:effectiveRate===undefined},
    {title:"Wzrost · cm",label:"Wzrost",group:"general",from:"minHeight",to:"maxHeight",max:"250"},
    {title:"Kondycja · %",label:"Kondycja",group:"ability",from:"minCondition",to:"maxCondition",max:"100"},
    {title:"Zapas potencjału · PA − OU",label:"Zapas potencjału",group:"ability",from:"minGrowth",to:"maxGrowth",max:"200"},
    {title:"Koniec kontraktu",label:"Koniec kontraktu",group:"contract",from:"contractAfter",to:"contractBefore",type:"date"},
  ];
  const pageCount=shown?Math.max(1,Math.ceil(shown.total/shown.pageSize)):1;
  const go=(page:number)=>setQuery(current=>({...current,page}));
  return <AppModuleDrawer isOpen={isOpen} onClose={close} title="Transfery · pełna baza piłkarzy"
    subtitle={clubName ? `Wszystkie kluby, w tym ${clubName}, oraz wolni zawodnicy` : "Wszyscy piłkarze z wczytanej bazy gry"} labelledById="transfers-title">
    {editingUid!==null&&<PlayerEditor key={`${sessionId}:${editingUid}`} sessionId={sessionId} uid={editingUid} onClose={()=>setEditingUid(null)} onApplied={editApplied}/>}
    {!sessionId ? <p>Najpierw połącz aplikację z grą i wczytaj prowadzony zespół.</p> : <div className="transfer-search">
      <div className="transfer-search__toolbar">
        <AppSelectField label="Lista życzeń z FM" value={query.shortlistId??""} onChange={chooseShortlist} disabled={loading||!shown} options={[{value:"",label:"Cała baza — bez ograniczenia do listy"},...(shown?.shortlists??[]).map(list=>({value:list.id,label:`${list.name} (${list.playerCount}${list.unresolvedCount?"+":""})`}))]} />
        <AppButton onClick={()=>setRevision(value=>value+1)} disabled={loading}>↻ Odśwież listy z FM</AppButton>
        <TransferColumnPicker available={availableColumns} selected={visibleColumns} onChange={changeColumns} label={columnLabel}/>
      </div>
      {shown?.shortlistError&&<p className="transfer-search__notice">Listy życzeń z FM: {shown.shortlistError}</p>}
      {selectedShortlist&&selectedShortlist.unresolvedCount>0&&<p className="transfer-search__notice">{selectedShortlist.unresolvedCount} wpisów tej listy nie udało się powiązać z odczytaną bazą. Pokazujemy wyłącznie potwierdzonych zawodników.</p>}
      <button type="button" className="transfer-search__filter-toggle" aria-expanded={filtersOpen} aria-controls="transfer-filter-panel" onClick={()=>setFiltersOpen(open=>!open)}><span>{filtersOpen?"▾ Ukryj filtry":"▸ Filtry wyszukiwania"}</span><span>{positions.length?`Pozycje: ${positions.join(", ")}`:"Ogólne · umiejętności · kontrakt · atrybuty"}</span></button>
      <form id="transfer-filter-panel" hidden={!filtersOpen} onSubmit={submit} className="transfer-search__filters">
        <div className="transfer-search__advanced">
          <nav className="transfer-search__categories" aria-label="Kategorie filtrów">{FILTER_TABS.map(tab=><button type="button" key={tab.id} aria-current={filterTab===tab.id?"page":undefined} onClick={()=>setFilterTab(tab.id)}>{tab.label}</button>)}</nav>
          <div className="transfer-search__criteria">
            <h3>{FILTER_TABS.find(tab=>tab.id===filterTab)?.label}</h3>
            {filterTab==="general"&&<div className="transfer-search__additional-filters">
              <AppTextField label="Nazwisko" type="search" value={draft.text} onChange={set("text")} placeholder="Nazwisko, klub lub kraj…" />
              <AppTextField label="Narodowość" value={draft.nationality} onChange={set("nationality")} placeholder="Np. Polska"/>
              <AppTextField label="Klub" value={draft.club} onChange={set("club")} placeholder="Nazwa klubu"/>
              <AppTextField label="Liga" value={draft.league} onChange={set("league")} placeholder="Nazwa rozgrywek"/>
              <AppSelectField label="Zakres klubów" value={draft.clubScope} onChange={set("clubScope")} options={[{value:"all",label:"Cała baza"},{value:"own",label:"Mój klub",disabled:!clubName},{value:"other",label:"Poza moim klubem"}]} />
              <AppSelectField label="Piłkarze / piłkarki" value={draft.gender} onChange={set("gender")} options={[{value:"all",label:"Wszyscy"},{value:"male",label:"Piłkarze"},{value:"female",label:"Piłkarki"}]}/>
            </div>}
            {filterTab==="ability"&&<AppSelectField label="Noga" value={draft.foot} onChange={set("foot")} options={[{value:"any",label:"Dowolna"},{value:"left",label:"Dominująca lewa"},{value:"right",label:"Dominująca prawa"},{value:"both",label:"Obie mocne"}]}/>}
            {filterTab==="contract"&&<div className="transfer-search__additional-filters">
              <AppSelectField label="Status" value={draft.status} onChange={set("status")} options={[{value:"all",label:"Wszyscy zawodnicy"},{value:"listed",label:"Lista transferowa"},{value:"free",label:"Wolni zawodnicy"},{value:"not_for_sale",label:"Nie na sprzedaż"},{value:"release",label:"Do zwolnienia"}]} />
              <AppSelectField label="Wypożyczenie" value={draft.loan} onChange={set("loan")} options={[{value:"all",label:"Wszyscy"},{value:"yes",label:"Wypożyczeni"},{value:"no",label:"Niewypożyczeni"}]}/>
            </div>}
        <div className="transfer-search__ranges">{ranges.filter(range=>range.group===filterTab).map(range=><fieldset key={range.from}>
          <legend>{range.title}</legend><div className="transfer-search__range-fields">
            <AppTextField label={`${range.label} od`} type={range.type||"number"} min={range.type?undefined:"0"} max={range.max} value={draft[range.from]} onChange={set(range.from)} disabled={range.disabled} placeholder="Od" />
            <AppTextField label={`${range.label} do`} type={range.type||"number"} min={range.type?undefined:"0"} max={range.max} value={draft[range.to]} onChange={set(range.to)} disabled={range.disabled} placeholder="Do" />
          </div></fieldset>)}</div>
        <section hidden={filterTab!=="attributes"} className="transfer-search__attributes" aria-label="Filtry atrybutów">
          <div><strong>Atrybuty zawodnika</strong><AppButton disabled={!shown?.attributeColumns?.length||attributeDraft.length>=12} onClick={()=>setAttributeDraft(current=>[...current,{column:shown?.attributeColumns?.[0]??"",min:"",max:""}])}>+ Dodaj warunek</AppButton></div>
          {attributeDraft.map((filter,index)=><div className="transfer-search__attribute-row" key={index}>
            <AppSelectField label="Atrybut" value={filter.column} onChange={value=>setAttributeDraft(current=>current.map((item,i)=>i===index?{...item,column:value}:item))} options={(shown?.attributeColumns??[]).map(value=>({value,label:value}))}/>
            <AppTextField label="Od" type="number" min="0" max="20" value={filter.min} onChange={value=>setAttributeDraft(current=>current.map((item,i)=>i===index?{...item,min:value}:item))}/>
            <AppTextField label="Do" type="number" min="0" max="20" value={filter.max} onChange={value=>setAttributeDraft(current=>current.map((item,i)=>i===index?{...item,max:value}:item))}/>
            <AppButton aria-label="Usuń warunek atrybutu" onClick={()=>setAttributeDraft(current=>current.filter((_,i)=>i!==index))}>×</AppButton>
          </div>)}
        </section>
          </div>
          <PositionPitch selected={positions} onChange={setPositions} match={positionMatch} onMatchChange={setPositionMatch}/>
        </div>
        <div className="transfer-search__actions">
          <AppSelectField label="Sortuj według" value={draft.sort} onChange={set("sort")} options={[{value:"position",label:"Pozycja"},{value:"name",label:"Nazwisko"},{value:"age",label:"Wiek"},{value:"ca",label:"OU"},{value:"pa",label:"Potencjał"},{value:"fee",label:"Cena / wartość"},{value:"wage",label:"Płaca"},{value:"expiry",label:"Koniec kontraktu"},{value:"growth",label:"Zapas potencjału"},{value:"condition",label:"Kondycja"},{value:"height",label:"Wzrost"}]} />
          <AppSelectField label="Kierunek" value={draft.sortDirection} onChange={set("sortDirection")} options={[{value:"asc",label:"Rosnąco"},{value:"desc",label:"Malejąco"}]} />
          <AppSelectField label="Wyników na stronę" value={draft.pageSize} onChange={set("pageSize")} options={["50","100","250"].map(value=>({value,label:value}))} />
          <AppButton type="submit" disabled={loading}>{loading ? "Wyszukiwanie…" : "Szukaj piłkarzy"}</AppButton>
          <AppButton disabled={loading} onClick={()=>{setDraft(EMPTY);setAttributeDraft([]);setPositions([]);setPositionMatch("any");setQuery(request(EMPTY,sessionId,effectiveRate));}}>Wyczyść filtry</AppButton>
        </div>
      </form>
      <p className="transfer-search__note">Bez filtrów pokazujemy całą odczytaną bazę, również własny klub. Strony dzielą wyniki wyłącznie dla sprawnego wyświetlania. Cena wywoławcza i wartość są osobnymi danymi; przy braku ceny filtr korzysta z wartości. Płaca: obecny kontrakt, EUR / rok. {effectiveRate ? FINANCE_NOTE : FINANCE_UNAVAILABLE} Brakujące dane oznaczamy „—”.</p>
      {loading && <div className="transfer-search__notice" role="status">Wczytywanie wyników z całej bazy gry. Przy pierwszym otwarciu przygotowujemy pełny indeks piłkarzy.</div>}
      {error && <div className="transfer-search__notice" role="alert">{error} <AppButton onClick={()=>setRevision(value=>value+1)}>Ponów</AppButton>{query.shortlistId&&<AppButton onClick={()=>chooseShortlist("")}>Wyczyść wybór listy</AppButton>}</div>}
      {shown && <>
        <div className="transfer-search__summary" role="status"><strong>Znaleziono {shown.total.toLocaleString("pl-PL")} z {(shown.databaseTotal??shown.total).toLocaleString("pl-PL")} piłkarzy w bazie</strong><span>{shown.total?shown.page*shown.pageSize+1:0}–{Math.min((shown.page+1)*shown.pageSize,shown.total)} · strona {shown.page+1} z {pageCount}</span></div>
        <div aria-busy={loading} className={`transfer-search__table${filtersOpen?"":" transfer-search__table--expanded"}`}><table><thead><tr>{visibleColumns.map(column=><th key={column} aria-sort={sortKey(column)===query.sort?(query.sortDirection==="asc"?"ascending":"descending"):undefined}>{sortKey(column)?<button type="button" onClick={()=>sortBy(column)} disabled={loading}>{columnLabel(column)} <span>{sortKey(column)===query.sort?(query.sortDirection==="asc"?"↑":"↓"):"↕"}</span></button>:columnLabel(column)}</th>)}</tr></thead>
          <tbody>{shown.rows.map(row=><tr key={row.UID}>{visibleColumns.map(column=><td key={column} data-numeric={(["OU","PA","Wiek","Wzrost","Kondycja","Wartość","Cena wywoławcza","Pensja","Zapas potencjału"].includes(column)||shown?.attributeColumns?.includes(column))||undefined} title={["Pensja","Wartość","Cena wywoławcza"].includes(column) ? (getGameEuroRate(row) ? FINANCE_NOTE : FINANCE_UNAVAILABLE) : row[column] || undefined}>{column==="Nazwisko" ? <button type="button" className="transfer-search__player-editor" title="Otwórz edytor zawodnika w grze" onClick={()=>setEditingUid(Number(row.UID))}>{row[column]}</button> : column==="Pozostały kontrakt" ? contractDuration(row["Koniec kontraktu"],shown.gameDate) : cell(column,row[column],getGameEuroRate(row))}</td>)}</tr>)}</tbody></table>
          {!shown.rows.length && <p className="transfer-search__empty">Brak zawodników spełniających te filtry.</p>}</div>
        <div className="transfer-search__pagination"><AppButton disabled={loading||shown.page===0} onClick={()=>go(0)}>Pierwsza</AppButton><AppButton disabled={loading||shown.page===0} onClick={()=>go(shown.page-1)}>← Poprzednia</AppButton>
          <AppButton disabled={loading||shown.page+1>=pageCount} onClick={()=>go(shown.page+1)}>Następna →</AppButton><AppButton disabled={loading||shown.page+1>=pageCount} onClick={()=>go(pageCount-1)}>Ostatnia</AppButton></div>
      </>}
    </div>}
  </AppModuleDrawer>;
}
