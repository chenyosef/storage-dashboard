const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const { SheetsService } = require('./services/sheetsService');
const { DataStore } = require('./services/dataStore');
const { SyncMonitor } = require('./services/syncMonitor');
const storageRoutes = require('./routes/storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services
const dataStore = new DataStore();
const sheetsService = new SheetsService();
const syncMonitor = new SyncMonitor();

// Make services available to routes
app.locals.dataStore = dataStore;
app.locals.sheetsService = sheetsService;
app.locals.syncMonitor = syncMonitor;

// API Routes
app.use('/api/storage', storageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = syncMonitor.getHealthStatus();
  const syncStats = syncMonitor.getStats();
  
  res.json({ 
    status: healthStatus.status,
    message: healthStatus.message,
    timestamp: new Date().toISOString(),
    lastSync: dataStore.getLastSyncTime(),
    syncStats
  });
});

// Sync monitoring endpoints
app.get('/api/sync/stats', (req, res) => {
  res.json({
    success: true,
    stats: syncMonitor.getStats()
  });
});

app.get('/api/sync/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json({
    success: true,
    history: syncMonitor.getHistory(limit)
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auto-sync function
async function syncData() {
  syncMonitor.startSync();
  
  try {
    console.log('Starting data sync...');
    const data = await sheetsService.fetchData();
    dataStore.updateData(data);
    syncMonitor.endSync(true, data.length);
    console.log(`Sync completed. ${data.length} records updated.`);
  } catch (error) {
    syncMonitor.endSync(false, 0, error);
    console.error('Sync failed:', error.message);
  }
}

// Schedule auto-sync
const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 5;
cron.schedule(`*/${syncInterval} * * * *`, syncData);

// Initial data load
syncData().then(() => {
  app.listen(PORT, () => {
    console.log(`Storage Dashboard server running on port ${PORT}`);
    console.log(`Auto-sync scheduled every ${syncInterval} minutes`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});