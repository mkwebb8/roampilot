export type Interest = "Scenic"|"Small towns"|"Hiking"|"Lake"|"Fishing"|"Events"|"Food"|"Museums"|"Amusement parks"|"Relaxing";
export type CampingPreference = "Full hookups"|"Electric"|"State park"|"Boondocking"|"Pull-through"|"Dog friendly";
export interface RigProfile { home:string; rv:{year:number;manufacturer:string;model:string;type:string;lengthFt:number;heightFt:number;widthFt:number;gvwr:number;service:string;slides:number;freshTank:number;generator:boolean}; towVehicle:{year:number;manufacturer:string;model:string;engine:string;fuel:string;tankGallons:number;towingMpg:number}; }
export interface ImageCredit {label:string;sourceUrl:string;license:string}
export interface Coordinates {latitude:number;longitude:number}
export interface Trip {id:string;destination:string;region:string;coordinates:Coordinates;driveMinutes:number;distanceMiles:number;weather:string;weatherLive?:boolean;campgroundLive?:boolean;eventLive?:boolean;campgrounds:number;activities:number;tags:Interest[];preferences:CampingPreference[];fuelCost:number;campgroundCost:number;otherCost:number;image:string;imageCredit:ImageCredit;explanation:string;routeNote:string;routeLive?:boolean;novelty:number;weatherScore:number;priceScore:number;rigFit:number;activityScore:number;campgroundNames:string[];events:string[];}
export interface DiscoverFilters {start:string;leave:string;returnDate:string;maxDriveHours:number;adults:number;kids:number;dogs:number;interests:Interest[];preferences:CampingPreference[]}
export interface ScoredTrip extends Trip {score:number;scoreBreakdown:Record<string,number>}
export interface RoadStop {id:string;name:string;type:string;minutesAhead:number;milesOffRoute:number;maxRigFt:number;pullThrough:boolean;electric:string;dogFriendly:boolean;price:number;availability:string;direction:string}
export interface ItineraryStop {id:string;place:string;nights:number}
export interface RouteLeg {from:string;to:string;distanceMiles:number;driveMinutes:number;source:"live"|"estimate"}
export interface LiveTripData {weather?:{label:string;high:number;low:number;source:string};route?:{distanceMiles:number;driveMinutes:number;source:string};campgrounds?:string[];events?:string[];updatedAt:string}
export type DiscoveryProvider="nps"|"ridb";
export type DiscoveryMode="live"|"partial"|"fallback"|"empty"|"error";
export interface DiscoveryProviderStatus {provider:DiscoveryProvider;status:"ok"|"missing_key"|"error";count:number;message?:string}
export interface DiscoveryResponse {trips:Trip[];mode:DiscoveryMode;providers:DiscoveryProviderStatus[];message:string;cached:boolean;updatedAt:string}
