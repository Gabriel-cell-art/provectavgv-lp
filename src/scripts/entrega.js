/* ============================================================
   PAGINA /entrega — destino pos-cadastro do funil organico.
   Le ?m= (palavra) e ?q= (qualificado) e monta a tela.
   Nao e linkada em lugar nenhum do site nem no sitemap, e a
   pagina declara noindex, nofollow.
   ============================================================ */
import '../styles/base.css';
import '../styles/secoes.css';
import '../styles/entrega.css';
import { materialAtivo } from '../data/materiais.js';

// Bloco reservado, desligado. Trocar para true quando for ao ar.
const MOSTRAR_RAIO_X = false;

const INSTAGRAM = 'https://instagram.com/provecta.vgv';

const ROTULO_TIPO = { prompt:'Prompt', tutorial:'Tutorial', app:'App' };

const $ = id => document.getElementById(id);

const q = new URLSearchParams(location.search);
const palavra = (q.get('m') || '').trim();
const qualificado = q.get('q') === '1';

const material = materialAtivo(palavra);

if(material){
  $('entTipo').textContent      = ROTULO_TIPO[material.tipo] || 'Material';
  $('entTitulo').textContent    = material.titulo;
  $('entDescricao').textContent = material.descricao;
  $('entBotao').href            = material.urlMaterial;
  $('blocoMaterial').hidden     = false;

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
