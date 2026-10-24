// Lógica do formulário: linhas dinâmicas, cálculos ao vivo, validação e geração do PDF.

const form = document.getElementById('form');

const INCLUSOS_PADRAO = [
  'Vistoria técnica para elaboração do projeto.',
  'Projeto do sistema fotovoltaico.',
  'Anotação de Responsabilidade Técnica - ART',
  'Homologação junto a concessionária elétrica.',
  'Instalação do sistema conforme o projeto (distância limite de 5 metros para ponto de conexão).',
  'Gestão, supervisão e fiscalização da instalação.',
  'Frete de todos equipamentos referentes ao sistema.',
  'Monitoramento técnico por 03 meses.',
];

const NAO_INCLUSOS_PADRAO = [
  'Alterações na rede de distribuição elétrica.',
  'Limpeza dos módulos fotovoltaicos, especialmente em períodos de seca. Este serviço garante a eficiência projetada.',
  'Qualquer outro item não descrito acima.',
];

// ---------- definição das linhas dinâmicas ----------

const LINHAS = {
  equipamentos: {
    campos: [
      { nome: 'qtd', rotulo: 'Qtd', ph: '182', obrigatorio: true },
      { nome: 'descricao', rotulo: 'Descrição', ph: 'Painéis OSDA 610 Wp', obrigatorio: true },
    ],
    nova: {},
    padrao: () => [
      { ph: { qtd: '2', descricao: 'Inversor FOX 37,5 kW' } },
      {},
    ],
  },
  condicoes: {
    campos: [
      { nome: 'titulo', rotulo: 'Condição', ph: 'À vista', obrigatorio: true },
      { nome: 'valor', rotulo: 'Valor (R$)', ph: '265.000,00', dinheiro: true, obrigatorio: true },
      { nome: 'detalhe', rotulo: 'Detalhe (opcional)', ph: 'Entrada + 60 parcelas' },
    ],
    nova: {},
    padrao: () => [{ titulo: 'À vista' }],
  },
};

function criarLinha(tipo, valores = {}) {
  const def = LINHAS[tipo];
  const linha = document.createElement('div');
  linha.className = 'linha';
  linha.dataset.tipo = tipo;

  for (const c of def.campos) {
    const label = document.createElement('label');
    label.textContent = c.rotulo;
    const campo = document.createElement('input');
    campo.autocomplete = 'off';
    campo.dataset.campo = c.nome;
    const ph = (valores.ph && valores.ph[c.nome]) || c.ph;
    if (ph) campo.placeholder = 'ex.: ' + ph;
    if (c.obrigatorio) campo.dataset.obrigatorio = c.rotulo;
    if (c.dinheiro) {
      campo.inputMode = 'decimal';
      campo.dataset.dinheiro = '';
    }
    if (valores[c.nome] != null) campo.value = valores[c.nome];
    label.appendChild(campo);
    linha.appendChild(label);
  }

  const remover = document.createElement('button');
  remover.type = 'button';
  remover.className = 'remover';
  remover.title = 'Remover linha';
  remover.setAttribute('aria-label', 'Remover linha');
  remover.textContent = '×';
  remover.addEventListener('click', () => {
    linha.remove();
    atualizarDicaPotencia();
    atualizarResumo();
  });
  linha.appendChild(remover);

  document.getElementById(tipo).appendChild(linha);
  return linha;
}

function lerLinhas(tipo) {
  return [...document.querySelectorAll(`#${tipo} .linha`)].map((linha) => {
    const obj = {};
    linha.querySelectorAll('[data-campo]').forEach((c) => { obj[c.dataset.campo] = c.value.trim(); });
    return obj;
  });
}

document.querySelectorAll('[data-add]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tipo = btn.dataset.add;
    criarLinha(tipo, LINHAS[tipo].nova).querySelector('input').focus();
  });
});

// ---------- números ----------

