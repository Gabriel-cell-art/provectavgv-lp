/* ============================================================
   PAGINA /entrega — destino pos-cadastro do funil organico.
   Le ?m= (palavra), ?q= (qualificado), ?s= (segmento) e ?l= (id
   do lead) e monta a tela a partir de content/materiais/[m].md.

   O .md e dividido por marcadores <!-- secao -->, renderizados na
   ordem do arquivo. Secoes com comportamento proprio:
     quiz             motor de quiz (so com "quiz: true")
     proximo          bloco Proximo elo, com botao de WhatsApp
     qualificado      so com q=1
     nao-qualificado  so com q=0
   Qualquer outro nome vira um cartao de texto.

   Nao e linkada em lugar nenhum do site nem no sitemap, e a
   pagina declara noindex, nofollow.
   ============================================================ */
import '../styles/base.css';
import '../styles/secoes.css';
import '../styles/entrega.css';
import { marked } from 'marked';
import { materialAtivo, materialProximo, carregarQuiz } from '../data/materiais.js';
import { TEXTO_SEGMENTO } from './funil.js';
import { WHATSAPP_NUMERO } from '../config.js';
import { estadoMaterial } from './armazem.js';
import { h, preencher, linkWhatsapp, pixelContato } from './modelo.js';

const INSTAGRAM = 'https://instagram.com/provecta.vgv';

const ROTULO_TIPO = { prompt:'Prompt', tutorial:'Tutorial', app:'App' };
const ROTULO_SECAO = {
  passos:'Passo a passo', material:'Material', proximo:'Próximo elo',
  qualificado:'Próximo passo', 'nao-qualificado':'Próximo passo'
};

const $ = id => document.getElementById(id);

const q = new URLSearchParams(location.search);
const palavra = (q.get('m') || '').trim();
const qualificado = q.get('q') === '1';
const segmento = TEXTO_SEGMENTO[(q.get('s') || '').trim().toLowerCase()] || '';
const leadId = ((q.get('l') || '').match(/^[\w-]{1,64}$/) || [''])[0];

const material = materialAtivo(palavra);

/** Mensagem do Proximo elo. Depende so das palavras, nao do destino existir. */
function mensagemProximo(){
  if(!material || !material.proximo) return null;
  const atual = material.palavra;
  const prox  = String(material.proximo).trim().toUpperCase();
  return 'Oi! Vim do material ' + atual +
         (segmento ? ', sou ' + segmento + ',' : '') +
         ' e quero o próximo: ' + prox + '.';
}

/** Markdown -> HTML. Paragrafo que e so um link vira botao. */
function renderizar(md, classeBotao){
  const div = h('div', { class:'ent-md' });
  div.innerHTML = marked.parse(md || '', { async:false });
  div.querySelectorAll('a[href^="http"]').forEach(a=>{ a.target = '_blank'; a.rel = 'noopener'; });
  div.querySelectorAll('p').forEach(p=>{
    const a = p.querySelector('a');
    if(a && p.childNodes.length === 1){
      a.className = 'btn ' + classeBotao + ' ent-cta';
      p.className = 'ent-acao';
    }
  });
  return div;
}

function cartao(secao, extraClasse){
  const rotulo = material['rotulo_' + secao.nome] ||
                 (secao.nome === 'intro' ? (ROTULO_TIPO[material.tipo] || 'Material') : ROTULO_SECAO[secao.nome]);
  return h('section', { class:'ent-card vidro' + (extraClasse ? ' ' + extraClasse : ''), 'data-secao':secao.nome },
    rotulo ? h('span', { class:'eyebrow' }, rotulo) : null);
}

