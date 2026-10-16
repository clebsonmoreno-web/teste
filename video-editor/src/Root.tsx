import {AbsoluteFill,Composition,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,OffthreadVideo} from 'remotion';
import {Check,Heart,Shield,Lightbulb} from 'lucide-react';
import {projectSchema,type Project} from './model';
import demo from '../projects/demo.json';
const icons={check:Check,heart:Heart,shield:Shield,lightbulb:Lightbulb};
const IconLayer=({cue}:{cue:Project['icons'][number]})=>{
 const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const Icon=icons[cue.icon];
 return <div style={{position:'absolute',left:`${cue.x*100}%`,top:`${cue.y*100}%`,width:cue.size,height:cue.size,marginLeft:-cue.size/2,marginTop:-cue.size/2,
 translate:cue.motion==='slide'?`0 ${interpolate(frame,[0,Math.max(1,Math.round(fps*0.18))],[8,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}px`:undefined,
 scale:cue.motion==='scale'?interpolate(frame,[0,Math.max(1,Math.round(fps*0.18))],[0.94,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):1}}><Icon size={cue.size} color={cue.color} strokeWidth={2}/></div>;
};
export const VideoEdit=(props:Project)=>{
 const p=projectSchema.parse(props); const {fps}=useVideoConfig();
 return <AbsoluteFill><OffthreadVideo src={staticFile(p.source)} volume={1} style={{width:'100%',height:'100%',objectFit:'contain'}}/>{p.icons.map(cue=><Sequence key={cue.id} name={cue.id} from={Math.round(cue.start*fps)} durationInFrames={Math.max(1,Math.round(cue.end*fps)-Math.round(cue.start*fps))} premountFor={fps}><IconLayer cue={cue}/></Sequence>)}</AbsoluteFill>;
};
export const Root=()=> <Composition id="VideoEdit" component={VideoEdit} width={640} height={360} fps={30} durationInFrames={90} defaultProps={projectSchema.parse(demo)} calculateMetadata={({props})=>{const p=projectSchema.parse(props);return {width:p.width,height:p.height,fps:p.fps,durationInFrames:Math.ceil(p.durationSeconds*p.fps)};}}/>;
