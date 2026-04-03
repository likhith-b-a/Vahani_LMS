import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { uploadMemory } from "../middlewares/multer.js";
import {
  addManagedProgrammeMeetingLink,
  addManagedProgrammeResource,
  bulkEvaluateInteractiveSession,
  createManagedInteractiveSession,
  downloadInteractiveSessionBulkTemplate,
  getDiscoverableProgrammes,
  getManagedProgrammeDetail,
  getManagedProgrammes,
  getManagedProgrammeReport,
  getMyProgrammes,
  getMyProgrammeSchedule,
  getProgrammeDetail,
  getWishlistProgrammeCatalog,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  selfEnrollInProgramme,
  updateManagedInteractiveSession,
} from "../controllers/programmeController.js";

const router = Router();

router.get("/my-programmes", isAuthenticated, getMyProgrammes);
router.get("/my-programmes-schedule", isAuthenticated, getMyProgrammeSchedule);
router.get("/discover", isAuthenticated, isAuthorized("scholar"), getDiscoverableProgrammes);
router.get("/catalog", isAuthenticated, isAuthorized("scholar"), getWishlistProgrammeCatalog);
router.post(
  "/managed/:programmeId/resources",
  isAuthenticated,
  isAuthorized("programme_manager"),
  uploadMemory.single("file"),
  addManagedProgrammeResource,
);
router.post(
  "/managed/:programmeId/meeting-links",
  isAuthenticated,
  isAuthorized("programme_manager"),
  addManagedProgrammeMeetingLink,
);
router.post(
  "/managed/:programmeId/interactive-sessions",
  isAuthenticated,
  isAuthorized("programme_manager"),
  createManagedInteractiveSession,
);
router.patch(
  "/managed/interactive-sessions/:sessionId",
  isAuthenticated,
  isAuthorized("programme_manager"),
  updateManagedInteractiveSession,
);
router.get(
  "/managed/:programmeId/detail",
  isAuthenticated,
  isAuthorized("programme_manager"),
  getManagedProgrammeDetail,
);
router.get(
  "/managed/:programmeId/report",
  isAuthenticated,
  isAuthorized("programme_manager"),
  getManagedProgrammeReport,
);
router.put(
  "/managed/interactive-sessions/:sessionId/attendance",
  isAuthenticated,
  isAuthorized("programme_manager"),
  markInteractiveSessionAttendance,
);
router.get(
  "/managed/interactive-sessions/:sessionId/bulk-template",
  isAuthenticated,
  isAuthorized("programme_manager"),
  downloadInteractiveSessionBulkTemplate,
);
router.post(
  "/managed/interactive-sessions/:sessionId/bulk-evaluate",
  isAuthenticated,
  isAuthorized("programme_manager"),
  uploadMemory.single("file"),
  bulkEvaluateInteractiveSession,
);
router.post(
  "/managed/:programmeId/publish-results",
  isAuthenticated,
  isAuthorized("programme_manager"),
  publishProgrammeResults,
);
router.post(
  "/:programmeId/self-enroll",
  isAuthenticated,
  isAuthorized("scholar"),
  selfEnrollInProgramme,
);
router.get(
  "/managed/me",
  isAuthenticated,
  isAuthorized("programme_manager"),
  getManagedProgrammes,
);
router.get("/:id",isAuthenticated,getProgrammeDetail);
export default router;
