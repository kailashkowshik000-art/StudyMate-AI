import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Calculator,
  Compass,
  FileText,
  RefreshCw,
  ExternalLink,
  Wrench,
  Check,
} from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import Badge from "../common/Badge";

/**
 * StudyMate AI — Phase 8.6.2
 * Learning Quality Assurance & Academic Verification Dashboard
 */
export default function LearningQualityDashboard({
  qualityAudit,
  documentId,
  onApplyImprovement,
  isApplyingImprovement,
}) {
  const [activeTab, setActiveTab] = useState("coverage"); // 'coverage' | 'formulas' | 'calculations' | 'diagrams' | 'grounding' | 'improvements'
  const [expandedSections, setExpandedSections] = useState(new Set(["stat-summary", "improvements"]));

  if (!qualityAudit) {
    return (
      <Card padding="lg" className="text-center py-12 border-dashed border-slate-300">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
        <h4 className="text-base font-bold text-slate-800">Quality Audit Not Yet Generated</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Independent deterministic formula and calculation verification will run automatically when notes are synthesized.
        </p>
      </Card>
    );
  }

  const {
    overallQualityScore = 90,
    groundingScore = 95,
    verificationStatus = "VERIFIED",
    coverage = {},
    formulaVerification = {},
    numericalVerification = {},
    diagramValidation = {},
    algorithmValidation = {},
    groundingAudit = {},
    actionableImprovements = [],
    auditedAt,
    auditId,
  } = qualityAudit;

  const toggleSection = (sec) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec);
      else next.add(sec);
      return next;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "VERIFIED":
      case "VERIFIED_CORRECT":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "FLAGGED_DISCREPANCY":
      case "CALCULATION_DISCREPANCY":
      case "NEEDS_ATTENTION":
        return "bg-rose-50 text-rose-800 border-rose-300";
      case "PARTIALLY_VERIFIED":
      case "REQUIRES_REVIEW":
        return "bg-amber-50 text-amber-800 border-amber-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Quality & Academic Verification Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Academic Quality Assurance & Verification
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(
                    verificationStatus
                  )}`}
                >
                  {verificationStatus.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit ID: <code className="text-indigo-300">{auditId || "qa_current"}</code> • Audited:{" "}
                {auditedAt ? new Date(auditedAt).toLocaleString() : "Just now"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black text-indigo-300">{overallQualityScore}%</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Quality Index</div>
            </div>
            <div className="h-10 w-px bg-white/15" />
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black text-emerald-300">{groundingScore}%</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Grounding Ratio</div>
            </div>
          </div>
        </div>

        {/* Metric Badges Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-slate-400 block text-[11px] mb-1">Source Coverage</span>
            <span className="text-base font-bold text-white">
              {coverage.topicCoveragePercentage ?? 100}% Topics
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              {coverage.coveredSourceTopics || 0} / {coverage.totalSourceTopics || 0} Syllabus Topics
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-slate-400 block text-[11px] mb-1">Formula Verification</span>
            <span className="text-base font-bold text-white">
              {formulaVerification.verifiedCount || 0} / {formulaVerification.totalFormulas || 0} Verified
            </span>
            <span
              className={`text-[10px] block mt-0.5 font-semibold ${
                formulaVerification.flaggedCount > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {formulaVerification.flaggedCount > 0
                ? `${formulaVerification.flaggedCount} Discrepancies Flagged`
                : "Zero Discrepancies"}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-slate-400 block text-[11px] mb-1">Math Recomputation</span>
            <span className="text-base font-bold text-white">
              {numericalVerification.verifiedCount || 0} / {numericalVerification.totalProblems || 0} Step-Verified
            </span>
            <span
              className={`text-[10px] block mt-0.5 font-semibold ${
                numericalVerification.discrepancyCount > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {numericalVerification.discrepancyCount > 0
                ? `${numericalVerification.discrepancyCount} Step Errors Flagged`
                : "100% Deterministic Match"}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-slate-400 block text-[11px] mb-1">Pedagogical Grounding</span>
            <span className="text-base font-bold text-white">
              {groundingAudit.sourceGroundedCount || 0} Source Grounded
            </span>
            <span className="text-[10px] text-indigo-300 block mt-0.5">
              {groundingAudit.supplementaryCount || 0} Illustrative Models
            </span>
          </div>
        </div>
      </div>

      {/* 2. Actionable Improvements Panel (if any improvements exist) */}
      {actionableImprovements.length > 0 && (
        <Card padding="md" className="border-indigo-200/80 bg-indigo-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Targeted Learning Improvements ({actionableImprovements.filter((i) => i.status === "pending").length} Available)
                </h4>
                <p className="text-xs text-slate-500">
                  In-place targeted fixes that patch notes without regenerating or wiping existing student sections.
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleSection("improvements")}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              {expandedSections.has("improvements") ? "Hide Details" : "Show Details"}
            </button>
          </div>

          {expandedSections.has("improvements") && (
            <div className="mt-4 space-y-3 pt-3 border-t border-indigo-100">
              {actionableImprovements.map((imp) => (
                <div
                  key={imp.id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{imp.title}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          imp.status === "applied"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {imp.status === "applied" ? "Applied" : "Ready to Patch"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{imp.description}</p>
                  </div>

                  {imp.status !== "applied" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onApplyImprovement && onApplyImprovement(imp.id)}
                      loading={isApplyingImprovement}
                      className="shrink-0 text-xs shadow-xs"
                    >
                      Apply Patch
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 shrink-0">
                      <Check className="w-4 h-4" /> Patched In-Place
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. Inspection Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("coverage")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "coverage"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          📚 Source Coverage ({coverage.topicCoveragePercentage ?? 100}%)
        </button>
        <button
          onClick={() => setActiveTab("formulas")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "formulas"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🔬 Formula Audit ({formulaVerification.verifiedCount || 0}/{formulaVerification.totalFormulas || 0})
        </button>
        <button
          onClick={() => setActiveTab("calculations")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "calculations"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🧮 Math Verification ({numericalVerification.verifiedCount || 0}/{numericalVerification.totalProblems || 0})
        </button>
        <button
          onClick={() => setActiveTab("diagrams")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "diagrams"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          📐 Diagrams & Big-O
        </button>
        <button
          onClick={() => setActiveTab("grounding")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "grounding"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          🛡️ Grounding & Traceability
        </button>
      </div>

      {/* 4. Tab 1: Source Coverage Analysis */}
      {activeTab === "coverage" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              Element-by-Element Source Coverage Analysis
            </h4>
            <span className="text-xs text-slate-500">
              Evaluated against extracted document chunks (not arbitrary chunk counts)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Covered Topics */}
            <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">
                  Covered Course Topics ({coverage.coveredTopics?.length || 0})
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 max-h-60 overflow-y-auto pr-1">
                {(coverage.coveredTopics || []).map((t, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing Topics */}
            <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">
                  Omitted Source Elements ({coverage.missingTopics?.length || 0})
                </span>
              </div>
              {coverage.missingTopics?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  All identified curriculum topics are fully represented in the learning notes.
                </p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-700 max-h-60 overflow-y-auto pr-1">
                  {(coverage.missingTopics || []).map((mt, idx) => (
                    <li key={idx} className="p-2 rounded-xl bg-white border border-amber-100 shadow-2xs">
                      <div className="font-semibold text-slate-800">{mt.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Found in: {mt.citation}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 5. Tab 2: Formula Verification Audit */}
      {activeTab === "formulas" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              Mathematical Notation & Discrepancy Audit
            </h4>
            <span className="text-xs text-slate-500">
              Syntactic LaTeX parsing, variable definitions, SI units, and physics law integrity
            </span>
          </div>

          <div className="space-y-3">
            {(formulaVerification.items || []).map((f, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  f.discrepancyFound
                    ? "border-rose-300 bg-rose-50/40"
                    : f.isVerified
                    ? "border-emerald-200 bg-white"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="font-bold text-xs text-slate-800">{f.formulaName}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(f.status)}`}>
                    {f.status}
                  </span>
                </div>

                <div className="bg-slate-900 text-slate-100 text-xs font-mono p-2.5 rounded-xl mb-3 overflow-x-auto">
                  {f.expression}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 mb-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">LaTeX Syntax</span>
                    <span className={f.notationValid ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                      {f.notationValid ? "✓ Balanced & Valid" : "✗ Syntax Error"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Variables Defined</span>
                    <span className={f.variablesValid ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                      {f.variablesValid ? "✓ Full Symbols" : "⚠ Incomplete"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SI Units</span>
                    <span className={f.unitsValid ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                      {f.unitsValid ? "✓ Standard SI" : "⚠ Missing Units"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Assumptions</span>
                    <span className={f.assumptionsValid ? "text-emerald-700 font-bold" : "text-slate-500"}>
                      {f.assumptionsValid ? "✓ Specified" : "General"}
                    </span>
                  </div>
                </div>

                {f.discrepancyFound && (
                  <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-xs font-semibold mt-2">
                    {f.discrepancyDescription}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Tab 3: Numerical Problem Deterministic Calculation */}
      {activeTab === "calculations" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              Deterministic Mathematical Calculation Verification
            </h4>
            <span className="text-xs text-slate-500">
              Tolerance: ±2% relative, ±0.05 absolute • Independent step-by-step recomputation
            </span>
          </div>

          <div className="space-y-4">
            {(numericalVerification.items || []).map((p, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border ${
                  p.status === "CALCULATION_DISCREPANCY"
                    ? "border-rose-300 bg-rose-50/40"
                    : p.status === "VERIFIED_CORRECT"
                    ? "border-emerald-200 bg-white"
                    : "border-amber-200 bg-amber-50/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="font-bold text-xs text-slate-800">{p.title}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>

                {/* Stated vs Recomputed Result */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Stated Final Answer</span>
                    <span className="font-bold text-slate-800 text-sm">{p.statedFinalAnswer || "N/A"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                      Deterministic Recomputed Answer
                    </span>
                    <span className="font-bold text-indigo-900 text-sm">
                      {p.recomputedFinalAnswer || "Evaluated deterministically"}
                    </span>
                  </div>
                </div>

                {/* Step recomputations */}
                {p.stepsVerified?.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-xs">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">Step Calculations Check:</div>
                    {p.stepsVerified.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-slate-100 font-mono text-[11px]"
                      >
                        <span className="text-slate-600">
                          Step {st.stepNumber}: {st.calculation}
                        </span>
                        <span
                          className={`font-semibold ${
                            st.isCorrect ? "text-emerald-700" : "text-rose-600 font-bold"
                          }`}
                        >
                          Claimed: {st.claimedResult} | Exact: {st.recomputedValue ?? "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discrepancies if any */}
                {p.discrepancies?.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Discrepancy Detected by Independent Mathematical Evaluator:
                    </div>
                    {p.discrepancies.map((d, dIdx) => (
                      <div key={dIdx} className="text-[11px]">
                        • {d.error || d.claimedResult}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 7. Tab 4: Diagram & Algorithm Big-O Validation */}
      {activeTab === "diagrams" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              Diagram Syntax, SVG Fallback & Algorithm Big-O Formats
            </h4>
            <span className="text-xs text-slate-500">
              Distinguishes syntactic keywords from semantic execution trace tables
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diagrams */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Mermaid Diagrams ({diagramValidation.validCount || 0}/{diagramValidation.totalDiagrams || 0} Valid)
              </h5>
              {(diagramValidation.items || []).map((d, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{d.title}</span>
                    <span className={d.isValid ? "text-emerald-700 text-[10px]" : "text-rose-600 text-[10px]"}>
                      {d.isValid ? "✓ Valid Syntax & SVG" : "⚠ Flagged"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Offline SVG Fallback: {d.hasSvgFallback ? "Available" : "Standard Fallback"}
                  </div>
                </div>
              ))}
            </div>

            {/* Algorithms */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Algorithm Specifications ({algorithmValidation.validCount || 0}/{algorithmValidation.totalAlgorithms || 0} Valid)
              </h5>
              {(algorithmValidation.items || []).map((a, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{a.title}</span>
                    <span className={a.isValid ? "text-emerald-700 text-[10px]" : "text-rose-600 text-[10px]"}>
                      {a.isValid ? "✓ Big-O & Trace Valid" : "⚠ Review"}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-indigo-700 mt-1">
                    Time: {a.timeComplexity || "O(n)"} • Space: {a.spaceComplexity || "O(1)"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 8. Tab 5: Grounding & Hallucination Audit */}
      {activeTab === "grounding" && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">
              Grounding & Semantic Hallucination Audit
            </h4>
            <span className="text-xs text-slate-500">
              Distinguishes source-grounded concepts from supplementary pedagogical models and unsupported claims
            </span>
          </div>

          <div className="space-y-2">
            {(groundingAudit.items || []).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{item.element}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.groundingType === "source_derived"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.groundingType === "supplementary_pedagogical"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {item.groundingType.replace(/_/g, " ")} ({item.overlapPercentage}%)
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.citation}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}