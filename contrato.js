// Modelo do contrato da Feitosa Solar em formato pdfmake.
// Para mudar dados fixos da empresa, edite o objeto EMPRESA abaixo.

const EMPRESA = {
  nome: 'FEITOSA SOLAR',
  razaoSocial: 'FEITOSA SOLAR LTDA',
  slogan: 'Energia Solar Fotovoltaica',
  cnpj: '33.250.767/0001-28',
  enderecoLinha1: 'Área Rural de Pindobaçu SN',
  enderecoLinha2: 'Pindobaçu – BA | CEP: 44772-899',
  enderecoCompleto: 'Área Rural de Pindobaçu, SN, Pindobaçu – BA, CEP 44772-899',
  foro: 'Pindobaçu/BA',
  localPadrao: 'Pindobaçu – BA',
  dadosBancarios:
    'Favorecido: Iolanda Alves da Silva\n' +
    'CPF: 082.492.565-30\n' +
    'Banco: 197 — Stone Pagamentos S.A.\n' +
    'Agência: 0001 | Conta: 30730176-2',
};

const COR = {
  cabecalho: '#0E1E3A', // azul bem escuro: o azul de "FEITOSA" na logo some no marinho comum
  amarelo: '#F5C40C',   // amarelo da logo
  marinho: '#1B3A6B',
  azul: '#1565C0',
  azulClaro: '#E3F0FB',
  borda: '#BBDEFB',
  zebra: '#F5F9FD',
  texto: '#333333',
};

const LARGURA_UTIL = 515; // A4 (595pt) menos margens de 40pt

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
  'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarMoeda(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
}

function dataCurta(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function dataPorExtenso(iso) {
  const [a, m, d] = iso.split('-');
  return `${d} de ${MESES[Number(m) - 1]} de ${a}`;
}

// ---------- blocos reutilizáveis ----------

function secao(titulo) {
  return [
    { text: titulo, style: 'secao', margin: [0, 16, 0, 3] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGURA_UTIL, y2: 0, lineWidth: 1, lineColor: COR.azul }], margin: [0, 0, 0, 8] },
  ];
}

// texto pode ser string ou array de trechos pdfmake (para negrito no meio)
function item(letra, texto) {
  return { text: [{ text: letra + '. ', bold: true, color: COR.azul }].concat(texto), margin: [20, 0, 0, 5] };
}

function subitem(romano, texto) {
  return { text: [{ text: romano + '. ', bold: true, color: COR.azul }].concat(texto), margin: [40, 0, 0, 4] };
}

const b = (t) => ({ text: t, bold: true });

function th(t) {
  return { text: t, bold: true, color: 'white', fontSize: 8.5 };
}

const layoutTabela = {
  hLineWidth: () => 0.8,
  vLineWidth: () => 0.8,
  hLineColor: () => COR.borda,
  vLineColor: () => COR.borda,
  fillColor: (linha) => (linha === 0 ? COR.marinho : linha % 2 === 0 ? COR.zebra : null),
  paddingLeft: () => 6,
  paddingRight: () => 6,
  paddingTop: () => 5,
  paddingBottom: () => 5,
};

const layoutInfo = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => COR.borda,
  vLineColor: () => COR.borda,
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 5,
  paddingBottom: () => 5,
};

function blocoAssinatura(nome, documento, papel) {
  return {
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 237, y2: 0, lineWidth: 1.2, lineColor: COR.azul }], margin: [0, 0, 0, 6] },
      { text: nome, bold: true, color: COR.marinho, fontSize: 10 },
      { text: documento, fontSize: 8.5 },
      { text: papel, bold: true, color: COR.azul, fontSize: 8.5 },
    ],
    alignment: 'center',
  };
}

function blocoTestemunha(titulo) {
  return {
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 237, y2: 0, lineWidth: 0.8, lineColor: '#BBBBBB' }], margin: [0, 0, 0, 6] },
      { text: titulo, bold: true, fontSize: 9 },
      { text: 'Nome: _______________________________', fontSize: 8.5, margin: [0, 4, 0, 0] },
      { text: 'CPF: ____.____.____-___', fontSize: 8.5, margin: [0, 3, 0, 0] },
    ],
    alignment: 'center',
  };
}

