import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 環境変数読み込み
config({ path: join(rootDir, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
  // Azure PostgreSQLの接続文字列にはsslmode=requireが含まれているため、
  // ここで明示的にssl設定を追加する必要はない
});

async function checkUserPasswords() {
  try {
    console.log('🔍 データベース接続中...');
    
    const result = await pool.query(`
      SELECT 
        id,
        username,
        LEFT(password, 15) as pwd_prefix,
        LENGTH(password) as pwd_length,
        SUBSTRING(password, 1, 4) as hash_marker,
        role,
        created_at
      FROM users 
      ORDER BY id
    `);
    
    console.log('\n👥 ユーザー一覧:');
    console.log('================');
    
    for (const user of result.rows) {
      const isBcrypt = user.hash_marker === '$2b$' || user.hash_marker === '$2a$' || user.hash_marker === '$2y$';
      console.log(`\nID: ${user.id}`);
      console.log(`  ユーザー名: ${user.username}`);
      console.log(`  パスワード開始: ${user.pwd_prefix}...`);
      console.log(`  パスワード長: ${user.pwd_length}`);
      console.log(`  ハッシュマーカー: ${user.hash_marker}`);
      console.log(`  bcrypt形式: ${isBcrypt ? '✅' : '❌'}`);
      console.log(`  ロール: ${user.role}`);
      console.log(`  作成日: ${user.created_at}`);
    }
    
    console.log('\n🔍 分析:');
    const bcryptUsers = result.rows.filter(u => 
      u.hash_marker === '$2b$' || u.hash_marker === '$2a$' || u.hash_marker === '$2y$'
    );
    const nonBcryptUsers = result.rows.filter(u => 
      u.hash_marker !== '$2b$' && u.hash_marker !== '$2a$' && u.hash_marker !== '$2y$'
    );
    
    console.log(`  bcrypt形式のユーザー: ${bcryptUsers.length}件`);
    console.log(`  非bcrypt形式のユーザー: ${nonBcryptUsers.length}件`);
    
    if (nonBcryptUsers.length > 0) {
      console.log('\n❌ 問題: 以下のユーザーのパスワードがbcrypt形式ではありません:');
      nonBcryptUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.hash_marker}...)`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  } finally {
    await pool.end();
  }
}

checkUserPasswords();
