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

  async fetchData(sheetName = null) {
    if (!this.sheets || !this.sheetId) {
      throw new Error('Google Sheets service not properly initialized');
    }

    try {
      // If no specific sheet name provided, fetch from the first sheet
      let range = 'A:Z';
      if (sheetName) {
        range = `'${sheetName}'!A:Z`;
      }

      // Fetch both values and formatted data to get hyperlinks
      const [valuesResponse, formattedResponse] = await Promise.all([
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: range,
        }),
        this.sheets.spreadsheets.get({
          spreadsheetId: this.sheetId,
          ranges: [range],
          includeGridData: true,
        })
      ]);

      const rows = valuesResponse.data.values;
      if (!rows || rows.length === 0) {
        console.log(`No data found in sheet: ${sheetName || 'default'}`);
        return [];
      }

      // Get the sheet data with hyperlinks
      const sheetData = formattedResponse.data.sheets.find(sheet => 
        !sheetName || sheet.properties.title === sheetName
      );
      
      const gridData = sheetData?.data?.[0]?.rowData || [];

      // Assume first row contains headers
      const headers = rows[0];
      const data = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const formattedRow = gridData[i]?.values || [];
        const record = {};
        
        headers.forEach((header, index) => {
          const cellValue = row[index] || '';
          const formattedCell = formattedRow[index];
          
          // Check if this cell has a hyperlink
          const hyperlink = formattedCell?.hyperlink;
          
          if (hyperlink && cellValue.trim()) {
            // Store both the display text and the URL
            record[header.toLowerCase().replace(/\s+/g, '_')] = {
              text: cellValue,
              url: hyperlink,
              isLink: true
            };
          } else {
            record[header.toLowerCase().replace(/\s+/g, '_')] = cellValue;
          }
        });

        // Only add non-empty rows
        const hasContent = Object.values(record).some(value => {
          if (typeof value === 'object' && value.text) {
            return value.text.trim() !== '';
          }
          return typeof value === 'string' && value.trim() !== '';
        });

        if (hasContent) {
          record.id = i; // Add unique ID
          record.sheet_name = sheetName || 'Sheet1';
          record.last_updated = new Date().toISOString();
          data.push(record);
        }
      }

      console.log(`Fetched ${data.length} records from sheet: ${sheetName || 'default'}`);
      return data;
    } catch (error) {
      console.error(`Error fetching data from sheet ${sheetName || 'default'}:`, error.message);
      throw error;
    }
  }

  async fetchAllSheetsData() {
    if (!this.sheets || !this.sheetId) {
      throw new Error('Google Sheets service not properly initialized');
    }

    try {
      // Get sheet info to find all sheet names
      const sheetsInfo = await this.getSheetInfo();
      const allData = {};

      // Fetch data from each sheet
      for (const sheet of sheetsInfo.sheets) {
        try {
          const data = await this.fetchData(sheet.title);
          allData[sheet.title] = data;
        } catch (error) {
          console.warn(`Failed to fetch data from sheet '${sheet.title}':`, error.message);
          allData[sheet.title] = [];
        }
      }

      console.log(`Fetched data from ${Object.keys(allData).length} sheets`);
      return allData;
    } catch (error) {
      console.error('Error fetching data from all sheets:', error.message);
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