// Aceita "15.000", "111,02", "265.000,00", "R$ 149", "0.5"
function parseNumero(s) {
  s = String(s || '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

// formata campos de dinheiro ao sair deles
form.addEventListener('focusout', (e) => {
  if (!e.target.matches('[data-dinheiro]')) return;
  const v = parseNumero(e.target.value);
  if (!isNaN(v)) e.target.value = formatarNumero(v, 2);
});

// ---------- sugestão de potência a partir dos painéis ----------

function atualizarDicaPotencia() {
  const dica = document.getElementById('dicaPotencia');
  const painel = lerLinhas('equipamentos').find((e) => /\bW[pP]\b/.test(e.descricao));
  const qtd = painel && parseInt(painel.qtd, 10);
  const wp = painel && (painel.descricao.match(/(\d+(?:[.,]\d+)?)\s*W[pP]\b/) || [])[1];
  if (!qtd || !wp) { dica.hidden = true; return; }

  const kwp = Math.round(qtd * Number(wp.replace(',', '.'))) / 1000;
  const texto = formatarNumero(kwp, 2);
  const campo = form.elements.potencia;
  if (parseNumero(campo.value) === kwp) { dica.hidden = true; return; }

  dica.textContent = `${qtd} painéis × ${wp} Wp = ${texto} kWp. `;
  const usar = document.createElement('button');
  usar.type = 'button';
  usar.textContent = 'Usar como potência instalada';
  usar.addEventListener('click', () => {
    campo.value = texto;
    campo.classList.remove('invalido');
    dica.hidden = true;
    atualizarResumo();
  });
  dica.appendChild(usar);
  dica.hidden = false;
}

// ---------- coleta e validação ----------

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const linhasDeTexto = (t) => t.split('\n').map((l) => l.trim().replace(/^[-•]\s*/, '')).filter(Boolean);

function coletarDados({ marcarErros = true } = {}) {
  const f = form.elements;
  const erros = [];
  if (marcarErros) document.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  const marcar = (el, msg) => {
    if (marcarErros) el.classList.add('invalido');
    if (!erros.includes(msg)) erros.push(msg);
  };

  if (!f.cliente.value.trim()) marcar(f.cliente, 'Informe o nome do cliente.');
  if (!f.data.value) marcar(f.data, 'Informe a data da proposta.');

  const numero = (nome, msg, { opcional = false, minimo = 0, permiteZero = false } = {}) => {
    const campo = f[nome];
    if (opcional && !campo.value.trim()) return 0;
    const v = parseNumero(campo.value);
    if (isNaN(v) || v < minimo || (!permiteZero && v === 0)) marcar(campo, msg);
    return v;
  };

  const dados = {
    cliente: f.cliente.value.trim().replace(/\s+/g, ' '),
    data: f.data.value,
    estrutura: f.estrutura.value.trim(),
    observacao: f.observacao.value.trim(),
    potencia: numero('potencia', 'Informe a potência instalada (kWp).'),
    potenciaAmpliacao: numero('potenciaAmpliacao', 'Potência de ampliação inválida.', { opcional: true }),
    consumoMes: numero('consumoMes', 'Informe o consumo médio (kWh/mês).'),
    contaSem: numero('contaSem', 'Informe o valor da conta atual.'),
    contaCom: numero('contaCom', 'Informe o valor da conta com energia solar.', { permiteZero: true }),
    fatorGeracao: numero('fatorGeracao', 'Parâmetro “Geração por kWp” inválido.'),
    inflacao: numero('inflacao', 'Parâmetro “Inflação anual” inválido.', { permiteZero: true }),
    degradacao: numero('degradacao', 'Parâmetro “Perda de eficiência” inválido.', { permiteZero: true }),
    prazoAprovacao: numero('prazoAprovacao', 'Prazo de aprovação inválido.'),
    prazoVistoria: numero('prazoVistoria', 'Prazo de vistoria inválido.'),
    inclusos: linhasDeTexto(f.inclusos.value),
    naoInclusos: linhasDeTexto(f.naoInclusos.value),
    equipamentos: lerLinhas('equipamentos'),
    condicoes: lerLinhas('condicoes').map((c) => ({ ...c, valor: parseNumero(c.valor) })),
  };

  if (dados.contaCom >= dados.contaSem && dados.contaSem > 0) {
    marcar(f.contaCom, 'A conta com energia solar deve ser menor que a conta atual.');
  }

  for (const tipo of Object.keys(LINHAS)) {
    document.querySelectorAll(`#${tipo} [data-obrigatorio]`).forEach((c) => {
      if (!c.value.trim()) marcar(c, `Preencha o campo “${c.dataset.obrigatorio}” em todas as linhas.`);
    });
  }
  document.querySelectorAll('#condicoes [data-campo="valor"]').forEach((c) => {
    if (c.value.trim() && !(parseNumero(c.value) > 0)) marcar(c, 'Valor de pagamento inválido.');
  });
  if (!dados.equipamentos.length) erros.push('Adicione pelo menos um equipamento.');
  if (!dados.condicoes.length) erros.push('Adicione pelo menos uma condição de pagamento.');

  return { erros, dados };
}

// ---------- resumo ao vivo ----------

function atualizarResumo() {
  const box = document.getElementById('resumo');
  const { erros, dados } = coletarDados({ marcarErros: false });
  const pronto = dados.potencia > 0 && dados.fatorGeracao > 0 && dados.contaSem > 0 &&
    !isNaN(dados.contaCom) && dados.condicoes[0]?.valor > 0;
  if (!pronto) {
    box.innerHTML = '<span class="resumo-vazio">Preencha potência, conta de energia e valor para ver geração, economia, payback e ROI.</span>';
    return;
  }
  const c = calcular(dados);
  const itens = [
    ['Geração estimada', `${formatarNumero(c.geracaoMes)} kWh/mês`],
    ['Economia', `${formatarMoeda(c.economiaMes)}/mês (${c.economiaPct}%)`],
    ['Payback', textoPrazo(c.paybackMeses)],
    ['ROI em 30 anos', `${formatarNumero(c.roi, 1)} vezes`],
  ];
  box.innerHTML = '';
  for (const [rotulo, valor] of itens) {
    const div = document.createElement('div');
    const s = document.createElement('span'); s.textContent = rotulo;
    const b = document.createElement('strong'); b.textContent = valor;
    div.append(s, b);
    box.appendChild(div);
  }
  if (dados.consumoMes > 0 && c.geracaoMes < dados.consumoMes * 0.9) {
    const aviso = document.createElement('p');
    aviso.className = 'resumo-aviso';
    aviso.textContent = `Atenção: a geração estimada cobre ${Math.round((c.geracaoMes / dados.consumoMes) * 100)}% do consumo.`;
    box.appendChild(aviso);
  }
  return erros;
}

form.addEventListener('input', (e) => {
  e.target.classList.remove('invalido');
  if (e.target.closest('#equipamentos') || e.target.name === 'potencia') atualizarDicaPotencia();
  atualizarResumo();
});

// ---------- ações ----------

function mostrarErros(erros) {
  const box = document.getElementById('erros');
  if (!erros.length) { box.hidden = true; return false; }
  box.innerHTML = '<strong>Corrija os itens abaixo antes de gerar a proposta:</strong>';
  const ul = document.createElement('ul');
  for (const e of erros) {
    const li = document.createElement('li');
    li.textContent = e;
    ul.appendChild(li);
  }
  box.appendChild(ul);
  box.hidden = false;
  const primeiro = document.querySelector('.invalido');
  if (primeiro && primeiro.closest('details')) primeiro.closest('details').open = true;
  (primeiro || box).scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

function nomeArquivo(d) {
  const nome = d.cliente.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
  return `Proposta_Feitosa_Solar_${nome}.pdf`;
}

let urlPreview = null;

document.getElementById('btnPreview').addEventListener('click', () => {
  const { erros, dados } = coletarDados();
  if (mostrarErros(erros)) return;
  pdfMake.createPdf(montarProposta(dados)).getBlob((blob) => {
    if (urlPreview) URL.revokeObjectURL(urlPreview);
    urlPreview = URL.createObjectURL(blob);
    const box = document.getElementById('previewBox');
    document.getElementById('preview').src = urlPreview;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('btnFecharPreview').addEventListener('click', () => {
  document.getElementById('previewBox').hidden = true;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const { erros, dados } = coletarDados();
  if (mostrarErros(erros)) return;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  pdfMake.createPdf(montarProposta(dados)).download(nomeArquivo(dados), () => { btn.disabled = false; });
});

document.getElementById('btnLimpar').addEventListener('click', () => {
  if (confirm('Limpar todos os campos para uma nova proposta?')) iniciar();
});

function iniciar() {
  form.reset();
  for (const tipo of Object.keys(LINHAS)) {
    document.getElementById(tipo).innerHTML = '';
    LINHAS[tipo].padrao().forEach((v) => criarLinha(tipo, v));
  }
  form.elements.data.value = hojeISO();
  form.elements.inclusos.value = INCLUSOS_PADRAO.join('\n');
  form.elements.naoInclusos.value = NAO_INCLUSOS_PADRAO.join('\n');
  document.getElementById('erros').hidden = true;
  document.getElementById('previewBox').hidden = true;
  atualizarDicaPotencia();
  atualizarResumo();
}

iniciar();
