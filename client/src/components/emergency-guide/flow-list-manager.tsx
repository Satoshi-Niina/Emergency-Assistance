import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast.ts";
import { Edit, Eye, Trash2, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { buildApiUrl } from "../../lib/api/config.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

interface FlowData {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string;
  updatedAt?: string;
}

interface FlowListManagerProps {
  onEdit: (flowId: string) => void;
  onPreview: (flowId: string) => void;
  onNew: () => void;
}

const FlowListManager: React.FC<FlowListManagerProps> = ({
  onEdit,
  onPreview,
  onNew
}) => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  // 実際のAPI呼び出し
  useEffect(() => {
    console.log('🔄 FlowListManager マウント完了');
    fetchFlowList();
  }, []);

  const fetchFlowList = async () => {
    console.log('🚀 fetchFlowList関数開始');
    try {
      setIsLoading(true);
      console.log('🔄 フロー一覧を取得中...');
      
      const apiUrl = buildApiUrl('/api/troubleshooting/list');
      console.log('🔗 API URL:', apiUrl);

      // キャッシュ無効化のためのタイムスタンプ
      const timestamp = Date.now();
      const cacheBuster = `?t=${timestamp}`;
      
      const fullUrl = `${apiUrl}${cacheBuster}`;
      console.log('🔗 完全なURL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      console.log('📡 レスポンス状態:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 取得したデータ:', data);

      // APIレスポンスの構造に合わせてデータを取得
      let flows = [];
      if (data.success && data.data) {
        console.log('✅ dataプロパティからデータを取得');
        flows = data.data;
      } else if (data.success && data.flows) {
        console.log('✅ flowsプロパティからデータを取得');
        flows = data.flows;
      } else if (Array.isArray(data)) {
        console.log('✅ 配列として直接データを取得');
        flows = data;
      } else {
        console.error('❌ 予期しないフローデータ形式:', data);
        throw new Error("フローデータの形式が不正です");
      }

      console.log('📋 処理前のflows配列:', flows);
      console.log('📋 flows配列の詳細:', {
        length: flows.length,
        isArray: Array.isArray(flows),
        firstItem: flows[0]
      });

      // createdAtプロパティが存在しない場合のデフォルト値を設定
      flows = flows.map(flow => ({
        ...flow,
        createdAt: flow.createdAt || flow.updatedAt || flow.savedAt || new Date().toISOString()
      }));

      console.log('✅ フロー一覧取得完了:', flows.length + '件');
      setFlowList(flows);
      
    } catch (error) {
      console.error('❌ fetchFlowList関数でエラーが発生:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ファイル一覧の取得に失敗しました",
        variant: "destructive",
      });
      setFlowList([]);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchFlowList関数終了');
    }
  };

  const handleRefresh = () => {
    console.log('🔄 手動更新開始');
    fetchFlowList();
  };

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!flowToDelete) return;
    console.log('🗑️ フロー削除:', flowToDelete);
    setShowDeleteConfirm(false);
    setFlowToDelete(null);
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return '未設定';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '無効な日付';
      return date.toLocaleString('ja-JP');
    } catch (error) {
      return 'エラー';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">ファイル一覧</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  更新
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">タイトル</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">作成日時</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {flowList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500">
                        フローが見つかりません
                      </td>
                    </tr>
                  ) : (
                    flowList.map((flow) => (
                      <tr key={flow.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">
                          <div className="break-words leading-tight text-sm">{flow.title}</div>
                        </td>
                        <td className="border border-gray-300 p-2 text-xs text-gray-500">
                          {formatDate(flow.createdAt)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onPreview(flow.id)}
                              title="プレビュー"
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(flow.id)}
                              title="編集"
                              className="h-7 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(flow.id)}
                              title="削除"
                              className="h-7 px-2 text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フローの削除</AlertDialogTitle>
            <AlertDialogDescription>
              このフローを削除してもよろしいですか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlowListManager;