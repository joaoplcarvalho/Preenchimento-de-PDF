// Modelo da proposta comercial da Feitosa Solar em formato pdfmake.
// Para mudar dados fixos da empresa ou do responsável técnico, edite EMPRESA e RESPONSAVEL abaixo.

const EMPRESA = {
  nome: 'FEITOSA SOLAR',
  razaoSocial: 'FEITOSA SOLAR LTDA',
  cnpj: '33.250.767/0001-28',
  endereco: 'Área Rural de Pindobaçu, SN, Pindobaçu – BA, CEP 44772-899',
};

const RESPONSAVEL = {
  nome: 'LEVI GONÇALVES DOS SANTOS',
  cpf: '075.384.985-24',
  telefone: '(74) 98859-5561',
};

const COR = {
  marinho: '#0B2560',
  azul: '#1D4ED8',
  azulClaro: '#E3EBFB',
  amarelo: '#F2B705',
  amareloClaro: '#FFF4CC',
  cinza: '#A9B4C2',
  texto: '#222222',
};

// Variação da geração ao longo do ano (média = 1), conforme o perfil do modelo.
const PERFIL_MENSAL = (() => {
  const v = [16650, 14800, 16300, 13250, 12400, 11200, 12250, 14100, 16050, 16800, 16700, 16900];
  const media = v.reduce((a, b) => a + b, 0) / v.length;
  return v.map((x) => x / media);
})();
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ETAPAS_CRONOGRAMA = [
  { texto: 'Elaboração da Proposta' },
  { texto: 'Visita Técnica' },
  { texto: 'Assinatura do Contrato' },
  { texto: 'Envio do Projeto à Concessionária' },
  { texto: 'Instalação do Sistema' },
  { texto: '*Aprovação do Projeto pela Concessionária', concessionaria: true },
  { texto: 'Vistoria Técnica da Empresa' },
  { texto: '**Vistoria e Ligação do Projeto pela Concessionária', concessionaria: true },
  { texto: 'Instalação do App de Monitoramento' },
];

// ---------- formatação ----------

function formatarNumero(v, casas = 0) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function formatarMoeda(v) {
  return 'R$ ' + formatarNumero(v, 2);
}

function dataPorExtenso(iso) {
  const [a, m, d] = iso.split('-');
  return `${d} de ${MESES[Number(m) - 1]} de ${a}`;
}

