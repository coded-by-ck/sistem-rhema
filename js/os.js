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
      `Sua OS ${order.numeroOs} referente ao cabeçote/peça ${order.peca || 'não informada'} do veículo ${order.carro || 'não informado'} está com status: ${order.statusServico}.`,
      `Valor total: ${formatCurrency(order.valorTotal)}.`,
      `Valor pendente: ${formatCurrency(getOrderRemaining(order))}.`
    ].join(' ');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function collectOrderFromForm(existingOrder) {
    // Geração de OS: normaliza campos do formulário antes de salvar no localStorage.
    const data = new FormData(form);
    const valorTotal = toNumber(data.get('valorTotal'));
    const valorEntrada = Math.min(toNumber(data.get('valorEntrada')), valorTotal);
    const statusPagamento = data.get('statusPagamento');

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
      statusServico: data.get('statusServico'),
      statusPagamento,
      previsaoEntrega: data.get('previsaoEntrega') || '',
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

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const order = collectOrderFromForm(existingOrder);

      if (existingOrder) RetificaStorage.updateOrder(existingOrder.id, order);
      else RetificaStorage.saveOrder(order);

      window.location.href = 'servicos.html';
    });
  }

  function printOrder(order) {
    // Impressão: gera uma janela isolada com layout claro para assinatura e arquivo físico.
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Permita pop-ups para imprimir a OS.');
      return;
    }

    // Aplicar configurações na impressão: usa logo, contato e textos padrão da empresa.
    const company = getCompanySettings();
    const companyLogo = company.logo
      ?`<img class="print-logo" src="${company.logo}" alt="Logo">`
      :`<div class="print-logo-fallback">${escapeHtml(company.sigla || 'RO')}</div>`;
    const companyInfo = [company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : '', company.email, company.horario]
      .filter(Boolean)
      .map(function (item) { return `<p>${escapeHtml(item)}</p>`; })
      .join('');
    const defaultNotes = company.observacoesPadrao
      ?`<h2>Observações padrão da empresa</h2><div class="notes">${escapeHtml(company.observacoesPadrao)}</div>`
      : '';
    const footerText = company.rodapeOs ?`<footer>${escapeHtml(company.rodapeOs)}</footer>` : '';

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(order.numeroOs)} - Retífica OS</title>
        <style>
          body { color: #111827; font-family: Arial, Helvetica, sans-serif; margin: 32px; }
          header { align-items: center; border-bottom: 2px solid #111827; display: flex; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; }
          header p { margin: 2px 0; }
          .print-logo, .print-logo-fallback { width: 76px; height: 76px; border: 1px solid #d1d5db; object-fit: contain; }
          .print-logo-fallback { display: grid; place-items: center; font-weight: 800; }
          h1 { margin: 0; font-size: 28px; }
          h2 { border-bottom: 1px solid #d1d5db; font-size: 16px; margin: 22px 0 10px; padding-bottom: 6px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; }
          .item { font-size: 14px; }
          .item strong { display: block; color: #4b5563; font-size: 11px; text-transform: uppercase; }
          .notes { border: 1px solid #d1d5db; min-height: 70px; padding: 10px; white-space: pre-wrap; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 64px; }
          .signature { border-top: 1px solid #111827; padding-top: 8px; text-align: center; }
          footer { border-top: 1px solid #d1d5db; color: #4b5563; margin-top: 34px; padding-top: 10px; white-space: pre-wrap; }
          @media print { body { margin: 18mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <header>
          ${companyLogo}
          <div>
            <h1>${escapeHtml(company.nome || 'Retífica OS')}</h1>
            ${companyInfo}
            <p><strong>Ordem de Serviço:</strong> ${escapeHtml(order.numeroOs)}</p>
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

        <h2>Observações da peça</h2>
        <div class="notes">${escapeHtml(order.observacoesPeca || 'Sem observações.')}</div>

        <h2>Observações gerais</h2>
        <div class="notes">${escapeHtml(order.observacoesGerais || 'Sem observações.')}</div>

        <section class="signatures">
          <div class="signature">Recebido por</div>
          <div class="signature">Assinatura do cliente</div>
          <div class="signature">Assinatura da empresa</div>
        </section>
        ${footerText}
        <script>window.onload = function () { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  function markOrderPaid(order) {
    RetificaStorage.updateOrder(order.id, {
      ...order,
      statusPagamento: 'pago',
      valorEntrada: toNumber(order.valorTotal),
      valorRestante: 0
    });
  }

  function renderOrderCard(order) {
    const late = isOrderLate(order);
    const remaining = getOrderRemaining(order);
    const lateBadge = late ?'<span class="badge danger">Atrasada</span>' : '';
    const paymentSummaryClass = remaining > 0 ?'value-pending' : 'value-paid';

    return `
      <article class="order-card ${late ?'is-late' : ''}" data-id="${escapeHtml(order.id)}">
        <div class="order-card-head">
          <div>
            <span class="os-number">${escapeHtml(order.numeroOs)}</span>
            <h3>${escapeHtml(order.cliente || 'Cliente não informado')}</h3>
          </div>
          ${lateBadge}
        </div>
        <div class="order-info-grid">
          <span><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</span>
          <span><strong>Veículo</strong>${escapeHtml(order.carro || 'Não informado')} ${escapeHtml(order.ano)}</span>
          <span><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</span>
          <span><strong>Serviço</strong>${escapeHtml(order.tipoServico || 'Não informado')}</span>
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
    const orders = RetificaStorage.getOrders().filter(function (order) {
      const searchableText = [order.numeroOs, order.cliente, order.telefone, order.carro, order.peca, order.tipoServico].join(' ').toLowerCase();
      const searchMatch = !search || searchableText.includes(search);
      const statusMatch = selectedStatus === 'todos' || order.statusServico === selectedStatus;
      const paymentMatch = selectedPayment === 'todos' || order.statusPagamento === selectedPayment;
      return searchMatch && statusMatch && paymentMatch;
    });

    list.innerHTML = orders.length
      ?orders.map(renderOrderCard).join('')
      : '<div class="empty-state">Nenhuma ordem encontrada para a busca e filtros selecionados.</div>';
  }

  function updateOrderStatus(order, status) {
    // Atualização de status: ação rápida nos cards sem alterar dados financeiros.
    RetificaStorage.updateOrder(order.id, { ...order, statusServico: status });
    renderOrders();
  }

  if (list) {
    list.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const order = RetificaStorage.getOrderById(button.dataset.id);
      if (!order) return;

      if (button.dataset.action === 'delete') {
        if (confirm(`Tem certeza que deseja excluir ${order.numeroOs}?Esta ação não pode ser desfeita.`)) {
          RetificaStorage.deleteOrder(order.id);
          renderOrders();
        }
      }

      if (button.dataset.action === 'print') printOrder(order);
      if (button.dataset.action === 'status') updateOrderStatus(order, button.dataset.status);
      if (button.dataset.action === 'paid') {
        markOrderPaid(order);
        renderOrders();
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
      return [order.numeroOs, order.carro, order.telefone, order.cliente].join(' ');
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
      clientHistory.innerHTML = 'Selecione um cliente para ver o histórico completo.';
      clientHistory.className = 'empty-state';
      return;
    }

    clientHistory.className = 'client-history-content';
    const pendingAlert = client.valorPendente > 0
      ?`<div class="client-alert">Valor pendente: <span class="money-value">${formatCurrency(client.valorPendente)}</span></div>`
      : '<div class="client-alert success">Cliente em dia</div>';

    const ordersHtml = client.ordens.map(function (order) {
      const remaining = getOrderRemaining(order);
      const paidButton = remaining > 0 || order.statusPagamento !== 'pago'
        ?`<button class="btn btn-mini btn-mini-success" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Marcar como pago</button>`
        : '';
      return `
        <article class="history-order ${remaining > 0 ?'has-pending' : ''}">
          <div class="history-order-head">
            <span class="os-number">${escapeHtml(order.numeroOs)}</span>
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
          </div>
          <div class="card-actions">
            <a class="btn btn-secondary" href="nova-os.html?id=${encodeURIComponent(order.id)}">Editar OS</a>
            <button class="btn btn-secondary" type="button" data-action="print" data-id="${escapeHtml(order.id)}">Imprimir OS</button>
            <a class="btn btn-whatsapp" href="${createWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp</a>
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

    if (!selectedClientKey || !clients.some(function (client) { return client.key === selectedClientKey; })) {
      selectedClientKey = clients[0].key;
    }

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

    renderClientHistory(clients.find(function (client) { return client.key === selectedClientKey; }));
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
      if (button.dataset.action === 'print') printOrder(order);
      if (button.dataset.action === 'paid') {
        markOrderPaid(order);
        renderClients();
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
})();
