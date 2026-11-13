//! PE identity with only linker/debug bookkeeping normalized. Code, section
//! layout, relocations, strings, and metadata registration remain byte-exact.
use std::{fs::File,io::{Read,Seek,SeekFrom},path::Path};
use sha2::{Digest,Sha256};

pub(crate) struct PeFingerprint {pub raw:String,pub layout:String}
fn read_at(file:&mut File,length:u64,offset:u64,size:usize)->Result<Vec<u8>,String> {
    if size>1_048_576 || offset.checked_add(size as u64).filter(|end|*end<=length).is_none(){return Err("Nieprawidłowy zakres danych PE.".into());}
    let mut bytes=vec![0;size];file.seek(SeekFrom::Start(offset)).and_then(|_|file.read_exact(&mut bytes)).map_err(|e|format!("Nie można odczytać PE: {e}"))?;Ok(bytes)
}
fn u16_at(bytes:&[u8],at:usize)->Result<u16,String> {Ok(u16::from_le_bytes(bytes.get(at..at+2).ok_or("Niepełny nagłówek PE.")?.try_into().map_err(|_|"Niepełny nagłówek PE.")?))}
fn u32_at(bytes:&[u8],at:usize)->Result<u32,String> {Ok(u32::from_le_bytes(bytes.get(at..at+4).ok_or("Niepełny nagłówek PE.")?.try_into().map_err(|_|"Niepełny nagłówek PE.")?))}
struct Section {rva:u64,raw:u64,size:u64}
fn raw_for_rva(sections:&[Section],rva:u64,size:u64)->Result<u64,String> {
    let mut matches=sections.iter().filter_map(|s|{
        let delta=rva.checked_sub(s.rva)?;
        (delta.checked_add(size)?<=s.size).then(||s.raw+delta)
    });
    let result=matches.next().ok_or("Nie można odwzorować katalogu debugowania PE.")?;
    if matches.next().is_some(){return Err("Niejednoznaczne sekcje PE.".into());}Ok(result)
}
pub(crate) fn fingerprint(path:&Path)->Result<PeFingerprint,String> {
    let mut file=File::open(path).map_err(|e|format!("Nie można otworzyć PE: {e}"))?;
    let before=file.metadata().map_err(|e|e.to_string())?;let length=before.len();
    if !(64..=4_294_967_296).contains(&length){return Err("Nieprawidłowy rozmiar pliku PE.".into());}
    let dos=read_at(&mut file,length,0,64)?;
    if &dos[..2]!=b"MZ" {return Err("Brak nagłówka MZ.".into());}
    let pe=u32_at(&dos,0x3C)? as u64;
    if pe>1_048_576{return Err("Nieprawidłowy nagłówek PE.".into());}
    let header=read_at(&mut file,length,pe,24)?;
    if &header[..4]!=b"PE\0\0"||u16_at(&header,4)?!=0x8664{return Err("Wymagany plik PE x64.".into());}
    let section_count=u16_at(&header,6)? as usize;let optional_size=u16_at(&header,20)? as usize;
    if !(1..=96).contains(&section_count)||!(240..=4096).contains(&optional_size){return Err("Nieprawidłowa struktura PE x64.".into());}
    let optional_offset=pe+24;let optional=read_at(&mut file,length,optional_offset,optional_size)?;
    if u16_at(&optional,0)?!=0x20B||u32_at(&optional,108)?<7{return Err("Nieobsługiwany nagłówek PE x64.".into());}
    let table=read_at(&mut file,length,optional_offset+optional_size as u64,section_count*40)?;
    let mut sections=Vec::new();
    for row in table.chunks_exact(40){
        let size=u32_at(row,16)? as u64;let raw=u32_at(row,20)? as u64;
        if raw.checked_add(size).filter(|end|*end<=length).is_none(){return Err("Sekcja PE wychodzi poza plik.".into());}
        sections.push(Section{rva:u32_at(row,12)? as u64,raw,size});
    }
    // COFF timestamp and OptionalHeader.CheckSum are not addresses/layout fields.
    let mut masks=vec![(pe+8,4u64),(optional_offset+64,4u64)];
    let debug_rva=u32_at(&optional,112+6*8)? as u64;let debug_size=u32_at(&optional,112+6*8+4)? as u64;
    if debug_rva==0 && debug_size!=0 || debug_rva!=0 && debug_size==0 {return Err("Niepełny katalog debugowania PE.".into());}
    if debug_size>0 {
        if debug_size%28!=0 || debug_size>128*28{return Err("Nieprawidłowy katalog debugowania PE.".into());}
        let debug_raw=raw_for_rva(&sections,debug_rva,debug_size)?;
        let debug=read_at(&mut file,length,debug_raw,debug_size as usize)?;
        for (index,row) in debug.chunks_exact(28).enumerate(){
            masks.push((debug_raw+index as u64*28+4,4));
            if u32_at(row,12)?==2 {
                let size=u32_at(row,16)? as u64;let rva=u32_at(row,20)? as u64;let raw=u32_at(row,24)? as u64;
                if size<24 || size>1_048_576 || raw.checked_add(size).filter(|end|*end<=length).is_none(){return Err("Nieprawidłowe dane CodeView.".into());}
                if rva!=0 && raw_for_rva(&sections,rva,size)?!=raw {return Err("Niespójny adres CodeView.".into());}
                let signature=read_at(&mut file,length,raw,4)?;
                if signature.as_slice()==b"RSDS" {masks.push((raw+4,20));} // PDB GUID + age only; retain signature and path.
            }
        }
    }
    masks.sort_unstable();
    let mut previous_end=0;
    for &(offset,size) in &masks {
        if offset<previous_end || offset+size>length{return Err("Niejednoznaczne pola informacyjne PE.".into());}previous_end=offset+size;
    }
    file.seek(SeekFrom::Start(0)).map_err(|e|e.to_string())?;
    let (mut raw,mut layout)=(Sha256::new(),Sha256::new());let mut buffer=vec![0u8;1024*1024];let mut position=0u64;
    loop {
        let count=file.read(&mut buffer).map_err(|e|e.to_string())?;if count==0{break;}
        raw.update(&buffer[..count]);let end=position+count as u64;
        for &(offset,size) in &masks {
            let start=offset.max(position);let stop=(offset+size).min(end);
            if start<stop{buffer[(start-position) as usize..(stop-position) as usize].fill(0);}
        }
        layout.update(&buffer[..count]);position=end;
    }
    let after=file.metadata().map_err(|e|e.to_string())?;
    if position!=length || after.len()!=length || after.modified().ok()!=before.modified().ok(){return Err("Plik gry zmienił się podczas rozpoznawania. Ponów połączenie po zakończeniu aktualizacji.".into());}
    Ok(PeFingerprint{raw:format!("{:x}",raw.finalize()),layout:format!("{:x}",layout.finalize())})
}
