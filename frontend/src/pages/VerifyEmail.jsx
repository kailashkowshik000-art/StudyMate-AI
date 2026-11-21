import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function VerifyEmail() {
  useDocumentTitle("Verify Email", "Confirm your StudyMate AI student account email address.");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState(token ? "verifying" : "idle");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const executeVerification = async () => {
      setStatus("verifying");
      try {
        const res = await authService.verifyEmail(token);
        setStatus("success");
        setMessage(res.message || "Your email address has been successfully verified!");
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setMessage(err.message || "Verification link is invalid or has already been used.");
      }
    };

    executeVerification();
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    try {
      await authService.resendVerification(resendEmail.trim());
      setResendSuccess(true);
    } catch (err) {
      alert("Failed to send verification email: " + err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans">
      {/* Left Column: Visual AI Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-12 flex-col justify-between">
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

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

        <div className="relative z-10 my-auto max-w-md space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Academic Email Verification
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Verifying your email confirms ownership of your student account and activates all AI features including multi-format document processing, study plans, and interactive quizzes.
          </p>
          <div className="space-y-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full access to Claude/Gemini AI Tutor and RAG</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cloud document persistence via Cloudflare R2</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Resend Email Infrastructure Active</span>
          <span>© 2026 StudyMate AI</span>
        </div>
      </div>

      {/* Right Column: Verification Content */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white text-slate-900">
        <div className="w-full max-w-md space-y-6">
          {/* Status: Verifying in progress */}
          {status === "verifying" && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Verifying your email...
              </h2>
              <p className="text-xs text-slate-500">
                Please wait while we validate your cryptographic verification token.
              </p>
            </div>
          )}

          {/* Status: Success */}
          {status === "success" && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Email Verified!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {message || "Your email address has been successfully verified. Your StudyMate AI account is now fully active."}
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigate("/dashboard")}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {/* Status: Expired or Error */}
          {(status === "expired" || status === "error" || status === "idle") && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {status === "expired"
                    ? "Verification Link Expired"
                    : status === "error"
                    ? "Invalid Verification Link"
                    : "Verify Your Email"}
                </h2>
                <p className="text-xs text-slate-500">
                  {status === "expired"
                    ? "Verification links expire after 24 hours. Request a new verification link below."
                    : status === "error"
                    ? "This link is invalid or has already been used. You can request a fresh link below."
                    : "Enter your registered email address to receive a verification link."}
                </p>
              </div>

              {resendSuccess ? (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Verification Email Dispatched
                  </div>
                  <p>
                    If an account with that email exists, we have sent a fresh verification link. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="student@university.edu"
                    icon={Mail}
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    loading={resendLoading}
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Resend Verification Email
                  </Button>
                </form>
              )}

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Single-Use SHA-256 Verified Token</span>
          </div>
        </div>
      </div>
    </div>
  );
}
