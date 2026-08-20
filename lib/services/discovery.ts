import { trips as curatedTrips } from "../seed";
import type { Coordinates,DiscoverFilters,DiscoveryProviderStatus,DiscoveryResponse,ImageCredit,Interest,Trip } from "../types";
import { findCampgrounds } from "./campgrounds";
import { findEvents } from "./events";
import { geocode } from "./geocoding";
import { fetchJson,logProviderError } from "./http";
import { mapWithConcurrency,mergeProviderCandidates,qualifyRoutes,coordinateMiles,type QualifiedRoute } from "./route-resilience";
import { routeBetween } from "./routing";
import { getWeather } from "./weather";

type Candidate={id:string;name:string;region:string;description:string;coordinates:Coordinates;image?:string;imageCredit?:ImageCredit;provider:"nps"|"ridb";activities:string[]};
type NpsImage={url:string;title?:string;credit?:string};
type NpsPark={id:string;fullName:string;description:string;states:string;latitude:string;longitude:string;url:string;activities?:Array<{name:string}>;images?:NpsImage[]};
type NpsResponse={data:NpsPark[]};
type RidbRecord={FacilityID?:string;FacilityName?:string;FacilityDescription?:string;FacilityLatitude?:number;FacilityLongitude?:number;FacilityTypeDescription?:string;RecAreaID?:string;RecAreaName?:string;RecAreaDescription?:string;RecAreaLatitude?:number;RecAreaLongitude?:number};
type RidbResponse={RECDATA:RidbRecord[]};
type RidbMedia={URL:string;Title?:string;Subtitle?:string;Description?:string;Credits?:string;MediaType?:string};
type RidbMediaResponse={RECDATA:RidbMedia[]};
type DiscoveryDependencies={geocode:typeof geocode;routeBetween:typeof routeBetween;getWeather:typeof getWeather;findCampgrounds:typeof findCampgrounds;findEvents:typeof findEvents;loadNps:typeof loadNpsCandidates;loadRidb:typeof loadRidbCandidates;now:()=>Date};

const CACHE_TTL=15*60*1000,MAX_ROUTE_CANDIDATES=36,RIDB_RADIUS_MILES=25;
const cache=new Map<string,{expires:number;response:DiscoveryResponse}>();
const searchRadiusMiles=(hours:number)=>Math.max(45,Math.ceil(hours*55*1.15));
const clean=(value:string|undefined)=>value?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()||"";
const estimateTags=(activities:string[],name:string):Interest[]=>{const text=`${activities.join(" ")} ${name}`.toLowerCase(),tags:Interest[]=[];if(/hike|trail|climb/.test(text))tags.push("Hiking");if(/lake|water|beach|river/.test(text))tags.push("Lake");if(/fish/.test(text))tags.push("Fishing");if(/museum|history|historic/.test(text))tags.push("Museums");if(/food|culinary/.test(text))tags.push("Food");if(/scenic|park|forest|mountain|nature/.test(text))tags.push("Scenic");return tags.length?tags:["Relaxing","Scenic"]};

async function loadNpsCandidates(origin:Coordinates,radiusMiles:number,apiKey?:string):Promise<Candidate[]>{
 if(!apiKey)return[];
 const data=await fetchJson<NpsResponse>("https://developer.nps.gov/api/v1/parks?limit=500&fields=images,activities",{headers:{"X-Api-Key":apiKey}},8000,{provider:"nps",operation:"parks",retries:1});
 return data.data.flatMap(park=>{const latitude=Number(park.latitude),longitude=Number(park.longitude),coordinates={latitude,longitude},photo=park.images?.find(image=>image.url);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||coordinateMiles(origin,coordinates)>radiusMiles||!photo)return[];return[{id:`nps-${park.id}`,name:park.fullName,region:park.states||"National Park Service",description:park.description,coordinates,provider:"nps" as const,activities:park.activities?.map(activity=>activity.name)??[],image:photo.url,imageCredit:{label:photo.credit||photo.title||"National Park Service",sourceUrl:park.url,license:"NPS-provided image; see source for rights and attribution"}}]});
}

async function ridbPhoto(kind:"facilities"|"recareas",id:string,apiKey:string):Promise<{image?:string;imageCredit?:ImageCredit}>{
 try{const data=await fetchJson<RidbMediaResponse>(`https://ridb.recreation.gov/api/v1/${kind}/${encodeURIComponent(id)}/media?limit=10&apikey=${encodeURIComponent(apiKey)}`,{},6500,{provider:"ridb",operation:`${kind}_media`,retries:1});const photo=data.RECDATA.find(item=>item.URL&&(!item.MediaType||/image|photo/i.test(item.MediaType)));return photo?{image:photo.URL,imageCredit:{label:photo.Credits||photo.Title||"Recreation.gov RIDB",sourceUrl:photo.URL,license:photo.Description||photo.Subtitle||"RIDB provider media; see source for rights and attribution"}}:{}}catch(error){logProviderError("ridb",`${kind}_media`,error,{recordId:id});return{}};
}