function textoPrazo(meses) {
  if (meses == null) return 'acima de 50 anos';
  const anos = Math.floor(meses / 12), resto = meses % 12;
  const partes = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (resto) partes.push(`${resto} ${resto === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

// ---------- cálculos ----------

function calcular(d) {
  const geracaoMes = Math.round(d.potencia * d.fatorGeracao);
  const geracaoAmpliacaoMes = d.potenciaAmpliacao ? Math.round(d.potenciaAmpliacao * d.fatorGeracao) : 0;
  const economiaMes = d.contaSem - d.contaCom;
  const economiaAno = economiaMes * 12;
  const investimento = d.condicoes[0].valor;
  // a cada ano a conta sobe pela inflação e os módulos perdem um pouco de eficiência
  const crescimento = (1 + d.inflacao / 100) * (1 - d.degradacao / 100);

  // saldo acumulado mês a mês (payback)
  let saldo = -investimento, paybackMeses = null;
  const saldoMensal = [];
  for (let m = 1; m <= 600; m++) {
    saldo += economiaMes * Math.pow(crescimento, Math.floor((m - 1) / 12));
    saldoMensal.push(saldo);
    if (paybackMeses == null && saldo >= 0) paybackMeses = m;
  }

  // saldo acumulado ano a ano (ROI)
  const saldoAnual = [];
  let acumulado = -investimento;
  for (let a = 1; a <= 30; a++) {
    acumulado += economiaAno * Math.pow(crescimento, a - 1);
    saldoAnual.push(acumulado);
  }

  return {
    consumoAno: d.consumoMes * 12,
    geracaoMes,
    geracaoAno: geracaoMes * 12,
    geracaoAmpliacaoMes,
    geracaoAmpliacaoAno: geracaoAmpliacaoMes * 12,
    economiaMes,
    economiaAno,
    economiaPct: d.contaSem > 0 ? Math.round((economiaMes / d.contaSem) * 100) : 0,
    investimento,
    paybackMeses,
    saldoMensal,
    saldoAnual,
    economia5: saldoAnual[4],
    economia30: saldoAnual[29],
    roi: investimento > 0 ? saldoAnual[29] / investimento : 0,
  };
}

// ---------- gráfico de barras em SVG ----------

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escalaBonita(min, max) {
  const faixa = max - min || 1;
  const bruto = faixa / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / mag;
  const passo = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  return { min: Math.floor(min / passo) * passo, max: Math.ceil(max / passo) * passo, passo };
}

function graficoBarras({ titulo, rotulos, series, largura = 515, altura = 270, formatoY, tituloX, tituloY }) {
  const W = largura, H = altura;
  const legenda = series.length > 1;
  const m = { top: 32, right: 12, bottom: 26 + (legenda ? 20 : 0) + (tituloX ? 14 : 0), left: tituloY ? 74 : 62 };
  const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
  const valores = series.flatMap((s) => s.valores);
  const esc0 = escalaBonita(Math.min(0, ...valores), Math.max(0, ...valores));
  const y = (v) => m.top + ph - ((v - esc0.min) / (esc0.max - esc0.min)) * ph;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Roboto">`;
  s += `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="#FFFFFF" stroke="#D9DEE5"/>`;
  s += `<text x="${W / 2}" y="19" font-size="11" fill="#555555" text-anchor="middle">${esc(titulo)}</text>`;

  for (let v = esc0.min; v <= esc0.max + esc0.passo / 2; v += esc0.passo) {
    const yy = y(v).toFixed(1);
    s += `<line x1="${m.left}" y1="${yy}" x2="${W - m.right}" y2="${yy}" stroke="${Math.abs(v) < 1e-9 ? '#9AA5B1' : '#E3E7EC'}" stroke-width="0.7"/>`;
    s += `<text x="${m.left - 6}" y="${(+yy + 3).toFixed(1)}" font-size="7.5" fill="#666666" text-anchor="end">${esc(formatoY(v))}</text>`;
  }

  const n = rotulos.length;
  const banda = pw / n;
  const grupo = banda * (series.length > 1 ? 0.62 : 0.6);
  const bw = grupo / series.length;
  const passoRotulo = Math.ceil(n / 31);
  rotulos.forEach((r, i) => {
    series.forEach((ser, j) => {
      const v = ser.valores[i];
      const x = m.left + i * banda + (banda - grupo) / 2 + j * bw;
      const topo = y(Math.max(v, 0)), h = Math.abs(y(v) - y(0));
      s += `<rect x="${x.toFixed(2)}" y="${topo.toFixed(2)}" width="${(bw * 0.92).toFixed(2)}" height="${Math.max(h, 0.3).toFixed(2)}" fill="${ser.cor}"/>`;
    });
    if (i % passoRotulo === 0) {
      s += `<text x="${(m.left + (i + 0.5) * banda).toFixed(1)}" y="${m.top + ph + 13}" font-size="7.5" fill="#666666" text-anchor="middle">${esc(r)}</text>`;
    }
  });

  let base = m.top + ph + 13;
  if (tituloX) {
    base += 14;
    s += `<text x="${m.left + pw / 2}" y="${base}" font-size="8.5" fill="#666666" text-anchor="middle">${esc(tituloX)}</text>`;
  }
  if (tituloY) {
    const cy = m.top + ph / 2;
    s += `<text x="14" y="${cy}" font-size="8.5" fill="#666666" text-anchor="middle" transform="rotate(-90 14 ${cy})">${esc(tituloY)}</text>`;
  }
  if (legenda) {
    const larguras = series.map((ser) => 14 + ser.nome.length * 5.6 + 18);
    let x = W / 2 - larguras.reduce((a, b) => a + b, 0) / 2;
    const ly = base + 16;
    series.forEach((ser, j) => {
      s += `<rect x="${x.toFixed(1)}" y="${ly - 8}" width="9" height="9" fill="${ser.cor}"/>`;
      s += `<text x="${(x + 13).toFixed(1)}" y="${ly}" font-size="9" fill="#555555">${esc(ser.nome)}</text>`;
      x += larguras[j];
    });
  }
  return s + '</svg>';
}

// ---------- blocos de layout ----------

function cabecalho(titulo) {
  return {
    pageBreak: 'before',
    columns: [
      { image: 'logo', width: 115 },
      { text: titulo, style: 'tituloPagina', alignment: 'center', margin: [0, 16, 0, 0] },
      { width: 30, text: '' },
    ],
    margin: [0, 0, 0, 34],
  };
}

const layoutCaixa = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 3),
  vLineWidth: () => 0,
  hLineColor: () => '#FFFFFF',
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

