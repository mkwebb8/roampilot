import { trips as curatedTrips } from "../seed";
import type { Coordinates,DiscoverFilters,DiscoveryProviderStatus,DiscoveryResponse,ImageCredit,Interest,Trip } from "../types";
import { findCampgrounds } from "./campgrounds";
import { findEvents } from "./events";
import { geocode } from "./geocoding";
import { fetchJson } from "./http";
import { routeBetween } from "./routing";
import { getWeather } from "./weather";

type Candidate={id:string;name:string;region:string;description:string;coordinates:Coordinates;image?:string;imageCredit?:ImageCredit;provider:"nps"|"ridb";activities:string[]};
type NpsImage={url:string;title?:string;caption?:string;credit?:string};
type NpsPark={id:string;fullName:string;description:string;states:string;latitude:string;longitude:string;url:string;activities?:Array<{name:string}>;images?:NpsImage[]};
type NpsResponse={data:NpsPark[]};
type RidbFacility={FacilityID:string;FacilityName:string;FacilityDescription?:string;FacilityLatitude:number;FacilityLongitude:number;FacilityTypeDescription?:string;FacilityReservationURL?:string};
type RidbResponse={RECDATA:RidbFacility[]};
type RidbMedia={URL:string;Title?:string;Subtitle?:string;Description?:string;Credits?:string;MediaType?:string};
type RidbMediaResponse={RECDATA:RidbMedia[]};
type DiscoveryDependencies={geocode:typeof geocode;routeBetween:typeof routeBetween;getWeather:typeof getWeather;findCampgrounds:typeof findCampgrounds;findEvents:typeof findEvents;loadNps:typeof loadNpsCandidates;loadRidb:typeof loadRidbCandidates;now:()=>Date};

const CACHE_TTL=15*60*1000;
const cache=new Map<string,{expires:number;response:DiscoveryResponse}>();
const milesBetween=(a:Coordinates,b:Coordinates)=>{const toRad=(value:number)=>value*Math.PI/180;const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);const value=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(value),Math.sqrt(1-value))};
const searchRadiusMiles=(hours:number)=>Math.max(45,Math.ceil(hours*55*1.15));
const clean=(value:string|undefined)=>value?.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()||"";
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const estimateTags=(activities:string[],name:string):Interest[]=>{const text=`${activities.join(" ")} ${name}`.toLowerCase();const tags:Interest[]=[];if(/hike|trail|climb/.test(text))tags.push("Hiking");if(/lake|water|beach|river/.test(text))tags.push("Lake");if(/fish/.test(text))tags.push("Fishing");if(/museum|history|historic/.test(text))tags.push("Museums");if(/food|culinary/.test(text))tags.push("Food");if(/scenic|park|forest|mountain|nature/.test(text))tags.push("Scenic");return tags.length?tags:["Relaxing","Scenic"]};

