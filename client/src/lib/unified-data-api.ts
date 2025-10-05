import { api } from './api-unified';

// データベースとローカルフォルダを統合的に扱うAPI関数群

export interface DatabaseOverview {
  success: boolean;
  timestamp: string;
  statistics: {
    users: number;
    supportHistory: number;
    baseDocuments: number;
    historyItems: number;
    historyImages: number;
    machines: number;
    machineTypes: number;
    images: number;
  };
  lastUpdated: {
    supportHistory: string | null;
    baseDocuments: string | null;
    historyItems: string | null;
  };
}

export interface FolderOverview {
  success: boolean;
  timestamp: string;
  baseDirectory: string;
  folders: Array<{
    name: string;
    path: string;
    exists: boolean;
    fileCount?: number;
    subDirectoryCount?: number;
    lastModified?: Date;
    size?: number;
    error?: string;
  }>;
  totalFolders: number;
  totalFiles: number;
}

export interface SearchResult {
  success: boolean;
  query: string;
  searchType: string;
  timestamp: string;
  results: {
    database: Array<{
      id: string;
      type: string;
      title: string;
      content: unknown;
      createdAt: string;
    }>;
    files: Array<{
      type: string;
      name: string;
      path: string;
      size: number;
      lastModified: Date;
      directory: string;
    }>;
  };
}

export interface DatabaseSchema {
  success: boolean;
  timestamp: string;
  tables: Array<{
    name: string;
    type: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      default: string | null;
    }>;
  }>;
  totalTables: number;
}

export interface HealthCheck {
  success: boolean;
  overallStatus: 'HEALTHY' | 'WARNING' | 'UNHEALTHY';
  timestamp: string;
  checks: Array<{
    name: string;
    status: 'OK' | 'WARNING' | 'ERROR';
    message: string;
    error?: string;
  }>;
  summary: {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
  };
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: string;
  tables: Array<{
    table: string;
    recordCount?: number;
    filePath?: string;
    success: boolean;
    error?: string;
  }>;
  message: string;
}

// データベース総括情報取得
export const getDatabaseOverview = async (): Promise<DatabaseOverview> => {
  return await api.get<DatabaseOverview>('/unified-data/db-overview');
};

// ローカルフォルダ総括情報取得
export const getFolderOverview = async (): Promise<FolderOverview> => {
  return await api.get<FolderOverview>('/unified-data/folder-overview');
};

// 統合データ検索
export const searchUnifiedData = async (
  query: string,
  searchType: 'all' | 'db' | 'files' = 'all',
  limit: number = 50,
  offset: number = 0
): Promise<SearchResult> => {
  return await api.post<SearchResult>('/unified-data/search', {
    query,
    searchType,
    limit,
    offset,
  });
};

// データベーススキーマ情報取得
export const getDatabaseSchema = async (): Promise<DatabaseSchema> => {
  return await api.get<DatabaseSchema>('/unified-data/db-schema');
};

// データベースバックアップ実行
export const createDatabaseBackup = async (): Promise<BackupResult> => {
  return await api.post<BackupResult>('/unified-data/backup');
};

// システム健全性チェック
export const getSystemHealthCheck = async (): Promise<HealthCheck> => {
  return await api.get<HealthCheck>('/unified-data/health-check');
};

// 使いやすい複合関数

// 全体の状況確認（DB + フォルダ + ヘルスチェック）
export const getSystemOverview = async () => {
  try {
    const [dbOverview, folderOverview, healthCheck] = await Promise.all([
      getDatabaseOverview(),
      getFolderOverview(),
      getSystemHealthCheck(),
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      database: dbOverview,
      folders: folderOverview,
      health: healthCheck,
      summary: {
        totalDbRecords: Object.values(dbOverview.statistics).reduce((sum, count) => sum + count, 0),
        totalFiles: folderOverview.totalFiles,
        systemStatus: healthCheck.overallStatus,
      },
    };
  } catch (error) {
    console.error('システム総括情報取得エラー:', error);
    throw error;
  }
};

// データ保存の状況確認
export const checkDataIntegrity = async () => {
  try {
    const [dbSchema, healthCheck] = await Promise.all([
      getDatabaseSchema(),
      getSystemHealthCheck(),
    ]);

    // データ整合性チェック
    const integrityIssues = [];
    
    // データベーステーブルの存在確認
    const requiredTables = [
      'users', 'support_history', 'base_documents', 
      'history_items', 'machines', 'machine_types'
    ];
    
    for (const tableName of requiredTables) {
      const tableExists = dbSchema.tables.some(table => table.name === tableName);
      if (!tableExists) {
        integrityIssues.push(`必須テーブル ${tableName} が存在しません`);
      }
    }

    // ヘルスチェックでエラーがあるか確認
    const healthErrors = healthCheck.checks.filter(check => check.status === 'ERROR');
    integrityIssues.push(...healthErrors.map(error => error.message));

    return {
      success: true,
      timestamp: new Date().toISOString(),
      schema: dbSchema,
      health: healthCheck,
      integrity: {
        isHealthy: integrityIssues.length === 0,
        issues: integrityIssues,
        recommendations: integrityIssues.length > 0 ? [
          'データベースの接続設定を確認してください',
          '必要なディレクトリが存在するか確認してください',
          'システムの健全性チェックの詳細を確認してください'
        ] : []
      }
    };
  } catch (error) {
    console.error('データ整合性チェックエラー:', error);
    throw error;
  }
};

export default {
  getDatabaseOverview,
  getFolderOverview,
  searchUnifiedData,
  getDatabaseSchema,
  createDatabaseBackup,
  getSystemHealthCheck,
  getSystemOverview,
  checkDataIntegrity,
};