import { Router } from "express";
import {
  changePassword,
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  signupUser,
  updateCurrentUserProfile,
} from "../controllers/authControllers.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/logout", isAuthenticated, logoutUser);
router.post("/logout", isAuthenticated, logoutUser);
router.post("/refreshAccessToken", refreshAccessToken);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", resetPasswordWithOtp);
router.post("/change-password", isAuthenticated, changePassword);
router.get("/me", isAuthenticated, getCurrentUserProfile);
router.patch("/me", isAuthenticated, updateCurrentUserProfile);

export default router;
