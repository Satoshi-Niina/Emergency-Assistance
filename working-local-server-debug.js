const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3003;
const DATABASE_URL = 'postgresql://postgres:Takabeni@localhost:5432/webappdb';
const SESSION_SECRET = 'working-local-secret-key-12345';

const pool = new Pool({ connectionString: DATABASE_URL });

// ミドルウェア設定
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5002',
      'http://localhost:5003',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ヘルスチェックAPI
app.get('/api/health', async (req, res) => {
  try {
    // データベース接続テスト
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      db: 'ok',
      port: PORT,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      db: 'error',
      port: PORT,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ログインAPI
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('[AUTH] ログイン試行:', req.body.username);
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'ユーザー名とパスワードが必要です' });
    }

    // データベースからユーザーを検索
    const result = await pool.query(
      'SELECT id, username, password, display_name, role, department FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({
          success: false,
          message: 'ユーザー名またはパスワードが間違っています',
        });
    }

    const user = result.rows[0];

    // パスワード検証（bcrypt）
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({
          success: false,
          message: 'ユーザー名またはパスワードが間違っています',
        });
    }

    // JWTトークン生成
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      SESSION_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        department: user.department,
      },
      message: 'ログインに成功しました',
    });
  } catch (error) {
    console.error('[AUTH] ログインエラー:', error);
    res
      .status(500)
      .json({ success: false, message: 'ログイン処理に失敗しました' });
  }
});

// ユーザー情報取得API
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: '認証が必要です' });
    }

    const decoded = jwt.verify(token, SESSION_SECRET);

    const result = await pool.query(
      'SELECT id, username, display_name, role, department FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'ユーザーが見つかりません' });
    }

    const user = result.rows[0];
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('[AUTH] ユーザー情報取得エラー:', error);
    res.status(401).json({ success: false, message: '認証に失敗しました' });
  }
});

// ログアウトAPI
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: 'ログアウトしました' });
});

// ユーザー一覧取得API
app.get('/api/users', async (req, res) => {
  try {
    console.log('[DATA] ユーザー一覧を取得中...');
    const result = await pool.query(
      'SELECT id, username, display_name, role, department, created_at FROM users ORDER BY created_at DESC'
    );

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      department: row.department,
      createdAt: row.created_at,
    }));

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('[DATA] ユーザー一覧取得エラー:', error);
    res
      .status(500)
      .json({ success: false, message: 'ユーザー一覧の取得に失敗しました' });
  }
});

// 機械タイプ一覧取得API（簡易版）
app.get('/machines/machine-types', async (req, res) => {
  try {
    console.log('[API] 機械タイプ一覧を取得中...');

    // サンプルデータを即座に返す（ファイル読み込みなし）
    const machineTypes = [
      {
        id: 1,
        name: '保守用車両A型',
        description: '緊急時対応用の保守車両',
        category: 'vehicle',
        specifications: {
          engine: 'ディーゼル',
          capacity: '4人乗り',
          equipment: ['工具セット', '応急処置キット'],
        },
        maintenanceInterval: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: '保守用車両B型',
        description: '大型保守作業用車両',
        category: 'vehicle',
        specifications: {
          engine: 'ディーゼル',
          capacity: '6人乗り',
          equipment: ['大型工具', 'クレーン', '照明設備'],
        },
        maintenanceInterval: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: machineTypes,
      count: machineTypes.length,
    });
  } catch (error) {
    console.error('[API] 機械タイプエラー:', error);
    res
      .status(500)
      .json({ success: false, message: '機械タイプの取得に失敗しました' });
  }
});

// ナレッジベースAPI（簡易版）
app.get('/api/knowledge-base', async (req, res) => {
  try {
    console.log('[API] ナレッジベースAPIを呼び出し中...');

    // サンプルデータを即座に返す（ファイル読み込みなし）
    const knowledgeData = [
      {
        id: 'kb-1',
        title: 'エンジンオイル漏れの対処法',
        content:
          'エンジンオイルが漏れている場合は、まず漏れ箇所を特定し、応急処置としてオイルを補充してください。',
        category: 'maintenance',
        tags: ['エンジン', 'オイル', '漏れ'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'kb-2',
        title: 'ブレーキ異音の原因と対処',
        content:
          'ブレーキの異音は主にパッドの摩耗が原因です。点検を行い、必要に応じて交換してください。',
        category: 'maintenance',
        tags: ['ブレーキ', '異音', 'パッド'],
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: knowledgeData,
      count: knowledgeData.length,
    });
  } catch (error) {
    console.error('[API] ナレッジベースエラー:', error);
    res
      .status(500)
      .json({ success: false, message: 'ナレッジベースの取得に失敗しました' });
  }
});

// 履歴データAPI（簡易版）
app.get('/api/history', async (req, res) => {
  try {
    console.log('[API] 履歴データを取得中...');

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
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: historyData,
      count: historyData.length,
    });
  } catch (error) {
    console.error('[API] 履歴エラー:', error);
    res
      .status(500)
      .json({ success: false, message: '履歴データの取得に失敗しました' });
  }
});

