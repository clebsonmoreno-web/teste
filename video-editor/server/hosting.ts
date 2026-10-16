import type {RequestHandler} from 'express';
import {createHash,timingSafeEqual} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readlinkSync,symlinkSync} from 'node:fs';
import path from 'node:path';
export function accessConfig(env:NodeJS.ProcessEnv=process.env){
 const user=env.BASIC_AUTH_USER||'',password=env.BASIC_AUTH_PASSWORD||'';
 const required=env.AUTH_REQUIRED==='true';
 if(required&&(!user||password.length<16))throw Error('Defina BASIC_AUTH_USER e BASIC_AUTH_PASSWORD com pelo menos 16 caracteres para hospedar o editor.');
 if(Boolean(user)!==Boolean(password))throw Error('Configure usuário e senha juntos.');
 if(user.includes(':'))throw Error('O usuário não pode conter dois-pontos.');
 let origin:string|undefined;const configured=env.APP_ORIGIN||env.RENDER_EXTERNAL_URL;
 if(configured){const url=new URL(configured);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('APP_ORIGIN deve ser a origem HTTP(S) do editor, sem caminho ou credenciais.');origin=url.origin;}
 return {user,password,required,origin};
}
const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
export function protectEditor(config:ReturnType<typeof accessConfig>):RequestHandler{
 return (req,res,next)=>{
  if((req.method==='GET'||req.method==='HEAD')&&req.path==='/api/health'){next();return;}
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  if(!config.user){next();return;}
  const header=req.headers.authorization||'';let credentials='';if(header.startsWith('Basic '))credentials=Buffer.from(header.slice(6),'base64').toString('utf8');
  const colon=credentials.indexOf(':');const user=colon<0?'':credentials.slice(0,colon),password=colon<0?'':credentials.slice(colon+1);
  if(equal(user,config.user)&&equal(password,config.password)){next();return;}
  res.setHeader('WWW-Authenticate','Basic realm="Editor de videos", charset="UTF-8"');res.status(401).send('Entre com o usuário e a senha do editor.');
 };
}
export function prepareStorage(dataDir:string|undefined,root=process.cwd()){
 if(!dataDir)return path.resolve(root,'work/editor');
 const data=path.resolve(dataDir);const originals=path.join(data,'originals'),store=path.join(data,'editor');
 mkdirSync(originals,{recursive:true});mkdirSync(store,{recursive:true});mkdirSync(path.join(root,'public/originals'),{recursive:true});
 const link=path.join(root,'public/originals/browser');
 try{const stat=lstatSync(link);if(!stat.isSymbolicLink()||path.resolve(path.dirname(link),readlinkSync(link))!==originals)throw Error('O diretório de uploads já existe. Não será substituído: migre seus dados antes de usar EDITOR_DATA_DIR.');}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')symlinkSync(originals,link,'dir');else throw error;}
 if(!existsSync(link))throw Error('Armazenamento de originais indisponível.');
 return store;
}
