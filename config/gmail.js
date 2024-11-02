const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.gmail = null;
  }

  async init(accessToken) {
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({
      access_token: accessToken
    });
    this.gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  }

  async getEmails(bankDomains) {
    try {
      const query = `from:(${bankDomains.join(' OR ')})`;
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query
      });

      const messages = response.data.messages || [];
      return await Promise.all(
        messages.map(message => 
          this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          })
        )
      );
    } catch (error) {
      console.error('Error obteniendo emails:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();