// 不足しているAPIエンドポイントを追加

// 機械タイプ一覧取得API（/api/machines/machine-types）
app.get('/api/machines/machine-types', async (req, res) => {
  try {
    console.log('[API] 機械タイプ一覧を取得中...');

    const machineTypes = [
      {
        id: 1,
        name: '保守用車両A型',
        description: '緊急時対応用の保守車両',
        category: 'vehicle',
        specifications: {
          engine: 'ディーゼル',
          capacity: '4人乗り',
          equipment: ['工具セット', '応急処置キット'],
        },
        maintenanceInterval: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: '保守用車両B型',
        description: '大型保守作業用車両',
        category: 'vehicle',
        specifications: {
          engine: 'ディーゼル',
          capacity: '6人乗り',
          equipment: ['大型工具', 'クレーン', '照明設備'],
        },
        maintenanceInterval: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: machineTypes,
      count: machineTypes.length,
    });
  } catch (error) {
    console.error('[API] 機械タイプエラー:', error);
    res
      .status(500)
      .json({ success: false, message: '機械タイプの取得に失敗しました' });
  }
});

// Blob Storage リスト取得API
app.get('/api/blob/list', async (req, res) => {
  try {
    console.log('[API] Blob Storage リストを取得中...');
    const { container } = req.query;

    if (container === 'knowledge') {
      const files = [
        {
          name: 'sample-document-1.json',
          size: 1024,
          lastModified: new Date().toISOString(),
          url: '/api/blob/download?container=knowledge&blob=sample-document-1.json',
        },
        {
          name: 'sample-document-2.json',
          size: 2048,
          lastModified: new Date().toISOString(),
          url: '/api/blob/download?container=knowledge&blob=sample-document-2.json',
        },
      ];

      res.status(200).json({
        success: true,
        data: files,
        count: files.length,
      });
    } else {
      res.status(200).json({
        success: true,
        data: [],
        count: 0,
      });
    }
  } catch (error) {
    console.error('[API] Blob Storage エラー:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Blob Storage リストの取得に失敗しました',
      });
  }
});

// 機械データ履歴取得API
app.get('/api/history/machine-data', async (req, res) => {
  try {
    console.log('[API] 機械データ履歴を取得中...');

    const machineData = [
      {
        id: 'machine-1',
        name: '保守用車両 A-001',
        type: '保守用車両A型',
        status: 'active',
        lastMaintenance: '2025-09-01T10:00:00Z',
        nextMaintenance: '2025-10-01T10:00:00Z',
        totalIssues: 3,
        resolvedIssues: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'machine-2',
        name: '保守用車両 B-002',
        type: '保守用車両B型',
        status: 'maintenance',
        lastMaintenance: '2025-09-15T14:20:00Z',
        nextMaintenance: '2025-10-15T14:20:00Z',
        totalIssues: 1,
        resolvedIssues: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: machineData,
      count: machineData.length,
    });
  } catch (error) {
    console.error('[API] 機械データ履歴エラー:', error);
    res
      .status(500)
      .json({ success: false, message: '機械データ履歴の取得に失敗しました' });
  }
});

// 履歴検索フィルター取得API
app.get('/api/history/search-filters', async (req, res) => {
  try {
    console.log('[API] 履歴検索フィルターを取得中...');

    const filters = {
      severities: ['low', 'medium', 'high', 'critical'],
      statuses: ['open', 'in_progress', 'resolved', 'closed'],
      machines: [
        { id: 'machine-1', name: '保守用車両 A-001' },
        { id: 'machine-2', name: '保守用車両 B-002' },
      ],
      reporters: ['niina', 'yamada', 'employee', 'admin'],
      dateRange: {
        min: '2025-01-01',
        max: new Date().toISOString().split('T')[0],
      },
    };

    res.status(200).json({
      success: true,
      data: filters,
    });
  } catch (error) {
    console.error('[API] 履歴検索フィルターエラー:', error);
    res
      .status(500)
      .json({
        success: false,
        message: '履歴検索フィルターの取得に失敗しました',
      });
  }
});

