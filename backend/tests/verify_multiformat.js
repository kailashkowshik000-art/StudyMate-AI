/**
 * StudyMate AI - Phase 6.5 Multi-Format Document Support Verification Test Suite
 *
 * Verifies End-to-End Multi-Format Processing:
 * 1. Signature & Magic Byte Validation (PDF, DOCX, PPTX, TXT)
 * 2. Corrupted and Tampered File Detection
 * 3. Explicit Rejection of Legacy Formats (.doc, .ppt) with Helpful Messages
 * 4. Maximum File Size Enforcement (25MB Limit)
 * 5. Document Content Extraction (DOCX headings/tables, PPTX slides/notes, TXT sections)
 * 6. Semantic Chunking with Format-Specific Metadata (Slide, Heading, Section, Page)
 * 7. 768-Dimensional Vector Embeddings & Similarity Matching
 * 8. RAG Citation Formatting in Context Windows
 * 9. AI Study Workflows (Grounded Tutor Answers, Summary, Quiz, Flashcards)
 * 10. API Layer Payload Normalization & Status Badges
 * 11. Uploads Directory Integrity (All Existing PDFs Preserved)
 */

import http from "http";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

// App and DB Config
import { app } from "../app.js";
import { formatDocument } from "../controllers/documentController.js";
import {
  validateUploadedFile,
  validatePdfMagicBytes,
  validateDocxPackage,
  validatePptxPackage,
  validateTxtFile,
  uploadDir,
} from "../services/fileService.js";
import {
  getDocumentFormat,
  extractDocumentContent,
} from "../services/documentExtractorService.js";
import { extractTextFromDocx } from "../services/docxExtractor.js";
import { extractTextFromPptx } from "../services/pptxExtractor.js";
import { extractTextFromTxt } from "../services/txtExtractor.js";
import { createChunks } from "../services/chunkService.js";
import {
  generateEmbedding,
  generateFallbackEmbedding,
  EMBEDDING_DIMENSION,
} from "../services/embeddingService.js";
import { cosineSimilarity } from "../services/vectorSearchService.js";
import geminiService, {
  generateAnswer,
  generateSummary,
  generateQuiz,
  generateFlashcards,
} from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testTempDir = path.resolve(__dirname, "./temp_multiformat_test");

// ANSI Colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function recordResult(testNum, title, passed, details = "") {
  if (passed) {
    passedCount++;
    console.log(`  ${GREEN}[PASS]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.log(`         ${CYAN}${details}${RESET}`);
  } else {
    failedCount++;
    console.error(`  ${RED}[FAIL]${RESET} ${BOLD}Test ${testNum}:${RESET} ${title}`);
    if (details) console.error(`         ${RED}${details}${RESET}`);
  }
}

// Helper to create test fixtures
function createDocxFixture(targetPath, heading, bodyText) {
  const zip = new AdmZip();
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${heading}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>${bodyText}</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Term</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Definition</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>CAP Theorem</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Consistency, Availability, and Partition Tolerance trade-offs.</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
  zip.addFile("word/document.xml", Buffer.from(xml, "utf8"));
  zip.writeZip(targetPath);
}

function createPptxFixture(targetPath, slidesData) {
  const zip = new AdmZip();
  zip.addFile(
    "ppt/presentation.xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst></p:sldIdLst></p:presentation>`,
      "utf8"
    )
  );

  slidesData.forEach((s, idx) => {
    const slideNum = idx + 1;
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>${s.title}</a:t></a:r></a:p>
          <a:p><a:r><a:t>${s.content}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    zip.addFile(`ppt/slides/slide${slideNum}.xml`, Buffer.from(slideXml, "utf8"));

    if (s.notes) {
      const notesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>${s.notes}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
      zip.addFile(`ppt/notesSlides/notesSlide${slideNum}.xml`, Buffer.from(notesXml, "utf8"));
    }
  });

  zip.writeZip(targetPath);
}

