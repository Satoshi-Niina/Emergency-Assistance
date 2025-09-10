import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { 
  Database, 
  Settings, 
  Edit,
  Wrench,
  FolderOpen,
  CheckCircle,
  Brain,
  Sliders,
  FileSearch,
  Zap,
  BookOpen,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import VehicleMaintenanceForm from '../components/maintenance/VehicleMaintenanceForm';
import { useNavigate } from 'react-router-dom';

// ドキュメント管理関連のコンポーネントをインポート
import UnifiedDataProcessor from '../components/knowledge/unified-data-processor';
import { 
  runFullDiagnostic, 
  checkDatabaseConnection, 
  checkGPTConnection, 
  checkStorageConnection,
  type DiagnosticResult,
  type SystemDiagnosticResults
} from '../lib/system-diagnostic';

export default function BaseDataPage() {
  const [ragSettings, setRagSettings] = useState({
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
    maxResults: 5,
    enableSemantic: true,
    enableKeyword: true,
    customPrompt: '',
    preprocessing: {
      removeStopWords: true,
      normalizeCasing: true,
      removeSpecialChars: false
    }
  });
  
  // システム診断関連の状態
  const [diagnosticResults, setDiagnosticResults] = useState<SystemDiagnosticResults | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [individualTests, setIndividualTests] = useState<{
    database: { running: boolean; result: DiagnosticResult | null };
    gpt: { running: boolean; result: DiagnosticResult | null };
    storage: { running: boolean; result: DiagnosticResult | null };
  }>({
    database: { running: false, result: null },
    gpt: { running: false, result: null },
    storage: { running: false, result: null }
  });
  
  const navigate = useNavigate();

  // 全体診断実行
  const runFullSystemDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const results = await runFullDiagnostic();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('診断エラー:', error);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  // 個別テスト実行
  const runIndividualTest = async (testType: 'database' | 'gpt' | 'storage') => {
    setIndividualTests(prev => ({
      ...prev,
      [testType]: { ...prev[testType], running: true }
    }));

    try {
      let result: DiagnosticResult;
      switch (testType) {
        case 'database':
          result = await checkDatabaseConnection();
          break;
        case 'gpt':
          result = await checkGPTConnection();
          break;
        case 'storage':
          result = await checkStorageConnection();
          break;
      }

      setIndividualTests(prev => ({
        ...prev,
        [testType]: { running: false, result }
      }));
    } catch (error) {
      setIndividualTests(prev => ({
        ...prev,
        [testType]: {
          running: false,
          result: {
            status: 'failure',
            message: error instanceof Error ? error.message : '診断エラー',
            timestamp: new Date().toISOString()
          }
        }
      }));
    }
  };

  // ステータスアイコンを取得する関数
  const getStatusIcon = (status: 'success' | 'failure' | 'unknown') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failure':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  // ステータスバッジのクラス名を取得する関数
  const getStatusBadgeClass = (status: 'success' | 'failure' | 'unknown') => {
    switch (status) {
      case 'success':
        return "bg-green-100 text-green-700";
      case 'failure':
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  // RAG設定の保存
  const saveRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ragSettings),
        credentials: 'include'
      });

      if (response.ok) {
        alert('RAG設定が保存されました');
      } else {
        throw new Error('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('RAG設定保存エラー:', error);
      alert('設定の保存中にエラーが発生しました');
    }
  };

  // RAG設定の読み込み
  const loadRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        credentials: 'include'
      });

      if (response.ok) {
        const settings = await response.json();
        setRagSettings(settings);
      }
    } catch (error) {
      console.error('RAG設定読み込みエラー:', error);
    }
  };

  // コンポーネントマウント時に設定を読み込み
  useEffect(() => {
    loadRagSettings();
  }, []);

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Database className="inline mr-2" />
          基準データ管理
        </h1>
        <p className="text-gray-600">
          保守用車両データの管理と設定を行います
        </p>
      </div>

        {/* メインコンテンツ */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              ドキュメント管理
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              手動入力
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              システム設定
            </TabsTrigger>
          </TabsList>        {/* ドキュメント管理タブ */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                ドキュメント管理・AI学習データ処理
              </CardTitle>
              <p className="text-gray-600 text-sm">
                保守用車に関する仕様や機械故障の情報等をGPTの学習用データに変換します
              </p>
            </CardHeader>
            <CardContent>
              <UnifiedDataProcessor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 手動入力タブ */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                保守用車両データ入力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleMaintenanceForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定タブ - システム診断機能とRAG設定を統合 */}
        <TabsContent value="settings" className="space-y-6">
          {/* システム診断セクション */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                システム診断
              </CardTitle>
              <p className="text-sm text-gray-600">
                データベース接続、GPT接続、ストレージ接続の状態を確認できます
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Button 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={runFullSystemDiagnostic}
                  disabled={isRunningDiagnostic}
                >
                  {isRunningDiagnostic ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      診断中...
                    </>
                  ) : (
                    '全体診断実行'
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5" />
                    <h3 className="font-medium">PostgreSQL接続確認</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    データベースの接続状態を確認
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runIndividualTest('database')}
                    disabled={individualTests.database.running}
                  >
                    {individualTests.database.running ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        確認中
                      </>
                    ) : (
                      '確認実行'
                    )}
                  </Button>
                  <div className="mt-2">
                    {individualTests.database.result ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(individualTests.database.result.status)}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeClass(individualTests.database.result.status)}`}>
                          {individualTests.database.result.message}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        未実行
                      </span>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5" />
                    <h3 className="font-medium">GPT接続確認</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    OpenAI APIの接続状態を確認
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runIndividualTest('gpt')}
                    disabled={individualTests.gpt.running}
                  >
                    {individualTests.gpt.running ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        確認中
                      </>
                    ) : (
                      '確認実行'
                    )}
                  </Button>
                  <div className="mt-2">
                    {individualTests.gpt.result ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(individualTests.gpt.result.status)}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeClass(individualTests.gpt.result.status)}`}>
                          {individualTests.gpt.result.message}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        未実行
                      </span>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="h-5 w-5" />
                    <h3 className="font-medium">Azure Storage接続確認</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Azure Blob Storageへのアクセス確認
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runIndividualTest('storage')}
                    disabled={individualTests.storage.running}
                  >
                    {individualTests.storage.running ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        確認中
                      </>
                    ) : (
                      '確認実行'
                    )}
                  </Button>
                  <div className="mt-2">
                    {individualTests.storage.result ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(individualTests.storage.result.status)}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeClass(individualTests.storage.result.status)}`}>
                          {individualTests.storage.result.message}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        未実行
                      </span>
                    )}
                  </div>
                </Card>
              </div>

              {diagnosticResults && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
                  <h4 className="font-medium text-amber-800 mb-2">診断結果サマリー</h4>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(diagnosticResults.database.status)}
                      <span>PostgreSQL: {diagnosticResults.database.status === 'success' ? '正常' : '異常'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(diagnosticResults.gpt.status)}
                      <span>GPT: {diagnosticResults.gpt.status === 'success' ? '正常' : '異常'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(diagnosticResults.storage.status)}
                      <span>Storage: {diagnosticResults.storage.status === 'success' ? '正常' : '異常'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 基本設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                基本システム設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>データディレクトリ</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      /knowledge-base/vehicle-maintenance
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>許可ファイル形式</Label>
                  <div className="flex gap-2">
                    <Badge variant="outline">TXT</Badge>
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">XLSX</Badge>
                    <Badge variant="outline">PPTX</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI・RAG設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI・RAG (Retrieval-Augmented Generation) 設定
              </CardTitle>
              <p className="text-sm text-gray-600">
                AI応答精度向上のための設定とパラメーター調整
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* チャンク設定 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  テキスト分割設定
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chunkSize">
                      チャンクサイズ: {ragSettings.chunkSize}文字
                    </Label>
                    <Slider
                      id="chunkSize"
                      min={200}
                      max={2000}
                      step={100}
                      value={[ragSettings.chunkSize]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, chunkSize: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      テキストを分割する際の1チャンクあたりの文字数
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chunkOverlap">
                      オーバーラップ: {ragSettings.chunkOverlap}文字
                    </Label>
                    <Slider
                      id="chunkOverlap"
                      min={0}
                      max={500}
                      step={50}
                      value={[ragSettings.chunkOverlap]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, chunkOverlap: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      チャンク間で重複させる文字数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索設定 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  検索精度設定
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="similarityThreshold">
                      類似度閾値: {ragSettings.similarityThreshold}
                    </Label>
                    <Slider
                      id="similarityThreshold"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={[ragSettings.similarityThreshold]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, similarityThreshold: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      検索結果として採用する最小類似度
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxResults">
                      最大取得件数: {ragSettings.maxResults}件
                    </Label>
                    <Slider
                      id="maxResults"
                      min={1}
                      max={20}
                      step={1}
                      value={[ragSettings.maxResults]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, maxResults: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      1回の検索で取得する最大結果数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索手法 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  検索手法
                </h4>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.enableSemantic}
                      onChange={(e) => 
                        setRagSettings(prev => ({ ...prev, enableSemantic: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">セマンティック検索</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.enableKeyword}
                      onChange={(e) => 
                        setRagSettings(prev => ({ ...prev, enableKeyword: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">キーワード検索</span>
                  </label>
                </div>
              </div>

              {/* 前処理設定 */}
              <div className="space-y-4">
                <h4 className="font-medium">テキスト前処理</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.removeStopWords}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            removeStopWords: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">ストップワード除去</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.normalizeCasing}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            normalizeCasing: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">大文字小文字正規化</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.removeSpecialChars}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            removeSpecialChars: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">特殊文字除去</span>
                  </label>
                </div>
              </div>

              {/* カスタムプロンプト */}
              <div className="space-y-2">
                <Label htmlFor="customPrompt">カスタムプロンプト</Label>
                <Textarea
                  id="customPrompt"
                  value={ragSettings.customPrompt}
                  onChange={(e) => 
                    setRagSettings(prev => ({ ...prev, customPrompt: e.target.value }))
                  }
                  placeholder="RAG検索結果を活用する際の追加指示を入力..."
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  検索結果をGPTに渡す際の追加指示
                </p>
              </div>

              {/* 設定保存ボタン */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={saveRagSettings} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  RAG設定を保存
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  チャット画面に戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
