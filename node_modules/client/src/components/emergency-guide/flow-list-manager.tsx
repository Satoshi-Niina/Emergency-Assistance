import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';

import { useToast } from '../../hooks/use-toast.ts';
import { Edit, Eye, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../../lib/api/config.ts';
import { useAuth } from '../../context/auth-context.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

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
}

const FlowListManager: React.FC<FlowListManagerProps> = ({
  onEdit,
  onPreview,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  // 実際のAPI呼び出し
  useEffect(() => {
    console.log('🔄 FlowListManager マウント完了');
    console.log('👤 認証状態:', { user: !!user, userId: user?.id });
    fetchFlowList();
    
    // フロー生成完了イベントをリッスン
    const handleFlowGenerated = () => {
      console.log('🔄 フロー生成完了イベントを受信、一覧を更新します');
      fetchFlowList();
    };
    
    // フロー削除完了イベントをリッスン
    const handleFlowDeleted = () => {
      console.log('🔄 フロー削除完了イベントを受信、一覧を更新します');
      fetchFlowList();
    };
    
    // カスタムイベントリスナーを追加
    window.addEventListener('flowGenerated', handleFlowGenerated);
    window.addEventListener('flowDeleted', handleFlowDeleted);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('flowGenerated', handleFlowGenerated);
      window.removeEventListener('flowDeleted', handleFlowDeleted);
    };
  }, [user]);

  const fetchFlowList = async () => {
    console.log('🚀 fetchFlowList関数開始');

    // 認証チェック
    if (!user) {
      console.log('❌ ユーザーが認証されていません');
      toast({
        title: '認証エラー',
        description: 'ログインが必要です',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 フロー一覧を取得中...');

      const apiUrl = buildApiUrl('/emergency-flow/list');
      console.log('🔗 API URL:', apiUrl);

      // キャッシュ無効化のためのタイムスタンプ
      const timestamp = Date.now();
      const cacheBuster = `?t=${timestamp}`;

      const fullUrl = `${apiUrl}${cacheBuster}`;
      console.log('🔗 完全なURL:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        credentials: 'include', // セッション維持のため必須
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      console.log('📡 レスポンス状態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ APIエラーレスポンス:', errorText);
        throw new Error(
          `APIエラー: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log('📊 取得したデータ:', data);

      // APIレスポンスの構造に合わせてデータを取得  
      let flows = [];
      if (data.success && data.data) {
        console.log('✅ dataプロパティからデータを取得');
        flows = data.data.map(flow => ({
          id: flow.content?.id || flow.id,
          title: flow.content?.title || flow.title || flow.name || 'タイトルなし',
          description: flow.content?.description || flow.description,
          fileName: flow.filename || flow.fileName,
          createdAt: flow.content?.createdAt || flow.createdAt || new Date().toISOString(),
          updatedAt: flow.content?.updatedAt || flow.updatedAt,
          steps: flow.steps
        }));
      } else if (data.success && data.flows) {
        console.log('✅ flowsプロパティからデータを取得');
        flows = data.flows.map(flow => ({
          id: flow.content?.id || flow.id,
          title: flow.content?.title || flow.title || flow.name || 'タイトルなし',
          description: flow.content?.description || flow.description,
          fileName: flow.filename || flow.fileName,
          createdAt: flow.content?.createdAt || flow.createdAt || new Date().toISOString(),
          updatedAt: flow.content?.updatedAt || flow.updatedAt,
          steps: flow.steps
        }));
      } else if (Array.isArray(data)) {
        console.log('✅ 配列として直接データを取得');
        flows = data;
      } else {
        console.error('❌ 予期しないフローデータ形式:', data);
        throw new Error('フローデータの形式が不正です');
      }

      console.log('📋 処理前のflows配列:', flows);
      console.log('📋 flows配列の詳細:', {
        length: flows.length,
        isArray: Array.isArray(flows),
        firstItem: flows[0],
      });

      // createdAtプロパティが存在しない場合のデフォルト値を設定
      flows = flows.map(flow => ({
        ...flow,
        createdAt:
          flow.createdAt ||
          flow.updatedAt ||
          flow.savedAt ||
          new Date().toISOString(),
      }));

      console.log('✅ フロー一覧取得完了:', flows.length + '件');
      setFlowList(flows);
    } catch (error) {
      console.error('❌ fetchFlowList関数でエラーが発生:', error);
      toast({
        title: 'エラー',
        description:
          error instanceof Error
            ? error.message
            : 'ファイル一覧の取得に失敗しました',
        variant: 'destructive',
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
    
    try {
      console.log('🗑️ フロー削除開始:', flowToDelete);
      
      // 削除APIを呼び出し
      const response = await fetch(`/api/emergency-flow/${flowToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📡 削除レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorMessage = `削除に失敗しました: ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.log('❌ 削除エラーデータ:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.warn('⚠️ エラーレスポンスの解析に失敗:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ 削除レスポンス:', result);

      // 成功メッセージを表示
      toast({
        title: '削除完了',
        description: 'フローが正常に削除されました',
      });

      // フロー一覧から削除されたアイテムを即座に除去
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowToDelete);
        console.log(
          '📋 フロー一覧から除去: ' +
            flowToDelete +
            ' (残り: ' +
            filteredList.length +
            '件)'
        );
        return filteredList;
      });

      // サーバーから最新のフロー一覧を強制取得
      console.log('🔄 フロー一覧を再取得中...');
      await fetchFlowList();

    } catch (error) {
      console.error('❌ 削除エラー:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'フローの削除に失敗しました';
      toast({
        title: '削除エラー',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setShowDeleteConfirm(false);
      setFlowToDelete(null);
    }
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
    <div className='space-y-6'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div>
            <CardTitle className='text-xl'>ファイル一覧</CardTitle>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  更新中...
                </>
              ) : (
                <>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  更新
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center h-64'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
            </div>
          ) : (
            <div className='overflow-auto'>
              <table className='w-full border-collapse border border-gray-300 text-sm'>
                <thead>
                  <tr className='bg-gray-100'>
                    <th className='border border-gray-300 p-2 text-left text-sm font-medium'>
                      タイトル
                    </th>
                    <th className='border border-gray-300 p-2 text-left text-sm font-medium'>
                      作成日時
                    </th>
                    <th className='border border-gray-300 p-2 text-left text-sm font-medium'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {flowList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className='border border-gray-300 p-4 text-center text-gray-500'
                      >
                        フローが見つかりません
                      </td>
                    </tr>
                  ) : (
                    flowList.map(flow => (
                      <tr key={flow.id} className='hover:bg-gray-50'>
                        <td className='border border-gray-300 p-2'>
                          <div className='break-words leading-tight text-sm'>
                            {flow.title || flow.description?.substring(0, 30) + '...' || flow.fileName || flow.id || 'タイトルなし'}
                          </div>
                        </td>
                        <td className='border border-gray-300 p-2 text-xs text-gray-500'>
                          {formatDate(flow.createdAt)}
                        </td>
                        <td className='border border-gray-300 p-2'>
                          <div className='flex gap-1'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => onPreview(flow.id)}
                              title='プレビュー'
                              className='h-7 px-2 text-xs'
                            >
                              <Eye className='h-3 w-3' />
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => onEdit(flow.id)}
                              title='編集'
                              className='h-7 px-2 text-xs'
                            >
                              <Edit className='h-3 w-3' />
                            </Button>
                            <Button
                              variant='destructive'
                              size='sm'
                              onClick={() => handleDeleteClick(flow.id)}
                              title='削除'
                              className='h-7 px-2 text-xs'
                            >
                              <Trash2 className='h-3 w-3' />
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
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-700'
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlowListManager;
