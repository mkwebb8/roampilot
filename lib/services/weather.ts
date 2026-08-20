import { fetchJson } from "./http";
import type { Coordinates } from "../types";
type Forecast={daily:{temperature_2m_max:number[];temperature_2m_min:number[];weather_code:number[]}};
const describe=(code:number)=>code===0?"Clear":code<=3?"Partly cloudy":code<=48?"Fog possible":code<=67?"Rain possible":code<=77?"Snow possible":code<=82?"Showers possible":"Storms possible";
export async function getWeather(point:Coordinates,date:string){
 const requested=new Date(`${date}T12:00:00Z`),today=new Date(),days=Math.ceil((requested.getTime()-today.getTime())/86400000),forecastDays=Math.min(16,Math.max(1,days+1));
 const data=await fetchJson<Forecast>(`https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=${forecastDays}`);
 const index=Math.min(Math.max(0,days),data.daily.temperature_2m_max.length-1);
 return{label:describe(data.daily.weather_code[index]),high:Math.round(data.daily.temperature_2m_max[index]),low:Math.round(data.daily.temperature_2m_min[index]),source:"Open-Meteo"};
}
