import express from "express";
import {
  generateSummary,
  getSummary,
  exportSummary,
  getQualityAudit,
  improveSummary,
} from "../controllers/summaryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validateParamId } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", aiLimiter, generateSummary);
router.get("/:documentId/export", validateParamId("documentId"), exportSummary);
router.get("/:documentId/quality", validateParamId("documentId"), getQualityAudit);
router.post("/:documentId/improve", validateParamId("documentId"), aiLimiter, improveSummary);
router.get("/:documentId", validateParamId("documentId"), getSummary);

export default router;
