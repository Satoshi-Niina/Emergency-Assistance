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
  const [isUploading, setIsUploading] = useState(isUploading);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<string | null>(null);
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // 削除関連
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<FlowFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // フロー一覧を取得する関数
  const fetchFlowList = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingFlowList(true);

      // 🧹 強制リフレッシュ時は全キャッシュをクリア
      if (forceRefresh && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 フロー一覧取得前キャッシュクリア完了');
        } catch (cacheError) {
          console.warn('⚠️ キャッシュクリアエラー:', cacheError);
        }
      }

      // キャッシュバスターパラメータを追加
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const url = `/api/emergency-flow-router/list?ts=${timestamp}&_r=${randomId}${forceRefresh ? '&force=true' : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Refresh': forceRefresh.toString(),
          'X-Timestamp': timestamp.toString()
        }
      });

      if (!response.ok) {
        throw new Error('フロー一覧の取得に失敗しました');
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        console.log(`✅ フロー一覧取得成功: ${data.length}件`);

        // 🔍 各フローの詳細情報をログ出力
        data.forEach((flow, index) => {
          console.log(`📋 フロー${index + 1}:`, {
            id: flow.id,
            title: flow.title,
            fileName: flow.fileName,
            stepCount: flow.steps?.length || flow.slides?.length || 0,
            createdAt: flow.createdAt
          });
        });

        // 取得したデータを全て表示（フィルタリングなし）
        const allFlowData = Array.isArray(data) ? data : [];
        console.log(`🔄 フロー一覧更新: ${allFlowData.length}件のデータを表示`);
        setFlowList(allFlowData);

        // 🔄 現在編集中のフローがある場合、一覧データで更新
        if (selectedFlowForEdit && allFlowData.length > 0) {
          const updatedFlow = allFlowData.find(f => f.id === selectedFlowForEdit);
          if (updatedFlow) {
            console.log(`🔄 編集中フローを一覧データで更新: ${updatedFlow.id}`);
            // エディターに最新データを反映するイベントを発行
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('flowDataRefreshed', {
                detail: { 
                  data: updatedFlow, 
                  flowId: updatedFlow.id,
                  timestamp: Date.now()
                }
              }));
            }, 100);
          }
        }
      } else {
        console.warn('⚠️ 予期しないデータ形式:', data);
        setFlowList([]);
      }

      // 他のコンポーネントにフロー一覧更新を通知
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('flowListUpdated', {
          detail: { 
            flowList: allFlowData,
            timestamp: Date.now(),
            source: 'flow-creator'
          }
        }));
      }, 100);
    } catch (error) {
      console.error('❌ フロー一覧取得エラー:', error);
      toast({
        title: "取得エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive"
      });
      setFlowList([]);
    } finally {
      setIsLoadingFlowList(false);
    }
  }, [toast, selectedFlowForEdit]);

  // 初期データ読み込み
  useEffect(() => {
    fetchFlowList();
  }, []);

  // 強制更新イベントリスナー
  useEffect(() => {
    const handleForceRefresh = (event: any) => {
      console.log('🔄 強制フロー一覧更新イベント受信');
      fetchFlowList(true);
    };

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
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

  // フロー編集用のデータ読み込み
  const loadFlowForEdit = async (flowId: string) => {
    try {
      console.log(`🔄 フロー編集データ読み込み: ${flowId}`);

      // 🎯 フロー一覧からファイル情報を取得
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error(`フローが見つかりません: ${flowId}`);
      }

      // 🎯 ファイルパスを確実に設定（troubleshootingディレクトリ限定）
      const fileName = targetFlow.fileName.endsWith('.json') ? targetFlow.fileName : `${targetFlow.fileName}.json`;
      const filePath = `knowledge-base/troubleshooting/${fileName}`;
      setSelectedFilePath(filePath);
      console.log(`📁 編集対象ファイルパス確実設定: ${filePath}`);

      // 🚫 ブラウザキャッシュを強制クリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャッシュクリア完了');
      }

      // 🎯 統一されたAPIエンドポイントで直接取得
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);

      const response = await fetch(`/api/emergency-flow-router/${flowId}?ts=${timestamp}&_r=${randomId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Fresh': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`フローデータの取得に失敗しました (${response.status})`);
      }

      const data = await response.json();

      // 🎯 フロー一覧のデータ構造をエディター用に変換（slides/steps統一）
      const sourceSteps = data.slides || data.steps || [];
      const editorData = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        triggerKeywords: data.trigger || data.triggerKeywords || [],
        steps: sourceSteps.map(step => ({
          ...step,
          // description と message の同期
          description: step.description || step.message || '',
          message: step.message || step.description || ''
        })),
        updatedAt: data.createdAt || data.updatedAt || new Date().toISOString()
      };

      // 🔍 データ整合性の厳密チェック
      console.log(`✅ 取得したフローデータ:`, {
        requestedId: flowId,
        retrievedId: editorData.id,
        title: editorData.title,
        stepsCount: editorData.steps?.length || 0,
        fileName: targetFlow.fileName,
        filePath: filePath,
        allStepIds: editorData.steps?.map(s => s.id) || [],
        timestamp: cacheBuster,
        dataSource: 'emergency-flow-list-api'
      });

      // ⚠️ ステップ数不一致の警告
      if (editorData.steps?.length !== 15) {
        console.warn(`⚠️ 期待されるステップ数と異なります: 実際=${editorData.steps?.length}, 期待=15`);

        // 🔍 不足しているステップを特定
        const expectedStepIds = ['start', 'step1', 'decision1', 'step2a', 'step2b', 'step3a', 'step3b', 'step3c', 'step3d', 'step3e', 'step3f', 'step3g', 'decision2', 'step_success', 'step_failure'];
        const actualStepIds = editorData.steps?.map(s => s.id) || [];
        const missingSteps = expectedStepIds.filter(id => !actualStepIds.includes(id));

        if (missingSteps.length > 0) {
          console.error(`❌ 不足しているステップ:`, missingSteps);
          toast({
            title: "データ不整合警告",
            description: `ファイルに${missingSteps.length}個のステップが不足しています。`,
            variant: "destructive"
          });
        }
      }

      setCurrentFlowData(editorData);
      setSelectedFlowForEdit(flowId);

      console.log(`🎯 フロー編集準備完了:`, {
        flowId: flowId,
        filePath: filePath,
        dataLoaded: !!data,
        stepsCount: data.steps?.length || 0,
        cacheBuster: cacheBuster
      });

    } catch (error) {
      console.error('❌ フローデータ取得エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "フローデータの読み込みに失敗しました",
        variant: "destructive"
      });
    }
  };

  // フロー削除 - 物理ファイル削除とフロー一覧からの完全除去
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      console.log(`🗑️ フロー削除開始: ${flowId}`);

      // troubleshootingディレクトリから物理ファイルを削除
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (targetFlow) {
        const fileName = targetFlow.fileName || `${flowId}.json`;
        const response = await fetch(`/api/emergency-flow/${flowId}`, {
          method: 'DELETE',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName })
        });

        if (!response.ok) {
          throw new Error('削除に失敗しました');
        }

        const result = await response.json();
        console.log(`✅ 削除レスポンス:`, result);
      }

      toast({
        title: "削除完了",
        description: "フローが完全に削除されました",
      });

      // 削除されたアイテムが現在編集中の場合はクリア
      if (selectedFlowForEdit === flowId) {
        setSelectedFlowForEdit(null);
        setCurrentFlowData(null);
        setSelectedFilePath(null);
      }

      // フロー一覧から削除されたアイテムを即座に除去
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowId);
        console.log(`🔄 フロー一覧から除去: ${flowId} (残り: ${filteredList.length}件)`);
        return filteredList;
      });

      // サーバーから最新のフロー一覧を強制取得
      await fetchFlowList(true);

      // 他のコンポーネントに削除完了を通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowDeleted', {
          detail: { deletedId: flowId }
        }));
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList'));
      }

    } catch (error) {
      console.error('❌ 削除エラー:', error);
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
                    selectedFilePath={selectedFilePath}
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