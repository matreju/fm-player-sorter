// Included inside windows_reader. Exact-build, owned-record scalar editing only.
// No heap scan, game function calls, code patches, allocation or player writes.
use crate::fm_league::{LeagueU22Snapshot,LeagueU22Result};

#[derive(Clone)]
struct LeagueGuard {address:usize,bytes:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaPatch {address:usize,before:Vec<u8>,after:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaDraft {
    session_id:u64,pid:u32,created:u64,team:usize,club_uid:u32,base:usize,
    game_date:u32,guards:Vec<LeagueGuard>,patches:Vec<LeagueQuotaPatch>,opened:Instant,
}
#[derive(Default)]
struct LeagueQuotaState {drafts:HashMap<String,LeagueQuotaDraft>,undos:HashMap<String,LeagueQuotaDraft>}
static LEAGUE_QUOTA_STATE:OnceLock<Mutex<LeagueQuotaState>>=OnceLock::new();
fn league_quota_state()->&'static Mutex<LeagueQuotaState> {LEAGUE_QUOTA_STATE.get_or_init(||Mutex::new(LeagueQuotaState::default()))}

fn league_quota_context(session_id:u64,write:bool)->Result<(RemoteProcess,RefreshSession),String> {
    let cache=refresh_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Najpierw połącz aplikację z grą.")?;
    if cache.database.session_id!=session_id||cache.club.is_none() {return Err("Połącz aplikację z prowadzonym klubem i otwórz zasady ligi ponownie.".into());}
    let source=scouting_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Połącz aplikację z grą.")?;
    if source.session_id!=session_id||source.pid!=cache.database.pid {return Err("Dane gry zmieniły się. Otwórz zasady ponownie.".into());}
    if detect_football_manager().pid!=Some(cache.database.pid) {return Err("Zmienił się proces FM. Połącz aplikację ponownie.".into());}
    let mut process=if write {RemoteProcess::open_editor(cache.database.pid)?}else{RemoteProcess::open(cache.database.pid)?};
    process.layout=source.layout;process.native_plugin_hash=cache.native_plugin_hash.clone();
    if !verified_fm27(&process) {return Err("Edycja wymogu U22 wymaga rozpoznanego wydania FM27.".into());}
    refresh_identity_check(&process,&cache)?;
    Ok((process,cache))
}
fn league_live_date(process:&RemoteProcess,base:usize)->Result<u32,String> {
    process.read_u32(base+0x56AD378).filter(|date|decode_fm_date(*date).is_some()).map(normalize_fm_date).ok_or_else(||"Nie potwierdzono aktualnej daty FM.".into())
}
fn league_capture(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,address:usize,length:usize)->Result<Vec<u8>,String> {
    let bytes=process.read_exact(address,length).ok_or("Gra nie udostępnia teraz kompletnych zasad ligi.")?;
    guards.push(LeagueGuard {address,bytes:bytes.clone()});Ok(bytes)
}
fn league_pointer(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,address:usize)->Result<usize,String> {
    let bytes=league_capture(process,guards,address,8)?;
    let pointer=read_u64(&bytes,0).unwrap_or(0) as usize;
    if pointer<0x10_000||pointer>=0x0000_8000_0000_0000||pointer%8!=0 {return Err("Nie potwierdzono powiązania zasad ligi. Niczego nie zmieniono.".into());} Ok(pointer)
}
fn league_type(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,base:usize,address:usize,expected:&str)->Result<(),String> {
    let vtable=league_pointer(process,guards,address)?;
    if league_native_type(process,base,vtable).as_deref()!=Some(expected) {return Err("Nie potwierdzono typu ustawień ligi. Zapis jest zablokowany.".into());} Ok(())
}
fn league_vector(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,address:usize,limit:usize)->Result<Vec<usize>,String> {
    let bytes=league_capture(process,guards,address,24)?;
    let begin=read_u64(&bytes,0).unwrap_or(0) as usize;
    let end=read_u64(&bytes,8).unwrap_or(0) as usize;
    let capacity=read_u64(&bytes,16).unwrap_or(0) as usize;
    if begin==0&&end==0&&capacity==0 {return Ok(Vec::new());}
    if begin<0x10_000||begin%8!=0||end<begin||(end-begin)%8!=0||end-begin>limit*8||capacity<end {return Err("Nie potwierdzono listy reguł ligi.".into());}
    if end==begin {return Ok(Vec::new());}
    let pointers=league_capture(process,guards,begin,end-begin)?;
    let mut result=Vec::new();
    for chunk in pointers.chunks_exact(8) {
        let pointer=u64::from_le_bytes(chunk.try_into().map_err(|_|"Nieprawidłowa lista reguł.")?) as usize;
        if pointer<0x10_000||pointer>=0x0000_8000_0000_0000||pointer%8!=0 {return Err("Niekompletna lista reguł ligi.".into());}
        result.push(pointer);
    }
    Ok(result)
}
fn league_rule_records(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,collection:usize)->Result<Vec<(usize,Vec<u8>)>,String> {
    let pointers=league_vector(process,guards,collection,128)?;
    if pointers.is_empty() {return Err("Brak rozpoznanych reguł wyboru kadry.".into());}
    let mut records=Vec::new();
    let mut unique=HashSet::new();
    for pointer in pointers {
        if !unique.insert(pointer) {return Err("Lista reguł zawiera współdzielone wpisy. Zapis zablokowany.".into());}
        let bytes=process.read_exact(pointer,32).ok_or("Nie można odczytać pełnej reguły wyboru kadry.")?;
        // Count is the only writable field; type, mode and expressions are guards.
        guards.push(LeagueGuard {address:pointer,bytes:bytes[..0x18].to_vec()});
        guards.push(LeagueGuard {address:pointer+0x1C,bytes:bytes[0x1C..].to_vec()});
        if !league_u22_entry(&bytes) {guards.push(LeagueGuard {address:pointer+0x18,bytes:bytes[0x18..0x1C].to_vec()});}
        records.push((pointer,bytes));
    }
    Ok(records)
}
fn league_record_signature(records:&[(usize,Vec<u8>)])->Vec<Vec<u8>> {
    let mut signature=records.iter().map(|(_,bytes)|bytes.clone()).collect::<Vec<_>>();signature.sort();signature
}
fn league_u22_entry(bytes:&[u8])->bool {
    // Qualifying expressions are not an absence of a minimum. Preserve them
    // byte-for-byte; only the quota of the exact U22 match-squad type is editable.
    read_u16(bytes,0x1C)==Some(0x16)&&matches!(bytes.get(0x1E),Some(1)|Some(2))
}
fn league_add_quota_patch(patches:&mut Vec<LeagueQuotaPatch>,pointer:usize,bytes:&[u8],minimum:u32)->Result<(),String> {
    if read_u32(bytes,0x18)!=Some(minimum) {return Err("Wymóg U22 różni się między aktywną regułą a jej definicją. Zapis zablokowany.".into());}
    if patches.iter().any(|patch|patch.address==pointer+0x18) {return Ok(());}
    patches.push(LeagueQuotaPatch {address:pointer+0x18,before:bytes[0x18..0x1C].to_vec(),after:0u32.to_le_bytes().to_vec()});Ok(())
}
fn league_collect_fixture_quota(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,patches:&mut Vec<LeagueQuotaPatch>,fixture:usize,route:&str,observations:&mut Vec<String>)->Result<Option<u32>,String> {
    // 0x12639E0 confirms +0x108 is the competition UID. Refuse country/shared rules.
    let header=league_capture(process,guards,fixture+0x108,0x28)?;
    let current_bytes=league_capture(process,guards,fixture+0x70,8)?;
    if read_u64(&current_bytes,0)==Some(0) {observations.push("Lista aktywnych reguł nie została jeszcze udostępniona przez FM.".into());return Ok(None);}
    let current=league_pointer(process,guards,fixture+0x70)?;
    let current_records=league_rule_records(process,guards,current)?;
    let u22=current_records.iter().filter(|(_,bytes)|read_u16(bytes,0x1C)==Some(0x16)).collect::<Vec<_>>();
    if u22.is_empty() {
        // Compact metadata from this exact owned path, not a heuristic heap scan.
        let entries=current_records.iter().take(16).map(|(_,bytes)|format!("{}/{}/{}",read_u16(bytes,0x1C).unwrap_or(u16::MAX),bytes[0x1E],read_u32(bytes,0x18).unwrap_or(u32::MAX))).collect::<Vec<_>>().join(", ");
        observations.push(format!("Lista zawiera {} reguł; nie ma w niej typu U22 w kadrze meczowej. Odczyt typu/trybu/limitu: {entries}.",current_records.len()));
    } else {
        for (_,bytes) in u22 {
            observations.push(format!("Reguła U22: limit {}, tryb {}, dodatkowe parametry: {}.",read_u32(bytes,0x18).unwrap_or(u32::MAX),bytes[0x1E],if bytes[..0x18].iter().any(|byte|*byte!=0) {"tak"}else{"nie"}));
        }
    }
    let targets=current_records.iter().filter(|(_,bytes)|league_u22_entry(bytes)).collect::<Vec<_>>();
    if targets.is_empty() {return Ok(None);}
    if read_u32(&header,0)!=Some(129558) {
        let owner=read_u32(&header,0).ok_or("Nie udało się odczytać właściciela zasad.")?;
        return Err(format!("Znaleziono minimum U22, ale nie potwierdzono właściciela jego zasad. Niczego nie zmieniono.\nOczekiwany identyfikator ligi: 129558; odczytany właściciel: {} (0x{owner:08X}).\n{route}\n{}\nSkopiuj cały komunikat. Sam niezgodny identyfikator nie potwierdza, że reguła należy do innej ligi; może też oznaczać współdzielone lub pośrednie powiązanie, którego edytor jeszcze nie obsługuje.",owner as i32,observations.join("\n")));
    }
    if targets.len()!=1 {return Err("Znaleziono więcej niż jeden wymóg U22. Nie można bezpiecznie wybrać reguły.".into());}
    let minimum=read_u32(&targets[0].1,0x18).ok_or("Nieprawidłowy limit U22.")?;
    if minimum!=3&&minimum!=0 {return Err(format!("Odczytano minimum {minimum} U22. Ta operacja obsługuje wyłącznie potwierdzony wymóg trzech zawodników."));}
    let signature=league_record_signature(&current_records);
    let current_flags=league_capture(process,guards,current+0x18,8)?;
    // Native 0x236D1E0 copies the current +0x70 collection from a dated
    // definition in +0x18. Require a unique complete semantic match, rather
    // than editing arbitrary future/registration definitions by a numeric hit.
    let definitions=league_vector(process,guards,fixture+0x18,64)?;
    let mut matching=Vec::new();
    for definition in definitions {
        let metadata=league_capture(process,guards,definition+8,0x10)?;
        if metadata[8]&0x80!=0||metadata[8]&0x20==0 {continue;}
        let collection=league_pointer(process,guards,definition)?;
        let records=league_rule_records(process,guards,collection)?;
        let flags=league_capture(process,guards,collection+0x18,8)?;
        if league_record_signature(&records)==signature&&flags==current_flags {matching.push(records);}
    }
    if matching.len()!=1 {return Err("Nie potwierdzono jednoznacznej definicji aktywnych zasad. Zapis zablokowany, aby nie zmienić innego sezonu lub rejestracji.".into());}
    for (pointer,bytes) in current_records.iter().chain(matching[0].iter()).filter(|(_,bytes)|league_u22_entry(bytes)) {
        league_add_quota_patch(patches,*pointer,bytes,minimum)?;
    }
    Ok(Some(minimum))
}
fn league_resolve_quota(process:&RemoteProcess,cache:&RefreshSession)->Result<(LeagueQuotaDraft,u32,String),String> {
    let base=cache.plugin_base;let mut guards=Vec::new();let mut roots=Vec::new();
    for offset in TEAM_COMPETITION {
        let Some(pointer)=process.read_ptr(cache.team+offset).filter(|pointer|*pointer>=0x10_000) else {continue;};
        if process.read_u32(pointer+OBJ_UID)!=Some(129558) {continue;}
        league_pointer(process,&mut guards,cache.team+offset)?;
        league_type(process,&mut guards,base,pointer,".?AVCOMP@db@@")?;
        league_capture(process,&mut guards,pointer+OBJ_UID,4)?;
        if !roots.contains(&pointer) {roots.push(pointer);}
    }
    if roots.len()!=1 {return Err("Nie potwierdzono Ekstraklasy prowadzonego klubu. Edycja U22 jest obecnie dostępna wyłącznie dla tych rozgrywek.".into());}
    let competition=roots[0];
    let name=process.indirect_string(competition+COMPETITION_NAME).filter(|name|plausible_label(name,96)).ok_or("Nie potwierdzono nazwy rozgrywek.")?;
    let actual=league_pointer(process,&mut guards,competition+0xB0)?;
    league_type(process,&mut guards,base,actual,".?AVACTUAL_COMP@sicomps@@")?;
    if league_pointer(process,&mut guards,actual+0x120)?!=competition {return Err("Zmieniło się powiązanie sezonu z ligą.".into());}
    let stages=league_vector(process,&mut guards,actual+0x1C0,32)?;
    // Do not guess which phase is active in a competition with multiple stages.
    if stages.len()!=1 {return Err("Liga ma kilka faz. Wybór właściwej fazy nie został jeszcze potwierdzony; zapis zablokowany.".into());}
    let stage=stages[0];league_type(process,&mut guards,base,stage,".?AVLEAGUE_STAGE@sicomps@@")?;
    if league_pointer(process,&mut guards,stage+0x70)?!=competition {return Err("Faza ligowa należy do innych rozgrywek.".into());}
    let settings=league_pointer(process,&mut guards,stage+0xF0)?;
    league_type(process,&mut guards,base,settings,".?AVLEAGUE_SETTINGS@sicomps@@")?;
    let setting_index=league_capture(process,&mut guards,settings+0x175,1)?[0];
    let default_index=league_capture(process,&mut guards,actual+0x31,1)?[0];
    let index=if setting_index==0xFF {default_index}else{setting_index} as usize;
    if index>=128 {return Err("Nie potwierdzono indeksu zasad fazy ligowej.".into());}
    let owner=league_pointer(process,&mut guards,actual+0x370)?;
    let container=league_pointer(process,&mut guards,owner+0x1E0)?;
    let fixtures=league_vector(process,&mut guards,container+0x60,128)?;
    let fixture=*fixtures.get(index).ok_or("Lista zasad ligi nie zawiera ustawień tej fazy.")?;
    let mut patches=Vec::new();let mut minimum=None;let mut observations=Vec::new();
    // Prefer neither cached UI rules nor a heap sample. Cover the exact root
    // and its optional native match-rules child (+0x68, used by 0xDFBAC0).
    let mut candidates=vec![(fixture,"główna lista fazy")];
    let child_bytes=league_capture(process,&mut guards,fixture+0x68,8)?;
    let child=read_u64(&child_bytes,0).unwrap_or(0) as usize;
    if child!=0 {
        if child<0x10_000||child%8!=0||child==fixture {return Err("Nie potwierdzono podrzędnych zasad meczu.".into());}
        let nested=league_capture(process,&mut guards,child+0x68,8)?;
        if read_u64(&nested,0)!=Some(0) {return Err("Zasady meczu mają dodatkowe warianty. Zapis zablokowany.".into());}
        candidates.push((child,"podrzędna lista meczu (+0x68)"));
    }
    let root_owner=process.read_u32(fixture+0x108).map(|uid|format!("{} (0x{uid:08X})",uid as i32)).unwrap_or_else(||"brak odczytu".into());
    for (fixture,path) in candidates {
        let route=format!("Odczyt beta.17: {path}; indeks fazy: {setting_index}; indeks domyślny: {default_index}; wybrany indeks: {index}; właściciel głównej listy: {root_owner}.");
        if let Some(value)=league_collect_fixture_quota(process,&mut guards,&mut patches,fixture,&route,&mut observations)? {
            if minimum.is_some_and(|previous|previous!=value) {return Err("Reguły ligi i meczu mają różne wymagania U22. Zapis zablokowany.".into());}
            minimum=Some(value);
        }
    }
    let minimum=minimum.ok_or_else(||format!("Nie udało się dopasować przepisu widocznego w FM. Zasady gry nie zostały zmienione.\n{}",observations.join("\n")))?;
    if patches.is_empty()||patches.len()>8 {return Err("Nie potwierdzono kompletnego zapisu wymogu U22.".into());}
    let draft=LeagueQuotaDraft {session_id:cache.database.session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,club_uid:cache.database.managed_club_uid.ok_or("Nie potwierdzono klubu.")?,base,game_date:league_live_date(process,base)?,guards,patches,opened:Instant::now()};
    league_verify_quota(process,cache,&draft,draft.game_date)?;
    Ok((draft,minimum,name))
}
fn league_verify_quota(process:&RemoteProcess,cache:&RefreshSession,draft:&LeagueQuotaDraft,date:u32)->Result<(),String> {
    refresh_identity_check(process,cache)?;
    if cache.database.session_id!=draft.session_id||cache.database.pid!=draft.pid||cache.team!=draft.team||cache.plugin_base!=draft.base||cache.database.managed_club_uid!=Some(draft.club_uid)||process.creation_time()!=Some(draft.created)||league_live_date(process,draft.base)?!=date {return Err("Gra, klub lub data zmieniły się. Wstrzymaj FM i otwórz zasady ponownie.".into());}
    for guard in &draft.guards {
        if process.read_exact(guard.address,guard.bytes.len()).as_ref()!=Some(&guard.bytes) {return Err("FM przebudował zasady ligi. Otwórz je ponownie; zapis na starych adresach jest zablokowany.".into());}
    }
    Ok(())
}
pub(super) fn get_league_u22_editor(session_id:u64)->Result<LeagueU22Snapshot,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let (process,cache)=league_quota_context(session_id,false)?;
    let (draft,minimum,competition)=league_resolve_quota(&process,&cache)?;
    let mut state=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?;
    state.drafts.retain(|_,draft|draft.opened.elapsed().as_secs()<300);
    if state.drafts.len()>=8 {state.drafts.clear();}
    let undo_token=state.undos.iter().find(|(_,saved)|saved.session_id==session_id&&saved.club_uid==draft.club_uid&&saved.patches.iter().all(|patch|process.read_exact(patch.address,patch.after.len()).as_ref()==Some(&patch.after))&&league_verify_quota(&process,&cache,saved,draft.game_date).is_ok()).map(|(token,_)|token.clone());
    let token=(minimum==3).then(editor_token);
    let result=LeagueU22Snapshot {session_id,club:cache.database.managed_team.clone().unwrap_or_default(),competition,game_date:format_fm_date(draft.game_date).ok_or("Nieprawidłowa data gry.")?,minimum,record_count:draft.patches.len(),token:token.clone(),undo_token};
    if let Some(token)=token {state.drafts.insert(token,draft);}
    Ok(result)
}
fn league_write_quota(process:&RemoteProcess,cache:&RefreshSession,draft:&LeagueQuotaDraft,date:u32)->Result<(),String> {
    let verify_values=|completed:usize|->Result<(),String>{
        league_verify_quota(process,cache,draft,date)?;
        for (index,patch) in draft.patches.iter().enumerate() {
            let expected=if index<completed {&patch.after}else{&patch.before};
            if process.read_exact(patch.address,expected.len()).as_ref()!=Some(expected) {return Err("FM zmienił limit U22 podczas edycji. Ponów odczyt zasad.".into());}
        } Ok(())
    };
    verify_values(0)?;
    let mut failure=None;
    for (index,patch) in draft.patches.iter().enumerate() {
        if let Err(error)=verify_values(index).and_then(|_|process.write_exact(patch.address,&patch.after)) {failure=Some((index,error));break;}
    }
    if failure.is_none() {if let Err(error)=verify_values(draft.patches.len()) {failure=Some((draft.patches.len()-1,error));}}
    if let Some((last,error))=failure {
        let mut unreverted=0;
        for patch in draft.patches[..=last].iter().rev() {
            if process.read_exact(patch.address,patch.before.len()).as_ref()==Some(&patch.before) {continue;}
            if league_verify_quota(process,cache,draft,date).is_err()||process.read_exact(patch.address,patch.after.len()).as_ref()!=Some(&patch.after)||process.write_exact(patch.address,&patch.before).is_err() {unreverted+=1;}
        }
        return Err(if unreverted==0 {format!("{error} Przywrócono wcześniejsze limity.")}else{format!("Niepełny zapis: {error} Nie potwierdzono przywrócenia {unreverted} pól. Sprawdź zasady w FM przed zapisaniem kariery.")});
    }
    Ok(())
}
pub(super) fn disable_league_u22(token:String)->Result<LeagueU22Result,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let draft=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?.drafts.remove(&token).ok_or("Podgląd wygasł. Odczytaj zasady ponownie.")?;
    if draft.opened.elapsed().as_secs()>300 {return Err("Podgląd wygasł. Odczytaj zasady ponownie.".into());}
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    league_write_quota(&process,&cache,&draft,draft.game_date)?;
    let record_count=draft.patches.len();let session_id=draft.session_id;
    let undo_token=editor_token();let mut state=league_quota_state().lock().map_err(|_|"Zapisano limit, ale nie można przygotować cofnięcia.")?;
    if state.undos.len()>=8 {state.undos.clear();}state.undos.insert(undo_token.clone(),draft);
    Ok(LeagueU22Result {session_id,before:3,after:0,record_count,undo_token:Some(undo_token)})
}
pub(super) fn undo_league_u22(token:String)->Result<LeagueU22Result,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let mut draft=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?.undos.remove(&token).ok_or("Brak zachowanego limitu do przywrócenia w tej sesji aplikacji.")?;
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    let date=league_live_date(&process,draft.base)?;
    for patch in &mut draft.patches {std::mem::swap(&mut patch.before,&mut patch.after);}
    league_write_quota(&process,&cache,&draft,date)?;
    Ok(LeagueU22Result {session_id:draft.session_id,before:0,after:3,record_count:draft.patches.len(),undo_token:None})
}
