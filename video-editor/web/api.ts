export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export function parseApiResponse<T>(text:string,status:number,ok:boolean):T{
 let data;try{data=JSON.parse(text);}catch{
  if(status===413)throw new ApiError('O encaminhamento recusou o tamanho do envio (HTTP 413).',status);
  if(status===401||status===403)throw new ApiError(`O acesso pelo Codespaces foi recusado (HTTP ${status}). Reabra o editor pela aba Portas.`,status);
  throw new ApiError(`O encaminhamento devolveu uma página em vez dos dados do editor (HTTP ${status}). Reabra o editor pela aba Portas e tente novamente.`,status);
 }
 if(!ok)throw new ApiError(typeof data?.error==='string'?data.error:`Não foi possível concluir a operação (HTTP ${status}).`,status);
 return data as T;
}
export async function api<T>(url:string,options?:RequestInit):Promise<T>{const r=await fetch(url,options);return parseApiResponse<T>(await r.text(),r.status,r.ok);}
export async function uploadInChunks<T>(file:File,onProgress:(n:number)=>void):Promise<T>{
 const session=await api<{id:string;chunkSize:number;received:number}>('/api/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,size:file.size})});
 const url=`/api/uploads/${session.id}`;let offset=session.received;
 try{
  if(!Number.isSafeInteger(session.chunkSize)||session.chunkSize<=0||session.chunkSize>1024*1024)throw Error('Tamanho de bloco inválido. Atualize a página do editor.');
  while(offset<file.size){
   const end=Math.min(file.size,offset+session.chunkSize),chunk=file.slice(offset,end);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await chunk.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
   let sent=false;
   for(let attempt=0;attempt<3&&!sent;attempt++){
    try{const result=await api<{received:number}>(`${url}/chunk?offset=${offset}`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Chunk-SHA256':hash},body:chunk});if(result.received!==end)throw Error('O servidor recebeu uma quantidade inesperada de bytes.');sent=true;}
    catch(error){
     // A response can be lost after a successful write. Check before resending.
     let received=offset;try{received=(await api<{received:number}>(url)).received;}catch{}
     if(received===end){sent=true;break;}
     if(received!==offset||attempt===2||error instanceof ApiError&&error.status<500&&error.status!==409)throw error;
    }
   }
   offset=end;onProgress(Math.round(offset/file.size*100));
  }
  return await api<T>(`${url}/complete`,{method:'POST'});
 }catch(error){try{await api(url,{method:'DELETE'});}catch{}throw error;}
}
