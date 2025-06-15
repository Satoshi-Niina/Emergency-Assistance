import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Info, Trash2, Plus } from 'lucide-react';

/**
 * ⚠️ AI編集制限: このファイルはスライド編集UI専用です
 * - タイトル編集機能の変更は禁止
 * - 条件分岐UI構造の変更は禁止
 * - バックエンド連携コードの追加は禁止
 */

interface FlowStep {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'condition' | 'end';
  imageUrl?: string;
  options: Array<{
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
}

interface StepEditorProps {
  step: FlowStep;
  index: number;
  onUpdateStep: (stepId: string, updates: Partial<FlowStep>) => void;
  onDeleteStep: (stepId: string) => void;
  onAddOption: (stepId: string) => void;
  onRemoveOption: (stepId: string, optionIndex: number) => void;
  onUpdateOption: (stepId: string, optionIndex: number, updates: any) => void;
  allSteps: FlowStep[];
}

const StepEditor: React.FC<StepEditorProps> = ({
  step,
  index,
  onUpdateStep,
  onDeleteStep,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  allSteps
}) => {
  // 条件分岐ノードの自動初期化処理（編集時は無効化）
  useEffect(() => {
    // 編集モードでは自動初期化を無効化
    if (window.location.pathname.includes('/emergency-guide')) {
      return; // 編集画面では自動初期化をスキップ
    }

    const isConditionalNode = step.type === 'decision' || step.type === 'condition';
    const hasEmptyOptions = !step.options || step.options.length === 0;

    if (isConditionalNode && hasEmptyOptions) {
      console.log(`🔧 条件分岐ノード ${step.id} (type: ${step.type}) の自動初期化を実行`);

      // 基本的な条件分岐オプションを設定
      const defaultOptions = [
        { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
        { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' }
      ];

      setTimeout(() => {
        onUpdateStep(step.id, { 
          options: defaultOptions
        });
      }, 100);
    }
  }, [step.id, step.type, step.options, onUpdateStep]);

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={
              step.type === 'decision' ? 'default' : 
              step.type === 'condition' ? 'secondary' : 
              'outline'
            } className={
              step.type === 'decision' ? 'bg-yellow-100 text-yellow-800 border-yellow-400' :
              step.type === 'condition' ? 'bg-green-100 text-green-800 border-green-400' :
              ''
            }>
              {step.type === 'start' && '🚀 開始スライド'}
              {step.type === 'step' && '📋 ステップスライド'}
              {step.type === 'condition' && '🔀 条件判定スライド [CONDITION]'}
              {step.type === 'decision' && '⚡ 選択分岐スライド [DECISION]'}
              {step.type === 'end' && '🏁 終了スライド'}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              スライド #{index + 1}
            </Badge>
            <span className="text-xs text-gray-500">ID: {step.id}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeleteStep(step.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* タイトル編集セクション - 強化版 */}
          <div className="bg-gradient-to-r from-red-100 to-pink-100 border-4 border-red-500 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Edit className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-red-800">🔥 スライドタイトル編集（強化版）</h3>
            </div>

            <div className="space-y-4">
              <Label className="text-red-800 font-bold text-lg block">
                スライド #{index + 1} のタイトル（ID: {step.id}）
              </Label>

              {/* デバッグ情報表示 */}
              <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
                <strong>デバッグ情報:</strong>
                <br />現在のタイトル: "{step.title}"
                <br />ステップID: {step.id}
                <br />ステップタイプ: {step.type}
              </div>

              <Input
                value={step.title || ''}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  console.log(`🔥 タイトル変更リアルタイム: ${step.id} -> "${newTitle}"`);
                  onUpdateStep(step.id, { title: newTitle });
                }}
                onBlur={(e) => {
                  const newTitle = e.target.value;
                  console.log(`💾 タイトル確定: ${step.id} -> "${newTitle}"`);
                  onUpdateStep(step.id, { title: newTitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newTitle = e.currentTarget.value;
                    console.log(`⏎ Enterキーでタイトル確定: ${step.id} -> "${newTitle}"`);
                    onUpdateStep(step.id, { title: newTitle });
                    e.currentTarget.blur();
                  }
                }}
                placeholder="スライドのタイトルを入力してください"
                className="text-xl font-semibold h-16 border-4 border-red-400 focus:border-red-600 bg-white shadow-inner"
              />

              {/* 強制更新ボタン */}
              <Button 
                type="button"
                onClick={() => {
                  const newTitle = `更新されたタイトル ${Date.now()}`;
                  console.log(`🔄 強制タイトル更新: ${step.id} -> "${newTitle}"`);
                  onUpdateStep(step.id, { title: newTitle });
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                🔄 テストタイトル更新
              </Button>

              <div className="flex items-center gap-2 text-red-700">
                <Info className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  このタイトルがプレビューとフロー内で表示されます（リアルタイム更新）
                </span>
              </div>
            </div>

            {/* リアルタイムプレビュー - 強化版 */}
            <div className="mt-4 p-4 bg-white rounded-lg border-4 border-red-300 shadow-md">
              <div className="text-sm text-red-600 mb-2 font-semibold">プレビュー（リアルタイム）:</div>
              <div className="text-xl font-bold text-gray-800 min-h-[2rem] p-2 bg-gray-50 rounded border">
                <span key={`${step.id}-${step.title}-${Date.now()}`}>
                  {step.title || '（タイトル未設定）'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ステップID: {step.id} | 最終更新: {new Date().toLocaleTimeString()}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                現在の値: "{step.title}" (長さ: {(step.title || '').length}文字)
              </div>
            </div>
          </div>

          {/* スライド内容編集 */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <Label className="text-gray-700 font-medium">詳細説明</Label>
              <Textarea
                value={step.description}
                onChange={(e) => onUpdateStep(step.id, { description: e.target.value })}
                placeholder="このスライドの詳細な説明を入力してください"
                className="border-gray-300 focus:border-blue-500 min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium">表示メッセージ</Label>
              <Textarea
                value={step.message}
                onChange={(e) => onUpdateStep(step.id, { message: e.target.value })}
                placeholder="ユーザーに直接表示するメッセージを入力してください"
                className="border-gray-300 focus:border-blue-500 min-h-[80px]"
              />
            </div>

            <div>
              <Label>画像URL（オプション）</Label>
              <Input
                value={step.imageUrl || ''}
                onChange={(e) => onUpdateStep(step.id, { imageUrl: e.target.value })}
                placeholder="画像のURL"
              />
            </div>
          </div>

          {/* 条件分岐編集（options配列）- decision と condition 共通UI */}
          {(() => {
            // 🚨 強制的に条件分岐UIを表示する判定ロジック
            const isDecisionType = step.type === 'decision';
            const isConditionType = step.type === 'condition';
            const isConditionalNode = isDecisionType || isConditionType;
            
            console.log(`🔥 条件分岐UI表示判定 (強制版):`, {
              stepId: step.id,
              stepType: step.type,
              isDecisionType,
              isConditionType,
              isConditionalNode,
              rawStepData: step,
              optionsData: step.options,
              willShowUI: isConditionalNode
            });
            
            return isConditionalNode;
          })() && (
            <div className={`border-2 rounded-lg p-4 space-y-4 ${
              step.type === 'decision' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`font-bold text-lg ${
                  step.type === 'decision' ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {step.type === 'decision' ? '⚡ 選択分岐設定 [DECISION]' : '🔀 条件判定設定 [CONDITION]'}
                  <span className="text-sm font-normal ml-2">
                    {step.type === 'decision' ? '(ユーザーが選択肢から選ぶ)' : '(システムが条件を判定)'}
                  </span>
                </h4>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => onAddOption(step.id)}
                  disabled={(step.options?.length || 0) >= 5}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  条件追加
                </Button>
              </div>

              {/* タイプ別の説明テキスト表示 */}
              <div className={`border rounded-lg p-3 ${
                step.type === 'decision' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
              }`}>
                <div className={`text-sm font-medium mb-2 ${
                  step.type === 'decision' ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {step.type === 'decision' ? '⚡ 選択分岐の質問内容:' : '🔀 条件判定の基準:'}
                </div>
                <div className={`text-sm ${
                  step.type === 'decision' ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  {step.description || step.message || (
                    step.type === 'decision' 
                      ? 'ユーザーに提示する質問を記述してください（例：エンジンが停止した時の状況は？）'
                      : 'システムが判定する条件を記述してください（例：温度センサーの値が80℃以上）'
                  )}
                </div>

                {/* タイプ説明 */}
                <div className={`mt-2 text-xs p-2 rounded ${
                  step.type === 'decision' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  <strong>
                    {step.type === 'decision' ? '[DECISION型]' : '[CONDITION型]'}
                  </strong>
                  {step.type === 'decision' 
                    ? ' ユーザーが画面上の選択肢から選ぶタイプです。「はい/いいえ」「A/B/C」などの選択肢を提示します。'
                    : ' システムが自動的に条件を判定するタイプです。センサー値やデータベースの状態などを基に分岐します。'
                  }
                </div>
              </div>

              {/* JSONデータ確認とタイプキーワード表示 */}
              <div className={`mb-3 p-3 border rounded text-xs ${
                step.type === 'decision' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <strong className={step.type === 'decision' ? 'text-yellow-800' : 'text-green-800'}>
                    JSON確認:
                  </strong>
                  <Badge variant="outline" className={`text-xs ${
                    step.type === 'decision' ? 'border-yellow-400 text-yellow-800' : 'border-green-400 text-green-800'
                  }`}>
                    {step.type === 'decision' ? 'DECISION型' : 'CONDITION型'}
                  </Badge>
                </div>
                <div>
                  <strong>タイプ:</strong> "{step.type}" | 
                  <strong>選択肢数:</strong> {step.options?.length || 0} | 
                  <strong>ステップID:</strong> {step.id}
                </div>
                {step.options && step.options.length > 0 && (
                  <div className="mt-1">
                    <strong>選択肢:</strong> {step.options.map(opt => opt.text).join(', ')}
                  </div>
                )}
                <div className={`mt-2 text-xs p-1 rounded ${
                  step.type === 'decision' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  💡 <strong>キーワード:</strong> {step.type === 'decision' ? '"DECISION", "選択分岐", "ユーザー選択"' : '"CONDITION", "条件判定", "自動判定"'}
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  // optionsが空の場合は基本条件を自動設定
                  const options = (step.options && step.options.length > 0) 
                    ? step.options 
                    : [{ text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' }];

                  // 自動設定した場合はstateを更新
                  if (!step.options || step.options.length === 0) {
                    setTimeout(() => {
                      onUpdateStep(step.id, { options: options });
                    }, 0);
                  }

                  return options;
                })().map((option, optionIndex) => (
                  <div key={`${step.id}-option-${optionIndex}`} 
                       className={`bg-white border-2 rounded-lg p-4 shadow-sm ${
                         step.type === 'decision' ? 'border-yellow-300' : 'border-green-300'
                       }`}>
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className={`${
                        step.type === 'decision' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-green-100 text-green-800 border-green-300'
                      }`}>
                        {step.type === 'decision' ? '⚡ 選択肢' : '🔀 条件'} {optionIndex + 1}: 
                        {option.conditionType === 'yes' ? 'はい' : option.conditionType === 'no' ? 'いいえ' : 'その他'}
                        <span className="ml-1 text-xs">
                          {step.type === 'decision' ? '[DECISION]' : '[CONDITION]'}
                        </span>
                      </Badge>
                      {(step.options?.length || 0) > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveOption(step.id, optionIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">選択肢のテキスト</Label>
                        <Input
                          value={option.text || ''}
                          onChange={(e) => {
                            const newText = e.target.value;
                            console.log(`📝 選択肢テキスト変更: ${step.id} -> 選択肢${optionIndex + 1} -> "${newText}"`);
                            onUpdateOption(step.id, optionIndex, { text: newText });
                          }}
                          onBlur={() => {
                            console.log(`💾 選択肢テキスト確定: ${step.id}`);
                          }}
                          placeholder="選択肢のテキスト（例：はい、いいえ）"
                          className="h-9 text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">遷移先を選択</Label>
                        <select
                          value={option.nextStepId || ''}
                          onChange={(e) => {
                            const newNextStepId = e.target.value;
                            console.log(`🔄 遷移先変更: ${step.id} -> 選択肢${optionIndex + 1} -> ${newNextStepId}`);
                            onUpdateOption(step.id, optionIndex, { nextStepId: newNextStepId });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2 bg-white h-9 text-sm mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">遷移先を選択</option>
                          {allSteps?.filter(s => s.id !== step.id).map(targetStep => (
                            <option key={targetStep.id} value={targetStep.id}>
                              {targetStep.title} (ID: {targetStep.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 条件の詳細説明（強化版） */}
                    <div className="mt-3">
                      <Label className="text-sm font-medium text-gray-700">条件の説明（内部用）</Label>
                      <Input
                        value={option.condition || ''}
                        onChange={(e) => onUpdateOption(step.id, optionIndex, { condition: e.target.value })}
                        placeholder="例: エンジンが警告なしに突然停止した場合"
                        className="h-8 text-sm mt-1"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        この説明は内部的な条件判定の参考として使用されます
                      </div>
                    </div>

                    {/* 条件タイプ設定 */}
                    <div className="mt-3">
                      <Label className="text-sm font-medium text-gray-700">条件タイプ</Label>
                      <select
                        value={option.conditionType || 'other'}
                        onChange={(e) => onUpdateOption(step.id, optionIndex, { conditionType: e.target.value as 'yes' | 'no' | 'other' })}
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-white h-9 text-sm mt-1"
                      >
                        <option value="yes">はい（肯定的な回答）</option>
                        <option value="no">いいえ（否定的な回答）</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 条件分岐が表示されない場合の緊急対応 */}
          {(() => {
            const isConditionalNode = step.type === 'decision' || step.type === 'condition';
            const hasEmptyOptions = !step.options || step.options.length === 0;
            return isConditionalNode && hasEmptyOptions;
          })() && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">⚠️ 条件分岐データが見つかりません（{step.id}）</h4>
              <p className="text-sm text-red-700 mb-3">
                JSONデータには`type: "{step.type}"`が設定されていますが、条件分岐オプションが設定されていません。
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    const defaultOptions = [
                      { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
                      { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' },
                      { text: 'その他', nextStepId: '', isTerminal: false, conditionType: 'other' as const, condition: '' }
                    ];
                    console.log(`🔧 ${step.id}の条件分岐を強制作成:`, defaultOptions);
                    onUpdateStep(step.id, { options: defaultOptions });
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  🔧 条件分岐オプションを作成
                </Button>

                <Button 
                  onClick={() => {
                    console.log(`🔧 ${step.id}のtypeを強制的に${step.type}に設定`);
                    onUpdateStep(step.id, { 
                      type: step.type === 'decision' ? 'decision' : 'condition',
                      options: [
                        { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
                        { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' }
                      ]
                    });
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  🚨 条件分岐型を強制適用
                </Button>
              </div>
            </div>
          )}

          {/* 条件分岐ノードのデバッグ情報表示 */}
          {(step.type === 'decision' || step.type === 'condition') && (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">🔍 条件分岐ノードデバッグ情報</h4>
              <div className="text-sm space-y-1">
                <div><strong>ステップID:</strong> {step.id}</div>
                <div><strong>ステップtype:</strong> {step.type}</div>
                <div><strong>条件分岐ノード判定:</strong> {(step.type === 'decision' || step.type === 'condition') ? '✅ TRUE' : '❌ FALSE'}</div>
                <div><strong>options配列の有無:</strong> {step.options ? 'あり' : 'なし'}</div>
                <div><strong>options配列の長さ:</strong> {step.options?.length || 0}</div>
                {step.options && step.options.length > 0 && (
                  <div>
                    <strong>options詳細:</strong>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
{JSON.stringify(step.options, null, 2)}
                    </pre>
                  </div>
                )}
                <div><strong>条件分岐UI表示条件評価:</strong> {
                  (step.type === 'decision' || step.type === 'condition') ? '✅ TRUE' : '❌ FALSE'
                }</div>
              </div>
            </div>
          )}

          {/* ステップ型変換ボタン（通常ステップから条件分岐への変換） */}
          {(step.type === 'step' || step.type === 'start') && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-800 mb-2">🔄 ステップ型変換</h4>
              <p className="text-sm text-orange-700 mb-3">
                このステップを条件分岐ノードに変換できます。変換後は複数の選択肢を設定可能になります。
              </p>
              <div className="space-x-2">
                <Button 
                  onClick={() => {
                    console.log(`🔄 ${step.id}をdecision型に変換`);
                    onUpdateStep(step.id, { 
                      type: 'decision',
                      options: [
                        { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
                        { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' }
                      ]
                    });
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  ⚡ 選択分岐に変換
                </Button>
                <Button 
                  onClick={() => {
                    console.log(`🔄 ${step.id}をcondition型に変換`);
                    onUpdateStep(step.id, { 
                      type: 'condition',
                      conditions: [
                        { label: '条件A', nextId: '' },
                        { label: '条件B', nextId: '' }
                      ],
                      options: []
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  🔀 条件判定に変換
                </Button>
              </div>
            </div>
          )}

          {/* 通常の選択肢（非条件分岐） */}
          {step.type !== 'decision' && step.type !== 'condition' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">選択肢</Label>
                <Button size="sm" variant="outline" onClick={() => onAddOption(step.id)}>
                  <Plus className="w-4 h-4 mr-1" />
                  選択肢追加
                </Button>
              </div>

              <div className="space-y-3">
                {step.options && step.options.map((option, optionIndex) => (
                  <div key={`${step.id}-option-${optionIndex}`} className="border-2 rounded-lg p-4 space-y-3 border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">選択肢 {optionIndex + 1}</Badge>
                      {step.options.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveOption(step.id, optionIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>選択肢のテキスト</Label>
                      <Input
                        value={option.text || ''}
                        onChange={(e) => onUpdateOption(step.id, optionIndex, { text: e.target.value })}
                        placeholder="選択肢のテキスト"
                      />
                    </div>

                    <div>
                      <Label>遷移先</Label>
                      <select
                        value={option.nextStepId || ''}
                        onChange={(e) => onUpdateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                        className="w-full border rounded px-3 py-2 bg-white"
                      >
                        <option value="">遷移先を選択</option>
                        {allSteps?.filter(s => s.id !== step.id).map(targetStep => (
                          <option key={targetStep.id} value={targetStep.id}>
                            {targetStep.title}
                          </option>
                        ))}
                        <option value="end">フロー終了</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StepEditor;