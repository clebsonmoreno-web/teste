import {run} from './lib';
import {existsSync} from 'node:fs';
if(!existsSync('public/originals/demo.mp4'))run('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=30:duration=3','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=3','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','public/originals/demo.mp4']);
console.log('Clipe técnico de 3 s criado: não representa vídeo de cliente nem locução.');
