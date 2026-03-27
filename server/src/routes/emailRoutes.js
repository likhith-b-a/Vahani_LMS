import { Router } from "express";
import { sendRoleBasedEmail } from "../controllers/emailController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import { uploadMemory } from "../middlewares/multer.js";

const router = Router();

router.post(
  "/send",
  isAuthenticated,
  isAuthorized("admin", "programme_manager"),
  uploadMemory.array("attachments", 5),
  sendRoleBasedEmail,
);

export default router;
