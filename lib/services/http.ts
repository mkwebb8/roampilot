export type ProviderContext={provider:string;operation:string;retries?:number};
export class ProviderRequestError extends Error{constructor(public provider:string,public operation:string,public status:number|undefined,public kind:"http"|"timeout"|"network",message:string){super(message);this.name="ProviderRequestError"}}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export function logProviderError(provider:string,operation:string,error:unknown,details:Record<string,string|number|boolean|undefined>={}){const requestError=error instanceof ProviderRequestError?error:undefined;console.warn(JSON.stringify({event:"provider_error",provider,operation,status:requestError?.status,kind:requestError?.kind??"unknown",message:error instanceof Error?error.message:"Provider request failed",...details}))}
export async function fetchJson<T>(url:string,init:RequestInit={},timeoutMs=6500,context:ProviderContext={provider:"external",operation:"request",retries:0}):Promise<T>{
 const attempts=Math.max(1,(context.retries??0)+1);
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(url,{...init,signal:controller.signal});
   if(!response.ok){await response.body?.cancel();const retryable=response.status===429||response.status>=500;const error=new ProviderRequestError(context.provider,context.operation,response.status,"http",`${context.provider} returned ${response.status}`);if(retryable&&attempt<attempts-1){logProviderError(context.provider,context.operation,error,{attempt:attempt+1,retrying:true});await wait(200*2**attempt);continue}throw error}
   return await response.json() as T;
  }catch(error){
   if(error instanceof ProviderRequestError)throw error;
   const timedOut=error instanceof DOMException&&error.name==="AbortError",wrapped=new ProviderRequestError(context.provider,context.operation,undefined,timedOut?"timeout":"network",timedOut?`${context.provider} request timed out`:`${context.provider} request failed`);
   if(attempt<attempts-1){logProviderError(context.provider,context.operation,wrapped,{attempt:attempt+1,retrying:true});await wait(200*2**attempt);continue}
   throw wrapped;
  }finally{clearTimeout(timeout)}
 }
 throw new ProviderRequestError(context.provider,context.operation,undefined,"network",`${context.provider} request failed`);
}
