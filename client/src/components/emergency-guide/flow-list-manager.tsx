import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Edit, Eye, Trash2, RefreshCw, Plus } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  const fetchFlowList = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 フロー一覧を取得中...');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error('フロー一覧の取得に失敗しました');
      const data = await response.json();
      
      console.log('✅ フロー一覧取得完了:', data.length + '件');
      setFlowList(data);
    } catch (error) {
      console.error('フロー一覧取得エラー:', error);
      toast({
        title: "エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowList();
  }, []);

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!flowToDelete) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/delete/${flowToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('フローの削除に失敗しました');
      
      toast({
        title: "成功",
        description: "フローが削除されました",
      });
      
      // 一覧を更新
      fetchFlowList();
    } catch (error) {
      console.error('フロー削除エラー:', error);
      toast({
        title: "エラー",
        description: "フローの削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(false);
      setFlowToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ja-JP');
    } catch {
      return '不明';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">フロー一覧</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchFlowList}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        フローが見つかりません
                      </TableCell>
                    </TableRow>
                  ) : (
                    flowList.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell className="font-medium max-w-md">
                          <div className="break-words leading-tight">{flow.title}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(flow.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onPreview(flow.id)}
                              title="プレビュー"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(flow.id)}
                              title="編集"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(flow.id)}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
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