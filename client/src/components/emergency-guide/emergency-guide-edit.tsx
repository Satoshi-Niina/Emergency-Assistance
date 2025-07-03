import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// 差分を計算するユーティリティ関数
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
        diffs.push(`${currentPath}: 配列の長さが ${origVal.length} → ${fixVal.length} に修正`);
      }
      // 配列の各要素も比較（最大5件まで）
      for (let i = 0; i < Math.min(origVal.length, fixVal.length, 5); i++) {
        diffs.push(...getObjectDiff(origVal[i], fixVal[i], `${currentPath}[${i}]`));
      }
    } else if (origVal !== fixVal) {
      diffs.push(`${currentPath}: 「${origVal ?? '未設定'}」→「${fixVal ?? '未設定'}」`);
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
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold">フローが見つかりません</h3>
        <p className="text-sm">アップロードタブから新しいフローを追加してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flows.map((flow) => (
        <Card key={flow.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex justify-between items-center">
            <div className="flex-grow cursor-pointer" onClick={() => onSelectFlow(flow)}>
              <p className="font-semibold">{flow.title}</p>
              <p className="text-sm text-gray-500">
                ステップ数: {flow.steps?.length || 0}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => onSelectFlow(flow)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onPreviewFlow(flow)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={() => onDeleteFlow(flow.id, flow.fileName)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list`);
      if (!response.ok) throw new Error('フロー一覧の取得に失敗しました');
      
      const data = await response.json();
      setFlowList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('フロー取得エラー:', error);
      toast({
        title: "エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive",
      });
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

  const handleFlowSelect = (flow: FlowData) => {
    setSelectedFlow(flow);
    setEditorTab('metadata');
    setPreviewFlow(null);
  };

  const handlePreviewFlow = (flow: FlowData) => {
    setPreviewFlow(flow);
    setSelectedFlow(null);
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

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/save-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFlowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      const result = await response.json();
      console.log("✅ 保存成功:", result);
      toast({
        title: "成功",
        description: "フローが正常に保存されました。",
      });
      
      // 保存後、リストを強制的に再読み込みして最新の状態を反映
      await fetchFlowList(true);
      
      // 更新されたフローデータを特定して再選択
      setSelectedFlow(prev => updatedFlowData);

    } catch (error) {
      console.error("❌ フローの保存に失敗しました:", error);
      toast({
        title: "エラー",
        description: `フローの保存に失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFlow = async (flowId: string, filePath: string) => {
    try {
      console.log("🗑️ フロー削除リクエストを送信:", {
        id: flowId,
        filePath: filePath
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/delete-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: flowId, filePath: filePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      const result = await response.json();
      console.log("✅ 削除成功:", result);
      toast({
        title: "成功",
        description: "フローが正常に削除されました。",
      });
      
      // 削除後、リストを強制的に再読み込みして最新の状態を反映
      await fetchFlowList(true);
      
      // 削除されたフローデータを特定して再選択
      setSelectedFlow(null);

    } catch (error) {
      console.error('❌ フローの削除に失敗しました:', error);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col">
      {selectedFlow ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{selectedFlow.title}</CardTitle>
              <Button variant="ghost" onClick={handleBackToList}>
                <X className="h-4 w-4 mr-2" />
                一覧に戻る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={editorTab || 'metadata'} onValueChange={setEditorTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="metadata">メタデータ</TabsTrigger>
                <TabsTrigger value="slides">スライド内容</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onBack={handleBackToList}
                  currentTab="metadata"
                />
              </TabsContent>
              <TabsContent value="slides">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onBack={handleBackToList}
                  currentTab="slides"
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
        />
      ) : (
        <FlowList
          flows={flowList}
          onSelectFlow={handleFlowSelect}
          onDeleteFlow={handleDeleteFlow}
          onPreviewFlow={handlePreviewFlow}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default EmergencyGuideEdit;
