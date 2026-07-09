(function () {
  const form = document.getElementById('osForm');
  const list = document.getElementById('ordersList');
  const serviceSearch = document.getElementById('serviceSearch');
  const statusFilter = document.getElementById('statusFilter');
  const paymentFilter = document.getElementById('paymentFilter');
  const serviceSort = document.getElementById('serviceSort');
  const ordersResultCount = document.getElementById('ordersResultCount');
  const enterLabelsModeButton = document.getElementById('enterLabelsMode');
  const exitLabelsModeButton = document.getElementById('exitLabelsMode');
  const labelsModePanel = document.getElementById('labelsModePanel');
  const printLabelsSheetButton = document.getElementById('printLabelsSheet');
  const selectWorkshopLabelsButton = document.getElementById('selectWorkshopLabels');
  const clearLabelSelectionButton = document.getElementById('clearLabelSelection');
  const labelSelectionCount = document.getElementById('labelSelectionCount');
  const quickFilterButtons = document.querySelectorAll('[data-quick-filter]');
  const clientSearch = document.getElementById('clientSearch');
  const clientMetrics = document.getElementById('clientMetrics');
  const clientsList = document.getElementById('clientsList');
  const clientHistory = document.getElementById('clientHistory');
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id') || params.get('edit');
  const suggestedPriceMessage = document.getElementById('suggestedPriceMessage');
  const toggleServiceDiscountButton = document.getElementById('toggleServiceDiscount');
  const addWorkshopServiceButton = document.getElementById('addWorkshopService');
  const workshopServicesList = document.getElementById('workshopServicesList');
  const workshopServiceName = document.getElementById('workshopServiceName');
  const workshopServiceSuggestions = document.getElementById('workshopServiceSuggestions');
  const workshopServiceChargeType = document.getElementById('workshopServiceChargeType');
  const workshopServiceQuantity = document.getElementById('workshopServiceQuantity');
  const workshopServiceQuantityLabel = document.getElementById('workshopServiceQuantityLabel');
  const workshopServiceValue = document.getElementById('workshopServiceValue');
  const workshopServiceSubtotal = document.getElementById('workshopServiceSubtotal');
  const workshopServiceNote = document.getElementById('workshopServiceNote');
  const workshopServicePriceId = document.getElementById('workshopServicePriceId');
  const addExternalPartButton = document.getElementById('addExternalPart');
  const externalPartsList = document.getElementById('externalPartsList');
  let selectedClientKey = '';
  let openOrderId = '';
  let activeQuickFilter = '';
  let labelsModeActive = false;
  let selectedPriceRecord = null;
  let autocompleteSuggestions = [];
  let autocompleteIndex = -1;
  let serviceSelectedByAutocomplete = false;
  const selectedLabelOrderIds = new Set();
  const workshopLabelStatuses = ['orçamento', 'aguardando aprovação', 'aprovado', 'recebido', 'em análise', 'em execução', 'finalizado'];

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
      `Serviços da retífica: ${getOrderServicesDetailedText(order)}.`,
      `O orçamento ficou em ${formatCurrency(budgetValue)}.`,
      'Podemos seguir com a execução do serviço?'
    ].join(' ');

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function shouldUseNoChargeStatus(statusServico, valorTotal, valorEntrada) {
    return statusServico === 'recusado' && toNumber(valorTotal) === 0 && toNumber(valorEntrada) === 0;
  }

  function getFormValue(name) {
    if (!form) return '';
    const fields = Array.from(form.querySelectorAll(`[name="${name}"]`)).filter(function (field) {
      return !field.disabled;
    });
    return fields.length ?fields[0].value : '';
  }

  function getFirstFormValue(names) {
    const fieldNames = Array.isArray(names) ?names : [names];
    for (let index = 0; index < fieldNames.length; index += 1) {
      const value = String(getFormValue(fieldNames[index]) || '').trim();
      if (value) return value;
    }
    return '';
  }

  function getVehicleName(marca, modelo, fallback) {
    return [marca, modelo].filter(Boolean).join(' ').trim() || fallback || '';
  }

  function normalizeChargeType(value) {
    return RetificaStorage.getChargeTypes && RetificaStorage.getChargeTypes().includes(value) ?value : 'servico';
  }

  function getCurrentPriceCategory() {
    return RetificaStorage.resolvePriceCategory ?RetificaStorage.resolvePriceCategory({
      marca: getFormValue('marca'),
      modelo: getFormValue('modelo'),
      carro: getVehicleName(getFormValue('marca'), getFormValue('modelo'), getFormValue('carro')),
      motor: getFormValue('motor'),
      peca: getFormValue('peca'),
      tipoCabecote: getFormValue('tipoCabecote')
    }) : '';
  }

  function calculateServiceSubtotal(quantity, unitValue) {
    return Math.max(toNumber(quantity) || 1, 1) * toNumber(unitValue);
  }

  function isQuantityNeeded(type) {
    return ['unidade', 'cabecote', 'jogo'].includes(normalizeChargeType(type));
  }

  function getChargeTypeLabel(type) {
    return {
      servico: 'Servico',
      unidade: 'Unidade',
      cabecote: 'Cabecote',
      jogo: 'Jogo'
    }[normalizeChargeType(type)] || 'Servico';
  }

  function getWorkshopServiceDraft() {
    const type = normalizeChargeType(workshopServiceChargeType && workshopServiceChargeType.value);
    const quantity = isQuantityNeeded(type) ?Math.max(toNumber(workshopServiceQuantity && workshopServiceQuantity.value) || 1, 1) : 1;
    const unitValue = toNumber(workshopServiceValue && workshopServiceValue.value);
    const subtotal = calculateServiceSubtotal(quantity, unitValue);
    return {
      id: window.crypto && window.crypto.randomUUID ?window.crypto.randomUUID() : String(Date.now()),
      nome: String(workshopServiceName && workshopServiceName.value || '').trim(),
      categoriaPreco: selectedPriceRecord ?selectedPriceRecord.categoria : getCurrentPriceCategory(),
      tipoCobranca: type,
      quantidade: quantity,
      valorUnitario: unitValue,
      subtotal,
      valor: subtotal,
      observacao: String(workshopServiceNote && workshopServiceNote.value || '').trim(),
      origemPreco: selectedPriceRecord ?'tabela' : 'manual',
      precoTabelaId: selectedPriceRecord ?selectedPriceRecord.id : ''
    };
  }

  function getWorkshopServicesFromForm() {
    if (!workshopServicesList) return [];
    return Array.from(workshopServicesList.querySelectorAll('[data-workshop-service]')).map(function (row) {
      const type = normalizeChargeType(row.querySelector('[data-service-field="tipoCobranca"]').value);
      const quantity = isQuantityNeeded(type) ?Math.max(toNumber(row.querySelector('[data-service-field="quantidade"]').value) || 1, 1) : 1;
      const unitValue = toNumber(row.querySelector('[data-service-field="valorUnitario"]').value);
      const subtotal = calculateServiceSubtotal(quantity, unitValue);
      return {
        id: row.dataset.serviceId || '',
        nome: String(row.querySelector('[data-service-field="nome"]').value || '').trim(),
        categoriaPreco: String(row.querySelector('[data-service-field="categoriaPreco"]').value || '').trim(),
        tipoCobranca: type,
        quantidade,
        valorUnitario: unitValue,
        subtotal,
        valor: subtotal,
        observacao: String(row.querySelector('[data-service-field="observacao"]').value || '').trim(),
        origemPreco: row.querySelector('[data-service-field="origemPreco"]').value === 'tabela' ?'tabela' : 'manual',
        precoTabelaId: String(row.querySelector('[data-service-field="precoTabelaId"]').value || '').trim()
      };
    }).filter(function (service) {
      return service.nome || service.subtotal > 0 || service.observacao;
    });
  }

  function addWorkshopServiceRow(service) {
    if (!workshopServicesList) return;
    const type = normalizeChargeType(service && service.tipoCobranca);
    const quantity = Math.max(toNumber(service && service.quantidade) || 1, 1);
    const unitValue = service && service.valorUnitario !== undefined && service.valorUnitario !== null && service.valorUnitario !== ''
      ?toNumber(service.valorUnitario)
      : toNumber(service && service.valor);
    const subtotal = service && service.subtotal !== undefined && service.subtotal !== null && service.subtotal !== ''
      ?toNumber(service.subtotal)
      : calculateServiceSubtotal(quantity, unitValue);
    const row = document.createElement('div');
    row.className = 'external-part-row workshop-service-row';
    row.dataset.workshopService = 'true';
    row.dataset.serviceId = service && service.id || '';
    row.innerHTML = `
      <label>Servico<input data-service-field="nome" type="text" value="${escapeHtml(service && service.nome || '')}"></label>
      <label>Tipo
        <select data-service-field="tipoCobranca">
          <option value="servico" ${type === 'servico' ?'selected' : ''}>Servico</option>
          <option value="unidade" ${type === 'unidade' ?'selected' : ''}>Unidade</option>
          <option value="cabecote" ${type === 'cabecote' ?'selected' : ''}>Cabecote</option>
          <option value="jogo" ${type === 'jogo' ?'selected' : ''}>Jogo</option>
        </select>
      </label>
      <label>Qtd.<input data-service-field="quantidade" type="number" min="1" step="1" value="${quantity}"></label>
      <label>Valor un.<input data-service-field="valorUnitario" type="number" min="0" step="0.01" value="${unitValue ?unitValue.toFixed(2) : ''}"></label>
      <label>Subtotal<input data-service-field="subtotal" type="number" min="0" step="0.01" readonly value="${subtotal ?subtotal.toFixed(2) : ''}"></label>
      <label>Observacao<input data-service-field="observacao" type="text" value="${escapeHtml(service && service.observacao || '')}"></label>
      <input data-service-field="categoriaPreco" type="hidden" value="${escapeHtml(service && service.categoriaPreco || '')}">
      <input data-service-field="origemPreco" type="hidden" value="${escapeHtml(service && service.origemPreco || 'manual')}">
      <input data-service-field="precoTabelaId" type="hidden" value="${escapeHtml(service && service.precoTabelaId || '')}">
      <button class="btn btn-danger" type="button" data-remove-workshop-service>Remover</button>
    `;
    workshopServicesList.appendChild(row);
    updateWorkshopServiceRowSubtotal(row);
  }

  function updateWorkshopServiceRowSubtotal(row) {
    if (!row) return;
    const typeField = row.querySelector('[data-service-field="tipoCobranca"]');
    const quantityField = row.querySelector('[data-service-field="quantidade"]');
    const valueField = row.querySelector('[data-service-field="valorUnitario"]');
    const subtotalField = row.querySelector('[data-service-field="subtotal"]');
    const type = normalizeChargeType(typeField && typeField.value);
    const quantity = isQuantityNeeded(type) ?Math.max(toNumber(quantityField && quantityField.value) || 1, 1) : 1;
    const subtotal = calculateServiceSubtotal(quantity, valueField && valueField.value);
    if (quantityField && !isQuantityNeeded(type)) quantityField.value = '1';
    if (subtotalField) subtotalField.value = subtotal ?subtotal.toFixed(2) : '';
  }

  function getExternalPartsFromForm() {
    if (!externalPartsList) return [];
    return Array.from(externalPartsList.querySelectorAll('[data-external-part]')).map(function (row) {
      return {
        nome: String(row.querySelector('[data-part-field="nome"]').value || '').trim(),
        fornecedor: String(row.querySelector('[data-part-field="fornecedor"]').value || '').trim(),
        valor: toNumber(row.querySelector('[data-part-field="valor"]').value),
        observacao: String(row.querySelector('[data-part-field="observacao"]').value || '').trim()
      };
    }).filter(function (part) {
      return part.nome || part.fornecedor || part.valor > 0 || part.observacao;
    });
  }

  function addExternalPartRow(part) {
    if (!externalPartsList) return;
    const row = document.createElement('div');
    row.className = 'external-part-row';
    row.dataset.externalPart = 'true';
    row.innerHTML = `
      <label>Nome da peça<input data-part-field="nome" type="text" value="${escapeHtml(part && part.nome || '')}"></label>
      <label>Fornecedor<input data-part-field="fornecedor" type="text" value="${escapeHtml(part && part.fornecedor || '')}"></label>
      <label>Valor<input data-part-field="valor" type="number" min="0" step="0.01" value="${part && part.valor ?toNumber(part.valor) : ''}"></label>
      <label>Observação<input data-part-field="observacao" type="text" value="${escapeHtml(part && part.observacao || '')}"></label>
      <button class="btn btn-danger" type="button" data-remove-external-part>Remover</button>
    `;
    externalPartsList.appendChild(row);
  }

  function calculateFormValues() {
    if (!form) return;
    const servicosRetifica = getWorkshopServicesFromForm();
    const subtotalServicosRetifica = servicosRetifica.reduce(function (sum, service) {
      return sum + toNumber(service.subtotal || service.valor);
    }, 0);
    const pecasExternas = getExternalPartsFromForm();
    const subtotalPecasExternas = pecasExternas.reduce(function (sum, part) {
      return sum + toNumber(part.valor);
    }, 0);
    const descontoAtivo = getFormValue('descontoServicoAtivo') === 'true';
    const descontoPercentual = descontoAtivo ?5 : 0;
    const valorDescontoServico = descontoAtivo ?subtotalServicosRetifica * (descontoPercentual / 100) : 0;
    const valorServicoComDesconto = Math.max(subtotalServicosRetifica - valorDescontoServico, 0);
    const valorTotal = valorServicoComDesconto + subtotalPecasExternas;

    if (form.descontoServicoPercentual) form.descontoServicoPercentual.value = String(descontoPercentual);
    if (form.subtotalServicosRetifica) form.subtotalServicosRetifica.value = subtotalServicosRetifica.toFixed(2);
    if (form.subtotalPecasExternas) form.subtotalPecasExternas.value = subtotalPecasExternas.toFixed(2);
    if (form.valorDescontoServico) form.valorDescontoServico.value = valorDescontoServico.toFixed(2);
    if (form.valorServicoComDesconto) form.valorServicoComDesconto.value = valorServicoComDesconto.toFixed(2);
    if (form.valorTotal) form.valorTotal.value = valorTotal.toFixed(2);
    if (toggleServiceDiscountButton) {
      toggleServiceDiscountButton.textContent = descontoAtivo ?'Remover desconto de 5%' : 'Aplicar desconto de 5%';
      toggleServiceDiscountButton.classList.toggle('btn-danger', descontoAtivo);
      toggleServiceDiscountButton.classList.toggle('btn-secondary', !descontoAtivo);
    }
  }

  function setSuggestedPriceMessage(message) {
    if (!suggestedPriceMessage) return;
    suggestedPriceMessage.textContent = message || '';
    suggestedPriceMessage.hidden = !message;
  }

  function updateServiceDraftUi() {
    const type = normalizeChargeType(workshopServiceChargeType && workshopServiceChargeType.value);
    const quantityNeeded = isQuantityNeeded(type);
    if (workshopServiceQuantityLabel) workshopServiceQuantityLabel.hidden = !quantityNeeded;
    if (workshopServiceQuantity && !quantityNeeded) workshopServiceQuantity.value = '1';
    const subtotal = calculateServiceSubtotal(workshopServiceQuantity && workshopServiceQuantity.value, workshopServiceValue && workshopServiceValue.value);
    if (workshopServiceSubtotal) workshopServiceSubtotal.value = subtotal ?subtotal.toFixed(2) : '';

    const serviceName = String(workshopServiceName && workshopServiceName.value || '').trim();
    if (!serviceName) setSuggestedPriceMessage('');
    updateRemainingPreview();
  }

  function applyPriceRecord(record) {
    if (!record) return;
    selectedPriceRecord = record;
    serviceSelectedByAutocomplete = true;
    if (workshopServiceName) workshopServiceName.value = record.servico || '';
    if (workshopServiceChargeType) workshopServiceChargeType.value = normalizeChargeType(record.tipoCobranca);
    if (workshopServiceQuantity) workshopServiceQuantity.value = isQuantityNeeded(record.tipoCobranca) ?workshopServiceQuantity.value || '1' : '1';
    if (workshopServiceValue) {
      workshopServiceValue.value = record.precoPadrao === null || record.precoPadrao === undefined || record.precoPadrao === ''
        ?''
        : toNumber(record.precoPadrao).toFixed(2);
    }
    if (workshopServicePriceId) workshopServicePriceId.value = record.id;
    setSuggestedPriceMessage(record.precoPadrao === null || record.precoPadrao === undefined || record.precoPadrao === ''
      ?'Preco padrao nao cadastrado.'
      :'Preco preenchido pela tabela padrao. Voce pode alterar somente nesta OS.');
    closeAutocomplete();
    updateServiceDraftUi();
    const nextField = isQuantityNeeded(record.tipoCobranca) ?workshopServiceQuantity : workshopServiceValue;
    if (nextField) nextField.focus();
  }

  function resetSelectedPriceRecord() {
    selectedPriceRecord = null;
    serviceSelectedByAutocomplete = false;
    if (workshopServicePriceId) workshopServicePriceId.value = '';
  }

  function renderAutocomplete() {
    if (!workshopServiceSuggestions) return;
    if (!autocompleteSuggestions.length) {
      closeAutocomplete();
      return;
    }
    workshopServiceSuggestions.hidden = false;
    let lastGroup = '';
    workshopServiceSuggestions.innerHTML = autocompleteSuggestions.map(function (record, index) {
      const price = record.precoPadrao === null || record.precoPadrao === undefined || record.precoPadrao === ''
        ?'Sem preco'
        : formatCurrency(record.precoPadrao);
      const group = record.grupoResultado || 'categoria';
      const heading = group !== lastGroup
        ?`<div class="autocomplete-heading">${group === 'outros' ?'Outros resultados' : group === 'generico' ?'Resultados genericos' : 'Categoria atual'}</div>`
        : '';
      lastGroup = group;
      const valves = record.quantidadeValvulas ?` · ${record.quantidadeValvulas}` : '';
      return `${heading}<button type="button" class="autocomplete-item ${index === autocompleteIndex ?'is-active' : ''}" data-suggestion-index="${index}">
        <span>${escapeHtml(record.servico)}</span>
        <small>${escapeHtml(record.categoria)}${escapeHtml(valves)} · ${escapeHtml(getChargeTypeLabel(record.tipoCobranca))} · ${escapeHtml(price)}</small>
      </button>`;
    }).join('');
  }

  function openAutocomplete() {
    if (!workshopServiceName || !RetificaStorage.searchPriceTableServices) return;
    const query = workshopServiceName.value;
    autocompleteSuggestions = RetificaStorage.searchPriceTableServices(query, getCurrentPriceCategory(), getFormValue('quantidadeValvulas')).slice(0, 8);
    autocompleteIndex = autocompleteSuggestions.length ?0 : -1;
    renderAutocomplete();
  }

  function closeAutocomplete() {
    autocompleteSuggestions = [];
    autocompleteIndex = -1;
    if (workshopServiceSuggestions) {
      workshopServiceSuggestions.hidden = true;
      workshopServiceSuggestions.innerHTML = '';
    }
  }

  function selectAutocompleteIndex(index) {
    const record = autocompleteSuggestions[index];
    if (!record) return;
    applyPriceRecord(record);
  }

  function focusNextServiceField(fromField) {
    const type = normalizeChargeType(workshopServiceChargeType && workshopServiceChargeType.value);
    if (fromField === workshopServiceName || fromField === workshopServiceChargeType) {
      const nextField = isQuantityNeeded(type) ?workshopServiceQuantity : workshopServiceValue;
      if (nextField) nextField.focus();
      return;
    }
    if (fromField === workshopServiceQuantity) {
      if (workshopServiceValue) workshopServiceValue.focus();
      return;
    }
    if (fromField === workshopServiceValue) {
      if (workshopServiceNote) workshopServiceNote.focus();
    }
  }

  function handleServiceFieldEnter(field, event) {
    if (event.key !== 'Enter') return;
    if (field === workshopServiceName && workshopServiceSuggestions && !workshopServiceSuggestions.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (field === workshopServiceNote) {
      addWorkshopService();
      return;
    }
    focusNextServiceField(field);
  }

  function saveCurrentDraftAsPriceDefault() {
    const draft = getWorkshopServiceDraft();
    if (!draft.nome || draft.valorUnitario <= 0) return;
    const updatingExisting = Boolean(selectedPriceRecord);
    const category = selectedPriceRecord
      ?selectedPriceRecord.categoria
      : (getCurrentPriceCategory() || prompt('Categoria para tabela de precos:', draft.categoriaPreco || 'Geral') || '').trim();
    if (!category) return;
    const record = RetificaStorage.upsertPriceTableRecord({
      id: selectedPriceRecord ?selectedPriceRecord.id : '',
      categoria: category,
      quantidadeValvulas: getFormValue('quantidadeValvulas'),
      servico: draft.nome,
      tipoCobranca: draft.tipoCobranca,
      precoPadrao: draft.valorUnitario,
      ativo: true
    });
    applyPriceRecord(record);
    showAppMessage(updatingExisting ?'Preco padrao atualizado.' : 'Servico salvo na tabela de precos.');
  }

  function setCollapsibleState(section, open) {
    if (!section) return;
    const content = section.querySelector('[data-collapsible-content]');
    const toggle = section.querySelector('[data-collapsible-toggle]');
    section.classList.toggle('is-open', Boolean(open));
    if (toggle) toggle.setAttribute('aria-expanded', open ?'true' : 'false');
    if (content) content.style.maxHeight = open ?`${content.scrollHeight}px` : '0px';
  }

  function refreshOpenCollapsibles() {
    if (!form) return;
    form.querySelectorAll('.collapsible-section.is-open').forEach(function (section) {
      const content = section.querySelector('[data-collapsible-content]');
      if (content) content.style.maxHeight = `${content.scrollHeight}px`;
    });
  }

  function prepareCollapsible(section, options) {
    if (!section || section.dataset.collapsibleReady === 'true') return;
    const settings = options || {};
    const title = section.querySelector('.form-section-title, .nested-collapsible-toggle');
    const content = settings.content || section.querySelector('.form-grid');
    if (!title || !content) return;
    section.classList.add('collapsible-section');
    content.classList.add('collapsible-content');
    title.classList.add('collapsible-toggle');
    title.dataset.collapsibleToggle = 'true';
    content.dataset.collapsibleContent = 'true';
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    if (!title.querySelector('.collapsible-arrow')) {
      const arrow = document.createElement('span');
      arrow.className = 'collapsible-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '▾';
      title.appendChild(arrow);
    }
    const toggle = function () {
      setCollapsibleState(section, !section.classList.contains('is-open'));
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
    section.dataset.collapsibleReady = 'true';
    setCollapsibleState(section, Boolean(settings.open));
  }

  function createNestedCollapsible(titleText, fields, open) {
    const fieldsToMove = fields.filter(Boolean);
    if (!fieldsToMove.length) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'nested-collapsible full-width collapsible-section';
    const button = document.createElement('div');
    button.className = 'nested-collapsible-toggle';
    const title = document.createElement('span');
    title.textContent = titleText;
    button.appendChild(title);
    const content = document.createElement('div');
    content.className = 'form-grid';
    fieldsToMove[0].parentNode.insertBefore(wrapper, fieldsToMove[0]);
    wrapper.appendChild(button);
    wrapper.appendChild(content);
    fieldsToMove.forEach(function (field) {
      content.appendChild(field);
    });
    prepareCollapsible(wrapper, { content, open });
    return wrapper;
  }

  function hasAnyValue(names) {
    return names.some(function (name) {
      const field = form.elements[name];
      if (!field) return false;
      if (field.tagName === 'SELECT') return field.value && field.value !== 'pendente' && field.value !== 'não';
      return String(field.value || '').trim() !== '';
    });
  }

  function setupFormCollapsibles(existingOrder) {
    if (!form) return;
    const sections = Array.from(form.children).filter(function (child) {
      return child.classList && child.classList.contains('form-section');
    });
    const budgetSection = sections[3];
    const paymentSection = sections[4];
    const withdrawalSection = sections[5];
    const notesSection = sections[6];
    const vehicleTitle = sections[1] && sections[1].querySelector('.form-section-title h2');
    if (vehicleTitle) vehicleTitle.textContent = 'Dados do veículo/peça/cabeçote';

    if (paymentSection) {
      const paymentTitle = paymentSection.querySelector('.form-section-title h2');
      if (paymentTitle) paymentTitle.textContent = 'Serviço e valores';
      createNestedCollapsible('Pagamento detalhado', [
        form.statusPagamento && form.statusPagamento.closest('label'),
        form.formaPagamento && form.formaPagamento.closest('label'),
        form.dataPagamento && form.dataPagamento.closest('label'),
        form.recebidoPor && form.recebidoPor.closest('label'),
        form.observacaoPagamento && form.observacaoPagamento.closest('label')
      ], Boolean(existingOrder && hasAnyValue(['statusPagamento', 'formaPagamento', 'dataPagamento', 'recebidoPor', 'observacaoPagamento'])));
    }

    if (notesSection) {
      const notesTitle = notesSection.querySelector('.form-section-title h2');
      if (notesTitle) notesTitle.textContent = 'Observação principal';
      createNestedCollapsible('Observações avançadas', [
        form.observacoesGerais && form.observacoesGerais.closest('label')
      ], Boolean(existingOrder && hasAnyValue(['observacoesGerais'])));
    }

    prepareCollapsible(budgetSection, {
      open: Boolean(existingOrder && hasAnyValue(['valorOrcado', 'dataOrcamento', 'dataAprovacao', 'observacaoOrcamento']))
    });
    prepareCollapsible(withdrawalSection, {
      open: Boolean(existingOrder && hasAnyValue(['dataRetirada', 'retiradoPor', 'documentoRetirada', 'observacaoRetirada']))
    });
  }

  function collectOrderFromForm(existingOrder) {
    // Geração de OS: normaliza campos do formulário antes de salvar no localStorage.
    calculateFormValues();
    const data = new FormData(form);
    const marca = String(data.get('marca') || '').trim();
    const modelo = String(data.get('modelo') || '').trim();
    const servicosRetifica = getWorkshopServicesFromForm();
    const subtotalServicosRetifica = servicosRetifica.reduce(function (sum, service) { return sum + toNumber(service.subtotal || service.valor); }, 0);
    const tipoServico = servicosRetifica.map(function (service) { return service.nome; }).filter(Boolean).join(', ');
    const pecasExternas = getExternalPartsFromForm();
    const descontoServicoAtivo = data.get('descontoServicoAtivo') === 'true';
    const descontoServicoPercentual = descontoServicoAtivo ?toNumber(data.get('descontoServicoPercentual') || 5) : 0;
    const valorDescontoServico = descontoServicoAtivo ?subtotalServicosRetifica * (descontoServicoPercentual / 100) : 0;
    const valorServicoComDesconto = Math.max(subtotalServicosRetifica - valorDescontoServico, 0);
    const subtotalPecasExternas = pecasExternas.reduce(function (sum, part) { return sum + toNumber(part.valor); }, 0);
    const valorTotal = toNumber(data.get('valorTotal'));
    const valorEntrada = Math.min(toNumber(data.get('valorEntrada')), valorTotal);
    const statusServico = data.get('statusServico');
    const statusPagamento = shouldUseNoChargeStatus(statusServico, valorTotal, valorEntrada)
      ?'sem cobrança'
      : data.get('statusPagamento');
    const approvedByStatus = statusServico === 'aprovado' || statusServico === 'em execução' || statusServico === 'finalizado' || statusServico === 'entregue';
    const aprovadoCliente = approvedByStatus ?'sim' : (data.get('aprovadoCliente') || 'não');
    const dataAprovacao = aprovadoCliente === 'sim'
      ?(data.get('dataAprovacao') || RetificaStorage.getTodayIso())
      : (data.get('dataAprovacao') || '');
    const dataRetirada = statusServico === 'entregue'
      ?(data.get('dataRetirada') || RetificaStorage.getTodayIso())
      : (data.get('dataRetirada') || '');
    const dataPagamento = statusPagamento === 'pago'
      ?(data.get('dataPagamento') || RetificaStorage.getTodayIso())
      : (data.get('dataPagamento') || '');

    // Em edição, número e data original são preservados mesmo se o HTML for alterado no navegador.
    return {
      id: existingOrder ?existingOrder.id : (window.crypto && crypto.randomUUID ?crypto.randomUUID() : String(Date.now())),
      numeroOs: existingOrder ?existingOrder.numeroOs : data.get('numeroOs'),
      dataEntrada: existingOrder ?existingOrder.dataEntrada : data.get('dataEntrada'),
      cliente: String(data.get('cliente') || '').trim(),
      telefone: String(data.get('telefone') || '').trim(),
      marca,
      modelo,
      carro: getVehicleName(marca, modelo, data.get('carro')),
      ano: data.get('ano') || '',
      motor: String(data.get('motor') || '').trim(),
      quantidadeValvulas: String(data.get('quantidadeValvulas') || '').trim(),
      tipoCabecote: String(data.get('tipoCabecote') || '').trim(),
      quantidadeCabecotes: String(data.get('quantidadeCabecotes') || '').trim(),
      peca: String(data.get('peca') || '').trim(),
      tipoServico,
      servicosRetifica,
      subtotalServicosRetifica,
      valorServicoRetifica: subtotalServicosRetifica,
      descontoServicoAtivo,
      descontoServicoPercentual,
      valorDescontoServico,
      valorServicoComDesconto,
      pecasExternas,
      subtotalPecasExternas,
      valorTotal,
      valorEntrada,
      valorRestante: statusPagamento === 'pago' || statusPagamento === 'sem cobrança' ?0 : Math.max(valorTotal - valorEntrada, 0),
      statusServico,
      statusPagamento,
      formaPagamento: data.get('formaPagamento') || '',
      dataPagamento,
      recebidoPor: String(data.get('recebidoPor') || '').trim(),
      observacaoPagamento: String(data.get('observacaoPagamento') || '').trim(),
      previsaoEntrega: data.get('previsaoEntrega') || '',
      valorOrcado: toNumber(data.get('valorOrcado')),
      dataOrcamento: data.get('dataOrcamento') || '',
      aprovadoCliente,
      dataAprovacao,
      observacaoOrcamento: String(data.get('observacaoOrcamento') || '').trim(),
      dataRetirada,
      retiradoPor: String(data.get('retiradoPor') || '').trim(),
      documentoRetirada: String(data.get('documentoRetirada') || '').trim(),
      observacaoRetirada: String(data.get('observacaoRetirada') || '').trim(),
      observacoesPeca: String(data.get('observacoesPeca') || '').trim(),
      observacoesGerais: String(data.get('observacoesGerais') || '').trim(),
      criadoEm: existingOrder ?existingOrder.criadoEm : new Date().toISOString()
    };
  }

  function toggleServiceDiscount() {
    if (!form || !form.descontoServicoAtivo) return;
    form.descontoServicoAtivo.value = form.descontoServicoAtivo.value === 'true' ?'false' : 'true';
    if (form.descontoServicoPercentual) form.descontoServicoPercentual.value = form.descontoServicoAtivo.value === 'true' ?'5' : '0';
    updateRemainingPreview();
  }

  function addExternalPart() {
    addExternalPartRow();
    updateRemainingPreview();
  }

  function addWorkshopService() {
    if (!workshopServiceName || !workshopServiceValue) return;
    const service = getWorkshopServiceDraft();
    if (!service.nome && service.subtotal <= 0 && !service.observacao) return;
    addWorkshopServiceRow(service);
    workshopServiceName.value = '';
    if (workshopServiceChargeType) workshopServiceChargeType.value = 'servico';
    if (workshopServiceQuantity) workshopServiceQuantity.value = '1';
    workshopServiceValue.value = '';
    if (workshopServiceSubtotal) workshopServiceSubtotal.value = '';
    if (workshopServiceNote) workshopServiceNote.value = '';
    resetSelectedPriceRecord();
    setSuggestedPriceMessage('');
    updateServiceDraftUi();
    if (workshopServiceName) workshopServiceName.focus();
  }

  function updateRemainingPreview() {
    if (!form) return;
    calculateFormValues();
    const valorTotal = toNumber(form.valorTotal.value);
    const valorEntrada = toNumber(form.valorEntrada.value);
    if (shouldUseNoChargeStatus(form.statusServico.value, valorTotal, valorEntrada)) {
      form.statusPagamento.value = 'sem cobrança';
    } else if (form.statusPagamento.value === 'sem cobrança') {
      form.statusPagamento.value = 'pendente';
    }
    const statusPagamento = form.statusPagamento.value;
    const remaining = statusPagamento === 'pago' || statusPagamento === 'sem cobrança' ?0 : Math.max(valorTotal - valorEntrada, 0);
    document.getElementById('valorRestante').value = formatCurrency(remaining);
    refreshOpenCollapsibles();
  }

  function fillForm(order) {
    form.numeroOs.value = order.numeroOs || '';
    form.dataEntrada.value = order.dataEntrada || '';
    form.cliente.value = order.cliente || '';
    form.telefone.value = order.telefone || '';
    if (form.marca) form.marca.value = order.marca || '';
    if (form.modelo) form.modelo.value = order.modelo || (!order.marca ?order.carro || '' : '');
    if (form.carro) form.carro.value = order.carro || '';
    form.ano.value = order.ano || '';
    form.motor.value = order.motor || '';
    if (form.quantidadeValvulas) form.quantidadeValvulas.value = order.quantidadeValvulas || '';
    if (form.tipoCabecote) form.tipoCabecote.value = order.tipoCabecote || '';
    if (form.quantidadeCabecotes) form.quantidadeCabecotes.value = order.quantidadeCabecotes || '';
    form.peca.value = order.peca || '';
    if (workshopServicesList) {
      workshopServicesList.innerHTML = '';
      getOrderWorkshopServices(order).forEach(addWorkshopServiceRow);
    }
    if (form.descontoServicoAtivo) form.descontoServicoAtivo.value = order.descontoServicoAtivo ?'true' : 'false';
    if (form.descontoServicoPercentual) form.descontoServicoPercentual.value = toNumber(order.descontoServicoPercentual) || 5;
    if (externalPartsList) {
      externalPartsList.innerHTML = '';
      (order.pecasExternas || []).forEach(addExternalPartRow);
    }
    form.valorTotal.value = toNumber(order.valorTotal);
    form.valorEntrada.value = toNumber(order.valorEntrada);
    form.statusServico.value = order.statusServico || 'recebido';
    form.statusPagamento.value = order.statusPagamento || 'pendente';
    form.formaPagamento.value = order.formaPagamento || '';
    form.dataPagamento.value = order.dataPagamento || '';
    form.recebidoPor.value = order.recebidoPor || '';
    form.observacaoPagamento.value = order.observacaoPagamento || '';
    form.previsaoEntrega.value = order.previsaoEntrega || '';
    form.valorOrcado.value = toNumber(order.valorOrcado) || '';
    form.dataOrcamento.value = order.dataOrcamento || '';
    form.aprovadoCliente.value = order.aprovadoCliente || 'não';
    form.dataAprovacao.value = order.dataAprovacao || '';
    form.observacaoOrcamento.value = order.observacaoOrcamento || '';
    form.dataRetirada.value = order.dataRetirada || '';
    form.retiradoPor.value = order.retiradoPor || '';
    form.documentoRetirada.value = order.documentoRetirada || '';
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
    setupFormCollapsibles(existingOrder);
    setSuggestedPriceMessage(false);

    ['input', 'change'].forEach(function (eventName) {
      form.valorTotal.addEventListener(eventName, updateRemainingPreview);
      form.valorEntrada.addEventListener(eventName, updateRemainingPreview);
      form.statusPagamento.addEventListener(eventName, updateRemainingPreview);
      if (workshopServicesList) workshopServicesList.addEventListener(eventName, updateRemainingPreview);
      if (externalPartsList) externalPartsList.addEventListener(eventName, updateRemainingPreview);
    });
    ['marca', 'modelo', 'motor', 'peca', 'tipoCabecote', 'quantidadeValvulas'].forEach(function (fieldName) {
      if (!form.elements[fieldName]) return;
      form.elements[fieldName].addEventListener('input', function () {
        if (workshopServiceName && document.activeElement === workshopServiceName) openAutocomplete();
      });
    });
    if (workshopServiceName) {
      workshopServiceName.addEventListener('input', function () {
        resetSelectedPriceRecord();
        setSuggestedPriceMessage('');
        openAutocomplete();
        updateServiceDraftUi();
      });
      workshopServiceName.addEventListener('focus', openAutocomplete);
      workshopServiceName.addEventListener('keydown', function (event) {
        if (!workshopServiceSuggestions || workshopServiceSuggestions.hidden) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          autocompleteIndex = Math.min(autocompleteIndex + 1, autocompleteSuggestions.length - 1);
          renderAutocomplete();
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
          renderAutocomplete();
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          selectAutocompleteIndex(autocompleteIndex);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          closeAutocomplete();
          return;
        }
      });
    }
    if (workshopServiceSuggestions) {
      workshopServiceSuggestions.addEventListener('mousedown', function (event) {
        event.preventDefault();
        const button = event.target.closest('[data-suggestion-index]');
        if (!button) return;
        selectAutocompleteIndex(Number(button.dataset.suggestionIndex));
      });
    }
    [workshopServiceChargeType, workshopServiceQuantity, workshopServiceValue].forEach(function (field) {
      if (!field) return;
      field.addEventListener('input', updateServiceDraftUi);
      field.addEventListener('change', updateServiceDraftUi);
    });
    if (workshopServiceValue) {
      workshopServiceValue.addEventListener('input', function () {
        if (serviceSelectedByAutocomplete && selectedPriceRecord) {
          setSuggestedPriceMessage('Preco alterado somente nesta OS. Use o botao para atualizar o padrao.');
        }
      });
    }
    [workshopServiceName, workshopServiceChargeType, workshopServiceQuantity, workshopServiceValue, workshopServiceNote].forEach(function (field) {
      if (!field) return;
      field.addEventListener('keydown', function (event) {
        handleServiceFieldEnter(field, event);
      });
    });
    updateServiceDraftUi();
    document.addEventListener('click', function (event) {
      if (workshopServiceSuggestions && !event.target.closest('.service-name-field')) closeAutocomplete();

      const discountButton = event.target.closest('[data-action="toggle-discount"], #toggleServiceDiscount');
      if (discountButton && form.contains(discountButton)) {
        event.preventDefault();
        event.stopPropagation();
        toggleServiceDiscount();
        return;
      }

      const addPartButton = event.target.closest('[data-action="add-external-part"], #addExternalPart');
      if (addPartButton && form.contains(addPartButton)) {
        event.preventDefault();
        event.stopPropagation();
        addExternalPart();
        return;
      }

      const addServiceButton = event.target.closest('[data-action="add-workshop-service"], #addWorkshopService');
      if (addServiceButton && form.contains(addServiceButton)) {
        event.preventDefault();
        event.stopPropagation();
        addWorkshopService();
        return;
      }

    });
    if (workshopServicesList) {
      workshopServicesList.addEventListener('input', function (event) {
        const row = event.target.closest('[data-workshop-service]');
        if (!row) return;
        updateWorkshopServiceRowSubtotal(row);
        updateRemainingPreview();
      });
      workshopServicesList.addEventListener('change', function (event) {
        const row = event.target.closest('[data-workshop-service]');
        if (!row) return;
        updateWorkshopServiceRowSubtotal(row);
        updateRemainingPreview();
      });
      workshopServicesList.addEventListener('click', function (event) {
        const button = event.target.closest('[data-remove-workshop-service]');
        if (!button) return;
        button.closest('[data-workshop-service]').remove();
        updateRemainingPreview();
      });
    }
    if (externalPartsList) {
      externalPartsList.addEventListener('click', function (event) {
        const button = event.target.closest('[data-remove-external-part]');
        if (!button) return;
        button.closest('[data-external-part]').remove();
        updateRemainingPreview();
      });
    }
    form.statusServico.addEventListener('change', function () {
      if (form.statusServico.value === 'entregue' && !form.dataRetirada.value) {
        form.dataRetirada.value = RetificaStorage.getTodayIso();
      }
      if (['aprovado', 'em execução', 'finalizado', 'entregue'].includes(form.statusServico.value)) {
        form.aprovadoCliente.value = 'sim';
        if (!form.dataAprovacao.value) form.dataAprovacao.value = RetificaStorage.getTodayIso();
      }
      updateRemainingPreview();
    });
    form.statusPagamento.addEventListener('change', function () {
      if (form.statusPagamento.value === 'pago' && !form.dataPagamento.value) {
        form.dataPagamento.value = RetificaStorage.getTodayIso();
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
      optionalItem('Retirado por', order.retiradoPor),
      optionalItem('Documento de quem retirou', order.documentoRetirada)
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
          <div class="item"><strong>Peça recebida</strong>${escapeHtml(order.peca || 'Não informado')}</div>
        </section>

        <h2>Serviço solicitado</h2>
        <section class="grid">
          <div class="item"><strong>Serviços</strong>${escapeHtml(getOrderServicesText(order))}</div>
          <div class="item"><strong>Status do serviço</strong>${escapeHtml(order.statusServico || 'Não informado')}</div>
          <div class="item"><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</div>
          <div class="item"><strong>Previsão de entrega</strong>${formatDate(order.previsaoEntrega)}</div>
        </section>

        <h2>Valores</h2>
        <section class="grid">
          ${renderOrderValueItems(order)}
          <div class="item"><strong>Status do pagamento</strong>${escapeHtml(order.statusPagamento || 'Não informado')}</div>
        </section>

        ${renderWorkshopServicesItems(order) ?`<h2>Serviços da retífica</h2><section class="grid">${renderWorkshopServicesItems(order)}</section>` : ''}
        ${renderExternalPartsItems(order) ?`<h2>Peças externas</h2><section class="grid">${renderExternalPartsItems(order)}</section>` : ''}
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
      dataPagamento: order.dataPagamento || RetificaStorage.getTodayIso(),
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
    if (!order || order.statusPagamento === 'pago') return false;
    const status = order.statusServico || '';
    const budgetStatuses = ['orçamento', 'aguardando aprovação', 'em análise'];
    const blockedStatuses = ['aprovado', 'em execução', 'finalizado', 'entregue', 'recusado'];
    if (budgetStatuses.includes(status)) return true;
    return toNumber(order.valorOrcado) > 0 && !blockedStatuses.includes(status);
  }

  function canApproveOrReject(order) {
    return ['orçamento', 'aguardando aprovação'].includes(order.statusServico);
  }

  function canUseWorkshopLabel(order) {
    return Boolean(order && workshopLabelStatuses.includes(order.statusServico));
  }

  function updateLabelSelectionCount() {
    if (!labelSelectionCount) return;
    const count = selectedLabelOrderIds.size;
    labelSelectionCount.textContent = `${count} ${count === 1 ?'selecionada' : 'selecionadas'}`;
  }

  function updateLabelsModeUi() {
    if (labelsModePanel) labelsModePanel.hidden = !labelsModeActive;
    if (enterLabelsModeButton) enterLabelsModeButton.hidden = labelsModeActive;
  }

  function markLabelsPrinted(orders) {
    const today = RetificaStorage.getTodayIso();
    orders.forEach(function (order) {
      RetificaStorage.updateOrder(order.id, {
        ...order,
        etiquetaImpressa: true,
        dataEtiquetaImpressa: today
      });
    });
  }

  function askToMarkLabelsPrinted(orders, afterMark) {
    window.setTimeout(function () {
      if (!confirm(orders.length > 1 ?'Deseja marcar essas OS como etiqueta impressa?' : 'Deseja marcar essa OS como etiqueta impressa?')) return;
      markLabelsPrinted(orders);
      if (afterMark) afterMark();
    }, 1200);
  }

  function getOrderNumberValue(order) {
    const matches = String(order.numeroOs || '').match(/\d+/g);
    const number = Number(matches ?matches.join('') : 0);
    return Number.isFinite(number) ?number : 0;
  }

  function getDateValue(value, fallback) {
    if (!value) return fallback;
    const time = new Date(value + 'T00:00:00').getTime();
    return Number.isFinite(time) ?time : fallback;
  }

  function orderMatchesQuickFilter(order) {
    if (!activeQuickFilter) return true;
    const remaining = getOrderRemaining(order);
    if (activeQuickFilter === 'aberto') return isWorkInProgress(order);
    if (activeQuickFilter === 'aguardando') return order.statusServico === 'aguardando aprovação';
    if (activeQuickFilter === 'atrasadas') return isOrderLate(order);
    if (activeQuickFilter === 'pendencia') return remaining > 0 && !['pago', 'sem cobrança'].includes(order.statusPagamento);
    if (activeQuickFilter === 'entregues') return order.statusServico === 'entregue';
    if (activeQuickFilter === 'sem-cobranca') return order.statusPagamento === 'sem cobrança';
    return true;
  }

  function sortOrders(orders) {
    const sortValue = serviceSort ?serviceSort.value : 'recentes';
    const sorted = orders.slice();
    sorted.sort(function (a, b) {
      if (sortValue === 'antigas') return getDateValue(a.dataEntrada, 0) - getDateValue(b.dataEntrada, 0);
      if (sortValue === 'maior-valor') return toNumber(b.valorTotal) - toNumber(a.valorTotal);
      if (sortValue === 'maior-pendencia') return getOrderRemaining(b) - getOrderRemaining(a);
      if (sortValue === 'previsao-proxima') return getDateValue(a.previsaoEntrega, Number.MAX_SAFE_INTEGER) - getDateValue(b.previsaoEntrega, Number.MAX_SAFE_INTEGER);
      if (sortValue === 'atrasadas-primeiro') {
        const lateDiff = Number(isOrderLate(b)) - Number(isOrderLate(a));
        return lateDiff || getDateValue(a.previsaoEntrega, Number.MAX_SAFE_INTEGER) - getDateValue(b.previsaoEntrega, Number.MAX_SAFE_INTEGER);
      }
      if (sortValue === 'os-crescente') return getOrderNumberValue(a) - getOrderNumberValue(b);
      if (sortValue === 'os-decrescente') return getOrderNumberValue(b) - getOrderNumberValue(a);
      return getDateValue(b.dataEntrada, 0) - getDateValue(a.dataEntrada, 0);
    });
    return sorted;
  }

  function updateQuickFilterState() {
    quickFilterButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.quickFilter === activeQuickFilter);
    });
  }

  function getVisibleServiceOrders() {
    const search = serviceSearch ?serviceSearch.value.trim().toLowerCase() : '';
    const selectedStatus = statusFilter ?statusFilter.value : 'todos';
    const selectedPayment = paymentFilter ?paymentFilter.value : 'todos';
    const allOrders = RetificaStorage.getOrders();
    const filteredOrders = allOrders.filter(function (order) {
      const searchableText = [getOrderSearchText(order), order.cliente, order.telefone, order.carro, order.peca, getOrderServicesText(order)].join(' ').toLowerCase();
      const searchMatch = !search || searchableText.includes(search);
      const statusMatch = selectedStatus === 'todos'
        || (selectedStatus === 'atrasadas' ?isOrderLate(order) : order.statusServico === selectedStatus);
      const paymentMatch = selectedPayment === 'todos' || order.statusPagamento === selectedPayment;
      const labelsModeMatch = !labelsModeActive || canUseWorkshopLabel(order);
      return searchMatch && statusMatch && paymentMatch && orderMatchesQuickFilter(order) && labelsModeMatch;
    });
    return sortOrders(filteredOrders);
  }

  function detailItem(label, value) {
    return value ?`<span><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</span>` : '';
  }

  function detailDateItem(label, value) {
    return value ?detailItem(label, formatDate(value)) : '';
  }

  function detailMoneyItem(label, value) {
    return toNumber(value) > 0 ?`<span><strong>${escapeHtml(label)}</strong><span class="money-value">${formatCurrency(value)}</span></span>` : '';
  }

  function hasDetailedValues(order) {
    return getOrderServicesTotal(order) > 0
      || toNumber(order.subtotalPecasExternas) > 0
      || toNumber(order.valorDescontoServico) > 0;
  }

  function renderExternalPartsSummary(order) {
    const parts = Array.isArray(order.pecasExternas) ?order.pecasExternas : [];
    if (!parts.length) return '';
    return `<div class="detail-section">
      <h4>Peças externas</h4>
      <div class="order-info-grid">
        ${parts.map(function (part) {
          const title = [part.nome || 'Peça externa', part.fornecedor].filter(Boolean).join(' - ');
          return `<span><strong>${escapeHtml(title)}</strong><span class="money-value">${formatCurrency(part.valor)}</span>${part.observacao ?`<small>${escapeHtml(part.observacao)}</small>` : ''}</span>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderWorkshopServicesSummary(order) {
    const services = getOrderWorkshopServices(order);
    if (!services.length) return '';
    return `<div class="detail-section">
      <h4>Serviços da retífica</h4>
      <div class="order-info-grid">
        ${services.map(function (service) {
          const line = typeof formatWorkshopServiceLine === 'function' ?formatWorkshopServiceLine(service) : formatCurrency(service.subtotal || service.valor);
          return `<span><strong>${escapeHtml(service.nome || 'Serviço não informado')}</strong><span class="money-value">${escapeHtml(line)}</span>${service.observacao ?`<small>${escapeHtml(service.observacao)}</small>` : ''}</span>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderDetailedValueItems(order) {
    if (!hasDetailedValues(order)) return '';
    return [
      detailMoneyItem('Subtotal serviços', getOrderServicesTotal(order)),
      detailMoneyItem('Desconto serviço', order.valorDescontoServico),
      detailMoneyItem('Serviço com desconto', order.valorServicoComDesconto),
      detailMoneyItem('Peças externas', order.subtotalPecasExternas)
    ].join('');
  }

  function scrollToOpenOrder(id) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
      const escapedId = window.CSS && CSS.escape ?CSS.escape(id) : String(id).replace(/"/g, '\\"');
      const card = document.querySelector(`[data-os-id="${escapedId}"]`);
      if (card) {
        const headerOffset = 240;
        const cardTop = card.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(cardTop - headerOffset, 0),
          behavior: 'smooth'
        });
      }
      });
    });
  }

  function renderOrderCard(order) {
    const late = isOrderLate(order);
    const remaining = getOrderRemaining(order);
    const lateBadge = late ?'<span class="badge danger">Atrasada</span>' : '';
    const demoBadge = order.isDemo ?'<span class="badge demo">Demo</span>' : '';
    const workshopLabel = canUseWorkshopLabel(order);
    const labelStatusBadge = labelsModeActive && workshopLabel
      ?`<span class="badge info">${order.etiquetaImpressa ?'Etiqueta impressa' : 'Sem etiqueta'}</span>`
      : '';
    const labelCheckbox = labelsModeActive && workshopLabel
      ?`<label class="label-select"><input type="checkbox" data-label-select="${escapeHtml(order.id)}" ${selectedLabelOrderIds.has(order.id) ?'checked' : ''}> Etiqueta</label>`
      : '';
    const paymentSummaryClass = remaining > 0 ?'value-pending' : 'value-paid';
    const vehicleSummary = order.carro || order.modelo || 'Não informado';
    const waitingApproval = order.statusServico === 'aguardando aprovação';
    const sendBudgetAction = canSendBudget(order)
      ?`<a class="btn btn-mini btn-mini-whatsapp" href="${createBudgetWhatsAppLink(order)}" target="_blank" rel="noopener">Enviar orçamento</a>`
      : '';
    const approvalActions = canApproveOrReject(order)
      ?`<button class="btn btn-mini btn-mini-success" type="button" data-action="approve" data-id="${escapeHtml(order.id)}">Aprovado</button>
        <button class="btn btn-mini btn-mini-danger" type="button" data-action="reject" data-id="${escapeHtml(order.id)}">Recusado</button>`
      : '';
    const paymentWhatsApp = hasReceiptPayment(order)
      ?`<a class="btn btn-secondary" href="${createPaymentWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp pagamento</a>`
      : '';
    const receiptButton = renderReceiptButton(order);
    const quickReceiptButton = renderQuickReceiptButton(order);
    const withdrawalTermButton = renderWithdrawalTermButton(order);
    const withdrawalWhatsApp = canGenerateWithdrawalTerm(order)
      ?`<a class="btn btn-secondary" href="${createWithdrawalWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp retirada</a>`
      : '';
    const orderId = String(order.id);
    const expanded = openOrderId === orderId;
    const hasBudgetDetails = toNumber(order.valorOrcado) > 0 || order.dataOrcamento || order.dataAprovacao || order.observacaoOrcamento;
    const hasWithdrawalDetails = order.dataRetirada || order.retiradoPor || order.documentoRetirada || order.observacaoRetirada;
    const hasPaymentDetails = order.formaPagamento || order.dataPagamento || order.recebidoPor || order.observacaoPagamento;
    const withdrawalDetailItems = [
      detailDateItem('Data de retirada', order.dataRetirada),
      detailItem('Retirado por', order.retiradoPor),
      detailItem('Documento retirada', order.documentoRetirada)
    ].join('');
    const budgetDetails = hasBudgetDetails
      ?`<div class="detail-section">
        <h4>Orçamento</h4>
        <div class="order-info-grid">
          ${detailMoneyItem('Valor orçado', order.valorOrcado)}
          ${detailDateItem('Data do orçamento', order.dataOrcamento)}
          ${detailItem('Aprovação', order.aprovadoCliente || 'não')}
          ${detailDateItem('Data de aprovação', order.dataAprovacao)}
        </div>
        ${order.observacaoOrcamento ?`<div class="order-note"><strong>Observação do orçamento</strong><p>${escapeHtml(order.observacaoOrcamento)}</p></div>` : ''}
      </div>`
      : '';
    const withdrawalDetails = hasWithdrawalDetails
      ?`<div class="detail-section">
        <h4>Retirada</h4>
        ${withdrawalDetailItems ?`<div class="order-info-grid">${withdrawalDetailItems}</div>` : ''}
        ${order.observacaoRetirada ?`<div class="order-note"><strong>Observação de retirada</strong><p>${escapeHtml(order.observacaoRetirada)}</p></div>` : ''}
      </div>`
      : '';
    const paymentItems = [
      detailItem('Forma de pagamento', order.formaPagamento),
      detailDateItem('Data do pagamento', order.dataPagamento),
      detailItem('Recebido por', order.recebidoPor)
    ].join('');
    const paymentDetails = hasPaymentDetails
      ?`<div class="detail-section">
        <h4>Pagamento</h4>
        ${paymentItems ?`<div class="order-info-grid">${paymentItems}</div>` : ''}
        ${order.observacaoPagamento ?`<div class="order-note"><strong>Observação do pagamento</strong><p>${escapeHtml(order.observacaoPagamento)}</p></div>` : ''}
      </div>`
      : '';
    const notesDetails = order.observacoesPeca || order.observacoesGerais
      ?`<div class="detail-section">
        <h4>Observações</h4>
        <div class="history-notes-grid">
          ${order.observacoesPeca ?`<div class="order-note"><strong>Observações da peça</strong><p>${escapeHtml(order.observacoesPeca)}</p></div>` : ''}
          ${order.observacoesGerais ?`<div class="order-note"><strong>Observações gerais</strong><p>${escapeHtml(order.observacoesGerais)}</p></div>` : ''}
        </div>
      </div>`
      : '';
    const detailsHtml = `<div class="order-card-details" ${expanded ?'' : 'hidden'}>
        <div class="detail-section">
          <h4>Dados da OS</h4>
          <div class="order-info-grid">
            <span><strong>Telefone</strong>${escapeHtml(order.telefone || 'Não informado')}</span>
            <span><strong>Carro</strong>${escapeHtml(order.carro || 'Não informado')}</span>
            ${detailItem('Ano', order.ano)}
            ${detailItem('Motor', order.motor)}
            ${detailItem('Marca', order.marca)}
            ${detailItem('Modelo', order.modelo)}
            ${detailItem('Válvulas', order.quantidadeValvulas)}
            ${detailItem('Tipo de cabeçote', order.tipoCabecote)}
            ${detailItem('Qtd. cabeçotes', order.quantidadeCabecotes)}
            <span><strong>Peça recebida</strong>${escapeHtml(order.peca || 'Não informado')}</span>
            <span><strong>Serviços</strong>${escapeHtml(getOrderServicesText(order))}</span>
            <span><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</span>
            ${detailDateItem('Previsão', order.previsaoEntrega)}
          </div>
        </div>
        <div class="order-values">
          ${renderDetailedValueItems(order)}
          <span><strong>Total</strong><span class="money-value">${formatCurrency(order.valorTotal)}</span></span>
          <span><strong>Entrada</strong><span class="money-value">${formatCurrency(order.valorEntrada)}</span></span>
          <span class="${paymentSummaryClass}"><strong>Restante</strong><span class="money-value">${formatCurrency(remaining)}</span></span>
        </div>
        <div class="status-row">
          <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
          <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
        </div>
        ${budgetDetails}
        ${withdrawalDetails}
        ${paymentDetails}
        ${renderWorkshopServicesSummary(order)}
        ${renderExternalPartsSummary(order)}
        ${notesDetails}
        <div class="card-actions service-card-actions">
          <div class="card-actions-group card-actions-flow">
            <span class="card-actions-title">Fluxo</span>
            ${sendBudgetAction}
            ${approvalActions}
            <button class="btn btn-mini" type="button" data-action="status" data-status="em execução" data-id="${escapeHtml(order.id)}">Em execução</button>
            <button class="btn btn-mini" type="button" data-action="status" data-status="finalizado" data-id="${escapeHtml(order.id)}">Finalizado</button>
            <button class="btn btn-mini" type="button" data-action="status" data-status="entregue" data-id="${escapeHtml(order.id)}">Entregue</button>
            <button class="btn btn-mini btn-mini-success" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Pago</button>
          </div>
          <div class="card-actions-group card-actions-communication">
            <span class="card-actions-title">Comunicação</span>
            <a class="btn btn-whatsapp" href="${createWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp</a>
            ${paymentWhatsApp}
            ${withdrawalWhatsApp}
          </div>
          <div class="card-actions-group card-actions-documents">
            <span class="card-actions-title">Documentos</span>
            <button class="btn btn-secondary" type="button" data-action="print" data-id="${escapeHtml(order.id)}">Imprimir OS</button>
            ${receiptButton}
            ${quickReceiptButton}
            ${withdrawalTermButton}
            <button class="btn btn-secondary" type="button" data-action="label" data-id="${escapeHtml(order.id)}">Etiqueta da peça</button>
          </div>
          <div class="card-actions-group card-actions-admin">
            <span class="card-actions-title">Administração</span>
            <a class="btn btn-secondary" href="nova-os.html?id=${encodeURIComponent(order.id)}">Editar</a>
            <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(order.id)}">Excluir</button>
          </div>
        </div>
      </div>`;

    return `
      <article class="order-card ${late ?'is-late' : ''} ${waitingApproval ?'waiting-approval' : ''} ${expanded ?'is-expanded' : ''}" data-id="${escapeHtml(orderId)}" data-os-id="${escapeHtml(orderId)}">
        <div class="order-card-head">
          <div>
            ${labelCheckbox}
            <span class="os-number">${escapeHtml(order.numeroOs)}</span>
            <h3>${escapeHtml(order.cliente || 'Cliente não informado')} ${demoBadge} ${labelStatusBadge}</h3>
          </div>
          ${lateBadge}
        </div>
        <div class="order-summary-grid">
          <span><strong>Veículo/modelo</strong>${escapeHtml(vehicleSummary)}</span>
          <span><strong>Peça recebida</strong>${escapeHtml(order.peca || 'Não informado')}</span>
          <span><strong>Serviço principal</strong>${escapeHtml(getOrderServicesText(order))}</span>
          <span><strong>Total</strong><span class="money-value">${formatCurrency(order.valorTotal)}</span></span>
          <span class="${paymentSummaryClass}"><strong>Restante</strong><span class="money-value">${formatCurrency(remaining)}</span></span>
        </div>
        <div class="order-card-footer">
          <div class="status-row">
            <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
            <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
          </div>
            <button class="btn btn-secondary btn-details-toggle" type="button" data-action="toggle-details" data-order-id="${escapeHtml(orderId)}" aria-expanded="${expanded ?'true' : 'false'}">${expanded ?'Ocultar detalhes' : 'Ver detalhes'}</button>
        </div>
        ${detailsHtml}
      </article>
    `;
  }

  function renderOrders() {
    if (!list) return;
    const orders = getVisibleServiceOrders();

    if (openOrderId && !orders.some(function (order) { return String(order.id) === openOrderId; })) {
      openOrderId = '';
    }

    const visibleIds = new Set(orders.map(function (order) { return String(order.id); }));
    Array.from(selectedLabelOrderIds).forEach(function (id) {
      if (!visibleIds.has(String(id))) selectedLabelOrderIds.delete(id);
    });

    if (ordersResultCount) {
      ordersResultCount.textContent = `${orders.length} ${orders.length === 1 ?'ordem encontrada' : 'ordens encontradas'}`;
    }
    updateLabelSelectionCount();
    updateLabelsModeUi();
    updateQuickFilterState();

    list.innerHTML = orders.length
      ?orders.map(renderOrderCard).join('')
      : `<div class="empty-state">${labelsModeActive ?'Nenhuma peça na oficina disponível para etiqueta.' : 'Nenhuma ordem encontrada para os filtros selecionados.'}</div>`;
  }

  function syncExpandedOrderCard() {
    if (!list) return;
    list.querySelectorAll('.order-card').forEach(function (card) {
      const expanded = Boolean(openOrderId && card.dataset.id === openOrderId);
      const details = card.querySelector('.order-card-details');
      const button = card.querySelector('[data-action="toggle-details"]');
      card.classList.toggle('is-expanded', expanded);
      if (details) details.hidden = !expanded;
      if (button) {
        button.textContent = expanded ?'Ocultar detalhes' : 'Ver detalhes';
        button.setAttribute('aria-expanded', expanded ?'true' : 'false');
      }
    });
  }

  function toggleOrderCardDetails(card, orderId) {
    if (!list || !card) return;
    const clickedId = String(orderId || card.dataset.id || '');
    const shouldOpen = !(card.classList.contains('is-expanded') && openOrderId === clickedId);
    openOrderId = shouldOpen ?clickedId : '';
    syncExpandedOrderCard();
    if (shouldOpen) scrollToOpenOrder(clickedId);
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

  let ordersListEventsReady = false;

  function setupOrdersListEvents() {
    if (!list || ordersListEventsReady) return;
    ordersListEventsReady = true;

    list.addEventListener('change', function (event) {
      const checkbox = event.target.closest('input[data-label-select]');
      if (!checkbox) return;
      if (!labelsModeActive) return;
      if (checkbox.checked) {
        selectedLabelOrderIds.add(checkbox.dataset.labelSelect);
      } else {
        selectedLabelOrderIds.delete(checkbox.dataset.labelSelect);
      }
      updateLabelSelectionCount();
    });

    list.addEventListener('click', function (event) {
      const toggleButton = event.target.closest('[data-action="toggle-details"]');
      if (toggleButton && list.contains(toggleButton)) {
        event.preventDefault();
        event.stopPropagation();
        const card = toggleButton.closest('.order-card');
        toggleOrderCardDetails(card, toggleButton.dataset.orderId);
        return;
      }

      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const order = RetificaStorage.getOrderById(button.dataset.id);
      if (!order) return;

      if (button.dataset.action === 'delete') {
        if (confirm(`Tem certeza que deseja excluir a OS nº ${order.numeroOs}?Esta ação não pode ser desfeita.`)) {
          RetificaStorage.deleteOrder(order.id);
          if (openOrderId === order.id) openOrderId = '';
          renderOrders();
        }
      }

      if (button.dataset.action === 'print') imprimirOS(order);
      if (button.dataset.action === 'label' && imprimirEtiquetaPeca(order)) {
        askToMarkLabelsPrinted([order], function () {
          selectedLabelOrderIds.delete(order.id);
          renderOrders();
        });
      }
      if (button.dataset.action === 'receipt') imprimirRecibo(order);
      if (button.dataset.action === 'quick-receipt') imprimirComprovanteRapido(order);
      if (button.dataset.action === 'withdrawal-term') imprimirTermoRetirada(order);
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
        return sum + (isOrderFinanciallyRelevant(order) ?toNumber(order.valorTotal) : 0);
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
      const labelStatusBadge = canUseWorkshopLabel(order)
        ?`<span class="badge info">${order.etiquetaImpressa ?'Etiqueta impressa' : 'Sem etiqueta'}</span>`
        : '';
      const sendBudgetAction = canSendBudget(order)
        ?`<a class="btn btn-whatsapp" href="${createBudgetWhatsAppLink(order)}" target="_blank" rel="noopener">Enviar orçamento</a>`
        : '';
      const approvalActions = canApproveOrReject(order)
        ?`<button class="btn btn-secondary" type="button" data-action="approve" data-id="${escapeHtml(order.id)}">Marcar como aprovado</button>
          <button class="btn btn-danger" type="button" data-action="reject" data-id="${escapeHtml(order.id)}">Marcar como recusado</button>`
        : '';
      const paidButton = order.statusPagamento !== 'sem cobrança' && (remaining > 0 || order.statusPagamento !== 'pago')
        ?`<button class="btn btn-mini btn-mini-success" type="button" data-action="paid" data-id="${escapeHtml(order.id)}">Marcar como pago</button>`
        : '';
      const paymentWhatsApp = hasReceiptPayment(order)
        ?`<a class="btn btn-secondary" href="${createPaymentWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp pagamento</a>`
        : '';
      const receiptButton = renderReceiptButton(order);
      const quickReceiptButton = renderQuickReceiptButton(order);
      const withdrawalTermButton = renderWithdrawalTermButton(order);
      const withdrawalWhatsApp = canGenerateWithdrawalTerm(order)
        ?`<a class="btn btn-secondary" href="${createWithdrawalWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp retirada</a>`
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
        order.retiradoPor ?`<span><strong>Retirado por</strong>${escapeHtml(order.retiradoPor)}</span>` : '',
        order.documentoRetirada ?`<span><strong>Documento retirada</strong>${escapeHtml(order.documentoRetirada)}</span>` : ''
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
            ${labelStatusBadge}
            <span class="badge ${serviceBadgeClass(order.statusServico)}">${escapeHtml(order.statusServico)}</span>
            <span class="badge ${paymentBadgeClass(order.statusPagamento)}">${escapeHtml(order.statusPagamento)}</span>
          </div>
          <div class="order-info-grid">
            <span><strong>Nome nesta OS</strong>${escapeHtml(order.cliente || 'Não informado')}</span>
            <span><strong>Data de entrada</strong>${formatDate(order.dataEntrada)}</span>
            <span><strong>Carro</strong>${escapeHtml(order.carro || 'Não informado')}</span>
            <span><strong>Ano</strong>${escapeHtml(order.ano || 'Não informado')}</span>
            <span><strong>Motor</strong>${escapeHtml(order.motor || 'Não informado')}</span>
            <span><strong>Peça recebida</strong>${escapeHtml(order.peca || 'Não informado')}</span>
            <span><strong>Serviços</strong>${escapeHtml(getOrderServicesText(order))}</span>
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
            ${receiptButton}
            ${quickReceiptButton}
            ${withdrawalTermButton}
            <button class="btn btn-secondary" type="button" data-action="label" data-id="${escapeHtml(order.id)}">Etiqueta da peça</button>
            <a class="btn btn-whatsapp" href="${createWhatsAppLink(order)}" target="_blank" rel="noopener">WhatsApp</a>
            ${paymentWhatsApp}
            ${withdrawalWhatsApp}
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
      if (button.dataset.action === 'label' && imprimirEtiquetaPeca(order)) {
        askToMarkLabelsPrinted([order], function () {
          renderClients();
        });
      }
      if (button.dataset.action === 'receipt') imprimirRecibo(order);
      if (button.dataset.action === 'quick-receipt') imprimirComprovanteRapido(order);
      if (button.dataset.action === 'withdrawal-term') imprimirTermoRetirada(order);
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
    if (serviceSort) serviceSort.addEventListener('change', renderOrders);
    quickFilterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        activeQuickFilter = activeQuickFilter === button.dataset.quickFilter ?'' : button.dataset.quickFilter;
        renderOrders();
      });
    });
    if (enterLabelsModeButton) {
      enterLabelsModeButton.addEventListener('click', function () {
        labelsModeActive = true;
        selectedLabelOrderIds.clear();
        renderOrders();
      });
    }
    if (exitLabelsModeButton) {
      exitLabelsModeButton.addEventListener('click', function () {
        labelsModeActive = false;
        selectedLabelOrderIds.clear();
        renderOrders();
      });
    }
    if (selectWorkshopLabelsButton) {
      selectWorkshopLabelsButton.addEventListener('click', function () {
        getVisibleServiceOrders().forEach(function (order) {
          if (canUseWorkshopLabel(order)) selectedLabelOrderIds.add(order.id);
        });
        renderOrders();
      });
    }
    if (clearLabelSelectionButton) {
      clearLabelSelectionButton.addEventListener('click', function () {
        selectedLabelOrderIds.clear();
        renderOrders();
      });
    }
    if (printLabelsSheetButton) {
      printLabelsSheetButton.addEventListener('click', function () {
        const selectedOrders = Array.from(selectedLabelOrderIds)
          .map(function (id) { return RetificaStorage.getOrderById(id); })
          .filter(canUseWorkshopLabel);
        if (!selectedOrders.length) {
          alert('Selecione pelo menos uma OS para imprimir etiquetas.');
          return;
        }
        if (imprimirFolhaEtiquetas(selectedOrders)) {
          askToMarkLabelsPrinted(selectedOrders, function () {
            selectedLabelOrderIds.clear();
            renderOrders();
          });
        }
      });
    }
    renderOrders();
    setupOrdersListEvents();
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
