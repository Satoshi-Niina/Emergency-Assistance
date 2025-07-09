import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import emergencyFlowRoutes from './routes/emergency-flow.js';
import flowGeneratorRoutes from './routes/flow-generator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './routes/auth.js';
import { techSupportRouter } from './routes/tech-support.js';
import { registerChatRoutes } from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サーバー起動時に重要なパス・存在有無をログ出力
function logPathStatus(label: string, relPath: string) {
  const absPath = path.resolve(__dirname, relPath);
  const exists = fs.existsSync(absPath);
  console.log(`🔎 [起動時パス確認] ${label}: ${absPath} (exists: ${exists})`);
}

logPathStatus('knowledge-base/images', '../../knowledge-base/images');
logPathStatus('knowledge-base/data', '../../knowledge-base/data');
logPathStatus('knowledge-base/troubleshooting', '../../knowledge-base/troubleshooting');
logPathStatus('.env', '../../.env');
logPathStatus('OpenAI API KEY', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');

dotenv.config(); // .env 読み込み（省略していた部分）

const app = express();

// CORS設定（フロントエンドからのリクエストを許可）
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview port
  'http://localhost:5001', // Vite dev port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5001'
];

// 環境変数で追加のオリジンが指定されている場合は追加
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // 開発環境では origin が null の場合も許可（Postman等からのリクエスト）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// JSONパース
app.use(express.json());

// セッション設定（セッションでログイン情報を保持）
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 本番では true に（HTTPSのみで送信されるようになる）
    httpOnly: true,
    sameSite: 'lax', // 重要: クロスサイトでもセッション維持しやすく
    maxAge: 1000 * 60 * 60 // 1時間
  }
}));

// ✅ ヘルスチェックAPI
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 旧ダミー認証API群を削除し、実際のauthRouterをマウント
app.use('/api/auth', authRouter);
app.use('/api/tech-support', techSupportRouter);

// チャットルートを登録
registerChatRoutes(app);

// ルートの登録
app.use('/api/emergency-flow', emergencyFlowRoutes);
app.use('/api/flow-generator', flowGeneratorRoutes);

// 👇 サーバーを外部ファイルで起動する場合に備えて export
export default app;

// Named export for createApp function
export const createApp = () => app;

