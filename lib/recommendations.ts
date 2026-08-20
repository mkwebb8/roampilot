import type { DiscoverFilters, ScoredTrip, Trip } from "./types";
export const weights={rigFit:.25,driveTime:.20,weather:.15,activities:.15,price:.10,preferences:.10,novelty:.05} as const;
const overlap=(a:string[],b:string[])=>b.length?Math.min(100,(a.filter(x=>b.includes(x)).length/b.length)*100):75;
export function scoreTrip(trip:Trip,filters:DiscoverFilters):ScoredTrip{const driveTime=Math.max(0,100-Math.max(0,trip.driveMinutes-filters.maxDriveHours*60)*1.5);const activities=(trip.activityScore+overlap(trip.tags,filters.interests))/2;const preferences=overlap(trip.preferences,filters.preferences);const parts={rigFit:trip.rigFit,driveTime,weather:trip.weatherScore,activities,price:trip.priceScore,preferences,novelty:trip.novelty};const score=Math.round(Object.entries(weights).reduce((sum,[key,w])=>sum+parts[key as keyof typeof parts]*w,0));return{...trip,score,scoreBreakdown:parts}}
export function recommendTrips(all:Trip[],filters:DiscoverFilters){return all.filter(t=>t.driveMinutes<=filters.maxDriveHours*60+20).map(t=>scoreTrip(t,filters)).sort((a,b)=>b.score-a.score).slice(0,5)}
export const tripTotal=(trip:Trip)=>trip.fuelCost+trip.campgroundCost+trip.otherCost;
