import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  FileText,
  GraduationCap,
  Award,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Layers,
  AlertCircle,
  ThumbsUp,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { analyticsService } from "../services/analyticsService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Progress() {
  useDocumentTitle("Analytics & Progress", "Track study time, streaks, and concept mastery.");
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [res, acts] = await Promise.all([
          analyticsService.getAnalytics(),
          analyticsService.getActivities(15),
        ]);
        setData(res);
        setActivities(acts || []);
      } catch (err) {
        console.error("Failed to load progress analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const stats = data?.stats || {
    totalDocuments: 0,
    studyStreakDays: 0,
    totalStudyHours: 0,
    weeklyActivity: [
      { day: "Mon", minutes: 30, target: 45 },
      { day: "Tue", minutes: 45, target: 45 },
      { day: "Wed", minutes: 60, target: 45 },
      { day: "Thu", minutes: 20, target: 45 },
      { day: "Fri", minutes: 50, target: 45 },
      { day: "Sat", minutes: 35, target: 45 },
      { day: "Sun", minutes: 40, target: 45 },
    ],
  };

  const performance = data?.performance || {
    totalQuizzes: 0,
    averageScore: 0,
    highestScore: 0,
    totalQuestionsAnswered: 0,
    strongTopics: [],
    weakTopics: [],
    topicBreakdown: [],
  };

  const weeklyActivity =
    stats.weeklyActivity && stats.weeklyActivity.length > 0
      ? stats.weeklyActivity
      : [
          { day: "Mon", minutes: 30, target: 45 },
          { day: "Tue", minutes: 45, target: 45 },
          { day: "Wed", minutes: 60, target: 45 },
          { day: "Thu", minutes: 20, target: 45 },
          { day: "Fri", minutes: 50, target: 45 },
          { day: "Sat", minutes: 35, target: 45 },
          { day: "Sun", minutes: 40, target: 45 },
        ];

  const maxMinutes = Math.max(...weeklyActivity.map((d) => d.minutes), 60);

  return (
    <div className="space-y-7 pb-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Study Analytics & Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time tracking of retention scores, weak topics, and active study consistency
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/flashcards">
            <Button variant="outline" size="sm" icon={Layers}>
              Flashcards
            </Button>
          </Link>
          <Link to="/quiz">
            <Button variant="primary" size="sm" icon={GraduationCap}>
              Take Knowledge Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Accuracy */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Average Quiz Score
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {performance.averageScore}%
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                performance.averageScore >= 80
                  ? "bg-emerald-500"
                  : performance.averageScore >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${Math.max(performance.averageScore, 5)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Highest recorded: {performance.highestScore}%
          </p>
        </Card>

        {/* Metric 2: Documents Studied */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Indexed Documents
            </span>
            <span className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats.totalDocuments}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Ready for RAG chat & quizzes
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Lecture notes, slides, and syllabus PDFs
          </p>
        </Card>

        {/* Metric 3: Quizzes Completed */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Quizzes Solved
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <GraduationCap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {performance.totalQuizzes}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            {performance.totalQuestionsAnswered} total questions answered
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Topic retention assessments
          </p>
        </Card>

        {/* Metric 4: Study Streak */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Study Streak
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-500">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>{stats.studyStreakDays}</span>
            <span className="text-sm font-bold text-amber-500">
              {stats.studyStreakDays > 0 ? "Days Fire 🔥" : "Days"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{stats.totalStudyHours} hours logged overall</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Target: {data?.profile?.dailyStudyTarget || 45} mins/day
          </p>
        </Card>
      </div>

      {/* WEAK & STRONG TOPICS INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Topics (Needs Revision) */}
        <Card padding="md" className="space-y-4 bg-white border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-slate-900">
                Weak Topics (&lt;60% Accuracy)
              </h3>
            </div>
            <Badge variant="danger">
              {performance.weakTopics?.length || 0} Topics
            </Badge>
          </div>

          {performance.weakTopics && performance.weakTopics.length > 0 ? (
            <div className="space-y-3">
              {performance.weakTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{topic}</p>
                    <p className="text-[11px] text-rose-600 font-medium">
                      High revision recommendation
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs bg-rose-600 hover:bg-rose-700"
                    onClick={() => navigate(`/chat?topic=${encodeURIComponent(topic)}`)}
                  >
                    Revise with AI
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No weak topics recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Keep testing your skills in quizzes to pinpoint concepts needing revision.
              </p>
            </div>
          )}
        </Card>

        {/* Strong Topics (Mastered >= 80%) */}
        <Card padding="md" className="space-y-4 bg-white border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Strong Topics (≥80% Accuracy)
              </h3>
            </div>
            <Badge variant="success">
              {performance.strongTopics?.length || 0} Mastered
            </Badge>
          </div>

          {performance.strongTopics && performance.strongTopics.length > 0 ? (
            <div className="space-y-3">
              {performance.strongTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{topic}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Strong conceptual mastery
                    </p>
                  </div>
                  <Badge variant="success">Mastered</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Sparkles className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Not enough quiz data yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Complete more quizzes to identify your strongest subjects!
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Middle Split: Weekly Activity Chart + Study Streak Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Bar Chart (CSS-based) */}
        <Card padding="md" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weekly Study Time
              </h3>
              <p className="text-xs text-slate-500">
                Minutes logged per day (Target: {data?.profile?.dailyStudyTarget || 45} mins/day)
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
              {stats.totalStudyHours} hrs logged
            </span>
          </div>

          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 px-2">
              {weeklyActivity.map((day) => {
                const heightPercent = Math.min(
                  100,
                  Math.round((day.minutes / maxMinutes) * 100)
                );
                return (
                  <div
                    key={day.day}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                  >
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.minutes}m
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-xl h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 group-hover:opacity-85 ${
                          day.minutes >= day.target
                            ? "bg-indigo-600"
                            : "bg-indigo-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* 7-Day Consistency Tracker */}
        <Card padding="md" className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Habit Streak Tracker
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Study daily to maintain your active learning streak
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1.5 my-auto py-4 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
              const active = i < (stats.studyStreakDays % 7 || (stats.studyStreakDays > 0 ? 7 : 0));
              return (
                <div key={i} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400">{d}</span>
                  <div
                    className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center mx-auto shadow-sm ${
                      active
                        ? "bg-amber-500 text-white shadow-amber-500/30"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {active ? "✓" : "·"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/60 text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1">
              🔥 Streak: {stats.studyStreakDays} Day{stats.studyStreakDays === 1 ? "" : "s"}
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {stats.studyStreakDays >= 3
                ? "Excellent consistency! Spaced review improves long-term recall by up to 200%."
                : "Complete a quiz or review flashcards today to grow your streak!"}
            </p>
          </div>
        </Card>
      </div>

      {/* Real Activity Feed */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Recent Learning Activity Log
          </h3>
          <span className="text-xs text-slate-400">Chronological history</span>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No activities recorded yet. Read a document, ask AI chat questions, or review flashcards to see them logged here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {activities.map((act) => (
              <div
                key={act.activityId || act._id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {act.activityType?.includes("quiz") ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : act.activityType?.includes("summary") ? (
                      <Sparkles className="w-4 h-4" />
                    ) : act.activityType?.includes("flashcard") ? (
                      <Layers className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {act.topic || act.activityType?.replace("_", " ")}
                    </p>
                    <p className="text-slate-400">
                      {act.activityType} • {act.duration || 1} min
                    </p>
                  </div>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0">
                  {act.createdAt
                    ? new Date(act.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recently"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}