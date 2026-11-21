import React, { useEffect, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Activity,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";

export default function MermaidDiagram({
  title = "System Diagram",
  mermaidCode = "",
  description = "",
  components = [],
  workflow = [],
  technicalExplanation = "",
  diagramType = "architecture",
}) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState("");
  const [renderError, setRenderError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!mermaidCode || typeof window === "undefined") return;

      try {
        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: "default",
            securityLevel: "loose",
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
          });

          const uniqueId = `mermaid_${Math.random().toString(36).slice(2, 9)}`;
          const { svg } = await window.mermaid.render(uniqueId, mermaidCode);
          if (isMounted) {
            setSvgContent(svg);
            setRenderError(false);
          }
        } else {
          setRenderError(true);
        }
      } catch (err) {
        console.warn("[Mermaid] Render exception, using structured fallback:", err);
        if (isMounted) setRenderError(true);
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [mermaidCode]);

  const handleCopyCode = () => {
    if (!mermaidCode) return;
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.15));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden my-4 transition-all hover:border-slate-300">
      {/* Diagram Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900 leading-tight">{title}</h5>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {diagramType}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-500 w-10 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors"
            title="Expand Fullscreen"
            aria-label="Expand Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors"
            title="Copy Mermaid Syntax"
            aria-label="Copy Mermaid Syntax"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Diagram Canvas Body */}
      <div className="relative overflow-auto p-6 bg-slate-50/40 min-h-[220px] flex items-center justify-center">
        {!renderError && svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center transition-transform duration-150"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          /* Structured SVG & Vector Fallback Card */
          <div className="w-full max-w-2xl py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {(components.length > 0
                ? components
                : ["Input Signals", "Core Processor Unit", "Protocol Bus Interface", "Output Display"]
              ).map((comp, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs text-center relative group hover:border-indigo-300 transition-all"
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 leading-snug">{comp}</p>
                </div>
              ))}
            </div>

            {/* Workflow steps connector */}
            {workflow.length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Operational Execution Flow
                </span>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {workflow.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanatory Description Footer */}
      {(description || technicalExplanation) && (
        <div className="px-5 py-3.5 bg-white border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
          {description && <p className="leading-relaxed font-medium text-slate-700">{description}</p>}
          {technicalExplanation && (
            <div className="flex items-start gap-1.5 text-slate-500">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="italic leading-relaxed">{technicalExplanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Modal View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                {title}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close Fullscreen View"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-slate-50">
              {svgContent ? (
                <div
                  className="w-full flex justify-center"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="text-center text-sm text-slate-600">{description}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
