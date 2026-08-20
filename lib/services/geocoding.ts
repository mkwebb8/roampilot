import { fetchJson } from "./http";
import type { Coordinates } from "../types";
type Result={lat:string;lon:string;display_name:string};
export async function geocode(place:string):Promise<Coordinates>{
 const data=await fetchJson<Result[]>(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(place)}`,{headers:{"User-Agent":"RoamPilot/0.1 (trip planning prototype)"}},6500,{provider:"nominatim",operation:"geocode",retries:1});
 if(!data[0])throw new Error(`Location not found: ${place}`);
 return{latitude:Number(data[0].lat),longitude:Number(data[0].lon)};
}
