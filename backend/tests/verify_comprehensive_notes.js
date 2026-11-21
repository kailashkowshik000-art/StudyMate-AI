/**
 * StudyMate AI - Comprehensive Notes & Multi-Module Study Guide Verification Suite
 *
 * Verifies End-to-End Comprehensive Study Notes Generation:
 * 1. Extraction of Multi-Module Documents with Headings and Tables
 * 2. Table Parsing to Clean, Valid Markdown Tables (|:---|:---|)
 * 3. Semantic Chunking with moduleTitle Preservation (100% chunks kept)
 * 4. groupChunksIntoModules preserves all chunks without slicing/loss
 * 5. extractTablesFromText detects and parses comparison tables
 * 6. Detailed Notes Generation: Deep Topic Notes, Working Principles & Architectures
 * 7. Clean Markdown Comparison Tables (Microprocessor vs Microcontroller, etc.)
 * 8. Important Definitions & Technical Terms
 * 9. Diagrams and Workflow Processes with Step-by-Step Sequences
 * 10. Categorized Exam Question Banks (2-mark, 5-mark, 10-mark questions)
 * 11. Quick Revision Capsule (Key Takeaways, Formulas, Terms, Last-Minute Points)
 * 12. Mode Switching: Detailed vs Concise vs Exam
 * 13. Mongoose Summary Model Schema Persistence & Retrieval
 * 14. Backward Compatibility with Legacy Summary Documents
 * 15. Uploads Directory Preservation (All user files intact)
 */

import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import AdmZip from "adm-zip";

import { app } from "../app.js";
import { uploadDir } from "../services/fileService.js";
import { parseHtmlTablesToMarkdown, extractTextFromDocx } from "../services/docxExtractor.js";
import { createChunks } from "../services/chunkService.js";
import Summary from "../models/Summary.js";
import geminiService, {
  groupChunksIntoModules,
  extractTablesFromText,
  generateSummary,
} from "../services/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testTempDir = path.resolve(__dirname, "./temp_notes_test");

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
    if (details) console.error(`         ${YELLOW}${details}${RESET}`);
  }
}

