(function () {
  const publicPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

  if (!publicPage && !RetificaStorage.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      RetificaStorage.setLoggedIn(true);
      window.location.href = 'dashboard.html';
    });
  }

  document.querySelectorAll('.logout-button').forEach(function (button) {
    button.addEventListener('click', function () {
      RetificaStorage.logout();
      window.location.href = 'index.html';
    });
  });

  applyCompanyBrand();
})();

function getCompanySettings() {
  return RetificaStorage.getCompanySettings ?RetificaStorage.getCompanySettings() : { nome: 'Retífica OS', sigla: 'RO' };
}

function getCompanySignature() {
  const company = getCompanySettings();
  return company.nome && company.nome !== 'Retífica OS' ?company.nome : 'retífica';
}

function applyCompanyBrand() {
  const company = getCompanySettings();
  document.querySelectorAll('.brand-inline').forEach(function (brand) {
    const mark = brand.querySelector('span');
    if (mark) mark.textContent = company.sigla || 'RO';
    const textNode = Array.from(brand.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    });
    if (textNode) textNode.nodeValue = ` ${company.nome || 'Retífica OS'}`;
  });
  document.querySelectorAll('.brand-block').forEach(function (brand) {
    const mark = brand.querySelector('.brand-mark');
    const title = brand.querySelector('h1');
    if (mark) mark.textContent = company.sigla || 'RO';
    if (title) title.textContent = company.nome || 'Retífica OS';
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);
  const safeValue = Number.isFinite(number) ?number : 0;
  return safeValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return 'Sem previsão';
  const date = String(value).includes('T') ?new Date(value) : new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return 'Sem previsão';
  return date.toLocaleDateString('pt-BR');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[character];
  });
}

function paymentBadgeClass(status) {
  if (status === 'pago') return 'success';
  if (status === 'parcial') return 'warning';
  return 'danger';
}

function serviceBadgeClass(status) {
  if (status === 'entregue' || status === 'finalizado') return 'success';
  if (status === 'em execução' || status === 'em análise') return 'warning';
  return '';
}

function getOrderReceived(order) {
  // Cálculo financeiro usado por dashboard, clientes e financeiro.
  const totalValue = Number(order.valorTotal || 0);
  const entryValue = Number(order.valorEntrada || 0);
  const total = Number.isFinite(totalValue) ?totalValue : 0;
  const entrada = Number.isFinite(entryValue) ?entryValue : 0;
  return order.statusPagamento === 'pago' ?total : Math.min(entrada, total);
}

function getOrderRemaining(order) {
  return RetificaStorage.calculateRemaining(order);
}

function isOrderLate(order) {
  if (!order.previsaoEntrega || order.statusServico === 'entregue') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(order.previsaoEntrega + 'T00:00:00');
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate < today;
}

function calculateTotals(orders) {
  return orders.reduce(function (acc, order) {
    const totalValue = Number(order.valorTotal || 0);
    const total = Number.isFinite(totalValue) ?totalValue : 0;
    const recebido = getOrderReceived(order);

    acc.totalOrdens += 1;
    acc.totalServicos += total;
    acc.recebido += recebido;
    acc.pendente += getOrderRemaining(order);
    if (order.statusServico === 'recebido') acc.recebidas += 1;
    if (order.statusServico === 'em execução') acc.emExecucao += 1;
    if (order.statusServico === 'finalizado') acc.finalizadas += 1;
    if (order.statusServico === 'entregue') acc.entregues += 1;
    if (order.statusServico !== 'finalizado' && order.statusServico !== 'entregue') acc.andamento += 1;
    if (order.statusPagamento !== 'pago') acc.pagamentoPendente += 1;
    return acc;
  }, {
    totalOrdens: 0,
    recebidas: 0,
    emExecucao: 0,
    andamento: 0,
    finalizadas: 0,
    entregues: 0,
    pagamentoPendente: 0,
    recebido: 0,
    pendente: 0,
    totalServicos: 0
  });
}
