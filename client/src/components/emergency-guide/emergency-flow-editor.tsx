import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Plus, Trash2, X } from 'lucide-react';
import StepEditor from './step-editor';
import { v4 as uuidv4 } from 'uuid';
import { convertImageUrl } from '../../lib/utils.ts';

interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'condition' | 'end';
  images?: Array<{
    url: string;
    fileName: string;
  }>;
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

interface EmergencyFlowEditorProps {
  flowData: any;
  currentTab: string;
  onSave: (data: any) => void;
  onTabChange: (tab: string) => void;
  selectedFilePath?: string;
}

// Helper function for UTF-8 safe base64 encoding
function utf8_to_b64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('Failed to base64 encode:', str, e);
    return btoa(str); // Fallback to simple btoa
  }
}

const EmergencyFlowEditor: React.FC<EmergencyFlowEditorProps> = ({
  flowData,
  currentTab,
  onSave,
  onTabChange,
  selectedFilePath,
}) => {
  const [title, setTitle] = useState(flowData?.title || '');
  const [description, setDescription] = useState(flowData?.description || '');
  const [steps, setSteps] = useState<Step[]>([]);
  const [originalTitle, setOriginalTitle] = useState(flowData?.title || '');
  const [originalDescription, setOriginalDescription] = useState(flowData?.description || '');
  const [originalSteps, setOriginalSteps] = useState<Step[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFlowDataRef = useRef<any>(null);

  // 1. stepsの最新値を保持するためのRefを追加
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  // 2. flowDataの最新値を保持するためのRefを追加
  const flowDataRef = useRef(flowData);
  useEffect(() => {
    flowDataRef.current = flowData;
  }, [flowData]);

  // 初期匁E flowDataが変更されるたびにコンポ�Eネント�E状態を再�E期化する
  useEffect(() => {
    console.log('🔄 EmergencyFlowEditor useEffect 実衁E', {
      flowDataId: flowData?.id || 'null',
      flowDataTitle: flowData?.title || 'null',
      isInitialized,
      currentTab,
      selectedFilePath
    });
    
    // flowDataが変更されたかどぁE��をチェチE��
    const flowDataChanged = !previousFlowDataRef.current || 
      previousFlowDataRef.current.id !== flowData?.id ||
      JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData);
    
    console.log('🔍 flowData変更チェチE��:', {
      hasPreviousData: !!previousFlowDataRef.current,
      previousId: previousFlowDataRef.current?.id,
      currentId: flowData?.id,
      idsMatch: previousFlowDataRef.current?.id === flowData?.id,
      dataChanged: JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData),
      flowDataChanged
    });
    
    if (!flowDataChanged && isInitialized) {
      console.log('🔄 flowDataが変更されてぁE��ぁE��め、�E期化をスキチE�E');
      return;
    }
    
    if (!flowData) {
      console.log('📝 flowDataがnullまた�E空でぁE- 新規作�EモーチE);
      setTitle('新規フロー');
      setDescription('');
      setSteps([]);
      setOriginalSteps([]);
      setOriginalTitle('新規フロー');
      setOriginalDescription('');
      setIsInitialized(true);
      previousFlowDataRef.current = flowData;
      return;
    }
    
    console.log('✨ フローチE�Eタを�E期化/更新しまぁE', flowData.id || 'IDなぁE);
    console.log('🔍 flowData詳細:', {
      id: flowData.id,
      title: flowData.title,
      description: flowData.description,
      hasSteps: !!flowData.steps,
      stepsType: typeof flowData.steps,
      stepsLength: flowData.steps?.length || 0,
      stepsIsArray: Array.isArray(flowData.steps),
      stepsContent: flowData.steps
    });
    
    setTitle(flowData.title || '無題�Eフロー');
    setDescription(flowData.description || '');
    setOriginalTitle(flowData.title || '無題�Eフロー');
    setOriginalDescription(flowData.description || '');

    // stepsが存在しなぁE��合�EチE��チE��惁E��
    if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
      console.warn('⚠�E�EflowData.stepsが空また�E無効でぁE', flowData.steps);
      console.log('🔍 flowData全体�E構造:', JSON.stringify(flowData, null, 2));
      console.log('🔍 flowDataのキー:', Object.keys(flowData));
      
      // stepsが空でも�E期化を続行（新規作�E状態として扱ぁE��E
      setSteps([]);
      setOriginalSteps([]);
      setIsInitialized(true);
      previousFlowDataRef.current = flowData;
      return;
    }

    console.log('🔧 スチE��プ�E琁E��姁E', {
      totalSteps: flowData.steps.length,
      stepDetails: flowData.steps.map((s, i) => ({ index: i, id: s.id, title: s.title, type: s.type }))
    });

    const initialSteps = flowData.steps.map((step: any, index: number) => {
      try {
        console.log(`スチE��プ[${index + 1}/${flowData.steps.length}] [${step.id}]の初期化開姁E`, {
          step: step,
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
          hasImageUrl: !!step.imageUrl,
          hasImageFileName: !!step.imageFileName,
          stepKeys: Object.keys(step)
        });

        // 画像情報の処琁E��改喁E
        let processedImages = [];
        
        // 新しい 'images' 配�Eが存在し、中身があるか確誁E
        if (step.images && Array.isArray(step.images) && step.images.length > 0) {
          console.log(`✁EスチE��プ[${step.id}]で新しい 'images' 形式を検�E:`, step.images);
          // 画像URLを変換
          processedImages = step.images.map((img: any) => ({
            url: convertImageUrl(img.url),
            fileName: img.fileName
          }));
        }
        // 'images' がなぁE��合、古ぁE��式から�E移行を試みめE
        else if (step.imageUrl && step.imageFileName) {
          console.log(`🔧 スチE��プ[${step.id}]を古ぁE��式から新しい形式に変換:`, { 
            imageUrl: step.imageUrl, 
            imageFileName: step.imageFileName 
          });
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: step.imageFileName 
          }];
        }
        // 古ぁE��式�EimageUrlのみの場吁E
        else if (step.imageUrl) {
          console.log(`🔧 スチE��プ[${step.id}]をimageUrlのみから新しい形式に変換:`, { 
            imageUrl: step.imageUrl
          });
          const fileName = step.imageUrl.split('/').pop() || 'unknown.jpg';
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: fileName 
          }];
        }
        // 画像情報が何もなぁE��吁E
        else {
          console.log(`📝 スチE��プ[${step.id}]に画像情報なし`);
          processedImages = [];
        }

        console.log(`✨ スチE��プ[${step.id}]の画像�E琁E��亁E`, {
          processedImages: processedImages,
          processedCount: processedImages.length
        });

        // 古ぁE�Eロパティを削除してクリーンなチE�Eタ構造にする
        const { imageUrl, imageFileName, options, ...restOfStep } = step;
        const processedStep = { 
          ...restOfStep, 
          images: processedImages 
        };
        
        console.log(`✁EスチE��プ[${step.id}]の処琁E��亁E`, processedStep);
        return processedStep;
      } catch (error) {
        console.error(`❁EスチE��プ[${step.id}]の処琁E��にエラーが発甁E`, error);
        // エラーが発生した場合でも基本皁E��スチE��プ情報を返す
        return {
          id: step.id || `step_${index}`,
          title: step.title || `スチE��チE${index + 1}`,
          description: step.description || '',
          message: step.message || '',
          type: step.type || 'step',
          images: [],
          options: step.options || [],
          conditions: step.conditions || []
        };
      }
    });

    console.log('✨ 初期化されたスチE��チE', {
      totalSteps: initialSteps.length,
      stepsWithImages: initialSteps.filter(s => s.images && s.images.length > 0).length,
      totalImages: initialSteps.reduce((sum, s) => sum + (s.images?.length || 0), 0),
      stepDetails: initialSteps.map(s => ({ id: s.id, title: s.title, type: s.type }))
    });
    
    console.log('🔧 setSteps呼び出し前:', { initialStepsLength: initialSteps.length });
    setSteps(initialSteps);
    
    // 允E�EチE�Eタもディープコピ�Eで保孁E
    setOriginalTitle(flowData.title || '無題�Eフロー');
    setOriginalDescription(flowData.description || '');
    setOriginalSteps(JSON.parse(JSON.stringify(initialSteps)));
    
    // 初期化完亁E��ラグを設宁E
    setIsInitialized(true);
    previousFlowDataRef.current = flowData;
    
    console.log('✁EフローチE�Eタ初期化完亁E);
    
    // スチE��プ�E状態を確誁E
    setTimeout(() => {
      console.log('🔍 初期化後�EスチE��プ状態確誁E', {
        stepsLength: steps.length,
        initialStepsLength: initialSteps.length,
        isInitialized: isInitialized
      });
    }, 100);
  }, [flowData, selectedFilePath, isInitialized]);

  // 変更検�E
  useEffect(() => {
    // 初期化が完亁E��てぁE��ぁE��合�E変更検�EをスキチE�E
    if (!isInitialized) {
      console.log('🔄 初期化が完亁E��てぁE��ぁE��め、変更検�EをスキチE�E');
      return;
    }

    const titleChanged = title !== originalTitle;
    const descriptionChanged = description !== originalDescription;
    
    // スチE��プ�E変更を詳細に検�E
    const stepsChanged = JSON.stringify(steps) !== JSON.stringify(originalSteps);
    
    const changes = titleChanged || descriptionChanged || stepsChanged;
    
    if (changes) {
      console.log('🔍 変更検�E:', {
        titleChanged,
        descriptionChanged,
        stepsChanged,
      });
    }

    setHasChanges(changes);
  }, [title, description, steps, originalTitle, originalDescription, originalSteps, isInitialized]);

  const handleAddStep = useCallback((type: 'step' | 'decision', index?: number) => {
    const currentSteps = stepsRef.current;
    const newStep: Step = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: type === 'step' ? '新しいスチE��チE : '新しい条件刁E��E,
      description: '',
      message: '',
      type: type,
      images: [],
      options: [],
      conditions: []
    };

    let newSteps: Step[];
    if (index !== undefined) {
      newSteps = [...currentSteps.slice(0, index), newStep, ...currentSteps.slice(index)];
    } else {
      newSteps = [...currentSteps, newStep];
    }

    console.log('➁EスチE��プ追加:', { type, index, newStepId: newStep.id, totalSteps: newSteps.length });
    setSteps(newSteps);
  }, []);

  // スチE��プ間に新規スチE��プを追加する関数
  const handleAddStepBetween = useCallback((afterStepId: string, type: 'step' | 'decision') => {
    const currentSteps = stepsRef.current;
    const afterIndex = currentSteps.findIndex(step => step.id === afterStepId);
    
    if (afterIndex === -1) {
      console.error('❁E持E��されたスチE��プが見つかりません:', afterStepId);
      return;
    }

    handleAddStep(type, afterIndex + 1);
  }, [handleAddStep]);

  const handleStepUpdate = useCallback((stepId: string, updatedStep: Partial<Step>) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❁EスチE��プが見つかりません:', stepId);
      return;
    }

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updatedStep };
    
    console.log('✏︁EスチE��プ更新:', { stepId, updatedStep, stepIndex });
    setSteps(updatedSteps);
  }, []);

  const handleStepsReorder = useCallback((newOrder: Step[]) => {
    console.log('🔄 スチE��プ頁E��変更:', { 
      oldLength: stepsRef.current.length, 
      newLength: newOrder.length,
      newOrder: newOrder.map(s => ({ id: s.id, title: s.title }))
    });
    setSteps(newOrder);
  }, []);

  const handleStepDelete = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const updatedSteps = currentSteps.filter(step => step.id !== stepId);
    
    console.log('🗑�E�EスチE��プ削除:', { stepId, oldLength: currentSteps.length, newLength: updatedSteps.length });
    setSteps(updatedSteps);
  }, []);

  const handleConditionAdd = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❁EスチE��プが見つかりません:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const newCondition = {
      label: '',
      nextId: '',
    };

    const updatedStep = {
      ...step,
      conditions: [...(step.conditions || []), newCondition]
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('➁E条件追加:', { stepId, newCondition });
    setSteps(updatedSteps);
  }, []);

  const handleConditionDelete = useCallback((stepId: string, conditionIndex: number) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❁EスチE��プが見つかりません:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const updatedConditions = (step.conditions || []).filter((_, index) => index !== conditionIndex);

    const updatedStep = {
      ...step,
      conditions: updatedConditions
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('🗑�E�E条件削除:', { stepId, conditionIndex });
    setSteps(updatedSteps);
  }, []);

  const handleConditionEdit = useCallback((stepId: string, conditionIndex: number, updatedCondition: any) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❁EスチE��プが見つかりません:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const updatedConditions = [...(step.conditions || [])];
    updatedConditions[conditionIndex] = { ...updatedConditions[conditionIndex], ...updatedCondition };

    const updatedStep = {
      ...step,
      conditions: updatedConditions
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('✏︁E条件編雁E', { stepId, conditionIndex, updatedCondition });
    setSteps(updatedSteps);
  }, []);

  // This useEffect will trigger the autosave whenever 'steps' changes and there are pending changes.
  useEffect(() => {
    if (hasChanges && isInitialized) {
      console.log('🔄 `steps`の変更を検知しました。�E動保存をスケジュールします、E);
      const handler = setTimeout(() => {
        // 2. autoSaveに引数を渡さず、常にRefから最新のstepsを読むようにする
        autoSave();
      }, 3000); // 3-second debounce

      return () => {
        console.log('🔄 自動保存�Eタイマ�Eをクリアしました、E);
        clearTimeout(handler);
      };
    }
  }, [steps, hasChanges, isInitialized]); // Depend on 'steps' to react to its changes

  const autoSave = useCallback(async () => {
    const currentSteps = stepsRef.current; 

    if (!hasChanges || !flowData) {
      console.log('⏭�E�E自動保存をスキチE�EしまぁE(変更なぁEor フローチE�EタなぁE');
      return;
    }

    console.log('🔄 自動保存を実行しまぁE..');
    
    const cleanedSteps = currentSteps.map(step => {
      const images = step.images?.map(img => ({
        url: img.url && img.url.trim() !== '' ? img.url : undefined,
        fileName: img.fileName && img.fileName.trim() !== '' ? img.fileName : undefined,
      })).filter(img => img.url && img.fileName);

      // 古ぁE�EロパティめE��要なプロパティを確実に除去
      const { imageUrl, imageFileName, options, ...restOfStep } = step;
      
      return {
        ...restOfStep,
        images: images && images.length > 0 ? images : undefined,
        // optionsはdecisionタイプ�E時だけ保持するなどのロジチE��はここではなぁE
      };
    });

    // 1. flowDataから古いslidesプロパティを確実に除去する
    const { slides, ...restOfFlowData } = flowData;

    const saveData = {
      ...restOfFlowData,
      title,
      description,
      steps: cleanedSteps,
      updatedAt: new Date().toISOString(),
    };
    
    const payload = {
      filePath: `knowledge-base/troubleshooting/${flowData.id}.json`,
      ...saveData,
    };
    console.log('🔄 [AutoSave] 送信ペイローチE', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✁E自動保存完亁E);
        setHasChanges(false);
        setOriginalSteps(cleanedSteps);
      } else {
        const errorData = await response.json();
        console.error('❁E自動保存失敁E', errorData.error);
        alert(`自動保存に失敗しました: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❁E自動保存中にエラー:', error);
    }
  }, [flowData, title, description, hasChanges]);
  
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    setHasChanges(true);
  }, []);

  const handleSave = async (updatedSteps = steps) => {
    try {
      console.log('💾 フロー保存開姁E', {
        flowId: flowData?.id,
        title,
        description,
        stepsCount: updatedSteps.length,
        hasChanges
      });

      const flowDataToSave = {
        id: flowData?.id,
        title,
        description,
        triggerKeywords: flowData?.triggerKeywords || [],
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };

      console.log('💾 保存するデータ:', flowDataToSave);
      onSave(flowDataToSave);
    } catch (error) {
      console.error('❁Eフロー保存エラー:', error);
    }
  };

  const handleCancel = () => {
    console.log('❁Eキャンセル処琁E��姁E);
    setTitle(originalTitle);
    setDescription(originalDescription);
    setSteps(originalSteps);
    setHasChanges(false);
    console.log('✁Eキャンセル処琁E��亁E);
  };

  // 未使用画像�EクリーンアチE�E機�E
  const handleCleanupUnusedImages = async () => {
    console.log('🧹 未使用画像クリーンアチE�E開姁E);
    // 未使用画像�EクリーンアチE�E処琁E��実裁E
    console.log('✁E未使用画像クリーンアチE�E完亁E);
  };

  // チE��チE��惁E��を表示
  console.log('🔄 EmergencyFlowEditor レンダリング:', {
    flowDataId: flowData?.id,
    flowDataTitle: flowData?.title,
    hasFlowData: !!flowData,
    stepsLength: steps.length,
    isInitialized: isInitialized,
    currentTab: currentTab,
    hasChanges: hasChanges,
    title: title,
    description: description,
    selectedFilePath: selectedFilePath
  });

  // スライド編雁E��チE
  if (currentTab === 'slides') {
    return (
      <div className="h-full flex flex-col">
        {/* チE��チE��惁E�� */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">チE��チE��惁E��</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>flowData.id: {flowData?.id || 'なぁE}</p>
            <p>flowData.title: {flowData?.title || 'なぁE}</p>
            <p>flowData.steps: {flowData?.steps?.length || 0}</p>
            <p>steps配�Eの冁E��: {JSON.stringify(steps.map(s => ({ id: s.id, title: s.title, type: s.type })))}</p>
            <p>isInitialized: {isInitialized.toString()}</p>
            <p>currentTab: {currentTab}</p>
            <p>hasChanges: {hasChanges.toString()}</p>
            <p>selectedFilePath: {selectedFilePath || 'なぁE}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">スライド編雁E/h2>
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={!hasChanges}
              size="sm"
            >
              保孁E
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {steps.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">スライドがありません</p>
              <div className="flex justify-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('step')}
                  className="h-10 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  通常スライドを追加
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('decision')}
                  className="h-10 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  条件刁E��を追加
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <p className="text-blue-800 font-medium">StepEditor レンダリング惁E��:</p>
                <p className="text-blue-700 text-sm">steps.length: {steps.length}</p>
                <p className="text-blue-700 text-sm">flowId: {flowData?.id}</p>
                <p className="text-blue-700 text-sm">steps冁E��: {steps.map(s => s.title).join(', ')}</p>
              </div>
              <div className="flex-1 min-h-0">
                <StepEditor
                  steps={steps}
                  onStepUpdate={handleStepUpdate}
                  onStepsReorder={handleStepsReorder}
                  onStepDelete={handleStepDelete}
                  onConditionAdd={handleConditionAdd}
                  onConditionDelete={handleConditionDelete}
                  onConditionEdit={handleConditionEdit}
                  flowId={flowData?.id}
                  onAddStepBetween={handleAddStepBetween}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* スライド追加ボタン */}
        <div className="flex justify-center gap-4 mt-4 p-6 bg-gray-50 rounded-lg border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddStep('step')}
            className="h-12 px-6 text-base-2x"
          >
            <Plus className="w-6 h-6 mr-2" />
            通常スライドを追加
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddStep('decision')}
            className="h-12 px-6 text-base-2x"
          >
            <Plus className="w-6 h-6 mr-2" />
            条件刁E��を追加
          </Button>
        </div>
        
        {hasChanges && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
            <p className="text-base-2x text-yellow-800">
              ⚠�E�E変更が検�Eされました。保存�EタンをクリチE��して変更を保存してください、E
            </p>
          </div>
        )}
      </div>
    );
  }

  // チE��ォルト�EメタチE�EタタチE
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-base-2x">タイトル</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="フローのタイトルを�E劁E
          className="text-base-2x h-12"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-base-2x">説昁E/Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="フローの説明を入劁E
          rows={3}
          className="text-base-2x min-h-24"
        />
      </div>

      {hasChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-base-2x text-yellow-800">
            ⚠�E�E変更が検�Eされました。保存�EタンをクリチE��して変更を保存してください、E
          </p>
        </div>
      )}
      
      {/* 保存�Eキャンセルボタン */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="text-base-2x h-12 px-6"
        >
          キャンセル
        </Button>
        <Button
          onClick={() => handleSave()}
          disabled={!hasChanges}
          className="text-base-2x h-12 px-6"
        >
          保孁E
        </Button>
      </div>
    </div>
  );
};

export default EmergencyFlowEditor;
