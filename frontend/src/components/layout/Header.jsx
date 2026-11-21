import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Bell,
  Search,
  Sparkles,
  User,
  ShieldCheck,
} from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const routeTitles = {
  "/dashboard": "Dashboard Overview",
  "/documents": "Document Management",
  "/chat": "AI Study Assistant",
  "/summary": "Smart Summary Generator",
  "/quiz": "Interactive Knowledge Quiz",
  "/flashcards": "Spaced Repetition Flashcards",
  "/progress": "Study Analytics & Progress",
  "/settings": "Account & AI Preferences",
};

export default function Header({ onOpenMobileMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && notificationsOpen) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notificationsOpen]);

  const currentTitle = routeTitles[location.pathname] || "StudyMate AI";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-slate-600 rounded-xl hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Page Title */}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {currentTitle}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            AI-Powered Personalized Learning System
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick AI Action Link */}
        <Link
          to="/chat"
          className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick Ask</span>
        </Link>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-slate-500 rounded-xl hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Toggle notifications menu"
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2"
              role="region"
              aria-label="Notification center"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              <div className="py-2 space-y-2">
                <Link
                  to="/flashcards"
                  onClick={() => setNotificationsOpen(false)}
                  className="block p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-800">Spaced Repetition Review</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Check for daily flashcards scheduled for review.</p>
                </Link>
                <Link
                  to="/documents"
                  onClick={() => setNotificationsOpen(false)}
                  className="block p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-800">Document Processing</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Asynchronous vector chunking and embeddings active.</p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <Link
          to="/settings"
          className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || "Student User"}
            </span>
            <span className="block text-[11px] text-slate-500 leading-tight">
              Active Learner
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
