/* ============================================================
   MODULO NUMERICO — reutilizavel.
   FUNIL usa calcularFunil(): dos numeros informados para taxas,
   custos e comparacao. META vai usar calcularReverso(): da meta de
   vendas para os leads necessarios, com as mesmas taxas e os mesmos
   formatadores. Nada aqui depende de DOM.
   ============================================================ */

/** Ordem do funil. Cada etapa aponta a anterior, de onde sai a taxa. */
export const ETAPAS = [
  { chave:'leads', singular:'lead',              rotulo:'Leads',              anterior:null,
    metricaCusto:'custo_lead' },
  { chave:'responderam', singular:'resposta',        rotulo:'Responderam',        anterior:'leads' },
  { chave:'qualificados', singular:'qualificado',       rotulo:'Qualificados',       anterior:'responderam',
    metricaCusto:'custo_qualificado', metricaTaxaSobreLeads:'pct_qualificados' },
  { chave:'visitas_agendadas', singular:'visita agendada',  rotulo:'Visitas agendadas',  anterior:'qualificados' },
  { chave:'visitas_realizadas', singular:'visita realizada', rotulo:'Visitas realizadas', anterior:'visitas_agendadas' },
  { chave:'propostas', singular:'proposta',          rotulo:'Propostas',          anterior:'visitas_realizadas' },
  { chave:'vendas', singular:'venda',             rotulo:'Vendas',             anterior:'propostas',
    metricaCusto:'midia_venda', metricaTaxaSobreLeads:'lead_venda' }
];

export const NAO_INFORMADO = 'não informado';
export const SEM_BASE      = 'sem base';
export const AVISO_CEGO    = 'Seu funil está cego a partir daqui.';

/* ---------------- formatadores ---------------- */

export function moeda(v){
  if(!Number.isFinite(v)) return NAO_INFORMADO;
  return v.toLocaleString('pt-BR',{ style:'currency', currency:'BRL',
    minimumFractionDigits:2, maximumFractionDigits:2 });
}
export function taxa(v){
  if(!Number.isFinite(v)) return NAO_INFORMADO;
  return v.toLocaleString('pt-BR',{ minimumFractionDigits:1, maximumFractionDigits:1 }) + '%';
}
export function inteiro(v){
  if(!Number.isFinite(v)) return NAO_INFORMADO;
  return v.toLocaleString('pt-BR');
}

/** Numero valido? "Não sei", vazio e null viram null. */
export function numero(v){
  if(v === null || v === undefined || v === '' || v === 'Não sei') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n) ? n : null;
}

/* ---------------- canal ---------------- */

/** Como o canal informado afeta a comparacao com a media. */
export function regraCanal(canal){
  const c = String(canal || '').toLowerCase();
  if(c.includes('whats'))     return { id:'whatsapp',   entrada:'Conversas iniciadas', metricaEntrada:'custo_conversa', compara:'entrada' };
  if(c.includes('os dois'))   return { id:'ambos',      entrada:'Leads', metricaEntrada:null, compara:'taxas' };
  if(c.includes('outro'))     return { id:'outro',      entrada:'Leads', metricaEntrada:null, compara:'nada' };
  return                             { id:'formulario', entrada:'Leads', metricaEntrada:'custo_lead', compara:'tudo' };
}

/** A faixa de preco cai dentro do ticket de referencia? */
export function dentroDoTicket(faixaPreco, ref){
  const f = String(faixaPreco || '');
  if(!f || /não sei/i.test(f)) return { dentro:false, motivo:'ignorado' };
  // As faixas do quiz foram desenhadas nas bordas do ticket de referencia.
  if(/até r\$250/i.test(f) || /acima de r\$1,6/i.test(f)) return { dentro:false, motivo:'fora' };
  return { dentro:true, motivo:null };
}

/* ---------------- comparacao com a media ---------------- */

/**
 * Compara um valor com uma metrica de referencia.
 * custo: acima da faixa = atencao. taxa: abaixo da faixa = atencao.
 * Retorna cor: 'azul' (dentro), 'laranja' (atencao), 'roxo' (lado oposto).
 */
export function compararComReferencia(valor, metrica, tolerancia){
  if(!Number.isFinite(valor) || !metrica) return null;
  let min, max;
  if(Number.isFinite(metrica.cerca)){
    const t = Number.isFinite(tolerancia) ? tolerancia : 0.15;
    min = metrica.cerca * (1 - t); max = metrica.cerca * (1 + t);
  }else{ min = metrica.min; max = metrica.max; }
  if(!Number.isFinite(min) || !Number.isFinite(max)) return null;

  if(valor >= min && valor <= max) return { cor:'azul', leitura:'dentro da faixa', min, max };
  const acima = valor > max;
  const atencao = metrica.tipo === 'custo' ? acima : !acima;
  return {
    cor: atencao ? 'laranja' : 'roxo',
    leitura: acima ? 'acima da média Provecta' : 'abaixo da média Provecta',
    min, max
  };
}

