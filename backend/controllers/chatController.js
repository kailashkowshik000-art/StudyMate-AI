import mongoose from "mongoose";
import ChatSession from "../models/ChatSession.js";
import Message from "../models/Message.js";
import Document from "../models/Document.js";
import LearningProfile from "../models/LearningProfile.js";
import { searchSimilarChunks } from "../services/vectorSearchService.js";
import { generateAnswer } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";

const getSessionQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ sessionId: id }, { _id: id }] }
    : { sessionId: id };
};

// @desc    Create a new chat session
// @route   POST /api/chat/sessions
// @access  Private
export const createSession = async (req, res, next) => {
  try {
    const { documentId, title } = req.body;

    let sessionTitle = title || "New Study Session";

    if (documentId && !title) {
      const doc = await Document.findOne({
        documentId,
        userId: req.user.userId,
      });
      if (doc) sessionTitle = `Discussion: ${doc.fileName}`;
    }

    const session = await ChatSession.create({
      userId: req.user.userId,
      documentId: documentId || null,
      title: sessionTitle,
    });

    // Seed default greeting message in session
    await Message.create({
      sessionId: session.sessionId,
      role: "assistant",
      content:
        "👋 Hello! I am your StudyMate AI academic tutor. Ask me any question about your uploaded course documents and I'll provide grounded explanations with source references!",
      sources: [],
    });

    res.status(201).json({
      success: true,
      data: {
        session,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chat sessions for the user
// @route   GET /api/chat/sessions
// @access  Private
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: {
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages for a specific session
// @route   GET /api/chat/sessions/:id/messages
// @access  Private
export const getSessionMessages = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne(getSessionQuery(req.params.id));

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    if (session.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's chat session",
      });
    }

    const messages = await Message.find({ sessionId: session.sessionId }).sort({
      timestamp: 1,
    });

    res.status(200).json({
      success: true,
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message & receive grounded AI assistant response (RAG flow)
// @route   POST /api/chat/sessions/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { content, documentId: overrideDocId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty",
      });
    }

    const session = await ChatSession.findOne(getSessionQuery(req.params.id));

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    if (session.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot message another user's session",
      });
    }

    // 1. Determine target document filter (if any)
    const effectiveDocId = overrideDocId || session.documentId || null;

    // 2. Save user message to database
    const userMessage = await Message.create({
      sessionId: session.sessionId,
      role: "user",
      content: content.trim(),
    });

    // 3. Fetch recent conversation history for context window
    const recentMessages = await Message.find({ sessionId: session.sessionId })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();
    recentMessages.reverse();

    // 4. Vector Search: Retrieve relevant chunks matching the user question
    const [relevantChunks, userProfile] = await Promise.all([
      searchSimilarChunks({
        userId: req.user.userId,
        documentId: effectiveDocId,
        query: content.trim(),
        topK: 5,
      }),
      LearningProfile.findOne({ userId: req.user.userId }).lean(),
    ]);

    // 5. Generate Grounded Answer via Gemini AI (with student profile awareness)
    const { answer, sources } = await generateAnswer({
      question: content.trim(),
      contextChunks: relevantChunks,
      chatHistory: recentMessages,
      userProfile,
    });

    // 6. Save Assistant response with cited sources
    const assistantMessage = await Message.create({
      sessionId: session.sessionId,
      role: "assistant",
      content: answer,
      sources: sources || [],
    });

    // 7. Record learning activity
    await recordActivity({
      userId: req.user.userId,
      documentId: effectiveDocId,
      activityType: "chat_question",
      topic: content.slice(0, 40),
      duration: 3,
    });

    res.status(201).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        sources: assistantMessage.sources,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a chat session
// @route   DELETE /api/chat/sessions/:id
// @access  Private
export const deleteSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne(getSessionQuery(req.params.id));

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    if (session.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot delete another user's session",
      });
    }

    await Message.deleteMany({ sessionId: session.sessionId });
    await ChatSession.deleteOne({ _id: session._id });

    res.status(200).json({
      success: true,
      message: "Chat session and messages deleted successfully",
      data: {
        sessionId: session.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createSession,
  getSessions,
  getSessionMessages,
  sendMessage,
  deleteSession,
};
