import { chromium } from 'playwright';
const B='http://localhost:5200';
const PAGS=['/entrega/?m=FUNIL','/entrega/?m=AUDITORIA','/entrega/?m=PUBLICO',
  '/entrega/?m=EQUIPE','/entrega/?m=META','/entrega/?m=FORMULARIO','/entrega/?m=CADENCIA',
  '/entrega/?m=FICHA','/entrega/?m=ROTEIRO','/entrega/?m=TREINO','/entrega/?m=NAOEXISTE',
  '/entrega/?m=AUDITORIA&q=1','/entrega/?m=AUDITORIA&q=0','/?m=AUDITORIA','/'];
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--ignore-certificate-errors']});
let bugs=0;
for(const u of PAGS){
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.goto(B+u,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  const maus=await p.evaluate(()=>{
    const ruim=[];
    document.querySelectorAll('a').forEach(a=>{
      const h=a.getAttribute('href');
      const visivel=!!a.offsetParent;
      // link clicavel que nao leva a lugar nenhum
      if(visivel && (!h || h==='#' || h==='' || h==='undefined' || h==='null'))
        ruim.push({txt:a.textContent.trim().slice(0,30), href:String(h), alvo:a.target});
    });
    return ruim;
  });
  if(maus.length){ bugs++;
    console.log('BUG', u);
    maus.forEach(m=>console.log('      "'+m.txt+'" href='+m.href+' target='+m.alvo));
  }else console.log(' ok ',u);
  await p.close();
}
console.log('\npaginas com link morto:',bugs);
await b.close();
