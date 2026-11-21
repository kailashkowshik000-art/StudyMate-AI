import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL_NAME =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSION =
  parseInt(process.env.EMBEDDING_DIMENSION, 10) || 768;

/**
 * Deterministic fallback embedding generator (768-dim unit vector)
 * Used when GEMINI_API_KEY is missing or the external API is unreachable.
 * Maps n-grams and vocabulary terms across 768 dimensions with L2 normalization
 * so cosine similarity reflects textual similarity.
 */
export function generateFallbackEmbedding(
  text,
  dimensions = EMBEDDING_DIMENSION
) {
  const vector = new Array(dimensions).fill(0);
  if (!text || typeof text !== "string") return vector;

  const normalized = text.toLowerCase();
  const words = normalized.split(/\W+/).filter(Boolean);

  // Hash words
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) + hash + word.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1.0;
  }

  // Hash character trigrams for subword robustness
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 2166136261;
    for (let j = 0; j < 3; j++) {
      hash = (hash ^ trigram.charCodeAt(j)) * 16777619;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 0.35;
  }

  // L2 Normalize so dot product equals cosine similarity
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Generate embedding for a single text query or snippet
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    // Development fallback
    return generateFallbackEmbedding(text, EMBEDDING_DIMENSION);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL_NAME,
      contents: text,
      config: {
        outputDimensionality: EMBEDDING_DIMENSION,
      },
    });

    const values = result?.embedding?.values || result?.embeddings?.[0]?.values;
    if (values && Array.isArray(values) && values.length > 0) {
      return values;
    }
    throw new Error("Invalid embedding response structure from Gemini API");
  } catch (err) {
    console.warn(
      `[EMBEDDING] Gemini API embedding failed (${err.message}). Using DEVELOPMENT FALLBACK embedding.`
    );
    return generateFallbackEmbedding(text, EMBEDDING_DIMENSION);
  }
}

/**
 * Generate embeddings for an array of text chunks with batching
 * @param {Array<{ text: string, [key: string]: any }>} chunks
 * @returns {Promise<Array<Object>>} Chunks with embedding field attached
 */
export async function generateEmbeddings(chunks) {
  if (!chunks || chunks.length === 0) return [];

  console.log(
    `[EMBEDDING] Generating embeddings for ${chunks.length} chunks...`
  );
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API Key, use fast deterministic fallback
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    console.log(
      "[EMBEDDING] Using DEVELOPMENT FALLBACK embeddings (768d unit vectors)"
    );
    return chunks.map((chunk) => ({
      ...chunk,
      embedding: generateFallbackEmbedding(chunk.text, EMBEDDING_DIMENSION),
    }));
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Batch in groups of 20 to avoid exceeding payload limits
    const batchSize = 20;
    const enrichedChunks = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      try {
        const batchResponse = await ai.models.embedContent({
          model: EMBEDDING_MODEL_NAME,
          contents: batch.map((c) => c.text),
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        });

        const embeddings = batchResponse?.embeddings;
        if (
          embeddings &&
          embeddings.length === batch.length
        ) {
          batch.forEach((c, idx) => {
            enrichedChunks.push({
              ...c,
              embedding: embeddings[idx].values,
            });
          });
        } else {
          throw new Error("Mismatched batch embedding count returned");
        }
      } catch (batchErr) {
        console.warn(
          `[EMBEDDING] Batch ${i / batchSize + 1} failed: ${batchErr.message}. Falling back per chunk.`
        );
        // Fallback for this batch
        for (const c of batch) {
          const emb = await generateEmbedding(c.text);
          enrichedChunks.push({ ...c, embedding: emb });
        }
      }
    }

    console.log(`[EMBEDDING] Finished generating embeddings for ${chunks.length} chunks`);
    return enrichedChunks;
  } catch (err) {
    console.warn(
      `[EMBEDDING] Batch generation error: ${err.message}. Using DEVELOPMENT FALLBACK.`
    );
    return chunks.map((chunk) => ({
      ...chunk,
      embedding: generateFallbackEmbedding(chunk.text, EMBEDDING_DIMENSION),
    }));
  }
}

export default {
  generateEmbedding,
  generateEmbeddings,
  generateFallbackEmbedding,
  EMBEDDING_DIMENSION,
};
