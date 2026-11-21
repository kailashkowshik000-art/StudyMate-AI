import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  detectDocumentDomain,
  buildComprehensiveModule,
  generateMermaidDiagram,
  extractOrSynthesizeFormulas,
  extractOrSynthesizeNumericalProblems,
  extractOrSynthesizeAlgorithms,
} from "./learningNotesService.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const SYSTEM_STUDY_TUTOR_PROMPT = `You are StudyMate AI, an expert academic study assistant and encouraging tutor.
Your mission is to help students learn effectively from their course materials and uploaded textbooks/notes.

CRITICAL INSTRUCTIONS:
1. Ground your answer in the provided DOCUMENT CONTEXT.
2. Prefer information directly stated in the context over outside general knowledge.
3. If the answer cannot be found in or deduced from the provided context, explicitly state:
   "Based on the provided document material, I could not find information about [topic]. Please upload relevant notes or check another document section."
   Do NOT fabricate facts or imagine course concepts not in the text.
4. Explain complex concepts in student-friendly, clear, and engaging language.
5. Provide relevant examples or analogies where helpful.
6. Preserve important technical terminology, formulas, and definitions.
7. Format answers using clean markdown (bold terms, bullet points, headers) for readability.`;

/**
 * Format context chunks into a clean prompt block
 */
function buildContextString(contextChunks) {
  if (!contextChunks || contextChunks.length === 0) {
    return "NO DOCUMENT CONTEXT AVAILABLE.";
  }

  return contextChunks
    .map((chunk, idx) => {
      const fileName = chunk.fileName || "Document";
      const meta = chunk.metadata || {};
      let location = `Page ${meta.pageNumber || 1}`;
      if (meta.slideNumber) {
        location = `Slide ${meta.slideNumber}`;
      } else if (meta.heading) {
        location = `Section "${meta.heading}"`;
      } else if (meta.section) {
        location = `${meta.section}`;
      }
      const source = `[Source ${idx + 1}: ${fileName}, ${location}, Section ${chunk.chunkIndex}]`;
      return `${source}\n${chunk.text}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Clean and parse JSON from Gemini response (handles code blocks and raw JSON)
 */
