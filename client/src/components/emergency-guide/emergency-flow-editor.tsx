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
    condition?: string;
  }>;
  // 条件分岐用の追加フィールド
  conditions?: Array<{
    label: string;
    nextId: string;
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
  selectedFilePath?: string | null;
}

const EmergencyFlowEditor: React.FC<EmergencyFlowEditorProps> = ({ flowData, onSave, selectedFilePath }) => {
  const { toast } = useToast();
  const [editedFlow, setEditedFlow] = useState<FlowData | null>(null);
  const [originalFlow, setOriginalFlow] = useState<FlowData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [editingStepTitle, setEditingStepTitle] = useState<string | null>(null);

  // flowDataが変更されたら編集用データとオリジナルデータを更新
  useEffect(() => {
    console.log('🔄 flowData変更検知:', flowData);

    if (flowData) {
      // slidesからstepsへの変換も含めたデータの整合性を確認・修正
      const processedData = {
        ...flowData,
        steps: (flowData.steps || flowData.slides || [])?.map(step => {
          console.log(`🔍 ステップ ${step.id} (${step.type}) のオプション:`, step.options);

          // 🔀 条件分岐ノード：完全データ処理（編集UI用）
            if (step.type === 'decision') {
              const existingOptions = step.options || [];
              console.log(`🔀 条件分岐ノード ${step.id} 編集UI準備:`, {
                stepId: step.id,
                stepType: step.type,
                title: step.title,
                existingOptionsCount: existingOptions.length,
                existingOptionsData: existingOptions,
                hasLegacyFields: !!(step.yesCondition || step.noCondition || step.otherCondition)
              });

              // 旧スキーマから新スキーマへの変換も含む
              let processedOptions = [];

              if (existingOptions.length > 0) {
                // 新スキーマの場合
                processedOptions = existingOptions.map((option, index) => {
                  const processedOption = {
                    text: option.text || `条件項目 ${index + 1}`,
                    nextStepId: option.nextStepId || '',
                    isTerminal: Boolean(option.isTerminal),
                    conditionType: (option.conditionType as 'yes' | 'no' | 'other') || 'other',
                    condition: option.condition || option.text || ''
                  };
                  console.log(`🔧 既存条件項目 ${index + 1} 処理:`, processedOption);
                  return processedOption;
                });
              } else if (step.yesCondition || step.noCondition || step.otherCondition) {
                // 旧スキーマからの変換
                if (step.yesCondition) {
                  processedOptions.push({
                    text: 'はい',
                    nextStepId: step.yesNextStepId || '',
                    isTerminal: false,
                    conditionType: 'yes' as const,
                    condition: step.yesCondition
                  });
                }
                if (step.noCondition) {
                  processedOptions.push({
                    text: 'いいえ',
                    nextStepId: step.noNextStepId || '',
                    isTerminal: false,
                    conditionType: 'no' as const,
                    condition: step.noCondition
                  });
                }
                if (step.otherCondition) {
                  processedOptions.push({
                    text: 'その他',
                    nextStepId: step.otherNextStepId || '',
                    isTerminal: false,
                    conditionType: 'other' as const,
                    condition: step.otherCondition
                  });
                }
                console.log(`🔄 旧スキーマから変換:`, processedOptions);
              } else {
                // デフォルトの条件項目
                processedOptions = [
                  { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
                  { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' }
                ];
              }

              console.log(`✅ 条件分岐ノード ${step.id} 編集UI準備完了:`, {
                finalOptionsCount: processedOptions.length,
                finalOptionsData: processedOptions
              });

              return {
                ...step,
                id: step.id,
                title: step.title || '新しい条件分岐',
                description: step.description || step.message || '',
                message: step.message || step.description || '',
                type: 'decision',
                options: processedOptions
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
      setOriginalFlow(flowData); // 元データを保持
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
      setOriginalFlow(null);
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

      // 差分マージ処理を実装
    const mergeSteps = (editedSteps: FlowStep[], originalSteps: FlowStep[]) => {
      return editedSteps.map(editedStep => {
        // 元データから同じIDのステップを見つける
        const originalStep = originalSteps.find(orig => orig.id === editedStep.id);

        if (!originalStep) {
          // 新規追加されたステップはそのまま返す
          console.log(`🆕 新規ステップ: ${editedStep.id}`);
          return editedStep;
        }

        // マージ処理: 元データをベースに編集データを上書き
        const mergedStep = {
          ...originalStep,
          ...editedStep,
          // 条件分岐ノード（type: "condition"）の場合、conditions プロパティを保持
          ...(originalStep.type === "condition" && !editedStep.conditions
            ? { conditions: originalStep.conditions }
            : {}),
          // 旧スキーマのフィールドも保持
          ...(originalStep.yesCondition && !editedStep.yesCondition
            ? { yesCondition: originalStep.yesCondition }
            : {}),
          ...(originalStep.noCondition && !editedStep.noCondition
            ? { noCondition: originalStep.noCondition }
            : {}),
          ...(originalStep.otherCondition && !editedStep.otherCondition
            ? { otherCondition: originalStep.otherCondition }
            : {}),
          ...(originalStep.yesNextStepId && !editedStep.yesNextStepId
            ? { yesNextStepId: originalStep.yesNextStepId }
            : {}),
          ...(originalStep.noNextStepId && !editedStep.noNextStepId
            ? { noNextStepId: originalStep.noNextStepId }
            : {}),
          ...(originalStep.otherNextStepId && !editedStep.otherNextStepId
            ? { otherNextStepId: originalStep.otherNextStepId }
            : {})
        };

        console.log(`🔄 マージ処理: ${editedStep.id}`, {
          originalType: originalStep.type,
          editedType: editedStep.type,
          hasOriginalConditions: !!originalStep.conditions,
          hasEditedConditions: !!editedStep.conditions,
          preservedConditions: !!mergedStep.conditions
        });

        return mergedStep;
      });
    };

    // 元データがある場合はマージ処理を実行
    const stepsToProcess = originalFlow 
      ? mergeSteps(editedFlow.steps, originalFlow.steps)
      : editedFlow.steps;

    console.log('🔀 マージ処理結果:', {
      originalStepsCount: originalFlow?.steps?.length || 0,
      editedStepsCount: editedFlow.steps.length,
      mergedStepsCount: stepsToProcess.length,
      hasOriginalData: !!originalFlow
    });

    // 統一スキーマによる保存データを準備
    const saveData = {
      ...editedFlow,
      steps: stepsToProcess.map(step => {
          // 🔀 条件分岐ノード：統一スキーマで完全保存
          if (step.type === 'decision') {
            console.log(`🔀 条件分岐ノード ${step.id} 統一スキーマ保存:`, {
              stepId: step.id,
              stepType: step.type,
              title: step.title,
              optionsCount: step.options?.length || 0,
              optionsDetail: step.options
            });

            // 条件項目の完全保存（統一スキーマ）- より厳密な検証
            const processedOptions = (step.options || []).map((option, index) => {
              const processedOption = {
                text: option.text || `条件項目 ${index + 1}`,
                nextStepId: option.nextStepId || '',
                condition: option.condition || option.text || '',
                isTerminal: Boolean(option.isTerminal),
                conditionType: option.conditionType || 'other'
              };

              console.log(`🔧 条件項目 ${index + 1} 処理:`, {
                original: option,
                processed: processedOption
              });

              return processedOption;
            });

            // デフォルト条件項目が空の場合は基本的な条件を追加
            const unifiedOptions = processedOptions.length > 0 ? processedOptions : [
              { text: 'はい', nextStepId: '', condition: 'はい', isTerminal: false, conditionType: 'yes' },
              { text: 'いいえ', nextStepId: '', condition: 'いいえ', isTerminal: false, conditionType: 'no' }
            ];

            // 旧形式の条件フィールドも生成（後方互換性）
            const yesOption = unifiedOptions.find(opt => opt.conditionType === 'yes');
            const noOption = unifiedOptions.find(opt => opt.conditionType === 'no');
            const otherOptions = unifiedOptions.filter(opt => opt.conditionType === 'other');

            const savedDecisionStep = {
              ...step,
              id: step.id,
              title: step.title || '新しい条件分岐',
              description: step.description || step.message || '',
              message: step.message || step.description || '',
              imageUrl: step.imageUrl || '',
              type: 'decision',
              // 統一スキーマ：options配列（必須）
              options: unifiedOptions,
              // 後方互換性：個別条件フィールド
              yesCondition: yesOption?.condition || yesOption?.text || '',
              yesNextStepId: yesOption?.nextStepId || '',
              noCondition: noOption?.condition || noOption?.text || '',
              noNextStepId: noOption?.nextStepId || '',
              otherCondition: otherOptions.map(opt => opt.condition || opt.text).join(', ') || '',
              otherNextStepId: otherOptions[0]?.nextStepId || ''
            };

            console.log(`✅ 条件分岐ノード ${step.id} 統一スキーマ保存完了:`, {
              stepId: savedDecisionStep.id,
              type: savedDecisionStep.type,
              optionsCount: savedDecisionStep.options.length,
              optionsDetail: savedDecisionStep.options,
              yesCondition: savedDecisionStep.yesCondition,
              noCondition: savedDecisionStep.noCondition,
              otherCondition: savedDecisionStep.otherCondition
            });

            return savedDecisionStep;
          } else {
            // 通常のステップ：デフォルトで"次へ"オプションを確保
            const defaultOptions = step.options?.length > 0 ? step.options : [{
              text: '次へ',
              nextStepId: '',
              isTerminal: false,
              conditionType: 'other',
              condition: ''
            }];

            return {
              ...step,
              description: step.description || step.message || '',
              message: step.message || step.description || '',
              imageUrl: step.imageUrl || '',
              options: defaultOptions.map(option => ({
                text: option.text || '次へ',
                nextStepId: option.nextStepId || '',
                condition: option.condition || '',
                isTerminal: Boolean(option.isTerminal),
                conditionType: option.conditionType || 'other'
              }))
            };
          }
        }),
        // slidesフィールドも統一スキーマで同期（stepsと完全同期）
        slides: saveData.steps.map(step => ({ ...step })),
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

      // 🔀 条件分岐ノードの保存確認
      const decisionSteps = saveData.steps.filter(step => step.type === 'decision');
      console.log(`🔀 保存された条件分岐ノード:`, {
        decisionCount: decisionSteps.length,
        decisionDetails: decisionSteps.map(step => ({
          id: step.id,
          title: step.title,
          optionsCount: step.options?.length || 0,
          options: step.options
        }))
      });

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

      // 編集状態をリセット
      setEditingStepId(null);
      setEditingTitle(false);
      setEditingStepTitle(null);
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
  }, [editedFlow, onSave, toast, selectedFilePath, originalFlow]);

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
                      {step.type === 'decision' && (
                        <Badge variant="secondary" className="ml-2 bg-yellow-200 text-yellow-800">
                          🎯 条件分岐モード
                        </Badge>
                      )}
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
                    <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-yellow-500 rounded-full">
                          <GitBranch className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-yellow-800">🔀 条件分岐ノード設定</h4>
                      </div>
                      <div className="bg-white border border-yellow-300 rounded p-3 mb-3">
                        <p className="text-sm text-yellow-800 mb-2">
                          <strong>📋 機能説明:</strong> ユーザーの状況に応じて異なるステップに進む分岐点です。
                        </p>
                        <p className="text-xs text-yellow-700">
                          💡 各選択肢に具体的な条件を設定し、適切な遷移先を指定してください
                        </p>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded p-2 border border-yellow-300">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-yellow-800">現在の分岐数:</span>
                          <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                            {step.options.length} / 5 項目
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-400 bg-green-50 hover:bg-green-100"
                          onClick={() => addDecisionOption(step.id)}
                          disabled={step.options.length >= 5}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          条件項目追加
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* 🎯 条件分岐ノードは常に編集UIを表示 */}
                    {step.type === 'decision' && (
                      <div className="bg-yellow-50 border-4 border-yellow-400 rounded-xl p-6 mb-6">
                        <div className="text-center mb-4">
                          <h4 className="text-xl font-bold text-yellow-800 flex items-center justify-center gap-2">
                            <GitBranch className="w-6 h-6" />
                            条件分岐ノード編集エリア
                          </h4>
                          <p className="text-sm text-yellow-700 mt-2">
                            このエリアで条件項目を追加・編集できます
                          </p>
                        </div>

                        {/* 条件項目追加ボタン */}
                        <div className="text-center mb-6">
                          <Button 
                            variant="outline" 
                            onClick={() => addDecisionOption(step.id)}
                            disabled={(step.options?.length || 0) >= 5}
                            className="text-green-600 border-green-400 bg-green-50 hover:bg-green-100"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            条件項目を追加 ({step.options?.length || 0}/5)
                          </Button>
                        </div>

                        {/* 既存の条件項目一覧 */}
                        <div className="space-y-4">
                          {step.options && step.options.length > 0 ? (
                            step.options.map((option, optionIndex) => (
                              <div key={`decision-${step.id}-${optionIndex}`} 
                                   className="bg-white border-2 border-blue-300 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant="secondary" className="text-base">
                                    条件項目 {optionIndex + 1}
                                  </Badge>
                                  {(step.options?.length || 0) > 2 && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => removeOption(step.id, optionIndex)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <Label>条件テキスト</Label>
                                    <Input
                                      value={option.text || ''}
                                      onChange={(e) => updateOption(step.id, optionIndex, { text: e.target.value })}
                                      placeholder="条件の説明を入力"
                                    />
                                  </div>

                                  <div>
                                    <Label>条件タイプ</Label>
                                    <select
                                      value={option.conditionType || 'other'}
                                      onChange={(e) => updateOption(step.id, optionIndex, { conditionType: e.target.value as any })}
                                      className="w-full border rounded px-3 py-2 bg-white"
                                    >
                                      <option value="yes">はい（肯定）</option>
                                      <option value="no">いいえ（否定）</option>
                                      <option value="other">その他</option>
                                    </select>
                                  </div>

                                  <div>
                                    <Label>遷移先</Label>
                                    <select
                                      value={option.nextStepId || ''}
                                      onChange={(e) => updateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                                      className="w-full border rounded px-3 py-2 bg-white"
                                    >
                                      <option value="">遷移先を選択</option>
                                      {editedFlow?.steps?.filter(s => s.id !== step.id).map(targetStep => (
                                        <option key={targetStep.id} value={targetStep.id}>
                                          {targetStep.title}
                                        </option>
                                      ))}
                                      <option value="end">フロー終了</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(option.isTerminal)}
                                      onChange={(e) => updateOption(step.id, optionIndex, { isTerminal: e.target.checked })}
                                    />
                                    <Label>この選択肢でフローを終了</Label>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-gray-500">
                              <p>まだ条件項目がありません</p>
                              <p className="text-sm">上のボタンから条件項目を追加してください</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 通常のステップの選択肢表示 */}
                    {step.type !== 'decision' && step.options && step.options.map((option, optionIndex) => (
                      <div key={`${step.id}-option-${optionIndex}`} className="border-2 rounded-lg p-4 space-y-3 border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {step.type === 'decision' ? '条件項目' : '選択肢'} {optionIndex + 1}
                          </Badge>
                          {((step.type === 'decision' && step.options.length > 2) || (step.type !== 'decision' && step.options.length > 1)) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeOption(step.id, optionIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div>
                          <Label>{step.type === 'decision' ? '条件テキスト' : '選択肢のテキスト'}</Label>
                          <Input
                            value={option.text || ''}
                            onChange={(e) => updateOption(step.id, optionIndex, { text: e.target.value })}
                            placeholder={step.type === 'decision' ? '条件の説明を入力' : '選択肢のテキスト'}
                          />
                        </div>

                        {step.type === 'decision' && (
                          <div>
                            <Label>条件タイプ</Label>
                            <select
                              value={option.conditionType || 'other'}
                              onChange={(e) => updateOption(step.id, optionIndex, { conditionType: e.target.value as any })}
                              className="w-full border rounded px-3 py-2 bg-white"
                            >
                              <option value="yes">はい（肯定）</option>
                              <option value="no">いいえ（否定）</option>
                              <option value="other">その他</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <Label>遷移先</Label>
                          <select
                            value={option.nextStepId || ''}
                            onChange={(e) => updateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                            className="w-full border rounded px-3 py-2 bg-white"
                          >
                            <option value="">遷移先を選択</option>
                            {editedFlow?.steps?.filter(s => s.id !== step.id).map(targetStep => (
                              <option key={targetStep.id} value={targetStep.id}>
                                {targetStep.title}
                              </option>
                            ))}
                            <option value="end">フロー終了</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={Boolean(option.isTerminal)}
                            onChange={(e) => updateOption(step.id, optionIndex, { isTerminal: e.target.checked })}
                          />
                          <Label>この選択肢でフローを終了</Label>
                        </div>
                      </div>
                    ))}
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
              この操作は取り消すことができません。このステップを完全に削除します。
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