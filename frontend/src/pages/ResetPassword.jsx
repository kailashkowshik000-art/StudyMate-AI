import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Lock, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import { authService } from "../services/authService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function ResetPassword() {
  useDocumentTitle("Reset Password", "Set a new secure password for your StudyMate AI account.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing from the URL. Please request a new link.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-100 font-sans">
      {/* Left Column: Visual Showcase */}
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
            Create Your New Password
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Ensure your account remains protected by choosing a strong, unique password of at least 8 characters.
          </p>
          <div className="space-y-2 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bcrypt salt-hashed security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automatic revocation of all previous device sessions</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Resend Email Infrastructure Active</span>
          <span>© 2026 StudyMate AI</span>
        </div>
      </div>

      {/* Right Column: Reset Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white text-slate-900">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Set new password
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter and confirm your new account password below.
            </p>
          </div>

          {!token && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Missing Reset Token
              </div>
              <p>
                No password reset token was detected in your browser URL. Please click the link directly from your email or request a new one.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="font-bold text-indigo-600 underline"
                >
                  Request a new password reset link
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-900 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Password Reset Successful!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your password has been securely updated and all previous device sessions have been revoked. Redirecting to sign in...
              </p>
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                onClick={() => navigate("/login")}
              >
                Sign In Now
              </Button>
            </div>
          ) : (
            token && (
              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters"
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter new password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Confirm & Update Password
                </Button>
              </form>
            )
          )}

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Return to Sign In
            </Link>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Single-Use Cryptographic Hash Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}
