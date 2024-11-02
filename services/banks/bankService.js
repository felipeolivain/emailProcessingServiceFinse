const BancoEstadoProcessor = require('./processors/chile/bancoEstado');

class BankService {
  constructor() {
    this.loadProcessors();
  }

  loadProcessors() {
    this.processors = {
      chile: {
        'banco-estado': {
          processor: BancoEstadoProcessor,
          emailDomain: 'bancoestado.cl'
        },
        // Agregar otros bancos aquí
      }
    };
  }

  async decode(emailData) {
    try {
      const bankInfo = this.identifyBank(emailData);
      if (!bankInfo) throw new Error('Banco no identificado');

      const bankConfig = this.processors[bankInfo.country][bankInfo.bankId];
      if (!bankConfig) throw new Error('Processor no encontrado');

      const processor = new bankConfig.processor();
      return {
        data: await processor.processEmail(emailData),
        bankInfo
      };
    } catch (error) {
      console.error('Error decodificando email:', error);
      throw error;
    }
  }

  getBankDomains() {
    const domains = [];
    for (const country of Object.values(this.processors)) {
      for (const bank of Object.values(country)) {
        domains.push(bank.emailDomain);
      }
    }
    return domains;
  }

  identifyBank(emailData) {
    const from = emailData.payload.headers.find(h => h.name === 'From')?.value || '';
    
    // Mapeo de dominios de email a información del banco
    const bankMap = {
      'bancoestado.cl': { country: 'chile', bankId: 'banco-estado' },
      'bancochile.cl': { country: 'chile', bankId: 'banco-chile' },
      'santander.cl': { country: 'chile', bankId: 'santander' }
    };

    for (const [domain, bankInfo] of Object.entries(bankMap)) {
      if (from.includes(domain)) {
        return bankInfo;
      }
    }
    return null;
  }
}

module.exports = new BankService();