// Caixa no estilo do modelo: faixa de título + linhas de valor
function caixa(titulo, valores, { grande = false } = {}) {
  return {
    table: {
      widths: ['*'],
      body: [
        [{ text: titulo, fillColor: COR.azul, color: 'white', alignment: 'center', fontSize: 10, margin: [0, 7, 0, 7] }],
        ...valores.map((v) => [{
          text: v, fillColor: COR.azulClaro, color: COR.marinho, bold: true, alignment: 'center',
          fontSize: grande ? 17 : 13, margin: [0, grande ? 12 : 8, 0, grande ? 12 : 8],
        }]),
      ],
    },
    layout: layoutCaixa,
  };
}

function centralizar(no, largura) {
  return { columns: [{ width: '*', text: '' }, { width: largura, stack: [no] }, { width: '*', text: '' }] };
}

function lado(a, b, largura = 190) {
  if (!b) return centralizar(a, largura);
  return {
    columns: [
      { width: '*', text: '' }, { width: largura, stack: [a] },
      { width: 60, text: '' }, { width: largura, stack: [b] },
      { width: '*', text: '' },
    ],
  };
}

function nota(texto) {
  return { text: texto, fontSize: 8.5, color: '#444444', margin: [0, 14, 0, 0] };
}

function condicaoPrincipal(d) {
  return {
    stack: [
      { text: 'Condição de pagamento', bold: true, fontSize: 10 },
      { text: d.condicoes[0].titulo.toLocaleUpperCase('pt-BR'), bold: true, fontSize: 10 },
    ],
    alignment: 'center',
    margin: [0, 0, 0, 40],
  };
}

// ---------- páginas ----------

function paginaCapa(d) {
  return [
    { image: 'logo', width: 420, alignment: 'center', margin: [0, 30, 0, 26] },
    { text: [{ text: 'Proposta ' }, { text: 'Comercial', bold: true }], fontSize: 28, color: '#333333', alignment: 'right' },
    { text: 'Sistema Solar Fotovoltaico', fontSize: 14, color: COR.azul, alignment: 'right', margin: [0, 2, 0, 14] },
    { text: d.cliente.toLocaleUpperCase('pt-BR'), bold: true, fontSize: 12, color: '#333333', alignment: 'right' },
    { text: dataPorExtenso(d.data), fontSize: 9.5, color: '#666666', alignment: 'right', margin: [0, 3, 0, 0] },
    { image: 'paineis', width: 515, absolutePosition: { x: 40, y: 430 } },
  ];
}

