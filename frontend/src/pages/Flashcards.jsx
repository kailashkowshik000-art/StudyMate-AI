import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertCircle,
  Brain,
  ThumbsUp,
  HelpCircle,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import { flashcardService } from "../services/flashcardService";
import { documentService } from "../services/documentService";
import { analyticsService } from "../services/analyticsService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Flashcards() {
  useDocumentTitle("Flashcards", "Spaced-repetition flashcards for efficient active recall.");
  const [searchParams] = useSearchParams();
  const initialDoc = searchParams.get("doc") || "";
  const initialTopic = searchParams.get("topic") || "";

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'due' | 'study'

  // Document selection & generation
  const [documents, setDocuments] = useState([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(initialDoc);
  const [genTopic, setGenTopic] = useState(initialTopic);
  const [genCount, setGenCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Manual create form
  const [newCard, setNewCard] = useState({
    question: "",
    answer: "",
    topic: "",
    difficulty: "medium",
  });

  // Study mode state
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyCards, setStudyCards] = useState([]);
  const [studyCompleted, setStudyCompleted] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);

  // Load cards and documents
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedCards, docs] = await Promise.all([
        flashcardService.getFlashcards(),
        documentService.getDocuments(),
      ]);
      setCards(fetchedCards || []);
      setDocuments(docs || []);
      if (!selectedDocId && docs.length > 0) {
        setSelectedDocId(docs[0].id || docs[0].documentId);
      }
    } catch (err) {
      console.error("Failed to load flashcards", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();
  const dueCards = cards.filter((c) => !c.nextReview || new Date(c.nextReview) <= now);

  const displayedCards = activeTab === "due" ? dueCards : cards;

  // Handle AI Flashcards Generation
  const handleGenerateAI = async (e) => {
    e.preventDefault();
    if (!selectedDocId) {
      setGenError("Please select a document");
      return;
    }
    setIsGenerating(true);
    setGenError("");

    try {
      const result = await flashcardService.generateFlashcards({
        documentId: selectedDocId,
        count: Number(genCount),
        topic: genTopic,
      });

      // Log study activity
      analyticsService.logActivity({
        documentId: selectedDocId,
        activityType: "flashcard_review",
        topic: genTopic || "General",
        duration: 3,
        metadata: { generatedCount: result?.cards?.length || 0 },
      }).catch(() => {});

      setIsGenerateModalOpen(false);
      setGenTopic("");
      await loadData();
    } catch (err) {
      setGenError(err.message || "Failed to generate flashcards with AI");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Manual Card Creation
  const handleCreateManual = async (e) => {
    e.preventDefault();
    if (!newCard.question.trim() || !newCard.answer.trim()) return;

    try {
      await flashcardService.createFlashcard({
        ...newCard,
        documentId: selectedDocId || undefined,
      });
      setIsCreateModalOpen(false);
      setNewCard({ question: "", answer: "", topic: "", difficulty: "medium" });
      await loadData();
    } catch (err) {
      alert("Failed to save flashcard: " + err.message);
    }
  };

  // Handle Card Delete
  const handleDeleteCard = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    try {
      await flashcardService.deleteFlashcard(id);
      setCards((prev) => prev.filter((c) => (c._id || c.flashcardId) !== id));
    } catch (err) {
      alert("Failed to delete card: " + err.message);
    }
  };

  // Start Study Session
  const startStudySession = (cardsToStudy) => {
    if (!cardsToStudy || cardsToStudy.length === 0) return;
    setStudyCards(cardsToStudy);
    setStudyIndex(0);
    setIsFlipped(false);
    setStudyCompleted(false);
    setReviewedInSession(0);
    setActiveTab("study");
  };

  // Review Spaced Repetition
  const handleReviewQuality = async (quality) => {
    const currentCard = studyCards[studyIndex];
    if (!currentCard) return;

    const cardId = currentCard._id || currentCard.flashcardId;
    try {
      await flashcardService.reviewFlashcard(cardId, quality);
      setReviewedInSession((prev) => prev + 1);

      // Log study activity
      analyticsService.logActivity({
        documentId: currentCard.documentId,
        activityType: "flashcard_review",
        topic: currentCard.topic || "Review",
        duration: 1,
        metadata: { quality },
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to record review", err);
    }

    if (studyIndex + 1 < studyCards.length) {
      setStudyIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setStudyCompleted(true);
      loadData();
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Personalized Flashcards
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Spaced repetition active recall to master your study concepts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={Plus}
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Card
          </Button>
          <Button
            variant="primary"
            icon={Sparkles}
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4 bg-white border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{cards.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Flashcards</div>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4 bg-white border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{dueCards.length}</div>
            <div className="text-xs text-slate-500 font-medium">Due for Review Today</div>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4 bg-white border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {cards.filter((c) => (c.reviewCount || 0) > 0).length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Mastered / Reviewed</div>
          </div>
        </Card>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("all");
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Cards ({cards.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("due");
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "due"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Due Today
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === "due" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {dueCards.length}
            </span>
          </button>
        </div>

        {dueCards.length > 0 && activeTab !== "study" && (
          <Button
            variant="primary"
            size="sm"
            icon={Brain}
            onClick={() => startStudySession(dueCards)}
          >
            Study Due Cards ({dueCards.length})
          </Button>
        )}
        {cards.length > 0 && dueCards.length === 0 && activeTab !== "study" && (
          <Button
            variant="outline"
            size="sm"
            icon={RotateCw}
            onClick={() => startStudySession(cards)}
          >
            Practice Deck ({cards.length})
          </Button>
        )}
      </div>

      {/* ================= STUDY SESSION VIEW ================= */}
      {activeTab === "study" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {!studyCompleted ? (
            <>
              {/* Progress info */}
              <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
                <span>
                  Card {studyIndex + 1} of {studyCards.length}
                </span>
                <button
                  onClick={() => setActiveTab("all")}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Exit Session
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((studyIndex + 1) / studyCards.length) * 100}%`,
                  }}
                />
              </div>

              {/* Interactive Flip Card */}
              {studyCards[studyIndex] && (
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="cursor-pointer select-none min-h-[300px] sm:min-h-[340px] rounded-2xl border-2 border-slate-200/90 bg-white p-8 sm:p-10 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col justify-between relative group"
                >
                  {/* Top tags */}
                  <div className="flex items-center justify-between">
                    <Badge variant="indigo">
                      {studyCards[studyIndex].topic || "General"}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      {isFlipped ? "Answer" : "Question (Click to flip)"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="my-auto py-6 text-center">
                    {!isFlipped ? (
                      <div>
                        <div className="text-xs uppercase tracking-wider font-bold text-indigo-500 mb-2">
                          Question
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-relaxed">
                          {studyCards[studyIndex].question}
                        </p>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-200">
                        <div className="text-xs uppercase tracking-wider font-bold text-emerald-600 mb-2">
                          Answer
                        </div>
                        <p className="text-base sm:text-xl font-medium text-slate-800 leading-relaxed">
                          {studyCards[studyIndex].answer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Flip indicator */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-4 border-t border-slate-100">
                    <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
                    <span>Click anywhere to flip</span>
                  </div>
                </div>
              )}

              {/* Spaced Repetition Rating Buttons */}
              {isFlipped && (
                <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                  <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    How well did you know this?
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleReviewQuality("hard")}
                      className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-sm transition-colors text-center"
                    >
                      <div className="font-bold">Hard</div>
                      <div className="text-[11px] opacity-80">&lt; 12 hours</div>
                    </button>
                    <button
                      onClick={() => handleReviewQuality("medium")}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-sm transition-colors text-center"
                    >
                      <div className="font-bold">Good</div>
                      <div className="text-[11px] opacity-80">2 - 4 days</div>
                    </button>
                    <button
                      onClick={() => handleReviewQuality("easy")}
                      className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-sm transition-colors text-center"
                    >
                      <div className="font-bold">Easy</div>
                      <div className="text-[11px] opacity-80">4 - 8 days</div>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Study Session Completed Card */
            <Card padding="xl" className="text-center space-y-5 bg-white border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Session Complete!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  You successfully reviewed {reviewedInSession} flashcard{reviewedInSession === 1 ? "" : "s"}.
                  Spaced repetition intervals have been recalculated.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setActiveTab("all")}>
                  Return to All Cards
                </Button>
                <Button
                  variant="primary"
                  onClick={() => startStudySession(cards)}
                >
                  Review More
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ================= GRID / LIST OF CARDS ================= */}
      {activeTab !== "study" && (
        <>
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading your flashcards...
            </div>
          ) : displayedCards.length === 0 ? (
            <Card padding="xl" className="text-center space-y-4 bg-white border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {activeTab === "due" ? "No flashcards due right now!" : "No flashcards yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {activeTab === "due"
                    ? "Great job! You've reviewed all scheduled flashcards. Feel free to practice your full deck or generate new ones."
                    : "Generate flashcards from your study documents using Gemini AI, or create your own custom flashcards."}
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  icon={Sparkles}
                  size="sm"
                  onClick={() => setIsGenerateModalOpen(true)}
                >
                  Generate Flashcards with AI
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCards.map((card) => {
                const cardId = card._id || card.flashcardId;
                const isDue = !card.nextReview || new Date(card.nextReview) <= now;

                return (
                  <div
                    key={cardId}
                    className="p-5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="indigo">{card.topic || "General"}</Badge>
                        <div className="flex items-center gap-1.5">
                          {isDue && (
                            <Badge variant="warning">Due</Badge>
                          )}
                          <button
                            onClick={(e) => handleDeleteCard(cardId, e)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Delete card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Question
                        </span>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-3">
                          {card.question}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Answer
                        </span>
                        <p className="text-xs text-slate-600 line-clamp-3">
                          {card.answer}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Reviews: {card.reviewCount || 0}</span>
                      <span>
                        {card.nextReview
                          ? `Next: ${new Date(card.nextReview).toLocaleDateString()}`
                          : "Due Now"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================= MODAL: GENERATE WITH AI ================= */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => !isGenerating && setIsGenerateModalOpen(false)}
        title="Generate AI Flashcards"
      >
        <form onSubmit={handleGenerateAI} className="space-y-4">
          {genError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Source Document
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Choose a document --</option>
              {documents.map((doc) => {
                const id = doc.id || doc.documentId;
                return (
                  <option key={id} value={id}>
                    {doc.title || doc.filename || doc.name}
                  </option>
                );
              })}
            </select>
          </div>

          <Input
            label="Specific Topic or Concept (Optional)"
            placeholder="e.g. Backpropagation, Photosynthesis, Thermodynamics"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Number of Flashcards
            </label>
            <select
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={3}>3 Cards (Quick review)</option>
              <option value={5}>5 Cards (Standard)</option>
              <option value={10}>10 Cards (Deep dive)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Sparkles}
              isLoading={isGenerating}
              disabled={isGenerating || !selectedDocId}
            >
              Generate Cards
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: CREATE MANUAL CARD ================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Custom Flashcard"
      >
        <form onSubmit={handleCreateManual} className="space-y-4">
          <Input
            label="Question or Prompt"
            placeholder="e.g. What is the difference between supervised and unsupervised learning?"
            value={newCard.question}
            onChange={(e) => setNewCard({ ...newCard, question: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Answer
            </label>
            <textarea
              className="w-full text-sm border border-slate-300 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Explain the key answer clearly..."
              value={newCard.answer}
              onChange={(e) => setNewCard({ ...newCard, answer: e.target.value })}
              required
            />
          </div>

          <Input
            label="Topic / Subject"
            placeholder="e.g. Machine Learning, Biology"
            value={newCard.topic}
            onChange={(e) => setNewCard({ ...newCard, topic: e.target.value })}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Card
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
