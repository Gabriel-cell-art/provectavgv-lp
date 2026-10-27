/* ============================================================
   POP-UP DE DIAGNOSTICO (Raio-X) — componente global.
   Igual para todos os materiais; textos, perguntas e regras de
   vazamento em content/popup-diagnostico.json.

   Gatilho: so depois de o lead copiar o prompt (flag "copiou"
   salva) e enquanto o pop-up nao foi respondido. Abre no
   carregamento, em visibilitychange->visible, focus, pageshow ou
   N segundos apos a copia, o que vier primeiro. No maximo uma vez
   por sessao. Sem localStorage, vale so o gatilho por tempo.

   Fechado sem resposta: aparece o cartao no fim da pagina, que
   reabre o pop-up. Respondido: o cartao vira a tela de resultado.
   ============================================================ */
import CONFIG from '../../content/popup-diagnostico.json';
import { WHATSAPP_NUMERO } from '../config.js';
import { h, trocar, preencher, listar, minuscula, linkWhatsapp, pixelContato } from './modelo.js';
import { sessao } from './armazem.js';
import { enviarRespostas } from './envio.js';

const ICONE_FECHAR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

/** Sinais acesos e elos, a partir das respostas. */
export function calcularVazamento(cfg, respostas){
  const acesos = [];
  const elos = new Set();
  cfg.perguntas.forEach(p=>{
    const e = p.vazamento && p.vazamento[respostas[p.chave]];
    if(e){ acesos.push(p); e.forEach(x=>elos.add(x)); }
  });
  const ordem = cfg.elos || [];
  const lista = ordem.filter(x=>elos.has(x)).concat([...elos].filter(x=>!ordem.includes(x)));
  // "Organizada" so quando os sinais acesos sao todos dos que sempre acendem
  // (o gargalo) e nenhuma resposta esta marcada como nuncaOrganizada.
  const organizada = acesos.every(p => p.sempre &&
    !(p.nuncaOrganizada || []).includes(respostas[p.chave]));
  return { n:acesos.length, elos:lista, acesos, organizada };
}

/**
 * ctx: {
 *   palavra, leadId, estado,
 *   mensagemProximo: () => string|null   pedido do proximo material
 *   cartao              elemento <section> no fim da pagina
 * }
 */
