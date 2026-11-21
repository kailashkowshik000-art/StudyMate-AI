import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import { generateQuiz } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";
import LearningProfile from "../models/LearningProfile.js";

const getExamQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ examId: id }, { _id: id }] }
    : { examId: id };
};

// @desc    Generate a timed Exam Mode assessment
// @route   POST /api/exams/generate
// @access  Private
export const generateExam = async (req, res, next) => {
  try {
    const {
      documentId,
      subject = "Computer Science",
      difficulty = "medium",
      numQuestions = 10,
      timeLimit = 20, // in minutes
    } = req.body;

    let docTitle = subject;
    let chunks = [];

    if (documentId) {
      const doc = await Document.findOne({
        documentId,
        userId: req.user.userId,
      });

      if (doc) {
        docTitle = doc.fileName.replace(/\.pdf$/i, "");
        chunks = await TextChunk.find({
          documentId,
          userId: req.user.userId,
        })
          .sort({ chunkIndex: 1 })
          .lean();
      }
    }

    const questionCount = Math.max(5, Math.min(Number(numQuestions) || 10, 25));

    // Generate comprehensive questions using Gemini
    const questions = await generateQuiz({
      documentTitle: docTitle,
      chunks,
      options: {
        difficulty,
        numQuestions: questionCount,
      },
    });

    const examQuestions = questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      selectedAnswer: null,
      explanation: q.explanation,
      topic: docTitle,
    }));

    const exam = await Exam.create({
      userId: req.user.userId,
      documentId: documentId || null,
      subject,
      title: `${docTitle} — Official Exam Mode`,
      difficulty,
      timeLimit: Number(timeLimit) || 20,
      questions: examQuestions,
      totalQuestions: examQuestions.length,
    });

    const examObj = exam.toObject();
    res.status(201).json({
      success: true,
      message: "Timed Exam generated successfully",
      data: {
        ...examObj,
        exam: examObj,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's past exams
// @route   GET /api/exams
// @access  Private
export const getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: exams,
      exams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
// @access  Private
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne(getExamQuery(req.params.id));

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's exam",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Exam answers, calculate score & identify weak areas
// @route   POST /api/exams/:id/submit
// @access  Private
export const submitExam = async (req, res, next) => {
  try {
    const { answers } = req.body;

    const exam = await Exam.findOne(getExamQuery(req.params.id));

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot submit another user's exam",
      });
    }

    let correctCount = 0;
    const missedTopics = [];

    exam.questions.forEach((q, idx) => {
      let choice = null;
      if (Array.isArray(answers)) {
        const item = answers.find(
          (a) => a && (a.questionIndex === idx || a.index === idx)
        ) || answers[idx];

        if (item && typeof item === "object") {
          choice = item.selectedOption !== undefined ? item.selectedOption : item.selectedAnswer;
        } else if (typeof item === "number" || typeof item === "string") {
          choice = Number(item);
        }
      } else if (answers && typeof answers === "object") {
        if (answers[idx] !== undefined) {
          choice = Number(answers[idx]);
        }
      }

      const numericChoice =
        choice !== null && choice !== undefined && !isNaN(Number(choice))
          ? Number(choice)
          : null;

      q.selectedAnswer = numericChoice;
      if (numericChoice !== null && numericChoice === q.correctAnswer) {
        correctCount++;
      } else {
        missedTopics.push(q.topic || exam.subject);
      }
    });

    const percentage = Math.round((correctCount / exam.totalQuestions) * 100);
    const uniqueWeakAreas = [...new Set(missedTopics)];

    exam.score = correctCount;
    exam.percentage = percentage;
    exam.isSubmitted = true;
    exam.weakAreas = uniqueWeakAreas;
    exam.completedAt = new Date();
    await exam.save();

    // Record study activity
    await recordActivity({
      userId: req.user.userId,
      documentId: exam.documentId,
      activityType: "quiz_completed",
      topic: exam.subject,
      duration: exam.timeLimit || 20,
      metadata: {
        examId: exam.examId,
        score: correctCount,
        total: exam.totalQuestions,
        percentage,
      },
    });

    // If percentage < 60, register weak topic in profile
    if (percentage < 60) {
      await LearningProfile.findOneAndUpdate(
        { userId: req.user.userId },
        {
          $addToSet: {
            weakTopics: {
              topic: exam.subject,
              averageScore: percentage,
              lastAttemptDate: new Date(),
              documentId: exam.documentId,
            },
          },
        },
        { upsert: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Exam evaluated successfully",
      data: {
        examId: exam.examId,
        score: correctCount,
        total: exam.totalQuestions,
        totalQuestions: exam.totalQuestions,
        percentage,
        passed: percentage >= 60,
        weakAreas: uniqueWeakAreas,
        review: exam.questions.map((q, idx) => ({
          questionIndex: idx,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          selectedAnswer: q.selectedAnswer,
          isCorrect: q.selectedAnswer === q.correctAnswer,
          explanation: q.explanation,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  generateExam,
  getExams,
  getExamById,
  submitExam,
};
