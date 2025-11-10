class SyncMonitor {
  constructor() {
    this.syncHistory = [];
    this.maxHistorySize = 100;
    this.isRunning = false;
  }

  logSync(success, recordCount = 0, error = null) {
    const syncRecord = {
      timestamp: new Date().toISOString(),
      success,
      recordCount,
      error: error ? error.message : null,
      duration: null
    };

    this.syncHistory.unshift(syncRecord);
    
    // Keep only the latest records
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory = this.syncHistory.slice(0, this.maxHistorySize);
    }

    console.log(`Sync ${success ? 'completed' : 'failed'}: ${recordCount} records${error ? `, Error: ${error.message}` : ''}`);
  }

  startSync() {
    this.isRunning = true;
    this.syncStartTime = Date.now();
  }

  endSync(success, recordCount = 0, error = null) {
    this.isRunning = false;
    
    if (this.syncStartTime) {
      const duration = Date.now() - this.syncStartTime;
      this.logSync(success, recordCount, error);
      
      // Update the latest record with duration
      if (this.syncHistory.length > 0) {
        this.syncHistory[0].duration = duration;
      }
    }
  }

  getStats() {
    const totalSyncs = this.syncHistory.length;
    const successfulSyncs = this.syncHistory.filter(s => s.success).length;
    const failedSyncs = totalSyncs - successfulSyncs;
    
    const lastSync = this.syncHistory.length > 0 ? this.syncHistory[0] : null;
    const averageDuration = this.syncHistory
      .filter(s => s.duration)
      .reduce((avg, s, _, arr) => avg + s.duration / arr.length, 0);

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs * 100).toFixed(1) : 0,
      lastSync,
      averageDuration: Math.round(averageDuration),
      isRunning: this.isRunning
    };
  }

  getHistory(limit = 10) {
    return this.syncHistory.slice(0, limit);
  }

  getHealthStatus() {
    const recentSyncs = this.syncHistory.slice(0, 5);
    const recentFailures = recentSyncs.filter(s => !s.success).length;
    
    let status = 'healthy';
    let message = 'All systems operational';

    if (recentFailures >= 3) {
      status = 'critical';
      message = 'Multiple recent sync failures detected';
    } else if (recentFailures >= 1) {
      status = 'warning';
      message = 'Recent sync failures detected';
    } else if (this.syncHistory.length === 0) {
      status = 'warning';
      message = 'No sync history available';
    }

    return {
      status,
      message,
      lastSync: this.syncHistory[0] || null,
      recentFailures
    };
  }
}

module.exports = { SyncMonitor };