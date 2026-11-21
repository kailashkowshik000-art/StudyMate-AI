import mongoose from "mongoose";
import Summary from "../models/Summary.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import { generateSummary as generateAiSummary } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";
import {
  generateQualityAudit,
  applyTargetedImprovement,
} from "../services/learningQualityService.js";

const getDocumentQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ documentId: id }, { _id: id }] }
    : { documentId: id };
};

// @desc    Generate and store AI summary for a document
// @route   POST /api/summaries
// @access  Private
export const generateSummary = async (req, res, next) => {
  try {
    const { documentId, forceRefresh, summaryMode = "detailed" } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "documentId is required",
      });
    }

    const document = await Document.findOne(getDocumentQuery(documentId));

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot summarize another user's document",
      });
    }

    // Check if summary already exists for this document (unless forceRefresh requested)
    if (!forceRefresh) {
      const existingSummary = await Summary.findOne({
        documentId: document.documentId,
        userId: req.user.userId,
      });

      // If existing summary has rich modules or matches requested mode, return it
      if (existingSummary && (existingSummary.modules?.length > 0 || existingSummary.summaryMode === summaryMode)) {
        return res.status(200).json({
          success: true,
          message: "Retrieved existing document summary",
          data: {
            summary: existingSummary,
          },
        });
      }
    }

    // Retrieve ALL document chunks from database
    const chunks = await TextChunk.find({
      documentId: document.documentId,
      userId: req.user.userId,
    })
      .sort({ chunkIndex: 1 })
      .lean();

    if (!chunks || chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "This document has no extracted text chunks yet. Please verify that the document processed successfully.",
      });
    }

    // Generate comprehensive AI Notes using Gemini / Grounded Multi-Module Service
    const aiSummary = await generateAiSummary({
      documentTitle: document.fileName,
      chunks,
      options: { summaryMode },
    });

    const cleanName = (document.fileName || "Document").replace(/\.[a-zA-Z0-9]+$/i, "");
    const title = aiSummary.title || `${cleanName} — Comprehensive Engineering Notes`;

    // Map important concepts format for model schema compatibility
    const formattedConcepts = Array.isArray(aiSummary.importantConcepts)
      ? aiSummary.importantConcepts.map((item) => {
          if (typeof item === "string") {
            const parts = item.split(":");
            return {
              term: parts[0]?.trim() || "Core Concept",
              explanation: parts.slice(1).join(":")?.trim() || item,
            };
          }
          return item;
        })
      : [];

    // Save or update summary in MongoDB
    const summary = await Summary.findOneAndUpdate(
      { documentId: document.documentId, userId: req.user.userId },
      {
        userId: req.user.userId,
        documentId: document.documentId,
        title,
        summaryMode,
        domain: aiSummary.domain || "Computer Science & Engineering",
        documentType: aiSummary.documentType || "Academic Course Material",
        coverageAssessment: aiSummary.coverageAssessment || "100% syllabus chunks analyzed",
        content: aiSummary.overview || aiSummary.content || "Document study notes.",
        keyPoints: aiSummary.keyPoints || [],
        importantConcepts: formattedConcepts,
        examTips: aiSummary.examTips || [],
        modules: aiSummary.modules || [],
        globalComparisonTables: aiSummary.globalComparisonTables || [],
        definitions: aiSummary.definitions || [],
        globalFormulas: aiSummary.globalFormulas || [],
        globalNumericalProblems: aiSummary.globalNumericalProblems || [],
        globalAlgorithms: aiSummary.globalAlgorithms || [],
        examQuestions: aiSummary.examQuestions || {},
        quickRevision: aiSummary.quickRevision || {},
        sourceReferences: aiSummary.sourceReferences || [],
        totalModules: aiSummary.modules?.length || 1,
        wordCount: aiSummary.wordCount || 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Perform Phase 8.6.2 Intelligent Learning Quality Assurance & Academic Verification
    try {
      const qualityAudit = generateQualityAudit(
        summary.toObject ? summary.toObject() : summary,
        chunks
      );
      summary.qualityAudit = qualityAudit;
      await summary.save();
    } catch (qaError) {
      console.warn("Quality audit generation encountered a non-fatal issue:", qaError.message);
    }

    // Record study activity
    await recordActivity({
      userId: req.user.userId,
      documentId: document.documentId,
      activityType: "summary_generated",
      topic: document.subject || document.fileName,
      duration: 15,
    });

    res.status(201).json({
      success: true,
      message: "Comprehensive AI Study Notes generated and saved successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary for a document
// @route   GET /api/summaries/:documentId
// @access  Private
export const getSummary = async (req, res, next) => {
  try {
    const summary = await Summary.findOne({
      documentId: req.params.documentId,
      userId: req.user.userId,
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found for this document",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export comprehensive study notes as Markdown, HTML, or JSON
// @route   GET /api/summaries/:documentId/export
// @access  Private
export const exportSummary = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const query = { documentId: req.params.documentId };
    if (userId) query.userId = userId;

    const summary = await Summary.findOne(query);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found for this document",
      });
    }

    const format = (req.query.format || "markdown").toLowerCase();
    const cleanTitle = (summary.title || "StudyMate_AI_Notes").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${cleanTitle}.json"`);
      return res.status(200).send(JSON.stringify(summary, null, 2));
    }

    // Build rich Markdown document
    let md = `# ${summary.title}\n\n`;
    md += `**Domain:** ${summary.domain || "Technical Studies"} | **Mode:** ${summary.summaryMode || "Comprehensive"} | **Modules:** ${summary.totalModules || 1}\n\n`;
    md += `## Executive Overview\n${summary.content || ""}\n\n`;

    if (summary.keyPoints?.length > 0) {
      md += `### Core Academic Takeaways\n`;
      summary.keyPoints.forEach((kp) => (md += `- ${kp}\n`));
      md += `\n`;
    }

    if (summary.modules?.length > 0) {
      summary.modules.forEach((mod) => {
        md += `\n---\n\n# Module ${mod.moduleNumber}: ${mod.title}\n\n`;
        if (mod.overview) md += `**Module Overview:**\n${mod.overview}\n\n`;

        if (mod.learningObjectives?.length > 0) {
          md += `### Learning Objectives\n`;
          mod.learningObjectives.forEach((obj) => (md += `- ${obj}\n`));
          md += `\n`;
        }

        if (mod.topics?.length > 0) {
          md += `### Comprehensive Topic Theory\n\n`;
          mod.topics.forEach((t) => {
            md += `#### ${t.heading}\n`;
            if (t.definition) md += `**Definition:** ${t.definition}\n\n`;
            if (t.explanation) md += `${t.explanation}\n\n`;
            if (t.workingPrinciples) md += `**Working Principle:** ${t.workingPrinciples}\n\n`;
            if (t.architecture) md += `**Architecture & Components:** ${t.architecture}\n\n`;
            if (t.characteristics?.length > 0) {
              md += `**Characteristics:**\n${t.characteristics.map((c) => `- ${c}`).join("\n")}\n\n`;
            }
            if (t.applications?.length > 0) {
              md += `**Applications:**\n${t.applications.map((a) => `- ${a}`).join("\n")}\n\n`;
            }
            if (t.advantages?.length > 0) {
              md += `**Advantages:**\n${t.advantages.map((a) => `- ${a}`).join("\n")}\n\n`;
            }
            if (t.disadvantages?.length > 0) {
              md += `**Disadvantages:**\n${t.disadvantages.map((d) => `- ${d}`).join("\n")}\n\n`;
            }
            if (t.examples?.length > 0) {
              md += `**Examples:**\n${t.examples.map((e) => `- ${e}`).join("\n")}\n\n`;
            }
          });
        }

        if (mod.diagramsAndProcesses?.length > 0) {
          md += `### Architectural Diagrams & Processes\n\n`;
          mod.diagramsAndProcesses.forEach((d) => {
            md += `#### ${d.title}\n${d.description}\n\n`;
            if (d.mermaidCode) {
              md += `\`\`\`mermaid\n${d.mermaidCode}\n\`\`\`\n\n`;
            }
            if (d.technicalExplanation) {
              md += `*Technical Explanation:* ${d.technicalExplanation}\n\n`;
            }
          });
        }

        const modFormulas = (mod.formulasAndEquations?.length ? mod.formulasAndEquations : mod.formulas) || [];
        if (modFormulas.length > 0) {
          md += `### Mathematical Formulations & Derivations\n\n`;
          modFormulas.forEach((f) => {
            md += `#### ${f.formulaName}\n`;
            md += `$$\n${f.expression}\n$$\n\n`;
            if (f.variables?.length > 0) {
              md += `| Symbol | Meaning | Unit |\n|---|---|---|\n`;
              f.variables.forEach((v) => (md += `| \`${v.symbol}\` | ${v.meaning} | ${v.unit || "-"} |\n`));
              md += `\n`;
            }
            if (f.explanation) md += `${f.explanation}\n\n`;
            if (f.solvedExample?.problem || f.solvedExample?.problemStatement) {
              md += `**Solved Example:** ${f.solvedExample.problem || f.solvedExample.problemStatement}\n`;
              if (f.solvedExample.solutionSteps?.length > 0) {
                f.solvedExample.solutionSteps.forEach((s) => (md += `- ${s}\n`));
              }
              if (f.solvedExample.calculation) md += `*Calculation:* ${f.solvedExample.calculation}\n`;
              md += `**Final Answer:** ${f.solvedExample.finalAnswer || f.solvedExample.result || ""}\n\n`;
            }
          });
        }

        if (mod.numericalProblems?.length > 0) {
          md += `### Step-by-Step Numerical Calculations\n\n`;
          mod.numericalProblems.forEach((p) => {
            md += `#### ${p.title} ${p.isSourceDerived ? "(Source Problem)" : "(Illustrative Problem)"}\n`;
            md += `**Problem Statement:** ${p.problemStatement}\n\n`;
            if (p.givenData?.length > 0) {
              md += `**Given Data:**\n`;
              p.givenData.forEach((g) => (md += `- ${g.variable} = ${g.value} ${g.unit}\n`));
              md += `\n`;
            }
            if (p.requiredQuantity) md += `**Required Quantity:** ${p.requiredQuantity}\n\n`;
            if (p.relevantFormula) md += `**Formula:** $$${p.relevantFormula}$$\n\n`;
            if (p.steps?.length > 0) {
              md += `**Calculation Steps:**\n`;
              p.steps.forEach((s) => {
                md += `Step ${s.stepNumber}: ${s.description}\n\`\`\`\n${s.calculation}\n=> ${s.intermediateResult}\n\`\`\`\n`;
              });
              md += `\n`;
            }
            md += `**Final Answer:** **${p.finalAnswer}**\n\n`;
            if (p.interpretation) md += `*Interpretation:* ${p.interpretation}\n\n`;
          });
        }

        const modAlgorithms = (mod.algorithmsAndCode?.length ? mod.algorithmsAndCode : mod.algorithms) || [];
        if (modAlgorithms.length > 0) {
          md += `### Algorithms & Technical Implementations\n\n`;
          modAlgorithms.forEach((algo) => {
            md += `#### ${algo.title}\n`;
            if (algo.conceptExplanation) md += `${algo.conceptExplanation}\n\n`;
            if (algo.pseudocode) md += `**Pseudocode:**\n\`\`\`${algo.language || ""}\n${algo.pseudocode}\n\`\`\`\n\n`;
            if (algo.codeSnippet) md += `**Code Example:**\n\`\`\`${algo.language || ""}\n${algo.codeSnippet}\n\`\`\`\n\n`;
            if (algo.timeComplexity?.worst) {
              md += `**Time Complexity:** Worst: \`${algo.timeComplexity.worst}\`, Average: \`${algo.timeComplexity.average || "N/A"}\` (${algo.timeComplexity.explanation || ""})\n`;
              md += `**Space Complexity:** \`${algo.spaceComplexity?.complexity || "O(1)"}\` (${algo.spaceComplexity?.explanation || ""})\n\n`;
            }
          });
        }

        if (mod.examPreparation) {
          md += `### Exam Preparation Questions\n\n`;
          const ep = mod.examPreparation;
          if (ep.twoMarkQuestions?.length > 0) {
            md += `**2-Mark Questions (Definitions & Properties):**\n${ep.twoMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
          if (ep.fiveMarkQuestions?.length > 0) {
            md += `**5-Mark Questions (Concepts & Architectures):**\n${ep.fiveMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
          if (ep.tenMarkQuestions?.length > 0) {
            md += `**10-Mark Questions (System Workflows & Derivations):**\n${ep.tenMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
        }
      });
    }

    if (format === "html") {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${summary.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #0f172a; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #4338ca; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; }
    h2, h3, h4 { color: #1e293b; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #4f46e5; margin: 0; padding-left: 16px; color: #475569; }
    @media print { body { max-width: 100%; margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <pre style="white-space: pre-wrap; font-family: inherit;">${md.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
      if (typeof res.setHeader === "function") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${cleanTitle}.html"`);
      }
      if (typeof res.status === "function") {
        return res.status(200).send(html);
      }
      return res.send(html);
    }

    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${cleanTitle}.md"`);
    }
    if (typeof res.status === "function") {
      return res.status(200).send(md);
    }
    return res.send(md);
  } catch (error) {
    if (typeof next === "function") {
      return next(error);
    }
    throw error;
  }
};

// @desc    Get or generate academic quality assurance audit for a document summary
// @route   GET /api/summaries/:documentId/quality
// @access  Private
export const getQualityAudit = async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const query = { documentId: req.params.documentId };
    if (userId) query.userId = userId;

    const summary = await Summary.findOne(query);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found for this document",
      });
    }

    if (summary.qualityAudit && summary.qualityAudit.auditId) {
      return res.status(200).json({
        success: true,
        data: {
          qualityAudit: summary.qualityAudit,
        },
      });
    }

    // Generate quality audit on demand if not yet present
    const chunkQuery = { documentId: summary.documentId };
    if (userId) chunkQuery.userId = userId;

    const chunks = await TextChunk.find(chunkQuery).sort({ chunkIndex: 1 }).lean();

    const qualityAudit = generateQualityAudit(
      summary.toObject ? summary.toObject() : summary,
      chunks || []
    );

    summary.qualityAudit = qualityAudit;
    await summary.save();

    return res.status(200).json({
      success: true,
      message: "Academic quality assurance audit generated successfully",
      data: {
        qualityAudit,
      },
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    throw error;
  }
};

// @desc    Apply targeted learning improvement to summary without wiping notes
// @route   POST /api/summaries/:documentId/improve
// @access  Private
export const improveSummary = async (req, res, next) => {
  try {
    const { improvementId, targetElement, action, type, targetTopic } = req.body || {};
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const query = { documentId: req.params.documentId };
    if (userId) query.userId = userId;

    const summary = await Summary.findOne(query);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Summary not found for this document",
      });
    }

    const chunkQuery = { documentId: summary.documentId };
    if (userId) chunkQuery.userId = userId;

    const chunks = await TextChunk.find(chunkQuery).sort({ chunkIndex: 1 }).lean();

    const payload = improvementId || { type, targetTopic, targetElement, action };
    const updatedSummary = applyTargetedImprovement(
      summary.toObject ? summary.toObject() : summary,
      chunks || [],
      payload
    );

    Object.assign(summary, updatedSummary);
    await summary.save();

    return res.status(200).json({
      success: true,
      message: "Targeted improvement applied successfully without rewriting existing notes",
      data: {
        summary,
        qualityAudit: summary.qualityAudit,
      },
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    throw error;
  }
};

export default {
  generateSummary,
  getSummary,
  exportSummary,
  getQualityAudit,
  improveSummary,
};
