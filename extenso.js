// Escreve valores em reais por extenso (pt-BR). Ex.: 69000 -> "sessenta e nove mil reais"
(function (global) {
  const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ESCALAS = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];

  function ate999(n) {
    if (n === 100) return 'cem';
    const partes = [];
    const c = Math.floor(n / 100);
    const r = n % 100;
    if (c) partes.push(CENTENAS[c]);
    if (r) {
      if (r < 20) partes.push(UNIDADES[r]);
      else {
        const d = Math.floor(r / 10), u = r % 10;
        partes.push(u ? DEZENAS[d] + ' e ' + UNIDADES[u] : DEZENAS[d]);
      }
    }
    return partes.join(' e ');
  }

  function inteiroPorExtenso(n) {
    if (n === 0) return 'zero';
    const grupos = [];
    while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000); }

    const partes = [];
    for (let i = grupos.length - 1; i >= 0; i--) {
      const g = grupos[i];
      if (!g) continue;
      let texto;
      if (i === 1 && g === 1) texto = 'mil';
      else {
        texto = ate999(g);
        if (i > 0) texto += ' ' + (g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]);
      }
      partes.push({ texto, g });
    }

    let s = partes[0].texto;
    for (let k = 1; k < partes.length; k++) {
      const g = partes[k].g;
      s += (g < 100 || g % 100 === 0) ? ' e ' : ' ';
      s += partes[k].texto;
    }
    return s;
  }

  function reaisPorExtenso(valor) {
    const totalCentavos = Math.round(valor * 100);
    const reais = Math.floor(totalCentavos / 100);
    const centavos = totalCentavos % 100;

    let s = '';
    if (reais > 0) {
      s = inteiroPorExtenso(reais);
      if (reais === 1) s += ' real';
      else if (reais >= 1000000 && reais % 1000000 === 0) s += ' de reais';
      else s += ' reais';
    }
    if (centavos > 0) {
      if (s) s += ' e ';
      s += inteiroPorExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    }
    return s || 'zero reais';
  }

  global.reaisPorExtenso = reaisPorExtenso;
})(window);
