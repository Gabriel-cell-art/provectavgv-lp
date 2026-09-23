import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--ignore-certificate-errors','--autoplay-policy=no-user-gesture-required']});
// 1) celular: o video NAO pode ser requisitado
const p=await b.newPage({viewport:{width:390,height:844}});
const pedidos=[];
p.on('request',r=>{if(/\/assets\/video\//.test(r.url()))pedidos.push(r.url().split('/').pop());});
await p.goto('http://localhost:4192/',{waitUntil:'networkidle'});
await p.waitForTimeout(5000);
console.log('MOBILE  — requisicoes de video:',pedidos.length?pedidos.join(', '):'nenhuma (correto)');
await p.close();
// 2) movimento reduzido no desktop: tambem nao pode carregar
const p2=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const ped2=[];
p2.on('request',r=>{if(/\/assets\/video\/hero\.(mp4|webm)/.test(r.url()))ped2.push(r.url().split('/').pop());});
await p2.goto('http://localhost:4192/',{waitUntil:'networkidle'});
await p2.waitForTimeout(5000);
console.log('REDUCED — requisicoes de video:',ped2.length?ped2.join(', '):'nenhuma (correto)');
await p2.close();
await b.close();
