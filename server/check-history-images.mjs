import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkHistoryImages() {
  try {
    console.log('🔍 履歴データの画像情報確認');
    console.log('=====================================\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        title,
        machine_type,
        machine_number,
        content,
        conversation_history,
        created_at
      FROM chat_history
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    console.log(`📋 履歴レコード数: ${result.rows.length}件\n`);
    
    for (const row of result.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`  タイトル: ${row.title || '(なし)'}`);
      console.log(`  機械: ${row.machine_type || ''}${row.machine_number || ''}`);
      console.log(`  コンテンツ長: ${row.content ? row.content.length : 0}文字`);
      
      // conversation_historyからimage_urlsを解析
      try {
        if (row.conversation_history) {
          const history = JSON.parse(row.conversation_history);
          if (Array.isArray(history)) {
            const messages = history.filter(msg => msg.image_urls && msg.image_urls.length > 0);
            if (messages.length > 0) {
              console.log(`  画像を含むメッセージ: ${messages.length}件`);
              messages.forEach((msg, i) => {
                console.log(`    メッセージ ${i + 1}:`);
                msg.image_urls.forEach(url => {
                  console.log(`      - ${url}`);
                });
              });
            } else {
              console.log(`  画像: なし`);
            }
          }
        } else {
          console.log(`  画像: なし (conversation_history未設定)`);
        }
      } catch (e) {
        console.log(`  画像: 解析エラー (${e.message})`);
      }
      
      console.log(`  作成日: ${row.created_at}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  } finally {
    await pool.end();
  }
}

checkHistoryImages();
