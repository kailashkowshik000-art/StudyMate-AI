import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Calculator, Lightbulb, BookOpen } from "lucide-react";

export default function FormulaCard({
  formulaName = "Mathematical Formula",
  expression = "",
  variables = [],
  conditionsAndAssumptions = [],
  explanation = "",
  practicalApplication = "",
  solvedExample = null,
}) {
  const formulaRef = useRef(null);
  const [showSolvedExample, setShowSolvedExample] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!expression || !formulaRef.current || typeof window === "undefined") return;

    if (window.katex) {
      try {
        window.katex.render(expression, formulaRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (err) {
        console.warn("[KaTeX] Render fallback:", err);
      }
    }
  }, [expression]);

  const handleCopyFormula = () => {
    if (!expression) return;
    navigator.clipboard.writeText(expression);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 my-3 hover:border-slate-300 transition-all">
      {/* Title & Copy Button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            ∑
          </div>
          <h5 className="text-sm font-bold text-slate-900">{formulaName}</h5>
        </div>
        <button
          type="button"
          onClick={handleCopyFormula}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
          title="Copy LaTeX Expression"
          aria-label="Copy LaTeX Expression"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Mathematical Equation Display Box */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 my-2 text-center overflow-x-auto">
        <div
          ref={formulaRef}
          className="text-base sm:text-lg font-mono text-indigo-950 inline-block"
        >
          {expression}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-xs text-slate-600 leading-relaxed my-2.5">
          {explanation}
        </p>
      )}

      {/* Variable Meanings Breakdown Table */}
      {variables && variables.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-200/60 rounded-xl overflow-hidden">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold text-[11px]">
              <tr>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Meaning / Parameter</th>
                <th className="py-2 px-3">Standard Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {variables.map((v, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-1.5 px-3 font-mono font-semibold text-indigo-600">{v.symbol}</td>
                  <td className="py-1.5 px-3 leading-snug">{v.meaning}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-500 text-[11px]">{v.unit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assumptions & Practical Applications */}
      {(conditionsAndAssumptions.length > 0 || practicalApplication) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
          {conditionsAndAssumptions.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                Assumptions:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                {conditionsAndAssumptions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {practicalApplication && (
            <div className="space-y-1">
              <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                Practical Application:
              </span>
              <p className="text-slate-600">{practicalApplication}</p>
            </div>
          )}
        </div>
      )}

      {/* Expandable Solved Example */}
      {solvedExample && solvedExample.problem && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowSolvedExample(!showSolvedExample)}
            className="flex items-center justify-between w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              {showSolvedExample ? "Hide Solved Calculation" : "View Step-by-Step Solved Calculation"}
            </span>
            {showSolvedExample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSolvedExample && (
            <div className="mt-2.5 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2 text-xs">
              <p className="font-semibold text-slate-800">
                Problem: <span className="font-normal text-slate-700">{solvedExample.problem}</span>
              </p>
              {solvedExample.solutionSteps?.length > 0 && (
                <div className="space-y-1 pl-1">
                  <span className="font-semibold text-slate-700 block text-[11px]">Derivation Steps:</span>
                  {solvedExample.solutionSteps.map((step, idx) => (
                    <div key={idx} className="font-mono text-[11px] text-slate-700 bg-white/70 p-1.5 rounded-lg border border-indigo-100/60">
                      {step}
                    </div>
                  ))}
                </div>
              )}
              {solvedExample.finalAnswer && (
                <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between font-bold text-indigo-900">
                  <span>Final Result:</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 text-indigo-700 font-mono shadow-2xs">
                    {solvedExample.finalAnswer}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
