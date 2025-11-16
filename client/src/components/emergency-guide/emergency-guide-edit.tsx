import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { FileText, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import EmergencyFlowEditor from './emergency-flow-editor';
import EmergencyGuideDisplay from './emergency-guide-display';
import { convertImageUrl } from '../../lib/image-utils';

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    message: string;
    type: 'start' | 'step' | 'decision' | 'condition' | 'end';
    imageUrl?: string;
    options?: Array<{
      text: string;
      nextStepId: string;
      isTerminal: boolean;
      conditionType: 'yes' | 'no' | 'other';
      condition?: string;
    }>;
    conditions?: Array<{
      label: string;
      nextId: string;
    }>;
  }>;
  updatedAt?: string;
  filePath: string;
}

// 日付フォーマット関数
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '日付不明';
    }
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return '日付不明';
  }
}

// 差分を計算するユーティリティ関数
function getObjectDiff(original: any, fixed: any, path = ''): string[] {
  const diffs: string[] = [];
  for (const key of new Set([
    ...Object.keys(original || {}),
    ...Object.keys(fixed || {}),
  ])) {
    const origVal = original ? original[key] : undefined;
    const fixVal = fixed ? fixed[key] : undefined;
    const currentPath = path ? `${path}.${key}` : key;
    if (
      typeof origVal === 'object' &&
      typeof fixVal === 'object' &&
      origVal &&
      fixVal &&
      !Array.isArray(origVal) &&
      !Array.isArray(fixVal)
    ) {
      diffs.push(...getObjectDiff(origVal, fixVal, currentPath));
    } else if (Array.isArray(origVal) && Array.isArray(fixVal)) {
      if (origVal.length !== fixVal.length) {
        diffs.push(
          `${currentPath}: 配列の長さが ${origVal.length} → ${fixVal.length} に修正`
        );
      }
      // 配列の各要素も比較、最大5件まで
      for (let i = 0; i < Math.min(origVal.length, fixVal.length, 5); i++) {
        diffs.push(
          ...getObjectDiff(origVal[i], fixVal[i], `${currentPath}[${i}]`)
        );
      }
    } else if (origVal !== fixVal) {
      diffs.push(
        `${currentPath}: 「${origVal ?? '未設定'}」→「${fixVal ?? '未設定'}」`
      );
    }
  }
  return diffs;
}

interface FlowListProps {
  flows: any[];
  onSelectFlow: (flow: any) => void;
  onDeleteFlow: (flowId: string, filePath: string) => void;
  onPreviewFlow: (flow: any) => void;
  isLoading: boolean;
}