// 設定RAG取得API
app.get('/api/settings/rag', async (req, res) => {
  try {
    console.log('[API] 設定RAGを取得中...');

    const ragSettings = {
      enabled: true,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      knowledgeBase: {
        enabled: true,
        sources: ['documents', 'troubleshooting', 'qa'],
        searchLimit: 10,
      },
      chat: {
        enabled: true,
        systemPrompt:
          'あなたは緊急時対応の専門家です。保守用車両の故障や問題について適切なアドバイスを提供してください。',
        maxHistory: 50,
      },
    };

    res.status(200).json({
      success: true,
      data: ragSettings,
    });
  } catch (error) {
    console.error('[API] 設定RAGエラー:', error);
    res
      .status(500)
      .json({ success: false, message: '設定RAGの取得に失敗しました' });
  }
});

// トラブルシューティングリスト取得API
app.get('/api/troubleshooting/list', async (req, res) => {
  try {
    console.log('[API] トラブルシューティングリストを取得中...');

    const troubleshootingList = [
      {
        id: 'troubleshoot-1',
        title: 'エンジンがかからない',
        description: 'エンジンが全く始動しない場合の対処法',
        category: 'engine',
        tags: ['エンジン', '始動', '故障'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'troubleshoot-2',
        title: 'ブレーキの効きが悪い',
        description: 'ブレーキペダルを踏んでも効きが悪い場合の対処法',
        category: 'brake',
        tags: ['ブレーキ', '効き', '安全'],
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: troubleshootingList,
      count: troubleshootingList.length,
    });
  } catch (error) {
    console.error('[API] トラブルシューティングリストエラー:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'トラブルシューティングリストの取得に失敗しました',
      });
  }
});

// 全機械一覧取得API
app.get('/api/machines/all-machines', async (req, res) => {
  try {
    console.log('[API] 全機械一覧を取得中...');

    const machines = [
      {
        id: 'machine-1',
        name: '保守用車両 A-001',
        type: '保守用車両A型',
        status: 'active',
        location: '車庫A',
        lastMaintenance: '2025-09-01T10:00:00Z',
        nextMaintenance: '2025-10-01T10:00:00Z',
        totalIssues: 3,
        resolvedIssues: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'machine-2',
        name: '保守用車両 B-002',
        type: '保守用車両B型',
        status: 'maintenance',
        location: '車庫B',
        lastMaintenance: '2025-09-15T14:20:00Z',
        nextMaintenance: '2025-10-15T14:20:00Z',
        totalIssues: 1,
        resolvedIssues: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: machines,
      count: machines.length,
    });
  } catch (error) {
    console.error('[API] 全機械一覧エラー:', error);
    res
      .status(500)
      .json({ success: false, message: '全機械一覧の取得に失敗しました' });
  }
});

// 個別トラブルシューティング取得API
app.get('/api/troubleshooting/:id', async (req, res) => {
  try {
    console.log(`[API] トラブルシューティング詳細を取得中: ${req.params.id}`);

    const troubleshootingData = {
      'troubleshoot-1': {
        id: 'troubleshoot-1',
        title: 'エンジンがかからない',
        description: 'エンジンが全く始動しない場合の対処法',
        category: 'engine',
        tags: ['エンジン', '始動', '故障'],
        steps: [
          'バッテリーの電圧を確認する',
          '燃料タンクに燃料が残っているか確認する',
          'エンジンオイルの量と状態を確認する',
          'スパークプラグの状態を確認する',
          '必要に応じて専門業者に連絡する',
        ],
        createdAt: new Date().toISOString(),
      },
      'troubleshoot-2': {
        id: 'troubleshoot-2',
        title: 'ブレーキの効きが悪い',
        description: 'ブレーキペダルを踏んでも効きが悪い場合の対処法',
        category: 'brake',
        tags: ['ブレーキ', '効き', '安全'],
        steps: [
          'ブレーキフルードの量を確認する',
          'ブレーキパッドの摩耗状況を確認する',
          'ブレーキディスクの状態を確認する',
          'ブレーキホースの損傷を確認する',
          '緊急時は手動ブレーキを使用する',
        ],
        createdAt: new Date().toISOString(),
      },
    };

    const data = troubleshootingData[req.params.id];
    if (!data) {
      return res
        .status(404)
        .json({
          success: false,
          message: 'トラブルシューティングデータが見つかりません',
        });
    }

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('[API] トラブルシューティング詳細エラー:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'トラブルシューティング詳細の取得に失敗しました',
      });
  }
});

