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

function getReceiptPaidAmount(order) {
  const total = Number(order && order.valorTotal || 0);
  const entrada = Number(order && order.valorEntrada || 0);
  const safeTotal = Number.isFinite(total) ?total : 0;
  const safeEntrada = Number.isFinite(entrada) ?entrada : 0;
  if (order && order.statusPagamento === 'pago') return safeTotal;
  return Math.min(safeEntrada, safeTotal);
}

function hasReceiptPayment(order) {
  return getReceiptPaidAmount(order) > 0;
}

function canGenerateReceipt(order) {
  if (!order) return false;
  return order.statusPagamento === 'pago'
    || order.statusPagamento === 'parcial'
    || Number(order.valorEntrada || 0) > 0;
}

function renderReceiptButton(order, extraClass) {
  const classes = ['btn', 'btn-receipt', extraClass || ''].filter(Boolean).join(' ');
  if (canGenerateReceipt(order)) {
    return `<button class="${classes}" type="button" data-action="receipt" data-id="${escapeHtml(order.id)}">Recibo</button>`;
  }
  return '<button class="' + classes + '" type="button" disabled title="Registre um pagamento para gerar recibo">Recibo</button>';
}

function canGenerateWithdrawalTerm(order) {
  return Boolean(order && (order.statusServico === 'entregue' || order.dataRetirada));
}

function renderWithdrawalTermButton(order) {
  if (canGenerateWithdrawalTerm(order)) {
    return `<button class="btn btn-withdrawal-term" type="button" data-action="withdrawal-term" data-id="${escapeHtml(order.id)}">Termo de retirada</button>`;
  }
  return '<button class="btn btn-withdrawal-term" type="button" disabled title="Marque a OS como entregue para gerar o termo de retirada">Termo de retirada</button>';
}

function getPhoneForWhatsApp(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ?digits : `55${digits}`;
}

