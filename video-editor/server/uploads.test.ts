import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {ChunkUploads,CHUNK_SIZE} from './uploads';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
test('reúne blocos sem alterar bytes, impede duplicação e exige o tamanho completo',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'frame-upload-'));try{
  const store=new ChunkUploads(dir),bytes=Buffer.alloc(CHUNK_SIZE+17,45),s=store.create('original.mp4',bytes.length);
  assert.throws(()=>store.claim(s.id),/concluído/);
  await store.append(s.id,0,hash(bytes.subarray(0,CHUNK_SIZE)),Readable.from([bytes.subarray(0,CHUNK_SIZE)]));
  await assert.rejects(store.append(s.id,0,hash(bytes),Readable.from([bytes])),/posição/);
  await store.append(s.id,CHUNK_SIZE,hash(bytes.subarray(CHUNK_SIZE)),Readable.from([bytes.subarray(CHUNK_SIZE)]));
  const finished=store.claim(s.id);assert.deepEqual(readFileSync(finished.file),bytes);assert.equal(finished.received,bytes.length);store.remove(s.id);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('bloco corrompido ou incompleto não avança a posição nem deixa bytes inválidos',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'frame-upload-'));try{
  const store=new ChunkUploads(dir),s=store.create('original.mp4',4);
  await assert.rejects(store.append(s.id,0,hash(Buffer.from('xxxx')),Readable.from([Buffer.from('test')])),/integridade/);
  assert.equal(store.status(s.id).received,0);
  await assert.rejects(store.append(s.id,0,hash(Buffer.from('a')),Readable.from([Buffer.from('a')])),/incompleto/);
  await store.append(s.id,0,hash(Buffer.from('test')),Readable.from([Buffer.from('test')]));assert.equal(readFileSync(store.claim(s.id).file,'utf8'),'test');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('valida tamanho, tipo de arquivo e cancelamento de sessões',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'frame-upload-'));try{
  const store=new ChunkUploads(dir);assert.throws(()=>store.create('a.mp4',1024**3+1));assert.throws(()=>store.create('a.txt',4));
  const s=store.create('a.mp4',4);store.cancel(s.id);assert.throws(()=>store.status(s.id),/expirado/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
