/* ============================================================
   MOTOR DE QUIZ — generico, guiado por [palavra].quiz.json.
   Uma pergunta por tela, barra de progresso, voltar. Ao terminar,
   preenche o [palavra].prompt.txt e mostra o prompt para copiar.

   Tipos de pergunta: 'texto' | 'unica' | 'multipla'
   Campos: chave, texto, tipo, obrigatoria, placeholder, opcoes,
           exclusiva (opcao que desmarca as outras na multipla),
           padrao (valor no prompt quando fica sem resposta)

   Estado salvo por material e lead (ver armazem.js), para o lead
   que volta do app do Claude encontrar o prompt pronto.
   ============================================================ */
import { h, trocar, preencher, marcadores } from './modelo.js';
import { calcularFunil, textoNumeros, textoCalculos, textoComparacao } from './numeros.js';
import { telaNumeros, funilVisual } from './numeros-ui.js';
import referencias from '../../content/referencias.json';
import { copiarTexto, selecionar } from './copiar.js';
import { enviarRespostas } from './envio.js';

const TEXTOS = {
  tituloPrompt: 'Seu prompt está pronto',
  botaoCopiar:  'Copiar prompt',
  avisoCopiado: 'Copiado. Cole no Claude.',
  avisoManual:  'Não deu para copiar sozinho. Toque e segure no texto para copiar.',
  dica:         'Dica: cole num projeto novo no Claude para guardar o estudo e os arquivos.',
  botaoRefazer: 'Refazer respostas',
  continuar:    'Continuar',
  pular:        'Pular',
  finalizar:    'Gerar prompt',
  voltar:       'Voltar',
  obrigatoria:  'Responda para continuar.'
};

const vazio = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

/** Valor de cada chave como entra no prompt e no envio. */
export function valoresPrompt(quiz, respostas){
  const out = {};
  quiz.perguntas.forEach(p=>{
    const v = respostas[p.chave];
    out[p.chave] = vazio(v) ? (p.padrao || '')
                 : Array.isArray(v) ? v.join(', ') : String(v).trim();
  });
  return out;
}

/**
 * Monta o quiz dentro de `raiz`.
 * ctx: { palavra, leadId, estado, aoCopiar }
 */
