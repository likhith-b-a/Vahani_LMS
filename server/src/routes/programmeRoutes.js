import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { uploadMemory } from "../middlewares/multer.js";
import {
  addManagedProgrammeMeetingLink,
  addManagedProgrammeResource,
  createManagedInteractiveSession,
  getDiscoverableProgrammes,
  getManagedProgrammes,
  getManagedProgrammeReport,
  getMyProgrammes,
  getProgrammeDetail,
  getWishlistProgrammeCatalog,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  selfEnrollInProgramme,
} from "../controllers/programmeController.js";

const router = Router();

router.get("/my-programmes", isAuthenticated, getMyProgrammes);
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
