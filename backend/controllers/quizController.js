import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import { generateQuiz as generateAiQuiz } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";
import LearningProfile from "../models/LearningProfile.js";

const getQuizQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ quizId: id }, { _id: id }] }
    : { quizId: id };
};

// Fallback question pool for quizzes created without an uploaded document
const fallbackQuestionPool = {
  easy: [
    {
      question: "Which normal form requires atomic values with no repeating groups?",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      correctAnswer: 0,
      explanation: "1NF enforces atomicity across all relation attributes.",
    },
    {
      question: "What is the worst-case time complexity of linear search on an array?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correctAnswer: 2,
      explanation: "Linear search checks every item sequentially in up to O(n) steps.",
    },
    {
      question: "Which Coffman condition asserts that resources cannot be forcibly seized?",
      options: ["Mutual Exclusion", "No Preemption", "Hold and Wait", "Circular Wait"],
      correctAnswer: 1,
      explanation: "No preemption means resources are surrendered voluntarily by the process.",
    },
  ],
  medium: [
    {
      question: "In an AVL tree, what is the maximum permissible balance factor difference?",
      options: ["0 only", "Between -1 and 1", "Between -2 and 2", "Any integer"],
      correctAnswer: 1,
      explanation: "AVL balance factor must remain in {-1, 0, +1} after every insertion/deletion.",
    },
    {
      question: "Which algorithm guarantees finding deadlock-free safe sequences for resource allocation?",
      options: ["Dijkstra's Algorithm", "Banker's Algorithm", "Kruskal's Algorithm", "Round Robin"],
      correctAnswer: 1,
      explanation: "Banker's algorithm tests for safe state existence before granting allocations.",
    },
  ],
  hard: [
    {
      question: "Under Strict Two-Phase Locking (Strict 2PL), when are exclusive write locks released?",
      options: ["Immediately after write", "At the start of shrinking phase", "Only after transaction commits or aborts", "Never"],
      correctAnswer: 2,
      explanation: "Strict 2PL holds exclusive write locks until transaction termination to prevent cascading aborts.",
    },
    {
      question: "Which graph algorithm detects negative-weight cycles in a directed graph?",
      options: ["Prim's Algorithm", "Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd's Cycle Finding"],
      correctAnswer: 2,
      explanation: "Bellman-Ford relaxes edges V-1 times; a further relaxation indicates a negative cycle.",
    },
  ],
};

// @desc    Generate/Create a new AI-powered quiz
// @route   POST /api/quizzes
// @access  Private
export const createQuiz = async (req, res, next) => {
  try {
    const { documentId, topic, difficulty = "medium", numQuestions = 5 } = req.body;

    let quizTitle = topic || "Practice Knowledge Quiz";
    let questions = [];

    if (documentId) {
      const docQuery = mongoose.Types.ObjectId.isValid(documentId)
        ? { $or: [{ documentId }, { _id: documentId }] }
        : { documentId };

      const doc = await Document.findOne(docQuery);

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: "Selected document not found",
        });
      }

      if (doc.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You cannot generate quizzes for another user's document",
        });
      }

      quizTitle = `${doc.fileName.replace(/\.pdf$/i, "")} Quiz (${difficulty.toUpperCase()})`;

      // Fetch chunks for document
      const chunks = await TextChunk.find({
        documentId: doc.documentId,
        userId: req.user.userId,
      })
        .sort({ chunkIndex: 1 })
        .lean();

      if (chunks.length > 0) {
        // Generate AI Quiz from document chunks
        questions = await generateAiQuiz({
          documentTitle: doc.fileName,
          chunks,
          options: {
            difficulty,
            numQuestions: Number(numQuestions) || 5,
          },
        });
      }
    }

    // Fallback if no questions generated or no documentId provided
    if (!questions || questions.length === 0) {
      const pool = fallbackQuestionPool[difficulty] || fallbackQuestionPool.medium;
      questions = pool.slice(0, Number(numQuestions) || 5);
    }

    // Strict validation of each question schema
    const validatedQuestions = questions.map((q) => ({
      question: q.question,
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer <= 3 ? q.correctAnswer : 0,
      explanation: q.explanation || "Correct answer derived from study material.",
    }));

    const quiz = await Quiz.create({
      userId: req.user.userId,
      documentId: documentId || null,
      title: quizTitle,
      difficulty,
      questions: validatedQuestions,
      totalQuestions: validatedQuestions.length,
      score: null,
      isSubmitted: false,
    });

    res.status(201).json({
      success: true,
      message: "AI Quiz generated successfully",
      data: {
        quiz,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all quizzes for user
// @route   GET /api/quizzes
// @access  Private
export const getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: {
        quizzes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quiz by ID
// @route   GET /api/quizzes/:id
// @access  Private
export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne(getQuizQuery(req.params.id));

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's quiz",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        quiz,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answers for a quiz and grade
// @route   POST /api/quizzes/:id/submit
// @access  Private
export const submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    const quiz = await Quiz.findOne(getQuizQuery(req.params.id));

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot submit another user's quiz",
      });
    }

    let correctCount = 0;

    quiz.questions.forEach((q, idx) => {
      let userChoice = null;
      if (Array.isArray(answers)) {
        userChoice = answers[idx];
      } else if (answers && answers[idx] !== undefined) {
        userChoice = Number(answers[idx]);
      } else if (answers && answers[q._id] !== undefined) {
        userChoice = Number(answers[q._id]);
      }

      q.selectedAnswer = userChoice;
      if (userChoice !== null && userChoice === q.correctAnswer) {
        correctCount++;
      }
    });

    quiz.score = correctCount;
    quiz.isSubmitted = true;
    await quiz.save();

    const percentage = Math.round((correctCount / quiz.totalQuestions) * 100);

    // Record study activity
    await recordActivity({
      userId: req.user.userId,
      documentId: quiz.documentId,
      activityType: "quiz_completed",
      topic: quiz.title || "Practice Quiz",
      duration: 10,
      metadata: {
        quizId: quiz.quizId,
        score: correctCount,
        total: quiz.totalQuestions,
        percentage,
      },
    });

    // Update weak topic detection in profile if score < 60%
    if (percentage < 60) {
      const topicName = quiz.title.replace(/\s+Quiz.*$/i, "").trim() || "Course Material";
      await LearningProfile.findOneAndUpdate(
        { userId: req.user.userId },
        {
          $addToSet: {
            weakTopics: {
              topic: topicName,
              averageScore: percentage,
              lastAttemptDate: new Date(),
              documentId: quiz.documentId,
            },
          },
        },
        { upsert: true }
      );
    }

    const review = quiz.questions.map((q, idx) => ({
      questionIndex: idx,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      selectedAnswer: q.selectedAnswer,
      isCorrect: q.selectedAnswer === q.correctAnswer,
      explanation: q.explanation,
    }));

    res.status(200).json({
      success: true,
      message: "Quiz submitted and evaluated successfully",
      data: {
        quizId: quiz.quizId,
        score: correctCount,
        total: quiz.totalQuestions,
        totalQuestions: quiz.totalQuestions,
        percentage,
        passed: percentage >= 60,
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
};
