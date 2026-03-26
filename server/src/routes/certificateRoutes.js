import { Router } from "express";
import {
  claimCertificate,
  getMyCertificates,
  issueCertificate,
} from "../controllers/certificateController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/me", isAuthorized("scholar"), getMyCertificates);
router.post("/", isAuthorized("programme_manager"), issueCertificate);
router.patch("/:certificateId/claim", isAuthorized("scholar"), claimCertificate);

export default router;
