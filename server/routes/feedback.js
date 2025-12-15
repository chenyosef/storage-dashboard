const express = require('express');
const router = express.Router();

// In-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 5; // Max submissions per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(ip) {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const attempts = rateLimitMap.get(ip);

  // Remove old attempts outside the time window
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  // Add current attempt
  recentAttempts.push(now);
  rateLimitMap.set(ip, recentAttempts);

  return true;
}

// Clean up old rate limit entries periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of rateLimitMap.entries()) {
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (recentAttempts.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recentAttempts);
    }
  }
}, 15 * 60 * 1000);

// Submit feedback
router.post('/', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Rate limiting check
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        error: 'Too many feedback submissions. Please try again in an hour.'
      });
    }

    // Extract and validate input
    const { category, email, message, context } = req.body;

    // Validate category
    const allowedCategories = [
      'Question',
      'Insight/Suggestion',
      'Bug Report',
      'Data Correction',
      'Other'
    ];

    if (!category || !allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Please select a valid category.'
      });
    }

    // Validate email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required.'
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long. Maximum 5000 characters allowed.'
      });
    }

    // Prepare feedback data
    const feedbackData = {
      category,
      email: email.trim(),
      message: message.trim(),
      context: context || {},
      userAgent: req.get('user-agent') || 'unknown',
      ip: ip
    };

    // Save feedback via FeedbackService
    const feedbackService = req.app.locals.feedbackService;

    if (!feedbackService) {
      return res.status(500).json({
        success: false,
        error: 'Feedback service not available.'
      });
    }

    const result = await feedbackService.saveFeedback(feedbackData);

    res.json({
      success: true,
      message: 'Thank you for your feedback! It has been submitted successfully.',
      feedbackId: result.feedbackId
    });

  } catch (error) {
    console.error('Error processing feedback submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.'
    });
  }
});

// Get all feedback
router.get('/', async (req, res) => {
  try {
    const feedbackService = req.app.locals.feedbackService;

    if (!feedbackService) {
      return res.status(500).json({
        success: false,
        error: 'Feedback service not available.'
      });
    }

    const feedbackList = feedbackService.getAllFeedback();

    res.json({
      success: true,
      count: feedbackList.length,
      feedback: feedbackList
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feedback.'
    });
  }
});

// Get feedback by ID
router.get('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const feedbackService = req.app.locals.feedbackService;

    if (!feedbackService) {
      return res.status(500).json({
        success: false,
        error: 'Feedback service not available.'
      });
    }

    const feedback = feedbackService.getFeedbackById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found.'
      });
    }

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feedback.'
    });
  }
});

module.exports = router;