async function loadNpsCandidates(origin:Coordinates,radiusMiles:number,apiKey?:string):Promise<Candidate[]>{
 if(!apiKey)return[];
 const data=await fetchJson<NpsResponse>("https://developer.nps.gov/api/v1/parks?limit=500&fields=images,activities",{headers:{"X-Api-Key":apiKey}});
 return data.data.flatMap(park=>{const latitude=Number(park.latitude),longitude=Number(park.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return[];const coordinates={latitude,longitude};if(milesBetween(origin,coordinates)>radiusMiles)return[];const photo=park.images?.find(image=>image.url);if(!photo)return[];return[{id:`nps-${park.id}`,name:park.fullName,region:park.states||"National Park Service",description:park.description,coordinates,provider:"nps" as const,activities:park.activities?.map(activity=>activity.name)??[],image:photo.url,imageCredit:{label:photo.credit||photo.title||"National Park Service",sourceUrl:park.url,license:"NPS-provided image; see source for rights and attribution"}}]});
}

async function ridbPhoto(facilityId:string,apiKey:string):Promise<{image?:string;imageCredit?:ImageCredit}>{
 try{const data=await fetchJson<RidbMediaResponse>(`https://ridb.recreation.gov/api/v1/facilities/${encodeURIComponent(facilityId)}/media?limit=10&apikey=${encodeURIComponent(apiKey)}`);const photo=data.RECDATA.find(item=>item.URL&&(!item.MediaType||/image|photo/i.test(item.MediaType)));return photo?{image:photo.URL,imageCredit:{label:photo.Credits||photo.Title||"Recreation.gov RIDB",sourceUrl:photo.URL,license:photo.Description||photo.Subtitle||"RIDB provider media; see source for rights and attribution"}}:{}}catch{return{}};
}

async function loadRidbCandidates(origin:Coordinates,radiusMiles:number,apiKey?:string):Promise<Candidate[]>{
 if(!apiKey)return[];
 const data=await fetchJson<RidbResponse>(`https://ridb.recreation.gov/api/v1/facilities?latitude=${origin.latitude}&longitude=${origin.longitude}&radius=${radiusMiles}&limit=50&apikey=${encodeURIComponent(apiKey)}`);
 const facilities=data.RECDATA.filter(item=>Number.isFinite(Number(item.FacilityLatitude))&&Number.isFinite(Number(item.FacilityLongitude))).slice(0,24);
 const candidates=await Promise.all(facilities.map(async facility=>{const media=await ridbPhoto(facility.FacilityID,apiKey);return{id:`ridb-${facility.FacilityID}`,name:facility.FacilityName,region:facility.FacilityTypeDescription||"Recreation.gov",description:clean(facility.FacilityDescription),coordinates:{latitude:Number(facility.FacilityLatitude),longitude:Number(facility.FacilityLongitude)},provider:"ridb" as const,activities:[facility.FacilityTypeDescription||"Recreation"],...media}}));
 return candidates.filter(candidate=>Boolean(candidate.image&&candidate.imageCredit));
}

const dedupe=(candidates:Candidate[])=>{const seen=new Set<string>();return candidates.filter(candidate=>{const key=`${slug(candidate.name)}-${candidate.coordinates.latitude.toFixed(2)}-${candidate.coordinates.longitude.toFixed(2)}`;if(seen.has(key))return false;seen.add(key);return true})};
async function mapCandidate(candidate:Candidate,filters:DiscoverFilters,origin:Coordinates,deps:DiscoveryDependencies):Promise<Trip|undefined>{
 const route=await deps.routeBetween(filters.start,candidate.name,origin,candidate.coordinates);
 if(route.driveMinutes>filters.maxDriveHours*60)return undefined;
 const [weather,campgrounds,events]=await Promise.all([deps.getWeather(candidate.coordinates,filters.leave).catch(()=>undefined),deps.findCampgrounds(candidate.coordinates,process.env.RIDB_API_KEY).catch(()=>[]),deps.findEvents(candidate.coordinates,filters.leave,filters.returnDate,process.env.TICKETMASTER_API_KEY).catch(()=>[])]);
 if(!candidate.image||!candidate.imageCredit)return undefined;
 const tags=estimateTags(candidate.activities,candidate.name),fuelCost=Math.max(1,Math.round(route.distanceMiles/9*3.35*2));
 return{id:candidate.id,destination:candidate.name,region:candidate.region,coordinates:candidate.coordinates,driveMinutes:route.driveMinutes,distanceMiles:route.distanceMiles,weather:weather?`${weather.high}° / ${weather.low}° · ${weather.label}`:"Forecast unavailable",weatherLive:Boolean(weather),campgroundLive:Boolean(campgrounds.length),eventLive:Boolean(events.length),campgrounds:campgrounds.length,activities:Math.max(candidate.activities.length,events.length,tags.length),tags,preferences:["Dog friendly"],fuelCost,campgroundCost:campgrounds.length?80:0,otherCost:25,image:candidate.image,imageCredit:candidate.imageCredit,explanation:clean(candidate.description)||`Official ${candidate.provider.toUpperCase()} destination data matched to your selected drive window.`,routeNote:"Live standard-vehicle route estimate. Verify RV height, weight, propane, and road restrictions before towing.",routeLive:true,novelty:88,weatherScore:weather?85:65,priceScore:75,rigFit:80,activityScore:Math.min(98,70+tags.length*6),campgroundNames:campgrounds,events};
}

const defaultDependencies:DiscoveryDependencies={geocode,routeBetween,getWeather,findCampgrounds,findEvents,loadNps:loadNpsCandidates,loadRidb:loadRidbCandidates,now:()=>new Date()};
export async function discoverTrips(filters:DiscoverFilters,keys:{nps?:string;ridb?:string},deps:DiscoveryDependencies=defaultDependencies):Promise<DiscoveryResponse>{
 const key=JSON.stringify([filters.start.trim().toLowerCase(),filters.maxDriveHours,filters.leave,filters.returnDate,filters.interests,filters.preferences,Boolean(keys.nps),Boolean(keys.ridb)]),cached=cache.get(key),now=deps.now();
 if(deps===defaultDependencies&&cached&&cached.expires>now.getTime())return{...cached.response,cached:true};
 if(!keys.nps&&!keys.ridb){const response:DiscoveryResponse={trips:curatedTrips,mode:"fallback",providers:[{provider:"nps",status:"missing_key",count:0,message:"NPS API key is not configured"},{provider:"ridb",status:"missing_key",count:0,message:"RIDB API key is not configured"}],message:"Showing clearly labeled curated fallback destinations because live provider keys are not configured.",cached:false,updatedAt:now.toISOString()};if(deps===defaultDependencies)cache.set(key,{expires:now.getTime()+CACHE_TTL,response});return response}
 const origin=await deps.geocode(filters.start),radius=searchRadiusMiles(filters.maxDriveHours),providers:DiscoveryProviderStatus[]=[];
 const load=async(provider:"nps"|"ridb",apiKey:string|undefined,loader:typeof loadNpsCandidates)=>{if(!apiKey){providers.push({provider,status:"missing_key",count:0,message:`${provider.toUpperCase()} API key is not configured`});return[]};try{const items=await loader(origin,radius,apiKey);providers.push({provider,status:"ok",count:items.length});return items}catch(error){providers.push({provider,status:"error",count:0,message:error instanceof Error?error.message:"Provider unavailable"});return[]}};
 const [nps,ridb]=await Promise.all([load("nps",keys.nps,deps.loadNps),load("ridb",keys.ridb,deps.loadRidb)]),candidates=dedupe([...nps,...ridb]);
 const routed=(await Promise.all(candidates.map(candidate=>mapCandidate(candidate,filters,origin,deps).catch(()=>undefined)))).filter((trip):trip is Trip=>Boolean(trip));
 const okProviders=providers.filter(provider=>provider.status==="ok").length,failedProviders=providers.filter(provider=>provider.status!=="ok").length;
 let response:DiscoveryResponse;
 if(routed.length){response={trips:routed,mode:failedProviders?"partial":"live",providers,message:failedProviders?"Live results are available, but one or more providers could not contribute.":"Live destinations from official providers, filtered by actual road time.",cached:false,updatedAt:now.toISOString()}}
 else if(okProviders){response={trips:[],mode:"empty",providers,message:"Live providers responded, but no destinations were within the selected road-time window.",cached:false,updatedAt:now.toISOString()}}
 else{response={trips:curatedTrips,mode:"fallback",providers,message:"Showing clearly labeled curated fallback destinations because live providers are unavailable or not configured.",cached:false,updatedAt:now.toISOString()}};
 if(deps===defaultDependencies)cache.set(key,{expires:now.getTime()+CACHE_TTL,response});
 return response;
}
