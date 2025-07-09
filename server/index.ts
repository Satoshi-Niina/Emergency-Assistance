import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bodyParser from "body-parser";
import { authRouter } from "./routes/auth.js";
import { emergencyGuideRouter } from "./routes/emergency-guide-router.js";
import { registerRoutes } from "./routes/index.js";
import { createDefaultUsers } from "./scripts/create-default-users.js";
import { connectDB } from "./db.js";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サーバー起動時に重要なパス・存在有無をログ出力
function logPathStatus(label: string, relPath: string) {
  const absPath = path.resolve(__dirname, relPath);
  const exists = fs.existsSync(absPath);
  console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
}

logPathStatus('knowledge-base/images/emergency-flows', '../knowledge-base/images/emergency-flows');
logPathStatus('knowledge-base/data', '../knowledge-base/data');
logPathStatus('knowledge-base/troubleshooting', '../knowledge-base/troubleshooting');
logPathStatus('.env', '../.env');
logPathStatus('OpenAI API KEY', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');

console.log('サーバー起動開始');
dotenv.config({ path: "./server/.env" });

console.log('Expressインスタンス作成');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
console.log('ミドルウェア設定');
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax', // Adjust SameSite attribute
    },
  })
);

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
console.log('ルーティング設定');
// 画像配信は認証なしでOK
app.use('/api/emergency-flow/image', express.static(path.join(__dirname, '../knowledge-base/images/emergency-flows')));

// 認証が必要なAPIルートはこの下に書く
app.use("/api/auth", authRouter);
app.use("/api/emergency-guides", emergencyGuideRouter);
registerRoutes(app);


// Start the server
console.log('サーバーlisten開始');
app.listen(port, async () => {
  console.log(`🚀 Server listening on port ${port}`);
  
  // Try to connect to database (optional for development)
  // try {
  //   await connectDB();
  //   await createDefaultUsers();
  // } catch (err) {
  //   console.warn("⚠️ Database connection failed, but server is running:", err);
  // }
});
console.log('サーバーindex.tsファイルの終端');
