const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetsService {
  constructor() {
    this.sheets = null;
    this.sheetId = process.env.GOOGLE_SHEET_ID;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      let credentials;
      
      if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        // Production: Use base64 encoded credentials
        credentials = JSON.parse(
          Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString()
        );
      } else if (fs.existsSync('./credentials.json')) {
        // Development: Use local credentials file
        credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
      } else {
        throw new Error('Google credentials not found. Set GOOGLE_CREDENTIALS_BASE64 or add credentials.json');
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  async fetchData() {
    if (!this.sheets || !this.sheetId) {
      throw new Error('Google Sheets service not properly initialized');
    }

    try {
      // Fetch data from the first sheet (you may need to adjust the range)
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:Z', // Adjust range as needed
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in spreadsheet');
        return [];
      }

      // Assume first row contains headers
      const headers = rows[0];
      const data = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const record = {};
        
        headers.forEach((header, index) => {
          record[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
        });

        // Only add non-empty rows
        if (Object.values(record).some(value => value.trim() !== '')) {
          record.id = i; // Add unique ID
          record.last_updated = new Date().toISOString();
          data.push(record);
        }
      }

      console.log(`Fetched ${data.length} records from Google Sheets`);
      return data;
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error.message);
      throw error;
    }
  }

  async getSheetInfo() {
    if (!this.sheets || !this.sheetId) {
      throw new Error('Google Sheets service not properly initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId,
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties?.rowCount,
          columnCount: sheet.properties.gridProperties?.columnCount,
        })),
      };
    } catch (error) {
      console.error('Error getting sheet info:', error.message);
      throw error;
    }
  }
}

module.exports = { SheetsService };