// 応急処置フロー取得API
app.get('/api/flows', async (req, res) => {
  try {
    console.log('[API] 応急処置フローを取得中...');

    const flows = [
      {
        id: 'flow-1',
        title: 'エンジン故障時の応急処置',
        description: 'エンジンが始動しない場合の対処手順',
        category: 'engine',
        steps: [
          {
            id: 'step-1',
            title: 'バッテリー確認',
            description: 'バッテリーの電圧を確認する',
            order: 1,
            estimatedTime: 5,
          },
          {
            id: 'step-2',
            title: '燃料確認',
            description: '燃料タンクに燃料が残っているか確認する',
            order: 2,
            estimatedTime: 3,
          },
          {
            id: 'step-3',
            title: 'オイル確認',
            description: 'エンジンオイルの量と状態を確認する',
            order: 3,
            estimatedTime: 5,
          },
        ],
        tags: ['エンジン', '故障', '応急処置'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'flow-2',
        title: 'ブレーキ故障時の応急処置',
        description: 'ブレーキの効きが悪い場合の対処手順',
        category: 'brake',
        steps: [
          {
            id: 'step-1',
            title: 'ブレーキフルード確認',
            description: 'ブレーキフルードの量を確認する',
            order: 1,
            estimatedTime: 3,
          },
          {
            id: 'step-2',
            title: 'パッド確認',
            description: 'ブレーキパッドの摩耗状況を確認する',
            order: 2,
            estimatedTime: 10,
          },
        ],
        tags: ['ブレーキ', '故障', '安全'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    res.status(200).json({
      success: true,
      data: flows,
      count: flows.length,
    });
  } catch (error) {
    console.error('[API] 応急処置フローエラー:', error);
    res
      .status(500)
      .json({ success: false, message: '応急処置フローの取得に失敗しました' });
  }
});

// 個別フロー取得API
app.get('/api/flows/:id', async (req, res) => {
  try {
    console.log(`[API] 個別フローを取得中: ${req.params.id}`);

    const flows = {
      'flow-1': {
        id: 'flow-1',
        title: 'エンジン故障時の応急処置',
        description: 'エンジンが始動しない場合の対処手順',
        category: 'engine',
        steps: [
          {
            id: 'step-1',
            title: 'バッテリー確認',
            description: 'バッテリーの電圧を確認する',
            order: 1,
            estimatedTime: 5,
            tools: ['マルチメーター'],
            safetyNotes: ['感電に注意'],
          },
          {
            id: 'step-2',
            title: '燃料確認',
            description: '燃料タンクに燃料が残っているか確認する',
            order: 2,
            estimatedTime: 3,
            tools: ['燃料計'],
            safetyNotes: ['火気厳禁'],
          },
        ],
        tags: ['エンジン', '故障', '応急処置'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const flow = flows[req.params.id];
    if (!flow) {
      return res
        .status(404)
        .json({ success: false, message: 'フローが見つかりません' });
    }

    res.status(200).json({
      success: true,
      data: flow,
    });
  } catch (error) {
    console.error('[API] 個別フローエラー:', error);
    res
      .status(500)
      .json({ success: false, message: '個別フローの取得に失敗しました' });
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('[SERVER] エラー:', err);
  res
    .status(500)
    .json({ success: false, message: 'サーバーエラーが発生しました' });
});

// 404ハンドリング
app.use((req, res) => {
  console.log(`[SERVER] 404: ${req.method} ${req.path}`);
  res
    .status(404)
    .json({ success: false, message: 'エンドポイントが見つかりません' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] デバッグ用サーバー起動: http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] データベース: ${DATABASE_URL}`);
  console.log(
    `[SERVER] 利用可能ユーザー: niina, yamada, employee, takabeni1, takabeni2, admin`
  );
  console.log(`[SERVER] ファイル読み込み: 無効（サンプルデータ使用）`);
});
