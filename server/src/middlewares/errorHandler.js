import { logger } from "../utils/logger.js";

const isPrismaError = (err) =>
  err?.name?.startsWith("PrismaClient") ||
  typeof err?.clientVersion === "string";

const getPrismaErrorMessage = (err) => {
  if (err?.code === "P2002") {
    const target = Array.isArray(err?.meta?.target)
      ? err.meta.target.join(", ")
      : err?.meta?.target;
    return target
      ? `Duplicate value for unique field: ${target}`
      : "Duplicate value violates a unique constraint";
  }

  if (err?.code === "P2025") {
    return "The requested record was not found";
  }

  if (err?.code === "P2003") {
    const fieldName = err?.meta?.field_name || "related record";
    return `Operation failed because ${fieldName} is still referenced`;
  }

  if (err?.name === "PrismaClientValidationError") {
    return "Database query validation failed";
  }

  if (err?.name === "PrismaClientInitializationError") {
    return "Database connection could not be initialized";
  }

  if (err?.name === "PrismaClientRustPanicError") {
    return "Database engine encountered an unexpected failure";
  }

  return "Database request failed";
};

const getSafeErrorPayload = (err) => {
  if (isPrismaError(err)) {
    return {
      statusCode: 500,
      message: getPrismaErrorMessage(err),
      logMeta: {
        errorName: err.name,
        prismaCode: err.code,
        prismaMeta: err.meta,
        clientVersion: err.clientVersion,
        stack:
          process.env.NODE_ENV === "production"
            ? undefined
            : err.stack,
      },
    };
  }

  return {
    statusCode: err.statusCode || 500,
    message: err.message || "Internal Server Error",
    logMeta: {
      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : err.stack,
    },
  };
};

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
  const { statusCode, message, logMeta } = getSafeErrorPayload(err);

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    userId: req.user?.id,
    ...logMeta,
  });

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    errors: err.errors || [],
  });
};

export { errorHandler, notFoundHandler };
