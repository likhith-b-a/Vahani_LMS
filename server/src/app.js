import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { logger } from "./utils/logger.js";

const app = express();

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      logger.warn("Blocked CORS origin", { origin: normalizedOrigin });
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(requestLogger);

import authRoutes from "./routes/authRoutes.js";
import programmeRoutes from "./routes/programmeRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

// app.use("/",programmeRoutes);
app.use("/assignments",assignmentRoutes);
app.use("/programmes",programmeRoutes);
app.use("/admin", adminRoutes);
app.use("/notifications", notificationRoutes);
app.use("/announcements", announcementRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/certificates", certificateRoutes);
app.use("/queries", queryRoutes);
app.use("/emails", emailRoutes);
app.use("/", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export {app};
