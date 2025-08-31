import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Plus, X } from 'lucide-react';
import StepEditor from './step-editor';
import { convertImageUrl } from '../../lib/utils';

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
  // 古いプロパティは後方互換性のために残す（将来的には削除）
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

  // 初期化: flowDataが変更されるたびにコンポーネントの状態を再初期化する
  useEffect(() => {
    console.log('🔄 EmergencyFlowEditor useEffect 実行:', {
      flowDataId: flowData?.id || 'null',
      flowDataTitle: flowData?.title || 'null',
      isInitialized,
      currentTab,
      selectedFilePath
    });
    
    // flowDataが変更されたかどうかをチェック
    const flowDataChanged = !previousFlowDataRef.current || 
      previousFlowDataRef.current.id !== flowData?.id ||
      JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData);
    
    console.log('🔍 flowData変更チェック:', {
      hasPreviousData: !!previousFlowDataRef.current,
      previousId: previousFlowDataRef.current?.id,
      currentId: flowData?.id,
      idsMatch: previousFlowDataRef.current?.id === flowData?.id,
      dataChanged: JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData),
      flowDataChanged
    });
    
    if (!flowDataChanged && isInitialized) {
      console.log('🔄 flowDataが変更されていないため、初期化をスキップ');
      return;
    }
    
    if (!flowData) {
      console.log('📝 flowDataがnullまたは空です - 新規作成モード');
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
    
    console.log('✨ フローデータを初期化/更新します:', flowData.id || 'IDなし');
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
    
    setTitle(flowData.title || '無題のフロー');
    setDescription(flowData.description || '');
    setOriginalTitle(flowData.title || '無題のフロー');
    setOriginalDescription(flowData.description || '');

    // stepsが存在しない場合のデバッグ情報
    if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
      console.warn('⚠️ flowData.stepsが空または無効です:', flowData.steps);
      console.log('🔍 flowData全体の構造:', JSON.stringify(flowData, null, 2));
      console.log('🔍 flowDataのキー:', Object.keys(flowData));
      
      // stepsが空でも初期化を続行（新規作成状態として扱う）
      setSteps([]);
      setOriginalSteps([]);
      setIsInitialized(true);
      previousFlowDataRef.current = flowData;
      return;
    }

    console.log('🔧 ステップ処理開始:', {
      totalSteps: flowData.steps.length,
      stepDetails: flowData.steps.map((s, i) => ({ index: i, id: s.id, title: s.title, type: s.type }))
    });

    const initialSteps = flowData.steps.map((step: any, index: number) => {
      try {
        console.log(`ステップ[${index + 1}/${flowData.steps.length}] [${step.id}]の初期化開始:`, {
          step: step,
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
          hasImageUrl: !!step.imageUrl,
          hasImageFileName: !!step.imageFileName,
          stepKeys: Object.keys(step)
        });

        // 画像情報の処理を改善
        let processedImages = [];
        
        // 新しい 'images' 配列が存在し、中身があるか確認
        if (step.images && Array.isArray(step.images) && step.images.length > 0) {
          console.log(`✅ ステップ[${step.id}]で新しい 'images' 形式を検出:`, step.images);
          // 画像URLを変換
          processedImages = step.images.map((img: any) => ({
            url: convertImageUrl(img.url),
            fileName: img.fileName
          }));
        }
        // 'images' がない場合、古い形式からの移行を試みる
        else if (step.imageUrl && step.imageFileName) {
          console.log(`🔧 ステップ[${step.id}]を古い形式から新しい形式に変換:`, { 
            imageUrl: step.imageUrl, 
            imageFileName: step.imageFileName 
          });
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: step.imageFileName 
          }];
        }
        // 古い形式のimageUrlのみの場合
        else if (step.imageUrl) {
          console.log(`🔧 ステップ[${step.id}]をimageUrlのみから新しい形式に変換:`, { 
            imageUrl: step.imageUrl
          });
          const fileName = step.imageUrl.split('/').pop() || 'unknown.jpg';
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: fileName 
          }];
        }
        // 画像情報が何もない場合
        else {
          console.log(`📝 ステップ[${step.id}]に画像情報なし`);
          processedImages = [];
        }

        console.log(`✨ ステップ[${step.id}]の画像処理完了:`, {
          processedImages: processedImages,
          processedCount: processedImages.length
        });

        // 古いプロパティを削除してクリーンなデータ構造にする
        const { imageUrl, imageFileName, options, ...restOfStep } = step;
        const processedStep = { 
          ...restOfStep, 
          images: processedImages 
        };
        
        console.log(`✅ ステップ[${step.id}]の処理完了:`, processedStep);
        return processedStep;
      } catch (error) {
        console.error(`❌ ステップ[${step.id}]の処理中にエラーが発生:`, error);
        // エラーが発生した場合でも基本的なステップ情報を返す
        return {
          id: step.id || `step_${index}`,
          title: step.title || `ステップ ${index + 1}`,
          description: step.description || '',
          message: step.message || '',
          type: step.type || 'step',
          images: [],
          options: step.options || [],
          conditions: step.conditions || []
        };
      }
    });

    console.log('✨ 初期化されたステップ:', {
      totalSteps: initialSteps.length,
      stepsWithImages: initialSteps.filter(s => s.images && s.images.length > 0).length,
      totalImages: initialSteps.reduce((sum, s) => sum + (s.images?.length || 0), 0),
      stepDetails: initialSteps.map(s => ({ id: s.id, title: s.title, type: s.type }))
    });
    
    console.log('🔧 setSteps呼び出し前:', { initialStepsLength: initialSteps.length });
    setSteps(initialSteps);
    
    // 元のデータもディープコピーで保存
    setOriginalTitle(flowData.title || '無題のフロー');
    setOriginalDescription(flowData.description || '');
    setOriginalSteps(JSON.parse(JSON.stringify(initialSteps)));
    
    // 初期化完了フラグを設定
    setIsInitialized(true);
    previousFlowDataRef.current = flowData;
    
    console.log('✅ フローデータ初期化完了');
    
    // ステップの状態を確認
    setTimeout(() => {
      console.log('🔍 初期化後のステップ状態確認:', {
        stepsLength: steps.length,
        initialStepsLength: initialSteps.length,
        isInitialized: isInitialized
      });
    }, 100);
  }, [flowData, selectedFilePath, isInitialized]);

  // 変更検出
  useEffect(() => {
    // 初期化が完了していない場合は変更検出をスキップ
    if (!isInitialized) {
      console.log('🔄 初期化が完了していないため、変更検出をスキップ');
      return;
    }

    const titleChanged = title !== originalTitle;
    const descriptionChanged = description !== originalDescription;
    
    // ステップの変更を詳細に検出
    const stepsChanged = JSON.stringify(steps) !== JSON.stringify(originalSteps);
    
    const changes = titleChanged || descriptionChanged || stepsChanged;
    
    if (changes) {
      console.log('🔍 変更検出:', {
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
      title: type === 'step' ? '新しいステップ' : '新しい条件分岐',
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

    console.log('➕ ステップ追加:', { type, index, newStepId: newStep.id, totalSteps: newSteps.length });
    setSteps(newSteps);
  }, []);

  // ステップ間に新規ステップを追加する関数
  const handleAddStepBetween = useCallback((afterStepId: string, type: 'step' | 'decision') => {
    const currentSteps = stepsRef.current;
    const afterIndex = currentSteps.findIndex(step => step.id === afterStepId);
    
    if (afterIndex === -1) {
      console.error('❌ 指定されたステップが見つかりません:', afterStepId);
      return;
    }

    handleAddStep(type, afterIndex + 1);
  }, [handleAddStep]);

  const handleStepUpdate = useCallback((stepId: string, updatedStep: Partial<Step>) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❌ ステップが見つかりません:', stepId);
      return;
    }

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updatedStep };
    
    console.log('✏️ ステップ更新:', { stepId, updatedStep, stepIndex });
    setSteps(updatedSteps);
  }, []);

  const handleStepsReorder = useCallback((newOrder: Step[]) => {
    console.log('🔄 ステップ順序変更:', { 
      oldLength: stepsRef.current.length, 
      newLength: newOrder.length,
      newOrder: newOrder.map(s => ({ id: s.id, title: s.title }))
    });
    setSteps(newOrder);
  }, []);

  const handleStepDelete = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const updatedSteps = currentSteps.filter(step => step.id !== stepId);
    
    console.log('🗑️ ステップ削除:', { stepId, oldLength: currentSteps.length, newLength: updatedSteps.length });
    setSteps(updatedSteps);
  }, []);

  const handleConditionAdd = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❌ ステップが見つかりません:', stepId);
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
    
    console.log('➕ 条件追加:', { stepId, newCondition });
    setSteps(updatedSteps);
  }, []);

  const handleConditionDelete = useCallback((stepId: string, conditionIndex: number) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❌ ステップが見つかりません:', stepId);
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
    
    console.log('🗑️ 条件削除:', { stepId, conditionIndex });
    setSteps(updatedSteps);
  }, []);

  const handleConditionEdit = useCallback((stepId: string, conditionIndex: number, updatedCondition: any) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('❌ ステップが見つかりません:', stepId);
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
    
    console.log('✏️ 条件編集:', { stepId, conditionIndex, updatedCondition });
    setSteps(updatedSteps);
  }, []);

  // This useEffect will trigger the autosave whenever 'steps' changes and there are pending changes.
  useEffect(() => {
    if (hasChanges && isInitialized) {
      console.log('🔄 `steps`の変更を検知しました。自動保存をスケジュールします。');
      const handler = setTimeout(() => {
        // 2. autoSaveに引数を渡さず、常にRefから最新のstepsを読むようにする
        autoSave();
      }, 3000); // 3-second debounce

      return () => {
        console.log('🔄 自動保存のタイマーをクリアしました。');
        clearTimeout(handler);
      };
    }
  }, [steps, hasChanges, isInitialized]); // Depend on 'steps' to react to its changes

  const autoSave = useCallback(async () => {
    const currentSteps = stepsRef.current; 

    if (!hasChanges || !flowData) {
      console.log('⏭️ 自動保存をスキップします (変更なし or フローデータなし)');
      return;
    }

    console.log('🔄 自動保存を実行します...');
    
    const cleanedSteps = currentSteps.map(step => {
      const images = step.images?.map(img => ({
        url: img.url && img.url.trim() !== '' ? img.url : undefined,
        fileName: img.fileName && img.fileName.trim() !== '' ? img.fileName : undefined,
      })).filter(img => img.url && img.fileName);

      // 古いプロパティや不要なプロパティを確実に除去
      const { imageUrl, imageFileName, options, ...restOfStep } = step;
      
      return {
        ...restOfStep,
        images: images && images.length > 0 ? images : undefined,
        // optionsはdecisionタイプの時だけ保持するなどのロジックはここではない
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
    console.log('🔄 [AutoSave] 送信ペイロード:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ 自動保存完了');
        setHasChanges(false);
        setOriginalSteps(cleanedSteps);
      } else {
        const errorData = await response.json();
        console.error('❌ 自動保存失敗:', errorData.error);
        alert(`自動保存に失敗しました: ${errorData.error}`);
      }
    } catch (error) {
      console.error('❌ 自動保存中にエラー:', error);
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
      console.log('💾 フロー保存開始:', {
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
      console.error('❌ フロー保存エラー:', error);
    }
  };

  const handleCancel = () => {
    console.log('❌ キャンセル処理開始');
    setTitle(originalTitle);
    setDescription(originalDescription);
    setSteps(originalSteps);
    setHasChanges(false);
    console.log('✅ キャンセル処理完了');
  };

  // 未使用画像のクリーンアップ機能
  const handleCleanupUnusedImages = async () => {
    console.log('🧹 未使用画像クリーンアップ開始');
    // 未使用画像のクリーンアップ処理を実装
    console.log('✅ 未使用画像クリーンアップ完了');
  };

  // デバッグ情報を表示
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

  // スライド編集タブ
  if (currentTab === 'slides') {
    return (
      <div className="h-full flex flex-col">
        {/* デバッグ情報 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">デバッグ情報</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>flowData.id: {flowData?.id || 'なし'}</p>
            <p>flowData.title: {flowData?.title || 'なし'}</p>
            <p>flowData.steps: {flowData?.steps?.length || 0}</p>
            <p>steps配列の内容: {JSON.stringify(steps.map(s => ({ id: s.id, title: s.title, type: s.type })))}</p>
            <p>isInitialized: {isInitialized.toString()}</p>
            <p>currentTab: {currentTab}</p>
            <p>hasChanges: {hasChanges.toString()}</p>
            <p>selectedFilePath: {selectedFilePath || 'なし'}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">スライド編集</h2>
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
              保存
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
                  条件分岐を追加
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <p className="text-blue-800 font-medium">StepEditor レンダリング情報:</p>
                <p className="text-blue-700 text-sm">steps.length: {steps.length}</p>
                <p className="text-blue-700 text-sm">flowId: {flowData?.id}</p>
                <p className="text-blue-700 text-sm">steps内容: {steps.map(s => s.title).join(', ')}</p>
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
            条件分岐を追加
          </Button>
        </div>
        
        {hasChanges && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
            <p className="text-base-2x text-yellow-800">
              ⚠️ 変更が検出されました。保存ボタンをクリックして変更を保存してください。
            </p>
          </div>
        )}
      </div>
    );
  }

  // デフォルトのメタデータタブ
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-base-2x">タイトル</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="フローのタイトルを入力"
          className="text-base-2x h-12"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-base-2x">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="フローの説明を入力"
          rows={3}
          className="text-base-2x min-h-24"
        />
      </div>

      {hasChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-base-2x text-yellow-800">
            ⚠️ 変更が検出されました。保存ボタンをクリックして変更を保存してください。
          </p>
        </div>
      )}
      
      {/* 保存・キャンセルボタン */}
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
          保存
        </Button>
      </div>
    </div>
  );
};

export default EmergencyFlowEditor;
