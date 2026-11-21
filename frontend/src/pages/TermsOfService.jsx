import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Scale, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function TermsOfService() {
  useDocumentTitle("Terms of Service", "Terms and conditions for using StudyMate AI services.");
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                StudyMate <span className="text-indigo-400">AI</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                Terms of Service
              </span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5 text-indigo-400" />
            Terms of Service • Version 1.0.0
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service & User Agreement
          </h1>
          <p className="text-sm text-slate-400">
            Last updated: November 2026 • Please read carefully before using StudyMate AI.
          </p>
        </div>

        {/* Legal Disclaimer Callout */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          <strong>Review Notice:</strong> These Terms of Service outline the rules governing your use of StudyMate AI. This document is marked for formal review by qualified legal counsel prior to public commercial launch.
        </div>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Agreement to Terms</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By registering for, accessing, or using StudyMate AI ("Platform", "Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use the Service.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. Educational Use & AI Output Disclaimer</h2>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>AI Learning Companion Disclaimer</span>
            </div>
            <p>
              StudyMate AI leverages artificial intelligence (including Google Gemini) to generate document summaries, extract study topics, and generate practice questions.
            </p>
            <p>
              AI outputs are computational approximations provided solely for supplemental educational revision. AI-generated materials may contain inaccuracies, hallucinations, or incomplete derivations. StudyMate AI does not guarantee specific exam scores, course passing grades, or academic performance.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. User Responsibilities & Acceptable Use</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            When using StudyMate AI, you agree that you will not:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-2 pl-2">
            <li>Upload documents that violate third-party intellectual property or trade secrets without authorization.</li>
            <li>Use the platform for any academic dishonesty, fraudulent exam taking, or cheating that violates your university's honor code.</li>
            <li>Attempt to probe, reverse-engineer, scan, or exploit security vulnerabilities in the platform.</li>
            <li>Upload malicious files, viruses, or automated scripts designed to overwhelm platform infrastructure.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Intellectual Property & Document Ownership</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You retain full intellectual property ownership of all notes, lecture slides, and course materials you upload to StudyMate AI. We do not claim ownership over your uploaded documents. You grant StudyMate AI only the limited, temporary license necessary to parse, chunk, index, and generate study artifacts for your private account.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">5. Account Termination & Right to Erasure</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You may terminate your account and erase all associated personal data at any time via <strong>Settings &gt; Data Privacy &gt; Delete Account</strong>. StudyMate AI reserves the right to suspend or terminate accounts that violate these terms or compromise platform integrity.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">6. Limitation of Liability</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To the maximum extent permitted by applicable law, StudyMate AI and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the educational platform.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-6 space-y-2">
          <p>© 2026 StudyMate AI. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-[11px] text-slate-400">
            <Link to="/privacy" className="hover:text-indigo-400">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-indigo-400">Terms of Service</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-indigo-400">Contact</Link>
            <span>•</span>
            <Link to="/help" className="hover:text-indigo-400">Help & FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
