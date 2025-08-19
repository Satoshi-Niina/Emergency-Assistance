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
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  return 'postgresql://postgres:password@localhost:5432/emergency_assistance';
}

// データベース接続（シングルトンパターン）
let dbConnection: ReturnType<typeof postgres> | null = null;

function getDbConnection() {
  if (!dbConnection) {
    dbConnection = postgres(getDatabaseUrl(), {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
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

console.log("🔍 API DATABASE_URL =", process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
