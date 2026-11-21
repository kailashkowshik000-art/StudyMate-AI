import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Sparkles,
  GraduationCap,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  X,
  BookOpen,
  Flame,
} from "lucide-react";
import { authService } from "../../services/authService";
import { analyticsService } from "../../services/analyticsService";

const navItems = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "My Documents", to: "/documents", icon: FolderOpen },
  { name: "AI Chat", to: "/chat", icon: MessageSquare },
  { name: "Summary", to: "/summary", icon: Sparkles },
  { name: "Quiz & Exams", to: "/quiz", icon: GraduationCap },
  { name: "Flashcards", to: "/flashcards", icon: Layers },
  { name: "Progress", to: "/progress", icon: BarChart3 },
  { name: "Settings", to: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchStreak = async () => {
      try {
        const data = await analyticsService.getAnalytics();
        if (mounted && data?.stats?.studyStreakDays !== undefined) {
          setStreakDays(data.stats.studyStreakDays);
        }
      } catch (err) {
        // Fallback to 0 if disconnected
      }
    };
    fetchStreak();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    if (onClose) onClose();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800
          transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/80">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                StudyMate <span className="text-indigo-400">AI</span>
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400 -mt-1">
                Study Companion
              </span>
            </div>
          </NavLink>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Study Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Study Streak Card */}
        <div className="px-4 py-3 mx-3 mb-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Daily Streak</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              🔥 {streakDays} {streakDays === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, (streakDays / 7) * 100))}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {streakDays > 0 ? "Keep studying to maintain streak!" : "Complete a quiz to start streak"}
          </p>
        </div>

        {/* Logout Section */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
