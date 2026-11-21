import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const studyActivitySchema = new mongoose.Schema(
  {
    activityId: {
      type: String,
      unique: true,
      default: () => `act_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    documentId: {
      type: String,
      default: null,
      index: true,
    },
    activityType: {
      type: String,
      enum: [
        "document_read",
        "chat_question",
        "quiz_attempt",
        "quiz_completed",
        "summary_generated",
        "flashcard_review",
        "study_session",
      ],
      required: [true, "activityType is required"],
    },
    topic: {
      type: String,
      default: "General Studies",
      trim: true,
    },
    duration: {
      type: Number, // in minutes
      default: 5,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user activity queries and analytics aggregation
studyActivitySchema.index({ userId: 1, createdAt: -1 });
studyActivitySchema.index({ userId: 1, activityType: 1, createdAt: -1 });
studyActivitySchema.index({ userId: 1, documentId: 1 });

export const StudyActivity = mongoose.model("StudyActivity", studyActivitySchema);
export default StudyActivity;
