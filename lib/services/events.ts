import { fetchJson } from "./http";
import type { Coordinates } from "../types";
type Ticketmaster={_embedded?:{events:Array<{name:string}>}};
export async function findEvents(point:Coordinates,startDate:string,endDate:string,apiKey?:string):Promise<string[]>{
 if(!apiKey)return[];
 const start=`${startDate}T00:00:00Z`,end=`${endDate}T23:59:59Z`;
 const data=await fetchJson<Ticketmaster>(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(apiKey)}&latlong=${point.latitude},${point.longitude}&radius=75&unit=miles&startDateTime=${start}&endDateTime=${end}&size=8`);
 return(data._embedded?.events??[]).map(event=>event.name);
}
