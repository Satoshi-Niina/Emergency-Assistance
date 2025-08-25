// @ts-ignore
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Trash2, GripVertical, Upload, X, Image as ImageIcon, Save, RotateCcw, AlertTriangle, ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';
import { convertImageUrl } from '../../lib/utils.ts';

/**
 * 笞・・AI邱ｨ髮・宛髯・ 縺薙・繝輔ぃ繧､繝ｫ縺ｯ繧ｹ繝ｩ繧､繝臥ｷｨ髮・I蟆ら畑縺ｧ縺・
 * - 繧ｿ繧､繝医Ν邱ｨ髮・ｩ溯・縺ｮ螟画峩縺ｯ遖∵ｭ｢
 * - 譚｡莉ｶ蛻・ｲ振I讒矩縺ｮ螟画峩縺ｯ遖∵ｭ｢
 * - 繝舌ャ繧ｯ繧ｨ繝ｳ繝蛾｣謳ｺ繧ｳ繝ｼ繝峨・霑ｽ蜉縺ｯ遖∵ｭ｢
 */

// Helper function for UTF-8 safe base64 encoding
function utf8_to_b64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('Failed to base64 encode:', str, e);
    return btoa(str); // Fallback to simple btoa
  }
}

// 1. ImageInfo繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ繧偵お繧ｯ繧ｹ繝昴・繝亥庄閭ｽ縺ｫ螟画峩縺励√ヵ繧｡繧､繝ｫURL縺ｨ繝輔ぃ繧､繝ｫ蜷阪ｒ菫晄戟縺吶ｋ繧医≧縺ｫ縺励∪縺・
export interface ImageInfo {
  url: string;
  fileName: string;
}

interface DecisionCondition {
  id: string;
  text: string;
  nextSlideId?: string;
}

// 2. Step繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ縺ｮ逕ｻ蜒城未騾｣縺ｮ繝輔ぅ繝ｼ繝ｫ繝峨ｒ images 驟榊・縺ｫ螟画峩縺励∪縺・
interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'condition' | 'end';
  images?: ImageInfo[];
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
  // 蜿､縺・・繝ｭ繝代ユ繧｣縺ｯ蠕梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ縺ｫ谿九☆・亥ｰ・擂逧・↓縺ｯ蜑企勁・・
  imageUrl?: string;
  imageFileName?: string;
}

