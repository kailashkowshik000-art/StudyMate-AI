import express from "express";
import {
  generateExam,
  getExams,
  getExamById,
  submitExam,
} from "../controllers/examController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  validateParamId,
  validateExamInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/generate", aiLimiter, validateExamInput, generateExam);
router.post("/:id/submit", validateParamId("id"), submitExam);

router.route("/")
  .get(getExams);

router.route("/:id")
  .get(validateParamId("id"), getExamById);

export default router;
