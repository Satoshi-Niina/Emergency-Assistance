
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Edit, Plus, RefreshCw } from 'lucide-react';
import EmergencyFlowEditor from './emergency-flow-editor';

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: any[];
  updatedAt?: string;
}

const EmergencyGuideEdit: React.FC = () => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // フロー一覧を取得
  const fetchFlowList = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/emergency-flow/list');
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
  };

  useEffect(() => {
    fetchFlowList();
  }, []);

  // フロー選択時の詳細データ取得
  const handleFlowSelect = async (flowItem: any) => {
    try {
      console.log('🔄 フロー選択:', flowItem);
      
      const response = await fetch(`/api/emergency-flow/detail/${flowItem.id}`);
      if (!response.ok) throw new Error('フロー詳細の取得に失敗しました');
      
      const result = await response.json();
      const flowData = result.data || result;
      
      console.log('✅ 取得したフローデータ:', flowData);
      
      setSelectedFlow(flowData);
      setSelectedFilePath(flowItem.filePath || `knowledge-base/troubleshooting/${flowItem.id}.json`);
      
      console.log('📝 エディターに設定完了:', {
        selectedFlow: !!flowData,
        filePath: flowItem.filePath || `knowledge-base/troubleshooting/${flowItem.id}.json`
      });
    } catch (error) {
      console.error('フロー詳細取得エラー:', error);
      toast({
        title: "エラー",
        description: "フロー詳細の取得に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 新規フロー作成
  const handleCreateNew = () => {
    setSelectedFlow(null);
    setSelectedFilePath(null);
  };

  // 保存完了時の処理
  const handleSaveComplete = (savedData: FlowData) => {
    setSelectedFlow(savedData);
    fetchFlowList(); // リスト更新
    toast({
      title: "保存完了",
      description: `フロー「${savedData.title}」が保存されました`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-800">応急処置フロー編集</h2>
        <div className="flex gap-2">
          <Button onClick={fetchFlowList} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            更新
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-1" />
            新規作成
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：フロー一覧 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                フロー一覧 ({flowList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flowList.map((flow) => (
                  <div
                    key={flow.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedFlow?.id === flow.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleFlowSelect(flow)}
                  >
                    <div className="font-medium text-sm text-gray-800">
                      {flow.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {flow.id}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      スライド数: {flow.slideCount || 0}
                    </div>
                  </div>
                ))}
                {flowList.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">フローが見つかりません</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右側：エディター */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                {selectedFlow ? `編集: ${selectedFlow.title}` : '新規フロー作成'}
              </CardTitle>
              {selectedFlow && (
                <div className="text-sm text-gray-600">
                  ID: {selectedFlow.id} | ステップ数: {selectedFlow.steps?.length || 0}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {/* デバッグ情報 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>エディター状態:</strong>
                  <br />
                  選択フロー: {selectedFlow ? '✅ 設定済み' : '❌ 未選択'}
                  <br />
                  ファイルパス: {selectedFilePath || '未設定'}
                  <br />
                  ステップ数: {selectedFlow?.steps?.length || 0}
                </div>
              </div>
              
              <EmergencyFlowEditor
                key={selectedFlow?.id || 'new-flow'}
                flowData={selectedFlow}
                onSave={handleSaveComplete}
                selectedFilePath={selectedFilePath}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmergencyGuideEdit;
