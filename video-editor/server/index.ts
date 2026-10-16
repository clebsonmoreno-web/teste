import express from 'express';
import {createServer as createViteServer} from 'vite';
import {createServer} from 'node:http';
import {createReadStream,createWriteStream,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync,copyFileSync,openSync,readSync,closeSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {projectSchema,type Project} from '../src/model';
import {metadata,probe} from '../scripts/lib';
import {validateUpdate} from './project';
import {accessConfig,protectEditor,prepareStorage} from './hosting';
type RecordData={id:string;name:string;sha256:string;audioTracks:number;project:Project;peaks:number[]};
type Job={id:string;projectId:string;status:'running'|'done'|'error';error?:string;audioVerified?:boolean;originalUnchanged?:boolean};
const hosting=accessConfig();
const store=prepareStorage(process.env.EDITOR_DATA_DIR);mkdirSync(`${store}/projects`,{recursive:true});mkdirSync(`${store}/exports`,{recursive:true});mkdirSync('public/originals/browser',{recursive:true});
const idOK=(id:string)=>/^[a-f0-9-]{36}$/.test(id);
const fileFor=(id:string)=>{if(!idOK(id))throw Error('Projeto inválido');return `${store}/projects/${id}.json`;};
const record=(id:string):RecordData=>JSON.parse(readFileSync(fileFor(id),'utf8'));
const save=(r:RecordData)=>writeFileSync(fileFor(r.id),JSON.stringify(r,null,2));
const jobs=new Map<string,Job>();let rendering=false;
const digest=async(file:string)=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');};
const waveform=(file:string,duration:number,offset:number)=>new Promise<number[]>((resolve)=>{
 const sampleRate=8000,bins=1200,peaks=new Array<number>(bins).fill(0),total=Math.max(1,Math.ceil(duration*sampleRate));
 const child=spawn('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-ac','1','-ar',String(sampleRate),'-f','f32le','-'],{stdio:['ignore','pipe','ignore']});
 let sample=Math.round(offset*sampleRate),remainder=Buffer.alloc(0) as Buffer,finished=false;
 const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);const max=Math.max(...peaks,0.001);resolve(ok?peaks.map(n=>n/max):[]);};
 const timer=setTimeout(()=>{child.kill('SIGTERM');finish(false);},90000);
 child.stdout.on('data',(chunk:Buffer)=>{const data=remainder.length?Buffer.concat([remainder,chunk]):chunk;const end=data.length-data.length%4;for(let i=0;i<end;i+=4){const bin=Math.floor(sample++/total*bins);if(bin>=0&&bin<bins)peaks[bin]=Math.max(peaks[bin],Math.abs(data.readFloatLE(i)));}remainder=data.subarray(end);});
 child.once('error',()=>finish(false));child.once('close',code=>finish(code===0));
});
const app=express();app.disable('x-powered-by');
app.use(protectEditor(hosting));
app.use('/api',(req,res,next)=>{if(req.headers.origin&&req.headers.origin!==(hosting.origin||`${req.protocol}://${req.headers.host}`)){res.status(403).json({error:'Origem não permitida'});return;}next();});
app.use(express.json({limit:'2mb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.get('/api/projects',(_req,res)=>res.json(readdirSync(`${store}/projects`).filter(f=>f.endsWith('.json')).map(f=>{const r:RecordData=JSON.parse(readFileSync(`${store}/projects/${f}`,'utf8'));return {id:r.id,name:r.name,client:r.project.client};})));
app.get('/api/projects/:id',(req,res)=>{try{res.json(record(req.params.id));}catch{res.status(404).json({error:'Projeto não encontrado'});}});
app.post('/api/import',async(req,res)=>{
 const id=randomUUID(),source=`originals/browser/${id}.mp4`,file=path.resolve('public',source);
 try{
  if(!req.is('video/mp4')){res.status(415).json({error:'Selecione um arquivo MP4.'});return;}
  const hash=createHash('sha256');let bytes=0;
  await pipeline(req,new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;if(bytes>1024**3){done(Error('Limite de importação: 1 GB'));return;}hash.update(chunk);done(null,chunk);}}),createWriteStream(file,{flags:'wx'}));
  const header=Buffer.alloc(12);const fd=openSync(file,'r');try{readSync(fd,header,0,12,0);}finally{closeSync(fd);}if(header.toString('ascii',4,8)!=='ftyp')throw Error('O arquivo não é um MP4 válido.');
  const meta=metadata(file);const info=probe(file);const r:RecordData={id,name:path.basename(decodeURIComponent(String(req.headers['x-file-name']||'video.mp4'))),sha256:hash.digest('hex'),audioTracks:info.streams.filter((s:any)=>s.codec_type==='audio').length,project:projectSchema.parse({client:'Meu projeto',source,...meta,icons:[]}),peaks:await waveform(file,meta.durationSeconds,Number(info.streams.find((s:any)=>s.codec_type==='audio')?.start_time||0)-Number(info.format.start_time||0))};
  save(r);res.status(201).json(r);
 }catch(error){rmSync(file,{force:true});if(!res.destroyed)res.status(400).json({error:error instanceof Error?error.message:'Não foi possível importar o vídeo.'});}
});
app.put('/api/projects/:id',(req,res)=>{try{
 const r=record(req.params.id);const project=validateUpdate(r.project,req.body);
 r.project=project;save(r);res.json(r);
}catch(error){res.status(400).json({error:error instanceof Error?error.message:'Projeto inválido'});}});
app.post('/api/projects/:id/export',async(req,res)=>{
 if(rendering){res.status(409).json({error:'Já existe uma exportação em andamento. Aguarde a conclusão.'});return;}
 let r:RecordData;try{r=record(req.params.id);}catch{res.status(404).json({error:'Projeto não encontrado'});return;}
 const job:Job={id:randomUUID(),projectId:r.id,status:'running'};jobs.set(job.id,job);rendering=true;res.status(202).json(job);
 const output=`${store}/exports/${job.id}.mp4`,snapshot=`${store}/exports/${job.id}.json`,source=path.resolve('public',r.project.source);
 try{
  if(await digest(source)!==r.sha256)throw Error('O original foi alterado após a importação. Importe-o novamente.');
  if(r.project.icons.length===0){copyFileSync(source,output);job.originalUnchanged=true;job.audioVerified=true;job.status='done';rendering=false;return;}
  writeFileSync(snapshot,JSON.stringify(r.project));
  const browser=process.env.REMOTION_BROWSER_EXECUTABLE||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
  const child=spawn(process.execPath,['--import','tsx','scripts/render.ts',snapshot,output],{cwd:process.cwd(),env:{...process.env,...(browser?{REMOTION_BROWSER_EXECUTABLE:browser}:{})},stdio:['ignore','pipe','pipe']});
  let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log=(log+chunk.toString()).slice(-6000);});
  const timer=setTimeout(()=>child.kill('SIGTERM'),60*60*1000);
  const code=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);}).finally(()=>clearTimeout(timer));
  if(code!==0||!existsSync(output))throw Error(log.includes('Could not find')?'Não foi possível abrir o vídeo.':`A exportação falhou. Confira a compatibilidade do MP4, do áudio e a disponibilidade do Chromium. ${log.slice(-1200)}`);
  if(await digest(source)!==r.sha256)throw Error('Falha na integridade do arquivo original.');
  job.status='done';job.audioVerified=true;
 }catch(error){job.status='error';job.error=error instanceof Error?error.message:'Falha ao exportar';rmSync(output,{force:true});}
 finally{rendering=false;rmSync(snapshot,{force:true});}
});
app.get('/api/exports/:id',(req,res)=>{const job=jobs.get(req.params.id);if(!job){res.status(404).json({error:'Exportação não encontrada'});return;}res.json(job);});
app.get('/api/exports/:id/download',(req,res)=>{const job=jobs.get(req.params.id);if(job?.status!=='done'){res.status(404).end();return;}res.download(`${store}/exports/${job.id}.mp4`,'video-editado.mp4');});
app.use('/originals',express.static(path.resolve('public/originals'),{dotfiles:'deny',fallthrough:false}));
const server=createServer(app);
if(process.env.NODE_ENV==='production')app.use(express.static('web-dist'));
else{const vite=await createViteServer({configFile:path.resolve('vite.config.ts'),server:{middlewareMode:true,hmr:{server}}});app.use(vite.middlewares);}
app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error.message);if(!res.headersSent)res.status(500).json({error:'Não foi possível concluir a operação.'});});
const port=Number(process.env.PORT||5173);server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Editor visual: http://localhost:${port}`));
