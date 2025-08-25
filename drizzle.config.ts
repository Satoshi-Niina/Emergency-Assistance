
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  out: "./migrations",
  schema: "./server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // 繝・・繧ｿ繝吶・繧ｹ蜷・ webappdb (繝ｭ繝ｼ繧ｫ繝ｫ繝ｻ譛ｬ逡ｪ蜈ｱ騾・
});
