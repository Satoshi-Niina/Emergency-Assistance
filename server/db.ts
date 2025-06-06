
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// PostgreSQL接続設定
const connectionString = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/emergency_recovery";

// PostgreSQL接続プール作成
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORMインスタンス作成
export const db = drizzle(sql, { schema });

// Add connection health check function with retry logic
export async function checkDatabaseConnection(): Promise<boolean> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Simple connection test
      await sql`SELECT 1 as test`;
      return true;
    } catch (error) {
      retryCount++;
      console.warn(`Database connection attempt ${retryCount}/${maxRetries} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
}

// データベース接続プールの設定を改善
export async function ensureDatabaseConnection(): Promise<boolean> {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        return true;
      }
      retries++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return false;
}
