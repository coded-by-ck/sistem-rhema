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
  if (status === 'sem cobrança') return 'info';
  return 'danger';
}

function isOrderRejected(order) {
  return order && order.statusServico === 'recusado';
}

function isWorkInProgress(order) {
  return Boolean(order && ['recebido', 'em análise', 'aprovado', 'em execução'].includes(order.statusServico));
}

function isOrderFinanciallyRelevant(order) {
  if (!order) return false;
  if (order.statusPagamento === 'sem cobrança') return false;
  return Number(order.valorTotal || 0) > 0
    || Number(order.valorEntrada || 0) > 0
    || getOrderReceived(order) > 0
    || getOrderRemaining(order) > 0;
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
  if (order.statusPagamento === 'sem cobrança') return 0;
  if (order.statusPagamento === 'pago') return total;
  return total > 0 ?Math.min(entrada, total) : entrada;
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
  if (order && order.statusPagamento === 'sem cobrança') return 0;
  return Math.min(safeEntrada, safeTotal);
}

function hasReceiptPayment(order) {
  return getReceiptPaidAmount(order) > 0;
}

function canGenerateReceipt(order) {
  if (!order) return false;
  if (order.statusPagamento === 'sem cobrança') return false;
  return order.statusPagamento === 'pago'
    || order.statusPagamento === 'parcial'
    || Number(order.valorEntrada || 0) > 0;
}

function renderReceiptButton(order, extraClass) {
  const classes = ['btn', 'btn-receipt', extraClass || ''].filter(Boolean).join(' ');
  if (canGenerateReceipt(order)) {
    return `<button class="${classes}" type="button" data-action="receipt" data-id="${escapeHtml(order.id)}">Recibo A4</button>`;
  }
  const title = order && order.statusPagamento === 'sem cobrança'
    ?'Esta OS não possui cobrança registrada'
    :'Registre um pagamento para gerar recibo';
  return '<button class="' + classes + '" type="button" disabled title="' + title + '">Recibo A4</button>';
}

