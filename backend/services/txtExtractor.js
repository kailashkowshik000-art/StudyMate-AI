import fs from "fs";
import { cleanExtractedText } from "./pdfService.js";

/**
 * Extract and clean plain text (.txt) file with UTF-8 encoding and encoding fallback
 *
 * @param {string} filePath - Absolute path to .txt file
 * @returns {Promise<{ fullText: string, pages: Array<{ text: string, pageNumber: number, section: string }>, numPages: number, wordCount: number }>}
 */
export async function extractTextFromTxt(filePath) {
  console.log(`[TXT] Reading plain text file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Text file not found on disk: ${filePath}`);
  }

  const rawBuffer = await fs.promises.readFile(filePath);

  // Check for binary/null bytes that indicate an incompatible binary file renamed to .txt
  for (let i = 0; i < Math.min(rawBuffer.length, 1024); i++) {
    if (rawBuffer[i] === 0) {
      throw new Error("Security validation failed: File contains binary null bytes and is not a valid plain text file.");
    }
  }

  let text = "";

  // Strip UTF-8 or UTF-16 Byte Order Mark (BOM) if present
  if (rawBuffer.length >= 3 && rawBuffer[0] === 0xef && rawBuffer[1] === 0xbb && rawBuffer[2] === 0xbf) {
    text = rawBuffer.subarray(3).toString("utf8");
  } else if (rawBuffer.length >= 2 && rawBuffer[0] === 0xff && rawBuffer[1] === 0xfe) {
    text = rawBuffer.subarray(2).toString("utf16le");
  } else {
    try {
      text = rawBuffer.toString("utf8");
    } catch {
      // Fallback to latin1 if utf8 decode fails
      text = rawBuffer.toString("latin1");
    }
  }

  const fullText = cleanExtractedText(text);

  if (!fullText || fullText.trim().length < 5) {
    throw new Error(
      "The uploaded text file contains no readable content or is empty."
    );
  }

  // Split plain text into logical pages (~2000-2500 chars) preserving paragraph boundaries
  const rawParagraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const pages = [];
  let currentPageText = "";
  let pageNumber = 1;

  for (const para of rawParagraphs) {
    if ((currentPageText + "\n\n" + para).length > 2500 && currentPageText.length > 200) {
      pages.push({
        pageNumber: pageNumber,
        section: `Section ${pageNumber}`,
        text: currentPageText.trim(),
      });
      pageNumber++;
      currentPageText = para;
    } else {
      currentPageText = currentPageText ? currentPageText + "\n\n" + para : para;
    }
  }

  if (currentPageText.trim().length > 0) {
    pages.push({
      pageNumber: pageNumber,
      section: `Section ${pageNumber}`,
      text: currentPageText.trim(),
    });
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  console.log(
    `[TXT] Successfully processed ${fullText.length} characters across ${pages.length} sections (${wordCount} words)`
  );

  return {
    fullText,
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, section: "Section 1", text: fullText }],
    numPages: pages.length || 1,
    wordCount,
  };
}

export default {
  extractTextFromTxt,
};
