import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  FileText,
  FileCheck,
  Presentation,
  AlignLeft,
  Bot,
  Brain,
  Layers,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useAuth } from "../hooks/useAuth";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  useDocumentTitle(
    "AI Study Assistant & Document Learning Platform",
    "Turn PDFs, Word docs, PowerPoint decks, and text files into detailed study notes, interactive quizzes, flashcards, and personalized AI tutoring with StudyMate AI."
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-indigo-600 text-white text-xs sm:text-sm font-medium py-2 px-4 text-center">
        <span>🚀 StudyMate AI v1.0.0 is live! Powered by Gemini AI, Cloudflare R2, and BullMQ.</span>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                StudyMate <span className="text-indigo-600">AI</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#formats" className="hover:text-indigo-600 transition-colors">Supported Formats</a>
            <a href="#workflow" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <Link to="/help" className="hover:text-indigo-600 transition-colors">Help Center</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-indigo-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs sm:text-sm font-medium mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Next-Generation Multi-Format AI Learning Assistant</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              Master Any Course Material with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500">
                Intelligent AI Study Notes
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
              Upload your textbooks, lecture slides, assignments, and study notes in PDF, DOCX, PPTX, or TXT. Get instant structured summaries, practice exams, spaced-repetition flashcards, and 24/7 AI tutoring.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Start Studying Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to={isAuthenticated ? "/documents" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                View Demo Materials
              </Link>
            </div>

            {/* Quick Proof Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free multi-format document uploads
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Enterprise-grade R2 cloud storage
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Format Showcase Section */}
      <section id="formats" className="py-16 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              Unified Document Intelligence
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              One Learning Engine. All Your Formats.
            </h3>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Stop converting files back and forth. StudyMate AI extracts structured chapters, slide hierarchies, and rich text tables seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">PDF Documents</h4>
              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">.pdf</span>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Textbooks, journal papers, lecture handouts with exact page-level citations and citation grounding.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">Microsoft Word</h4>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">.docx</span>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Syllabi, project specifications, and student essays with preserved heading hierarchy and data tables.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Presentation className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">PowerPoint Decks</h4>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">.pptx</span>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Class presentation slides, module decks, bullet lists, and presenter notes mapped slide by slide.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <AlignLeft className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">Plain Text & Notes</h4>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">.txt</span>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Markdown transcripts, quick lecture notes, code cheat-sheets, and scratchpad documentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              Comprehensive Study Arsenal
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              Everything You Need to Ace Your Exams
            </h3>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Engineered with cognitive learning science: retrieval practice, spaced repetition, and interactive dialogue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">24/7 AI Tutor</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ask challenging conceptual questions. The tutor uses RAG to ground every answer in your specific uploaded documents.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">In-Depth Study Notes</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Transform 50-page readings into structured module summaries with key definitions, formulas, and high-yield concepts.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Practice Quizzes & Exams</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate customized multiple-choice tests with timed exam conditions, instant feedback, and rationale explanations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Spaced Repetition Flashcards</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automated flashcard decks scheduled using the SM-2 spaced repetition algorithm for maximum long-term memory retention.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Mastery Analytics</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track study time, quiz averages, daily streaks, and topic-specific mastery scores to pinpoint study gaps before exam day.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Privacy & Security First</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                HttpOnly cookie sessions, CSRF shielding, Cloudflare R2 encryption, and one-click GDPR/CCPA data export and deletion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / 3 Steps */}
      <section id="workflow" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              Simple 3-Step Flow
            </h2>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              From Document Upload to Exam Readiness
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <span className="text-4xl font-extrabold text-indigo-100 absolute top-4 right-6">
                01
              </span>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Upload Materials</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Drag and drop your PDF, Word, PowerPoint, or text files. Files are securely ingested into Cloudflare R2.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <span className="text-4xl font-extrabold text-indigo-100 absolute top-4 right-6">
                02
              </span>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Distributed Processing</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                BullMQ background workers extract chapters, slides, and tables, indexing semantic vectors for instant retrieval.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <span className="text-4xl font-extrabold text-indigo-100 absolute top-4 right-6">
                03
              </span>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Study & Retain</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate in-depth notes, test yourself with timed quizzes, review smart flashcards, and chat with your AI Tutor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Student CTA Section */}
      <section className="py-16 bg-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to Accelerate Your Learning?
          </h2>
          <p className="text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto mb-8">
            Join thousands of students who study smarter with StudyMate AI. Create your free account in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-indigo-600 bg-white hover:bg-indigo-50 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-indigo-700/60 hover:bg-indigo-700 border border-indigo-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>StudyMate AI</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed mb-4">
                The modern AI study companion. Transform course documents into comprehensive summaries, interactive quizzes, flashcards, and personalized tutoring.
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Secure Cookie Session • R2 Storage • BullMQ Architecture
              </p>
            </div>

            <div>
              <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
                Product
              </h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/documents" className="hover:text-white transition-colors">Documents</Link></li>
                <li><Link to="/chat" className="hover:text-white transition-colors">AI Tutor</Link></li>
                <li><Link to="/summary" className="hover:text-white transition-colors">Notes & Summaries</Link></li>
                <li><Link to="/quiz" className="hover:text-white transition-colors">Quizzes & Exams</Link></li>
                <li><Link to="/flashcards" className="hover:text-white transition-colors">Flashcards</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
                Support & Legal
              </h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center & FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} StudyMate AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-slate-400">Privacy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-slate-400">Terms</Link>
              <span>•</span>
              <Link to="/help" className="hover:text-slate-400">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
