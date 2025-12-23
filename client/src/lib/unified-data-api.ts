import { api } from './api';

// シューティングベ�Eスとローカルフォルダを統合的に扱ぁEPI関数群

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

// シューティングベ�Eス総括惁Eー取征E
export const getDatabaseOverview = async (): Promise<DatabaseOverview> => {
  return await api.get<DatabaseOverview>('/unified-data/db-overview');
};

// ローカルフォルダ総括惁Eー取征E
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

// シューティングベ�Eススキーマ情報取征E
export const getDatabaseSchema = async (): Promise<DatabaseSchema> => {
  return await api.get<DatabaseSchema>('/unified-data/db-schema');
};

// シューティングベ�EスバックティングE�E実衁E
export const createDatabaseBackup = async (): Promise<BackupResult> => {
  return await api.post<BackupResult>('/unified-data/backup');
};

// システィングー健全性チティングEー
export const getSystemHealthCheck = async (): Promise<HealthCheck> => {
  return await api.get<HealthCheck>('/unified-data/health-check');
};

// 使ぁEーすい褁Eー関数

// 全体�E状況確認！EB + フォルダ + ヘルスチェティングー�E�E
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
    console.error('システィングー総括惁Eー取得エラー:', error);
    throw error;
  }
};

// シューティング保存�E状況確誁E
export const checkDataIntegrity = async () => {
  try {
    const [dbSchema, healthCheck] = await Promise.all([
      getDatabaseSchema(),
      getSystemHealthCheck(),
    ]);

    // シューティング整合性チェティングー
    const integrityIssues = [];

    // シューティングベ�EティングE�Eブルの存在確誁E
    const requiredTables = [
      'users', 'support_history', 'base_documents',
      'history_items', 'machines', 'machine_types'
    ];

    for (const tableName of requiredTables) {
      const tableExists = dbSchema.tables.some(table => table.name === tableName);
      if (!tableExists) {
        integrityIssues.push(`忁Eーテーブル ${tableName} が存在しません`);
      }
    }

    // ヘルスチェティングーでエラーがあるか確誁E
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
          'シューティングベ�Eスの接続設定を確認してください',
          '忁EーティングEーレクトリが存在するか確認してください',
          'システィングーの健全性チティングEーの詳細を確認してください'
        ] : []
      }
    };
  } catch (error) {
    console.error('シューティング整合性チェティングーエラー:', error);
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