function paginaCronograma(d) {
  // pdfmake altera os nós ao montar o PDF, então cada seta precisa ser um objeto novo
  const seta = () => centralizar({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="18" viewBox="0 0 230 18"><polygon points="108,0 122,0 122,8 130,8 115,18 100,8 108,8" fill="${COR.cinza}"/></svg>`,
    width: 230,
    margin: [0, 4, 0, 4],
  }, 230);

  const blocos = [];
  ETAPAS_CRONOGRAMA.forEach((e, i) => {
    if (i) blocos.push(seta());
    blocos.push(centralizar({
      table: {
        widths: ['*'],
        body: [[{
          text: e.texto, color: 'white', fontSize: 12, alignment: 'center',
          fillColor: e.concessionaria ? COR.amarelo : COR.azul, margin: [6, 9, 6, 9],
        }]],
      },
      layout: 'noBorders',
    }, 230));
  });

  return [
    cabecalho('CRONOGRAMA'),
    ...blocos,
    nota(`* Prazo médio da concessionária de ${d.prazoAprovacao} dias úteis.`),
    { text: `** Prazo médio da concessionária de ${d.prazoVistoria} dias úteis.`, fontSize: 8.5, color: '#444444', margin: [0, 3, 0, 0] },
    { text: 'Considerando que não possua nenhum débito no CPF.', fontSize: 8.5, color: '#444444', margin: [0, 10, 0, 0] },
  ];
}

function paginaConsumoGeracao(d, c) {
  const amp = d.potenciaAmpliacao > 0;
  const kwh = (v) => `${formatarNumero(v)} kWh`;
  return [
    cabecalho('CONSUMO x GERAÇÃO DE ENERGIA'),
    centralizar(caixa('Consumo - médio', [`${kwh(d.consumoMes)}/mês`, `${kwh(c.consumoAno)}/ano`]), 210),
    { text: '', margin: [0, 0, 0, 16] },
    lado(
      caixa('Potência do Sistema\n(instalada)', [`${formatarNumero(d.potencia, 2)} kWp`]),
      amp && caixa('Potência do Sistema\n(ampliação máxima)', [`${formatarNumero(d.potenciaAmpliacao, 2)} kWp`]),
    ),
    { text: '', margin: [0, 0, 0, 14] },
    lado(
      caixa('Estimativa de Geração\n(instalada)', [`${kwh(c.geracaoMes)}/mês`, `${kwh(c.geracaoAno)}/ano`]),
      amp && caixa('Estimativa de Geração\n(ampliação máxima)', [`${kwh(c.geracaoAmpliacaoMes)}/mês`, `${kwh(c.geracaoAmpliacaoAno)}/ano`]),
    ),
    { text: 'Este projeto tem uma estimativa de geração de energia mensal, em média*, conforme apresentado no gráfico a seguir.', alignment: 'justify', margin: [0, 22, 0, 12] },
    {
      svg: graficoBarras({
        titulo: 'Consumo x Geração (anual)',
        rotulos: MESES_CURTOS,
        series: [
          { nome: 'Consumo', cor: COR.amarelo, valores: MESES_CURTOS.map(() => d.consumoMes) },
          { nome: 'Geração', cor: COR.azul, valores: PERFIL_MENSAL.map((f) => c.geracaoMes * f) },
        ],
        formatoY: (v) => (v === 0 ? '-' : formatarNumero(v)),
        altura: 255,
      }),
      width: 515,
    },
    nota('* Os valores apresentados no gráfico podem sofrer variação, para mais ou para menos, em função de mudança no tempo.'),
  ];
}

function paginaValores(d) {
  const caixas = d.condicoes.map((cond) => {
    const no = caixa(cond.titulo.toLocaleUpperCase('pt-BR'), [formatarMoeda(cond.valor)], { grande: true });
    if (cond.detalhe) {
      no.table.body.push([{ text: cond.detalhe, fillColor: COR.azulClaro, alignment: 'center', fontSize: 9.5, color: '#333333', margin: [0, 0, 0, 10] }]);
    }
    return no;
  });
  const linhas = [];
  for (let i = 0; i < caixas.length; i += 2) {
    linhas.push(lado(caixas[i], caixas[i + 1], 210));
    linhas.push({ text: '', margin: [0, 0, 0, 22] });
  }
  return [
    cabecalho('VALORES E CONDIÇÕES DE PAGAMENTO'),
    { text: '', margin: [0, caixas.length > 2 ? 40 : 170, 0, 0] },
    ...linhas,
  ];
}

function paginaItens(d) {
  const linhaItem = (qtd, texto) => ({
    columns: [
      { width: 34, text: qtd, bold: true, alignment: 'right' },
      { width: '*', text: texto, bold: true },
    ],
    columnGap: 8,
    fontSize: 11,
    margin: [0, 0, 0, 12],
  });
  const lista = (itens, negrito) => itens.map((t) => ({ text: `- ${t}`, bold: negrito, fontSize: 10, margin: [42, 0, 0, 11] }));

  return [
    cabecalho('ITENS DA PROPOSTA'),
    ...d.equipamentos.map((e) => linhaItem(e.qtd, e.descricao)),
    d.estrutura ? linhaItem('', `Estrutura: ${d.estrutura}`) : '',
    d.observacao ? { text: d.observacao, bold: true, fontSize: 10, margin: [42, 8, 0, 14] } : { text: '', margin: [0, 6, 0, 0] },
    ...lista(d.inclusos, true),
    d.naoInclusos.length ? { text: 'Não estão inclusos nesta proposta', fontSize: 13, bold: true, margin: [42, 40, 0, 12] } : '',
    ...lista(d.naoInclusos, false),
  ];
}

function paginaConta(d, c) {
  const cabec = (t) => ({ text: t, bold: true, fillColor: COR.azul, color: 'white', alignment: 'center', margin: [0, 8, 0, 8] });
  const rot = (t) => ({ text: t, bold: true, fillColor: COR.azulClaro, color: COR.marinho, alignment: 'center', fontSize: 12, margin: [0, 7, 0, 7] });
  const val = (t) => ({ text: t, bold: true, fillColor: COR.azulClaro, color: COR.marinho, alignment: 'right', fontSize: 12, margin: [0, 7, 4, 7] });
  const vazio = { text: '', border: [false, false, false, false] };
  const tabela = {
    table: {
      widths: [60, 10, 112, 10, 112, 10, 112, 44],
      body: [
        [vazio, vazio, cabec('Sem energia solar'), vazio, cabec('Com energia solar'), vazio, { ...cabec('Economia'), colSpan: 2 }, {}],
        [rot('Mês'), vazio, val(formatarMoeda(d.contaSem)), vazio, val(formatarMoeda(d.contaCom)), vazio, val(formatarMoeda(c.economiaMes)),
          { text: `${c.economiaPct}%`, rowSpan: 2, bold: true, fontSize: 14, fillColor: COR.azulClaro, color: COR.marinho, alignment: 'center', margin: [0, 20, 0, 0] }],
        [rot('Ano'), vazio, val(formatarMoeda(d.contaSem * 12)), vazio, val(formatarMoeda(d.contaCom * 12)), vazio, val(formatarMoeda(c.economiaAno)), {}],
      ],
    },
    layout: {
      hLineWidth: (i) => (i === 2 ? 2 : 0), hLineColor: () => '#FFFFFF',
      vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
  };
  return [
    cabecalho('VALOR DA CONTA DE ENERGIA'),
    tabela,
    { text: '', margin: [0, 0, 0, 70] },
    {
      svg: graficoBarras({
        titulo: 'Valor da Conta de Energia nos próximos 12 meses',
        rotulos: Array.from({ length: 12 }, (_, i) => String(i + 1)),
        series: [
          { nome: 'Sem energia solar', cor: COR.amarelo, valores: Array(12).fill(d.contaSem) },
          { nome: 'Com energia solar', cor: COR.azul, valores: Array(12).fill(d.contaCom) },
        ],
        formatoY: (v) => formatarMoeda(v),
        altura: 290,
      }),
      width: 515,
    },
    nota('* Os valores apresentados no gráfico podem sofrer variação de acordo com impostos, reajustes da concessionária de energia, parcelamentos já existentes com a concessionária ou outros valores inerentes ao projeto.'),
  ];
}

function notaPremissas(d) {
  const deg = d.degradacao > 0 ? ` e perda de eficiência dos módulos de ${formatarNumero(d.degradacao, 1)}% ao ano` : '';
  return nota(`* Considerou-se uma inflação anual da conta de energia elétrica no valor de ${formatarNumero(d.inflacao, 1).replace(/,0$/, '')}%${deg}.`);
}

function paginaPayback(d, c) {
  const n = c.paybackMeses ? Math.min(Math.max(30, c.paybackMeses + 12), 120) : 30;
  return [
    cabecalho('PAYBACK (TEMPO DE RETORNO)'),
    condicaoPrincipal(d),
    lado(caixa('Valor do Sistema', [formatarMoeda(c.investimento)]), caixa('Payback (tempo de retorno)', [textoPrazo(c.paybackMeses)]), 200),
    { text: '', margin: [0, 0, 0, 60] },
    {
      svg: graficoBarras({
        titulo: 'Payback',
        rotulos: Array.from({ length: n }, (_, i) => String(i + 1)),
        series: [{ nome: 'Saldo', cor: '#17608A', valores: c.saldoMensal.slice(0, n) }],
        formatoY: (v) => (v === 0 ? '-' : formatarNumero(v, 2)),
        tituloX: 'Mês', tituloY: 'ROI',
        altura: 330,
      }),
      width: 515,
    },
    notaPremissas(d),
  ];
}

function paginaRoi(d, c) {
  return [
    cabecalho('ROI - RETORNO SOBRE O INVESTIMENTO'),
    condicaoPrincipal(d),
    centralizar(caixa('ROI - Retorno Sobre o Investimento', [`${formatarNumero(c.roi, 1)} vezes`]), 210),
    { text: '', margin: [0, 0, 0, 14] },
    lado(caixa('Economia total em 5 anos', [formatarMoeda(c.economia5)]), caixa('Economia total em 30 anos', [formatarMoeda(c.economia30)]), 200),
    { text: '', margin: [0, 0, 0, 40] },
    {
      svg: graficoBarras({
        titulo: 'ROI - Retorno Sobre o Investimento',
        rotulos: Array.from({ length: 30 }, (_, i) => String(i + 1)),
        series: [{ nome: 'Saldo', cor: '#17608A', valores: c.saldoAnual }],
        formatoY: (v) => (v === 0 ? '-' : formatarNumero(v, 2)),
        tituloX: 'Ano', tituloY: 'ROI',
        altura: 330,
      }),
      width: 515,
    },
    notaPremissas(d),
  ];
}

function paginaFinal() {
  return [
    { image: 'logo', width: 360, alignment: 'center', margin: [0, 80, 0, 0], pageBreak: 'before' },
    {
      stack: [
        { text: RESPONSAVEL.nome, bold: true, fontSize: 11 },
        { text: `CPF: ${RESPONSAVEL.cpf}`, bold: true },
        { text: 'Responsável Técnico', margin: [0, 2, 0, 0] },
        { text: `Tel: ${RESPONSAVEL.telefone}`, margin: [0, 2, 0, 0] },
      ],
      alignment: 'center',
      lineHeight: 1.3,
      absolutePosition: { x: 40, y: 500 },
    },
    {
      stack: [
        { text: EMPRESA.razaoSocial, bold: true },
        `CNPJ: ${EMPRESA.cnpj}`,
        EMPRESA.endereco,
      ],
      alignment: 'center',
      fontSize: 9.5,
      lineHeight: 1.3,
      absolutePosition: { x: 40, y: 740 },
    },
  ];
}

// ---------- documento ----------

function montarProposta(d) {
  const c = calcular(d);
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    // imagens declaradas uma vez e referenciadas pelo nome: a logo aparece em 9 páginas mas é gravada só uma vez no PDF
    images: { logo: IMAGENS.logo, paineis: IMAGENS.paineis },
    info: { title: `Proposta Comercial — ${d.cliente}`, author: EMPRESA.razaoSocial },
    content: [
      ...paginaCapa(d),
      ...paginaCronograma(d),
      ...paginaConsumoGeracao(d, c),
      ...paginaValores(d),
      ...paginaItens(d),
      ...paginaConta(d, c),
      ...paginaPayback(d, c),
      ...paginaRoi(d, c),
      ...paginaFinal(),
    ],
    styles: {
      tituloPagina: { fontSize: 16, bold: true, color: COR.marinho },
    },
    // sem ligaduras: evita que "fi" vire "f" ao copiar/pesquisar o texto do PDF
    defaultStyle: { fontSize: 10, lineHeight: 1.15, color: COR.texto, fontFeatures: { liga: false } },
  };
}
