(function () {
  const form = document.getElementById('companySettingsForm');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const removeLogoButton = document.getElementById('removeLogo');
  const feedback = document.getElementById('settingsFeedback');
  const backupFeedback = document.getElementById('backupFeedback');
  const exportBackupButton = document.getElementById('exportBackup');
  const importBackupButton = document.getElementById('importBackup');
  const backupFileInput = document.getElementById('backupFile');
  const priceTableSearch = document.getElementById('priceTableSearch');
  const priceTableFilterCategory = document.getElementById('priceTableFilterCategory');
  const priceTableFilterValves = document.getElementById('priceTableFilterValves');
  const priceTableFilterChargeType = document.getElementById('priceTableFilterChargeType');
  const clearPriceTableFilters = document.getElementById('clearPriceTableFilters');
  const priceTableList = document.getElementById('priceTableList');
  const priceTableEditor = document.getElementById('priceTableEditor');
  const priceTableFormTitle = document.getElementById('priceTableFormTitle');
  const priceTableFormHint = document.getElementById('priceTableFormHint');
  const newPriceTableRecord = document.getElementById('newPriceTableRecord');
  const priceTableId = document.getElementById('priceTableId');
  const priceTableCategory = document.getElementById('priceTableCategory');
  const priceTableValves = document.getElementById('priceTableValves');
  const priceTableService = document.getElementById('priceTableService');
  const priceTableChargeType = document.getElementById('priceTableChargeType');
  const priceTableDefaultPrice = document.getElementById('priceTableDefaultPrice');
  const priceTableNote = document.getElementById('priceTableNote');
  const priceTableActive = document.getElementById('priceTableActive');
  const savePriceTableRecord = document.getElementById('savePriceTableRecord');
  const clearPriceTableForm = document.getElementById('clearPriceTableForm');
  let logoData = '';
  let priceFormMode = 'create';
  let editingPriceId = '';

  function showFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.add('is-visible');
    window.clearTimeout(showFeedback.timer);
    showFeedback.timer = window.setTimeout(function () {
      feedback.classList.remove('is-visible');
      feedback.textContent = '';
    }, 3000);
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

  function renderLogoPreview(settings) {
    if (!logoPreview) return;
    logoPreview.innerHTML = settings.logo
      ?`<img src="${settings.logo}" alt="Logo da empresa">`
      : `<span>${escapeHtml(settings.sigla || 'RO')}</span>`;
  }

  function fillForm(settings) {
    if (!form) return;
    ['nome', 'telefone', 'endereco', 'cidadeUf', 'cnpj', 'email', 'horario', 'observacoesPadrao', 'rodapeOs'].forEach(function (field) {
      if (form.elements[field]) form.elements[field].value = settings[field] || '';
    });
    logoData = settings.logo || '';
    renderLogoPreview(settings);
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeValves(value) {
    return normalizeSearch(value).replace(/\s+/g, '');
  }

  function chargeTypeLabel(type) {
    return {
      servico: 'Serviço',
      unidade: 'Unidade',
      cabecote: 'Cabeçote',
      jogo: 'Jogo'
    }[type] || 'Serviço';
  }

  function getPriceTable() {
    return RetificaStorage.getPriceTable ?RetificaStorage.getPriceTable() : [];
  }

  function saveCompletePriceTable(table) {
    if (!RetificaStorage.savePriceTable) return table;
    return RetificaStorage.savePriceTable(table);
  }

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getDuplicateKey(record) {
    return [
      normalizeSearch(record.categoria || 'Geral'),
      normalizeValves(record.quantidadeValvulas),
      normalizeSearch(record.servico),
      record.tipoCobranca || 'servico'
    ].join('|');
  }

  function findDuplicate(record, ignoreId) {
    const key = getDuplicateKey(record);
    return getPriceTable().find(function (item) {
      return item.id !== ignoreId && getDuplicateKey(item) === key;
    }) || null;
  }

  function setPriceFormMode(mode, record) {
    priceFormMode = mode === 'edit' ?'edit' : 'create';
    editingPriceId = record && record.id ?record.id : '';
    if (priceTableId) priceTableId.value = editingPriceId;
    if (priceTableFormTitle) priceTableFormTitle.textContent = priceFormMode === 'edit' ?'Editar preço' : 'Novo preço';
    if (priceTableFormHint) priceTableFormHint.textContent = priceFormMode === 'edit'
      ?'Altere somente os dados deste registro.'
      : 'Preencha os dados para criar um novo preço padrão.';
    if (savePriceTableRecord) savePriceTableRecord.textContent = priceFormMode === 'edit' ?'Salvar alterações' : 'Salvar novo preço';
  }

  function clearPriceForm() {
    setPriceFormMode('create');
    if (priceTableCategory) priceTableCategory.value = '';
    if (priceTableValves) priceTableValves.value = '';
    if (priceTableService) priceTableService.value = '';
    if (priceTableChargeType) priceTableChargeType.value = 'servico';
    if (priceTableDefaultPrice) priceTableDefaultPrice.value = '';
    if (priceTableNote) priceTableNote.value = '';
    if (priceTableActive) priceTableActive.checked = true;
  }

  function closePriceForm() {
    if (priceTableEditor) priceTableEditor.hidden = true;
    clearPriceForm();
  }

  function openPriceForm(mode, record) {
    clearPriceForm();
    setPriceFormMode(mode, record);
    if (record) {
      if (priceTableCategory) priceTableCategory.value = record.categoria || '';
      if (priceTableValves) priceTableValves.value = record.quantidadeValvulas || '';
      if (priceTableService) priceTableService.value = record.servico || '';
      if (priceTableChargeType) priceTableChargeType.value = record.tipoCobranca || 'servico';
      if (priceTableDefaultPrice) priceTableDefaultPrice.value = record.precoPadrao === null || record.precoPadrao === undefined ?'' : record.precoPadrao;
      if (priceTableNote) priceTableNote.value = record.observacao || '';
      if (priceTableActive) priceTableActive.checked = record.ativo !== false;
    }
    if (priceTableEditor) priceTableEditor.hidden = false;
    if (priceTableService) priceTableService.focus();
  }

  function getPriceFormRecord() {
    const priceText = String(priceTableDefaultPrice && priceTableDefaultPrice.value || '').trim();
    return {
      id: editingPriceId,
      categoria: String(priceTableCategory && priceTableCategory.value || '').trim() || 'Geral',
      quantidadeValvulas: String(priceTableValves && priceTableValves.value || '').trim(),
      servico: String(priceTableService && priceTableService.value || '').trim(),
      tipoCobranca: String(priceTableChargeType && priceTableChargeType.value || '').trim(),
      precoPadrao: priceText === '' ?null : Number(priceText),
      observacao: String(priceTableNote && priceTableNote.value || '').trim(),
      ativo: priceTableActive ?priceTableActive.checked : true
    };
  }

  function validatePriceRecord(record) {
    if (!record.servico) return 'Informe o nome do serviço.';
    if (!record.tipoCobranca) return 'Informe o tipo de cobrança.';
    if (!['servico', 'unidade', 'cabecote', 'jogo'].includes(record.tipoCobranca)) return 'Tipo de cobrança inválido.';
    if (record.precoPadrao !== null && (!Number.isFinite(record.precoPadrao) || record.precoPadrao < 0)) return 'O preço deve ser um número maior ou igual a zero.';
    return '';
  }

  function getFilteredPriceRows() {
    const search = normalizeSearch(priceTableSearch && priceTableSearch.value);
    const categorySearch = normalizeSearch(priceTableFilterCategory && priceTableFilterCategory.value);
    const valvesSearch = normalizeValves(priceTableFilterValves && priceTableFilterValves.value);
    const chargeType = priceTableFilterChargeType ?priceTableFilterChargeType.value : '';
    return getPriceTable().filter(function (record) {
      const serviceText = normalizeSearch(record.servico);
      const categoryText = normalizeSearch(record.categoria);
      const valvesText = normalizeValves(record.quantidadeValvulas);
      return (!search || serviceText.includes(search))
        && (!categorySearch || categoryText.includes(categorySearch))
        && (!valvesSearch || valvesText.includes(valvesSearch))
        && (!chargeType || record.tipoCobranca === chargeType);
    });
  }

  function renderPriceTable() {
    if (!priceTableList) return;
    const rows = getFilteredPriceRows();
    priceTableList.innerHTML = rows.length ?rows.map(function (record) {
      const price = record.precoPadrao === null || record.precoPadrao === undefined ?'Sem preço' : formatCurrency(record.precoPadrao);
      const valves = record.quantidadeValvulas ?` · ${record.quantidadeValvulas}` : '';
      const status = record.ativo === false ?'Inativo' : 'Ativo';
      return `
        <div class="price-table-row ${record.ativo === false ?'is-inactive' : ''}">
          <div class="price-table-main">
            <strong>${escapeHtml(record.servico)}</strong>
            <span>${escapeHtml(record.categoria || 'Geral')}${escapeHtml(valves)} · ${escapeHtml(chargeTypeLabel(record.tipoCobranca))}</span>
          </div>
          <div class="price-table-meta">
            <strong>${escapeHtml(price)}</strong>
            <span>${escapeHtml(status)}</span>
          </div>
          <div class="price-table-actions">
            <button class="btn btn-secondary btn-mini" type="button" data-edit-price="${escapeHtml(record.id)}">Editar</button>
            <button class="btn btn-danger btn-mini" type="button" data-toggle-price="${escapeHtml(record.id)}">${record.ativo === false ?'Ativar' : 'Desativar'}</button>
          </div>
        </div>
      `;
    }).join('') : '<div class="empty-state">Nenhum preço encontrado para os filtros atuais.</div>';
  }

  function savePriceRecord() {
    const record = getPriceFormRecord();
    const validationMessage = validatePriceRecord(record);
    if (validationMessage) {
      showFeedback(validationMessage);
      return;
    }

    const duplicate = findDuplicate(record, priceFormMode === 'edit' ?editingPriceId : '');
    if (duplicate) {
      const shouldEdit = confirm('Já existe um preço com a mesma categoria, válvulas, serviço e tipo de cobrança. Deseja editar o existente?');
      if (shouldEdit) openPriceForm('edit', duplicate);
      return;
    }

    const table = getPriceTable();
    let nextTable;
    if (priceFormMode === 'edit') {
      const targetId = editingPriceId;
      if (!targetId || !table.some(function (item) { return item.id === targetId; })) {
        showFeedback('Registro de preço não encontrado.');
        return;
      }
      nextTable = table.map(function (item) {
        if (item.id !== targetId) return item;
        return {
          ...item,
          ...record,
          id: targetId,
          atualizadoEm: new Date().toISOString()
        };
      });
      saveCompletePriceTable(nextTable);
      showFeedback('Preço atualizado.');
    } else {
      const newRecord = {
        ...record,
        id: createId('preco'),
        atualizadoEm: new Date().toISOString()
      };
      nextTable = table.concat(newRecord);
      saveCompletePriceTable(nextTable);
      showFeedback('Preço cadastrado.');
    }
    closePriceForm();
    renderPriceTable();
  }

  function clearPriceFilters() {
    if (priceTableFilterCategory) priceTableFilterCategory.value = '';
    if (priceTableFilterValves) priceTableFilterValves.value = '';
    if (priceTableSearch) priceTableSearch.value = '';
    if (priceTableFilterChargeType) priceTableFilterChargeType.value = '';
    renderPriceTable();
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

  function exportBackup() {
    const orders = RetificaStorage.getOrders();
    const backup = {
      sistema: 'Retífica OS',
      versao: typeof BACKUP_VERSION !== 'undefined' ?BACKUP_VERSION : 1,
      geradoEm: new Date().toISOString(),
      totalRegistros: orders.length,
      ordens: orders,
      configuracoesEmpresa: getCompanySettings(),
      tabelaPrecos: RetificaStorage.getPriceTable ?RetificaStorage.getPriceTable() : [],
      catalogoServicos: RetificaStorage.getServiceCatalog ?RetificaStorage.getServiceCatalog() : []
    };
    downloadJson(getBackupFileName(), backup);
    showBackupMessage('Backup exportado com sucesso.');
  }

  function restoreBackup(file) {
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
        if (Array.isArray(data.tabelaPrecos) && RetificaStorage.savePriceTable) RetificaStorage.savePriceTable(data.tabelaPrecos);
        if (Array.isArray(data.catalogoServicos) && RetificaStorage.saveServiceCatalog) RetificaStorage.saveServiceCatalog(data.catalogoServicos);
        fillForm(getCompanySettings());
        renderPriceTable();
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

  if (!form) return;

  fillForm(getCompanySettings());

  if (logoInput) {
    logoInput.addEventListener('change', function () {
      const file = logoInput.files && logoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        logoData = String(reader.result || '');
        renderLogoPreview({ ...getCompanySettings(), logo: logoData });
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeLogoButton) {
    removeLogoButton.addEventListener('click', function () {
      logoData = '';
      if (logoInput) logoInput.value = '';
      renderLogoPreview({ ...getCompanySettings(), logo: '' });
    });
  }

  [priceTableSearch, priceTableFilterCategory, priceTableFilterValves, priceTableFilterChargeType].forEach(function (field) {
    if (!field) return;
    field.addEventListener('input', renderPriceTable);
    field.addEventListener('change', renderPriceTable);
  });

  if (clearPriceTableFilters) clearPriceTableFilters.addEventListener('click', clearPriceFilters);
  if (newPriceTableRecord) newPriceTableRecord.addEventListener('click', function () { openPriceForm('create'); });
  if (clearPriceTableForm) clearPriceTableForm.addEventListener('click', closePriceForm);
  if (savePriceTableRecord) savePriceTableRecord.addEventListener('click', savePriceRecord);
  if (priceTableEditor) {
    priceTableEditor.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') event.preventDefault();
    });
  }

  if (priceTableList) {
    priceTableList.addEventListener('click', function (event) {
      const editButton = event.target.closest('[data-edit-price]');
      const toggleButton = event.target.closest('[data-toggle-price]');
      if (editButton) {
        const record = RetificaStorage.findPriceTableRecordById(editButton.dataset.editPrice);
        if (record) openPriceForm('edit', record);
        return;
      }
      if (toggleButton) {
        const record = RetificaStorage.findPriceTableRecordById(toggleButton.dataset.togglePrice);
        if (!record) return;
        RetificaStorage.setPriceTableRecordActive(record.id, record.ativo === false);
        renderPriceTable();
        showFeedback(record.ativo === false ?'Preço ativado.' : 'Preço desativado.');
      }
    });
  }

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

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(form);
    const current = getCompanySettings();
    const settings = RetificaStorage.saveCompanySettings({
      ...current,
      nome: String(data.get('nome') || '').trim(),
      telefone: String(data.get('telefone') || '').trim(),
      endereco: String(data.get('endereco') || '').trim(),
      cidadeUf: String(data.get('cidadeUf') || '').trim(),
      cnpj: String(data.get('cnpj') || '').trim(),
      email: String(data.get('email') || '').trim(),
      horario: String(data.get('horario') || '').trim(),
      observacoesPadrao: String(data.get('observacoesPadrao') || '').trim(),
      rodapeOs: String(data.get('rodapeOs') || '').trim(),
      logo: logoData
    });

    fillForm(settings);
    applyCompanyBrand();
    showFeedback('Configurações salvas com sucesso.');
  });

  closePriceForm();
  renderPriceTable();
})();
