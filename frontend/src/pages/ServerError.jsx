import React from "react";
import { Link } from "react-router-dom";
import { ServerCrash, RefreshCw, Home, LifeBuoy } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ServerError() {
  useDocumentTitle("500 Server Error", "An internal server error occurred on StudyMate AI.");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center sm:p-10">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ServerCrash className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          Error 500
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Server Under Pressure
        </h1>

        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          Our servers encountered an unexpected glitch while processing your learning request. No notes or documents were affected.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <Link
            to="/help"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <LifeBuoy className="w-3.5 h-3.5" /> Need assistance? Visit the Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
