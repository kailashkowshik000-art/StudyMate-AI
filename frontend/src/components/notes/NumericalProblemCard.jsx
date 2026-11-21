import React, { useEffect, useRef } from "react";
import { Calculator, CheckCircle2, FileText, ArrowRight, Lightbulb } from "lucide-react";

export default function NumericalProblemCard({
  title = "Numerical Calculation",
  problemStatement = "",
  givenData = [],
  requiredQuantity = "",
  relevantFormula = "",
  steps = [],
  finalAnswer = "",
  units = "",
  interpretation = "",
  isSourceDerived = true,
}) {
  const formulaRef = useRef(null);

  useEffect(() => {
    if (!relevantFormula || !formulaRef.current || typeof window === "undefined") return;

    if (window.katex) {
      try {
        window.katex.render(relevantFormula, formulaRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (err) {
        console.warn("[KaTeX] Render error in problem card:", err);
      }
    }
  }, [relevantFormula]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 my-4 hover:border-slate-300 transition-all">
      {/* Problem Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <h5 className="text-sm font-bold text-slate-900">{title}</h5>
        </div>
        <span
          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
            isSourceDerived
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {isSourceDerived ? "Source Problem" : "Illustrative Engineering Example"}
        </span>
      </div>

      {/* Problem Statement */}
      <div className="my-3.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs text-slate-700 leading-relaxed font-normal">
        <span className="font-bold text-slate-900 block mb-1">Problem Statement:</span>
        {problemStatement}
      </div>

      {/* Given Data & Target Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
        {givenData && givenData.length > 0 && (
          <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Given Data:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {givenData.map((g, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-800 shadow-2xs"
                >
                  <strong className="text-indigo-600">{g.variable}</strong> = {g.value}{" "}
                  <span className="text-[10px] text-slate-500">{g.unit}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 space-y-2">
          {requiredQuantity && (
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Required Quantity:
              </span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">{requiredQuantity}</p>
            </div>
          )}

          {relevantFormula && (
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Governing Formula:
              </span>
              <span ref={formulaRef} className="font-mono text-xs text-indigo-700 inline-block mt-0.5">
                {relevantFormula}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step-by-Step Calculation */}
      {steps && steps.length > 0 && (
        <div className="my-4 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Step-by-Step Numerical Derivation:
          </span>
          <div className="space-y-2">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-1.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {st.stepNumber || idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-900">{st.description}</p>
                </div>
                {st.calculation && (
                  <div className="pl-7 font-mono text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto">
                    {st.calculation}
                  </div>
                )}
                {st.intermediateResult && (
                  <p className="pl-7 text-[11px] text-slate-500 font-mono">
                    ↳ Result: <strong className="text-indigo-600">{st.intermediateResult}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Answer Banner */}
      {finalAnswer && (
        <div className="my-3.5 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Final Calculated Answer:
              </span>
              <span className="text-sm font-extrabold text-emerald-950 font-mono">
                {finalAnswer}
              </span>
            </div>
          </div>
          {units && (
            <span className="px-2.5 py-1 bg-white rounded-lg border border-emerald-200 text-xs font-bold text-emerald-700 shadow-2xs font-mono">
              Units: {units}
            </span>
          )}
        </div>
      )}

      {/* Engineering Interpretation */}
      {interpretation && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Interpretation:</strong> {interpretation}
          </p>
        </div>
      )}
    </div>
  );
}
