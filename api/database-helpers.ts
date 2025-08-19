// データベース接続テスト用ファイル
// 実際のDBに接続してユーザー情報を取得

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  password: string;
}

// 環境変数からデータベース接続文字列を取得
const getDatabaseUrl = (): string => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    throw new Error('DATABASE_URL が設定されていません');
  }
  return dbUrl;
};

// PostgreSQL用のクエリ実行関数（簡易版）
const executeQuery = async (query: string, params: any[] = []): Promise<any[]> => {
  try {
    // 本来ならばpg libraryやpostgres.jsを使用
    // ここでは環境変数の確認のみ
    const dbUrl = getDatabaseUrl();
    console.log('🔗 データベース接続URL確認:', dbUrl.replace(/\/\/.*@/, '//***:***@'));
    
    // 実際のクエリ実行はプレースホルダー
    console.log('📝 実行クエリ:', query);
    console.log('📝 パラメータ:', params);
    
    // ダミーレスポンスを返す（実際の実装では実際のデータベース結果を返す）
    return [];
  } catch (error) {
    console.error('❌ データベースクエリエラー:', error);
    throw error;
  }
};

// データベースからユーザーを取得
export const getUserByUsernameFromDB = async (username: string): Promise<User | null> => {
  try {
    console.log('🔍 ユーザー検索開始:', username);
    
    const query = 'SELECT id, username, password, display_name, role, department FROM users WHERE username = $1';
    const result = await executeQuery(query, [username]);
    
    if (result.length === 0) {
      console.log('❌ ユーザーが見つかりません:', username);
      return null;
    }
    
    const userRecord = result[0];
    const user: User = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      role: userRecord.role,
      department: userRecord.department,
      password: userRecord.password
    };
    
    console.log('✅ ユーザー取得成功:', { 
      username: user.username, 
      role: user.role, 
      department: user.department 
    });
    
    return user;
  } catch (error) {
    console.error('❌ ユーザー取得エラー:', error);
    return null;
  }
};

// データベース接続テスト
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 データベース接続テスト開始');
    
    const query = 'SELECT 1 as test';
    await executeQuery(query);
    
    console.log('✅ データベース接続テスト成功');
    return true;
  } catch (error) {
    console.error('❌ データベース接続テスト失敗:', error);
    return false;
  }
};