function safeParseJson(text) {
  if (!text) return null;
  // Remove markdown code fences if present: ```json ... ```
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to extract the first {...} or [...] block
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Generate grounded answer to a student question using retrieved context chunks
 *
 * @param {Object} params
 * @param {string} params.question - Student question
 * @param {Array<Object>} params.contextChunks - Chunks retrieved from vector search
 * @param {Array<Object>} [params.chatHistory] - Recent chat history
 * @returns {Promise<{ answer: string, sources: Array<Object> }>}
 */
export async function generateAnswer({
  question,
  contextChunks = [],
  chatHistory = [],
  userProfile = null,
}) {
  console.log(`[GEMINI] Generating answer for question: "${question.slice(0, 50)}..."`);

  const sources = contextChunks.map((c) => ({
    documentId: c.documentId,
    fileName: c.fileName || "Document",
    chunkIndex: c.chunkIndex,
    pageNumber: c.metadata?.pageNumber || 1,
    slideNumber: c.metadata?.slideNumber || null,
    heading: c.metadata?.heading || null,
    section: c.metadata?.section || null,
    format: c.metadata?.format || null,
    snippet: c.text.slice(0, 160) + (c.text.length > 160 ? "..." : ""),
  }));

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    console.log(
      "[GEMINI] Warning: GEMINI_API_KEY not configured. Generating answer via grounded local fallback."
    );
    return {
      answer: generateFallbackAnswer(question, contextChunks, userProfile),
      sources,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_STUDY_TUTOR_PROMPT,
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 1024,
      },
    });

    const contextText = buildContextString(contextChunks);

    let prompt = `DOCUMENT CONTEXT:\n${contextText}\n\n`;

    // Check if question touches student's identified weak areas
    const isWeakTopic = userProfile?.weakTopics?.some(
      (wt) =>
        typeof wt.topic === "string" &&
        question.toLowerCase().includes(wt.topic.toLowerCase())
    );

    if (isWeakTopic) {
      prompt += `TUTOR GUIDANCE NOTE: The student previously struggled with this topic in quizzes. Provide an exceptionally clear, patient, step-by-step breakdown with an illustrative example.\n\n`;
    }

    if (chatHistory && chatHistory.length > 0) {
      prompt += "RECENT CHAT HISTORY:\n";
      chatHistory.slice(-4).forEach((msg) => {
        prompt += `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}\n`;
      });
      prompt += "\n";
    }
    prompt += `STUDENT QUESTION:\n${question}\n\nTUTOR ANSWER:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    console.log(`[GEMINI] Response received (${answer.length} characters)`);
    return {
      answer,
      sources,
    };
  } catch (err) {
    console.warn(
      `[GEMINI] API request error (${err.message}). Using grounded fallback.`
    );
    return {
      answer: generateFallbackAnswer(question, contextChunks),
      sources,
    };
  }
}

/**
 * Extracts standard markdown comparison tables from chunk text
 */
export function extractTablesFromText(text) {
  if (!text) return [];
  const tableRegex = /(?:^|\n)(\|[^\n]+\|\r?\n\|[-:\s|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g;
  const tables = [];
  let match;
  while ((match = tableRegex.exec(text)) !== null) {
    const rawTable = match[1].trim();
    const firstLine = rawTable.split("\n")[0];
    const headerCells = firstLine.split("|").map((s) => s.trim()).filter(Boolean);
    const title = headerCells.length >= 2 ? `${headerCells.join(" vs ")} Comparison` : "Technical Comparison Table";
    tables.push({ title, markdown: rawTable });
  }
  return tables;
}

/**
 * Groups all document chunks into structured modules/units preserving 100% of document content
 */
export function groupChunksIntoModules(chunks, documentTitle = "Course Material") {
  if (!chunks || chunks.length === 0) return [];

  const moduleRegex = /(?:module|unit|chapter)[\s_-]*([0-9ivx]+)[:\s\.-]*(.*?)(?:\n|$)/i;
  const groups = [];
  let currentGroup = null;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const text = chunk.text || "";
    const meta = chunk.metadata || {};

    let detectedTitle = null;
    let detectedNumber = null;

    const textMatch = text.match(moduleRegex);
    if (textMatch && text.indexOf(textMatch[0]) < 100) {
      detectedNumber = parseInt(textMatch[1], 10) || groups.length + 1;
      detectedTitle = textMatch[0].trim();
    } else if (meta.moduleTitle && moduleRegex.test(meta.moduleTitle)) {
      const match = meta.moduleTitle.match(moduleRegex);
      detectedNumber = parseInt(match[1], 10) || groups.length + 1;
      detectedTitle = meta.moduleTitle.trim();
    } else if (meta.heading && moduleRegex.test(meta.heading)) {
      const match = meta.heading.match(moduleRegex);
      detectedNumber = parseInt(match[1], 10) || groups.length + 1;
      detectedTitle = meta.heading.trim();
    } else if (textMatch) {
      detectedNumber = parseInt(textMatch[1], 10) || groups.length + 1;
      detectedTitle = textMatch[0].trim();
    }

    if (detectedTitle && (!currentGroup || currentGroup.title.toLowerCase() !== detectedTitle.toLowerCase())) {
      currentGroup = {
        moduleNumber: detectedNumber || groups.length + 1,
        title: detectedTitle,
        chunks: [],
      };
      groups.push(currentGroup);
    }

    if (!currentGroup) {
      currentGroup = {
        moduleNumber: 1,
        title: meta.heading || meta.title || "Module 1: Foundations & Core Concepts",
        chunks: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.chunks.push(chunk);
  }

  // If only 1 group was created, but there are multiple headings or many chunks
  if (groups.length === 1 && chunks.length > 15) {
    const numSubmodules = Math.min(4, Math.ceil(chunks.length / 12));
    const subGroups = [];
    const chunkSize = Math.ceil(chunks.length / numSubmodules);

    for (let s = 0; s < numSubmodules; s++) {
      const slice = chunks.slice(s * chunkSize, (s + 1) * chunkSize);
      if (slice.length > 0) {
        const firstHeading = slice.find((c) => c.metadata?.heading)?.metadata?.heading || "";
        const title = firstHeading
          ? `Module ${s + 1}: ${firstHeading}`
          : `Module ${s + 1}: ${
              s === 0
                ? "Foundations & Architectural Overview"
                : s === 1
                ? "Core Principles & Operational Mechanics"
                : s === 2
                ? "System Protocols & Implementation Frameworks"
                : "Advanced Applications & Performance Optimization"
            }`;
        subGroups.push({
          moduleNumber: s + 1,
          title,
          chunks: slice,
        });
      }
    }
    return subGroups;
  }

  groups.forEach((g, idx) => {
    if (!g.moduleNumber || isNaN(g.moduleNumber)) g.moduleNumber = idx + 1;
  });

  return groups;
}

/**
 * Generate comprehensive, module-wise engineering study notes across all document chunks
 *
 * @param {Object|string} firstArg - Document title or options object
 * @param {Array<Object>} [secondArg] - Document chunks (if firstArg is string)
 * @returns {Promise<Object>}
 */
export async function generateSummary(firstArg, secondArg) {
  let documentTitle = "Document";
  let chunks = [];
  let options = {};

  if (firstArg && typeof firstArg === "object" && !Array.isArray(firstArg)) {
    documentTitle = firstArg.documentTitle || "Document";
    chunks = firstArg.chunks || [];
    options = firstArg.options || {};
  } else if (typeof firstArg === "string") {
    documentTitle = firstArg;
    chunks = Array.isArray(secondArg) ? secondArg : [];
  }

  const mode = options.summaryMode || options.mode || "detailed";

  console.log(
    `[GEMINI] Generating comprehensive study notes for "${documentTitle}" with ${chunks.length} chunks (mode: ${mode})`
  );

  const moduleGroups = groupChunksIntoModules(chunks, documentTitle);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    console.log("[GEMINI] Using local grounded notes generator across all modules");
    return generateFallbackSummary(documentTitle, chunks, mode);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    // Check size: If document has <= 30 chunks, generate in a single unified prompt.
    // If > 30 chunks, process module batches hierarchically to avoid output token truncation.
    if (chunks.length <= 30) {
      const contextText = moduleGroups
        .map((mod) => {
          const modText = mod.chunks
            .map((c) => `[Source ${c.metadata?.heading || "Section"}: Page ${c.metadata?.pageNumber || 1}, Chunk ${c.chunkIndex}]\n${c.text}`)
            .join("\n\n");
          return `### ${mod.title}\n${modText}`;
        })
        .join("\n\n========================================\n\n");

      const prompt = `You are a distinguished university engineering professor and technical curriculum author.
Transform the following course document "${documentTitle}" into comprehensive, highly detailed module-wise engineering study notes.

REQUIREMENTS:
1. Cover ALL modules and ALL topics present in the document. Do NOT summarize into superficial 1-sentence points.
2. For every major topic:
   - Provide an in-depth explanation with working principles and mechanisms.
   - Include hardware/software architecture, registers, layers or block diagrams where applicable.
   - Detail characteristics, practical applications, advantages and disadvantages, and concrete examples.
3. Preserve all comparison tables as valid markdown tables (e.g., Microprocessor vs Microcontroller). Never output malformed pipe characters.
4. Extract all important technical definitions.
5. Create comprehensive exam questions:
   - 2-mark short questions (definitions, basic properties).
   - 5-mark conceptual/architectural questions.
   - 10-mark essay/system workflow questions.
6. Provide quick revision notes: key takeaways, formulas, technical terms, and last-minute points.
7. Return valid JSON matching this schema:
{
  "overview": "Comprehensive 3-4 paragraph document executive overview...",
  "keyPoints": ["Comprehensive takeaway 1", "Comprehensive takeaway 2", "Comprehensive takeaway 3", "Comprehensive takeaway 4", "Comprehensive takeaway 5", "Comprehensive takeaway 6"],
  "importantConcepts": [
    { "term": "Concept Name", "explanation": "Deep theoretical and operational explanation..." }
  ],
  "definitions": [
    { "term": "Term", "definition": "Precise definition" }
  ],
  "examTips": ["Exam tip 1", "Exam tip 2", "Exam tip 3"],
  "modules": [
    {
      "moduleNumber": 1,
      "title": "Module Title",
      "overview": "Detailed module overview...",
      "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
      "importantTopicsCovered": ["Topic 1", "Topic 2"],
      "topics": [
        {
          "heading": "Topic Heading",
          "definition": "Clear technical definition",
          "explanation": "Thorough, exhaustive explanation of theory and concepts",
          "workingPrinciples": "Step-by-step operational principles and mechanics",
          "architecture": "Architecture, system components, registers, buses, or block diagram details if applicable",
          "characteristics": ["Characteristic 1", "Characteristic 2"],
          "applications": ["Application 1", "Application 2"],
          "advantages": ["Advantage 1", "Advantage 2"],
          "disadvantages": ["Disadvantage 1", "Disadvantage 2"],
          "examples": ["Concrete technical example with values or implementations"],
          "tables": ["| Parameter | A | B |\\n|---|---|---|\\n| ... | ... | ... |"]
        }
      ],
      "comparisonTables": [
        {
          "title": "Table Title",
          "markdown": "| Parameter | Concept A | Concept B |\\n|---|---|---|\\n| ... | ... | ... |"
        }
      ],
      "importantDefinitions": [
        { "term": "Technical Term", "definition": "Definition" }
      ],
      "diagramsAndProcesses": [
        {
          "title": "Architecture or Process Title",
          "description": "Explanation of the diagram and how it operates",
          "components": ["Component 1", "Component 2"],
          "workflow": ["Step 1", "Step 2", "Step 3"]
        }
      ],
      "examPreparation": {
        "twoMarkQuestions": ["Question 1", "Question 2", "Question 3"],
        "fiveMarkQuestions": ["Question 1", "Question 2"],
        "tenMarkQuestions": ["Question 1", "Question 2"],
        "shortAnswerQuestions": [{ "question": "Q...", "answer": "A..." }],
        "longAnswerQuestions": [{ "question": "Q...", "answer": "A..." }],
        "importantDifferences": ["Difference 1", "Difference 2"]
      },
      "quickRevisionNotes": {
        "keyTakeaways": ["Point 1", "Point 2"],
        "formulas": ["Formula 1 if applicable"],
        "technicalTerms": ["Term 1", "Term 2"],
        "lastMinutePoints": ["Memory trigger 1", "Memory trigger 2"]
      },
      "sourceReferences": ["Page/Slide references"]
    }
  ],
  "globalComparisonTables": [
    { "title": "Table Title", "markdown": "| ... | ... |" }
  ],
  "examQuestions": {
    "twoMarkQuestions": ["Question 1", "Question 2", "Question 3"],
    "fiveMarkQuestions": ["Question 1", "Question 2"],
    "tenMarkQuestions": ["Question 1", "Question 2"]
  },
  "quickRevision": {
    "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
    "formulas": ["Formula 1"],
    "technicalTerms": ["Term 1", "Term 2"],
    "lastMinutePoints": ["Point 1", "Point 2"]
  }
}

DOCUMENT CONTENT:
${contextText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const json = safeParseJson(response.text());

      if (json && json.overview && Array.isArray(json.modules) && json.modules.length > 0) {
        console.log(`[GEMINI] Successfully generated comprehensive notes with ${json.modules.length} modules`);
        return json;
      }
      throw new Error("Invalid or incomplete notes JSON schema returned by Gemini");
    } else {
      // HIERARCHICAL MAP-REDUCE for large documents: Process each module group independently
      console.log(`[GEMINI] Processing ${moduleGroups.length} modules hierarchically for large document`);
      const generatedModules = [];

      for (const mod of moduleGroups) {
        const modContext = mod.chunks
          .map((c) => `[Source ${c.metadata?.heading || "Section"}: Page ${c.metadata?.pageNumber || 1}, Chunk ${c.chunkIndex}]\n${c.text}`)
          .join("\n\n");

        const modPrompt = `You are an expert engineering professor. Generate exhaustive, detailed study notes for "${mod.title}" from "${documentTitle}".
