import { Router } from "express";
import {
  claimCertificate,
  downloadCertificate,
  generateProgrammeCertificates,
  getMyCertificates,
  getProgrammeCertificates,
  updateCertificate,
  verifyCertificate,
  verifyCertificatePage,
} from "../controllers/certificateController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.get("/verify/:credentialId/page", verifyCertificatePage);
router.get("/verify/:credentialId", verifyCertificate);

router.use(isAuthenticated);
router.get("/me", isAuthorized("scholar"), getMyCertificates);
router.get(
  "/programmes/:programmeId",
  isAuthorized("programme_manager"),
  getProgrammeCertificates,
);
router.post(
  "/programmes/:programmeId/generate",
  isAuthorized("programme_manager"),
  generateProgrammeCertificates,
);
router.patch(
  "/:certificateId",
  isAuthorized("programme_manager"),
  updateCertificate,
);
router.get(
  "/:certificateId/download",
  isAuthorized("scholar", "programme_manager", "admin"),
  downloadCertificate,
);
router.patch("/:certificateId/claim", isAuthorized("scholar"), claimCertificate);

export default router;
