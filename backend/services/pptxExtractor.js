import fs from "fs";
import AdmZip from "adm-zip";
import { cleanExtractedText } from "./pdfService.js";

/**
 * Extracts raw text runs from an XML string while preserving paragraph breaks
 */
function extractParagraphsFromXml(xmlString) {
  if (!xmlString) return [];

  // Match all <a:p> (paragraph) elements
  const paragraphMatches = xmlString.match(/<a:p[\s\S]*?<\/a:p>/gi) || [];
  const paragraphs = [];

  for (const paraXml of paragraphMatches) {
    // Extract all text runs (<a:t>text</a:t>) inside the paragraph
    const textMatches = paraXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
    const paraText = textMatches
      .map((t) => t.replace(/<a:t[^>]*>/i, "").replace(/<\/a:t>/i, ""))
      .join("")
      .trim();

    if (paraText.length > 0) {
      // Check if paragraph is marked as a bullet or list item
      const isBullet = /<a:pPr[^>]*lvl="[1-9]"|<a:buChar|<a:buAutoNum/i.test(paraXml);
      paragraphs.push({
        text: paraText,
        isBullet,
      });
    }
  }

  return paragraphs;
}

/**
 * Extract slide title from slide XML
 */
function extractSlideTitle(slideXml, paragraphs) {
  // Check for shapes explicitly marked with title placeholder
  const titleShapeMatch = slideXml.match(/<p:sp[\s\S]*?type="(?:title|ctrTitle)"[\s\S]*?<\/p:sp>/i);
  if (titleShapeMatch) {
    const titleParas = extractParagraphsFromXml(titleShapeMatch[0]);
    if (titleParas.length > 0) {
      return titleParas.map((p) => p.text).join(" ").trim();
    }
  }

  // Fallback to the first paragraph in the slide
  if (paragraphs.length > 0) {
    return paragraphs[0].text.slice(0, 80).trim();
  }

  return "Untitled Slide";
}

/**
 * Extract structured text and slides from a Microsoft PowerPoint (.pptx) file
 *
 * @param {string} filePath - Absolute path to .pptx file
 * @returns {Promise<{ fullText: string, pages: Array<{ text: string, pageNumber: number, slideNumber: number, title: string, notes?: string }>, slideCount: number, wordCount: number }>}
 */
export async function extractTextFromPptx(filePath) {
  console.log(`[PPTX] Extracting slides from PowerPoint presentation: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PowerPoint file not found on disk: ${filePath}`);
  }

  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch (err) {
    console.error("[PPTX] Zip parsing error:", err.message);
    throw new Error(`Failed to parse PPTX presentation package: ${err.message}`);
  }

  const zipEntries = zip.getEntries();
  const slideEntries = zipEntries.filter((e) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName)
  );

  if (slideEntries.length === 0) {
    throw new Error("No slide XML files found inside the PowerPoint presentation.");
  }

  // Sort slides numerically by slide number (e.g. slide1, slide2, ..., slide10)
  slideEntries.sort((a, b) => {
    const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
    const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
    return numA - numB;
  });

  // Index speaker notes if present: ppt/notesSlides/notesSlide{N}.xml
  const notesMap = new Map();
  for (const entry of zipEntries) {
    const noteMatch = entry.entryName.match(/ppt\/notesSlides\/notesSlide(\d+)\.xml/i);
    if (noteMatch) {
      const noteNum = parseInt(noteMatch[1], 10);
      try {
        const noteXml = entry.getData().toString("utf8");
        const noteParas = extractParagraphsFromXml(noteXml);
        // Exclude slide number markers (often just a digit)
        const noteText = noteParas
          .map((p) => p.text)
          .filter((t) => t.length > 2 && !/^\d+$/.test(t.trim()))
          .join("\n");
        if (noteText) notesMap.set(noteNum, noteText);
      } catch {}
    }
  }

  const pages = [];
  let fullCleanedText = "";

  for (let idx = 0; idx < slideEntries.length; idx++) {
    const entry = slideEntries[idx];
    const slideNumber = idx + 1;
    let slideXml;

    try {
      slideXml = entry.getData().toString("utf8");
    } catch (err) {
      console.warn(`[PPTX] Failed to read slide ${slideNumber}:`, err.message);
      continue;
    }

    const paragraphs = extractParagraphsFromXml(slideXml);
    if (paragraphs.length === 0) continue;

    const title = extractSlideTitle(slideXml, paragraphs);
    const speakerNotes = notesMap.get(slideNumber) || "";

    // Build structured slide text
    let slideBody = `[Slide ${slideNumber}: ${title}]\n`;

    paragraphs.forEach((p, pIdx) => {
      // Don't duplicate the title if it's the exact first paragraph
      if (pIdx === 0 && p.text === title) return;
      if (p.isBullet) {
        slideBody += `• ${p.text}\n`;
      } else {
        slideBody += `${p.text}\n`;
      }
    });

    if (speakerNotes) {
      slideBody += `\n[Speaker Notes]:\n${speakerNotes}\n`;
    }

    const cleanedSlide = cleanExtractedText(slideBody);

    if (cleanedSlide.length > 0) {
      pages.push({
        pageNumber: slideNumber,
        slideNumber,
        title,
        text: cleanedSlide,
        notes: speakerNotes || undefined,
      });

      fullCleanedText += (fullCleanedText ? "\n\n---\n\n" : "") + cleanedSlide;
    }
  }

  if (!fullCleanedText || fullCleanedText.trim().length < 10) {
    throw new Error(
      "The uploaded PowerPoint presentation contains no readable text or is empty."
    );
  }

  const wordCount = fullCleanedText.split(/\s+/).filter(Boolean).length;

  console.log(
    `[PPTX] Successfully extracted ${fullCleanedText.length} characters across ${pages.length} slides (${wordCount} words)`
  );

  return {
    fullText: fullCleanedText,
    pages,
    slideCount: pages.length,
    numPages: pages.length || 1,
    wordCount,
  };
}

export default {
  extractTextFromPptx,
};