function createPaymentWhatsAppLink(order) {
  const phone = getPhoneForWhatsApp(order && order.telefone);
  const companyName = getCompanySignature();
  const paidAmount = getReceiptPaidAmount(order);
  const message = [
    `Olá, ${order && order.cliente || 'cliente'}. Aqui é da ${companyName}.`,
    `Registramos o pagamento referente à OS nº ${order && order.numeroOs}.`,
    `Valor pago: ${formatCurrency(paidAmount)}.`,
    `Status do pagamento: ${order && order.statusPagamento || 'pendente'}.`,
    'Obrigado.'
  ].join(' ');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function createWithdrawalWhatsAppLink(order) {
  const phone = getPhoneForWhatsApp(order && order.telefone);
  const companyName = getCompanySignature();
  const retirada = order && order.dataRetirada ?formatDate(order.dataRetirada) : formatDate(RetificaStorage.getTodayIso());
  const message = [
    `Olá, ${order && order.cliente || 'cliente'}. Aqui é da ${companyName}.`,
    `Sua peça referente à OS nº ${order && order.numeroOs} foi registrada como entregue/retirada em ${retirada}.`,
    'Obrigado pela preferência.'
  ].join(' ');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function imprimirTermoRetirada(order) {
  if (!canGenerateWithdrawalTerm(order)) {
    alert('Marque a OS como entregue para gerar o termo de retirada.');
    return false;
  }

  const company = getCompanySettings();
  const companyLines = [company.nome, company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : '', company.email]
    .filter(Boolean)
    .map(function (line) { return `<p>${escapeHtml(line)}</p>`; })
    .join('');
  const optionalItem = function (label, value) {
    return value ?`<div class="item"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>` : '';
  };
  const optionalNote = order.observacaoRetirada
    ?`<h2>Observação de retirada</h2><div class="notes">${escapeHtml(order.observacaoRetirada)}</div>`
    : '';
  const styles = [
    'body { background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.35; margin: 0; }',
    '.term-page, .termo-page { width: 100%; max-width: 190mm; margin: 0 auto; }',
    'header { border-bottom: 2px solid #111; margin-bottom: 14px; padding-bottom: 10px; }',
    'header h1 { font-size: 20px; margin: 0 0 6px; }',
    'header p { margin: 2px 0; }',
    'h1.term-title { font-size: 22px; text-align: center; margin: 12px 0 16px; text-transform: uppercase; }',
    'h2, h3 { border-bottom: 1px solid #bbb; font-size: 14px; margin: 8px 0 6px; padding-bottom: 3px; }',
    '.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; }',
    '.item { font-size: 12px; }',
    '.item strong { display: block; color: #444; font-size: 10px; text-transform: uppercase; }',
    '.declaration { border: 1px solid #000; margin: 12px 0 0; padding: 10px; font-size: 12px; line-height: 1.35; text-align: justify; }',
    '.notes { border: 1px solid #bbb; padding: 6px; white-space: pre-wrap; }',
    '.signatures, .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; break-inside: avoid; page-break-inside: avoid; }',
    '.signature, .assinatura-linha { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 11px; }',
    '@page { size: A4 portrait; margin: 7mm; }',
    '@media print { body { background: #fff !important; color: #000 !important; } .term-page, .termo-page { width: 100%; max-width: 190mm; } }'
  ].join('');
  const html = `
    <main class="term-page termo-page">
      <header>
        <h1>${escapeHtml(company.nome || 'Retífica OS')}</h1>
        ${companyLines}
      </header>
      <h1 class="term-title">Termo de Retirada de Peça</h1>
      <section class="grid">
        <div class="item"><strong>OS</strong>${escapeHtml(order.numeroOs)}</div>
        <div class="item"><strong>Cliente</strong>${escapeHtml(order.cliente || 'Não informado')}</div>
        <div class="item"><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</div>
        <div class="item"><strong>Veículo</strong>${escapeHtml(order.carro || 'Não informado')}</div>
        <div class="item"><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</div>
        <div class="item"><strong>Serviço realizado</strong>${escapeHtml(order.tipoServico || 'Não informado')}</div>
        <div class="item"><strong>Status do serviço</strong>${escapeHtml(order.statusServico || 'Não informado')}</div>
        <div class="item"><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</div>
        <div class="item"><strong>Data de retirada</strong>${formatDate(order.dataRetirada)}</div>
        ${optionalItem('Retirado por', order.retiradoPor)}
        ${optionalItem('Documento de quem retirou', order.documentoRetirada)}
      </section>
      ${optionalNote}
      <p class="declaration">Declaro que recebi a peça/serviço referente à Ordem de Serviço acima, estando ciente das informações registradas neste documento.</p>
      <section class="signatures">
        <div class="signature">Assinatura de quem retirou</div>
        <div class="signature">Assinatura da empresa</div>
      </section>
    </main>
  `;

  return safePrint(html, {
    title: `Termo de retirada OS ${order.numeroOs}`,
    styles,
    width: 820,
    height: 700
  });
}

function imprimirRecibo(order) {
  const paidAmount = getReceiptPaidAmount(order);
  if (paidAmount <= 0) {
    alert('Não há pagamento registrado para gerar recibo.');
    return false;
  }

  const company = getCompanySettings();
  const companyLines = [company.nome, company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : '', company.email]
    .filter(Boolean)
    .map(function (line) { return `<p>${escapeHtml(line)}</p>`; })
    .join('');
  const optionalItem = function (label, value) {
    return value ?`<div class="item"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>` : '';
  };
  const optionalDateItem = function (label, value) {
    return value ?optionalItem(label, formatDate(value)) : '';
  };
  const optionalNote = order.observacaoPagamento
    ?`<h2>Observação do pagamento</h2><div class="notes">${escapeHtml(order.observacaoPagamento)}</div>`
    : '';
  const styles = [
    'body { background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.35; margin: 0; }',
    '.receipt-page { width: 100%; max-width: 190mm; margin: 0 auto; }',
    'header { border-bottom: 2px solid #111; margin-bottom: 14px; padding-bottom: 10px; }',
    'header h1 { font-size: 20px; margin: 0 0 6px; text-align: left; }',
    'header p { margin: 2px 0; }',
    'h1.receipt-title { font-size: 22px; text-align: center; margin: 10px 0 14px; text-transform: uppercase; }',
    'h2, h3 { border-bottom: 1px solid #bbb; font-size: 14px; margin: 8px 0 6px; padding-bottom: 3px; }',
    '.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 20px; }',
    '.item { font-size: 12px; }',
    '.item strong { display: block; color: #444; font-size: 9px; text-transform: uppercase; }',
    '.valor-pago-destaque { border: 1px solid #000; margin: 14px 0; padding: 10px; text-align: center; }',
    '.valor-pago-destaque span { display: block; color: #444; font-size: 10px; font-weight: bold; text-transform: uppercase; }',
    '.valor-pago-destaque strong { display: block; font-size: 22px; font-weight: bold; margin-top: 4px; }',
    '.notes { border: 1px solid #bbb; padding: 6px; white-space: pre-wrap; }',
    '.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; break-inside: avoid; page-break-inside: avoid; }',
    '.signature { border-top: 1px solid #000; padding-top: 5px; text-align: center; }',
    '@page { size: A4 portrait; margin: 10mm; }',
    '@media print { body { background: #fff !important; color: #000 !important; } .receipt-page { width: 100%; max-width: 190mm; } }'
  ].join('');
  const html = `
    <main class="receipt-page">
      <header>
        <h1>${escapeHtml(company.nome || 'Retífica OS')}</h1>
        ${companyLines}
      </header>
      <h1 class="receipt-title">Recibo de Pagamento</h1>
      <section class="grid">
        <div class="item"><strong>OS</strong>${escapeHtml(order.numeroOs)}</div>
        <div class="item"><strong>Data de emissão</strong>${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</div>
        <div class="item"><strong>Cliente</strong>${escapeHtml(order.cliente || 'Não informado')}</div>
        <div class="item"><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</div>
        <div class="item"><strong>Veículo</strong>${escapeHtml(order.carro || 'Não informado')}</div>
        <div class="item"><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</div>
        <div class="item"><strong>Serviço</strong>${escapeHtml(order.tipoServico || 'Não informado')}</div>
        <div class="item"><strong>Status do pagamento</strong>${escapeHtml(order.statusPagamento || 'pendente')}</div>
      </section>
      <div class="valor-pago-destaque"><span>Valor pago</span><strong>${formatCurrency(paidAmount)}</strong></div>
      <h2>Valores</h2>
      <section class="grid">
        <div class="item"><strong>Valor total</strong>${formatCurrency(order.valorTotal)}</div>
        <div class="item"><strong>Entrada</strong>${formatCurrency(order.valorEntrada)}</div>
        <div class="item"><strong>Restante</strong>${formatCurrency(getOrderRemaining(order))}</div>
        ${optionalItem('Forma de pagamento', order.formaPagamento)}
        ${optionalDateItem('Data do pagamento', order.dataPagamento)}
        ${optionalItem('Recebido por', order.recebidoPor)}
      </section>
      ${optionalNote}
      <section class="signatures">
        <div class="signature">Assinatura da empresa</div>
        <div class="signature">Assinatura do cliente</div>
      </section>
    </main>
  `;

  return safePrint(html, {
    title: `Recibo OS ${order.numeroOs}`,
    styles,
    width: 820,
    height: 700
  });
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
