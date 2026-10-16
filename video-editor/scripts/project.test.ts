import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectSchema} from '../src/model';
import {audioHash,load,metadata,probe} from './lib';
const demo=load('projects/demo.json');
test('rejeita intervalos inválidos, IDs duplicados e coordenadas fora do quadro',()=>{
 const cue=demo.icons[0];
 for(const icons of [[{...cue,end:cue.start}],[cue,cue],[{...cue,x:1.1}],[{...cue,end:demo.durationSeconds+1}]])assert.equal(projectSchema.safeParse({...demo,icons}).success,false);
});
test('aceita projeto sem sobreposições e tempos fracionários',()=>{
 assert.equal(projectSchema.safeParse({...demo,icons:[]}).success,true);
 assert.equal(projectSchema.safeParse(demo).success,true);
});
test('metadados correspondem ao vídeo original, com faixa de áudio real',()=>{
 assert.deepEqual(metadata(`public/${demo.source}`),{width:640,height:360,fps:30,durationSeconds:3});
 assert.equal(probe(`public/${demo.source}`).streams.filter((s:any)=>s.codec_type==='audio').length,1);
 assert.match(audioHash(`public/${demo.source}`,0),/^SHA256=[a-f0-9]{64}$/);
});
