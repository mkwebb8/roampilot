import { fetchJson } from "./http";
import { geocode } from "./geocoding";
import type { Coordinates,RouteLeg } from "../types";
type Osrm={routes:Array<{distance:number;duration:number}>};
export async function routeBetween(from:string,to:string,fromCoordinates?:Coordinates,toCoordinates?:Coordinates):Promise<RouteLeg>{
 const [start,end]=await Promise.all([fromCoordinates??geocode(from),toCoordinates??geocode(to)]);
 const data=await fetchJson<Osrm>(`https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=false&steps=false`,{},6500,{provider:"osrm",operation:"route",retries:2});
 if(!data.routes[0])throw new Error("No route returned");
 return{from,to,distanceMiles:Math.round(data.routes[0].distance/1609.344),driveMinutes:Math.round(data.routes[0].duration/60),source:"live"};
}