Return valid JSON matching this module schema:
{
  "moduleNumber": ${mod.moduleNumber},
  "title": "${mod.title.replace(/"/g, '\\"')}",
  "overview": "In-depth multi-paragraph overview of this module...",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "importantTopicsCovered": ["Topic 1", "Topic 2", "Topic 3"],
  "topics": [
    {
      "heading": "Topic Name",
      "definition": "Definition",
      "explanation": "Detailed theoretical and conceptual explanation",
      "workingPrinciples": "Step-by-step working principles",
      "architecture": "Architecture, system components, registers, buses or block diagram if applicable",
      "characteristics": ["Characteristic 1", "Characteristic 2"],
      "applications": ["Application 1", "Application 2"],
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Disadvantage 1", "Disadvantage 2"],
      "examples": ["Concrete technical example"],
      "tables": ["| Parameter | A | B |\\n|---|---|---|\\n| ... | ... | ... |"]
    }
  ],
  "comparisonTables": [{ "title": "Comparison", "markdown": "| ... | ... |" }],
  "importantDefinitions": [{ "term": "Term", "definition": "Definition" }],
  "diagramsAndProcesses": [{ "title": "Diagram/Process", "description": "Description", "components": ["C1"], "workflow": ["W1"] }],
  "examPreparation": {
    "twoMarkQuestions": ["Q1", "Q2"],
    "fiveMarkQuestions": ["Q1", "Q2"],
    "tenMarkQuestions": ["Q1", "Q2"],
    "shortAnswerQuestions": [{ "question": "Q", "answer": "A" }],
    "longAnswerQuestions": [{ "question": "Q", "answer": "A" }],
    "importantDifferences": ["Difference 1"]
  },
  "quickRevisionNotes": {
    "keyTakeaways": ["Point 1", "Point 2"],
    "formulas": ["Formula if applicable"],
    "technicalTerms": ["Term 1", "Term 2"],
    "lastMinutePoints": ["Point 1", "Point 2"]
  },
  "sourceReferences": ["Module Chunks References"]
}

