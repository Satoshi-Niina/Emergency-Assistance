
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Save, X, Edit, Edit3, File, FileText, Plus, Download, FolderOpen, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmergencyFlowEditor from './emergency-flow-editor';

interface FlowFile {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string;
  trigger?: string[];
  slides?: any[];
}

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: any[];
  updatedAt?: string;
}

const EmergencyFlowCreator: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状態管理
  const [activeTab, setActiveTab] = useState<'new' | 'upload' | 'edit'>('new');
  const [flowList, setFlowList] = useState<FlowFile[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<string | null>(null);
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  
  // 削除関連
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<FlowFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // フロー一覧取得（削除されたファイルの検出機能付き）
  const fetchFlowList = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingFlowList(true);
      console.log(`📋 フロー一覧取得開始 (forceRefresh: ${forceRefresh})`);

      // キャッシュバスティング
      const timestamp = Date.now();
      const cacheParams = forceRefresh ? 
        `?_t=${timestamp}&_r=${Math.random().toString(36).substring(2)}&force_refresh=true` : 
        `?_t=${timestamp}`;

      const response = await fetch(`/api/emergency-flow/list${cacheParams}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': forceRefresh ? 'true' : 'false'
        }
      });

      if (!response.ok) {
        throw new Error(`フロー一覧の取得に失敗: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ 取得したフローデータ:`, data);

      // データの整合性チェック
      const validData = Array.isArray(data) ? data : [];
      
      // 重複除去
      const uniqueData = validData.filter((item, index, arr) => 
        arr.findIndex(t => t.id === item.id) === index
      );

      // 既存のリストと比較して削除されたファイルを検出
      const currentIds = new Set(uniqueData.map(item => item.id));
      const removedItems = flowList.filter(item => !currentIds.has(item.id));
      
      if (removedItems.length > 0) {
        console.log(`🗑️ 削除されたファイルを検出:`, removedItems);
        removedItems.forEach(item => {
          toast({
            title: "ファイル削除を検出",
            description: `「${item.title}」が削除されました`,
            variant: "default"
          });
        });
      }

      setFlowList(uniqueData);

      // グローバル更新イベント発行
      window.dispatchEvent(new CustomEvent('forceRefreshFlowList', {
        detail: { flowList: uniqueData }
      }));

    } catch (error) {
      console.error('❌ フロー一覧取得エラー:', error);
      toast({
        title: "エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive"
      });
      setFlowList([]);
    } finally {
      setIsLoadingFlowList(false);
    }
  }, [flowList, toast]);

  // 初期化時とイベント監視
  useEffect(() => {
    fetchFlowList(true);

    // データ更新イベントのリスナー
    const handleDataUpdate = () => {
      console.log('🔄 データ更新イベントを受信 - フロー一覧を更新');
      fetchFlowList(true);
    };

    const eventTypes = [
      'flowDataUpdated',
      'troubleshootingDataUpdated',
      'emergencyFlowSaved',
      'fileSystemUpdated',
      'forceRefreshFlowList'
    ];

    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleDataUpdate);
    });

    // 定期的なチェック（削除ファイル検出用）
    const intervalId = setInterval(() => {
      fetchFlowList(true);
    }, 30000); // 30秒ごと

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleDataUpdate);
      });
      clearInterval(intervalId);
    };
  }, []);

  // ファイル選択
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // ファイルアップロード
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // プログレス更新
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/emergency-flow/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('アップロードに失敗しました');
      }

      const result = await response.json();
      
      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);
      
      toast({
        title: "アップロード完了",
        description: `${selectedFile.name} がアップロードされました`,
      });

      // フロー一覧を更新
      await fetchFlowList(true);
      
      // 編集タブに切り替え
      setActiveTab('edit');

    } catch (error) {
      console.error('アップロードエラー:', error);
      toast({
        title: "アップロードエラー",
        description: "ファイルのアップロードに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // フロー編集用データ取得
  const loadFlowForEdit = async (flowId: string) => {
    try {
      const response = await fetch(`/api/emergency-flow/${flowId}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('フローデータの取得に失敗しました');
      }
      
      const data = await response.json();
      setCurrentFlowData(data);
      setSelectedFlowForEdit(flowId);
      
    } catch (error) {
      console.error('フローデータ取得エラー:', error);
      toast({
        title: "エラー",
        description: "フローデータの読み込みに失敗しました",
        variant: "destructive"
      });
    }
  };

  // フロー削除
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/emergency-flow/${flowId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast({
        title: "削除完了",
        description: "フローが削除されました",
      });

      // 削除されたアイテムが現在編集中の場合はクリア
      if (selectedFlowForEdit === flowId) {
        setSelectedFlowForEdit(null);
        setCurrentFlowData(null);
      }

      // フロー一覧を更新
      await fetchFlowList(true);

    } catch (error) {
      console.error('削除エラー:', error);
      toast({
        title: "削除エラー",
        description: "フローの削除に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setFlowToDelete(null);
    }
  };

  // フロー保存コールバック
  const handleFlowSave = (savedData: FlowData) => {
    setCurrentFlowData(savedData);
    fetchFlowList(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">応急処置フロー管理</h2>
        <Button onClick={() => fetchFlowList(true)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">新規作成</TabsTrigger>
          <TabsTrigger value="upload">アップロード</TabsTrigger>
          <TabsTrigger value="edit" disabled={!flowList.length}>編集</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新規フロー作成
              </CardTitle>
              <CardDescription>
                フローエディターを使用して新しい応急処置フローを作成します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyFlowEditor flowData={null} onSave={handleFlowSave} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                ファイルアップロード
              </CardTitle>
              <CardDescription>
                既存のフローファイル（JSON形式）をアップロードします
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto h-8 w-8 text-blue-500" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FolderOpen className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-500">JSONファイルを選択してください</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  ファイル選択
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center">アップロード中... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'アップロード中...' : 'アップロード'}
                </Button>
                {selectedFile && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* フロー一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>フロー一覧</CardTitle>
                <CardDescription>
                  編集するフローを選択してください ({flowList.length}件)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFlowList ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">読み込み中...</p>
                  </div>
                ) : flowList.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">フローがありません</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {flowList.map((flow) => (
                      <div
                        key={flow.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFlowForEdit === flow.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1"
                            onClick={() => loadFlowForEdit(flow.id)}
                          >
                            <h4 className="font-medium text-sm">{flow.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {flow.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {flow.fileName}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlowToDelete(flow);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* フロー編集エリア */}
            <Card>
              <CardHeader>
                <CardTitle>フロー編集</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFlowForEdit && currentFlowData ? (
                  <EmergencyFlowEditor
                    flowData={currentFlowData}
                    onSave={handleFlowSave}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">編集するフローを選択してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フローを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{flowToDelete?.title}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => flowToDelete && deleteFlow(flowToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyFlowCreator;
