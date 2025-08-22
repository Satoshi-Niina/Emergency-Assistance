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
    title: flowId ? '繝輔Ο繝ｼ邱ｨ髮・ : '譁ｰ隕上ヵ繝ｭ繝ｼ',
    description: '',
    steps: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);

  // 繝輔Ο繝ｼ繝・・繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    if (flowId) {
      loadFlowData();
    }
  }, [flowId]);

  const loadFlowData = async () => {
    try {
      setIsLoading(true);
      console.log('売 繝輔Ο繝ｼ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ髢句ｧ・', flowId);
      
      const response = await fetch(buildApiUrl(`/api/troubleshooting/${flowId}`), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('笶・API 繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(`繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('投 API繝ｬ繧ｹ繝昴Φ繧ｹ:', responseData);
      
      // 繧ｵ繝ｼ繝舌・縺九ｉ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧貞叙蠕・
      const data = responseData.success && responseData.data ? responseData.data : responseData;
      console.log('搭 蜃ｦ逅・ｯｾ雎｡繝・・繧ｿ:', data);
      
      // 繝・・繧ｿ讒矩縺ｮ豁｣隕丞喧
      if (data.steps && Array.isArray(data.steps)) {
        data.steps = data.steps.map(step => ({
          ...step,
          images: step.images || [],
          conditions: step.conditions || []
        }));
      } else {
        data.steps = [];
      }

      console.log('笨・繝輔Ο繝ｼ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・', {
        id: data.id,
        title: data.title,
        stepsCount: data.steps.length
      });
      
      setFlowData(data);
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔Ο繝ｼ繝・・繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 繧ｹ繝・ャ繝励・霑ｽ蜉
  const addStep = (type: 'step' | 'decision', index?: number) => {
    const newStep: Step = {
      id: uuidv4(),
      type,
      title: `譁ｰ縺励＞${type === 'step' ? '繧ｹ繝・ャ繝・ : '譚｡莉ｶ蛻・ｲ・}`,
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

  // 繧ｹ繝・ャ繝励・蜑企勁
  const deleteStep = (stepId: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  // 繧ｹ繝・ャ繝励・譖ｴ譁ｰ
  const updateStep = (stepId: string, updates: Partial<Step>) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  // 繝峨Λ繝・げ&繝峨Ο繝・・讖溯・
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

  // 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・
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

  // 逕ｻ蜒上・蜑企勁
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

  // 譚｡莉ｶ縺ｮ霑ｽ蜉
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

  // 譚｡莉ｶ縺ｮ蜑企勁
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

  // 譚｡莉ｶ縺ｮ譖ｴ譁ｰ
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

  // 菫晏ｭ伜・逅・
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝・
      const updatedFlowData = { ...flowData };
      for (const step of updatedFlowData.steps) {
        const uploadedImages = [];
        for (const image of step.images) {
          if (image.file) {
            // 逕ｻ蜒上ヵ繧｡繧､繝ｫ繧偵い繝・・繝ｭ繝ｼ繝・
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
        title: "謌仙粥",
        description: "繝輔Ο繝ｼ縺御ｿ晏ｭ倥＆繧後∪縺励◆",
      });
    } catch (error) {
      console.error('菫晏ｭ倥お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔Ο繝ｼ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆",
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
            <span>{flowId ? '繝輔Ο繝ｼ邱ｨ髮・ : '譁ｰ隕上ヵ繝ｭ繝ｼ菴懈・'}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-1" />
                菫晏ｭ・
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 繝輔Ο繝ｼ蝓ｺ譛ｬ諠・ｱ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">繧ｿ繧､繝医Ν</Label>
              <Input
                id="title"
                value={flowData.title}
                onChange={(e) => setFlowData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν"
              />
            </div>
            <div>
              <Label htmlFor="description">隱ｬ譏・/Label>
              <Input
                id="description"
                value={flowData.description}
                onChange={(e) => setFlowData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="繝輔Ο繝ｼ縺ｮ隱ｬ譏・
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 繧ｹ繝・ャ繝嶺ｸ隕ｧ */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>繧ｹ繝・ャ繝嶺ｸ隕ｧ</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('step')}
              >
                <Plus className="h-4 w-4 mr-1" />
                繧ｹ繝・ャ繝苓ｿｽ蜉
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addStep('decision')}
              >
                <Plus className="h-4 w-4 mr-1" />
                譚｡莉ｶ蛻・ｲ占ｿｽ蜉
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
                                {/* 繧ｹ繝・ャ繝励・繝・ム繝ｼ */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">
                                      {index + 1}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                      {step.type === 'step' ? '繧ｹ繝・ャ繝・ : '譚｡莉ｶ蛻・ｲ・}
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

                                {/* 繧ｹ繝・ャ繝怜・螳ｹ */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>繧ｿ繧､繝医Ν</Label>
                                    <Input
                                      value={step.title}
                                      onChange={(e) => updateStep(step.id, { title: e.target.value })}
                                      placeholder="繧ｹ繝・ャ繝励・繧ｿ繧､繝医Ν"
                                    />
                                  </div>
                                  <div>
                                    <Label>隱ｬ譏・/Label>
                                    <Input
                                      value={step.description}
                                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                                      placeholder="繧ｹ繝・ャ繝励・隱ｬ譏・
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>繝｡繝・そ繝ｼ繧ｸ</Label>
                                  <Textarea
                                    value={step.message}
                                    onChange={(e) => updateStep(step.id, { message: e.target.value })}
                                    placeholder="繧ｹ繝・ャ繝励・隧ｳ邏ｰ繝｡繝・そ繝ｼ繧ｸ"
                                    rows={3}
                                  />
                                </div>

                                {/* 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・*/}
                                <div>
                                  <Label>逕ｻ蜒・/Label>
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
                                      <span className="text-xs">霑ｽ蜉</span>
                                    </Button>
                                  </div>
                                </div>

                                {/* 譚｡莉ｶ蛻・ｲ・*/}
                                {step.type === 'decision' && (
                                  <div>
                                    <Label>譚｡莉ｶ蛻・ｲ・/Label>
                                    <div className="space-y-2">
                                      {(step.conditions || []).map((condition, conditionIndex) => (
                                        <div key={conditionIndex} className="flex gap-2">
                                          <Input
                                            value={condition.label}
                                            onChange={(e) => updateCondition(step.id, conditionIndex, 'label', e.target.value)}
                                            placeholder="譚｡莉ｶ縺ｮ繝ｩ繝吶Ν"
                                            className="flex-1"
                                          />
                                          <Input
                                            value={condition.nextId}
                                            onChange={(e) => updateCondition(step.id, conditionIndex, 'nextId', e.target.value)}
                                            placeholder="谺｡縺ｮ繧ｹ繝・ャ繝悠D"
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
                                        譚｡莉ｶ霑ｽ蜉
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
                          繧ｹ繝・ャ繝励ｒ荳九↓謖ｿ蜈･
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => addStep('decision', index + 1)}>
                          譚｡莉ｶ蛻・ｲ舌ｒ荳九↓謖ｿ蜈･
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => deleteStep(step.id)} className="text-red-600">
                          蜑企勁
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                    
                    {/* 繧ｹ繝・ャ繝鈴俣縺ｮ霑ｽ蜉繝懊ち繝ｳ */}
                    <div className="flex items-center justify-center gap-4 my-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2"
                        onClick={() => addStep('step', index + 1)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        繧ｹ繝・ャ繝苓ｿｽ蜉
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2"
                        onClick={() => addStep('decision', index + 1)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        譚｡莉ｶ蛻・ｲ占ｿｽ蜉
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