/* ---------------- calculo do funil ---------------- */

/**
 * @param {object} p.numeros      valores crus do formulario
 * @param {object} p.referencias  content/referencias.json
 * @param {string} p.canal        resposta do quiz
 * @param {string} p.faixaPreco   resposta do quiz
 */
export function calcularFunil({ numeros, referencias, canal, faixaPreco }){
  const ref  = referencias || { metricas:{}, semMedia:[] };
  const regra = regraCanal(canal);
  const ticket = dentroDoTicket(faixaPreco, ref);
  const investimento = numero(numeros.investimento);

  const valor = {};
  ETAPAS.forEach(e => { valor[e.chave] = numero(numeros[e.chave]); });

  const linhas = [];
  let cego = null;

  ETAPAS.forEach(e => {
    const qtd = valor[e.chave];
    const informado = qtd !== null;
    if(!informado && !cego) cego = e.rotulo;

    const ant = e.anterior ? valor[e.anterior] : null;
    let taxaEtapa = null, alerta = null;
    if(informado && e.anterior){
      if(ant === null) taxaEtapa = null;
      else if(ant === 0) taxaEtapa = SEM_BASE;
      else {
        taxaEtapa = (qtd / ant) * 100;
        if(qtd > ant) alerta = 'verificar registro';
      }
    }

    let custo = null;
    if(informado && Number.isFinite(investimento)){
      custo = qtd === 0 ? SEM_BASE : investimento / qtd;
    }

    // Comparacao: so nas etapas que tem media, e so se o canal permitir.
    let comparacao = null, cor = informado ? 'cinza' : 'tracejado';
    const temMedia = !ref.semMedia.includes(e.chave);
    const canalPermite =
      regra.compara === 'tudo' ||
      (regra.compara === 'entrada' && e.chave === 'leads') ||
      (regra.compara === 'taxas' && e.chave !== 'leads');

    if(informado && temMedia && canalPermite && ticket.dentro){
      const nomeMetrica = (e.chave === 'leads' && regra.metricaEntrada) ? regra.metricaEntrada : e.metricaCusto;
      const m = ref.metricas[nomeMetrica];
      if(m && Number.isFinite(custo)){
        comparacao = compararComReferencia(custo, m, ref.toleranciaCerca);
        if(comparacao) cor = comparacao.cor;
      }
    }

    linhas.push({ ...e, qtd, informado, taxaEtapa, custo, cor, alerta, comparacao,
                  rotulo: (e.chave === 'leads' ? regra.entrada : e.rotulo) });
  });

  // Taxas que atravessam o funil (nunca multiplicadas em cadeia).
  const atalho = (a, b) => {
    const x = valor[a], y = valor[b];
    if(x === null || y === null) return null;
    if(x === 0) return SEM_BASE;
    return (y / x) * 100;
  };
  const travessias = [
    { chave:'pct_qualificados',  rotulo:'Qualificados ÷ leads',    valor:atalho('leads','qualificados') },
    { chave:'lead_venda',        rotulo:'Vendas ÷ leads',          valor:atalho('leads','vendas') },
    { chave:'qualificado_venda', rotulo:'Vendas ÷ qualificados',   valor:atalho('qualificados','vendas') }
  ].map(t => {
    const m = ref.metricas[t.chave];
    const comparavel = ticket.dentro && (regra.compara === 'tudo' || regra.compara === 'taxas');
    const comparacao = (comparavel && Number.isFinite(t.valor))
      ? compararComReferencia(t.valor, m, ref.toleranciaCerca) : null;
    return { ...t, comparacao, cor: comparacao ? comparacao.cor : 'cinza' };
  });

  const leadsPorVenda = (valor.leads !== null && valor.vendas)
    ? valor.leads / valor.vendas : null;

  // Destaque: custo do lead e custo da venda (ou da ultima etapa informada).
  const linhaLead   = linhas.find(l => l.chave === 'leads');
  const ultimaInfo  = [...linhas].reverse().find(l => l.informado && Number.isFinite(l.custo));
  const linhaVenda  = linhas.find(l => l.chave === 'vendas');
  const destaque = {
    lead:  linhaLead && Number.isFinite(linhaLead.custo) ? linhaLead.custo : null,
    fim:   (linhaVenda && Number.isFinite(linhaVenda.custo)) ? linhaVenda.custo
           : (ultimaInfo && ultimaInfo.chave !== 'leads' ? ultimaInfo.custo : null),
    fimRotulo: (linhaVenda && Number.isFinite(linhaVenda.custo)) ? 'venda'
               : (ultimaInfo && ultimaInfo.chave !== 'leads' ? ultimaInfo.rotulo.toLowerCase() : null)
  };

  return { linhas, travessias, investimento, leadsPorVenda, destaque,
           regra, ticket, cego, avisos: ref.avisos || {} };
}

