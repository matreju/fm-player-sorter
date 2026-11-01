// Included inside windows_reader. Exact-build, owned-record scalar editing only.
// No heap scan, game function calls, code patches, allocation or player writes.
use crate::fm_league::{LeagueU22Snapshot,LeagueU22Result,LeagueCompetitionList,LeagueCompetitionView,LeaguePhaseView,LeagueRuleView};

#[derive(Clone)]
struct LeagueGuard {address:usize,bytes:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaPatch {address:usize,before:Vec<u8>,after:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaDraft {
    session_id:u64,pid:u32,created:u64,team:usize,club_uid:u32,base:usize,
    game_date:u32,shared_default:bool,persistent:bool,competition_uid:u32,phase_id:String,guards:Vec<LeagueGuard>,patches:Vec<LeagueQuotaPatch>,opened:Instant,
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
    if !verified_fm27(&process) {return Err("Edycja zasad rozgrywek wymaga rozpoznanego wydania FM27.".into());}
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
    league_vector_entries(process,guards,address,limit,false)
}
fn league_vector_entries(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,address:usize,limit:usize,allow_null:bool)->Result<Vec<usize>,String> {
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
        if pointer==0&&allow_null {continue;}
        if pointer<0x10_000||pointer>=0x0000_8000_0000_0000||pointer%8!=0 {return Err("Niekompletna lista reguł ligi.".into());}
        result.push(pointer);
    }
    Ok(result)
}
fn league_rule_records(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,collection:usize)->Result<Vec<(usize,Vec<u8>)>,String> {
    let pointers=league_vector_entries(process,guards,collection,128,true)?;
    if pointers.is_empty() {return Err("Brak rozpoznanych reguł wyboru kadry.".into());}
    let mut records=Vec::new();
    let mut unique=HashSet::new();
    for pointer in pointers {
        if !unique.insert(pointer) {return Err("Lista reguł zawiera współdzielone wpisy. Zapis zablokowany.".into());}
        let bytes=process.read_exact(pointer,32).ok_or("Nie można odczytać pełnej reguły wyboru kadry.")?;
        // Count is the only writable field; type, mode and expressions are guards.
        guards.push(LeagueGuard {address:pointer,bytes:bytes[..0x18].to_vec()});
        guards.push(LeagueGuard {address:pointer+0x1C,bytes:bytes[0x1C..].to_vec()});
        guards.push(LeagueGuard {address:pointer+0x18,bytes:bytes[0x18..0x1C].to_vec()});
        records.push((pointer,bytes));
    }
    Ok(records)
}

#[derive(Clone)]
struct LeaguePhaseRoute {id:String,label:String,stage:usize,index_address:Option<usize>}
fn league_object_type(process:&RemoteProcess,base:usize,pointer:usize)->Option<String> {
    if pointer<0x10_000||pointer>=0x0000_8000_0000_0000||pointer%8!=0{return None;}
    league_native_type(process,base,process.read_ptr(pointer)?)
}
fn league_memberships(process:&RemoteProcess,cache:&RefreshSession,guards:&mut Vec<LeagueGuard>)->Result<(Vec<(u32,usize,String)>,Vec<String>),String> {
    let mut pointers=Vec::new();let mut warnings=Vec::new();
    for offset in TEAM_COMPETITION {
        if let Some(pointer)=process.read_ptr(cache.team+offset).filter(|p|*p>=0x10_000) {
            league_capture(process,guards,cache.team+offset,8)?;pointers.push(pointer);
        }
    }
    // db::TEAM::set_comp_stats (0x11EAFCF): TEAM +A0 in-game data,
    // vector +50/+58/+60 of 24-byte {COMP*, stats*, category} entries.
    let extra=league_pointer(process,guards,cache.team+0xA0)?;
    let header=league_capture(process,guards,extra+0x50,24)?;
    let begin=read_u64(&header,0).unwrap_or(0) as usize;
    let end=read_u64(&header,8).unwrap_or(0) as usize;
    let capacity=read_u64(&header,16).unwrap_or(0) as usize;
    if begin==0&&end==0&&capacity==0 {} else if begin>=0x10_000&&begin%8==0&&end>=begin&&(end-begin)%24==0&&end-begin<=256*24&&capacity>=end {
        for record in league_capture(process,guards,begin,end-begin)?.chunks_exact(24) {
            let pointer=read_u64(record,0).unwrap_or(0) as usize;if pointer>=0x10_000 {pointers.push(pointer);}
        }
    } else {warnings.push("Nie udało się odczytać pełnej listy rozgrywek z danych drużyny. Lista może być niepełna.".into());}
    let mut result=Vec::new();let mut ids=HashSet::new();
    for mut pointer in pointers {
        if league_object_type(process,cache.plugin_base,pointer).as_deref()==Some(".?AVACTUAL_COMP@sicomps@@") {
            league_type(process,guards,cache.plugin_base,pointer,".?AVACTUAL_COMP@sicomps@@")?;
            pointer=league_pointer(process,guards,pointer+0x120)?;
        }
        if league_object_type(process,cache.plugin_base,pointer).as_deref()!=Some(".?AVCOMP@db@@") {continue;}
        let Some(uid)=process.read_u32(pointer+OBJ_UID).filter(|uid|*uid>0&&*uid<i32::MAX as u32) else {continue;};
        if !ids.insert(uid){continue;}
        let Some(name)=process.indirect_string(pointer+COMPETITION_NAME).filter(|name|plausible_label(name,96)) else {continue;};
        league_type(process,guards,cache.plugin_base,pointer,".?AVCOMP@db@@")?;
        league_capture(process,guards,pointer+OBJ_UID,4)?;
        result.push((uid,pointer,name));
    }
    if result.is_empty(){return Err("FM nie udostępnił rozgrywek prowadzonej drużyny.".into());}
    Ok((result,warnings))
}
fn league_actual(process:&RemoteProcess,base:usize,competition:usize,guards:&mut Vec<LeagueGuard>)->Result<usize,String> {
    let actual=league_pointer(process,guards,competition+0xB0)?;
    league_type(process,guards,base,actual,".?AVACTUAL_COMP@sicomps@@")?;
    if league_pointer(process,guards,actual+0x120)?!=competition {return Err("Nie potwierdzono bieżącego sezonu rozgrywek.".into());}Ok(actual)
}
fn league_phase_routes(process:&RemoteProcess,base:usize,competition:usize,actual:usize,guards:&mut Vec<LeagueGuard>)->Result<Vec<LeaguePhaseRoute>,String> {
    let stages=league_vector(process,guards,actual+0x1C0,64)?;let mut routes=Vec::new();
    for (i,stage) in stages.into_iter().enumerate() {
        let kind=league_object_type(process,base,stage).unwrap_or_default();
        league_capture(process,guards,stage,8)?;
        if league_pointer(process,guards,stage+0x70)?!=competition {return Err("Nie potwierdzono powiązania fazy z rozgrywkami.".into());}
        match kind.as_str() {
            ".?AVLEAGUE_STAGE@sicomps@@"|".?AVSUB_LEAGUE_STAGE@sicomps@@"=>{
                let settings=league_pointer(process,guards,stage+0xF0)?;
                league_type(process,guards,base,settings,".?AVLEAGUE_SETTINGS@sicomps@@")?;
                routes.push(LeaguePhaseRoute{id:format!("s{i}"),label:format!("Faza ligowa {}",i+1),stage,index_address:Some(settings+0x175)});
            },
            ".?AVCUP_STAGE@sicomps@@"=>{
                // Native virtual +360 -> 0x200D9D0: CUP_SETTINGS +58 rounds,
                // then 0x1273366 reads the round's fixture-rule index +137.
                let settings=league_pointer(process,guards,stage+0x90)?;
                league_type(process,guards,base,settings,".?AVCUP_SETTINGS@sicomps@@")?;
                for (r,round) in league_vector(process,guards,settings+0x58,64)?.into_iter().enumerate() {
                    routes.push(LeaguePhaseRoute{id:format!("s{i}r{r}"),label:format!("Faza pucharowa {} · runda {}",i+1,r+1),stage,index_address:Some(round+0x137)});
                }
            },
            ".?AVGROUP_STAGE@sicomps@@"=>{
                // GROUP_STAGE's native +378 is the +D0 vector size. Each child
                // is validated separately; never substitute the first group's rules.
                for (g,group) in league_vector(process,guards,stage+0xD0,64)?.into_iter().enumerate() {
                    if !matches!(league_object_type(process,base,group).as_deref(),Some(".?AVLEAGUE_STAGE@sicomps@@")|Some(".?AVSUB_LEAGUE_STAGE@sicomps@@")){continue;}
                    league_capture(process,guards,group,8)?;
                    if league_pointer(process,guards,group+0x70)?!=competition {continue;}
                    let settings=league_pointer(process,guards,group+0xF0)?;
                    league_type(process,guards,base,settings,".?AVLEAGUE_SETTINGS@sicomps@@")?;
                    routes.push(LeaguePhaseRoute{id:format!("s{i}g{g}"),label:format!("Faza grupowa {} · grupa {}",i+1,g+1),stage:group,index_address:Some(settings+0x175)});
                }
            },
            ".?AVCUP_GROUP_STAGE@sicomps@@"=>routes.push(LeaguePhaseRoute{id:format!("s{i}"),label:format!("Faza grupowa {}",i+1),stage,index_address:None}),
            _=>{},
        }
    }
    Ok(routes)
}
pub(super) fn get_league_competitions(session_id:u64)->Result<LeagueCompetitionList,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let (process,cache)=league_quota_context(session_id,false)?;let mut guards=Vec::new();
    let (memberships,warnings)=league_memberships(&process,&cache,&mut guards)?;
    let mut competitions=Vec::new();
    for (uid,pointer,name) in memberships {
        let phases=league_actual(&process,cache.plugin_base,pointer,&mut guards).and_then(|actual|league_phase_routes(&process,cache.plugin_base,pointer,actual,&mut guards));
        let (phases,message)=match phases {
            Ok(routes) if !routes.is_empty()=>(routes.into_iter().map(|r|LeaguePhaseView{id:r.id,label:r.label}).collect(),None),
            Ok(_)=>(Vec::new(),Some("Nie rozpoznano jeszcze ustawień faz tych rozgrywek.".into())),
            Err(error)=>(Vec::new(),Some(error)),
        };
        competitions.push(LeagueCompetitionView{uid,name,phases,message});
    }
    Ok(LeagueCompetitionList{session_id,club:cache.database.managed_team.clone().unwrap_or_default(),competitions,warnings})
}
fn league_rule_label(kind:u16)->Option<&'static str> {
    Some(match kind {
        0x10=>"Zawodnicy U21 w kadrze meczowej",0x16=>"Zawodnicy U22 w kadrze meczowej",0x17=>"Zawodnicy U23 w kadrze meczowej",
        0x20=>"Zawodnicy U18 w kadrze meczowej",0x61=>"Zawodnicy U19 w kadrze meczowej",0x44=>"Zawodnicy U20 w kadrze meczowej",
        0x11=>"Zawodnicy powyżej 21 lat w kadrze meczowej",0x93=>"Zawodnicy powyżej 22 lat w kadrze meczowej",
        0x58=>"Wychowankowie klubu (0–21 lat) w kadrze meczowej",0x59=>"Wychowankowie kraju (0–21 lat) w kadrze meczowej",
        0xD6=>"Wychowankowie klubu (15–21 lat) w kadrze meczowej",0xD7=>"Wychowankowie kraju (15–21 lat) w kadrze meczowej",
        0x4=>"Obcokrajowcy w kadrze meczowej",0x3=>"Obcokrajowcy na ławce",0x2=>"Obcokrajowcy w jedenastce",0x15=>"Obcokrajowcy w kadrze",
        0x7=>"Zawodnicy spoza UE w kadrze meczowej",0x5A=>"Bramkarze w kadrze meczowej",0x3E=>"Wypożyczeni w kadrze meczowej",
        0xCF=>"Wypożyczeni z jednego klubu w kadrze meczowej",0x9=>"Wielkość kadry — maksimum",0xA5=>"Wielkość kadry — minimum",
        _=>return None,
    })
}
fn league_source_match(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,fixture:usize,current:usize,records:&[(usize,Vec<u8>)])->Result<Vec<(usize,Vec<u8>)>,String> {
    let flags=league_capture(process,guards,current+0x18,8)?;
    let definitions=league_vector(process,guards,fixture+0x18,128)?;let total=definitions.len();
    let mut unique=HashSet::new();let mut matches=Vec::new();let mut eligible=0;
    let signature=|rows:&[(usize,Vec<u8>)]|{let mut values=rows.iter().map(|(_,bytes)|bytes.clone()).collect::<Vec<_>>();values.sort();values};
    let expected=signature(records);
    for definition in definitions {
        let metadata=league_capture(process,guards,definition+8,0x10)?;
        if metadata[8]&0x80!=0||metadata[8]&0x20==0 {continue;}
        eligible+=1;let collection=league_pointer(process,guards,definition)?;
        if !unique.insert(collection){continue;}
        let rows=league_rule_records(process,guards,collection)?;
        if signature(&rows)==expected&&league_capture(process,guards,collection+0x18,8)?==flags {matches.push(rows);}
    }
    if matches.len()!=1 {return Err(format!("Dopasowane definicje: {}; sprawdzone: {eligible}/{total}. Nie wybrano definicji źródłowej — zapis obejmie tylko aktywną kopię.",matches.len()));}
    Ok(matches.remove(0))
}
pub(super) fn get_league_u22_editor(session_id:u64,competition_uid:u32,phase_id:String)->Result<LeagueU22Snapshot,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let (process,cache)=league_quota_context(session_id,false)?;let base=cache.plugin_base;let mut guards=Vec::new();
    let (memberships,mut warnings)=league_memberships(&process,&cache,&mut guards)?;
    let (_,competition,name)=memberships.into_iter().find(|(uid,_,_)|*uid==competition_uid).ok_or("Te rozgrywki nie znajdują się już na liście prowadzonej drużyny. Odśwież listę.")?;
    let actual=league_actual(&process,base,competition,&mut guards)?;
    let route=league_phase_routes(&process,base,competition,actual,&mut guards)?.into_iter().find(|r|r.id==phase_id).ok_or("Faza rozgrywek zmieniła się lub nie ma potwierdzonego układu. Odśwież listę.")?;
    let _stage=route.stage;
    let setting_index=if let Some(address)=route.index_address {league_capture(&process,&mut guards,address,1)?[0]}else{0xFF};
    let default_index=league_capture(&process,&mut guards,actual+0x31,1)?[0];
    let index=if setting_index==0xFF {default_index}else{setting_index} as usize;
    if index>=128 {return Err("FM nie udostępnia teraz indeksu zasad tej fazy.".into());}
    let owner=league_pointer(&process,&mut guards,actual+0x370)?;
    let container=league_pointer(&process,&mut guards,owner+0x1E0)?;
    let fixtures=league_vector(&process,&mut guards,container+0x60,128)?;
    let root=*fixtures.get(index).ok_or("Brak zasad przypisanych do wybranej fazy.")?;
    let mut candidates=vec![(root,"Zasady główne")];
    let child=read_u64(&league_capture(&process,&mut guards,root+0x68,8)?,0).unwrap_or(0) as usize;
    if child!=0 {
        if child<0x10_000||child%8!=0||child==root||read_u64(&league_capture(&process,&mut guards,child+0x68,8)?,0)!=Some(0) {return Err("Nie potwierdzono wariantu zasad meczu.".into());}
        candidates.push((child,"Wariant meczu"));
    }
    let date=league_live_date(&process,base)?;let mut rules=Vec::new();let mut drafts=Vec::new();let mut shared_default=false;
    for (fixture,variant) in candidates {
        let uid=read_u32(&league_capture(&process,&mut guards,fixture+0x108,4)?,0).ok_or("Nie odczytano właściciela zasad.")?;
        if uid!=competition_uid&&uid!=u32::MAX {warnings.push(format!("{variant}: właściciel {} nie odpowiada wybranym rozgrywkom. Ten wariant pominięto.",uid as i32));continue;}
        let shared=uid==u32::MAX;shared_default|=shared;
        let current_bytes=league_capture(&process,&mut guards,fixture+0x70,8)?;
        if read_u64(&current_bytes,0)==Some(0){continue;}
        let current=league_pointer(&process,&mut guards,fixture+0x70)?;
        let records=league_rule_records(&process,&mut guards,current)?;
        let mut local_guards=guards.clone();
        let source=league_source_match(&process,&mut local_guards,fixture,current,&records);
        for (n,(pointer,bytes)) in records.iter().enumerate() {
            let kind=read_u16(bytes,0x1C).unwrap_or(u16::MAX);let mode=bytes[0x1E];let value=read_u32(bytes,0x18).unwrap_or(u32::MAX);
            let known=league_rule_label(kind);let label=known.map(str::to_owned).unwrap_or_else(||format!("Inna reguła FM (typ {kind})"));
            let allowed=known.is_some()&&matches!(mode,1|2|255)&&value<=99;
            let mut patches=vec![LeagueQuotaPatch{address:pointer+0x18,before:bytes[0x18..0x1C].to_vec(),after:bytes[0x18..0x1C].to_vec()}];
            let mut persistent=false;let mut note=None;
            if allowed {
                match &source {
                    Ok(rows)=>{
                        let matching=rows.iter().filter(|(_,candidate)|candidate==bytes).collect::<Vec<_>>();
                        if matching.len()==1 {
                            let address=matching[0].0+0x18;
                            if address!=pointer+0x18 {patches.push(LeagueQuotaPatch{address,before:bytes[0x18..0x1C].to_vec(),after:bytes[0x18..0x1C].to_vec()});}
                            persistent=true;
                        }else{note=Some("Źródło ma powtórzone wpisy. Zmiana obejmie tylko aktywną kopię.".into());}
                    },
                    Err(error)=>note=Some(error.clone()),
                }
            }else{note=Some("Ten typ, wariant lub zakres wartości nie ma jeszcze potwierdzonej obsługi zapisu.".into());}
            let id=format!("{}-{n}",if fixture==root {"root"}else{"match"});
            let token=if allowed {
                let mut protected=if persistent {local_guards.clone()}else{guards.clone()};
                protected.retain(|guard|!patches.iter().any(|patch|guard.address==patch.address&&guard.bytes.len()==4));
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,club_uid:cache.database.managed_club_uid.ok_or("Nie potwierdzono klubu.")?,base,game_date:date,shared_default:shared,persistent,competition_uid,phase_id:phase_id.clone(),guards:protected,patches,opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();drafts.push((token.clone(),draft));Some(token)
            }else{None};
            rules.push(LeagueRuleView{id,label:format!("{label} · {variant}"),value,mode:match mode {1|2=>"Minimum",255=>"Maksimum",_=>"Inny wariant"}.into(),token,persistent,note});
        }
    }
    if rules.is_empty(){warnings.push("FM nie udostępnił reguł wyboru kadry dla tej fazy. Pozostałe przepisy, np. punkty lub dogrywka, nie mają jeszcze obsługi w edytorze.".into());}
    let mut state=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?;
    state.drafts.retain(|_,draft|draft.session_id!=session_id&&draft.opened.elapsed().as_secs()<300);
    if state.drafts.len()+drafts.len()>512 {state.drafts.clear();}
    let undo_token=state.undos.iter().filter(|(_,saved)|saved.session_id==session_id&&saved.competition_uid==competition_uid&&saved.phase_id==phase_id&&saved.patches.iter().all(|patch|process.read_exact(patch.address,patch.after.len()).as_ref()==Some(&patch.after))&&league_verify_quota(&process,&cache,saved,date).is_ok()).max_by_key(|(_,saved)|saved.opened).map(|(token,_)|token.clone());
    for (token,draft) in drafts {state.drafts.insert(token,draft);}
    Ok(LeagueU22Snapshot{session_id,club:cache.database.managed_team.clone().unwrap_or_default(),competition:name,competition_uid,phase_id,game_date:format_fm_date(date).ok_or("Nie odczytano daty gry.")?,shared_default,rules,undo_token,warnings})
}
fn league_verify_quota(process:&RemoteProcess,cache:&RefreshSession,draft:&LeagueQuotaDraft,date:u32)->Result<(),String> {
    refresh_identity_check(process,cache)?;
    if cache.database.session_id!=draft.session_id||cache.database.pid!=draft.pid||cache.team!=draft.team||cache.plugin_base!=draft.base||cache.database.managed_club_uid!=Some(draft.club_uid)||process.creation_time()!=Some(draft.created)||league_live_date(process,draft.base)?!=date {return Err("Gra, klub lub data zmieniły się. Wstrzymaj FM i otwórz zasady ponownie.".into());}
    for guard in &draft.guards {
        if process.read_exact(guard.address,guard.bytes.len()).as_ref()!=Some(&guard.bytes) {return Err("FM przebudował zasady ligi. Otwórz je ponownie; zapis na starych adresach jest zablokowany.".into());}
    }
    Ok(())
}
fn league_write_quota(process:&RemoteProcess,cache:&RefreshSession,draft:&LeagueQuotaDraft,date:u32)->Result<(),String> {
    let verify_values=|completed:usize|->Result<(),String>{
        league_verify_quota(process,cache,draft,date)?;
        for (index,patch) in draft.patches.iter().enumerate() {
            let expected=if index<completed {&patch.after}else{&patch.before};
            if process.read_exact(patch.address,expected.len()).as_ref()!=Some(expected) {return Err("FM zmienił limit reguły podczas edycji. Ponów odczyt zasad.".into());}
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

pub(super) fn disable_league_u22(token:String,value:u32,accept_shared_default:bool)->Result<LeagueU22Result,String> {
    if value>99 {return Err("Limit liczby zawodników musi mieścić się w zakresie 0–99.".into());}
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let mut draft={
        let mut state=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?;
        let preview=state.drafts.get(&token).ok_or("Podgląd wygasł. Odczytaj zasady ponownie.")?;
        if preview.shared_default&&!accept_shared_default {return Err("Domyślne zasady mogą być współdzielone. Zaznacz ten zakres w podglądzie. Niczego nie zmieniono.".into());}
        state.drafts.remove(&token).ok_or("Podgląd wygasł. Odczytaj zasady ponownie.")?
    };
    if draft.opened.elapsed().as_secs()>300 {return Err("Podgląd wygasł. Odczytaj zasady ponownie.".into());}
    let before=read_u32(&draft.patches[0].before,0).ok_or("Nie odczytano poprzedniego limitu.")?;
    if before==value {return Err("Wpisany limit jest już ustawiony w FM.".into());}
    for patch in &mut draft.patches {patch.after=value.to_le_bytes().to_vec();}
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    league_write_quota(&process,&cache,&draft,draft.game_date)?;
    draft.opened=Instant::now();
    let result=LeagueU22Result{session_id:draft.session_id,shared_default:draft.shared_default,persistent:draft.persistent,before,after:value,record_count:draft.patches.len(),undo_token:Some(editor_token())};
    let mut state=league_quota_state().lock().map_err(|_|"Zapisano limit, ale nie można przygotować cofnięcia.")?;
    if state.undos.len()>=8 {state.undos.clear();}
    if let Some(token)=&result.undo_token {state.undos.insert(token.clone(),draft);}Ok(result)
}
pub(super) fn undo_league_u22(token:String)->Result<LeagueU22Result,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let mut draft=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?.undos.remove(&token).ok_or("Nie zachowano tej zmiany do cofnięcia w bieżącej sesji aplikacji.")?;
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    let date=league_live_date(&process,draft.base)?;
    let before=read_u32(&draft.patches[0].after,0).ok_or("Nie odczytano limitu.")?;
    let after=read_u32(&draft.patches[0].before,0).ok_or("Nie odczytano poprzedniego limitu.")?;
    for patch in &mut draft.patches {std::mem::swap(&mut patch.before,&mut patch.after);}
    league_write_quota(&process,&cache,&draft,date)?;
    Ok(LeagueU22Result{session_id:draft.session_id,shared_default:draft.shared_default,persistent:draft.persistent,before,after,record_count:draft.patches.len(),undo_token:None})
}
