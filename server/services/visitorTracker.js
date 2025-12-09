const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class VisitorTracker {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.visitorFile = path.join(this.dataDir, 'visitors.json');
    this.ensureDataDirectory();
    this.loadVisitorData();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadVisitorData() {
    try {
      if (fs.existsSync(this.visitorFile)) {
        const data = fs.readFileSync(this.visitorFile, 'utf8');
        this.visitors = JSON.parse(data);
      } else {
        this.visitors = {
          unique: {},
          visits: [],
          stats: {
            totalVisits: 0,
            uniqueVisitors: 0,
            firstVisit: null,
            lastVisit: null
          }
        };
      }
    } catch (error) {
      console.error('Error loading visitor data:', error.message);
      this.visitors = {
        unique: {},
        visits: [],
        stats: {
          totalVisits: 0,
          uniqueVisitors: 0,
          firstVisit: null,
          lastVisit: null
        }
      };
    }
  }

  saveVisitorData() {
    try {
      fs.writeFileSync(this.visitorFile, JSON.stringify(this.visitors, null, 2));
    } catch (error) {
      console.error('Error saving visitor data:', error.message);
    }
  }

  // Generate a unique visitor ID based on IP and User-Agent
  generateVisitorId(ip, userAgent) {
    const hash = crypto.createHash('sha256');
    hash.update(`${ip}-${userAgent}`);
    return hash.digest('hex');
  }

  // Track a page visit
  trackVisit(req) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const visitorId = this.generateVisitorId(ip, userAgent);
    const timestamp = new Date().toISOString();

    // Check if this is a unique visitor
    const isNewVisitor = !this.visitors.unique[visitorId];

    if (isNewVisitor) {
      this.visitors.unique[visitorId] = {
        firstSeen: timestamp,
        lastSeen: timestamp,
        visitCount: 1
      };
      this.visitors.stats.uniqueVisitors++;
    } else {
      this.visitors.unique[visitorId].lastSeen = timestamp;
      this.visitors.unique[visitorId].visitCount++;
    }

    // Record the visit
    this.visitors.visits.push({
      visitorId,
      timestamp,
      isNewVisitor
    });

    // Update stats
    this.visitors.stats.totalVisits++;
    this.visitors.stats.lastVisit = timestamp;
    if (!this.visitors.stats.firstVisit) {
      this.visitors.stats.firstVisit = timestamp;
    }

    // Keep only last 1000 visits to prevent file from growing too large
    if (this.visitors.visits.length > 1000) {
      this.visitors.visits = this.visitors.visits.slice(-1000);
    }

    this.saveVisitorData();

    return {
      isNewVisitor,
      totalVisits: this.visitors.stats.totalVisits,
      uniqueVisitors: this.visitors.stats.uniqueVisitors
    };
  }

  // Get visitor statistics
  getStats() {
    // Calculate visits in the last 24 hours
    const now = Date.now();
    const last24Hours = this.visitors.visits.filter(visit => {
      const visitTime = new Date(visit.timestamp).getTime();
      return (now - visitTime) < 24 * 60 * 60 * 1000;
    });

    // Calculate visits in the last 7 days
    const last7Days = this.visitors.visits.filter(visit => {
      const visitTime = new Date(visit.timestamp).getTime();
      return (now - visitTime) < 7 * 24 * 60 * 60 * 1000;
    });

    // Get unique visitors in last 24 hours
    const uniqueLast24h = new Set(last24Hours.map(v => v.visitorId)).size;

    // Get unique visitors in last 7 days
    const uniqueLast7d = new Set(last7Days.map(v => v.visitorId)).size;

    return {
      totalVisits: this.visitors.stats.totalVisits,
      uniqueVisitors: this.visitors.stats.uniqueVisitors,
      firstVisit: this.visitors.stats.firstVisit,
      lastVisit: this.visitors.stats.lastVisit,
      last24Hours: {
        visits: last24Hours.length,
        uniqueVisitors: uniqueLast24h
      },
      last7Days: {
        visits: last7Days.length,
        uniqueVisitors: uniqueLast7d
      }
    };
  }
}

module.exports = { VisitorTracker };
