import dotenv from 'dotenv';
import { ping } from '../db/index.js';

// 環境変数読み込み
dotenv.config();

(async () => {
  console.log('🔍 Testing DB connection...');
  const success = await ping();
  if (success) {
    console.log('✅ DB connection successful');
    process.exit(0);
  } else {
    console.error('❌ DB connection failed');
    process.exit(1);
  }
})();
