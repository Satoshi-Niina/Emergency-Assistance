import postgres from 'postgres';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  department?: string;
  password: string;
  created_at?: Date;
}

// データベース接続設定
function getDatabaseUrl(): string {
  // Azure環境の場合
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL環境変数を使用');
    return process.env.DATABASE_URL;
  }
  
  // PostgreSQL接続文字列を個別の環境変数から構築
  const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  const port = process.env.PGPORT || process.env.DB_PORT || '5432';
  const database = process.env.PGDATABASE || process.env.DB_NAME || 'emergency_assistance';
  const username = process.env.PGUSER || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'password';
  
  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  console.log('🔗 接続文字列を構築:', `postgresql://${username}:***@${host}:${port}/${database}`);
  
  return connectionString;
}

// データベース接続（シングルトンパターン）
let dbConnection: ReturnType<typeof postgres> | null = null;

function getDbConnection() {
  if (!dbConnection) {
    const dbUrl = getDatabaseUrl();
    console.log('🔗 データベース接続を初期化中...');
    
    // SSL設定の改善
    const sslConfig = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('azure') 
      ? { rejectUnauthorized: false } 
      : false;
    
    dbConnection = postgres(dbUrl, {
      ssl: sslConfig,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {}, // 通知を無視
      debug: false // デバッグモードを無効化
    });
    
    console.log('✅ データベース接続プールを作成');
  }
  return dbConnection;
}

// データベースからユーザーを取得
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const sql = getDbConnection();
    
    const result = await sql`
      SELECT id, username, password, display_name, role, department, created_at
      FROM users 
      WHERE username = ${username}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      department: user.department,
      password: user.password,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('❌ データベースからユーザー取得エラー:', error);
    return null;
  }
}

// ユーザーをデータベースに作成
export async function createUser(userData: {
  username: string;
  password: string;
  displayName: string;
  role?: string;
  department?: string;
}): Promise<User | null> {
  try {
    const sql = getDbConnection();
    
    const result = await sql`
      INSERT INTO users (username, password, display_name, role, department)
      VALUES (${userData.username}, ${userData.password}, ${userData.displayName}, ${userData.role || 'employee'}, ${userData.department || null})
      RETURNING id, username, display_name, role, department, created_at
    `;

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      department: user.department,
      password: '', // パスワードは返さない
      created_at: user.created_at
    };
  } catch (error) {
    console.error('❌ ユーザー作成エラー:', error);
    return null;
  }
}

// データベース接続テスト
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const sql = getDbConnection();
    await sql`SELECT 1 as test`;
    console.log('✅ データベース接続テスト成功');
    return true;
  } catch (error) {
    console.error('❌ データベース接続テスト失敗:', error);
    return false;
  }
}

// 初期ユーザーの作成（本番環境用）
export async function seedInitialUsers(): Promise<void> {
  try {
    console.log('🌱 初期ユーザー作成開始');
    
    // 管理者ユーザーの確認・作成
    const adminUser = await getUserByUsername('admin');
    if (!adminUser) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      await createUser({
        username: 'admin',
        password: hashedPassword,
        displayName: '管理者',
        role: 'admin',
        department: '管理部'
      });
      console.log('✅ 管理者ユーザー作成完了');
    } else {
      console.log('✅ 管理者ユーザーは既に存在');
    }

    // 従業員ユーザーの確認・作成
    const employeeUser = await getUserByUsername('employee1');
    if (!employeeUser) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      await createUser({
        username: 'employee1',
        password: hashedPassword,
        displayName: '作業員1',
        role: 'employee',
        department: '保守部'
      });
      console.log('✅ 従業員ユーザー作成完了');
    } else {
      console.log('✅ 従業員ユーザーは既に存在');
    }

  } catch (error) {
    console.error('❌ 初期ユーザー作成エラー:', error);
  }
}

console.log("🔍 API 環境変数の状態確認:", {
  DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
  PGHOST: process.env.PGHOST ? '[SET]' : '[NOT SET]',
  PGUSER: process.env.PGUSER ? '[SET]' : '[NOT SET]',
  PGDATABASE: process.env.PGDATABASE ? '[SET]' : '[NOT SET]',
  NODE_ENV: process.env.NODE_ENV || '[NOT SET]',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]'
});
