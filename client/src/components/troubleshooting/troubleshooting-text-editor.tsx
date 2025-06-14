import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, X, FileEdit, Edit2, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TroubleshootingTextEditorProps {
  flowId: string;
  onSave: () => void;
  onCancel: () => void;
}

const TroubleshootingTextEditor: React.FC<TroubleshootingTextEditorProps> = ({
  flowId,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flowData, setFlowData] = useState<any>(null);
  const [editedContent, setEditedContent] = useState('');
  const [originalData, setOriginalData] = useState<any>(null);
  const [currentEditingStep, setCurrentEditingStep] = useState<number>(0);
  const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');

  useEffect(() => {
    // フローデータの読み込み
    const loadFlowData = async () => {
      try {
        // メインのフローファイルを読み込む
        const response = await fetch(`/api/tech-support/flows/${flowId}`);
        if (!response.ok) throw new Error('フローデータの読み込みに失敗しました');
        
        const data = await response.json();

        // データを統合
        const consolidatedData = {
          ...data,
          metadata: {
            createdAt: data.metadata?.createdAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            filePath: data.metadata?.filePath || `flow_${flowId}.json`,
            fileName: data.metadata?.fileName || `flow_${flowId}.json`,
            nodeCount: data.nodes?.length || 0,
            edgeCount: data.edges?.length || 0
          }
        };

        setFlowData(consolidatedData);
        setOriginalData(JSON.parse(JSON.stringify(consolidatedData))); // 元データの深いコピーを保存
        setEditedContent(JSON.stringify(consolidatedData, null, 2));
        setLoading(false);
      } catch (error) {
        console.error('フローデータ読み込みエラー:', error);
        toast({
          title: "エラー",
          description: "フローデータの読み込みに失敗しました",
          variant: "destructive",
        });
      }
    };

    if (flowId) {
      loadFlowData();
    } else {
      // 新規作成の場合は空のテンプレートを設定
      const template = {
        id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        title: "新規フロー",
        description: "",
        type: "応急処置",
        content: "",
        steps: [],
        metadata: {
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          filePath: "",
          fileName: "",
          nodeCount: 0,
          edgeCount: 0
        }
      };
      setFlowData(template);
      setOriginalData(JSON.parse(JSON.stringify(template))); // 元データの深いコピーを保存
      setEditedContent(JSON.stringify(template, null, 2));
      setLoading(false);
    }
  }, [flowId]);

  // スライド編集関数
  const handleStepTitleChange = (stepIndex: number, newTitle: string) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex]) {
      updatedFlowData.steps[stepIndex].title = newTitle;
      setFlowData(updatedFlowData);
      // JSONテキストも同期更新
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));
    }
  };

  const handleStepDescriptionChange = (stepIndex: number, newDescription: string) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex]) {
      updatedFlowData.steps[stepIndex].description = newDescription;
      updatedFlowData.steps[stepIndex].message = newDescription; // messageも同期
      setFlowData(updatedFlowData);
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));
    }
  };

  const handleAddStep = () => {
    const updatedFlowData = { ...flowData };
    const newStepId = `step${(updatedFlowData.steps?.length || 0) + 1}`;
    const newStep = {
      id: newStepId,
      title: '新しいスライド',
      description: '',
      message: '',
      imageUrl: '',
      type: 'step',
      options: []
    };
    
    if (!updatedFlowData.steps) {
      updatedFlowData.steps = [];
    }
    
    updatedFlowData.steps.push(newStep);
    setFlowData(updatedFlowData);
    setEditedContent(JSON.stringify(updatedFlowData, null, 2));
    setCurrentEditingStep(updatedFlowData.steps.length - 1);
  };

  const handleDeleteStep = (stepIndex: number) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps.length > 1) {
      updatedFlowData.steps.splice(stepIndex, 1);
      setFlowData(updatedFlowData);
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));
      
      // 削除後のステップインデックス調整
      if (currentEditingStep >= updatedFlowData.steps.length) {
        setCurrentEditingStep(Math.max(0, updatedFlowData.steps.length - 1));
      }
    }
  };

  // データ比較関数
  const hasChanges = () => {
    if (!originalData || !flowData) return false;
    return JSON.stringify(originalData) !== JSON.stringify(flowData);
  };

  // JSONとビジュアル編集の同期
  const syncFromJson = () => {
    try {
      const parsedData = JSON.parse(editedContent);
      setFlowData(parsedData);
      toast({
        title: "同期完了",
        description: "JSONデータからビジュアルデータに同期しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "JSONの形式が正しくありません",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 現在のモードに応じてデータを準備
      let dataToSave;
      if (editMode === 'json') {
        // JSONモードの場合、JSONテキストから解析
        try {
          dataToSave = JSON.parse(editedContent);
        } catch (error) {
          toast({
            title: "エラー",
            description: "JSONの形式が正しくありません",
            variant: "destructive",
          });
          return;
        }
      } else {
        // ビジュアルモードの場合、flowDataを使用
        dataToSave = flowData;
      }

      // 保存前にメタデータを更新
      dataToSave.updatedAt = new Date().toISOString();

      console.log('保存するデータ:', dataToSave);

      // トラブルシューティングAPIエンドポイントを使用
      const saveEndpoint = flowId 
        ? `/api/troubleshooting/${flowId}` 
        : '/api/troubleshooting';

      const response = await fetch(saveEndpoint, {
        method: flowId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'データの保存に失敗しました');
      }

      // 保存成功後、元データを更新
      setOriginalData(JSON.parse(JSON.stringify(dataToSave)));

      toast({
        title: "保存完了",
        description: "フローデータを保存しました",
      });

      onSave();
    } catch (error) {
      console.error('保存エラー:', error);
      toast({
        title: "エラー",
        description: "データの保存に失敗しました: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">フローデータ編集</CardTitle>
            <CardDescription>
              ビジュアル編集とJSONテキスト編集の両方に対応しています
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges() && (
              <span className="text-orange-600 text-sm font-medium">
                変更あり
              </span>
            )}
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              キャンセル
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={editMode} onValueChange={(value) => setEditMode(value as 'visual' | 'json')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual">ビジュアル編集</TabsTrigger>
              <TabsTrigger value="json">JSON編集</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2 text-green-700">
                  <Edit2 className="h-4 w-4 inline-block mr-1" />
                  ビジュアル編集モード
                </h3>
                <p className="text-sm text-green-700">
                  スライドのタイトルや内容を直接編集できます。各スライドの詳細を個別に編集可能です。
                </p>
              </div>

              {/* 基本情報の編集 */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="flow-title">フローのタイトル</Label>
                  <Input
                    id="flow-title"
                    value={flowData?.title || ''}
                    onChange={(e) => {
                      const updated = { ...flowData, title: e.target.value };
                      setFlowData(updated);
                      setEditedContent(JSON.stringify(updated, null, 2));
                    }}
                    placeholder="フローのタイトルを入力"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="flow-description">フローの説明</Label>
                  <Textarea
                    id="flow-description"
                    value={flowData?.description || ''}
                    onChange={(e) => {
                      const updated = { ...flowData, description: e.target.value };
                      setFlowData(updated);
                      setEditedContent(JSON.stringify(updated, null, 2));
                    }}
                    placeholder="フローの説明を入力"
                    rows={3}
                  />
                </div>
              </div>

              {/* スライド編集セクション */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">スライド編集</Label>
                  <Button onClick={handleAddStep} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    スライド追加
                  </Button>
                </div>

                {/* スライド一覧 */}
                {flowData?.steps && flowData.steps.length > 0 && (
                  <div className="space-y-3">
                    {flowData.steps.map((step: any, index: number) => (
                      <Card key={step.id || index} className={`${index === currentEditingStep ? 'border-blue-500 bg-blue-50' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              スライド {index + 1} (ID: {step.id})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={index === currentEditingStep ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentEditingStep(index)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {flowData.steps.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStep(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {index === currentEditingStep && (
                          <CardContent className="space-y-4">
                            <div className="grid gap-2">
                              <Label htmlFor={`step-title-${index}`}>スライドタイトル</Label>
                              <Input
                                id={`step-title-${index}`}
                                value={step.title || ''}
                                onChange={(e) => handleStepTitleChange(index, e.target.value)}
                                placeholder="スライドのタイトルを入力"
                              />
                            </div>
                            
                            <div className="grid gap-2">
                              <Label htmlFor={`step-desc-${index}`}>スライド内容</Label>
                              <Textarea
                                id={`step-desc-${index}`}
                                value={step.description || step.message || ''}
                                onChange={(e) => handleStepDescriptionChange(index, e.target.value)}
                                placeholder="スライドの内容を入力"
                                rows={4}
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor={`step-image-${index}`}>画像URL</Label>
                              <Input
                                id={`step-image-${index}`}
                                value={step.imageUrl || ''}
                                onChange={(e) => {
                                  const updated = { ...flowData };
                                  updated.steps[index].imageUrl = e.target.value;
                                  setFlowData(updated);
                                  setEditedContent(JSON.stringify(updated, null, 2));
                                }}
                                placeholder="画像のURLを入力"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor={`step-type-${index}`}>スライドタイプ</Label>
                              <select
                                id={`step-type-${index}`}
                                value={step.type || 'step'}
                                onChange={(e) => {
                                  const updated = { ...flowData };
                                  updated.steps[index].type = e.target.value;
                                  setFlowData(updated);
                                  setEditedContent(JSON.stringify(updated, null, 2));
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="step">通常のステップ</option>
                                <option value="decision">条件分岐</option>
                                <option value="start">開始</option>
                                <option value="end">終了</option>
                              </select>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-700">
                    <FileEdit className="h-4 w-4 inline-block mr-1" />
                    JSON編集モード
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncFromJson}
                  >
                    ビジュアルに同期
                  </Button>
                </div>
                <p className="text-sm text-blue-700">
                  JSONフォーマットでフローデータを直接編集できます。
                  編集後は「ビジュアルに同期」ボタンでビジュアル編集にも反映されます。
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="flow-content">フローデータ (JSON)</Label>
                <Textarea
                  id="flow-content"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="font-mono text-sm"
                  rows={25}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootingTextEditor;