import prismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const { PrismaClient } = prismaClientPkg;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const db = global.__prisma__ ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = db;
}

export default db;
export { db };
