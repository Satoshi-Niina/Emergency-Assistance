import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Database,
  Folder,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Info,
  FileText,
  HardDrive,
  Activity,
} from 'lucide-react';
import {
  getDatabaseOverview,
  getFolderOverview,
  searchUnifiedData,
  getDatabaseSchema,
  createDatabaseBackup,
  getSystemHealthCheck,
  getSystemOverview,
  checkDataIntegrity,
  type DatabaseOverview,
  type FolderOverview,
  type SearchResult,
  type DatabaseSchema,
  type HealthCheck,
  type BackupResult,
} from '../lib/unified-data-api';

const UnifiedDataDashboard: React.FC = () => {
  // State for various data
  const [dbOverview, setDbOverview] = useState<DatabaseOverview | null>(null);
  const [folderOverview, setFolderOverview] = useState<FolderOverview | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [dbSchema, setDbSchema] = useState<DatabaseSchema | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'db' | 'files'>('all');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await getSystemOverview();
      setDbOverview(overview.database);
      setFolderOverview(overview.folders);
      setHealthCheck(overview.health);
    } catch (err) {
      setError(err instanceof Error ? err.message : '初期データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await searchUnifiedData(searchQuery, searchType);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSchema = async () => {
    setLoading(true);
    try {
      const schema = await getDatabaseSchema();
      setDbSchema(schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スキーマの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await createDatabaseBackup();
      setBackupResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バックアップに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrityCheck = async () => {
    setLoading(true);
    try {
      const result = await checkDataIntegrity();
      // 結果をユーザーに表示する処理
      alert(`データ整合性チェック完了: ${result.integrity.isHealthy ? '正常' : '問題あり'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '整合性チェックに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'UNHEALTHY':
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'OK':
        return 'default';
      case 'WARNING':
        return 'secondary';
      case 'UNHEALTHY':
      case 'ERROR':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">統合データ管理ダッシュボード</h1>
          <p className="text-muted-foreground">
            データベースとローカルフォルダの統合的な管理と監視
          </p>
        </div>
        <Button
          onClick={loadInitialData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="search">検索</TabsTrigger>
          <TabsTrigger value="schema">スキーマ</TabsTrigger>
          <TabsTrigger value="health">ヘルスチェック</TabsTrigger>
          <TabsTrigger value="backup">バックアップ</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Database Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  データベース概要
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {dbOverview ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {Object.values(dbOverview.statistics).reduce((a: number, b: number) => a + b, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      総レコード数
                    </p>
                    <div className="space-y-1 text-xs">
                      <div>ユーザー: {dbOverview.statistics.users}</div>
                      <div>サポート履歴: {dbOverview.statistics.supportHistory}</div>
                      <div>基礎文書: {dbOverview.statistics.baseDocuments}</div>
                      <div>履歴項目: {dbOverview.statistics.historyItems}</div>
                      <div>画像: {dbOverview.statistics.images}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">読み込み中...</div>
                )}
              </CardContent>
            </Card>

            {/* Folder Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  フォルダ概要
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {folderOverview ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {folderOverview.totalFiles}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      総ファイル数
                    </p>
                    <div className="space-y-1 text-xs">
                      <div>フォルダ数: {folderOverview.totalFolders}</div>
                      {folderOverview.folders.map((folder) => (
                        <div key={folder.name} className="flex items-center justify-between">
                          <span>{folder.name}:</span>
                          <span className="flex items-center gap-1">
                            {folder.exists ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {folder.fileCount || 0}
                              </>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">読み込み中...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                統合データ検索
              </CardTitle>
              <CardDescription>
                データベースとローカルファイルを横断して検索できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="検索キーワードを入力..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'all' | 'db' | 'files')}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">すべて</option>
                  <option value="db">データベースのみ</option>
                  <option value="files">ファイルのみ</option>
                </select>
                <Button onClick={handleSearch} disabled={loading}>
                  検索
                </Button>
              </div>

              {searchResults && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    検索結果: DB {searchResults.results.database.length}件, 
                    ファイル {searchResults.results.files.length}件
                  </div>

                  {/* Database Results */}
                  {searchResults.results.database.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">データベース結果</h4>
                      <div className="space-y-2">
                        {searchResults.results.database.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{item.title}</div>
                                <Badge variant="outline" className="text-xs">
                                  {item.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Results */}
                  {searchResults.results.files.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">ファイル結果</h4>
                      <div className="space-y-2">
                        {searchResults.results.files.map((file, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{file.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {file.directory} - {(file.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(file.lastModified).toLocaleDateString()}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                データベーススキーマ
              </CardTitle>
              <CardDescription>
                データベースのテーブル構造を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLoadSchema} disabled={loading} className="mb-4">
                スキーマ読み込み
              </Button>

              {dbSchema && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    総テーブル数: {dbSchema.totalTables}
                  </div>
                  
                  <div className="space-y-3">
                    {dbSchema.tables.map((table) => (
                      <Card key={table.name} className="p-3">
                        <div className="font-medium mb-2">{table.name}</div>
                        <div className="grid gap-2 text-xs">
                          {table.columns.map((column) => (
                            <div key={column.name} className="flex justify-between">
                              <span className="font-mono">{column.name}</span>
                              <span className="text-muted-foreground">
                                {column.type} {column.nullable ? '(NULL可)' : '(NOT NULL)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Check Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                システムヘルスチェック
              </CardTitle>
              <CardDescription>
                システムの健全性とデータ整合性を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={loadInitialData} disabled={loading}>
                  ヘルスチェック実行
                </Button>
                <Button onClick={handleIntegrityCheck} disabled={loading} variant="outline">
                  データ整合性チェック
                </Button>
              </div>

              {healthCheck && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthCheck.overallStatus)}
                    <Badge variant={getStatusBadgeVariant(healthCheck.overallStatus)}>
                      {healthCheck.overallStatus}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    {healthCheck.checks.map((check, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <span className="font-medium">{check.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {check.message}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    最終チェック: {new Date(healthCheck.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                データベースバックアップ
              </CardTitle>
              <CardDescription>
                データベースの全テーブルをJSONファイルとしてバックアップできます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleBackup} disabled={loading}>
                バックアップ実行
              </Button>

              {backupResult && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {backupResult.message}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">バックアップ詳細:</div>
                    <div className="text-xs text-muted-foreground">
                      パス: {backupResult.backupPath}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      時刻: {new Date(backupResult.timestamp).toLocaleString()}
                    </div>

                    <div className="space-y-1">
                      {backupResult.tables.map((table) => (
                        <div key={table.table} className="flex items-center justify-between text-xs">
                          <span>{table.table}</span>
                          <span className="flex items-center gap-1">
                            {table.success ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {table.recordCount} レコード
                              </>
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedDataDashboard;