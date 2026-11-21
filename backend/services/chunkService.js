import { v4 as uuidv4 } from "uuid";

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE, 10) || 800;
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP, 10) || 150;

/**
 * Split text into semantic sentences respecting punctuation boundaries
 */
function splitIntoSentences(text) {
  // Split on periods, question marks, exclamation marks followed by whitespace or linebreaks
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Find a clean boundary in text (sentence end or space) near target overlap length
 */
function getOverlapText(text, targetOverlap) {
  if (text.length <= targetOverlap) return text;
  const slice = text.slice(text.length - targetOverlap);
  // Prefer starting at a sentence break if possible
  const sentenceIndex = slice.search(/(?<=[.?!])\s+/);
  if (sentenceIndex !== -1 && sentenceIndex < slice.length - 20) {
    return slice.slice(sentenceIndex).trim();
  }
  // Otherwise split at the first whitespace to avoid half words
  const spaceIndex = slice.indexOf(" ");
  if (spaceIndex !== -1 && spaceIndex < slice.length - 10) {
    return slice.slice(spaceIndex + 1).trim();
  }
  return slice.trim();
}

/**
 * Create semantic chunks from document pages and text
 * @param {Object} params
 * @param {Array<{ text: string, pageNumber: number }>} [params.pages]
 * @param {string} [params.fullText]
 * @param {string} params.documentId
 * @param {string} params.userId
 * @param {number} [params.maxChunkSize]
 * @param {number} [params.overlap]
 * @returns {Array<Object>}
 */
export function createChunks({
  pages = [],
  fullText = "",
  documentId,
  userId,
  maxChunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
}) {
  if (!documentId) throw new Error("documentId is required for chunk creation");
  if (!userId) throw new Error("userId is required for chunk creation");

  console.log(
    `[CHUNKS] Starting chunking for document ${documentId} (maxSize: ${maxChunkSize}, overlap: ${overlap})`
  );

  // If pages provided, chunk with page tracking; otherwise chunk fullText
  const sourceUnits =
    pages.length > 0
      ? pages
      : [{ text: fullText, pageNumber: 1 }];

  const chunks = [];
  let chunkIndex = 0;
  let currentOverlap = "";

  for (const unit of sourceUnits) {
    const pageNum = unit.pageNumber || 1;
    const slideNum = unit.slideNumber || null;
    const heading = unit.heading || null;
    const section = unit.section || null;
    const title = unit.title || null;
    const unitFormat = unit.format || null;

    const buildMetadata = (trimmed) => ({
      pageNumber: pageNum,
      charCount: trimmed.length,
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      ...(slideNum ? { slideNumber: slideNum } : {}),
      ...(heading ? { heading } : {}),
      ...(unit.moduleTitle ? { moduleTitle: unit.moduleTitle } : {}),
      ...(section ? { section } : {}),
      ...(title ? { title } : {}),
      ...(unitFormat ? { format: unitFormat } : {}),
    });

    const paragraphs = unit.text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let currentChunkText = currentOverlap ? currentOverlap + "\n\n" : "";
    currentOverlap = "";

    for (const para of paragraphs) {
      if ((currentChunkText + "\n\n" + para).trim().length <= maxChunkSize) {
        currentChunkText = currentChunkText
          ? currentChunkText + "\n\n" + para
          : para;
      } else {
        // Paragraph pushes beyond maxChunkSize
        // If currentChunkText is already populated, seal it
        if (currentChunkText.trim().length >= 100) {
          const trimmed = currentChunkText.trim();
          chunks.push({
            chunkId: `chk_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
            documentId,
            userId,
            chunkIndex: chunkIndex++,
            text: trimmed,
            metadata: buildMetadata(trimmed),
          });
          currentOverlap = getOverlapText(trimmed, overlap);
          currentChunkText = currentOverlap ? currentOverlap + "\n\n" : "";
        }

        // Now process the large paragraph by sentences
        const sentences = splitIntoSentences(para);
        for (const sentence of sentences) {
          if (
            (currentChunkText + " " + sentence).trim().length <= maxChunkSize
          ) {
            currentChunkText = currentChunkText
              ? currentChunkText + " " + sentence
              : sentence;
          } else {
            if (currentChunkText.trim().length > 0) {
              const trimmed = currentChunkText.trim();
              chunks.push({
                chunkId: `chk_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
                documentId,
                userId,
                chunkIndex: chunkIndex++,
                text: trimmed,
                metadata: buildMetadata(trimmed),
              });
              currentOverlap = getOverlapText(trimmed, overlap);
              currentChunkText = currentOverlap ? currentOverlap + " " : "";
            }
            currentChunkText += sentence;
          }
        }
      }
    }

    // Flush any remaining text in unit
    if (currentChunkText.trim().length > 0) {
      const trimmed = currentChunkText.trim();
      chunks.push({
        chunkId: `chk_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
        documentId,
        userId,
        chunkIndex: chunkIndex++,
        text: trimmed,
        metadata: buildMetadata(trimmed),
      });
      currentOverlap = getOverlapText(trimmed, overlap);
    }
  }

  // Edge case: if entire document yielded 0 chunks (very short text)
  if (chunks.length === 0 && fullText.trim().length > 0) {
    const trimmed = fullText.trim();
    chunks.push({
      chunkId: `chk_${uuidv4().replace(/-/g, "").slice(0, 12)}`,
      documentId,
      userId,
      chunkIndex: 0,
      text: trimmed,
      metadata: {
        pageNumber: 1,
        charCount: trimmed.length,
        wordCount: trimmed.split(/\s+/).filter(Boolean).length,
      },
    });
  }

  console.log(
    `[CHUNKS] Created ${chunks.length} chunks for document ${documentId}`
  );
  return chunks;
}

export default {
  createChunks,
};
