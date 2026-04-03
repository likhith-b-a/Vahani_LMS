import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { uploadMemory } from "../middlewares/multer.js";
import {
  assignScholarsToProgramme,
  bulkCreateAdminUsers,
  createAdminProgramme,
  createAdminUser,
  deleteAdminAssignment,
  deleteAdminProgramme,
  deleteAdminUser,
  downloadAdminUserTemplate,
  getAdminOverview,
  getAdminProgrammes,
  getAdminProgrammeDetail,
  getAdminReports,
  getAdminSummary,
  getAdminUserDetail,
  getAdminUsers,
  getSystemSettings,
  processAdminProgrammeEnrollmentRequests,
  removeScholarFromProgramme,
  updateAdminProgramme,
  updateAdminUser,
  updateSystemSettings,
} from "../controllers/adminController.js";

const router = Router();

router.use(isAuthenticated, isAuthorized("admin"));

router.get("/summary", getAdminSummary);
router.get("/overview", getAdminOverview);
router.get("/users/template", downloadAdminUserTemplate);
router.get("/users", getAdminUsers);
router.get("/users/:userId", getAdminUserDetail);
router.post("/users/bulk", uploadMemory.single("file"), bulkCreateAdminUsers);
router.post("/users", createAdminUser);
router.patch("/users/:userId", updateAdminUser);
router.delete("/users/:userId", deleteAdminUser);

router.get("/programmes", getAdminProgrammes);
router.get("/programmes/:programmeId", getAdminProgrammeDetail);
router.post("/programmes", createAdminProgramme);
router.patch("/programmes/:programmeId", updateAdminProgramme);
router.post("/programmes/:programmeId/process-enrollment-requests", processAdminProgrammeEnrollmentRequests);
router.delete("/programmes/:programmeId", deleteAdminProgramme);
router.post("/programmes/:programmeId/enrollments", assignScholarsToProgramme);
router.delete(
  "/programmes/:programmeId/enrollments/:scholarId",
  removeScholarFromProgramme,
);

router.delete("/assignments/:assignmentId", deleteAdminAssignment);

router.get("/reports", getAdminReports);
router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSettings);

export default router;
