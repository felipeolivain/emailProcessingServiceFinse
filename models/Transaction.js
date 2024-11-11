const { supabase } = require('../config/supabase');
const bankService = require('../services/banks/bankService');
const gmailService = require('../config/gmail');

class Transaction {
  constructor() {
    this.supabase = supabase;
    this.bankService = bankService;
    this.gmailService = gmailService;
  }


  // Procesa un email y realiza la acción solicitada (extraer o actualizar)
  async process(emailData, userId, action = 'extract') {
    try {
      // Decodificar email usando bankService
      const { data: decodedData, bankInfo } = await bankService.decode(emailData);

      // Verificar si el banco está autorizado para el usuario
      const bankAuthorized = await this.checkBankAuthorization(userId, bankInfo);
      if (!bankAuthorized) {
        throw new Error('Usuario no autorizado para este banco');
      }

      // Procesar según la acción solicitada
      if (action === 'extract') {
        // Código 0: Extraer toda la información
        return await this.extractFullData(decodedData, userId);
      } else if (action === 'update') {
        // Código 1: Actualizar información existente
        return await this.updateExistingData(decodedData, userId);
      }

    }
     catch (error) {
      console.error('Error en Transaction:', error);
      throw error;
    }
  }

// funciones del process:

  // Verifica si el usuario tiene autorización para un banco específico
  async checkBankAuthorization(userId, bankInfo) {
    const { data, error } = await this.supabase
      .from('user_integrated_banks')
      .select('*')
      .eq('user_id', userId)
      .eq('bank_id', bankInfo.bankId)
      .eq('status', 'active')
      .single();

    if (error) throw error;
    return !!data;
  }
  // Implementa la lógica para extraer toda la información de una transacción// cambiarlo
  async extractFullData(decodedData, userId) {
    // Implementar lógica para extraer toda la información
    const { error } = await this.supabase
      .from('email_transferencias')
      .insert([{ ...decodedData, user_id: userId }]);

    if (error) throw error;
    return decodedData;
  }
  // Implementa la lógica para actualizar información existente// cambiarlo
  async updateExistingData(decodedData, userId) {
    // Implementar lógica para actualizar información existente
    const { error } = await this.supabase
      .from('email_transferencias')
      .upsert([{ ...decodedData, user_id: userId }]);

    if (error) throw error;
    return decodedData;
  }

  // Obtiene el token de Gmail del usuario
  async getUserToken(userId) {
    const { data, error } = await this.supabase
      .from('user_tokens_view')
      .select('access_token, email')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Token de Gmail no encontrado para el usuario');
    
    return data;
  }





  // Sincroniza las transacciones de los bancos autorizados, funcion principal
  async syncBankTransactions(userId, action = 'extract') {
    try {
      // Obtener token de Gmail del usuario
      const userToken = await this.getUserToken(userId);
      await this.gmailService.init(userToken.access_token);

      // Obtener solo los bancos sincronizados
      const syncedBanks = await this.getAuthorizedBanks(userId);
      
      // Obtener emails solo de los bancos sincronizados
      const bankDomains = syncedBanks.map(bank => bank.email_domain);
      const emails = await this.gmailService.getEmails(bankDomains);

      // Procesar cada email
      const results = [];
      for (const email of emails) {
        try {
          const result = await this.process(email, userId, action);
          results.push(result);
        } catch (error) {
          console.error(`Error procesando email: ${error.message}`);
          continue;
        }
      }

      // Actualizar última sincronización
      await this.updateLastSync(userId, syncedBanks);

      return results;
    } catch (error) {
      console.error('Error en syncBankTransactions:', error);
      throw error;
    }
  }

// funciones adiccionales para syncBankTransactions:

  // Actualiza la última sincronización de los bancos del usuario
  async updateLastSync(userId, banks) {
    const updates = banks.map(bank => ({
      user_id: userId,
      bank_id: bank.id,
      last_sync_at: new Date().toISOString()
    }));
    
    const { error } = await this.supabase
      .from('user_integrated_banks')
      .upsert(updates);

    if (error) throw error;
  }
  // Obtiene los bancos autorizados para el usuario// puede estar mal
  // falta en la base de datos add colummnas que son necesarias para que esto funcione
  async getAuthorizedBanks(userId) {
    const { data, error } = await this.supabase
      .from('user_integrated_banks')
      .select(`
        *,
        bank:integrable_banks!bank_id (
          id,
          name,
          description,
          logo_url,
          identifier,
          country
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No hay bancos sincronizados para este usuario');
    }

    // Mapear los datos para devolver solo los campos necesarios
    return data.map(integration => ({
      id: integration.bank.id,
      name: integration.bank.name,
      description: integration.bank.description,
      logo_url: integration.bank.logo_url,
      identifier: integration.bank.identifier,
      country: integration.bank.country,
      last_sync_at: integration.last_sync_at
    }));
  }
}

module.exports = new Transaction();
