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

interface EmergencyFlowEditorProps {
  flowData: any;
  currentTab: string;
  onSave: (data: any) => void;
  onTabChange: (tab: string) => void;
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

// Helper function for creating encrypted URLs
function createEncryptedUrl(fileName: string): string {
  try {
    const encryptedFileName = encryptUri(fileName);
    return `http://localhost:3001/api/emergency-flow/image/emergency-guide/${encryptedFileName}`;
  } catch (e) {
    console.error('❌ URLの暗号化に失敗:', e);
    return ''; // Return empty string on failure
  }
}

const EmergencyFlowEditor: React.FC<EmergencyFlowEditorProps> = ({
  flowData,
  currentTab,
  onSave,
  onTabChange,
}) => {
  const [title, setTitle] = useState(flowData?.title || '');
  const [description, setDescription] = useState(flowData?.description || '');
  const [steps, setSteps] = useState<Step[]>([]);
  const [originalTitle, setOriginalTitle] = useState(flowData?.title || '');
  const [originalDescription, setOriginalDescription] = useState(flowData?.description || '');
  const [originalSteps, setOriginalSteps] = useState<Step[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const isInitializedRef = useRef(false);

  // 1. stepsの最新値を保持するためのRefを追加
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  // 初期化: flowDataが変更されるたびにコンポーネントの状態を再初期化する
  useEffect(() => {
    if (flowData) {
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

      // stepsが存在しない場合の処理
      if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
        console.warn('⚠️ flowData.stepsが空または無効です:', flowData.steps);
        setSteps([]);
        setOriginalSteps([]);
        return;
      }

      const initialSteps = flowData.steps.map((step: any) => {
        console.log(`ステップ[${step.id}]の初期化開始:`, {
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
          hasImageUrl: !!step.imageUrl,
          hasImageFileName: !!step.imageFileName
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
        const { imageUrl, imageFileName, ...restOfStep } = step;
        return { 
          ...restOfStep, 
          images: processedImages 
        };
      });

      console.log('✨ 初期化されたステップ:', {
        totalSteps: initialSteps.length,
        stepsWithImages: initialSteps.filter(s => s.images && s.images.length > 0).length,
        totalImages: initialSteps.reduce((sum, s) => sum + (s.images?.length || 0), 0)
      });
      
      setSteps(initialSteps);
      
      // 元のデータもディープコピーで保存
      setOriginalTitle(flowData.title || '無題のフロー');
      setOriginalDescription(flowData.description || '');
      setOriginalSteps(JSON.parse(JSON.stringify(initialSteps)));
    }
  }, [flowData]);

  // 変更検出
  useEffect(() => {
    // 初期化が完了していない場合は変更検出をスキップ
    if (!originalTitle && !originalDescription && originalSteps.length === 0 && steps.length > 0) {
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
  }, [title, description, steps, originalTitle, originalDescription, originalSteps]);

  const handleAddStep = useCallback((type: 'step' | 'decision', index?: number) => {
    const currentSteps = stepsRef.current;
    console.log('➕ スライド追加開始:', { type, index, currentStepsLength: currentSteps.length });
    
    const newStep = {
      id: `step_${Date.now()}`,
      title: '',
      description: '',
      message: '',
      type,
      images: [],
      options: type === 'decision' ? [] : undefined,
      conditions: type === 'decision' ? [
        {
          label: '',
          nextId: '',
        }
      ] : undefined,
    };

    let updatedSteps;
    if (typeof index === 'number') {
      // 指定された位置にスライドを挿入
      updatedSteps = [...currentSteps.slice(0, index + 1), newStep, ...currentSteps.slice(index + 1)];
    } else {
      // 末尾に追加
      updatedSteps = [...currentSteps, newStep];
    }

    console.log('➕ スライド追加完了:', { 
      newLength: updatedSteps.length, 
      newStep: { 
        id: newStep.id, 
        type: newStep.type,
        images: newStep.images 
      }
    });
    
    // stepsRefを更新
    stepsRef.current = updatedSteps;
    setSteps(updatedSteps);
    setHasChanges(true);
  }, []);

  // ステップ間に新規ステップを追加する関数
  const handleAddStepBetween = useCallback((index: number, type: 'step' | 'decision') => {
    console.log('➕ ステップ間追加:', { index, type });
    const currentSteps = stepsRef.current;
    
    const newStep = {
      id: `step_${Date.now()}`,
      title: '',
      description: '',
      message: '',
      type,
      images: [],
      options: type === 'decision' ? [] : undefined,
      conditions: type === 'decision' ? [
        {
          label: '',
          nextId: '',
        }
      ] : undefined,
    };

    // 指定された位置にステップを挿入
    const updatedSteps = [...currentSteps.slice(0, index + 1), newStep, ...currentSteps.slice(index + 1)];
    
    console.log('➕ ステップ間追加完了:', { 
      index, 
      type, 
      newLength: updatedSteps.length, 
      newStep: { 
        id: newStep.id, 
        type: newStep.type 
      }
    });
    
    // stepsRefを更新
    stepsRef.current = updatedSteps;
    setSteps(updatedSteps);
    setHasChanges(true);
  }, []);

  const handleStepUpdate = useCallback((stepId: string, updatedData: Partial<Step>) => {
    setSteps(currentSteps =>
      currentSteps.map(step => {
        if (step.id === stepId) {
          // updatedDataにimagesが含まれていない場合、既存のimagesを保持する
          const newImages = updatedData.images !== undefined ? updatedData.images : step.images;
          
          return { 
            ...step, 
            ...updatedData,
            images: newImages
          };
        }
        return step;
      })
    );
    setHasChanges(true);
  }, []);

  const handleStepsReorder = useCallback((reorderedSteps: any[]) => {
    setSteps(reorderedSteps);
    setHasChanges(true);
  }, []);

  const handleStepDelete = useCallback((stepId: string) => {
    setSteps(currentSteps => currentSteps.filter(step => step.id !== stepId));
    setHasChanges(true);
  }, []);

  const handleConditionAdd = useCallback((stepId: string) => {
    setSteps(currentSteps => currentSteps.map(step => {
      if (step.id === stepId && step.type === 'decision' && (!step.conditions || step.conditions.length < 4)) {
        return {
          ...step,
          conditions: [...(step.conditions || []), { label: '', nextId: '' }],
        };
      }
      return step;
    }));
    setHasChanges(true);
  }, []);

  const handleConditionDelete = useCallback((stepId: string, conditionIndex: number) => {
    setSteps(currentSteps => currentSteps.map(step => {
      if (step.id === stepId && step.type === 'decision') {
        return {
          ...step,
          conditions: (step.conditions || []).filter((_, index) => index !== conditionIndex),
        };
      }
      return step;
    }));
    setHasChanges(true);
  }, []);

  const handleConditionEdit = useCallback((stepId: string, conditionIndex: number, field: 'label' | 'nextId', value: string) => {
    setSteps(currentSteps => currentSteps.map(step => {
      if (step.id === stepId && step.conditions) {
        const updatedConditions = step.conditions.map((cond, index) => {
          if (index === conditionIndex) {
            return { ...cond, [field]: value };
          }
          return cond;
        });
        return { ...step, conditions: updatedConditions };
      }
      return step;
    }));
    setHasChanges(true);
  }, []);

  // This useEffect will trigger the autosave whenever 'steps' changes and there are pending changes.
  useEffect(() => {
    if (hasChanges && isInitializedRef.current) {
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
  }, [steps, hasChanges]); // Depend on 'steps' to react to its changes

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
      if (!flowData) {
        console.error('❌ 保存エラー: フローデータが存在しません');
        return;
      }
      
      const cleanedSteps = updatedSteps.map(step => {
        // 画像URLを正しく変換
        const images = step.images?.map(img => {
          const convertedUrl = convertImageUrl(img.url);
          console.log(`💾 保存時画像URL変換 [${step.id}]:`, {
            originalUrl: img.url,
            convertedUrl: convertedUrl,
            fileName: img.fileName
          });
          return {
            url: img.url && img.url.trim() !== '' ? convertedUrl : undefined,
            fileName: img.fileName && img.fileName.trim() !== '' ? img.fileName : undefined,
          };
        }).filter(img => img.url && img.fileName);
        
        // 古いプロパティを削除
        const { imageUrl, imageFileName, ...restOfStep } = step;
        return {
          ...restOfStep,
          images: images && images.length > 0 ? images : undefined,
        };
      });

      // 2. flowDataから古いslidesプロパティを確実に除去する
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
      console.log('💾 [ManualSave] 送信ペイロード:', JSON.stringify(payload, null, 2));
      
      console.log('💾 保存データ詳細:', {
        flowId: saveData.id,
        title: saveData.title,
        stepsCount: saveData.steps.length,
        stepsWithImages: saveData.steps.filter(s => s.images && s.images.length > 0).length,
        imageUrls: saveData.steps.map(s => ({
          stepId: s.id,
          images: s.images?.map(img => ({ url: img.url, fileName: img.fileName }))
        }))
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${saveData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setOriginalTitle(title);
        setOriginalDescription(description);
        setOriginalSteps(cleanedSteps);
        setHasChanges(false);
        console.log('✅ 保存成功');
      } else {
        const errorData = await response.json();
        console.error('❌ 保存失敗:', response.status, errorData.error);
        alert(`保存に失敗しました: ${errorData.error || 'サーバーエラー'}`);
      }
    } catch (error) {
      console.error('❌ 保存処理中の致命的なエラー:', error);
      alert(`保存中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const handleCancel = () => {
    // 元のデータに戻す
    setTitle(originalTitle);
    setDescription(originalDescription);
    setSteps(originalSteps);
    setHasChanges(false);
  };

  // 未使用画像のクリーンアップ機能
  const handleCleanupUnusedImages = async () => {
    try {
      const confirmCleanup = window.confirm(
        '未使用の画像ファイルを削除しますか？\n' +
        'この操作は元に戻せません。\n' +
        '現在使用中の画像は削除されません。'
      );
      
      if (!confirmCleanup) return;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/cleanup-unused-images`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('クリーンアップに失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(
          `クリーンアップが完了しました。\n` +
          `削除された画像: ${result.removedCount}個\n` +
          `総画像数: ${result.totalImages}個\n` +
          `使用中画像: ${result.usedImages}個`
        );
      } else {
        throw new Error(result.error || 'クリーンアップに失敗しました');
      }
    } catch (error) {
      console.error('クリーンアップエラー:', error);
      alert(`クリーンアップに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (currentTab === 'slides') {
    return (
      <div className="space-y-4">
        {/* デバッグ情報とボタン */}
        <div className="p-4 bg-gray-100 rounded text-base-2x flex items-center justify-between">
          <div>
            <p>デバッグ: hasChanges = {hasChanges.toString()}</p>
            <p>ステップ数: {steps.length}</p>
            <p>元のステップ数: {originalSteps.length}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCleanupUnusedImages}
              size="sm"
              className="h-12 text-base-2x px-4"
              title="未使用画像を削除"
            >
              🧹 クリーンアップ
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              size="sm"
              className="h-12 text-base-2x px-4"
            >
              キャンセル
            </Button>
            <Button
              onClick={() => handleSave()}
              size="sm"
              className="h-12 text-base-2x px-4"
            >
              保存
            </Button>
          </div>
        </div>
        
        {/* StepEditorは一度だけレンダリング */}
        <div className="flex-grow overflow-y-auto pr-4 max-h-[calc(100vh-300px)]">
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
        
        {/* スライド追加ボタン */}
        <div className="flex justify-center gap-4 my-6 p-6 bg-gray-50 rounded-lg border">
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
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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