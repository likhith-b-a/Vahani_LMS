import { Router } from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import {
  getMyNotifications,
  markMyNotificationsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/me", isAuthenticated, getMyNotifications);
router.post("/read", isAuthenticated, markMyNotificationsRead);

export default router;
