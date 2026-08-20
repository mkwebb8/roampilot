import { findCampgrounds } from "../../../lib/services/campgrounds";
import { findEvents } from "../../../lib/services/events";
import { routeBetween } from "../../../lib/services/routing";
import { getWeather } from "../../../lib/services/weather";
import type { Coordinates,LiveTripData } from "../../../lib/types";
export const runtime="edge";
export async function POST(request:Request){
 try{
  const body=await request.json() as {start:string;destination:string;coordinates:Coordinates;leave:string;returnDate:string};
  if(!body.start||!body.destination||!body.coordinates)return Response.json({error:"Missing trip fields"},{status:400});
  const [weather,route,campgrounds,events]=await Promise.all([
   getWeather(body.coordinates,body.leave).catch(()=>undefined),
   routeBetween(body.start,body.destination,undefined,body.coordinates).catch(()=>undefined),
   findCampgrounds(body.coordinates,process.env.RIDB_API_KEY).catch(()=>[]),
   findEvents(body.coordinates,body.leave,body.returnDate,process.env.TICKETMASTER_API_KEY).catch(()=>[]),
  ]);
  const result:LiveTripData={weather,route,campgrounds,events,updatedAt:new Date().toISOString()};
  return Response.json(result,{headers:{"Cache-Control":"public, max-age=900"}});
 }catch{return Response.json({error:"Unable to load live trip data"},{status:502})}
}
