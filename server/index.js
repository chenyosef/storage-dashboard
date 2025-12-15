const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const { SheetsService } = require('./services/sheetsService');
const { DataStore } = require('./services/dataStore');
const { SyncMonitor } = require('./services/syncMonitor');
const { VisitorTracker } = require('./services/visitorTracker');
const { FeedbackService } = require('./services/feedbackService');
const storageRoutes = require('./routes/storage');
const feedbackRoutes = require('./routes/feedback');

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
const visitorTracker = new VisitorTracker();
const feedbackService = new FeedbackService();

// Make services available to routes
app.locals.dataStore = dataStore;
app.locals.sheetsService = sheetsService;
app.locals.syncMonitor = syncMonitor;
app.locals.visitorTracker = visitorTracker;
app.locals.feedbackService = feedbackService;

// API Routes
app.use('/api/storage', storageRoutes);
app.use('/api/feedback', feedbackRoutes);

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

// Visitor tracking endpoints
app.post('/api/track/visit', (req, res) => {
  try {
    const result = visitorTracker.trackVisit(req);
    res.json({ success: true, tracked: true });
  } catch (error) {
    console.error('Error tracking visit:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/track/stats', (req, res) => {
  try {
    const stats = visitorTracker.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting visitor stats:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
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
    const data = await sheetsService.fetchAllSheetsData();
    dataStore.updateData(data);
    const totalRecords = Object.values(data).reduce((sum, sheet) => sum + sheet.length, 0);
    syncMonitor.endSync(true, totalRecords);
    console.log(`Sync completed. ${totalRecords} records updated from ${Object.keys(data).length} sheets.`);
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