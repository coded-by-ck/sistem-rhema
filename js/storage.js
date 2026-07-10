(function () {
  const OS_KEY = 'retificaOS.orders';
  const SESSION_KEY = 'retificaOS.loggedIn';
  const NEXT_OS_KEY = 'retificaOS.nextOsNumber';
  const DEMO_FLAG = 'retificaOS.demoLoaded';
  const COMPANY_KEY = 'retificaOS.companySettings';
  const SUGGESTED_PRICES_KEY = 'retifica_precos_sugeridos';
  const PRICE_TABLE_KEY = 'retificaOS.priceTable';
  const SERVICE_CATALOG_KEY = 'retificaOS.serviceCatalog';
  const CHARGE_TYPES = ['servico', 'unidade', 'cabecote', 'jogo'];

  const INITIAL_PRICE_TABLE = [
    { id: 'preco-inicial-1', categoria: 'Scania 113', servico: 'Plaina', tipoCobranca: 'servico', precoPadrao: 300 },
    { id: 'preco-inicial-2', categoria: 'Scania 113', servico: 'Retificar sedes', tipoCobranca: 'unidade', precoPadrao: 15 },
    { id: 'preco-inicial-3', categoria: 'Scania 113', servico: 'Frisar', tipoCobranca: 'servico', precoPadrao: null },
    { id: 'preco-inicial-4', categoria: 'Perkins', servico: 'Plaina', tipoCobranca: 'servico', precoPadrao: 350 },
    { id: 'preco-inicial-5', categoria: 'Perkins', servico: 'Esmerilhar e montar', tipoCobranca: 'servico', precoPadrao: 150 },
    { id: 'preco-inicial-6', categoria: 'Cummins', servico: 'Plaina', tipoCobranca: 'servico', precoPadrao: 500 },
    { id: 'preco-inicial-8v-1', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Plainar cabeçote', tipoCobranca: 'servico', precoPadrao: 200 },
    { id: 'preco-inicial-8v-2', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Trocar guias', tipoCobranca: 'servico', precoPadrao: 100 },
    { id: 'preco-inicial-8v-3', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Retificar sedes', tipoCobranca: 'servico', precoPadrao: 100 },
    { id: 'preco-inicial-8v-4', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Esmerilhar e montar', tipoCobranca: 'servico', precoPadrao: 100 },
    { id: 'preco-inicial-8v-5', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Regular válvulas', tipoCobranca: 'servico', precoPadrao: 150 },
    { id: 'preco-inicial-8v-6', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Teste de trinca eletrônico', tipoCobranca: 'servico', precoPadrao: 120 },
    { id: 'preco-inicial-8v-7', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Banho químico', tipoCobranca: 'servico', precoPadrao: 100 },
    { id: 'preco-inicial-8v-8', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Serviço de solda', tipoCobranca: 'servico', precoPadrao: 50 },
    { id: 'preco-inicial-8v-9', categoria: 'Geral', quantidadeValvulas: '8V', servico: 'Trocar selo', tipoCobranca: 'servico', precoPadrao: 30 }
  ];
  const INITIAL_SERVICE_CATALOG = [
    'Plainar cabeçote',
    'Trocar guias',
    'Retificar sedes',
    'Esmerilhar e montar',
    'Regular válvulas',
    'Frisar cabeçotes',
    'Trocar vedadores',
    'Trocar sedes',
    'Adaptar guias',
    'Serviço de sacar prisioneiros',
    'Adaptar roscas',
    'Teste de trinca eletrônico',
    'Banho químico',
    'Trocar camisa de bico',
    'Serviço de solda',
    'Trocar selo'
  ];
  const REMOVED_OLD_SEED_RECORDS = [
    { id: 'preco-inicial-7', categoria: 'Scania 124', servico: 'Plaina', tipoCobranca: 'unidade', precoPadrao: 100 },
    { id: 'preco-inicial-8', categoria: 'Scania 124', servico: 'Trocar guia', tipoCobranca: 'servico', precoPadrao: 50 },
    { id: 'preco-inicial-9', categoria: 'Scania 124', servico: 'Retificar sede', tipoCobranca: 'unidade', precoPadrao: 50 },
    { id: 'preco-inicial-10', categoria: 'Scania 124', servico: 'Esmerilhar', tipoCobranca: 'unidade', precoPadrao: 50 },
    { id: 'preco-inicial-11', categoria: 'Scania 124', servico: 'Troca de anel', tipoCobranca: 'servico', precoPadrao: 50 },
    { id: 'preco-inicial-12', categoria: 'Scania 124', servico: 'Frisar', tipoCobranca: 'servico', precoPadrao: 50 },
    { id: 'preco-inicial-13', categoria: 'Scania 124', servico: 'Banho químico', tipoCobranca: 'servico', precoPadrao: 40 },
    { id: 'preco-inicial-14', categoria: 'Scania 124', servico: 'Pistão', tipoCobranca: 'servico', precoPadrao: 40 },
    { id: 'preco-inicial-15', categoria: 'Scania 124', servico: 'Trocar selo', tipoCobranca: 'unidade', precoPadrao: 10 },
    { id: 'preco-inicial-5', categoria: 'Perkins', servico: 'Montagem', tipoCobranca: 'servico', precoPadrao: 150 },
    { id: 'preco-inicial-16', categoria: 'Fiat / Palio', servico: 'Plaina', tipoCobranca: 'unidade', precoPadrao: 80 },
    { id: 'preco-inicial-17', categoria: 'Fiat / Palio', servico: 'Retífica de válvula / sede', tipoCobranca: 'unidade', precoPadrao: 15 },
    { id: 'preco-inicial-18', categoria: 'Fiat / Palio', servico: 'Descarbonização', tipoCobranca: 'servico', precoPadrao: 100 },
    { id: 'preco-inicial-19', categoria: 'Fiat / Palio', servico: 'Esmerilhamento', tipoCobranca: 'unidade', precoPadrao: 20 },
    { id: 'preco-inicial-20', categoria: 'Fiat / Palio', servico: 'Banho químico', tipoCobranca: 'servico', precoPadrao: 30 },
    { id: 'preco-inicial-21', categoria: 'Fiat / Palio', servico: 'Troca de selo', tipoCobranca: 'unidade', precoPadrao: 5 },
    { id: 'preco-inicial-22', categoria: 'Fiat / Palio', servico: 'Guia', tipoCobranca: 'unidade', precoPadrao: 20 }
  ];

  const DEFAULT_COMPANY = {
    nome: 'Retífica OS',
    sigla: 'RO',
    telefone: '',
    endereco: '',
    cidadeUf: '',
    cnpj: '',
    email: '',
    horario: '',
    observacoesPadrao: '',
    rodapeOs: '',
    logo: ''
  };

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ?JSON.parse(value) : fallback;
    } catch (error) {
      console.warn('Falha ao ler localStorage:', error);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function safeNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ?number : 0;
  }

  function nullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ?number : null;
  }

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeTextForKey(value) {
    const text = String(value == null ?'' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'nao-informado';
  }

  function normalizeValvesForKey(value) {
    const text = normalizeTextForKey(value).replace(/\s+/g, '');
    const match = text.match(/^(\d+)(v|valvulas?)?$/);
    if (match) return `${match[1]}v`;
    return text || 'nao-informado';
  }

  function normalizeServiceForKey(value) {
    const text = normalizeTextForKey(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return text || 'nao-informado';
  }

  function formatKnownServiceName(value) {
    const original = String(value || '').trim();
    const key = normalizeTextForKey(original);
    const names = {
      'banho quimico': 'Banho químico',
      pistao: 'Pistão',
      'retifica de valvula / sede': 'Retífica de válvula / sede',
      descarbonizacao: 'Descarbonização',
      'troca de selo': 'Troca de selo',
      'plainar cabecote': 'Plainar cabeçote',
      'regular valvulas': 'Regular válvulas',
      'frisar cabecotes': 'Frisar cabeçotes',
      'teste de trinca eletronico': 'Teste de trinca eletrônico',
      'servico de solda': 'Serviço de solda',
      'servico de sacar prisioneiros': 'Serviço de sacar prisioneiros'
    };
    return names[key] || original;
  }

  function normalizePriceTableRecord(record, index) {
    const source = record || {};
    const tipoCobranca = CHARGE_TYPES.includes(source.tipoCobranca) ?source.tipoCobranca : 'servico';
    return {
      id: String(source.id || createId(`preco-${index || 0}`)),
      categoria: String(source.categoria || '').trim() || 'Geral',
      quantidadeValvulas: String(source.quantidadeValvulas || source.qtdValvulas || '').trim(),
      servico: formatKnownServiceName(source.servico || source.nome),
      tipoCobranca,
      precoPadrao: nullableNumber(source.precoPadrao),
      ativo: source.ativo !== false,
      atualizadoEm: source.atualizadoEm || ''
    };
  }

  function normalizePriceTable(records) {
    return (Array.isArray(records) ?records : []).map(normalizePriceTableRecord).filter(function (record) {
      return record.servico;
    });
  }

  function normalizeCatalogRecord(record, index) {
    const source = typeof record === 'string' ?{ servico: record } : (record || {});
    return {
      id: String(source.id || `catalogo-inicial-${index + 1}`),
      servico: formatKnownServiceName(source.servico || source.nome),
      ativo: source.ativo !== false
    };
  }

  function normalizeServiceCatalog(records) {
    return (Array.isArray(records) ?records : []).map(normalizeCatalogRecord).filter(function (record) {
      return record.servico;
    });
  }

  function getDefaultServiceCatalog() {
    return INITIAL_SERVICE_CATALOG.map(normalizeCatalogRecord);
  }

  function getDefaultPriceTable() {
    return INITIAL_PRICE_TABLE.map(function (record, index) {
      return normalizePriceTableRecord({
        ...record,
        id: record.id || `preco-inicial-${index + 1}`,
        ativo: true,
        atualizadoEm: ''
      }, index);
    });
  }

  function sameSeedRecord(record, seed) {
    return record.id === seed.id
      && record.categoria === seed.categoria
      && normalizeTextForKey(record.servico) === normalizeTextForKey(seed.servico)
      && record.tipoCobranca === seed.tipoCobranca
      && nullableNumber(record.precoPadrao) === nullableNumber(seed.precoPadrao);
  }

  function mergeMissingInitialPrices(records) {
    const merged = records.slice();
    getDefaultPriceTable().forEach(function (seed) {
      const exists = merged.some(function (record) {
        return record.id === seed.id
          || (
            normalizeTextForKey(record.categoria) === normalizeTextForKey(seed.categoria)
            && normalizeValvesForKey(record.quantidadeValvulas || '') === normalizeValvesForKey(seed.quantidadeValvulas || '')
            && normalizeTextForKey(record.servico) === normalizeTextForKey(seed.servico)
          );
      });
      if (!exists) merged.push(seed);
    });
    return merged;
  }

  function readPriceTable() {
    const current = read(PRICE_TABLE_KEY, null);
    if (Array.isArray(current)) {
      const normalized = normalizePriceTable(current);
      const migrated = normalized.filter(function (record) {
        const removedOldSeed = REMOVED_OLD_SEED_RECORDS.some(function (seed) {
          return sameSeedRecord(record, seed);
        });
        return !removedOldSeed;
      });
      const merged = mergeMissingInitialPrices(migrated);
      if (merged.length !== normalized.length) write(PRICE_TABLE_KEY, merged);
      return merged;
    }
    const initial = getDefaultPriceTable();
    write(PRICE_TABLE_KEY, initial);
    return initial;
  }

  function readServiceCatalog() {
    const current = read(SERVICE_CATALOG_KEY, null);
    if (Array.isArray(current)) return normalizeServiceCatalog(current);
    const initial = getDefaultServiceCatalog();
    write(SERVICE_CATALOG_KEY, initial);
    return initial;
  }

  function normalizeChargeType(value) {
    return CHARGE_TYPES.includes(value) ?value : 'servico';
  }

  function normalizeWorkshopService(service) {
    const source = service || {};
    const nome = formatKnownServiceName(source.nome || source.servico || source.tipoServico);
    const tipoCobranca = normalizeChargeType(source.tipoCobranca);
    const quantidade = safeNumber(source.quantidade) > 0 ?safeNumber(source.quantidade) : 1;
    const unitValue = source.valorUnitario !== undefined && source.valorUnitario !== null && source.valorUnitario !== ''
      ?safeNumber(source.valorUnitario)
      : safeNumber(source.valor);
    const subtotal = source.subtotal !== undefined && source.subtotal !== null && source.subtotal !== ''
      ?safeNumber(source.subtotal)
      : quantidade * unitValue;
    return {
      id: String(source.id || createId('servico-os')),
      nome,
      categoriaPreco: String(source.categoriaPreco || source.categoria || '').trim(),
      tipoCobranca,
      quantidade,
      valorUnitario: unitValue,
      subtotal,
      valor: subtotal,
      observacao: String(source.observacao || '').trim(),
      origemPreco: source.origemPreco === 'tabela' ?'tabela' : 'manual',
      precoTabelaId: String(source.precoTabelaId || source.priceTableId || '').trim()
    };
  }

  function getCombinationSource(data) {
    return data || {};
  }

  function getPriceCombinationFields(data) {
    const source = getCombinationSource(data);
    return {
      quantidadeValvulas: source.quantidadeValvulas || source.qtdValvulas,
      servico: source.servico || source.nomeServico || source.nome || source.tipoServico
    };
  }

  function isCompletePriceCombination(data) {
    const fields = getPriceCombinationFields(data);
    return ['quantidadeValvulas', 'servico'].every(function (field) {
      return String(fields[field] || '').trim() !== '';
    });
  }

  function generatePriceKey(data) {
    const source = getPriceCombinationFields(data);
    return [
      normalizeValvesForKey(source.quantidadeValvulas),
      normalizeServiceForKey(source.servico || source.tipoServico)
    ].join('|');
  }

  function normalizeWorkshopServices(order) {
    const source = order || {};
    const services = Array.isArray(source.servicosRetifica) ?source.servicosRetifica : [];
    const normalized = services.map(function (service) {
      return normalizeWorkshopService(service);
    }).filter(function (service) {
      return service.nome || service.subtotal > 0 || service.observacao;
    });

    if (normalized.length) return normalized;

    const legacyName = formatKnownServiceName(source.servico || source.tipoServico);
    const subtotalPecasExternas = normalizeExternalParts(source.pecasExternas).reduce(function (sum, part) {
      return sum + safeNumber(part.valor);
    }, 0);
    const legacyValue = source.valorServicoRetifica !== undefined && source.valorServicoRetifica !== null && source.valorServicoRetifica !== ''
      ?safeNumber(source.valorServicoRetifica)
      : Math.max(safeNumber(source.valorTotal) - subtotalPecasExternas, 0);
    if (!legacyName && legacyValue <= 0) return [];
    return [{
      id: createId('servico-os'),
      nome: legacyName || 'Servi?o n?o informado',
      categoriaPreco: '',
      tipoCobranca: 'servico',
      quantidade: 1,
      valorUnitario: legacyValue,
      subtotal: legacyValue,
      valor: legacyValue,
      observacao: '',
      origemPreco: 'manual',
      precoTabelaId: ''
    }];
  }

  function normalizeExternalParts(parts) {
    if (!Array.isArray(parts)) return [];
    return parts.map(function (part) {
      return {
        nome: String(part && part.nome || '').trim(),
        fornecedor: String(part && part.fornecedor || '').trim(),
        valor: safeNumber(part && part.valor),
        observacao: String(part && part.observacao || '').trim()
      };
    }).filter(function (part) {
      return part.nome || part.fornecedor || part.valor > 0 || part.observacao;
    });
  }

  function calculateOrderValues(order) {
    const servicosRetifica = normalizeWorkshopServices(order);
    const subtotalServicosRetifica = servicosRetifica.reduce(function (sum, service) {
      return sum + safeNumber(service.subtotal || service.valor);
    }, 0);
    const pecasExternas = normalizeExternalParts(order.pecasExternas);
    const subtotalPecasExternas = pecasExternas.reduce(function (sum, part) {
      return sum + safeNumber(part.valor);
    }, 0);
    const descontoServicoAtivo = order.descontoServicoAtivo === true || order.descontoServicoAtivo === 'true';
    const descontoServicoPercentual = descontoServicoAtivo ?safeNumber(order.descontoServicoPercentual || 5) : 0;
    const valorDescontoServico = descontoServicoAtivo ?subtotalServicosRetifica * (descontoServicoPercentual / 100) : 0;
    const valorServicoComDesconto = Math.max(subtotalServicosRetifica - valorDescontoServico, 0);
    const valorTotal = valorServicoComDesconto + subtotalPecasExternas;

    return {
      servicosRetifica,
      subtotalServicosRetifica,
      pecasExternas,
      subtotalPecasExternas,
      valorServicoRetifica: subtotalServicosRetifica,
      descontoServicoAtivo,
      descontoServicoPercentual,
      valorDescontoServico,
      valorServicoComDesconto,
      valorTotal
    };
  }

  function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function calculateRemaining(order) {
    const total = safeNumber(order.valorTotal);
    const entrada = safeNumber(order.valorEntrada);
    if (order.statusPagamento === 'pago' || order.statusPagamento === 'sem cobrança') return 0;
    return Math.max(total - entrada, 0);
  }

  function normalizePaymentStatus(status, statusServico, total, entrada) {
    const value = String(status || 'pendente').trim().toLowerCase();
    if (statusServico === 'recusado' && total === 0 && entrada === 0) return 'sem cobrança';
    return ['pendente', 'parcial', 'pago', 'sem cobrança'].includes(value) ?value : 'pendente';
  }

  function normalizeApprovalValue(value) {
    return value === 'sim' || value === true ?'sim' : 'não';
  }

  function normalizeServiceStatus(status) {
    const value = String(status || 'recebido').trim().toLowerCase();
    const allowed = ['orçamento', 'aguardando aprovação', 'aprovado', 'recusado', 'recebido', 'em análise', 'em execução', 'finalizado', 'entregue'];
    return allowed.includes(value) ?value : 'recebido';
  }

  function parseOrderNumber(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const match = text.match(/(\d+)\s*$/);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) && number > 0 ?number : null;
  }

  function formatOrderNumber(number) {
    const safeNumber = Number(number || 0);
    const prepared = Number.isFinite(safeNumber) && safeNumber > 0 ?Math.floor(safeNumber) : 1;
    return String(prepared).padStart(4, '0');
  }

  function orderNumberFromValue(value, index) {
    const parsedNumber = parseOrderNumber(value);
    if (parsedNumber) return formatOrderNumber(parsedNumber);
    return formatOrderNumber(index + 1);
  }

  function normalizeOrder(order, index) {
    const dataEntrada = order.dataEntrada || (order.criadoEm ?order.criadoEm.slice(0, 10) : todayIso());
    const statusServico = normalizeServiceStatus(order.statusServico);
    const calculatedValues = calculateOrderValues(order);
    const valorTotal = calculatedValues.valorTotal;
    const valorEntrada = Math.min(safeNumber(order.valorEntrada), valorTotal);
    const statusPagamento = normalizePaymentStatus(order.statusPagamento, statusServico, valorTotal, valorEntrada);
    const dataRetirada = statusServico === 'entregue' ?(order.dataRetirada || todayIso()) : (order.dataRetirada || '');
    const marca = String(order.marca || '').trim();
    const modelo = String(order.modelo || '').trim();
    const carro = String(order.carro || [marca, modelo].filter(Boolean).join(' ')).trim();
    const normalized = {
      ...order,
      numeroOs: orderNumberFromValue(order.numeroOs, index),
      dataEntrada,
      marca,
      modelo,
      carro,
      quantidadeValvulas: String(order.quantidadeValvulas || order.qtdValvulas || '').trim(),
      tipoCabecote: String(order.tipoCabecote || '').trim(),
      quantidadeCabecotes: String(order.quantidadeCabecotes || order.qtdCabecotes || '').trim(),
      peca: order.peca || order.pecaRecebida || '',
      tipoServico: calculatedValues.servicosRetifica.map(function (service) { return service.nome; }).filter(Boolean).join(', ') || order.tipoServico || order.servico || '',
      servicosRetifica: calculatedValues.servicosRetifica,
      subtotalServicosRetifica: calculatedValues.subtotalServicosRetifica,
      valorServicoRetifica: calculatedValues.valorServicoRetifica,
      descontoServicoAtivo: calculatedValues.descontoServicoAtivo,
      descontoServicoPercentual: calculatedValues.descontoServicoPercentual,
      valorDescontoServico: calculatedValues.valorDescontoServico,
      valorServicoComDesconto: calculatedValues.valorServicoComDesconto,
      pecasExternas: calculatedValues.pecasExternas,
      subtotalPecasExternas: calculatedValues.subtotalPecasExternas,
      valorTotal,
      valorEntrada,
      statusPagamento,
      formaPagamento: order.formaPagamento || '',
      dataPagamento: statusPagamento === 'pago' ?(order.dataPagamento || todayIso()) : (order.dataPagamento || ''),
      recebidoPor: order.recebidoPor || '',
      observacaoPagamento: order.observacaoPagamento || '',
      valorOrcado: safeNumber(order.valorOrcado),
      dataOrcamento: order.dataOrcamento || '',
      aprovadoCliente: normalizeApprovalValue(order.aprovadoCliente),
      dataAprovacao: order.dataAprovacao || '',
      observacaoOrcamento: order.observacaoOrcamento || '',
      statusServico,
      dataRetirada,
      retiradoPor: order.retiradoPor || '',
      documentoRetirada: order.documentoRetirada || '',
      observacaoRetirada: order.observacaoRetirada || '',
      etiquetaImpressa: order.etiquetaImpressa === true,
      dataEtiquetaImpressa: order.dataEtiquetaImpressa || '',
      observacoesPeca: order.observacoesPeca || order.observacoes || '',
      observacoesGerais: order.observacoesGerais || '',
      criadoEm: order.criadoEm || `${dataEntrada}T00:00:00.000Z`
    };
    normalized.valorRestante = calculateRemaining(normalized);
    return normalized;
  }

  function syncNextNumber(orders) {
    const maxNumber = orders.reduce(function (max, order) {
      const number = parseOrderNumber(order.numeroOs);
      return number ?Math.max(max, number) : max;
    }, 0);
    const storedNext = read(NEXT_OS_KEY, 1);
    if (storedNext <= maxNumber) write(NEXT_OS_KEY, maxNumber + 1);
  }

  function normalizeCompanySettings(settings) {
    return {
      ...DEFAULT_COMPANY,
      ...(settings || {}),
      nome: String(settings && settings.nome || DEFAULT_COMPANY.nome).trim() || DEFAULT_COMPANY.nome,
      sigla: String(settings && settings.sigla || DEFAULT_COMPANY.sigla).trim() || DEFAULT_COMPANY.sigla
    };
  }

  window.RetificaStorage = {
    getOrders() {
      const orders = read(OS_KEY, []).map(normalizeOrder);
      syncNextNumber(orders);
      return orders;
    },

    getNextOrderNumber() {
      // Mantém a sequência correta mesmo se existirem ordens antigas antes desta versão.
      const orders = read(OS_KEY, []).map(normalizeOrder);
      syncNextNumber(orders);
      const next = read(NEXT_OS_KEY, 1);
      return formatOrderNumber(next);
    },

    formatOrderNumber,

    getTodayIso: todayIso,

    getDefaultCompanySettings() {
      return { ...DEFAULT_COMPANY };
    },

    getCompanySettings() {
      // Carregar configurações: mantém valores padrão se a empresa ainda não foi configurada.
      return normalizeCompanySettings(read(COMPANY_KEY, DEFAULT_COMPANY));
    },

    saveCompanySettings(settings) {
      // Salvar configurações: grava somente dados da empresa, sem alterar as OS.
      const normalized = normalizeCompanySettings(settings);
      write(COMPANY_KEY, normalized);
      return normalized;
    },

    calculateRemaining,

    normalizeTextForPriceKey: normalizeTextForKey,

    normalizeValvesForPriceKey: normalizeValvesForKey,

    normalizeServiceForPriceKey: normalizeServiceForKey,

    getPriceTableKey() {
      return PRICE_TABLE_KEY;
    },

    getServiceCatalogKey() {
      return SERVICE_CATALOG_KEY;
    },

    getChargeTypes() {
      return CHARGE_TYPES.slice();
    },

    getPriceTable() {
      return readPriceTable();
    },

    getServiceCatalog() {
      return readServiceCatalog();
    },

    saveServiceCatalog(records) {
      const normalized = normalizeServiceCatalog(records);
      write(SERVICE_CATALOG_KEY, normalized);
      return normalized;
    },

    savePriceTable(records) {
      const normalized = normalizePriceTable(records);
      write(PRICE_TABLE_KEY, normalized);
      return normalized;
    },

    findPriceTableRecordById(id) {
      const recordId = String(id || '');
      return this.getPriceTable().find(function (record) {
        return record.id === recordId;
      }) || null;
    },

    upsertPriceTableRecord(record) {
      const table = this.getPriceTable();
      const normalized = normalizePriceTableRecord({
        ...(record || {}),
        id: record && record.id ?record.id : createId('preco'),
        atualizadoEm: new Date().toISOString()
      });
      const index = table.findIndex(function (item) {
        return item.id === normalized.id;
      });
      if (index >= 0) table[index] = normalized;
      else table.push(normalized);
      write(PRICE_TABLE_KEY, table);
      return normalized;
    },

    setPriceTableRecordActive(id, active) {
      const table = this.getPriceTable();
      const index = table.findIndex(function (record) { return record.id === id; });
      if (index < 0) return null;
      table[index] = {
        ...table[index],
        ativo: Boolean(active),
        atualizadoEm: new Date().toISOString()
      };
      write(PRICE_TABLE_KEY, table);
      return table[index];
    },

    resolvePriceCategory(data) {
      const source = data || {};
      const text = normalizeTextForKey([
        source.categoria,
        source.marca,
        source.modelo,
        source.carro,
        source.motor,
        source.peca,
        source.tipoCabecote
      ].filter(Boolean).join(' ')).replace(/[^a-z0-9]+/g, ' ');
      const categories = this.getPriceTable().map(function (record) { return record.categoria; }).filter(Boolean);
      return categories.find(function (category) {
        return normalizeTextForKey(category).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean).every(function (piece) {
          return text.includes(piece);
        });
      }) || '';
    },

    searchPriceTableServices(query, category, quantidadeValvulas) {
      const prepared = String(query || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (prepared.length < 1) return [];
      const preferredCategory = String(category || '').trim() ?normalizeTextForKey(category) : '';
      const preferredValves = String(quantidadeValvulas || '').trim() ?normalizeValvesForKey(quantidadeValvulas) : '';
      const genericCategories = ['geral', 'generico', 'padrao'];
      const matching = this.getPriceTable().filter(function (record) {
        return record.ativo !== false && normalizeTextForKey(record.servico).includes(prepared);
      });
      const catalogMatches = this.getServiceCatalog().filter(function (record) {
        return record.ativo !== false && normalizeTextForKey(record.servico).includes(prepared);
      }).map(function (record) {
        return {
          id: record.id,
          categoria: 'Catálogo',
          quantidadeValvulas: '',
          servico: record.servico,
          tipoCobranca: 'servico',
          precoPadrao: null,
          ativo: true,
          grupoResultado: 'catalogo',
          origemResultado: 'catalogo'
        };
      });

      function hasExactValves(record) {
        const recordValves = normalizeValvesForKey(record.quantidadeValvulas || '');
        return Boolean(record.quantidadeValvulas && preferredValves && recordValves === preferredValves);
      }

      function hasNoValves(record) {
        return !record.quantidadeValvulas;
      }

      function isGeneric(record) {
        return genericCategories.includes(normalizeTextForKey(record.categoria));
      }

      function sortByPriority(a, b) {
        return a.servico.localeCompare(b.servico);
      }

      const categoryAndValves = preferredCategory ?matching.filter(function (record) {
        return normalizeTextForKey(record.categoria) === preferredCategory && hasExactValves(record);
      }).sort(sortByPriority) : [];
      if (categoryAndValves.length) return categoryAndValves.map(function (record) {
        return { ...record, grupoResultado: 'categoria' };
      });

      const categoryOnly = preferredCategory ?matching.filter(function (record) {
        return normalizeTextForKey(record.categoria) === preferredCategory && hasNoValves(record);
      }).sort(sortByPriority) : [];
      if (categoryOnly.length) return categoryOnly.map(function (record) {
        return { ...record, grupoResultado: 'categoria' };
      });

      const genericValves = matching.filter(function (record) {
        return isGeneric(record) && hasExactValves(record);
      }).sort(sortByPriority);
      if (genericValves.length) return genericValves.map(function (record) {
        return { ...record, grupoResultado: 'generico' };
      });

      const genericNoValves = matching.filter(function (record) {
        return isGeneric(record) && hasNoValves(record);
      }).sort(sortByPriority);
      if (genericNoValves.length) return genericNoValves.map(function (record) {
        return { ...record, grupoResultado: 'generico' };
      });

      if (!preferredCategory) {
        return matching.sort(sortByPriority).map(function (record) {
          return { ...record, grupoResultado: 'outros' };
        }).concat(catalogMatches);
      }

      return catalogMatches.length ?catalogMatches : matching.sort(sortByPriority).map(function (record) {
        return { ...record, grupoResultado: 'outros' };
      });
    },

    generateSuggestedPriceKey: generatePriceKey,

    isCompleteSuggestedPriceCombination: isCompletePriceCombination,

    getSuggestedPrices() {
      return read(SUGGESTED_PRICES_KEY, {});
    },

    findSuggestedPrice(data) {
      if (!isCompletePriceCombination(data)) return null;
      const key = generatePriceKey(data);
      const prices = this.getSuggestedPrices();
      return prices[key] ?{ key, ...prices[key] } : null;
    },

    saveSuggestedPrice(data, valorServicoRetifica, incrementUsage) {
      if (!isCompletePriceCombination(data)) return null;
      const key = generatePriceKey(data);
      const prices = this.getSuggestedPrices();
      const existing = prices[key] || {};
      const value = safeNumber(valorServicoRetifica);
      if (value <= 0) return null;
      const fields = getPriceCombinationFields(data);
      prices[key] = {
        quantidadeValvulas: String(fields.quantidadeValvulas || '').trim(),
        servico: String(fields.servico || '').trim(),
        valorServicoRetifica: value,
        ultimaAtualizacao: new Date().toISOString(),
        vezesUsado: safeNumber(existing.vezesUsado) + (incrementUsage ?1 : 0)
      };
      write(SUGGESTED_PRICES_KEY, prices);
      return { key, ...prices[key] };
    },

    updateSuggestedPrice(data, valorServicoRetifica) {
      return this.saveSuggestedPrice(data, valorServicoRetifica, false);
    },

    incrementSuggestedPriceUsage(data) {
      const key = generatePriceKey(data);
      const prices = this.getSuggestedPrices();
      if (!prices[key]) return null;
      prices[key] = {
        ...prices[key],
        vezesUsado: safeNumber(prices[key].vezesUsado) + 1,
        ultimaAtualizacao: new Date().toISOString()
      };
      write(SUGGESTED_PRICES_KEY, prices);
      return { key, ...prices[key] };
    },

    saveOrder(order) {
      const orders = this.getOrders();
      const next = read(NEXT_OS_KEY, 1);
      const preparedOrder = normalizeOrder({
        ...order,
        numeroOs: order.numeroOs || formatOrderNumber(next),
        dataEntrada: order.dataEntrada || todayIso()
      }, orders.length);

      orders.unshift(preparedOrder);
      write(OS_KEY, orders);
      write(NEXT_OS_KEY, next + 1);
      return preparedOrder;
    },

    updateOrder(id, updatedOrder) {
      const orders = this.getOrders().map(function (order, index) {
        if (order.id !== id) return order;
        return normalizeOrder({ ...order, ...updatedOrder, id }, index);
      });
      write(OS_KEY, orders);
    },

    deleteOrder(id) {
      const orders = this.getOrders().filter(function (order) {
        return order.id !== id;
      });
      write(OS_KEY, orders);
    },

    getOrderById(id) {
      return this.getOrders().find(function (order) {
        return order.id === id;
      });
    },

    updateOrders(orders) {
      const normalizedOrders = orders.map(normalizeOrder);
      syncNextNumber(normalizedOrders);
      write(OS_KEY, normalizedOrders);
    },

    setLoggedIn(value) {
      write(SESSION_KEY, Boolean(value));
    },

    isLoggedIn() {
      return read(SESSION_KEY, false);
    },

    logout() {
      localStorage.removeItem(SESSION_KEY);
    },

    // Dados demo: cria uma amostra realista para apresentação sem misturar com OS reais.
    loadDemoOrders() {
      const orders = this.getOrders();
      if (orders.some(function (order) { return order.isDemo === true; })) {
        write(DEMO_FLAG, true);
        return { added: 0, totalDemo: orders.filter(function (order) { return order.isDemo === true; }).length };
      }

      const demoOrders = [
        {
          id: 'demo-os-001',
          cliente: 'João Oficina',
          telefone: '(11) 98888-1010',
          carro: 'Gol',
          ano: '2014',
          motor: '1.0 8v',
          peca: 'Cabeçote Gol 1.0 8v',
          tipoServico: 'Plaina e teste de trinca',
          valorTotal: 0,
          valorEntrada: 0,
          valorOrcado: 680,
          dataOrcamento: todayIso(),
          aprovadoCliente: 'não',
          statusServico: 'orçamento',
          statusPagamento: 'pendente',
          dataEntrada: addDaysIso(-1),
          previsaoEntrega: addDaysIso(-2),
          observacoesPeca: 'Peça recebida com sinais de aquecimento.',
          observacaoOrcamento: 'Enviar orçamento para aprovação antes de iniciar.',
          observacoesGerais: 'Aguardar aprovação do cliente após análise.'
        },
        {
          id: 'demo-os-006',
          cliente: 'Oficina Avenida',
          telefone: '(11) 94444-6060',
          carro: 'Palio',
          ano: '2013',
          motor: '1.0 Fire',
          peca: 'Cabeçote Palio 1.0',
          tipoServico: 'Retífica completa',
          valorTotal: 0,
          valorEntrada: 0,
          valorOrcado: 980,
          dataOrcamento: todayIso(),
          aprovadoCliente: 'não',
          statusServico: 'aguardando aprovação',
          statusPagamento: 'pendente',
          dataEntrada: addDaysIso(-1),
          previsaoEntrega: addDaysIso(3),
          observacoesPeca: 'Cabeçote desmontado para avaliação.',
          observacaoOrcamento: 'Cliente pediu confirmar antes de iniciar a execução.',
          observacoesGerais: 'Aguardando resposta por WhatsApp.'
        },
        {
          id: 'demo-os-002',
          cliente: 'Auto Mecânica Silva',
          telefone: '(11) 97777-2020',
          carro: 'Corsa',
          ano: '2012',
          motor: '1.4',
          peca: 'Cabeçote Corsa 1.4',
          tipoServico: 'Banho químico',
          valorTotal: 420,
          valorEntrada: 200,
          valorOrcado: 420,
          dataOrcamento: addDaysIso(-1),
          aprovadoCliente: 'sim',
          dataAprovacao: todayIso(),
          statusServico: 'aprovado',
          statusPagamento: 'parcial',
          formaPagamento: 'pix',
          dataPagamento: todayIso(),
          recebidoPor: 'Atendimento',
          observacaoPagamento: 'Entrada registrada para iniciar o serviço.',
          dataEntrada: addDaysIso(-2),
          previsaoEntrega: addDaysIso(1),
          observacoesPeca: 'Necessário verificar empeno antes da montagem.',
          observacoesGerais: 'Cliente pediu retorno por WhatsApp.'
        },
        {
          id: 'demo-os-003',
          cliente: 'Carlos Motor Peças',
          telefone: '(11) 96666-3030',
          carro: 'Civic',
          ano: '2016',
          motor: '1.8',
          peca: 'Cabeçote Civic 1.8',
          tipoServico: 'Solda e plaina',
          valorTotal: 1250,
          valorEntrada: 650,
          valorOrcado: 1250,
          dataOrcamento: addDaysIso(-3),
          aprovadoCliente: 'sim',
          dataAprovacao: addDaysIso(-2),
          statusServico: 'em execução',
          statusPagamento: 'parcial',
          formaPagamento: 'cartão de débito',
          dataPagamento: addDaysIso(-2),
          recebidoPor: 'Caixa',
          dataEntrada: addDaysIso(-4),
          previsaoEntrega: addDaysIso(2),
          observacoesPeca: 'Trinca próxima ao duto de água.',
          observacoesGerais: 'Prioridade média.'
        },
        {
          id: 'demo-os-004',
          cliente: 'Renato Auto Center',
          telefone: '(11) 95555-4040',
          carro: 'Saveiro',
          ano: '2015',
          motor: '1.6',
          peca: 'Bloco motor Saveiro 1.6',
          tipoServico: 'Troca de guia',
          valorTotal: 0,
          valorEntrada: 0,
          valorOrcado: 890,
          dataOrcamento: addDaysIso(-5),
          aprovadoCliente: 'não',
          statusServico: 'recusado',
          statusPagamento: 'sem cobrança',
          dataEntrada: addDaysIso(-6),
          previsaoEntrega: addDaysIso(-1),
          observacoesPeca: 'Serviço finalizado e aguardando retirada.',
          observacoesGerais: 'Conferir nota no balcão.'
        },
        {
          id: 'demo-os-007',
          cliente: 'Garage Prime',
          telefone: '(11) 93333-7070',
          carro: 'HB20',
          ano: '2018',
          motor: '1.6',
          peca: 'Cabeçote HB20 1.6',
          tipoServico: 'Teste de pressão e plaina',
          valorTotal: 540,
          valorEntrada: 540,
          valorOrcado: 540,
          dataOrcamento: addDaysIso(-6),
          aprovadoCliente: 'sim',
          dataAprovacao: addDaysIso(-5),
          statusServico: 'finalizado',
          statusPagamento: 'pago',
          formaPagamento: 'transferência',
          dataPagamento: addDaysIso(-4),
          recebidoPor: 'Atendimento',
          dataEntrada: addDaysIso(-7),
          previsaoEntrega: addDaysIso(-3),
          observacoesPeca: 'Serviço finalizado aguardando retirada do cliente.',
          observacoesGerais: 'Aviso de conclusão enviado por WhatsApp.'
        },
        {
          id: 'demo-os-005',
          cliente: 'Auto Mecânica Silva',
          telefone: '(11) 97777-2020',
          carro: 'Uno',
          ano: '2010',
          motor: 'Fire 1.0',
          peca: 'Cabeçote Fiat Fire 1.0',
          tipoServico: 'Retífica de válvulas',
          valorTotal: 760,
          valorEntrada: 760,
          valorOrcado: 760,
          dataOrcamento: addDaysIso(-11),
          aprovadoCliente: 'sim',
          dataAprovacao: addDaysIso(-10),
          statusServico: 'entregue',
          statusPagamento: 'pago',
          formaPagamento: 'dinheiro',
          dataPagamento: addDaysIso(-7),
          recebidoPor: 'Marcos Silva',
          observacaoPagamento: 'Pagamento quitado na retirada da peça.',
          dataRetirada: addDaysIso(-7),
          retiradoPor: 'Marcos Silva',
          documentoRetirada: 'RG 12.345.678-9',
          observacaoRetirada: 'Peça retirada no balcão com conferência visual.',
          dataEntrada: addDaysIso(-12),
          previsaoEntrega: addDaysIso(-8),
          observacoesPeca: 'Peça entregue com conferência final.',
          observacoesGerais: 'Cliente satisfeito com o prazo.'
        }
      ];
      const firstDemoNumber = read(NEXT_OS_KEY, 1);
      const preparedDemoOrders = demoOrders.map(function (order, index) {
        return normalizeOrder({
          ...order,
          numeroOs: formatOrderNumber(firstDemoNumber + index),
          isDemo: true,
          criadoEm: `${order.dataEntrada}T12:00:00.000Z`
        }, index);
      });

      this.updateOrders(preparedDemoOrders.concat(orders));
      write(DEMO_FLAG, true);
      return { added: preparedDemoOrders.length, totalDemo: preparedDemoOrders.length };
    },

    clearDemoOrders() {
      const orders = this.getOrders();
      const realOrders = orders.filter(function (order) {
        return order.isDemo !== true;
      });
      const removed = orders.length - realOrders.length;
      this.updateOrders(realOrders);
      write(DEMO_FLAG, false);
      return removed;
    }
  };
})();
