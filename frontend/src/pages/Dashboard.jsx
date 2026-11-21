import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  GraduationCap,
  Sparkles,
  BarChart3,
  UploadCloud,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChevronRight,
  Award,
  BookOpen,
  Layers,
  Calendar,
  Check,
  RefreshCw,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import DocumentUploadModal from "../components/documents/DocumentUploadModal";
import Toast from "../components/common/Toast";
import { documentService } from "../services/documentService";
import { authService } from "../services/authService";
import { analyticsService } from "../services/analyticsService";
import { studyPlanService } from "../services/studyPlanService";
import { flashcardService } from "../services/flashcardService";
import { quizService } from "../services/quizService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Dashboard() {
  useDocumentTitle("Dashboard", "Your centralized study dashboard and learning overview.");
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Phase 4 Intelligence Data
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [dueFlashcardsCount, setDueFlashcardsCount] = useState(0);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [
        docs,
        analyticsData,
        recData,
        plans,
        flashcards,
        quizzes,
        activities,
      ] = await Promise.all([
        documentService.getDocuments().catch(() => []),
        analyticsService.getAnalytics().catch(() => null),
        analyticsService.getRecommendations().catch(() => null),
        studyPlanService.getStudyPlans().catch(() => []),
        flashcardService.getFlashcards({ dueOnly: true }).catch(() => []),
        quizService.getQuizzes().catch(() => []),
        analyticsService.getActivities(5).catch(() => []),
      ]);

      setDocuments(docs.slice(0, 4));
      setAnalytics(analyticsData);
      setRecommendations(recData);

      const active = plans.find((p) => p.status === "active") || plans[0] || null;
      setActivePlan(active);

      setDueFlashcardsCount(Array.isArray(flashcards) ? flashcards.length : 0);
      setRecentQuizzes(Array.isArray(quizzes) ? quizzes.slice(0, 3) : []);
      setRecentActivities(Array.isArray(activities) ? activities : []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev.slice(0, 3)]);
    setToastMessage(`"${newDoc.name || newDoc.title}" uploaded successfully!`);
    loadDashboardData();
  };

  // Toggle Task Completion in Study Plan
  const handleToggleTask = async (taskId, currentCompleted) => {
    if (!activePlan) return;
    try {
      const planId = activePlan._id || activePlan.planId;
      const updated = await studyPlanService.toggleTaskCompleted(
        planId,
        taskId,
        !currentCompleted
      );
      setActivePlan(updated);
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  // Generate Study Plan with AI
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const newPlan = await studyPlanService.generateStudyPlan({
        durationDays: 7,
        focusTopics: recommendations?.weakTopics || [],
      });
      setActivePlan(newPlan);
      setToastMessage("Personalized 7-day study plan generated!");
    } catch (err) {
      setToastMessage("Failed to generate plan: " + err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const streak = analytics?.stats?.studyStreakDays || 0;
  const avgScore = analytics?.performance?.averageScore || 0;
  const totalQuizzes = analytics?.performance?.totalQuizzes || 0;
  const totalDocs = analytics?.stats?.totalDocuments ?? documents.length;
  const totalHours = analytics?.stats?.totalStudyHours || 0;

  return (
    <div className="space-y-7 pb-8 max-w-7xl mx-auto">
      {/* Toast feedback */}
      <Toast
        isOpen={!!toastMessage}
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {streak > 0
                  ? `${streak}-Day Study Streak • Active 🔥`
                  : "Start Your Study Streak Today"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name?.split(" ")[0] || "Student"} 👋
            </h2>
            <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed">
              {recommendations?.advisorSummary ||
                "Your personalized AI study intelligence is monitoring your performance across your course documents."}
            </p>
          </div>

          {/* Quick Primary Call to Action */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              icon={UploadCloud}
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 shadow-none text-xs sm:text-sm"
            >
              Upload Material
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Sparkles}
              onClick={() => navigate("/chat")}
              className="bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 text-xs sm:text-sm"
            >
              Ask Study AI
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top 4 Real Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Stat 1: Total Documents */}
        <Card padding="md" className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Documents
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {totalDocs}
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                Ready for study
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Indexed study notes & slides</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </Card>

        {/* Stat 2: Quizzes Completed */}
        <Card padding="md" className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quizzes Taken
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {totalQuizzes}
              </span>
              <span className="text-xs font-semibold text-indigo-600 flex items-center">
                {analytics?.stats?.totalQuestionsAnswered || 0} questions
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Knowledge assessments</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
        </Card>

        {/* Stat 3: Average Quiz Score */}
        <Card padding="md" className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Quiz Score
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {avgScore}%
              </span>
              <span
                className={`text-xs font-semibold flex items-center gap-0.5 ${
                  avgScore >= 80
                    ? "text-emerald-600"
                    : avgScore >= 60
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {avgScore >= 80 ? "Strong" : avgScore >= 60 ? "Moderate" : "Needs Review"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              High: {analytics?.performance?.highestScore || 0}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </Card>

        {/* Stat 4: Study Hours / Progress */}
        <Card padding="md" className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Study Time Logged
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {totalHours}h
              </span>
              <span className="text-xs font-semibold text-indigo-600">
                {analytics?.profile?.dailyStudyTarget || 45}m target
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active learning sessions
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* PHASE 4: INTELLIGENCE ROW (Weak Topics Revision & Flashcard Due Alert) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weak Topics & Revision Recommendations (2 cols) */}
        <Card padding="md" className="lg:col-span-2 space-y-4 bg-white border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Topic Mastery & Revision Priority
                </h3>
                <p className="text-xs text-slate-500">
                  AI-detected areas based on quiz accuracy (&lt;60%)
                </p>
              </div>
            </div>
            <Link
              to="/progress"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Full Analytics
            </Link>
          </div>

          {/* Weak Topics List */}
          {recommendations?.weakTopics && recommendations.weakTopics.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Revision Advisor:</strong> We found {recommendations.weakTopics.length} topic
                  {recommendations.weakTopics.length === 1 ? "" : "s"} requiring active reinforcement. Review these concepts to boost your exam readiness.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.weakTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block line-clamp-1">
                        {topic}
                      </span>
                      <span className="text-[11px] text-rose-600 font-semibold">
                        Accuracy &lt; 60%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/flashcards?topic=${encodeURIComponent(topic)}`)}
                        className="text-[11px] px-2 py-1 h-7"
                      >
                        Cards
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/chat?topic=${encodeURIComponent(topic)}`)}
                        className="text-[11px] px-2.5 py-1 h-7 bg-indigo-600"
                      >
                        Revise AI
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No weak topics identified yet!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Take quizzes on your uploaded documents to track topic-level understanding.
              </p>
            </div>
          )}
        </Card>

        {/* Flashcards Due & Spaced Repetition Reminder (1 col) */}
        <Card padding="md" className="space-y-4 bg-white border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Spaced Repetition
                </h3>
                <p className="text-xs text-slate-500">Active recall schedule</p>
              </div>
            </div>

            <div className="py-4 text-center space-y-2">
              <div className="text-4xl font-extrabold text-indigo-600">
                {dueFlashcardsCount}
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {dueFlashcardsCount === 1
                  ? "Flashcard due for review today"
                  : dueFlashcardsCount > 1
                  ? "Flashcards due for review today"
                  : "All caught up on flashcards!"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                {dueFlashcardsCount > 0
                  ? "Review now to optimize retention before forgetting sets in."
                  : "Practice your full deck anytime to maintain high retention."}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant={dueFlashcardsCount > 0 ? "primary" : "outline"}
              className="w-full text-xs font-bold"
              icon={Layers}
              onClick={() => navigate("/flashcards")}
            >
              {dueFlashcardsCount > 0 ? "Start Review Session" : "Open Flashcards"}
            </Button>
          </div>
        </Card>
      </div>

      {/* PHASE 4: TODAY'S STUDY PLAN WIDGET */}
      <Card padding="md" className="space-y-4 bg-white border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Personalized Study Plan
              </h3>
              <p className="text-xs text-slate-500">
                {activePlan
                  ? `${activePlan.title || "Your Study Schedule"} • ${activePlan.dailyTarget || 45} mins daily target`
                  : "No study plan created yet"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={Sparkles}
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan}
          >
            {isGeneratingPlan ? "Generating Plan..." : "Generate Plan with AI"}
          </Button>
        </div>

        {activePlan && activePlan.tasks && activePlan.tasks.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePlan.tasks.slice(0, 6).map((task) => {
                const taskId = task.taskId || task._id;
                return (
                  <div
                    key={taskId}
                    onClick={() => handleToggleTask(taskId, task.completed)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      task.completed
                        ? "bg-emerald-50/50 border-emerald-200 text-slate-400"
                        : "bg-white border-slate-200 hover:border-indigo-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        task.completed
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-300 bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold line-clamp-1 ${
                          task.completed
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {task.topic || task.activity || "Study Task"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {task.subject} • {task.estimatedMinutes || 20}m ({task.activity})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No active study tasks scheduled</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
              Click &quot;Generate Plan with AI&quot; above to have StudyMate organize a 7-day revision schedule tailored to your weak topics.
            </p>
          </div>
        )}
      </Card>

      {/* Main Content Split: Recent Documents + Quiz Results & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Recent Documents
              </h3>
              <p className="text-xs text-slate-500">
                Course notes processed and ready for study
              </p>
            </div>
            <Link
              to="/documents"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {documents.length === 0 ? (
            <Card padding="md" className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No documents uploaded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload a PDF to start summarizing and testing</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" icon={UploadCloud} onClick={() => setIsUploadOpen(true)}>
                  Upload First PDF
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map((doc) => {
                const docId = doc.id || doc.documentId || doc._id;
                return (
                  <Card
                    key={docId}
                    padding="md"
                    hoverable
                    onClick={() => navigate(`/documents`)}
                    className="flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <Badge
                          variant={doc.status === "Ready" || doc.status === "ready" ? "success" : "warning"}
                          size="sm"
                          dot
                        >
                          {doc.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {doc.name || doc.title || doc.fileName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.subject || "Study Notes"}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>{doc.size || `${((doc.fileSize || 0) / (1024 * 1024)).toFixed(1)} MB`}</span>
                      <span>
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently"}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Recent Quiz Results & Activity Feed */}
        <div className="space-y-6">
          {/* Recent Quiz Results */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Recent Quiz Scores
                </h4>
                <p className="text-[11px] text-slate-400">Past performance</p>
              </div>
              <Link
                to="/quiz"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Take Quiz
              </Link>
            </div>

            {recentQuizzes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No quizzes completed yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentQuizzes.map((quiz) => (
                  <div
                    key={quiz.quizId || quiz._id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100/80 flex items-center justify-between"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {quiz.title || "AI Quiz"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {quiz.subject || "General"} •{" "}
                        {quiz.completedAt
                          ? new Date(quiz.completedAt).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block">
                        {quiz.score ?? 0}/{quiz.totalQuestions || 5}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          (quiz.percentage || 0) >= 70
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {quiz.percentage ?? 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Activity Feed */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Recent Activity
              </h4>
              <span className="text-[11px] text-slate-400">Feed</span>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.activityId || act._id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      {act.activityType?.includes("quiz") ? (
                        <Award className="w-4 h-4" />
                      ) : act.activityType?.includes("summary") ? (
                        <Sparkles className="w-4 h-4" />
                      ) : act.activityType?.includes("flashcard") ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                        {act.topic || act.activityType?.replace("_", " ")}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {act.activityType} • {act.duration || 1}m
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {act.createdAt
                        ? new Date(act.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}