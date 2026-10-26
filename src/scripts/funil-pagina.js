/* ============================================================
   PAGINA DO FUNIL (?m=) — unico script da pagina.
   Serve so para o formulario condicional e o envio. Sem bibliotecas,
   sem animacao, sem import de materiais.js (que faria glob de todos
   os .md). Titulo e rota vem do mapa injetado no build.
   ============================================================ */
import { WHATSAPP_NUMERO, FORMSPREE, MAKE, ORIGEM } from '../config.js';

const SEG_CONSTRUTORA = 'Construtora/incorporadora';
const PRECISA_VERBA   = ['Imobiliária','Corretor autônomo'];
const VERBA_QUALIFICA = ['R$2–10 mil','Acima de R$10 mil'];
const ESPERA_MAX_MS   = 2000;   // nunca segurar o lead por mais que isso

const $  = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);

const palavra  = (qs.get('m') || '').trim().toUpperCase();
const material = (window.__MAT__ || {})[palavra] || null;
const nomeMat  = material ? material.t : 'o material';
const destino  = material ? material.d : 'whatsapp';

/* ---------- grupos de opcao ---------- */
function valorDe(id){
  const el = $(id) && $(id).querySelector('.opt[aria-checked="true"]');
  return el ? el.textContent.trim() : '';
}
function ligarGrupo(id, aoEscolher){
  const g = $(id); if(!g) return;
  const marcar = o => {
    g.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-checked','false'));
    o.setAttribute('aria-checked','true');
    g.style.boxShadow = '';
    if(aoEscolher) aoEscolher(o.textContent.trim());
  };
  g.addEventListener('click', e => { const o = e.target.closest('.opt'); if(o) marcar(o); });
  g.addEventListener('keydown', e => {
    if(e.key === ' ' || e.key === 'Enter'){
      const o = e.target.closest('.opt'); if(o){ e.preventDefault(); marcar(o); }
    }
  });
}

/* ---------- campos condicionais ---------- */
function aplicarSegmento(seg){
  const construtora = seg === SEG_CONSTRUTORA;
  const verba = PRECISA_VERBA.includes(seg);
  ['cEmp','cEtapa','cVgv'].forEach(id => { if($(id)) $(id).hidden = !construtora; });
  if($('cVerba')) $('cVerba').hidden = !verba;
}
ligarGrupo('seg', aplicarSegmento);
['etapa','vgv','verba'].forEach(id => ligarGrupo(id));

