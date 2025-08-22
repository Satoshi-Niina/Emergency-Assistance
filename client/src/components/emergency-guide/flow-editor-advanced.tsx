import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast.ts";
import { 
  Plus, 
  Trash2, 
  X, 
  Save, 
  ArrowUp, 
  ArrowDown, 
  Image as ImageIcon,
  Upload,
  GripVertical
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { convertImageUrl } from '../../lib/utils.ts';
import { buildApiUrl } from '../../lib/api/config.ts';

interface Step {
  id: string;
  type: 'step' | 'decision';
  title: string;
  description: string;
  message: string;
  images: Array<{
    url: string;
    fileName: string;
    file?: File;
  }>;
  conditions?: Array<{
    label: string;
    nextId: string;
  }>;
}

interface FlowData {
  id: string;
  title: string;
  description: string;
  steps: Step[];
  createdAt?: string;
  updatedAt?: string;
}

interface FlowEditorAdvancedProps {
  flowId?: string;
  onSave: (data: FlowData) => void;
  onCancel: () => void;
}

const FlowEditorAdvanced: React.FC<FlowEditorAdvancedProps> = ({
  flowId,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const [flowData, setFlowData] = useState<FlowData>({
    id: flowId || uuidv4(),
    title: flowId ? 'フロー編雁E : '新規フロー',
    description: '',
    steps: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);

  // フローチE�Eタの読み込み
  useEffect(() => {
    if (flowId) {
      loadFlowData();
    }
  }, [flowId]);

  const loadFlowData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 フローチE�Eタ読み込み開姁E', flowId);
      
      const response = await fetch(buildApiUrl(`/api/troubleshooting/${flowId}`), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁EAPI エラー:', errorText);
        throw new Error(`フローチE�Eタの取得に失敗しました: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('📊 APIレスポンス:', responseData);
      
      // サーバ�Eからのレスポンス構造に合わせてチE�Eタを取征E
      const data = responseData.success && responseData.data ? responseData.data : responseData;
      console.log('📋 処琁E��象チE�Eタ:', data);
      
      // チE�Eタ構造の正規化
      if (data.steps && Array.isArray(data.steps)) {
        data.steps = data.steps.map(step => ({
          ...step,
          images: step.images || [],
          conditions: step.conditions || []
        }));
      } else {
        data.steps = [];
      }

      console.log('✁EフローチE�Eタ読み込み完亁E', {
        id: data.id,
        title: data.title,
        stepsCount: data.steps.length
      });
      
      setFlowData(data);
    } catch (error) {
      console.error('❁EフローチE�Eタ読み込みエラー:', error);
      toast({
        title: "エラー",
        description: "フローチE�Eタの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // スチE��プ�E追加
  const addStep = (type: 'step' | 'decision', index?: number) => {
    const newStep: Step = {
      id: uuidv4(),
      type,
      title: `新しい${type === 'step' ? 'スチE��チE : '条件刁E��E}`,
      description: '',
      message: '',
      images: [],
      ...(type === 'decision' && { conditions: [{ label: '', nextId: '' }] })
    };

    setFlowData(prev => {
      const newSteps = [...prev.steps];
      if (index !== undefined) {
        newSteps.splice(index, 0, newStep);
      } else {
        newSteps.push(newStep);
      }
      return { ...prev, steps: newSteps };
    });
  };

  // スチE��プ�E削除
  const deleteStep = (stepId: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  // スチE��プ�E更新
  const updateStep = (stepId: string, updates: Partial<Step>) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  // ドラチE��&ドロチE�E機�E
  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedStepId(stepId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();
    if (!draggedStepId || draggedStepId === targetStepId) return;

    setFlowData(prev => {
      const steps = [...prev.steps];
      const draggedIndex = steps.findIndex(s => s.id === draggedStepId);
      const targetIndex = steps.findIndex(s => s.id === targetStepId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const [draggedStep] = steps.splice(draggedIndex, 1);
      steps.splice(targetIndex, 0, draggedStep);
      
      return { ...prev, steps };
    });
    setDraggedStepId(null);
  };

  // 画像アチE�EローチE
  const handleImageUpload = async (stepId: string, files: FileList) => {
    const newImages = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      fileName: file.name,
      file
    }));

    updateStep(stepId, {
      images: [...flowData.steps.find(s => s.id === stepId)?.images || [], ...newImages]
    });
  };

  // 画像�E削除
  const removeImage = (stepId: string, imageIndex: number) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId) {
          const newImages = [...step.images];
          newImages.splice(imageIndex, 1);
          return { ...step, images: newImages };
        }
        return step;
      })
    }));
  };

  // 条件の追加
  const addCondition = (stepId: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId && step.type === 'decision') {
          return {
            ...step,
            conditions: [...(step.conditions || []), { label: '', nextId: '' }]
          };
        }
        return step;
      })
    }));
  };

  // 条件の削除
  const removeCondition = (stepId: string, conditionIndex: number) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId && step.conditions) {
          return {
            ...step,
            conditions: step.conditions.filter((_, index) => index !== conditionIndex)
          };
        }
        return step;
      })
    }));
  };

  // 条件の更新
  const updateCondition = (stepId: string, conditionIndex: number, field: 'label' | 'nextId', value: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId && step.conditions) {
          const newConditions = [...step.conditions];
          newConditions[conditionIndex] = { ...newConditions[conditionIndex], [field]: value };
          return { ...step, conditions: newConditions };
        }
        return step;
      })
    }));
  };

  // 保存�E琁E
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 画像ファイルのアチE�EローチE
      const updatedFlowData = { ...flowData };
      for (const step of updatedFlowData.steps) {
        const uploadedImages = [];
        for (const image of step.images) {
          if (image.file) {
            // 画像ファイルをアチE�EローチE
            const formData = new FormData();
            formData.append('image', image.file);
            
            const uploadResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/upload-image`, {
              method: 'POST',
              body: formData
            });
            
            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              uploadedImages.push({
                url: uploadResult.imageUrl,
                fileName: uploadResult.fileName
              });
            }
          } else {
            uploadedImages.push(image);
          }
        }
        step.images = uploadedImages;
      }

      onSave(updatedFlowData);
      toast({
        title: "成功",
        description: "フローが保存されました",
      });
    } catch (error) {
      console.error('保存エラー:', error);
      toast({
        title: "エラー",
        description: "フローの保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && flowId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{flowId ? 'フロー編雁E : '新規フロー作�E'}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-1" />
                保孁E
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* フロー基本惁E�� */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={flowData.title}
                onChange={(e) => setFlowData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="フローのタイトル"
              />
            </div>
            <div>
              <Label htmlFor="description">説昁E/Label>
              <Input
                id="description"
                value={flowData.description}
                onChange={(e) => setFlowData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="フローの説昁E
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* スチE��プ一覧 */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>スチE��プ一覧</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('step')}
              >
                <Plus className="h-4 w-4 mr-1" />
                スチE��プ追加
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('decision')}
              >
                <Plus className="h-4 w-4 mr-1" />
                条件刁E��追加
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
                {flowData.steps && flowData.steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <Card
                          className={`cursor-move transition-all border-4 border-blue-500 ${
                            draggedStepId === step.id ? 'opacity-50' : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, step.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, step.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <GripVertical className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                              <div className="flex-1 space-y-4">
                                {/* スチE��プ�EチE��ー */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                      {step.type === 'step' ? 'スチE��チE : '条件刁E��E}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteStep(step.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* スチE��プ�E容 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>タイトル</Label>
                                    <Input
                                      value={step.title}
                                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                                      placeholder="スチE��プ�Eタイトル"
                                    />
                                  </div>
                                  <div>
                                    <Label>説昁E/Label>
                                    <Input
                                      value={step.description}
                                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                      placeholder="スチE��プ�E説昁E
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>メチE��ージ</Label>
                                  <Textarea
                                    value={step.message}
                                    onChange={(e) => updateStep(step.id, { message: e.target.value })}
                                    placeholder="スチE��プ�E詳細メチE��ージ"
                                    rows={3}
                                  />
                                </div>

                                {/* 画像アチE�EローチE*/}
                                <div>
                                  <Label>画僁E/Label>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {step.images.map((image, imageIndex) => (
                                      <div key={imageIndex} className="relative">
                                        <img
                                          key={convertImageUrl(image.url)}
                                          src={convertImageUrl(image.url)}
                                          alt={image.fileName}
                                          className="w-20 h-20 object-cover rounded border"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600"
                                          onClick={() => removeImage(step.id, imageIndex)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.multiple = true;
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                          const files = (e.target as HTMLInputElement).files;
                                          if (files) {
                                            handleImageUpload(step.id, files);
                                          }
                                        };
                                        input.click();
                                      }}
                                      className="w-20 h-20 flex flex-col items-center justify-center"
                                    >
                                      <Upload className="h-4 w-4" />
                                      <span className="text-xs">追加</span>
                                    </Button>
                                  </div>
                                </div>

                                {/* 条件刁E��E*/}
                                {step.type === 'decision' && (
                                  <div>
                                    <Label>条件刁E��E/Label>
                                    <div className="space-y-2">
                                      {(step.conditions || []).map((condition, conditionIndex) => (
                                        <div key={conditionIndex} className="flex gap-2">
                                          <Input
                                            value={condition.label}
                                            onChange={(e) => updateCondition(step.id, conditionIndex, 'label', e.target.value)}
                                            placeholder="条件のラベル"
                                            className="flex-1"
                                          />
                                          <Input
                                            value={condition.nextId}
                                            onChange={(e) => updateCondition(step.id, conditionIndex, 'nextId', e.target.value)}
                                            placeholder="次のスチE��プID"
                                            className="flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeCondition(step.id, conditionIndex)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addCondition(step.id)}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        条件追加
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => addStep('step', index + 1)}>
                          スチE��プを下に挿入
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => addStep('decision', index + 1)}>
                          条件刁E��を下に挿入
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => deleteStep(step.id)} className="text-red-600">
                          削除
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                    
                    {/* スチE��プ間の追加ボタン */}
                    <div className="flex items-center justify-center gap-4 my-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2"
                        onClick={() => addStep('step', index + 1)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        スチE��プ追加
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2"
                        onClick={() => addStep('decision', index + 1)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        条件刁E��追加
                      </Button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
    </div>
  );
};

export default FlowEditorAdvanced; 
