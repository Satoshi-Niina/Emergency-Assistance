import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema.js';
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/emergency_assistance';

console.log("🔍 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL);
console.log("🔍 DEBUG server/db/index.ts: connectionString =", connectionString);

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema }; 