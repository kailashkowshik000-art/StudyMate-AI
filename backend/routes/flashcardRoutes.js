import express from "express";
import {
  createFlashcard,
  getFlashcards,
  getFlashcardById,
  updateFlashcard,
  deleteFlashcard,
  generateAiFlashcards,
  reviewFlashcard,
} from "../controllers/flashcardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  validateParamId,
  validateFlashcardInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/generate", aiLimiter, validateFlashcardInput, generateAiFlashcards);
router.post("/:id/review", validateParamId("id"), reviewFlashcard);

router.route("/")
  .post(createFlashcard)
  .get(getFlashcards);

router.route("/:id")
  .get(validateParamId("id"), getFlashcardById)
  .put(validateParamId("id"), updateFlashcard)
  .delete(validateParamId("id"), deleteFlashcard);

export default router;
