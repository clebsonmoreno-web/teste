import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {projectSchema} from '../src/model';
export const run=(cmd:string,args:string[])=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
export const probe=(file:string)=>JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
export const load=(file:string)=>projectSchema.parse(JSON.parse(readFileSync(file,'utf8')));
export function metadata(file:string){
 const p=probe(file);const v=p.streams.find((s:any)=>s.codec_type==='video');if(!v)throw Error('Arquivo sem vídeo');
 if(v.sample_aspect_ratio && !['1:1','N/A'].includes(v.sample_aspect_ratio))throw Error('Pixel não quadrado: preparar cópia de trabalho explicitamente antes de importar');
 if(v.side_data_list?.some((s:any)=>s.rotation))throw Error('Rotação em metadados: normalizar orientação explicitamente antes de importar');
 const [n,d]=v.avg_frame_rate.split('/').map(Number); const fps=n/d;
 const durationSeconds=Math.max(Number(v.duration||0),...p.streams.filter((s:any)=>s.codec_type==='audio').map((s:any)=>Number(s.duration||0)),Number(p.format.duration||0));
 if(!fps||!durationSeconds)throw Error('Metadados inválidos');
 return {width:v.width,height:v.height,fps,durationSeconds};
}
export const audioHash=(file:string,index:number)=>run('ffmpeg',['-v','error','-i',file,'-map',`0:a:${index}`,'-c','copy','-f','hash','-hash','sha256','-']).trim();
