import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const examQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: Number, required: true },
    selectedAnswer: { type: Number, default: null },
    explanation: { type: String, default: "" },
    topic: { type: String, default: "General" },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    examId: {
      type: String,
      unique: true,
      default: () => `exam_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
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
    subject: {
      type: String,
      required: true,
      default: "Computer Science",
    },
    title: {
      type: String,
      default: "Final Practice Exam",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    timeLimit: {
      type: Number, // in minutes
      default: 30,
    },
    questions: {
      type: [examQuestionSchema],
      default: [],
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: null,
    },
    percentage: {
      type: Number,
      default: null,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    weakAreas: {
      type: [String],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

examSchema.index({ userId: 1, createdAt: -1 });
examSchema.index({ userId: 1, documentId: 1, createdAt: -1 });

export const Exam = mongoose.model("Exam", examSchema);
export default Exam;
