import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Mail, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ForgotPassword() {
  useDocumentTitle("Forgot Password", "Reset your StudyMate AI student password.");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans">
      {/* Left Column: Visual AI / Educational Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 flex-col justify-between">
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/40">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              StudyMate <span className="text-indigo-400">AI</span>
            </span>
            <span className="block text-xs uppercase tracking-wider text-slate-400">
              Personalized Learning Intelligence
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="relative z-10 my-auto max-w-md space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Account Recovery & Security Assurance
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Forgotten your credentials? Our secure account recovery system delivers short-lived, single-use cryptographic tokens directly to your registered academic email.
          </p>
          <div className="space-y-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>30-minute single-use secure reset tokens</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automatic session revocation across all active devices</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Resend Email Infrastructure Active</span>
          <span>© 2026 StudyMate AI</span>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white text-slate-900">
        <div className="w-full max-w-md space-y-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Reset your password
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your email address and we will send you secure recovery instructions.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-slate-900 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Check Your Inbox
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account with <strong>{email}</strong> is registered with StudyMate AI, we have dispatched a single-use password reset link. Please check your spam folder if it doesn't arrive within a few minutes.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                >
                  Try another email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="student@university.edu"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={ArrowRight}
                iconPosition="right"
              >
                Send Password Reset Link
              </Button>
            </form>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Anti-Enumeration Protection Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
