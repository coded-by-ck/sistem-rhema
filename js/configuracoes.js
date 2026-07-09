(function () {
  const form = document.getElementById('companySettingsForm');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const removeLogoButton = document.getElementById('removeLogo');
  const feedback = document.getElementById('settingsFeedback');
  const priceTableSearch = document.getElementById('priceTableSearch');
  const priceTableFilterCategory = document.getElementById('priceTableFilterCategory');
  const priceTableFilterValves = document.getElementById('priceTableFilterValves');
  const priceTableFilterChargeType = document.getElementById('priceTableFilterChargeType');
  const priceTableList = document.getElementById('priceTableList');
  const priceTableId = document.getElementById('priceTableId');
  const priceTableCategory = document.getElementById('priceTableCategory');
  const priceTableValves = document.getElementById('priceTableValves');
  const priceTableService = document.getElementById('priceTableService');
  const priceTableChargeType = document.getElementById('priceTableChargeType');
  const priceTableDefaultPrice = document.getElementById('priceTableDefaultPrice');
  const savePriceTableRecord = document.getElementById('savePriceTableRecord');
  const clearPriceTableForm = document.getElementById('clearPriceTableForm');
  let logoData = '';

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

  function renderLogoPreview(settings) {
    if (!logoPreview) return;
    logoPreview.innerHTML = settings.logo
      ?`<img src="${settings.logo}" alt="Logo da empresa">`
      : `<span>${escapeHtml(settings.sigla || 'RO')}</span>`;
  }

  function fillForm(settings) {
    if (!form) return;
    ['nome', 'telefone', 'endereco', 'cidadeUf', 'cnpj', 'email', 'horario', 'observacoesPadrao', 'rodapeOs'].forEach(function (field) {
      form.elements[field].value = settings[field] || '';
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

  function clearPriceForm() {
    if (priceTableId) priceTableId.value = '';
    if (priceTableCategory) priceTableCategory.value = '';
    if (priceTableValves) priceTableValves.value = '';
    if (priceTableService) priceTableService.value = '';
    if (priceTableChargeType) priceTableChargeType.value = 'servico';
    if (priceTableDefaultPrice) priceTableDefaultPrice.value = '';
  }

  function fillPriceForm(record) {
    if (!record) return;
    priceTableId.value = record.id || '';
    priceTableCategory.value = record.categoria || '';
    priceTableValves.value = record.quantidadeValvulas || '';
    priceTableService.value = record.servico || '';
    priceTableChargeType.value = record.tipoCobranca || 'servico';
    priceTableDefaultPrice.value = record.precoPadrao === null || record.precoPadrao === undefined ?'' : record.precoPadrao;
  }

  function chargeTypeLabel(type) {
    return {
      servico: 'Servico',
      unidade: 'Unidade',
      cabecote: 'Cabecote',
      jogo: 'Jogo'
    }[type] || 'Servico';
  }

  function renderPriceTable() {
    if (!priceTableList || !RetificaStorage.getPriceTable) return;
    const search = normalizeSearch(priceTableSearch && priceTableSearch.value);
    const categorySearch = normalizeSearch(priceTableFilterCategory && priceTableFilterCategory.value);
    const valvesSearch = normalizeSearch(priceTableFilterValves && priceTableFilterValves.value).replace(/\s+/g, '');
    const chargeType = priceTableFilterChargeType ?priceTableFilterChargeType.value : '';
    const rows = RetificaStorage.getPriceTable().filter(function (record) {
      const serviceText = normalizeSearch(record.servico);
      const categoryText = normalizeSearch(record.categoria);
      const valvesText = normalizeSearch(record.quantidadeValvulas).replace(/\s+/g, '');
      return (!search || serviceText.includes(search))
        && (!categorySearch || categoryText.includes(categorySearch))
        && (!valvesSearch || valvesText.includes(valvesSearch))
        && (!chargeType || record.tipoCobranca === chargeType);
    });

    priceTableList.innerHTML = rows.length ?rows.map(function (record) {
      const price = record.precoPadrao === null || record.precoPadrao === undefined ?'Sem preco' : formatCurrency(record.precoPadrao);
      const valves = record.quantidadeValvulas ?` · ${record.quantidadeValvulas}` : '';
      return `
        <div class="price-table-row ${record.ativo === false ?'is-inactive' : ''}">
          <div>
            <strong>${escapeHtml(record.servico)}</strong>
            <span>${escapeHtml(record.categoria)}${escapeHtml(valves)} · ${escapeHtml(chargeTypeLabel(record.tipoCobranca))} · ${escapeHtml(price)}</span>
          </div>
          <div class="price-table-actions">
            <button class="btn btn-secondary btn-mini" type="button" data-edit-price="${escapeHtml(record.id)}">Editar</button>
            <button class="btn btn-danger btn-mini" type="button" data-toggle-price="${escapeHtml(record.id)}">${record.ativo === false ?'Ativar' : 'Desativar'}</button>
          </div>
        </div>
      `;
    }).join('') : '<div class="empty-state">Nenhum preço encontrado.</div>';
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

  if (clearPriceTableForm) clearPriceTableForm.addEventListener('click', clearPriceForm);

  if (savePriceTableRecord) {
    savePriceTableRecord.addEventListener('click', function () {
      const servico = String(priceTableService.value || '').trim();
      if (!servico) {
        showFeedback('Informe o nome do serviço.');
        return;
      }
      RetificaStorage.upsertPriceTableRecord({
        id: priceTableId.value,
        categoria: String(priceTableCategory.value || '').trim() || 'Geral',
        quantidadeValvulas: String(priceTableValves.value || '').trim(),
        servico,
        tipoCobranca: priceTableChargeType.value || 'servico',
        precoPadrao: priceTableDefaultPrice.value === '' ?null : Number(priceTableDefaultPrice.value),
        ativo: true
      });
      clearPriceForm();
      renderPriceTable();
      showFeedback('Preço salvo na tabela.');
    });
  }

  if (priceTableList) {
    priceTableList.addEventListener('click', function (event) {
      const editButton = event.target.closest('[data-edit-price]');
      const toggleButton = event.target.closest('[data-toggle-price]');
      if (editButton) {
        fillPriceForm(RetificaStorage.findPriceTableRecordById(editButton.dataset.editPrice));
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

  renderPriceTable();
})();