/* ---------------- textos para o prompt ---------------- */

export function textoNumeros(r){
  const l = ['- Investimento em mídia: ' + (Number.isFinite(r.investimento) ? moeda(r.investimento) : NAO_INFORMADO)];
  r.linhas.forEach(x => l.push('- ' + x.rotulo + ': ' + (x.informado ? inteiro(x.qtd) : NAO_INFORMADO)));
  return l.join('\n');
}

export function textoCalculos(r){
  const l = [];
  r.linhas.forEach(x => {
    if(!x.anterior) return;
    const t = x.taxaEtapa === SEM_BASE ? SEM_BASE
            : Number.isFinite(x.taxaEtapa) ? taxa(x.taxaEtapa) : 'não calculável';
    l.push('- ' + x.rotulo + ' ÷ etapa anterior: ' + t + (x.alerta ? ' (' + x.alerta + ')' : ''));
  });
  r.travessias.forEach(t => {
    const v = t.valor === SEM_BASE ? SEM_BASE
            : Number.isFinite(t.valor) ? taxa(t.valor) : 'não calculável';
    l.push('- ' + t.rotulo + ': ' + v);
  });
  r.linhas.forEach(x => {
    const c = x.custo === SEM_BASE
      ? (x.chave === 'vendas' ? 'sem venda no período' : SEM_BASE)
      : Number.isFinite(x.custo) ? moeda(x.custo) : 'não calculável';
    l.push('- Custo por ' + (x.singular || x.rotulo.toLowerCase()) + ': ' + c);
  });
  l.push('- Leads por venda: ' + (Number.isFinite(r.leadsPorVenda)
        ? r.leadsPorVenda.toLocaleString('pt-BR',{maximumFractionDigits:1}) : 'não calculável'));
  if(r.cego) l.push('- ' + AVISO_CEGO + ' Primeira etapa não informada: ' + r.cego + '.');
  return l.join('\n');
}

export function textoComparacao(r){
  const l = [];
  if(r.regra.compara === 'nada'){
    l.push('- ' + r.avisos.canalNaoAplica);
  }else{
    if(r.regra.compara === 'entrada') l.push('- ' + r.avisos.canalNaoAplica + ' (compara só o custo por conversa)');
    if(r.regra.compara === 'taxas')   l.push('- ' + r.avisos.canalMisto);
    if(!r.ticket.dentro){
      l.push('- ' + (r.ticket.motivo === 'ignorado' ? r.avisos.ticketIgnorado : r.avisos.ticketFora));
    }
    r.linhas.forEach(x => {
      if(!x.comparacao) return;
      l.push('- Custo por ' + (x.singular || x.rotulo.toLowerCase()) + ': ' + x.comparacao.leitura);
    });
    r.travessias.forEach(t => {
      if(!t.comparacao) return;
      l.push('- ' + t.rotulo + ': ' + t.comparacao.leitura);
    });
  }
  l.push('- ' + r.avisos.amostra);
  l.push('- ' + r.avisos.cadeia);
  return l.join('\n');
}

/* ---------------- META: o mesmo calculo ao contrario ---------------- */

/**
 * Da meta de vendas de volta ao topo do funil. Usa as mesmas taxas que
 * calcularFunil produz (ou as da referencia, quando a operacao nao tem
 * numero proprio). Nao multiplica taxas em cadeia: cada etapa e derivada
 * da taxa que liga aquela etapa diretamente a venda.
 */
export function calcularReverso({ vendasAlvo, taxas, referencias }){
  const ref = referencias || { metricas:{} };
  const alvo = numero(vendasAlvo);
  if(!Number.isFinite(alvo) || alvo <= 0) return null;

  const pct = (propria, chaveRef) => {
    if(Number.isFinite(propria)) return { valor:propria, origem:'própria' };
    const m = ref.metricas[chaveRef];
    if(!m) return null;
    const v = Number.isFinite(m.cerca) ? m.cerca : (m.min + m.max) / 2;
    return { valor:v, origem:'média Provecta' };
  };

  const leadVenda       = pct(taxas && taxas.lead_venda,        'lead_venda');
  const qualificadoVenda = pct(taxas && taxas.qualificado_venda, 'qualificado_venda');

  return {
    vendasAlvo: alvo,
    leads:        leadVenda        ? { qtd: Math.ceil(alvo / (leadVenda.valor/100)),        origem:leadVenda.origem } : null,
    qualificados: qualificadoVenda ? { qtd: Math.ceil(alvo / (qualificadoVenda.valor/100)), origem:qualificadoVenda.origem } : null
  };
}
