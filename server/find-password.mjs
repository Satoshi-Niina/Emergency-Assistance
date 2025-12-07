import pg from 'pg';
import bcrypt from 'bcryptjs';
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
});

async function findPassword(username, candidates) {
  try {
    console.log(`\n🔍 ${username}のパスワードを特定中...`);
    console.log('========================================');
    
    // ユーザーを取得
    const result = await pool.query(
      'SELECT id, username, password FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }
    
    const user = result.rows[0];
    console.log(`✅ ユーザーが見つかりました`);
    console.log(`   パスワードハッシュ: ${user.password.substring(0, 30)}...`);
    console.log(`\n🔬 候補パスワードをテスト中...`);
    
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(candidate, user.password);
      console.log(`   ${isMatch ? '✅' : '❌'} "${candidate}"`);
      if (isMatch) {
        console.log(`\n🎉 正しいパスワードが見つかりました: "${candidate}"`);
        return candidate;
      }
    }
    
    console.log('\n❌ 候補の中に正しいパスワードはありませんでした');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function main() {
  try {
    console.log('🔐 パスワード特定ツール');
    console.log('=====================================');
    
    // takabeni1の候補
    console.log('\n【takabeni1】');
    await findPassword('takabeni1', [
      'Takabeni&1',      // 設定したパスワード
      'Takabeni&amp;1',  // HTML エンティティ
      'Takabeni%261',    // URLエンコード
      'Takabeni\\&1',    // エスケープ
      'takabeni1',       // 元のパスワード
      'takabeni&1',      // 小文字
    ]);
    
    // takabeni2の候補
    console.log('\n【takabeni2】');
    await findPassword('takabeni2', [
      'Takabeni&2',      // 設定したパスワード
      'Takabeni&amp;2',  // HTML エンティティ
      'Takabeni%262',    // URLエンコード
      'Takabeni\\&2',    // エスケープ
      'takabeni2',       // 元のパスワード
      'takabeni&2',      // 小文字
    ]);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await pool.end();
  }
}

main();
