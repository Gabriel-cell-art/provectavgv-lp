/* ============================================================
   BLOCO REUTILIZAVEL: TUTORIAL EM ABAS
   Qualquer material pode usar o marcador <!-- tutorial --> no .md.
   Cada aba e um "### Nome" dentro da secao; os passos sao a lista
   numerada abaixo dele.

   Aba aberta por padrao:
   1. se o quiz respondeu "Prints" (chave `formato`), abre Prints;
   2. senao, detecta iPhone ou Android pelo userAgent;
   3. sem deteccao, abre a primeira.
   ============================================================ */
import { h } from './modelo.js';

/** Divide a secao em abas por "### Nome". Preserva a ordem do arquivo. */
export function lerAbas(md){
  const abas = [];
  const re = /^###\s+(.+)$/gm;
  let atual = null, inicio = 0, m;
  while((m = re.exec(md))){
    if(atual) abas.push({ nome:atual, corpo:md.slice(inicio, m.index).trim() });
    atual = m[1].trim(); inicio = re.lastIndex;
  }
  if(atual) abas.push({ nome:atual, corpo:md.slice(inicio).trim() });
  return abas;
}

/** Passos de uma aba: uma linha numerada por passo. */
function passos(corpo){
  return corpo.split(/\r?\n/)
    .map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

/** Sistema provavel do aparelho. Retorna 'iphone', 'android' ou ''. */
export function sistema(ua){
  const t = String(ua || '').toLowerCase();
  if(/iphone|ipad|ipod/.test(t)) return 'iphone';
  if(/android/.test(t)) return 'android';
  return '';
}

/** Indice da aba que abre primeiro. */
export function abaInicial(abas, respostas, ua){
  const nomes = abas.map(a => a.nome.toLowerCase());
  const formato = String((respostas && respostas.formato) || '').toLowerCase();
  if(formato.includes('print')){
    const i = nomes.findIndex(n => n.includes('print'));
    if(i >= 0) return i;
  }
  const sis = sistema(ua);
  if(sis){
    const i = nomes.findIndex(n => n.includes(sis === 'iphone' ? 'iphone' : 'android'));
    if(i >= 0) return i;
  }
  return 0;
}

/**
 * Monta o bloco. `respostas` sao as do quiz (pode vir vazio).
 * Sem abas no markdown, devolve null e o chamador ignora a secao.
 */
export function montarTutorial(md, respostas){
  const abas = lerAbas(md);
  if(!abas.length) return null;

  const inicial = abaInicial(abas, respostas, navigator.userAgent);

  const tablist = h('div', { class:'tut-abas', role:'tablist' });
  const paineis = [];

  abas.forEach((aba, i) => {
    const idAba = 'tut-a-' + i, idPainel = 'tut-p-' + i;

    const botao = h('button', {
      class:'tut-aba', type:'button', role:'tab', id:idAba,
      'aria-controls':idPainel, 'aria-selected': i === inicial ? 'true' : 'false',
      tabindex: i === inicial ? '0' : '-1'
    }, aba.nome);

    const painel = h('div', {
      class:'tut-painel', role:'tabpanel', id:idPainel,
      'aria-labelledby':idAba, hidden: i !== inicial
    }, h('ol', { class:'tut-passos' }, passos(aba.corpo).map(t => h('li', null, t))));

    const abrir = () => {
      tablist.querySelectorAll('.tut-aba').forEach(b => {
        b.setAttribute('aria-selected','false'); b.tabIndex = -1;
      });
      paineis.forEach(p => { p.hidden = true; });
      botao.setAttribute('aria-selected','true'); botao.tabIndex = 0;
      painel.hidden = false;
    };

    botao.addEventListener('click', abrir);
    botao.addEventListener('keydown', e => {
      // Setas navegam entre abas, como manda o padrao de tablist.
      if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const bs = [...tablist.querySelectorAll('.tut-aba')];
      const passo = e.key === 'ArrowRight' ? 1 : -1;
      const prox = bs[(bs.indexOf(botao) + passo + bs.length) % bs.length];
      prox.click(); prox.focus();
    });

    tablist.append(botao);
    paineis.push(painel);
  });

  const raiz = h('div', { class:'tut' }, tablist, ...paineis);
  raiz._paineis = paineis;
  raiz._tablist = tablist;

  return raiz;
}

/**
 * Reserva a altura do painel mais alto. Chamar logo depois de inserir o
 * bloco no documento, de forma sincrona: assim o valor ja esta aplicado
 * antes de qualquer troca de aba, e nada desloca (CLS).
 */
export function reservarAltura(raiz){
  if(!raiz || !raiz.isConnected || !raiz._paineis) return;
  let maior = 0;
  raiz._paineis.forEach(pn => {
    const oculto = pn.hidden;
    if(oculto){ pn.style.visibility='hidden'; pn.hidden=false; }
    maior = Math.max(maior, pn.offsetHeight);
    if(oculto){ pn.hidden=true; pn.style.visibility=''; }
  });
  if(maior) raiz.style.minHeight = (raiz._tablist.offsetHeight + maior) + 'px';
}
