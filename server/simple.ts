import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

// CORS險ｭ螳・
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4173', // Vite preview port
  'http://localhost:5001', // Vite dev port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5001'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Origin',
    'Accept',
    'credentials',
    'cache-control'
  ],
  exposedHeaders: ['Set-Cookie']
}));

// JSON繝代・繧ｹ
app.use(express.json());

// 繝倥Ν繧ｹ繝√ぉ繝・け
app.get("/api/health", (_, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 繝・せ繝育畑繝ｭ繧ｰ繧､繝ｳAPI
app.post("/api/auth/login", (req, res) => {
  console.log('Login request:', req.body);
  res.json({ 
    message: "繝ｭ繧ｰ繧､繝ｳ謌仙粥", 
    user: { id: '123', name: '繝・せ繝医Θ繝ｼ繧ｶ繝ｼ' },
    timestamp: new Date().toISOString()
  });
});

// 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ蜿門ｾ輸PI
app.get("/api/auth/me", (req, res) => {
  res.json({
    id: '123',
    username: 'niina',
    displayName: '邂｡逅・・,
    role: 'admin',
    department: '繧ｷ繧ｹ繝・Β邂｡逅・
  });
});

// 繝√Ε繝・ヨ髢｢騾｣API・医ム繝溘・・・
app.get("/api/chats/:chatId/last-export", (req, res) => {
  console.log('Get last export request for chat:', req.params.chatId);
  res.json({ 
    lastExport: null,
    timestamp: new Date().toISOString()
  });
});

// 縺昴・莉悶・繝√Ε繝・ヨAPI・医ム繝溘・・・
app.get("/api/chats/:chatId/*", (req, res) => {
  console.log('Chat API request:', req.path);
  res.json({ 
    success: true,
    data: [],
    timestamp: new Date().toISOString()
  });
});

// 繧ｵ繝ｼ繝舌・襍ｷ蜍・
app.listen(port, () => {
  console.log(`噫 Simple server listening on port ${port}`);
  console.log(`肌 CORS allowed origins:`, allowedOrigins);
}); 