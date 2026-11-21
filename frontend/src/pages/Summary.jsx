import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  FileText,
  Copy,
  Check,
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  RotateCw,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Table,
  Brain,
  ListChecks,
  Activity,
  Layers,
  ArrowRight,
  Calculator,
  Code2,
  Printer,
  FileDown,
  Bookmark,
  Compass,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Toast from "../components/common/Toast";
import MermaidDiagram from "../components/notes/MermaidDiagram";
import FormulaCard from "../components/notes/FormulaCard";
import NumericalProblemCard from "../components/notes/NumericalProblemCard";
import AlgorithmCard from "../components/notes/AlgorithmCard";
import LearningQualityDashboard from "../components/notes/LearningQualityDashboard";
import { summaryService } from "../services/summaryService";
import { documentService } from "../services/documentService";
import useDocumentTitle from "../hooks/useDocumentTitle";

/**
 * Standard Markdown Table Renderer for comparisons (e.g. Microprocessor vs Microcontroller)
 */
function MarkdownTableRenderer({ markdown }) {
  if (!markdown || typeof markdown !== "string") return null;

  const lines = markdown
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && l.endsWith("|"));

  if (lines.length < 2) return null;

  // Filter out markdown separator line (|---|---|)
  const headerLine = lines[0];
  const bodyLines = lines.slice(1).filter((l) => !/^[\|\s-:]+$/.test(l));

  const parseCells = (line) =>
    line
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

  const headers = parseCells(headerLine);
  const rows = bodyLines.map(parseCells);

  if (headers.length === 0) return null;

  return (
    <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200/90 shadow-2xs bg-white print-avoid-break">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="py-3 px-4 font-semibold text-slate-800 tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-2.5 px-4 leading-relaxed font-normal">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Summary() {
  useDocumentTitle("AI Study Notes & Learning Engine", "Generate deep, comprehensive AI notes from your course files.");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialDoc = searchParams.get("doc") || "";

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDoc);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryMode, setSummaryMode] = useState("detailed"); // 'detailed' | 'exam' | 'concise'
  const [activeModuleIndex, setActiveModuleIndex] = useState("all");
  const [expandedTopics, setExpandedTopics] = useState(new Set(["0-0", "0-1", "1-0"]));
  const [revealedAnswers, setRevealedAnswers] = useState(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplyingImprovement, setIsApplyingImprovement] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await documentService.getDocuments();
        setDocuments(docs);
        const validDocs = docs.filter((d) => d.status === "Ready" || d.rawStatus === "ready");

        let activeId = selectedDocId;
        if ((!activeId || !docs.some((d) => (d.id || d.documentId) === activeId)) && docs.length > 0) {
          activeId = validDocs[0]?.id || validDocs[0]?.documentId || docs[0].id || docs[0].documentId;
          setSelectedDocId(activeId);
        }

        if (activeId) {
          const initialSummary = await summaryService.getSummary(activeId);
          if (initialSummary) {
            setSummaryData(initialSummary);
            if (initialSummary.summaryMode) setSummaryMode(initialSummary.summaryMode);
          }
        }
      } catch (err) {
        console.error("Failed to load documents for summary", err);
      }
    };
    loadDocs();
  }, []);

  const handleDocumentChange = async (newDocId) => {
    setSelectedDocId(newDocId);
    setSummaryData(null);
    setActiveModuleIndex("all");
    try {
      const existing = await summaryService.getSummary(newDocId);
      if (existing) {
        setSummaryData(existing);
        if (existing.summaryMode) setSummaryMode(existing.summaryMode);
      }
    } catch {
      // Not yet generated
    }
  };

  const handleGenerateSummary = async (force = true) => {
    if (!selectedDocId) {
      setToastMessage("Please select a document first.");
      return;
    }

    setIsGenerating(true);
    setSummaryData(null);
    try {
      const generated = await summaryService.generateSummary(selectedDocId, force, summaryMode);
      setSummaryData(generated);
      setToastMessage("Comprehensive AI Learning Notes successfully generated!");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to generate comprehensive notes.";
      setToastMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyImprovement = async (improvementId) => {
    if (!selectedDocId) return;
    setIsApplyingImprovement(true);
    try {
      const res = await summaryService.improveSummary(selectedDocId, improvementId);
      if (res?.summary) {
        setSummaryData(res.summary);
      }
      setToastMessage("Targeted learning improvement applied successfully without rewriting notes!");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to apply improvement.";
      setToastMessage(msg);
    } finally {
      setIsApplyingImprovement(false);
    }
  };

  const toggleTopicExpand = (topicKey) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicKey)) next.delete(topicKey);
      else next.add(topicKey);
      return next;
    });
  };

  const toggleAnswerReveal = (answerKey) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(answerKey)) next.delete(answerKey);
      else next.add(answerKey);
      return next;
    });
  };

  const scrollToSection = (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Convert full notes to exhaustive Markdown text for copying and downloading
  const generateMarkdownNotesString = () => {
    if (!summaryData) return "";
    let md = `# ${summaryData.title || "Comprehensive Engineering Study Notes"}\n\n`;

    if (summaryData.domain) {
      md += `**Subject Domain:** ${summaryData.domain}\n`;
    }
    if (summaryData.coverageAssessment) {
      md += `**Coverage Assessment:** ${summaryData.coverageAssessment}\n\n`;
    }

    md += `## Executive Overview\n${summaryData.content || summaryData.overview || ""}\n\n`;

    if (summaryData.keyPoints?.length > 0) {
      md += `### Core Takeaways\n`;
      summaryData.keyPoints.forEach((kp) => {
        md += `- ${kp}\n`;
      });
      md += `\n`;
    }

    if (summaryData.modules?.length > 0) {
      summaryData.modules.forEach((mod, modIdx) => {
        md += `\n---\n\n# MODULE ${mod.moduleNumber || modIdx + 1}: ${mod.title}\n\n`;
        if (mod.overview) md += `**Module Overview:** ${mod.overview}\n\n`;

        if (mod.learningObjectives?.length > 0) {
          md += `### Learning Objectives\n`;
          mod.learningObjectives.forEach((obj) => (md += `- ${obj}\n`));
          md += `\n`;
        }

        // Detailed Topics
        if (mod.topics?.length > 0) {
          md += `### Detailed Topic Notes\n\n`;
          mod.topics.forEach((t) => {
            md += `#### ${t.heading}\n`;
            if (t.definition) md += `**Definition:** ${t.definition}\n\n`;
            if (t.explanation) md += `${t.explanation}\n\n`;
            if (t.workingPrinciples) md += `**Working Principle:** ${t.workingPrinciples}\n\n`;
            if (t.architecture) md += `**Architecture & Components:** ${t.architecture}\n\n`;
            if (t.components?.length > 0) {
              md += `**Key Components:** ${t.components.join(", ")}\n\n`;
            }
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
              md += `**Disadvantages / Trade-offs:**\n${t.disadvantages.map((d) => `- ${d}`).join("\n")}\n\n`;
            }
            if (t.examples?.length > 0) {
              md += `**Examples:**\n${t.examples.map((e) => `- ${e}`).join("\n")}\n\n`;
            }
            if (t.importantObservations?.length > 0) {
              md += `**Important Observations:**\n${t.importantObservations.map((o) => `- ${o}`).join("\n")}\n\n`;
            }
            if (t.tables?.length > 0) {
              t.tables.forEach((tbl) => (md += `${tbl}\n\n`));
            }
          });
        }

        // Comparison Tables
        if (mod.comparisonTables?.length > 0) {
          md += `### Comparison & Synthesis Tables\n\n`;
          mod.comparisonTables.forEach((tbl) => {
            md += `#### ${tbl.title}\n\n${tbl.markdown}\n\n`;
          });
        }

        // Diagrams
        if (mod.diagramsAndProcesses?.length > 0) {
          md += `### Architectural & Process Diagrams\n\n`;
          mod.diagramsAndProcesses.forEach((d) => {
            md += `#### ${d.title}\n${d.description || ""}\n\n`;
            if (d.mermaidCode) {
              md += `\`\`\`mermaid\n${d.mermaidCode}\n\`\`\`\n\n`;
            }
            if (d.components?.length > 0) {
              md += `**Components:** ${d.components.join(", ")}\n\n`;
            }
            if (d.workflow?.length > 0) {
              md += `**Workflow Steps:**\n${d.workflow.map((w, idx) => `${idx + 1}. ${w}`).join("\n")}\n\n`;
            }
            if (d.technicalExplanation) {
              md += `**Technical Explanation:** ${d.technicalExplanation}\n\n`;
            }
          });
        }

        // Formulas
        if (mod.formulas?.length > 0) {
          md += `### Mathematical Formulas & Equations\n\n`;
          mod.formulas.forEach((f) => {
            md += `#### ${f.formulaName}\n`;
            md += `$$\n${f.expression}\n$$\n\n`;
            if (f.explanation) md += `${f.explanation}\n\n`;
            if (f.variables?.length > 0) {
              md += `| Symbol | Meaning | Standard Unit |\n|---|---|---|\n`;
              f.variables.forEach((v) => {
                md += `| \`${v.symbol}\` | ${v.meaning} | ${v.unit || "-"} |\n`;
              });
              md += `\n`;
            }
            if (f.conditionsAndAssumptions?.length > 0) {
              md += `**Conditions & Assumptions:**\n${f.conditionsAndAssumptions.map((c) => `- ${c}`).join("\n")}\n\n`;
            }
            if (f.solvedExample?.problemStatement) {
              md += `**Solved Example:**\n${f.solvedExample.problemStatement}\n\n`;
              md += `*Substitution:* ${f.solvedExample.calculation || ""}\n\n`;
              md += `**Result:** ${f.solvedExample.result} ${f.solvedExample.units || ""}\n\n`;
            }
          });
        }

        // Numerical Problems
        if (mod.numericalProblems?.length > 0) {
          md += `### Solved Numerical Problems\n\n`;
          mod.numericalProblems.forEach((num, nIdx) => {
            md += `#### Problem ${nIdx + 1}: ${num.title}\n`;
            md += `**Problem Statement:** ${num.problemStatement}\n\n`;
            if (num.givenData?.length > 0) {
              md += `**Given Data:**\n`;
              num.givenData.forEach((g) => {
                md += `- ${g.variable} = ${g.value} ${g.unit || ""}\n`;
              });
              md += `\n`;
            }
            if (num.requiredQuantity) md += `**Required Quantity:** ${num.requiredQuantity}\n\n`;
            if (num.relevantFormula) md += `**Relevant Formula:** \`${num.relevantFormula}\`\n\n`;
            if (num.steps?.length > 0) {
              md += `**Step-by-Step Calculation:**\n`;
              num.steps.forEach((s) => {
                md += `Step ${s.stepNumber}: ${s.description}\n`;
                if (s.calculation) md += `   Calculation: ${s.calculation}\n`;
                if (s.intermediateResult) md += `   Result: ${s.intermediateResult}\n`;
              });
              md += `\n`;
            }
            md += `**Final Answer:** **${num.finalAnswer} ${num.units || ""}**\n\n`;
            if (num.interpretation) md += `*Interpretation:* ${num.interpretation}\n\n`;
          });
        }

        // Algorithms
        if (mod.algorithms?.length > 0) {
          md += `### Algorithms & Implementation\n\n`;
          mod.algorithms.forEach((algo) => {
            md += `#### ${algo.title}\n`;
            if (algo.conceptExplanation) md += `${algo.conceptExplanation}\n\n`;
            if (algo.timeComplexity) md += `**Time Complexity:** \`${algo.timeComplexity.worstCase || algo.timeComplexity}\`\n`;
            if (algo.spaceComplexity) md += `**Space Complexity:** \`${algo.spaceComplexity.worstCase || algo.spaceComplexity}\`\n\n`;

            if (algo.pseudocode) {
              md += `**Pseudocode:**\n\`\`\`text\n${algo.pseudocode}\n\`\`\`\n\n`;
            }
            if (algo.codeSnippet) {
              md += `**Implementation (${algo.language || "python"}):**\n\`\`\`${algo.language || "python"}\n${algo.codeSnippet}\n\`\`\`\n\n`;
            }
            if (algo.dryRunTrace?.length > 0) {
              md += `**Dry Run Execution Trace:**\n`;
              algo.dryRunTrace.forEach((trace) => {
                md += `- Step ${trace.step}: ${JSON.stringify(trace.variableStates)} -> Output: ${trace.output || "-"}\n`;
              });
              md += `\n`;
            }
            if (algo.commonMistakes?.length > 0) {
              md += `**Common Pitfalls:**\n${algo.commonMistakes.map((m) => `- ⚠️ ${m}`).join("\n")}\n\n`;
            }
          });
        }

        // Exam Preparation
        if (mod.examPreparation) {
          md += `### Exam Preparation Questions\n\n`;
          const ep = mod.examPreparation;
          if (ep.twoMarkQuestions?.length > 0) {
            md += `**2-Mark Questions (Short Answer):**\n${ep.twoMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
          if (ep.fiveMarkQuestions?.length > 0) {
            md += `**5-Mark Questions (Conceptual):**\n${ep.fiveMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
          if (ep.tenMarkQuestions?.length > 0) {
            md += `**10-Mark Questions (Essay / Architecture):**\n${ep.tenMarkQuestions.map((q) => `- ${q}`).join("\n")}\n\n`;
          }
          if (ep.importantDifferences?.length > 0) {
            md += `**Key Distinctions:**\n${ep.importantDifferences.map((d) => `- ${d}`).join("\n")}\n\n`;
          }
        }

        // Quick Revision Capsule
        if (mod.quickRevisionNotes) {
          md += `### Quick Revision Capsule\n\n`;
          const qr = mod.quickRevisionNotes;
          if (qr.keyTakeaways?.length > 0) {
            md += `**Key Takeaways:**\n${qr.keyTakeaways.map((k) => `- ${k}`).join("\n")}\n\n`;
          }
          if (qr.formulas?.length > 0) {
            md += `**Formulas:**\n${qr.formulas.map((f) => `- ${f}`).join("\n")}\n\n`;
          }
          if (qr.technicalTerms?.length > 0) {
            md += `**Technical Terms:** ${qr.technicalTerms.join(", ")}\n\n`;
          }
          if (qr.lastMinutePoints?.length > 0) {
            md += `**Last-Minute Points:**\n${qr.lastMinutePoints.map((p) => `- ${p}`).join("\n")}\n\n`;
          }
        }
      });
    }

    return md;
  };

  const handleCopySummary = () => {
    const textToCopy = generateMarkdownNotesString();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setToastMessage("Complete Markdown study notes copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const text = generateMarkdownNotesString();
    const docName = (selectedDocObj?.name || selectedDocObj?.fileName || "StudyMate_Notes").replace(/\.[^/.]+$/, "");
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docName}_Comprehensive_Notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage(`Exported ${docName}_Comprehensive_Notes.md successfully!`);
  };

  const handleExportHTML = async () => {
    try {
      const docName = (selectedDocObj?.name || selectedDocObj?.fileName || "StudyMate_Notes").replace(/\.[^/.]+$/, "");
      const resBlob = await summaryService.exportSummary(selectedDocId, "html");
      const url = URL.createObjectURL(new Blob([resBlob], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docName}_Comprehensive_Notes.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage("Exported standalone HTML study notes!");
    } catch {
      // Fallback to client-side HTML package
      const md = generateMarkdownNotesString();
      const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${summaryData?.title || "Study Notes"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3, h4 { color: #0f172a; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; overflow-x: auto; font-family: monospace; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #475569; }
  </style>
</head>
<body>
  <pre>${md.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
      const blob = new Blob([htmlDoc], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `StudyNotes.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage("Exported HTML study notes!");
    }
  };

  const handlePrintToPdf = () => {
    window.print();
  };

  const selectedDocObj = documents.find(
    (d) => (d.id || d.documentId) === selectedDocId
  );

  const displayModules =
    summaryData?.modules && summaryData.modules.length > 0
      ? activeModuleIndex === "all"
        ? summaryData.modules
        : summaryData.modules.filter((_, idx) => idx === Number(activeModuleIndex))
      : [];

  // Aggregated global formulas and problems across all modules for exam/revision modes
  const allFormulas = [
    ...(summaryData?.globalFormulas || []),
    ...(summaryData?.modules?.flatMap((m) => m.formulas || []) || []),
  ].filter((f, idx, arr) => arr.findIndex((x) => x.formulaName === f.formulaName) === idx);

  const allNumericalProblems = [
    ...(summaryData?.globalNumericalProblems || []),
    ...(summaryData?.modules?.flatMap((m) => m.numericalProblems || []) || []),
  ].filter((p, idx, arr) => arr.findIndex((x) => x.title === p.title) === idx);

  const allAlgorithms = [
    ...(summaryData?.globalAlgorithms || []),
    ...(summaryData?.modules?.flatMap((m) => m.algorithms || []) || []),
  ].filter((a, idx, arr) => arr.findIndex((x) => x.title === a.title) === idx);

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      <Toast
        isOpen={!!toastMessage}
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            AI Comprehensive Notes & Learning Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deep module theory, interactive Mermaid diagrams, KaTeX formulas, solved numericals, algorithms & exam prep
          </p>
        </div>

        {summaryData && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopySummary}
              title="Copy all notes as Markdown"
            >
              {copied ? "Copied" : "Copy Notes"}
            </Button>

            {/* Export Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                title="Export options"
              >
                Export <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30">
                  <button
                    onClick={() => {
                      handleExportMarkdown();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4 text-indigo-600" />
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => {
                      handleExportHTML();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    HTML Document (.html)
                  </button>
                  <button
                    onClick={() => {
                      handlePrintToPdf();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-amber-600" />
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={GraduationCap}
              onClick={() => navigate(`/quiz?doc=${selectedDocId}`)}
            >
              Quiz Me
            </Button>
          </div>
        )}
      </div>

      {/* Document Selector & Controls Card */}
      <Card padding="md" className="bg-white border-slate-200/80 shadow-sm space-y-4 no-print">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Document Selector */}
          <div className="flex-1 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Source Document:
            </label>
            <div className="relative">
              <select
                value={selectedDocId}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              >
                {documents.length === 0 ? (
                  <option value="">No documents available (Upload in My Documents)</option>
                ) : (
                  documents.map((doc) => (
                    <option
                      key={doc.id || doc.documentId}
                      value={doc.id || doc.documentId}
                    >
                      {doc.type === "DOCX" ? "📘" : doc.type === "PPTX" ? "📙" : doc.type === "TXT" ? "📗" : "📄"}{" "}
                      {doc.name || doc.fileName} ({doc.size} • {doc.status || "Ready"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 md:pt-5">
            <Button
              variant="primary"
              size="md"
              icon={summaryData ? RotateCw : Sparkles}
              onClick={() => handleGenerateSummary(true)}
              loading={isGenerating}
              disabled={documents.length === 0}
              className="w-full md:w-auto shadow-md shadow-indigo-600/20"
            >
              {isGenerating
                ? "Processing All Chunks..."
                : summaryData
                ? "Regenerate Learning Notes"
                : "Generate Comprehensive Notes"}
            </Button>
          </div>
        </div>

        {/* Notes Generation Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Study Mode:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 text-xs font-semibold">
              <button
                onClick={() => setSummaryMode("detailed")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  summaryMode === "detailed"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📘 Comprehensive Notes
              </button>
              <button
                onClick={() => setSummaryMode("exam")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  summaryMode === "exam"
                    ? "bg-white text-amber-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎯 Exam Preparation
              </button>
              <button
                onClick={() => setSummaryMode("concise")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  summaryMode === "concise"
                    ? "bg-white text-emerald-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ Quick Revision
              </button>
              <button
                onClick={() => setSummaryMode("quality")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  summaryMode === "quality"
                    ? "bg-white text-indigo-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                🛡️ Quality & Verification
              </button>
            </div>
          </div>

          {summaryData?.domain && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                Domain: {summaryData.domain}
              </span>
              {summaryData.coverageAssessment && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                  {summaryData.coverageAssessment}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Loading Skeleton */}
      {isGenerating && (
        <Card padding="lg" className="space-y-6 text-center py-16 no-print">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Synthesizing Advanced Learning Notes
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Analyzing subject domain, generating valid Mermaid architecture diagrams, formulating KaTeX equations, calculating step-by-step numerical solutions, and constructing university question banks...
            </p>
          </div>
          <div className="w-48 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/3 rounded-full animate-indeterminate" />
          </div>
        </Card>
      )}

      {/* Notes Content Display */}
      {!isGenerating && summaryData && (
        <div className="space-y-6">
          {/* Executive Metadata Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4 print-avoid-break">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-sm">
                {summaryData.domain || selectedDocObj?.subject || "Engineering Studies"}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 backdrop-blur-sm">
                <FileText className="w-3.5 h-3.5" />
                {selectedDocObj?.name || selectedDocObj?.fileName || "Document"}
              </span>
              {summaryData.totalModules > 0 && (
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  {summaryData.totalModules} Modules Covered
                </span>
              )}
              {summaryData.coverageAssessment && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  {summaryData.coverageAssessment}
                </span>
              )}
              {summaryData.qualityAudit && (
                <button
                  onClick={() => setSummaryMode("quality")}
                  className="px-3 py-1 rounded-full bg-indigo-400/25 hover:bg-indigo-400/35 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 border border-indigo-400/40 transition-all cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                  Quality Index: {summaryData.qualityAudit.overallQualityScore}% (
                  {(summaryData.qualityAudit.verificationStatus || "VERIFIED").replace(/_/g, " ")})
                </button>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {summaryData.title}
            </h3>
            <p className="text-indigo-100/90 text-sm leading-relaxed max-w-4xl whitespace-pre-wrap">
              {summaryData.content || summaryData.overview}
            </p>
          </div>

          {/* Quick Table of Contents / Sticky Jump Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs no-print">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Jump to Section:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => scrollToSection("executive-overview")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Overview
              </button>

              {summaryData.modules?.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToSection(`module-${idx}`)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  M{m.moduleNumber || idx + 1}: {m.title.slice(0, 16)}...
                </button>
              ))}

              {allFormulas.length > 0 && (
                <button
                  onClick={() => scrollToSection("formulas-section")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <Calculator className="w-3 h-3" /> Formulas ({allFormulas.length})
                </button>
              )}

              {allNumericalProblems.length > 0 && (
                <button
                  onClick={() => scrollToSection("numericals-section")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1"
                >
                  <Activity className="w-3 h-3" /> Solved Numericals ({allNumericalProblems.length})
                </button>
              )}

              {allAlgorithms.length > 0 && (
                <button
                  onClick={() => scrollToSection("algorithms-section")}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-1"
                >
                  <Code2 className="w-3 h-3" /> Algorithms ({allAlgorithms.length})
                </button>
              )}
            </div>
          </div>

          {/* Module Navigation Tabs (when multiple modules are present) */}
          {summaryData.modules && summaryData.modules.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-print">
              <button
                onClick={() => setActiveModuleIndex("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeModuleIndex === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                All Modules ({summaryData.modules.length})
              </button>
              {summaryData.modules.map((mod, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveModuleIndex(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeModuleIndex === idx
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {mod.title.length > 32 ? `${mod.title.slice(0, 32)}...` : mod.title}
                </button>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 1: COMPREHENSIVE LEARNING NOTES (DEFAULT)                           */}
          {/* ========================================================================= */}
          {summaryMode === "detailed" && (
            <div className="space-y-8">
              {displayModules.map((mod, modIdx) => (
                <div key={modIdx} id={`module-${modIdx}`} className="space-y-5 print-page-break">
                  {/* Module Header Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print-avoid-break">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-bold">
                          MODULE {mod.moduleNumber || modIdx + 1}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white">{mod.title}</h4>
                      {mod.overview && (
                        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                          {mod.overview}
                        </p>
                      )}
                    </div>

                    {mod.learningObjectives?.length > 0 && (
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 max-w-sm shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block mb-1">
                          Learning Objectives
                        </span>
                        <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                          {mod.learningObjectives.slice(0, 3).map((obj, i) => (
                            <li key={i} className="line-clamp-2">{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Detailed Topic Accordions */}
                  {mod.topics && mod.topics.length > 0 && (
                    <div className="space-y-3.5">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Detailed Topic Explanations & Theory
                      </h5>

                      <div className="space-y-3">
                        {mod.topics.map((topic, topicIdx) => {
                          const topicKey = `${modIdx}-${topicIdx}`;
                          const isExpanded = expandedTopics.has(topicKey);

                          return (
                            <div
                              key={topicIdx}
                              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all print-avoid-break"
                            >
                              {/* Accordion Header */}
                              <div
                                onClick={() => toggleTopicExpand(topicKey)}
                                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600">
                                      {topicIdx + 1}.
                                    </span>
                                    <h6 className="text-sm font-bold text-slate-900">
                                      {topic.heading}
                                    </h6>
                                  </div>
                                  {topic.definition && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                      {topic.definition}
                                    </p>
                                  )}
                                </div>

                                <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 no-print">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Accordion Body */}
                              {isExpanded && (
                                <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 text-xs sm:text-sm text-slate-700">
                                  {/* Definition Box */}
                                  {topic.definition && (
                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/80">
                                      <span className="font-bold text-indigo-900 block mb-0.5 text-xs">
                                        Definition:
                                      </span>
                                      <p className="text-indigo-950 leading-relaxed">
                                        {topic.definition}
                                      </p>
                                    </div>
                                  )}

                                  {/* Detailed Explanation */}
                                  {topic.explanation && (
                                    <div>
                                      <span className="font-bold text-slate-900 block mb-1">
                                        Comprehensive Explanation:
                                      </span>
                                      <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">
                                        {topic.explanation}
                                      </p>
                                    </div>
                                  )}

                                  {/* Working Principles & Architecture */}
                                  {(topic.workingPrinciples || topic.architecture) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                      {topic.workingPrinciples && (
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                                          <span className="font-bold text-slate-900 text-xs block mb-1">
                                            ⚙️ Working Principles:
                                          </span>
                                          <p className="text-xs text-slate-600 leading-relaxed">
                                            {topic.workingPrinciples}
                                          </p>
                                        </div>
                                      )}

                                      {topic.architecture && (
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                                          <span className="font-bold text-slate-900 text-xs block mb-1">
                                            🏛️ Architecture & Components:
                                          </span>
                                          <p className="text-xs text-slate-600 leading-relaxed">
                                            {topic.architecture}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Components & Related Concepts */}
                                  {(topic.components?.length > 0 || topic.relatedConcepts?.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                      {topic.components?.length > 0 && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                          <span className="font-bold text-slate-800 text-xs block mb-1">
                                            Key Hardware / Software Components:
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {topic.components.map((c, i) => (
                                              <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                                                {c}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {topic.relatedConcepts?.length > 0 && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                          <span className="font-bold text-slate-800 text-xs block mb-1">
                                            Related Concepts:
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {topic.relatedConcepts.map((r, i) => (
                                              <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px]">
                                                {r}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Characteristics & Applications */}
                                  {(topic.characteristics?.length > 0 || topic.applications?.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                      {topic.characteristics?.length > 0 && (
                                        <div>
                                          <span className="font-bold text-slate-800 text-xs block mb-1.5">
                                            Key Characteristics:
                                          </span>
                                          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600">
                                            {topic.characteristics.map((c, i) => (
                                              <li key={i}>{c}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {topic.applications?.length > 0 && (
                                        <div>
                                          <span className="font-bold text-slate-800 text-xs block mb-1.5">
                                            Practical Applications:
                                          </span>
                                          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600">
                                            {topic.applications.map((a, i) => (
                                              <li key={i}>{a}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Advantages & Disadvantages */}
                                  {(topic.advantages?.length > 0 || topic.disadvantages?.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                      {topic.advantages?.length > 0 && (
                                        <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                                          <span className="font-bold text-emerald-800 text-xs block mb-1">
                                            Advantages:
                                          </span>
                                          <ul className="space-y-1 text-xs text-emerald-900">
                                            {topic.advantages.map((adv, i) => (
                                              <li key={i}>✓ {adv}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {topic.disadvantages?.length > 0 && (
                                        <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100">
                                          <span className="font-bold text-rose-800 text-xs block mb-1">
                                            Disadvantages / Trade-offs:
                                          </span>
                                          <ul className="space-y-1 text-xs text-rose-900">
                                            {topic.disadvantages.map((dis, i) => (
                                              <li key={i}>✗ {dis}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Important Observations */}
                                  {topic.importantObservations?.length > 0 && (
                                    <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-xs">
                                      <span className="font-bold text-blue-900 block mb-1">
                                        🔍 Key Analytical Observations:
                                      </span>
                                      <ul className="space-y-1 text-blue-950">
                                        {topic.importantObservations.map((obs, i) => (
                                          <li key={i}>• {obs}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Concrete Examples */}
                                  {topic.examples?.length > 0 && (
                                    <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-200/60 text-xs">
                                      <span className="font-bold text-amber-900 block mb-1">
                                        💡 Technical Examples:
                                      </span>
                                      <ul className="space-y-1 text-amber-950">
                                        {topic.examples.map((ex, i) => (
                                          <li key={i}>• {ex}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Embedded Tables if any */}
                                  {topic.tables && topic.tables.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="font-bold text-slate-800 text-xs block">
                                        Comparison Table:
                                      </span>
                                      {topic.tables.map((tbl, i) => (
                                        <MarkdownTableRenderer key={i} markdown={tbl} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Module Comparison Tables */}
                  {mod.comparisonTables && mod.comparisonTables.length > 0 && (
                    <Card padding="md" className="space-y-3 print-avoid-break">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Table className="w-4 h-4 text-indigo-600" />
                        <h5 className="text-sm font-bold text-slate-900">
                          Comparison & Synthesis Tables
                        </h5>
                      </div>

                      {mod.comparisonTables.map((tbl, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <h6 className="text-xs font-bold text-slate-700">{tbl.title}</h6>
                          <MarkdownTableRenderer markdown={tbl.markdown} />
                        </div>
                      ))}
                    </Card>
                  )}

                  {/* Diagrams and Workflows */}
                  {mod.diagramsAndProcesses && mod.diagramsAndProcesses.length > 0 && (
                    <div className="space-y-3.5 print-avoid-break">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        Architectural & Process Diagrams
                      </h5>

                      <div className="space-y-4">
                        {mod.diagramsAndProcesses.map((diag, dIdx) => (
                          <MermaidDiagram
                            key={dIdx}
                            title={diag.title}
                            mermaidCode={diag.mermaidCode}
                            description={diag.description}
                            components={diag.components}
                            workflow={diag.workflow}
                            technicalExplanation={diag.technicalExplanation}
                            diagramType={diag.diagramType}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module Mathematical Formulas */}
                  {mod.formulas && mod.formulas.length > 0 && (
                    <div id={`formulas-${modIdx}`} className="space-y-3.5 print-avoid-break">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-indigo-600" />
                        Mathematical Formulas & Governing Equations
                      </h5>

                      <div className="space-y-3">
                        {mod.formulas.map((form, fIdx) => (
                          <FormulaCard
                            key={fIdx}
                            formulaName={form.formulaName}
                            expression={form.expression}
                            variables={form.variables}
                            conditionsAndAssumptions={form.conditionsAndAssumptions}
                            explanation={form.explanation}
                            practicalApplication={form.practicalApplication}
                            solvedExample={form.solvedExample}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module Numerical Problems */}
                  {mod.numericalProblems && mod.numericalProblems.length > 0 && (
                    <div id={`numericals-${modIdx}`} className="space-y-3.5 print-avoid-break">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Step-by-Step Solved Numerical Problems
                      </h5>

                      <div className="space-y-4">
                        {mod.numericalProblems.map((prob, pIdx) => (
                          <NumericalProblemCard
                            key={pIdx}
                            title={prob.title}
                            problemStatement={prob.problemStatement}
                            givenData={prob.givenData}
                            requiredQuantity={prob.requiredQuantity}
                            relevantFormula={prob.relevantFormula}
                            steps={prob.steps}
                            finalAnswer={prob.finalAnswer}
                            units={prob.units}
                            interpretation={prob.interpretation}
                            isSourceDerived={prob.isSourceDerived}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module Algorithms & Implementations */}
                  {mod.algorithms && mod.algorithms.length > 0 && (
                    <div id={`algorithms-${modIdx}`} className="space-y-3.5 print-avoid-break">
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-600" />
                        Algorithms, Complexity & Implementation
                      </h5>

                      <div className="space-y-4">
                        {mod.algorithms.map((algo, aIdx) => (
                          <AlgorithmCard
                            key={aIdx}
                            title={algo.title}
                            conceptExplanation={algo.conceptExplanation}
                            language={algo.language}
                            steps={algo.steps}
                            pseudocode={algo.pseudocode}
                            codeSnippet={algo.codeSnippet}
                            codeExplanation={algo.codeExplanation}
                            sampleInput={algo.sampleInput}
                            sampleOutput={algo.sampleOutput}
                            dryRunTrace={algo.dryRunTrace}
                            timeComplexity={algo.timeComplexity}
                            spaceComplexity={algo.spaceComplexity}
                            commonMistakes={algo.commonMistakes}
                            flowchartMermaid={algo.flowchartMermaid}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module Exam Preparation */}
                  {mod.examPreparation && (
                    <Card padding="md" className="space-y-4 bg-amber-50/20 border-amber-200/60 print-avoid-break">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/50">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-amber-700" />
                          <h5 className="text-sm font-bold text-slate-900">
                            Module Exam Preparation Questions
                          </h5>
                        </div>
                        <Badge variant="warning" size="sm">High-Yield Exam Focus</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 2-Mark Questions */}
                        {mod.examPreparation.twoMarkQuestions?.length > 0 && (
                          <div className="space-y-2 bg-white p-3.5 rounded-xl border border-amber-200/50">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                              2-Mark Questions (Short)
                            </span>
                            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                              {mod.examPreparation.twoMarkQuestions.map((q, i) => (
                                <li key={i} className="leading-snug">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 5-Mark Questions */}
                        {mod.examPreparation.fiveMarkQuestions?.length > 0 && (
                          <div className="space-y-2 bg-white p-3.5 rounded-xl border border-amber-200/50">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                              5-Mark Questions (Medium)
                            </span>
                            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                              {mod.examPreparation.fiveMarkQuestions.map((q, i) => (
                                <li key={i} className="leading-snug">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 10-Mark Questions */}
                        {mod.examPreparation.tenMarkQuestions?.length > 0 && (
                          <div className="space-y-2 bg-white p-3.5 rounded-xl border border-amber-200/50">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                              10-Mark Questions (Long/Essay)
                            </span>
                            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                              {mod.examPreparation.tenMarkQuestions.map((q, i) => (
                                <li key={i} className="leading-snug">{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Important Differences */}
                      {mod.examPreparation.importantDifferences?.length > 0 && (
                        <div className="p-3 bg-white rounded-xl border border-amber-200/50 space-y-1.5">
                          <span className="text-xs font-bold text-amber-900 block">
                            Key Distinctions for Exams:
                          </span>
                          <ul className="text-xs text-slate-700 space-y-1">
                            {mod.examPreparation.importantDifferences.map((diff, i) => (
                              <li key={i}>• {diff}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Module Quick Revision Capsule */}
                  {mod.quickRevisionNotes && (
                    <Card padding="md" className="space-y-3 bg-emerald-50/20 border-emerald-200/60 print-avoid-break">
                      <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/40">
                        <ListChecks className="w-4 h-4 text-emerald-600" />
                        <h5 className="text-sm font-bold text-slate-900">
                          Quick Revision Capsule
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {mod.quickRevisionNotes.keyTakeaways?.length > 0 && (
                          <div>
                            <span className="font-bold text-emerald-900 block mb-1">
                              Key Takeaways:
                            </span>
                            <ul className="space-y-1 text-slate-700 list-disc list-inside">
                              {mod.quickRevisionNotes.keyTakeaways.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {mod.quickRevisionNotes.lastMinutePoints?.length > 0 && (
                          <div>
                            <span className="font-bold text-emerald-900 block mb-1">
                              Last-Minute Memory Triggers:
                            </span>
                            <ul className="space-y-1 text-slate-700 list-disc list-inside">
                              {mod.quickRevisionNotes.lastMinutePoints.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {mod.quickRevisionNotes.technicalTerms?.length > 0 && (
                        <div className="pt-2 border-t border-emerald-100/60 flex flex-wrap gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-900 mr-1">
                            Technical Terms:
                          </span>
                          {mod.quickRevisionNotes.technicalTerms.map((term, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-900 text-[10px] font-semibold">
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: EXAM PREPARATION COCKPIT                                         */}
          {/* ========================================================================= */}
          {summaryMode === "exam" && (
            <div className="space-y-6">
              <Card padding="md" className="space-y-6 bg-amber-50/30 border-amber-200">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                      🎯
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        University Exam Preparation & Question Bank
                      </h4>
                      <p className="text-xs text-slate-500">
                        Categorized university exam questions, formula revision sheets, and solved numerical problems
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">Exam Ready</Badge>
                </div>

                {/* 2-Mark Questions */}
                {summaryData.examQuestions?.twoMarkQuestions?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-amber-700" />
                      2-Mark Short Answer Questions (Definitions, Direct Concepts)
                    </h5>
                    <div className="space-y-2">
                      {summaryData.examQuestions.twoMarkQuestions.map((q, idx) => {
                        const ansKey = `exam-2-${idx}`;
                        const isRevealed = revealedAnswers.has(ansKey);
                        return (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-amber-100 space-y-2 shadow-2xs">
                            <div className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex items-start gap-2 text-slate-800">
                                <span className="font-bold text-amber-700 shrink-0">Q{idx + 1}.</span>
                                <span className="font-semibold">{q}</span>
                              </div>
                              <button
                                onClick={() => toggleAnswerReveal(ansKey)}
                                className="text-amber-700 hover:text-amber-900 font-bold shrink-0 flex items-center gap-1 text-[11px]"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {isRevealed ? "Hide Outline" : "Show Outline"}
                              </button>
                            </div>
                            {isRevealed && (
                              <div className="pt-2 border-t border-amber-50 text-xs text-slate-600 bg-amber-50/40 p-2.5 rounded-lg">
                                <span className="font-bold text-amber-900 block mb-0.5">Model Answer Outline:</span>
                                State the exact formal definition, state 2 key characteristics, and mention one standard practical application.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5-Mark Questions */}
                {summaryData.examQuestions?.fiveMarkQuestions?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      5-Mark Conceptual Questions (Working Principles, Architecture)
                    </h5>
                    <div className="space-y-2">
                      {summaryData.examQuestions.fiveMarkQuestions.map((q, idx) => {
                        const ansKey = `exam-5-${idx}`;
                        const isRevealed = revealedAnswers.has(ansKey);
                        return (
                          <div key={idx} className="p-3.5 bg-white rounded-xl border border-amber-100 space-y-2 shadow-2xs">
                            <div className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex items-start gap-2 text-slate-800">
                                <span className="font-bold text-amber-700 shrink-0">Q{idx + 1}.</span>
                                <span className="font-semibold">{q}</span>
                              </div>
                              <button
                                onClick={() => toggleAnswerReveal(ansKey)}
                                className="text-amber-700 hover:text-amber-900 font-bold shrink-0 flex items-center gap-1 text-[11px]"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {isRevealed ? "Hide Outline" : "Show Outline"}
                              </button>
                            </div>
                            {isRevealed && (
                              <div className="pt-2 border-t border-amber-50 text-xs text-slate-600 bg-amber-50/40 p-2.5 rounded-lg">
                                <span className="font-bold text-amber-900 block mb-0.5">Answer Blueprint:</span>
                                1. Draw block/flowchart diagram.<br />
                                2. Explain fundamental working principle step-by-step.<br />
                                3. Tabulate at least 3 advantages and 2 limitations.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 10-Mark Questions */}
                {summaryData.examQuestions?.tenMarkQuestions?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-700" />
                      10-Mark Long / Essay / Design Questions
                    </h5>
                    <div className="space-y-2">
                      {summaryData.examQuestions.tenMarkQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-xl border border-amber-100 flex items-start gap-2.5 text-xs text-slate-800 shadow-2xs">
                          <span className="font-bold text-amber-700">Q{idx + 1}.</span>
                          <span className="font-semibold">{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* High-Yield Formula Revision Sheet */}
              {allFormulas.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-base font-bold text-slate-900">
                      High-Yield Formula Revision Sheet (All Modules)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allFormulas.map((f, i) => (
                      <FormulaCard
                        key={i}
                        formulaName={f.formulaName}
                        expression={f.expression}
                        variables={f.variables}
                        conditionsAndAssumptions={f.conditionsAndAssumptions}
                        explanation={f.explanation}
                        practicalApplication={f.practicalApplication}
                        solvedExample={f.solvedExample}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Solved Numerical Problem Bank */}
              {allNumericalProblems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-base font-bold text-slate-900">
                      Solved Numerical Problem Bank
                    </h4>
                  </div>
                  <div className="space-y-4">
                    {allNumericalProblems.map((prob, i) => (
                      <NumericalProblemCard
                        key={i}
                        title={prob.title}
                        problemStatement={prob.problemStatement}
                        givenData={prob.givenData}
                        requiredQuantity={prob.requiredQuantity}
                        relevantFormula={prob.relevantFormula}
                        steps={prob.steps}
                        finalAnswer={prob.finalAnswer}
                        units={prob.units}
                        interpretation={prob.interpretation}
                        isSourceDerived={prob.isSourceDerived}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 3: QUICK REVISION                                                    */}
          {/* ========================================================================= */}
          {summaryMode === "concise" && (
            <div className="space-y-6">
              {/* Key Points */}
              {summaryData.keyPoints?.length > 0 && (
                <Card padding="md" className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Core Takeaways</h4>
                      <p className="text-xs text-slate-500">Essential principles and high-yield conclusions</p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm text-slate-700">
                    {summaryData.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Technical Glossary / Important Concepts */}
              {summaryData.importantConcepts?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h4 className="text-base font-bold text-slate-900">
                      Technical Terms & Glossary
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {summaryData.importantConcepts.map((item, idx) => (
                      <Card
                        key={idx}
                        padding="md"
                        className="bg-amber-50/20 border-amber-200/50 flex flex-col justify-between"
                      >
                        <div>
                          <span className="inline-block text-xs font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-lg mb-2">
                            Term #{idx + 1}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900 mb-1.5">
                            {item.term || `Concept ${idx + 1}`}
                          </h5>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.explanation || item.definition || item}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Formula Cheat Sheet */}
              {allFormulas.length > 0 && (
                <Card padding="md" className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">Formula Cheat Sheet</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allFormulas.map((f, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-900 block">{f.formulaName}</span>
                        <code className="block bg-white p-2 rounded-lg border border-slate-200 font-mono text-indigo-900 text-center font-bold">
                          {f.expression}
                        </code>
                        {f.explanation && (
                          <p className="text-slate-500 text-[11px] leading-tight">{f.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Algorithm Complexity Quick Matrix */}
              {allAlgorithms.length > 0 && (
                <Card padding="md" className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Code2 className="w-4 h-4 text-purple-600" />
                    <h4 className="text-sm font-bold text-slate-900">Algorithm Complexity Matrix</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Algorithm</th>
                          <th className="py-2.5 px-3">Worst Case Time</th>
                          <th className="py-2.5 px-3">Space Complexity</th>
                          <th className="py-2.5 px-3">Primary Use</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allAlgorithms.map((algo, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-900">{algo.title}</td>
                            <td className="py-2 px-3 font-mono text-rose-700 font-bold">
                              {algo.timeComplexity?.worstCase || algo.timeComplexity || "O(N)"}
                            </td>
                            <td className="py-2 px-3 font-mono text-blue-700 font-bold">
                              {algo.spaceComplexity?.worstCase || algo.spaceComplexity || "O(1)"}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {algo.conceptExplanation?.slice(0, 60) || "Standard implementation"}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Global Comparison Tables */}
              {summaryData.globalComparisonTables?.length > 0 && (
                <Card padding="md" className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Table className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">Summary Comparison Tables</h4>
                  </div>
                  {summaryData.globalComparisonTables.map((tbl, i) => (
                    <div key={i} className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-800">{tbl.title}</h5>
                      <MarkdownTableRenderer markdown={tbl.markdown} />
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 4: LEARNING QUALITY ASSURANCE & ACADEMIC VERIFICATION               */}
          {/* ========================================================================= */}
          {summaryMode === "quality" && (
            <LearningQualityDashboard
              qualityAudit={summaryData.qualityAudit}
              documentId={selectedDocId}
              onApplyImprovement={handleApplyImprovement}
              isApplyingImprovement={isApplyingImprovement}
            />
          )}
        </div>
      )}

      {/* Empty State when no summary generated yet */}
      {!isGenerating && !summaryData && (
        <Card padding="lg" className="text-center py-16 no-print">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {documents.length === 0
              ? "No documents available"
              : "No Study Notes Generated Yet"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {documents.length === 0
              ? "Upload study materials in My Documents to generate detailed module notes, diagrams, formulas, and exam question banks."
              : "Click 'Generate Comprehensive Notes' above to create in-depth engineering study notes and exam preparation material."}
          </p>
          {documents.length === 0 && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={() => navigate("/documents")}
              >
                Go to My Documents
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
