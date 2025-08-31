import React, { useState, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast.ts";
import { Plus, RefreshCw, Trash2, FileEdit } from 'lucide-react';
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

interface TroubleshootingFileListProps {
  onEdit: (flowId: string) => void;
  onNew: () => void;
}

const TroubleshootingFileList: React.FC<TroubleshootingFileListProps> = ({
  onEdit,
  onNew
}) => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<Array<{
    id: string;
    title: string;
    description: string;
    fileName: string;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  const fetchFlowList = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 ファイル一覧を取得中...');
      
      // キャッシュ無効化のためにタイムスタンプを追加
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error('ファイル一覧の取得に失敗しました');
      const data = await response.json();
      
      console.log('✅ ファイル一覧取得完了:', data.length + '件');
      setFlowList(data);
    } catch (error) {
      console.error('ファイル一覧取得エラー:', error);
      toast({
        title: "エラー",
        description: "ファイル一覧の取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowList();
  }, []);

  const handleDeleteClick = async (id: string) => {
    if (!confirm('このファイルを削除してもよろしいですか？')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('ファイルの削除に失敗しました');
      
      // 一覧を更新
      fetchFlowList();
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      toast({
        title: "エラー",
        description: "ファイルの削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">フローファイル一覧</CardTitle>
            <CardDescription>
              保存されているフローファイルを管理します
            </CardDescription>
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
            <Button
              variant="default"
              onClick={onNew}
            >
              <Plus className="h-4 w-4 mr-1" />
              新規作成
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
                    <TableHead>説明</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowList.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="font-medium max-w-md">
                        <div className="break-words leading-tight">{flow.title}</div>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="break-words leading-tight text-sm text-gray-600">{flow.description}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(flow.id)}
                          >
                            <FileEdit className="h-4 w-4 mr-1" />
                            編集
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(flow.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フローを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このフローを削除すると、すべての関連データが失われます。この操作は元に戻すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteClick(flowToDelete || '')} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TroubleshootingFileList;
