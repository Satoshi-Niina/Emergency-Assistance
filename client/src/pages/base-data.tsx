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
  BookOpen
} from 'lucide-react';
import VehicleMaintenanceForm from '../components/maintenance/VehicleMaintenanceForm';
import { useNavigate } from 'react-router-dom';

// ドキュメント管理関連のコンポーネントをインポート
import UnifiedDataProcessor from '../components/knowledge/unified-data-processor';
import RagSettingsPanel from '../components/RagSettingsPanel';

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
  const navigate = useNavigate();

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              ドキュメント管理
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              手動入力
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI設定
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

        {/* AI設定タブ */}
        <TabsContent value="ai-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI設定・RAG設定
              </CardTitle>
              <p className="text-gray-600 text-sm">
                AI応答精度向上のための設定とパラメーター調整
              </p>
            </CardHeader>
            <CardContent>
              <RagSettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定タブ */}
        <TabsContent value="settings" className="space-y-6">
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

          {/* RAG設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                RAG (Retrieval-Augmented Generation) 設定
              </CardTitle>
              <p className="text-sm text-gray-600">
                GPTレスポンスの精度向上のための事前処理パラメーター
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