MODULE CONTENT:
${modContext}`;

        try {
          const modResult = await model.generateContent(modPrompt);
          const modJson = safeParseJson((await modResult.response).text());
          if (modJson && modJson.title && Array.isArray(modJson.topics)) {
            generatedModules.push(modJson);
          } else {
            generatedModules.push(buildFallbackModule(mod.title, mod.moduleNumber, mod.chunks));
          }
        } catch (modErr) {
          console.warn(`[GEMINI] Module "${mod.title}" generation error: ${modErr.message}. Using fallback.`);
          generatedModules.push(buildFallbackModule(mod.title, mod.moduleNumber, mod.chunks));
        }
      }

      // Aggregate top-level overview and synthesized summary
      const aggregated = synthesizeAggregatedSummary(documentTitle, generatedModules, chunks);
      return aggregated;
    }
  } catch (err) {
    console.warn(
      `[GEMINI] Comprehensive notes generation error (${err.message}). Using local grounded notes generator.`
    );
    return generateFallbackSummary(documentTitle, chunks, mode);
  }
}

/**
 * Generate adaptive multiple-choice quiz questions
 *
 * @param {Object} params
 * @param {string} params.documentTitle - Document title
 * @param {Array<Object>} params.chunks - Chunks of document
 * @param {Object} [params.options] - Quiz generation options
 * @param {string} [params.options.difficulty="medium"] - 'easy' | 'medium' | 'hard'
 * @param {number} [params.options.numQuestions=5] - Number of questions
 * @returns {Promise<Array<{ question: string, options: string[], correctAnswer: number, explanation: string }>>}
 */
export async function generateQuiz({
  documentTitle = "Document",
  chunks = [],
  options = {},
}) {
  const difficulty = options.difficulty || "medium";
  const numQuestions = Math.min(Math.max(parseInt(options.numQuestions, 10) || 5, 1), 15);

  console.log(
    `[GEMINI] Generating ${numQuestions} ${difficulty} quiz questions for "${documentTitle}"`
  );

  const selectedChunks = chunks.slice(0, 20);
  const contextText = selectedChunks.map((c) => c.text).join("\n\n");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    console.log("[GEMINI] Using local fallback quiz generator");
    return generateFallbackQuiz(documentTitle, selectedChunks, difficulty, numQuestions);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are a university professor creating a high-quality ${difficulty}-level multiple choice quiz based strictly on the provided study material from "${documentTitle}".

Generate exactly ${numQuestions} multiple-choice questions testing comprehension, application, and key terms.
Each question MUST have exactly 4 options.
The "correctAnswer" MUST be an integer between 0 and 3 indicating the zero-based index of the correct option in the "options" array.
Include a detailed "explanation" for why that option is correct.

Return your response as a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Clear explanation referencing the material."
    }
  ]
}

DOCUMENT CONTENT:
${contextText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const json = safeParseJson(response.text());

    if (json && Array.isArray(json.questions) && json.questions.length > 0) {
      // Validate schema of each question
      const validQuestions = json.questions
        .filter(
          (q) =>
            typeof q.question === "string" &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correctAnswer === "number" &&
            q.correctAnswer >= 0 &&
            q.correctAnswer <= 3 &&
            typeof q.explanation === "string"
        )
        .slice(0, numQuestions);

      if (validQuestions.length > 0) {
        console.log(
          `[GEMINI] Successfully generated ${validQuestions.length} valid quiz questions`
        );
        return validQuestions;
      }
    }
    throw new Error("Gemini quiz output failed schema validation");
  } catch (err) {
    console.warn(
      `[GEMINI] Quiz generation error (${err.message}). Using fallback quiz.`
    );
    return generateFallbackQuiz(documentTitle, selectedChunks, difficulty, numQuestions);
  }
}

/**
 * ============================================================================
 * GROUNDED LOCAL DEVELOPMENT FALLBACK GENERATORS
 * ============================================================================
 * Used seamlessly in offline development or test runs when GEMINI_API_KEY is not set.
 */

function generateFallbackAnswer(question, contextChunks, userProfile = null) {
  if (!contextChunks || contextChunks.length === 0) {
    return (
      "Based on the provided document material, I could not find information to answer this question. " +
      "Please upload relevant course documents or check that the document has finished processing."
    );
  }

  // Synthesize answer directly from the top matching chunks
  const topChunk = contextChunks[0];
  const secondChunk = contextChunks[1];

  const isWeak = userProfile?.weakTopics?.some(
    (wt) =>
      typeof wt.topic === "string" &&
      question.toLowerCase().includes(wt.topic.toLowerCase())
  );

  let answer = "";
  if (isWeak) {
    answer += `> *💡 Tutor Note: Since you've marked this as a focus area, here is a clear step-by-step breakdown with core takeaways:*\n\n`;
  }

  answer += `### Overview\nBased on **${topChunk.fileName || "your document"}**, here is what the course material explains regarding your query:\n\n`;

  // Extract key sentences
  const sentences = topChunk.text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length > 0) {
    answer += `> "${sentences.slice(0, 3).join(" ")}"\n\n`;
  }

  answer += `### Key Concepts & Details\n`;
  sentences.slice(0, 4).forEach((s) => {
    answer += `- **Key Point:** ${s}\n`;
  });

  if (secondChunk) {
    const secondSentences = secondChunk.text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    if (secondSentences.length > 0) {
      const loc = secondChunk.metadata?.slideNumber
        ? `Slide ${secondChunk.metadata.slideNumber}`
        : secondChunk.metadata?.heading
        ? `Section "${secondChunk.metadata.heading}"`
        : `Page ${secondChunk.metadata?.pageNumber || 1}`;
      answer += `\n### Additional Context (${loc})\n`;
      answer += `- ${secondSentences[0]}\n`;
    }
  }

  answer += `\n*💡 Tip: Refer to the cited sources below to review the full textbook sections.*`;
  return answer;
}

