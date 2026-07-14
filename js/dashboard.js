(function () {
  const metrics = document.getElementById('dashboardMetrics');
  const recent = document.getElementById('recentOrders');
  const overview = document.getElementById('workshopOverview');
  const performanceChart = document.getElementById('performanceChart');
  const performanceSummary = document.getElementById('performanceSummary');
  const recentActivities = document.getElementById('recentActivities');
  const financeSummary = document.getElementById('financeSummary');
  const loadDemoButton = document.getElementById('loadDemoData');
  const clearDemoButton = document.getElementById('clearDemoData');

  const STATUS = {
    budget: 'orçamento',
    waitingApproval: 'aguardando aprovação',
    approved: 'aprovado',
    rejected: 'recusado',
    received: 'recebido',
    analysis: 'em análise',
    execution: 'em execução',
    finished: 'finalizado',
    delivered: 'entregue'
  };

  function normalizeDashboardStatus(status) {
    const value = String(status || STATUS.received).trim().toLowerCase();
    const aliases = {
      'orÃ§amento': STATUS.budget,
      'aguardando aprovaÃ§Ã£o': STATUS.waitingApproval,
      'em anÃ¡lise': STATUS.analysis,
      'em execuÃ§Ã£o': STATUS.execution
    };
    return aliases[value] || value;
  }

  function hasServiceStatus(order, status) {
    return normalizeDashboardStatus(order && order.statusServico) === status;
  }

  function isDashboardWorkInProgress(order) {
    return Boolean(order && [STATUS.received, STATUS.analysis, STATUS.approved, STATUS.execution].includes(normalizeDashboardStatus(order.statusServico)));
  }

  function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ?number : 0;
  }

  function getClientsWithPending(orders) {
    return orders.reduce(function (acc, order) {
      const remaining = getOrderRemaining(order);
      const key = String(order.telefone || order.cliente || '').trim().toLowerCase();
      if (remaining > 0 && key && !acc[key]) acc[key] = order;
      return acc;
    }, {});
  }

  function getOrderBudgetValue(order) {
    return toNumber(order.valorOrcado) || toNumber(order.valorTotal);
  }

  function sumOrders(orders, valueGetter) {
    return orders.reduce(function (sum, order) {
      return sum + valueGetter(order);
    }, 0);
  }

  function firstAvailableText(values, fallback) {
    const text = values.map(function (value) {
      return String(value || '').trim();
    }).find(Boolean);
    return text || fallback;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = String(value).includes('T') ?new Date(value) : new Date(value + 'T00:00:00');
    return Number.isNaN(date.getTime()) ?null : date;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(date) {
    return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  }

  function getCompletionDate(order) {
    if (![STATUS.finished, STATUS.delivered].includes(normalizeDashboardStatus(order.statusServico))) return null;
    return parseDate(order.dataRetirada || order.dataPagamento || '');
  }

  function getDashboardMetrics(orders, totals) {
    const lateOrders = orders.filter(isOrderLate);
    const clientsWithPending = Object.values(getClientsWithPending(orders));
    const ordersInBudget = orders.filter(function (order) { return hasServiceStatus(order, STATUS.budget); });
    const ordersAwaitingApproval = orders.filter(function (order) { return hasServiceStatus(order, STATUS.waitingApproval); });
    const ordersApproved = orders.filter(function (order) { return hasServiceStatus(order, STATUS.approved); });
    const ordersInExecution = orders.filter(function (order) { return hasServiceStatus(order, STATUS.execution); });
    const ordersFinished = orders.filter(function (order) { return hasServiceStatus(order, STATUS.finished); });
    const ordersInProgress = orders.filter(isDashboardWorkInProgress);
    return {
      totals,
      lateOrders,
      clientsWithPending,
      ordersInBudget,
      ordersAwaitingApproval,
      ordersApproved,
      ordersInExecution,
      ordersFinished,
      ordersInProgress
    };
  }

  function renderKpis(data) {
    const totals = data.totals;
    const cards = [
      ['Total de ordens', totals.totalOrdens, 'default', 'OS'],
      ['Em or&ccedil;amento', data.ordersInBudget.length, data.ordersInBudget.length > 0 ?'warning' : 'default', 'OR'],
      ['Aguardando aprova&ccedil;&atilde;o', data.ordersAwaitingApproval.length, data.ordersAwaitingApproval.length > 0 ?'alert' : 'default', 'AP'],
      ['Aprovadas', data.ordersApproved.length, 'success', 'OK'],
      ['Em execu&ccedil;&atilde;o', data.ordersInExecution.length, data.ordersInExecution.length > 0 ?'warning' : 'default', 'EX'],
      ['Finalizadas', data.ordersFinished.length, 'success', 'FN'],
      ['OS atrasadas', data.lateOrders.length, data.lateOrders.length > 0 ?'alert' : 'success', '!'],
      ['Clientes com pend&ecirc;ncia', data.clientsWithPending.length, data.clientsWithPending.length > 0 ?'alert' : 'success', 'R$']
    ];

    metrics.innerHTML = cards.map(function (card) {
      return `
        <article class="metric-card ${card[2]}" data-icon="${escapeHtml(card[3])}">
          <span>${card[0]}</span>
          <strong>${card[1]}</strong>
        </article>
      `;
    }).join('');
  }

  function getMonthlyPerformance(orders) {
    const now = new Date();
    const months = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months.push({
        key: monthKey(date),
        label: monthLabel(date),
        entrada: 0,
        concluidas: 0
      });
    }
    const monthMap = months.reduce(function (acc, item) {
      acc[item.key] = item;
      return acc;
    }, {});

    orders.forEach(function (order) {
      const entryDate = parseDate(order.dataEntrada);
      if (entryDate && monthMap[monthKey(entryDate)]) monthMap[monthKey(entryDate)].entrada += 1;
      const completionDate = getCompletionDate(order);
      if (completionDate && monthMap[monthKey(completionDate)]) monthMap[monthKey(completionDate)].concluidas += 1;
    });

    return months;
  }

  function renderPerformanceChart(orders) {
    if (!performanceChart || !performanceSummary) return;
    const monthly = getMonthlyPerformance(orders);
    const totalCompleted = orders.filter(function (order) {
      return [STATUS.finished, STATUS.delivered].includes(normalizeDashboardStatus(order.statusServico));
    }).length;
    const completedWithDate = orders.filter(getCompletionDate).length;
    const activeOrders = orders.filter(function (order) {
      return ![STATUS.rejected, STATUS.delivered].includes(normalizeDashboardStatus(order.statusServico));
    }).length;
    const totalOrders = orders.length;
    const completionRate = totalOrders ?Math.round((totalCompleted / totalOrders) * 100) : 0;
    const monthlyAverage = monthly.length ?(completedWithDate / monthly.length) : 0;
    const maxValue = Math.max(1, ...monthly.map(function (item) {
      return Math.max(item.entrada, item.concluidas);
    }));
    const hasAnyData = monthly.some(function (item) {
      return item.entrada > 0 || item.concluidas > 0;
    });

    if (!orders.length) {
      performanceChart.innerHTML = '<div class="empty-state">Nenhuma OS cadastrada para gerar performance.</div>';
    } else if (!hasAnyData) {
      performanceChart.innerHTML = '<div class="empty-state">Dados insuficientes para gerar evolu&ccedil;&atilde;o mensal.</div>';
    } else {
      const bars = monthly.map(function (item) {
        const entryHeight = Math.max(5, Math.round((item.entrada / maxValue) * 126));
        const completedHeight = item.concluidas ?Math.max(5, Math.round((item.concluidas / maxValue) * 126)) : 0;
        return `
          <div class="chart-month">
            <div class="chart-bars" aria-label="${escapeHtml(item.label)}: ${item.entrada} entradas, ${item.concluidas} conclu&iacute;das">
              <span class="chart-bar entry" style="height:${entryHeight}px"><small>${item.entrada}</small></span>
              <span class="chart-bar completed" style="height:${completedHeight}px"><small>${item.concluidas}</small></span>
            </div>
            <span class="chart-label">${escapeHtml(item.label)}</span>
          </div>
        `;
      }).join('');

      performanceChart.innerHTML = `
        <div class="chart-surface">
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
          <div class="chart-grid-line"></div>
          <div class="chart-columns">${bars}</div>
        </div>
        <div class="chart-legend">
          <span><i class="entry"></i> Entradas</span>
          <span><i class="completed"></i> Conclu&iacute;das com data</span>
        </div>
        ${totalCompleted > completedWithDate ?'<p class="chart-note">Algumas OS finalizadas n&atilde;o possuem data de retirada ou pagamento e ficam fora da s&eacute;rie mensal.</p>' : ''}
      `;
    }

    performanceSummary.innerHTML = [
      ['Conclu&iacute;das', totalCompleted, 'success'],
      ['M&eacute;dia/m&ecirc;s', monthlyAverage.toFixed(1).replace('.', ','), 'info'],
      ['Taxa de conclus&atilde;o', `${completionRate}%`, completionRate > 0 ?'success' : 'default'],
      ['Fila ativa', activeOrders, activeOrders > 0 ?'warning' : 'success']
    ].map(function (item) {
      return `
        <article class="performance-mini ${item[2]}">
          <span>${item[0]}</span>
          <strong>${item[1]}</strong>
        </article>
      `;
    }).join('');
  }

  function activityLabel(order) {
    const status = normalizeDashboardStatus(order.statusServico);
    if (isOrderLate(order)) return 'OS atrasada';
    if (status === STATUS.budget) return 'OS em or&ccedil;amento';
    if (status === STATUS.waitingApproval) return 'Aguardando aprova&ccedil;&atilde;o';
    if (status === STATUS.execution) return 'OS em execu&ccedil;&atilde;o';
    if (status === STATUS.finished) return 'OS finalizada';
    if (status === STATUS.delivered) return 'OS entregue';
    if (getOrderRemaining(order) > 0) return 'Pagamento pendente';
    return `OS ${escapeHtml(order.statusServico || 'recebida')}`;
  }

  function getRecentActivities(orders) {
    return orders.map(function (order) {
      const date = parseDate(order.dataRetirada || order.dataPagamento || order.criadoEm || order.dataEntrada);
      return {
        order,
        date,
        timestamp: date ?date.getTime() : 0
      };
    }).sort(function (a, b) {
      return b.timestamp - a.timestamp;
    }).slice(0, 6);
  }

  function renderRecentActivities(orders) {
    if (!recentActivities) return;
    const activities = getRecentActivities(orders);
    if (!activities.length) {
      recentActivities.innerHTML = '<div class="empty-state">Nenhuma atividade recente.</div>';
      return;
    }

    recentActivities.innerHTML = activities.map(function (activity) {
      const order = activity.order;
      const lateClass = isOrderLate(order) ?' danger' : '';
      const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';
      return `
        <article class="activity-item${lateClass}">
          <div>
            <strong>OS ${escapeHtml(order.numeroOs)} ${activityLabel(order)}</strong>
            <p>Cliente: ${escapeHtml(order.cliente || 'Cliente nao informado')}</p>
            <p>Servi&ccedil;o: ${escapeHtml(getOrderServicesText(order))}</p>
          </div>
          <div class="activity-meta">
            ${demoBadge}
            <span>${formatDate(activity.date ?activity.date.toISOString().slice(0, 10) : order.dataEntrada)}</span>
            <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico || 'recebido')}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  let activeOperationalQueue = 'budget';

  function getOperationalQueues(data) {
    return [
      {
        key: 'budget',
        label: 'Em or&ccedil;amento',
        actionLabel: 'Ver todos os servi&ccedil;os',
        orders: data.ordersInBudget
      },
      {
        key: 'approval',
        label: 'Aguardando aprova&ccedil;&atilde;o',
        actionLabel: 'Ver todos os servi&ccedil;os',
        orders: data.ordersAwaitingApproval
      },
      {
        key: 'progress',
        label: 'Em andamento',
        actionLabel: 'Ver todos os servi&ccedil;os',
        orders: data.ordersInExecution
      },
      {
        key: 'late',
        label: 'Atrasadas',
        actionLabel: 'Ver atrasadas',
        orders: data.lateOrders
      }
    ];
  }

  function getQueueDateText(order) {
    const date = order.previsaoEntrega || order.dataEntrada || order.criadoEm;
    if (!date) return 'Sem previs&atilde;o';
    const label = order.previsaoEntrega ?'Previs&atilde;o' : 'Data';
    return `${label}: ${escapeHtml(formatDate(String(date).slice(0, 10)))}`;
  }

  function getQueueValueText(order) {
    const remaining = getOrderRemaining(order);
    const budgetValue = getOrderBudgetValue(order);
    const totalValue = toNumber(order.valorTotal);
    if (remaining > 0) return `Pendência: ${formatCurrency(remaining)}`;
    if (budgetValue > 0) return formatCurrency(budgetValue);
    if (totalValue > 0) return formatCurrency(totalValue);
    return '';
  }

  function renderQueueOrder(order) {
    const status = normalizeDashboardStatus(order.statusServico);
    const customer = firstAvailableText([order.cliente], 'Cliente não informado');
    const vehicleOrPart = firstAvailableText([order.carro, order.peca], 'Veículo não informado');
    const service = firstAvailableText([getOrderServicesText(order)], 'Serviço não informado');
    const valueText = getQueueValueText(order);
    const statusText = status || 'recebido';

    return `
      <article class="queue-order">
        <div class="queue-order-main">
          <div>
            <strong>OS ${escapeHtml(order.numeroOs || '----')}</strong>
            <span>${escapeHtml(customer)}</span>
          </div>
          <span class="badge ${serviceBadgeClass(statusText)}">${escapeHtml(statusText)}</span>
        </div>
        <p>${escapeHtml(vehicleOrPart)}</p>
        <p>${escapeHtml(service)}</p>
        <div class="queue-order-meta">
          <span>${getQueueDateText(order)}</span>
          ${valueText ?`<span>${escapeHtml(valueText)}</span>` : ''}
          <a href="servicos.html">Abrir OS</a>
        </div>
      </article>
    `;
  }

  function renderOperationalCards(data) {
    if (!overview) return;
    const queues = getOperationalQueues(data);
    const selectedQueue = queues.find(function (queue) {
      return queue.key === activeOperationalQueue;
    }) || queues[0];
    const orders = selectedQueue.orders;
    const list = orders.length
      ?orders.map(renderQueueOrder).join('')
      : '<div class="queue-empty">Nenhuma OS nesta etapa.</div>';

    overview.innerHTML = `
      <div class="section-heading operational-queue-heading">
        <div>
          <p class="eyebrow">Opera&ccedil;&atilde;o</p>
          <h2>Fila operacional</h2>
        </div>
        <a href="servicos.html">${selectedQueue.actionLabel}</a>
      </div>
      <div class="queue-tabs" role="tablist" aria-label="Fila operacional">
        ${queues.map(function (queue) {
          const active = queue.key === selectedQueue.key;
          return `
            <button class="queue-tab${active ?' is-active' : ''}" type="button" data-queue="${escapeHtml(queue.key)}" role="tab" aria-selected="${active ?'true' : 'false'}">
              <span>${queue.label}</span>
              <strong>${queue.orders.length}</strong>
            </button>
          `;
        }).join('')}
      </div>
      <div class="queue-list">${list}</div>
    `;
  }

  function renderFinanceSummary(data) {
    if (!financeSummary) return;
    const totals = data.totals;
    const pendingFinancialOrders = totals.pagamentoPendente;
    const cards = [
      ['Total a receber', `<span class="money-value">${formatCurrency(totals.pendente)}</span>`, totals.pendente > 0 ?'warning' : 'success'],
      ['Pend&ecirc;ncias financeiras', pendingFinancialOrders, pendingFinancialOrders > 0 ?'warning' : 'success'],
      ['Faturamento recebido', `<span class="money-value">${formatCurrency(totals.recebido)}</span>`, 'success'],
      ['Clientes com pend&ecirc;ncia', data.clientsWithPending.length, data.clientsWithPending.length > 0 ?'warning' : 'success']
    ];

    financeSummary.innerHTML = cards.map(function (card) {
      return `
        <article class="finance-mini ${card[2]}">
          <span>${card[0]}</span>
          <strong>${card[1]}</strong>
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
          <td>${escapeHtml(order.cliente || 'Cliente nao informado')} ${demoBadge}</td>
          <td>${escapeHtml(order.carro || 'Nao informado')}</td>
          <td>${escapeHtml(getOrderServicesText(order))}</td>
          <td><span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico || 'recebido')}</span> ${lateBadge}</td>
          <td><span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento || 'pendente')}</span></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">Nenhuma OS cadastrada ainda.</td></tr>';
  }

  function renderDashboard() {
    const orders = RetificaStorage.getOrders();
    const totals = calculateTotals(orders);
    const data = getDashboardMetrics(orders, totals);
    renderKpis(data);
    renderPerformanceChart(orders);
    renderRecentActivities(orders);
    renderOperationalCards(data);
    renderFinanceSummary(data);
    renderRecentOrders(orders);
  }

  if (loadDemoButton) {
    loadDemoButton.addEventListener('click', function () {
      const result = RetificaStorage.loadDemoOrders();
      alert(result.added ?'Dados de demonstraÃ§Ã£o carregados.' : 'Os dados de demonstraÃ§Ã£o jÃ¡ estavam carregados.');
      renderDashboard();
    });
  }

  if (clearDemoButton) {
    clearDemoButton.addEventListener('click', function () {
      if (!confirm('Remover apenas as OS de demonstraÃ§Ã£o? As OS reais serÃ£o mantidas.')) return;
      const removed = RetificaStorage.clearDemoOrders();
      alert(removed ?'Dados de demonstraÃ§Ã£o removidos.' : 'Nenhum dado de demonstraÃ§Ã£o encontrado.');
      renderDashboard();
    });
  }

  if (overview) {
    overview.addEventListener('click', function (event) {
      const tab = event.target.closest('[data-queue]');
      if (!tab || !overview.contains(tab)) return;
      activeOperationalQueue = tab.dataset.queue || 'budget';
      renderDashboard();
    });
  }

  renderDashboard();
})();
