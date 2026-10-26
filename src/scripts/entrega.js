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
import { materialAtivo, materialProximo, buscarMaterial, temProximo, carregarQuiz } from '../data/materiais.js';
import { TEXTO_SEGMENTO } from './funil.js';
import { WHATSAPP_NUMERO, AGENDA_URL, INSTAGRAM_URL } from '../config.js';
import { estadoMaterial } from './armazem.js';
import { h, linkWhatsapp, pixelContato } from './modelo.js';
import { montarTutorial, abaInicial, lerAbas, reservarAltura } from './tutorial-abas.js';

// Botao fixo de cada bloco de fechamento. O diagnostico so sai pela Agenda.
const BOTAO_FECHAMENTO = {
  qualificado:       { texto:'Agendar diagnóstico gratuito', href:AGENDA_URL,    classe:'btn-primario' },
  'nao-qualificado': { texto:'Ver @provecta.vgv no Instagram', href:INSTAGRAM_URL, classe:'btn-fantasma' }
};

const ROTULO_TIPO = { prompt:'Prompt', tutorial:'Tutorial', app:'App' };
const ROTULO_SECAO = {
  passos:'Passo a passo', material:'Material', proximo:'Próximo elo',
  tutorial:'Como tirar a conversa do WhatsApp',
  qualificado:'Próximo passo', 'nao-qualificado':'Próximo passo'
};

// Alternancia preto/branco das secoes. Mapa explicito por nome: uma secao
// escondida (proximo sem destino, por exemplo) nao desloca as seguintes.
const FUNDO_SECAO = {
  intro:'escura', passos:'escura', quiz:'clara', gerado:'escura',
  tutorial:'clara', material:'escura', proximo:'clara',
  qualificado:'escura', 'nao-qualificado':'escura'
};

const $ = id => document.getElementById(id);

const q = new URLSearchParams(location.search);
const palavra = (q.get('m') || '').trim();
// Sem ?q= na URL (link recebido pelo nosso WhatsApp), o convite ao
// diagnostico vale para todos. Com ?q=, respeita o valor.
const qualificado = q.has('q') ? q.get('q') === '1' : true;
const segmento = TEXTO_SEGMENTO[(q.get('s') || '').trim().toLowerCase()] || '';
const leadId = ((q.get('l') || '').match(/^[\w-]{1,64}$/) || [''])[0];

const material = materialAtivo(palavra);