async function loadRidbCandidates(origin:Coordinates,radiusMiles:number,apiKey?:string,anchors:Coordinates[]=[]):Promise<Candidate[]>{
 if(!apiKey)return[];
 const points=[origin,...anchors.filter(point=>coordinateMiles(origin,point)<=radiusMiles).slice(0,12)],records=await mapWithConcurrency(points,2,async point=>{const query=`latitude=${point.latitude}&longitude=${point.longitude}&radius=${RIDB_RADIUS_MILES}&limit=50&full=true&apikey=${encodeURIComponent(apiKey)}`;const [facilities,areas]=await Promise.all([fetchJson<RidbResponse>(`https://ridb.recreation.gov/api/v1/facilities?${query}`,{},6500,{provider:"ridb",operation:"facilities_nearby",retries:1}),fetchJson<RidbResponse>(`https://ridb.recreation.gov/api/v1/recareas?${query}`,{},6500,{provider:"ridb",operation:"recareas_nearby",retries:1})]);return[...facilities.RECDATA.map(record=>({kind:"facilities" as const,record})),...areas.RECDATA.map(record=>({kind:"recareas" as const,record}))]});
 const unique=new Map<string,{kind:"facilities"|"recareas";record:RidbRecord}>();for(const item of records.flat()){const id=item.record.FacilityID??item.record.RecAreaID;if(id)unique.set(`${item.kind}-${id}`,item)}
 const withMedia=await mapWithConcurrency([...unique.values()].slice(0,30),2,async({kind,record})=>{const id=(record.FacilityID??record.RecAreaID)!,name=record.FacilityName??record.RecAreaName??"Recreation destination",latitude=Number(record.FacilityLatitude??record.RecAreaLatitude),longitude=Number(record.FacilityLongitude??record.RecAreaLongitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return undefined;const media=await ridbPhoto(kind,id,apiKey);return{id:`ridb-${kind}-${id}`,name,region:record.FacilityTypeDescription||"Recreation.gov",description:clean(record.FacilityDescription??record.RecAreaDescription),coordinates:{latitude,longitude},provider:"ridb" as const,activities:[record.FacilityTypeDescription||"Recreation"],...media}});
 return withMedia.flatMap(candidate=>candidate?.image&&candidate.imageCredit?[candidate]:[]);
}

async function enrichCandidate(result:QualifiedRoute<Candidate>,filters:DiscoverFilters,deps:DiscoveryDependencies):Promise<Trip|undefined>{
 const {candidate,route,routeSource}=result;if(!candidate.image||!candidate.imageCredit)return undefined;
 const [weather,campgrounds,events]=await Promise.all([deps.getWeather(candidate.coordinates,filters.leave).catch(error=>{logProviderError("open-meteo","forecast",error,{candidateId:candidate.id});return undefined}),deps.findCampgrounds(candidate.coordinates,process.env.RIDB_API_KEY).catch(error=>{logProviderError("ridb","campgrounds",error,{candidateId:candidate.id});return[]}),deps.findEvents(candidate.coordinates,filters.leave,filters.returnDate,process.env.TICKETMASTER_API_KEY).catch(error=>{logProviderError("ticketmaster","events",error,{candidateId:candidate.id});return[]})]);
 const tags=estimateTags(candidate.activities,candidate.name),fuelCost=Math.max(1,Math.round(route.distanceMiles/9*3.35*2)),estimated=routeSource==="estimated";
 return{id:candidate.id,destination:candidate.name,region:candidate.region,coordinates:candidate.coordinates,driveMinutes:route.driveMinutes,distanceMiles:route.distanceMiles,weather:weather?`${weather.high}° / ${weather.low}° · ${weather.label}`:"Forecast unavailable",weatherLive:Boolean(weather),campgroundLive:Boolean(campgrounds.length),eventLive:Boolean(events.length),campgrounds:campgrounds.length,activities:Math.max(candidate.activities.length,events.length,tags.length),tags,preferences:["Dog friendly"],fuelCost,campgroundCost:campgrounds.length?80:0,otherCost:25,image:candidate.image,imageCredit:candidate.imageCredit,explanation:clean(candidate.description)||`Official ${candidate.provider.toUpperCase()} destination data matched to your selected drive window.`,routeNote:estimated?"Conservative coordinate-distance estimate used because road routing was temporarily unavailable. This is not live routing and is not RV-safe; verify the route before towing.":"Live standard-vehicle route estimate. Verify RV height, weight, propane, and road restrictions before towing.",routeLive:!estimated,routeSource,novelty:88,weatherScore:weather?85:65,priceScore:75,rigFit:80,activityScore:Math.min(98,70+tags.length*6),campgroundNames:campgrounds,events};
}

const defaultDependencies:DiscoveryDependencies={geocode,routeBetween,getWeather,findCampgrounds,findEvents,loadNps:loadNpsCandidates,loadRidb:loadRidbCandidates,now:()=>new Date()};
export async function discoverTrips(filters:DiscoverFilters,keys:{nps?:string;ridb?:string},deps:DiscoveryDependencies=defaultDependencies):Promise<DiscoveryResponse>{
 const key=JSON.stringify([filters.start.trim().toLowerCase(),filters.maxDriveHours,filters.leave,filters.returnDate,filters.interests,filters.preferences,Boolean(keys.nps),Boolean(keys.ridb)]),cached=cache.get(key),now=deps.now();
 if(deps===defaultDependencies&&cached&&cached.expires>now.getTime())return{...cached.response,cached:true};
 if(!keys.nps&&!keys.ridb){const response:DiscoveryResponse={trips:curatedTrips,mode:"fallback",providers:[{provider:"nps",status:"missing_key",count:0,message:"NPS API key is not configured"},{provider:"ridb",status:"missing_key",count:0,message:"RIDB API key is not configured"}],message:"Showing clearly labeled curated fallback destinations because live provider keys are not configured.",cached:false,updatedAt:now.toISOString()};if(deps===defaultDependencies)cache.set(key,{expires:now.getTime()+CACHE_TTL,response});return response}
 const origin=await deps.geocode(filters.start),radius=searchRadiusMiles(filters.maxDriveHours),providers:DiscoveryProviderStatus[]=[];
 const loadNps=async()=>{if(!keys.nps){providers.push({provider:"nps",status:"missing_key",count:0,message:"NPS API key is not configured"});return[]};try{const items=await deps.loadNps(origin,radius,keys.nps);providers.push({provider:"nps",status:"ok",count:items.length});return items}catch(error){logProviderError("nps","parks",error);providers.push({provider:"nps",status:"error",count:0,message:error instanceof Error?error.message:"Provider unavailable"});return[]}};
 const nps=await loadNps(),loadRidb=async()=>{if(!keys.ridb){providers.push({provider:"ridb",status:"missing_key",count:0,message:"RIDB API key is not configured"});return[]};try{const items=await deps.loadRidb(origin,radius,keys.ridb,nps.sort((a,b)=>coordinateMiles(origin,a.coordinates)-coordinateMiles(origin,b.coordinates)).map(item=>item.coordinates));providers.push({provider:"ridb",status:"ok",count:items.length});return items}catch(error){logProviderError("ridb","proximity_discovery",error);providers.push({provider:"ridb",status:"error",count:0,message:error instanceof Error?error.message:"Provider unavailable"});return[]}};
 const ridb=await loadRidb(),candidates=mergeProviderCandidates(nps,ridb).sort((a,b)=>coordinateMiles(origin,a.coordinates)-coordinateMiles(origin,b.coordinates)).slice(0,MAX_ROUTE_CANDIDATES);
 const qualified=await qualifyRoutes(candidates,filters.start,origin,filters.maxDriveHours*60,candidate=>deps.routeBetween(filters.start,candidate.name,origin,candidate.coordinates),2);for(const result of qualified)if(result.routeError)logProviderError("osrm","route",result.routeError,{candidateId:result.candidate.id,fallback:"coordinate_estimate"});
 const routed=(await mapWithConcurrency(qualified,1,result=>enrichCandidate(result,filters,deps))).filter((trip):trip is Trip=>Boolean(trip)),estimatedCount=routed.filter(trip=>trip.routeSource==="estimated").length,failedProviders=providers.filter(provider=>provider.status!=="ok").length;
 let response:DiscoveryResponse;
 if(routed.length){const partial=Boolean(failedProviders||estimatedCount);response={trips:routed,mode:partial?"partial":"live",providers,message:estimatedCount?`${estimatedCount} result${estimatedCount===1?" uses":"s use"} a conservative coordinate-distance estimate because live road routing was temporarily unavailable. Estimates are not RV-safe.`:failedProviders?"Live results are available, but one or more destination providers could not contribute.":"Live destinations from official providers, filtered by actual road time.",cached:false,updatedAt:now.toISOString()}}
 else if(providers.some(provider=>provider.status==="ok")){response={trips:[],mode:"empty",providers,message:"Live providers responded, but no destinations were within the selected drive-time window.",cached:false,updatedAt:now.toISOString()}}
 else{response={trips:curatedTrips,mode:"fallback",providers,message:"Showing clearly labeled curated fallback destinations because live providers are unavailable or not configured.",cached:false,updatedAt:now.toISOString()}};
 if(deps===defaultDependencies)cache.set(key,{expires:now.getTime()+CACHE_TTL,response});return response;
}
