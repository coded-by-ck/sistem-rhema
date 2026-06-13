(function () {
  const form = document.getElementById('osForm');
  const list = document.getElementById('ordersList');
  const serviceSearch = document.getElementById('serviceSearch');
  const statusFilter = document.getElementById('statusFilter');
  const paymentFilter = document.getElementById('paymentFilter');
  const clientSearch = document.getElementById('clientSearch');
  const clientMetrics = document.getElementById('clientMetrics');
  const clientsList = document.getElementById('clientsList');
  const clientHistory = document.getElementById('clientHistory');
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id') || params.get('edit');
  let selectedClientKey = '';

  function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ?number : 0;
  }

  function getPhoneForWhatsApp(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ?digits : `55${digits}`;
  }

  function createWhatsAppLink(order) {
    // WhatsApp: monta uma mensagem padrão com resumo da OS e valores atuais.
    const phone = getPhoneForWhatsApp(order.telefone);
    const companyName = getCompanySignature();
    const message = [
      `Olá, ${order.cliente || 'cliente'}. Aqui é da ${companyName}.`,
      `Sua OS nº ${order.numeroOs} referente ao cabeçote/peça ${order.peca || 'não informada'} do veículo ${order.carro || 'não informado'} está com status: ${order.statusServico}.`,
      `Valor total: ${formatCurrency(order.valorTotal)}.`,
      `Valor pendente: ${formatCurrency(getOrderRemaining(order))}.`
    ].join(' ');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function createBudgetWhatsAppLink(order) {
    const phone = getPhoneForWhatsApp(order.telefone);
    const companyName = getCompanySignature();
    const budgetValue = toNumber(order.valorOrcado) || toNumber(order.valorTotal);
    const message = [
      `Olá, ${order.cliente || 'cliente'}. Aqui é da ${companyName}.`,
      `Já avaliamos sua peça/cabeçote referente à OS nº ${order.numeroOs}.`,
      `O orçamento ficou em ${formatCurrency(budgetValue)}.`,
      'Podemos seguir com a execução do serviço?'
    ].join(' ');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function collectOrderFromForm(existingOrder) {
    // Geração de OS: normaliza campos do formulário antes de salvar no localStorage.
    const data = new FormData(form);
    const valorTotal = toNumber(data.get('valorTotal'));
    const valorEntrada = Math.min(toNumber(data.get('valorEntrada')), valorTotal);
    const statusPagamento = data.get('statusPagamento');
    const statusServico = data.get('statusServico');
    const approvedByStatus = statusServico === 'aprovado' || statusServico === 'em execução' || statusServico === 'finalizado' || statusServico === 'entregue';
    const aprovadoCliente = approvedByStatus ?'sim' : (data.get('aprovadoCliente') || 'não');
    const dataAprovacao = aprovadoCliente === 'sim'
      ?(data.get('dataAprovacao') || RetificaStorage.getTodayIso())
      : (data.get('dataAprovacao') || '');
    const dataRetirada = statusServico === 'entregue'
      ?(data.get('dataRetirada') || RetificaStorage.getTodayIso())
      : (data.get('dataRetirada') || '');

    // Em edição, número e data original são preservados mesmo se o HTML for alterado no navegador.
    return {
      id: existingOrder ?existingOrder.id : (window.crypto && crypto.randomUUID ?crypto.randomUUID() : String(Date.now())),
      numeroOs: existingOrder ?existingOrder.numeroOs : data.get('numeroOs'),
      dataEntrada: existingOrder ?existingOrder.dataEntrada : data.get('dataEntrada'),
      cliente: String(data.get('cliente') || '').trim(),
      telefone: String(data.get('telefone') || '').trim(),
      carro: String(data.get('carro') || '').trim(),
      ano: data.get('ano') || '',
      motor: String(data.get('motor') || '').trim(),
      peca: String(data.get('peca') || '').trim(),
      tipoServico: String(data.get('tipoServico') || '').trim(),
      valorTotal,
      valorEntrada,
      valorRestante: statusPagamento === 'pago' ?0 : Math.max(valorTotal - valorEntrada, 0),
      statusServico,
      statusPagamento,
      previsaoEntrega: data.get('previsaoEntrega') || '',
      valorOrcado: toNumber(data.get('valorOrcado')),
      dataOrcamento: data.get('dataOrcamento') || '',
      aprovadoCliente,
      dataAprovacao,
      observacaoOrcamento: String(data.get('observacaoOrcamento') || '').trim(),
      dataRetirada,
      retiradoPor: String(data.get('retiradoPor') || '').trim(),
      observacaoRetirada: String(data.get('observacaoRetirada') || '').trim(),
      observacoesPeca: String(data.get('observacoesPeca') || '').trim(),
      observacoesGerais: String(data.get('observacoesGerais') || '').trim(),
      criadoEm: existingOrder ?existingOrder.criadoEm : new Date().toISOString()
    };
  }

  function updateRemainingPreview() {
    if (!form) return;
    const valorTotal = toNumber(form.valorTotal.value);
    const valorEntrada = toNumber(form.valorEntrada.value);
    const statusPagamento = form.statusPagamento.value;
    const remaining = statusPagamento === 'pago' ?0 : Math.max(valorTotal - valorEntrada, 0);
    document.getElementById('valorRestante').value = formatCurrency(remaining);
  }

  function fillForm(order) {
    form.numeroOs.value = order.numeroOs || '';
    form.dataEntrada.value = order.dataEntrada || '';
    form.cliente.value = order.cliente || '';
    form.telefone.value = order.telefone || '';
    form.carro.value = order.carro || '';
    form.ano.value = order.ano || '';
    form.motor.value = order.motor || '';
    form.peca.value = order.peca || '';
    form.tipoServico.value = order.tipoServico || '';
    form.valorTotal.value = toNumber(order.valorTotal);
    form.valorEntrada.value = toNumber(order.valorEntrada);
    form.statusServico.value = order.statusServico || 'recebido';
    form.statusPagamento.value = order.statusPagamento || 'pendente';
    form.previsaoEntrega.value = order.previsaoEntrega || '';
    form.valorOrcado.value = toNumber(order.valorOrcado) || '';
    form.dataOrcamento.value = order.dataOrcamento || '';
    form.aprovadoCliente.value = order.aprovadoCliente || 'não';
    form.dataAprovacao.value = order.dataAprovacao || '';
    form.observacaoOrcamento.value = order.observacaoOrcamento || '';
    form.dataRetirada.value = order.dataRetirada || '';
    form.retiradoPor.value = order.retiradoPor || '';
    form.observacaoRetirada.value = order.observacaoRetirada || '';
    form.observacoesPeca.value = order.observacoesPeca || '';
    form.observacoesGerais.value = order.observacoesGerais || '';
    updateRemainingPreview();
  }

  if (form) {
    const existingOrder = editId ?RetificaStorage.getOrderById(editId) : null;
    const formTitle = document.getElementById('formTitle');
    const submitButton = document.getElementById('submitButton');

    if (editId && !existingOrder) {
      alert('OS não encontrada. Você será redirecionado para a lista de serviços.');
      window.location.href = 'servicos.html';
      return;
    }

    if (existingOrder) {
      formTitle.textContent = 'Editar ordem de serviço';
      submitButton.textContent = 'Salvar alterações';
      fillForm(existingOrder);
    } else {
      form.numeroOs.value = RetificaStorage.getNextOrderNumber();
      form.dataEntrada.value = RetificaStorage.getTodayIso();
      updateRemainingPreview();
    }

    ['input', 'change'].forEach(function (eventName) {
      form.valorTotal.addEventListener(eventName, updateRemainingPreview);
      form.valorEntrada.addEventListener(eventName, updateRemainingPreview);
      form.statusPagamento.addEventListener(eventName, updateRemainingPreview);
    });
    form.statusServico.addEventListener('change', function () {
      if (form.statusServico.value === 'entregue' && !form.dataRetirada.value) {
        form.dataRetirada.value = RetificaStorage.getTodayIso();
      }
      if (['aprovado', 'em execução', 'finalizado', 'entregue'].includes(form.statusServico.value)) {
        form.aprovadoCliente.value = 'sim';
        if (!form.dataAprovacao.value) form.dataAprovacao.value = RetificaStorage.getTodayIso();
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const order = collectOrderFromForm(existingOrder);

      if (existingOrder) {
        RetificaStorage.updateOrder(existingOrder.id, order);
        setFlashMessage('OS atualizada com sucesso.');
      } else {
        RetificaStorage.saveOrder(order);
        setFlashMessage('OS salva com sucesso.');
      }

      window.location.href = 'servicos.html';
    });
  }

  function imprimirOS(order) {
    // Aplicar configurações na impressão: usa logo, contato e textos padrão da empresa.
    const company = getCompanySettings();
    const companyLogo = company.logo
      ?`<img class="print-logo" src="${company.logo}" alt="Logo">`
      :`<div class="print-logo-fallback">${escapeHtml(company.sigla || 'RO')}</div>`;
    const companyInfo = [company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : '', company.email, company.horario]
      .filter(Boolean)
      .map(function (item) { return `<p>${escapeHtml(item)}</p>`; })
      .join('');
    const optionalItem = function (label, value) {
      return value ?`<div class="item"><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>` : '';
    };
    const optionalDateItem = function (label, value) {
      return value ?optionalItem(label, formatDate(value)) : '';
    };
    const optionalMoneyItem = function (label, value) {
      return toNumber(value) > 0 ?`<div class="item"><strong>${escapeHtml(label)}</strong>${formatCurrency(value)}</div>` : '';
    };
    const optionalNotes = function (title, value, className) {
      return value ?`<section class="${className || 'compact-section'}"><h2>${escapeHtml(title)}</h2><div class="notes">${escapeHtml(value)}</div></section>` : '';
    };
    const budgetItems = [
      optionalMoneyItem('Valor orçado', order.valorOrcado),
      optionalDateItem('Data do orçamento', order.dataOrcamento),
      ['orçamento', 'aguardando aprovação', 'aprovado', 'recusado'].includes(order.statusServico) || order.dataAprovacao || order.observacaoOrcamento
        ?optionalItem('Aprovado pelo cliente', order.aprovadoCliente || 'não')
        : '',
      optionalDateItem('Data de aprovação', order.dataAprovacao)
    ].join('');
    const withdrawalItems = [
      optionalDateItem('Data de retirada', order.dataRetirada),
      optionalItem('Retirado por', order.retiradoPor)
    ].join('');
    const budgetSection = budgetItems || order.observacaoOrcamento
      ?`<section class="compact-section"><h2>Orçamento e aprovação</h2>${budgetItems ?`<div class="grid">${budgetItems}</div>` : ''}${order.observacaoOrcamento ?`<div class="notes">${escapeHtml(order.observacaoOrcamento)}</div>` : ''}</section>`
      : '';
    const withdrawalSection = withdrawalItems || order.observacaoRetirada
      ?`<section class="compact-section"><h2>Retirada</h2>${withdrawalItems ?`<div class="grid">${withdrawalItems}</div>` : ''}${order.observacaoRetirada ?`<div class="notes">${escapeHtml(order.observacaoRetirada)}</div>` : ''}</section>`
      : '';
    const defaultNotes = company.observacoesPadrao
      ?`<section class="observacoes-padrao"><h2>Observações padrão da empresa</h2><div class="notes observacoes-padrao-box">${escapeHtml(company.observacoesPadrao)}</div></section>`
      : '';
    const footerText = company.rodapeOs ?`<footer class="print-footer">${escapeHtml(company.rodapeOs)}</footer>` : '';
    const styles = [
      'html, body { height: auto; min-height: 0; }',
      'body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.3; margin: 0; }',
      '.print-area, .print-page { width: 100%; max-width: 190mm; margin: 0 auto; padding: 0; page-break-after: avoid; break-after: avoid; }',
      'header { align-items: center; border-bottom: 1px solid #111827; display: flex; gap: 12px; margin-bottom: 8px; padding-bottom: 7px; break-inside: avoid; page-break-inside: avoid; }',
      'header p { margin: 2px 0; }',
      'p { margin: 2px 0; }',
      '.print-logo, .print-logo-fallback { width: 50px; height: 50px; border: 1px solid #d1d5db; object-fit: contain; }',
      '.print-logo-fallback { display: grid; place-items: center; font-weight: 800; }',
      'h1 { font-size: 20px; margin: 0 0 6px; }',
      'h2, h3 { border-bottom: 1px solid #d1d5db; font-size: 14px; margin: 8px 0 5px; padding-bottom: 2px; }',
      '.compact-section { break-inside: avoid; page-break-inside: avoid; }',
      '.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }',
      '.item { font-size: 12px; min-height: 0; }',
      '.item strong { display: block; color: #4b5563; font-size: 9px; line-height: 1.15; text-transform: uppercase; }',
      '.notes { border: 1px solid #d1d5db; min-height: auto; padding: 6px; white-space: pre-wrap; font-size: 11px; line-height: 1.25; }',
      '.observacoes-padrao, .signatures, .print-signatures, .footer, .print-footer { break-inside: avoid; page-break-inside: avoid; }',
      '.observacoes-padrao h2 { margin-top: 6px; }',
      '.observacoes-padrao-box { min-height: auto; max-height: 48px; overflow: hidden; padding: 6px; margin-top: 4px; }',
      '.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; }',
      '.signature { border-top: 1px solid #111827; padding-top: 4px; text-align: center; font-size: 11px; }',
      'footer { border-top: 1px solid #d1d5db; color: #4b5563; max-height: 34px; overflow: hidden; margin-top: 6px; padding-top: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.18; }',
      '@page { size: A4 portrait; margin: 7mm; }',
      '@media print { body { background: #fff !important; color: #000 !important; font-family: Arial, sans-serif; } .print-area, .print-page { width: 100%; max-width: 190mm; } }'
    ].join('');

    const html = `
      <main class="print-area print-page">
        <header>
          ${companyLogo}
          <div>
            <h1>${escapeHtml(company.nome || 'Retífica OS')}</h1>
            ${companyInfo}
            <p><strong>Ordem de Serviço nº</strong> ${escapeHtml(order.numeroOs)}</p>
          </div>
        </header>

        <h2>Dados do cliente</h2>
        <section class="grid">
          <div class="item"><strong>Cliente</strong>${escapeHtml(order.cliente || 'Não informado')}</div>
          <div class="item"><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</div>
        </section>

        <h2>Dados do veículo e peça</h2>
        <section class="grid">
          <div class="item"><strong>Veículo</strong>${escapeHtml(order.carro || 'Não informado')}</div>
          <div class="item"><strong>Ano</strong>${escapeHtml(order.ano || 'Não informado')}</div>
          <div class="item"><strong>Motor</strong>${escapeHtml(order.motor || 'Não informado')}</div>
          <div class="item"><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</div>
        </section>

        <h2>Serviço solicitado</h2>
        <section class="grid">
          <div class="item"><strong>Serviço</strong>${escapeHtml(order.tipoServico || 'Não informado')}</div>
          <div class="item"><strong>Status do serviço</strong>${escapeHtml(order.statusServico || 'Não informado')}</div>
          <div class="item"><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</div>
          <div class="item"><strong>Previsão de entrega</strong>${formatDate(order.previsaoEntrega)}</div>
        </section>

        <h2>Valores</h2>
        <section class="grid">
          <div class="item"><strong>Valor total</strong>${formatCurrency(order.valorTotal)}</div>
          <div class="item"><strong>Entrada</strong>${formatCurrency(order.valorEntrada)}</div>
          <div class="item"><strong>Restante</strong>${formatCurrency(getOrderRemaining(order))}</div>
          <div class="item"><strong>Status do pagamento</strong>${escapeHtml(order.statusPagamento || 'Não informado')}</div>
        </section>

        ${budgetSection}
        ${withdrawalSection}
        ${optionalNotes('Observações da peça', order.observacoesPeca)}
        ${optionalNotes('Observações gerais', order.observacoesGerais)}

        ${defaultNotes}
        ${footerText}
        <section class="signatures">
          <div class="signature">Assinatura do cliente</div>
          <div class="signature">Assinatura da empresa</div>
        </section>
      </main>
    `;

    safePrint(html, {
      title: `${order.numeroOs} - Retífica OS`,
      styles,
      width: 900,
      height: 700
    });
  }

  function markOrderPaid(order) {
    RetificaStorage.updateOrder(order.id, {
      ...order,
      statusPagamento: 'pago',
      valorEntrada: toNumber(order.valorTotal),
      valorRestante: 0
    });
  }

  function approveOrder(order) {
    RetificaStorage.updateOrder(order.id, {
      ...order,
      statusServico: 'aprovado',
      aprovadoCliente: 'sim',
      dataAprovacao: order.dataAprovacao || RetificaStorage.getTodayIso()
    });
  }

  function rejectOrder(order) {
    RetificaStorage.updateOrder(order.id, {
      ...order,
      statusServico: 'recusado',
      aprovadoCliente: 'não'
    });
  }

  function canSendBudget(order) {
    return toNumber(order.valorOrcado) > 0 || ['orçamento', 'aguardando aprovação'].includes(order.statusServico);
  }

  function canApproveOrReject(order) {
    return ['orçamento', 'aguardando aprovação'].includes(order.statusServico);
  }

  function renderOrderCard(order) {
    const late = isOrderLate(order);
    const remaining = getOrderRemaining(order);
    const lateBadge = late ?'<span class="badge danger">Atrasada</span>' : '';
    const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';
    const paymentSummaryClass = remaining > 0 ?'value-pending' : 'value-paid';
    const waitingApproval = order.statusServico === 'aguardando aprovação';
    const sendBudgetAction = canSendBudget(order)
      ?`<a class="btn btn-mini btn-mini-whatsapp" href="${createBudgetWhatsAppLink(order)}" target="_blank" rel="noopener">Enviar orçamento</a>`
      : '';
    const approvalActions = canApproveOrReject(order)
      ?`<button class="btn btn-mini btn-mini-success" type="button" data-action="approve" data-id="${escapeHtml(order.id)}">Aprovado</button>
        <button class="btn btn-mini btn-mini-danger" type="button" data-action="reject" data-id="${escapeHtml(order.id)}">Recusado</button>`
      : '';

    return `
      <article class="order-card ${late ?'is-late' : ''} ${waitingApproval ?'waiting-approval' : ''}" data-id="${escapeHtml(order.id)}">
        <div class="order-card-head">
          <div>
            <span class="os-number">${escapeHtml(order.numeroOs)}</span>
            <h3>${escapeHtml(order.cliente || 'Cliente não informado')} ${demoBadge}</h3>
          </div>
          ${lateBadge}
        </div>
        <div class="order-info-grid">
          <span><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</span>
          <span><strong>Veículo</strong>${escapeHtml(order.carro || 'Não informado')} ${escapeHtml(order.ano)}</span>
          <span><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</span>
          <span><strong>Serviço</strong>${escapeHtml(order.tipoServico || 'Não informado')}</span>
          <span><strong>Valor orçado</strong><span class="money-value">${formatCurrency(order.valorOrcado)}</span></span>
          <span><strong>Aprovação</strong>${escapeHtml(order.aprovadoCliente || 'não')} ${order.dataAprovacao ?`em ${formatDate(order.dataAprovacao)}` : ''}</span>
          <span><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</span>
          <span><strong>Previsão</strong>${formatDate(order.previsaoEntrega)}</span>
        </div>
        <div class="order-values">
          <span><strong>Total</strong><span class="money-value">${formatCurrency(order.valorTotal)}</span></span>
          <span><strong>Entrada</strong><span class="money-value">${formatCurrency(order.valorEntrada)}</span></span>
          <span class="${paymentSummaryClass}"><strong>Restante</strong><span class="money-value">${formatCurrency(remaining)}</span></span>
        </div>
        <div class="status-row">
          <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
          <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
        </div>
        <div class="quick-actions">
          ${sendBudgetAction}
          ${approvalActions}
          <button class="btn btn-mini" type="button" data-action="status" data-status="em execução" data-id="${escapeHtml(order.id)}">Em execução</button>
          <button class="btn btn-mini" type="button" data-action="status" data-status="finalizado" data-id="${escapeHtml(order.id)}">Finalizado</button>
          <button class="btn btn-mini" type="button" data-action="status" data-status="entregue" data-id="${escapeHtml(order.id)}">Entregue</button>
          <button class="btn btn-mini btn-mini-success" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Pago</button>
        </div>
        <div class="card-actions">
          <a class="btn btn-secondary" href="nova-os.html?id=${encodeURIComponent(order.id)}">Editar</a>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(order.id)}">Excluir</button>
          <a class="btn btn-whatsapp" href="${createWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="btn btn-secondary" type="button" data-action="print" data-id="${escapeHtml(order.id)}">Imprimir OS</button>
        </div>
      </article>
    `;
  }

  function renderOrders() {
    if (!list) return;
    const search = serviceSearch ?serviceSearch.value.trim().toLowerCase() : '';
    const selectedStatus = statusFilter.value;
    const selectedPayment = paymentFilter.value;
    const allOrders = RetificaStorage.getOrders();
    const orders = allOrders.filter(function (order) {
      const searchableText = [getOrderSearchText(order), order.cliente, order.telefone, order.carro, order.peca, order.tipoServico].join(' ').toLowerCase();
      const searchMatch = !search || searchableText.includes(search);
      const statusMatch = selectedStatus === 'todos' || order.statusServico === selectedStatus;
      const paymentMatch = selectedPayment === 'todos' || order.statusPagamento === selectedPayment;
      return searchMatch && statusMatch && paymentMatch;
    });

    list.innerHTML = orders.length
      ?orders.map(renderOrderCard).join('')
      : '<div class="empty-state">Nenhuma ordem de serviço encontrada.</div>';
  }

  function updateOrderStatus(order, status) {
    // Atualização de status: ação rápida nos cards sem alterar dados financeiros.
    const updates = { ...order, statusServico: status };
    if (status === 'entregue' && !order.dataRetirada) updates.dataRetirada = RetificaStorage.getTodayIso();
    if (['em execução', 'finalizado', 'entregue'].includes(status)) {
      updates.aprovadoCliente = 'sim';
      updates.dataAprovacao = order.dataAprovacao || RetificaStorage.getTodayIso();
    }
    RetificaStorage.updateOrder(order.id, updates);
    renderOrders();
    showAppMessage('Status atualizado.');
  }

  if (list) {
    list.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const order = RetificaStorage.getOrderById(button.dataset.id);
      if (!order) return;

      if (button.dataset.action === 'delete') {
        if (confirm(`Tem certeza que deseja excluir a OS nº ${order.numeroOs}? Esta ação não pode ser desfeita.`)) {
          RetificaStorage.deleteOrder(order.id);
          renderOrders();
        }
      }

      if (button.dataset.action === 'print') imprimirOS(order);
      if (button.dataset.action === 'status') updateOrderStatus(order, button.dataset.status);
      if (button.dataset.action === 'approve') {
        approveOrder(order);
        renderOrders();
        showAppMessage('OS marcada como aprovada.');
      }
      if (button.dataset.action === 'reject') {
        rejectOrder(order);
        renderOrders();
        showAppMessage('OS marcada como recusada.');
      }
      if (button.dataset.action === 'paid') {
        markOrderPaid(order);
        renderOrders();
        showAppMessage('Pagamento marcado como pago.');
      }
    });
  }

  function clientKey(order) {
    const phone = String(order.telefone || '').replace(/\D/g, '');
    return phone || String(order.cliente || 'cliente-sem-telefone').trim().toLowerCase();
  }

  function buildClients() {
    const grouped = RetificaStorage.getOrders().reduce(function (acc, order) {
      const key = clientKey(order);
      if (!acc[key]) {
        acc[key] = {
          key,
          cliente: order.cliente || 'Cliente não informado',
          telefone: order.telefone || 'Não informado',
          nomes: [],
          ordens: []
        };
      }
      const orderName = String(order.cliente || '').trim();
      if (orderName && !acc[key].nomes.some(function (name) { return name.toLowerCase() === orderName.toLowerCase(); })) {
        acc[key].nomes.push(orderName);
      }
      acc[key].ordens.push(order);
      return acc;
    }, {});

    return Object.values(grouped).map(function (client) {
      client.ordens.sort(function (a, b) {
        return String(b.dataEntrada || '').localeCompare(String(a.dataEntrada || ''));
      });
      client.totalGasto = client.ordens.reduce(function (sum, order) {
        return sum + toNumber(order.valorTotal);
      }, 0);
      client.valorPendente = client.ordens.reduce(function (sum, order) {
        return sum + getOrderRemaining(order);
      }, 0);
      client.ultimaOs = client.ordens[0] || null;
      client.cliente = client.ultimaOs && client.ultimaOs.cliente ?client.ultimaOs.cliente : client.cliente;
      client.nomes = client.nomes.length ?client.nomes : [client.cliente];
      client.ultimoVeiculo = client.ultimaOs ?client.ultimaOs.carro : '';
      return client;
    });
  }

  function getAlsoKnownNames(client) {
    return client.nomes.filter(function (name) {
      return name.toLowerCase() !== String(client.cliente || '').toLowerCase();
    });
  }

  function formatClientMetricName(client) {
    const extraNames = getAlsoKnownNames(client).length;
    return extraNames > 0 ?`${client.cliente} +${extraNames} nome` : client.cliente;
  }

  function clientMatchesSearch(client, search) {
    if (!search) return true;
    const historyText = client.ordens.map(function (order) {
      return [getOrderSearchText(order), order.carro, order.telefone, order.cliente].join(' ');
    }).join(' ');
    return `${client.cliente} ${client.telefone} ${client.nomes.join(' ')} ${historyText}`.toLowerCase().includes(search);
  }

  function renderClientMetrics(clients) {
    if (!clientMetrics) return;
    const topClient = clients.reduce(function (top, client) {
      if (!top || client.totalGasto > top.totalGasto) return client;
      return top;
    }, null);
    const totalFaturado = clients.reduce(function (sum, client) {
      return sum + client.totalGasto;
    }, 0);
    const hasPending = clients.some(function (client) {
      return client.valorPendente > 0;
    });
    const cards = [
      ['Total de clientes', clients.length, ''],
      ['Clientes com pendência', clients.filter(function (client) { return client.valorPendente > 0; }).length, hasPending ?'alert' : 'success'],
      ['Total faturado por clientes', `<span class="money-value">${formatCurrency(totalFaturado)}</span>`, 'success'],
      ['Maior valor em serviços', topClient ?`${escapeHtml(formatClientMetricName(topClient))} <span class="money-value">${formatCurrency(topClient.totalGasto)}</span>` : 'Nenhum cliente', '']
    ];

    clientMetrics.innerHTML = cards.map(function (card) {
      return `<article class="metric-card ${card[2]}"><span>${card[0]}</span><strong>${card[1]}</strong></article>`;
    }).join('');
  }

  function renderClientHistory(client) {
    if (!clientHistory) return;
    if (!client) {
      clientHistory.innerHTML = 'Selecione um cliente para visualizar o histórico.';
      clientHistory.className = 'empty-state';
      return;
    }

    clientHistory.className = 'client-history-content';
    const pendingAlert = client.valorPendente > 0
      ?`<div class="client-alert">Valor pendente: <span class="money-value">${formatCurrency(client.valorPendente)}</span></div>`
      : '<div class="client-alert success">Cliente em dia</div>';

    const ordersHtml = client.ordens.map(function (order) {
      const remaining = getOrderRemaining(order);
      const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';
      const sendBudgetAction = canSendBudget(order)
        ?`<a class="btn btn-whatsapp" href="${createBudgetWhatsAppLink(order)}" target="_blank" rel="noopener">Enviar orçamento</a>`
        : '';
      const approvalActions = canApproveOrReject(order)
        ?`<button class="btn btn-secondary" type="button" data-action="approve" data-id="${escapeHtml(order.id)}">Marcar como aprovado</button>
          <button class="btn btn-danger" type="button" data-action="reject" data-id="${escapeHtml(order.id)}">Marcar como recusado</button>`
        : '';
      const paidButton = remaining > 0 || order.statusPagamento !== 'pago'
        ?`<button class="btn btn-mini btn-mini-success" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Marcar como pago</button>`
        : '';
      const hasBudgetContext = toNumber(order.valorOrcado) > 0
        || order.dataOrcamento
        || order.dataAprovacao
        || order.observacaoOrcamento
        || ['orçamento', 'aguardando aprovação', 'aprovado', 'recusado'].includes(order.statusServico);
      const budgetGridItems = [
        toNumber(order.valorOrcado) > 0 ?`<span><strong>Valor orçado</strong><span class="money-value">${formatCurrency(order.valorOrcado)}</span></span>` : '',
        order.dataOrcamento ?`<span><strong>Data do orçamento</strong>${formatDate(order.dataOrcamento)}</span>` : '',
        hasBudgetContext ?`<span><strong>Aprovação</strong>${escapeHtml(order.aprovadoCliente || 'não')}</span>` : '',
        order.dataAprovacao ?`<span><strong>Data de aprovação</strong>${formatDate(order.dataAprovacao)}</span>` : '',
        order.dataRetirada ?`<span><strong>Data de retirada</strong>${formatDate(order.dataRetirada)}</span>` : '',
        order.retiradoPor ?`<span><strong>Retirado por</strong>${escapeHtml(order.retiradoPor)}</span>` : ''
      ].join('');
      const budgetNotes = order.observacaoOrcamento
        ?`<div class="history-notes">
          <strong>Observação do orçamento</strong>
          <p>${escapeHtml(order.observacaoOrcamento)}</p>
        </div>`
        : '';
      const withdrawalNotes = order.observacaoRetirada
        ?`<div class="history-notes">
          <strong>Observação de retirada</strong>
          <p>${escapeHtml(order.observacaoRetirada)}</p>
        </div>`
        : '';
      return `
        <article class="history-order ${remaining > 0 ?'has-pending' : ''}">
          <div class="history-order-head">
            <span class="os-number">${escapeHtml(order.numeroOs)}</span>
            ${demoBadge}
            <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
            <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
          </div>
          <div class="order-info-grid">
            <span><strong>Nome nesta OS</strong>${escapeHtml(order.cliente || 'Não informado')}</span>
            <span><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</span>
            <span><strong>Carro</strong>${escapeHtml(order.carro || 'Não informado')}</span>
            <span><strong>Ano</strong>${escapeHtml(order.ano || 'Não informado')}</span>
            <span><strong>Motor</strong>${escapeHtml(order.motor || 'Não informado')}</span>
            <span><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</span>
            <span><strong>Serviço</strong>${escapeHtml(order.tipoServico || 'Não informado')}</span>
            ${budgetGridItems}
            <span><strong>Valor total</strong><span class="money-value">${formatCurrency(order.valorTotal)}</span></span>
            <span><strong>Entrada</strong><span class="money-value">${formatCurrency(order.valorEntrada)}</span></span>
            <span class="${remaining > 0 ?'value-pending' : 'value-paid'}"><strong>Restante</strong><span class="money-value">${formatCurrency(remaining)}</span></span>
            <span><strong>Status do serviço</strong><span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico || 'Não informado')}</span></span>
            <span><strong>Status do pagamento</strong><span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento || 'Não informado')}</span></span>
            <span><strong>Previsão</strong>${formatDate(order.previsaoEntrega)}</span>
          </div>
          <div class="history-notes-grid">
            <div class="history-notes">
              <strong>Observações da peça</strong>
              <p>${escapeHtml(order.observacoesPeca || 'Sem observações.')}</p>
            </div>
            <div class="history-notes">
              <strong>Observações gerais</strong>
              <p>${escapeHtml(order.observacoesGerais || 'Sem observações.')}</p>
            </div>
            ${budgetNotes}
            ${withdrawalNotes}
          </div>
          <div class="card-actions">
            <a class="btn btn-secondary" href="nova-os.html?id=${encodeURIComponent(order.id)}">Editar OS</a>
            <button class="btn btn-secondary" type="button" data-action="print" data-id="${escapeHtml(order.id)}">Imprimir OS</button>
            <a class="btn btn-whatsapp" href="${createWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp</a>
            ${sendBudgetAction}
            ${approvalActions}
            ${paidButton}
          </div>
        </article>
      `;
    }).join('');

    clientHistory.innerHTML = `
      <div class="client-history-header">
        <div>
          <h3>${escapeHtml(client.cliente)}</h3>
          <p>${escapeHtml(client.telefone)}</p>
        </div>
        ${pendingAlert}
      </div>
      ${ordersHtml}
    `;
  }

  function renderClients() {
    if (!clientsList) return;
    const search = clientSearch.value.trim().toLowerCase();
    const allClients = buildClients();
    renderClientMetrics(allClients);

    const clients = allClients.filter(function (client) {
      return clientMatchesSearch(client, search);
    });

    if (!clients.length) {
      clientsList.innerHTML = allClients.length
        ?'<div class="empty-state">Nenhum cliente encontrado para a busca.</div>'
        : '<div class="empty-state">Nenhum cliente cadastrado ainda.</div>';
      renderClientHistory(null);
      return;
    }

    const selectedClient = selectedClientKey
      ?clients.find(function (client) { return client.key === selectedClientKey; })
      : null;

    clientsList.innerHTML = clients.map(function (client) {
      const pendingClass = client.valorPendente > 0 ?'has-pending' : '';
      const activeClass = client.key === selectedClientKey ?'is-active' : '';
      const alsoKnownNames = getAlsoKnownNames(client);
      const alsoKnownHtml = alsoKnownNames.length
        ?`<p class="also-known">Também cadastrado como: ${escapeHtml(alsoKnownNames.join(', '))}</p>`
        : '';
      return `
        <article class="client-summary ${pendingClass} ${activeClass}">
          <div>
            <h3>${escapeHtml(client.cliente)}</h3>
            <p><strong>Telefone identificador:</strong> ${escapeHtml(client.telefone)}</p>
            <p class="group-hint">Histórico agrupado por telefone</p>
            ${alsoKnownHtml}
          </div>
          <div class="client-summary-grid">
            <span><strong>Ordens</strong>${client.ordens.length}</span>
            <span><strong>Total gasto</strong><span class="money-value">${formatCurrency(client.totalGasto)}</span></span>
            <span><strong>Pendente</strong><span class="money-value">${formatCurrency(client.valorPendente)}</span></span>
            <span><strong>Última OS</strong>${client.ultimaOs ?escapeHtml(client.ultimaOs.numeroOs) : 'Nenhuma'}</span>
            <span><strong>Último veículo</strong>${escapeHtml(client.ultimoVeiculo || 'Não informado')}</span>
            <span><strong>Status geral</strong><span class="badge ${client.valorPendente > 0 ?'warning' : 'success'}">${client.valorPendente > 0 ?'Cliente com pendência' : 'Cliente em dia'}</span></span>
          </div>
          <div class="client-summary-footer">
            <span class="client-pending-label ${client.valorPendente > 0 ?'' : 'success'}">${client.valorPendente > 0 ?'Cliente com pendência' : 'Cliente em dia'}</span>
            <button class="btn btn-secondary" type="button" data-client-key="${escapeHtml(client.key)}">Ver histórico</button>
          </div>
        </article>
      `;
    }).join('');

    renderClientHistory(selectedClient);
  }

  if (clientsList) {
    clientsList.addEventListener('click', function (event) {
      const button = event.target.closest('[data-client-key]');
      if (!button) return;
      selectedClientKey = button.dataset.clientKey;
      renderClients();
    });
  }

  if (clientHistory) {
    clientHistory.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const order = RetificaStorage.getOrderById(button.dataset.id);
      if (!order) return;
      if (button.dataset.action === 'print') imprimirOS(order);
      if (button.dataset.action === 'approve') {
        approveOrder(order);
        renderClients();
        showAppMessage('OS marcada como aprovada.');
      }
      if (button.dataset.action === 'reject') {
        rejectOrder(order);
        renderClients();
        showAppMessage('OS marcada como recusada.');
      }
      if (button.dataset.action === 'paid') {
        markOrderPaid(order);
        renderClients();
        showAppMessage('Pagamento marcado como pago.');
      }
    });
  }

  if (statusFilter && paymentFilter) {
    if (serviceSearch) serviceSearch.addEventListener('input', renderOrders);
    statusFilter.addEventListener('change', renderOrders);
    paymentFilter.addEventListener('change', renderOrders);
    renderOrders();
  }

  if (clientSearch) {
    clientSearch.addEventListener('input', function () {
      selectedClientKey = '';
      renderClients();
    });
    renderClients();
  }

  window.imprimirOS = imprimirOS;
})();
