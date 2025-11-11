const express = require('express');
const router = express.Router();

// Get all storage data or specific sheet data
router.get('/', (req, res) => {
  try {
    const { sheet } = req.query;
    const dataStore = req.app.locals.dataStore;
    
    if (sheet) {
      // Get specific sheet data
      const data = dataStore.getSheetData(sheet);
      res.json({
        success: true,
        data,
        sheetName: sheet,
        count: data.length,
        lastSync: dataStore.getLastSyncTime()
      });
    } else {
      // Get all sheets data
      const data = dataStore.getAllData();
      const totalRecords = Object.values(data).reduce((sum, sheet) => sum + sheet.length, 0);
      
      res.json({
        success: true,
        data,
        sheetNames: dataStore.getSheetNames(),
        count: totalRecords,
        lastSync: dataStore.getLastSyncTime()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available sheet names
router.get('/sheets', (req, res) => {
  try {
    const dataStore = req.app.locals.dataStore;
    const sheetNames = dataStore.getSheetNames();
    
    res.json({
      success: true,
      sheetNames,
      count: sheetNames.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search storage data
router.get('/search', (req, res) => {
  try {
    const { q, sheet } = req.query;
    const dataStore = req.app.locals.dataStore;
    const data = dataStore.searchData(q, sheet);
    
    if (sheet) {
      // Single sheet search
      res.json({
        success: true,
        data,
        sheetName: sheet,
        count: data.length,
        query: q
      });
    } else {
      // Multi-sheet search
      const totalCount = Object.values(data).reduce((sum, sheet) => sum + sheet.length, 0);
      res.json({
        success: true,
        data,
        count: totalCount,
        query: q
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Filter storage data
router.post('/filter', (req, res) => {
  try {
    const filters = req.body;
    const dataStore = req.app.locals.dataStore;
    const data = dataStore.filterData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length,
      filters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get unique values for a field (for dropdowns)
router.get('/fields/:field/values', (req, res) => {
  try {
    const { field } = req.params;
    const dataStore = req.app.locals.dataStore;
    const values = dataStore.getUniqueValues(field);
    
    res.json({
      success: true,
      field,
      values
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data statistics
router.get('/stats', (req, res) => {
  try {
    const dataStore = req.app.locals.dataStore;
    const stats = dataStore.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force data sync
router.post('/sync', async (req, res) => {
  try {
    const sheetsService = req.app.locals.sheetsService;
    const dataStore = req.app.locals.dataStore;
    
    const data = await sheetsService.fetchAllSheetsData();
    dataStore.updateData(data);
    
    const totalRecords = Object.values(data).reduce((sum, sheet) => sum + sheet.length, 0);
    
    res.json({
      success: true,
      message: 'Data synced successfully',
      count: totalRecords,
      sheetCount: Object.keys(data).length,
      syncTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export data as JSON
router.get('/export/json', (req, res) => {
  try {
    const dataStore = req.app.locals.dataStore;
    const data = dataStore.getAllData();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=storage-data.json');
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export data as CSV
router.get('/export/csv', (req, res) => {
  try {
    const dataStore = req.app.locals.dataStore;
    const data = dataStore.getAllData();
    
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data available for export'
      });
    }

    // Generate CSV
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(record => {
      const values = headers.map(header => {
        const value = record[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=storage-data.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;