interface StepEditorProps {
  steps: Step[];
  onStepUpdate: (stepId: string, updatedData: Partial<Step>) => void;
  onStepsReorder: (reorderedSteps: Step[]) => void;
  onStepDelete: (stepId: string) => void;
  onConditionAdd: (stepId: string) => void;
  onConditionDelete: (stepId: string, conditionIndex: number) => void;
  onConditionEdit: (stepId:string, conditionIndex: number, field: 'label' | 'nextId', value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  flowId?: string;
  onAddStepBetween?: (index: number, type: 'step' | 'decision') => void;
}

// 繧ｫ繧ｹ繧ｿ繝繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繝舌・縺ｮ繧ｹ繧ｿ繧､繝ｫ
const scrollbarStyles = `
  .step-editor-scrollbar::-webkit-scrollbar {
    width: 20px !important;
    height: 20px !important;
  }
  
  .step-editor-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1 !important;
    border-radius: 10px !important;
    margin: 2px !important;
  }
  
  .step-editor-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1 !important;
    border-radius: 10px !important;
    border: 2px solid #f1f1f1 !important;
  }
  
  .step-editor-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8 !important;
  }
  
  .step-editor-scrollbar::-webkit-scrollbar-corner {
    background: #f1f1f1 !important;
  }
  
  .step-editor-scrollbar {
    scrollbar-width: auto !important;
    scrollbar-color: #c1c1c1 #f1f1f1 !important;
  }
  
  /* 繧医ｊ蜈ｷ菴鍋噪縺ｪ繧ｻ繝ｬ繧ｯ繧ｿ縺ｧ蜆ｪ蜈亥ｺｦ繧剃ｸ翫￡繧・*/
  div.step-editor-scrollbar::-webkit-scrollbar {
    width: 20px !important;
    height: 20px !important;
  }
  
  div.step-editor-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1 !important;
    border-radius: 10px !important;
    margin: 2px !important;
  }
  
  div.step-editor-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1 !important;
    border-radius: 10px !important;
    border: 2px solid #f1f1f1 !important;
  }
`;

const StepEditor: React.FC<StepEditorProps> = ({ 
  steps, 
  onStepUpdate,
  onStepsReorder,
  onStepDelete, 
  onConditionAdd,
  onConditionDelete,
  onConditionEdit,
  onSave, 
  onCancel, 
  flowId,
  onAddStepBetween
}) => {
  console.log('売 StepEditor 繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ髢句ｧ・', { 
    stepsLength: steps.length, 
    flowId,
    steps: steps.map(s => ({ id: s.id, title: s.title, type: s.type }))
  });
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({});
  const [showStepControls, setShowStepControls] = useState<{ [key: string]: boolean }>({});
  
  // 縺吶∋縺ｦ縺ｮ繧ｹ繝・ャ繝励ｒ螻暮幕迥ｶ諷九↓縺吶ｋ
  useEffect(() => {
    const allExpanded = steps.reduce((acc, step) => {
      acc[step.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    setExpandedSteps(allExpanded);
  }, [steps]);

  // 繧ｫ繧ｹ繧ｿ繝繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繝舌・縺ｮ繧ｹ繧ｿ繧､繝ｫ繧帝←逕ｨ
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = scrollbarStyles;
    styleElement.id = 'step-editor-scrollbar-styles';
    document.head.appendChild(styleElement);

    return () => {
      const existingStyle = document.getElementById('step-editor-scrollbar-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  const handleStepFieldChange = (stepId: string, field: keyof Step, value: any) => {
    onStepUpdate(stepId, { [field]: value });
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // 逕ｻ蜒酋RL螟画鋤縺ｮ邁｡逡･蛹・

  // 逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ繧貞・逅・☆繧矩未謨ｰ
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, imageUrl: string) => {
    console.error('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', imageUrl);
    const target = e.currentTarget;
    target.style.display = 'none';
    
    // 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ逕ｨ縺ｮ隕∫ｴ繧定ｿｽ蜉
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm';
    errorDiv.textContent = '逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
    target.parentNode?.appendChild(errorDiv);
  };

  const handleImageUpload = async (stepId: string, file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingImages(prev => ({ ...prev, [stepId]: true }));
    
    try {
      console.log('名・・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝蛾幕蟋・', { stepId, fileName: file.name });
      
      // 驥崎､・メ繧ｧ繝・け: 蜷後§繝輔ぃ繧､繝ｫ蜷阪・逕ｻ蜒上′譌｢縺ｫ蟄伜惠縺吶ｋ縺九メ繧ｧ繝・け
      const stepToUpdate = steps.find(step => step.id === stepId);
      if (stepToUpdate && stepToUpdate.images) {
        const existingImage = (stepToUpdate.images ?? []).find(img => 
          img.fileName === file.name || 
          img.fileName === file.name.replace(/\.[^/.]+$/, '') // 諡｡蠑ｵ蟄舌ｒ髯､縺・◆豈碑ｼ・
        );
        
        if (existingImage) {
          const confirmReplace = window.confirm(
            `蜷後§繝輔ぃ繧､繝ｫ蜷阪・逕ｻ蜒・"${file.name}" 縺梧里縺ｫ蟄伜惠縺励∪縺吶・n` +
            `譌｢蟄倥・逕ｻ蜒上ｒ鄂ｮ縺肴鋤縺医∪縺吶°・歔
          );
          
          if (!confirmReplace) {
            setUploadingImages(prev => ({ ...prev, [stepId]: false }));
            return;
          }
          
          // 譌｢蟄倥・逕ｻ蜒上ｒ蜑企勁
          const updatedImages = stepToUpdate.images.filter(img => img.fileName !== existingImage.fileName);
          onStepUpdate(stepId, { images: updatedImages });
        }
      }
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('stepId', stepId);
      if (flowId) formData.append('flowId', flowId);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      if (!result.success || !result.imageUrl) {
        throw new Error('逕ｻ蜒酋RL縺瑚ｿ斐＆繧後∪縺帙ｓ縺ｧ縺励◆');
      }

      const newImage: ImageInfo = {
        url: result.imageUrl,
        fileName: result.imageFileName || result.fileName,
      };

      // 驥崎､・判蜒上・蝣ｴ蜷医・騾夂衍
      if (result.isDuplicate) {
        console.log('売 驥崎､・判蜒上ｒ讀懷・縲∵里蟄倥ヵ繧｡繧､繝ｫ繧剃ｽｿ逕ｨ:', result.fileName);
      }

      // 逕ｻ蜒上い繝・・繝ｭ繝ｼ繝牙・逅・ｒ縲・・蛻励↓逕ｻ蜒上ｒ霑ｽ蜉縺吶ｋ繧医≧縺ｫ螟画峩
      const currentStepToUpdate = steps.find(step => step.id === stepId);
      if (currentStepToUpdate) {
        const currentImages = currentStepToUpdate.images ?? [];
        if (currentImages.length < 3) {
          const updatedImages = [...currentImages, newImage];
          onStepUpdate(stepId, { images: updatedImages });
          
          // 謌仙粥騾夂衍
          const message = result.isDuplicate 
            ? `驥崎､・判蜒上ｒ讀懷・縺励∪縺励◆縲よ里蟄倥・逕ｻ蜒・"${result.fileName}" 繧剃ｽｿ逕ｨ縺励∪縺吶Ａ
            : '逕ｻ蜒上′豁｣蟶ｸ縺ｫ繧｢繝・・繝ｭ繝ｼ繝峨＆繧後∪縺励◆';
          
          // 繝医・繧ｹ繝磯夂衍縺ｮ莉｣繧上ｊ縺ｫ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ繝ｭ繧ｰ
          console.log('笨・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝牙ｮ御ｺ・', message);
        } else {
          throw new Error('逕ｻ蜒上・譛螟ｧ3譫壹∪縺ｧ繧｢繝・・繝ｭ繝ｼ繝峨〒縺阪∪縺・);
        }
      }

    } catch (error) {
      console.error('笶・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝牙､ｱ謨・', error);
      alert(`逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingImages(prev => ({ ...prev, [stepId]: false }));
    }
  };

  // 逕ｻ蜒丞炎髯､蜃ｦ逅・ｒ謾ｹ蝟・
  const handleImageRemove = async (stepId: string, imageIndex: number) => {
    console.log('卵・・逕ｻ蜒丞炎髯､:', { stepId, imageIndex });
    const stepToUpdate = steps.find(step => step.id === stepId);
    if (stepToUpdate) {
        const newImages = [...(stepToUpdate.images || [])];
        if (imageIndex >= 0 && imageIndex < newImages.length) {
            const imageToRemove = newImages[imageIndex];
            
            // 蜑企勁遒ｺ隱・
            const confirmDelete = window.confirm(
                `逕ｻ蜒・"${imageToRemove.fileName}" 繧貞炎髯､縺励∪縺吶°・歃n` +
                `繧ｵ繝ｼ繝舌・縺九ｉ繝輔ぃ繧､繝ｫ縺悟ｮ悟・縺ｫ蜑企勁縺輔ｌ縲√％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲Ａ
            );
            
            if (confirmDelete) {
                try {
                    // API繧貞他縺ｳ蜃ｺ縺励※繧ｵ繝ｼ繝舌・縺九ｉ逕ｻ蜒上ｒ蜑企勁
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/image/${imageToRemove.fileName}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || '繧ｵ繝ｼ繝舌・荳翫・逕ｻ蜒上ヵ繧｡繧､繝ｫ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・);
                    }

                    // 繝輔Ο繝ｳ繝医お繝ｳ繝峨・迥ｶ諷九ｒ譖ｴ譁ｰ
                    newImages.splice(imageIndex, 1);
                    onStepUpdate(stepId, { images: newImages });
                    console.log('笨・逕ｻ蜒丞炎髯､螳御ｺ・', imageToRemove.fileName);
                    alert(`逕ｻ蜒・"${imageToRemove.fileName}" 繧貞炎髯､縺励∪縺励◆縲Ａ);

                } catch (error) {
                    console.error('笶・逕ｻ蜒丞炎髯､繧ｨ繝ｩ繝ｼ:', error);
                    alert(`逕ｻ蜒丞炎髯､縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'}`);
                }
            }
        }
    }
  };

  const handleFileSelect = (stepId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(stepId, file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (stepId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      console.log('名・・繝峨Λ繝・げ&繝峨Ο繝・・縺ｧ逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・', { stepId, fileName: imageFile.name });
      handleImageUpload(stepId, imageFile);
    } else {
      console.warn('笞・・繝峨Ο繝・・縺輔ｌ縺溘ヵ繧｡繧､繝ｫ縺ｫ逕ｻ蜒上′蜷ｫ縺ｾ繧後※縺・∪縺帙ｓ');
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onStepsReorder(items);
  };

  const renderStepContent = (step: Step) => {
    if (!expandedSteps[step.id]) {
      return (
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{step.title || `繧ｹ繝・ャ繝・${step.id}`}</span>
              <span className="text-xs text-gray-500">({step.type})</span>
            </div>
            {step.description && (
              <span className="text-xs text-gray-600 truncate max-w-32">
                {step.description}
              </span>
            )}
            {step.images && step.images.length > 0 && (
              <div className="flex items-center space-x-1">
                <ImageIcon className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-600">{step.images.length}譫・/span>
              </div>
            )}
            {step.type === 'decision' && step.conditions && step.conditions.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">
                  {step.conditions.length}譚｡莉ｶ
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleStepExpansion(step.id)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4" style={{ minHeight: '0px' }}>
        {/* 繧ｹ繝・ャ繝励・繝・ム繝ｼ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-600">繧ｹ繝・ャ繝苓ｩｳ邏ｰ</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStepExpansion(step.id)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor={`title-${step.id}`} className="text-base-2x">繧ｿ繧､繝医Ν</Label>
            <Input
              id={`title-${step.id}`}
              value={step.title}
              onChange={(e) => handleStepFieldChange(step.id, 'title', e.target.value)}
              placeholder="繧ｹ繝ｩ繧､繝峨・繧ｿ繧､繝医Ν繧貞・蜉・
              className="text-base-2x h-12"
            />
          </div>
          <div>
            <Label htmlFor={`description-${step.id}`} className="text-base-2x">隱ｬ譏・/Label>
            <Input
              id={`description-${step.id}`}
              value={step.description}
              onChange={(e) => handleStepFieldChange(step.id, 'description', e.target.value)}
              placeholder="繧ｹ繝ｩ繧､繝峨・隱ｬ譏弱ｒ蜈･蜉・
              className="text-base-2x h-12"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`message-${step.id}`} className="text-base-2x">繝｡繝・そ繝ｼ繧ｸ</Label>
          <Textarea
            id={`message-${step.id}`}
            value={step.message}
            onChange={(e) => handleStepFieldChange(step.id, 'message', e.target.value)}
            placeholder="陦ｨ遉ｺ縺吶ｋ繝｡繝・そ繝ｼ繧ｸ繧貞・蜉・
            rows={3}
            className="text-base-2x min-h-24"
          />
        </div>

        {/* 6. 逕ｻ蜒上そ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮUI繧定､・焚逕ｻ蜒丞ｯｾ蠢懊↓蜈ｨ髱｢逧・↓譖ｸ縺肴鋤縺・*/}
        <div>
          <Label className="text-base-2x">逕ｻ蜒擾ｼ域怙螟ｧ3譫壹∪縺ｧ・・/Label>
          <p className="text-base-2x text-muted-foreground mt-2">
            蟇ｾ蠢懷ｽ｢蠑・ JPG, PNG, GIF縺ｫ縺ｪ繧翫∪縺吶る㍾隍・判蜒上・閾ｪ蜍慕噪縺ｫ讀懷・縺輔ｌ縺ｾ縺吶・
          </p>
          <div 
            className="mt-2 p-4 border-2 border-dashed rounded-lg"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(step.id, e)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(step.images ?? []).map((image, index) => (
                <div key={index} className="relative group aspect-video">
                  {(() => {
                    const convertedUrl = convertImageUrl(image.url);
                    console.log(`名・・逕ｻ蜒剰｡ｨ遉ｺ繝・ヰ繝・げ [${step.id}][${index}]:`, {
                      originalUrl: image.url,
                      convertedUrl: convertedUrl,
                      fileName: image.fileName
                    });
                    return (
                      <img
                        src={convertedUrl}
                        alt={image.fileName}
                        className="w-full h-full object-cover rounded-lg border shadow-sm"
                        onError={(e) => {
                          console.error('笶・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', {
                            originalUrl: image.url,
                            convertedUrl: convertedUrl,
                            fileName: image.fileName,
                            error: e
                          });
                          handleImageError(e, image.url);
                        }}
                        onLoad={() => {
                          console.log('笨・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                            originalUrl: image.url,
                            convertedUrl: convertedUrl,
                            fileName: image.fileName
                          });
                          // 逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥譎ゅ↓繧ｨ繝ｩ繝ｼ繝輔Λ繧ｰ繧偵け繝ｪ繧｢
                          setImageErrors(prev => ({ ...prev, [image.url]: false }));
                        }}
                      />
                    );
                  })()}
                  {imageErrors[image.url] && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white p-2">
                        <X className="h-8 w-8 mx-auto" />
                        <p className="text-xs font-bold mt-1">隱ｭ霎ｼ螟ｱ謨・/p>
                        <p className="text-xs mt-1">{image.fileName}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 逕ｻ蜒乗桃菴懊・繧ｿ繝ｳ */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleImageRemove(step.id, index)}
                      className="h-7 w-7 p-0 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                      title="逕ｻ蜒上ｒ蜑企勁"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* 逕ｻ蜒乗ュ蝣ｱ陦ｨ遉ｺ */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                    {image.fileName}
                  </div>
                  
                  {/* 驥崎､・判蜒上・蝣ｴ蜷医・隴ｦ蜻願｡ｨ遉ｺ */}
                  {(step.images ?? []).filter(img => img.fileName === image.fileName).length > 1 && (
                    <div className="absolute top-1 left-1">
                      <div className="bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                        驥崎､・
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(!step.images || (step.images ?? []).length < 3) && (
                <div 
                  className="flex items-center justify-center aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRefs.current[step.id]?.click()}
                >
                  <div className="text-center">
                    {uploadingImages[step.id] ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto" />
                    ) : (
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    )}
                    <span className="mt-2 block text-sm font-medium text-gray-600">
                      {uploadingImages[step.id] ? '繧｢繝・・繝ｭ繝ｼ繝我ｸｭ...' : '逕ｻ蜒上ｒ霑ｽ蜉'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {(step.images?.length || 0)} / 3譫・
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      繝峨Λ繝・げ&繝峨Ο繝・・蟇ｾ蠢・
                    </p>
                  </div>
                  <input
                    ref={(el) => (fileInputRefs.current[step.id] = el)}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(step.id, e)}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            {/* 逕ｻ蜒冗ｮ｡逅・・繝偵Φ繝・*/}
            {step.images && step.images.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-base-2x text-blue-700">
                <p className="font-medium">逕ｻ蜒冗ｮ｡逅・・繝偵Φ繝・</p>
                <ul className="mt-2 space-y-2">
                  <li>窶｢ 蜷後§繝輔ぃ繧､繝ｫ蜷阪・逕ｻ蜒上・閾ｪ蜍慕噪縺ｫ驥崎､・→縺励※讀懷・縺輔ｌ縺ｾ縺・/li>
                  <li>窶｢ 驥崎､・判蜒上・譌｢蟄倥・繝輔ぃ繧､繝ｫ繧貞・蛻ｩ逕ｨ縺励※繧ｹ繝医Ξ繝ｼ繧ｸ繧堤ｯ邏・＠縺ｾ縺・/li>
                  <li>窶｢ 逕ｻ蜒上・譛螟ｧ3譫壹∪縺ｧ繧｢繝・・繝ｭ繝ｼ繝峨〒縺阪∪縺・/li>
                  <li>窶｢ 蜑企勁縺励◆逕ｻ蜒上・蜈・↓謌ｻ縺帙∪縺帙ｓ</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {step.type === 'decision' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>譚｡莉ｶ蛻・ｲ・/Label>
              <div className="text-sm text-gray-500">
                譚｡莉ｶ謨ｰ: {step.conditions?.length || 0}/4
              </div>
            </div>
            <div className="space-y-2">
              {step.conditions?.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="flex items-center space-x-2 p-2 border rounded">
                  <div className="flex-1">
                    <Input
                      value={condition.label}
                      onChange={(e) => onConditionEdit(step.id, conditionIndex, 'label', e.target.value)}
                      placeholder="譚｡莉ｶ縺ｮ隱ｬ譏・
                      className="mb-2"
                    />
                    <Select
                      value={condition.nextId}
                      onValueChange={(value) => onConditionEdit(step.id, conditionIndex, 'nextId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="谺｡縺ｮ繧ｹ繝ｩ繧､繝峨ｒ驕ｸ謚・ />
                      </SelectTrigger>
                      <SelectContent>
                        {steps
                          .filter(s => s.id !== step.id)
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.title || `繧ｹ繝ｩ繧､繝・${s.id}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onConditionDelete(step.id, conditionIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!step.conditions || (step.conditions ?? []).length < 4) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onConditionAdd(step.id)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  譚｡莉ｶ繧定ｿｽ蜉
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 繧ｹ繝・ャ繝鈴俣縺ｮ霑ｽ蜉繝懊ち繝ｳ繧偵Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ
  const renderAddStepBetween = (index: number) => {
    if (!onAddStepBetween) return null;
    
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2 border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddStepBetween(index, 'step')}
            className="h-6 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            騾壼ｸｸ繧ｹ繝・ャ繝・
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddStepBetween(index, 'decision')}
            className="h-6 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            譚｡莉ｶ蛻・ｲ・
          </Button>
        </div>
      </div>
    );
  };

  // 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ繧ｳ繝ｳ繝昴・繝阪Φ繝・
  const ActionButtons = () => (
    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
      <div className="text-sm text-gray-500">
        繧ｹ繝ｩ繧､繝画焚: {steps.length}
      </div>
      <div className="text-sm text-gray-600">
        譛蠕後・繧ｹ繝ｩ繧､繝峨・閾ｪ蜍慕噪縺ｫ邨ゆｺ・せ繝ｩ繧､繝峨↓縺ｪ繧翫∪縺・
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 繝・ヰ繝・げ諠・ｱ */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4 flex-shrink-0">
        <p className="text-yellow-800 font-medium">StepEditor 繝・ヰ繝・げ諠・ｱ:</p>
        <p className="text-yellow-700 text-sm">蜿励￠蜿悶▲縺殱teps.length: {steps.length}</p>
        <p className="text-yellow-700 text-sm">steps蜀・ｮｹ: {steps.map(s => `${s.id}:${s.title}`).join(', ')}</p>
        <p className="text-yellow-700 text-sm">expandedSteps: {Object.keys(expandedSteps).length}蛟・/p>
      </div>
      
      {/* 繧ｹ繝ｩ繧､繝繝ｼ繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-700">繧ｹ繝・ャ繝励リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ</span>
          <span className="text-xs text-blue-600">({steps.length}蛟九・繧ｹ繝・ャ繝・</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allExpanded = steps.reduce((acc, step) => {
                acc[step.id] = true;
                return acc;
              }, {} as { [key: string]: boolean });
              setExpandedSteps(allExpanded);
            }}
            className="h-7 px-2 text-xs"
          >
            縺吶∋縺ｦ螻暮幕
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedSteps({})}
            className="h-7 px-2 text-xs"
          >
            縺吶∋縺ｦ謚倥ｊ縺溘◆縺ｿ
          </Button>
        </div>
      </div>

      {/* 繧ｹ繝・ャ繝嶺ｸ隕ｧ陦ｨ遉ｺ */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 flex-shrink-0">
        <div className="text-sm font-medium text-gray-700 mb-2">繧ｹ繝・ャ繝・/div>
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                expandedSteps[step.id]
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => toggleStepExpansion(step.id)}
            >
              {index + 1}. {step.title || `繧ｹ繝・ャ繝・${index + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ蜿ｯ閭ｽ縺ｪ繧ｹ繝・ャ繝苓｡ｨ遉ｺ繧ｨ繝ｪ繧｢ - 譖ｴ譁ｰ: 2024-01-XX */}
      <div 
        className="flex-1 overflow-y-auto step-editor-scrollbar" 
        style={{ 
          minHeight: '0px',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        data-updated="2024-01-XX"
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 pb-4" style={{ flex: '1 1 auto' }}>
                {steps.length === 0 ? (
                  <div className="p-8 text-center bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-medium">笞・・繧ｹ繝・ャ繝励′遨ｺ縺ｧ縺・/p>
                    <p className="text-red-700 text-sm">steps驟榊・縺ｫ繝・・繧ｿ縺悟性縺ｾ繧後※縺・∪縺帙ｓ</p>
                  </div>
                ) : (
                  steps.map((step, index) => (
                  <div key={step.id} style={{ minHeight: '0px' }}>
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="relative"
                          style={{ minHeight: '0px' }}
                        >
                          <Card 
                            className={`transition-shadow duration-200 border-4 border-blue-500 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            style={{ minHeight: '0px' }}
                          >
                            <div {...provided.dragHandleProps} className="absolute top-1/2 -left-8 -translate-y-1/2 p-2 cursor-grab text-gray-400 hover:text-gray-600">
                              <GripVertical />
                            </div>
                            <CardContent className="p-4 md:p-6" style={{ minHeight: '0px' }}>
                              {renderStepContent(step)}
                            </CardContent>
                            <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onStepDelete(step.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                繧ｹ繝ｩ繧､繝峨ｒ蜑企勁
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                    
                    {/* 繧ｹ繝・ャ繝鈴俣縺ｫ霑ｽ蜉繝懊ち繝ｳ繧定｡ｨ遉ｺ・域怙蠕後・繧ｹ繝・ャ繝嶺ｻ･螟厄ｼ・*/}
                    {index < steps.length - 1 && renderAddStepBetween(index)}
                  </div>
                ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      
      {/* 菫晏ｭ倥・繧ｭ繝｣繝ｳ繧ｻ繝ｫ繝懊ち繝ｳ */}
      {onSave && onCancel && (
        <div className="flex justify-end gap-3 pt-4 border-t bg-white mt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            繧ｭ繝｣繝ｳ繧ｻ繝ｫ
          </Button>
          <Button
            onClick={onSave}
          >
            菫晏ｭ・
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepEditor;