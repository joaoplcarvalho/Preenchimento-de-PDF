// Lógica do formulário: linhas dinâmicas, máscaras, validação e geração do PDF.

const form = document.getElementById('form');
const CHAVE_ULTIMO_NUMERO = 'feitosa.ultimoContrato';

// ---------- definição das linhas dinâmicas ----------

const LINHAS = {
  equipamentos: {
    campos: [
      { nome: 'qtd', rotulo: 'Qtd', ph: '64' },
      { nome: 'item', rotulo: 'Item', ph: 'Módulo Fotovoltaico', obrigatorio: true },
      { nome: 'espec', rotulo: 'Especificação', ph: 'Painel Bifacial LEAPTON — 620 Wp', obrigatorio: true },
    ],
    nova: {},
    padrao: () => [
      { item: 'Módulo Fotovoltaico' },
      { qtd: '01', item: 'Inversor', ph: { espec: 'SUNGROW GW30K — 30 kW | Trifásico | 3 MPPT' } },
      { qtd: '—', item: 'Materiais Elétricos', espec: 'Cabos, conectores, proteções e demais componentes' },
    ],
  },
  unidades: {
    campos: [
      { nome: 'tipo', rotulo: 'Tipo', opcoes: ['Geradora', 'Beneficiária'] },
      { nome: 'cidade', rotulo: 'Cidade', ph: 'Miguel Calmon – BA', obrigatorio: true },
      { nome: 'endereco', rotulo: 'Endereço', ph: 'Rua Alagoinhas, Nº 110 — CEP: 44720-000', obrigatorio: true },
      { nome: 'rateio', rotulo: 'Rateio', ph: 'A definir' },
    ],
    nova: { tipo: 'Beneficiária', rateio: 'A definir' },
    padrao: () => [{ tipo: 'Geradora', rateio: '—' }],
  },
  pagamentos: {
    campos: [
      { nome: 'forma', rotulo: 'Forma', ph: 'Transferência / PIX', obrigatorio: true },
      { nome: 'dados', rotulo: 'Dados bancários / descrição', area: true },
      { nome: 'valor', rotulo: 'Valor (R$)', ph: '69.000,00', dinheiro: true, obrigatorio: true },
    ],
    nova: {},
    padrao: () => [{ forma: 'Transferência / PIX', dados: EMPRESA.dadosBancarios }],
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
    let campo;
    if (c.opcoes) {
      campo = document.createElement('select');
      for (const o of c.opcoes) campo.add(new Option(o, o));
    } else if (c.area) {
      campo = document.createElement('textarea');
    } else {
      campo = document.createElement('input');
      campo.autocomplete = 'off';
    }
    campo.dataset.campo = c.nome;
    const ph = (valores.ph && valores.ph[c.nome]) || c.ph;
    if (ph) campo.placeholder = 'ex.: ' + ph;
    if (c.obrigatorio) campo.dataset.obrigatorio = c.rotulo;
    if (c.dinheiro) {
      campo.inputMode = 'decimal';
      campo.addEventListener('blur', () => {
        const v = parseValor(campo.value);
        if (!isNaN(v)) campo.value = formatarNumero(v);
      });
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
    atualizarTotais();
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
    const linha = criarLinha(tipo, LINHAS[tipo].nova);
    linha.querySelector('input, textarea')?.focus();
  });
});

// ---------- números e dinheiro ----------

// Aceita "69.000,00", "69000", "69000.5", "R$ 69.000"
function parseValor(s) {
  s = String(s || '').replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');
  const v = Number(s);
  return isNaN(v) ? NaN : Math.round(v * 100) / 100;
}