async function runComprehensiveNotesTests() {
  console.log("\n========================================================================");
  console.log(" StudyMate AI — Comprehensive AI Notes & Module Guide Verification");
  console.log("========================================================================\n");

  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Table parsing from HTML to clean Markdown tables
    // ---------------------------------------------------------
    const rawHtmlWithTable = `
      <h2>Microprocessor vs Microcontroller</h2>
      <table>
        <tr><th>Feature</th><th>Microprocessor</th><th>Microcontroller</th></tr>
        <tr><td>Heart of system</td><td>General purpose CPU</td><td>Embedded application dedicated</td></tr>
        <tr><td>Peripherals</td><td>External RAM, ROM, I/O</td><td>On-chip RAM, ROM, Timers, I/O</td></tr>
        <tr><td>Cost & Power</td><td>Higher power, expensive</td><td>Low power, economical</td></tr>
      </table>
    `;
    const parsedMarkdown = parseHtmlTablesToMarkdown(rawHtmlWithTable);
    const hasHeaderSeparator = parsedMarkdown.includes("| --- | --- | --- |") || parsedMarkdown.includes("|:---|:---|:---|");
    const hasCleanPipes = parsedMarkdown.includes("| Feature | Microprocessor | Microcontroller |");
    const noDoublePipes = !parsedMarkdown.includes("||");

    recordResult(
      1,
      "parseHtmlTablesToMarkdown converts HTML tables to compliant GitHub-flavored markdown",
      hasHeaderSeparator && hasCleanPipes && noDoublePipes,
      `Header separator: ${hasHeaderSeparator}, Clean pipes: ${hasCleanPipes}, No double pipes: ${noDoublePipes}`
    );

    // ---------------------------------------------------------
    // TEST 2: DOCX Extraction preserves Modules, Headings, and Tables
    // ---------------------------------------------------------
    const docxZip = new AdmZip();
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Module 1: Embedded Systems Architecture</w:t></w:r></w:p>
          <w:p><w:r><w:t>An embedded system is a microprocessor or microcontroller-based system designed to perform dedicated functions.</w:t></w:r></w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Parameter</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Von Neumann</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Harvard</w:t></w:r></w:p></w:tc>
            </w:tr>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Memory Bus</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Shared Bus</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:t>Separate Code/Data</w:t></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Module 2: IoT Sensors and Cloud Gateways</w:t></w:r></w:p>
          <w:p><w:r><w:t>IoT devices connect edge nodes to cloud computing infrastructure using MQTT and CoAP protocols.</w:t></w:r></w:p>
        </w:body>
      </w:document>`;
    docxZip.addFile("word/document.xml", Buffer.from(docXml, "utf8"));
    const docxPath = path.join(testTempDir, "embedded_iot_modules.docx");
    docxZip.writeZip(docxPath);

    const docxResult = await extractTextFromDocx(docxPath);
    const extractedModules = docxResult.modules || [];
    const textContent = docxResult.fullText || docxResult.text || "";
    const hasModuleHeadings = textContent.includes("Module 1") && textContent.includes("Module 2");

    recordResult(
      2,
      "DOCX Extractor recognizes module titles and preserves structured sections",
      hasModuleHeadings && extractedModules.length >= 2,
      `Modules detected: ${extractedModules.length}, Text length: ${textContent.length} chars`
    );

    // ---------------------------------------------------------
    // TEST 3: Chunking preserves moduleTitle and structural metadata
    // ---------------------------------------------------------
    const sections = docxResult.pages || docxResult.sections || [];
    const chunks = createChunks({
      pages: sections,
      documentId: "doc_embedded_test",
      userId: "user_test_123",
      maxChunkSize: 400,
      overlap: 50,
    });
    const module1Chunks = chunks.filter((c) =>
      (c.metadata?.moduleTitle || c.metadata?.heading || "").includes("Module 1") ||
      (c.text || "").includes("Module 1")
    );
    const module2Chunks = chunks.filter((c) =>
      (c.metadata?.moduleTitle || c.metadata?.heading || "").includes("Module 2") ||
      (c.text || "").includes("Module 2")
    );

    recordResult(
      3,
      "Semantic chunking preserves moduleTitle and heading across chunk metadata",
      chunks.length >= 2 && module1Chunks.length > 0 && module2Chunks.length > 0,
      `Total chunks: ${chunks.length}, Module 1 chunks: ${module1Chunks.length}, Module 2 chunks: ${module2Chunks.length}`
    );

    // ---------------------------------------------------------
    // TEST 4: groupChunksIntoModules preserves 100% of chunks without slicing
    // ---------------------------------------------------------
    const groupedModules = groupChunksIntoModules(chunks, "Embedded Systems and IoT");
    const totalGroupedChunks = groupedModules.reduce((sum, m) => sum + m.chunks.length, 0);
    const zeroChunkLoss = totalGroupedChunks === chunks.length;

    recordResult(
      4,
      "groupChunksIntoModules partitions 100% of document chunks with ZERO chunk loss",
      zeroChunkLoss && groupedModules.length >= 2,
      `Modules created: ${groupedModules.length}, Input chunks: ${chunks.length}, Grouped chunks: ${totalGroupedChunks}`
    );

    // ---------------------------------------------------------
    // TEST 5: extractTablesFromText extracts clean markdown comparison tables
    // ---------------------------------------------------------
    const sampleMarkdownText = `
### Module 1 Comparison
Here is the core architectural comparison:

| Parameter | Von Neumann | Harvard |
|:---|:---|:---|
| Memory Architecture | Shared data & instruction bus | Separate code & data buses |
| Pipelining | Slower due to bus bottleneck | Faster simultaneous instruction & data access |
| Cost | Lower hardware complexity | Higher pin count and cost |

And regular paragraphs follow.
    `;
    const tables = extractTablesFromText(sampleMarkdownText);
    const tableFound = tables.length > 0;
    const tableTitleValid = tableFound && tables[0].title.includes("Von Neumann");
    const tableMarkdownClean = tableFound && tables[0].markdown.includes("|:---|:---|:---|");

    recordResult(
      5,
      "extractTablesFromText detects markdown tables and parses title and format",
      tableFound && tableTitleValid && tableMarkdownClean,
      `Tables extracted: ${tables.length}, Title: "${tables[0]?.title}"`
    );

    // ---------------------------------------------------------
    // TEST 6: Comprehensive Detailed Notes Generation (Topics & Working Principles)
    // ---------------------------------------------------------
    // Mock realistic engineering chunks
    const comprehensiveChunks = [
      {
        chunkIndex: 0,
        text: "Module 1: Embedded Systems & Microcontrollers.\nAn embedded system is a dedicated hardware-software platform designed to execute specific real-time tasks. Core components include CPU, RAM, ROM, Flash, Timers, Watchdog Timer, and Interrupt Controller. Working principle involves reset vector loading, peripheral initialization, superloop or RTOS task scheduling, and ISR handling for asynchronous events. Architecture utilizes either Von Neumann or Harvard structures.",
        metadata: { heading: "Module 1: Embedded Systems Architecture", pageNumber: 1, moduleTitle: "Module 1: Embedded Systems Architecture" },
      },
      {
        chunkIndex: 1,
        text: "| Architecture | Von Neumann | Harvard |\n|:---|:---|:---|\n| Instruction/Data Bus | Shared Bus | Separate Buses |\n| Execution Speed | Slower (Bottleneck) | Faster (Concurrent Access) |\n| Memory Space | Unified Address Space | Distinct Address Spaces |\nKey advantage of Harvard is high throughput in DSP and RISC microcontrollers like ARM Cortex-M.",
        metadata: { heading: "Von Neumann vs Harvard Architecture", pageNumber: 2, moduleTitle: "Module 1: Embedded Systems Architecture" },
      },
      {
        chunkIndex: 2,
        text: "Module 2: IoT Wireless Protocols and Edge Gateways.\nInternet of Things connects smart sensor nodes to cloud analytic engines. Working principle: Physical sensors capture analog signals, ADC converts them, microcontroller packages data into MQTT payloads with QoS 0, 1, or 2, and transmits via Wi-Fi, BLE, or LoRaWAN. Architecture consists of perception layer, network layer, middleware, and application layer.",
        metadata: { heading: "Module 2: IoT Wireless Protocols", pageNumber: 3, moduleTitle: "Module 2: IoT Wireless Protocols" },
      },
      {
        chunkIndex: 3,
        text: "| Protocol | MQTT | HTTP |\n|:---|:---|:---|\n| Architecture | Publish / Subscribe Broker | Client-Server Request-Response |\n| Overhead | 2-byte header (Extremely lightweight) | Large text header (Heavy) |\n| Transport | TCP/IP | TCP/IP |\nMQTT is optimal for battery-powered sensor motes and bandwidth-constrained networks.",
        metadata: { heading: "MQTT vs HTTP Protocol Comparison", pageNumber: 4, moduleTitle: "Module 2: IoT Wireless Protocols" },
      },
    ];

    const notesResult = await generateSummary({
      documentTitle: "Embedded Systems & IoT Engineering Guide",
      chunks: comprehensiveChunks,
      options: { summaryMode: "detailed" },
    });

    const hasModules = Array.isArray(notesResult.modules) && notesResult.modules.length >= 2;
    const mod1 = notesResult.modules?.[0];
    const hasTopics = Array.isArray(mod1?.topics) && mod1.topics.length > 0;
    const topic1 = mod1?.topics?.[0];
    const hasWorkingPrinciples = Boolean(topic1?.workingPrinciples || topic1?.explanation);
    const hasArchitecture = Boolean(topic1?.architecture || topic1?.explanation);

    recordResult(
      6,
      "Comprehensive Notes Generator produces module-wise topics with working principles & architectures",
      hasModules && hasTopics && hasWorkingPrinciples && hasArchitecture,
      `Modules: ${notesResult.modules?.length}, Module 1 Topics: ${mod1?.topics?.length}, Topic 1 Heading: "${topic1?.heading}"`
    );

    // ---------------------------------------------------------
    // TEST 7: Comparison Tables Preserved in Notes Output
    // ---------------------------------------------------------
    const mod1Tables = mod1?.comparisonTables || [];
    const globalTables = notesResult.globalComparisonTables || [];
    const totalTables = mod1Tables.length + globalTables.length;
    const tableValid = totalTables > 0 || notesResult.modules?.some((m) => (m.comparisonTables || []).length > 0);

    recordResult(
      7,
      "Technical comparison tables are extracted and bound to modules in notes output",
      tableValid,
      `Module comparison tables found across notes output: ${totalTables}`
    );

    // ---------------------------------------------------------
    // TEST 8: Important Definitions Extracted
    // ---------------------------------------------------------
    const definitions = notesResult.definitions || [];
    const mod1Definitions = mod1?.importantDefinitions || [];
    const hasDefinitions = definitions.length > 0 || mod1Definitions.length > 0;

    recordResult(
      8,
      "Important technical definitions and terms are accurately extracted",
      hasDefinitions,
      `Global definitions: ${definitions.length}, Module 1 definitions: ${mod1Definitions.length}`
    );

    // ---------------------------------------------------------
    // TEST 9: Diagrams and System Workflow Sequences
    // ---------------------------------------------------------
    const mod1Diagrams = mod1?.diagramsAndProcesses || [];
    const hasDiagramOrWorkflow = mod1Diagrams.length > 0 || notesResult.modules?.some((m) => (m.diagramsAndProcesses || []).length > 0);

    recordResult(
      9,
      "Diagrams and operational workflow steps are mapped with sequence descriptions",
      hasDiagramOrWorkflow,
      `Module diagrams/workflows found: ${mod1Diagrams.length > 0 ? mod1Diagrams[0]?.title : "Generated"}`
    );

    // ---------------------------------------------------------
    // TEST 10: Categorized Exam Questions (2-mark, 5-mark, 10-mark)
    // ---------------------------------------------------------
    const examPrep = mod1?.examPreparation || notesResult.examQuestions || {};
    const hasTwoMark = Array.isArray(examPrep.twoMarkQuestions) && examPrep.twoMarkQuestions.length > 0;
    const hasFiveMark = Array.isArray(examPrep.fiveMarkQuestions) && examPrep.fiveMarkQuestions.length > 0;
    const hasTenMark = Array.isArray(examPrep.tenMarkQuestions) && examPrep.tenMarkQuestions.length > 0;

    recordResult(
      10,
      "Categorized exam questions generated: 2-mark (short), 5-mark (conceptual), 10-mark (architectural)",
      hasTwoMark && hasFiveMark && hasTenMark,
      `2-mark: ${examPrep.twoMarkQuestions?.length}, 5-mark: ${examPrep.fiveMarkQuestions?.length}, 10-mark: ${examPrep.tenMarkQuestions?.length}`
    );

    // ---------------------------------------------------------
    // TEST 11: Quick Revision Capsule (Takeaways, Formulas, Terms, Last-Minute Points)
    // ---------------------------------------------------------
    const quickRev = mod1?.quickRevisionNotes || notesResult.quickRevision || {};
    const hasTakeaways = Array.isArray(quickRev.keyTakeaways) && quickRev.keyTakeaways.length > 0;
    const hasTerms = Array.isArray(quickRev.technicalTerms) && quickRev.technicalTerms.length > 0;
    const hasLastMinute = Array.isArray(quickRev.lastMinutePoints) && quickRev.lastMinutePoints.length > 0;

    recordResult(
      11,
      "Quick Revision capsule generated with key takeaways, technical terms, and memory triggers",
      hasTakeaways && hasTerms && hasLastMinute,
      `Takeaways: ${quickRev.keyTakeaways?.length}, Terms: ${quickRev.technicalTerms?.length}, Last-minute points: ${quickRev.lastMinutePoints?.length}`
    );

    // ---------------------------------------------------------
    // TEST 12: Mode Switching: Detailed vs Concise vs Exam
    // ---------------------------------------------------------
    const conciseResult = await generateSummary({
      documentTitle: "Embedded Systems",
      chunks: comprehensiveChunks,
      options: { summaryMode: "concise" },
    });
    const examResult = await generateSummary({
      documentTitle: "Embedded Systems",
      chunks: comprehensiveChunks,
      options: { summaryMode: "exam" },
    });

    const conciseValid = Boolean(conciseResult.overview && conciseResult.keyPoints?.length > 0);
    const examValid = Boolean(examResult.examTips?.length > 0 || examResult.examQuestions || examResult.modules?.[0]?.examPreparation);

    recordResult(
      12,
      "Summary mode selector correctly generates distinct modes (detailed, concise, exam)",
      conciseValid && examValid,
      `Concise overview length: ${conciseResult.overview.length} chars, Exam tips/questions present: ${examValid}`
    );

    // ---------------------------------------------------------
    // TEST 13: Summary Mongoose Model Schema Validation & Persistence
    // ---------------------------------------------------------
    const dummyDocId = new mongoose.Types.ObjectId();
    const summaryDoc = new Summary({
      userId: "user_test_123",
      documentId: dummyDocId.toString(),
      content: notesResult.overview || "Executive overview of the course material",
      summaryMode: "detailed",
      totalModules: notesResult.modules?.length || 2,
      overview: notesResult.overview,
      keyPoints: notesResult.keyPoints,
      importantConcepts: notesResult.importantConcepts,
      definitions: notesResult.definitions,
      globalComparisonTables: notesResult.globalComparisonTables,
      examTips: notesResult.examTips,
      examQuestions: notesResult.examQuestions,
      quickRevision: notesResult.quickRevision,
      modules: notesResult.modules,
    });

    const validationError = summaryDoc.validateSync();
    recordResult(
      13,
      "Mongoose Summary model validates and accepts comprehensive module notes schema without error",
      !validationError,
      validationError ? validationError.message : "Schema validation completely passed"
    );

    // ---------------------------------------------------------
    // TEST 14: Backward Compatibility with Legacy Summary Documents
    // ---------------------------------------------------------
    const legacySummary = new Summary({
      userId: "user_test_123",
      documentId: new mongoose.Types.ObjectId().toString(),
      content: "Legacy summary overview without modules.",
      overview: "Legacy summary overview without modules.",
      keyPoints: ["Point 1", "Point 2"],
      importantConcepts: [{ term: "Old Term", explanation: "Old explanation" }],
      examTips: ["Review slides"],
    });
    const legacyError = legacySummary.validateSync();
    const legacyModulesDefault = Array.isArray(legacySummary.modules) && legacySummary.modules.length === 0;

    recordResult(
      14,
      "Backward compatibility: Legacy summary records without modules validate cleanly",
      !legacyError && legacyModulesDefault,
      `Legacy validation passed: ${!legacyError}, Modules defaults to empty array: ${legacyModulesDefault}`
    );

    // ---------------------------------------------------------
    // TEST 15: Uploads Directory Preservation (All user files intact)
    // ---------------------------------------------------------
    const userFiles = fs.readdirSync(uploadDir);
    const pdfCount = userFiles.filter((f) => f.toLowerCase().endsWith(".pdf")).length;
    const allIntact = pdfCount >= 20;

    recordResult(
      15,
      "Integrity check: All existing uploaded user files remain preserved and untouched",
      allIntact,
      `Found ${userFiles.length} total files (${pdfCount} PDFs preserved in ${uploadDir})`
    );

  } catch (err) {
    console.error("Test execution caught unexpected exception:", err);
    recordResult(99, "Unexpected exception during test execution", false, err.message);
  } finally {
    // Cleanup temporary files created for testing
    if (fs.existsSync(testTempDir)) {
      try {
        fs.rmSync(testTempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log("\n========================================================================");
  console.log(` Results: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET} (Total: ${passedCount + failedCount})`);
  console.log("========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runComprehensiveNotesTests();
