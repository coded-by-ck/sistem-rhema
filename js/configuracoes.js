(function () {
  const form = document.getElementById('companySettingsForm');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const removeLogoButton = document.getElementById('removeLogo');
  const feedback = document.getElementById('settingsFeedback');
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
})();
