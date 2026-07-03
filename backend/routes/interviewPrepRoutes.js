import express from "express";
import {
  getPreparationGuides,
  getPreparationGuideByKey,
  scheduleMockInterview,
  getMySessions,
  cancelMockInterview,
  submitInterviewFeedback,
  getPerformanceMetrics,
  getQuestionBank,
  addQuestion
} from "../controllers/interviewPrepController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { studentOnly, adminOnly } from "../middlewares/roleMiddleware.js";

const router = express.Router();

/* PREPARATION GUIDES (public technique guides: STAR method, elevator pitch, etc.) */
router.get("/guides", getPreparationGuides);
router.get("/guides/:guideKey", getPreparationGuideByKey);

/* QUESTION BANK */
router.get("/questions", protect, getQuestionBank);
router.post("/questions", protect, adminOnly, addQuestion);

/* MOCK INTERVIEW SCHEDULING */
router.post("/schedule", protect, studentOnly, scheduleMockInterview);
router.get("/my-sessions", protect, studentOnly, getMySessions);
router.patch("/:id/cancel", protect, studentOnly, cancelMockInterview);
router.patch("/:id/feedback", protect, submitInterviewFeedback);

/* PERFORMANCE TRACKING */
router.get("/performance", protect, studentOnly, getPerformanceMetrics);

export default router;
