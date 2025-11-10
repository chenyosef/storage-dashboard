const fs = require('fs');
const path = require('path');

class DataStore {
  constructor() {
    this.data = [];
    this.lastSyncTime = null;
    this.dataFile = path.join(__dirname, '../data/storage-data.json');
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
        this.data = storedData.data || [];
        this.lastSyncTime = storedData.lastSyncTime || null;
        console.log(`Loaded ${this.data.length} records from storage`);
      }
    } catch (error) {
      console.error('Error loading data from storage:', error.message);
      this.data = [];
      this.lastSyncTime = null;
    }
  }

  saveData() {
    try {
      const dataToSave = {
        data: this.data,
        lastSyncTime: this.lastSyncTime,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('Error saving data to storage:', error.message);
    }
  }

  updateData(newData) {
    this.data = newData;
    this.lastSyncTime = new Date().toISOString();
    this.saveData();
  }

  getAllData() {
    return this.data;
  }

  searchData(query) {
    if (!query || query.trim() === '') {
      return this.data;
    }

    const searchTerm = query.toLowerCase();
    return this.data.filter(record => {
      return Object.values(record).some(value => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    });
  }

  filterData(filters) {
    let filteredData = this.data;

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
  }

  getUniqueValues(field) {
    const values = this.data
      .map(record => record[field])
      .filter(value => value && value.trim() !== '')
      .map(value => value.trim());
    
    return [...new Set(values)].sort();
  }

  getStats() {
    return {
      totalRecords: this.data.length,
      lastSyncTime: this.lastSyncTime,
      dataFields: this.data.length > 0 ? Object.keys(this.data[0]) : [],
    };
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

module.exports = { DataStore };