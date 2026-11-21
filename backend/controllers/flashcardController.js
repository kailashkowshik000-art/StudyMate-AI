import mongoose from "mongoose";
import Flashcard from "../models/Flashcard.js";
import Document from "../models/Document.js";
import TextChunk from "../models/TextChunk.js";
import { generateFlashcards } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";

const getCardQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ flashcardId: id }, { _id: id }] }
    : { flashcardId: id };
};

// @desc    Create a new flashcard
// @route   POST /api/flashcards
// @access  Private
export const createFlashcard = async (req, res, next) => {
  try {
    const { documentId, topic, question, answer, difficulty } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required",
      });
    }

    const card = await Flashcard.create({
      userId: req.user.userId,
      documentId: documentId || null,
      topic: topic || "Core Terminology",
      question: question.trim(),
      answer: answer.trim(),
      difficulty: difficulty || "medium",
      nextReview: new Date(),
    });

    const cardObj = card.toObject();
    res.status(201).json({
      success: true,
      message: "Flashcard created successfully",
      data: {
        ...cardObj,
        flashcard: cardObj,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all flashcards for user (with due filter)
// @route   GET /api/flashcards
// @access  Private
export const getFlashcards = async (req, res, next) => {
  try {
    const { documentId, dueOnly } = req.query;

    const filter = { userId: req.user.userId };
    if (documentId) filter.documentId = documentId;
    if (dueOnly === "true") {
      filter.nextReview = { $lte: new Date() };
    }

    const cards = await Flashcard.find(filter).sort({ nextReview: 1 });

    const dueCount = await Flashcard.countDocuments({
      userId: req.user.userId,
      nextReview: { $lte: new Date() },
    });

    res.status(200).json({
      success: true,
      data: cards,
      flashcards: cards,
      totalCount: cards.length,
      dueCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single flashcard by ID
// @route   GET /api/flashcards/:id
// @access  Private
export const getFlashcardById = async (req, res, next) => {
  try {
    const card = await Flashcard.findOne(getCardQuery(req.params.id));

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    if (card.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's flashcard",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        flashcard: card,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update flashcard
// @route   PUT /api/flashcards/:id
// @access  Private
export const updateFlashcard = async (req, res, next) => {
  try {
    const card = await Flashcard.findOne(getCardQuery(req.params.id));

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    if (card.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot update another user's flashcard",
      });
    }

    const { question, answer, topic, difficulty } = req.body;
    if (question) card.question = question.trim();
    if (answer) card.answer = answer.trim();
    if (topic) card.topic = topic.trim();
    if (difficulty) card.difficulty = difficulty;

    await card.save();

    res.status(200).json({
      success: true,
      message: "Flashcard updated successfully",
      data: {
        flashcard: card,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
export const deleteFlashcard = async (req, res, next) => {
  try {
    const card = await Flashcard.findOne(getCardQuery(req.params.id));

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    if (card.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot delete another user's flashcard",
      });
    }

    await Flashcard.deleteOne({ _id: card._id });

    res.status(200).json({
      success: true,
      message: "Flashcard deleted successfully",
      data: {
        flashcardId: card.flashcardId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Flashcards from document content
// @route   POST /api/flashcards/generate
// @access  Private
export const generateAiFlashcards = async (req, res, next) => {
  try {
    const { documentId, topic, numberOfCards = 5 } = req.body;

    let docTitle = "Course Material";
    let chunks = [];

    if (documentId) {
      const doc = await Document.findOne({
        documentId,
        userId: req.user.userId,
      });

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }
      docTitle = doc.fileName;

      chunks = await TextChunk.find({
        documentId,
        userId: req.user.userId,
      })
        .sort({ chunkIndex: 1 })
        .lean();
    }

    // Call Gemini Flashcard generator
    const generatedCards = await generateFlashcards({
      documentTitle: docTitle,
      chunks,
      topic: topic || "Core Concepts",
      numberOfCards: Number(numberOfCards) || 5,
    });

    // Save cards into database
    const cardDocs = await Flashcard.insertMany(
      generatedCards.map((c) => ({
        userId: req.user.userId,
        documentId: documentId || null,
        topic: topic || docTitle.replace(/\.pdf$/i, ""),
        question: c.question,
        answer: c.answer,
        difficulty: c.difficulty || "medium",
        nextReview: new Date(),
        reviewCount: 0,
      }))
    );

    // Record study activity
    await recordActivity({
      userId: req.user.userId,
      documentId: documentId || null,
      activityType: "flashcard_review",
      topic: topic || docTitle,
      duration: 10,
      metadata: { generatedCount: cardDocs.length },
    });

    res.status(201).json({
      success: true,
      message: `Generated and saved ${cardDocs.length} study flashcards`,
      data: {
        flashcards: cardDocs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review a flashcard with Spaced Repetition (Section 13)
// @route   POST /api/flashcards/:id/review
// @access  Private
export const reviewFlashcard = async (req, res, next) => {
  try {
    const rating = req.body.rating || req.body.quality || "medium"; // 'easy' | 'medium' | 'hard'

    const card = await Flashcard.findOne(getCardQuery(req.params.id));

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    if (card.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot review another user's flashcard",
      });
    }

    const reviewCount = (card.reviewCount || 0) + 1;
    let nextIntervalDays = 1;

    // Simple spaced repetition interval calculation
    if (rating === "easy") {
      nextIntervalDays = Math.max(3, 4 * reviewCount);
    } else if (rating === "medium") {
      nextIntervalDays = Math.max(1, 2 * reviewCount);
    } else {
      // Hard: review again within 12 hours or next day
      nextIntervalDays = 0.5;
    }

    const nextReview = new Date(Date.now() + nextIntervalDays * 86400000);

    card.lastReviewed = new Date();
    card.nextReview = nextReview;
    card.reviewCount = reviewCount;
    if (rating) card.difficulty = rating;

    await card.save();

    // Record learning activity
    await recordActivity({
      userId: req.user.userId,
      documentId: card.documentId,
      activityType: "flashcard_review",
      topic: card.topic,
      duration: 2,
      metadata: { rating, reviewCount },
    });

    const cardObj = card.toObject();
    res.status(200).json({
      success: true,
      message: "Flashcard review recorded with spaced repetition schedule",
      data: {
        ...cardObj,
        flashcard: cardObj,
        nextReviewDate: nextReview,
        daysUntilNextReview: Math.round(nextIntervalDays * 10) / 10,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createFlashcard,
  getFlashcards,
  getFlashcardById,
  updateFlashcard,
  deleteFlashcard,
  generateAiFlashcards,
  reviewFlashcard,
};
