// Included inside windows_reader. Exact-build, owned-record scalar editing only.
// No heap scan, game function calls, code patches, allocation or player writes.
use crate::fm_league::{LeagueU22Snapshot,LeagueU22Result,LeagueCompetitionList,LeagueCompetitionView,LeaguePhaseView,LeagueRuleView};

#[derive(Clone)]
struct LeagueGuard {address:usize,bytes:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaPatch {address:usize,before:Vec<u8>,after:Vec<u8>}
#[derive(Clone)]
struct LeagueQuotaDraft {
    session_id:u64,pid:u32,created:u64,team:usize,owner_uid:u32,base:usize,
    game_date:u32,shared_default:bool,persistent:bool,code_patch:bool,competition_uid:u32,phase_id:String,guards:Vec<LeagueGuard>,patches:Vec<LeagueQuotaPatch>,opened:Instant,
}
#[derive(Default)]
struct LeagueQuotaState {drafts:HashMap<String,LeagueQuotaDraft>,undos:HashMap<String,LeagueQuotaDraft>}
static LEAGUE_QUOTA_STATE:OnceLock<Mutex<LeagueQuotaState>>=OnceLock::new();
const FRIENDLY_COMPETITION_UID:u32=u32::MAX-1;
const FRIENDLY_PHASE_ID:&str="national-friendlies";
fn league_quota_state()->&'static Mutex<LeagueQuotaState> {LEAGUE_QUOTA_STATE.get_or_init(||Mutex::new(LeagueQuotaState::default()))}

#[derive(Clone,Copy)]
struct LeagueCodeRvas {
    default_max:[usize;2],
    preliminary_default:Option<usize>,
    preliminary_redirect:Option<(usize,usize)>,
}
fn league_code_rvas(profile:Option<&str>)->LeagueCodeRvas {
    if profile==Some(FM27_PLUGIN_2026_11_25) {
        LeagueCodeRvas {
            default_max:[0x12E7023,0x12E702B],
            preliminary_default:Some(0x45EAD54),
            preliminary_redirect:None,
        }
    }else if profile==Some(FM27_PLUGIN_2026_11_17) {
        // 2026-11-17 moved the two inherited max-squad immediates and changed
        // get_max_prelim_squad_size into a small property lookup with an inline
        // fallback. Patch the three one-byte defaults together.
        LeagueCodeRvas {
            default_max:[0x12E6BC3,0x12E6BCB],
            preliminary_default:Some(0x45EB564),
            preliminary_redirect:None,
        }
    }else{
        LeagueCodeRvas {
            default_max:[0x129E293,0x129E29B],
            preliminary_default:None,
            preliminary_redirect:Some((0x129E530,0x129E240)),
        }
    }
}
fn league_default_max_addresses(process:&RemoteProcess,base:usize)->[usize;2] {
    let rvas=league_code_rvas(process.native_plugin_profile_id.as_deref()).default_max;
    [base+rvas[0],base+rvas[1]]
}

#[cfg(test)]
mod league_code_tests {
    use super::*;

    #[test]
    fn november_25_profile_uses_its_own_callup_defaults() {
        let code=league_code_rvas(Some(FM27_PLUGIN_2026_11_25));
        assert_eq!(code.default_max,[0x12E7023,0x12E702B]);
        assert_eq!(code.preliminary_default,Some(0x45EAD54));
        assert!(code.preliminary_redirect.is_none());
    }

    #[test]
    fn november_17_profile_uses_relocated_callup_defaults() {
        let code=league_code_rvas(Some(FM27_PLUGIN_2026_11_17));
        assert_eq!(code.default_max,[0x12E6BC3,0x12E6BCB]);
        assert_eq!(code.preliminary_default,Some(0x45EB564));
        assert!(code.preliminary_redirect.is_none());
    }

