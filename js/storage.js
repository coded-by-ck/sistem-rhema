(function () {
  const OS_KEY = 'retificaOS.orders';
  const SESSION_KEY = 'retificaOS.loggedIn';
  const NEXT_OS_KEY = 'retificaOS.nextOsNumber';
  const DEMO_FLAG = 'retificaOS.demoLoaded';
  const COMPANY_KEY = 'retificaOS.companySettings';

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
    const valorTotal = safeNumber(order.valorTotal);
    const valorEntrada = safeNumber(order.valorEntrada);
    const statusPagamento = normalizePaymentStatus(order.statusPagamento, statusServico, valorTotal, valorEntrada);
    const dataRetirada = statusServico === 'entregue' ?(order.dataRetirada || todayIso()) : (order.dataRetirada || '');
    const normalized = {
      ...order,
      numeroOs: orderNumberFromValue(order.numeroOs, index),
      dataEntrada,
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
