/* ============================================================
   MODO FUNIL — ativado SOMENTE quando a URL traz ?m=<palavra>.
   Sem o parametro, nada aqui roda e a home fica identica.
   ============================================================ */
import { buscarMaterial } from '../data/materiais.js';

export const SEG_CONSTRUTORA = 'Construtora/incorporadora';
const VERBAS_QUALIFICAM = ['R$2–10 mil','Acima de R$10 mil'];

// Segmento viaja para a /entrega como ?s=<slug>, sem acento nem barra.
const SLUG_SEGMENTO = {
  'Construtora/incorporadora': 'construtora',
  'Imobiliária':               'imobiliaria',
  'Corretor autônomo':         'corretor',
  'Marketing/outro':           'marketing'
};
/** Texto do segmento na mensagem de WhatsApp, a partir do slug. */
export const TEXTO_SEGMENTO = {
  construtora: 'construtora/incorporadora',
  imobiliaria: 'imobiliária',
  corretor:    'corretor autônomo',
  marketing:   'marketing/outro'
};

/** Le ?m= da URL. Retorna null quando o parametro nao existe. */
export function palavraDaUrl(){
  const m = new URLSearchParams(location.search).get('m');
  return (m && m.trim()) ? m.trim() : null;
}

/** Captura os 5 UTMs, sempre presentes no payload (vazios quando ausentes). */
export function utms(){
  const q = new URLSearchParams(location.search);
  return {
    utm_source:   q.get('utm_source')   || '',
    utm_medium:   q.get('utm_medium')   || '',
    utm_campaign: q.get('utm_campaign') || '',
    utm_content:  q.get('utm_content')  || '',
    utm_term:     q.get('utm_term')     || ''
  };
}

/** Regra de qualificacao combinada com o cliente. */
export function ehQualificado(segmento, verba){
  if(segmento === SEG_CONSTRUTORA) return true;
  if(segmento === 'Imobiliária' || segmento === 'Corretor autônomo'){
    return VERBAS_QUALIFICAM.includes(verba);
  }
  return false;
}

/** Mascara brasileira: (71) 9 0000-0000 e (71) 0000-0000. */
export function mascaraZap(v){
  const d = String(v).replace(/\D/g,'').slice(0,11);
  if(d.length <= 2)  return d.length ? '(' + d : '';
  if(d.length <= 6)  return '(' + d.slice(0,2) + ') ' + d.slice(2);
  if(d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return '(' + d.slice(0,2) + ') ' + d.slice(2,3) + ' ' + d.slice(3,7) + '-' + d.slice(7);
}

/**
 * Monta a interface do modo funil.
 * Retorna o estado do funil, ou null se nao houver ?m= (home intacta).
 */
export function montarFunil(){
  const palavra = palavraDaUrl();
  if(!palavra) return null;                 // <<< porta da Regra Zero

  const material = buscarMaterial(palavra);
  // Material inexistente ou inativo ainda capta o lead, com texto generico.
  const titulo = (material && material.ativo) ? material.titulo : 'o material';

  const $ = id => document.getElementById(id);
  const tit = $('fTitulo');
  if(tit) tit.textContent = 'Acesso ao material';

  const sub = $('fSub');
  if(sub) sub.textContent = 'Preencha e receba ' + titulo + ' na hora.';

  const btn = $('submitBtn');
  if(btn) btn.innerHTML = 'Receber o material <span class="seta">→</span>';

  $('cSegmento') && ($('cSegmento').hidden = false);
  $('fConsent')  && ($('fConsent').hidden  = false);
  // O atalho de WhatsApp sai: no funil o objetivo e a entrega do material.
  $('fAlt') && ($('fAlt').hidden = true);

  // Campos condicionais comecam ocultos ate escolherem o segmento.
  aplicarSegmento(null);

  const grupoSeg = $('fSegmento');
  if(grupoSeg){
    grupoSeg.addEventListener('click', e=>{
      const o = e.target.closest('.opt'); if(o) aplicarSegmento(o.textContent.trim());
    });
    grupoSeg.addEventListener('keydown', e=>{
      if(e.key===' '||e.key==='Enter'){
        const o = e.target.closest('.opt'); if(o) aplicarSegmento(o.textContent.trim());
      }
    });
  }

  // Mascara do WhatsApp: so no funil, para nao alterar o modo padrao.
  const zap = $('fZap');
  if(zap) zap.addEventListener('input', ()=>{ zap.value = mascaraZap(zap.value); });

  return { palavra, material, titulo };
}

/** Mostra/oculta os campos conforme o segmento escolhido. */
export function aplicarSegmento(segmento){
  const $ = id => document.getElementById(id);
  const construtora = segmento === SEG_CONSTRUTORA;
  const precisaVerba = segmento === 'Imobiliária' || segmento === 'Corretor autônomo';

  ['cEmp','cEtapa','cVgv'].forEach(id=>{ const el=$(id); if(el) el.hidden = !construtora; });
  const verba = $('cVerba'); if(verba) verba.hidden = !precisaVerba;

  // WhatsApp fica sozinho na grade de 2 colunas quando Construtora some.
  const dupla = $('cDupla');
  if(dupla) dupla.classList.toggle('sozinho', !construtora);
}

/** Destino pos-envio, preservando os UTMs presentes na URL. */
export function urlEntrega(palavra, qualificado, segmento){
  const q = new URLSearchParams();
  q.set('m', String(palavra).toUpperCase());
  q.set('q', qualificado ? '1' : '0');
  if(SLUG_SEGMENTO[segmento]) q.set('s', SLUG_SEGMENTO[segmento]);
  const u = utms();
  Object.keys(u).forEach(k=>{ if(u[k]) q.set(k,u[k]); });
  // Barra final: resolve em qualquer host estatico. O vercel.json
  // tambem cobre /entrega sem barra via rewrite explicito.
  return '/entrega/?' + q.toString();
}