/** Mensagem do Proximo elo. Depende so das palavras, nao do destino existir. */
function mensagemProximo(){
  if(!temProximo(material)) return null;
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

function fundoDe(nome){
  // So materiais com quiz entram no esquema alternado.
  if(material.quiz !== true) return '';
  return ' ent-' + (FUNDO_SECAO[nome] || 'escura');
}

function cartao(secao, extraClasse){
  const rotulo = material['rotulo_' + secao.nome] ||
                 (secao.nome === 'intro' ? (ROTULO_TIPO[material.tipo] || 'Material') : ROTULO_SECAO[secao.nome]);
  return h('section', { class:'ent-card vidro' + fundoDe(secao.nome) + (extraClasse ? ' ' + extraClasse : ''), 'data-secao':secao.nome },
    rotulo ? h('span', { class:'eyebrow' }, rotulo) : null);
}

/* ---------- material com secoes (.md completo) ---------- */
function montarSecoes(){
  // Materiais com secoes montam tudo a partir do .md: os blocos estaticos do
  // HTML nao sao usados. Remover do DOM em vez de deixar escondidos — foi
  // justamente um [hidden] vencido por CSS que deixou um botao morto no ar.
  ['blocoMaterial','blocoProximo','blocoAgenda','blocoIndisponivel']
    .forEach(id => { const el = $(id); if(el) el.remove(); });

  const raiz = $('entConteudo');
  let blocoQuiz = null;

  material.secoes.forEach(secao=>{
    switch(secao.nome){
      case 'quiz': {
        if(material.quiz !== true) return;
        blocoQuiz = h('section', { class:'ent-card vidro ent-quiz' + fundoDe('quiz'), id:'blocoQuiz', 'aria-live':'polite' });
        raiz.append(blocoQuiz);
        return;
      }
      case 'tutorial': {
        if(!secao.md) return;
        const estadoTut = estadoMaterial(material.palavra, leadId);
        // O quiz grava aninhado: { quiz: { respostas: {...} } }.
        const respostasDoQuiz = () => {
          const e = estadoTut.ler() || {};
          return (e.quiz && e.quiz.respostas) || {};
        };
        const bloco = montarTutorial(secao.md, respostasDoQuiz());
        if(!bloco) return;
        const c = cartao(secao);
        c.append(bloco);
        raiz.append(c);
        reservarAltura(bloco);   // sincrono: antes de qualquer troca de aba

        // A resposta do quiz so existe depois que o lead responde, acima
        // nesta mesma pagina. Ao entrar na tela, reavalia a aba padrao —
        // a menos que a pessoa ja tenha trocado de aba na mao.
        let trocouNaMao = false;
        bloco.addEventListener('click', e => {
          if(e.target.closest('.tut-aba')) trocouNaMao = true;
        });
        if('IntersectionObserver' in window){
          // Continua observando ate a resposta existir: o bloco pode entrar
          // na tela antes de o lead terminar o quiz, logo acima.
          const obs = new IntersectionObserver(entradas => {
            if(!entradas.some(x => x.isIntersecting)) return;
            if(trocouNaMao){ obs.disconnect(); return; }
            const r = respostasDoQuiz();
            if(!r.formato) return;              // ainda sem resposta: espera
            obs.disconnect();
            const abas = [...bloco.querySelectorAll('.tut-aba')];
            const i = abaInicial(lerAbas(secao.md), r, navigator.userAgent);
            if(abas[i] && abas[i].getAttribute('aria-selected') !== 'true') abas[i].click();
          }, { rootMargin:'0px 0px -20% 0px' });
          obs.observe(bloco);
        }
        return;
      }
      case 'proximo': {
        if(!temProximo(material)) return;
        const c = cartao(secao);
        // Sem titulo no .md, usa o titulo do destino quando ele existe aqui.
        const destino = buscarMaterial(material.proximo);
        if(!/^#{1,3}\s/m.test(secao.md) && destino && destino.titulo) c.append(h('h2', null, destino.titulo));
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
        const b = BOTAO_FECHAMENTO[secao.nome];
        const corpo = renderizar(secao.md, b.classe);
        c.append(corpo);
        // O .md pode trazer o proprio botao; sem ele, entra o padrao.
        if(!corpo.querySelector('.ent-acao')){
          c.append(h('a', { class:'btn ' + b.classe + ' ent-cta', href:b.href, target:'_blank', rel:'noopener' },
            b.texto + ' ', h('span', { class:'seta' }, '→')));
        }
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
    cartao: cartaoRaioX,
    mensagemProximo
  }));

  // Atalho do proximo elo dentro do proprio cartao do prompt: o lead nao
  // precisa procurar o bloco la embaixo para pedir o material seguinte.
  const destinoProx = buscarMaterial(material.proximo);
  const proximo = temProximo(material) ? {
    titulo: (destinoProx && destinoProx.titulo) || String(material.proximo).toUpperCase(),
    href:   linkWhatsapp(WHATSAPP_NUMERO, mensagemProximo()),
    aoClicar: pixelContato
  } : null;

  montarQuiz(bloco, dados.quiz, dados.prompt, Object.assign({}, contexto, {
    aoCopiar: popup.aoCopiar,
    proximo
  }));
}

/* ---------- material so com frontmatter (formato antigo) ---------- */
function montarSimples(){
  $('entTipo').textContent      = ROTULO_TIPO[material.tipo] || 'Material';
  $('entTitulo').textContent    = material.titulo;
  $('entDescricao').textContent = material.descricao || '';
  // Sem urlMaterial nao ha o que abrir. Remover do DOM, e nao so esconder:
  // o botao tem target="_blank" e href="#", entao se qualquer regra de CSS
  // vencer o [hidden] ele volta a aparecer e abre a propria pagina numa
  // guia nova. Remover nao depende de estilo nenhum.
  if(material.urlMaterial) $('entBotao').href = material.urlMaterial;
  else $('entBotao').remove();
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
  $('entAgenda').href = AGENDA_URL;
  if(qualificado) $('blocoAgenda').hidden = false;
}

if(material){
  if(material.titulo) document.title = material.titulo + ' — Provecta VGV';
  if(material.secoes.length) montarSecoes();
  else montarSimples();
}else{
  // Palavra inexistente ou material inativo.
  $('entInsta').href          = INSTAGRAM_URL;
  $('blocoIndisponivel').hidden = false;
}

const ano = $('ano');
if(ano) ano.textContent = new Date().getFullYear();
