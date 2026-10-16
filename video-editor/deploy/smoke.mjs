// Local-only acceptance test. Builds no remote resource and publishes no image.
import {execFileSync} from 'node:child_process';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const image=process.env.EDITOR_IMAGE||'frame-editor:local-test',port=Number(process.env.EDITOR_SMOKE_PORT||5188);
const suffix=randomUUID().slice(0,8),name=`frame-smoke-${suffix}`,volume=`frame-smoke-data-${suffix}`;
const env={...process.env,BASIC_AUTH_USER:'smoke-test',BASIC_AUTH_PASSWORD:randomBytes(24).toString('base64url')};
// Always use the local daemon, rather than a caller-selected remote context.
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const docker=(...args)=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const origin=`http://127.0.0.1:${port}`,auth=`Basic ${Buffer.from(`${env.BASIC_AUTH_USER}:${env.BASIC_AUTH_PASSWORD}`).toString('base64')}`;
const sha=b=>createHash('sha256').update(b).digest('hex');
async function request(route,options={}){const r=await fetch(origin+route,{...options,headers:{Authorization:auth,...options.headers}});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
async function ready(){for(let i=0;i<90;i++){try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error('Container did not become healthy');}
async function waitJob(id){for(let i=0;i<240;i++){const job=await request(`/api/exports/${id}`);if(job.status==='done')return job;if(job.status==='error')throw Error(job.error);await new Promise(r=>setTimeout(r,1000));}throw Error('Export timed out');}
try{
 docker('volume','create',volume);
 docker('run','--detach','--name',name,'--memory=2g','--cpus=1','--shm-size=512m','--publish',`127.0.0.1:${port}:5173`,'--mount',`type=volume,src=${volume},dst=/data`,'--env','BASIC_AUTH_USER','--env','BASIC_AUTH_PASSWORD','--env',`APP_ORIGIN=${origin}`,image);
 await ready();assert.equal((await fetch(origin+'/')).status,401);assert.equal((await fetch(origin+'/',{headers:{Authorization:auth}})).status,200);console.log('Container saudável: página protegida e usuário sem privilégios.');
 assert.equal(docker('exec',name,'sh','-c','ps -eo user,args | grep "node --import tsx server/index.ts" | grep -v grep').trim().split(/\s+/)[0],'node');
 const bytes=readFileSync('public/originals/demo.mp4');const record=await request('/api/import',{method:'POST',headers:{'Content-Type':'video/mp4','X-File-Name':'smoke-demo.mp4',Origin:origin},body:bytes});assert.equal(record.sha256,sha(bytes));
 let job=await request(`/api/projects/${record.id}/export`,{method:'POST',headers:{Origin:origin}});await waitJob(job.id);
 let r=await fetch(`${origin}/api/exports/${job.id}/download`,{headers:{Authorization:auth}});assert.equal(sha(Buffer.from(await r.arrayBuffer())),sha(bytes));
 const project={...record.project,icons:[{id:'smoke-icon',icon:'check',start:0.5,end:1.5,x:0.7,y:0.3,size:48,color:'#ffffff',motion:'slide'}]};
 await request(`/api/projects/${record.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(project)});
 job=await request(`/api/projects/${record.id}/export`,{method:'POST',headers:{Origin:origin}});const done=await waitJob(job.id);assert(done.audioVerified);
 r=await fetch(`${origin}/api/exports/${job.id}/download`,{headers:{Authorization:auth}});assert.equal(r.status,200);mkdirSync('work',{recursive:true});writeFileSync('work/docker-export.mp4',Buffer.from(await r.arrayBuffer()));
 const audioHash=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();assert.equal(audioHash('work/docker-export.mp4'),audioHash('public/originals/demo.mp4'));
 console.log('Importação, edição, exportação e download aprovados em Docker com 1 CPU/2 GB. Áudio conferido por SHA-256.');
 docker('restart',name);await ready();const reopened=await request(`/api/projects/${record.id}`);assert.deepEqual(reopened.project,project);
 r=await fetch(`${origin}/${record.project.source}`,{headers:{Authorization:auth}});assert.equal(sha(Buffer.from(await r.arrayBuffer())),sha(bytes));
 const range=await fetch(`${origin}/${record.project.source}`,{headers:{Authorization:auth,Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
 console.log('Após reinício: projeto e original intactos no volume. Reprodução com HTTP Range aprovada.');
 // Browser QA runs outside Docker using the application's HTTP interface.
 const {chromium}=await import('playwright-core');const browser=await chromium.launch({executablePath:process.env.REMOTION_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{const page=await browser.newPage({httpCredentials:{username:env.BASIC_AUTH_USER,password:env.BASIC_AUTH_PASSWORD}});await page.goto(origin);await page.getByLabel('Abrir projeto salvo').selectOption(record.id);await page.getByText('640 × 360 · 30 fps').waitFor();await page.getByRole('button',{name:'Reproduzir',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Pausar',exact:true}).click();console.log('Interface protegida e reprodução aprovadas no navegador.');}finally{await browser.close();}
}finally{try{docker('rm','--force',name);}catch{}try{docker('volume','rm',volume);}catch{}}