    #[test]
    fn earlier_profiles_keep_the_validated_redirect_layout() {
        let code=league_code_rvas(Some(FM27_PLUGIN_2503222));
        assert_eq!(code.default_max,[0x129E293,0x129E29B]);
        assert_eq!(code.preliminary_redirect,Some((0x129E530,0x129E240)));
        assert!(code.preliminary_default.is_none());
    }
}

fn league_quota_context(session_id:u64,write:bool)->Result<(RemoteProcess,RefreshSession),String> {
    let cache=refresh_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Najpierw połącz aplikację z grą.")?;
    if cache.database.session_id!=session_id {return Err("Połącz aplikację z prowadzoną drużyną i otwórz zasady rozgrywek ponownie.".into());}
    let source=scouting_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Połącz aplikację z grą.")?;
    if source.session_id!=session_id||source.pid!=cache.database.pid {return Err("Dane gry zmieniły się. Otwórz zasady ponownie.".into());}
    if detect_football_manager().pid!=Some(cache.database.pid) {return Err("Zmienił się proces FM. Połącz aplikację ponownie.".into());}
    let mut process=if write {RemoteProcess::open_editor(cache.database.pid)?}else{RemoteProcess::open(cache.database.pid)?};
    process.layout=source.layout;process.native_plugin_profile_id=cache.native_plugin_profile_id.clone();
    if !league_compatible_fm27(&process) {return Err(native_compatibility_error(&process));}
    refresh_identity_check(&process,&cache)?;
    Ok((process,cache))
}
fn league_live_date(process:&RemoteProcess,cache:&RefreshSession)->Result<u32,String> {
    if let Some(shift)=native_plugin_shift(process) {
        return process.read_u32(cache.plugin_base+0x56AD378+shift).filter(|date|decode_fm_date(*date).is_some()).map(normalize_fm_date).ok_or_else(||"Nie potwierdzono aktualnej daty FM.".into());
    }
    if league_compatible_fm27(process) {
        let schedule=process.read_ptr(cache.team+TEAM_SCHEDULE).ok_or("Nie odczytano terminarza prowadzonej drużyny.")?;
        for offset in SCHEDULE_DATE {
            if let Some(raw)=process.read_u32(schedule+offset).filter(|raw|decode_fm_date(*raw).is_some()) {
                return Ok(normalize_fm_date(raw));
            }
        }
    }
    Err("Nie potwierdzono daty kontrolnej FM dla zasad rozgrywek.".into())
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
// Stage vectors can temporarily keep empty or stale slots while FM rebuilds a
// competition cycle. They are safe to ignore, but must retain their original
// index because that index is part of the phase route used by the editor.
fn league_vector_slots(process:&RemoteProcess,guards:&mut Vec<LeagueGuard>,address:usize,limit:usize)->Result<Vec<Option<usize>>,String> {
    let bytes=league_capture(process,guards,address,24)?;
    let begin=read_u64(&bytes,0).unwrap_or(0) as usize;
    let end=read_u64(&bytes,8).unwrap_or(0) as usize;
    let capacity=read_u64(&bytes,16).unwrap_or(0) as usize;
    if begin==0&&end==0&&capacity==0 {return Ok(Vec::new());}
    if begin<0x10_000||begin%8!=0||end<begin||(end-begin)%8!=0||end-begin>limit*8||capacity<end {return Err("Nie potwierdzono listy faz rozgrywek.".into());}
    if end==begin {return Ok(Vec::new());}
    let pointers=league_capture(process,guards,begin,end-begin)?;
    Ok(pointers.chunks_exact(8).map(|chunk|{
        let pointer=u64::from_le_bytes(chunk.try_into().unwrap_or([0;8])) as usize;
        (pointer>=0x10_000&&pointer<0x0000_8000_0000_0000&&pointer%8==0).then_some(pointer)
    }).collect())
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
    let stages=league_vector_slots(process,guards,actual+0x1C0,64)?;let mut routes=Vec::new();
    for (i,stage) in stages.into_iter().enumerate() {
        let Some(stage)=stage else {continue;};
        let kind=league_object_type(process,base,stage).unwrap_or_default();
        if !matches!(kind.as_str(),".?AVLEAGUE_STAGE@sicomps@@"|".?AVSUB_LEAGUE_STAGE@sicomps@@"|".?AVCUP_STAGE@sicomps@@"|".?AVGROUP_STAGE@sicomps@@"|".?AVCUP_GROUP_STAGE@sicomps@@"){continue;}
        league_capture(process,guards,stage,8)?;
        let Ok(stage_competition)=league_pointer(process,guards,stage+0x70) else {continue;};
        if stage_competition!=competition {continue;}
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
                for (r,round) in league_vector_slots(process,guards,settings+0x58,64)?.into_iter().enumerate() {
                    let Some(round)=round else {continue;};
                    routes.push(LeaguePhaseRoute{id:format!("s{i}r{r}"),label:format!("Faza pucharowa {} · runda {}",i+1,r+1),stage,index_address:Some(round+0x137)});
                }
            },
            ".?AVGROUP_STAGE@sicomps@@"=>{
                // GROUP_STAGE's native +378 is the +D0 vector size. Each child
                // is validated separately; never substitute the first group's rules.
                for (g,group) in league_vector_slots(process,guards,stage+0xD0,64)?.into_iter().enumerate() {
                    let Some(group)=group else {continue;};
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
    if cache.database.managed_nation_uid.is_some() {
        competitions.push(LeagueCompetitionView{
            uid:FRIENDLY_COMPETITION_UID,
            name:"Mecze towarzyskie".into(),
            phases:vec![LeaguePhaseView{id:FRIENDLY_PHASE_ID.into(),label:"Mecze towarzyskie reprezentacji".into()}],
            message:None,
        });
    }
    Ok(LeagueCompetitionList{session_id,club:cache.database.managed_team.clone().unwrap_or_default(),competitions,warnings})
}
fn league_rule_label(kind:u16)->Option<&'static str> {
    Some(match kind {
        0x10=>"Zawodnicy U21 w kadrze meczowej",0x16=>"Zawodnicy U22 w kadrze meczowej",0x17=>"Zawodnicy U23 w kadrze meczowej",
        0x20=>"Zawodnicy U18 w kadrze meczowej",0x61=>"Zawodnicy U19 w kadrze meczowej",0x44=>"Zawodnicy U20 w kadrze meczowej",
        0x11=>"Zawodnicy powyżej 21 lat w kadrze meczowej",0x93=>"Zawodnicy powyżej 22 lat w kadrze meczowej",
        0x58=>"Wychowankowie klubu (0–21 lat) w kadrze meczowej",0x59=>"Wychowankowie kraju (0–21 lat) w kadrze meczowej",
        0x26=>"Wychowankowie klubu szkoleni między 15. a 21. rokiem życia",0x27=>"Wychowankowie kraju szkoleni między 15. a 21. rokiem życia",
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
    if competition_uid==FRIENDLY_COMPETITION_UID {
        if phase_id!=FRIENDLY_PHASE_ID||cache.database.managed_nation_uid.is_none() {return Err("Mecze towarzyskie nie są dostępne w bieżącym trybie drużyny.".into());}
        let date=league_live_date(&process,&cache)?;
        let addresses=league_default_max_addresses(&process,base);
        let values=addresses.iter().filter_map(|address|process.read_u8(*address)).collect::<Vec<_>>();
        if values.len()!=2||values[0]!=values[1]||values[0]>99 {return Err("Nie potwierdzono domyślnego limitu powołań FM dla meczów towarzyskich.".into());}
        let value=values[0] as u32;
        let patches=addresses.iter().map(|address|LeagueQuotaPatch{address:*address,before:vec![value as u8],after:vec![value as u8]}).collect::<Vec<_>>();
        for address in addresses {guards.push(LeagueGuard{address:address-2,bytes:process.read_exact(address-2,2).ok_or("Nie potwierdzono kodu limitu meczów towarzyskich.")?});}
        guards.retain(|guard|!patches.iter().any(|patch|guard.address==patch.address));
        let owner_uid=cache.database.managed_team_uid.ok_or("Nie potwierdzono prowadzonej reprezentacji.")?;
        let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:true,persistent:false,code_patch:true,competition_uid,phase_id:phase_id.clone(),guards,patches,opened:Instant::now()};
        league_verify_quota(&process,&cache,&draft,date)?;
        let token=editor_token();
        let mut state=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?;
        state.drafts.retain(|_,stored|stored.session_id!=session_id&&stored.opened.elapsed().as_secs()<300);
        let undo_token=state.undos.iter().filter(|(_,saved)|saved.session_id==session_id&&saved.competition_uid==competition_uid&&saved.phase_id==phase_id&&saved.patches.iter().all(|patch|process.read_exact(patch.address,patch.after.len()).as_ref()==Some(&patch.after))&&league_verify_quota(&process,&cache,saved,date).is_ok()).max_by_key(|(_,saved)|saved.opened).map(|(token,_)|token.clone());
        state.drafts.insert(token.clone(),draft);
        let rules=vec![LeagueRuleView{id:"friendly-callup-limit".into(),label:"Limit powołanych na mecze towarzyskie".into(),copies:2,value,mode:"Maksimum".into(),token:Some(token),persistent:false,note:Some("Mecze towarzyskie korzystają z domyślnego limitu silnika FM. Zmiana obejmie również inne rozgrywki, które nie mają własnego limitu powołań, i obowiązuje do zamknięcia gry.".into())}];
        return Ok(LeagueU22Snapshot{session_id,club:cache.database.managed_team.clone().unwrap_or_default(),competition:"Mecze towarzyskie".into(),competition_uid,phase_id,game_date:format_fm_date(date).ok_or("Nie odczytano daty gry.")?,shared_default:true,rules,undo_token,warnings:Vec::new()});
    }
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
    let date=league_live_date(&process,&cache)?;let mut rules=Vec::new();let mut rule_keys=Vec::new();let mut drafts=Vec::new();let mut shared_default=false;
    for &(fixture,variant) in &candidates {
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
                let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:shared,persistent,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches,opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();drafts.push((token.clone(),draft));Some(token)
            }else{None};
            rule_keys.push(bytes[..0x1F].to_vec());
            rules.push(LeagueRuleView{id,label,copies:1,value,mode:match mode {1|2=>"Minimum",255=>"Maksimum",_=>"Inny wariant"}.into(),token,persistent,note});
        }
    }
    // Root/child are native read paths, not user-facing rule categories.
    // Match quota, mode, type and all qualifiers. Serializer 0x49C4590
    // omits padding +1F; each original padding byte remains an immutable guard.
    let mut old_drafts=drafts.into_iter().collect::<HashMap<_,_>>();
    let mut group_index=HashMap::<Vec<u8>,usize>::new();
    let mut groups=Vec::<(LeagueRuleView,Vec<LeagueQuotaDraft>)>::new();
    for (mut row,key) in rules.into_iter().zip(rule_keys) {
        let draft=row.token.take().and_then(|token|old_drafts.remove(&token));
        if let Some(index)=group_index.get(&key).copied() {
            let (view,parts)=&mut groups[index];view.copies+=1;
            if let Some(note)=row.note {
                if let Some(existing)=&mut view.note {if !existing.contains(&note){existing.push('\n');existing.push_str(&note);}}else{view.note=Some(note);}
            }
            if let Some(draft)=draft {parts.push(draft);}
        }else{
            group_index.insert(key,groups.len());
            groups.push((row,draft.into_iter().collect()));
        }
    }
    let mut rules=Vec::new();let mut drafts=Vec::new();
    for (mut view,parts) in groups {
        if !parts.is_empty()&&parts.len()==view.copies {
            let persistent=parts.iter().all(|part|part.persistent);
            let mut merged=parts[0].clone();merged.shared_default=parts.iter().any(|part|part.shared_default);merged.persistent=persistent;
            // If any source is unresolved, edit all active copies only. Do not
            // silently persist half of a displayed rule's source definitions.
            merged.patches.clear();merged.guards=guards.clone();
            for part in &parts {
                if persistent {merged.guards.extend(part.guards.clone());}
                for patch in part.patches.iter().take(if persistent {usize::MAX}else{1}) {
                    if let Some(existing)=merged.patches.iter().find(|existing|existing.address==patch.address) {
                        if existing.before!=patch.before {return Err("Kopie reguły zmieniły się podczas odczytu. Odczytaj zasady ponownie.".into());}
                    }else{merged.patches.push(patch.clone());}
                }
            }
            merged.guards.retain(|guard|!merged.patches.iter().any(|patch|guard.address==patch.address&&guard.bytes.len()==4));
            view.persistent=persistent;
            if merged.patches.len()<=8 {
                league_verify_quota(&process,&cache,&merged,date)?;
                let token=editor_token();view.token=Some(token.clone());drafts.push((token,merged));
            }else{view.note=Some("Odczytano więcej kopii niż obsługuje pojedynczy zapis. Zmiana zablokowana.".into());}
        }
        rules.push(view);
    }
    // FIXTURE_RULES stores only an index at +146. RULE_GROUP_RULES +60 points
    // to a definition store whose pointer vector starts at +8. Each indexed
    // definition contains the native two-byte substitution header: max_subs at
    // +0 and subs_allowed (bench places) at +1. Editing that definition changes
    // the R1..Rn slots shown by the match UI.
    if dynamic_league_profile(&process) {
        let bench_result=(||->Result<(),String>{
        let definition_store=league_pointer(&process,&mut guards,owner+0x60)?;
        let definitions=league_vector(&process,&mut guards,definition_store+8,128)?;
        let mut selected=Vec::<(usize,&str,u8,u8)>::new();
        for &(fixture,variant) in &candidates {
            let rule_index=league_capture(&process,&mut guards,fixture+0x146,1)?[0];
            if rule_index==u8::MAX {continue;}
            let Some(&definition)=definitions.get(rule_index as usize) else {
                warnings.push(format!("{variant}: indeks reguły ławki ({rule_index}) wykracza poza odczytaną listę. Limit rezerwowych pominięto."));
                continue;
            };
            let header=league_capture(&process,&mut guards,definition,0x28)?;
            let max_subs=header[0];let bench=header[1];
            if max_subs>99||bench>99 {
                warnings.push(format!("{variant}: nierozpoznany wariant reguły zmian. Limit rezerwowych pominięto."));
                continue;
            }
            selected.push((definition,variant,max_subs,bench));
        }
        let mut by_value=HashMap::<u8,Vec<(usize,&str,u8)>>::new();
        for (definition,variant,max_subs,bench) in selected {
            let rows=by_value.entry(bench).or_default();
            if !rows.iter().any(|(address,_,_)|*address==definition) {rows.push((definition,variant,max_subs));}
        }
        for (bench,entries) in by_value {
            if entries.len()>8 {warnings.push("FM powiązał z fazą zbyt wiele definicji ławki. Zapis został zablokowany.".into());continue;}
            let mut protected=guards.clone();let mut patches=Vec::new();let mut variants=Vec::new();let mut max_values=Vec::new();
            for (definition,variant,max_subs) in &entries {
                let value_address=*definition+1;
                protected.retain(|guard|value_address<guard.address||value_address>=guard.address+guard.bytes.len());
                protected.push(LeagueGuard{address:*definition,bytes:process.read_exact(*definition,1).ok_or("Nie potwierdzono limitu zmian.")?});
                protected.push(LeagueGuard{address:*definition+2,bytes:process.read_exact(*definition+2,0x26).ok_or("Nie potwierdzono definicji ławki.")?});
                patches.push(LeagueQuotaPatch{address:value_address,before:vec![bench],after:vec![bench]});
                variants.push(*variant);max_values.push(*max_subs);
            }
            variants.sort_unstable();variants.dedup();max_values.sort_unstable();max_values.dedup();
            let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
            let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:true,persistent:true,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches,opened:Instant::now()};
            league_verify_quota(&process,&cache,&draft,date)?;
            let token=editor_token();drafts.push((token.clone(),draft));shared_default=true;
            rules.push(LeagueRuleView{
                id:format!("bench-slots-{bench}"),label:"Miejsca dla rezerwowych na ławce".into(),copies:entries.len(),value:bench as u32,mode:"Maksimum".into(),token:Some(token),persistent:true,
                note:Some(format!("Aktywne warianty: {}. Limit zmian w tej definicji: {}. Reguła ławki może być współdzielona przez inne rozgrywki korzystające z tej samej definicji.",variants.join(", "),max_values.iter().map(u8::to_string).collect::<Vec<_>>().join("/"))),
            });
        }
        Ok(())})();
        if let Err(error)=bench_result {warnings.push(format!("Nie udało się potwierdzić definicji ławki: {error}"));}
    }
    // FM27 uses a guarded engine default of 23 when ACTUAL_COMP has no
    // explicit max_squad_size property. Competitions such as Nations League
    // carry their own value (eg. 26) and are deliberately unaffected.
    if dynamic_league_profile(&process) {
        let property_header=league_capture(&process,&mut guards,actual+0x38,16)?;
        let begin=read_u64(&property_header,0).unwrap_or(0) as usize;
        let end=read_u64(&property_header,8).unwrap_or(0) as usize;
        let properties=if begin>=0x10_000&&end>=begin&&(end-begin)%16==0&&end-begin<=4096 {
            let bytes=league_capture(&process,&mut guards,begin,end-begin)?;
            bytes.chunks_exact(16).filter_map(|entry|{
                let key=read_u32(entry,0)?;let pointer=read_u64(entry,8)? as usize;
                (pointer>=0x10_000&&pointer<0x0000_8000_0000_0000&&pointer%8==0).then_some((key,pointer))
            }).collect::<Vec<_>>()
        }else{Vec::new()};
        let explicit_max=properties.iter().find_map(|(key,pointer)|(*key==0x6D78_7373).then_some(*pointer));
        let explicit_min=properties.iter().find_map(|(key,pointer)|(*key==0x6D69_7373).then_some(*pointer));
        let explicit_preliminary_max=properties.iter().find_map(|(key,pointer)|(*key==0x6D78_7073).then_some(*pointer));
        let selection_result=(||->Result<(),String>{
            let Some(collection)=properties.iter().find_map(|(key,pointer)|(*key==0x7371_7372).then_some(*pointer)) else {return Ok(());};
            // squad_selection_rules is itself the native vector object. These
            // are the rules used by the call-up confirmation dialog (GK min,
            // player max and player min), independently from registration.
            for (n,(pointer,bytes)) in league_rule_records(&process,&mut guards,collection)?.into_iter().enumerate() {
                let kind=read_u16(&bytes,0x1C).unwrap_or(u16::MAX);let mode=bytes[0x1E];let value=read_u32(&bytes,0x18).unwrap_or(u32::MAX);
                if !matches!(kind,0x9|0xA5|0x5A)||!matches!(mode,1|2|255)||value>99 {continue;}
                let Some(label)=league_rule_label(kind) else {continue;};
                let patch=LeagueQuotaPatch{address:pointer+0x18,before:bytes[0x18..0x1C].to_vec(),after:bytes[0x18..0x1C].to_vec()};
                let mut merged=false;
                if let Some(view)=rules.iter_mut().find(|rule|rule.label==label&&rule.value==value) {
                    if let Some(token)=view.token.as_ref() {
                        if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                            if !draft.patches.iter().any(|existing|existing.address==patch.address) {draft.patches.push(patch.clone());}
                            draft.guards.extend(guards.clone());
                            draft.guards.retain(|guard|!draft.patches.iter().any(|candidate|candidate.address==guard.address&&guard.bytes.len()==candidate.before.len()));
                            draft.persistent=true;view.persistent=true;view.copies+=1;merged=true;
                        }
                    }
                }
                if !merged {
                    let mut protected=guards.clone();protected.retain(|guard|guard.address!=patch.address||guard.bytes.len()!=patch.before.len());
                    let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                    let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:false,persistent:true,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches:vec![patch],opened:Instant::now()};
                    league_verify_quota(&process,&cache,&draft,date)?;
                    let token=editor_token();drafts.push((token.clone(),draft));
                    rules.push(LeagueRuleView{id:format!("selection-{kind}-{n}"),label:label.into(),copies:1,value,mode:match mode {1|2=>"Minimum",255=>"Maksimum",_=>"Inny wariant"}.into(),token:Some(token),persistent:true,note:Some("Aktywna reguła używana podczas zatwierdzania powołań.".into())});
                }
            }
            Ok(())
        })();
        if let Err(error)=selection_result {warnings.push(format!("Nie udało się odczytać aktywnych reguł powołań: {error}"));}
        if let Some(property)=explicit_max {
            // Native max_squad_size is an integer si::variant. Its constructor
            // stores the integer at +8; ACTUAL_COMP::get_max_squad_size reads
            // the same object through virtual +40. Keep the type pointer and
            // trailing bytes immutable and edit only the serialized scalar.
            let value=process.read_u32(property+8).filter(|value|*value<=99).ok_or("Nie odczytano własnego limitu powołań tych rozgrywek.")?;
            let patch=LeagueQuotaPatch{address:property+8,before:value.to_le_bytes().to_vec(),after:value.to_le_bytes().to_vec()};
            let property_guards=[
                LeagueGuard{address:property,bytes:process.read_exact(property,8).ok_or("Nie potwierdzono typu własnego limitu powołań.")?},
                LeagueGuard{address:property+12,bytes:process.read_exact(property+12,4).ok_or("Nie potwierdzono rekordu własnego limitu powołań.")?},
            ];
            let mut merged=false;
            if let Some(view)=rules.iter_mut().find(|rule|rule.label=="Wielkość kadry — maksimum") {
                if let Some(token)=view.token.as_ref() {
                    if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                        // The phase rule drives the rules screen, while this
                        // ACTUAL_COMP scalar drives the live 26/26 registration
                        // gate. Write and undo both as one guarded operation.
                        draft.guards.extend(property_guards.iter().cloned());
                        draft.guards.retain(|guard|guard.address!=patch.address);
                        draft.patches.insert(0,patch.clone());
                        league_verify_quota(&process,&cache,draft,date)?;
                        let phase_value=view.value;
                        view.value=value;view.copies+=1;
                        view.label="Maksymalna wielkość składu i rejestracji".into();
                        view.note=Some(if phase_value==value {
                            format!("Zapis zmienia razem regułę fazy i aktywny limit rejestracji {value}/{value} dla {name}.")
                        }else{
                            format!("Limity są rozbieżne: reguła fazy ma {phase_value}, a rejestracja {value}. Wpisz docelową wartość, aby wyrównać oba.")
                        });
                        merged=true;
                    }
                }
            }
            if !merged {
                let mut protected=guards.clone();protected.extend(property_guards);
                let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:false,persistent:true,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches:vec![patch],opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();drafts.push((token.clone(),draft));
                rules.push(LeagueRuleView{id:"competition-max-squad".into(),label:"Limit powołań tych rozgrywek".into(),copies:1,value,mode:"Maksimum".into(),token:Some(token),persistent:true,note:Some(format!("Własny limit rozgrywek: {value}. Zmiana dotyczy tylko {} w bieżącym cyklu i nie zmienia limitów pozostałych turniejów.",name))});
            }
        }else{
            shared_default=true;
            let addresses=league_default_max_addresses(&process,base);
            let values=addresses.iter().filter_map(|address|process.read_u8(*address)).collect::<Vec<_>>();
            if values.len()==2&&values[0]==values[1]&&values[0]<=99 {
                let value=values[0] as u32;
                let patches=addresses.iter().map(|address|LeagueQuotaPatch{address:*address,before:vec![value as u8],after:vec![value as u8]}).collect::<Vec<_>>();
                let mut protected=guards.clone();
                for address in addresses {protected.push(LeagueGuard{address:address-2,bytes:process.read_exact(address-2,2).ok_or("Nie potwierdzono kodu domyślnego limitu FM.")?});}
                protected.retain(|guard|!patches.iter().any(|patch|guard.address==patch.address));
                let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:true,persistent:false,code_patch:true,competition_uid,phase_id:phase_id.clone(),guards:protected,patches,opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();
                drafts.push((token.clone(),draft));
                rules.push(LeagueRuleView{id:"engine-default-max".into(),label:"Domyślny limit powołań (rozgrywki bez własnego limitu)".into(),copies:2,value,mode:"Maksimum".into(),token:Some(token),persistent:false,note:Some("Eliminacje korzystają z domyślnej wartości 23. Zmiana obejmie wszystkie rozgrywki bez własnego limitu; Nations League z własnym limitem 26 pozostanie bez zmian.".into())});
            }
        }
        if let Some(property)=explicit_preliminary_max {
            // max_prelim_squad_size is the final confirmation gate used by
            // the national call-up screen. The visible registration counter
            // can be valid while this independent value still blocks 24+.
            let preliminary_value=process.read_u32(property+8).filter(|value|*value<=99).ok_or("Nie odczytano limitu zatwierdzania powołań.")?;
            let patch=LeagueQuotaPatch{address:property+8,before:preliminary_value.to_le_bytes().to_vec(),after:preliminary_value.to_le_bytes().to_vec()};
            let property_guards=[
                LeagueGuard{address:property,bytes:process.read_exact(property,8).ok_or("Nie potwierdzono typu limitu zatwierdzania powołań.")?},
                LeagueGuard{address:property+12,bytes:process.read_exact(property+12,4).ok_or("Nie potwierdzono rekordu limitu zatwierdzania powołań.")?},
            ];
            let maximum_view=rules.iter_mut().find(|rule|rule.label=="Maksymalna wielkość składu i rejestracji"||rule.label=="Wielkość kadry — maksimum"||rule.id=="competition-max-squad");
            if let Some(view)=maximum_view {
                if let Some(token)=view.token.as_ref() {
                    if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                        draft.guards.extend(property_guards.iter().cloned());
                        draft.guards.retain(|guard|guard.address!=patch.address);
                        draft.patches.insert(0,patch);
                        league_verify_quota(&process,&cache,draft,date)?;
                        let displayed_value=view.value;view.copies+=1;
                        view.label="Maksymalna liczba powołanych i zatwierdzanych".into();
                        view.note=Some(if displayed_value==preliminary_value {
                            format!("Zapis zmienia razem limit reguły, rejestracji i przycisku Potwierdź: {displayed_value}.")
                        }else{
                            format!("Ukryty limit przycisku Potwierdź wynosi {preliminary_value}, a widoczny limit {displayed_value}. Zapis wyrówna wszystkie wartości do wpisanej liczby.")
                        });
                    }
                }
            }else{
                let mut protected=guards.clone();protected.extend(property_guards);protected.retain(|guard|guard.address!=patch.address);
                let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:false,persistent:true,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches:vec![patch],opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();drafts.push((token.clone(),draft));
                rules.push(LeagueRuleView{id:"preliminary-max-squad".into(),label:"Limit zatwierdzania powołań".into(),copies:1,value:preliminary_value,mode:"Maksimum".into(),token:Some(token),persistent:true,note:Some("Ten ukryty limit steruje aktywnością przycisku Potwierdź.".into())});
            }
        }else if let Some(rva)=league_code_rvas(process.native_plugin_profile_id.as_deref()).preliminary_default {
            // Current FM27 keeps the inherited preliminary-squad ceiling as
            // an inline one-byte fallback. With no ACTUAL_COMP property this
            // value independently gates the call-up confirmation button.
            let address=base+rva;
            let preliminary_value=process.read_u8(address).filter(|value|*value<=99).ok_or("Nie odczytano domyślnego limitu zatwierdzania powołań.")?;
            let signature=process.read_exact(address-1,3).ok_or("Nie potwierdzono kodu domyślnego limitu zatwierdzania.")?;
            if signature.first()!=Some(&0xB0)||signature.get(2)!=Some(&0xC3) {
                warnings.push("Nie potwierdzono kodu domyślnego limitu zatwierdzania; nie dołączono synchronizacji przycisku Potwierdź.".into());
            }else{
                let maximum_view=rules.iter_mut().find(|rule|rule.label=="Maksymalna wielkość składu i rejestracji"||rule.label=="Wielkość kadry — maksimum"||rule.id=="competition-max-squad"||rule.id=="engine-default-max");
                if let Some(view)=maximum_view {
                    if let Some(token)=view.token.as_ref() {
                        if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                            let patch=LeagueQuotaPatch{address,before:vec![preliminary_value],after:vec![preliminary_value]};
                            draft.guards.push(LeagueGuard{address:address-1,bytes:vec![0xB0]});
                            draft.guards.push(LeagueGuard{address:address+1,bytes:vec![0xC3]});
                            draft.guards.retain(|guard|guard.address!=patch.address);
                            draft.patches.push(patch);draft.code_patch=true;draft.persistent=false;draft.shared_default=true;
                            league_verify_quota(&process,&cache,draft,date)?;
                            let displayed_value=view.value;view.label="Maksymalna liczba powołanych i zatwierdzanych".into();view.persistent=false;view.copies+=1;shared_default=true;
                            view.note=Some(if displayed_value==preliminary_value as u32 {
                                format!("Zapis zmienia razem dziedziczony limit powołań i przycisku Potwierdź: {displayed_value}. Zmiana obowiązuje do zamknięcia gry.")
                            }else{
                                format!("Dziedziczony limit powołań wynosi {displayed_value}, a domyślny limit zatwierdzania {preliminary_value}. Zapis wyrówna wszystkie wartości do wpisanej liczby i obowiązuje do zamknięcia gry.")
                            });
                        }
                    }
                }
            }
        }else if let Some((entry_rva,target_rva))=league_code_rvas(process.native_plugin_profile_id.as_deref()).preliminary_redirect {
            // Some international competitions inherit max_prelim_squad_size
            // directly from the database and therefore have no writable
            // ACTUAL_COMP property. Redirect its getter to max_squad_size so
            // the confirmation button uses the same edited maximum.
            let entry=base+entry_rva;let target=base+target_rva;
            let before=process.read_exact(entry,5).ok_or("Nie potwierdzono kodu limitu przycisku Potwierdź.")?;
            if before==[0x56,0x57,0x48,0x83,0xEC] {
                let relative=(target as i64-(entry+5) as i64) as i32;
                let mut after=vec![0xE9];after.extend(relative.to_le_bytes());
                let patch=LeagueQuotaPatch{address:entry,before,after};
                let maximum_view=rules.iter_mut().find(|rule|rule.label=="Maksymalna wielkość składu i rejestracji"||rule.label=="Wielkość kadry — maksimum"||rule.id=="competition-max-squad");
                if let Some(view)=maximum_view {
                    if let Some(token)=view.token.as_ref() {
                        if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                            draft.guards.push(LeagueGuard{address:entry+5,bytes:process.read_exact(entry+5,3).ok_or("Nie potwierdzono otoczenia kodu limitu zatwierdzania.")?});
                            draft.guards.push(LeagueGuard{address:target,bytes:process.read_exact(target,8).ok_or("Nie potwierdzono funkcji maksymalnej wielkości kadry.")?});
                            draft.guards.retain(|guard|guard.address!=patch.address);
                            draft.patches.insert(0,patch);draft.code_patch=true;draft.persistent=false;draft.shared_default=true;
                            league_verify_quota(&process,&cache,draft,date)?;
                            view.label="Maksymalna liczba powołanych i zatwierdzanych".into();view.persistent=false;view.copies+=1;shared_default=true;
                            view.note=Some("FM dziedziczy ukryty limit 23 z bazy rozgrywek. Zapis połączy przycisk Potwierdź z edytowanym maksimum; zmiana obowiązuje do zamknięcia gry.".into());
                        }
                    }
                }
            }else if before.first()!=Some(&0xE9) {warnings.push("Nie potwierdzono kodu ukrytego limitu zatwierdzania; nie dołączono synchronizacji przycisku Potwierdź.".into());}
        }
        if let Some(property)=explicit_min {
            // min_squad_size uses the native property key 0x6D697373
            // (confirmed from the current game_plugin serializer). It is a
            // separate registration gate from max_squad_size and must be
            // edited together with the phase minimum when both are present.
            let value=process.read_u32(property+8).filter(|value|*value<=99).ok_or("Nie odczytano minimalnej liczby powołanych tych rozgrywek.")?;
            let patch=LeagueQuotaPatch{address:property+8,before:value.to_le_bytes().to_vec(),after:value.to_le_bytes().to_vec()};
            let property_guards=[
                LeagueGuard{address:property,bytes:process.read_exact(property,8).ok_or("Nie potwierdzono typu minimalnego limitu powołań.")?},
                LeagueGuard{address:property+12,bytes:process.read_exact(property+12,4).ok_or("Nie potwierdzono rekordu minimalnego limitu powołań.")?},
            ];
            let mut merged=false;
            if let Some(view)=rules.iter_mut().find(|rule|rule.label=="Wielkość kadry — minimum") {
                if let Some(token)=view.token.as_ref() {
                    if let Some((_,draft))=drafts.iter_mut().find(|(candidate,_)|candidate==token) {
                        draft.guards.extend(property_guards.iter().cloned());
                        draft.guards.retain(|guard|guard.address!=patch.address);
                        draft.patches.insert(0,patch.clone());
                        league_verify_quota(&process,&cache,draft,date)?;
                        let phase_value=view.value;
                        view.value=value;view.copies+=1;
                        view.label="Minimalna wielkość składu i rejestracji".into();
                        view.note=Some(if phase_value==value {
                            format!("Zapis zmienia razem minimalną regułę fazy i aktywny próg rejestracji {value} dla {name}. Ustaw 0, aby wyłączyć wymagane minimum.")
                        }else{
                            format!("Minimalne limity są rozbieżne: reguła fazy ma {phase_value}, a rejestracja wymaga {value}. Wpisz 0 lub docelowe minimum, aby wyrównać oba.")
                        });
                        merged=true;
                    }
                }
            }
            if !merged {
                let mut protected=guards.clone();protected.extend(property_guards);
                let owner_uid=cache.database.managed_club_uid.or(cache.database.managed_team_uid).ok_or("Nie potwierdzono prowadzonej drużyny.")?;
                let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base,game_date:date,shared_default:false,persistent:true,code_patch:false,competition_uid,phase_id:phase_id.clone(),guards:protected,patches:vec![patch],opened:Instant::now()};
                league_verify_quota(&process,&cache,&draft,date)?;
                let token=editor_token();drafts.push((token.clone(),draft));
                rules.push(LeagueRuleView{id:"competition-min-squad".into(),label:"Minimalna liczba powołanych do rejestracji".into(),copies:1,value,mode:"Minimum".into(),token:Some(token),persistent:true,note:Some(format!("Aktywny minimalny próg wynosi {value}. Ustaw 0, aby zatwierdzać kadrę z dowolną liczbą zawodników nieprzekraczającą maksimum."))});
            }
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
    if cache.database.session_id!=draft.session_id||cache.database.pid!=draft.pid||cache.team!=draft.team||cache.plugin_base!=draft.base||cache.database.managed_club_uid.or(cache.database.managed_team_uid)!=Some(draft.owner_uid)||process.creation_time()!=Some(draft.created)||league_live_date(process,cache)?!=date {return Err("Gra, drużyna lub data zmieniły się. Wstrzymaj FM i otwórz zasady ponownie.".into());}
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
        let write=||if draft.code_patch {process.write_code_exact(patch.address,&patch.after)}else{process.write_exact(patch.address,&patch.after)};
        if let Err(error)=verify_values(index).and_then(|_|write()) {failure=Some((index,error));break;}
    }
    if failure.is_none() {if let Err(error)=verify_values(draft.patches.len()) {failure=Some((draft.patches.len()-1,error));}}
    if let Some((last,error))=failure {
        let mut unreverted=0;
        for patch in draft.patches[..=last].iter().rev() {
            if process.read_exact(patch.address,patch.before.len()).as_ref()==Some(&patch.before) {continue;}
            let restore=||if draft.code_patch {process.write_code_exact(patch.address,&patch.before)}else{process.write_exact(patch.address,&patch.before)};
            if league_verify_quota(process,cache,draft,date).is_err()||process.read_exact(patch.address,patch.after.len()).as_ref()!=Some(&patch.after)||restore().is_err() {unreverted+=1;}
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
    let before=if draft.code_patch {draft.patches[0].before[0] as u32}else{read_u32(&draft.patches[0].before,0).ok_or("Nie odczytano poprzedniego limitu.")?};
    if before==value {return Err("Wpisany limit jest już ustawiony w FM.".into());}
    for patch in &mut draft.patches {patch.after=if draft.code_patch {vec![value as u8]}else{value.to_le_bytes().to_vec()};}
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    league_write_quota(&process,&cache,&draft,draft.game_date)?;
    draft.opened=Instant::now();
    let result=LeagueU22Result{session_id:draft.session_id,shared_default:draft.shared_default,persistent:draft.persistent,before,after:value,record_count:draft.patches.len(),undo_token:Some(editor_token())};
    let mut state=league_quota_state().lock().map_err(|_|"Zapisano limit, ale nie można przygotować cofnięcia.")?;
    if state.undos.len()>=8 {state.undos.clear();}
    if let Some(token)=&result.undo_token {state.undos.insert(token.clone(),draft);}Ok(result)
}
pub(super) fn restore_national_callup_limit(session_id:u64,value:u32)->Result<LeagueU22Result,String> {
    if value>99 {return Err("Limit liczby zawodników musi mieścić się w zakresie 0–99.".into());}
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let (process,cache)=league_quota_context(session_id,true)?;
    if cache.database.managed_nation_uid.is_none() {return Err("Automatyczny limit dotyczy prowadzonej reprezentacji.".into());}
    let code=league_code_rvas(process.native_plugin_profile_id.as_deref());
    let preliminary=code.preliminary_default.ok_or("Ten profil FM nie ma potwierdzonego automatycznego przywracania limitu powołań.")?;
    let mut addresses=code.default_max.iter().map(|rva|cache.plugin_base+*rva).collect::<Vec<_>>();
    addresses.push(cache.plugin_base+preliminary);
    let before=addresses.iter().map(|address|process.read_u8(*address).filter(|current|*current<=99).ok_or("Nie odczytano bieżącego limitu powołań FM.")).collect::<Result<Vec<_>,_>>()?;
    let preliminary_address=*addresses.last().unwrap_or(&0);
    if process.read_exact(preliminary_address-1,3).as_deref().map(|bytes|bytes[0]==0xB0&&bytes[2]==0xC3)!=Some(true) {return Err("Nie potwierdzono ukrytego limitu przycisku Potwierdź.".into());}
    if before.iter().all(|current|*current==value as u8) {
        return Ok(LeagueU22Result{session_id,shared_default:true,before:value,after:value,record_count:0,undo_token:None,persistent:false});
    }
    let mut guards=Vec::new();
    for address in &addresses[..2] {guards.push(LeagueGuard{address:*address-2,bytes:process.read_exact(*address-2,2).ok_or("Nie potwierdzono kodu limitu powołań.")?});}
    guards.push(LeagueGuard{address:preliminary_address-1,bytes:vec![0xB0]});
    guards.push(LeagueGuard{address:preliminary_address+1,bytes:vec![0xC3]});
    let patches=addresses.iter().zip(before.iter()).map(|(address,current)|LeagueQuotaPatch{address:*address,before:vec![*current],after:vec![value as u8]}).collect::<Vec<_>>();
    let date=league_live_date(&process,&cache)?;
    let owner_uid=cache.database.managed_team_uid.ok_or("Nie potwierdzono prowadzonej reprezentacji.")?;
    let draft=LeagueQuotaDraft{session_id,pid:cache.database.pid,created:process.creation_time().ok_or("Nie potwierdzono procesu FM.")?,team:cache.team,owner_uid,base:cache.plugin_base,game_date:date,shared_default:true,persistent:false,code_patch:true,competition_uid:u32::MAX,phase_id:"auto-restore".into(),guards,patches,opened:Instant::now()};
    league_write_quota(&process,&cache,&draft,date)?;
    Ok(LeagueU22Result{session_id,shared_default:true,before:before[0] as u32,after:value,record_count:draft.patches.len(),undo_token:None,persistent:false})
}
pub(super) fn undo_league_u22(token:String)->Result<LeagueU22Result,String> {
    let _lock=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
    let mut draft=league_quota_state().lock().map_err(|_|"Edytor zasad jest zajęty.")?.undos.remove(&token).ok_or("Nie zachowano tej zmiany do cofnięcia w bieżącej sesji aplikacji.")?;
    let (process,cache)=league_quota_context(draft.session_id,true)?;
    let date=league_live_date(&process,&cache)?;
    let before=if draft.code_patch {draft.patches[0].after[0] as u32}else{read_u32(&draft.patches[0].after,0).ok_or("Nie odczytano limitu.")?};
    let after=if draft.code_patch {draft.patches[0].before[0] as u32}else{read_u32(&draft.patches[0].before,0).ok_or("Nie odczytano poprzedniego limitu.")?};
    for patch in &mut draft.patches {std::mem::swap(&mut patch.before,&mut patch.after);}
    league_write_quota(&process,&cache,&draft,date)?;
    Ok(LeagueU22Result{session_id:draft.session_id,shared_default:draft.shared_default,persistent:draft.persistent,before,after,record_count:draft.patches.len(),undo_token:None})
}
