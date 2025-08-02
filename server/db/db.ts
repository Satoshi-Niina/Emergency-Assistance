import postgres from 'postgres';

// データベース接続設定 - DATABASE_URLのみを使用
const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/emergency_assistance', { // 使用中: データベース接続文字列
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // 使用中: 環境判別
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export { sql };

// クエリ実行関数
export const query = async (text: string, params?: any[]): Promise<any> => {
  try {
    const result = await sql(text, params);
    return result;
  } catch (error) {
    console.error('❌ クエリ実行エラー:', error);
    throw error;
  }
};

// トランザクション実行関数
export const transaction = async (callback: (client: any) => Promise<any>): Promise<any> => {
  try {
    await sql('BEGIN');
    const result = await callback(sql);
    await sql('COMMIT');
    return result;
  } catch (error) {
    await sql('ROLLBACK');
    console.error('❌ トランザクションエラー:', error);
    throw error;
  }
};

// 接続プールを閉じる関数
export const closePool = async (): Promise<void> => {
  await sql.end();
};

// データベース接続テスト
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ データベース接続テスト成功:', result[0]);
    return true;
  } catch (error) {
    console.error('❌ データベース接続テスト失敗:', error);
    return false;
  }
};

// デフォルトエクスポート
export default {
  query,
  transaction,
  closePool,
  testConnection,
  sql
}; 