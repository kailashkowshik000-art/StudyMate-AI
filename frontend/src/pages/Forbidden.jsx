import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Home, LogIn } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Forbidden() {
  useDocumentTitle("403 Access Forbidden", "You do not have permission to access this resource.");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center sm:p-10">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          Error 403
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Access Restricted
        </h1>

        <p className="text-slate-600 text-sm mb-8 leading-relaxed">
          You don't have authorization to view this document or learning resource. If you believe this is an error, please verify you are signed into the correct student account.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Home className="w-4 h-4" />
            My Dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            <LogIn className="w-4 h-4" />
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
