import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// PostgreSQL接続の設定
const sql = postgres(process.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 30,
  socket_timeout: 60,
  onnotice: () => {},
  onparameter: () => {},
  retry_delay: 1000,
  max_lifetime: 60 * 30,
});

export const db = drizzle(sql, { schema });