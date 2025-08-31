import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  History,
  Send,
  RotateCcw,
  Clock,
  Car,
  Zap,
  Battery,
  Key
} from 'lucide-react';

interface QAAnswer {
  stepId: string;
  answer: string;
  timestamp: Date;
  question: string;
}

interface QAFlowStep {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'location' | 'time';
  options?: string[];
  required: boolean;
  reasoning?: string;
  expectedOutcome?: string;
  emergencyAction?: string;
  timeLimit?: number;
  nextStepCondition?: {
    condition: string;
    nextStepId: string;
  }[];
}

interface EmergencyQAFlowProps {
  onComplete: (solution: string, allAnswers: QAAnswer[]) => void;
  onEmergencyContact: () => void;
  onExit: () => void;
}

// エンジン始動不良の具体的なフロー定義
const ENGINE_START_FLOW: QAFlowStep[] = [
  {
    id: 'location_check',
    question: '今はどこにいますか？',
    type: 'choice',
    options: ['保材線', '車庫', '現場', 'その他'],
    required: true,
    reasoning: '場所によって対応方法が異なるため',
    expectedOutcome: '対応可能な場所かどうかの判断'
  },
  {
    id: 'time_check',
    question: '作業に使える時間はありますか？',
    type: 'choice',
    options: ['20分以下', '30分程度', '1時間程度', '十分にある'],
    required: true,
    reasoning: '時間によって対応方法を決定',
    expectedOutcome: '緊急対応の必要性判断',
    emergencyAction: '20分以下の場合: すぐに支援者へ連絡してください',
    timeLimit: 20,
    nextStepCondition: [
      { condition: '20分以下', nextStepId: 'emergency_contact' },
      { condition: '30分程度', nextStepId: 'lighting_check' },
      { condition: '1時間程度', nextStepId: 'lighting_check' },
      { condition: '十分にある', nextStepId: 'lighting_check' }
    ]
  },
  {
    id: 'emergency_contact',
    question: '時間が限られているため、すぐに支援者に連絡してください。',
    type: 'text',
    required: true,
    reasoning: '緊急時の安全確保',
    expectedOutcome: '専門家による迅速な対応'
  },
  {
    id: 'lighting_check',
    question: '室内灯や照明類は点灯していますか？',
    type: 'choice',
    options: ['点灯している', '点灯していない', '一部点灯している'],
    required: true,
    reasoning: 'バッテリー状態の確認',
    expectedOutcome: 'バッテリー電圧の確認',
    nextStepCondition: [
      { condition: '点灯している', nextStepId: 'starter_key_check' },
      { condition: '点灯していない', nextStepId: 'battery_connection_check' },
      { condition: '一部点灯している', nextStepId: 'battery_connection_check' }
    ]
  },
  {
    id: 'starter_key_check',
    question: 'スターターキーは回りますか？',
    type: 'choice',
    options: ['回る', '回らない', '少し回る'],
    required: true,
    reasoning: 'スターターシステムの動作確認',
    expectedOutcome: 'スターターの状態確認',
    nextStepCondition: [
      { condition: '回る', nextStepId: 'starter_sound_check' },
      { condition: '回らない', nextStepId: 'key_switch_check' },
      { condition: '少し回る', nextStepId: 'starter_sound_check' }
    ]
  },
  {
    id: 'starter_sound_check',
    question: 'スターターを回した時、スターターから"カチ"と音が出ますか？',
    type: 'choice',
    options: ['カチと音が出る', '全く音が出ない', '別の音が出る'],
    required: true,
    reasoning: 'スターターの動作状態確認',
    expectedOutcome: 'スターターの故障判定',
    nextStepCondition: [
      { condition: 'カチと音が出る', nextStepId: 'fuel_check' },
      { condition: '全く音が出ない', nextStepId: 'battery_connection_check' },
      { condition: '別の音が出る', nextStepId: 'starter_diagnosis' }
    ]
  },
  {
    id: 'battery_connection_check',
    question: 'バッテリーは接続されていますか？（もしくはメインブレーカーが入っていますか？）',
    type: 'choice',
    options: ['接続されている', '接続されていない', '確認できない'],
    required: true,
    reasoning: '電源供給の確認',
    expectedOutcome: '電源問題の特定',
    nextStepCondition: [
      { condition: '接続されている', nextStepId: 'battery_voltage_check' },
      { condition: '接続されていない', nextStepId: 'connect_battery' },
      { condition: '確認できない', nextStepId: 'battery_voltage_check' }
    ]
  },
  {
    id: 'battery_voltage_check',
    question: 'バッテリーの電圧を確認できますか？',
    type: 'choice',
    options: ['12V以上', '10-12V', '10V以下', '確認できない'],
    required: true,
    reasoning: 'バッテリーの充電状態確認',
    expectedOutcome: 'バッテリー不良の判定',
    nextStepCondition: [
      { condition: '12V以上', nextStepId: 'fuel_check' },
      { condition: '10-12V', nextStepId: 'charge_battery' },
      { condition: '10V以下', nextStepId: 'charge_battery' },
      { condition: '確認できない', nextStepId: 'charge_battery' }
    ]
  },
  {
    id: 'charge_battery',
    question: 'バッテリー不良が想定されます。充電してください。',
    type: 'text',
    required: true,
    reasoning: 'バッテリー充電の指示',
    expectedOutcome: 'バッテリーの復旧'
  },
  {
    id: 'connect_battery',
    question: 'バッテリーを接続してください。',
    type: 'text',
    required: true,
    reasoning: '電源接続の指示',
    expectedOutcome: '電源の復旧'
  },
  {
    id: 'fuel_check',
    question: '燃料は十分にありますか？',
    type: 'choice',
    options: ['十分にある', '少ない', '確認できない'],
    required: true,
    reasoning: '燃料供給の確認',
    expectedOutcome: '燃料問題の特定',
    nextStepCondition: [
      { condition: '十分にある', nextStepId: 'air_filter_check' },
      { condition: '少ない', nextStepId: 'add_fuel' },
      { condition: '確認できない', nextStepId: 'add_fuel' }
    ]
  },
  {
    id: 'add_fuel',
    question: '燃料を補充してください。',
    type: 'text',
    required: true,
    reasoning: '燃料補充の指示',
    expectedOutcome: '燃料供給の復旧'
  },
  {
    id: 'air_filter_check',
    question: 'エアフィルターは清潔ですか？',
    type: 'choice',
    options: ['清潔', '汚れている', '確認できない'],
    required: true,
    reasoning: '空気供給の確認',
    expectedOutcome: 'エアフィルターの状態確認',
    nextStepCondition: [
      { condition: '清潔', nextStepId: 'final_diagnosis' },
      { condition: '汚れている', nextStepId: 'clean_air_filter' },
      { condition: '確認できない', nextStepId: 'clean_air_filter' }
    ]
  },
  {
    id: 'clean_air_filter',
    question: 'エアフィルターを清掃または交換してください。',
    type: 'text',
    required: true,
    reasoning: 'エアフィルター清掃の指示',
    expectedOutcome: '空気供給の改善'
  },
  {
    id: 'key_switch_check',
    question: 'キースイッチの状態を確認してください。',
    type: 'choice',
    options: ['正常', '異常', '確認できない'],
    required: true,
    reasoning: 'キースイッチの動作確認',
    expectedOutcome: 'キースイッチの故障判定',
    nextStepCondition: [
      { condition: '正常', nextStepId: 'starter_sound_check' },
      { condition: '異常', nextStepId: 'replace_key_switch' },
      { condition: '確認できない', nextStepId: 'replace_key_switch' }
    ]
  },
  {
    id: 'replace_key_switch',
    question: 'キースイッチの交換が必要です。専門家に相談してください。',
    type: 'text',
    required: true,
    reasoning: '専門修理の指示',
    expectedOutcome: 'キースイッチの修理'
  },
  {
    id: 'starter_diagnosis',
    question: 'スターターの詳細診断が必要です。専門家に相談してください。',
    type: 'text',
    required: true,
    reasoning: '専門診断の指示',
    expectedOutcome: 'スターターの専門修理'
  },
  {
    id: 'final_diagnosis',
    question: '基本的な確認が完了しました。エンジンを始動してみてください。',
    type: 'choice',
    options: ['始動した', '始動しない', '異常音がする'],
    required: true,
    reasoning: '最終確認',
    expectedOutcome: '問題解決の確認',
    nextStepCondition: [
      { condition: '始動した', nextStepId: 'success' },
      { condition: '始動しない', nextStepId: 'expert_consultation' },
      { condition: '異常音がする', nextStepId: 'expert_consultation' }
    ]
  },
  {
    id: 'success',
    question: 'エンジンが正常に始動しました！問題は解決されました。',
    type: 'text',
    required: true,
    reasoning: '成功の確認',
    expectedOutcome: '問題解決完了'
  },
  {
    id: 'expert_consultation',
    question: '専門的な診断が必要です。技術支援センターに連絡してください。',
    type: 'text',
    required: true,
    reasoning: '専門家への相談指示',
    expectedOutcome: '専門家による対応'
  }
];

