import express from "express";
import {
  createStudyPlan,
  getStudyPlans,
  getStudyPlanById,
  updateStudyPlan,
  toggleTaskCompleted,
  deleteStudyPlan,
  generateAiStudyPlan,
} from "../controllers/studyPlanController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import {
  validateParamId,
  validateStudyPlanInput,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/generate", aiLimiter, validateStudyPlanInput, generateAiStudyPlan);
router.patch(
  "/:id/tasks/:taskId",
  validateParamId("id"),
  validateParamId("taskId"),
  toggleTaskCompleted
);

router.route("/")
  .post(createStudyPlan)
  .get(getStudyPlans);

router.route("/:id")
  .get(validateParamId("id"), getStudyPlanById)
  .put(validateParamId("id"), updateStudyPlan)
  .delete(validateParamId("id"), deleteStudyPlan);

export default router;
