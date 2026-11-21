import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Mail, ArrowLeft, MessageSquare, Send, CheckCircle2, ShieldCheck } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Contact() {
  useDocumentTitle("Contact Support", "Get in touch with the StudyMate AI team.");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("support");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate contact dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
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
                Support & Contact
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
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            Student & University Support
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How can we help your learning journey?
          </h1>
          <p className="text-sm text-slate-400">
            Have questions about StudyMate AI features, document processing, or privacy rights? We're here to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" /> Academic Inquiries
            </h3>
            <p className="text-xs text-slate-400">Questions regarding course document processing or university pilots:</p>
            <p className="text-xs font-semibold text-indigo-400">support@studymate.ai</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Privacy & Data Desk
            </h3>
            <p className="text-xs text-slate-400">Requests regarding data portability, erasure, or privacy policies:</p>
            <p className="text-xs font-semibold text-emerald-400">privacy@studymate.ai</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" /> Technical Feedback
            </h3>
            <p className="text-xs text-slate-400">Bug reports, feature suggestions, or AI note accuracy feedback:</p>
            <p className="text-xs font-semibold text-violet-400">feedback@studymate.ai</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/80 max-w-2xl">
          {submitted ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Message Dispatched!</h3>
              <p className="text-xs text-slate-400">
                Thank you for reaching out. Our academic support desk will review your inquiry and follow up at <strong>{email}</strong> shortly.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Send an inquiry</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Inquiry Topic
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="support">Academic & Document Processing Support</option>
                  <option value="technical">Technical Bug or Error Report</option>
                  <option value="privacy">Privacy & Data Subject Request</option>
                  <option value="feedback">Product Improvement Idea</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our educational team assist you?"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={Send}
                iconPosition="right"
              >
                Send Message
              </Button>
            </form>
          )}
        </div>
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
