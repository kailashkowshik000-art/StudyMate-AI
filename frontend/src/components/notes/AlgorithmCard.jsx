import React, { useState } from "react";
import { Code2, Clock, HardDrive, Copy, Check, AlertTriangle, Play, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import MermaidDiagram from "./MermaidDiagram";

export default function AlgorithmCard({
  title = "Algorithm Specification",
  conceptExplanation = "",
  language = "python",
  steps = [],
  pseudocode = "",
  codeSnippet = "",
  codeExplanation = "",
  sampleInput = "",
  sampleOutput = "",
  dryRunTrace = [],
  timeComplexity = null,
  spaceComplexity = null,
  commonMistakes = [],
  flowchartMermaid = "",
}) {
  const [activeCodeTab, setActiveCodeTab] = useState(codeSnippet ? "code" : "pseudocode");
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    const textToCopy = activeCodeTab === "code" ? codeSnippet : pseudocode;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 my-4 hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900">{title}</h5>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Language: {language}
            </span>
          </div>
        </div>

        {/* Complexity Badges */}
        {timeComplexity && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-mono font-bold shadow-2xs">
              <Clock className="w-3 h-3 text-amber-600" /> {timeComplexity.worst || timeComplexity.average || "O(n)"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200/80 rounded-lg text-xs font-mono font-bold shadow-2xs">
              <HardDrive className="w-3 h-3 text-blue-600" /> {spaceComplexity?.complexity || "O(1)"}
            </span>
          </div>
        )}
      </div>

      {/* Concept Explanation */}
      {conceptExplanation && (
        <p className="my-3 text-xs text-slate-700 leading-relaxed font-normal">
          {conceptExplanation}
        </p>
      )}

      {/* Logical Steps */}
      {steps && steps.length > 0 && (
        <div className="my-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Algorithm Procedure Steps:
          </span>
          <div className="space-y-1 text-xs text-slate-700">
            {steps.map((st, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-snug">{st}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code / Pseudocode Tabs */}
      {(codeSnippet || pseudocode) && (
        <div className="my-3.5 rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              {pseudocode && (
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("pseudocode")}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                    activeCodeTab === "pseudocode"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pseudocode
                </button>
              )}
              {codeSnippet && (
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("code")}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
                    activeCodeTab === "code"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Implementation ({language})
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-indigo-200">
            <code>{activeCodeTab === "code" ? codeSnippet : pseudocode}</code>
          </pre>
        </div>
      )}

      {/* Code Explanation */}
      {codeExplanation && (
        <p className="my-2 text-xs text-slate-600 leading-relaxed italic">
          {codeExplanation}
        </p>
      )}

      {/* Sample I/O */}
      {(sampleInput || sampleOutput) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
          {sampleInput && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sample Input:
              </span>
              <code className="font-mono text-slate-800 text-[11px] block">{sampleInput}</code>
            </div>
          )}
          {sampleOutput && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Sample Output:
              </span>
              <code className="font-mono text-emerald-700 font-bold text-[11px] block">{sampleOutput}</code>
            </div>
          )}
        </div>
      )}

      {/* Dry Run Trace Table */}
      {dryRunTrace && dryRunTrace.length > 0 && (
        <div className="my-3.5">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-indigo-600" /> Step-by-Step Execution Dry Run:
          </span>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Iteration / Step</th>
                  <th className="py-2 px-3">Variable States & Memory</th>
                  <th className="py-2 px-3">Action / Intermediate Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dryRunTrace.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">{row.step}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-indigo-700">{row.variableStates}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{row.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Common Pitfalls / Mistakes */}
      {commonMistakes && commonMistakes.length > 0 && (
        <div className="my-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-900 space-y-1">
          <span className="font-bold flex items-center gap-1.5 text-amber-800 text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Common Examination Pitfalls:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 text-[11px]">
            {commonMistakes.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable Flowchart */}
      {flowchartMermaid && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFlowchart(!showFlowchart)}
            className="flex items-center justify-between w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              {showFlowchart ? "Hide Algorithm Flowchart" : "View Flowchart Diagram"}
            </span>
            {showFlowchart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFlowchart && (
            <div className="mt-2.5">
              <MermaidDiagram
                title={`${title} Flowchart`}
                mermaidCode={flowchartMermaid}
                diagramType="flowchart"
                description="Visual decision tree and state transitions of the algorithm execution loop."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
