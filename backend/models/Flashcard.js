import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const flashcardSchema = new mongoose.Schema(
  {
    flashcardId: {
      type: String,
      unique: true,
      default: () => `card_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
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
    topic: {
      type: String,
      required: [true, "topic is required"],
      trim: true,
    },
    question: {
      type: String,
      required: [true, "question (front side) is required"],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, "answer (back side) is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    lastReviewed: {
      type: Date,
      default: null,
    },
    nextReview: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
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

flashcardSchema.index({ userId: 1, nextReview: 1 });
flashcardSchema.index({ userId: 1, documentId: 1 });
flashcardSchema.index({ userId: 1, documentId: 1, question: 1 });

export const Flashcard = mongoose.model("Flashcard", flashcardSchema);
export default Flashcard;
