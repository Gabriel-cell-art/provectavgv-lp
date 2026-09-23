import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--ignore-certificate-errors','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4192/',{waitUntil:'networkidle'});
await p.waitForTimeout(6000);   // espera o requestIdleCallback + canplay
const st=await p.evaluate(()=>{
  const v=document.getElementById('heroVideo');
  return {existe:!!v, classes:v?v.className:null, pausado:v?v.paused:null,
          tempo:v?+v.currentTime.toFixed(2):null, fontes:v?v.querySelectorAll('source').length:0,
          largura:v?v.videoWidth:0};
});
console.log('estado do video:',JSON.stringify(st));
await p.screenshot({path:'shots/hero-final.png'});
await b.close();