// ---------- documento ----------

function montarContrato(d) {
  const pj = d.tipoPessoa === 'PJ';
  const rotuloDoc = pj ? 'CNPJ' : 'CPF';
  const nomeMaiusculo = d.nome.toLocaleUpperCase('pt-BR');
  const temBeneficiarias = d.unidades.some((u) => u.tipo === 'Beneficiária');
  const totalTexto = formatarMoeda(d.total);

  // Qualificação do contratante
  const qualificacaoContratante = [{ text: 'CONTRATANTE: ', bold: true, color: COR.marinho }, nomeMaiusculo];
  if (pj) qualificacaoContratante.push(`, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${d.documento}`);
  else qualificacaoContratante.push(`, inscrito(a) no CPF nº ${d.documento}`);
  if (d.endereco) qualificacaoContratante.push(pj ? `, com sede em ${d.endereco}` : `, residente e domiciliado(a) em ${d.endereco}`);
  qualificacaoContratante.push(', doravante denominado(a) ', b('CONTRATANTE'), ';');

  // Tabela de equipamentos
  const tabelaEquip = [[th('QTD'), th('ITEM'), th('ESPECIFICAÇÃO')]].concat(
    d.equipamentos.map((e) => [
      { text: e.qtd || '—', alignment: 'center' },
      e.item,
      e.espec,
    ])
  );

  // Tabela de unidades consumidoras
  let nBenef = 0;
  const tabelaUC = [[th('TIPO'), th('CIDADE'), th('ENDEREÇO'), { text: 'RATEIO', bold: true, color: 'white', fontSize: 8.5, alignment: 'center' }]].concat(
    d.unidades.map((u) => {
      const geradora = u.tipo === 'Geradora';
      const rotulo = geradora ? 'UC Geradora' : `UC Beneficiária ${++nBenef}`;
      return [
        { text: rotulo, bold: geradora, color: geradora ? COR.marinho : COR.texto },
        u.cidade,
        u.endereco,
        { text: u.rateio || '—', alignment: 'center' },
      ];
    })
  );

  // Tabela de pagamento
  const tabelaPag = [[th('FORMA'), th('DADOS BANCÁRIOS / DESCRIÇÃO'), th('VALOR')]]
    .concat(d.pagamentos.map((p) => [
      p.forma,
      p.dados,
      { text: formatarMoeda(p.valor), bold: true, color: COR.marinho },
    ]))
    .concat([[
      { text: 'TOTAL DOS SERVIÇOS', colSpan: 2, alignment: 'right', bold: true, color: COR.marinho, fillColor: 'white' },
      {},
      { text: totalTexto, bold: true, color: 'white', fillColor: COR.azul },
    ]]);

  const clausulaQuinta = temBeneficiarias
    ? [
      item('A', 'O CONTRATANTE declara ser o titular ou possuir poderes de representação de todas as unidades consumidoras listadas acima, responsabilizando-se pela veracidade das informações prestadas e pela regularidade cadastral junto à distribuidora.'),
      item('B', 'Os percentuais de rateio indicados na tabela acima são de responsabilidade exclusiva do CONTRATANTE e deverão respeitar os limites estabelecidos pela Resolução Normativa vigente, totalizando 100% (cem por cento) entre as unidades beneficiárias cadastradas.'),
      item('C', 'A unidade consumidora geradora possui prioridade no recebimento dos créditos de energia gerada. Os créditos excedentes são distribuídos entre as unidades beneficiárias conforme percentuais de rateio a serem definidos e formalizados por aditivo contratual.'),
    ]
    : [
      item('A', 'O CONTRATANTE declara ser o titular ou possuir poderes de representação da unidade consumidora listada acima, responsabilizando-se pela veracidade das informações prestadas e pela regularidade cadastral junto à distribuidora.'),
    ];

  const content = [
    // Título
    { text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPECIALIZADOS', style: 'titulo', margin: [0, 6, 0, 2] },
    { text: 'Sistema Solar Fotovoltaico', color: COR.azul, fontSize: 11, alignment: 'center', margin: [0, 0, 0, 6] },
    {
      table: {
        widths: ['*', '*', '*'],
        body: [[
          { stack: [{ text: 'CONTRATANTE', bold: true, color: COR.marinho, fontSize: 8.5 }, d.nome], fillColor: COR.azulClaro },
          { stack: [{ text: 'CONTRATO Nº', bold: true, color: COR.marinho, fontSize: 8.5 }, d.numero], fillColor: COR.azulClaro },
          { stack: [{ text: 'DATA', bold: true, color: COR.marinho, fontSize: 8.5 }, dataCurta(d.data)], fillColor: COR.azulClaro },
        ]],
      },
      layout: layoutInfo,
      margin: [0, 0, 0, 10],
    },

    // Qualificação
    ...secao('QUALIFICAÇÃO DAS PARTES'),
    {
      text: [
        { text: 'CONTRATADA: ', bold: true, color: COR.marinho },
        `${EMPRESA.razaoSocial}, empresa de direito privado, inscrita no CNPJ/MF sob o nº ${EMPRESA.cnpj}, com sede na ${EMPRESA.enderecoCompleto}, doravante denominada `,
        b('CONTRATADA'), ';',
      ],
      margin: [0, 0, 0, 6],
    },
    { text: qualificacaoContratante, margin: [0, 0, 0, 6] },
    { text: 'Ambas as partes resolvem firmar o presente CONTRATO para instalação de sistema de fornecimento de energia solar fotovoltaica, de acordo com as seguintes cláusulas e condições:' },

    // 1
    ...secao('1 — CLÁUSULA PRIMEIRA — DO OBJETO'),
    item('A', `O presente CONTRATO tem por objeto a prestação de serviços profissionais especializados pela CONTRATADA, consistindo no fornecimento de equipamentos, instalação e homologação de um sistema de geração de energia solar fotovoltaica com potência de ${d.potencia} kWp, estimado em aproximadamente ${d.geracao} kWh/mês, conforme especificações técnicas e prazos detalhados neste instrumento.`),
    item('B', 'Toda e qualquer alteração neste CONTRATO deverá ser formalizada por meio de aditivo contratual, assinado pelos representantes legais das partes, sendo vedada qualquer modificação verbal.'),

    // 2
    ...secao('2 — CLÁUSULA SEGUNDA — OBRIGAÇÕES DO(A) CONTRATANTE'),
    item('A', 'O(A) CONTRATANTE deverá fornecer à CONTRATADA, no prazo máximo de 5 dias úteis após solicitação, todas as informações, dados e documentos necessários à execução do serviço, incluindo comprovantes de titularidade da unidade consumidora, contas de energia recentes e documentos pessoais, sob pena de atrasos no cronograma.'),
    item('B', 'O(A) CONTRATANTE compromete-se a manter regularizada sua situação financeira junto à distribuidora de energia local, especialmente quanto ao pagamento de contas de energia, para evitar indeferimentos no processo de homologação do sistema.'),
    item('C', 'O(A) CONTRATANTE será responsável por providenciar e custear eventuais obras civis ou elétricas necessárias à instalação do sistema, quando identificadas pela CONTRATADA durante a visita técnica ou exigidas pela distribuidora após a vistoria.'),
    item('D', 'O(A) CONTRATANTE deverá garantir acesso irrestrito ao local de instalação durante os períodos acordados para a visita técnica, entrega de equipamentos e execução da instalação.'),

    // 3
    ...secao('3 — CLÁUSULA TERCEIRA — OBRIGAÇÕES DA CONTRATADA'),
    item('A', 'O OBJETO deste contrato possui as seguintes garantias:'),
    subitem('I', '10 (dez) anos de garantia sobre o inversor;'),
    subitem('II', '25 (vinte e cinco) anos de garantia sobre os módulos fotovoltaicos (painéis);'),
    subitem('III', 'Durabilidade estimada do sistema de 30 (trinta) anos.'),
    item('B', 'A CONTRATADA compromete-se a prestar os serviços descritos abaixo, em conformidade com as normas da Agência Nacional de Energia Elétrica (ANEEL) e os prazos estabelecidos neste contrato:'),
    subitem('I', 'Desenvolvimento do Projeto Elétrico e Documentação: A CONTRATADA elaborará o projeto elétrico personalizado e preparará toda a documentação exigida para o processo de conexão junto à distribuidora, no prazo de até 15 dias úteis após a assinatura do contrato e a realização da visita técnica.'),
    subitem('II', 'Recebimento e Instalação dos Equipamentos: A CONTRATADA coordenará o recebimento dos equipamentos e realizará a instalação do Gerador Fotovoltaico no endereço indicado na Cláusula Quinta, no prazo de até 30 (trinta) dias corridos após o recebimento dos equipamentos.'),
    subitem('III', 'Solicitação de Homologação junto à Distribuidora: Após a conclusão da instalação e a aprovação do projeto pela distribuidora, a CONTRATADA solicitará a homologação do sistema em até 2 dias úteis.'),
    subitem('IV', 'Acompanhamento e Suporte Pós-Instalação: Após a homologação definitiva, a CONTRATADA fornecerá ao CONTRATANTE, em até 5 dias úteis, orientação detalhada sobre o funcionamento do sistema instalado.'),
    item('C', 'A CONTRATADA compromete-se a acompanhar os processos junto à distribuidora, respeitando os prazos regulamentados pela ANEEL:'),
    subitem('I', 'Orçamento de Conexão: 15 a 30 dias para microgeração (até 75 kW) e 45 dias para minigeração.'),
    subitem('II', ['Vistoria e Conexão: 7 a 15 dias úteis. ', b('IMPORTANTE:'), ' A distribuidora não agenda vistoria com hora marcada — é fundamental que alguém esteja disponível no imóvel para receber os técnicos.']),
    subitem('III', 'Início da Injeção de Energia: 120 dias para microgeração e 12 meses para minigeração, contados a partir da emissão do orçamento de conexão.'),
    item('D', 'A CONTRATADA não será responsável por atrasos decorrentes de fatores fora de seu controle, incluindo demoras nos processos conduzidos pela distribuidora, documentação incompleta ou pendências financeiras do CONTRATANTE, atrasos na entrega de equipamentos ou necessidade de obras adicionais exigidas pela distribuidora.'),

    // 4
    ...secao('4 — CLÁUSULA QUARTA — DO GERADOR FOTOVOLTAICO'),
    item('A', `O Kit Gerador Fotovoltaico terá potência de ${d.potencia} kWp, composto pelos seguintes equipamentos:`),
    {
      table: { headerRows: 1, widths: [50, 130, '*'], body: tabelaEquip, dontBreakRows: true },
      layout: layoutTabela,
      fontSize: 8.5,
      margin: [0, 6, 0, 10],
    },
    item('B', 'O Kit Gerador possui garantias conforme os termos fornecidos pelo fabricante. A CONTRATADA compromete-se a assessorar o CONTRATANTE nos processos de garantia junto ao fabricante.'),
    item('C', 'A CONTRATADA não será responsável por danos aos equipamentos decorrentes de uso inadequado, má conservação ou eventos de força maior.'),

    // 5
    ...secao('5 — CLÁUSULA QUINTA — DA UNIDADE GERADORA E UNIDADES BENEFICIÁRIAS'),
    { text: `O sistema será enquadrado na modalidade de conexão ${d.modalidade}, nos termos da Lei Federal nº 14.300/2022 e da Resolução Normativa ANEEL nº 1.000/2021.`, margin: [0, 0, 0, 6] },
    {
      table: { headerRows: 1, widths: [95, 95, '*', 55], body: tabelaUC, dontBreakRows: true },
      layout: layoutTabela,
      fontSize: 8.5,
      margin: [0, 0, 0, 10],
    },
    ...clausulaQuinta,

    // 6
    ...secao('6 — CLÁUSULA SEXTA — DO PAGAMENTO'),
    item('A', [
      'O valor total pelos serviços e fornecimento de equipamentos prestados pela CONTRATADA é de ',
      b(`${totalTexto} (${reaisPorExtenso(d.total)})`),
      `, ${d.condicao.replace(/\.\s*$/, '')}.`,
    ]),
    {
      table: { headerRows: 1, widths: [100, '*', 95], body: tabelaPag, dontBreakRows: true },
      layout: layoutTabela,
      fontSize: 8.5,
      margin: [0, 6, 0, 10],
    },
    item('B', 'Em caso de inadimplemento será aplicada multa moratória de 2% (dois por cento) sobre o valor devido, acrescida de juros de 1% (um por cento) ao mês, calculados pro rata die.'),
    item('C', 'A partir do 15º dia útil após o vencimento, sem que o pagamento tenha sido realizado, será configurada inadimplência, podendo a CONTRATADA adotar medidas judiciais, incluindo custas processuais e honorários advocatícios de 20% (vinte por cento) sobre o valor da causa.'),

    // 7
    ...secao('7 — CLÁUSULA SÉTIMA — DA REGULAÇÃO NORMATIVA'),
    item('A', 'Todas as atividades previstas neste CONTRATO serão realizadas em conformidade com a legislação aplicável, incluindo a Lei Federal nº 14.300/2022 e a Resolução Normativa nº 1.000/2021 da ANEEL.'),
    item('B', 'A CONTRATADA não será responsável por alterações normativas ou regulatórias que ocorram durante ou após a execução do CONTRATO.'),
    item('C', 'A distribuidora de energia poderá realizar vistoria no local e exigir adequações técnicas. O CONTRATANTE será responsável por providenciar e custear tais adequações no prazo estipulado pela distribuidora.'),

    // 8
    ...secao('8 — CLÁUSULA OITAVA — DA RESCISÃO'),
    item('A', 'Este CONTRATO possui caráter irrevogável e irretratável, podendo ser rescindido apenas nas seguintes hipóteses pela parte adimplente:'),
    subitem('I', 'Revogação de autorização legal, governamental ou regulatória indispensável ao cumprimento das obrigações;'),
    subitem('II', 'Inadimplência do CONTRATANTE por período superior a 30 (trinta) dias;'),
    subitem('III', 'Descumprimento de qualquer obrigação contratual por uma das partes;'),
    subitem('IV', 'Decretação de falência, dissolução ou liquidação judicial de uma das partes, mediante notificação com 10 (dez) dias de antecedência.'),
    item('B', 'A parte inadimplente terá 15 (quinze) dias úteis, contados do recebimento de notificação por escrito, para sanar o descumprimento.'),
    item('C', 'Em caso de ação judicial, serão acrescidos honorários advocatícios de 20% (vinte por cento) sobre o valor da causa, além de custas processuais.'),

    // 9
    ...secao('9 — CLÁUSULA NONA — CASO FORTUITO OU FORÇA MAIOR'),
    item('A', 'Na ocorrência de caso fortuito ou força maior, nos termos do artigo 393 do Código Civil, a parte afetada não responderá pelas consequências durante o período do evento, desde que notifique a outra parte em até 5 (cinco) dias.'),
    item('B', 'Obrigações financeiras devidas antes do evento não serão suspensas, devendo ser cumpridas nos prazos contratuais.'),

    // 10
    ...secao('10 — CLÁUSULA DÉCIMA — DO DIREITO DE USO DE IMAGEM'),
    item('A', 'O CONTRATANTE autoriza a CONTRATADA a utilizar, de forma gratuita e por prazo indeterminado, fotografias e filmagens do sistema fotovoltaico instalado, exclusivamente para fins promocionais e institucionais.'),
    item('B', 'A CONTRATADA compromete-se a não utilizar imagens que identifiquem diretamente o CONTRATANTE ou sua propriedade sem autorização prévia por escrito.'),
    item('C', 'O CONTRATANTE poderá revogar esta autorização mediante notificação por escrito, não afetando usos anteriores.'),

    // 11
    ...secao('11 — CLÁUSULA DÉCIMA PRIMEIRA — DISPOSIÇÕES GERAIS'),
    item('A', 'Este CONTRATO representa o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores, verbais ou escritos.'),
    item('B', 'A nulidade ou invalidade de qualquer cláusula não afetará a validade das demais.'),
    item('C', 'Todas as notificações deverão ser feitas por escrito, via e-mail com confirmação de leitura ou correspondência com aviso de recebimento.'),
    item('D', 'As partes comprometem-se a manter confidencialidade sobre informações sensíveis trocadas durante a execução do CONTRATO, exceto quando exigido por lei ou autoridade competente.'),

    // 12
    ...secao('12 — CLÁUSULA DÉCIMA SEGUNDA — DO FORO'),
    item('A', `Para dirimir quaisquer controvérsias oriundas deste CONTRATO, as partes elegem o foro da Comarca de ${EMPRESA.foro}, com renúncia a qualquer outro, por mais privilegiado que seja.`),

    // Assinaturas
    {
      unbreakable: true,
      margin: [0, 30, 0, 0],
      stack: [
        {
          text: 'O presente instrumento foi elaborado e celebrado com base na boa-fé e no mútuo consentimento das partes, estando ambas cientes de todas as cláusulas e condições aqui estabelecidas, comprometendo-se a cumpri-las integral e fielmente.',
          italics: true, alignment: 'center', margin: [0, 0, 0, 60],
        },
        {
          columns: [
            blocoAssinatura(EMPRESA.razaoSocial, `CNPJ: ${EMPRESA.cnpj}`, 'CONTRATADA'),
            blocoAssinatura(nomeMaiusculo, `${rotuloDoc}: ${d.documento}`, 'CONTRATANTE'),
          ],
          columnGap: 41,
        },
        {
          columns: [blocoTestemunha('TESTEMUNHA 1'), blocoTestemunha('TESTEMUNHA 2')],
          columnGap: 41,
          margin: [0, 70, 0, 0],
        },
        { text: `${d.local}, ${dataPorExtenso(d.data)}`, bold: true, color: COR.marinho, alignment: 'center', margin: [0, 30, 0, 0] },
      ],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 100, 40, 50],
    info: { title: `Contrato ${d.numero} — ${d.nome}`, author: EMPRESA.razaoSocial },
    header: () => ({
      margin: [40, 28, 40, 0],
      table: {
        widths: ['*', '*'],
        body: [[
          {
            columns: [
              { image: LOGO_EMPRESA, width: 92 },
              { text: EMPRESA.slogan, fontSize: 8, color: COR.borda, margin: [8, 16, 0, 0] },
            ],
            fillColor: COR.cabecalho,
            margin: [8, 5, 6, 5],
          },
          {
            stack: [`CNPJ: ${EMPRESA.cnpj}`, EMPRESA.enderecoLinha1, EMPRESA.enderecoLinha2],
            alignment: 'right', fontSize: 7.5, color: COR.cabecalho,
            fillColor: COR.amarelo,
            margin: [6, 13, 10, 8],
          },
        ]],
      },
      layout: 'noBorders',
    }),
    footer: (pagina, total) => ({
      columns: [
        { text: `Contrato nº ${d.numero} — ${d.nome}` },
        { text: `Página ${pagina} de ${total}`, alignment: 'right' },
      ],
      margin: [40, 18, 40, 0],
      fontSize: 7.5,
      color: '#8A8A8A',
    }),
    content,
    styles: {
      titulo: { fontSize: 14, bold: true, color: COR.marinho, alignment: 'center' },
      secao: { fontSize: 11, bold: true, color: COR.marinho },
    },
    // sem ligaduras: evita que "fi" vire "f" ao copiar/pesquisar o texto do PDF
    defaultStyle: { fontSize: 9.5, lineHeight: 1.15, color: COR.texto, fontFeatures: { liga: false } },
  };
}
