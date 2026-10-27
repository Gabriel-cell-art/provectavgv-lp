/* ============================================================
   INTERFACE DO MODULO NUMERICO — tela de campos e funil em barras.
   Separada de numeros.js (que nao toca em DOM) para que o calculo
   possa ser testado e reaproveitado pelo META sem arrastar interface.
   ============================================================ */
import { h } from './modelo.js';
import { ETAPAS, moeda, taxa, inteiro, numero, SEM_BASE } from './numeros.js';

const NAO_SEI = 'Não sei';

/** Mascara de moeda a partir dos digitos: 12345 -> 123,45 */
export function mascaraMoeda(v){
  const d = String(v).replace(/\D/g,'').slice(0,11);
  if(!d) return '';
  const n = Number(d) / 100;
  return n.toLocaleString('pt-BR',{ minimumFractionDigits:2, maximumFractionDigits:2 });
}

/** So digitos, para os campos de quantidade. */
function soDigitos(v){ return String(v).replace(/\D/g,'').slice(0,9); }

/**
 * Tela unica com os campos numericos. Cada campo tem o botao "Não sei".
 * `aoMudar(valores)` recebe o objeto completo a cada alteracao.
 */
export function telaNumeros(pergunta, valoresIniciais, aoMudar){
  const valores = Object.assign({}, valoresIniciais);
  const avisos = h('div', { class:'num-avisos', role:'status', 'aria-live':'polite' });

  // A ordem das etapas no aviso de sequencia segue o funil.
  const ordem = ETAPAS.map(e => e.chave);

  function revisarSequencia(){
    const fora = [];
    for(let i = 1; i < ordem.length; i++){
      const a = numero(valores[ordem[i-1]]), b = numero(valores[ordem[i]]);
      if(a !== null && b !== null && b > a){
        const rotA = ETAPAS[i-1].rotulo.toLowerCase(), rotB = ETAPAS[i].rotulo.toLowerCase();
        fora.push(rotB + ' (' + inteiro(b) + ') maior que ' + rotA + ' (' + inteiro(a) + ')');
      }
    }
    avisos.replaceChildren();
    if(fora.length){
      avisos.append(h('p', { class:'num-aviso' },
        'Confira o registro: ' + fora.join('; ') + '. Dá para seguir assim mesmo.'));
    }
  }

  const campos = (pergunta.campos || []).map(c => {
    const ehMoeda = c.formato === 'moeda';
    const id = 'num-' + c.chave;
    const naoSei = valores[c.chave] === NAO_SEI;

    const entrada = h('input', {
      id, class:'num-input', type:'text',
      inputmode: 'numeric', autocomplete:'off',
      placeholder: ehMoeda ? '0,00' : '0',
      value: naoSei ? '' : (valores[c.chave] || ''),
      disabled: naoSei
    });
    if(ehMoeda) entrada.setAttribute('aria-describedby', id + '-pre');

    entrada.addEventListener('input', () => {
      entrada.value = ehMoeda ? mascaraMoeda(entrada.value) : soDigitos(entrada.value);
      valores[c.chave] = entrada.value;
      revisarSequencia();
      aoMudar(valores);
    });

    const botao = h('button', {
      type:'button', class:'num-nao-sei' + (naoSei ? ' on' : ''),
      'aria-pressed': naoSei ? 'true' : 'false'
    }, NAO_SEI);

    botao.addEventListener('click', () => {
      const ligado = botao.getAttribute('aria-pressed') === 'true';
      const novo = !ligado;
      botao.setAttribute('aria-pressed', novo ? 'true' : 'false');
      botao.classList.toggle('on', novo);
      entrada.disabled = novo;
      if(novo){ entrada.value = ''; valores[c.chave] = NAO_SEI; }
      else { valores[c.chave] = ''; entrada.focus(); }
      revisarSequencia();
      aoMudar(valores);
    });

    return h('div', { class:'num-campo' },
      h('label', { for:id }, c.rotulo),
      h('div', { class:'num-linha' },
        ehMoeda ? h('span', { class:'num-prefixo', id:id + '-pre' }, 'R$') : null,
        entrada, botao)
    );
  });

  revisarSequencia();
  return h('div', { class:'num-tela' },
    pergunta.dica ? h('p', { class:'qz-dica' }, pergunta.dica) : null,
    h('div', { class:'num-grade' }, campos),
    avisos);
}

