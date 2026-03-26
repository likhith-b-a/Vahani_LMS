import { ApiError } from "./ApiError.js";

/**
 * Wraps Prisma operations and converts errors to ApiError instances
 * @param {Function} operation - The Prisma operation to execute
 * @param {string} message - Error message to throw if operation fails
 * @returns {Promise} - Result of the Prisma operation
 */
export const handlePrismaOperation = async (operation, message = "Database operation failed") => {
  try {
    return await operation();
  } catch (prismaError) {
    console.log("Prisma error:", prismaError.message);
    console.log(prismaError)
    // Map Prisma error codes to user-friendly messages
    const errorMap = {
      P2002: "This record already exists",
      P2025: "Record not found",
      P2000: "The provided value is too long for the database column",
      P2003: "Foreign key constraint failed",
      P2014: "The change you are trying to make would violate a required relation",
      P2012: "Missing a required relation on the field",
      P2009: "Failed to validate the query",
      P2010: "Raw query failed",
    };

    const errorMessage = errorMap[prismaError.code] || message;
    const statusCode = prismaError.code === "P2025" ? 404 : 400;
    
    throw new ApiError(statusCode, errorMessage);
  }
};
