import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingFallback({ message = "Loading StudyMate AI..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Preparing your personalized learning tools</p>
    </div>
  );
}
