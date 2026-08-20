import { discoverTrips } from "../../../lib/services/discovery";
import type { DiscoverFilters } from "../../../lib/types";
export const runtime="edge";
export async function POST(request:Request){
 try{
  const filters=await request.json() as DiscoverFilters;
  if(!filters.start?.trim()||!Number.isFinite(filters.maxDriveHours)||filters.maxDriveHours<=0||filters.maxDriveHours>12)return Response.json({error:"Enter a starting location and a valid drive-time window."},{status:400});
  const result=await discoverTrips(filters,{nps:process.env.NPS_API_KEY,ridb:process.env.RIDB_API_KEY});
  return Response.json(result,{headers:{"Cache-Control":"private, max-age=300, stale-while-revalidate=600"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Live destination discovery failed"},{status:502})}
}
