import LearningProfile from "../models/LearningProfile.js";
import User from "../models/User.js";

// @desc    Get current user's learning profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    let profile = await LearningProfile.findOne({ userId: req.user.userId });

    if (!profile) {
      // Auto-initialize profile if it doesn't exist yet
      profile = await LearningProfile.create({
        userId: req.user.userId,
        studyGoals: ["Master course syllabus", "Prepare for upcoming examinations"],
        preferredStudyTime: "evening",
        dailyStudyTarget: 60,
        currentSubjects: ["Operating Systems", "Database Systems", "Computer Networks"],
        strongTopics: [],
        weakTopics: [],
        learningPreferences: {
          visualLearning: true,
          quizFrequency: "daily",
          spacedRepetitionEnabled: true,
        },
      });
    }

    const profileData = profile.toObject ? profile.toObject() : profile;
    res.status(200).json({
      success: true,
      data: {
        ...profileData,
        profile: profileData,
        user: {
          userId: req.user.userId,
          name: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's learning profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const {
      studyGoals,
      preferredStudyTime,
      dailyStudyTarget,
      currentSubjects,
      learningPreferences,
      name,
    } = req.body;

    // Optionally update user's display name if provided
    if (name && name.trim()) {
      await User.findOneAndUpdate(
        { userId: req.user.userId },
        { name: name.trim() }
      );
    }

    const updates = {};
    if (Array.isArray(studyGoals)) {
      updates.studyGoals = studyGoals;
    } else if (typeof studyGoals === "string" && studyGoals.trim()) {
      updates.studyGoals = studyGoals.split("\n").map((g) => g.trim()).filter(Boolean);
    }
    if (preferredStudyTime) updates.preferredStudyTime = preferredStudyTime;
    if (dailyStudyTarget !== undefined) {
      updates.dailyStudyTarget = Math.max(10, Math.min(Number(dailyStudyTarget) || 60, 480));
    }
    if (Array.isArray(currentSubjects)) updates.currentSubjects = currentSubjects;
    if (learningPreferences) updates.learningPreferences = learningPreferences;

    const profile = await LearningProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const profileData = profile.toObject();
    res.status(200).json({
      success: true,
      message: "Learning profile updated successfully",
      data: {
        ...profileData,
        profile: profileData,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProfile,
  updateProfile,
};
