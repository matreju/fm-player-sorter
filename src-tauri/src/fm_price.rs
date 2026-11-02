//! Opt-in, single-player observation of an FM calculation through Microsoft CDB.
//! Never calls the native function or promotes a sample to a guaranteed sale fee.
use serde::Serialize;

#[derive(Clone, PartialEq)]
pub(crate) struct PriceContext {
    pub pid:u32, pub created:u64, pub session_id:u64, pub uid:u32, pub name:String,
    pub club_uid:u32, pub club_name:String, pub club:usize, pub player:usize, pub person:usize,
    pub player_team:usize, pub contract:usize, pub contract_slot:usize, pub plugin_base:usize, pub plugin_size:usize,
    pub game_raw:u32, pub game_date:String, pub euro_per_gbp:f64,
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct PriceCapture {
    pub token:String, pub uid:u32, pub name:String, pub club_name:String,
    pub cdb_available:bool, pub started:bool,
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct PriceObservation {
    pub schema:u32, pub status:String, pub message:String, pub uid:u32,
    pub name:String, pub club_uid:u32, pub club_name:String, pub game_date:String,
    pub session_id:u64, pub method:String, pub guaranteed_sale_fee:bool,
    pub raw_gbp:Option<i32>, pub euro:Option<f64>, pub euro_per_gbp:f64,
    pub buyer_context:Option<String>, pub input_value:Option<i32>,
    pub flags:Option<String>, pub caller_rva:Option<String>,
}

#[cfg(target_os="windows")]
mod platform {
    use super::*;
    use std::{fs, io::Read, path::PathBuf, process::{Child,Command}, sync::{Mutex,OnceLock}, time::{Instant,SystemTime,UNIX_EPOCH}, os::windows::process::CommandExt};
    use tauri::Manager;
    const FUNCTION:usize=0x15EF460;
    struct Ticket {token:String,context:PriceContext,dir:PathBuf,prepared:Instant,child:Option<Child>}
    static STATE:OnceLock<Mutex<Option<Ticket>>>=OnceLock::new();
    fn state()->&'static Mutex<Option<Ticket>> {STATE.get_or_init(||Mutex::new(None))}
    fn cdb()->Option<PathBuf> {
        ["ProgramFiles(x86)","ProgramFiles"].iter().filter_map(|name|std::env::var_os(name))
            .map(|root|PathBuf::from(root).join("Windows Kits/10/Debuggers/x64/cdb.exe"))
            .find(|path|path.is_file())
    }
    fn view(t:&Ticket)->PriceCapture {PriceCapture{token:t.token.clone(),uid:t.context.uid,name:t.context.name.clone(),club_name:t.context.club_name.clone(),cdb_available:cdb().is_some(),started:t.child.is_some()}}
    fn same(t:&Ticket)->Result<(),String> {
        if t.prepared.elapsed().as_secs()>300 {return Err("Próba wygasła po 5 minutach. Przygotuj nową po połączeniu z FM.".into());}
        let live=crate::fm_reader::price_capture_context(t.context.session_id,t.context.uid)?;
        if live!=t.context {return Err("Zmienił się zapis, data, kurs lub obiekt zawodnika. Przygotuj nową próbę.".into());}
        Ok(())
    }
    fn guard(c:&PriceContext)->String {
        format!("(@$tpid == 0n{}) and (dwo(0x{:x}) == 0x{:x}) and (dwo(0x{:x}) == 0x{:x}) and (dwo(0x{:x}) == 0x{:x}) and (poi(0x{:x}) == 0x{:x}) and (poi(0x{:x}) == 0x{:x})",
            c.pid,c.person+0xC,c.uid,c.club+0xC,c.club_uid,c.plugin_base+0x56AD378,c.game_raw,c.player+0x130,c.player_team,c.contract_slot,c.contract)
    }
    fn scripts(c:&PriceContext,token:&str)->(String,String,String) {
        let guard=guard(c);
        let entry=c.plugin_base+FUNCTION;
        // Relative ASCII filenames avoid nested escaping of Windows user paths.
        // $$>< condenses the script into one debugger command program.
        let init=format!(r#".expr /s masm
.if (({guard}) and (qwo(0x{entry:x}) == 0x5441554156415741) and (qwo(0x{second:x}) == 0x48ec814853555756)) {{ bp0 0x{entry:x} "$$><entry.dbg"; .echo FMPRICE_READY_{token}; .echo Switch to FM and reopen this player's transfer/offer screen. Cancel: Ctrl+C then qd. ; g; }} .else {{ .echo FMPRICE_REJECT_{token}; qd; }}
"#,second=entry+8);
        let body=format!(r#".if ((@rcx == 0x{player:x}) and ((@rdx == 0) or (@rdx == 0x{club:x})) and (qwo(@rsp + 0x28) == 0) and (qwo(@rsp + 0x30) == 0)) {{
.if ({guard}) {{
r $t0 = @rsp + 8
r $t1 = @$tid
r $t2 = @rdx
r $t3 = @r8d
r $t4 = @r9d
r $t5 = poi(@rsp)
.if ((@$t5 >= 0x{base:x}) and (@$t5 < 0x{end:x})) {{ bd 0; bp1 @$t5 "$$><return.dbg"; g; }} .else {{ .echo FMPRICE_REJECT_{token}; bc *; qd; }}
}} .else {{ .echo FMPRICE_REJECT_{token}; bc *; qd; }}
}} .else {{ gc; }}
"#,player=c.player,club=c.club,base=c.plugin_base,end=c.plugin_base+c.plugin_size);
        let result=format!(r#".if ((@$tid == @$t1) and (@rsp == @$t0)) {{
.if ({guard}) {{ .printf "FMPRICE_RESULT_{token} %x %I64x %x %x %I64x\n", @eax, @$t2, @$t3, @$t4, (@$t5 - 0x{base:x}); bc *; qd; }} .else {{ .echo FMPRICE_REJECT_{token}; bc *; qd; }}
}} .else {{ gc; }}
"#,base=c.plugin_base);
        (init,body,result)
    }
    pub fn prepare(app:tauri::AppHandle,session_id:u64,uid:u32)->Result<PriceCapture,String> {
        let mut slot=state().lock().map_err(|_|"Próba jest zajęta.")?;
        if let Some(t)=slot.as_mut() {if let Some(child)=t.child.as_mut() {if child.try_wait().map_err(|e|e.to_string())?.is_none(){if t.context.session_id==session_id && t.context.uid==uid {return Ok(view(t));}return Err("Najpierw zakończ poprzednią konsolę CDB: Ctrl+C, potem qd i Enter.".into());}}}
        let context=crate::fm_reader::price_capture_context(session_id,uid)?;
        let token=format!("p{:x}{:x}",uid,SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());
        let dir=app.path().app_cache_dir().map_err(|e|e.to_string())?.join("price-capture").join(&token);
        fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
        let (init,entry,result)=scripts(&context,&token);
        for (name,content) in [("capture.dbg",init),("entry.dbg",entry),("return.dbg",result)] {fs::write(dir.join(name),content.replace('\n',"\r\n")).map_err(|e|e.to_string())?;}
        fs::write(dir.join("INSTRUKCJA.txt"),include_str!("../../docs/price-capture-pl.txt")).map_err(|e|e.to_string())?;
        let ticket=Ticket{token,context,dir,prepared:Instant::now(),child:None};
        let result=view(&ticket);*slot=Some(ticket);Ok(result)
    }
    pub fn start(token:String)->Result<PriceCapture,String> {
        let mut slot=state().lock().map_err(|_|"Próba jest zajęta.")?;
        let t=slot.as_mut().filter(|t|t.token==token).ok_or("Przygotuj próbę ponownie.")?;
        if t.child.is_some() {return Err("Ta próba została już uruchomiona. Odczytaj raport lub przygotuj nową.".into());}
        same(t)?;
        let exe=cdb().ok_or("Brak CDB x64. Zainstaluj Debugging Tools for Windows z Windows SDK, a potem przygotuj próbę ponownie.")?;
        // Visible console; -pd detaches on debugger exit rather than terminating FM.
        let child=Command::new(exe).args(["-p",&t.context.pid.to_string(),"-pd","-logo","capture.log","-cf","capture.dbg"])
            .current_dir(&t.dir).env("_NT_SYMBOL_PATH", "").env("_NT_ALT_SYMBOL_PATH", "").creation_flags(0x00000010).spawn().map_err(|e|format!("Nie uruchomiono CDB: {e}"))?;
        t.child=Some(child);Ok(view(t))
    }
    pub fn read(token:String)->Result<PriceObservation,String> {
        let mut slot=state().lock().map_err(|_|"Próba jest zajęta.")?;
        let t=slot.as_mut().filter(|t|t.token==token).ok_or("Przygotuj próbę ponownie.")?;
        let c=&t.context;
        let mut report=PriceObservation{schema:1,status:"notStarted".into(),message:"Najpierw uruchom próbę.".into(),uid:c.uid,name:c.name.clone(),club_uid:c.club_uid,club_name:c.club_name.clone(),game_date:c.game_date.clone(),session_id:c.session_id,method:"observed-native-calculation-15EF460".into(),guaranteed_sale_fee:false,raw_gbp:None,euro:None,euro_per_gbp:c.euro_per_gbp,buyer_context:None,input_value:None,flags:None,caller_rva:None};
        let Some(child)=t.child.as_mut() else {return Ok(report);};
        let exit=child.try_wait().map_err(|e|e.to_string())?;
        if exit.is_none() {report.status="running".into();report.message="CDB czeka na obliczenie. Przejdź do FM i otwórz ponownie ekran transferu/oferty tego zawodnika. Jeżeli nie ma wyniku po około 30 sekundach, w konsoli CDB naciśnij Ctrl+C, wpisz qd i Enter. Gra może chwilowo zatrzymać się przy przechwyceniu.".into();return Ok(report);}
        if !exit.unwrap().success() {report.status="failed".into();report.message="CDB zakończył się błędem. Sprawdź widoczną konsolę i uprawnienia dostępu do FM; nie odczytano ceny.".into();return Ok(report);}
        if let Err(reason)=same(t) {report.status="stale".into();report.message=reason;return Ok(report);}
        let file=fs::File::open(t.dir.join("capture.log")).map_err(|e|format!("CDB nie utworzył raportu. Sprawdź konsolę: {e}"))?;
        let mut bytes=Vec::new();file.take(2_097_153).read_to_end(&mut bytes).map_err(|e|e.to_string())?;
        if bytes.len()>2_097_152 {return Err("Dziennik CDB przekroczył limit 2 MB. Przygotuj nową próbę.".into());}
        let log=String::from_utf8_lossy(&bytes);
        let prefix=format!("FMPRICE_RESULT_{} ",t.token);
        let lines=log.lines().filter_map(|line|line.trim().strip_prefix(&prefix)).collect::<Vec<_>>();
        if lines.len()!=1 {report.status="notCaptured".into();report.message=if log.lines().any(|line|line.trim()==format!("FMPRICE_REJECT_{}",t.token)){"Odrzucono próbę: zmienił się kontekst gry albo nie potwierdzono funkcji."}else{"Nie przechwycono wyniku. FM mógł użyć pamięci podręcznej; możliwy jest też brak dostępu CDB lub błąd skryptu. Nie oznacza to ceny 0 ani braku zainteresowania."}.into();return Ok(report);}
        let fields=lines[0].split_whitespace().collect::<Vec<_>>();
        if fields.len()!=5 || fields.iter().any(|s|s.len()>16||!s.bytes().all(|b|b.is_ascii_hexdigit())) {return Err("Nieprawidłowy format wyniku CDB.".into());}
        let numbers=fields.iter().map(|s|u64::from_str_radix(s,16).map_err(|_|"Nieprawidłowa liczba w wyniku CDB.")).collect::<Result<Vec<_>,_>>()?;
        if numbers[0]>u32::MAX as u64 || numbers[2]>u32::MAX as u64 || numbers[3]>u32::MAX as u64 || numbers[4]>=c.plugin_size as u64 || (numbers[1]!=0 && numbers[1]!=c.club as u64) {return Err("Wynik nie pasuje do przygotowanego odczytu.".into());}
        let raw=numbers[0] as u32 as i32;
        report.raw_gbp=Some(raw);report.input_value=Some(numbers[2] as u32 as i32);
        report.buyer_context=Some(if numbers[1]==0 {"unspecified"}else{"managed-club"}.into());
        report.flags=Some(format!("0x{:X}",numbers[3]));report.caller_rva=Some(format!("0x{:X}",numbers[4]));
        if !(0..300_000_000).contains(&raw) {report.status="unavailable".into();report.message="FM zwrócił kod/brak kwoty. Nie pokazano go jako ceny sprzedaży.".into();return Ok(report);}
        report.status="captured".into();report.euro=Some(raw as f64*c.euro_per_gbp);
        report.message="Przechwycono wynik obliczenia FM. Zgodność z żądaniami klubu i akceptacją oferty jest niepotwierdzona; wynik nie trafia automatycznie do tabeli transferów. Porównaj go z grą przy tej samej dacie, klubie kupującym i warunkach oferty.".into();
        Ok(report)
    }
    pub fn running()->bool {state().lock().map(|mut slot|slot.as_mut().and_then(|t|t.child.as_mut()).map(|child|child.try_wait().ok().flatten().is_none()).unwrap_or(false)).unwrap_or(true)}
    pub fn folder(token:String)->Result<(),String> {let slot=state().lock().map_err(|_|"Próba jest zajęta.")?;let t=slot.as_ref().filter(|t|t.token==token).ok_or("Przygotuj próbę ponownie.")?;Command::new("explorer.exe").arg(&t.dir).spawn().map_err(|e|e.to_string())?;Ok(())}
    pub fn tools()->Result<(),String> {Command::new("explorer.exe").arg("https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/debugger-download-tools").spawn().map_err(|e|e.to_string())?;Ok(())}
}
#[tauri::command]
pub async fn prepare_fm_price_capture(app:tauri::AppHandle,session_id:u64,uid:u32)->Result<PriceCapture,String> {
    #[cfg(target_os="windows")] {tauri::async_runtime::spawn_blocking(move||platform::prepare(app,session_id,uid)).await.map_err(|e|e.to_string())?}
    #[cfg(not(target_os="windows"))] {let _=(app,session_id,uid);Err("Próba wymaga Windows i Microsoft CDB x64.".into())}
}
#[tauri::command]
pub async fn start_fm_price_capture(token:String)->Result<PriceCapture,String> {
    #[cfg(target_os="windows")] {tauri::async_runtime::spawn_blocking(move||platform::start(token)).await.map_err(|e|e.to_string())?}
    #[cfg(not(target_os="windows"))] {let _=token;Err("Próba wymaga Windows.".into())}
}
#[tauri::command]
pub async fn read_fm_price_capture(token:String)->Result<PriceObservation,String> {
    #[cfg(target_os="windows")] {tauri::async_runtime::spawn_blocking(move||platform::read(token)).await.map_err(|e|e.to_string())?}
    #[cfg(not(target_os="windows"))] {let _=token;Err("Próba wymaga Windows.".into())}
}
#[tauri::command]
pub fn open_fm_price_capture_folder(token:String)->Result<(),String> {
    #[cfg(target_os="windows")] {platform::folder(token)}
    #[cfg(not(target_os="windows"))] {let _=token;Err("Próba wymaga Windows.".into())}
}
#[tauri::command]
pub fn open_fm_price_tools()->Result<(),String> {
    #[cfg(target_os="windows")] {platform::tools()}
    #[cfg(not(target_os="windows"))] {Err("Próba wymaga Windows.".into())}
}

#[cfg(target_os="windows")]
pub(crate) fn capture_running()->bool {platform::running()}
