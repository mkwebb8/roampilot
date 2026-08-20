import type { RigProfile } from "./types";
const RIG="roampilot-rig-v1",SAVED="roampilot-saved-v1";
export const loadRig=(fallback:RigProfile):RigProfile=>{if(typeof window==="undefined")return fallback;try{return JSON.parse(localStorage.getItem(RIG)||"")||fallback}catch{return fallback}};
export const saveRig=(rig:RigProfile)=>localStorage.setItem(RIG,JSON.stringify(rig));
export const loadSaved=():string[]=>{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(SAVED)||"[]")}catch{return[]}};
export const saveSaved=(ids:string[])=>localStorage.setItem(SAVED,JSON.stringify(ids));
