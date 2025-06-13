
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

const EmergencyFlowCreator: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ファイル編集タブ内のサブタブ
  const [characterDesignTab, setCharacterDesignTab] = useState<string>('new');
  
  // アップロード関連の状態
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // アップロード完了時のファイル名を保持
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // フロー編集の状態
  const [flowData, setFlowData] = useState<any>(null);
  
  // キャラクター削除関連の状態
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  
  // 保存済みフローのリスト
  const [flowList, setFlowList] = useState<any[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  
  // フロー一覧を取得
  const fetchFlowList = async () => {
    try {
      setIsLoadingFlowList(true);
      console.log('応急処置データ一覧の取得を開始します');
      
      // キャッシュを防止するためにタイムスタンプパラメータを追加
      const timestamp = Date.now();
      const response = await fetch(`/api/emergency-guide/flows?t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('取得したフローデータ:', data);
      
      // データ構造を確認してから設定
      if (Array.isArray(data)) {
        setFlowList(data);
      } else if (data.flows && Array.isArray(data.flows)) {
        setFlowList(data.flows);
      } else {
        console.warn('予期しないデータ構造:', data);
        setFlowList([]);
      }
    } catch (error) {
      console.error('フロー一覧の取得エラー:', error);
      toast({
        title: "エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive"
      });
      setFlowList([]);
    } finally {
      setIsLoadingFlowList(false);
    }
  };

  // コンポーネント初期化時にフロー一覧を取得
  useEffect(() => {
    fetchFlowList();
  }, []);

  // ファイル選択ハンドラー
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('ファイルが選択されました:', file.name);
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // ファイルアップロード処理
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
      console.log('ファイルアップロードを開始します:', selectedFile.name);
      
      // プログレスシミュレーション
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/emergency-guide/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('アップロードエラー:', errorData);
        throw new Error(`アップロードに失敗しました: ${response.status}`);
      }

      const result = await response.json();
      console.log('アップロード成功:', result);
      
      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);
      
      toast({
        title: "成功",
        description: `${selectedFile.name} のアップロードが完了しました`,
        variant: "default"
      });

      // フロー一覧を再取得
      await fetchFlowList();

    } catch (error) {
      console.error('アップロードエラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "アップロードに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // フロー編集ハンドラー
  const handleEditFlow = (flowId: string) => {
    console.log('フロー編集を開始:', flowId);
    
    // フロー詳細データの取得
    const fetchFlowData = async () => {
      try {
        const response = await fetch(`/api/emergency-guide/flows/${flowId}`);
        if (!response.ok) {
          throw new Error('フローデータの取得に失敗しました');
        }
        
        const data = await response.json();
        console.log('取得したフローデータ:', data);
        setFlowData(data);
        setCharacterDesignTab('edit');
      } catch (error) {
        console.error('フロー取得エラー:', error);
        toast({
          title: "エラー",
          description: "フローデータの取得に失敗しました",
          variant: "destructive"
        });
      }
    };

    fetchFlowData();
  };

  // フロー削除ハンドラー
  const handleDeleteFlow = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowConfirmDelete(true);
  };

  // 削除確認実行
  const confirmDelete = async () => {
    if (!flowToDelete) return;

    try {
      console.log('フロー削除を実行:', flowToDelete);
      
      const response = await fetch(`/api/emergency-guide/flows/${flowToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast({
        title: "成功",
        description: "フローが削除されました",
        variant: "default"
      });

      // フロー一覧を再取得
      await fetchFlowList();

      // 編集中のフローが削除された場合は編集を終了
      if (flowData && flowData.id === flowToDelete) {
        setFlowData(null);
        setCharacterDesignTab('new');
      }

    } catch (error) {
      console.error('削除エラー:', error);
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive"
      });
    } finally {
      setShowConfirmDelete(false);
      setFlowToDelete(null);
    }
  };

  // 新規フロー作成ハンドラー
  const handleNewFlow = () => {
    setFlowData(null);
    setCharacterDesignTab('new');
  };

  // フロー保存後のハンドラー
  const handleFlowSaved = async () => {
    console.log('フロー保存完了 - 一覧を更新します');
    
    // フロー一覧を再取得
    await fetchFlowList();
    
    // チャット画面への更新通知を送信
    try {
      // 複数のカスタムイベントを発行して、チャット画面とトラブルシューティングデータの更新をトリガー
      window.dispatchEvent(new CustomEvent('flowDataUpdated'));
      window.dispatchEvent(new CustomEvent('troubleshootingDataUpdated'));
      window.dispatchEvent(new CustomEvent('emergencyGuideUpdated'));
      
      console.log('チャット画面への更新通知を送信しました');
    } catch (error) {
      console.error('更新通知の送信エラー:', error);
    }
    
    toast({
      title: "成功",
      description: "フローが保存されました",
      variant: "default"
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">応急処置フロー管理</h1>
        <Button onClick={fetchFlowList} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      <Tabs value={characterDesignTab} onValueChange={setCharacterDesignTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">新規作成</TabsTrigger>
          <TabsTrigger value="upload">アップロード</TabsTrigger>
          <TabsTrigger value="edit" disabled={!flowData}>編集</TabsTrigger>
        </TabsList>

        {/* 新規作成タブ */}
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
              <EmergencyFlowEditor 
                onSave={handleFlowSaved}
                flowData={null}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* アップロードタブ */}
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
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      JSONファイルをドラッグ&ドロップするか、クリックして選択
                    </p>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  ファイルを選択
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>アップロード中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {uploadSuccess && uploadedFileName && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Badge variant="default" className="bg-green-500">
                    完了
                  </Badge>
                  <span className="text-sm text-green-700">
                    {uploadedFileName} のアップロードが完了しました
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? 'アップロード中...' : 'アップロード'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 編集タブ */}
        <TabsContent value="edit" className="space-y-4">
          {flowData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  フロー編集: {flowData.title}
                </CardTitle>
                <CardDescription>
                  既存のフローを編集します
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmergencyFlowEditor 
                  onSave={handleFlowSaved}
                  flowData={flowData}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-gray-500">編集するフローを選択してください</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* フロー一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            保存済みフロー一覧
          </CardTitle>
          <CardDescription>
            作成・アップロードされたフローの管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFlowList ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">読み込み中...</span>
            </div>
          ) : flowList.length > 0 ? (
            <div className="space-y-2">
              {flowList.map((flow) => (
                <div
                  key={flow.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{flow.title}</h3>
                    <p className="text-sm text-gray-600">{flow.description}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        ID: {flow.id}
                      </span>
                      {flow.fileName && (
                        <span className="text-xs text-gray-500">
                          ファイル: {flow.fileName}
                        </span>
                      )}
                      {flow.createdAt && (
                        <span className="text-xs text-gray-500">
                          作成日: {new Date(flow.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFlow(flow.id)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                保存されたフローがありません
              </p>
              <p className="text-xs text-gray-500 mt-1">
                新規作成またはアップロードからフローを作成してください
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              フローの削除
            </AlertDialogTitle>
            <AlertDialogDescription>
              このフローを完全に削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyFlowCreator;
