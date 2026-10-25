/* ============================================================
   Copiar para a area de transferencia, inclusive no navegador
   interno do Instagram e no Safari do iPhone.
   1) navigator.clipboard (contexto seguro)
   2) textarea + execCommand('copy'), com selecao que o iOS aceita
   Se os dois falharem, quem chama seleciona o texto na tela.
   ============================================================ */

function copiarLegado(texto){
  const ta = document.createElement('textarea');
  ta.value = texto;
  // 16px evita o zoom automatico do iOS; fora da tela, mas selecionavel.
  ta.setAttribute('readonly','');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
  document.body.appendChild(ta);
  let ok = false;
  try{
    ta.contentEditable = 'true';
    ta.readOnly = false;
    const r = document.createRange();
    r.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
    ta.setSelectionRange(0, texto.length);
    ok = document.execCommand('copy');
    sel.removeAllRanges();
  }catch(e){ ok = false; }
  ta.remove();
  return ok;
}

/** Copia o texto. Resolve true quando deu certo. */
export async function copiarTexto(texto){
  if(navigator.clipboard && window.isSecureContext){
    try{ await navigator.clipboard.writeText(texto); return true; }catch(e){}
  }
  return copiarLegado(texto);
}

/** Seleciona o conteudo de um elemento, para o lead copiar na mao. */
export function selecionar(el){
  try{
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(r);
  }catch(e){}
}
