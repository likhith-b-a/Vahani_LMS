import { Router } from "express";
import {
  addToWishlist,
  getAdminWishlist,
  getMyWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/me", isAuthorized("scholar"), getMyWishlist);
router.post("/", isAuthorized("scholar"), addToWishlist);
router.delete("/:programmeId", isAuthorized("scholar"), removeFromWishlist);
router.get("/admin/all", isAuthorized("admin"), getAdminWishlist);

export default router;
