import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      default: () => `ses_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
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
      default: "Study Session",
      trim: true,
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

// Compound indexes for user sessions and document-linked chat
chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ userId: 1, documentId: 1 });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export default ChatSession;
