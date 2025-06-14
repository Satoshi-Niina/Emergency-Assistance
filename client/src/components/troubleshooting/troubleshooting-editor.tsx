import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  FilePlus2,
  FileEdit,
  FileX,
  Eye
} from 'lucide-react';
import TroubleshootingPreview from './troubleshooting-preview';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// トラブルシューティングのステップ型定義
interface TroubleshootingStep {
  id: string;
  message: string;
  image?: string;
  imageKeywords?: string[]; // 画像検索用キーワード配列
  options?: {
    label: string;
    next: string;
  }[];
  next?: string;
  checklist?: string[];
  end?: boolean;
  title: string;
  type: string;
  condition?: string;
}

// トラブルシューティングのデータ型定義
interface TroubleshootingData {
  id: string;
  title: string;
  description: string;
  trigger: string[];
  steps: TroubleshootingStep[];
}

interface TroubleshootingEditorProps {
  id?: string; // 既存のトラブルシューティングID（編集時）
  guideId?: string; // 関連する応急復旧ガイドID
  onCancel: () => void;
  onSaved: () => void;
}

const TroubleshootingEditor: React.FC<TroubleshootingEditorProps> = ({ 
  id, 
  guideId,
  onCancel,
  onSaved
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [changes, setChanges] = useState<{
    added: number;
    modified: number;
    deleted: number;
  }>({ added: 0, modified: 0, deleted: 0 });

  // 元のデータと編集中のデータ
  const [originalData, setOriginalData] = useState<TroubleshootingData | null>(null);
  const [editedData, setEditedData] = useState<TroubleshootingData | null>(null);

  // ステップ編集用の状態
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTrigger, setNewTrigger] = useState('');
  const [newChecklist, setNewChecklist] = useState('');
  const [newOption, setNewOption] = useState({ label: '', next: '' });
  const [editingCondition, setEditingCondition] = useState<{
    stepId: string;
    condition: string;
  } | null>(null);

  // 既存データの読み込み
  const fetchData = useCallback(async () => {
    if (!id) {
      // 新規作成時
      setLoading(false);
      setOriginalData(null);

      // 初期データを生成
      const newData: TroubleshootingData = {
        id: '',
        title: '',
        description: '',
        trigger: [],
        steps: [{
          id: 'start',
          message: '',
          next: '',
          title: '',
          type: 'normal'
        }]
      };

      // ガイドIDが指定されている場合は関連情報を追加
      if (guideId) {
        newData.id = `guide_ts_${guideId}`;
        newData.title = `応急復旧ガイド関連トラブルシューティング`;
        newData.description = `応急復旧ガイドID: ${guideId} に関連するトラブルシューティングフロー`;
        newData.trigger = [`ガイド_${guideId}`];
      }

      setEditedData(newData);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/troubleshooting/${id}`);

      if (!response.ok) {
        throw new Error('トラブルシューティングデータの取得に失敗しました');
      }

      const data = await response.json();

      // データ構造の正規化
      const normalizedData = {
        ...data,
        triggerKeywords: data.triggerKeywords || data.trigger || [],
        trigger: data.triggerKeywords || data.trigger || [], // 互換性のため
        steps: (data.steps || []).map((step: any) => ({
          ...step,
          title: step.title || '',
          description: step.description || step.message || '',
          message: step.message || step.description || '',
          imageUrl: step.imageUrl || step.image || '',
          type: step.type || 'step',
          options: (step.options || []).map((option: any) => ({
            text: option.text || option.label,
            nextStepId: option.nextStepId || option.next,
            isTerminal: option.isTerminal || false,
            conditionType: option.conditionType || 'other'
          }))
        }))
      };

      setOriginalData(normalizedData);
      setEditedData(JSON.parse(JSON.stringify(normalizedData))); // ディープコピー

      // 最初のステップをアクティブに
      if (normalizedData.steps && normalizedData.steps.length > 0) {
        setActiveStep(normalizedData.steps[0].id);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'トラブルシューティングデータの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, guideId, toast]);

  // 初期ロード
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 基本情報の更新ハンドラ
  const handleBasicInfoChange = (field: string, value: any) => {
    if (!editedData) return;

    // フィールド名のマッピング
    const fieldMapping: { [key: string]: string } = {
      'trigger': 'triggerKeywords'
    };

    const actualField = fieldMapping[field] || field;

    setEditedData({
      ...editedData,
      [actualField]: value
    });
  };

  // トリガーの追加
  const handleAddTrigger = () => {
    if (!newTrigger.trim() || !editedData) return;

    const currentTriggers = editedData.triggerKeywords || editedData.trigger || [];
    setEditedData({
      ...editedData,
      triggerKeywords: [...currentTriggers, newTrigger.trim()],
      trigger: [...currentTriggers, newTrigger.trim()] // 互換性のため両方設定
    });
    setNewTrigger('');
  };

  // トリガーの削除
  const handleRemoveTrigger = (index: number) => {
    if (!editedData) return;

    const currentTriggers = editedData.triggerKeywords || editedData.trigger || [];
    const newTriggers = [...currentTriggers];
    newTriggers.splice(index, 1);

    setEditedData({
      ...editedData,
      triggerKeywords: newTriggers,
      trigger: newTriggers // 互換性のため両方設定
    });
  };

  // ステップの更新ハンドラ
  const handleStepChange = (stepId: string, field: string, value: any) => {
    if (!editedData) return;

    const updatedSteps = editedData.steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    );

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });
  };

  // ステップの追加
  const handleAddStep = () => {
    if (!editedData) return;

    // 新しいステップID生成（既存のものと重複しないように）
    const newStepId = `step_${Date.now()}`;
    const newStep: TroubleshootingStep = {
      id: newStepId,
      message: '',
      next: '',
      title: '',
      type: 'normal'
    };

    setEditedData({
      ...editedData,
      steps: [...editedData.steps, newStep]
    });

    setActiveStep(newStepId);
  };

  // ステップの削除
  const handleRemoveStep = (stepId: string) => {
    if (!editedData) return;

    const updatedSteps = editedData.steps.filter(step => step.id !== stepId);

    // 最初のステップを削除しようとしていたら防止
    if (stepId === 'start' || editedData.steps.length <= 1) {
      toast({
        title: '削除できません',
        description: '最初のステップは削除できません。少なくとも1つのステップが必要です。',
        variant: 'destructive',
      });
      return;
    }

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });

    // 削除されたステップがアクティブだった場合、他のステップをアクティブに
    if (activeStep === stepId) {
      setActiveStep(updatedSteps[0]?.id || null);
    }

    // 他のステップのnextを更新
    const stepsWithUpdatedNext = updatedSteps.map(step => {
      if (step.next === stepId) {
        return { ...step, next: '' };
      }
      if (step.options) {
        const updatedOptions = step.options.map(option => {
          if (option.next === stepId) {
            return { ...option, next: '' };
          }
          return option;
        });
        return { ...step, options: updatedOptions };
      }
      return step;
    });

    setEditedData({
      ...editedData,
      steps: stepsWithUpdatedNext
    });
  };

  // チェックリストアイテムの追加
  const handleAddChecklistItem = (stepId: string) => {
    if (!newChecklist.trim() || !editedData) return;

    const updatedSteps = editedData.steps.map(step => {
      if (step.id === stepId) {
        const currentChecklist = step.checklist || [];
        return {
          ...step,
          checklist: [...currentChecklist, newChecklist.trim()]
        };
      }
      return step;
    });

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });

    setNewChecklist('');
  };

  // チェックリストアイテムの削除
  const handleRemoveChecklistItem = (stepId: string, index: number) => {
    if (!editedData) return;

    const updatedSteps = editedData.steps.map(step => {
      if (step.id === stepId && step.checklist) {
        const newChecklist = [...step.checklist];
        newChecklist.splice(index, 1);
        return {
          ...step,
          checklist: newChecklist
        };
      }
      return step;
    });

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });
  };

  // オプションの追加
  const handleAddOption = (stepId: string) => {
    if (!newOption.label.trim() || !newOption.next.trim() || !editedData) return;

    const updatedSteps = editedData.steps.map(step => {
      if (step.id === stepId) {
        const currentOptions = step.options || [];
        return {
          ...step,
          options: [...currentOptions, { ...newOption }]
        };
      }
      return step;
    });

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });

    setNewOption({ label: '', next: '' });
  };

  // オプションの削除
  const handleRemoveOption = (stepId: string, index: number) => {
    if (!editedData) return;

    const updatedSteps = editedData.steps.map(step => {
      if (step.id === stepId && step.options) {
        const newOptions = [...step.options];
        newOptions.splice(index, 1);
        return {
          ...step,
          options: newOptions
        };
      }
      return step;
    });

    setEditedData({
      ...editedData,
      steps: updatedSteps
    });
  };

  // 対象のステップ情報を取得
  const getActiveStepData = () => {
    if (!editedData || !activeStep) return null;
    return editedData.steps.find(step => step.id === activeStep) || null;
  };

  // 更新内容の分析
  const analyzeChanges = useCallback(() => {
    if (!originalData || !editedData) {
      return { added: 0, modified: 0, deleted: 0 };
    }

    let added = 0;
    let modified = 0;
    let deleted = 0;

    // 基本情報の変更チェック
    if (originalData.title !== editedData.title) modified++;
    if (originalData.description !== editedData.description) modified++;

    // トリガーの比較
    if (JSON.stringify(originalData.trigger) !== JSON.stringify(editedData.trigger)) {
      if (originalData.trigger.length < editedData.trigger.length) {
        added += editedData.trigger.length - originalData.trigger.length;
      } else if (originalData.trigger.length > editedData.trigger.length) {
        deleted += originalData.trigger.length - editedData.trigger.length;
      } else {
        modified++;
      }
    }

    // ステップ数の変更チェック
    if (originalData.steps.length > editedData.steps.length) {
      deleted += originalData.steps.length - editedData.steps.length;
    } else if (originalData.steps.length < editedData.steps.length) {
      added += editedData.steps.length - originalData.steps.length;
    }

    // 共通するステップの変更チェック
    const originalStepIds = originalData.steps.map(step => step.id);
    const editedStepIds = editedData.steps.map(step => step.id);

    // ステップ単位での追加・削除
    editedStepIds.forEach(id => {
      if (!originalStepIds.includes(id)) {
        added++;
      }
    });

    originalStepIds.forEach(id => {
      if (!editedStepIds.includes(id)) {
        deleted++;
      }
    });

    // 共通するステップの内容比較
    const commonStepIds = originalStepIds.filter(id => editedStepIds.includes(id));
    commonStepIds.forEach(id => {
      const origStep = originalData.steps.find(step => step.id === id);
      const editedStep = editedData.steps.find(step => step.id === id);

      if (origStep && editedStep) {
        // メッセージの比較
        if (origStep.message !== editedStep.message) {
          modified++;
        }

        // 次のステップIDの比較
        if (origStep.next !== editedStep.next) {
          modified++;
        }

        // チェックリストの比較
        if (JSON.stringify(origStep.checklist) !== JSON.stringify(editedStep.checklist)) {
          modified++;
        }

        // オプションの比較
        if (JSON.stringify(origStep.options) !== JSON.stringify(editedStep.options)) {
          modified++;
        }
      }
    });

    return { added, modified, deleted };
  }, [originalData, editedData]);

  // ステップのタイトルを編集
  const handleTitleEdit = (stepId: string, newTitle: string) => {
    if (!editedData) return;

    setEditedData({
      ...editedData,
      steps: editedData.steps.map(step => 
        step.id === stepId 
          ? { ...step, title: newTitle }
          : step
      )
    });
    setEditingTitle(null);
  };

  // 条件分岐ノードの編集
  const handleConditionEdit = (stepId: string, condition: string) => {
    if (!editedData) return;

    setEditedData({
      ...editedData,
      steps: editedData.steps.map(step => 
        step.id === stepId 
          ? { ...step, condition }
          : step
      )
    });
    setEditingCondition(null);
  };

  // 条件分岐ノードの追加
  const handleAddCondition = (stepId: string) => {
    if (!editedData) return;

    const newStep = {
      id: `step_${Date.now()}`,
      title: '新しい条件分岐',
      type: 'condition',
      condition: '',
      options: []
    };

    setEditedData({
      ...editedData,
      steps: [...editedData.steps, newStep]
    });
  };

  // 保存処理
  const handleSave = async () => {
    if (!editedData) return;

    try {
      setSaving(true);

      // 完全に一致したデータ構造を作成（元のファイルを完全に置き換える）
      const normalizedSaveData = {
        id: editedData.id,
        title: editedData.title,
        description: editedData.description,
        triggerKeywords: editedData.triggerKeywords || editedData.trigger || [],
        steps: editedData.steps.map(step => ({
          id: step.id,
          title: step.title || '',
          description: step.description || step.message || '',
          imageUrl: step.imageUrl || step.image || '',
          type: step.type || 'step',
          options: (step.options || []).map(option => ({
            text: option.text || option.label,
            nextStepId: option.nextStepId || option.next,
            isTerminal: Boolean(option.isTerminal),
            conditionType: option.conditionType || 'other'
          })),
          message: step.message || step.description || ''
        })),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 完全置換保存開始:', { 
        id: normalizedSaveData.id, 
        title: normalizedSaveData.title,
        stepsCount: normalizedSaveData.steps.length,
        triggerCount: normalizedSaveData.triggerKeywords.length
      });

      // 保存API呼び出し
      const saveUrl = `/api/troubleshooting/save/${normalizedSaveData.id}`;
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);

      const response = await fetch(`${saveUrl}?_t=${timestamp}&_r=${randomId}&_replace=true&_force=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Complete-Replace': 'true',
          'X-Force-Overwrite': 'true',
          'X-Timestamp': timestamp.toString(),
          'X-Random-Id': randomId
        },
        body: JSON.stringify(normalizedSaveData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('保存失敗:', errorText);
        throw new Error(`保存に失敗しました: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ 完全置換保存成功:', result);

      // 少し待ってからサーバーから最新データを再取得
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const verifyResponse = await fetch(`/api/troubleshooting/${normalizedSaveData.id}?_t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

        if (verifyResponse.ok) {
          const verifiedData = await verifyResponse.json();
          setOriginalData(verifiedData);
          setEditedData(JSON.parse(JSON.stringify(verifiedData)));
          console.log('🔍 保存後の検証完了:', verifiedData.id);
        } else {
          // 検証に失敗した場合は保存したデータを使用
          const savedData = JSON.parse(JSON.stringify(normalizedSaveData));
          setOriginalData(savedData);
          setEditedData(savedData);
        }
      } catch (verifyError) {
        console.error('保存後の検証エラー:', verifyError);
        const savedData = JSON.parse(JSON.stringify(normalizedSaveData));
        setOriginalData(savedData);
        setEditedData(savedData);
      }

      toast({
        title: '保存完了',
        description: 'ファイルを完全に上書きしました',
      });

      onSaved();

    } catch (error) {
      console.error('保存エラー:', error);
      toast({
        title: 'エラー',
        description: 'データの保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
    }
  };

  // 保存ボタンクリック時
  const handleSaveClick = () => {
    if (!editedData) return;

    // IDとタイトルの入力チェック
    if (!editedData.id.trim()) {
      toast({
        title: '入力エラー',
        description: 'IDは必須です',
        variant: 'destructive',
      });
      return;
    }

    if (!editedData.title.trim()) {
      toast({
        title: '入力エラー',
        description: 'タイトルは必須です',
        variant: 'destructive',
      });
      return;
    }

    // 新規かどうか
    if (!id || id === '') {
      // 新規作成の場合は確認なしで保存
      handleSave();
      return;
    }

    // 変更の分析
    const changesData = analyzeChanges();
    setChanges(changesData);

    // 変更がある場合は確認ダイアログを表示
    if (changesData.added > 0 || changesData.modified > 0 || changesData.deleted > 0) {
      setShowSaveConfirm(true);
    } else {
      toast({
        title: '変更なし',
        description: '変更点はありませんでした',
      });
      onCancel();
    }
  };

  // ステップIDの選択肢
  const getStepOptions = () => {
    if (!editedData) return [];
    return editedData.steps.map(step => ({
      id: step.id,
      label: `${step.id}: ${step.title.substring(0, 20)}${step.title.length > 20 ? '...' : ''}`
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    );
  }

  if (!editedData) {
    return (
      <div className="text-center py-12 text-red-500">
        データの読み込みに失敗しました
      </div>
    );
  }

  const activeStepData = getActiveStepData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">フロー編集</CardTitle>
            <CardDescription>
              {id ? 'トラブルシューティングフローを編集' : '新規トラブルシューティングフローを作成'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              キャンセル
            </Button>
            <Button
              variant="default"
              onClick={handleSaveClick}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="triggers">トリガー設定</TabsTrigger>
              <TabsTrigger value="steps">ステップ管理</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>

            {/* 基本情報タブ */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2 text-blue-700">基本情報とは</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    トラブルシューティングフローの基本的な情報を設定します。IDは一意の識別子として使用されます。
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="id">ID (一意のキー)</Label>
                  <p className="text-sm text-gray-500">他のフローと重複しない一意の識別子です。英数字とアンダースコアを使用してください。</p>
                  <Input
                    id="id"
                    value={editedData.id}
                    onChange={(e) => handleBasicInfoChange('id', e.target.value)}
                    placeholder="一意のID (例: brake_failure)"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">タイトル</Label>
                  <p className="text-sm text-gray-500">ユーザーに表示されるフローの名前です。わかりやすい名前をつけてください。</p>
                  <Input
                    id="title"
                    value={editedData.title}
                    onChange={(e) => handleBasicInfoChange('title', e.target.value)}
                    placeholder="トラブルシューティングのタイトル"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">説明</Label>
                  <p className="text-sm text-gray-500">フローの目的や使い方を説明します。内部参照用なのでユーザーには表示されません。</p>
                  <Textarea
                    id="description"
                    value={editedData.description}
                    onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                    placeholder="トラブルシューティングの説明"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* トリガー設定タブ */}
            <TabsContent value="triggers" className="space-y-4">
              <div className="mb-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2 text-blue-700">トリガー設定とは</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    トリガーとは、このフローを自動的に起動させるためのキーワードです。ユーザーがチャットでこれらのキーワードを含む質問をすると、このフローが候補として表示されます。
                  </p>
                </div>

                <Label htmlFor="triggers">トリガーキーワード</Label>
                <p className="text-sm text-gray-500 mb-2">
                  このトラブルシューティングを起動するキーワードを設定します。複数のキーワードを追加できます。
                </p>

                <div className="flex items-center gap-2 mb-2">
                  <Input
                    id="new-trigger"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    placeholder="新しいトリガーキーワード"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrigger();
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddTrigger}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    追加
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {(editedData.triggerKeywords || editedData.trigger || []).length === 0 ? (
                    <p className="text-sm text-gray-500">トリガーがありません</p>
                  ) : (
                    (editedData.triggerKeywords || editedData.trigger || []).map((trigger, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {trigger}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full"
                          onClick={() => handleRemoveTrigger(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ステップ管理タブ */}
            <TabsContent value="steps" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2 text-blue-700">ステップ管理とは</h3>
                <p className="text-sm text-blue-700 mb-2">
                  ステップはフロー内の各画面を表します。ユーザーはステップごとにメッセージを読み、選択肢を選んで次のステップに進みます。
                </p>
                <p className="text-sm text-blue-700">
                  <strong>ステップID：</strong> 各ステップの一意の識別子<br/>
                  <strong>メッセージ内容：</strong> ユーザーに表示されるテキスト<br/>
                  <strong>次のステップID：</strong> 選択肢がない場合の遷移先<br/>
                  <strong>選択肢オプション：</strong> ユーザーが選べる選択肢とその遷移先<br/>
                  <strong>チェックリスト：</strong> ユーザーに表示される確認項目
                </p>
              </div>
              <div className="space-y-4">
                {editedData.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      {editingTitle === step.id ? (
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => handleTitleEdit(step.id, e.target.value)}
                          onBlur={() => setEditingTitle(null)}
                          className="border rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className="text-lg font-medium cursor-pointer"
                          onClick={() => setEditingTitle(step.id)}
                        >
                          {step.title}
                        </h3>
                      )}
                    </div>

                    {/* 条件分岐ノードの編集 */}
                    {step.type === 'condition' && (
                      <div className="mt-2">
                        {editingCondition?.stepId === step.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingCondition.condition}
                              onChange={(e) => setEditingCondition({
                                ...editingCondition,
                                condition: e.target.value
                              })}
                              className="w-full border rounded px-2 py-1"
                              rows={3}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleConditionEdit(step.id, editingCondition.condition)}
                            >
                              保存
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="text-sm text-gray-600 cursor-pointer"
                            onClick={() => setEditingCondition({
                              stepId: step.id,
                              condition: step.condition || ''
                            })}
                          >
                            {step.condition || '条件を設定'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* 新しい条件分岐ノードの追加ボタン */}
                <Button
                  variant="outline"
                  onClick={() => handleAddCondition(`step_${Date.now()}`)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  条件分岐を追加
                </Button>
              </div>
            </TabsContent>

            {/* プレビュータブ */}
            <TabsContent value="preview" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2 text-blue-700">プレビュー表示</h3>
                <p className="text-sm text-blue-700 mb-2">
                  現在編集中の内容を実際のフロー表示としてプレビューできます。編集内容はリアルタイムに反映されます。
                </p>
              </div>

              {editedData.steps.length > 0 ? (
                <TroubleshootingPreview 
                  steps={editedData.steps} 
                  initialStepId="start"
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>ステップを作成してプレビューを表示します</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 変更確認ダイアログ */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>変更内容の確認</DialogTitle>
            <DialogDescription>
              以下の変更を保存しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {changes.added > 0 && (
                <div className="flex items-center text-green-600">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>新規追加項目: {changes.added}件</span>
                </div>
              )}
              {changes.modified > 0 && (
                <div className="flex items-center text-blue-600">
                  <FileEdit className="h-4 w-4 mr-2" />
                  <span>更新項目: {changes.modified}件</span>
                </div>
              )}
              {changes.deleted > 0 && (
                <div className="flex items-center text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>削除項目: {changes.deleted}件</span>
                </div>
              )}
            </div>
            <p className="mt-4 text-sm text-gray-600">
              保存すると既存のデータは上書きされます。削除した項目は完全に削除され、新規追加した項目がこのフローに追加されます。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  変更を保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TroubleshootingEditor;