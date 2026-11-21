import fs from "fs";
import mammoth from "mammoth";
import { cleanExtractedText } from "./pdfService.js";

/**
 * Converts HTML tables into clean, standard Markdown comparison tables with proper headers & separators
 */
export function parseHtmlTablesToMarkdown(html) {
  if (!html) return "";

  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableBody) => {
    const rowMatches = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rowMatches.length === 0) return "";

    const tableRows = [];
    let maxCols = 0;

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cells = cellMatches.map((cellHtml) => {
        let cellText = cellHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .replace(/\|/g, "\\|")
          .replace(/\s+/g, " ")
          .trim();
        return cellText || "-";
      });

      if (cells.length > 0) {
        maxCols = Math.max(maxCols, cells.length);
        tableRows.push(cells);
      }
    }

    if (tableRows.length === 0 || maxCols === 0) return "";

    // Normalize rows to maxCols
    const normalizedRows = tableRows.map((r) => {
      const padded = [...r];
      while (padded.length < maxCols) padded.push("-");
      return padded;
    });

    const header = normalizedRows[0];
    const separator = Array(maxCols).fill("---");
    const bodyRows = normalizedRows.slice(1);

    const mdLines = [
      `| ${header.join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
      ...bodyRows.map((r) => `| ${r.join(" | ")} |`),
    ];

    return `\n\n${mdLines.join("\n")}\n\n`;
  });
}

/**
 * Converts HTML from mammoth into structured markdown-like text preserving headings and tables
 */
function convertHtmlToStructuredText(html) {
  if (!html || typeof html !== "string") return "";

  // 1. First convert tables to clean markdown before replacing general tags
  let text = parseHtmlTablesToMarkdown(html);

  // 2. Headings (both HTML tags and class-based headings from Word styles)
  text = text
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, "\n\n#### $1\n\n")
    .replace(/<p[^>]*class="[^"]*(?:heading[\s_-]?1|title)[^"]*"[^>]*>(.*?)<\/p>/gi, "\n\n# $1\n\n")
    .replace(/<p[^>]*class="[^"]*heading[\s_-]?2[^"]*"[^>]*>(.*?)<\/p>/gi, "\n\n## $1\n\n")
    .replace(/<p[^>]*class="[^"]*heading[\s_-]?3[^"]*"[^>]*>(.*?)<\/p>/gi, "\n\n### $1\n\n")
    // List items (ordered and unordered)
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n• $1")
    // Paragraphs and breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    // Strip remaining HTML tags
    .replace(/<[^>]+>/g, " ");

  // Decode basic HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return cleanExtractedText(text);
}

/**
 * Extract structured text and sections from a Microsoft Word (.docx) file
 *
 * @param {string} filePath - Absolute path to .docx file
 * @returns {Promise<{ fullText: string, pages: Array<{ text: string, pageNumber: number, heading?: string, moduleTitle?: string }>, headings: string[], modules: string[], wordCount: number }>}
 */
export async function extractTextFromDocx(filePath) {
  console.log(`[DOCX] Extracting text from Word document: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Word file not found on disk: ${filePath}`);
  }

  let htmlResult;
  let rawResult;

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    htmlResult = await mammoth.convertToHtml({ buffer: fileBuffer });
    rawResult = await mammoth.extractRawText({ buffer: fileBuffer });
  } catch (err) {
    console.error("[DOCX] Extraction error:", err.message);
    throw new Error(`Failed to parse DOCX document structure: ${err.message}`);
  }

  const structuredText = convertHtmlToStructuredText(htmlResult?.value || "");
  const fallbackRawText = cleanExtractedText(rawResult?.value || "");
  const fullText = structuredText.length >= fallbackRawText.length ? structuredText : fallbackRawText;

  if (!fullText || fullText.trim().length < 10) {
    throw new Error(
      "The uploaded Word document contains no readable text or is empty."
    );
  }

  // Extract headings for metadata tracking
  const headingMatches = fullText.match(/^#{1,4}\s+(.+)$/gm) || [];
  const headings = headingMatches.map((h) => h.replace(/^#{1,4}\s+/, "").trim());

  // Detect Module/Unit/Chapter titles
  const moduleRegex = /(?:module|unit|chapter)[\s_-]*([0-9ivx]+)[:\s\.-]*(.*?)(?:\n|$)/i;
  const modules = [];
  headings.forEach((h) => {
    if (moduleRegex.test(h) && !modules.includes(h)) {
      modules.push(h);
    }
  });

  // Split into logical sections based on major headings or paragraph blocks
  const rawSections = fullText.split(/\n(?=#{1,3}\s+)/g).filter((s) => s.trim().length > 0);
  const pages = [];
  let currentPageText = "";
  let currentHeading = headings[0] || "Overview";
  let currentModule = modules[0] || currentHeading;
  let pageNumber = 1;

  for (const sec of rawSections) {
    const headingMatch = sec.match(/^#{1,3}\s+(.+)$/m);
    const newHeading = headingMatch ? headingMatch[1].trim() : null;
    const isNewModule = newHeading && moduleRegex.test(newHeading) && currentPageText.trim().length > 0;

    if (isNewModule || ((currentPageText + "\n\n" + sec).length > 2500 && currentPageText.length > 200)) {
      if (currentPageText.trim().length > 0) {
        pages.push({
          pageNumber: pageNumber++,
          heading: currentHeading,
          moduleTitle: currentModule,
          text: currentPageText.trim(),
        });
        currentPageText = "";
      }
    }

    if (newHeading) {
      currentHeading = newHeading;
      if (moduleRegex.test(currentHeading)) {
        currentModule = currentHeading;
      }
    }

    currentPageText = currentPageText ? currentPageText + "\n\n" + sec : sec;
  }

  if (currentPageText.trim().length > 0) {
    pages.push({
      pageNumber: pageNumber,
      heading: currentHeading,
      moduleTitle: currentModule,
      text: currentPageText.trim(),
    });
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  console.log(
    `[DOCX] Successfully extracted ${fullText.length} characters across ${pages.length} sections (${wordCount} words, ${headings.length} headings, ${modules.length} modules)`
  );

  return {
    fullText,
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText, heading: "Document Content", moduleTitle: "Overview" }],
    headings,
    modules,
    wordCount,
    numPages: pages.length || 1,
  };
}

export default {
  extractTextFromDocx,
};