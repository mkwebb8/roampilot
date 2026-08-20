export async function fetchJson<T>(url:string,init:RequestInit={},timeoutMs=6500):Promise<T>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(url,{...init,signal:controller.signal});if(!response.ok)throw new Error(`Provider returned ${response.status}`);return await response.json() as T}
 finally{clearTimeout(timeout)}
}
