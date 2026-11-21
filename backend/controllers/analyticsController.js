import {
  calculateStudyStats,
  recordActivity,
} from "../services/learningAnalyticsService.js";
import { generateRecommendations } from "../services/recommendationService.js";
import StudyActivity from "../models/StudyActivity.js";

// @desc    Get user's overall learning analytics and performance stats
// @route   GET /api/analytics
// @access  Private
export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await calculateStudyStats(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        ...analytics,
        stats: analytics.stats,
        performance: analytics.performance,
        profile: analytics.profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get personalized AI study recommendations
// @route   GET /api/analytics/recommendations
// @access  Private
export const getRecommendations = async (req, res, next) => {
  try {
    const data = await generateRecommendations(req.user.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent study activities
// @route   GET /api/analytics/activities
// @access  Private
export const getActivities = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const activities = await StudyActivity.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: activities,
      activities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a study activity (e.g. manual session duration or reading time)
// @route   POST /api/analytics/log
// @access  Private
export const logActivity = async (req, res, next) => {
  try {
    const { activityType, topic, duration, documentId, metadata } = req.body;

    if (!activityType) {
      return res.status(400).json({
        success: false,
        message: "activityType is required",
      });
    }

    const activity = await recordActivity({
      userId: req.user.userId,
      documentId: documentId || null,
      activityType,
      topic: topic || "General Studies",
      duration: Number(duration) || 5,
      metadata: metadata || {},
    });

    res.status(201).json({
      success: true,
      data: {
        activity,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAnalytics,
  getRecommendations,
  getActivities,
  logActivity,
};
