import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Layers,
  Clock,
  ChevronRight,
  Check,
  AlertCircle,
  Timer,
  FileQuestion,
  RefreshCw,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Toast from "../components/common/Toast";
import { quizService } from "../services/quizService";
import { examService } from "../services/examService";
import { documentService } from "../services/documentService";
import { analyticsService } from "../services/analyticsService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Quiz() {
  useDocumentTitle("Quizzes & Practice Exams", "Interactive active-recall quizzes and simulated exams.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDoc = searchParams.get("doc") || "";
  const initialTopic = searchParams.get("topic") || "";

  // Mode: 'practice' | 'exam'
  const [mode, setMode] = useState("practice");

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDoc);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [examTimeLimit, setExamTimeLimit] = useState(10); // minutes for exam
  const [examSubject, setExamSubject] = useState(initialTopic || "Comprehensive Assessment");

  // Stages: 'setup' | 'active' | 'results'
  const [stage, setStage] = useState("setup");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Timed Exam State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await documentService.getDocuments();
        setDocuments(docs || []);
        if (docs.length > 0 && (!selectedDocId || !docs.some((d) => (d.id || d.documentId) === selectedDocId))) {
          setSelectedDocId(docs[0].id || docs[0].documentId);
        }
      } catch (err) {
        console.error("Failed to load documents for quiz", err);
      }
    };
    loadDocs();
  }, []);

  // Timer countdown for exam mode
  useEffect(() => {
    if (stage === "active" && mode === "exam" && timeLeftSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, mode, timeLeftSeconds]);

  // Start Practice Quiz
  const handleStartPracticeQuiz = async () => {
    setIsGenerating(true);
    try {
      const quiz = await quizService.createQuiz({
        documentId: selectedDocId || null,
        numQuestions: Number(numQuestions),
        difficulty,
      });
      setQuizData(quiz);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setStage("active");
    } catch (err) {
      alert("Failed to generate practice quiz: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  // Start Timed Exam
  const handleStartExam = async () => {
    setIsGenerating(true);
    try {
      const exam = await examService.generateExam({
        documentId: selectedDocId || undefined,
        subject: examSubject || "Comprehensive Exam",
        difficulty,
        timeLimit: Number(examTimeLimit),
        count: Number(numQuestions),
      });

      setQuizData(exam);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setTimeLeftSeconds(Number(examTimeLimit) * 60);
      setStage("active");
    } catch (err) {
      alert("Failed to generate timed exam: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (qIdx, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [qIdx]: optionIndex,
    }));
  };

  // Auto-submit exam when time runs out
  const handleAutoSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const examId = quizData.examId || quizData._id;
      const formattedAnswers = Object.entries(answers).map(([qIdx, selectedOption]) => ({
        questionIndex: Number(qIdx),
        selectedOption,
      }));
      const result = await examService.submitExam(examId, formattedAnswers);
      setQuizResult(result);
      setStage("results");
    } catch (err) {
      console.error("Auto submit error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Submit
  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    try {
      if (mode === "exam") {
        const examId = quizData.examId || quizData._id;
        const formattedAnswers = Object.entries(answers).map(([qIdx, selectedOption]) => ({
          questionIndex: Number(qIdx),
          selectedOption,
        }));
        const result = await examService.submitExam(examId, formattedAnswers);
        setQuizResult(result);
      } else {
        const result = await quizService.submitQuiz({
          quizId: quizData.quizId || quizData._id,
          answers,
        });
        setQuizResult(result.data || result);
      }
      setStage("results");
    } catch (err) {
      setToastMessage("Failed to submit assessment: " + (err.data?.message || err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToSetup = () => {
    clearInterval(timerRef.current);
    setStage("setup");
    setQuizData(null);
    setQuizResult(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentQuestion = quizData?.questions?.[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQCount = quizData?.questions?.length || 0;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <Toast
        isOpen={!!toastMessage}
        type="error"
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      {/* Page Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === "exam" ? "Timed Exam Assessment" : "AI Practice Quiz"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {mode === "exam"
              ? "Strict timed evaluation with automated grading and weak-area diagnosis"
              : "Self-paced conceptual practice to test retention across your study documents"}
          </p>
        </div>

        {stage !== "setup" && (
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleResetToSetup}
            className="text-xs"
          >
            New Assessment
          </Button>
        )}
      </div>

      {/* Mode Switcher Tabs (Only visible during setup) */}
      {stage === "setup" && (
        <div className="flex rounded-xl bg-slate-100 p-1 max-w-md">
          <button
            onClick={() => setMode("practice")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "practice"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Practice Quiz
          </button>
          <button
            onClick={() => setMode("exam")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "exam"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Timer className="w-4 h-4" />
            Timed Exam Mode
          </button>
        </div>
      )}

      {/* ================= STAGE 1: SETUP SCREEN ================= */}
      {stage === "setup" && (
        <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                mode === "exam"
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-violet-50 text-violet-600"
              }`}
            >
              {mode === "exam" ? (
                <Timer className="w-6 h-6" />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === "exam"
                  ? "Configure Timed Exam Assessment"
                  : "Configure Practice Quiz"}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === "exam"
                  ? "Questions will be timed with automatic submission on expiry"
                  : "Instant answers and self-paced revision"}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Topic / Document Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                1. Select Source Document
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              >
                {documents.length === 0 ? (
                  <option value="">General Knowledge (No documents uploaded)</option>
                ) : (
                  documents.map((doc) => {
                    const id = doc.id || doc.documentId;
                    return (
                      <option key={id} value={id}>
                        📄 {doc.name || doc.title || doc.fileName} — {doc.subject || "Study Notes"} ({doc.status || "Ready"})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Exam Title (Exam Mode Only) */}
            {mode === "exam" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  2. Exam Subject / Title
                </label>
                <input
                  type="text"
                  value={examSubject}
                  onChange={(e) => setExamSubject(e.target.value)}
                  placeholder="e.g. Midterm Simulation: Data Structures"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}

            {/* Time Limit Selector (Exam Mode Only) */}
            {mode === "exam" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  3. Strict Time Limit
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setExamTimeLimit(mins)}
                      className={`
                        py-3 px-3 rounded-xl border text-xs sm:text-sm font-bold text-center transition-all
                        ${
                          examTimeLimit === mins
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm ring-1 ring-indigo-600"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }
                      `}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Question Count Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {mode === "exam" ? "4. Number of Questions" : "2. Number of Questions"}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[3, 5, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setNumQuestions(count)}
                    className={`
                      py-3 px-4 rounded-xl border text-sm font-bold text-center transition-all
                      ${
                        numQuestions === count
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }
                    `}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                {mode === "exam" ? "5. Target Difficulty" : "3. Target Difficulty"}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "easy", label: "Easy", desc: "Basic recall & terms" },
                  { id: "medium", label: "Medium", desc: "Applied concepts" },
                  { id: "hard", label: "Hard", desc: "Complex analysis" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDifficulty(item.id)}
                    className={`
                      p-3.5 rounded-xl border text-left transition-all
                      ${
                        difficulty === item.id
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }
                    `}
                  >
                    <span className="block text-sm font-bold text-slate-900">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              icon={Sparkles}
              onClick={mode === "exam" ? handleStartExam : handleStartPracticeQuiz}
              loading={isGenerating}
              className="w-full sm:w-auto shadow-md shadow-indigo-600/20"
            >
              {isGenerating
                ? "Synthesizing AI Assessment..."
                : mode === "exam"
                ? `Start Timed Exam (${examTimeLimit} mins)`
                : "Generate Practice Quiz"}
            </Button>
          </div>
        </Card>
      )}

      {/* ================= STAGE 2: ACTIVE QUIZ / EXAM SCREEN ================= */}
      {stage === "active" && quizData && currentQuestion && (
        <div className="space-y-6">
          {/* Progress & Countdown Timer Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-indigo-600 flex items-center gap-1.5 font-bold">
                <GraduationCap className="w-4 h-4" />
                Question {currentQuestionIndex + 1} of {totalQCount}
              </span>

              {/* Countdown Timer for Exam Mode */}
              {mode === "exam" && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    timeLeftSeconds <= 60
                      ? "bg-rose-100 text-rose-700 animate-pulse"
                      : timeLeftSeconds <= 180
                      ? "bg-amber-100 text-amber-800"
                      : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>Time Left: {formatTimer(timeLeftSeconds)}</span>
                </div>
              )}

              <span className="text-slate-500">
                Answered: {answeredCount}/{totalQCount}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / totalQCount) * 100}%`,
                }}
              />
            </div>

            {/* Quick question palette pills */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
              {quizData.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                    idx === currentQuestionIndex
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-200"
                      : answers[idx] !== undefined
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question Card */}
          <Card padding="lg" className="space-y-6 bg-white border-slate-200/80 shadow-sm">
            <div className="space-y-2">
              <span className="inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg uppercase">
                {quizData.title || quizData.subject || "StudyMate Assessment"} • {difficulty.toUpperCase()}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestionIndex] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestionIndex, idx)}
                    className={`
                      w-full p-4 rounded-2xl border text-left text-sm font-medium transition-all flex items-center justify-between
                      ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-sm ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`
                          w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0
                          ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }
                        `}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="md"
                icon={ArrowLeft}
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              >
                Previous
              </Button>

              {currentQuestionIndex < totalQCount - 1 ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  onClick={handleSubmitQuiz}
                  loading={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? "Grading..." : "Submit Assessment"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ================= STAGE 3: RESULTS SCREEN ================= */}
      {stage === "results" && quizResult && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card padding="xl" className="text-center space-y-5 bg-white border-slate-200">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                (quizResult.percentage || 0) >= 70
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                {mode === "exam" ? "Timed Exam Evaluation" : "Quiz Results"}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                You scored {quizResult.score} out of {quizResult.totalQuestions || totalQCount}
              </h3>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                {quizResult.percentage}% Accuracy
              </p>
            </div>

            {/* Performance message */}
            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {(quizResult.percentage || 0) >= 80
                ? "Outstanding performance! You demonstrated thorough conceptual understanding and topic mastery."
                : (quizResult.percentage || 0) >= 60
                ? "Good effort! You grasp the fundamentals, but a few areas will benefit from spaced repetition."
                : "Needs revision. Review the questions below and use Flashcards or AI Chat to reinforce these concepts."}
            </div>

            {/* Identified Weak Areas in Exam Mode (Phase 4) */}
            {quizResult.weakAreas && quizResult.weakAreas.length > 0 && (
              <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-2">
                <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Weak Areas Identified:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quizResult.weakAreas.map((area, idx) => (
                    <Badge key={idx} variant="danger">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                icon={RotateCcw}
                onClick={handleResetToSetup}
              >
                Take Another Assessment
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Layers}
                onClick={() => navigate("/flashcards")}
              >
                Review Flashcards
              </Button>
            </div>
          </Card>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              Detailed Question Analysis
            </h4>

            {(quizResult.results || quizResult.questions || []).map((q, idx) => {
              const isCorrect = q.isCorrect !== undefined ? q.isCorrect : q.correct;
              const selectedIdx = answers[idx];

              return (
                <Card
                  key={idx}
                  padding="md"
                  className={`border-l-4 ${
                    isCorrect ? "border-l-emerald-500" : "border-l-rose-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-500">
                      Question {idx + 1}
                    </span>
                    <Badge variant={isCorrect ? "success" : "danger"}>
                      {isCorrect ? "Correct (+1)" : "Incorrect (0)"}
                    </Badge>
                  </div>

                  <p className="text-sm font-bold text-slate-900 mb-3">
                    {q.question}
                  </p>

                  <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl mb-3">
                    {q.options && (
                      <div className="text-slate-600">
                        <strong>Your answer:</strong>{" "}
                        {selectedIdx !== undefined
                          ? `${String.fromCharCode(65 + selectedIdx)}) ${q.options[selectedIdx]}`
                          : "Unanswered"}
                      </div>
                    )}
                    {q.options && q.correctAnswer !== undefined && (
                      <div className="text-emerald-700 font-semibold">
                        <strong>Correct answer:</strong>{" "}
                        {`${String.fromCharCode(65 + q.correctAnswer)}) ${q.options[q.correctAnswer]}`}
                      </div>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="text-xs text-slate-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <strong className="text-indigo-900 block mb-1">
                        AI Explanation:
                      </strong>
                      {q.explanation}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}