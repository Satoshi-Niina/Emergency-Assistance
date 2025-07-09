import * as dotenv from "dotenv";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";

dotenv.config({ path: "../.env" });

const DATABASE_URL = process.env.DATABASE_URL;

console.log("🔍 DEBUG: DATABASE_URL =", DATABASE_URL);

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("azure") ? { rejectUnauthorized: false } : false,
});

// Drizzle ORM接続
export const db = drizzle(pool);

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (err) {
    console.error("❌ Database connection error:", err);
    throw err;
  }
};

export default pool;
