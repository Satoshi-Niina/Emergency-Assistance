const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;
const DATABASE_URL = "postgresql://postgres:Takabeni@localhost:5432/webappdb";
const SESSION_SECRET = "working-local-secret-key-12345";

const pool = new Pool({ connectionString: DATABASE_URL });

// CORS設定
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5002', 'http://localhost:5003', 'http://localhost:3000'],
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

const signToken = (payload) => jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d' });

// ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ 
      status: 'ok', 
      db: 'ok', 
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ 
      status: 'error', 
      db: 'fail', 
      message: e.message, 
      port: PORT 
    });
  }
});

// ログインAPI
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN] ログイン試行: ${username}`);

  try {
    const { rows } = await pool.query(
      'SELECT id, username, password, display_name, role FROM users WHERE username=$1 LIMIT 1',
      [username]
    );
    const user = rows[0];

    if (!user) {
      console.log(`[LOGIN] ユーザーが見つかりません: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ユーザー名またはパスワードが間違っています' 
      });
    }

    // ハッシュ化されたパスワードを比較
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`[LOGIN] パスワードが一致しません: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ユーザー名またはパスワードが間違っています' 
      });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name,
    });

    res.cookie('sid', token, {
      httpOnly: true,
      secure: false, // ローカル開発用
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[LOGIN] ログイン成功: ${username}`);
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[LOGIN] エラー:', error);
    res.status(500).json({ 
      success: false, 
      message: 'サーバーエラーが発生しました', 
      error: error.message 
    });
  }
});

// ユーザー情報取得API
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.sid;
    if (!token) {
      return res.status(401).json({ success: false, message: '認証が必要です' });
    }

    const decoded = jwt.verify(token, SESSION_SECRET);
    res.status(200).json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        role: decoded.role,
      },
    });
  } catch (error) {
    console.error('[ME] エラー:', error);
    res.status(401).json({ success: false, message: '認証に失敗しました' });
  }
});

// ログアウトAPI
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sid');
  res.status(200).json({ success: true, message: 'ログアウトしました' });
});

