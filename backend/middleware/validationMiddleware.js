import mongoose from "mongoose";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_SAFE_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validates identifier parameters (UUID, slug or Mongo ObjectId)
 * Prevents NoSQL injection and directory traversal attacks
 */
export function isValidId(id) {
  if (!id || typeof id !== "string") return false;
  if (id.includes("..") || id.includes("/") || id.includes("\\")) return false;
  if (mongoose.Types.ObjectId.isValid(id)) return true;
  return ID_SAFE_REGEX.test(id);
}

/**
 * Middleware to validate :id parameter on routes
 */
export const validateParamId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or malformed identifier: ${paramName}`,
      });
    }
    next();
  };
};

/**
 * Validate User Registration Payload
 */
export const validateRegisterInput = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters long",
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Name cannot exceed 100 characters",
    });
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (password.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Password cannot exceed 128 characters",
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate User Login Payload
 */
export const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validate Chat Message Input
 */
export const validateChatMessageInput = (req, res, next) => {
  const { content, documentId } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Message content cannot be empty",
    });
  }

  if (content.length > 4000) {
    return res.status(400).json({
      success: false,
      message: "Message content cannot exceed 4000 characters",
    });
  }

  if (documentId && !isValidId(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid documentId format",
    });
  }

  req.body.content = content.trim();
  next();
};

/**
 * Validate Quiz Generation Options
 */
export const validateQuizInput = (req, res, next) => {
  const { numQuestions, difficulty, documentId } = req.body;

  if (documentId && !isValidId(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid documentId format",
    });
  }

  if (numQuestions !== undefined) {
    const parsed = Number(numQuestions);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      return res.status(400).json({
        success: false,
        message: "numQuestions must be an integer between 1 and 20",
      });
    }
    req.body.numQuestions = parsed;
  }

  if (difficulty !== undefined) {
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: "difficulty must be one of: 'easy', 'medium', 'hard'",
      });
    }
  }

  next();
};

/**
 * Validate Exam Generation Options
 */
export const validateExamInput = (req, res, next) => {
  const { numQuestions, timeLimit, difficulty, documentId } = req.body;

  if (documentId && !isValidId(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid documentId format",
    });
  }

  if (numQuestions !== undefined) {
    const parsed = Number(numQuestions);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
      return res.status(400).json({
        success: false,
        message: "numQuestions must be an integer between 1 and 30",
      });
    }
    req.body.numQuestions = parsed;
  }

  if (timeLimit !== undefined) {
    const parsed = Number(timeLimit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
      return res.status(400).json({
        success: false,
        message: "timeLimit must be an integer between 1 and 180 minutes",
      });
    }
    req.body.timeLimit = parsed;
  }

  if (difficulty !== undefined && !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({
      success: false,
      message: "difficulty must be one of: 'easy', 'medium', 'hard'",
    });
  }

  next();
};

/**
 * Validate Flashcard Input
 */
export const validateFlashcardInput = (req, res, next) => {
  const { numberOfCards, difficulty, documentId } = req.body;

  if (documentId && !isValidId(documentId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid documentId format",
    });
  }

  if (numberOfCards !== undefined) {
    const parsed = Number(numberOfCards);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      return res.status(400).json({
        success: false,
        message: "numberOfCards must be an integer between 1 and 20",
      });
    }
    req.body.numberOfCards = parsed;
  }

  if (difficulty !== undefined && !["easy", "medium", "hard"].includes(difficulty)) {
    return res.status(400).json({
      success: false,
      message: "difficulty must be one of: 'easy', 'medium', 'hard'",
    });
  }

  next();
};

/**
 * Validate Study Plan Input
 */
export const validateStudyPlanInput = (req, res, next) => {
  const { dailyMinutes, subjects, examDate } = req.body;

  if (dailyMinutes !== undefined) {
    const parsed = Number(dailyMinutes);
    if (!Number.isInteger(parsed) || parsed < 10 || parsed > 480) {
      return res.status(400).json({
        success: false,
        message: "dailyMinutes must be an integer between 10 and 480 minutes",
      });
    }
    req.body.dailyMinutes = parsed;
  }

  if (subjects !== undefined && !Array.isArray(subjects)) {
    return res.status(400).json({
      success: false,
      message: "subjects must be an array of subject names",
    });
  }

  if (examDate !== undefined) {
    const date = new Date(examDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "examDate must be a valid ISO date",
      });
    }
  }

  next();
};

export default {
  isValidId,
  validateParamId,
  validateRegisterInput,
  validateLoginInput,
  validateChatMessageInput,
  validateQuizInput,
  validateExamInput,
  validateFlashcardInput,
  validateStudyPlanInput,
};
