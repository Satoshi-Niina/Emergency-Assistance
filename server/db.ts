import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Set DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:takabeni@0.0.0.0:5432/maintenance";

// Initialize postgres client with enhanced Replit-optimized config
const sql = postgres(DATABASE_URL, {
  max: 3, // Reduced connection pool size for stability
  idle_timeout: 30, // Increased idle timeout
  connect_timeout: 60, // Increased connect timeout
  max_lifetime: 60 * 10, // Increased max lifetime to 10 minutes
  connection_timeout: 60,
  keepalive: true,
  prepare: false, // Disable prepared statements for better compatibility
  debug: false, // Always disable debug logs
  onnotice: () => {}, // Suppress all notices
  // Silent connection handling
  onclose: () => {
    // Silent connection close handling
  },
  onparameter: () => {}, // Suppress parameter notices
  // Handle connection errors gracefully
  transform: {
    undefined: null,
  },
});

// Create drizzle database instance
export const db = drizzle(sql, { schema });

// Add connection health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // より軽量な接続テスト
    await sql`SELECT 1 as test`;
    return true;
  } catch (error) {
    // 接続エラーでもサーバーを停止させない
    return false;
  }
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