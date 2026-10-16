import {bundle} from '@remotion/bundler';
import {renderMedia,selectComposition} from '@remotion/renderer';
import {mkdirSync,existsSync,renameSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {load,metadata,probe,run,audioHash} from './lib';
const [config,output]=process.argv.slice(2);if(!config||!output||!output.endsWith('.mp4'))throw Error('Uso: npm run render -- projects/demo.json out/demo.mp4');
if(existsSync(output))throw Error('Saída existente: escolha outro nome');
const props=load(config);const source=path.resolve('public',props.source);
if(!source.startsWith(path.resolve('public')+path.sep))throw Error('Fonte deve estar em public/');
const actual=metadata(source);
for(const key of ['width','height','fps','durationSeconds'] as const)if(Math.abs(props[key]-actual[key])>0.001)throw Error(`Metadado divergente: ${key}. Importe o original novamente.`);
mkdirSync('work',{recursive:true});const temp=mkdtempSync('work/render-');
try{
 const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
 const browserExecutable=process.env.REMOTION_BROWSER_EXECUTABLE;
 const composition=await selectComposition({serveUrl,id:'VideoEdit',inputProps:props,browserExecutable});
 await renderMedia({serveUrl,composition,inputProps:props,codec:'h264',muted:true,pixelFormat:props.width%2||props.height%2?'yuv444p':'yuv420p',crf:18,outputLocation:`${temp}/video.mp4`,browserExecutable,concurrency:2});
 run('ffmpeg',['-v','error','-i',`${temp}/video.mp4`,'-i',source,'-map','0:v:0','-map','1:a?','-map_metadata','1','-c','copy','-movflags','+faststart',`${temp}/final.mp4`]);
 const original=probe(source).streams.filter((s:any)=>s.codec_type==='audio');const final=probe(`${temp}/final.mp4`).streams.filter((s:any)=>s.codec_type==='audio');
 if(original.length!==final.length)throw Error('Contagem de faixas de áudio divergente');
 original.forEach((_:unknown,i:number)=>{if(audioHash(source,i)!==audioHash(`${temp}/final.mp4`,i))throw Error(`Áudio ${i} divergente`);});
 const result=metadata(`${temp}/final.mp4`);if(result.width!==props.width||result.height!==props.height)throw Error('Resolução divergente');
 mkdirSync(path.dirname(output),{recursive:true});renameSync(`${temp}/final.mp4`,output);console.log(`MP4 validado: ${output}; ${original.length} faixa(s) de áudio copiadas e verificadas por SHA-256.`);
}finally{rmSync(temp,{recursive:true,force:true});}
