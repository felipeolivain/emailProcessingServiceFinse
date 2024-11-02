const cheerio = require('cheerio');

class BancoEstadoProcessor {
  constructor() {
    this.bankId = 'banco-estado';
  }

  async processEmail(emailData) {
    try {
      const decodedBody = this.decodeEmailBody(emailData);
      const $ = cheerio.load(decodedBody);
      const extractedText = $.text().replace(/\s\s+/g, ' ').trim();
      
      return this.extractTransferData(extractedText);
    } catch (error) {
      console.error('Error procesando email de BancoEstado:', error);
      throw error;
    }
  }

  decodeEmailBody(emailData) {
    let body = '';
    if (emailData.payload.parts) {
      emailData.payload.parts.forEach(part => {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          body = part.body.data;
        }
      });
    } else {
      body = emailData.payload.body.data;
    }
    return Buffer.from(body, 'base64').toString('utf-8');
  }

  extractTransferData(extractedText) {
    const regexPatterns = {
      fecha: /(\d{2}\/\d{2}\/\d{4})/,
      monto: /Monto transferido: \$(\d{1,3}(\.\d{3})*(\,\d+)?)/,
      remitente_nombre: /Estimado\(a\)\s+([\w\s]+)\s+Acabas/,
      remitente_producto: /Producto\s*:\s*([^\n]*?)(?=\s*N° de cuenta|$)/,
      remitente_cuenta: /N° de cuenta\s*:\s*(\d+)/,
      tef_numero: /N° de TEF\s*:\s*(\d+)/,
      fecha_hora_tef: /Fecha y Hora de TEF\s*:\s*([\d\/ :]+)/,
      destinatario_nombre: /Nombre\s*:\s*([^RUT]+?)\s*RUT/,
      destinatario_rut: /RUT\s*:\s*([\d\.\-K]+)\s*Banco/,
      destinatario_banco: /Banco\s*:\s*([^\n]+?)\s*N° de cuenta/,
      destinatario_cuenta: /Hacia:\s+.*?N° de cuenta\s*:\s*(\d+)/,
      destinatario_producto: /Hacia:.*?Producto\s*:\s*([^\n]+?)\s*(?:E-mail|$)/,
      destinatario_email: /E-mail\s*:\s*([^\n]+?)\s*Comentario/,
      comentario: /Comentario\s*:\s*(Sin mensaje|[^\n]+?)\s*(?:Infórmese sobre la garantía legal|$)/
    };

    const transferData = {};
    for (const [key, regex] of Object.entries(regexPatterns)) {
      const match = extractedText.match(regex);
      transferData[key] = match ? (key === 'monto' ? match[1].replace('.', '').replace(',', '') : match[1].trim()) : null;
    }

    return {
      ...transferData,
      banco: this.bankId
    };
  }
}

module.exports = BancoEstadoProcessor;
