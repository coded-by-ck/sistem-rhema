const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8');
const memory = new Map();
const context = vm.createContext({
  console, URLSearchParams,
  localStorage: {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key)
  }
});
context.window = context;
vm.runInContext(read('storage.js'), context);
// Load shared helpers without starting the page UI.
vm.runInContext(read('app.js').split('})();')[1], context);
const osSource = read('os.js');
vm.runInContext(osSource.slice(osSource.indexOf('  function toNumber('),
  osSource.indexOf('  function shouldUseNoChargeStatus(')), context);

function savedOrder(extra = {}) {
  context.RetificaStorage.updateOrders([{
    id: 'test-os', numeroOs: '123', cliente: 'João', telefone: '(11) 99999-1234',
    statusServico: 'orçamento', statusPagamento: 'pendente',
    servicosRetifica: [
      { nome: 'Plaina', valorUnitario: 300, quantidade: 1 },
      { nome: 'Retificar sedes', valorUnitario: 25, quantidade: 2, tipoCobranca: 'unidade' }
    ],
    pecasExternas: [], ...extra
  }]);
  return context.RetificaStorage.getOrders()[0];
}

const parts = [
  { nome: 'Junta do cabeçote', valor: 120 },
  { nome: 'Retentor', valor: 35 }
];
const scenarios = [
  ['A: somente serviços', {}, 350, 350],
  ['B: serviços e peças', { pecasExternas: parts }, 505, 505],
  ['C: desconto', { pecasExternas: parts, descontoServicoAtivo: true }, 487.5, 487.5],
  ['D: desconto e entrada', { pecasExternas: parts, descontoServicoAtivo: true, valorEntrada: 100 }, 487.5, 387.5],
  ['Orçamento antigo não substitui o total atual', { pecasExternas: parts, valorOrcado: 350 }, 505, 505],
  ['Pagamento quitado', { pecasExternas: parts, statusPagamento: 'pago' }, 505, 0]
];

for (const [name, extra, total, remaining] of scenarios) {
  test(name, () => {
    const order = savedOrder(extra);
    assert.equal(order.valorTotal, total);
    assert.equal(context.getOrderRemaining(order), remaining);
    assert.equal(order.pecasExternas.length, extra.pecasExternas?.length || 0);
    const before = JSON.stringify(order);
    for (const createLink of [context.createWhatsAppLink, context.createBudgetWhatsAppLink]) {
      const url = new URL(createLink(order));
      assert.equal(url.pathname, '/5511999991234');
      const message = url.searchParams.get('text');
      const money = context.formatCurrency;
      assert.ok(message.includes('🔧 SERVIÇOS DA RETÍFICA\n\n'));
      for (const service of context.getOrderWorkshopServices(order)) {
        assert.ok(message.split('\n').includes(`• ${service.nome} — ${context.formatWorkshopServiceLine(service)}`));
      }
      assert.ok(message.includes('💰 RESUMO\n\n'));
      assert.ok(message.includes(`Subtotal dos serviços: ${money(350)}`));
      assert.ok(message.includes(`Valor total: ${money(total)}`));
      assert.ok(message.includes(`Saldo restante: ${money(remaining)}`));
      if (extra.pecasExternas) {
        assert.ok(message.includes('PEÇAS EXTERNAS'));
        for (const part of parts) {
          assert.equal(message.split(`• ${part.nome} — ${money(part.valor)}`).length - 1, 1);
        }
        assert.ok(message.includes(`Subtotal das peças: ${money(155)}`));
      } else {
        assert.ok(!message.includes('PEÇAS EXTERNAS'));
        assert.ok(!message.includes('Subtotal das peças:'));
        assert.ok(!message.includes('Peças externas:'));
      }
      if (extra.descontoServicoAtivo) {
        assert.ok(message.includes(`Desconto nos serviços: ${money(17.5)}`));
        assert.ok(message.indexOf('Desconto nos serviços:') > message.indexOf('Subtotal dos serviços:'));
        assert.ok(message.indexOf('Desconto nos serviços:') < message.indexOf('🧩 PEÇAS EXTERNAS'));
        assert.ok(message.includes(`Serviços após desconto: ${money(332.5)}`));
      } else {
        assert.ok(!message.includes('Desconto nos serviços:'));
        assert.ok(!message.includes('Serviços após desconto:'));
      }
      if (extra.valorEntrada) {
        assert.ok(message.includes(`Entrada: ${money(100)}`));
        assert.ok(message.indexOf('Entrada:') > message.indexOf('Valor total:'));
        assert.ok(message.indexOf('Entrada:') < message.indexOf('Saldo restante:'));
      } else assert.ok(!message.includes('Entrada:'));
      if (extra.statusPagamento === 'pago') assert.ok(message.includes('Pagamento: quitado.'));
    }
    assert.equal(JSON.stringify(order), before);
  });
}

test('E/F: valor 333 não vira nome nem gera uma segunda peça; nome vazio usa fallback', () => {
  for (const nome of ['Junta do cabeçote', '', '   ']) {
    const order = savedOrder({ cliente: 'erick', pecasExternas: [{ nome, valor: 333 }] });
    const before = JSON.stringify(order);
    for (const createLink of [context.createWhatsAppLink, context.createBudgetWhatsAppLink]) {
      const message = new URL(createLink(order)).searchParams.get('text');
      assert.ok(message.startsWith('Olá, Erick!'));
      assert.ok(message.includes(`• ${nome.trim() || 'Peça externa'} — ${context.formatCurrency(333)}`));
      assert.ok(!message.includes('• 333 —'));
      const partBlock = message.split('🧩 PEÇAS EXTERNAS\n\n')[1].split('\n\n')[0];
      assert.equal(partBlock.split('\n').length, 1);
    }
    assert.equal(JSON.stringify(order), before);
    assert.equal(order.cliente, 'erick');
  }
});

test('Diagnóstico: nome 333 salvo com valor zero é reproduzido, sem filtro arbitrário', () => {
  const order = savedOrder({ pecasExternas: [{ nome: '', valor: 333 }, { nome: '333', valor: 0 }] });
  const message = context.getWhatsAppOrderDetails(order);
  assert.ok(message.includes(`• Peça externa — ${context.formatCurrency(333)}`));
  assert.ok(message.includes(`• 333 — ${context.formatCurrency(0)}`));
  assert.equal(order.pecasExternas.length, 2);
});