/**
 * Synthesizes a master study guide from individual module notes
 */
export function synthesizeAggregatedSummary(documentTitle, modules = [], chunks = [], domain = null) {
  const cleanTitle = (documentTitle || "Course Study Material").replace(/\.[a-zA-Z0-9]+$/i, "");
  const detectedDomain = domain || detectDocumentDomain(cleanTitle, cleanTitle, chunks);
  
  const allKeyPoints = [];
  const allDefinitions = [];
  const allTables = [];
  const allTwoMark = [];
  const allFiveMark = [];
  const allTenMark = [];
  const allDifferences = [];
  const allTakeaways = [];
  const allFormulas = [];
  const allTerms = [];
  const allLastMinute = [];
  const allConcepts = [];
  const allGlobalFormulas = [];
  const allGlobalNumericals = [];
  const allGlobalAlgorithms = [];

  modules.forEach((mod) => {
    if (mod.learningObjectives) allKeyPoints.push(...mod.learningObjectives);
    if (mod.quickRevisionNotes?.keyTakeaways) allTakeaways.push(...mod.quickRevisionNotes.keyTakeaways);
    if (mod.quickRevisionNotes?.formulas) allFormulas.push(...mod.quickRevisionNotes.formulas);
    if (mod.quickRevisionNotes?.technicalTerms) allTerms.push(...mod.quickRevisionNotes.technicalTerms);
    if (mod.quickRevisionNotes?.lastMinutePoints) allLastMinute.push(...mod.quickRevisionNotes.lastMinutePoints);

    if (mod.importantDefinitions) allDefinitions.push(...mod.importantDefinitions);
    if (mod.comparisonTables) allTables.push(...mod.comparisonTables);

    if (mod.formulasAndEquations) allGlobalFormulas.push(...mod.formulasAndEquations);
    if (mod.numericalProblems) allGlobalNumericals.push(...mod.numericalProblems);
    if (mod.algorithmsAndCode) allGlobalAlgorithms.push(...mod.algorithmsAndCode);

    if (mod.examPreparation?.twoMarkQuestions) allTwoMark.push(...mod.examPreparation.twoMarkQuestions);
    if (mod.examPreparation?.fiveMarkQuestions) allFiveMark.push(...mod.examPreparation.fiveMarkQuestions);
    if (mod.examPreparation?.tenMarkQuestions) allTenMark.push(...mod.examPreparation.tenMarkQuestions);
    if (mod.examPreparation?.importantDifferences) allDifferences.push(...mod.examPreparation.importantDifferences);

    if (mod.topics) {
      mod.topics.forEach((top) => {
        if (top.heading && top.definition) {
          allConcepts.push({
            term: top.heading,
            explanation: top.definition + (top.workingPrinciples ? ` ${top.workingPrinciples}` : ""),
          });
        }
      });
    }
  });

  const overview =
    modules.length > 0 && modules[0].overview
      ? `This comprehensive study guide covers ${cleanTitle} across ${modules.length} syllabus modules in ${detectedDomain}. It integrates in-depth theoretical foundations, architectural working principles, structured diagrams, mathematical derivations, step-by-step calculations, comparison tables, exam-oriented questions, and high-yield revision capsules.\n\n${modules.map((m) => `• ${m.title}: ${m.overview.slice(0, 180)}...`).join("\n")}`
      : `Comprehensive engineering study notes for ${cleanTitle} covering core principles, architecture, comparisons, formulas, calculations, and exam preparation across ${modules.length} modules.`;

  return {
    title: `${cleanTitle} — Comprehensive Engineering Notes`,
    overview,
    content: overview,
    summaryMode: "detailed",
    domain: detectedDomain,
    documentType: "Academic Course Material",
    coverageAssessment: `100% syllabus chunks (${chunks.length} chunks) analyzed and synthesized across all ${modules.length} modules`,
    keyPoints: allKeyPoints.slice(0, 12).length >= 5 ? allKeyPoints.slice(0, 12) : allTakeaways.slice(0, 8),
    importantConcepts: allConcepts.slice(0, 10),
    definitions: allDefinitions.slice(0, 15),
    examTips: [
      "Review the comparison tables carefully; focus on architectural trade-offs.",
      "Practice drawing block diagrams and labeling all hardware/software components.",
      "Ensure precise definitions for 2-mark questions and detailed step-by-step working principles for 10-mark questions.",
      "Review the quick revision capsule before entering the examination hall."
    ],
    modules: modules.map((m) => ({
      ...m,
      formulas: m.formulas || m.formulasAndEquations || [],
      formulasAndEquations: m.formulasAndEquations || m.formulas || [],
      numericalProblems: m.numericalProblems || [],
      algorithms: m.algorithms || m.algorithmsAndCode || [],
      algorithmsAndCode: m.algorithmsAndCode || m.algorithms || [],
    })),
    globalComparisonTables: allTables,
    globalFormulas: allGlobalFormulas,
    globalNumericalProblems: allGlobalNumericals,
    globalAlgorithms: allGlobalAlgorithms,
    examQuestions: {
      twoMarkQuestions: allTwoMark.slice(0, 10),
      fiveMarkQuestions: allFiveMark.slice(0, 8),
      tenMarkQuestions: allTenMark.slice(0, 6),
      importantDifferences: allDifferences.slice(0, 6),
    },
    quickRevision: {
      keyTakeaways: allTakeaways.slice(0, 10),
      formulas: allFormulas.slice(0, 6),
      technicalTerms: allTerms.slice(0, 15),
      lastMinutePoints: allLastMinute.slice(0, 10),
    },
    totalModules: modules.length,
    wordCount: chunks.reduce((acc, c) => acc + (c.text ? c.text.split(/\s+/).filter(Boolean).length : 0), 0),
  };
}

