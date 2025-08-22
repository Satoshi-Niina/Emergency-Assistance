import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast.ts";
import { FileText, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import EmergencyFlowEditor from './emergency-flow-editor';
import EmergencyGuideDisplay from './emergency-guide-display';

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
      return '日付不�E';
    }
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '日付不�E';
  }
}

// 差刁E��計算するユーチE��リチE��関数
function getObjectDiff(original: any, fixed: any, path = ''): string[] {
  const diffs: string[] = [];
  for (const key of new Set([...Object.keys(original || {}), ...Object.keys(fixed || {})])) {
    const origVal = original ? original[key] : undefined;
    const fixVal = fixed ? fixed[key] : undefined;
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof origVal === 'object' && typeof fixVal === 'object' && origVal && fixVal && !Array.isArray(origVal) && !Array.isArray(fixVal)) {
      diffs.push(...getObjectDiff(origVal, fixVal, currentPath));
    } else if (Array.isArray(origVal) && Array.isArray(fixVal)) {
      if (origVal.length !== fixVal.length) {
        diffs.push(`${currentPath}: 配�Eの長さが ${origVal.length} ↁE${fixVal.length} に修正`);
      }
      // 配�Eの吁E��素も比輁E��最大5件まで�E�E
      for (let i = 0; i < Math.min(origVal.length, fixVal.length, 5); i++) {
        diffs.push(...getObjectDiff(origVal[i], fixVal[i], `${currentPath}[${i}]`));
      }
    } else if (origVal !== fixVal) {
      diffs.push(`${currentPath}: 、E{origVal ?? '未設宁E}」�E、E{fixVal ?? '未設宁E}」`);
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

const FlowList: React.FC<FlowListProps> = ({ flows, onSelectFlow, onDeleteFlow, onPreviewFlow, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">フロー一覧を読み込み中...</p>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">フローがありません</h3>
          <p className="text-gray-600 mb-4">
            まだフローが作�EされてぁE��せん。新規フロー生�Eタブでフローを作�Eしてください、E
          </p>
          <div className="flex justify-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => window.dispatchEvent(new CustomEvent('switchToGenerator'))}
            >
              新規フロー生�Eへ
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              再読み込み
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">タイトル</th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">説昁E/th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">スチE��プ数</th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">更新日晁E/th>
              <th className="border border-gray-300 p-3 text-center text-sm font-medium">操佁E/th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow) => (
              <tr key={flow.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3">
                  <div className="break-words leading-tight text-sm font-semibold cursor-pointer hover:text-blue-600" 
                       onClick={() => onSelectFlow(flow)}>
                    {flow.title}
                  </div>
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="break-words leading-tight text-sm text-gray-600">
                    {flow.description || '説明なぁE}
                  </div>
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  <span className="text-sm">{flow.steps?.length || 0}</span>
                </td>
                <td className="border border-gray-300 p-3">
                  <span className="text-xs text-gray-500">{formatDate(flow.updatedAt)}</span>
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectFlow(flow)}
                      title="編雁E
                      className="h-7 px-2 text-xs"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewFlow(flow)}
                      title="プレビュー"
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteFlow(flow.id, flow.filePath)}
                      title="削除"
                      className="h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmergencyGuideEdit: React.FC = () => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editorTab, setEditorTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("list"); // 'list' or 'editor'
  const [previewFlow, setPreviewFlow] = useState<FlowData | null>(null);

  const fetchFlowList = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      console.log('🔄 フロー一覧取得開姁E);
      
      // キャチE��ュ無効化�Eためにタイムスタンプを追加
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const cacheBuster = `?ts=${timestamp}&r=${randomId}`;
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log('📡 レスポンス状慁E', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁EAPI エラー:', errorText);
        throw new Error(`HTTP ${response.status}: フロー一覧の取得に失敗しました - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📊 取得したデータ:', data);
      
      // APIレスポンスの構造に合わせてチE�Eタを�EチE��ング
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log('🔄 処琁E��象フロー数:', flows.length);
      
      const mappedFlows = flows.map((flow: any) => ({
        id: flow.id || flow.fileName?.replace('.json', '') || '',
        title: flow.title || 'タイトルなぁE,
        description: flow.description || '',
        triggerKeywords: flow.triggerKeywords || flow.trigger || [],
        steps: flow.steps || [],
        updatedAt: flow.createdAt || flow.updatedAt || flow.savedAt || new Date().toISOString(),
        filePath: flow.filePath || `knowledge-base/troubleshooting/${flow.fileName || flow.id + '.json'}`,
        fileName: flow.fileName || flow.id + '.json'
      }));
      
      console.log('✁Eマッピング完亁E', mappedFlows.length + '件');
      setFlowList(mappedFlows);
    } catch (error) {
      console.error('❁Eフロー取得エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "フロー一覧の取得に失敗しました",
        variant: "destructive",
      });
      setFlowList([]); // エラー時�E空配�Eを設宁E
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
    console.log('🎯 フロー選択開姁E', {
      flowId: flow.id,
      flowTitle: flow.title,
      flowKeys: Object.keys(flow),
      hasSteps: !!flow.steps,
      stepsLength: flow.steps?.length || 0
    });
    
    try {
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);
      
      console.log('📡 フロー詳細チE�Eタを取得中:', flow.id);
      console.log('📋 選択されたフロー:', flow);
      
      // フローの詳細チE�Eタを取征E
      const timestamp = Date.now();
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flow.id}?_t=${timestamp}`;
      console.log('🌐 API呼び出ぁE', apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('📡 APIレスポンス状慁E', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁EAPI エラー:', errorText);
        throw new Error(`フロー詳細の取得に失敗しました: ${response.status} - ${errorText}`);
      }
      
      const flowDetail = await response.json();
      console.log('📊 生APIレスポンス:', flowDetail);
      console.log('✁Eフロー詳細チE�Eタ取得完亁E', flowDetail);
      
      // APIレスポンスの構造を詳しく確誁E
      console.log('🔍 APIレスポンス構造:', {
        hasSuccess: 'success' in flowDetail,
        hasData: 'data' in flowDetail,
        hasSteps: 'steps' in flowDetail,
        stepsType: typeof flowDetail.steps,
        stepsIsArray: Array.isArray(flowDetail.steps),
        stepsLength: flowDetail.steps?.length || 0,
        allKeys: Object.keys(flowDetail)
      });
      
      // APIレスポンスの構造に応じてチE�Eタを取征E
      const actualFlowData = flowDetail.success && flowDetail.data ? flowDetail.data : flowDetail;
      console.log('🔍 実際のフローチE�Eタ:', actualFlowData);
      
      // 詳細チE�Eタと一覧チE�Eタを�Eージ
      const completeFlowData = {
        ...flow,
        ...actualFlowData,
        steps: actualFlowData.steps || flow.steps || []
      };
      
      console.log('🔧 マ�Eジ後�EチE�Eタ:', completeFlowData);
      console.log('✁Eフロー選択完亁E', { 
        flowId: completeFlowData.id, 
        stepsLength: completeFlowData.steps?.length || 0,
        title: completeFlowData.title,
        hasSteps: !!completeFlowData.steps,
        stepsType: typeof completeFlowData.steps,
        stepsIsArray: Array.isArray(completeFlowData.steps),
        stepsContent: completeFlowData.steps
      });
      
      setSelectedFlow(completeFlowData);
      setEditorTab('metadata');
      setPreviewFlow(null);
      
      console.log('🔄 状態更新完亁E', {
        selectedFlow: completeFlowData,
        editorTab: 'metadata',
        previewFlow: null
      });
    } catch (error) {
      console.error('❁Eフロー詳細取得エラー:', error);
      toast({
        title: "エラー",
        description: `フロー詳細の取得に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
      // エラー時�E一覧チE�Eタを使用
      console.log('🔄 エラー時�Eフォールバック処琁E);
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);
    }
  };

  const handlePreviewFlow = async (flow: FlowData) => {
    try {
      console.log('🔄 プレビュー用フロー詳細チE�Eタを取得中:', flow.id);
      
      // フローの詳細チE�Eタを取征E
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flow.id}?_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Fresh': 'true',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`フロー詳細の取得に失敗しました: ${response.status}`);
      }
      
      const flowDetail = await response.json();
      console.log('✁Eプレビュー用フロー詳細チE�Eタ取得完亁E', flowDetail);
      
      // 詳細チE�Eタと一覧チE�Eタを�Eージ
      const completeFlowData = {
        ...flow,
        ...flowDetail,
        steps: flowDetail.steps || flow.steps || []
      };
      
      setPreviewFlow(completeFlowData);
      setSelectedFlow(null);
    } catch (error) {
      console.error('❁Eプレビュー用フロー詳細取得エラー:', error);
      toast({
        title: "エラー",
        description: `フロー詳細の取得に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
      // エラー時�E一覧チE�Eタを使用
      setPreviewFlow(flow);
      setSelectedFlow(null);
    }
  };

  const handleDisplayFlow = (flow: FlowData) => {
    // カスタムイベントでガイド表示を通知
    window.dispatchEvent(new CustomEvent('display-emergency-guide', {
      detail: { guideId: flow.id }
    }));
  };

  const handleSaveFlow = async (updatedFlowData: any) => {
    try {
      console.log("💾 保存リクエストを送信:", {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length,
        filePath: updatedFlowData.filePath
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${updatedFlowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFlowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      const result = await response.json();
      console.log("✁E保存�E劁E", result);
      toast({
        title: "成功",
        description: "フローが正常に保存されました、E,
      });
      
      // 保存後、リストを強制皁E��再読み込みして最新の状態を反映
      await fetchFlowList(true);
      
      // 更新されたフローチE�Eタを特定して再選抁E
      setSelectedFlow(prev => updatedFlowData);

    } catch (error) {
      console.error("❁Eフローの保存に失敗しました:", error);
      toast({
        title: "エラー",
        description: `フローの保存に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFlow = async (flowId: string, filePath: string) => {
    try {
      console.log("🗑�E�Eフロー削除リクエストを送信:", {
        id: flowId,
        filePath: filePath
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flowId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      const result = await response.json();
      console.log("✁E削除成功:", result);
      toast({
        title: "成功",
        description: "フローが正常に削除されました、E,
      });
      
      // 削除後、リストを強制皁E��再読み込みして最新の状態を反映
      await fetchFlowList(true);
      
      // 削除されたフローチE�Eタを特定して再選抁E
      setSelectedFlow(null);

    } catch (error) {
      console.error('❁Eフローの削除に失敗しました:', error);
      toast({
        title: "エラー",
        description: `フローの削除に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleBackToList = () => {
    setSelectedFlow(null);
    setPreviewFlow(null);
  };

  const handleForceRefresh = async () => {
    try {
      console.log('🔄 強制リフレチE��ュ開姁E);
      
      // ブラウザキャチE��ュをクリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャチE��ュクリア完亁E);
      }
      
      // フロー一覧を�E取征E
      await fetchFlowList(true);
      
      toast({
        title: "成功",
        description: "キャチE��ュをクリアしてフロー一覧を�E読み込みしました",
      });
    } catch (error) {
      console.error('❁E強制リフレチE��ュエラー:', error);
      toast({
        title: "エラー",
        description: "リフレチE��ュに失敗しました",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {selectedFlow ? (
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{selectedFlow.title}</CardTitle>
              <Button variant="ghost" onClick={handleBackToList}>
                <X className="h-4 w-4 mr-2" />
                一覧に戻めE
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <Tabs value={editorTab || 'metadata'} onValueChange={(value) => {
              console.log('🔄 タブ�Eり替ぁE', { from: editorTab, to: value });
              setEditorTab(value);
            }} className="w-full h-full flex flex-col">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="metadata">メタチE�Eタ</TabsTrigger>
                <TabsTrigger value="slides">スライド�E容</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata" className="flex-1 flex flex-col min-h-0">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab="metadata"
                  selectedFilePath={selectedFlow?.filePath}
                />
              </TabsContent>
              <TabsContent value="slides" className="flex-1 flex flex-col min-h-0">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab="slides"
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
          onSendToChat={() => {}}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">フロー一覧</h2>
            <Button
              variant="outline"
              onClick={handleForceRefresh}
              className="text-sm"
            >
              🔄 強制リフレチE��ュ
            </Button>
          </div>
          <FlowList
            flows={flowList}
            onSelectFlow={handleFlowSelect}
            onDeleteFlow={handleDeleteFlow}
            onPreviewFlow={handlePreviewFlow}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default EmergencyGuideEdit;