// データ読み込み用API（本番環境をシミュレート）
app.get('/api/data/emergency-flows', async (req, res) => {
  try {
    console.log('[DATA] 緊急フローデータを取得中...');
    // サンプルデータを返す（本番ではDBから取得）
    const sampleData = [
      {
        id: 'flow-1',
        title: 'エンジンがかからない',
        description: 'エンジンが全く始動しない場合の対処法',
        steps: [
          'バッテリーの状態を確認',
          '燃料の残量を確認',
          'キーの状態を確認',
          '専門業者に連絡'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'flow-2', 
        title: 'ブレーキが効かない',
        description: 'ブレーキペダルを踏んでも効かない場合の対処法',
        steps: [
          'パーキングブレーキを確認',
          'ブレーキフルードの状態を確認',
          '安全な場所に停車',
          '緊急連絡'
        ],
        createdAt: new Date().toISOString()
      }
    ];
    
    res.status(200).json({
      success: true,
      data: sampleData,
      count: sampleData.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: 'データの取得に失敗しました' });
  }
});

// ナレッジベースデータ取得API
app.get('/api/data/knowledge-base', async (req, res) => {
  try {
    console.log('[DATA] ナレッジベースデータを取得中...');
    // サンプルナレッジベースデータ
    const knowledgeData = [
      {
        id: 'kb-1',
        title: '保守用車の基本知識',
        content: '保守用車の基本的な操作方法と注意点について説明します。',
        category: '基本操作',
        createdAt: new Date().toISOString()
      },
      {
        id: 'kb-2',
        title: '緊急時の連絡先',
        content: '緊急時に対応すべき連絡先と手順について説明します。',
        category: '緊急対応',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.status(200).json({
      success: true,
      data: knowledgeData,
      count: knowledgeData.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: 'ナレッジベースの取得に失敗しました' });
  }
});

// ユーザー一覧取得API（管理者用）
app.get('/api/users', async (req, res) => {
  try {
    console.log('[DATA] ユーザー一覧を取得中...');
    const { rows } = await pool.query(
      'SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.status(200).json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: 'ユーザー一覧の取得に失敗しました' });
  }
});

// 機械・機種データ取得API
app.get('/api/machines', async (req, res) => {
  try {
    console.log('[DATA] 機械・機種データを取得中...');
    // サンプル機械データ（本番ではDBから取得）
    const machineData = [
      {
        id: 'machine-1',
        name: '保守用車両 A-001',
        type: 'トラック',
        model: 'HINO 300',
        serialNumber: 'HINO-300-001',
        status: 'active',
        location: '車庫A',
        lastMaintenance: '2025-09-15',
        nextMaintenance: '2025-10-15',
        createdAt: new Date().toISOString()
      },
      {
        id: 'machine-2',
        name: '保守用車両 B-002',
        type: 'バン',
        model: 'TOYOTA HIACE',
        serialNumber: 'TH-002',
        status: 'maintenance',
        location: '整備場',
        lastMaintenance: '2025-09-10',
        nextMaintenance: '2025-09-25',
        createdAt: new Date().toISOString()
      },
      {
        id: 'machine-3',
        name: '重機 C-003',
        type: 'ショベルカー',
        model: 'KOMATSU PC200',
        serialNumber: 'KOM-003',
        status: 'active',
        location: '現場',
        lastMaintenance: '2025-09-12',
        nextMaintenance: '2025-10-12',
        createdAt: new Date().toISOString()
      }
    ];
    
    res.status(200).json({
      success: true,
      data: machineData,
      count: machineData.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: '機械データの取得に失敗しました' });
  }
});

// 機械故障履歴取得API
app.get('/api/maintenance/history', async (req, res) => {
  try {
    console.log('[DATA] 機械故障履歴を取得中...');
    const historyData = [
      {
        id: 'history-1',
        machineId: 'machine-1',
        machineName: '保守用車両 A-001',
        issue: 'エンジンオイル漏れ',
        description: 'エンジン下部からオイルが漏れている',
        severity: 'high',
        status: 'resolved',
        reportedBy: 'niina',
        reportedAt: '2025-09-10T10:00:00Z',
        resolvedAt: '2025-09-12T15:30:00Z',
        resolution: 'オイルパンガスケット交換',
        createdAt: new Date().toISOString()
      },
      {
        id: 'history-2',
        machineId: 'machine-2',
        machineName: '保守用車両 B-002',
        issue: 'ブレーキ異音',
        description: 'ブレーキを踏むとキーキー音がする',
        severity: 'medium',
        status: 'in_progress',
        reportedBy: 'yamada',
        reportedAt: '2025-09-15T14:20:00Z',
        resolvedAt: null,
        resolution: null,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.status(200).json({
      success: true,
      data: historyData,
      count: historyData.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: '故障履歴の取得に失敗しました' });
  }
});

// 応急処置フロー一覧取得API
app.get('/api/flows', async (req, res) => {
  try {
    console.log('[DATA] 応急処置フロー一覧を取得中...');
    const flowsData = [
      {
        id: 'flow-1',
        title: 'エンジンがかからない',
        description: 'エンジンが全く始動しない場合の対処法',
        category: 'エンジン',
        priority: 'high',
        steps: [
          'バッテリーの状態を確認',
          '燃料の残量を確認',
          'キーの状態を確認',
          '専門業者に連絡'
        ],
        estimatedTime: '15分',
        requiredTools: ['テスター', 'ジャンプケーブル'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'flow-2',
        title: 'ブレーキが効かない',
        description: 'ブレーキペダルを踏んでも効かない場合の対処法',
        category: 'ブレーキ',
        priority: 'critical',
        steps: [
          'パーキングブレーキを確認',
          'ブレーキフルードの状態を確認',
          '安全な場所に停車',
          '緊急連絡'
        ],
        estimatedTime: '5分',
        requiredTools: ['ブレーキフルード'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'flow-3',
        title: 'タイヤパンク',
        description: '走行中にタイヤがパンクした場合の対処法',
        category: 'タイヤ',
        priority: 'medium',
        steps: [
          '安全な場所に停車',
          'スペアタイヤの確認',
          'ジャッキアップ',
          'タイヤ交換'
        ],
        estimatedTime: '30分',
        requiredTools: ['ジャッキ', 'レンチ', 'スペアタイヤ'],
        createdAt: new Date().toISOString()
      }
    ];
    
    res.status(200).json({
      success: true,
      data: flowsData,
      count: flowsData.length
    });
  } catch (error) {
    console.error('[DATA] エラー:', error);
    res.status(500).json({ success: false, message: 'フロー一覧の取得に失敗しました' });
  }
});

// ストレージデータ読み込みAPI（ローカルのknowledge-baseフォルダから）
app.get('/api/storage/knowledge-base', async (req, res) => {
  try {
    console.log('[STORAGE] ナレッジベースデータを読み込み中...');
    const knowledgeBasePath = path.join(__dirname, 'knowledge-base');
    
    // ナレッジベースのファイル一覧を取得
    const files = fs.readdirSync(knowledgeBasePath, { withFileTypes: true });
    const dataFiles = files
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => file.name);
    
    const knowledgeData = [];
    
    // 各JSONファイルを読み込み
    for (const file of dataFiles) {
      try {
        const filePath = path.join(knowledgeBasePath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        knowledgeData.push({
          id: file.replace('.json', ''),
          filename: file,
          data: data,
          createdAt: fs.statSync(filePath).birthtime.toISOString()
        });
      } catch (fileError) {
        console.error(`[STORAGE] ファイル読み込みエラー ${file}:`, fileError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      data: knowledgeData,
      count: knowledgeData.length,
      source: 'local-knowledge-base'
    });
  } catch (error) {
    console.error('[STORAGE] エラー:', error);
    res.status(500).json({ success: false, message: 'ストレージデータの読み込みに失敗しました' });
  }
});

// トラブルシューティングデータ取得API
app.get('/api/storage/troubleshooting', async (req, res) => {
  try {
    console.log('[STORAGE] トラブルシューティングデータを読み込み中...');
    const troubleshootingPath = path.join(__dirname, 'knowledge-base', 'troubleshooting');
    
    if (!fs.existsSync(troubleshootingPath)) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        message: 'トラブルシューティングフォルダが存在しません'
      });
    }
    
    const files = fs.readdirSync(troubleshootingPath, { withFileTypes: true });
    const dataFiles = files
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => file.name);
    
    const troubleshootingData = [];
    
    for (const file of dataFiles) {
      try {
        const filePath = path.join(troubleshootingPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        troubleshootingData.push({
          id: file.replace('.json', ''),
          filename: file,
          data: data,
          createdAt: fs.statSync(filePath).birthtime.toISOString()
        });
      } catch (fileError) {
        console.error(`[STORAGE] トラブルシューティングファイル読み込みエラー ${file}:`, fileError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      data: troubleshootingData,
      count: troubleshootingData.length,
      source: 'local-troubleshooting'
    });
  } catch (error) {
    console.error('[STORAGE] エラー:', error);
    res.status(500).json({ success: false, message: 'トラブルシューティングデータの読み込みに失敗しました' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] ハッシュ対応サーバー起動: http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] データベース: ${DATABASE_URL}`);
  console.log(`[SERVER] 利用可能ユーザー: niina, yamada, employee, takabeni1, takabeni2, admin`);
});
