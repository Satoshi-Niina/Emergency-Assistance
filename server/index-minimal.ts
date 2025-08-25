
// UTF-8繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ險ｭ螳・
process.env.LANG = 'ja_JP.UTF-8';
process.env.LC_ALL = 'ja_JP.UTF-8';

import express from "express";
import cors from "cors";
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('噫 譛蟆上し繝ｼ繝舌・襍ｷ蜍暮幕蟋・);
console.log('唐 Working directory:', process.cwd());
console.log('唐 __dirname:', __dirname);

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// 蝓ｺ譛ｬ逧・↑繝溘ラ繝ｫ繧ｦ繧ｧ繧｢
app.use(cors({
  origin: '*',
  credentials: true
}));

// UTF-8繧ｨ繝ｳ繧ｳ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｮ險ｭ螳・
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ縺ｫUTF-8繧定ｨｭ螳・
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 蜊倡ｴ斐↑繝倥Ν繧ｹ繝√ぉ繝・け
app.get('/api/health', (req, res) => {
  console.log('投 繝倥Ν繧ｹ繝√ぉ繝・け繝ｪ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
  res.charset = 'utf-8';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    pid: process.pid,
    message: '譛蟆上し繝ｼ繝舌・縺悟虚菴應ｸｭ縺ｧ縺・,
    encoding: 'UTF-8',
    locale: 'ja-JP'
  });
});

// 繝ｫ繝ｼ繝医お繝ｳ繝峨・繧､繝ｳ繝・
app.get('/', (req, res) => {
  console.log('投 繝ｫ繝ｼ繝医Μ繧ｯ繧ｨ繧ｹ繝亥女菫｡');
  res.json({
    message: '譛蟆上し繝ｼ繝舌・縺梧ｭ｣蟶ｸ縺ｫ蜍穂ｽ懊＠縺ｦ縺・∪縺・,
    timestamp: new Date().toISOString()
  });
});

// 繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
app.use((error: any, req: any, res: any, next: any) => {
  console.error('笶・繧ｨ繝ｩ繝ｼ逋ｺ逕・', error);
  res.status(500).json({
    error: '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 繝励Ο繧ｻ繧ｹ繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
process.on('uncaughtException', (error) => {
  console.error('笶・譛ｪ蜃ｦ逅・ｾ句､・', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('笶・譛ｪ蜃ｦ逅・romise諡貞凄:', reason);
});

// 繧ｵ繝ｼ繝舌・襍ｷ蜍・
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`笨・譛蟆上し繝ｼ繝舌・縺梧ｭ｣蟶ｸ縺ｫ襍ｷ蜍輔＠縺ｾ縺励◆`);
  console.log(`倹 URL: http://0.0.0.0:${port}`);
  console.log(`投 繝倥Ν繧ｹ繝√ぉ繝・け: http://0.0.0.0:${port}/api/health`);
});

server.on('error', (error: any) => {
  console.error('笶・繧ｵ繝ｼ繝舌・襍ｷ蜍輔お繝ｩ繝ｼ:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`笶・繝昴・繝・${port} 縺ｯ譌｢縺ｫ菴ｿ逕ｨ縺輔ｌ縺ｦ縺・∪縺兪);
  }
});

console.log('笨・譛蟆上し繝ｼ繝舌・繝輔ぃ繧､繝ｫ邨らｫｯ');
