import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// 繝・・繧ｿ繝吶・繧ｹ謗･邯夊ｨｭ螳・- DATABASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
function getDatabaseUrl(): string {
  // DATABASE_URL縺瑚ｨｭ螳壹＆繧後※縺・ｋ蝣ｴ蜷医・蜆ｪ蜈井ｽｿ逕ｨ・・ATABASE_URL縺ｮ縺ｿ菴ｿ逕ｨ・・
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // 繝・ヵ繧ｩ繝ｫ繝医・謗･邯壽枚蟄怜・
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// 譛ｬ逡ｪ迺ｰ蠅・〒縺ｮSSL險ｭ螳壹ｒ謾ｹ蝟・
function getSSLConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isAzure = process.env.WEBSITE_SITE_NAME || process.env.AZURE_ENVIRONMENT;
  
  if (isProduction || isAzure) {
    return { rejectUnauthorized: false };
  }
  
  return false;
}

// 繝・・繧ｿ繝吶・繧ｹ謗･邯・
const client = postgres(getDatabaseUrl(), {
  ssl: getSSLConfig(),
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Azure PostgreSQL蟇ｾ蠢・
});

// Drizzle ORM繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
export const db = drizzle(client, { schema });

// 繝・ヰ繝・げ逕ｨ繝ｭ繧ｰ
console.log("剥 DEBUG server/db/index.ts: DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log("剥 DEBUG server/db/index.ts: 謗･邯壽枚蟄怜・ =", getDatabaseUrl().replace(/\/\/.*@/, '//***:***@')); // 繝代せ繝ｯ繝ｼ繝峨ｒ髫縺励※陦ｨ遉ｺ
console.log("剥 DEBUG server/db/index.ts: SSL險ｭ螳・=", getSSLConfig());
console.log("剥 DEBUG server/db/index.ts: 迺ｰ蠅・=", {
  NODE_ENV: process.env.NODE_ENV,
  WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME ? '[SET]' : '[NOT SET]',
  AZURE_ENVIRONMENT: process.env.AZURE_ENVIRONMENT ? '[SET]' : '[NOT SET]'
}); 