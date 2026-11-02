import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppButton, AppTextField } from "../ui";

type Capture={token:string;uid:number;name:string;clubName:string;cdbAvailable:boolean;started:boolean};
type Observation={schema:number;status:string;message:string;uid:number;name:string;clubUid:number;clubName:string;gameDate:string;sessionId:number;method:string;guaranteedSaleFee:false;rawGbp:number|null;euro:number|null;euroPerGbp:number;buyerContext:string|null;inputValue:number|null;flags:string|null;callerRva:string|null};
export function PriceCapture({sessionId,uid,disabled,onActiveChange}:{sessionId:number;uid:number;disabled:boolean;onActiveChange:(active:boolean)=>void}) {
  const [capture,setCapture]=useState<Capture|null>(null),[report,setReport]=useState<Observation|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[reference,setReference]=useState(""),[copied,setCopied]=useState(false);
  const guard=useRef(false);
  async function perform(action:()=>Promise<void>){if(guard.current||disabled)return;guard.current=true;setBusy(true);setError("");setCopied(false);try{await action();}catch(reason){setError(String(reason));}finally{guard.current=false;setBusy(false);}}
  const terminal=report&&!['running','notStarted'].includes(report.status);
  const active=!!capture?.started&&!terminal;
  const json=report?JSON.stringify({...report,referenceEuroFromUser:reference||null,referenceSource:"user-entered; not independently verified"},null,2):"";
  const euro=(value:number)=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"EUR"}).format(value);
  return <details className="price-capture"><summary>Próbny odczyt ceny z FM</summary>
    <p>Przechwycenie wyniku obliczenia wykonywanego przez samą grę. To etap weryfikacji: wynik nie jest jeszcze potwierdzoną ceną akceptacji i nie uzupełnia tabeli transferów.</p>
    <ol><li>Zapisz karierę, użyj jej kopii i wstrzymaj upływ czasu w FM.</li><li>Przygotuj próbę, potem uruchom CDB. Debugger zakłada tymczasowe punkty zatrzymania w kodzie; gra może na chwilę się zatrzymać. Nie edytuj jej danych podczas próby.</li><li>Po komunikacie <code>FMPRICE_READY</code> przejdź do FM i otwórz ponownie ekran transferu/oferty tego zawodnika. Nie wysyłaj oferty.</li><li>Po wyniku CDB odłączy się sam. Jeśli po około 30 sekundach go brak: w konsoli CDB <kbd>Ctrl+C</kbd>, wpisz <code>qd</code> i Enter. Następnie odczytaj raport.</li></ol>
    <div className="price-capture__actions"><AppButton disabled={disabled||busy} onClick={()=>void perform(async()=>{const next=await invoke<Capture>("prepare_fm_price_capture",{sessionId,uid});setCapture(next);setReport(null);onActiveChange(next.started);})}>1. Przygotuj próbę</AppButton>
      {capture&&<AppButton variant="primary" disabled={disabled||busy||capture.started||!capture.cdbAvailable} onClick={()=>void perform(async()=>{const next=await invoke<Capture>("start_fm_price_capture",{token:capture.token});setCapture(next);onActiveChange(true);})}>2. Uruchom CDB (próba)</AppButton>}
      {capture?.started&&<AppButton disabled={disabled||busy} onClick={()=>void perform(async()=>{const next=await invoke<Observation>("read_fm_price_capture",{token:capture.token});setReport(next);onActiveChange(next.status==="running");})}>3. Odczytaj raport</AppButton>}
      {capture&&<AppButton disabled={disabled||busy} onClick={()=>void perform(()=>invoke("open_fm_price_capture_folder",{token:capture.token}))}>Folder próby i instrukcja</AppButton>}
    </div>
    {capture&&!capture.cdbAvailable&&<p>Brak Microsoft CDB x64. W instalatorze Windows SDK wybierz składnik <strong>Debugging Tools for Windows</strong>. Sam WinDbg ze sklepu może nie zawierać CDB. Po instalacji ponownie przygotuj próbę. <AppButton disabled={disabled||busy} onClick={()=>void perform(()=>invoke("open_fm_price_tools"))}>Oficjalna instrukcja Microsoft</AppButton></p>}
    {capture&&<p>Cel: <strong>{capture.name}</strong> · UID {capture.uid} · kupujący: {capture.clubName}. {active&&"Konsola CDB jest uruchomiona. Zakończ ją przed zapisaniem zmian w edytorze. Zamknięcie aplikacji nie kończy osobnej konsoli CDB."}</p>}
    {error&&<p role="alert">{error}</p>}
    {report&&<div className="price-capture__result" role="status"><strong>{report.status==="captured"?"Wynik przechwycony — zgodność z ofertą niepotwierdzona":"Stan próby"}</strong><p>{report.message}</p>
      {report.status==="captured"&&report.euro!==null&&<><p className="price-capture__amount">{euro(report.euro)} <small>({report.rawGbp?.toLocaleString("pl-PL")} GBP)</small></p><p>{report.buyerContext==="managed-club"?"Wywołanie wskazało prowadzony klub jako kupującego.":"Wywołanie nie wskazało konkretnego kupującego. To nie jest jeszcze cena dla Twojego klubu."}</p></>}
      {terminal&&<><AppTextField label="Kwota żądana w FM (€), jeśli ją widzisz" value={reference} onChange={setReference} placeholder="Np. 2500000; dopisz warunki w rozmowie"/>
        <textarea aria-label="Raport odczytu ceny" value={json} readOnly rows={8}/><AppButton disabled={busy} onClick={()=>void perform(async()=>{await navigator.clipboard.writeText(json);setCopied(true);})}>{copied?"Skopiowano raport":"Kopiuj raport do rozmowy"}</AppButton></>}
    </div>}
  </details>;
}