function renderQuickReceiptButton(order, extraClass) {
  const classes = ['btn', 'btn-secondary', extraClass || ''].filter(Boolean).join(' ');
  if (canGenerateReceipt(order)) {
    return `<button class="${classes}" type="button" data-action="quick-receipt" data-id="${escapeHtml(order.id)}">Comprovante rápido</button>`;
  }
  return '<button class="' + classes + '" type="button" disabled title="Não há pagamento registrado para gerar comprovante">Comprovante rápido</button>';
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
    alert(order && order.statusPagamento === 'sem cobrança'
      ?'Esta OS não possui cobrança registrada.'
      :'Não há pagamento registrado para gerar recibo.');
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

function imprimirComprovanteRapido(order) {
  const paidAmount = getReceiptPaidAmount(order);
  if (paidAmount <= 0) {
    alert('Não há pagamento registrado para gerar comprovante.');
    return false;
  }

  const company = getCompanySettings();
  const optionalLine = function (label, value) {
    return value ?`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` : '';
  };
  const optionalDateLine = function (label, value) {
    return value ?optionalLine(label, formatDate(value)) : '';
  };
  const companyPhone = company.telefone ?`<p>${escapeHtml(company.telefone)}</p>` : '';
  const styles = [
    'body { background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; }',
    '.receipt-small { width: 80mm; border: 1px solid #000; box-sizing: border-box; color: #000; font-family: Arial, sans-serif; font-size: 11px; padding: 8px; }',
    '.receipt-small h1 { font-size: 14px; line-height: 1.2; margin: 0 0 3px; text-align: center; text-transform: uppercase; }',
    '.receipt-small .company-phone { margin: 0 0 5px; text-align: center; }',
    '.receipt-small .title { border-bottom: 1px dashed #000; border-top: 1px dashed #000; font-weight: bold; margin: 6px 0; padding: 5px 0; text-align: center; text-transform: uppercase; }',
    '.receipt-small p { line-height: 1.25; margin: 2px 0; }',
    '.receipt-small strong { font-weight: 800; }',
    '.receipt-small .total { border-bottom: 1px dashed #000; border-top: 1px dashed #000; font-size: 16px; font-weight: bold; margin: 8px 0; padding: 6px 0; text-align: center; }',
    '.receipt-small .thanks { font-weight: bold; margin-top: 8px; text-align: center; }',
    '@page { size: A4 portrait; margin: 10mm; }',
    '@media print { body { background: #fff !important; color: #000 !important; } .receipt-small { break-inside: avoid; page-break-inside: avoid; } }'
  ].join('');
  const html = `
    <main class="receipt-small">
      <h1>${escapeHtml(company.nome || 'Retífica OS')}</h1>
      <div class="company-phone">${companyPhone}</div>
      <div class="title">Comprovante de pagamento</div>
      ${optionalLine('OS nº', order.numeroOs)}
      ${optionalLine('Cliente', order.cliente)}
      ${optionalLine('Telefone', order.telefone)}
      ${optionalLine('Serviço', order.tipoServico)}
      ${optionalLine('Peça/Cabeçote', order.peca)}
      <div class="total">Valor pago<br>${formatCurrency(paidAmount)}</div>
      <p><strong>Valor total:</strong> ${formatCurrency(order.valorTotal)}</p>
      <p><strong>Restante:</strong> ${formatCurrency(getOrderRemaining(order))}</p>
      ${optionalLine('Forma', order.formaPagamento)}
      ${optionalLine('Status', order.statusPagamento)}
      ${optionalDateLine('Data pagamento', order.dataPagamento)}
      <p><strong>Emissão:</strong> ${escapeHtml(new Date().toLocaleDateString('pt-BR'))}</p>
      <p class="thanks">Obrigado pela preferência.</p>
    </main>
  `;

  return safePrint(html, {
    title: `Comprovante OS ${order.numeroOs}`,
    styles,
    width: 520,
    height: 640
  });
}

function imprimirEtiquetaPeca(order) {
  if (!order) return false;
  const company = getCompanySettings();
  const optionalRow = function (label, value) {
    return value ?`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` : '';
  };
  const vehicle = [order.carro, order.ano].filter(Boolean).join(' ');
  const shortNote = order.observacoesPeca
    ?`<div class="label-note"><strong>Obs. peça:</strong> ${escapeHtml(order.observacoesPeca)}</div>`
    : '';
  const styles = [
    'body { background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; }',
    '.label-sheet { padding: 0; }',
    '.part-label { width: 90mm; min-height: 60mm; border: 2px solid #000; box-sizing: border-box; padding: 7mm; }',
    '.company { border-bottom: 1px solid #000; font-size: 13px; font-weight: 800; margin: 0 0 5px; padding-bottom: 4px; text-transform: uppercase; }',
    '.os-code { font-size: 24px; font-weight: 900; line-height: 1; margin: 0 0 6px; }',
    '.status { border: 1px solid #000; display: inline-block; font-size: 10px; font-weight: 800; margin-bottom: 6px; padding: 2px 5px; text-transform: uppercase; }',
    'p { font-size: 11px; line-height: 1.2; margin: 2px 0; }',
    'p strong { font-weight: 800; }',
    '.label-note { border-top: 1px solid #777; font-size: 10px; line-height: 1.2; margin-top: 5px; padding-top: 4px; }',
    '@page { size: A4 portrait; margin: 10mm; }',
    '@media print { body { background: #fff !important; color: #000 !important; } .part-label { break-inside: avoid; page-break-inside: avoid; } }'
  ].join('');
  const html = `
    <main class="label-sheet">
      <section class="part-label">
        <p class="company">${escapeHtml(company.nome || 'Retífica OS')}</p>
        <h1 class="os-code">OS nº ${escapeHtml(order.numeroOs)}</h1>
        <div class="status">${escapeHtml(order.statusServico || 'Não informado')}</div>
        ${optionalRow('Cliente', order.cliente)}
        ${optionalRow('Telefone', order.telefone)}
        ${optionalRow('Veículo', vehicle)}
        ${optionalRow('Motor', order.motor)}
        ${optionalRow('Peça/Cabeçote', order.peca)}
        ${optionalRow('Serviço', order.tipoServico)}
        ${optionalRow('Entrada', formatDate(order.dataEntrada))}
        ${optionalRow('Previsão', order.previsaoEntrega ?formatDate(order.previsaoEntrega) : '')}
        ${shortNote}
      </section>
    </main>
  `;

  return safePrint(html, {
    title: `Etiqueta OS ${order.numeroOs}`,
    styles,
    width: 700,
    height: 520
  });
}

function imprimirFolhaEtiquetas(orders) {
  const workshopStatuses = ['orçamento', 'aguardando aprovação', 'aprovado', 'recebido', 'em análise', 'em execução', 'finalizado'];
  const labelOrders = (Array.isArray(orders) ?orders : []).filter(function (order) {
    return workshopStatuses.includes(order.statusServico);
  });
  if (!labelOrders.length) {
    alert('Nenhuma peça na oficina encontrada para imprimir etiquetas.');
    return false;
  }

  const company = getCompanySettings();
  const optionalLine = function (label, value) {
    return value ?`<p class="label-secondary"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` : '';
  };
  const optionalMainLine = function (label, value, className) {
    return value ?`<div class="${className || 'label-main-info'}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>` : '';
  };
  const optionalMetaLine = function (label, value) {
    return value ?`<span class="label-secondary"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>` : '';
  };
  const labelsHtml = labelOrders.map(function (order) {
    const vehicle = [order.carro, order.ano].filter(Boolean).join(' ');
    return `
      <article class="label-card">
        <div class="label-top">
          <div class="label-meta-row">
            <p class="company">${escapeHtml(company.nome || 'Retífica OS')}</p>
            <p class="status">${escapeHtml(order.statusServico || 'Não informado')}</p>
          </div>
          <h2 class="os-number">OS Nº ${escapeHtml(order.numeroOs)}</h2>
        </div>
        <div class="label-body">
          ${optionalMainLine('Cliente', order.cliente, 'label-client')}
          ${optionalMainLine('Peça', order.peca)}
          ${optionalMainLine('Serviço', order.tipoServico)}
          ${optionalLine('Veículo', vehicle)}
          ${optionalLine('Tel', order.telefone)}
        </div>
        <div class="label-footer">
          ${optionalMetaLine('Entrada', formatDate(order.dataEntrada))}
          ${optionalMetaLine('Previsão', order.previsaoEntrega ?formatDate(order.previsaoEntrega) : '')}
        </div>
      </article>
    `;
  }).join('');
  const styles = [
    'body { background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; }',
    '.labels-sheet { align-items: start; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5mm; width: 194mm; max-width: 100%; }',
    '.label-card { border: 2px solid #000; box-sizing: border-box; break-inside: avoid; display: flex; flex-direction: column; font-family: Arial, sans-serif; font-size: 10px; min-height: 68mm; overflow-wrap: anywhere; padding: 8px; page-break-inside: avoid; }',
    '.label-top { border-bottom: 1px solid #000; margin-bottom: 7px; padding-bottom: 6px; }',
    '.label-meta-row { align-items: flex-start; display: flex; gap: 6px; justify-content: space-between; margin-bottom: 5px; }',
    '.label-card .company { font-size: 9px; font-weight: 800; letter-spacing: 0; margin: 0; text-transform: uppercase; }',
    '.label-card .os-number { font-size: 28px; font-weight: 900; line-height: 0.95; margin: 0; }',
    '.label-card .status { border: 1px solid #000; display: inline-block; flex: 0 0 auto; font-size: 9px; font-weight: 800; line-height: 1; margin: 0; max-width: 34mm; padding: 3px 5px; text-align: center; text-transform: uppercase; }',
    '.label-body { display: grid; flex: 1; gap: 5px; }',
    '.label-card p { line-height: 1.18; margin: 0; }',
    '.label-card .label-client span { display: block; font-size: 18px; font-weight: 900; line-height: 1.12; }',
    '.label-card .label-client strong { display: block; font-size: 10px; line-height: 1; text-transform: uppercase; }',
    '.label-card .label-main-info span { display: block; font-size: 14px; font-weight: 800; line-height: 1.14; }',
    '.label-card .label-main-info strong { display: block; font-size: 10px; line-height: 1; text-transform: uppercase; }',
    '.label-card .label-secondary { font-size: 11px; line-height: 1.15; }',
    '.label-footer { border-top: 1px solid #000; display: flex; flex-wrap: wrap; gap: 5px 10px; justify-content: space-between; margin-top: auto; padding-top: 5px; }',
    '.label-card strong { font-weight: 800; }',
    '@page { size: A4 portrait; margin: 8mm; }',
    '@media print { body { background: #fff !important; color: #000 !important; } }'
  ].join('');
  const html = `<main class="labels-sheet">${labelsHtml}</main>`;

  return safePrint(html, {
    title: 'Folha de etiquetas',
    styles,
    width: 900,
    height: 700
  });
}

function isOrderLate(order) {
  if (!order.previsaoEntrega || ['entregue', 'finalizado', 'recusado'].includes(order.statusServico)) return false;
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
    const restante = getOrderRemaining(order);
    const financialRelevant = isOrderFinanciallyRelevant(order);

    acc.totalOrdens += 1;
    acc.totalServicos += financialRelevant ?total : 0;
    acc.recebido += recebido;
    acc.pendente += restante;
    if (order.statusServico === 'orçamento') acc.orcamento += 1;
    if (order.statusServico === 'aguardando aprovação') acc.aguardandoAprovacao += 1;
    if (order.statusServico === 'aprovado') acc.aprovadas += 1;
    if (order.statusServico === 'recusado') acc.recusadas += 1;
    if (order.statusServico === 'recebido') acc.recebidas += 1;
    if (order.statusServico === 'em análise') acc.emAnalise += 1;
    if (order.statusServico === 'em execução') acc.emExecucao += 1;
    if (order.statusServico === 'finalizado') acc.finalizadas += 1;
    if (order.statusServico === 'entregue') acc.entregues += 1;
    if (order.statusPagamento === 'sem cobrança') acc.semCobranca += 1;
    if (isWorkInProgress(order)) acc.andamento += 1;
    if (restante > 0) acc.pagamentoPendente += 1;
    return acc;
  }, {
    totalOrdens: 0,
    orcamento: 0,
    aguardandoAprovacao: 0,
    aprovadas: 0,
    recusadas: 0,
    recebidas: 0,
    emAnalise: 0,
    emExecucao: 0,
    andamento: 0,
    finalizadas: 0,
    entregues: 0,
    pagamentoPendente: 0,
    semCobranca: 0,
    recebido: 0,
    pendente: 0,
    totalServicos: 0
  });
}
