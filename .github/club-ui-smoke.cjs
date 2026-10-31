const {chromium}=require('playwright');
(async()=>{
 require('node:fs').mkdirSync('update-output',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const make=(uid,name,group,position)=>({UID:String(uid),Nazwisko:name,Imię:name.split(' ')[0],Klub:'Klub testowy',Pozycja:position,Wiek:'21',OU:'120',PA:'170','Grupa klubowa':group,'Lewa noga (wartość)':'15','Prawa noga (wartość)':'20',Podania:'14',Drybling:'13',Technika:'14','Gra bez piłki':'14','Przyjęcie piłki':'13','Przewidywanie':'13',Decyzje:'13','Opanowanie':'14','Przyspieszenie':'15','Szybkość':'15','Wykańczanie akcji':'15','Pozycja: N (Ś)':'20','Pozycja: DP':'14'});
  const rows=[make(1,'Senior Testowy','Pierwsza drużyna','N (Ś)'),make(2,'Rezerwowy Testowy','Rezerwy i juniorzy','DP'),make(3,'Junior Testowy','Rezerwy i juniorzy','N (Ś)')];
  window.isTauri=true; window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'},currentWebview:{label:'main'}},invoke:async(cmd,args)=>{
   if(cmd==='probe_fm_memory')return {processDetected:true,memoryReadable:true,pid:123,error:null};
   if(cmd==='plugin:app|version')return '0.7.0-beta.1';
   if(cmd==='plugin:updater|check')return null;
   if(cmd==='load_fm_database')return {success:true,stage:'database-loaded',message:'Wczytano klub',pid:123,managedMode:'club',managedClubUid:100,sessionId:1,managedTeam:'Klub testowy',managedNation:null,managedTeamUid:100,managedNationUid:null,gameDate:'2026-07-14',databasePlayerCount:10000,playerCount:3,headers:Object.keys(rows[0]),rows};
   if(cmd==='load_fm_season_stats')return {headers:[],rows:{},playerCount:0};
   if(cmd==='load_fm_team_logo')return null;
   if(cmd==='get_fm_date_status')return {processDetected:true,available:true,importedDate:'2026-07-14',currentDate:'2026-07-14',dataStale:false,source:'test',candidateCount:1,error:null};
   if(cmd==='search_fm_players')return {sessionId:1,total:2,page:0,pageSize:50,gameDate:'2026-07-14',rows:[{...make(99,'Kandydat Testowy','','DP'),Klub:'Inny klub',Wartość:'2000000','Cena wywoławcza':'2500000',Pensja:'4000','Koniec kontraktu':'2028-06-30','Status transferu':'Lista transferowa'},{...make(98,'Wolny Testowy','','N (Ś)'),Klub:'',Pensja:'','Koniec kontraktu':'','Status transferu':'Wolny zawodnik'}]};
   return null;
  }};
 });
 await page.goto('http://127.0.0.1:4173');
 await page.getByRole('button',{name:'Połącz z grą',exact:false}).first().click();
 await page.getByRole('button',{name:'Połącz i wczytaj zawodników',exact:true}).click();
 await page.getByLabel('Zespoły klubu').waitFor({timeout:15000});
 await page.getByLabel('Zespoły klubu').selectOption('first');
 await page.waitForTimeout(1000);
 await page.screenshot({path:'update-output/club.png',fullPage:true});
 await page.getByRole('button',{name:'Transfery',exact:true}).click();
 await page.getByText('Kandydat Testowy',{exact:true}).waitFor();
 await page.screenshot({path:'update-output/transfers.png',fullPage:true});
 if(!(await page.getByText('1 rok 11 mies.',{exact:true}).count())) throw Error('Missing contract duration');
 console.log(JSON.stringify({errors,clubFilter:true,transferPanel:true}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
