import { Router } from "express";
import {
  createQuery,
  getQueryDetail,
  getQueries,
  replyToQuery,
  updateQueryStatus,
} from "../controllers/queryController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = Router();

router.use(isAuthenticated);
router.get("/", getQueries);
router.get("/:queryId", getQueryDetail);
router.post("/", isAuthorized("scholar"), createQuery);
router.post("/:queryId/messages", replyToQuery);
router.patch(
  "/:queryId/status",
  isAuthorized("programme_manager", "admin"),
  updateQueryStatus,
);

export default router;
