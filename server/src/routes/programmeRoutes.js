import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import {
  addManagedProgrammeMeetingLink,
  addManagedProgrammeResource,
  getDiscoverableProgrammes,
  getManagedProgrammes,
  getMyProgrammes,
  getProgrammeDetail,
  selfEnrollInProgramme,
} from "../controllers/programmeController.js";

const router = Router();

router.get("/my-programmes", isAuthenticated, getMyProgrammes);
router.get("/discover", isAuthenticated, isAuthorized("scholar"), getDiscoverableProgrammes);
router.post(
  "/managed/:programmeId/resources",
  isAuthenticated,
  isAuthorized("programme_manager"),
  addManagedProgrammeResource,
);
router.post(
  "/managed/:programmeId/meeting-links",
  isAuthenticated,
  isAuthorized("programme_manager"),
  addManagedProgrammeMeetingLink,
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
