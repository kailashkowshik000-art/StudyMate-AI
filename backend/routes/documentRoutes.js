import express from "express";
import {
  uploadDocument,
  getDocumentStatus,
  getDocuments,
  getDocumentById,
  downloadDocument,
  reprocessDocument,
  deleteDocument,
  getQueueHealthStatus,
} from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../services/fileService.js";
import { validateParamId } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

// Queue Health & Operational Metrics (Protected - Must precede /:id parameter)
router.get("/queue/health", getQueueHealthStatus);

router.route("/")
  .post(upload.single("file"), uploadDocument)
  .get(getDocuments);

router.get("/:id/status", validateParamId("id"), getDocumentStatus);
router.post("/:id/retry", validateParamId("id"), reprocessDocument);
router.post("/:id/reprocess", validateParamId("id"), reprocessDocument);

router.route("/:id")
  .get(validateParamId("id"), getDocumentById)
  .delete(validateParamId("id"), deleteDocument);

router.get("/:id/download", validateParamId("id"), downloadDocument);
router.get("/:id/file", validateParamId("id"), downloadDocument);

export default router;
