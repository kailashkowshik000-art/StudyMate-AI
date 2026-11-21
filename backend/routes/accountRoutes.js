import express from "express";
import {
  getSecurityOverview,
  exportUserData,
  deleteAccount,
} from "../controllers/accountController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/security-overview", getSecurityOverview);
router.get("/export", exportUserData);
router.post("/delete", deleteAccount);

export default router;
