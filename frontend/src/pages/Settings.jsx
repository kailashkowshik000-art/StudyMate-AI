import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Bell,
  Sliders,
  Moon,
  Sun,
  Shield,
  LogOut,
  CheckCircle2,
  Lock,
  Sparkles,
  Target,
  Clock,
  BookOpen,
  Award,
  AlertCircle,
  ThumbsUp,
  Laptop,
  Globe,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Toast from "../components/common/Toast";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Modal";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { accountService } from "../services/accountService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Settings() {
  useDocumentTitle("Account Settings", "Manage preferences, active sessions, and data privacy.");
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [name, setName] = useState(user?.name || "Student");
  const [email, setEmail] = useState(user?.email || "student@university.edu");
  const [major, setMajor] = useState(user?.major || "Computer Science");
  const [toastMessage, setToastMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Learning Profile States (Phase 4)
  const [studyGoals, setStudyGoals] = useState("");
  const [preferredStudyTime, setPreferredStudyTime] = useState("evening");
  const [dailyStudyTarget, setDailyStudyTarget] = useState(45);
  const [currentSubjectsInput, setCurrentSubjectsInput] = useState("");
  const [strongTopics, setStrongTopics] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);

  // AI & Study Preferences
  const [aiTone, setAiTone] = useState("balanced");
  const [aiDifficulty, setAiDifficulty] = useState("college");

  // Phase 8.2: Authentication & Session Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Phase 8.4: Privacy, Data Export & Account Deletion States
  const [securityOverview, setSecurityOverview] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const activeSessions = await authService.getSessions();
      setSessions(activeSessions);
    } catch (err) {
      console.warn("Could not load active sessions", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSecurityOverview = async () => {
    try {
      const data = await accountService.getSecurityOverview();
      setSecurityOverview(data);
    } catch (err) {
      console.warn("Could not load security overview", err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadSecurityOverview();
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await accountService.exportData();
      setToastMessage("Data export archive downloaded successfully!");
    } catch (err) {
      setToastMessage("Data export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    if (e) e.preventDefault();
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Password is required to confirm account deletion.");
      return;
    }
    if (deleteConfirmationText !== "DELETE MY ACCOUNT") {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await accountService.deleteAccount(deletePassword, deleteConfirmationText);
      setShowDeleteModal(false);
      navigate("/register");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password cannot be the same as your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordSuccess(
        "Password changed successfully! You will be redirected to sign in with your new password."
      );
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await authService.revokeSession(sessionId);
      setToastMessage("Session revoked successfully.");
      await loadSessions();
    } catch (err) {
      setToastMessage("Failed to revoke session: " + err.message);
    }
  };

  const handleLogoutAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to sign out of all devices? You will need to sign in again."
      )
    ) {
      return;
    }
    setIsRevokingAll(true);
    try {
      await authService.logoutAll();
      navigate("/login");
    } catch (err) {
      setToastMessage("Failed to sign out of all devices: " + err.message);
      setIsRevokingAll(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await profileService.getProfile();
        if (profile) {
          setStudyGoals(profile.studyGoals || "");
          setPreferredStudyTime(profile.preferredStudyTime || "evening");
          setDailyStudyTarget(profile.dailyStudyTarget || 45);
          if (Array.isArray(profile.currentSubjects)) {
            setCurrentSubjectsInput(profile.currentSubjects.join(", "));
          }
          setStrongTopics(profile.strongTopics || []);
          setWeakTopics(profile.weakTopics || []);

          if (profile.learningPreferences) {
            if (profile.learningPreferences.aiTone) {
              setAiTone(profile.learningPreferences.aiTone);
            }
            if (profile.learningPreferences.aiDifficulty) {
              setAiDifficulty(profile.learningPreferences.aiDifficulty);
            }
          }
        }
      } catch (err) {
        console.error("Could not load learning profile", err);
      }
    };
    loadProfile();
  }, []);

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const subjectsArray = currentSubjectsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Save Learning Profile & Display Name in Backend (Phase 4/5)
      await profileService.updateProfile({
        name: name.trim(),
        studyGoals,
        preferredStudyTime,
        dailyStudyTarget: Number(dailyStudyTarget),
        currentSubjects: subjectsArray,
        learningPreferences: {
          aiTone,
          aiDifficulty,
        },
      });

      // Update local storage user record
      const updatedUser = await authService.updateProfile({
        name: name.trim(),
        email,
        major,
      });
      setUser(updatedUser);

      setToastMessage("All settings & learning profile saved successfully!");
    } catch (err) {
      setToastMessage("Failed to save settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <Toast
        isOpen={!!toastMessage}
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Learning Profile & AI Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure your study targets, schedule preferences, and AI tutor behavior
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Profile Card */}
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Profile</h3>
              <p className="text-xs text-slate-500">Your account identity</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/20 shrink-0">
              {name ? name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-slate-900">{name}</h4>
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <p className="text-xs text-slate-500">{email}</p>
                {user?.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await authService.resendVerification(email);
                        setToastMessage("Verification email dispatched! Please check your inbox.");
                      } catch (err) {
                        setToastMessage("Failed to resend: " + err.message);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <Mail className="w-3 h-3 text-amber-500" /> Resend Verification
                  </button>
                )}
                {securityOverview?.lastLoginAt && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    • Last login: {new Date(securityOverview.lastLoginAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
            />
            <Input
              label="Academic Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
            />
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Current Major / Field of Study
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g. Computer Science, Molecular Biology"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </Card>

        {/* Learning Profile & Study Goals Card (Phase 4) */}
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Personalized Learning Profile
              </h3>
              <p className="text-xs text-slate-500">
                Helps StudyMate AI tailor study plans and recommendations to your schedule
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Academic & Exam Goals
              </label>
              <textarea
                value={studyGoals}
                onChange={(e) => setStudyGoals(e.target.value)}
                placeholder="e.g. Score >90% on Midterms, Master Algorithm Analysis and Organic Chemistry"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Daily Study Target (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="360"
                    step="5"
                    value={dailyStudyTarget}
                    onChange={(e) => setDailyStudyTarget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-slate-500 font-medium">mins/day</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Preferred Study Time
                </label>
                <select
                  value={preferredStudyTime}
                  onChange={(e) => setPreferredStudyTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="morning">Morning (6 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                  <option value="evening">Evening (5 PM - 9 PM)</option>
                  <option value="night">Night (9 PM - 2 AM)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Current Subjects & Courses (comma-separated)
              </label>
              <input
                type="text"
                value={currentSubjectsInput}
                onChange={(e) => setCurrentSubjectsInput(e.target.value)}
                placeholder="e.g. Data Structures, Machine Learning, Operating Systems"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Read-Only Intelligence Topics */}
            {(weakTopics.length > 0 || strongTopics.length > 0) && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  AI-Detected Topic Profiling
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Weak Topics (&lt;60% accuracy)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {weakTopics.length > 0 ? (
                        weakTopics.map((t, idx) => (
                          <Badge key={idx} variant="danger">
                            {t}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">None detected</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mb-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Strong Topics (≥80% accuracy)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {strongTopics.length > 0 ? (
                        strongTopics.map((t, idx) => (
                          <Badge key={idx} variant="success">
                            {t}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">None detected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI Assistant Preferences */}
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                AI Tutor Preferences
              </h3>
              <p className="text-xs text-slate-500">
                Tune how Gemini formats explanations and study answers
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Response Detail Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "concise", label: "Concise", desc: "Short bullet points" },
                  { id: "balanced", label: "Balanced", desc: "Recommended mixture" },
                  { id: "in-depth", label: "In-Depth", desc: "Full derivations & code" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAiTone(item.id)}
                    className={`
                      p-3 rounded-xl border text-left transition-all
                      ${
                        aiTone === item.id
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600 font-semibold"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }
                    `}
                  >
                    <span className="block text-xs font-bold text-slate-900">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Target Academic Level
              </label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="highschool">High School / AP Prep</option>
                <option value="college">Undergraduate Degree (Bachelor&apos;s)</option>
                <option value="grad">Graduate / Postgraduate Research</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Account Security & Session Management (Phase 8.2) */}
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Account Security & Session Management
                </h3>
                <p className="text-xs text-slate-500">
                  Rotate password, review active sessions, and protect your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> HTTP-Only Cookies Active
              </span>
            </div>
          </div>

          {/* Password Change Sub-section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Change Account Password</h4>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={KeyRound}
                loading={isChangingPassword}
                onClick={handleChangePassword}
              >
                Update Password
              </Button>
            </div>
          </div>

          {/* Active Sessions Sub-section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">Active Login Sessions</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Refresh active sessions"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={isRevokingAll}
                  onClick={handleLogoutAll}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                >
                  Sign Out All Devices
                </Button>
              </div>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No other active sessions detected.</p>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.sessionId}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                      sess.isCurrent
                        ? "bg-indigo-50/40 border-indigo-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          sess.isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate max-w-xs">
                            {sess.userAgent || "Desktop Browser"}
                          </span>
                          {sess.isCurrent && (
                            <Badge variant="success">Current Session</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-2">
                          <span>IP: {sess.ipAddress}</span>
                          <span>•</span>
                          <span>
                            Last active:{" "}
                            {new Date(sess.lastActivity).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.sessionId)}
                        className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] shrink-0"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Data Privacy, Compliance & Account Deletion (Phase 8.4) */}
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Data Privacy, Portability & Legal Infrastructure
                </h3>
                <p className="text-xs text-slate-500">
                  Manage personal data archives, review consent status, and control your account lifecycle
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                Policy v1.0.0
              </span>
            </div>
          </div>

          {/* Section 1: Data Portability & Archive Export */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  Personal Data Portability Archive
                </h4>
                <p className="text-xs text-slate-500 max-w-xl">
                  Download a complete, machine-readable JSON archive of all your study materials, lecture documents, AI chapter notes, quiz questions, flashcards, review exams, and chat tutor dialogues. High-dimensional vector embeddings and internal credentials are automatically sanitized.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Download}
                loading={isExporting}
                onClick={handleExportData}
                className="shrink-0"
              >
                {isExporting ? "Generating Archive..." : "Export My Data (JSON)"}
              </Button>
            </div>
          </div>

          {/* Section 2: Legal Agreements & Compliance Overview */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Legal Agreements & Platform Consent
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Terms of Service</span>
                  <span className="text-[11px] text-slate-500">Agreement v1.0.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Accepted
                  </span>
                  <Link
                    to="/terms"
                    target="_blank"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Read Terms of Service"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Privacy & AI Data Policy</span>
                  <span className="text-[11px] text-slate-500">Zero-model retraining guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Accepted
                  </span>
                  <Link
                    to="/privacy"
                    target="_blank"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Read Privacy Policy"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span>Quick Navigation:</span>
              <Link to="/help" target="_blank" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                Help & FAQ <ExternalLink className="w-3 h-3" />
              </Link>
              <Link to="/contact" target="_blank" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                Support & Contact <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Section 3: Danger Zone (Account Deletion) */}
          <div className="pt-4 border-t border-rose-100 space-y-3">
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Danger Zone: Permanent Account Deletion
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed max-w-xl">
                  Permanently erase your account and all associated data. This cascades to completely delete all your uploaded lecture documents from Cloudflare R2 cloud storage, all AI notes, quizzes, flashcards, exams, chat histories, and revokes all active sessions. This action is irreversible.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  setDeletePassword("");
                  setDeleteConfirmationText("");
                  setDeleteError("");
                  setShowDeleteModal(true);
                }}
                className="text-rose-700 bg-rose-100/80 hover:bg-rose-200 border border-rose-300 text-xs font-semibold shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </Card>

        {/* Save button and Logout */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            icon={LogOut}
            onClick={handleLogout}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
          >
            Sign Out
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSaving}
            className="shadow-md shadow-indigo-600/20"
          >
            {isSaving ? "Saving Settings..." : "Save All Changes"}
          </Button>
        </div>
      </form>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeletingAccount) {
            setShowDeleteModal(false);
            setDeleteError("");
          }
        }}
        title="Permanently Delete Account"
        subtitle="This action cannot be undone. Please read carefully."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> Warning: Immediate &amp; Permanent Erasure
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700">
              <li>All uploaded documents will be deleted from Cloudflare R2 cloud storage.</li>
              <li>All parsed chunks, AI summaries, quizzes, and flashcards will be purged.</li>
              <li>All chat tutor conversations, study plans, and learning analytics will be wiped.</li>
              <li>All active login sessions and authentication cookies will be invalidated.</li>
            </ul>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-medium">
              {deleteError}
            </div>
          )}

          <div className="space-y-3 pt-1">
            <Input
              label="Your Current Password"
              type="password"
              placeholder="Enter your account password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeletingAccount}
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Type <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE MY ACCOUNT</span> to confirm
              </label>
              <input
                type="text"
                placeholder="DELETE MY ACCOUNT"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                disabled={isDeletingAccount}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeletingAccount}
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Trash2}
              loading={isDeletingAccount}
              disabled={
                isDeletingAccount ||
                !deletePassword ||
                deleteConfirmationText !== "DELETE MY ACCOUNT"
              }
              onClick={handleDeleteAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
            >
              {isDeletingAccount ? "Deleting Everything..." : "Permanently Delete My Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}