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

async function resetUserPassword(username, newPassword) {
  try {
    console.log(`\n🔄 パスワードリセット: ${username}`);
    console.log('========================================');
    
    // ユーザーを確認
    const checkResult = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません');
      return false;
    }
    
    const user = checkResult.rows[0];
    console.log(`✅ ユーザーが見つかりました: ${user.username} (ID: ${user.id})`);
    
    // 新しいパスワードをハッシュ化
    console.log(`🔒 新しいパスワードをハッシュ化中: ${newPassword}`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`   ハッシュ生成成功: ${hashedPassword.substring(0, 20)}...`);
    console.log(`   ハッシュ長: ${hashedPassword.length}`);
    
    // パスワードを更新
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log('✅ パスワード更新完了');
    
    // 検証
    console.log('\n🔍 更新後の検証...');
    const verifyResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [user.id]
    );
    
    const isValid = await bcrypt.compare(newPassword, verifyResult.rows[0].password);
    console.log(`   検証結果: ${isValid ? '✅ 成功' : '❌ 失敗'}`);
    
    return isValid;
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🔐 ユーザーパスワードリセットツール');
    console.log('=====================================\n');
    
    // 全ユーザーのパスワードをリセット
    const usersToReset = [
      { username: 'admin', password: 'admin123' },
      { username: 'employee', password: 'employee123' },
      { username: 'Kosei001', password: 'Kosei001' },
      { username: 'takabeni1', password: 'takabeni1' },
      { username: 'takabeni2', password: 'takabeni2' }
    ];
    
    console.log('📋 以下のユーザーのパスワードをリセットします:');
    usersToReset.forEach(u => {
      console.log(`  - ${u.username} → パスワード: ${u.password}`);
    });
    
    console.log('\n⚠️ 注意: この操作は既存のパスワードを上書きします');
    console.log('=====================================\n');
    
    for (const { username, password } of usersToReset) {
      await resetUserPassword(username, password);
    }
    
    console.log('\n=====================================');
    console.log('✅ 全ての操作が完了しました');
    console.log('=====================================\n');
    console.log('📝 リセットされたパスワード:');
    usersToReset.forEach(u => {
      console.log(`  ${u.username}: ${u.password}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  } finally {
    await pool.end();
  }
}

main();
