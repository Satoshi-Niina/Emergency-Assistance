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
 * ⚠�E�EAI編雁E��陁E こ�Eファイルはスライド編雁EI専用でぁE
 * - タイトル編雁E���Eの変更は禁止
 * - 条件刁E��UI構造の変更は禁止
 * - バックエンド連携コード�E追加は禁止
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

// 1. ImageInfoインターフェースをエクスポ�Eト可能に変更し、ファイルURLとファイル名を保持するようにしまぁE
export interface ImageInfo {
  url: string;
  fileName: string;
}

interface DecisionCondition {
  id: string;
  text: string;
  nextSlideId?: string;
}

// 2. Stepインターフェースの画像関連のフィールドを images 配�Eに変更しまぁE
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
  // 古ぁE�Eロパティは後方互換性のために残す�E�封E��皁E��は削除�E�E
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

// カスタムスクロールバ�Eのスタイル
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
  
  /* より具体的なセレクタで優先度を上げめE*/
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
  console.log('🔄 StepEditor レンダリング開姁E', { 
    stepsLength: steps.length, 
    flowId,
    steps: steps.map(s => ({ id: s.id, title: s.title, type: s.type }))
  });
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({});
  const [showStepControls, setShowStepControls] = useState<{ [key: string]: boolean }>({});
  
  // すべてのスチE��プを展開状態にする
  useEffect(() => {
    const allExpanded = steps.reduce((acc, step) => {
      acc[step.id] = true;
      return acc;
    }, {} as { [key: string]: boolean });
    setExpandedSteps(allExpanded);
  }, [steps]);

  // カスタムスクロールバ�Eのスタイルを適用
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

  // 画像URL変換の簡略匁E

  // 画像�E読み込みエラーを�E琁E��る関数
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, imageUrl: string) => {
    console.error('画像読み込みエラー:', imageUrl);
    const target = e.currentTarget;
    target.style.display = 'none';
    
    // エラー表示用の要素を追加
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm';
    errorDiv.textContent = '画像�E読み込みに失敗しました';
    target.parentNode?.appendChild(errorDiv);
  };

  const handleImageUpload = async (stepId: string, file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingImages(prev => ({ ...prev, [stepId]: true }));
    
    try {
      console.log('🖼�E�E画像アチE�Eロード開姁E', { stepId, fileName: file.name });
      
      // 重褁E��ェチE��: 同じファイル名�E画像が既に存在するかチェチE��
      const stepToUpdate = steps.find(step => step.id === stepId);
      if (stepToUpdate && stepToUpdate.images) {
        const existingImage = (stepToUpdate.images ?? []).find(img => 
          img.fileName === file.name || 
          img.fileName === file.name.replace(/\.[^/.]+$/, '') // 拡張子を除ぁE��比輁E
        );
        
        if (existingImage) {
          const confirmReplace = window.confirm(
            `同じファイル名�E画僁E"${file.name}" が既に存在します、En` +
            `既存�E画像を置き換えますか�E�`
          );
          
          if (!confirmReplace) {
            setUploadingImages(prev => ({ ...prev, [stepId]: false }));
            return;
          }
          
          // 既存�E画像を削除
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
        throw new Error(errorData.error || '画像�EアチE�Eロードに失敗しました');
      }

      const result = await response.json();
      if (!result.success || !result.imageUrl) {
        throw new Error('画像URLが返されませんでした');
      }

      const newImage: ImageInfo = {
        url: result.imageUrl,
        fileName: result.imageFileName || result.fileName,
      };

      // 重褁E��像�E場合�E通知
      if (result.isDuplicate) {
        console.log('🔄 重褁E��像を検�E、既存ファイルを使用:', result.fileName);
      }

      // 画像アチE�Eロード�E琁E��、E�E列に画像を追加するように変更
      const currentStepToUpdate = steps.find(step => step.id === stepId);
      if (currentStepToUpdate) {
        const currentImages = currentStepToUpdate.images ?? [];
        if (currentImages.length < 3) {
          const updatedImages = [...currentImages, newImage];
          onStepUpdate(stepId, { images: updatedImages });
          
          // 成功通知
          const message = result.isDuplicate 
            ? `重褁E��像を検�Eしました。既存�E画僁E"${result.fileName}" を使用します。`
            : '画像が正常にアチE�Eロードされました';
          
          // ト�Eスト通知の代わりにコンソールログ
          console.log('✁E画像アチE�Eロード完亁E', message);
        } else {
          throw new Error('画像�E最大3枚までアチE�EロードできまぁE);
        }
      }

    } catch (error) {
      console.error('❁E画像アチE�Eロード失敁E', error);
      alert(`画像アチE�Eロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingImages(prev => ({ ...prev, [stepId]: false }));
    }
  };

  // 画像削除処琁E��改喁E
  const handleImageRemove = async (stepId: string, imageIndex: number) => {
    console.log('🗑�E�E画像削除:', { stepId, imageIndex });
    const stepToUpdate = steps.find(step => step.id === stepId);
    if (stepToUpdate) {
        const newImages = [...(stepToUpdate.images || [])];
        if (imageIndex >= 0 && imageIndex < newImages.length) {
            const imageToRemove = newImages[imageIndex];
            
            // 削除確誁E
            const confirmDelete = window.confirm(
                `画僁E"${imageToRemove.fileName}" を削除しますか�E�\n` +
                `サーバ�Eからファイルが完�Eに削除され、この操作�E允E��戻せません。`
            );
            
            if (confirmDelete) {
                try {
                    // APIを呼び出してサーバ�Eから画像を削除
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/image/${imageToRemove.fileName}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'サーバ�E上�E画像ファイル削除に失敗しました、E);
                    }

                    // フロントエンド�E状態を更新
                    newImages.splice(imageIndex, 1);
                    onStepUpdate(stepId, { images: newImages });
                    console.log('✁E画像削除完亁E', imageToRemove.fileName);
                    alert(`画僁E"${imageToRemove.fileName}" を削除しました。`);

                } catch (error) {
                    console.error('❁E画像削除エラー:', error);
                    alert(`画像削除に失敗しました: ${error instanceof Error ? error.message : '不�Eなエラー'}`);
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
      console.log('🖼�E�EドラチE��&ドロチE�Eで画像アチE�EローチE', { stepId, fileName: imageFile.name });
      handleImageUpload(stepId, imageFile);
    } else {
      console.warn('⚠�E�EドロチE�Eされたファイルに画像が含まれてぁE��せん');
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
              <span className="font-medium">{step.title || `スチE��チE${step.id}`}</span>
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
                <span className="text-xs text-blue-600">{step.images.length}极E/span>
              </div>
            )}
            {step.type === 'decision' && step.conditions && step.conditions.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">
                  {step.conditions.length}条件
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
        {/* スチE��プ�EチE��ー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-600">スチE��プ詳細</span>
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
            <Label htmlFor={`title-${step.id}`} className="text-base-2x">タイトル</Label>
            <Input
              id={`title-${step.id}`}
              value={step.title}
              onChange={(e) => handleStepFieldChange(step.id, 'title', e.target.value)}
              placeholder="スライド�Eタイトルを�E劁E
              className="text-base-2x h-12"
            />
          </div>
          <div>
            <Label htmlFor={`description-${step.id}`} className="text-base-2x">説昁E/Label>
            <Input
              id={`description-${step.id}`}
              value={step.description}
              onChange={(e) => handleStepFieldChange(step.id, 'description', e.target.value)}
              placeholder="スライド�E説明を入劁E
              className="text-base-2x h-12"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`message-${step.id}`} className="text-base-2x">メチE��ージ</Label>
          <Textarea
            id={`message-${step.id}`}
            value={step.message}
            onChange={(e) => handleStepFieldChange(step.id, 'message', e.target.value)}
            placeholder="表示するメチE��ージを�E劁E
            rows={3}
            className="text-base-2x min-h-24"
          />
        </div>

        {/* 6. 画像セクションのUIを褁E��画像対応に全面皁E��書き換ぁE*/}
        <div>
          <Label className="text-base-2x">画像（最大3枚まで�E�E/Label>
          <p className="text-base-2x text-muted-foreground mt-2">
            対応形弁E JPG, PNG, GIFになります。重褁E��像�E自動的に検�Eされます、E
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
                    console.log(`🖼�E�E画像表示チE��チE�� [${step.id}][${index}]:`, {
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
                          console.error('❁E画像読み込みエラー:', {
                            originalUrl: image.url,
                            convertedUrl: convertedUrl,
                            fileName: image.fileName,
                            error: e
                          });
                          handleImageError(e, image.url);
                        }}
                        onLoad={() => {
                          console.log('✁E画像読み込み成功:', {
                            originalUrl: image.url,
                            convertedUrl: convertedUrl,
                            fileName: image.fileName
                          });
                          // 画像読み込み成功時にエラーフラグをクリア
                          setImageErrors(prev => ({ ...prev, [image.url]: false }));
                        }}
                      />
                    );
                  })()}
                  {imageErrors[image.url] && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white p-2">
                        <X className="h-8 w-8 mx-auto" />
                        <p className="text-xs font-bold mt-1">読込失敁E/p>
                        <p className="text-xs mt-1">{image.fileName}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 画像操作�Eタン */}
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleImageRemove(step.id, index)}
                      className="h-7 w-7 p-0 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                      title="画像を削除"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* 画像情報表示 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                    {image.fileName}
                  </div>
                  
                  {/* 重褁E��像�E場合�E警告表示 */}
                  {(step.images ?? []).filter(img => img.fileName === image.fileName).length > 1 && (
                    <div className="absolute top-1 left-1">
                      <div className="bg-yellow-500 text-white text-xs px-1 py-0.5 rounded">
                        重褁E
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
                      {uploadingImages[step.id] ? 'アチE�Eロード中...' : '画像を追加'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {(step.images?.length || 0)} / 3极E
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ドラチE��&ドロチE�E対忁E
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
            
            {/* 画像管琁E�EヒンチE*/}
            {step.images && step.images.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-base-2x text-blue-700">
                <p className="font-medium">画像管琁E�EヒンチE</p>
                <ul className="mt-2 space-y-2">
                  <li>• 同じファイル名�E画像�E自動的に重褁E��して検�EされまぁE/li>
                  <li>• 重褁E��像�E既存�Eファイルを�E利用してストレージを節紁E��まぁE/li>
                  <li>• 画像�E最大3枚までアチE�EロードできまぁE/li>
                  <li>• 削除した画像�E允E��戻せません</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {step.type === 'decision' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>条件刁E��E/Label>
              <div className="text-sm text-gray-500">
                条件数: {step.conditions?.length || 0}/4
              </div>
            </div>
            <div className="space-y-2">
              {step.conditions?.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="flex items-center space-x-2 p-2 border rounded">
                  <div className="flex-1">
                    <Input
                      value={condition.label}
                      onChange={(e) => onConditionEdit(step.id, conditionIndex, 'label', e.target.value)}
                      placeholder="条件の説昁E
                      className="mb-2"
                    />
                    <Select
                      value={condition.nextId}
                      onValueChange={(value) => onConditionEdit(step.id, conditionIndex, 'nextId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="次のスライドを選抁E />
                      </SelectTrigger>
                      <SelectContent>
                        {steps
                          .filter(s => s.id !== step.id)
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.title || `スライチE${s.id}`}
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
                  条件を追加
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // スチE��プ間の追加ボタンをレンダリング
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
            通常スチE��チE
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddStepBetween(index, 'decision')}
            className="h-6 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            条件刁E��E
          </Button>
        </div>
      </div>
    );
  };

  // アクションボタンコンポ�EネンチE
  const ActionButtons = () => (
    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
      <div className="text-sm text-gray-500">
        スライド数: {steps.length}
      </div>
      <div className="text-sm text-gray-600">
        最後�Eスライド�E自動的に終亁E��ライドになりまぁE
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* チE��チE��惁E�� */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4 flex-shrink-0">
        <p className="text-yellow-800 font-medium">StepEditor チE��チE��惁E��:</p>
        <p className="text-yellow-700 text-sm">受け取ったsteps.length: {steps.length}</p>
        <p className="text-yellow-700 text-sm">steps冁E��: {steps.map(s => `${s.id}:${s.title}`).join(', ')}</p>
        <p className="text-yellow-700 text-sm">expandedSteps: {Object.keys(expandedSteps).length}倁E/p>
      </div>
      
      {/* スライダーコントロール */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-700">スチE��プナビゲーション</span>
          <span className="text-xs text-blue-600">({steps.length}個�EスチE��チE</span>
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
            すべて展開
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedSteps({})}
            className="h-7 px-2 text-xs"
          >
            すべて折りたたみ
          </Button>
        </div>
      </div>

      {/* スチE��プ一覧表示 */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 flex-shrink-0">
        <div className="text-sm font-medium text-gray-700 mb-2">スチE��チE/div>
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
              {index + 1}. {step.title || `スチE��チE${index + 1}`}
            </div>
          ))}
        </div>
      </div>

      {/* スクロール可能なスチE��プ表示エリア - 更新: 2024-01-XX */}
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
                    <p className="text-red-800 font-medium">⚠�E�EスチE��プが空でぁE/p>
                    <p className="text-red-700 text-sm">steps配�EにチE�Eタが含まれてぁE��せん</p>
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
                                スライドを削除
                              </Button>
                            </div>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                    
                    {/* スチE��プ間に追加ボタンを表示�E�最後�EスチE��プ以外！E*/}
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
      
      {/* 保存�Eキャンセルボタン */}
      {onSave && onCancel && (
        <div className="flex justify-end gap-3 pt-4 border-t bg-white mt-4 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            キャンセル
          </Button>
          <Button
            onClick={onSave}
          >
            保孁E
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepEditor;
