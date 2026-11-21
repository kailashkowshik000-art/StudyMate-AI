import { TextChunk } from "../models/TextChunk.js";
import { Document } from "../models/Document.js";
import { generateEmbedding } from "./embeddingService.js";

const DEFAULT_TOP_K = parseInt(process.env.TOP_K, 10) || 5;

/**
 * Calculate cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform semantic similarity search over document chunks
 *
 * Strict Security:
 * - Always scopes queries to the authenticated userId
 * - Scopes to documentId if specified
 * - Never returns chunks belonging to other users
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID (Required)
 * @param {string} [params.documentId] - Optional document filter
 * @param {string} params.query - Search query string
 * @param {number[]} [params.queryEmbedding] - Optional pre-computed query embedding
 * @param {number} [params.topK=5] - Number of top chunks to return
 * @returns {Promise<Array<Object>>} Top similar chunks with score and metadata
 */
export async function searchSimilarChunks({
  userId,
  documentId = null,
  query,
  queryEmbedding = null,
  topK = DEFAULT_TOP_K,
}) {
  if (!userId) {
    throw new Error("Vector search requires an authenticated userId");
  }
  if (!query && !queryEmbedding) {
    throw new Error("Query text or query embedding is required for vector search");
  }

  console.log(
    `[VECTOR] Searching top ${topK} chunks for user: ${userId}${
      documentId ? ` in document: ${documentId}` : " across all user documents"
    }`
  );

  // 1. Generate query embedding if not provided
  const vector = queryEmbedding || (await generateEmbedding(query));

  // 2. Build security filter
  const filter = { userId };
  if (documentId) {
    filter.documentId = documentId;
  }

  // 3. Attempt MongoDB Atlas Vector Search ($vectorSearch stage)
  const isAtlasConfigured =
    process.env.MONGODB_URI &&
    process.env.MONGODB_URI.includes("mongodb+srv") &&
    process.env.USE_MEMORY_DB !== "true";

  if (isAtlasConfigured) {
    try {
      const atlasIndex = process.env.ATLAS_VECTOR_INDEX || "vector_index";
      const pipeline = [
        {
          $vectorSearch: {
            index: atlasIndex,
            path: "embedding",
            queryVector: vector,
            numCandidates: topK * 10,
            limit: topK,
            filter,
          },
        },
        {
          $project: {
            chunkId: 1,
            documentId: 1,
            userId: 1,
            chunkIndex: 1,
            text: 1,
            metadata: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      const results = await TextChunk.aggregate(pipeline);
      if (results && results.length > 0) {
        console.log(
          `[VECTOR] MongoDB Atlas Vector Search returned ${results.length} matches`
        );
        return await enrichChunksWithDocInfo(results, userId);
      }
    } catch (atlasErr) {
      console.warn(
        `[VECTOR] Atlas Vector Search failed or not initialized (${atlasErr.message}). Switching to DEVELOPMENT FALLBACK.`
      );
    }
  }

  // 4. DEVELOPMENT FALLBACK: In-memory cosine similarity
  // Clearly logged as specified in requirements
  console.log(
    "[VECTOR] Using DEVELOPMENT FALLBACK (in-memory cosine similarity search)"
  );

  const candidateChunks = await TextChunk.find(filter).lean();

  if (!candidateChunks || candidateChunks.length === 0) {
    console.log("[VECTOR] No candidate chunks found for search criteria");
    return [];
  }

  // Calculate similarity score for each chunk
  const scoredChunks = candidateChunks
    .map((chunk) => {
      const score = cosineSimilarity(vector, chunk.embedding || []);
      return {
        ...chunk,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  console.log(
    `[VECTOR] Development fallback identified ${scoredChunks.length} relevant chunks (top score: ${
      scoredChunks[0]?.score?.toFixed(4) || "0"
    })`
  );

  return await enrichChunksWithDocInfo(scoredChunks, userId);
}

/**
 * Enrich chunks with document fileName for source citations
 */
async function enrichChunksWithDocInfo(chunks, userId) {
  if (!chunks || chunks.length === 0) return [];

  const docIds = [...new Set(chunks.map((c) => c.documentId))];
  const docs = await Document.find({
    documentId: { $in: docIds },
    userId,
  })
    .select("documentId fileName")
    .lean();

  const docMap = {};
  docs.forEach((d) => {
    docMap[d.documentId] = d.fileName;
  });

  return chunks.map((c) => ({
    ...c,
    fileName: docMap[c.documentId] || "Document",
  }));
}

export default {
  searchSimilarChunks,
  cosineSimilarity,
};