export function montarQuiz(raiz, quiz, modelo, ctx){
  const T = Object.assign({}, TEXTOS, quiz.textos || {});
  const perguntas = quiz.perguntas || [];
  const salvo = ctx.estado.ler();
  let respostas = Object.assign({}, salvo.quiz && salvo.quiz.respostas);
  let passo = Math.min(Math.max((salvo.quiz && salvo.quiz.passo) || 0, 0), perguntas.length - 1);

  // Aviso no console se o prompt usa chave que o quiz nao tem.
  const chaves = new Set(perguntas.map(p=>p.chave));
  marcadores(modelo).forEach(k=>{ if(!chaves.has(k)) console.warn('[quiz] marcador sem pergunta:', k); });

  const salvar = extra => ctx.estado.juntar(Object.assign({ quiz:{ respostas, passo } }, extra || {}));

  function irPara(n){
    passo = n; salvar(); desenharPergunta(true);
  }

  function valido(p){
    if(p.tipo === 'numeros'){
      const v = respostas[p.chave] || {};
      return !p.obrigatoria || Object.values(v).some(x => !vazio(x));
    }
    return !p.obrigatoria || !vazio(respostas[p.chave]);
  }

  function seguir(){
    const p = perguntas[passo];
    if(!valido(p)){
      const erro = raiz.querySelector('.qz-erro');
      if(erro) erro.textContent = T.obrigatoria;
      return;
    }
    if(passo < perguntas.length - 1) irPara(passo + 1);
    else concluir();
  }

  /** Resultado do modulo numerico, quando o quiz tem tela de numeros. */
  function calcular(){
    const pNum = perguntas.find(x => x.tipo === 'numeros');
    if(!pNum) return null;
    const brutos = respostas[pNum.chave] || {};
    return calcularFunil({
      numeros: brutos, referencias,
      canal: respostas.canal, faixaPreco: respostas.faixa_preco
    });
  }

  function concluir(){
    const valores = valoresPrompt(quiz, respostas);
    const r = calcular();
    if(r){
      // Os tres marcadores sao montados em texto aqui, pelo site.
      valores.numeros    = textoNumeros(r);
      valores.calculos   = textoCalculos(r);
      valores.comparacao = textoComparacao(r);
    }
    const prompt = preencher(modelo, valores);
    salvar({ prompt, concluido:true });
    const nome = valores[perguntas[0] && perguntas[0].chave] || '';
    enviarRespostas('quiz', ctx, valores,
      'Quiz ' + ctx.palavra + ' — ' + (nome || 'sem nome') + ' · lead ' + (ctx.leadId || 'sem id').slice(0,8));
    desenharPrompt(prompt, true, r);
  }

  function desenharPergunta(focar){
    const p = perguntas[passo];
    const total = perguntas.length;
    const ultima = passo === total - 1;
    const valor = respostas[p.chave];

    const titulo = h('h2', { class:'qz-pergunta', id:'qzPergunta', tabindex:'-1' }, p.texto);
    const dica = p.tipo === 'multipla' ? 'Escolha uma ou mais' + (p.obrigatoria ? '' : ' · opcional')
               : p.tipo === 'unica' ? 'Escolha uma'
               : (p.obrigatoria ? '' : 'Opcional');

    let campo;
    if(p.tipo === 'numeros'){
      // Tela unica com os campos do modulo numerico.
      campo = telaNumeros(p, respostas[p.chave] || {}, valores => {
        respostas[p.chave] = valores;
        salvar();
        raiz.querySelector('.qz-erro').textContent = '';
        atualizarSeguir();
      });
    }else if(p.tipo === 'texto'){
      // Textarea que cresce: placeholder longo nao some cortado no celular.
      campo = h('textarea', {
        class:'qz-input', id:'qzCampo', 'aria-labelledby':'qzPergunta', rows:'1',
        placeholder:p.placeholder || '', autocomplete:'off', enterkeyhint: ultima ? 'done' : 'next'
      });
      campo.value = valor || '';
      const crescer = ()=>{
        campo.style.height = 'auto';
        const ph = campo.value ? 0 : campo.dataset.alturaPh || 0;
        const borda = campo.offsetHeight - campo.clientHeight;   // border-box
        campo.style.height = (Math.max(campo.scrollHeight, ph) + borda) + 'px';
      };
      requestAnimationFrame(()=>{
        // Altura minima para o placeholder inteiro caber.
        if(!campo.value && campo.placeholder){ campo.value = campo.placeholder; campo.style.height='auto';
          campo.dataset.alturaPh = campo.scrollHeight; campo.value = ''; }
        crescer();
      });
      campo.addEventListener('input', ()=>{
        crescer();
        respostas[p.chave] = campo.value; salvar();
        raiz.querySelector('.qz-erro').textContent = '';
        atualizarSeguir();
      });
      campo.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); seguir(); } });
    }else{
      const multipla = p.tipo === 'multipla';
      const marcadas = () => multipla ? (respostas[p.chave] || []) : [respostas[p.chave]];
      campo = h('div', { class:'qz-opcoes', role:'group', 'aria-labelledby':'qzPergunta' },
        (p.opcoes || []).map(op => h('button', {
          type:'button', class:'qz-opcao' + (marcadas().includes(op) ? ' on' : ''),
          'aria-pressed': marcadas().includes(op) ? 'true' : 'false',
          onclick: ()=>{
            if(multipla){
              let sel = [...(respostas[p.chave] || [])];
              if(sel.includes(op)) sel = sel.filter(x=>x!==op);
              else if(op === p.exclusiva) sel = [op];
              else sel = sel.filter(x=>x!==p.exclusiva).concat(op);
              // Mantem a ordem das opcoes no prompt.
              respostas[p.chave] = p.opcoes.filter(x=>sel.includes(x));
            }else{
              respostas[p.chave] = op;
            }
            salvar();
            campo.querySelectorAll('.qz-opcao').forEach((b,i)=>{
              const on = marcadas().includes(p.opcoes[i]);
              b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            raiz.querySelector('.qz-erro').textContent = '';
            atualizarSeguir();
            // Escolha unica avanca sozinha: um toque por tela.
            if(!multipla) setTimeout(seguir, 180);
          }
        }, op))
      );
    }

    const botaoSeguir = h('button', { type:'button', class:'btn btn-primario qz-seguir', onclick:seguir });
    function atualizarSeguir(){
      const rotulo = ultima ? T.finalizar : (!p.obrigatoria && vazio(respostas[p.chave])) ? T.pular : T.continuar;
      trocar(botaoSeguir, rotulo + ' ', h('span', { class:'seta' }, '→'));
    }
    atualizarSeguir();

    trocar(raiz, 
      h('div', { class:'qz-topo' },
        h('span', { class:'eyebrow' }, quiz.titulo || 'Quiz'),
        h('span', { class:'num' }, String(passo+1).padStart(2,'0') + ' / ' + String(total).padStart(2,'0'))
      ),
      h('div', { class:'qz-barra', role:'progressbar', 'aria-valuemin':'0', 'aria-valuemax':String(total),
                 'aria-valuenow':String(passo+1), 'aria-label':'Progresso' },
        h('i', { style:'width:' + ((passo+1)/total*100) + '%' })),
      titulo,
      dica ? h('p', { class:'qz-dica' }, dica) : null,
      campo,
      h('p', { class:'qz-erro', role:'alert' }),
      h('div', { class:'qz-nav' },
        passo > 0 ? h('button', { type:'button', class:'btn btn-fantasma qz-voltar', onclick:()=>irPara(passo-1) },
                      h('span', { class:'seta' }, '←'), ' ' + T.voltar) : h('span'),
        botaoSeguir
      )
    );

    if(focar){
      // Texto: foca o campo (abre o teclado). Opcoes: foca o titulo, sem pular a tela.
      const alvo = p.tipo === 'texto' ? campo : titulo;
      try{ alvo.focus({ preventScroll:true }); }catch(e){}
      const topo = raiz.getBoundingClientRect().top;
      if(topo < 0 || topo > window.innerHeight * .6) raiz.scrollIntoView({ block:'start', behavior:'smooth' });
    }
  }

  function desenharPrompt(prompt, focar, resultado){
    const aviso = h('p', { class:'qz-aviso', role:'status', 'aria-live':'polite' });
    const caixa = h('pre', { class:'qz-prompt', tabindex:'0', 'aria-label':'Prompt gerado' }, prompt);
    let timer = null;

    const copiar = h('button', { type:'button', class:'btn btn-primario qz-copiar', onclick: async ()=>{
      const ok = await copiarTexto(prompt);
      clearTimeout(timer);
      if(ok){
        aviso.textContent = T.avisoCopiado;
        aviso.classList.add('on');
        timer = setTimeout(()=>{ aviso.classList.remove('on'); aviso.textContent = ''; }, 3000);
      }else{
        selecionar(caixa);
        aviso.textContent = T.avisoManual;
        aviso.classList.add('on');
      }
      // Copiou (ou tentou e recebeu o texto selecionado): arma o pop-up.
      ctx.estado.juntar({ copiou:true });
      if(ctx.aoCopiar) ctx.aoCopiar();
    }}, T.botaoCopiar);

    trocar(raiz,
      // Resultado visual primeiro: o numero antes do texto do prompt.
      resultado ? h('div', { class:'qz-resultado' },
        h('span', { class:'eyebrow' }, 'Seu funil'),
        funilVisual(resultado)) : null,
      h('span', { class:'eyebrow' }, 'Prompt gerado'),
      h('h2', { id:'qzTituloPrompt', tabindex:'-1' }, T.tituloPrompt),
      copiar,
      aviso,
      caixa,
      h('p', { class:'qz-dica qz-dica-claude' }, T.dica),
      // Atalho para o proximo material, no mesmo cartao do prompt.
      ctx.proximo ? h('div', { class:'qz-proximo' },
        h('p', { class:'qz-proximo-rotulo' }, 'Próximo elo · pelo WhatsApp'),
        h('a', { class:'btn btn-fantasma qz-proximo-btn', href:ctx.proximo.href,
                 target:'_blank', rel:'noopener',
                 onclick: ctx.proximo.aoClicar || null },
          'Pedir ' + ctx.proximo.titulo + ' ',
          h('span', { class:'seta' }, '→'))
      ) : null,
      h('button', { type:'button', class:'btn btn-fantasma qz-refazer', onclick:()=>{
        ctx.estado.juntar({ prompt:null, concluido:false });
        irPara(0);
      }}, T.botaoRefazer)
    );
    // O pop-up conta o tempo a partir daqui: o prompt esta na tela.
    if(ctx.aoEntregarPrompt){ try{ ctx.aoEntregarPrompt(); }catch(e){} }

    if(focar){
      try{ raiz.querySelector('#qzTituloPrompt').focus({ preventScroll:true }); }catch(e){}
      raiz.scrollIntoView({ block:'start', behavior:'smooth' });
    }
  }

  // Volta exatamente onde parou: prompt pronto ou a pergunta em que estava.
  if(salvo.concluido){
    desenharPrompt(preencher(modelo, valoresPrompt(quiz, respostas)) || salvo.prompt, false, calcular());
  }else{
    desenharPergunta(false);
  }
}
