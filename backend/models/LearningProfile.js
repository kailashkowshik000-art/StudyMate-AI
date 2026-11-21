import mongoose from "mongoose";

const learningProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId is required"],
      unique: true,
      index: true,
    },
    studyGoals: {
      type: [String],
      default: ["Master core university syllabus", "Prepare for upcoming midterms"],
    },
    preferredStudyTime: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      default: "evening",
    },
    dailyStudyTarget: {
      type: Number, // in minutes
      default: 60,
    },
    currentSubjects: {
      type: [String],
      default: ["Operating Systems", "Database Systems", "Computer Networks"],
    },
    strongTopics: {
      type: [String],
      default: [],
    },
    weakTopics: {
      type: [
        {
          topic: { type: String, required: true },
          averageScore: { type: Number, default: 0 },
          lastAttemptDate: { type: Date, default: Date.now },
          documentId: { type: String, default: null },
        },
      ],
      default: [],
    },
    learningPreferences: {
      visualLearning: { type: Boolean, default: true },
      quizFrequency: { type: String, default: "daily" },
      spacedRepetitionEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const LearningProfile = mongoose.model("LearningProfile", learningProfileSchema);
export default LearningProfile;
