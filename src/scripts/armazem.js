/* ============================================================
   localStorage/sessionStorage sempre protegidos.
   O navegador interno do Instagram, aba anonima e Safari com
   bloqueio podem lancar no acesso. Toda falha vira "sem dado".
   ============================================================ */

function area(tipo){
  try{ const s = window[tipo]; const k='__t'; s.setItem(k,k); s.removeItem(k); return s; }
  catch(e){ return null; }
}
const LOCAL  = area('localStorage');
const SESSAO = area('sessionStorage');

export const temLocal = !!LOCAL;

function ler(s, chave){
  if(!s) return null;
  try{ const v = s.getItem(chave); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
function gravar(s, chave, valor){
  if(!s) return false;
  try{ s.setItem(chave, JSON.stringify(valor)); return true; }catch(e){ return false; }
}
function apagar(s, chave){
  if(!s) return;
  try{ s.removeItem(chave); }catch(e){}
}

/**
 * Estado persistente de um material para um lead:
 * { quiz:{respostas,passo,concluido}, prompt, copiou, popup:{respostas} }
 */
export function estadoMaterial(palavra, leadId){
  const chave = 'provecta:' + palavra + ':' + (leadId || 'sem-id');
  // Sem localStorage, o estado vive so enquanto a pagina estiver aberta.
  let memoria = {};
  return {
    persistente: !!LOCAL,
    ler:    ()  => LOCAL ? (ler(LOCAL, chave) || {}) : memoria,
    juntar: obj => {
      if(LOCAL) return gravar(LOCAL, chave, Object.assign(ler(LOCAL, chave) || {}, obj));
      memoria = Object.assign({}, memoria, obj); return false;
    },
    zerar:  ()  => { memoria = {}; apagar(LOCAL, chave); }
  };
}

/** Flags da sessao (aba atual). */
export const sessao = {
  ler:    chave => ler(SESSAO, chave),
  gravar: (chave, v) => gravar(SESSAO, chave, v)
};
