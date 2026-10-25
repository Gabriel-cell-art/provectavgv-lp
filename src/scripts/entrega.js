/* ============================================================
   PAGINA /entrega — destino pos-cadastro do funil organico.
   Le ?m= (palavra), ?q= (qualificado) e ?s= (segmento) e monta a tela.
   Nao e linkada em lugar nenhum do site nem no sitemap, e a
   pagina declara noindex, nofollow.
   ============================================================ */
import '../styles/base.css';
import '../styles/secoes.css';
import '../styles/entrega.css';
import { materialAtivo, materialProximo } from '../data/materiais.js';
import { TEXTO_SEGMENTO } from './funil.js';

// Bloco reservado, desligado. Trocar para true quando for ao ar.
const MOSTRAR_RAIO_X = false;

const INSTAGRAM = 'https://instagram.com/provecta.vgv';
// Formato internacional exigido pelo wa.me: 55 + DDD + numero.
const WHATS_PROXIMO = '5571993068515';

const ROTULO_TIPO = { prompt:'Prompt', tutorial:'Tutorial', app:'App' };

const $ = id => document.getElementById(id);

const q = new URLSearchParams(location.search);
const palavra = (q.get('m') || '').trim();
const qualificado = q.get('q') === '1';
const segmento = TEXTO_SEGMENTO[(q.get('s') || '').trim().toLowerCase()] || '';

const material = materialAtivo(palavra);

if(material){
  $('entTipo').textContent      = ROTULO_TIPO[material.tipo] || 'Material';
  $('entTitulo').textContent    = material.titulo;
  $('entDescricao').textContent = material.descricao;
  $('entBotao').href            = material.urlMaterial;
  $('blocoMaterial').hidden     = false;

  // Proximo elo: para todos, mas so se o destino existe e esta ativo.
  const proximo = materialProximo(material);
  if(proximo){
    const atual = material.palavra.trim().toUpperCase();
    const prox  = proximo.palavra.trim().toUpperCase();
    const msg = 'Oi! Vim do material ' + atual +
                (segmento ? ', sou ' + segmento + ',' : '') +
                ' e quero o próximo: ' + prox + '.';
    $('entProxTitulo').textContent = proximo.titulo;
    if(material.textoProximo) $('entProxTexto').textContent = material.textoProximo;
    else $('entProxTexto').hidden = true;
    const botao = $('entProxBotao');
    botao.href = 'https://wa.me/' + WHATS_PROXIMO + '?text=' + encodeURIComponent(msg);
    // Evento Contact so se o Pixel da Meta estiver carregado na pagina.
    botao.addEventListener('click', ()=>{
      if(typeof window.fbq === 'function') window.fbq('track','Contact');
    });
    $('blocoProximo').hidden = false;
  }

  // Agenda so para lead qualificado, e so quando ha material para entregar.
  if(qualificado) $('blocoAgenda').hidden = false;
  if(MOSTRAR_RAIO_X) $('blocoRaioX').hidden = false;
}else{
  // Palavra inexistente ou material inativo.
  $('entInsta').href          = INSTAGRAM;
  $('blocoIndisponivel').hidden = false;
}

const ano = $('ano');
if(ano) ano.textContent = new Date().getFullYear();
