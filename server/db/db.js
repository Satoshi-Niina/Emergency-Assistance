import postgres from 'postgres';
import process from 'process';

// データベース接続設定 - DATABASE_URLのみを使用
const sql = postgres(
  process.env.DATABASE_URL ||
  'postgresql://postgres:CHANGE_THIS_PASSWORD@localhost:5432/webappdb',
  {
    ssl:
      process.env.NODE_ENV === 'production'
        ? { require: true, rejectUnauthorized: false }
        : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  }
);

export const query = async (text, params) => {
  try {
    const result = await sql.unsafe(text, params);
    return result;
  } catch (error) {
    console.error('❌ クエリ実行エラー:', error);
    throw error;
  }
};

export default {
  query,
  sql,
};
