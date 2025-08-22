import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import { 
  Database, 
  FileText, 
  Upload, 
  Settings, 
  Edit,
  Wrench,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Brain,
  Sliders,
  FileSearch,
  Zap
} from 'lucide-react';
import VehicleMaintenanceForm from '../components/maintenance/VehicleMaintenanceForm';
import { useNavigate } from 'react-router-dom';

interface ImportStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

export default function BaseDataPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

  // ファイル選択�E処琁E
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    
    if (files) {
      const statusList: ImportStatus[] = Array.from(files).map(file => ({
        fileName: file.name,
        status: 'pending'
      }));
      setImportStatus(statusList);
    }
  };

  // ファイルのインポ�Eト�E琁E
  const handleImport = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('ファイルを選択してください');
      return;
    }

    setIsProcessing(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // スチE�Eタスを「�E琁E��」に更新
        setImportStatus(prev => prev.map((status, index) => 
          index === i 
            ? { ...status, status: 'processing' as const }
            : status
        ));

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/files/import', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            setImportStatus(prev => prev.map((status, index) => 
              index === i 
                ? { 
                    ...status, 
                    status: 'success' as const, 
                    message: result.message || 'インポ�Eト完亁E
                  }
                : status
            ));
          } else {
            const error = await response.json();
            setImportStatus(prev => prev.map((status, index) => 
              index === i 
                ? { 
                    ...status, 
                    status: 'error' as const, 
                    message: error.message || 'インポ�Eトエラー'
                  }
                : status
            ));
          }
        } catch (error) {
          setImportStatus(prev => prev.map((status, index) => 
            index === i 
              ? { 
                  ...status, 
                  status: 'error' as const, 
                  message: 'ネットワークエラー'
                }
              : status
          ));
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ImportStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">征E��中</Badge>;
      case 'processing':
        return <Badge variant="default">処琁E��</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">完亁E/Badge>;
      case 'error':
        return <Badge variant="destructive">エラー</Badge>;
      default:
        return <Badge variant="secondary">不�E</Badge>;
    }
  };

  // RAG設定�E保孁E
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
        throw new Error('設定�E保存に失敗しました');
      }
    } catch (error) {
      console.error('RAG設定保存エラー:', error);
      alert('設定�E保存中にエラーが発生しました');
    }
  };

  // RAG設定�E読み込み
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

  // コンポ�Eネント�Eウント時に設定を読み込み
  useEffect(() => {
    loadRagSettings();
  }, []);

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Database className="inline mr-2" />
          基準データ管琁E
        </h1>
        <p className="text-gray-600">
          保守用車両チE�Eタの管琁E��設定を行いまぁE
        </p>
      </div>

      {/* メインコンチE��チE*/}
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            チE�Eタインポ�EチE
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            手動入劁E
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            設宁E
          </TabsTrigger>
        </TabsList>

        {/* インポ�EトタチE*/}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ファイルインポ�EチE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">
                  ファイルを選抁E(TXT, PDF, XLSX, PPTX)
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".txt,.pdf,.xlsx,.pptx"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {selectedFiles && (
                <div className="space-y-2">
                  <h4 className="font-medium">選択されたファイル:</h4>
                  <div className="space-y-2">
                    {importStatus.map((status, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{status.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status.status)}
                          {status.message && (
                            <span className="text-xs text-gray-500">{status.message}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleImport}
                disabled={!selectedFiles || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    処琁E��...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    インポ�Eト実衁E
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 手動入力タチE*/}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                保守用車両チE�Eタ入劁E
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleMaintenanceForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定タチE*/}
        <TabsContent value="settings" className="space-y-6">
          {/* 基本設宁E*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                基本シスチE��設宁E
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>チE�EタチE��レクトリ</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      /knowledge-base/vehicle-maintenance
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>許可ファイル形弁E/Label>
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

          {/* RAG設宁E*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                RAG (Retrieval-Augmented Generation) 設宁E
              </CardTitle>
              <p className="text-sm text-gray-600">
                GPTレスポンスの精度向上�Eための事前処琁E��ラメーター
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* チャンク設宁E*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  チE��スト�E割設宁E
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chunkSize">
                      チャンクサイズ: {ragSettings.chunkSize}斁E��E
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
                      チE��ストを刁E��する際�E1チャンクあたり�E斁E��数
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chunkOverlap">
                      オーバ�EラチE�E: {ragSettings.chunkOverlap}斁E��E
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
                      チャンク間で重褁E��せる斁E��数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索設宁E*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  検索精度設宁E
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
                      1回�E検索で取得する最大結果数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索手況E*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  検索手況E
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
                    <span className="text-sm">セマンチE��チE��検索</span>
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

              {/* 前�E琁E��宁E*/}
              <div className="space-y-4">
                <h4 className="font-medium">チE��スト前処琁E/h4>
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
                    <span className="text-sm">大斁E��小文字正規化</span>
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
                  placeholder="RAG検索結果を活用する際�E追加持E��を�E劁E.."
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  検索結果をGPTに渡す際の追加持E��
                </p>
              </div>

              {/* 設定保存�Eタン */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={saveRagSettings} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  RAG設定を保孁E
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  チャチE��画面に戻めE
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
