import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 接続プールの設定とエラーハンドリングを追加
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
  onparameter: () => {},
  socket: {
    keepalive: true
  }
});

// 接続エラーのハンドリング
client.on('error', (err) => {
  console.error('Database connection error:', err);
});

export const db = drizzle(client, { schema });