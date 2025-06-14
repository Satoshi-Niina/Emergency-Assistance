import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, Edit, Check, X, GitBranch, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'end';
  imageUrl?: string;
  options: Array<{
    text: string;
    nextStepId: string;
    isTerminal: boolean;
    conditionType: 'yes' | 'no' | 'other';
    condition?: string; // 条件分岐の条件
  }>;
}

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: FlowStep[];
  updatedAt?: string;
}

interface EmergencyFlowEditorProps {
  flowData: FlowData | null;
  onSave?: (data: FlowData) => void;
  selectedFilePath?: string | null; // 🎯 編集対象のファイルパス
}

const EmergencyFlowEditor: React.FC<EmergencyFlowEditorProps> = ({ flowData, onSave, selectedFilePath }) => {
  const { toast } = useToast();
  const [editedFlow, setEditedFlow] = useState<FlowData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState<string | null>(null);

  // flowDataが変更されたら編集用データを更新
  useEffect(() => {
    console.log('🔄 flowData変更検知:', flowData);

    if (flowData) {
      // slidesからstepsへの変換も含めたデータの整合性を確認・修正
      const processedData = {
        ...flowData,
        steps: (flowData.steps || flowData.slides || [])?.map(step => {
          console.log(`🔍 ステップ ${step.id} (${step.type}) のオプション:`, step.options);
          
          // 条件分岐ノードの場合、既存のoptionsを保持し、不足があれば補完
          if (step.type === 'decision') {
            const existingOptions = step.options || [];
            console.log(`📊 条件分岐 ${step.id} の既存オプション数:`, existingOptions.length);
            
            // 既存のオプションデータを詳細に検証・修正
            const validatedOptions = existingOptions.length > 0 ? existingOptions.map((option, index) => {
              console.log(`🔧 オプション ${index + 1} 修正前:`, option);
              
              const validatedOption = {
                text: option.text || (option.conditionType === 'yes' ? 'はい' : option.conditionType === 'no' ? 'いいえ' : 'その他'),
                nextStepId: option.nextStepId || '',
                isTerminal: Boolean(option.isTerminal),
                conditionType: (option.conditionType as 'yes' | 'no' | 'other') || 'other',
                condition: option.condition || ''
              };
              
              console.log(`✅ オプション ${index + 1} 修正後:`, validatedOption);
              return validatedOption;
            }) : [
              { 
                text: 'はい', 
                nextStepId: '', 
                isTerminal: false, 
                conditionType: 'yes' as const,
                condition: ''
              },
              { 
                text: 'いいえ', 
                nextStepId: '', 
                isTerminal: false, 
                conditionType: 'no' as const,
                condition: ''
              }
            ];
            
            console.log(`🎯 条件分岐 ${step.id} の最終オプション:`, validatedOptions);
            
            return {
              ...step,
              // description と message の統一
              description: step.description || step.message || '',
              message: step.message || step.description || '',
              options: validatedOptions
            };
          } else {
            // 通常のステップの場合
            return {
              ...step,
              description: step.description || step.message || '',
              message: step.message || step.description || '',
              options: step.options || [{
                text: '次へ', 
                nextStepId: '', 
                isTerminal: false, 
                conditionType: 'other' as const,
                condition: ''
              }]
            };
          }
        }) || []
      };

      console.log('📊 flowDataをsetEditedFlowに設定:', {
        id: processedData.id,
        title: processedData.title,
        stepsCount: processedData.steps?.length || 0,
        updatedAt: processedData.updatedAt,
        decisionSteps: processedData.steps?.filter(s => s.type === 'decision').length || 0,
        decisionStepsDetail: processedData.steps?.filter(s => s.type === 'decision').map(s => ({
          id: s.id,
          title: s.title,
          optionsCount: s.options?.length || 0
        }))
      });
      
      setEditedFlow(processedData);
    } else {
      // 新規作成の場合
      const newFlow: FlowData = {
        id: `flow_${Date.now()}`,
        title: '新しい応急処置フロー',
        description: '',
        triggerKeywords: [],
        steps: [{
          id: 'start',
          title: '開始',
          description: '',
          message: 'フローを開始します',
          type: 'start',
          options: [{
            text: '次へ',
            nextStepId: '',
            isTerminal: false,
            conditionType: 'other'
          }]
        }],
        updatedAt: new Date().toISOString()
      };
      console.log('🆕 新規フロー作成:', newFlow);
      setEditedFlow(newFlow);
    }
  }, [flowData]);

  // データ更新イベントリスナーを追加（無限ループ防止）
  useEffect(() => {
    let isRefreshing = false; // 再取得中フラグ

    const handleDataRefresh = (event: any) => {
      if (isRefreshing) return; // 再取得中は無視

      const { data, flowId } = event.detail;
      console.log('🔄 flowDataRefreshedイベント受信:', { flowId, dataId: data?.id });

      if (data && editedFlow && data.id === editedFlow.id) {
        console.log('✅ 編集中フローのデータを更新');
        setEditedFlow({ ...data });
      }
    };

    // 強制的なデータ再取得処理（防御的プログラミング）
    const handleForceRefresh = async (event: any) => {
      if (isRefreshing) {
        console.log('⚠️ 既に再取得中のため、リクエストをスキップします');
        return;
      }

      const { flowId } = event.detail;
      console.log('🔄 強制データ再取得要求:', flowId);

      if (editedFlow && (flowId === editedFlow.id || !flowId)) {
        isRefreshing = true; // 再取得開始
        console.log('💾 保存後のデータを再取得します...');

        try {
          // タイムアウト付きでリクエスト実行
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

          const timestamp = Date.now();
          const response = await fetch(`/api/emergency-flow/get/${editedFlow.id}?ts=${timestamp}&_force=true`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const result = await response.json();
            const freshData = result.data || result;

            console.log('🔄 再取得したデータ:', {
              id: freshData.id,
              title: freshData.title,
              stepsCount: freshData.steps?.length || 0,
              updatedAt: freshData.updatedAt
            });

            // データの整合性チェック
            if (freshData.id === editedFlow.id) {
              setEditedFlow({ ...freshData });
              console.log('✅ エディターのデータを更新しました');
            }
          } else {
            console.error('❌ データ再取得に失敗:', response.status);
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.warn('⚠️ データ再取得がタイムアウトしました');
          } else {
            console.error('❌ データ再取得エラー:', error);
          }
        } finally {
          isRefreshing = false; // 再取得終了
        }
      }
    };

    window.addEventListener('flowDataRefreshed', handleDataRefresh);
    window.addEventListener('forceRefreshFlowData', handleForceRefresh);

    return () => {
      window.removeEventListener('flowDataRefreshed', handleDataRefresh);
      window.removeEventListener('forceRefreshFlowData', handleForceRefresh);
      isRefreshing = false; // クリーンアップ
    };
  }, [editedFlow?.id]); // editedFlow.idのみに依存

  // 保存処理の改善
  const handleSave = useCallback(async () => {
    if (!editedFlow) return;

    setIsSaving(true);
    try {
      // 保存データの検証
      if (!editedFlow.title.trim()) {
        throw new Error('タイトルを入力してください');
      }

      if (editedFlow.steps.length === 0) {
        throw new Error('少なくとも1つのステップが必要です');
      }

      // 保存データを準備（steps/slides統一とデータ整合性確保）
      const saveData = {
        ...editedFlow,
        steps: editedFlow.steps.map(step => ({
          ...step,
          // description と message を同期
          description: step.description || step.message || '',
          message: step.message || step.description || '',
          // 空の値をクリーンアップ
          imageUrl: step.imageUrl || '',
          options: step.options.map(option => ({
            ...option,
            text: option.text || '',
            nextStepId: option.nextStepId || '',
            condition: option.condition || '',
            isTerminal: Boolean(option.isTerminal),
            conditionType: option.conditionType || 'other'
          }))
        })),
        // slidesフィールドも同期（後方互換性）
        slides: editedFlow.steps.map(step => ({
          ...step,
          description: step.description || step.message || '',
          message: step.message || step.description || '',
          imageUrl: step.imageUrl || ''
        })),
        updatedAt: new Date().toISOString(),
        savedTimestamp: Date.now()
      };

      // 🎯 保存時にファイルパスを明示的に指定
      const requestBody = {
        ...saveData,
        filePath: selectedFilePath || `knowledge-base/troubleshooting/${editedFlow.id}.json`
      };

      console.log('💾 保存リクエスト:', {
        id: saveData.id,
        title: saveData.title,
        filePath: requestBody.filePath,
        stepsCount: saveData.steps?.length || 0
      });

      const response = await fetch(`/api/emergency-flow/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `保存に失敗しました (${response.status})`);
      }

      const result = await response.json();

      if (result.success) {
      console.log(`✅ 保存成功:`, result);

      // 🧹 保存後にキャッシュを強制クリア
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 保存後キャッシュクリア完了');
        } catch (cacheError) {
          console.warn('⚠️ キャッシュクリアエラー:', cacheError);
        }
      }

      toast({
        title: "保存完了",
        description: `フロー「${editedFlow.title}」が保存されました (${saveData.steps?.length || 0}ステップ)`,
      });

      // 保存されたデータでローカル状態を更新
      if (onSave) {
        onSave(saveData);
      }

      // 他のコンポーネントに保存完了を通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowSaved', { 
          detail: { 
            savedData: saveData, 
            filePath: selectedFilePath,
            timestamp: Date.now(),
            stepsCount: saveData.steps?.length || 0
          }
        }));

        // フロー一覧の強制更新を要求
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList'));
      }
    }

      // 保存されたデータで現在の編集データを更新
      setEditedFlow(saveData);

      // 保存成功後は強制的にエディターデータを更新
      console.log('💾 保存成功 - エディターデータを直接更新');
      setEditedFlow({ ...saveData });

      // 🔄 完全なファイル検証を実行
      try {
        const verifyResponse = await fetch(`/api/emergency-flow-router/get/${editedFlow.id}?ts=${Date.now()}&verify=true`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('🔍 保存後検証データ:', {
            id: verifyData.id,
            stepsCount: verifyData.steps?.length || 0,
            updatedAt: verifyData.updatedAt
          });

          // 検証データと保存データが一致するかチェック
          const stepsMatch = (verifyData.steps?.length || 0) === (saveData.steps?.length || 0);
          console.log(`📊 データ整合性チェック: ${stepsMatch ? '一致' : '不一致'}`);

          if (!stepsMatch) {
            console.warn('⚠️ 保存データと検証データが不一致 - 再保存を試行');
            // 再保存を試行
            const retryResponse = await fetch(`/api/emergency-flow-router/save/${editedFlow.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              },
              body: JSON.stringify(saveData)
            });

            if (retryResponse.ok) {
              console.log('✅ 再保存完了');
            }
          }
        }
      } catch (verifyError) {
        console.warn('⚠️ 保存後検証エラー:', verifyError);
      }

      // 🧹 ブラウザキャッシュを完全クリア
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 ブラウザキャッシュ完全クリア完了');
        } catch (cacheError) {
          console.warn('⚠️ キャッシュクリアエラー:', cacheError);
        }
      }

      // データ更新イベントを発行（重複防止で確実に反映）
      setTimeout(() => {
        // イベント発行の重複を防ぐ
        const eventDetail = { 
          flowId: editedFlow.id, 
          data: saveData,
          timestamp: Date.now(),
          forceRefresh: true,
          source: 'emergency-flow-editor'
        };

        window.dispatchEvent(new CustomEvent('flowDataUpdated', { detail: eventDetail }));

        // フロー一覧の更新は1回だけ実行
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList', {
          detail: { 
            forceRefresh: true,
            timestamp: Date.now(),
            updatedFlowId: editedFlow.id,
            preventLoop: true
          }
        }));

        console.log('🔄 保存後イベント発行完了（重複防止）');
      }, 500);



    } catch (error) {
      console.error('❌ 保存エラー:', error);
      toast({
        title: "保存エラー",
        description: error instanceof Error ? error.message : "フローの保存に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [editedFlow, onSave, toast, selectedFilePath]);

  // タイトル更新
  const updateTitle = (newTitle: string) => {
    if (editedFlow) {
      setEditedFlow({
        ...editedFlow,
        title: newTitle
      });
    }
  };

  // 説明更新
  const updateDescription = (newDescription: string) => {
    if (editedFlow) {
      setEditedFlow({
        ...editedFlow,
        description: newDescription
      });
    }
  };

  // ステップ更新
  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    if (!editedFlow) return;

    setEditedFlow({
      ...editedFlow,
      steps: editedFlow.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    });
  };

  // ステップタイトル更新
  const updateStepTitle = (stepId: string, newTitle: string) => {
    updateStep(stepId, { title: newTitle });
  };

  // 新しいステップ追加
  const addStep = (type: FlowStep['type']) => {
    if (!editedFlow) return;

    const newStepId = `step_${Date.now()}`;
    const newStep: FlowStep = {
      id: newStepId,
      title: type === 'decision' ? '新しい条件分岐' : '新しいステップ',
      description: '',
      message: '',
      type,
      options: type === 'decision' ? [
        { 
          text: 'はい', 
          nextStepId: '', 
          isTerminal: false, 
          conditionType: 'yes',
          condition: ''
        },
        { 
          text: 'いいえ', 
          nextStepId: '', 
          isTerminal: false, 
          conditionType: 'no',
          condition: ''
        }
      ] : [
        { 
          text: '次へ', 
          nextStepId: '', 
          isTerminal: false, 
          conditionType: 'other',
          condition: ''
        }
      ]
    };

    setEditedFlow({
      ...editedFlow,
      steps: [...editedFlow.steps, newStep]
    });
  };

  // ステップ削除
  const deleteStep = (stepId: string) => {
    if (!editedFlow) return;

    setEditedFlow({
      ...editedFlow,
      steps: editedFlow.steps.filter(step => step.id !== stepId)
    });

    setShowDeleteDialog(false);
    setStepToDelete(null);
  };

  // オプション更新（条件分岐対応）
  const updateOption = (stepId: string, optionIndex: number, updates: Partial<FlowStep['options'][0]>) => {
    if (!editedFlow) return;

    setEditedFlow({
      ...editedFlow,
      steps: editedFlow.steps.map(step =>
        step.id === stepId ? {
          ...step,
          options: step.options.map((option, index) =>
            index === optionIndex ? { ...option, ...updates } : option
          )
        } : step
      )
    });
  };

  // オプション追加
  const addOption = (stepId: string) => {
    if (!editedFlow) return;

    const step = editedFlow.steps.find(s => s.id === stepId);
    if (!step) return;

    const newOption = {
      text: step.type === 'decision' ? '新しい条件' : '新しい選択肢',
      nextStepId: '',
      isTerminal: false,
      conditionType: step.type === 'decision' ? 'other' as const : 'other' as const,
      condition: ''
    };

    updateStep(stepId, {
      options: [...step.options, newOption]
    });
  };

  // 条件分岐専用の選択肢追加
  const addDecisionOption = (stepId: string) => {
    if (!editedFlow) return;

    const step = editedFlow.steps.find(s => s.id === stepId);
    if (!step || step.type !== 'decision') return;

    // 最大5つまでの制限
    if (step.options.length >= 5) {
      toast({
        title: "追加できません",
        description: "条件分岐では最大5つまでの選択肢が設定できます",
        variant: "destructive"
      });
      return;
    }

    // 既存の条件タイプを確認
    const existingTypes = step.options.map(opt => opt.conditionType);
    let newConditionType: 'yes' | 'no' | 'other' = 'other';
    let newText = '新しい条件';

    // まだ存在しない条件タイプを優先的に追加
    if (!existingTypes.includes('yes')) {
      newConditionType = 'yes';
      newText = 'はい';
    } else if (!existingTypes.includes('no')) {
      newConditionType = 'no';
      newText = 'いいえ';
    } else {
      // "その他"タイプを連番で追加
      const otherCount = existingTypes.filter(type => type === 'other').length;
      newConditionType = 'other';
      newText = `その他の状況${otherCount > 0 ? ` ${otherCount + 1}` : ''}`;
    }

    const newOption = {
      text: newText,
      nextStepId: '',
      isTerminal: false,
      conditionType: newConditionType,
      condition: ''
    };

    updateStep(stepId, {
      options: [...step.options, newOption]
    });

    toast({
      title: "条件項目を追加しました",
      description: `新しい条件「${newText}」を追加しました。編集して詳細を設定してください。`
    });
  };

  // 条件分岐の条件タイプを変更
  const changeConditionType = (stepId: string, optionIndex: number, newType: 'yes' | 'no' | 'other') => {
    if (!editedFlow) return;

    const step = editedFlow.steps.find(s => s.id === stepId);
    if (!step || step.type !== 'decision') return;

    // 他のオプションで同じ条件タイプが使われていないかチェック
    const existingTypes = step.options.map((opt, idx) => idx !== optionIndex ? opt.conditionType : null);
    if (existingTypes.includes(newType)) {
      toast({
        title: "警告",
        description: "この条件タイプは既に使用されています",
        variant: "destructive"
      });
      return;
    }

    // デフォルトテキストを設定
    let defaultText = '';
    switch (newType) {
      case 'yes':
        defaultText = 'はい';
        break;
      case 'no':
        defaultText = 'いいえ';
        break;
      case 'other':
        defaultText = 'その他の状況';
        break;
    }

    updateOption(stepId, optionIndex, { 
      conditionType: newType,
      text: defaultText
    });
  };

  // オプション削除
  const removeOption = (stepId: string, optionIndex: number) => {
    if (!editedFlow) return;

    const step = editedFlow.steps.find(s => s.id === stepId);
    if (!step) return;

    // 条件分岐の場合は最低2つの選択肢が必要
    if (step.type === 'decision' && step.options.length <= 2) {
      toast({
        title: "削除できません",
        description: "条件分岐では最低2つの選択肢が必要です",
        variant: "destructive"
      });
      return;
    }

    // 通常のステップの場合は最低1つの選択肢が必要
    if (step.type !== 'decision' && step.options.length <= 1) {
      toast({
        title: "削除できません",
        description: "最低1つの選択肢が必要です",
        variant: "destructive"
      });
      return;
    }

    updateStep(stepId, {
      options: step.options.filter((_, index) => index !== optionIndex)
    });

    toast({
      title: "選択肢を削除しました",
      description: `選択肢 ${optionIndex + 1} を削除しました`
    });
  };

  // キーワード更新
  const updateKeywords = (keywords: string) => {
    if (!editedFlow) return;

    const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    setEditedFlow({
      ...editedFlow,
      triggerKeywords: keywordArray
    });
  };

  if (!editedFlow) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedFlow.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="text-xl font-bold"
                placeholder="フロータイトルを入力"
              />
              <Button size="sm" onClick={() => setEditingTitle(false)}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingTitle(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{editedFlow.title}</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      {/* 説明 */}
      <div>
        <Label>説明</Label>
        <Textarea
          value={editedFlow.description}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="フローの説明を入力してください"
        />
      </div>

      {/* トリガーキーワード */}
      <div>
        <Label>トリガーキーワード（カンマ区切り）</Label>
        <Input
          value={editedFlow.triggerKeywords.join(', ')}
          onChange={(e) => updateKeywords(e.target.value)}
          placeholder="エンジン停止, 再始動不可"
        />
      </div>

      {/* ステップ追加ボタン */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => addStep('step')}>
          <Plus className="w-4 h-4 mr-2" />
          ステップ追加
        </Button>
        <Button variant="outline" onClick={() => addStep('decision')}>
          <GitBranch className="w-4 h-4 mr-2" />
          条件分岐追加
        </Button>
      </div>

      {/* ステップ一覧 */}
      <div className="space-y-4">
        {editedFlow.steps.map((step, index) => (
          <Card key={step.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={step.type === 'decision' ? 'secondary' : 'default'}>
                    {step.type === 'start' && '開始'}
                    {step.type === 'step' && 'ステップ'}
                    {step.type === 'decision' && '条件分岐'}
                    {step.type === 'end' && '終了'}
                  </Badge>
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStepToDelete(step.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* ステップタイトル編集 */}
              <div>
                <Label>タイトル</Label>
                <Input
                  value={step.title}
                  onChange={(e) => updateStepTitle(step.id, e.target.value)}
                  placeholder="ステップのタイトル"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>説明</Label>
                  <Textarea
                    value={step.description}
                    onChange={(e) => updateStep(step.id, { description: e.target.value })}
                    placeholder="ステップの詳細な説明"
                  />
                </div>
                <div>
                  <Label>メッセージ</Label>
                  <Textarea
                    value={step.message}
                    onChange={(e) => updateStep(step.id, { message: e.target.value })}
                    placeholder="ユーザーに表示するメッセージ"
                  />
                </div>

                {/* 画像URL */}
                <div>
                  <Label>画像URL（オプション）</Label>
                  <Input
                    value={step.imageUrl || ''}
                    onChange={(e) => updateStep(step.id, { imageUrl: e.target.value })}
                    placeholder="画像のURL"
                  />
                </div>

                {/* オプション */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">
                      {step.type === 'decision' ? '条件分岐の選択肢' : '選択肢'}
                      <span className="text-sm text-gray-500 ml-1">
                        ({step.options.length}個)
                      </span>
                    </Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => addOption(step.id)}>
                        <Plus className="w-4 h-4 mr-1" />
                        選択肢追加
                      </Button>
                      {step.type === 'decision' && step.options.length < 5 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-blue-600 border-blue-300"
                          onClick={() => addDecisionOption(step.id)}
                          title={`条件分岐を追加 (${step.options.length}/5)`}
                        >
                          <GitBranch className="w-4 h-4 mr-1" />
                          分岐追加 ({step.options.length}/5)
                        </Button>
                      )}
                    </div>
                  </div>

                  {step.type === 'decision' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        <strong>条件分岐ノード:</strong> ユーザーの状況に応じて異なるステップに進む分岐点です。
                        各選択肢に具体的な条件を設定してください。
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        💡 新規作成時も再編集時も同じように条件項目の追加・変更・削除が可能です
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => addDecisionOption(step.id)}
                          disabled={step.options.length >= 5}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          条件項目追加
                        </Button>
                        <span className="text-xs text-gray-500 self-center">
                          ({step.options.length}/5 項目)
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(() => {
                      console.log(`🎯 ステップ ${step.id} の選択肢表示:`, {
                        stepType: step.type,
                        optionsCount: step.options?.length || 0,
                        options: step.options?.map(opt => ({
                          text: opt.text,
                          conditionType: opt.conditionType,
                          nextStepId: opt.nextStepId,
                          condition: opt.condition
                        }))
                      });
                      return null;
                    })()}
                    {step.options && step.options.length > 0 ? (
                      step.options.map((option, optionIndex) => {
                        console.log(`📝 選択肢 ${optionIndex + 1} レンダリング:`, {
                          text: option.text,
                          conditionType: option.conditionType,
                          nextStepId: option.nextStepId,
                          condition: option.condition,
                          isTerminal: option.isTerminal
                        });
                        
                        return (
                      <div key={`${step.id}-option-${optionIndex}`} className={`border-2 rounded-lg p-4 space-y-3 ${
                        step.type === 'decision' 
                          ? option.conditionType === 'yes' 
                            ? 'border-green-200 bg-green-50' 
                            : option.conditionType === 'no'
                            ? 'border-red-200 bg-red-50'
                            : 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}>)
                        {/* ヘッダー部分 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              option.conditionType === 'yes' ? 'default' :
                              option.conditionType === 'no' ? 'destructive' : 'secondary'
                            }>
                              {step.type === 'decision' 
                                ? `条件分岐 ${optionIndex + 1}` 
                                : `選択肢 ${optionIndex + 1}`
                              }
                            </Badge>
                            {step.type === 'decision' && (
                              <Badge variant="outline" className="text-xs">
                                {option.conditionType === 'yes' && '✓ はい'}
                                {option.conditionType === 'no' && '✗ いいえ'}
                                {option.conditionType === 'other' && '→ その他'}
                              </Badge>
                            )}
                          </div>
                          {((step.type === 'decision' && step.options.length > 2) || 
                            (step.type !== 'decision' && step.options.length > 1)) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => removeOption(step.id, optionIndex)}
                              title="この選択肢を削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* 選択肢テキスト */}
                        <div>
                          <Label className="text-sm font-medium">
                            {step.type === 'decision' ? '分岐条件の表示テキスト' : '選択肢のテキスト'}
                          </Label>
                          <Input
                            value={option.text || ''}
                            onChange={(e) => updateOption(step.id, optionIndex, { text: e.target.value })}
                            placeholder={
                              step.type === 'decision' 
                                ? option.conditionType === 'yes' 
                                  ? "はい（例: エンジンが完全に停止している）"
                                  : option.conditionType === 'no'
                                  ? "いいえ（例: まだ不安定に動作している）"
                                  : "その他の状況（例: 判断できない）"
                                : "選択肢のテキスト"
                            }
                            className="mt-1"
                          />
                        </div>

                        {/* 条件分岐の詳細条件 */}
                        {step.type === 'decision' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-1">
                                詳細条件・説明
                                <Badge variant="outline" className="text-xs">
                                  {option.conditionType === 'yes' && '✓ はい条件'}
                                  {option.conditionType === 'no' && '✗ いいえ条件'}  
                                  {option.conditionType === 'other' && '→ その他条件'}
                                </Badge>
                              </Label>
                              <Textarea
                                key={`${step.id}-condition-${optionIndex}-${option.conditionType}`}
                                value={option.condition || ''}
                                onChange={(e) => {
                                  console.log(`🔧 条件更新: ${step.id} オプション ${optionIndex + 1}:`, e.target.value);
                                  updateOption(step.id, optionIndex, { condition: e.target.value });
                                }}
                                placeholder={
                                  option.conditionType === 'yes' 
                                    ? "「はい」の場合の詳細条件を記述してください:\n• エンジンが完全に停止している\n• 再始動を試みても反応がない\n• 異音や異臭がない\n• 計器類に異常表示がない"
                                    : option.conditionType === 'no'
                                    ? "「いいえ」の場合の詳細条件を記述してください:\n• エンジンが不安定に動作している\n• 回転数が不安定\n• 異音がする\n• 煙や異臭がある"
                                    : "その他の状況の詳細を記述してください:\n• 上記の条件に当てはまらない\n• 状況が判断できない\n• 専門家の判断が必要\n• 緊急事態の可能性"
                                }
                                rows={4}
                                className="mt-1 border-2 border-yellow-200 focus:border-yellow-400"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                💡 具体的な条件を箇条書きで記述すると、ユーザーが判断しやすくなります
                              </div>
                            </div>

                            {/* 条件項目編集（新規作成時と同じ機能） */}
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <Label className="text-sm font-medium text-blue-800 mb-2 block">
                                条件項目の詳細設定
                              </Label>
                              
                              {/* 現在のデータ表示 */}
                              <div className="mb-3">
                                <Label className="text-xs text-blue-700">現在の条件テキスト</Label>
                                <div className="bg-white border rounded p-2 text-sm">
                                  {option.text || '未設定'}
                                </div>
                              </div>

                              {/* 条件テキスト編集 */}
                              <div className="mb-3">
                                <Label className="text-xs text-blue-700">条件テキストを編集</Label>
                                <Input
                                  value={option.text || ''}
                                  onChange={(e) => updateOption(step.id, optionIndex, { text: e.target.value })}
                                  placeholder={
                                    option.conditionType === 'yes' 
                                      ? "はい（例: エンジンが完全に停止している）"
                                      : option.conditionType === 'no'
                                      ? "いいえ（例: まだ不安定に動作している）"
                                      : "その他の状況（例: 判断できない）"
                                  }
                                  className="mt-1 text-sm"
                                />
                              </div>

                              {/* 関係スライド選択 */}
                              <div className="mb-3">
                                <Label className="text-xs text-blue-700">関係スライド（遷移先）</Label>
                                <select
                                  value={option.nextStepId || ''}
                                  onChange={(e) => updateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                                  className="w-full mt-1 p-2 border rounded text-sm bg-white"
                                >
                                  <option value="">遷移先を選択してください</option>
                                  {editedFlow?.steps
                                    .filter(s => s.id !== step.id) // 自分自身を除外
                                    .map((targetStep, targetIndex) => (
                                    <option key={targetStep.id} value={targetStep.id}>
                                      スライド{targetIndex + 1}: {targetStep.title}
                                    </option>
                                  ))}
                                  <option value="end">終了</option>
                                </select>
                                {option.nextStepId && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    選択中: {option.nextStepId === 'end' ? '終了' : 
                                      editedFlow?.steps.find(s => s.id === option.nextStepId)?.title || 'スライドが見つかりません'}
                                  </div>
                                )}
                              </div>

                              {/* 追加設定 */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-blue-700">条件タイプ</Label>
                                  <select
                                    value={option.conditionType}
                                    onChange={(e) => changeConditionType(step.id, optionIndex, e.target.value as any)}
                                    className="w-full mt-1 p-1 border rounded text-xs bg-white"
                                  >
                                    <option value="yes">✓ はい（肯定的な回答）</option>
                                    <option value="no">✗ いいえ（否定的な回答）</option>
                                    <option value="other">→ その他（中立・不明）</option>
                                  </select>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`terminal-edit-${step.id}-${optionIndex}`}
                                    checked={option.isTerminal}
                                    onChange={(e) => updateOption(step.id, optionIndex, { isTerminal: e.target.checked })}
                                    className="mr-2"
                                  />
                                  <Label htmlFor={`terminal-edit-${step.id}-${optionIndex}`} className="text-xs text-blue-700">
                                    フロー終了
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 設定項目 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium">次のステップID</Label>
                            <Input
                              value={option.nextStepId}
                              onChange={(e) => updateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                              placeholder="step_xxx または end"
                              className="mt-1"
                            />
                          </div>

                          {step.type === 'decision' && (
                            <div>
                              <Label className="text-sm font-medium">条件タイプ</Label>
                              <select
                                value={option.conditionType}
                                onChange={(e) => changeConditionType(step.id, optionIndex, e.target.value as any)}
                                className="w-full border rounded px-3 py-2 mt-1 bg-white"
                              >
                                <option value="yes">✓ はい（肯定的な回答）</option>
                                <option value="no">✗ いいえ（否定的な回答）</option>
                                <option value="other">→ その他（中立・不明）</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* 終了フラグ */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                          <input
                            type="checkbox"
                            id={`terminal-${step.id}-${optionIndex}`}
                            checked={option.isTerminal}
                            onChange={(e) => updateOption(step.id, optionIndex, { isTerminal: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`terminal-${step.id}-${optionIndex}`} className="text-sm">
                            この選択肢でフローを終了する
                          </Label>
                          {option.isTerminal && (
                            <Badge variant="outline" className="text-xs text-red-600">
                              終了
                            </Badge>
                          )}
                        </div>
                      </div>
                        );
                      })
                    ) : (
                      /* 条件分岐で選択肢がない場合のヒント */
                      step.type === 'decision' && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                          <GitBranch className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">条件分岐の選択肢を追加してください</p>
                          <p className="text-xs text-gray-400 mt-1">
                            「はい」「いいえ」「その他」の分岐を作成できます
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-3 text-blue-600 border-blue-300"
                            onClick={() => addDecisionOption(step.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            最初の条件項目を追加
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ステップを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => stepToDelete && deleteStep(stepToDelete)}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyFlowEditor;