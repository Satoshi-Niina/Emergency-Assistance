
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
          {/* タイトル編集セクション */}
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-4 border-blue-400 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Edit className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-800">📝 スライドタイトル編集</h3>
            </div>
            
            <div className="space-y-3">
              <Label className="text-blue-800 font-bold text-lg block">
                スライド #{index + 1} のタイトル
              </Label>
              <Input
                value={step.title}
                onChange={(e) => onUpdateStep(step.id, { title: e.target.value })}
                placeholder="スライドのタイトルを入力してください"
                className="text-xl font-semibold h-14 border-3 border-blue-300 focus:border-blue-600 bg-white shadow-inner"
              />
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="w-4 h-4" />
                <span className="text-sm">
                  このタイトルがプレビューとフロー内で表示されます
                </span>
              </div>
            </div>
            
            {/* リアルタイムプレビュー */}
            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 mb-1">プレビュー:</div>
              <div className="text-lg font-bold text-gray-800">
                {step.title || '（タイトル未設定）'}
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

          {/* 条件分岐編集（options配列） */}
          {step.type === 'decision' && (
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

              <div className="space-y-3">
                {step.options && step.options.map((option, optionIndex) => (
                  <div key={`${step.id}-option-${optionIndex}`} 
                       className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">条件 {optionIndex + 1}</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">条件テキスト</Label>
                        <Input
                          value={option.text || ''}
                          onChange={(e) => onUpdateOption(step.id, optionIndex, { text: e.target.value })}
                          placeholder="はい、いいえ等"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">遷移先</Label>
                        <select
                          value={option.nextStepId || ''}
                          onChange={(e) => onUpdateOption(step.id, optionIndex, { nextStepId: e.target.value })}
                          className="w-full border rounded px-2 py-1 bg-white h-8 text-sm"
                        >
                          <option value="">選択</option>
                          {allSteps?.filter(s => s.id !== step.id).map(targetStep => (
                            <option key={targetStep.id} value={targetStep.id}>
                              {targetStep.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
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
