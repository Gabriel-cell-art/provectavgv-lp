/* ============================================================
   Captacao de lead.
   Carregado e inicializado ANTES de qualquer codigo de motion e
   isolado dele: se o GSAP/Lenis quebrar, o formulario continua
   funcionando e visivel. Requisito do brief.

   Entrega: Formspree e o canal que dispara o e-mail e decide
   sucesso/erro na tela. O Make recebe em paralelo, sem bloquear,
   para nao quebrar automacao ja montada la. Esvazie MAKE para desligar.
   ============================================================ */
const FORMSPREE = 'https://formspree.io/f/mljdbbkw';
const MAKE      = 'https://hook.us2.make.com/pybg5rima742nx5l2brpvj7cfe9oa18g';
const WHATS     = '557193068515';
const DEBUG     = new URLSearchParams(location.search).has('debug');

const TXT_WA = 'Olá! Vim pelo site da Provecta VGV e quero falar sobre um empreendimento.';

export function iniciarFormulario(){
  // Links de WhatsApp nos 3 pontos exigidos pelo brief.
  const url = 'https://wa.me/' + WHATS + '?text=' + encodeURIComponent(TXT_WA);
  ['waHero','waCta','waRod'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.href=url;
  });
  const ano=document.getElementById('ano');
  if(ano) ano.textContent=new Date().getFullYear();

  // Grupos de opcao: clique, teclado e estado acessivel.
  document.querySelectorAll('.seg').forEach(grupo=>{
    const opts=[...grupo.querySelectorAll('.opt')];
    const marcar=o=>{
      opts.forEach(x=>{x.classList.remove('on');x.setAttribute('aria-checked','false');});
      o.classList.add('on'); o.setAttribute('aria-checked','true');
    };
    opts.forEach(o=>{
      o.addEventListener('click',()=>marcar(o));
      o.addEventListener('keydown',e=>{
        if(e.key===' '||e.key==='Enter'){e.preventDefault();marcar(o);}
      });
    });
  });

  const btn=document.getElementById('submitBtn');
  if(!btn) return;

  btn.addEventListener('click',async()=>{
    const val=id=>{const el=document.getElementById(id);return el?(el.value||'').trim():'';};
    const pick=id=>{const el=document.querySelector('#'+id+' .opt.on');return el?el.textContent.trim():'';};

    const nome=val('fNome'), zap=val('fZap'), emp=val('fEmp');
    let falhou=false;
    [['fNome',nome],['fZap',zap]].forEach(([id,v])=>{
      const el=document.getElementById(id); if(!el) return;
      if(!v){el.style.borderColor='#e0564f';el.style.boxShadow='0 0 0 3px rgba(224,86,79,.15)';falhou=true;}
      else{el.style.borderColor='';el.style.boxShadow='';}
    });
    if(falhou){document.getElementById('fNome').focus();return;}

    const qs=new URLSearchParams(location.search);
    const etapa=pick('fEtapa'), vgv=pick('fVgv');

    // Chaves em portugues: viram rotulos no corpo do e-mail do Formspree.
    const lead={
      'Nome':nome,'WhatsApp':zap,'Construtora':emp||'—',
      'Etapa da obra':etapa,'VGV estimado':vgv,
      'Origem':qs.get('utm_source')||'direto',
      'Campanha':qs.get('utm_campaign')||'—',
      'Anúncio':qs.get('utm_content')||'—',
      'Mídia':qs.get('utm_medium')||'—',
      'Página':location.href,
      'Enviado em':new Date().toLocaleString('pt-BR',{timeZone:'America/Bahia'}),
      '_subject':'Novo lead — '+(emp||nome)+' · '+etapa+' · '+vgv,
      '_gotcha':val('fHp')
    };

    try{
      const b=JSON.parse(localStorage.getItem('provecta_leads')||'[]');
      b.push(lead); localStorage.setItem('provecta_leads',JSON.stringify(b.slice(-50)));
    }catch(e){}

    const txt=btn.innerHTML;
    const ok=()=>{
      document.getElementById('ffields').style.display='none';
      document.getElementById('formOk').style.display='block';
    };
    const erro=motivo=>{
      btn.innerHTML=txt; btn.style.opacity=''; btn.disabled=false;
      const msg='Olá! Tentei enviar pelo site e deu erro. Nome: '+nome+
                ' | Construtora: '+(emp||'-')+' | Etapa: '+etapa+' | VGV: '+vgv;
      let box=document.getElementById('fErr');
      if(!box){box=document.createElement('div');box.id='fErr';box.className='ferro';
        box.setAttribute('role','alert');document.getElementById('ffields').appendChild(box);}
      box.innerHTML='Não consegui enviar agora. <a href="https://wa.me/'+WHATS+'?text='+
        encodeURIComponent(msg)+'" target="_blank" rel="noopener">Fale no WhatsApp</a>'+
        ' que a gente resolve na hora.'+
        (DEBUG?'<br><code style="font-size:12px;opacity:.8">debug: '+motivo+'</code>':'');
      if(DEBUG) console.error('[form]',motivo,lead);
    };

    btn.innerHTML='Enviando…'; btn.style.opacity='.7'; btn.disabled=true;

    if(MAKE){
      fetch(MAKE,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(lead),keepalive:true})
        .catch(e=>{if(DEBUG)console.warn('[form] Make ignorado:',e.message);});
    }

    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),15000);
    try{
      const res=await fetch(FORMSPREE,{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(lead),signal:ctrl.signal,keepalive:true
      });
      clearTimeout(t);
      let corpo=null; try{corpo=await res.json();}catch(e){}
      if(DEBUG) console.log('[form] Formspree',res.status,corpo);
      if(!res.ok){
        erro(corpo&&corpo.errors ? corpo.errors.map(x=>x.message).join('; ') : 'HTTP '+res.status);
        return;
      }
      ok();
    }catch(e){
      clearTimeout(t);
      erro(e.name==='AbortError'?'timeout de 15s':(e.message||'falha de rede/CORS'));
    }
  });
}
