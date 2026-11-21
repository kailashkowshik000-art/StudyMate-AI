import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function Toast({
  message,
  type = "success",
  isOpen,
  onClose,
  duration = 3000,
}) {
  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-200 bg-white text-slate-800",
    error: "border-rose-200 bg-white text-slate-800",
    info: "border-indigo-200 bg-white text-slate-800",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      {icons[type] || icons.info}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        aria-label="Close notification"
        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
