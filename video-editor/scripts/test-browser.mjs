import {chromium} from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
fs.mkdirSync('work',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.REMOTION_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.EDITOR_URL||'http://127.0.0.1:5173');await page.getByRole('heading',{name:'Mais clareza.'}).waitFor();
 await page.screenshot({path:'work/editor-empty.png',fullPage:true});console.log('Tela inicial carregada');
 await page.getByLabel('Importar arquivo MP4').setInputFiles('public/originals/demo.mp4');
 await page.getByText('640 × 360 · 30 fps').waitFor();console.log('Importação concluída');
 await page.getByRole('button',{name:'Adicionar Confirmação',exact:true}).click();
 await page.getByLabel('Início (s)',{exact:true}).fill('0.5');await page.getByLabel('Fim (s)',{exact:true}).fill('2');
 await page.getByLabel('Posição na linha do tempo',{exact:true}).fill('30');
 await page.getByRole('button',{name:'Posicionar Confirmação'}).waitFor();
 const handle=page.getByRole('button',{name:'Posicionar Confirmação'});const box=await handle.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-50,box.y+box.height/2+30,{steps:8});await page.mouse.up();
 assert(Number(await page.getByLabel('Horizontal (%)',{exact:true}).inputValue())<75);console.log('Ícone posicionado por arraste');
 await page.getByRole('button',{name:'Reproduzir',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Pausar',exact:true}).click();console.log('Reprodução e áudio disponíveis');
 await page.screenshot({path:'work/editor-loaded.png',fullPage:true});
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByRole('button',{name:'Exportar MP4',exact:true}).click();
 await page.getByRole('link',{name:'Baixar MP4'}).waitFor({timeout:180000});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Baixar MP4'}).click();await (await download).saveAs('work/browser-export.mp4');
 console.log('MP4 exportado, validado e baixado pelo navegador');assert.equal(errors.length,0,errors.join('\n'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const fit=await page.locator('.video-fit').boundingBox();assert(fit.width>200);assert(Math.abs(fit.width/fit.height-640/360)<0.02);await page.screenshot({path:'work/editor-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Layout ultrapassa a tela');console.log('Layout móvel sem rolagem horizontal');
}finally{await browser.close();}
