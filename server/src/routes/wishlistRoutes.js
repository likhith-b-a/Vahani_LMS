import { Router } from "express";
import {
  addToWishlist,
  getAdminWishlist,
  getAdminWishlistOverview,
  getMyWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/me", isAuthorized("scholar"), getMyWishlist);
router.post("/", isAuthorized("scholar"), addToWishlist);
router.delete("/:wishlistId", isAuthorized("scholar"), removeFromWishlist);
router.get("/admin/all", isAuthorized("admin"), getAdminWishlist);
router.get("/admin/ai-overview", isAuthorized("admin"), getAdminWishlistOverview);

export default router;
