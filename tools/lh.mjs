import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
const chrome=await launch({
  chromePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  chromeFlags:['--headless=new','--no-sandbox','--ignore-certificate-errors','--disable-dev-shm-usage']
});
const r=await lighthouse('http://localhost:4181/',{
  port:chrome.port, output:'json', logLevel:'error',
  screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:2.625,disabled:false},
  formFactor:'mobile',
  throttling:{rttMs:150,throughputKbps:1638.4,cpuSlowdownMultiplier:4,
              requestLatencyMs:562.5,downloadThroughputKbps:1474.56,uploadThroughputKbps:675}
});
const c=r.lhr.categories, a=r.lhr.audits;
console.log('\n================ LIGHTHOUSE — MOBILE ================');
for(const k of ['performance','accessibility','best-practices','seo'])
  console.log((c[k].title+':').padEnd(18), Math.round(c[k].score*100));
console.log('\n--- metricas ---');
for(const k of ['largest-contentful-paint','cumulative-layout-shift','first-contentful-paint',
                'total-blocking-time','speed-index'])
  console.log((a[k].title+':').padEnd(30), a[k].displayValue);
const bytes=a['total-byte-weight'];
console.log((bytes.title+':').padEnd(30), bytes.displayValue);
console.log('\n--- falhas de acessibilidade ---');
const af=Object.values(a).filter(x=>x.score!==null&&x.score<1&&r.lhr.categories.accessibility.auditRefs.some(y=>y.id===x.id));
console.log(af.length?af.map(x=>'  ✗ '+x.title).join('\n'):'  nenhuma');
console.log('\n--- falhas de SEO ---');
const sf=Object.values(a).filter(x=>x.score!==null&&x.score<1&&r.lhr.categories.seo.auditRefs.some(y=>y.id===x.id));
console.log(sf.length?sf.map(x=>'  ✗ '+x.title).join('\n'):'  nenhuma');
await chrome.kill();
