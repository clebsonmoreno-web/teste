import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateUpdate} from './project';
import {projectSchema} from '../src/model';
import demo from '../projects/demo.json';
const original=projectSchema.parse(demo);
test('edição visual não pode substituir a fonte nem alterar a geometria ou a duração',()=>{
 for(const [key,value] of Object.entries({source:'originals/outro.mp4',width:1280,height:720,fps:24,durationSeconds:10}))assert.throws(()=>validateUpdate(original,{...original,[key]:value}),/Metadados originais/);
});
test('ícones e identificação do projeto podem ser editados sem modificar o original',()=>{
 const next=validateUpdate(original,{...original,client:'Cliente novo',icons:[]});assert.equal(next.client,'Cliente novo');assert.deepEqual(next.icons,[]);assert.equal(original.icons.length,2);assert.equal(next.source,original.source);
});
test('limita a quantidade de sobreposições',()=>{
 const icons=Array.from({length:501},(_,n)=>({...original.icons[0],id:`cue-${n}`}));assert.throws(()=>validateUpdate(original,{...original,icons}),/500/);
});
