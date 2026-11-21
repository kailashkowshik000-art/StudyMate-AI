import path from "path";
import { extractTextFromPdf } from "./pdfService.js";
import { extractTextFromDocx } from "./docxExtractor.js";
import { extractTextFromPptx } from "./pptxExtractor.js";
import { extractTextFromTxt } from "./txtExtractor.js";

/**
 * Resolves normalized document format from file path or original name
 *
 * @param {string} fileNameOrPath
 * @returns {"pdf"|"docx"|"pptx"|"txt"|null}
 */
export function getDocumentFormat(fileNameOrPath) {
  if (!fileNameOrPath || typeof fileNameOrPath !== "string") return null;
  const ext = path.extname(fileNameOrPath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "pdf";
    case ".docx":
      return "docx";
    case ".pptx":
      return "pptx";
    case ".txt":
      return "txt";
    default:
      return null;
  }
}

/**
 * Unified document text extraction dispatcher
 *
 * @param {string} filePath - Absolute path to uploaded document
 * @param {string} [formatHint] - Optional format override
 * @returns {Promise<{
 *   fullText: string,
 *   pages: Array<{ pageNumber: number, slideNumber?: number, heading?: string, section?: string, title?: string, text: string }>,
 *   format: "pdf"|"docx"|"pptx"|"txt",
 *   numPages: number,
 *   pageCount: number,
 *   slideCount: number,
 *   wordCount: number,
 *   metadata: Object
 * }>}
 */
export async function extractDocumentContent(filePath, formatHint = null) {
  const format = formatHint || getDocumentFormat(filePath);

  if (!format) {
    throw new Error(
      `Unsupported file format: ${path.extname(filePath)}. Supported formats: .pdf, .docx, .pptx, .txt`
    );
  }

  let result;
  switch (format) {
    case "pdf": {
      result = await extractTextFromPdf(filePath);
      const wordCount = result.fullText.split(/\s+/).filter(Boolean).length;
      return {
        fullText: result.fullText,
        pages: result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.text,
        })),
        format: "pdf",
        numPages: result.numPages || result.pages.length || 1,
        pageCount: result.numPages || result.pages.length || 1,
        slideCount: 0,
        wordCount,
        metadata: { format: "pdf", pages: result.numPages },
      };
    }

    case "docx": {
      result = await extractTextFromDocx(filePath);
      return {
        fullText: result.fullText,
        pages: result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          heading: p.heading,
          text: p.text,
        })),
        format: "docx",
        numPages: result.numPages || 1,
        pageCount: result.numPages || 1,
        slideCount: 0,
        wordCount: result.wordCount,
        metadata: {
          format: "docx",
          headings: result.headings,
          sectionCount: result.pages.length,
        },
      };
    }

    case "pptx": {
      result = await extractTextFromPptx(filePath);
      return {
        fullText: result.fullText,
        pages: result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          slideNumber: p.slideNumber,
          title: p.title,
          text: p.text,
          notes: p.notes,
        })),
        format: "pptx",
        numPages: result.slideCount || 1,
        pageCount: 0,
        slideCount: result.slideCount || result.pages.length || 1,
        wordCount: result.wordCount,
        metadata: {
          format: "pptx",
          slideCount: result.slideCount,
        },
      };
    }

    case "txt": {
      result = await extractTextFromTxt(filePath);
      return {
        fullText: result.fullText,
        pages: result.pages.map((p) => ({
          pageNumber: p.pageNumber,
          section: p.section,
          text: p.text,
        })),
        format: "txt",
        numPages: result.numPages || 1,
        pageCount: result.numPages || 1,
        slideCount: 0,
        wordCount: result.wordCount,
        metadata: {
          format: "txt",
          sectionCount: result.pages.length,
        },
      };
    }

    default:
      throw new Error(`Unhandled document format: ${format}`);
  }
}

export default {
  getDocumentFormat,
  extractDocumentContent,
};
