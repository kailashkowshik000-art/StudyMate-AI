import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Shield, ArrowLeft, Lock, FileText, Database, Trash2, Download } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function PrivacyPolicy() {
  useDocumentTitle("Privacy Policy", "Learn how StudyMate AI protects your data, documents, and account privacy.");
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                StudyMate <span className="text-indigo-400">AI</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                Privacy & Data Governance
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
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Privacy Policy • Version 1.0.0
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-sm text-slate-400">
            Last updated: November 2026 • Effective immediately across all StudyMate AI platforms.
          </p>
        </div>

        {/* Legal Disclaimer Callout */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          <strong>Review Notice:</strong> StudyMate AI is an educational technology research and study assistant. This Privacy Policy documents our operational privacy, data processing, and security practices. It is marked for review by qualified legal counsel prior to commercial SaaS launch.
        </div>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-400" /> 1. Overview & Platform Purpose
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            StudyMate AI ("StudyMate", "we", "our") is an AI-powered educational intelligence platform designed to assist students and educators in analyzing lecture materials, generating comprehensive chapter notes, and practicing interactive review exams. We are committed to transparency, student data ownership, and industry-standard security.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Database className="w-5 h-5 text-indigo-400" /> 2. Information We Collect
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            To deliver personalized learning features, we collect only the minimum necessary information:
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-2 pl-2">
            <li><strong>Account Identity:</strong> Your full name, academic/personal email address, and bcrypt-salted password hash.</li>
            <li><strong>Course Documents:</strong> Syllabi, lecture notes, and textbooks uploaded by you in PDF, DOCX, PPTX, or TXT format.</li>
            <li><strong>Learning Artifacts:</strong> AI-generated summaries, flashcard review intervals, mock exam scores, and chat messages exchanged with the AI Tutor.</li>
            <li><strong>Session & Security Telemetry:</strong> IP addresses, browser User-Agent strings, and login timestamps to enforce account security and detect unauthorized access.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-indigo-400" /> 3. Document Processing & Third-Party AI
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            When you upload course materials, they are parsed locally and indexed into searchable text chunks. Text representations are transmitted via encrypted HTTPS to Google Gemini API models solely to synthesize chapter notes, generate quiz items, and answer study queries.
          </p>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-2">
            <p><strong>Zero Model Retraining:</strong> User uploaded documents and student queries are never utilized to train or fine-tune public foundation AI models.</p>
            <p><strong>Cloud Object Storage:</strong> Documents are stored in private, non-public Cloudflare R2 buckets using signed short-lived download URLs.</p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Download className="w-5 h-5 text-indigo-400" /> 4. Your Rights: Data Export & Portability
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Under GDPR, CCPA, and global privacy frameworks, you retain complete ownership of your personal data. At any time, you can visit <strong>Settings &gt; Data Privacy</strong> to download a comprehensive JSON archive containing all your profile data, document metadata, summaries, quizzes, flashcards, study plans, and chat logs.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-rose-400" /> 5. Right to Erasure & Account Deletion
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You may permanently delete your account at any time through our deliberate self-service deletion workflow. When you confirm deletion with your password, StudyMate AI cascades an irreversible purge across all database collections and removes associated Cloudflare R2 storage objects.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">6. Educational AI Output Disclaimer</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            AI-generated summaries, practice exam questions, and tutor derivations are computational approximations provided for supplemental review. Students must verify technical solutions and theoretical formulas against primary course textbooks and instructor guidelines.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">7. Contact & Privacy Inquiries</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            For questions regarding this policy or data processing inquiries, please contact our Data Governance desk at <a href="mailto:privacy@studymate.ai" className="text-indigo-400 hover:underline">privacy@studymate.ai</a>.
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