/**
 * Builds a realistic, highly detailed fallback module when Gemini API is offline or in test environments
 */
export function buildFallbackModule(moduleTitle, moduleNumber, chunks = [], domain = null) {
  const detectedDomain = domain || detectDocumentDomain(moduleTitle, moduleTitle, chunks);
  return buildComprehensiveModule({
    moduleTitle,
    moduleNumber,
    chunks,
    domain: detectedDomain,
  });
}

/**
 * Fallback comprehensive study notes generator (works offline without API key)
 */
function generateFallbackSummary(documentTitle, chunks = [], mode = "detailed") {
  const cleanTitle = (documentTitle || "Course Study Material").replace(/\.[a-zA-Z0-9]+$/i, "");
  const domain = detectDocumentDomain(cleanTitle, cleanTitle, chunks);
  console.log(`[GEMINI] Generating local fallback comprehensive notes for [${domain}] across all ${chunks.length} chunks`);

  const moduleGroups = groupChunksIntoModules(chunks, cleanTitle);
  const modules = moduleGroups.map((g) =>
    buildComprehensiveModule({
      moduleTitle: g.title,
      moduleNumber: g.moduleNumber,
      chunks: g.chunks,
      domain,
      mode,
    })
  );

  return synthesizeAggregatedSummary(cleanTitle, modules, chunks, domain);
}

/**
 * Fallback multiple-choice quiz generator
 */
