import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { upload } from "../middlewares/multer.js";
import {
  bulkEvaluateSubmissions,
  createAssignment,
  evaluateSubmission,
  getAssignmentsByProgramme,
  getManagedSubmissions,
  getUserAssignments,
  submitAssignment,
} from "../controllers/assignmentController.js";

const router = Router();

router.get("/my-assignments", isAuthenticated, getUserAssignments);
router.get(
  "/managed/submissions",
  isAuthenticated,
  isAuthorized("programme_manager"),
  getManagedSubmissions,
);
router.post(
  "/programmes/:programmeId",
  isAuthenticated,
  isAuthorized("programme_manager"),
  createAssignment,
);
router.patch(
  "/submissions/:submissionId/evaluate",
  isAuthenticated,
  isAuthorized("programme_manager"),
  evaluateSubmission,
);
router.post(
  "/managed/assignments/:assignmentId/bulk-evaluate",
  isAuthenticated,
  isAuthorized("programme_manager"),
  upload.single("file"),
  bulkEvaluateSubmissions,
);
router.get("/:programmeId", isAuthenticated, getAssignmentsByProgramme);
// router.post("/:assignmentId/submit", isAuthenticated, submitAssignment);

router.post(
  "/:assignmentId/submit",
  isAuthenticated,
  // isAuthorized("scholar"),
  upload.single("file"), // 👈 important
  submitAssignment,
);
export default router;