const FlowList: React.FC<FlowListProps> = ({
  flows,
  onSelectFlow,
  onDeleteFlow,
  onPreviewFlow,
  isLoading,
}) => {
  console.log('🔍 FlowList レンダリング:', { flowsLength: flows.length, isLoading, flows });

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <p className='ml-3 text-gray-600'>フロー一覧を読み込み中...</p>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className='text-center p-8'>
        <div className='bg-gray-50 rounded-lg p-6'>
          <FileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            フローがありません
          </h3>
          <p className='text-gray-600 mb-4'>
            まだフローが作成されていません。新規フロー生成タブでフローを作成してください。
          </p>
          <div className='flex justify-center space-x-2'>
            <Button
              variant='outline'
              onClick={() =>
                window.dispatchEvent(new CustomEvent('switchToGenerator'))
              }
            >
              新規フロー生成へ
            </Button>
            <Button variant='outline' onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='overflow-auto'>
        <table className='w-full border-collapse border border-gray-300 text-sm'>
          <thead>
            <tr className='bg-gray-100'>
              <th className='border border-gray-300 p-3 text-left text-sm font-medium'>
                タイトル
              </th>
              <th className='border border-gray-300 p-3 text-left text-sm font-medium'>
                説明
              </th>
              <th className='border border-gray-300 p-3 text-left text-sm font-medium'>
                ステップ数
              </th>
              <th className='border border-gray-300 p-3 text-left text-sm font-medium'>
                更新日時
              </th>
              <th className='border border-gray-300 p-3 text-center text-sm font-medium'>
                画像
              </th>
              <th className='border border-gray-300 p-3 text-center text-sm font-medium'>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {flows.map(flow => (
              <tr key={flow.id} className='hover:bg-gray-50'>
                <td className='border border-gray-300 p-3'>
                  <div
                    className='break-words leading-tight text-sm font-semibold cursor-pointer hover:text-blue-600'
                    onClick={() => onSelectFlow(flow)}
                  >
                    {flow.title}
                  </div>
                </td>
                <td className='border border-gray-300 p-3'>
                  <div className='break-words leading-tight text-sm text-gray-600'>
                    {flow.description || '説明なし'}
                  </div>
                </td>
                <td className='border border-gray-300 p-3 text-center'>
                  <span className='text-sm'>{flow.steps?.length || 0}</span>
                </td>
                <td className='border border-gray-300 p-3'>
                  <span className='text-xs text-gray-500'>
                    {formatDate(flow.updatedAt)}
                  </span>
                </td>
                <td className='border border-gray-300 p-3'>
                  <div className='flex justify-center'>
                    {flow.steps && flow.steps.length > 0 && flow.steps.some((step: any) => step.imageUrl || (step.images && step.images.length > 0)) ? (
                      <div className='flex gap-1'>
                        {flow.steps.slice(0, 3).map((step: any, stepIndex: number) => {
                          // 新しい images 配列を優先的に使用
                          if (step.images && step.images.length > 0) {
                            return step.images.slice(0, 1).map((image: any, imageIndex: number) => {
                              const imageUrl = convertImageUrl(image);
                              console.log('🖼️ フロー一覧画像表示:', {
                                stepId: step.id,
                                imageIndex,
                                originalImage: image,
                                convertedUrl: imageUrl
                              });
                              return (
                                <img
                                  key={`${stepIndex}-${imageIndex}`}
                                  src={imageUrl}
                                  alt={`${step.title} - 画像`}
                                  className='w-8 h-8 object-cover rounded border'
                                  onError={(e) => {
                                    console.error('画像読み込みエラー:', {
                                      imageUrl,
                                      originalImage: image,
                                      stepId: step.id
                                    });
                                    e.currentTarget.style.display = 'none';
                                  }}
                                  onLoad={() => {
                                    console.log('画像読み込み成功:', imageUrl);
                                  }}
                                />
                              );
                            });
                          }
                          // 古いimageUrl プロパティの処理（後方互換性）
                          if (step.imageUrl) {
                            const imageUrl = convertImageUrl(step.imageUrl);
                            console.log('🖼️ フロー一覧画像表示（古い形式）', {
                              stepId: step.id,
                              originalImageUrl: step.imageUrl,
                              convertedUrl: imageUrl
                            });
                            return (
                              <img
                                key={stepIndex}
                                src={imageUrl}
                                alt={`${step.title} - 画像`}
                                className='w-8 h-8 object-cover rounded border'
                                onError={(e) => {
                                  console.error('画像読み込みエラー（古い形式）', {
                                    imageUrl,
                                    originalImageUrl: step.imageUrl,
                                    stepId: step.id
                                  });
                                  e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('画像読み込み成功（古い形式）', imageUrl);
                                }}
                              />
                            );
                          }
                          return null;
                        })}
                        {flow.steps.filter((step: any) => step.imageUrl || (step.images && step.images.length > 0)).length > 3 && (
                          <span className='text-xs text-gray-500'>+{flow.steps.filter((step: any) => step.imageUrl || (step.images && step.images.length > 0)).length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className='text-xs text-gray-400'>画像なし</span>
                    )}
                  </div>
                </td>
                <td className='border border-gray-300 p-3'>
                  <div className='flex justify-center gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onSelectFlow(flow)}
                      title='編集'
                      className='h-7 px-2 text-xs'
                    >
                      <Edit className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onPreviewFlow(flow)}
                      title='プレビュー'
                      className='h-7 px-2 text-xs'
                    >
                      <Eye className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => onDeleteFlow(flow.id, flow.filePath)}
                      title='削除'
                      className='h-7 px-2 text-xs'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div >
  );
};

const EmergencyGuideEdit: React.FC = () => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editorTab, setEditorTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('list'); // 'list' or 'editor'
  const [previewFlow, setPreviewFlow] = useState<FlowData | null>(null);

  const fetchFlowList = useCallback(
    async (force = false) => {
      try {
        setIsLoading(true);
        console.log('🔄 フロー一覧取得開始');

        // キャッシュ無効化のためにタイムスタンプを追加
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const cacheBuster = `?ts=${timestamp}&r=${randomId}`;

        // 統一API設定を使用 - flows APIを使用（確実に動作するエンドポイント）
        const { buildApiUrl } = await import('../../lib/api');
        const apiUrl = buildApiUrl(`/emergency-flow/list${cacheBuster}`);

        console.log('🌐 フロー一覧API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        console.log('📡 レスポンス状態', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌API エラー:', errorText);
          throw new Error(
            `HTTP ${response.status}: フロー一覧の取得に失敗しました - ${errorText}`
          );
        }

        const data = await response.json();
        console.log('📊 取得したデータ:', data);

        // APIレスポンスの構造に合わせてデータをデコーディング
        const flows =
          data.success && data.flows
            ? data.flows
            : data.success && data.data
              ? data.data
              : Array.isArray(data)
                ? data
                : [];
        console.log('🔄 処理対象フロー数:', flows.length);

        const mappedFlows = flows.map((flow: any) => ({
          id: flow.id || flow.fileName?.replace('.json', '') || '',
          title: flow.title || flow.fileName?.replace('.json', '') || 'タイトルなし',
          description: flow.description || '',
          triggerKeywords: flow.triggerKeywords || flow.trigger || [],
          steps: flow.steps || [],
          updatedAt:
            flow.createdAt ||
            flow.updatedAt ||
            flow.savedAt ||
            new Date().toISOString(),
          filePath:
            flow.filePath ||
            `knowledge-base/troubleshooting/${flow.fileName || flow.id + '.json'}`,
          fileName: flow.fileName || flow.id + '.json',
        }));

        console.log('✅マッピング完了', mappedFlows.length + '件');
        console.log('🔍 マッピングされたフロー詳細:', mappedFlows);
        setFlowList(mappedFlows);
      } catch (error) {
        console.error('❌フロー取得エラー:', error);
        toast({
          title: 'エラー',
          description:
            error instanceof Error
              ? error.message
              : 'フロー一覧の取得に失敗しました',
          variant: 'destructive',
        });
        setFlowList([]); // エラー時は空配列を設定
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchFlowList();

    const handleForceRefresh = (event: Event) => {
      console.log('🔄 強制更新イベントを受信:', (event as CustomEvent).detail);
      fetchFlowList(true);
    };

    const refreshList = () => fetchFlowList(true);

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);
    window.addEventListener('fileSystemUpdated', refreshList);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
      window.removeEventListener('fileSystemUpdated', refreshList);
    };
  }, [fetchFlowList]);

  const handleFlowSelect = async (flow: FlowData) => {
    console.log('🎯 フロー選択開始', {
      flowId: flow.id,
      flowTitle: flow.title,
      flowKeys: Object.keys(flow),
      hasSteps: !!flow.steps,
      stepsLength: flow.steps?.length || 0,
    });

    try {
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);

      console.log('📡 フロー詳細データを取得中:', flow.id);
      console.log('📋 選択されたフロー:', flow);

      // フローの詳細データを取得 - /detail/:id エンドポイントを使用
      const timestamp = Date.now();
      const { buildApiUrl } = await import('../../lib/api');
      const apiUrl = buildApiUrl(`/emergency-flow/detail/${flow.id}?_t=${timestamp}`);
      console.log('🌐 API呼び出し', apiUrl);

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(
        '📡 APIレスポンス状態',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌API エラー:', errorText);
        throw new Error(
          `フロー詳細の取得に失敗しました: ${response.status} - ${errorText}`
        );
      }

      const flowDetail = await response.json();
      console.log('📊 生APIレスポンス:', flowDetail);
      console.log('✅フロー詳細データ取得完了', flowDetail);

      // APIレスポンスの構造を詳しく確認
      console.log('🔍 APIレスポンス構造:', {
        hasSuccess: 'success' in flowDetail,
        hasData: 'data' in flowDetail,
        hasSteps: 'steps' in flowDetail,
        stepsType: typeof flowDetail.steps,
        stepsIsArray: Array.isArray(flowDetail.steps),
        stepsLength: flowDetail.steps?.length || 0,
        allKeys: Object.keys(flowDetail),
      });

      // APIレスポンスの構造に応じてデータを取得
      const actualFlowData =
        flowDetail.success && flowDetail.data ? flowDetail.data : flowDetail;
      console.log('🔍 実際のフローデータ:', actualFlowData);

      // 詳細データと一覧データをマージ
      const completeFlowData = {
        ...flow,
        ...actualFlowData,
        steps: actualFlowData.steps || flow.steps || [],
      };

      console.log('🔧 マージ後のデータ:', completeFlowData);
      console.log('✅フロー選択完了', {
        flowId: completeFlowData.id,
        stepsLength: completeFlowData.steps?.length || 0,
        title: completeFlowData.title,
        hasSteps: !!completeFlowData.steps,
        stepsType: typeof completeFlowData.steps,
        stepsIsArray: Array.isArray(completeFlowData.steps),
        stepsContent: completeFlowData.steps,
      });

      setSelectedFlow(completeFlowData);
      setEditorTab('metadata');
      setPreviewFlow(null);

      console.log('🔄 状態更新完了', {
        selectedFlow: completeFlowData,
        editorTab: 'metadata',
        previewFlow: null,
      });
    } catch (error) {
      console.error('❌フロー詳細取得エラー:', error);
      toast({
        title: 'エラー',
        description: `フロー詳細の取得に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
      // エラー時は一覧データを使用
      console.log('🔄 エラー時のフォールバック処理');
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);
    }
  };

  const handlePreviewFlow = async (flow: FlowData) => {
    try {
      console.log('🔄 プレビュー用フロー詳細データを取得中:', flow.id);

      // フローの詳細データを取得 - emergency-flow APIを使用
      const timestamp = Date.now();
      const { buildApiUrl } = await import('../../lib/api');
      const apiUrl = buildApiUrl(`/emergency-flow/detail/${flow.id}?_t=${timestamp}`);

      console.log('🌐 プレビュー用フロー詳細API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          'X-Force-Fresh': 'true',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`フロー詳細の取得に失敗しました: ${response.status}`);
      }

      const flowDetail = await response.json();
      console.log('✅プレビュー用フロー詳細データ取得完了', flowDetail);

      // 詳細データと一覧データをマージ
      const completeFlowData = {
        ...flow,
        ...flowDetail,
        steps: flowDetail.steps || flow.steps || [],
      };

      setPreviewFlow(completeFlowData);
      setSelectedFlow(null);
    } catch (error) {
      console.error('❌プレビュー用フロー詳細取得エラー:', error);
      toast({
        title: 'エラー',
        description: `フロー詳細の取得に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
      // エラー時は一覧データを使用
      setPreviewFlow(flow);
      setSelectedFlow(null);
    }
  };

  const handleDisplayFlow = (flow: FlowData) => {
    // カスタムイベントでガイド表示を通知
    window.dispatchEvent(
      new CustomEvent('display-emergency-guide', {
        detail: { guideId: flow.id },
      })
    );
  };

  const handleSaveFlow = async (updatedFlowData: any) => {
    try {
      console.log('💾 保存リクエストを送信:', {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length,
        filePath: updatedFlowData.filePath,
      });

      const { buildApiUrl } = await import('../../lib/api');
      const response = await fetch(
        buildApiUrl(`/emergency-flow/${updatedFlowData.id}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFlowData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      const result = await response.json();
      console.log('✅保存�劁', result);
      toast({
        title: '成功',
        description: 'フローが正常に保存されました。',
      });

      // 保存後、リストを強制的に再読み込みして最新の状態を反映
      await fetchFlowList(true);

      // 更新されたフローデータを特定して再選択
      setSelectedFlow(prev => updatedFlowData);
    } catch (error) {
      console.error('❌フローの保存に失敗しました:', error);
      toast({
        title: 'エラー',
        description: `フローの保存に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFlow = async (flowId: string, filePath: string) => {
    try {
      console.log('🗑️ フロー削除リクエストを送信:', {
        id: flowId,
        filePath: filePath,
      });

      const { buildApiUrl } = await import('../../lib/api');
      const response = await fetch(
        buildApiUrl(`/emergency-flow/${flowId}`),
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      const result = await response.json();
      console.log('✅削除成功:', result);
      toast({
        title: '成功',
        description: 'フローが正常に削除されました。',
      });

      // 削除後、リストを強制的に再読み込みして最新の状態を反映
      await fetchFlowList(true);

      // 削除されたフローデータを特定して再選択
      setSelectedFlow(null);
    } catch (error) {
      console.error('❌フローの削除に失敗しました:', error);
      toast({
        title: 'エラー',
        description: `フローの削除に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleBackToList = () => {
    setSelectedFlow(null);
    setPreviewFlow(null);
  };

  const handleForceRefresh = async () => {
    try {
      console.log('🔄 強制リフレッシュ開始');

      // ブラウザキャッシュをクリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャッシュクリア完了');
      }

      // フロー一覧を再取得
      await fetchFlowList(true);

      toast({
        title: '成功',
        description: 'キャッシュをクリアしてフロー一覧を再読み込みしました',
      });
    } catch (error) {
      console.error('❌強制リフレッシュエラー:', error);
      toast({
        title: 'エラー',
        description: 'リフレッシュに失敗しました',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  return (
    <div className='flex-1 flex flex-col min-h-0'>
      {selectedFlow ? (
        <Card className='h-full flex flex-col'>
          <CardHeader>
            <div className='flex justify-between items-center'>
              <CardTitle>{selectedFlow.title}</CardTitle>
              <Button variant='ghost' onClick={handleBackToList}>
                <X className='h-4 w-4 mr-2' />
                一覧に戻る
              </Button>
            </div>
          </CardHeader>
          <CardContent className='flex-1 flex flex-col min-h-0'>
            <Tabs
              value={editorTab || 'metadata'}
              onValueChange={value => {
                console.log('🔄 タブ切り替え', { from: editorTab, to: value });
                setEditorTab(value);
              }}
              className='w-full h-full flex flex-col'
            >
              <TabsList className='w-full grid grid-cols-2 mb-4'>
                <TabsTrigger value='metadata'>メタデータ</TabsTrigger>
                <TabsTrigger value='slides'>スライド内容</TabsTrigger>
              </TabsList>
              <TabsContent
                value='metadata'
                className='flex-1 flex flex-col min-h-0'
              >
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab='metadata'
                  selectedFilePath={selectedFlow?.filePath}
                />
              </TabsContent>
              <TabsContent
                value='slides'
                className='flex-1 flex flex-col min-h-0'
              >
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab='slides'
                  selectedFilePath={selectedFlow?.filePath}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : previewFlow ? (
        <EmergencyGuideDisplay
          guideId={previewFlow.id}
          onExit={handleBackToList}
          isPreview={true}
          onSendToChat={() => { }}
        />
      ) : (
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <h2 className='text-lg font-semibold'>フロー一覧</h2>
            <Button
              variant='outline'
              onClick={handleForceRefresh}
              className='text-sm'
            >
              🔄 強制リフレッシュ
            </Button>
          </div>
          <FlowList
            flows={flowList}
            onSelectFlow={handleFlowSelect}
            onDeleteFlow={handleDeleteFlow}
            onPreviewFlow={handlePreviewFlow}
            isLoading={isLoading}
          />
          {/* デバッグ情報 */}
          <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
            <h4>デバッグ情報:</h4>
            <p>flowList.length: {flowList.length}</p>
            <p>isLoading: {isLoading.toString()}</p>
            <p>selectedFlow: {selectedFlow ? selectedFlow.id : 'null'}</p>
            <p>previewFlow: {previewFlow ? previewFlow.id : 'null'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyGuideEdit;