function formatarNumero(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function atualizarTotais() {
  const total = lerLinhas('pagamentos')
    .map((p) => parseValor(p.valor))
    .filter((v) => !isNaN(v))
    .reduce((a, v) => a + v, 0);
  document.getElementById('total').textContent = formatarMoeda(total);
  document.getElementById('totalExtenso').textContent = total > 0 ? `(${reaisPorExtenso(total)})` : '';
  return total;
}

// Sugere a potência a partir de "64 × ... 620 Wp"
function atualizarDicaPotencia() {
  const dica = document.getElementById('dicaPotencia');
  const modulo = lerLinhas('equipamentos').find((e) => /m[óo]dulo|painel|placa/i.test(e.item + ' ' + e.espec));
  const qtd = modulo && parseInt(modulo.qtd, 10);
  const wp = modulo && (modulo.espec.match(/(\d+(?:[.,]\d+)?)\s*W[pP]\b/) || [])[1];
  if (!qtd || !wp) { dica.hidden = true; return; }

  const kwp = (qtd * Number(wp.replace(',', '.'))) / 1000;
  const texto = kwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const campo = form.elements.potencia;
  if (campo.value === texto) { dica.hidden = true; return; }

  dica.innerHTML = '';
  dica.append(`${qtd} módulos × ${wp} Wp = ${texto} kWp. `);
  const usar = document.createElement('button');
  usar.type = 'button';
  usar.textContent = 'Usar este valor';
  usar.addEventListener('click', () => { campo.value = texto; dica.hidden = true; });
  dica.appendChild(usar);
  dica.hidden = false;
}

form.addEventListener('input', (e) => {
  e.target.classList.remove('invalido');
  if (e.target.closest('#pagamentos')) atualizarTotais();
  if (e.target.closest('#equipamentos') || e.target.name === 'potencia') atualizarDicaPotencia();
});

// ---------- CPF / CNPJ ----------

function mascaraDocumento(v, pj) {
  const d = v.replace(/\D/g, '').slice(0, pj ? 14 : 11);
  if (pj) {
    return d.replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function cpfValido(c) {
  c = c.replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

function cnpjValido(c) {
  c = c.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const digito = (n) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digito(12) === Number(c[12]) && digito(13) === Number(c[13]);
}

const campoDoc = form.elements.documento;
const campoTipo = form.elements.tipoPessoa;

function atualizarTipoPessoa() {
  const pj = campoTipo.value === 'PJ';
  document.getElementById('rotuloDoc').textContent = pj ? 'CNPJ' : 'CPF';
  document.getElementById('rotuloNome').textContent = pj ? 'Razão social' : 'Nome completo';
  campoDoc.placeholder = pj ? '00.000.000/0000-00' : '000.000.000-00';
  campoDoc.value = mascaraDocumento(campoDoc.value, pj);
}

campoTipo.addEventListener('change', atualizarTipoPessoa);
campoDoc.addEventListener('input', () => {
  campoDoc.value = mascaraDocumento(campoDoc.value, campoTipo.value === 'PJ');
});

// ---------- número do contrato ----------

function lerUltimoNumero() {
  try { return localStorage.getItem(CHAVE_ULTIMO_NUMERO); } catch { return null; }
}

function salvarUltimoNumero(numero) {
  try { localStorage.setItem(CHAVE_ULTIMO_NUMERO, numero); } catch { /* sem armazenamento: ignora */ }
}

function sugerirNumero() {
  const ano = new Date().getFullYear();
  const m = /^(\d+)\/(\d{4})$/.exec(lerUltimoNumero() || '');
  if (!m) return '';
  const proximo = Number(m[2]) === ano ? Number(m[1]) + 1 : 1;
  return `${String(proximo).padStart(3, '0')}/${ano}`;
}

// ---------- coleta e validação ----------

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function coletarDados() {
  const f = form.elements;
  const erros = [];
  document.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  const marcar = (el, msg) => { el.classList.add('invalido'); if (!erros.includes(msg)) erros.push(msg); };

  const pj = f.tipoPessoa.value === 'PJ';
  const obrigatorios = {
    numero: 'Informe o número do contrato.',
    data: 'Informe a data do contrato.',
    local: 'Informe o local de assinatura.',
    nome: pj ? 'Informe a razão social do contratante.' : 'Informe o nome do contratante.',
    potencia: 'Informe a potência do sistema (kWp).',
    geracao: 'Informe a geração estimada (kWh/mês).',
    condicao: 'Informe a condição de pagamento.',
  };
  for (const [nome, msg] of Object.entries(obrigatorios)) {
    if (!f[nome].value.trim()) marcar(f[nome], msg);
  }

  if (!(pj ? cnpjValido : cpfValido)(f.documento.value)) {
    marcar(f.documento, pj ? 'CNPJ inválido.' : 'CPF inválido.');
  }

  // campos obrigatórios das linhas
  for (const tipo of Object.keys(LINHAS)) {
    document.querySelectorAll(`#${tipo} [data-obrigatorio]`).forEach((c) => {
      if (!c.value.trim()) marcar(c, `Preencha todos os campos obrigatórios (${c.dataset.obrigatorio}) das tabelas.`);
    });
  }

  const equipamentos = lerLinhas('equipamentos');
  const unidades = lerLinhas('unidades');
  const pagamentos = lerLinhas('pagamentos').map((p) => ({ ...p, valor: parseValor(p.valor) }));

  if (!equipamentos.length) erros.push('Adicione pelo menos um equipamento.');
  if (!unidades.some((u) => u.tipo === 'Geradora')) erros.push('Adicione a unidade consumidora geradora.');
  if (!pagamentos.length) erros.push('Adicione pelo menos uma forma de pagamento.');

  document.querySelectorAll('#pagamentos [data-campo="valor"]').forEach((c) => {
    if (c.value.trim() && !(parseValor(c.value) > 0)) marcar(c, 'Valor de pagamento inválido.');
  });

  // Geradora sempre primeiro na tabela
  unidades.sort((a, b) => (a.tipo === 'Geradora' ? 0 : 1) - (b.tipo === 'Geradora' ? 0 : 1));

  return {
    erros,
    dados: {
      numero: f.numero.value.trim(),
      data: f.data.value,
      local: f.local.value.trim(),
      tipoPessoa: f.tipoPessoa.value,
      nome: f.nome.value.trim().replace(/\s+/g, ' '),
      documento: f.documento.value.trim(),
      endereco: f.endereco.value.trim(),
      potencia: f.potencia.value.trim(),
      geracao: f.geracao.value.trim(),
      equipamentos,
      modalidade: f.modalidade.value,
      unidades,
      condicao: f.condicao.value.trim(),
      pagamentos,
      total: pagamentos.reduce((a, p) => a + (p.valor || 0), 0),
    },
  };
}

function mostrarErros(erros) {
  const box = document.getElementById('erros');
  if (!erros.length) { box.hidden = true; return false; }
  box.innerHTML = '<strong>Corrija os itens abaixo antes de gerar o contrato:</strong>';
  const ul = document.createElement('ul');
  for (const e of erros) {
    const li = document.createElement('li');
    li.textContent = e;
    ul.appendChild(li);
  }
  box.appendChild(ul);
  box.hidden = false;
  (document.querySelector('.invalido') || box).scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

function nomeArquivo(d) {
  const nome = d.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
  return `Contrato_${d.numero.replace(/[^\w]+/g, '-')}_${nome}.pdf`;
}

// ---------- ações ----------

let urlPreview = null;

document.getElementById('btnPreview').addEventListener('click', () => {
  const { erros, dados } = coletarDados();
  if (mostrarErros(erros)) return;
  pdfMake.createPdf(montarContrato(dados)).getBlob((blob) => {
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
  pdfMake.createPdf(montarContrato(dados)).download(nomeArquivo(dados), () => {
    btn.disabled = false;
    salvarUltimoNumero(dados.numero);
  });
});

document.getElementById('btnLimpar').addEventListener('click', () => {
  if (confirm('Limpar todos os campos para um novo contrato?')) iniciar();
});

function iniciar() {
  form.reset();
  for (const tipo of Object.keys(LINHAS)) {
    document.getElementById(tipo).innerHTML = '';
    LINHAS[tipo].padrao().forEach((v) => criarLinha(tipo, v));
  }
  form.elements.data.value = hojeISO();
  form.elements.local.value = EMPRESA.localPadrao;
  form.elements.numero.value = sugerirNumero();
  document.getElementById('erros').hidden = true;
  document.getElementById('previewBox').hidden = true;
  atualizarTipoPessoa();
  atualizarTotais();
  atualizarDicaPotencia();
}

iniciar();
