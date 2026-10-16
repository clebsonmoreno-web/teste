import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cueAt,moveCue,frames} from './timing';
import {projectSchema} from '../src/model';
import demo from '../projects/demo.json';
const p=projectSchema.parse(demo);
test('novo ícone no fim do vídeo sempre tem ao menos um quadro',()=>{
 const cue=cueAt(p.durationSeconds,p);assert(cue.end>cue.start);assert(cue.end<=p.durationSeconds);assert.equal(frames(p),90);
});
test('arraste temporal preserva duração e fica dentro do vídeo',()=>{
 const cue=p.icons[0];for(const target of [-100,100,1.2]){const moved=moveCue(cue,target,p);assert(moved.start>=0);assert(moved.end<=p.durationSeconds);assert(Math.abs((moved.end-moved.start)-(cue.end-cue.start))<1e-9);}
});
test('sincronização respeita o FPS fracionário',()=>{
 const ntsc={...p,fps:30000/1001};const cue=cueAt(1.15,ntsc);assert(Math.abs(cue.start*ntsc.fps-Math.round(1.15*ntsc.fps))<1e-8);
});
