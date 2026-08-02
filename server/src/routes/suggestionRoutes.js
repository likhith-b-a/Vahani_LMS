import { Router } from "express";
import {
  addSuggestion,
  getAdminSuggestions,
  getMySuggestions,
  removeSuggestion,
} from "../controllers/suggestionController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/me", isAuthorized("scholar"), getMySuggestions);
router.post("/", isAuthorized("scholar"), addSuggestion);
router.delete("/:suggestionId", isAuthorized("scholar"), removeSuggestion);
router.get("/admin/all", isAuthorized("admin"), getAdminSuggestions);

export default router;
