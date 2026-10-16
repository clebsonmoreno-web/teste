import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {accessConfig,protectEditor,prepareStorage} from './hosting';
test('hospedagem exige credenciais completas e senha forte; execução local permanece igual',()=>{
 assert.equal(accessConfig({}).user,'');
 assert.throws(()=>accessConfig({AUTH_REQUIRED:'true'}));
 assert.throws(()=>accessConfig({AUTH_REQUIRED:'true',BASIC_AUTH_USER:'editor',BASIC_AUTH_PASSWORD:'curta'}));
 assert.throws(()=>accessConfig({BASIC_AUTH_USER:'editor'}));
 assert.equal(accessConfig({RENDER_EXTERNAL_URL:'https://editor-test.onrender.com'}).origin,'https://editor-test.onrender.com');
 assert.throws(()=>accessConfig({APP_ORIGIN:'https://example.org/outro'}));
});
test('acesso HTTP protege página, uploads e downloads; healthcheck permanece público',async()=>{
 const config=accessConfig({AUTH_REQUIRED:'true',BASIC_AUTH_USER:'editor',BASIC_AUTH_PASSWORD:'test-only-password-12345'});
 const app=express();app.use(protectEditor(config));app.use((_req,res)=>res.json({ok:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const port=(server.address() as {port:number}).port;
 try{
  for(const route of ['/','/api/projects','/originals/browser/example.mp4','/api/exports/example/download']){
   const r=await fetch(`http://127.0.0.1:${port}${route}`);assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate')!,/Basic/);
  }
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status,200);
  const response=await fetch(`http://127.0.0.1:${port}/`,{headers:{Authorization:`Basic ${Buffer.from('editor:test-only-password-12345').toString('base64')}`}});assert.equal(response.status,200);
  const wrong=await fetch(`http://127.0.0.1:${port}/`,{headers:{Authorization:`Basic ${Buffer.from('editor:wrong').toString('base64')}`}});assert.equal(wrong.status,401);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
test('disco persistente mantém os arquivos e nunca substitui uploads existentes',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'frame-hosting-'));const data=path.join(root,'data');const app=path.join(root,'app');mkdirSync(app);
 try{
  assert.equal(prepareStorage(undefined,app),path.join(app,'work/editor'));
  const store=prepareStorage(data,app);writeFileSync(path.join(app,'public/originals/browser/test.mp4'),'original bytes');
  assert.equal(readFileSync(path.join(data,'originals/test.mp4'),'utf8'),'original bytes');assert.equal(prepareStorage(data,app),store);
  const other=path.join(root,'other');mkdirSync(path.join(other,'public/originals/browser'),{recursive:true});writeFileSync(path.join(other,'public/originals/browser/existing.mp4'),'do not change');
  assert.throws(()=>prepareStorage(data,other),/Não será substituído/);assert.equal(readFileSync(path.join(other,'public/originals/browser/existing.mp4'),'utf8'),'do not change');
 }finally{rmSync(root,{recursive:true,force:true});}
});
