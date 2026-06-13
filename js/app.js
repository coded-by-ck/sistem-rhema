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
  consumeFlashMessage();
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

function getOrderSearchText(order) {
  const number = String(order && order.numeroOs || '').trim();
  const numericValue = Number(number);
  const oldDemoNumber = Number.isFinite(numericValue) ?String(numericValue).padStart(3, '0') : number;
  return [number, `OS-${number}`, `OS-DEMO-${oldDemoNumber}`].join(' ');
}

function showAppMessage(message) {
  if (!message) return;
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showAppMessage.timer);
  showAppMessage.timer = window.setTimeout(function () {
    toast.classList.remove('is-visible');
  }, 3200);
}

function setFlashMessage(message) {
  if (!message) return;
  sessionStorage.setItem('retificaOS.flashMessage', message);
}

function consumeFlashMessage() {
  const message = sessionStorage.getItem('retificaOS.flashMessage');
  if (!message) return;
  sessionStorage.removeItem('retificaOS.flashMessage');
  window.setTimeout(function () {
    showAppMessage(message);
  }, 120);
}

function safePrint(htmlContent, options) {
  const settings = {
    title: 'Retífica OS',
    styles: '',
    width: 900,
    height: 700,
    closeDelay: 1200,
    ...(options || {})
  };
  const printWindow = window.open('', '_blank', `width=${settings.width},height=${settings.height}`);

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
    return false;
  }

  const closePrintWindow = function () {
    try {
      if (!printWindow.closed) printWindow.close();
    } catch (error) {
      // Se o navegador impedir o fechamento, a janela fica independente da aplicação principal.
    }
  };
  let printStarted = false;
  const startPrint = function () {
    if (printStarted) return;
    printStarted = true;
    printWindow.focus();
    printWindow.print();
    printWindow.setTimeout(closePrintWindow, settings.closeDelay);
  };

  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + escapeHtml(settings.title) + '</title>',
    '<style>' + settings.styles + '</style>',
    '</head>',
    '<body>',
    htmlContent,
    '</body>',
    '</html>'
  ].join('');

  printWindow.onafterprint = closePrintWindow;
  printWindow.onload = startPrint;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.setTimeout(startPrint, 250);

  return true;
}

function paymentBadgeClass(status) {
  if (status === 'pago') return 'success';
  if (status === 'parcial') return 'warning';
  return 'danger';
}

function isOrderRejected(order) {
  return order && order.statusServico === 'recusado';
}

function isWorkInProgress(order) {
  return Boolean(order && !['finalizado', 'entregue', 'recusado'].includes(order.statusServico));
}

function serviceBadgeClass(status) {
  if (status === 'entregue' || status === 'finalizado') return 'success';
  if (status === 'aprovado') return 'success';
  if (status === 'recusado') return 'danger';
  if (status === 'aguardando aprovação') return 'warning';
  if (status === 'orçamento') return 'info';
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
    if (order.statusServico === 'orçamento') acc.orcamento += 1;
    if (order.statusServico === 'aguardando aprovação') acc.aguardandoAprovacao += 1;
    if (order.statusServico === 'aprovado') acc.aprovadas += 1;
    if (order.statusServico === 'recusado') acc.recusadas += 1;
    if (order.statusServico === 'recebido') acc.recebidas += 1;
    if (order.statusServico === 'em execução') acc.emExecucao += 1;
    if (order.statusServico === 'finalizado') acc.finalizadas += 1;
    if (order.statusServico === 'entregue') acc.entregues += 1;
    if (isWorkInProgress(order)) acc.andamento += 1;
    if (order.statusPagamento !== 'pago') acc.pagamentoPendente += 1;
    return acc;
  }, {
    totalOrdens: 0,
    orcamento: 0,
    aguardandoAprovacao: 0,
    aprovadas: 0,
    recusadas: 0,
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