export default function EmergencyQAFlow({
  onComplete,
  onEmergencyContact,
  onExit
}: EmergencyQAFlowProps) {
  const [currentStep, setCurrentStep] = useState<QAFlowStep | null>(null);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState<string | null>(null);
  const [flowSteps, setFlowSteps] = useState<QAFlowStep[]>(ENGINE_START_FLOW);

  // 初期化
  useEffect(() => {
    if (flowSteps.length > 0) {
      setCurrentStep(flowSteps[0]);
      setProgress(5);
    }
  }, []);

  // 次のステップを決定
  const getNextStep = useCallback((currentStepId: string, answer: string): QAFlowStep | null => {
    const currentStep = flowSteps.find(step => step.id === currentStepId);
    if (!currentStep || !currentStep.nextStepCondition) {
      return null;
    }

    // 条件に基づいて次のステップを決定
    for (const condition of currentStep.nextStepCondition) {
      if (answer.includes(condition.condition)) {
        return flowSteps.find(step => step.id === condition.nextStepId) || null;
      }
    }

    // デフォルトの次のステップ（順序で決定）
    const currentIndex = flowSteps.findIndex(step => step.id === currentStepId);
    if (currentIndex < flowSteps.length - 1) {
      return flowSteps[currentIndex + 1];
    }

    return null;
  }, [flowSteps]);

  // 回答を処理
  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !currentStep) return;

    setIsLoading(true);
    
    try {
      // 緊急対応チェック
      if (currentStep.emergencyAction && currentStep.timeLimit) {
        const timeAnswer = currentAnswer.toLowerCase();
        if (timeAnswer.includes(`${currentStep.timeLimit}分以下`) || 
            timeAnswer.includes('20分以下') || 
            timeAnswer.includes('30分以下')) {
          setEmergencyAction(currentStep.emergencyAction);
          onEmergencyContact();
          return;
        }
      }

      // 回答を記録
      const answer: QAAnswer = {
        stepId: currentStep.id,
        answer: currentAnswer.trim(),
        timestamp: new Date(),
        question: currentStep.question
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      // 進捗を更新
      const newProgress = Math.min(95, progress + (100 / flowSteps.length));
      setProgress(newProgress);

      // 次のステップを決定
      const nextStep = getNextStep(currentStep.id, currentAnswer);
      
      if (nextStep) {
        setCurrentStep(nextStep);
        setCurrentAnswer('');
      } else {
        // フロー完了
        setProgress(100);
        const solution = generateSolution(newAnswers);
        onComplete(solution, newAnswers);
      }
    } catch (error) {
      console.error('回答処理エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 解決策を生成
  const generateSolution = (allAnswers: QAAnswer[]): string => {
    const lastAnswer = allAnswers[allAnswers.length - 1];
    
    if (lastAnswer.stepId === 'success') {
      return `
## ✅ 問題解決完了

エンジンが正常に始動しました！

### 📋 実施した対応
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回答: ${answer.answer}`
).join('\n')}

### 🔧 今後の予防策
1. **定期的なバッテリーチェック**: 月1回の電圧確認
2. **燃料管理**: 燃料残量の定期的な確認
3. **エアフィルター清掃**: 作業環境に応じた清掃頻度の設定
4. **定期点検**: メーカー推奨の定期点検の実施

### 📞 緊急時の連絡先
- 技術支援センター: 0123-456-789
- 緊急時: 0123-456-000
      `;
    } else if (lastAnswer.stepId === 'expert_consultation') {
      return `
## 🚨 専門家による対応が必要

### 📞 技術支援センターに連絡してください
- 電話番号: 0123-456-789
- 緊急時: 0123-456-000

### 📋 伝えるべき情報
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回答: ${answer.answer}`
).join('\n')}

### 🔧 専門家による対応内容
1. **詳細診断**: 専門機器による精密検査
2. **部品交換**: 必要に応じた部品の交換
3. **調整作業**: エンジンの調整・最適化
4. **予防保全**: 再発防止のための対策
      `;
    } else {
      return `
## 🔧 対応完了

### 📋 実施した対応
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回答: ${answer.answer}`
).join('\n')}

### ✅ 次のステップ
${lastAnswer.answer}

### 📞 サポート
問題が解決しない場合は、技術支援センターに連絡してください。
- 電話番号: 0123-456-789
      `;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnswerSubmit();
    }
  };

  const resetQA = () => {
    setAnswers([]);
    setCurrentAnswer('');
    setProgress(0);
    setShowHistory(false);
    setEmergencyAction(null);
    if (flowSteps.length > 0) {
      setCurrentStep(flowSteps[0]);
    }
  };

  if (isLoading && !currentStep) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>診断を開始中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* ヘッダー */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">エンジン始動不良の診断</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                履歴
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetQA}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                リセット
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
              >
                終了
              </Button>
            </div>
          </div>
          
          {/* 進捗バー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>診断進捗</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* 緊急対応アラート */}
      {emergencyAction && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>緊急対応:</strong> {emergencyAction}
          </AlertDescription>
        </Alert>
      )}

      {/* 回答履歴 */}
      {showHistory && answers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <History className="h-4 w-4 mr-2" />
              診断履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, index) => (
              <div key={answer.stepId} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="mt-1">
                  Q{index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1 font-medium">
                    {answer.question}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    回答: {answer.answer}
                  </p>
                  <p className="text-xs text-gray-400">
                    {answer.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 現在の質問 */}
      {currentStep && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 質問表示 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {(() => {
                    const questionText = currentStep.question.toLowerCase();
                    if (questionText.includes('時間') || questionText.includes('緊急')) {
                      return <Clock className="h-4 w-4 text-red-600" />;
                    } else if (questionText.includes('照明') || questionText.includes('点灯')) {
                      return <Zap className="h-4 w-4 text-yellow-600" />;
                    } else if (questionText.includes('スターター') || questionText.includes('キー')) {
                      return <Key className="h-4 w-4 text-blue-600" />;
                    } else if (questionText.includes('バッテリー')) {
                      return <Battery className="h-4 w-4 text-green-600" />;
                    } else if (questionText.includes('燃料')) {
                      return <Car className="h-4 w-4 text-orange-600" />;
                    } else {
                      return <span className="text-sm font-medium text-blue-600">{answers.length + 1}</span>;
                    }
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {currentStep.question}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {currentStep.required && (
                      <Badge variant="destructive" className="text-xs">
                        必須
                      </Badge>
                    )}
                    {currentStep.reasoning && (
                      <Badge variant="secondary" className="text-xs">
                        {currentStep.reasoning}
                      </Badge>
                    )}
                  </div>
                  {currentStep.expectedOutcome && (
                    <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md mb-3">
                      <strong>期待される結果:</strong> {currentStep.expectedOutcome}
                    </div>
                  )}
                  {currentStep.emergencyAction && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">
                      <strong>⚠️ 緊急時:</strong> {currentStep.emergencyAction}
                    </div>
                  )}
                </div>
              </div>

              {/* 回答入力 */}
              <div className="space-y-3">
                {currentStep.type === 'choice' && currentStep.options ? (
                  <div className="grid grid-cols-1 gap-2">
                    {currentStep.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => {
                          setCurrentAnswer(option);
                          handleAnswerSubmit();
                        }}
                        disabled={isLoading}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="回答を入力してください..."
                      disabled={isLoading}
                      className="h-12"
                    />
                    <Button
                      onClick={handleAnswerSubmit}
                      disabled={!currentAnswer.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>処理中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="h-4 w-4" />
                          <span>回答する</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* ヒント */}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  段階的な診断により、エンジン始動不良の原因を特定します。
                  時間が限られている場合は、すぐに支援者に連絡してください。
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完了時の表示 */}
      {progress === 100 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">診断完了</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
