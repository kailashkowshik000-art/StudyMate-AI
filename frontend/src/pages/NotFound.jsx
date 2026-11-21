import React from "react";
import { Link } from "react-router-dom";
import { FileQuestion, Home, ArrowLeft, BookOpen, HelpCircle } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("404 Page Not Found", "The requested page could not be found on StudyMate AI.");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center sm:p-10">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <FileQuestion className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          Error 404
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Page Not Found
        </h1>

        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          The study material, quiz or page you're searching for doesn't exist, has been moved, or the link is incorrect.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Quick Study Destinations
          </p>
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-indigo-600">
            <Link to="/documents" className="flex items-center gap-1 hover:underline">
              <BookOpen className="w-3.5 h-3.5" /> Documents
            </Link>
            <span className="text-slate-300">•</span>
            <Link to="/help" className="flex items-center gap-1 hover:underline">
              <HelpCircle className="w-3.5 h-3.5" /> Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