/* ---------------- funil em barras ---------------- */

const COR_TEXTO = {
  azul:'dentro da faixa', laranja:'ponto de atenção',
  roxo:'fora da faixa, do outro lado', cinza:'sem média', tracejado:'não informado'
};

/** Barras horizontais em CSS puro. Sem biblioteca de grafico. */
export function funilVisual(r){
  const base = r.linhas.find(l => l.informado && Number.isFinite(l.qtd));
  const maior = base ? Math.max(...r.linhas.filter(l => l.informado).map(l => l.qtd)) : 0;

  const barras = r.linhas.map(l => {
    const largura = (l.informado && maior > 0) ? Math.max((l.qtd / maior) * 100, 1.5) : 100;
    const t = l.taxaEtapa === SEM_BASE ? SEM_BASE
            : Number.isFinite(l.taxaEtapa) ? taxa(l.taxaEtapa) : null;
    const c = l.custo === SEM_BASE
            ? (l.chave === 'vendas' ? 'sem venda no período' : SEM_BASE)
            : Number.isFinite(l.custo) ? moeda(l.custo) : null;

    return h('li', { class:'fn-item' },
      h('div', { class:'fn-topo' },
        h('span', { class:'fn-rotulo' }, l.rotulo),
        h('span', { class:'fn-qtd' }, l.informado ? inteiro(l.qtd) : 'não informado')),
      h('div', { class:'fn-trilho' },
        h('div', { class:'fn-barra fn-' + l.cor, style:'width:' + largura.toFixed(1) + '%' })),
      h('div', { class:'fn-meta' },
        t ? h('span', null, 'taxa ' + t) : null,
        c ? h('span', null, 'custo ' + c) : null,
        l.alerta ? h('span', { class:'fn-alerta' }, l.alerta) : null,
        l.comparacao ? h('span', { class:'fn-' + l.cor + '-txt' }, l.comparacao.leitura) : null)
    );
  });

  const d = r.destaque;
  const destaque = h('div', { class:'fn-destaque' },
    h('p', null,
      'Seu lead custa ', h('b', null, Number.isFinite(d.lead) ? moeda(d.lead) : 'não informado'), '. ',
      d.fimRotulo
        ? h('span', null, 'Sua ' + d.fimRotulo + ' custa ',
            h('b', null, Number.isFinite(d.fim) ? moeda(d.fim) : 'não informado'), '.')
        : null));

  const notas = [];
  if(r.cego) notas.push('Seu funil está cego a partir daqui: ' + r.cego + '.');
  if(!r.ticket.dentro){
    notas.push(r.ticket.motivo === 'ignorado' ? r.avisos.ticketIgnorado : r.avisos.ticketFora);
  }
  if(r.regra.compara === 'taxas')   notas.push(r.avisos.canalMisto);
  if(r.regra.compara === 'nada')    notas.push(r.avisos.canalNaoAplica);
  if(r.regra.compara === 'entrada') notas.push(r.avisos.canalNaoAplica);
  notas.push(r.avisos.amostra);
  notas.push(r.avisos.cadeia);

  const legenda = ['azul','laranja','roxo','cinza','tracejado'].map(c =>
    h('span', { class:'fn-leg' }, h('i', { class:'fn-' + c }), COR_TEXTO[c]));

  return h('div', { class:'fn' },
    destaque,
    h('ul', { class:'fn-lista' }, barras),
    h('div', { class:'fn-legenda' }, legenda),
    h('div', { class:'fn-notas' }, notas.map(n => h('p', null, n)))
  );
}
