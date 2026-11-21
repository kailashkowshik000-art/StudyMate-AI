import express from "express";
import {
  createSession,
  getSessions,
  getSessionMessages,
  sendMessage,
  deleteSession,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  validateParamId,
  validateChatMessageInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/sessions")
  .post(createSession)
  .get(getSessions);

router.route("/sessions/:id")
  .delete(validateParamId("id"), deleteSession);

router.route("/sessions/:id/messages")
  .get(validateParamId("id"), getSessionMessages)
  .post(validateParamId("id"), aiLimiter, validateChatMessageInput, sendMessage);

export default router;
