import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import authRoutes from "./routes/authRoutes.js";
import programmeRoutes from "./routes/programmeRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";

// app.use("/",programmeRoutes);
app.use("/assignments",assignmentRoutes);
app.use("/programmes",programmeRoutes);
app.use("/admin", adminRoutes);
app.use("/notifications", notificationRoutes);
app.use("/announcements", announcementRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/certificates", certificateRoutes);
app.use("/queries", queryRoutes);
app.use("/", authRoutes);

// // 404 handler - must be after all route definitions
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    statusCode: 404,
  });
});

// Global error handler - must be last middleware
app.use((err, req, res, next) => {

  // Handle ApiError instances
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.log(err)
  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    errors: err.errors || [],
  });
});

export {app};
