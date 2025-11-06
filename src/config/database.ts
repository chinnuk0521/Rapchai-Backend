import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env.js";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Prisma automatically handles connection pooling based on DATABASE_URL
    // For Supabase pooler, ensure DATABASE_URL uses port 6543 (Session Pooler)
    // Connection pooling is configured via the connection string itself
  });

if (env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}

export async function connectDatabase(retries: number = 3): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully");
      return;
    } catch (error: any) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      
      if (isLastAttempt) {
        console.error(`❌ Database connection failed after ${retries} attempts:`, error?.message || error);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.warn(`⚠️ Database connection attempt ${attempt} failed, retrying in ${delay}ms...`, error?.message || error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  if (lastError) {
    throw lastError;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database disconnection failed:", error);
    throw error;
  }
}

export async function healthCheckDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Database health check failed:", error);
    return false;
  }
}