/* ---------- material com secoes (.md completo) ---------- */
function montarSecoes(){
  const raiz = $('entConteudo');
  let blocoQuiz = null;

  material.secoes.forEach(secao=>{
    switch(secao.nome){
      case 'quiz': {
        if(material.quiz !== true) return;
        blocoQuiz = h('section', { class:'ent-card vidro ent-quiz', id:'blocoQuiz', 'aria-live':'polite' });
        raiz.append(blocoQuiz);
        return;
      }
      case 'proximo': {
        if(!materialProximo(material)) return;   // destino precisa existir e estar ativo
        const c = cartao(secao);
        c.append(renderizar(secao.md, 'btn-fantasma'),
          h('a', { class:'btn btn-fantasma ent-cta', target:'_blank', rel:'noopener',
                   href:linkWhatsapp(WHATSAPP_NUMERO, mensagemProximo()), onclick:pixelContato },
            'Pedir o próximo no WhatsApp ', h('span', { class:'seta' }, '→')));
        raiz.append(c);
        return;
      }
      case 'qualificado':
      case 'nao-qualificado': {
        if((secao.nome === 'qualificado') !== qualificado) return;
        const c = cartao(secao, qualificado ? 'ent-agenda' : '');
        c.append(renderizar(secao.md, qualificado ? 'btn-primario' : 'btn-fantasma'));
        raiz.append(c);
        return;
      }
      default: {
        if(!secao.md && !(secao.nome === 'material' && material.urlMaterial)) return;
        const c = cartao(secao);
        c.append(renderizar(secao.md, 'btn-fantasma'));
        if(secao.nome === 'material' && material.urlMaterial){
          c.append(h('a', { class:'btn btn-primario ent-cta', href:material.urlMaterial, target:'_blank', rel:'noopener' },
            'Abrir material ', h('span', { class:'seta' }, '→')));
        }
        raiz.append(c);
      }
    }
  });

  if(blocoQuiz) iniciarQuiz(blocoQuiz, raiz);
}

async function iniciarQuiz(bloco, raiz){
  bloco.append(h('p', { class:'sub' }, 'Carregando perguntas…'));
  const dados = await carregarQuiz(material).catch(e=>{ console.error('[quiz]', e); return null; });
  if(!dados){ bloco.remove(); return; }

  const [{ montarQuiz }, { iniciarPopup }] = await Promise.all([
    import('./quiz.js'), import('./popup-diagnostico.js')
  ]);
  const estado = estadoMaterial(material.palavra, leadId);
  const contexto = { palavra:material.palavra, leadId, estado };

  // Cartao do Raio-X: sempre o ultimo da pagina.
  const cartaoRaioX = h('section', { class:'ent-card vidro', id:'blocoRaioX', hidden:true });
  raiz.append(cartaoRaioX);

  const popup = iniciarPopup(Object.assign({}, contexto, {
    qualificado, segmento,
    cartao: cartaoRaioX,
    mensagemProximo,
    acao: ()=>{
      if(!material.acaoWhatsapp) return '';
      const valores = Object.assign({ palavra:material.palavra }, estado.ler().quiz?.respostas);
      const vazio = [...material.acaoWhatsapp.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)]
        .some(m => !String(valores[m[1]] || '').trim());
      return vazio ? '' : preencher(material.acaoWhatsapp, valores).trim();
    }
  }));

  montarQuiz(bloco, dados.quiz, dados.prompt, Object.assign({}, contexto, {
    aoCopiar: popup.aoCopiar
  }));
}

/* ---------- material so com frontmatter (formato antigo) ---------- */
function montarSimples(){
  $('entTipo').textContent      = ROTULO_TIPO[material.tipo] || 'Material';
  $('entTitulo').textContent    = material.titulo;
  $('entDescricao').textContent = material.descricao || '';
  if(material.urlMaterial) $('entBotao').href = material.urlMaterial;
  else $('entBotao').hidden = true;
  $('blocoMaterial').hidden     = false;

  // Proximo elo: para todos, mas so se o destino existe e esta ativo.
  const proximo = materialProximo(material);
  if(proximo){
    $('entProxTitulo').textContent = proximo.titulo;
    if(material.textoProximo) $('entProxTexto').textContent = material.textoProximo;
    else $('entProxTexto').hidden = true;
    const botao = $('entProxBotao');
    botao.href = linkWhatsapp(WHATSAPP_NUMERO, mensagemProximo());
    botao.addEventListener('click', pixelContato);
    $('blocoProximo').hidden = false;
  }

  // Agenda so para lead qualificado, e so quando ha material para entregar.
  if(qualificado) $('blocoAgenda').hidden = false;
}

if(material){
  if(material.titulo) document.title = material.titulo + ' — Provecta VGV';
  if(material.secoes.length) montarSecoes();
  else montarSimples();
}else{
  // Palavra inexistente ou material inativo.
  $('entInsta').href          = INSTAGRAM;
  $('blocoIndisponivel').hidden = false;
}

const ano = $('ano');
if(ano) ano.textContent = new Date().getFullYear();
