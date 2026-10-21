/* ============================================================
   FONTE UNICA DOS MATERIAIS DO FUNIL ORGANICO
   Para publicar um material novo, acrescente UMA linha ao array.
   A busca por palavra ignora maiusculas/minusculas e espacos nas pontas.

   palavra     chave que a pessoa comenta no Instagram (sem acento, sem espaco)
   titulo      nome do material como aparece na home e na /entrega
   descricao   1 a 2 frases, exibidas na /entrega
   tipo        'prompt' | 'tutorial' | 'app'
   urlMaterial link externo onde o material de fato esta
   ativo       false tira do ar sem apagar a linha
   ============================================================ */
export const MATERIAIS = [
  {
    palavra:     'FORMS',
    titulo:      'Material de teste',
    descricao:   'Material de validação do funil. Usado só para conferir o fluxo ponta a ponta.',
    tipo:        'prompt',
    urlMaterial: 'https://example.com',
    ativo:       true
  },
];

/** Busca um material pela palavra, ignorando caixa e espacos. */
export function buscarMaterial(palavra){
  if(!palavra) return null;
  const chave = String(palavra).trim().toUpperCase();
  if(!chave) return null;
  return MATERIAIS.find(m => m.palavra.trim().toUpperCase() === chave) || null;
}

/** Material valido para entrega: existe E esta ativo. */
export function materialAtivo(palavra){
  const m = buscarMaterial(palavra);
  return (m && m.ativo) ? m : null;
}
