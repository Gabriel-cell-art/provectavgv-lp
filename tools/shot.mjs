import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--ignore-certificate-errors']});
const erros=[];
async function tirar(nome,w,h,scrolls){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  p.on('console',m=>{if(m.type()==='error')erros.push(nome+': '+m.text());});
  p.on('pageerror',e=>erros.push(nome+' PAGEERROR: '+e.message));
  await p.goto('http://localhost:4181/',{waitUntil:'networkidle'});
  await p.waitForTimeout(1800);
  for(const [rotulo,y] of scrolls){
    await p.evaluate(v=>window.scrollTo(0,v),y);
    await p.waitForTimeout(1100);
    await p.screenshot({path:`shots/${nome}-${rotulo}.png`});
  }
  // overflow horizontal?
  const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const h1=await p.evaluate(()=>document.querySelectorAll('h1').length);
  await p.close();
  return {over,h1};
}
const d=await tirar('desktop',1440,900,[['01-hero',0],['02-dor',1100],['03-cinema',2100],['04-dif',4200],['05-etapas',5400],['06-dash',6600],['07-result',7800],['08-pac',9000]]);
const m=await tirar('mobile',390,844,[['01-hero',0],['02-dor',900],['03-cinema',1800],['04-dif',3200],['05-etapas',4400],['06-dash',6200],['07-pac',8000]]);
await b.close();
console.log('desktop overflow-x:',d.over,'px | <h1> na pagina:',d.h1);
console.log('mobile  overflow-x:',m.over,'px | <h1> na pagina:',m.h1);
console.log(erros.length?'ERROS DE CONSOLE:\n'+erros.join('\n'):'console limpo (0 erros)');
