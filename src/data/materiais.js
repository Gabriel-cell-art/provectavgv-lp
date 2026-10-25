/* ============================================================
   FONTE UNICA DOS MATERIAIS DO FUNIL ORGANICO
   Cada material e um arquivo em content/materiais/:

     [palavra].md          obrigatorio: frontmatter + secoes
     [palavra].quiz.json   opcional: perguntas do quiz
     [palavra].prompt.txt  opcional: prompt-modelo com {{chave}}

   A palavra e o nome do arquivo (publico.md -> PUBLICO). A busca
   ignora maiusculas/minusculas e espacos nas pontas.

   Frontmatter (uma chave por linha, "chave: valor"):
   titulo       nome do material na home e na /entrega
   descricao    1 a 2 frases (usado quando o .md nao tem secoes)
   tipo         'prompt' | 'tutorial' | 'app'
   ativo        false tira do ar sem apagar o arquivo
   urlMaterial  (opcional) link externo onde o material esta
   quiz         (opcional) true renderiza o quiz no marcador <!-- quiz -->
   proximo      (opcional) palavra do material seguinte da trilha
   textoProximo (opcional) frase do bloco "Proximo elo" quando o .md nao
                tem a secao <!-- proximo -->
   acaoWhatsapp (opcional) frase do pop-up de diagnostico, com {{chave}}
                do quiz. Ex.: Fiz o estudo de público do {{nome}}
   rotulo_<secao> (opcional) troca o rotulo pequeno acima de uma secao

   O bloco "Proximo elo" so aparece se o material de `proximo`
   existir e estiver ativo.
   ============================================================ */

const ARQUIVOS = import.meta.glob('/content/materiais/*.md',
  { query:'?raw', import:'default', eager:true });

/** Frontmatter simples: "chave: valor", com true/false e aspas opcionais. */
export function lerFrontmatter(texto){
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(texto);
  if(!m) return { dados:{}, corpo:texto };
  const dados = {};
  m[1].split(/\r?\n/).forEach(linha=>{
    const i = linha.indexOf(':');
    if(i < 1 || /^\s*#/.test(linha)) return;
    const chave = linha.slice(0,i).trim();
    let valor = linha.slice(i+1).trim();
    if(/^(['"]).*\1$/.test(valor)) valor = valor.slice(1,-1);
    else if(valor === 'true') valor = true;
    else if(valor === 'false') valor = false;
    dados[chave] = valor;
  });
  return { dados, corpo:texto.slice(m[0].length) };
}

/** Divide o corpo pelos marcadores <!-- secao -->, preservando a ordem do arquivo. */
export function lerSecoes(corpo){
  const secoes = [];
  const re = /<!--\s*([a-z][a-z0-9-]*)\s*-->/g;
  let atual = null, inicio = 0, m;
  while((m = re.exec(corpo))){
    if(atual) secoes.push({ nome:atual, md:corpo.slice(inicio, m.index).trim() });
    atual = m[1]; inicio = re.lastIndex;
  }
  if(atual) secoes.push({ nome:atual, md:corpo.slice(inicio).trim() });
  return secoes;
}

export const MATERIAIS = Object.keys(ARQUIVOS).map(caminho=>{
  const arquivo = caminho.split('/').pop().replace(/\.md$/,'');
  const { dados, corpo } = lerFrontmatter(ARQUIVOS[caminho]);
  return Object.assign({ tipo:'prompt', ativo:true }, dados, {
    palavra: arquivo.toUpperCase(),
    arquivo,
    secoes:  lerSecoes(corpo)
  });
});

/** Busca um material pela palavra, ignorando caixa e espacos. */
export function buscarMaterial(palavra){
  if(!palavra) return null;
  const chave = String(palavra).trim().toUpperCase();
  if(!chave) return null;
  return MATERIAIS.find(m => m.palavra === chave) || null;
}

/** Material valido para entrega: existe E esta ativo. */
export function materialAtivo(palavra){
  const m = buscarMaterial(palavra);
  return (m && m.ativo) ? m : null;
}

/** Proximo material da trilha, so quando existe E esta ativo. */
export function materialProximo(material){
  if(!material || !material.proximo) return null;
  const p = materialAtivo(material.proximo);
  // Nunca aponta para ele mesmo.
  return (p && p !== material) ? p : null;
}

// Quiz e prompt so carregam na /entrega, e so os do material aberto.
const QUIZES  = import.meta.glob('/content/materiais/*.quiz.json', { import:'default' });
const PROMPTS = import.meta.glob('/content/materiais/*.prompt.txt',
  { query:'?raw', import:'default' });

/** Carrega quiz e prompt-modelo do material. Retorna null se faltar algum. */
export async function carregarQuiz(material){
  const base = '/content/materiais/' + material.arquivo;
  const q = QUIZES[base + '.quiz.json'], p = PROMPTS[base + '.prompt.txt'];
  if(!q || !p) return null;
  const [quiz, prompt] = await Promise.all([q(), p()]);
  return { quiz, prompt };
}
