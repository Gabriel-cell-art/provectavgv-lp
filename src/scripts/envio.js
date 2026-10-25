/* ============================================================
   Envio de respostas (quiz e pop-up) para o destino dos leads.
   Dispara e esquece: nunca bloqueia a tela nem mostra erro ao
   lead. O cruzamento com o cadastro e feito pelo lead_id.
   ============================================================ */
import { FORMSPREE, MAKE, RESPOSTAS_NO_FORMSPREE, ORIGEM } from '../config.js';

const DEBUG = new URLSearchParams(location.search).has('debug');

/** Gera um uuid v4. randomUUID exige contexto seguro; o fallback cobre o resto. */
export function novoId(){
  try{ if(crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  const b = new Uint8Array(16);
  try{ crypto.getRandomValues(b); }
  catch(e){ for(let i=0;i<16;i++) b[i] = Math.floor(Math.random()*256); }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}

/**
 * Envia um registro ao Make e, se ligado, ao Formspree.
 * `tipo` identifica o envio ('quiz' ou 'raio-x').
 */
export function enviarRespostas(tipo, { leadId, palavra }, campos, assunto){
  const corpo = Object.assign({
    'origem':     ORIGEM,
    'Origem':     ORIGEM,
    'tipo_envio': tipo,
    'lead_id':    leadId || '',
    'm':          palavra || '',
    'Página':     location.href,
    'Enviado em': new Date().toLocaleString('pt-BR',{timeZone:'America/Bahia'})
  }, campos, { '_subject': assunto });

  const post = (url, extra) => fetch(url, {
    method:'POST',
    headers:Object.assign({'Content-Type':'application/json'}, extra || {}),
    body:JSON.stringify(corpo), keepalive:true
  }).then(r=>{ if(DEBUG) console.log('[envio]', tipo, url, r.status); })
    .catch(e=>{ if(DEBUG) console.warn('[envio]', tipo, url, e.message); });

  if(MAKE) post(MAKE);
  if(RESPOSTAS_NO_FORMSPREE && FORMSPREE) post(FORMSPREE, {'Accept':'application/json'});
}
