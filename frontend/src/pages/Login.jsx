import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Login() {
  useDocumentTitle("Sign In", "Sign in to your StudyMate AI student dashboard.");
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    location.state?.from
      ? "Your session has expired. Please sign in again to continue."
      : ""
  );

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await authService.login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setLoading(true);
    setError("");
    const demoEmail = "demo.student@studymate.ai";
    const demoPassword = "studymate123";
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      // Attempt login first
      await authService.login(demoEmail, demoPassword);
      navigate("/dashboard");
    } catch (loginErr) {
      // If demo user does not exist yet on backend, register it
      try {
        await authService.register("Alex Johnson", demoEmail, demoPassword);
        navigate("/dashboard");
      } catch (regErr) {
        setError(regErr.message || "Failed to initialize demo account.");
      }
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

        {/* Feature Highlights */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            Empowering 20,000+ Students Worldwide
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Master complex subjects in half the study time.
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Upload course lecture slides, textbooks, and syllabus PDFs. Ask questions, generate instant chapter summaries, and practice realistic exam quizzes.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Real Express & MongoDB backend session synchronization",
              "Instant AI chapter summaries & key concept cards",
              "Interactive quizzes with explanations tailored to your notes",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial card */}
        <div className="relative z-10 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <p className="text-xs text-slate-300 italic">
            "StudyMate AI transformed my exam prep. The instant quizzes and chapter summaries cut down my revision time by at least 50%."
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
              SR
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Sarah R. • Computer Science Major
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white text-slate-900">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              StudyMate <span className="text-indigo-600">AI</span>
            </span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to resume your active study sessions
            </p>
          </div>

          {/* Quick Demo Login Pill */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-900">Quick Testing?</p>
              <p className="text-[11px] text-indigo-700">One-click sign in with demo student profile</p>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm transition-colors shrink-0 disabled:opacity-50"
            >
              Demo Sign In
            </button>
          </div>

          {error && (
            <div
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="student@university.edu"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In to StudyMate
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Phase 2 Express & MongoDB Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}