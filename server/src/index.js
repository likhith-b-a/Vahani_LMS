import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { db } from "./db.js";

async function startServer() {
  try {
    await db.$connect();
    console.log("✅ Database connected successfully");

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port: ${process.env.PORT || 5000}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1); // stop server if DB fails
  }
}

startServer();


// app.listen(process.env.PORT || 5000, () => {
//   console.log(`Server running on port: ${process.env.PORT}`);
// });