function generateFallbackQuiz(documentTitle, chunks = [], difficulty = "medium", numQuestions = 5) {
  const cleanTitle = (documentTitle || "Course Study Material").replace(/\.pdf$/i, "");
  const baseQuestions = [
    {
      question: `In the study of ${cleanTitle}, what is the primary fundamental objective?`,
      options: [
        `To understand core concepts, mechanisms, and models of ${cleanTitle}`,
        "To bypass systematic algorithmic verification",
        "To eliminate all computational requirements",
        "To replace theoretical analysis with random guessing",
      ],
      correctAnswer: 0,
      explanation: `The fundamental purpose of studying ${cleanTitle} is to establish structured comprehension of its core principles and models.`,
    },
    {
      question: `Which of the following best describes an optimal architectural approach in ${cleanTitle}?`,
      options: [
        "Unbounded resource usage without limits",
        "Modularity, clear separation of concerns, and efficient resource allocation",
        "Hardcoding constant parameters without validation",
        "Avoiding error handling and edge cases",
      ],
      correctAnswer: 1,
      explanation: "Modularity and separation of concerns provide robust, scalable, and maintainable systems.",
    },
    {
      question: `When analyzing performance trade-offs in ${cleanTitle}, which factor is typically prioritized?`,
      options: [
        "Ignoring asymptotic complexity completely",
        "Minimizing execution time and space complexity while maintaining correctness",
        "Maximizing code length regardless of runtime",
        "Avoiding testing on edge inputs",
      ],
      correctAnswer: 1,
      explanation: "Efficiency requires balancing time and space complexities against algorithmic accuracy.",
    },
    {
      question: `What distinguishes fundamental principles of ${cleanTitle} from superficial implementations?`,
      options: [
        "Core theoretical invariances that generalize across platforms",
        "Specific syntax idiosyncrasies of a single vendor",
        "Temporary workarounds that lack formal proof",
        "Random permutations of input parameters",
      ],
      correctAnswer: 0,
      explanation: "Theoretical invariances remain consistent across different platforms and practical implementations.",
    },
    {
      question: `In practical evaluations of ${cleanTitle}, how is consistency usually guaranteed?`,
      options: [
        "By disabling error detection protocols",
        "Through deterministic transitions, state validation, and test assertions",
        "By relying purely on asynchronous non-blocking assumptions",
        "By ignoring failure cases",
      ],
      correctAnswer: 1,
      explanation: "Deterministic state validation and rigorous testing ensure consistent correctness across inputs.",
    },
    {
      question: `Which methodology is standard when verifying complex subproblems in ${cleanTitle}?`,
      options: [
        "Decomposing the problem into independent, verifiable sub-components",
        "Evaluating the entire problem only at runtime without modular units",
        "Assuming all external dependencies are defect-free",
        "Neglecting boundary conditions",
      ],
      correctAnswer: 0,
      explanation: "Modular decomposition allows each sub-component to be formally verified and debugged independently.",
    },
  ];

  return baseQuestions.slice(0, Math.min(numQuestions, baseQuestions.length));
}

/**
 * Generate a personalized study plan using Gemini AI
 *
 * @param {Object} params
 * @param {string[]} params.subjects
 * @param {string|Date} params.examDate
 * @param {number} params.dailyMinutes
 * @param {string[]} [params.priorityTopics]
 * @param {Array<Object>} [params.weakTopics]
 * @returns {Promise<{ title: string, tasks: Array<Object> }>}
 */
export async function generateStudyPlan({
  subjects = ["Computer Science"],
  examDate,
  dailyMinutes = 60,
  priorityTopics = [],
  weakTopics = [],
}) {
  console.log(
    `[GEMINI] Generating study plan for subjects: ${subjects.join(", ")}, dailyMinutes: ${dailyMinutes}`
  );

  const targetDate = examDate ? new Date(examDate) : new Date(Date.now() + 14 * 86400000);
  const now = new Date();
  const diffDays = Math.max(1, Math.min(Math.ceil((targetDate - now) / 86400000), 21));

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const prompt = `You are an academic curriculum study planner.
Generate a structured, day-by-day study plan leading up to the student's exam on ${targetDate.toISOString().split("T")[0]}.

STUDENT PARAMETERS:
- Subjects: ${subjects.join(", ")}
- Days available: ${diffDays} days
- Daily study target: ${dailyMinutes} minutes
- Priority focus topics: ${priorityTopics.join(", ") || "Core syllabus"}
- Weak topics needing revision: ${weakTopics.map((w) => typeof w === "string" ? w : w.topic).join(", ") || "None"}

REQUIREMENTS:
1. Generate between 1 and 3 focused tasks per day.
2. Sum of task estimatedMinutes each day should be roughly ${dailyMinutes} minutes.
3. Front-load priority and weak topics so the student masters them first.
4. Reserve the last 2 days for comprehensive revision and practice testing.

Return JSON in this EXACT structure:
{
  "title": "${subjects[0] || 'Academic'} Exam Prep Study Plan",
  "tasks": [
    {
      "dayOffset": 0,
      "subject": "${subjects[0] || 'Core'}",
      "topic": "Topic Name",
      "activity": "Read notes and complete 5 practice problems",
      "estimatedMinutes": 30
    }
  ]
}`;

      const res = await model.generateContent(prompt);
      const json = safeParseJson(res.response.text());

      if (json && Array.isArray(json.tasks) && json.tasks.length > 0) {
        const formattedTasks = json.tasks.map((t, idx) => {
          const taskDate = new Date();
          taskDate.setDate(taskDate.getDate() + (t.dayOffset ?? Math.floor(idx / 2)));
          return {
            date: taskDate,
            subject: t.subject || subjects[0] || "General",
            topic: t.topic || "Core Review",
            activity: t.activity || "Review notes and practice exercises",
            estimatedMinutes: t.estimatedMinutes || 30,
            completed: false,
          };
        });

        return {
          title: json.title || `${subjects[0] || "Semester"} Study Plan`,
          tasks: formattedTasks,
        };
      }
    } catch (err) {
      console.warn(`[GEMINI] Study plan generation fallback: ${err.message}`);
    }
  }

  // Grounded local fallback plan generator
  return generateFallbackStudyPlan(subjects, diffDays, dailyMinutes, priorityTopics, weakTopics);
}

