import fs from "fs";
import { PDFParse } from "pdf-parse";

/**
 * Clean extracted text from PDF
 * - Normalizes newlines and spaces
 * - Removes non-printable control characters and null bytes
 * - Collapses excessive repeated line breaks
 */
export function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  return rawText
    // Remove null bytes and non-printable control characters (except newline \n and tab \t)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    // Normalize Windows/Mac line endings to \n
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Replace non-breaking spaces with standard space
    .replace(/\u00A0/g, " ")
    // Collapse horizontal whitespace runs (spaces/tabs) to a single space
    .replace(/[ \t]+/g, " ")
    // Collapse 3 or more consecutive newlines to two newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}

/**
 * Extract and clean text from a PDF file on disk
 * @param {string} filePath - Absolute path to PDF file
 * @returns {Promise<{ fullText: string, pages: Array<{ text: string, pageNumber: number }>, numPages: number }>}
 */
export async function extractTextFromPdf(filePath) {
  console.log(`[PDF] Extracting text from file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found on disk: ${filePath}`);
  }

  const dataBuffer = await fs.promises.readFile(filePath);

  let parsed;
  try {
    const parser = new PDFParse({ data: dataBuffer });
    parsed = await parser.getText();
  } catch (err) {
    console.error("[PDF] Extraction parser error:", err.message);
    throw new Error(`Failed to parse PDF document structure: ${err.message}`);
  }

  const rawPages = parsed.pages || [];
  const cleanedPages = [];
  let fullCleanedText = "";

  if (rawPages.length > 0) {
    for (const p of rawPages) {
      const pageText = cleanExtractedText(p.text || "");
      if (pageText.length > 0) {
        cleanedPages.push({
          pageNumber: p.num || cleanedPages.length + 1,
          text: pageText,
        });
        fullCleanedText += (fullCleanedText ? "\n\n" : "") + pageText;
      }
    }
  } else if (parsed.text) {
    const pageText = cleanExtractedText(parsed.text);
    if (pageText.length > 0) {
      cleanedPages.push({ pageNumber: 1, text: pageText });
      fullCleanedText = pageText;
    }
  }

  // Validate that extracted text is not empty or just whitespace
  if (!fullCleanedText || fullCleanedText.trim().length < 10) {
    throw new Error(
      "The uploaded PDF contains no readable text. It may be an image-only scan or an empty document."
    );
  }

  console.log(
    `[PDF] Text extracted successfully: ${fullCleanedText.length} characters across ${cleanedPages.length} pages`
  );

  return {
    fullText: fullCleanedText,
    pages: cleanedPages,
    numPages: cleanedPages.length || 1,
  };
}

export default {
  extractTextFromPdf,
  cleanExtractedText,
};
