import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const studyTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      default: () => `task_${uuidv4().replace(/-/g, "").slice(0, 8)}`,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    activity: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedMinutes: {
      type: Number,
      default: 30,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      unique: true,
      default: () => `plan_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dailyTarget: {
      type: Number, // in minutes
      default: 60,
    },
    tasks: {
      type: [studyTaskSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

studyPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);
export default StudyPlan;
