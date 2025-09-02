import type { Express } from "express";

/**
 * 誰でも200を返すヘルスチェック（認証やCORSより前に登録）
 */
export function registerHealth(app: Express) {
  app.get("/health", (_req, res) => res.status(200).send("OK"));
}