/**
 * Generate flashcards using Gemini AI from document chunks
 *
 * @param {Object} params
 * @param {string} params.documentTitle
 * @param {Array<Object>} params.chunks
 * @param {string} params.topic
 * @param {number} params.numberOfCards
 * @returns {Promise<Array<{ question: string, answer: string, difficulty: string }>>}
 */
export async function generateFlashcards({
  documentTitle = "Document",
  chunks = [],
  topic = "Core Concepts",
  numberOfCards = 5,
}) {
  console.log(
    `[GEMINI] Generating ${numberOfCards} flashcards for "${documentTitle}" (topic: ${topic})`
  );

  const count = Math.max(3, Math.min(Number(numberOfCards) || 5, 15));
  const selectedChunks = chunks.slice(0, 15);
  const contextText = selectedChunks.map((c) => c.text).join("\n\n");

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() && apiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      });

      const prompt = `You are an expert tutor creating study flashcards for university students.
Extract exactly ${count} high-yield flashcards from the provided document material for "${documentTitle}".

GUIDELINES:
- Focus on key definitions, laws, formulas, condition lists, and core concepts.
- "question" must be concise and test active recall (Front of card).
- "answer" must be clear, accurate, and direct (Back of card).
- "difficulty" must be one of: "easy", "medium", "hard".

Return a valid JSON object matching this schema:
{
  "flashcards": [
    {
      "question": "What is the primary condition for...?",
      "answer": "Concise answer here.",
      "difficulty": "medium"
    }
  ]
}

DOCUMENT CONTENT:
${contextText}`;

      const res = await model.generateContent(prompt);
      const json = safeParseJson(res.response.text());

      if (json && Array.isArray(json.flashcards) && json.flashcards.length > 0) {
        const validated = json.flashcards
          .filter(
            (c) =>
              typeof c.question === "string" &&
              typeof c.answer === "string" &&
              c.question.trim().length > 5 &&
              c.answer.trim().length > 2
          )
          .map((c) => ({
            question: c.question.trim(),
            answer: c.answer.trim(),
            difficulty: ["easy", "medium", "hard"].includes(c.difficulty)
              ? c.difficulty
              : "medium",
          }))
          .slice(0, count);

        if (validated.length > 0) {
          return validated;
        }
      }
    } catch (err) {
      console.warn(`[GEMINI] Flashcard generation fallback: ${err.message}`);
    }
  }

  return generateFallbackFlashcards(documentTitle, selectedChunks, topic, count);
}

function generateFallbackStudyPlan(subjects, days, dailyMinutes, priorityTopics, weakTopics) {
  const tasks = [];
  const focusTopics = [
    ...(weakTopics.map((w) => typeof w === "string" ? w : w.topic)),
    ...priorityTopics,
    "Core Theory & Definitions",
    "Algorithmic Problem Solving",
    "Comprehensive Practice Exam",
  ];

  for (let i = 0; i < days; i++) {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + i);

    const subject = subjects[i % subjects.length] || "Computer Science";
    const topic = focusTopics[i % focusTopics.length];
    const halfMinutes = Math.round(dailyMinutes / 2);

    tasks.push({
      date: taskDate,
      subject,
      topic,
      activity: `Read ${topic} notes and review key chapter definitions`,
      estimatedMinutes: halfMinutes,
      completed: false,
    });

    tasks.push({
      date: taskDate,
      subject,
      topic,
      activity: `Complete 5-question practice quiz on ${topic} and review errors`,
      estimatedMinutes: dailyMinutes - halfMinutes,
      completed: false,
    });
  }

  return {
    title: `${subjects[0] || "University"} Structured Study Plan`,
    tasks,
  };
}

function generateFallbackFlashcards(documentTitle, chunks, topic, count) {
  const allText = chunks.map((c) => c.text).join(" ");
  const sentences = allText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const cards = [];
  for (let i = 0; i < count; i++) {
    const s = sentences[i % sentences.length] || `Core principle of ${documentTitle}.`;
    const words = s.split(" ");
    const head = words.slice(0, 5).join(" ");

    cards.push({
      question: `In ${documentTitle}, what is the significance of: "${head}..."?`,
      answer: s,
      difficulty: i % 3 === 0 ? "easy" : i % 3 === 1 ? "medium" : "hard",
    });
  }
  return cards;
}

export default {
  generateAnswer,
  generateSummary,
  generateQuiz,
  generateStudyPlan,
  generateFlashcards,
};
