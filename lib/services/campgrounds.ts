import { fetchJson } from "./http";
import type { Coordinates } from "../types";
type Ridb={RECDATA:Array<{FacilityName:string}>};
export async function findCampgrounds(point:Coordinates,apiKey?:string):Promise<string[]>{
 if(!apiKey)return[];
 const data=await fetchJson<Ridb>(`https://ridb.recreation.gov/api/v1/facilities?latitude=${point.latitude}&longitude=${point.longitude}&radius=50&activity=9&limit=8&apikey=${encodeURIComponent(apiKey)}`);
 return data.RECDATA.map(item=>item.FacilityName);
}
