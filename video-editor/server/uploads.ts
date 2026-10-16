import {randomUUID,createHash} from 'node:crypto';
import {createWriteStream,mkdirSync,openSync,closeSync,rmSync,readdirSync,truncateSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform,type Readable} from 'node:stream';
import path from 'node:path';
export const CHUNK_SIZE=512*1024;
export class UploadError extends Error{constructor(message:string,public status=400){super(message);}}
type Upload={id:string;name:string;size:number;received:number;file:string;busy:boolean;touched:number};
export class ChunkUploads{
 private sessions=new Map<string,Upload>();
 constructor(private dir:string){
  mkdirSync(dir,{recursive:true});
  // Incomplete sessions cannot survive a server restart. Never touch originals.
  for(const file of readdirSync(dir))if(/^[a-f0-9-]{36}\.part$/.test(file))rmSync(path.join(dir,file),{force:true});
 }
 create(name:unknown,size:unknown){
  for(const session of this.sessions.values())if(!session.busy&&Date.now()-session.touched>60*60*1000)this.remove(session.id);
  if(typeof name!=='string'||name.length>255||!name.toLowerCase().endsWith('.mp4'))throw new UploadError('Selecione um arquivo MP4.');
  if(typeof size!=='number'||!Number.isSafeInteger(size)||size<=0||size>1024**3)throw new UploadError('O vídeo deve ter até 1 GB.');
  if(this.sessions.size>=4)throw new UploadError('Há uploads pendentes. Aguarde ou tente novamente mais tarde.',409);
  const id=randomUUID(),file=path.join(this.dir,`${id}.part`);closeSync(openSync(file,'wx'));
  const session:Upload={id,name:path.basename(name),size,received:0,file,busy:false,touched:Date.now()};this.sessions.set(id,session);return this.status(id);
 }
 private get(id:string){const s=this.sessions.get(id);if(!s)throw new UploadError('Envio não encontrado ou expirado. Selecione o vídeo novamente.',404);return s;}
 status(id:string){const s=this.get(id);return {id:s.id,size:s.size,received:s.received,chunkSize:CHUNK_SIZE};}
 async append(id:string,offset:number,expectedHash:string,body:Readable){
  const s=this.get(id);if(s.busy)throw new UploadError('Este envio já está sendo processado.',409);
  if(!Number.isSafeInteger(offset)||offset!==s.received)throw new UploadError('A posição do bloco diverge do envio. Tente novamente.',409);
  if(!/^[a-f0-9]{64}$/.test(expectedHash))throw new UploadError('Verificação do bloco ausente ou inválida.');
  const limit=Math.min(CHUNK_SIZE,s.size-offset);if(limit<=0)throw new UploadError('Todos os bytes já foram recebidos.',409);
  s.busy=true;let bytes=0;const hash=createHash('sha256');
  try{
   await pipeline(body,new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;if(bytes>limit){done(new UploadError('Bloco maior que o permitido.',413));return;}hash.update(chunk);done(null,chunk);}}),createWriteStream(s.file,{flags:'r+',start:offset}));
   if(bytes!==limit)throw new UploadError('Bloco incompleto. Tente novamente.',422);
   if(hash.digest('hex')!==expectedHash)throw new UploadError('O bloco recebido não passou na verificação de integridade.',422);
   s.received+=bytes;s.touched=Date.now();return this.status(id);
  }catch(error){truncateSync(s.file,offset);throw error;}finally{s.busy=false;}
 }
 claim(id:string){const s=this.get(id);if(s.busy||s.received!==s.size)throw new UploadError('O envio ainda não foi concluído.',409);s.busy=true;return {...s};}
 cancel(id:string){const s=this.get(id);if(s.busy)throw new UploadError('Aguarde o processamento do envio.',409);this.remove(id);}
 remove(id:string){const s=this.sessions.get(id);if(s){rmSync(s.file,{force:true});this.sessions.delete(id);}}
}
