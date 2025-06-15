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
  const handleStepTitleChange = async (stepIndex: number, newTitle: string) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex]) {
      const step = updatedFlowData.steps[stepIndex];
      const oldTitle = step.title;
      
      // タイトルを更新
      step.title = newTitle;
      updatedFlowData.updatedAt = new Date().toISOString();
      
      setFlowData(updatedFlowData);
      // JSONテキストも同期更新
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));

      // タイトル変更の差分保存（個別保存）
      try {
        const response = await fetch(`/api/troubleshooting/update-step-title/${flowData.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            stepId: step.id,
            title: newTitle
          })
        });

        if (!response.ok) {
          throw new Error('タイトル保存に失敗しました');
        }

        console.log(`✅ ステップタイトル保存完了: ${step.id} = "${newTitle}"`);
        
        toast({
          title: "タイトル更新",
          description: `"${oldTitle}" → "${newTitle}"`,
        });
      } catch (error) {
        console.error('タイトル保存エラー:', error);
        // エラー時は元に戻す
        step.title = oldTitle;
        setFlowData({ ...updatedFlowData });
        setEditedContent(JSON.stringify(updatedFlowData, null, 2));
        
        toast({
          title: "エラー",
          description: "タイトルの保存に失敗しました",
          variant: "destructive",
        });
      }
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

  // 条件分岐ノードの選択肢操作関数（差分保存対応）
  const handleDecisionOptionChange = async (stepIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex] && updatedFlowData.steps[stepIndex].options) {
      const step = updatedFlowData.steps[stepIndex];
      const oldValue = step.options[optionIndex][field];
      
      step.options[optionIndex] = {
        ...step.options[optionIndex],
        [field]: value
      };
      updatedFlowData.updatedAt = new Date().toISOString();
      setFlowData(updatedFlowData);
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));

      // 選択肢変更の差分保存
      try {
        const response = await fetch(`/api/troubleshooting/update-step-option/${flowData.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            stepId: step.id,
            optionIndex,
            field,
            value,
            options: step.options
          })
        });

        if (!response.ok) {
          throw new Error('選択肢保存に失敗しました');
        }

        console.log(`✅ 選択肢保存完了: ${step.id}[${optionIndex}].${field} = "${value}"`);
      } catch (error) {
        console.error('選択肢保存エラー:', error);
        // エラー時は元に戻す
        step.options[optionIndex][field] = oldValue;
        setFlowData({ ...updatedFlowData });
        setEditedContent(JSON.stringify(updatedFlowData, null, 2));
        
        toast({
          title: "エラー",
          description: "選択肢の保存に失敗しました",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddDecisionOption = (stepIndex: number) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex]) {
      if (!updatedFlowData.steps[stepIndex].options) {
        updatedFlowData.steps[stepIndex].options = [];
      }
      
      updatedFlowData.steps[stepIndex].options.push({
        text: '',
        condition: '',
        nextStepId: '',
        isTerminal: false,
        conditionType: 'other'
      });
      
      updatedFlowData.updatedAt = new Date().toISOString();
      setFlowData(updatedFlowData);
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));
    }
  };

  const handleRemoveDecisionOption = (stepIndex: number, optionIndex: number) => {
    const updatedFlowData = { ...flowData };
    if (updatedFlowData.steps && updatedFlowData.steps[stepIndex] && updatedFlowData.steps[stepIndex].options) {
      updatedFlowData.steps[stepIndex].options.splice(optionIndex, 1);
      updatedFlowData.updatedAt = new Date().toISOString();
      setFlowData(updatedFlowData);
      setEditedContent(JSON.stringify(updatedFlowData, null, 2));
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
                  スライドのタイトルや内容を直接編集できます。タイトル変更は自動保存され、他の要素には影響しません。
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
                            <div className="mb-2">
                              <label className="block text-sm font-bold">タイトル:</label>
                              <Input
                                value={step.title || ''}
                                onChange={(e) => handleStepTitleChange(index, e.target.value)}
                                placeholder="スライドタイトルを入力"
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
                                  
                                  // 条件分岐ノードに切り替える際、optionsが空なら初期オプションを追加
                                  if (e.target.value === 'decision' && (!updated.steps[index].options || updated.steps[index].options.length === 0)) {
                                    updated.steps[index].options = [
                                      {
                                        text: '',
                                        condition: '',
                                        nextStepId: '',
                                        isTerminal: false,
                                        conditionType: 'other'
                                      }
                                    ];
                                  }
                                  
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

                            {/* 🔀 条件分岐ノード専用UI */}
                            {step.type === 'decision' && (
                              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-semibold text-yellow-800 flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-400 rotate-45"></div>
                                    条件分岐設定
                                  </h5>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddDecisionOption(index)}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                    disabled={(step.options || []).length >= 5}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    選択肢追加 ({(step.options || []).length}/5)
                                  </Button>
                                </div>

                                {/* 選択肢が設定されていない場合の表示 */}
                                {(!step.options || step.options.length === 0) && (
                                  <div className="text-center py-4 text-yellow-700">
                                    <p className="text-sm">条件分岐の選択肢が設定されていません。</p>
                                    <p className="text-xs mt-1">「選択肢追加」ボタンで選択肢を追加してください。</p>
                                  </div>
                                )}
                                
                                <div className="space-y-3">
                                  {(step.options || []).map((option: any, optionIndex: number) => (
                                    <div key={optionIndex} className="bg-white border border-yellow-300 rounded-md p-3 shadow-sm">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                            選択肢 {optionIndex + 1}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            ({option.conditionType || 'other'})
                                          </span>
                                        </div>
                                        {(step.options || []).length > 1 && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRemoveDecisionOption(index, optionIndex)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      
                                      <div className="grid gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-sm font-medium">表示テキスト</Label>
                                            <Input
                                              value={option.text || ''}
                                              onChange={(e) => handleDecisionOptionChange(index, optionIndex, 'text', e.target.value)}
                                              placeholder="選択肢のテキスト"
                                              className="mt-1"
                                            />
                                          </div>
                                          
                                          <div>
                                            <Label className="text-sm font-medium">条件タイプ</Label>
                                            <select
                                              value={option.conditionType || 'other'}
                                              onChange={(e) => handleDecisionOptionChange(index, optionIndex, 'conditionType', e.target.value)}
                                              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            >
                                              <option value="yes">はい (Yes)</option>
                                              <option value="no">いいえ (No)</option>
                                              <option value="other">その他 (Other)</option>
                                            </select>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <Label className="text-sm font-medium">条件・説明</Label>
                                          <Textarea
                                            value={option.condition || ''}
                                            onChange={(e) => handleDecisionOptionChange(index, optionIndex, 'condition', e.target.value)}
                                            placeholder="この選択肢が選ばれる条件や詳細説明を入力"
                                            rows={2}
                                            className="mt-1"
                                          />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-sm font-medium">次のステップID</Label>
                                            <Input
                                              value={option.nextStepId || ''}
                                              onChange={(e) => handleDecisionOptionChange(index, optionIndex, 'nextStepId', e.target.value)}
                                              placeholder="次に進むステップのID"
                                              className="mt-1"
                                            />
                                          </div>
                                          
                                          <div className="flex items-center justify-center">
                                            <div className="flex items-center space-x-2">
                                              <input
                                                type="checkbox"
                                                id={`terminal-${index}-${optionIndex}`}
                                                checked={option.isTerminal || false}
                                                onChange={(e) => handleDecisionOptionChange(index, optionIndex, 'isTerminal', e.target.checked)}
                                                className="rounded border-gray-300"
                                              />
                                              <Label htmlFor={`terminal-${index}-${optionIndex}`} className="text-sm font-medium">
                                                終了選択肢
                                              </Label>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* プレビュー表示 */}
                                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                                        <strong>プレビュー:</strong> 
                                        {option.text && <span className="ml-1">"{ option.text }"</span>}
                                        {option.nextStepId && <span className="ml-2">→ {option.nextStepId}</span>}
                                        {option.isTerminal && <span className="ml-2 text-red-600">[終了]</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                                  <p className="text-xs text-yellow-700 font-medium">
                                    💡 使い方のヒント:
                                  </p>
                                  <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-1">
                                    <li>条件分岐ノードでは、ユーザーが選択できる複数の選択肢を設定できます</li>
                                    <li>「表示テキスト」はユーザーに表示されるボタンのテキストです</li>
                                    <li>「条件・説明」は内部的な説明やロジックを記述します</li>
                                    <li>「次のステップID」は選択後に移動するステップを指定します</li>
                                    <li>「終了選択肢」をチェックすると、フローがその選択肢で終了します</li>
                                  </ul>
                                </div>
                              </div>
                            )}
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