import {copyFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {metadata} from './lib';
const [input,client,id]=process.argv.slice(2);
if(!input||![client,id].every(s=>s&&/^[a-z0-9-]+$/.test(s)))throw Error('Uso: npm run import -- /caminho/video.mp4 cliente video-id (IDs: a-z, 0-9, hífen)');
const meta=metadata(input);const ext=path.extname(input);const source=`originals/${client}/${id}${ext}`;const config=`projects/${client}/${id}.json`;
if(existsSync(`public/${source}`)||existsSync(config))throw Error('Destino existente: escolha outro ID');
mkdirSync(`public/originals/${client}`,{recursive:true});mkdirSync(`projects/${client}`,{recursive:true});
copyFileSync(input,`public/${source}`);writeFileSync(config,JSON.stringify({client,source,...meta,icons:[]},null,2));console.log(config);
