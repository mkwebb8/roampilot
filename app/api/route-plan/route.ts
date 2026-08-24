import { routeBetween } from "../../../lib/services/routing";
import { logProviderError } from "../../../lib/services/http";
import { requireAlphaAccess } from "../../../lib/server-alpha-auth";
export const runtime="edge";
export async function POST(request:Request){
 try{
  const denied=await requireAlphaAccess(request);if(denied)return denied;
  const {places}=await request.json() as {places:string[]};
  if(!Array.isArray(places)||places.length<2||places.length>8)return Response.json({error:"Add 2–8 route points"},{status:400});
  const legs=[];for(let index=0;index<places.length-1;index++)legs.push(await routeBetween(places[index],places[index+1]));
  return Response.json({legs,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=900"}});
 }catch(error){logProviderError("route-plan","request",error);return Response.json({error:"We couldn't route one of those places. Check each city and try again."},{status:502})}
}
