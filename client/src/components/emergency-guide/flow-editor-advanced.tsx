import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useToast } from '../../hooks/use-toast';
import {
  Plus,
  Trash2,
  X,
  Save,
  Upload,
  GripVertical,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { saveFlowData, FlowData } from '../../lib/flow-save-manager';
import { buildImageUrl, handleImageError } from '../../lib/image-utils';

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

// FlowDataは flow-save-manager からimport

interface FlowditorAdvancedProps {
  flowId?: string;
  onSave: (data: FlowData) => void;
  onCancel: () => void;
}

const FlowditorAdvanced: React.FC<FlowditorAdvancedProps> = ({
  flowId,
  onSave,
  onCancel,
}) => {
  const { toast } = useToast();
  const [flowData, setFlowData] = useState<FlowData>({
    id: flowId || uuidv4(),
    title: flowId ? 'フロー編集' : '新規フロー',
    description: '',
    triggerKeywords: [],
    steps: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);

  // フローデータの読み込み
  useEffect(() => {
    if (flowId) {
      loadFlowData();
    }
  }, [flowId]);

  const loadFlowData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 フローデータ読み込み開始', flowId);

      // 統一APIクライアントを使用 - /detail/:id エンドポイントを使用
      const { buildApiUrl } = await import('../../lib/api');
      const detailUrl = buildApiUrl(`/emergency-flow/detail/${flowId}`);

      console.log('🌐 フロー詳細API URL:', detailUrl);

      const response = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ emergency-flow API エラーレスポンス:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`フロー詳細の取得に失敗しました: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 emergency-flow APIレスポンス:', result);

      // /detail/:id エンドポイントは success: true, data: {...} 形式で返す
      const data = result.success && result.data ? result.data : result;

      // データの完全性チェック
      if (!data || !data.id) {
        throw new Error('不完全なフローデータが返されました');
      }

      console.log('🔍 受信したデータの構造:', {
        hasId: !!data.id,
        hasTitle: !!data.title,
        hasDescription: !!data.description,
        hasSteps: !!data.steps,
        stepsType: Array.isArray(data.steps) ? 'array' : typeof data.steps,
        stepsLength: data.steps?.length,
        dataKeys: Object.keys(data)
      });

      // データ構造の正規化
      if (data.steps && Array.isArray(data.steps)) {
        data.steps = data.steps.map(step => ({
          ...step,
          images: step.images || [],
          conditions: step.conditions || [],
        }));
      } else {
        console.warn('⚠️ stepsが配列ではありません、空配列で初期化します');
        data.steps = [];
      }

      console.log('✅ フローデータ読み込み完了', {
        id: data.id,
        title: data.title,
        stepsCount: data.steps.length,
        stepsWithImages: data.steps.filter(step => step.images && step.images.length > 0).length
      });

      // 画像情報の詳細ログ
      data.steps.forach((step: any, index: number) => {
        if (step.images && step.images.length > 0) {
          console.log(`📸 読み込み済みステップ[${index}]の画像情報:`, {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: step.images.length,
            images: step.images.map((img: any) => ({
              fileName: img.fileName,
              url: img.url?.substring(0, 50) + '...'
            }))
          });
        }
      });

      setFlowData(data);
    } catch (error) {
      console.error('❌ フローデータ読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: 'フローデータの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ステップの追加
  const addStep = (type: 'step' | 'decision', index?: number) => {
    const newStep: Step = {
      id: uuidv4(),
      type,
      title: `新しい${type === 'step' ? 'ステップ' : '条件分岐'}`,
      description: '',
      message: '',
      images: [],
      ...(type === 'decision' && { conditions: [{ label: '', nextId: '' }] }),
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

  // ステップの削除
  const deleteStep = (stepId: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
    }));
  };

  // ステップの更新
  const updateStep = (stepId: string, updates: Partial<Step>) => {
    console.log('🔄 updateStep 呼び出し', {
      stepId,
      updates,
      isImageUpdate: 'images' in updates,
      imageCount: updates.images?.length || 0,
      currentFlowData: {
        id: flowData.id,
        stepsCount: flowData.steps.length,
        stepsWithImages: flowData.steps.filter(s => s.images && s.images.length > 0).length
      }
    });

    setFlowData(prev => {
      const updated = {
        ...prev,
        steps: prev.steps.map(step => {
          if (step.id === stepId) {
            const updatedStep = { ...step, ...updates };
            console.log('🔄 ステップ更新詳細:', {
              stepId,
              beforeUpdate: {
                id: step.id,
                title: step.title,
                hasImages: !!step.images,
                imagesCount: step.images?.length || 0,
                images: step.images?.map(img => ({
                  fileName: img.fileName,
                  url: img.url?.substring(0, 50) + '...'
                })) || []
              },
              afterUpdate: {
                id: updatedStep.id,
                title: updatedStep.title,
                hasImages: !!updatedStep.images,
                imagesCount: updatedStep.images?.length || 0,
                images: updatedStep.images?.map(img => ({
                  fileName: img.fileName,
                  url: img.url?.substring(0, 50) + '...'
                })) || []
              }
            });
            return updatedStep;
          }
          return step;
        }),
      };

      const updatedStep = updated.steps.find(s => s.id === stepId);

      console.log('🔄 updateStep 完了', {
        stepId,
        updatedStep: updatedStep ? {
          id: updatedStep.id,
          title: updatedStep.title,
          hasImages: !!updatedStep.images,
          imagesCount: updatedStep.images?.length || 0,
          images: updatedStep.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 50) + '...'
          })) || []
        } : null,
        allStepsImages: updated.steps.map(s => ({
          stepId: s.id,
          stepTitle: s.title,
          imagesCount: s.images?.length || 0,
          images: s.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 50) + '...'
          })) || []
        }))
      });

      return updated;
    });

    // 状態更新後の確認（同期的に実行）
    console.log('🔍 updateStep 状態更新後の確認', {
      stepId,
      updatedFlowData: {
        id: flowData.id,
        stepsCount: flowData.steps.length,
        stepsWithImages: flowData.steps.filter(s => s.images && s.images.length > 0).length,
        allStepsImages: flowData.steps.map(s => ({
          stepId: s.id,
          stepTitle: s.title,
          imagesCount: s.images?.length || 0,
          images: s.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 50) + '...'
          })) || []
        }))
      }
    });
  };

  // ドラッグ&ドロップ機能
  const handleDragStart = (e: React.Dragvent, stepId: string) => {
    setDraggedStepId(stepId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.Dragvent) => {
    e.preventDefault();
    e.dataTransfer.dropffect = 'move';
  };

  const handleDrop = (e: React.Dragvent, targetStepId: string) => {
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

  // 画像のアップロード処理
  const handleImageUpload = async (stepId: string, files: FileList) => {
    const currentStep = flowData.steps.find(s => s.id === stepId);
    const currentImages = currentStep?.images || [];

    if (currentImages.length + files.length > 3) {
      alert('画像は最大3枚までアップロードできます');
      return;
    }

    const uploadedImages = [];
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const { buildApiUrl } = await import('../../lib/api');
        const uploadUrl = buildApiUrl('/emergency-flow/upload-image');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`アップロード失敗 ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.imageUrl) {
          uploadedImages.push({
            url: result.imageUrl,
            fileName: result.fileName || result.imageFileName,
          });
        }
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        alert(`画像${file.name} のアップロードに失敗しました`);
      }
    }

    if (uploadedImages.length === 0) return;

    // フローデータを更新
    const updatedFlowData = {
      ...flowData,
      steps: flowData.steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            images: [...currentImages, ...uploadedImages],
          };
        }
        return step;
      }),
    };

    setFlowData(updatedFlowData);

    // 自動保存（ファイル一覧に戻らない場合）
    setTimeout(async () => {
      try {
        const result = await saveFlowData(updatedFlowData);
        if (result.success) {
          // 画像追加時はonSaveを呼ばず、内部状態のみ更新
          console.log('画像追加後の自動保存完了');
        }
      } catch (error) {
        console.error('自動保存エラー:', error);
      }
    }, 100);
  };

  // 画像の削除
  const removeImage = async (stepId: string, imageIndex: number) => {
    const step = flowData.steps.find(s => s.id === stepId);
    if (!step || !step.images || imageIndex >= step.images.length) {
      return;
    }

    const imageToRemove = step.images[imageIndex];

    // 削除確認
    const confirmDelete = window.confirm(
      `画像"${imageToRemove.fileName}" を削除しますか？\n` +
        `サーバーからファイルが完全に削除され、この操作は元に戻せません。`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      // サーバーから画像を削除するAPIエンドポイントが存在する場合
      if (imageToRemove.fileName && !imageToRemove.fileName.startsWith('blob:')) {
        const { buildApiUrl } = await import('../../lib/api');
        const deleteUrl = buildApiUrl(`/emergency-flow/image/${imageToRemove.fileName}`);

        console.log('🗑️ flow-editor-advanced 画像削除URL:', deleteUrl);

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('サーバーからの画像削除に失敗しましたが、フロントエンドからは削除します');
        } else {
          console.log('✅ サーバーからの画像削除完了', imageToRemove.fileName);
        }
      }

      // フロントエンドの状態を更新
      setFlowData(prev => ({
        ...prev,
        steps: prev.steps.map(step => {
          if (step.id === stepId) {
            const newImages = [...step.images];
            newImages.splice(imageIndex, 1);
            return { ...step, images: newImages };
          }
          return step;
        }),
      }));

      console.log('✅ 画像削除完了', imageToRemove.fileName);
    } catch (error) {
      console.error('❌ 画像削除エラー:', error);
      alert(`画像削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 条件の追加
  const addCondition = (stepId: string) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId && step.type === 'decision') {
          return {
            ...step,
            conditions: [...(step.conditions || []), { label: '', nextId: '' }],
          };
        }
        return step;
      }),
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
            conditions: step.conditions.filter(
              (_, index) => index !== conditionIndex
            ),
          };
        }
        return step;
      }),
    }));
  };

  // 条件の更新
  const updateCondition = (
    stepId: string,
    conditionIndex: number,
    field: 'label' | 'nextId',
    value: string
  ) => {
    setFlowData(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.id === stepId && step.conditions) {
          const newConditions = [...step.conditions];
          newConditions[conditionIndex] = {
            ...newConditions[conditionIndex],
            [field]: value,
          };
          return { ...step, conditions: newConditions };
        }
        return step;
      }),
    }));
  };

  // 保存処理
  const handleSave = async () => {
    console.log('🚀 handleSave 関数が呼び出されました');
    try {
      setIsLoading(true);
      console.log('⏳ isLoading をtrue に設定');

      console.log('💾 保存開始', {
        id: flowData.id,
        title: flowData.title,
        stepsCount: flowData.steps.length
      });

      // 統一された保存処理を使用
      const flowDataForSave = {
        ...flowData,
        triggerKeywords: flowData.triggerKeywords || [flowData.title]
      };
      const result = await saveFlowData(flowDataForSave, {
        validateImages: true,
        logDetails: true
      });

      if (result.success) {
        console.log('✅ 保存完了', result.data?.title);

        // 成功時はコールバック呼び出し
        onSave(result.data || flowData);

        toast({
          title: '成功',
          description: 'フローが保存されました',
        });
      } else {
        throw new Error(result.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('❌ 保存エラー:', error);
      toast({
        title: 'エラー',
        description: `保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && flowId) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6 h-full flex flex-col'>
      <Card className='flex-shrink-0'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>{flowId ? 'フロー編集' : '新規フロー作成'}</span>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={onCancel}>
                <X className='h-4 w-4 mr-1' />
                キャンセル
              </Button>
              <Button onClick={() => {
                console.log('🔥 保存ボタンがクリックされました');
                handleSave();
              }} disabled={isLoading}>
                <Save className='h-4 w-4 mr-1' />
                保存
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* フロー基本情報 */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='title'>タイトル</Label>
              <Input
                id='title'
                value={flowData.title}
                onChange={e =>
                  setFlowData(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder='フローのタイトル'
              />
            </div>
            <div>
              <Label htmlFor='description'>説明</Label>
              <Input
                id='description'
                value={flowData.description}
                onChange={e =>
                  setFlowData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='フローの説明'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ステップ一覧 */}
      <Card className='flex-1 flex flex-col min-h-0'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>ステップ一覧</span>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => addStep('step')}
              >
                <Plus className='h-4 w-4 mr-1' />
                ステップ追加
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => addStep('decision')}
              >
                <Plus className='h-4 w-4 mr-1' />
                条件分岐追加
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-hidden'>
          <ScrollArea className='h-full'>
            <div className='space-y-4 pr-4'>
              {flowData.steps &&
                flowData.steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <Card
                          className={`cursor-move transition-all border-4 border-blue-500 ${
                            draggedStepId === step.id ? 'opacity-50' : ''
                          }`}
                          draggable
                          onDragStart={e => handleDragStart(e, step.id)}
                          onDragOver={handleDragOver}
                          onDrop={e => handleDrop(e, step.id)}
                        >
                          <CardContent className='p-4'>
                            <div className='flex items-start gap-3'>
                              <GripVertical className='h-5 w-5 text-gray-400 mt-1 flex-shrink-0' />
                              <div className='flex-1 space-y-4'>
                                {/* ステップのヘッダー */}
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    <span className='text-sm font-medium text-gray-500'>
                                      {index + 1}
                                    </span>
                                    <span className='text-xs px-2 py-1 rounded bg-blue-100 text-blue-800'>
                                      {step.type === 'step'
                                        ? 'ステップ'
                                        : '条件分岐'}
                                    </span>
                                  </div>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => deleteStep(step.id)}
                                    className='text-red-600 hover:text-red-700'
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </div>

                                {/* ステップの内容 */}
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                  <div>
                                    <Label>タイトル</Label>
                                    <Input
                                      value={step.title}
                                      onChange={e =>
                                        updateStep(step.id, {
                                          title: e.target.value,
                                        })
                                      }
                                      placeholder='ステップのタイトル'
                                    />
                                  </div>
                                  <div>
                                    <Label>説明</Label>
                                    <Input
                                      value={step.description}
                                      onChange={e =>
                                        updateStep(step.id, {
                                          description: e.target.value,
                                        })
                                      }
                                      placeholder='ステップの説明'
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label>メッセージ</Label>
                                  <Textarea
                                    value={step.message}
                                    onChange={e =>
                                      updateStep(step.id, {
                                        message: e.target.value,
                                      })
                                    }
                                    placeholder='ステップの詳細メッセージ'
                                    rows={3}
                                  />
                                </div>

                                {/* 画像アップロード処理 */}
                                <div>
                                  <Label>画像</Label>
                                  <div className='flex flex-wrap gap-2 mt-2'>
                                    {(() => {
                                      const images = step.images || [];
                                      const validImages = images.filter(image => image && image.url && image.url.trim() !== '');

                                      return validImages.map((image, imageIndex) => {
                                        // 統一された画像URL変換を使用
                                        const imageUrl = buildImageUrl(image.url);

                                        return (
                                          <div key={`${step.id}-${imageIndex}`} className='relative'>
                                            <img
                                              src={imageUrl}
                                              alt={image.fileName || '画像'}
                                              className='w-20 h-20 object-cover rounded border'
                                              crossOrigin="anonymous"
                                              onError={e => {
                                                console.error('❌ 画像読み込みエラー (flow-editor-advanced):', {
                                                  originalUrl: image.url,
                                                  convertedUrl: imageUrl,
                                                  fileName: image.fileName,
                                                  stepId: step.id,
                                                  imageIndex
                                                });
                                                handleImageError(e, image.url);
                                              }}
                                              onLoad={() => {
                                                console.log('✅ 画像読み込み成功 (flow-editor-advanced):', {
                                                  fileName: image.fileName,
                                                  convertedUrl: imageUrl
                                                });
                                              }}
                                            />
                                            <Button
                                              variant='ghost'
                                              size='sm'
                                              className='absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600'
                                              onClick={() => removeImage(step.id, imageIndex)}
                                            >
                                              <X className='h-3 w-3' />
                                            </Button>
                                          </div>
                                        );
                                      });
                                    })()}
                                    {(step.images || []).filter(image => image && image.url && image.url.trim() !== '').length < 3 && (
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => {
                                          const input =
                                            document.createElement('input');
                                          input.type = 'file';
                                          input.multiple = true;
                                          input.accept = 'image/*';
                                          input.onchange = e => {
                                            const files = (
                                              e.target as HTMLInputElement
                                            ).files;
                                            if (files) {
                                              handleImageUpload(step.id, files);
                                            }
                                          };
                                          input.click();
                                        }}
                                        className='w-20 h-20 flex flex-col items-center justify-center'
                                      >
                                        <Upload className='h-4 w-4' />
                                        <span className='text-xs'>追加</span>
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* 条件分岐 */}
                                {step.type === 'decision' && (
                                  <div>
                                    <Label>条件分岐</Label>
                                    <div className='space-y-2'>
                                      {(step.conditions || []).map(
                                        (condition, conditionIndex) => (
                                          <div
                                            key={conditionIndex}
                                            className='flex gap-2'
                                          >
                                            <Input
                                              value={condition.label}
                                              onChange={e =>
                                                updateCondition(
                                                  step.id,
                                                  conditionIndex,
                                                  'label',
                                                  e.target.value
                                                )
                                              }
                                              placeholder='条件のラベル'
                                              className='flex-1'
                                            />
                                            <Input
                                              value={condition.nextId}
                                              onChange={e =>
                                                updateCondition(
                                                  step.id,
                                                  conditionIndex,
                                                  'nextId',
                                                  e.target.value
                                                )
                                              }
                                              placeholder='次のステップID'
                                              className='flex-1'
                                            />
                                            <Button
                                              variant='ghost'
                                              size='sm'
                                              onClick={() =>
                                                removeCondition(
                                                  step.id,
                                                  conditionIndex
                                                )
                                              }
                                              className='text-red-600 hover:text-red-700'
                                            >
                                              <Trash2 className='h-4 w-4' />
                                            </Button>
                                          </div>
                                        )
                                      )}
                                      <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => addCondition(step.id)}
                                      >
                                        <Plus className='h-4 w-4 mr-1' />
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
                        <ContextMenuItem
                          onClick={() => addStep('step', index + 1)}
                        >
                          ステップを下に挿入
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => addStep('decision', index + 1)}
                        >
                          条件分岐を下に挿入
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => deleteStep(step.id)}
                          className='text-red-600'
                        >
                          削除
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>

                    {/* ステップ間の追加ボタン */}
                    <div className='flex items-center justify-center gap-4 my-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-1/2'
                        onClick={() => addStep('step', index + 1)}
                      >
                        <Plus className='h-4 w-4 mr-1' />
                        ステップ追加
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-1/2'
                        onClick={() => addStep('decision', index + 1)}
                      >
                        <Plus className='h-4 w-4 mr-1' />
                        条件分岐追加
                      </Button>
                    </div>
                  </React.Fragment>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 保存とキャンセルボタン */}
      <div className='mt-6 flex justify-end gap-4 pt-4 border-t'>
        <Button
          variant='outline'
          onClick={onCancel}
          className='h-12 px-6'
        >
          キャンセル
        </Button>
        <Button
          onClick={() => {
            console.log('🔥 保存ボタンがクリックされました');
            handleSave();
          }}
          className='h-12 px-6'
        >
          <Save className='w-4 h-4 mr-2' />
          保存
        </Button>
      </div>
    </div>
  );
};

export default FlowditorAdvanced;
