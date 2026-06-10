(function () {
  const metrics = document.getElementById('dashboardMetrics');
  const recent = document.getElementById('recentOrders');
  const overview = document.getElementById('workshopOverview');
  const loadDemoButton = document.getElementById('loadDemoData');
  const clearDemoButton = document.getElementById('clearDemoData');

  function getClientsWithPending(orders) {
    return orders.reduce(function (acc, order) {
      const remaining = getOrderRemaining(order);
      const key = String(order.telefone || order.cliente || '').trim().toLowerCase();
      if (remaining > 0 && key && !acc[key]) acc[key] = order;
      return acc;
    }, {});
  }

  function renderMetrics(orders, totals) {
    const lateOrders = orders.filter(isOrderLate).length;
    const clientsWithPending = Object.keys(getClientsWithPending(orders)).length;

    const cards = [
      ['Total de ordens', totals.totalOrdens, ''],
      ['Ordens recebidas', totals.recebidas, ''],
      ['Em execução', totals.emExecucao, 'warning'],
      ['Finalizadas', totals.finalizadas, 'success'],
      ['Entregues', totals.entregues, 'success'],
      ['OS atrasadas', lateOrders, lateOrders > 0 ?'alert' : 'success'],
      ['Clientes com pendência', clientsWithPending, clientsWithPending > 0 ?'alert' : 'success'],
      ['Total a receber', `<span class="money-value">${formatCurrency(totals.pendente)}</span>`, totals.pendente > 0 ?'alert' : 'success'],
      ['Faturamento recebido', `<span class="money-value">${formatCurrency(totals.recebido)}</span>`, 'success'],
      ['Total em serviços', `<span class="money-value">${formatCurrency(totals.totalServicos)}</span>`, '']
    ];

    metrics.innerHTML = cards.map(function (card) {
      return `<article class="metric-card ${card[2]}"><span>${card[0]}</span><strong>${card[1]}</strong></article>`;
    }).join('');
  }

  function renderOverview(orders, totals) {
    if (!overview) return;
    const lateOrders = orders.filter(isOrderLate);
    const clientsWithPending = Object.values(getClientsWithPending(orders));
    const inProgress = orders.filter(function (order) {
      return order.statusServico !== 'finalizado' && order.statusServico !== 'entregue';
    });

    const items = [
      ['OS atrasadas', lateOrders.length, lateOrders.length ?lateOrders.slice(0, 3).map(function (order) { return order.numeroOs; }).join(', ') : 'Nenhuma OS fora do prazo'],
      ['Clientes com pendência', clientsWithPending.length, clientsWithPending.length ?clientsWithPending.slice(0, 3).map(function (order) { return order.cliente || 'Cliente sem nome'; }).join(', ') : 'Nenhum cliente pendente'],
      ['Serviços em andamento', inProgress.length, inProgress.length ?inProgress.slice(0, 3).map(function (order) { return order.peca || order.tipoServico || order.numeroOs; }).join(', ') : 'Fila operacional zerada'],
      ['Total a receber', `<span class="money-value">${formatCurrency(totals.pendente)}</span>`, 'Pendências financeiras abertas']
    ];

    overview.innerHTML = items.map(function (item) {
      return `
        <article class="overview-card">
          <span>${item[0]}</span>
          <strong>${item[1]}</strong>
          <p>${escapeHtml(item[2])}</p>
        </article>
      `;
    }).join('');
  }

  function renderRecentOrders(orders) {
    recent.innerHTML = orders.slice(0, 6).map(function (order) {
      const lateBadge = isOrderLate(order) ?'<span class="badge danger">Atrasada</span>' : '';
      const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';

      return `
        <tr>
          <td>${escapeHtml(order.numeroOs)}</td>
          <td>${escapeHtml(order.cliente || 'Cliente não informado')} ${demoBadge}</td>
          <td>${escapeHtml(order.carro || 'Não informado')}</td>
          <td>${escapeHtml(order.tipoServico || 'Não informado')}</td>
          <td><span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico || 'recebido')}</span> ${lateBadge}</td>
          <td><span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento || 'pendente')}</span></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">Nenhuma ordem cadastrada ainda.</td></tr>';
  }

  function renderDashboard() {
    const orders = RetificaStorage.getOrders();
    const totals = calculateTotals(orders);
    renderMetrics(orders, totals);
    renderOverview(orders, totals);
    renderRecentOrders(orders);
  }

  if (loadDemoButton) {
    loadDemoButton.addEventListener('click', function () {
      const result = RetificaStorage.loadDemoOrders();
      alert(result.added ?'Dados de demonstração carregados.' : 'Os dados de demonstração já estavam carregados.');
      renderDashboard();
    });
  }

  if (clearDemoButton) {
    clearDemoButton.addEventListener('click', function () {
      if (!confirm('Remover apenas as OS de demonstração? As OS reais serão mantidas.')) return;
      const removed = RetificaStorage.clearDemoOrders();
      alert(removed ?'Dados de demonstração removidos.' : 'Nenhum dado de demonstração encontrado.');
      renderDashboard();
    });
  }

  renderDashboard();
})();
