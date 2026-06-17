(function () {
  const financeMetrics = document.getElementById('financeMetrics');
  const pendingPayments = document.getElementById('pendingPayments');
  const financeSearch = document.getElementById('financeSearch');
  const financeStatusFilter = document.getElementById('financeStatusFilter');
  const reportsSection = document.querySelector('.reports-section');
  const reportFeedback = document.getElementById('reportFeedback');
  const exportBackupButton = document.getElementById('exportBackup');
  const importBackupButton = document.getElementById('importBackup');
  const clearAllDataButton = document.getElementById('clearAllData');
  const backupFileInput = document.getElementById('backupFile');
  const backupFeedback = document.getElementById('backupFeedback');
  const BACKUP_VERSION = '1.0';

  function toNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ?number : 0;
  }

  function getPhoneForWhatsApp(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ?digits : `55${digits}`;
  }

  function createChargeLink(order) {
    // WhatsApp financeiro: mensagem curta para cobrança de saldo pendente.
    const phone = getPhoneForWhatsApp(order.telefone);
    const companyName = getCompanySignature();
    const message = [
      `Olá, ${order.cliente || 'cliente'}. Aqui é da ${companyName}.`,
      `Consta um valor pendente de ${formatCurrency(getOrderRemaining(order))} referente à OS nº ${order.numeroOs},`,
      `do serviço ${order.tipoServico || 'não informado'} na peça/cabeçote ${order.peca || 'não informado'} do veículo ${order.carro || 'não informado'}.`,
      'Podemos combinar a regularização?'
    ].join(' ');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function normalizeReportText(value) {
    const prepared = String(value == null ?'' : value).replace(/\r?\n/g, ' ').trim();
    return prepared;
  }

  function textForExcel(value) {
    return normalizeReportText(value || '');
  }

  function dateForExcel(value) {
    return normalizeReportText(formatDate(value));
  }

  function currencyForExcel(value) {
    return normalizeReportText(formatCurrency(value));
  }

  function generatedDateText() {
    return new Date().toLocaleDateString('pt-BR');
  }

  function buildExcelTable(headers, rows, caption) {
    const colgroup = headers.map(function () {
      return '<col style="width: 170px;">';
    }).join('');
    const head = headers.map(function (header) {
      return '<th>' + escapeHtml(header) + '</th>';
    }).join('');
    const body = rows.map(function (row) {
      return '<tr>' + row.map(function (value) {
        return '<td style="mso-number-format:\'\\@\';">' + escapeHtml(value) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return [
      '<table>',
      caption ?'<caption>' + escapeHtml(caption) + '</caption>' : '',
      '<colgroup>' + colgroup + '</colgroup>',
      '<thead><tr>' + head + '</tr></thead>',
      '<tbody>' + body + '</tbody>',
      '</table>'
    ].join('');
  }

  function buildExcelHtml(title, tables) {
    const generatedAt = generatedDateText();
    const company = getCompanySettings();
    // Aplicar configurações nos relatórios: cabeçalho administrativo com dados da empresa.
    const companyLines = [company.nome, company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : ''].filter(Boolean);
    const tablesHtml = tables.map(function (table) {
      return buildExcelTable(table.headers, table.rows, table.caption);
    }).join('');

    return [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<meta charset="UTF-8">',
      '<style>',
      'body { font-family: Arial, sans-serif; color: #111827; }',
      'h1 { margin: 0 0 6px; font-size: 20px; }',
      '.generated { margin: 0 0 18px; color: #374151; font-size: 12px; }',
      'table { border-collapse: collapse; font-family: Arial, sans-serif; width: 100%; margin-bottom: 22px; }',
      'caption { font-size: 15px; font-weight: bold; margin-bottom: 8px; text-align: left; }',
      'th { background: #1f2933; color: #ffffff; font-weight: bold; }',
      'td, th { border: 1px solid #999; padding: 8px; mso-number-format:"\\@"; vertical-align: top; }',
      '</style>',
      '</head>',
      '<body>',
      '<h1>' + escapeHtml(title) + '</h1>',
      '<p class="generated">Data de geração: ' + escapeHtml(generatedAt) + '</p>',
      tablesHtml,
      '</body>',
      '</html>'
    ].join('');
  }

  function downloadExcel(filename, title, tables) {
    const blob = new Blob(['\ufeff', buildExcelHtml(title, tables)], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showReportSuccess() {
    if (!reportFeedback) return;
    reportFeedback.textContent = 'Relatório exportado com sucesso.';
    reportFeedback.classList.add('is-visible');
    window.clearTimeout(showReportSuccess.timer);
    showReportSuccess.timer = window.setTimeout(function () {
      reportFeedback.classList.remove('is-visible');
      reportFeedback.textContent = '';
    }, 3200);
  }

  function getCompanyReportLines(company) {
    return [company.nome, company.telefone, company.endereco, company.cidadeUf, company.cnpj ?`CNPJ: ${company.cnpj}` : ''].filter(Boolean);
  }

  function pendingFinancialOrders(orders) {
    return orders.filter(function (order) {
      return getOrderRemaining(order) > 0;
    });
  }

  function paymentLabel(status) {
    if (status === 'sem cobrança') return 'Sem cobrança';
    if (status === 'pago') return 'Pago';
    if (status === 'parcial') return 'Parcial';
    return 'Pendente';
  }

  function printStyles(pageSize) {
    return [
      'body { background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; }',
      '.print-area { padding: 0; width: 100%; max-width: 100%; }',
      '.print-header { border-bottom: 2px solid #222; margin-bottom: 14px; padding-bottom: 10px; }',
      '.print-header h1 { font-size: 22px; margin: 0 0 5px; }',
      '.print-header p { font-size: 11px; margin: 2px 0; }',
      '.meta { color: #333; font-size: 11px; margin: 0 0 12px; }',
      '.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin: 12px 0 14px; }',
      '.summary-item { border: 1px solid #999; padding: 7px; }',
      '.summary-item span { display: block; color: #444; font-size: 9px; font-weight: bold; text-transform: uppercase; }',
      '.summary-item strong { display: block; font-size: 13px; margin-top: 3px; }',
      'h2 { font-size: 15px; margin: 12px 0 7px; }',
      'table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }',
      'th, td { border: 1px solid #999; padding: 5px; word-break: normal; overflow-wrap: normal; vertical-align: top; }',
      'th { background: #eee; color: #000; font-weight: bold; }',
      '.money { white-space: nowrap; }',
      '.empty { border: 1px solid #999; color: #333; padding: 10px; }',
      `@page { size: ${pageSize}; margin: 10mm; }`,
      '@media print { body { background: #fff !important; color: #000 !important; font-family: Arial, sans-serif; } .no-print, nav, header, .navbar, button { display: none !important; } .print-area { width: 100%; max-width: 100%; } }'
    ].join('');
  }

  function openPrintWindow(title, bodyHtml, pageSize) {
    safePrint([
      '<main class="print-area">',
      bodyHtml,
      '</main>'
    ].join(''), {
      title,
      styles: printStyles(pageSize),
      width: 1100,
      height: 800
    });
  }

  function buildPrintHeader(title) {
    const company = getCompanySettings();
    const companyLines = getCompanyReportLines(company).map(function (line) {
      return '<p>' + escapeHtml(line) + '</p>';
    }).join('');

    return [
      '<section class="print-header">',
      '<h1>' + escapeHtml(title) + '</h1>',
      companyLines,
      '<p>Data de geração: ' + escapeHtml(generatedDateText()) + '</p>',
      '</section>'
    ].join('');
  }

  function buildPrintTable(headers, rows, widths) {
    if (!rows.length) return '<div class="empty">Nenhum registro para imprimir.</div>';
    const colgroup = widths ?'<colgroup>' + widths.map(function (width) {
      return '<col style="width:' + escapeHtml(width) + '">';
    }).join('') + '</colgroup>' : '';
    const head = headers.map(function (header) {
      return '<th>' + escapeHtml(header) + '</th>';
    }).join('');
    const body = rows.map(function (row) {
      return '<tr>' + row.map(function (value) {
        return '<td>' + escapeHtml(value) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return '<table>' + colgroup + '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function imprimirResumoFinanceiro() {
    const orders = RetificaStorage.getOrders();
    if (!assertHasRows(orders)) return;

    const stats = getFinanceStats(orders);
    const pendingRows = pendingFinancialOrders(orders).map(function (order) {
      return [
        order.numeroOs || '',
        order.cliente || '',
        order.tipoServico || '',
        formatCurrency(order.valorTotal),
        formatCurrency(order.valorEntrada),
        formatCurrency(getOrderRemaining(order)),
        paymentLabel(order.statusPagamento)
      ];
    });
    const summaryItems = [
      ['Faturamento total cadastrado', formatCurrency(stats.totalCadastrado)],
      ['Valor recebido', formatCurrency(stats.recebido)],
      ['Valor pendente', formatCurrency(stats.pendente)],
      ['OS pagas', stats.osPagas],
      ['OS pendentes', stats.osPendentes],
      ['OS parciais', stats.osParciais],
      ['Ticket médio', formatCurrency(stats.ticketMedio)]
    ].map(function (item) {
      return '<div class="summary-item"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>';
    }).join('');

    openPrintWindow('Relatório Financeiro', [
      buildPrintHeader('Relatório Financeiro'),
      '<section class="summary-grid">' + summaryItems + '</section>',
      '<h2>Pendências financeiras</h2>',
      buildPrintTable(['OS', 'Cliente', 'Serviço', 'Total', 'Entrada', 'Restante', 'Pagamento'], pendingRows, ['11%', '22%', '23%', '11%', '11%', '11%', '11%'])
    ].join(''), 'A4');
  }

  function imprimirListaOS() {
    const orders = RetificaStorage.getOrders();
    if (!assertHasRows(orders)) return;

    const rows = orders.map(function (order) {
      return [
        order.numeroOs || '',
        order.cliente || '',
        order.telefone || '',
        order.carro || '',
        order.tipoServico || '',
        formatCurrency(order.valorTotal),
        formatCurrency(getOrderRemaining(order)),
        order.statusServico || '',
        paymentLabel(order.statusPagamento)
      ];
    });

    openPrintWindow('Lista resumida de OS', [
      buildPrintHeader('Lista resumida de OS'),
      buildPrintTable(['OS', 'Cliente', 'Telefone', 'Carro', 'Serviço', 'Total', 'Restante', 'Status do Serviço', 'Status do Pagamento'], rows, ['10%', '16%', '13%', '12%', '16%', '8%', '8%', '9%', '8%'])
    ].join(''), 'A4 landscape');
  }

  function showBackupMessage(message) {
    if (!backupFeedback) return;
    backupFeedback.textContent = message;
    backupFeedback.classList.add('is-visible');
    window.clearTimeout(showBackupMessage.timer);
    showBackupMessage.timer = window.setTimeout(function () {
      backupFeedback.classList.remove('is-visible');
      backupFeedback.textContent = '';
    }, 3600);
  }

  function assertHasRows(rows) {
    if (rows.length) return true;
    alert('Não há dados para exportar.');
    return false;
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getBackupFileName() {
    return `retifica-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
  }

  function isValidBackup(data) {
    return Boolean(data && data.sistema === 'Retífica OS' && Array.isArray(data.ordens));
  }

  function orderRow(order, includeNotes) {
    const row = [
      textForExcel(order.numeroOs),
      order.cliente || '',
      textForExcel(order.telefone),
      order.carro || '',
      order.ano || '',
      order.motor || '',
      order.peca || '',
      order.tipoServico || '',
      currencyForExcel(order.valorTotal),
      currencyForExcel(order.valorOrcado),
      currencyForExcel(order.valorEntrada),
      currencyForExcel(getOrderRemaining(order)),
      order.statusServico || '',
      order.statusPagamento || '',
      order.formaPagamento || '',
      dateForExcel(order.dataPagamento),
      order.recebidoPor || '',
      dateForExcel(order.dataEntrada),
      dateForExcel(order.previsaoEntrega),
      dateForExcel(order.dataOrcamento),
      order.aprovadoCliente || 'não',
      dateForExcel(order.dataAprovacao),
      dateForExcel(order.dataRetirada),
      order.retiradoPor || '',
      order.documentoRetirada || ''
    ];

    if (includeNotes) {
      row.push(order.observacoesPeca || '', order.observacaoOrcamento || '', order.observacaoRetirada || '', order.observacaoPagamento || '', order.observacoesGerais || '');
    }

    return row;
  }

  function clientKey(order) {
    const phone = String(order.telefone || '').replace(/\D/g, '');
    return phone || String(order.cliente || 'cliente-sem-telefone').trim().toLowerCase();
  }

  function getFinanceStats(orders) {
    // Cálculo financeiro consolidado para os indicadores do caixa.
    const totals = calculateTotals(orders);
    const activeOrders = orders.filter(isOrderFinanciallyRelevant);
    const pagas = activeOrders.filter(function (order) { return order.statusPagamento === 'pago'; }).length;
    const parciais = activeOrders.filter(function (order) { return order.statusPagamento === 'parcial'; }).length;
    const pendentes = activeOrders.filter(function (order) { return getOrderRemaining(order) > 0; }).length;
    const semCobranca = orders.filter(function (order) { return order.statusPagamento === 'sem cobrança'; }).length;
    const activeTotal = activeOrders.reduce(function (sum, order) {
      return sum + toNumber(order.valorTotal);
    }, 0);
    const ticketMedio = activeOrders.length ?activeTotal / activeOrders.length : 0;

    return {
      totalCadastrado: totals.totalServicos,
      recebido: totals.recebido,
      pendente: totals.pendente,
      osPendentes: pendentes,
      osPagas: pagas,
      osParciais: parciais,
      osSemCobranca: semCobranca,
      ticketMedio
    };
  }

  function exportAllOrders() {
    const orders = RetificaStorage.getOrders();
    if (!assertHasRows(orders)) return;

    const headers = [
      'Número da OS',
      'Cliente',
      'Telefone',
      'Carro',
      'Ano',
      'Motor',
      'Peça/Cabeçote',
      'Serviço',
      'Valor Total',
      'Valor Orçado',
      'Entrada',
      'Restante',
      'Status do Serviço',
      'Status do Pagamento',
      'Forma de Pagamento',
      'Data do Pagamento',
      'Recebido Por',
      'Data de Entrada',
      'Previsão',
      'Data do Orçamento',
      'Aprovado pelo Cliente',
      'Data de Aprovação',
      'Data de Retirada',
      'Retirado Por',
      'Documento Retirada',
      'Observações da Peça',
      'Observação do Orçamento',
      'Observação de Retirada',
      'Observação do Pagamento',
      'Observações Gerais'
    ];
    const rows = orders.map(function (order) {
      return orderRow(order, true);
    });

    downloadExcel('retifica-os-todas-os.xls', 'Relatório - Todas as OS', [{ caption: 'Todas as OS', headers, rows }]);
    showReportSuccess();
  }

  function exportarXLS(reportType) {
    if (reportType === 'all') exportAllOrders();
    if (reportType === 'pending') exportPendingOrders();
    if (reportType === 'finance') exportFinanceSummary();
    if (reportType === 'clients') exportClientsReport();
  }

  function exportPendingOrders() {
    const orders = RetificaStorage.getOrders().filter(function (order) {
      return getOrderRemaining(order) > 0;
    });
    if (!assertHasRows(orders)) return;

    const headers = [
      'Número da OS',
      'Cliente',
      'Telefone',
      'Carro',
      'Serviço',
      'Valor Total',
      'Entrada',
      'Restante',
      'Status do Serviço',
      'Status do Pagamento',
      'Forma de Pagamento',
      'Data do Pagamento',
      'Recebido Por',
      'Data de Entrada',
      'Previsão'
    ];
    const rows = orders.map(function (order) {
      return [
        textForExcel(order.numeroOs),
        order.cliente || '',
        textForExcel(order.telefone),
        order.carro || '',
        order.tipoServico || '',
        currencyForExcel(order.valorTotal),
        currencyForExcel(order.valorEntrada),
        currencyForExcel(getOrderRemaining(order)),
        order.statusServico || '',
        order.statusPagamento || '',
        order.formaPagamento || '',
        dateForExcel(order.dataPagamento),
        order.recebidoPor || '',
        dateForExcel(order.dataEntrada),
        dateForExcel(order.previsaoEntrega)
      ];
    });

    downloadExcel('retifica-os-pendencias.xls', 'Relatório - Pendências', [{ caption: 'Pendências', headers, rows }]);
    showReportSuccess();
  }

  function exportFinanceSummary() {
    const orders = RetificaStorage.getOrders();
    if (!assertHasRows(orders)) return;

    const stats = getFinanceStats(orders);
    const summaryHeaders = ['Indicador', 'Valor'];
    const summaryRows = [
      ['Faturamento Total Cadastrado', currencyForExcel(stats.totalCadastrado)],
      ['Valor Recebido', currencyForExcel(stats.recebido)],
      ['Valor Pendente', currencyForExcel(stats.pendente)],
      ['OS Pagas', stats.osPagas],
      ['OS Pendentes', stats.osPendentes],
      ['OS Parciais', stats.osParciais],
      ['OS Sem Cobrança', stats.osSemCobranca],
      ['Ticket Médio por OS', currencyForExcel(stats.ticketMedio)],
      ['Data de Geração', textForExcel(generatedDateText())]
    ];

    const orderHeaders = [
      'Número da OS',
      'Cliente',
      'Serviço',
      'Valor Total',
      'Entrada',
      'Restante',
      'Status do Pagamento',
      'Forma de Pagamento',
      'Data do Pagamento',
      'Recebido Por'
    ];
    const financialOrders = orders.filter(isOrderFinanciallyRelevant);
    const orderRows = financialOrders.map(function (order) {
      return [
        textForExcel(order.numeroOs),
        order.cliente || '',
        order.tipoServico || '',
        currencyForExcel(order.valorTotal),
        currencyForExcel(order.valorEntrada),
        currencyForExcel(getOrderRemaining(order)),
        order.statusPagamento || '',
        order.formaPagamento || '',
        dateForExcel(order.dataPagamento),
        order.recebidoPor || ''
      ];
    });

    downloadExcel('retifica-os-financeiro.xls', 'Relatório - Financeiro', [
      { caption: 'Resumo financeiro', headers: summaryHeaders, rows: summaryRows },
      { caption: 'OS e valores', headers: orderHeaders, rows: orderRows }
    ]);
    showReportSuccess();
  }

  function buildClientsReport(orders) {
    const grouped = orders.reduce(function (acc, order) {
      const key = clientKey(order);
      if (!acc[key]) {
        acc[key] = {
          cliente: order.cliente || 'Cliente não informado',
          telefone: order.telefone || 'Não informado',
          nomes: [],
          ordens: []
        };
      }

      const orderName = String(order.cliente || '').trim();
      if (orderName && !acc[key].nomes.some(function (name) {
        return name.toLowerCase() === orderName.toLowerCase();
      })) {
        acc[key].nomes.push(orderName);
      }

      acc[key].ordens.push(order);
      return acc;
    }, {});

    return Object.values(grouped).map(function (client) {
      client.ordens.sort(function (a, b) {
        return String(b.dataEntrada || '').localeCompare(String(a.dataEntrada || ''));
      });
      const totalGasto = client.ordens.reduce(function (sum, order) {
        return sum + (isOrderFinanciallyRelevant(order) ?toNumber(order.valorTotal) : 0);
      }, 0);
      const valorPendente = client.ordens.reduce(function (sum, order) {
        return sum + getOrderRemaining(order);
      }, 0);
      const ultimaOs = client.ordens[0] || {};

      return [
        ultimaOs.cliente || client.cliente,
        textForExcel(client.telefone),
        client.nomes.join(', '),
        client.ordens.length,
        currencyForExcel(totalGasto),
        currencyForExcel(valorPendente),
        textForExcel(ultimaOs.numeroOs),
        ultimaOs.carro || '',
        valorPendente > 0 ?'Cliente com pendência' : 'Cliente em dia'
      ];
    });
  }

  function exportClientsReport() {
    const orders = RetificaStorage.getOrders();
    if (!assertHasRows(orders)) return;

    const headers = [
      'Nome principal',
      'Telefone',
      'Nomes cadastrados',
      'Quantidade de OS',
      'Total gasto',
      'Valor pendente',
      'Última OS',
      'Último veículo',
      'Status geral'
    ];
    const rows = buildClientsReport(orders);

    downloadExcel('retifica-os-clientes.xls', 'Relatório - Clientes', [{ caption: 'Clientes agrupados por telefone', headers, rows }]);
    showReportSuccess();
  }

  function exportBackup() {
    // Exportação do backup: empacota todas as OS atuais em JSON para guardar fora do localStorage.
    const orders = RetificaStorage.getOrders();
    const backup = {
      sistema: 'Retífica OS',
      versao: BACKUP_VERSION,
      geradoEm: new Date().toISOString(),
      totalRegistros: orders.length,
      ordens: orders,
      configuracoesEmpresa: getCompanySettings()
    };

    downloadJson(getBackupFileName(), backup);
    showBackupMessage('Backup exportado com sucesso.');
  }

  function restoreBackup(file) {
    // Importação do backup: valida o JSON antes de sobrescrever as OS salvas no localStorage.
    if (!file) return;
    const reader = new FileReader();

    reader.onload = function () {
      try {
        const data = JSON.parse(String(reader.result || ''));
        if (!isValidBackup(data)) {
          alert('Arquivo inválido ou incompatível.');
          return;
        }

        if (!confirm('Restaurar este backup vai sobrescrever os dados atuais. Deseja continuar?')) return;

        RetificaStorage.updateOrders(data.ordens);
        if (data.configuracoesEmpresa) RetificaStorage.saveCompanySettings(data.configuracoesEmpresa);
        renderFinance();
        applyCompanyBrand();
        showBackupMessage('Backup restaurado com sucesso.');
      } catch (error) {
        alert('Arquivo inválido ou incompatível.');
      } finally {
        if (backupFileInput) backupFileInput.value = '';
      }
    };

    reader.onerror = function () {
      alert('Arquivo inválido ou incompatível.');
      if (backupFileInput) backupFileInput.value = '';
    };

    reader.readAsText(file, 'UTF-8');
  }

  function clearAllData() {
    // Limpeza total dos dados: remove todas as OS, incluindo reais e demonstração.
    const confirmed = confirm('Tem certeza que deseja apagar todos os dados? Essa ação não pode ser desfeita.');
    if (!confirmed) return;

    RetificaStorage.updateOrders([]);
    renderFinance();
    showBackupMessage('Todos os dados foram apagados.');
  }

  function renderMetrics(orders) {
    const stats = getFinanceStats(orders);
    const cards = [
      ['Faturamento total cadastrado', `<span class="money-value">${formatCurrency(stats.totalCadastrado)}</span>`, ''],
      ['Valor recebido', `<span class="money-value">${formatCurrency(stats.recebido)}</span>`, 'success'],
      ['Valor pendente', `<span class="money-value">${formatCurrency(stats.pendente)}</span>`, stats.pendente > 0 ?'alert' : 'success'],
      ['OS pendentes', stats.osPendentes, stats.osPendentes > 0 ?'alert' : ''],
      ['OS pagas', stats.osPagas, 'success'],
      ['OS parciais', stats.osParciais, stats.osParciais > 0 ?'warning' : ''],
      ['Sem cobrança', stats.osSemCobranca, ''],
      ['Ticket médio por OS', `<span class="money-value">${formatCurrency(stats.ticketMedio)}</span>`, '']
    ];

    financeMetrics.innerHTML = cards.map(function (card) {
      return `<article class="metric-card ${card[2]}"><span>${card[0]}</span><strong>${card[1]}</strong></article>`;
    }).join('');
  }

  function getFilteredOrders() {
    const search = financeSearch ?financeSearch.value.trim().toLowerCase() : '';
    const status = financeStatusFilter ?financeStatusFilter.value : 'todos';

    return RetificaStorage.getOrders().filter(function (order) {
      const remaining = getOrderRemaining(order);
      const hasPendingPayment = remaining > 0;
      const hasRegisteredPayment = hasReceiptPayment(order);
      const searchableText = [
        getOrderSearchText(order),
        order.cliente,
        order.telefone,
        order.carro
      ].join(' ').toLowerCase();
      const searchMatch = !search || searchableText.includes(search);
      const statusMatch = status === 'todos' || order.statusPagamento === status;
      const visibilityMatch = status === 'sem cobrança'
        ?order.statusPagamento === 'sem cobrança'
        : status === 'pago'
          ?order.statusPagamento === 'pago' && isOrderFinanciallyRelevant(order)
          : hasPendingPayment || hasRegisteredPayment;
      return visibilityMatch && searchMatch && statusMatch;
    });
  }

  function renderPaymentList() {
    const allOrders = RetificaStorage.getOrders();
    const filteredOrders = getFilteredOrders();
    const visibleOrders = filteredOrders;

    if (!allOrders.length) {
      pendingPayments.innerHTML = '<div class="empty-state">Nenhuma movimentação financeira encontrada.</div>';
      return;
    }

    pendingPayments.innerHTML = visibleOrders.length ?visibleOrders.map(function (order) {
      const remaining = getOrderRemaining(order);
      const pendingClass = remaining > 0 ?'has-pending' : '';
      const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';
      const receiptButton = renderReceiptButton(order);
      const quickReceiptButton = renderQuickReceiptButton(order);
      const paymentWhatsApp = hasReceiptPayment(order)
        ?`<a class="btn btn-secondary" href="${createPaymentWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp pagamento</a>`
        : '';
      const chargeButton = remaining > 0
        ?`<a class="btn btn-whatsapp" href="${createChargeLink(order)}" target="_blank" rel="noopener">Cobrar no WhatsApp</a>`
        : '';
      const paidButton = order.statusPagamento !== 'sem cobrança'
        ?`<button class="btn btn-secondary" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Marcar como pago</button>`
        : '';

      return `
        <article class="finance-order ${pendingClass}">
          <div class="finance-order-head">
            <div>
              <span class="os-number">${escapeHtml(order.numeroOs)}</span>
              <h3>${escapeHtml(order.cliente || 'Cliente não informado')} ${demoBadge}</h3>
              <p>${escapeHtml(order.telefone || 'Telefone não informado')}</p>
            </div>
            <div class="status-row">
              <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
              <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
            </div>
          </div>

          <div class="order-info-grid">
            <span><strong>Carro</strong>${escapeHtml(order.carro || 'Não informado')}</span>
            <span><strong>Peça/Cabeçote</strong>${escapeHtml(order.peca || 'Não informado')}</span>
            <span><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</span>
            <span><strong>Previsão</strong>${formatDate(order.previsaoEntrega)}</span>
          </div>

          <div class="order-values">
            <span><strong>Valor total</strong><span class="money-value">${formatCurrency(order.valorTotal)}</span></span>
            <span><strong>Entrada</strong><span class="money-value">${formatCurrency(order.valorEntrada)}</span></span>
            <span class="${remaining > 0 ?'value-pending' : 'value-paid'}"><strong>Restante</strong><span class="money-value">${formatCurrency(remaining)}</span></span>
            <span><strong>Forma</strong>${escapeHtml(order.formaPagamento || 'Não informada')}</span>
            <span><strong>Data pagamento</strong>${order.dataPagamento ?formatDate(order.dataPagamento) : 'Não informada'}</span>
          </div>

          <div class="card-actions">
            ${chargeButton}
            ${paymentWhatsApp}
            ${receiptButton}
            ${quickReceiptButton}
            ${paidButton}
            <a class="btn btn-secondary" href="nova-os.html?id=${encodeURIComponent(order.id)}">Editar OS</a>
          </div>
        </article>
      `;
    }).join('') : '<div class="empty-state">Nenhuma movimentação financeira encontrada.</div>';
  }

  function renderFinance() {
    const orders = RetificaStorage.getOrders();
    renderMetrics(orders);
    renderPaymentList();
  }

  function markOrderPaid(order) {
    RetificaStorage.updateOrder(order.id, {
      ...order,
      statusPagamento: 'pago',
      valorEntrada: toNumber(order.valorTotal),
      dataPagamento: order.dataPagamento || RetificaStorage.getTodayIso(),
      valorRestante: 0
    });
    renderFinance();
    showAppMessage('Pagamento marcado como pago.');
  }

  if (pendingPayments) {
    pendingPayments.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const order = RetificaStorage.getOrderById(button.dataset.id);
      if (!order) return;
      if (button.dataset.action === 'paid') markOrderPaid(order);
      if (button.dataset.action === 'receipt') imprimirRecibo(order);
      if (button.dataset.action === 'quick-receipt') imprimirComprovanteRapido(order);
    });
  }

  if (reportsSection) {
    reportsSection.addEventListener('click', function (event) {
      const button = event.target.closest('[data-report]');
      const printButton = event.target.closest('[data-print-report]');
      if (button) exportarXLS(button.dataset.report);
      if (printButton && printButton.dataset.printReport === 'finance') imprimirResumoFinanceiro();
      if (printButton && printButton.dataset.printReport === 'orders') imprimirListaOS();
    });
  }

  window.exportarXLS = exportarXLS;
  window.imprimirResumoFinanceiro = imprimirResumoFinanceiro;
  window.imprimirListaOS = imprimirListaOS;

  if (exportBackupButton) exportBackupButton.addEventListener('click', exportBackup);
  if (importBackupButton && backupFileInput) {
    importBackupButton.addEventListener('click', function () {
      backupFileInput.click();
    });
  }
  if (backupFileInput) {
    backupFileInput.addEventListener('change', function () {
      restoreBackup(backupFileInput.files && backupFileInput.files[0]);
    });
  }
  if (clearAllDataButton) clearAllDataButton.addEventListener('click', clearAllData);

  if (financeSearch) financeSearch.addEventListener('input', renderFinance);
  if (financeStatusFilter) financeStatusFilter.addEventListener('change', renderFinance);

  renderFinance();
})();
