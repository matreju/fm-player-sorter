import { useEffect, useState, type ChangeEvent } from "react";
import { getClubTheme, type NationTheme } from "../utils/nationTheme";

const storageKey=(uid:number)=>`fm-player-sorter.club-crest.v1.${uid}`;
function savedCrest(uid:number|null):string|null {
  if(!uid)return null;
  try {const value=localStorage.getItem(storageKey(uid));return value?.startsWith("data:image/png;base64,")&&value.length<1_500_000?value:null;}catch{return null;}
}
function loadImage(source:string):Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Nie można odczytać herbu."));image.src=source;});
}
function palette(image:HTMLImageElement):NationTheme {
  const canvas=document.createElement("canvas");canvas.width=48;canvas.height=48;
  const context=canvas.getContext("2d");if(!context)return getClubTheme();
  context.drawImage(image,0,0,48,48);
  const data=context.getImageData(0,0,48,48).data;
  const buckets=new Map<number,{count:number;r:number;g:number;b:number}>();
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
    if(data[i+3]<180||max<45||max-min<40)continue;
    const key=(r>>5)*64+(g>>5)*8+(b>>5);
    const bucket=buckets.get(key)??{count:0,r:0,g:0,b:0};bucket.count++;bucket.r+=r;bucket.g+=g;bucket.b+=b;buckets.set(key,bucket);
  }
  const colors=[...buckets.values()].sort((a,b)=>b.count-a.count);
  if(!colors.length)return getClubTheme();
  const rgb=(c:typeof colors[number])=>[c.r/c.count,c.g/c.count,c.b/c.count];
  const main=rgb(colors[0]);
  const second=colors.find(c=>c.count>=colors[0].count*0.15&&rgb(c).reduce((sum,x,i)=>sum+(x-main[i])**2,0)>18000);
  const hex=(values:number[])=>`#${values.map(x=>Math.round(x).toString(16).padStart(2,"0")).join("")}`;
  const accent=second?rgb(second):main;
  // Keep crest colours, lifting only brightness for dark-surface controls.
  const lift=Math.max(0,155-Math.max(...accent));
  return getClubTheme(hex(main),hex(accent.map(x=>Math.min(255,x+lift))));
}

export function useClubAppearance(uid:number|null,gameCrest:string|null|undefined){
  const [override,setOverride]=useState<{uid:number;source:string|null}|null>(null);
  const [appearance,setAppearance]=useState<{uid:number;source:string;theme:NationTheme}|null>(null);
  const [error,setError]=useState("");
  const source=uid?(override?.uid===uid?override.source:savedCrest(uid))??gameCrest??null:null;
  useEffect(()=>{setError("");},[uid]);
  useEffect(()=>{
    let active=true;
    if(uid&&source)void loadImage(source).then(image=>{if(active)setAppearance({uid,source,theme:palette(image)});}).catch(()=>{if(active)setAppearance(null);});
    return()=>{active=false;};
  },[uid,source]);
  async function upload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!uid||!file)return;
    const targetUid=uid;setError("");
    try {
      if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5_000_000)throw new Error("Wybierz PNG, JPG lub WebP do 5 MB.");
      const url=URL.createObjectURL(file);
      try {
        const image=await loadImage(url);const scale=Math.min(1,384/Math.max(image.width,image.height));
        const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
        const context=canvas.getContext("2d");if(!context)throw new Error("Nie można przygotować herbu.");
        context.drawImage(image,0,0,canvas.width,canvas.height);const next=canvas.toDataURL("image/png");
        localStorage.setItem(storageKey(targetUid),next);setOverride({uid:targetUid,source:next});
      }finally{URL.revokeObjectURL(url);}
    }catch(reason){setError(reason instanceof Error?reason.message:String(reason));}
  }
  function reset(){if(!uid)return;try{localStorage.removeItem(storageKey(uid));setOverride({uid,source:null});setError("");}catch{setError("Nie można przywrócić herbu z FM.");}}
  return {crest:source,theme:appearance?.uid===uid&&appearance.source===source?appearance.theme:getClubTheme(),upload,reset,error,custom:!!uid&&!!(override?.uid===uid?override.source:savedCrest(uid))};
}
