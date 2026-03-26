import { Router } from "express";
import { createAnnouncement, getAnnouncements } from "../controllers/announcementController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/", getAnnouncements);
router.post("/", isAuthorized("programme_manager", "admin"), createAnnouncement);

export default router;