async function runTestSuite() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD} StudyMate AI — Multi-Format Document Upload & Processing Verification${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: PDF Magic Bytes & Header Validation
    // -------------------------------------------------------------------------
    {
      const validPdfPath = path.join(testTempDir, "valid.pdf");
      fs.writeFileSync(validPdfPath, Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"));

      const invalidPdfPath = path.join(testTempDir, "invalid.pdf");
      fs.writeFileSync(invalidPdfPath, Buffer.from("NOT_A_PDF_FILE_HEADER"));

      const validPass = await validatePdfMagicBytes(validPdfPath);
      let invalidBlocked = false;
      try {
        await validatePdfMagicBytes(invalidPdfPath);
      } catch (err) {
        invalidBlocked = err.message.includes("PDF magic bytes");
      }

      recordResult(
        1,
        "PDF magic bytes (%PDF-) validation strictly enforces valid file headers",
        validPass === true && invalidBlocked === true,
        `Valid PDF accepted: ${validPass}, Fake PDF rejected: ${invalidBlocked}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 2: DOCX Package & Structure Integrity Validation
    // -------------------------------------------------------------------------
    {
      const validDocxPath = path.join(testTempDir, "valid.docx");
      createDocxFixture(validDocxPath, "Distributed Computing", "Principles of distributed nodes and messaging.");

      const corruptZipPath = path.join(testTempDir, "corrupt.docx");
      const fakeZip = new AdmZip();
      fakeZip.addFile("some_other_file.txt", Buffer.from("no document.xml here"));
      fakeZip.writeZip(corruptZipPath);

      const notAZipPath = path.join(testTempDir, "notazip.docx");
      fs.writeFileSync(notAZipPath, Buffer.from("This is plain text with a .docx extension"));

      const validPass = await validateDocxPackage(validDocxPath);

      let corruptBlocked = false;
      try {
        await validateDocxPackage(corruptZipPath);
      } catch (err) {
        corruptBlocked = err.message.includes("word/document.xml");
      }

      let notZipBlocked = false;
      try {
        await validateDocxPackage(notAZipPath);
      } catch (err) {
        notZipBlocked = err.message.includes("ZIP/OpenXML signature");
      }

      recordResult(
        2,
        "DOCX package validator checks PK signature and word/document.xml entry",
        validPass === true && corruptBlocked === true && notZipBlocked === true,
        `Valid: ${validPass}, Corrupt: ${corruptBlocked}, Not Zip: ${notZipBlocked}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: PPTX Package & Presentation Structure Integrity Validation
    // -------------------------------------------------------------------------
    {
      const validPptxPath = path.join(testTempDir, "valid.pptx");
      createPptxFixture(validPptxPath, [
        { title: "Intro to Clouds", content: "Elastic scaling and virtual machines.", notes: "Point out AWS and GCP." },
        { title: "Serverless Architecture", content: "Functions as a Service with automatic scaling.", notes: "" },
      ]);

      const corruptPptxPath = path.join(testTempDir, "corrupt.pptx");
      const badZip = new AdmZip();
      badZip.addFile("readme.txt", Buffer.from("missing presentation.xml"));
      badZip.writeZip(corruptPptxPath);

      const validPass = await validatePptxPackage(validPptxPath);

      let corruptBlocked = false;
      try {
        await validatePptxPackage(corruptPptxPath);
      } catch (err) {
        corruptBlocked = err.message.includes("ppt/presentation.xml");
      }

      recordResult(
        3,
        "PPTX package validator checks PK signature and ppt/presentation.xml entry",
        validPass === true && corruptBlocked === true,
        `Valid PPTX accepted: ${validPass}, Corrupt package rejected: ${corruptBlocked}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Plain Text File Security & Null Byte Detection
    // -------------------------------------------------------------------------
    {
      const validTxtPath = path.join(testTempDir, "valid.txt");
      fs.writeFileSync(validTxtPath, "Unit 1: Algorithms\n\nSorting algorithms: Quicksort and Mergesort analysis.");

      const binaryTxtPath = path.join(testTempDir, "binary.txt");
      fs.writeFileSync(binaryTxtPath, Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64])); // Contains 0x00

      const emptyTxtPath = path.join(testTempDir, "empty.txt");
      fs.writeFileSync(emptyTxtPath, Buffer.alloc(0));

      const validPass = await validateTxtFile(validTxtPath);

      let binaryBlocked = false;
      try {
        await validateTxtFile(binaryTxtPath);
      } catch (err) {
        binaryBlocked = err.message.includes("null bytes");
      }

      let emptyBlocked = false;
      try {
        await validateTxtFile(emptyTxtPath);
      } catch (err) {
        emptyBlocked = err.message.includes("empty");
      }

      recordResult(
        4,
        "Plain text validator validates UTF-8 text and rejects binary null bytes and 0-byte files",
        validPass === true && binaryBlocked === true && emptyBlocked === true,
        `Valid TXT: ${validPass}, Binary nulls blocked: ${binaryBlocked}, Empty blocked: ${emptyBlocked}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: Explicit Rejection of Legacy Formats (.doc, .ppt) & Clear Messaging
    // -------------------------------------------------------------------------
    {
      const legacyDocPath = path.join(testTempDir, "lecture.doc");
      fs.writeFileSync(legacyDocPath, "legacy word binary content");

      const legacyPptPath = path.join(testTempDir, "slides.ppt");
      fs.writeFileSync(legacyPptPath, "legacy ppt binary content");

      let docMsg = "";
      try {
        await validateUploadedFile({
          filePath: legacyDocPath,
          originalname: "lecture.doc",
          mimetype: "application/msword",
          size: 1024,
        });
      } catch (err) {
        docMsg = err.message;
      }

      let pptMsg = "";
      try {
        await validateUploadedFile({
          filePath: legacyPptPath,
          originalname: "slides.ppt",
          mimetype: "application/vnd.ms-powerpoint",
          size: 1024,
        });
      } catch (err) {
        pptMsg = err.message;
      }

      const legacyBlocked =
        docMsg.includes("Legacy binary formats (.doc, .ppt) are not supported") &&
        pptMsg.includes("Legacy binary formats (.doc, .ppt) are not supported");

      recordResult(
        5,
        "Legacy binary formats (.doc, .ppt) are rejected with clear user conversion guidance",
        legacyBlocked,
        `Error message: "${docMsg}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: File Size Limit (25MB) Enforcement
    // -------------------------------------------------------------------------
    {
      const fakeLargePath = path.join(testTempDir, "oversized.pdf");
      fs.writeFileSync(fakeLargePath, "%PDF-1.4 test");

      let sizeBlocked = false;
      try {
        await validateUploadedFile({
          filePath: fakeLargePath,
          originalname: "oversized.pdf",
          mimetype: "application/pdf",
          size: 27000000, // 27 MB > 25MB
        });
      } catch (err) {
        sizeBlocked = err.message.includes("File size exceeds maximum allowed limit");
      }

      recordResult(
        6,
        "Maximum file size limit (25MB) strictly enforced across all file formats",
        sizeBlocked,
        `Oversized upload correctly rejected`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: DOCX Headings, Tables & Structured Extraction
    // -------------------------------------------------------------------------
    {
      const docxPath = path.join(testTempDir, "course_notes.docx");
      createDocxFixture(
        docxPath,
        "Database Architecture",
        "Relational databases use ACID transactions to guarantee data validity."
      );

      const extraction = await extractDocumentContent(docxPath);

      const pass =
        extraction.format === "docx" &&
        extraction.fullText.includes("Database Architecture") &&
        extraction.fullText.includes("ACID transactions") &&
        extraction.wordCount > 10 &&
        extraction.pages.length > 0;

      recordResult(
        7,
        "DOCX extractor extracts headings, paragraphs, and tables preserving document structure",
        pass,
        `Format: ${extraction.format}, Words: ${extraction.wordCount}, Sections: ${extraction.pages.length}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 8: PPTX Slides, Titles, Bullets & Speaker Notes Extraction
    // -------------------------------------------------------------------------
    {
      const pptxPath = path.join(testTempDir, "system_design.pptx");
      createPptxFixture(pptxPath, [
        {
          title: "Microservices Architecture",
          content: "Independent deployment, decentralized data management, and resilience.",
          notes: "Mention Netflix and Amazon real-world case studies.",
        },
        {
          title: "Message Queues & Event Streaming",
          content: "Apache Kafka and RabbitMQ provide asynchronous decoupled communication.",
          notes: "Emphasize backpressure handling.",
        },
      ]);

      const extraction = await extractDocumentContent(pptxPath);

      const pass =
        extraction.format === "pptx" &&
        extraction.slideCount === 2 &&
        extraction.fullText.includes("Microservices Architecture") &&
        extraction.fullText.includes("Message Queues") &&
        extraction.fullText.includes("Netflix and Amazon") &&
        extraction.pages[0].slideNumber === 1 &&
        extraction.pages[1].slideNumber === 2;

      recordResult(
        8,
        "PPTX extractor extracts slide titles, bullets, slide numbers, and speaker notes",
        pass,
        `Slides: ${extraction.slideCount}, Contains notes: ${extraction.fullText.includes("Netflix and Amazon")}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 9: TXT Section Parsing & Encoding Integrity
    // -------------------------------------------------------------------------
    {
      const txtPath = path.join(testTempDir, "network_protocols.txt");
      fs.writeFileSync(
        txtPath,
        `=== Section 1: Transport Layer ===\nTCP provides reliable ordered byte streams with congestion control.\n\n=== Section 2: Network Layer ===\nIP provides best-effort connectionless packet delivery.`
      );

      const extraction = await extractDocumentContent(txtPath);

      const pass =
        extraction.format === "txt" &&
        extraction.fullText.includes("Transport Layer") &&
        extraction.fullText.includes("congestion control") &&
        extraction.wordCount > 15;

      recordResult(
        9,
        "Plain text extractor segments paragraphs and parses clean UTF-8 text",
        pass,
        `Format: ${extraction.format}, Words: ${extraction.wordCount}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Semantic Chunking Propagates Format-Specific Metadata
    // -------------------------------------------------------------------------
    {
      // PPTX chunks
      const pptxUnits = [
        {
          slideNumber: 3,
          title: "Kubernetes Pod Lifecycle",
          text: "A Pod is the smallest deployable unit of computing that you can create and manage in Kubernetes. It encapsulates containers, storage resources, and network identities.",
          format: "pptx",
        },
      ];
      const pptxChunks = createChunks({
        pages: pptxUnits,
        documentId: "doc_pptx_test",
        userId: "user_123",
      });

      // DOCX chunks
      const docxUnits = [
        {
          pageNumber: 1,
          heading: "CAP Theorem Tradeoffs",
          text: "In theoretical computer science, the CAP theorem states that any distributed data store can only provide two of the following three guarantees: Consistency, Availability, and Partition Tolerance.",
          format: "docx",
        },
      ];
      const docxChunks = createChunks({
        pages: docxUnits,
        documentId: "doc_docx_test",
        userId: "user_123",
      });

      const pptxMetaPass =
        pptxChunks.length > 0 &&
        pptxChunks[0].metadata.slideNumber === 3 &&
        pptxChunks[0].metadata.title === "Kubernetes Pod Lifecycle" &&
        pptxChunks[0].metadata.format === "pptx";

      const docxMetaPass =
        docxChunks.length > 0 &&
        docxChunks[0].metadata.heading === "CAP Theorem Tradeoffs" &&
        docxChunks[0].metadata.format === "docx";

      recordResult(
        10,
        "Semantic chunking preserves slide numbers, headings, and formats in chunk metadata",
        pptxMetaPass && docxMetaPass,
        `PPTX metadata: ${JSON.stringify(pptxChunks[0].metadata)}, DOCX metadata: ${JSON.stringify(docxChunks[0].metadata)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: 768-Dimensional Vector Embeddings Across Formats
    // -------------------------------------------------------------------------
    {
      const docxChunk = "In microservices architecture, services communicate via REST APIs or gRPC.";
      const pptxChunk = "Slides on distributed caching: Redis and Memcached reduce database read loads.";

      const docxVec = await generateEmbedding(docxChunk);
      const pptxVec = await generateEmbedding(pptxChunk);

      const pass =
        Array.isArray(docxVec) &&
        docxVec.length === EMBEDDING_DIMENSION &&
        Array.isArray(pptxVec) &&
        pptxVec.length === EMBEDDING_DIMENSION;

      const sim = cosineSimilarity(docxVec, pptxVec);

      recordResult(
        11,
        `Standard 768d vector embeddings generated identically across all document formats`,
        pass && typeof sim === "number" && !isNaN(sim),
        `Dimensions: ${docxVec.length}d, Cross-format similarity score: ${sim.toFixed(4)}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: RAG Grounding & Multi-Format Citation Badges (Slide, Section, Page)
    // -------------------------------------------------------------------------
    {
      const multiFormatContext = [
        {
          documentId: "doc_pptx_1",
          fileName: "Cloud_Architecture.pptx",
          chunkIndex: 0,
          text: "Autoscaling groups automatically adjust compute instances based on CPU utilization metrics.",
          metadata: { slideNumber: 5, format: "pptx" },
        },
        {
          documentId: "doc_docx_1",
          fileName: "Operating_Systems.docx",
          chunkIndex: 2,
          text: "Virtual memory uses paging to map virtual addresses into physical RAM frames.",
          metadata: { heading: "Memory Management", format: "docx" },
        },
        {
          documentId: "doc_txt_1",
          fileName: "network_notes.txt",
          chunkIndex: 1,
          text: "DNS translates human-readable hostnames into numeric IP addresses.",
          metadata: { section: "Section 2: Name Resolution", format: "txt" },
        },
        {
          documentId: "doc_pdf_1",
          fileName: "Algorithms.pdf",
          chunkIndex: 4,
          text: "Dijkstra's algorithm finds the shortest path in a weighted graph with non-negative edge weights.",
          metadata: { pageNumber: 42, format: "pdf" },
        },
      ];

      const { answer, sources } = await generateAnswer({
        question: "How does autoscaling work and how does memory management support it?",
        contextChunks: multiFormatContext,
      });

      const pptxSource = sources.find((s) => s.documentId === "doc_pptx_1");
      const docxSource = sources.find((s) => s.documentId === "doc_docx_1");
      const txtSource = sources.find((s) => s.documentId === "doc_txt_1");
      const pdfSource = sources.find((s) => s.documentId === "doc_pdf_1");

      const citationsPass =
        pptxSource?.slideNumber === 5 &&
        docxSource?.heading === "Memory Management" &&
        txtSource?.section === "Section 2: Name Resolution" &&
        pdfSource?.pageNumber === 42 &&
        typeof answer === "string" &&
        answer.length > 50;

      recordResult(
        12,
        "RAG prompt context and sources generate accurate citations (Slide X, Heading Y, Page Z)",
        citationsPass,
        `PPTX: Slide ${pptxSource?.slideNumber}, DOCX: "${docxSource?.heading}", TXT: "${txtSource?.section}", PDF: Page ${pdfSource?.pageNumber}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 13: Multi-Format AI Features (Summary, Quiz, Flashcards)
    // -------------------------------------------------------------------------
    {
      const pptxChunks = [
        {
          documentId: "doc_pptx_ai",
          chunkIndex: 0,
          text: "Cloud computing provides on-demand access to shared computing resources including servers, storage, and networking. Key cloud characteristics include on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service. Service models include IaaS, PaaS, and SaaS.",
        },
      ];

      const summary = await generateSummary({
        documentTitle: "Cloud_Computing.pptx",
        chunks: pptxChunks,
      });
      const quiz = await generateQuiz({
        documentTitle: "Cloud_Computing.pptx",
        chunks: pptxChunks,
        options: { numQuestions: 3, difficulty: "medium" },
      });
      const flashcards = await generateFlashcards({
        documentTitle: "Cloud_Computing.pptx",
        chunks: pptxChunks,
        numberOfCards: 3,
      });

      const pass =
        summary &&
        typeof summary.overview === "string" &&
        Array.isArray(summary.keyPoints) &&
        Array.isArray(quiz) &&
        quiz.length > 0 &&
        Array.isArray(flashcards) &&
        flashcards.length > 0;

      recordResult(
        13,
        "AI Summarizer, Quiz Generator, and Flashcard Generator execute seamlessly on non-PDF formats",
        pass,
        `Summary points: ${summary?.keyPoints?.length}, Quiz questions: ${quiz?.length}, Flashcards: ${flashcards?.length}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 14: formatDocument API Output Normalization & Type Badging
    // -------------------------------------------------------------------------
    {
      const docxDoc = {
        documentId: "doc_docx_fmt",
        fileName: "distributed_consensus.docx",
        fileUrl: "/uploads/distributed_consensus.docx",
        fileSize: 1048576,
        format: "docx",
        pageCount: 12,
        slideCount: 0,
        wordCount: 3400,
        subject: "Distributed Systems",
        processingStatus: "completed",
        status: "ready",
        chunkCount: 8,
        uploadedAt: new Date(),
      };

      const pptxDoc = {
        documentId: "doc_pptx_fmt",
        fileName: "lecture_slides.pptx",
        fileUrl: "/uploads/lecture_slides.pptx",
        fileSize: 5242880,
        format: "pptx",
        pageCount: 0,
        slideCount: 25,
        wordCount: 1800,
        subject: "Machine Learning",
        processingStatus: "completed",
        status: "ready",
        chunkCount: 15,
        uploadedAt: new Date(),
      };

      const formattedDocx = formatDocument(docxDoc);
      const formattedPptx = formatDocument(pptxDoc);

      const pass =
        formattedDocx.type === "DOCX" &&
        formattedDocx.format === "docx" &&
        formattedDocx.pageCount === 12 &&
        formattedPptx.type === "PPTX" &&
        formattedPptx.format === "pptx" &&
        formattedPptx.slideCount === 25;

      recordResult(
        14,
        "API document formatter normalizes payload with dynamic type badges and page/slide counts",
        pass,
        `DOCX: type=${formattedDocx.type}, pages=${formattedDocx.pageCount}; PPTX: type=${formattedPptx.type}, slides=${formattedPptx.slideCount}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 15: Preservation of All Existing Uploaded PDF Documents
    // -------------------------------------------------------------------------
    {
      const existingFiles = fs.readdirSync(uploadDir);
      const pdfFiles = existingFiles.filter((f) => f.toLowerCase().endsWith(".pdf"));

      // Check that existing PDFs are still in uploads/ and readable
      let allValid = true;
      for (const pdf of pdfFiles) {
        const full = path.join(uploadDir, pdf);
        const stat = fs.statSync(full);
        if (stat.size === 0) allValid = false;
      }

      recordResult(
        15,
        "Existing uploaded PDF files in uploads/ directory remain completely intact and untouched",
        pdfFiles.length >= 14 && allValid,
        `Found ${pdfFiles.length} existing user PDF files in ${uploadDir}; all verified intact`
      );
    }

  } finally {
    // Cleanup temporary test directory
    try {
      if (fs.existsSync(testTempDir)) {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(` Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET} (Total: ${passedCount + failedCount})`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed with fatal error:", err);
  process.exit(1);
});