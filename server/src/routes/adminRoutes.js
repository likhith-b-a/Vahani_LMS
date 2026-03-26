import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import {
  assignScholarsToProgramme,
  createAdminProgramme,
  createAdminUser,
  deleteAdminAssignment,
  deleteAdminProgramme,
  deleteAdminUser,
  getAdminOverview,
  getAdminProgrammes,
  getAdminReports,
  getAdminUsers,
  getSystemSettings,
  removeScholarFromProgramme,
  updateAdminProgramme,
  updateAdminUser,
  updateSystemSettings,
} from "../controllers/adminController.js";

const router = Router();

router.use(isAuthenticated, isAuthorized("admin"));

router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.post("/users", createAdminUser);
router.patch("/users/:userId", updateAdminUser);
router.delete("/users/:userId", deleteAdminUser);

router.get("/programmes", getAdminProgrammes);
router.post("/programmes", createAdminProgramme);
router.patch("/programmes/:programmeId", updateAdminProgramme);
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
