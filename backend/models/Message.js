import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      unique: true,
      default: () => `msg_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    sessionId: {
      type: String,
      required: [true, "sessionId is required"],
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content cannot be empty"],
    },
    sources: {
      type: [
        {
          documentId: String,
          fileName: String,
          chunkIndex: Number,
          pageNumber: Number,
          snippet: String,
        },
      ],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for chronologically ordered session message retrieval
messageSchema.index({ sessionId: 1, timestamp: 1 });

export const Message = mongoose.model("Message", messageSchema);
export default Message;
