import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [
        (val) => val.length >= 2,
        "A question must have at least 2 options",
      ],
    },
    correctAnswer: {
      type: Number,
      required: true,
    },
    selectedAnswer: {
      type: Number,
      default: null,
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    quizId: {
      type: String,
      unique: true,
      default: () => `qiz_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
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
    title: {
      type: String,
      required: true,
      default: "Practice Quiz",
    },
    subject: {
      type: String,
      default: "General Studies",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    questions: {
      type: [questionSchema],
      required: true,
    },
    score: {
      type: Number,
      default: null,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user quiz history and document-filtered quizzes
quizSchema.index({ userId: 1, createdAt: -1 });
quizSchema.index({ userId: 1, documentId: 1, createdAt: -1 });

export const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;
