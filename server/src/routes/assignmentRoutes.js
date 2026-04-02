import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { uploadMemory } from "../middlewares/multer.js";
import {
  bulkEvaluateSubmissions,
  createAssignment,
  evaluateSubmission,
  getAssignmentsByProgramme,
  getManagedSubmissions,
  getUserAssignments,
  submitAssignment,
  updateAssignment,
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
  "/managed/assignments/:assignmentId",
  isAuthenticated,
  isAuthorized("programme_manager"),
  updateAssignment,
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
  uploadMemory.single("file"),
  bulkEvaluateSubmissions,
);
router.get("/:programmeId", isAuthenticated, getAssignmentsByProgramme);
router.post(
  "/:assignmentId/submit",
  isAuthenticated,
  uploadMemory.single("file"),
  submitAssignment,
);

export default router;
