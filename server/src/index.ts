import express from "express";
import cors from "cors";
import { registerHealth } from "./health.js"; // ← ESMなので .js 拡張子が必須

const app = express();

/** ヘルスを最優先で登録（認証/CORSより前） */
registerHealth(app);

/** 必要最低限のミドルウェア */
app.use(cors());
app.use(express.json({ limit: "5mb" }));

/** 動作確認用のルート（不要なら削除可） */
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    app: "backend",
    env: process.env.NODE_ENV ?? "dev",
  });
});

/** Azure App Service は PORT を割り当てる → 0.0.0.0 で待受 */
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
