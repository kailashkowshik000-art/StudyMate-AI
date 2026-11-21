import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const textChunkSchema = new mongoose.Schema(
  {
    chunkId: {
      type: String,
      unique: true,
      default: () => `chk_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
    },
    documentId: {
      type: String,
      required: [true, "documentId is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: [true, "chunkIndex is required"],
    },
    text: {
      type: String,
      required: [true, "text is required"],
    },
    embedding: {
      type: [Number],
      default: [],
    },
    metadata: {
      pageNumber: { type: Number, default: 1 },
      slideNumber: { type: Number, default: null },
      heading: { type: String, default: null },
      section: { type: String, default: null },
      format: { type: String, default: "pdf" },
      charCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
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

// Compound index for user data isolation and fast chunk lookup
textChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 });
// Unique compound index to prevent duplicate chunks per document
textChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export const TextChunk = mongoose.model("TextChunk", textChunkSchema);
export default TextChunk;