export function iniciarPopup(ctx){
  const cfg = CONFIG;
  const chaveSessao = 'raiox:' + ctx.palavra + ':' + (ctx.leadId || 'sem-id');
  let abertoNestaSessao = !!sessao.ler(chaveSessao);
  let aberto = false;
  let focoAnterior = null;
  let timer = null;

  const respondido = () => !!(ctx.estado.ler().popup);
  // Sem localStorage a flag nao sobrevive a recarga: so vale o gatilho por tempo.
  const copiou     = () => ctx.estado.persistente && !!ctx.estado.ler().copiou;

  /* ---------- casca do modal ---------- */
  const corpo  = h('div', { class:'rx-corpo' });
  const fechar = h('button', { type:'button', class:'rx-fechar', 'aria-label':'Fechar' });
  fechar.innerHTML = ICONE_FECHAR;
  const caixa  = h('div', { class:'rx-caixa', role:'dialog', 'aria-modal':'true', 'aria-labelledby':'rxTitulo' },
                   fechar, corpo);
  const fundo  = h('div', { class:'rx-fundo', hidden:true }, caixa);
  document.body.appendChild(fundo);

  fechar.addEventListener('click', ()=>fecharPopup());
  fundo.addEventListener('click', e=>{ if(e.target === fundo) fecharPopup(); });
  document.addEventListener('keydown', e=>{ if(aberto && e.key === 'Escape') fecharPopup(); });

  function abrirPopup(){
    if(aberto) return;
    aberto = true;
    clearTimeout(timer);
    focoAnterior = document.activeElement;
    const salvo = ctx.estado.ler().popup;
    if(salvo) desenharResultado(corpo, salvo.respostas);
    else { respostas = {}; desenharPergunta(0); }
    fundo.hidden = false;
    document.documentElement.classList.add('rx-trava');
    requestAnimationFrame(()=>fundo.classList.add('on'));
    try{ caixa.querySelector('h2').focus({ preventScroll:true }); }catch(e){}
    atualizarCartao();
  }

  function fecharPopup(){
    if(!aberto) return;
    aberto = false;
    fundo.classList.remove('on');
    fundo.hidden = true;
    document.documentElement.classList.remove('rx-trava');
    if(!respondido()) ctx.estado.juntar({ popupFechado:true });
    atualizarCartao();
    try{ if(focoAnterior) focoAnterior.focus({ preventScroll:true }); }catch(e){}
  }

  /** Abertura automatica: respeita "copiou", "respondido" e uma vez por sessao. */
  function tentarAbrir(porTempo){
    if(aberto || abertoNestaSessao) return;
    if(respondido()) return;
    if(!porTempo && !copiou()) return;
    abertoNestaSessao = true;
    sessao.gravar(chaveSessao, 1);
    abrirPopup();
  }

  /* ---------- perguntas ---------- */
  let respostas = {};

  function desenharPergunta(i){
    const p = cfg.perguntas[i];
    const total = cfg.perguntas.length;
    trocar(corpo, 
      i === 0 ? h('div', { class:'rx-cabeca' },
        h('h2', { id:'rxTitulo', tabindex:'-1' }, cfg.titulo),
        h('p', { class:'sub' }, cfg.subtitulo)) : null,
      h('div', { class:'qz-topo' },
        h('span', { class:'eyebrow' }, 'Raio-X'),
        h('span', { class:'num' }, String(i+1).padStart(2,'0') + ' / ' + String(total).padStart(2,'0'))),
      h('div', { class:'qz-barra', role:'progressbar', 'aria-valuemin':'0', 'aria-valuemax':String(total),
                 'aria-valuenow':String(i+1), 'aria-label':'Progresso' },
        h('i', { style:'width:' + ((i+1)/total*100) + '%' })),
      h(i === 0 ? 'h3' : 'h2', { class:'qz-pergunta rx-pergunta', id: i === 0 ? 'rxPergunta' : 'rxTitulo', tabindex:'-1' }, p.texto),
      h('div', { class:'qz-opcoes', role:'group', 'aria-labelledby': i === 0 ? 'rxPergunta' : 'rxTitulo' },
        p.opcoes.map(op => h('button', {
          type:'button', class:'qz-opcao' + (respostas[p.chave] === op ? ' on' : ''),
          'aria-pressed': respostas[p.chave] === op ? 'true' : 'false',
          onclick: e=>{
            respostas[p.chave] = op;
            e.currentTarget.classList.add('on');
            setTimeout(()=>{
              if(i < total - 1) desenharPergunta(i + 1);
              else responder();
            }, 160);
          }
        }, op))),
      i > 0 ? h('div', { class:'qz-nav' },
        h('button', { type:'button', class:'btn btn-fantasma qz-voltar', onclick:()=>desenharPergunta(i-1) },
          h('span', { class:'seta' }, '←'), ' Voltar'), h('span')) : null
    );
    if(i > 0) try{ corpo.querySelector('#rxTitulo').focus({ preventScroll:true }); }catch(e){}
    caixa.scrollTop = 0;
  }

  function responder(){
    const r = calcularVazamento(cfg, respostas);
    ctx.estado.juntar({ popup:{ respostas, sinais:r.n, elos:r.elos }, popupFechado:false });
    const campos = {};
    cfg.perguntas.forEach(p=>{ campos[p.chave] = respostas[p.chave] || ''; });
    campos.sinais = r.n;
    campos.elos   = r.elos.join(', ');
    enviarRespostas('raio-x', ctx, campos,
      'Raio-X ' + ctx.palavra + ' — ' + r.n + ' sinais · ' + campos.elos +
      ' · lead ' + (ctx.leadId || 'sem id').slice(0,8));
    desenharResultado(corpo, respostas);
    try{ corpo.querySelector('#rxTitulo').focus({ preventScroll:true }); }catch(e){}
    atualizarCartao();
  }

  /* ---------- resultado (no pop-up e no cartao) ---------- */
  function desenharResultado(alvo, resp, idTitulo){
    const R = cfg.resultado;
    const r = calcularVazamento(cfg, resp);
    const gargalo = minuscula(resp.gargalo || '');
    let titulo, blocos;
    if(r.n > 0 && !r.organizada){
      titulo = preencher(r.n === 1 ? R.tituloUmSinal : R.tituloSinais, { n:r.n, elos:listar(r.elos) });
      blocos = [
        h('ul', { class:'rx-frases' }, r.acesos.map(p =>
          h('li', null, preencher(p.frase, { resposta: minuscula(resp[p.chave]) })))),
        h('p', { class:'sub' }, R.ponte)
      ];
    }else{
      titulo = R.tituloOrganizada;
      blocos = [ h('p', { class:'sub' }, preencher(R.textoOrganizada, { gargalo })) ];
    }

    // O WhatsApp do pop-up so pede o proximo material. O diagnostico sai
    // pela Agenda, no bloco qualificado. Sem proximo elo, sem botao.
    const mensagem = ctx.mensagemProximo ? ctx.mensagemProximo() : null;
    const botao = mensagem
      ? h('a', { class:'btn btn-primario rx-cta', href:linkWhatsapp(WHATSAPP_NUMERO, mensagem),
                 target:'_blank', rel:'noopener', onclick:pixelContato }, cfg.botaoProximo)
      : null;

    trocar(alvo, 
      h('span', { class:'eyebrow' }, 'Raio-X'),
      h('h2', { id: idTitulo || 'rxTitulo', tabindex:'-1' }, titulo),
      ...blocos,
      botao
    );
  }

  /* ---------- cartao no fim da pagina ---------- */
  function atualizarCartao(){
    const c = ctx.cartao;
    if(!c) return;
    const est = ctx.estado.ler();
    if(est.popup && !aberto){
      desenharResultado(c, est.popup.respostas, 'rxTituloCartao');
      c.classList.add('ent-agenda');
      c.hidden = false;
    }else if(est.popupFechado && !aberto && !est.popup){
      c.classList.remove('ent-agenda');
      trocar(c, 
        h('span', { class:'eyebrow' }, 'Raio-X'),
        h('h2', null, cfg.cartao.titulo),
        h('p', { class:'sub' }, cfg.cartao.texto),
        h('button', { type:'button', class:'btn btn-fantasma ent-cta', onclick:abrirPopup }, cfg.cartao.botao)
      );
      c.hidden = false;
    }else{
      c.hidden = true;
    }
  }

  /* ---------- gatilhos ---------- */
  const tentar = () => tentarAbrir(false);
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') tentar(); });
  window.addEventListener('focus', tentar);
  window.addEventListener('pageshow', tentar);

  atualizarCartao();
  tentar();   // carregamento: o lead voltou do Claude e a pagina recarregou

  return {
    /** Chamado a cada copia do prompt: arma o gatilho por tempo. */
    aoCopiar(){
      clearTimeout(timer);
      timer = setTimeout(()=>tentarAbrir(true), (cfg.segundosAposCopia || 30) * 1000);
    },

    /** Chamado quando o prompt aparece na tela, copiado ou nao. */
    aoEntregarPrompt(){
      if(aberto || abertoNestaSessao || respondido()) return;
      clearTimeout(timer);
      timer = setTimeout(()=>tentarAbrir(true), (cfg.segundosAposPrompt || 5) * 1000);
    }
  };
}
