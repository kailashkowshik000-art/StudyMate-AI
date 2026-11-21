import express from "express";
import {
  getAnalytics,
  getRecommendations,
  getActivities,
  logActivity,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAnalytics);
router.get("/recommendations", getRecommendations);
router.get("/activities", getActivities);
router.post("/log", logActivity);

export default router;
