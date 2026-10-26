import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
const alvo = process.argv[2] || 'http://localhost:4901/?m=PUBLICO';
const chrome=await launch({chromePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  chromeFlags:['--headless=new','--no-sandbox','--ignore-certificate-errors','--disable-dev-shm-usage']});
const r=await lighthouse(alvo,{port:chrome.port,output:'json',logLevel:'error',
  formFactor:'mobile',
  screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:2.625,disabled:false},
  throttling:{rttMs:150,throughputKbps:1638.4,cpuSlowdownMultiplier:4,
              requestLatencyMs:562.5,downloadThroughputKbps:1474.56,uploadThroughputKbps:675}});
const c=r.lhr.categories,a=r.lhr.audits;
console.log('\n=========== LIGHTHOUSE MOBILE ===========');
console.log('URL:',alvo);
for(const k of ['performance','accessibility','best-practices','seo'])
  console.log((c[k].title+':').padEnd(18),Math.round(c[k].score*100));
console.log('\n--- metas do brief ---');
const lcp=a['largest-contentful-paint'], cls=a['cumulative-layout-shift'];
console.log('LCP :',lcp.displayValue,'   (meta < 2,5 s)',
            lcp.numericValue<2500?'OK':'FALHOU');
console.log('CLS :',cls.displayValue,'  (meta < 0,1)',
            cls.numericValue<0.1?'OK':'FALHOU');
console.log('Peso total transferido:',a['total-byte-weight'].displayValue);
console.log('\n--- outras metricas ---');
['first-contentful-paint','total-blocking-time','speed-index']
  .forEach(k=>console.log((a[k].title+':').padEnd(28),a[k].displayValue));
const falhas=Object.values(a).filter(x=>x.score!==null&&x.score<1
  &&c.accessibility.auditRefs.some(y=>y.id===x.id));
console.log('\nfalhas de acessibilidade:',falhas.length?falhas.map(x=>x.title).join('; '):'nenhuma');
await chrome.kill();
