import type {Project} from '../src/model';
export const frames=(p:Project)=>Math.ceil(p.durationSeconds*p.fps);
export const snap=(seconds:number,p:Project)=>Math.round(seconds*p.fps)/p.fps;
export function moveCue(cue:Project['icons'][number],seconds:number,p:Project){
 const length=cue.end-cue.start;
 const start=Math.max(0,Math.min(snap(seconds,p),p.durationSeconds-length));
 return {...cue,start,end:start+length};
}
export function cueAt(seconds:number,p:Project){
 const start=Math.max(0,Math.min(snap(seconds,p),Math.max(0,p.durationSeconds-1/p.fps)));
 return {start,end:Math.min(p.durationSeconds,start+Math.min(2,p.durationSeconds))};
}
export const formatTime=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toFixed(2).padStart(5,'0')}`;
