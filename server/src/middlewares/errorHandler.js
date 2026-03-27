import { logger } from "../utils/logger.js";

const notFoundHandler = (req, res) => {
  logger.warn("Route not found", {
    method: req.method,
    path: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    statusCode: 404,
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    stack:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.stack,
    userId: req.user?.id,
  });

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    errors: err.errors || [],
  });
};

export { errorHandler, notFoundHandler };
