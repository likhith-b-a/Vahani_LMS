import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { db } from "./db.js";
import { logger } from "./utils/logger.js";

async function startServer() {
  try {
    await db.$connect();
    logger.info("Database connected successfully");

    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
      logger.info("Server running", {
        port,
        nodeEnv: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    logger.error("Database connection failed", {
      message: error.message,
    });
    process.exit(1);
  }
}

startServer();
