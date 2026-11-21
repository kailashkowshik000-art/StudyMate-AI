import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  HelpCircle,
  ArrowLeft,
  FileText,
  MessageSquare,
  Sparkles,
  HelpCircle as QuizIcon,
  CreditCard,
  Shield,
  Download,
  ChevronDown,
  Mail,
  Search,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Help() {
  useDocumentTitle("Help Center & FAQ", "Find guides, answers, and troubleshooting for StudyMate AI.");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const faqs = [
    {
      id: "faq-1",
      category: "documents",
      question: "Which document file formats does StudyMate AI support?",
      answer:
        "StudyMate AI supports PDF (.pdf), Microsoft Word (.docx), PowerPoint presentations (.pptx), and plain text (.txt) files. Legacy formats (.doc, .ppt) are not supported. Uploaded documents are securely parsed, split into contextual chunks, and stored in persistent Cloudflare R2 cloud object storage.",
    },
    {
      id: "faq-2",
      category: "documents",
      question: "What is the maximum file upload size?",
      answer:
        "Currently, individual document uploads up to 25MB are supported. For large textbooks or slide decks, our multi-format processing engine automatically handles multi-page and multi-slide documents, preserving headings, lists, and tabular structure.",
    },
    {
      id: "faq-3",
      category: "chat",
      question: "How does the AI Tutor answer questions from my documents?",
      answer:
        "The AI Tutor uses Retrieval-Augmented Generation (RAG). When you ask a question, our backend searches your processed document chunks using semantic similarity, retrieves the most relevant excerpts, and provides them as grounded context to Google Gemini. This ensures factual, citation-backed answers without hallucinations.",
    },
    {
      id: "faq-4",
      category: "summaries",
      question: "How do AI Study Notes and Summaries work?",
      answer:
        "Our summary engine analyzes all chunks across your document, synthesizing them into structured notes complete with chapter overviews, core concepts, formulas or code snippets, bulleted key takeaways, and review questions. You can toggle between concise, balanced, or comprehensive in-depth study notes in your Settings.",
    },
    {
      id: "faq-5",
      category: "quiz",
      question: "How are quizzes generated and scored?",
      answer:
        "Quizzes are dynamically generated directly from your uploaded materials. You can choose question count and difficulty level. Each question includes immediate corrective feedback and conceptual rationales. Quiz results automatically update your Learning Analytics and identify strong vs. weak topics.",
    },
    {
      id: "faq-6",
      category: "flashcards",
      question: "How does the spaced repetition algorithm work for flashcards?",
      answer:
        "Flashcards use an adaptive spaced-repetition algorithm inspired by SuperMemo SM-2. Cards you find difficult are scheduled for more frequent review, while mastered cards are spaced further apart to maximize long-term memory retention before exams.",
    },
    {
      id: "faq-7",
      category: "privacy",
      question: "Are my uploaded documents used to train AI models?",
      answer:
        "No. We enforce strict data privacy and zero-model retraining policies. Your uploaded lecture slides, research papers, and notes are never used to train public or foundational AI models. They remain strictly confidential and tied to your authenticated account.",
    },
    {
      id: "faq-8",
      category: "privacy",
      question: "How can I export all my study data or delete my account?",
      answer:
        "Under Settings > Data Privacy & Account Actions, you can click 'Export My Data' to download a complete JSON archive of your documents, summaries, quizzes, flashcards, study plans, and chat logs. If you decide to delete your account, you can perform a permanent cascade deletion with password confirmation, which removes all your database records and R2 storage objects.",
    },
    {
      id: "faq-9",
      category: "account",
      question: "How do secure HTTP-only cookies protect my account?",
      answer:
        "StudyMate AI uses short-lived JWT access tokens and long-lived refresh tokens stored exclusively in Secure, SameSite, HTTP-only cookies. This eliminates browser localStorage token exposure and prevents Cross-Site Scripting (XSS) token theft. In addition, rotating CSRF tokens protect all state-changing API endpoints.",
    },
  ];

  const categories = [
    { id: "all", label: "All Questions" },
    { id: "documents", label: "Document Uploads" },
    { id: "chat", label: "AI Tutor & RAG" },
    { id: "summaries", label: "Notes & Summaries" },
    { id: "quiz", label: "Quizzes & Flashcards" },
    { id: "privacy", label: "Privacy & Security" },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
                Help Center & Knowledge Base
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
        {/* Title & Search */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            Frequently Asked Questions
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How can we help you today?
          </h1>
          <p className="text-sm text-slate-400">
            Find answers to common questions about document processing, AI tutoring, notes generation, and data privacy.
          </p>

          <div className="relative mt-4">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles (e.g. upload formats, RAG, export data)..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
              <p className="text-sm text-slate-400">No help articles match your search query.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="mt-3 text-xs text-indigo-400 hover:underline"
              >
                Reset search filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = !!openItems[faq.id];
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-slate-800 bg-slate-800/40 backdrop-blur-sm overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/60 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contact Support Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              <Mail className="w-4 h-4 text-indigo-400" /> Still have questions?
            </h3>
            <p className="text-xs text-slate-300">
              Our academic support team is here to assist with any questions or technical issues.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/contact"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500 space-y-2">
        <div className="flex justify-center gap-6">
          <Link to="/privacy" className="hover:text-slate-400">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-400">
            Terms of Service
          </Link>
          <Link to="/contact" className="hover:text-slate-400">
            Contact
          </Link>
          <Link to="/help" className="hover:text-slate-400">
            Help & FAQ
          </Link>
        </div>
        <p>© 2026 StudyMate AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
