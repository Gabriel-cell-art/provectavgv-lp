/* ============================================================
   PROVECTA VGV — entrada unica.
   GSAP, ScrollTrigger e Lenis sao importados UMA vez, aqui.
   Nenhum outro modulo importa essas libs.
   ============================================================ */
import '../styles/base.css';
import '../styles/secoes.css';
import { iniciarFormulario } from './formulario.js';

// 1) Captacao primeiro e isolada: motion quebrado nunca derruba o lead.
try { iniciarFormulario(); } catch(e){ console.error('[form] falhou ao iniciar',e); }

// 2) Preloader sai mesmo se o motion falhar depois.
const preloader=document.getElementById('preloader');
const tirarPreloader=()=>preloader&&preloader.classList.add('saiu');
setTimeout(tirarPreloader,1200);
addEventListener('load',()=>setTimeout(tirarPreloader,250));

// 3) Motion. Tudo daqui para baixo e progressive enhancement.
(async()=>{
try{
  const semMovimento=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis ---------- */
  // So no desktop (>1024) e nunca com movimento reduzido: nao sequestrar
  // o scroll de toque.
  let lenis=null;
  if(!semMovimento && innerWidth>1024 && matchMedia('(pointer:fine)').matches){
    const Lenis=(await import('lenis')).default;
    lenis=new Lenis({duration:1.2,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t))});
    lenis.on('scroll',ScrollTrigger.update);
    gsap.ticker.add(t=>lenis.raf(t*1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- nav: esconde ao descer, volta ao subir ---------- */
  const nav=document.getElementById('nav');
  let ultimo=0,travado=false;
  const lerNav=()=>{
    const y=scrollY, delta=y-ultimo;
    nav.classList.toggle('solida',y>10);
    if(Math.abs(delta)>6){
      nav.classList.toggle('escondida', delta>0 && y>220);
      ultimo=y;
    }
    travado=false;
  };
  addEventListener('scroll',()=>{if(!travado){travado=true;requestAnimationFrame(lerNav);}},{passive:true});

  /* ---------- destaque deslizante do menu ---------- */
  const menu=document.getElementById('menu'), luz=document.getElementById('menuLuz');
  if(menu&&luz){
    const mover=el=>{
      luz.style.width=el.offsetWidth+'px';
      luz.style.transform='translateX('+el.offsetLeft+'px)';
    };
    const ativo=()=>menu.querySelector('a.ativo')||menu.querySelector('a');
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('mouseenter',()=>mover(a)));
    menu.addEventListener('mouseleave',()=>mover(ativo()));
    mover(ativo());
    // marca o item da secao visivel
    menu.querySelectorAll('a').forEach(a=>{
      const alvo=document.querySelector(a.getAttribute('href'));
      if(!alvo) return;
      ScrollTrigger.create({trigger:alvo,start:'top center',end:'bottom center',
        onToggle:s=>{if(s.isActive){menu.querySelectorAll('a').forEach(x=>x.classList.remove('ativo'));
          a.classList.add('ativo');luz.classList.add('fixa');mover(a);}}});
    });
  }

  /* ---------- menu mobile ---------- */
  const burger=document.getElementById('burger'), menuMob=document.getElementById('menuMob');
  if(burger&&menuMob){
    burger.addEventListener('click',()=>{
      const aberto=menuMob.classList.toggle('aberto');
      burger.classList.toggle('x',aberto);
      burger.setAttribute('aria-expanded',String(aberto));
    });
    menuMob.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      menuMob.classList.remove('aberto');burger.classList.remove('x');
      burger.setAttribute('aria-expanded','false');
    }));
  }

  /* ---------- ancoras via Lenis ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const alvo=document.querySelector(a.getAttribute('href'));
      if(!alvo) return;
      e.preventDefault();
      if(lenis) lenis.scrollTo(alvo,{offset:-70});
      else alvo.scrollIntoView({behavior:semMovimento?'auto':'smooth'});
    });
  });

  /* ---------- ticker: dados sobrios, sem promessa ---------- */
  const trilho=document.getElementById('tickerTrilho');
  if(trilho){
    const itens=['VGV Salvador R$ 5,7 bi','Crescimento +127,7%','Alto padrão +15,1%',
      'Pré-lançamento','Lançamento','Entrega','Remanescentes','Tráfego pago',
      'Book de vendas','Produção 3D','CRM','Reposicionamento de oferta'];
    const bloco=itens.map(t=>'<span>'+t+'</span><i>◆</i>').join('');
    trilho.innerHTML=bloco+bloco;
  }

  /* ---------- reveal ---------- */
  document.querySelectorAll('.reveal').forEach(el=>{
    ScrollTrigger.create({trigger:el,start:'top 86%',once:true,
      onEnter:()=>el.classList.add('ativo')});
  });

  /* ---------- manifesto: acende palavra a palavra ---------- */
  const man=document.getElementById('manifesto');
  if(man){
    const palavras=man.textContent.trim().split(/\s+/);
    man.innerHTML=palavras.map((p,i)=>
      '<span class="pal'+(i>=palavras.length-2?' az':'')+'">'+p+'</span>').join(' ');
    const pals=man.querySelectorAll('.pal');
    ScrollTrigger.create({trigger:man,start:'top 78%',end:'bottom 52%',scrub:true,
      onUpdate:s=>{
        const n=Math.round(s.progress*pals.length);
        pals.forEach((p,i)=>p.classList.toggle('on',i<n));
      }});
  }

  /* ---------- chat encenado ---------- */
  const chat=document.getElementById('chat');
  if(chat&&!semMovimento){
    gsap.from(chat.children,{opacity:0,y:26,duration:.6,stagger:.22,ease:'power2.out',
      scrollTrigger:{trigger:chat,start:'top 78%',once:true}});
  }

  /* ---------- timeline: progresso + etapa viva ---------- */
  const tl=document.getElementById('tl'), prog=document.getElementById('tlProg');
  if(tl&&prog){
    gsap.to(prog,{scaleY:1,ease:'none',
      scrollTrigger:{trigger:tl,start:'top 72%',end:'bottom 68%',scrub:.4}});
    tl.querySelectorAll('.etapa').forEach(et=>{
      ScrollTrigger.create({trigger:et,start:'top 68%',end:'bottom 42%',
        onToggle:s=>et.classList.toggle('viva',s.isActive)});
    });
  }

  /* ---------- contadores ---------- */
  document.querySelectorAll('[data-conta]').forEach(el=>{
    const alvo=parseFloat(el.dataset.conta), dec=parseInt(el.dataset.dec||'0',10);
    const fmt=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec});
    if(semMovimento){el.textContent=fmt(alvo);return;}
    const obj={v:0};
    ScrollTrigger.create({trigger:el,start:'top 88%',once:true,onEnter:()=>{
      gsap.to(obj,{v:alvo,duration:1.7,ease:'power2.out',
        onUpdate:()=>{el.textContent=fmt(obj.v);}});
    }});
  });

  /* ---------- barras do dashboard ---------- */
  const barras=document.getElementById('barras');
  if(barras){
    const alturas=[22,31,27,44,38,52,47,63,58,71,66,84];
    barras.innerHTML=alturas.map(()=>'<i></i>').join('');
    const bs=barras.querySelectorAll('i');
    ScrollTrigger.create({trigger:barras,start:'top 86%',once:true,onEnter:()=>{
      bs.forEach((b,i)=>setTimeout(()=>{b.style.height=alturas[i]+'%';},semMovimento?0:i*55));
    }});
  }

  /* ---------- variantes de motion por dispositivo ---------- */
  const mm=gsap.matchMedia();

  // DESKTOP: pin com scrub nos 48 frames + parallax + cursor
  mm.add('(min-width:1024px) and (prefers-reduced-motion: no-preference)',()=>{
    const canvas=document.getElementById('cinCanvas');
    const logo=document.getElementById('cinLogo');
    const texto=document.getElementById('cinTexto');
    const dica=document.getElementById('cinDica');
    if(!canvas) return;

    const ctx=canvas.getContext('2d',{alpha:false});
    const N=48;
    const imgs=[]; let carregadas=0, idxAtual=-1;

    const dimensionar=()=>{
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=canvas.clientWidth*dpr;
      canvas.height=canvas.clientHeight*dpr;
      desenhar(Math.max(idxAtual,0));
    };
    const desenhar=i=>{
      const img=imgs[i]; if(!img||!img.complete||!img.naturalWidth) return;
      idxAtual=i;
      const cw=canvas.width, ch=canvas.height;
      const e=Math.max(cw/img.naturalWidth,ch/img.naturalHeight);
      const w=img.naturalWidth*e, h=img.naturalHeight*e;
      ctx.fillStyle='#06060A'; ctx.fillRect(0,0,cw,ch);
      ctx.drawImage(img,(cw-w)/2,(ch-h)/2,w,h);
    };

    // Frames so entram depois do hero: nunca competem com o LCP.
    const carregar=()=>{
      for(let i=1;i<=N;i++){
        const img=new Image(); img.decoding='async';
        img.src='/assets/frames/f_'+String(i).padStart(3,'0')+'.webp';
        img.onload=()=>{carregadas++;if(carregadas===1)dimensionar();};
        imgs.push(img);
      }
    };
    if('requestIdleCallback' in window) requestIdleCallback(carregar,{timeout:2600});
    else setTimeout(carregar,1400);
    addEventListener('resize',dimensionar);

    const st=ScrollTrigger.create({
      trigger:'#cinema',start:'top top',end:'+=190%',pin:true,scrub:.55,
      onUpdate:s=>{
        const i=Math.min(N-1,Math.floor(s.progress*N));
        desenhar(i);
        gsap.set(logo,{scale:1+s.progress*13,opacity:1-Math.max(0,(s.progress-.62)/.3)});
        gsap.set(texto,{opacity:Math.max(0,(s.progress-.5)/.4),y:(1-s.progress)*30});
        gsap.set(dica,{opacity:1-s.progress*3.2});
      }
    });
    gsap.set(texto,{opacity:0});

    // parallax leve: no maximo 3 elementos, so transform
    gsap.to('.marca-gigante',{yPercent:-14,ease:'none',
      scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.6}});
    gsap.to('.hero-arco',{yPercent:11,ease:'none',
      scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.6}});

    // cursor: so mouse fino, conforme pedido
    const cur=document.getElementById('cursor');
    if(cur){
      const mx=gsap.quickTo(cur,'x',{duration:.28,ease:'power3'});
      const my=gsap.quickTo(cur,'y',{duration:.28,ease:'power3'});
      addEventListener('mousemove',e=>{mx(e.clientX-8);my(e.clientY-8);},{passive:true});
      document.querySelectorAll('a,button,.opt').forEach(el=>{
        el.addEventListener('mouseenter',()=>cur.classList.add('grande'));
        el.addEventListener('mouseleave',()=>cur.classList.remove('grande'));
      });
    }
    return ()=>{st.kill();};
  });

  // MOBILE: variante propria, nao versao cortada.
  // Sem pin longo, sem cursor, sem frames. Zoom do logo em vetor.
  mm.add('(max-width:1023px) and (prefers-reduced-motion: no-preference)',()=>{
    const logo=document.getElementById('cinLogo');
    const texto=document.getElementById('cinTexto');
    const dica=document.getElementById('cinDica');
    const canvas=document.getElementById('cinCanvas');
    if(canvas) canvas.style.display='none';
    if(!logo) return;
    gsap.set(texto,{opacity:0});
    const st=ScrollTrigger.create({
      trigger:'#cinema',start:'top top',end:'+=105%',pin:true,scrub:.5,
      onUpdate:s=>{
        // force3D:false mantem o vetor nitido na escala alta
        gsap.set(logo,{scale:1+s.progress*17,opacity:1-Math.max(0,(s.progress-.55)/.35),force3D:false});
        gsap.set(texto,{opacity:Math.max(0,(s.progress-.45)/.4)});
        gsap.set(dica,{opacity:1-s.progress*3.2});
      }
    });
    return ()=>{st.kill();};
  });

  /* ---------- video do hero: condicional e nunca no caminho do LCP ---------- */
  // __TEM_VIDEO__ e resolvido no build (vite.config.js) pela presenca do arquivo:
  // sem video, este bloco nem entra no bundle e nao ha requisicao nenhuma.
  // Condicoes: >=1024px, sem economia de dados, sem movimento reduzido.
  const video=document.getElementById('heroVideo');
  if(__TEM_VIDEO__ && video && !semMovimento && innerWidth>=1024 &&
     !(navigator.connection && navigator.connection.saveData)){
    const carregarVideo=()=>{
      video.innerHTML='<source src="/assets/video/hero.webm" type="video/webm">'+
                      '<source src="/assets/video/hero.mp4" type="video/mp4">';
      video.preload='auto'; video.load();
      video.addEventListener('canplay',()=>{
        video.play().then(()=>video.classList.add('pronto')).catch(()=>{});
      },{once:true});
    };
    // Depois do LCP: o texto do hero e sempre o primeiro a renderizar.
    if('requestIdleCallback' in window) requestIdleCallback(carregarVideo,{timeout:3200});
    else setTimeout(carregarVideo,1800);
  }

  ScrollTrigger.refresh();
}catch(e){
  console.error('[motion] desativado:',e);
  // Falha de motion nunca esconde conteudo.
  document.querySelectorAll('.reveal').forEach(el=>el.classList.add('ativo'));
  tirarPreloader();
}
})();
