/* ============================================================
   Utilitarios de texto e DOM compartilhados por quiz e pop-up.
   ============================================================ */

/** Troca {{chave}} pelos valores. Chave ausente vira texto vazio. */
export function preencher(modelo, valores){
  return String(modelo || '').replace(/\{\{\s*([\w-]+)\s*\}\}/g,
    (_, k) => (valores[k] == null ? '' : String(valores[k])));
}

/** Chaves {{...}} usadas num modelo. */
export function marcadores(modelo){
  return [...String(modelo || '').matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map(m => m[1]);
}

/** "A", "A e B", "A, B e C". */
export function listar(itens){
  if(itens.length <= 1) return itens.join('');
  return itens.slice(0,-1).join(', ') + ' e ' + itens[itens.length-1];
}

/** Primeira letra minuscula, para encaixar resposta no meio da frase. */
export function minuscula(t){
  t = String(t || '');
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Cria elemento: h('p', {class:'x'}, 'texto', filho). */
export function h(tag, attrs, ...filhos){
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k,v])=>{
    if(v == null || v === false) return;
    if(k === 'class') el.className = v;
    else if(k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  filhos.flat().forEach(f=>{
    if(f == null || f === false) return;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  });
  return el;
}

/** Troca os filhos de um elemento, ignorando null/false (blocos condicionais). */
export function trocar(el, ...filhos){
  el.replaceChildren(...filhos.flat().filter(f => f != null && f !== false));
}

/** Link de WhatsApp com mensagem. */
export function linkWhatsapp(numero, mensagem){
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensagem);
}

/** Evento Contact so se o Pixel da Meta estiver carregado na pagina. */
export function pixelContato(){
  if(typeof window.fbq === 'function') window.fbq('track','Contact');
}