/* ---------- mascara brasileira ---------- */
function mascara(v){
  const d = String(v).replace(/\D/g,'').slice(0,11);
  if(d.length <= 2)  return d.length ? '(' + d : '';
  if(d.length <= 6)  return '(' + d.slice(0,2) + ') ' + d.slice(2);
  if(d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return '(' + d.slice(0,2) + ') ' + d.slice(2,3) + ' ' + d.slice(3,7) + '-' + d.slice(7);
}
$('zap').addEventListener('input', e => { e.target.value = mascara(e.target.value); });

/* ---------- mensagem pronta do WhatsApp ---------- */
function mensagem(seg, dados){
  if(seg === SEG_CONSTRUTORA){
    return 'Oi! Quero o material ' + nomeMat + '. Sou da ' + (dados.emp || 'minha construtora') +
           ', empreendimento em ' + dados.etapa + ', VGV ' + dados.vgv + '.';
  }
  if(PRECISA_VERBA.includes(seg)){
    const quem = seg === 'Imobiliária' ? 'imobiliária' : 'corretor autônomo';
    // "invisto Não invisto" nao e frase: esse caso tem redacao propria.
    const trecho = dados.verba === 'Não invisto'
      ? ' e ainda não invisto em anúncios.'
      : ' e invisto ' + dados.verba + ' em anúncios por mês.';
    return 'Oi! Quero o material ' + nomeMat + '. Sou ' + quem + trecho;
  }
  return 'Oi! Quero o material ' + nomeMat + '. Trabalho com marketing/outro no mercado imobiliário.';
}

/* ---------- destino pos-envio ---------- */
function rota(seg, dados, qualificado){
  if(destino === 'entrega'){
    const p = new URLSearchParams({ m: palavra, q: qualificado ? '1' : '0' });
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
      .forEach(k => { if(qs.get(k)) p.set(k, qs.get(k)); });
    return '/entrega/?' + p.toString();
  }
  return 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' +
         encodeURIComponent(mensagem(seg, dados));
}

/* ---------- envio: nunca trava o lead ---------- */
function enviar(lead){
  const corpo = JSON.stringify(lead);
  // keepalive mantem a requisicao viva depois da navegacao.
  const opc = { method:'POST', headers:{'Content-Type':'application/json'},
                body:corpo, keepalive:true };
  if(MAKE) fetch(MAKE, opc).catch(()=>{});
  return fetch(FORMSPREE, { ...opc, headers:{ ...opc.headers, Accept:'application/json' } })
    .catch(()=>{});
}

/* ---------- submit ---------- */
$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('btn');
  const seg   = valorDe('seg');
  const nome  = $('nome').value.trim();
  const zap   = $('zap').value.trim();
  const emp   = $('emp') ? $('emp').value.trim() : '';
  const etapa = valorDe('etapa');
  const vgv   = valorDe('vgv');
  const verba = valorDe('verba');

  const faltou = [];
  if(!seg)  { faltou.push('seg');  $('seg').style.boxShadow  = '0 0 0 3px rgba(224,86,79,.2)'; }
  if(!nome) { faltou.push('nome'); $('nome').style.borderColor = '#e0564f'; }
  else $('nome').style.borderColor = '';
  if(!zap)  { faltou.push('zap');  $('zap').style.borderColor  = '#e0564f'; }
  else $('zap').style.borderColor = '';
  if(PRECISA_VERBA.includes(seg) && !verba){
    faltou.push('verba'); $('verba').style.boxShadow = '0 0 0 3px rgba(224,86,79,.2)';
  }
  if(faltou.length){ $(faltou[0]).scrollIntoView({block:'center'}); return; }

  const qualificado = seg === SEG_CONSTRUTORA ||
                      (PRECISA_VERBA.includes(seg) && VERBA_QUALIFICA.includes(verba));

  const lead = {
    'Nome':nome, 'WhatsApp':zap,
    'Construtora': seg === SEG_CONSTRUTORA ? (emp || '—') : '—',
    'Etapa da obra': seg === SEG_CONSTRUTORA ? etapa : '—',
    'VGV estimado':  seg === SEG_CONSTRUTORA ? vgv   : '—',
    'Origem':ORIGEM, 'origem':ORIGEM,
    'palavra':palavra || '—',
    'segmento':seg,
    'verba':verba || '',
    'qualificado': qualificado ? 'sim' : 'não',
    'utm_source':qs.get('utm_source')||'', 'utm_medium':qs.get('utm_medium')||'',
    'utm_campaign':qs.get('utm_campaign')||'', 'utm_content':qs.get('utm_content')||'',
    'utm_term':qs.get('utm_term')||'',
    'Página':location.href,
    'Enviado em':new Date().toLocaleString('pt-BR',{timeZone:'America/Bahia'}),
    '_subject':'Lead funil — ' + seg + ' · ' + (palavra || '—') +
               ' · ' + (qualificado ? 'QUALIFICADO' : 'não qualificado'),
    '_gotcha':$('hp').value
  };

  btn.disabled = true; btn.textContent = 'Enviando…';

  // Evento Lead antes do redirecionamento, se o Pixel existir na pagina.
  if(typeof window.fbq === 'function'){ try{ window.fbq('track','Lead'); }catch(err){} }

  // O lead nunca espera mais que ESPERA_MAX_MS: o que nao terminou segue
  // vivo por keepalive depois da navegacao.
  await Promise.race([ enviar(lead), new Promise(r => setTimeout(r, ESPERA_MAX_MS)) ]);

  location.href = rota(seg, { emp, etapa, vgv, verba }, qualificado);
});
