import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Set DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:takabeni@0.0.0.0:5432/maintenance";

// Initialize postgres client with enhanced Replit-optimized config
const sql = postgres(DATABASE_URL, {
  max: 5, // Increased connection pool size
  idle_timeout: 20, // Reduced idle timeout
  connect_timeout: 30, // Increased connect timeout
  max_lifetime: 60 * 5, // Reduced max lifetime to 5 minutes
  connection_timeout: 30,
  keepalive: true,
  prepare: false, // Disable prepared statements for better compatibility
  debug: process.env.NODE_ENV === 'development',
  onnotice: () => {}, // Suppress Replit logs
  // Add retry logic for connection failures
  onclose: () => {
    console.log('Database connection closed, will reconnect on next query');
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
export async function checkDatabaseConnection() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.log('Database connection check failed, connection will be re-established on next query');
    return false;
  }
}