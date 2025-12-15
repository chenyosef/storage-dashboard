const fs = require('fs');
const path = require('path');

class FeedbackService {
  constructor() {
    // Data directory for feedback storage
    this.dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
    this.feedbackDir = path.join(this.dataDir, 'feedback');
    this.ensureDataDirectory();
    console.log('Feedback service initialized - saving to file storage');
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.feedbackDir)) {
      fs.mkdirSync(this.feedbackDir, { recursive: true });
    }
  }

  async saveFeedback(feedbackData) {
    const feedbackId = `fb_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const fullFeedback = {
      id: feedbackId,
      timestamp,
      ...feedbackData
    };

    // Save to file
    this.saveFeedbackToFile(fullFeedback);
    console.log(`Feedback ${feedbackId} saved to file`);

    return { success: true, feedbackId };
  }

  saveFeedbackToFile(feedback) {
    try {
      const filename = `${feedback.id}.json`;
      const filepath = path.join(this.feedbackDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(feedback, null, 2));
    } catch (error) {
      console.error('Error saving feedback to file:', error.message);
      throw error;
    }
  }

  getAllFeedback() {
    try {
      const files = fs.readdirSync(this.feedbackDir);
      const feedbackList = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.feedbackDir, file);
          const content = fs.readFileSync(filepath, 'utf8');
          feedbackList.push(JSON.parse(content));
        }
      }

      // Sort by timestamp, newest first
      feedbackList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return feedbackList;
    } catch (error) {
      console.error('Error reading feedback files:', error.message);
      throw error;
    }
  }

  getFeedbackById(feedbackId) {
    try {
      const filepath = path.join(this.feedbackDir, `${feedbackId}.json`);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading feedback file:', error.message);
      throw error;
    }
  }
}

module.exports = { FeedbackService };
