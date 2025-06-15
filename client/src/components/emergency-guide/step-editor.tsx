import React from 'react';
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
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={step.type === 'decision' || step.type === 'condition' ? 'secondary' : 'default'}>
              {step.type === 'start' && '開始スライド'}
              {step.type === 'step' && 'ステップスライド'}
              {step.type === 'condition' && '条件分岐スライド(conditions)'}
              {step.type === 'decision' && '条件分岐スライド(options)'}
              {step.type === 'end' && '終了スライド'}
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

          {/* 条件分岐編集（options配列）- 修正版 */}
          {console.log(`🔍 条件分岐UI表示チェック: stepId=${step.id}, type=${step.type}, hasOptions=${!!step.options}, optionsLength=${step.options?.length || 0}`)}
          {(step.type === 'decision' || step.type === 'condition' || (step.options && step.options.length > 0)) && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-yellow-800">条件分岐設定（options配列）</h4>
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

              {/* 条件分岐の説明テキスト表示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800 font-medium mb-2">判断条件の説明:</div>
                <div className="text-sm text-blue-700">
                  {step.description || step.message || 'ここに判断条件を記述してください（例：エンジンオイルが漏れていますか？）'}
                </div>
              </div>

              {/* JSONデータ確認 */}
              <div className="mb-3 p-2 bg-gray-100 border rounded text-xs">
                <strong>JSON確認:</strong> type="{step.type}", options数={step.options?.length || 0}
                {step.options && step.options.length > 0 && (
                  <div className="mt-1">
                    選択肢: {step.options.map(opt => opt.text).join(', ')}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {step.options && step.options.length > 0 ? step.options.map((option, optionIndex) => (
                  <div key={`${step.id}-option-${optionIndex}`} 
                       className="bg-white border-2 border-yellow-300 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        選択肢 {optionIndex + 1}: {option.conditionType === 'yes' ? 'はい' : option.conditionType === 'no' ? 'いいえ' : 'その他'}
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
                          onChange={(e) => onUpdateOption(step.id, optionIndex, { text: e.target.value })}
                          placeholder="選択肢のテキスト（例：はい、いいえ）"
                          className="h-9 text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">遷移先を選択</Label>
                        <select
                          value={option.nextStepId || ''}
                          onChange={(e) => onUpdateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2 bg-white h-9 text-sm mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">遷移先を選択</option>
                          {allSteps?.filter(s => s.id !== step.id).map(targetStep => (
                            <option key={targetStep.id} value={targetStep.id}>
                              {targetStep.title}
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
                )) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-sm">条件項目がまだ追加されていません</p>
                    <p className="text-xs mt-1">「条件追加」ボタンをクリックして選択肢を追加してください</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 条件分岐編集（conditions配列）- type: "condition"用 */}
          {console.log(`🔍 条件分岐(conditions)UI表示チェック: stepId=${step.id}, type=${step.type}, hasConditions=${!!step.conditions}, conditionsLength=${step.conditions?.length || 0}`)}
          {(step.type === 'condition' || (step.conditions && step.conditions.length > 0)) && (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-green-800">条件分岐設定（conditions配列）</h4>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => {
                    // conditions配列への追加処理
                    const newCondition = { label: '新しい条件', nextId: '' };
                    const updatedConditions = [...(step.conditions || []), newCondition];
                    onUpdateStep(step.id, { conditions: updatedConditions });
                  }}
                  disabled={(step.conditions?.length || 0) >= 5}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  条件追加
                </Button>
              </div>

              {/* 条件分岐の説明テキスト表示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800 font-medium mb-2">判断条件の説明:</div>
                <div className="text-sm text-blue-700">
                  {step.description || step.message || 'ここに判断条件を記述してください（例：エンジンオイルが漏れていますか？）'}
                </div>
              </div>

              <div className="space-y-3">
                {step.conditions && step.conditions.length > 0 ? step.conditions.map((condition, conditionIndex) => (
                  <div key={`${step.id}-condition-${conditionIndex}`} 
                       className="bg-white border-2 border-green-300 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        条件 {conditionIndex + 1}
                      </Badge>
                      {(step.conditions?.length || 0) > 2 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updatedConditions = step.conditions?.filter((_, index) => index !== conditionIndex) || [];
                            onUpdateStep(step.id, { conditions: updatedConditions });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">条件ラベル</Label>
                        <Input
                          value={condition.label || ''}
                          onChange={(e) => {
                            const updatedConditions = step.conditions?.map((c, index) => 
                              index === conditionIndex ? { ...c, label: e.target.value } : c
                            ) || [];
                            onUpdateStep(step.id, { conditions: updatedConditions });
                          }}
                          placeholder="条件の名前（例：条件A、はい、いいえ）"
                          className="h-9 text-sm mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">遷移先を選択</Label>
                        <select
                          value={condition.nextId || ''}
                          onChange={(e) => {
                            const updatedConditions = step.conditions?.map((c, index) => 
                              index === conditionIndex ? { ...c, nextId: e.target.value } : c
                            ) || [];
                            onUpdateStep(step.id, { conditions: updatedConditions });
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2 bg-white h-9 text-sm mt-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">遷移先を選択</option>
                          {allSteps?.filter(s => s.id !== step.id).map(targetStep => (
                            <option key={targetStep.id} value={targetStep.id}>
                              {targetStep.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-sm">条件項目がまだ追加されていません</p>
                    <p className="text-xs mt-1">「条件追加」ボタンをクリックして選択肢を追加してください</p>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        // conditions配列を初期化
                        const defaultConditions = [
                          { label: '条件A', nextId: '' },
                          { label: '条件B', nextId: '' }
                        ];
                        onUpdateStep(step.id, { conditions: defaultConditions });
                      }}
                      className="mt-3"
                    >
                      基本条件を設定
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 条件分岐が表示されない場合の緊急対応 */}
          {step.type === 'decision' && (!step.options || step.options.length === 0) && (
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">⚠️ 条件分岐データが見つかりません</h4>
              <p className="text-sm text-red-700 mb-3">
                JSONデータには`type: "decision"`が設定されていますが、条件分岐UIが表示されていません。
              </p>
              <Button 
                onClick={() => {
                  // 基本的な条件分岐を強制作成
                  const defaultOptions = [
                    { text: 'はい', nextStepId: '', isTerminal: false, conditionType: 'yes' as const, condition: '' },
                    { text: 'いいえ', nextStepId: '', isTerminal: false, conditionType: 'no' as const, condition: '' },
                    { text: 'その他', nextStepId: '', isTerminal: false, conditionType: 'other' as const, condition: '' }
                  ];
                  onUpdateStep(step.id, { options: defaultOptions });
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                🔧 条件分岐UIを強制表示
              </Button>
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