import express from "express";
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
} from "../controllers/quizController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  validateParamId,
  validateQuizInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .post(aiLimiter, validateQuizInput, createQuiz)
  .get(getQuizzes);

router.route("/:id")
  .get(validateParamId("id"), getQuizById);

router.route("/:id/submit")
  .post(validateParamId("id"), submitQuiz);

export default router;
