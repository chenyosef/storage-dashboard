const fs = require('fs');
const path = require('path');

class DataStore {
  constructor() {
    this.data = {}; // Changed to object to store data by sheet name
    this.sheetNames = [];
    this.lastSyncTime = null;
    // Use environment variable for data directory, fallback to ../data for local dev
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
    this.dataFile = path.join(dataDir, 'storage-data.json');
    this.ensureDataDirectory();
    this.loadData();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf8');
        const storedData = JSON.parse(fileContent);
        this.data = storedData.data || {};
        this.sheetNames = storedData.sheetNames || [];
        this.lastSyncTime = storedData.lastSyncTime || null;
        const totalRecords = Object.values(this.data).reduce((sum, sheet) => sum + sheet.length, 0);
        console.log(`Loaded ${totalRecords} records from ${this.sheetNames.length} sheets from storage`);
      }
    } catch (error) {
      console.error('Error loading data from storage:', error.message);
      this.data = {};
      this.sheetNames = [];
      this.lastSyncTime = null;
    }
  }

  saveData() {
    try {
      const dataToSave = {
        data: this.data,
        sheetNames: this.sheetNames,
        lastSyncTime: this.lastSyncTime,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving data to storage:', error.message);
    }
  }

  updateData(newData) {
    if (Array.isArray(newData)) {
      // Legacy support for single sheet data
      this.data = { 'Sheet1': newData };
      this.sheetNames = ['Sheet1'];
    } else {
      // Multi-sheet data
      this.data = newData;
      this.sheetNames = Object.keys(newData);
    }
    this.lastSyncTime = new Date().toISOString();
    this.saveData();
  }

  getAllData() {
    return this.data;
  }

  getSheetData(sheetName) {
    return this.data[sheetName] || [];
  }

  getSheetNames() {
    return this.sheetNames;
  }

  searchData(query, sheetName = null) {
    if (!query || query.trim() === '') {
      return sheetName ? this.getSheetData(sheetName) : this.data;
    }

    const searchTerm = query.toLowerCase();
    
    if (sheetName) {
      // Search in specific sheet
      const sheetData = this.getSheetData(sheetName);
      return sheetData.filter(record => {
        return Object.values(record).some(value => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm);
          }
          return false;
        });
      });
    } else {
      // Search across all sheets
      const results = {};
      for (const [name, sheetData] of Object.entries(this.data)) {
        results[name] = sheetData.filter(record => {
          return Object.values(record).some(value => {
            if (typeof value === 'string') {
              return value.toLowerCase().includes(searchTerm);
            }
            return false;
          });
        });
      }
      return results;
    }
  }

  filterData(filters, sheetName = null) {
    if (sheetName) {
      // Filter specific sheet
      let filteredData = this.getSheetData(sheetName);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          filteredData = filteredData.filter(record => {
            const recordValue = record[key];
            if (typeof recordValue === 'string') {
              return recordValue.toLowerCase().includes(value.toLowerCase());
            }
            return false;
          });
        }
      });

      return filteredData;
    } else {
      // Filter all sheets
      const results = {};
      for (const [name, sheetData] of Object.entries(this.data)) {
        let filteredData = sheetData;
        
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            filteredData = filteredData.filter(record => {
              const recordValue = record[key];
              if (typeof recordValue === 'string') {
                return recordValue.toLowerCase().includes(value.toLowerCase());
              }
              return false;
            });
          }
        });
        
        results[name] = filteredData;
      }
      
      return results;
    }
  }

  getUniqueValues(field, sheetName = null) {
    let sourceData = [];
    
    if (sheetName) {
      sourceData = this.getSheetData(sheetName);
    } else {
      sourceData = Object.values(this.data).flat();
    }
    
    const values = sourceData
      .map(record => record[field])
      .filter(value => value && value.trim() !== '')
      .map(value => value.trim());
    
    return [...new Set(values)].sort();
  }

  getStats() {
    const totalRecords = Object.values(this.data).reduce((sum, sheet) => sum + sheet.length, 0);
    const allFields = new Set();
    
    Object.values(this.data).forEach(sheetData => {
      if (sheetData.length > 0) {
        Object.keys(sheetData[0]).forEach(field => allFields.add(field));
      }
    });

    return {
      totalRecords,
      totalSheets: this.sheetNames.length,
      sheetNames: this.sheetNames,
      lastSyncTime: this.lastSyncTime,
      dataFields: Array.from(allFields),
    };
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

module.exports = { DataStore };