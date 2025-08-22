import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Brain,
  History,
  Send,
  RotateCcw,
  Wrench,
  Shield,
  Search,
  Settings,
  Eye,
  Clock,
  Phone,
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
    question: '今�EどこにぁE��すか�E�E,
    type: 'choice',
    options: ['保材緁E, '車庫', '現場', 'そ�E仁E],
    required: true,
    reasoning: '場所によって対応方法が異なるためE,
    expectedOutcome: '対応可能な場所かどぁE��の判断'
  },
  {
    id: 'time_check',
    question: '作業に使える時間はありますか�E�E,
    type: 'choice',
    options: ['20刁E��丁E, '30刁E��度', '1時間程度', '十�Eにある'],
    required: true,
    reasoning: '時間によって対応方法を決宁E,
    expectedOutcome: '緊急対応�E忁E��性判断',
    emergencyAction: '20刁E��下�E場吁E すぐに支援老E��連絡してください',
    timeLimit: 20,
    nextStepCondition: [
      { condition: '20刁E��丁E, nextStepId: 'emergency_contact' },
      { condition: '30刁E��度', nextStepId: 'lighting_check' },
      { condition: '1時間程度', nextStepId: 'lighting_check' },
      { condition: '十�Eにある', nextStepId: 'lighting_check' }
    ]
  },
  {
    id: 'emergency_contact',
    question: '時間が限られてぁE��ため、すぐに支援老E��連絡してください、E,
    type: 'text',
    required: true,
    reasoning: '緊急時�E安�E確俁E,
    expectedOutcome: '専門家による迁E��な対忁E
  },
  {
    id: 'lighting_check',
    question: '室冁E�EめE�E明類�E点灯してぁE��すか�E�E,
    type: 'choice',
    options: ['点灯してぁE��', '点灯してぁE��ぁE, '一部点灯してぁE��'],
    required: true,
    reasoning: 'バッチE��ー状態�E確誁E,
    expectedOutcome: 'バッチE��ー電圧の確誁E,
    nextStepCondition: [
      { condition: '点灯してぁE��', nextStepId: 'starter_key_check' },
      { condition: '点灯してぁE��ぁE, nextStepId: 'battery_connection_check' },
      { condition: '一部点灯してぁE��', nextStepId: 'battery_connection_check' }
    ]
  },
  {
    id: 'starter_key_check',
    question: 'スターターキーは回りますか�E�E,
    type: 'choice',
    options: ['回る', '回らなぁE, '少し回る'],
    required: true,
    reasoning: 'スターターシスチE��の動作確誁E,
    expectedOutcome: 'スターターの状態確誁E,
    nextStepCondition: [
      { condition: '回る', nextStepId: 'starter_sound_check' },
      { condition: '回らなぁE, nextStepId: 'key_switch_check' },
      { condition: '少し回る', nextStepId: 'starter_sound_check' }
    ]
  },
  {
    id: 'starter_sound_check',
    question: 'スターターを回した時、スターターから"カチEと音が�Eますか�E�E,
    type: 'choice',
    options: ['カチと音が�EめE, '全く音が�EなぁE, '別の音が�EめE],
    required: true,
    reasoning: 'スターターの動作状態確誁E,
    expectedOutcome: 'スターターの敁E��判宁E,
    nextStepCondition: [
      { condition: 'カチと音が�EめE, nextStepId: 'fuel_check' },
      { condition: '全く音が�EなぁE, nextStepId: 'battery_connection_check' },
      { condition: '別の音が�EめE, nextStepId: 'starter_diagnosis' }
    ]
  },
  {
    id: 'battery_connection_check',
    question: 'バッチE��ーは接続されてぁE��すか�E�（もしくはメインブレーカーが�EってぁE��すか�E�！E,
    type: 'choice',
    options: ['接続されてぁE��', '接続されてぁE��ぁE, '確認できなぁE],
    required: true,
    reasoning: '電源供給の確誁E,
    expectedOutcome: '電源問題�E特宁E,
    nextStepCondition: [
      { condition: '接続されてぁE��', nextStepId: 'battery_voltage_check' },
      { condition: '接続されてぁE��ぁE, nextStepId: 'connect_battery' },
      { condition: '確認できなぁE, nextStepId: 'battery_voltage_check' }
    ]
  },
  {
    id: 'battery_voltage_check',
    question: 'バッチE��ーの電圧を確認できますか�E�E,
    type: 'choice',
    options: ['12V以丁E, '10-12V', '10V以丁E, '確認できなぁE],
    required: true,
    reasoning: 'バッチE��ーの允E��状態確誁E,
    expectedOutcome: 'バッチE��ー不良の判宁E,
    nextStepCondition: [
      { condition: '12V以丁E, nextStepId: 'fuel_check' },
      { condition: '10-12V', nextStepId: 'charge_battery' },
      { condition: '10V以丁E, nextStepId: 'charge_battery' },
      { condition: '確認できなぁE, nextStepId: 'charge_battery' }
    ]
  },
  {
    id: 'charge_battery',
    question: 'バッチE��ー不良が想定されます。�E電してください、E,
    type: 'text',
    required: true,
    reasoning: 'バッチE��ー允E��の持E��',
    expectedOutcome: 'バッチE��ーの復旧'
  },
  {
    id: 'connect_battery',
    question: 'バッチE��ーを接続してください、E,
    type: 'text',
    required: true,
    reasoning: '電源接続�E持E��',
    expectedOutcome: '電源�E復旧'
  },
  {
    id: 'fuel_check',
    question: '燁E��は十�Eにありますか�E�E,
    type: 'choice',
    options: ['十�Eにある', '少なぁE, '確認できなぁE],
    required: true,
    reasoning: '燁E��供給の確誁E,
    expectedOutcome: '燁E��問題�E特宁E,
    nextStepCondition: [
      { condition: '十�Eにある', nextStepId: 'air_filter_check' },
      { condition: '少なぁE, nextStepId: 'add_fuel' },
      { condition: '確認できなぁE, nextStepId: 'add_fuel' }
    ]
  },
  {
    id: 'add_fuel',
    question: '燁E��を補�Eしてください、E,
    type: 'text',
    required: true,
    reasoning: '燁E��補�Eの持E��',
    expectedOutcome: '燁E��供給の復旧'
  },
  {
    id: 'air_filter_check',
    question: 'エアフィルターは渁E��ですか�E�E,
    type: 'choice',
    options: ['渁E��E, '汚れてぁE��', '確認できなぁE],
    required: true,
    reasoning: '空気供給の確誁E,
    expectedOutcome: 'エアフィルターの状態確誁E,
    nextStepCondition: [
      { condition: '渁E��E, nextStepId: 'final_diagnosis' },
      { condition: '汚れてぁE��', nextStepId: 'clean_air_filter' },
      { condition: '確認できなぁE, nextStepId: 'clean_air_filter' }
    ]
  },
  {
    id: 'clean_air_filter',
    question: 'エアフィルターを渁E��また�E交換してください、E,
    type: 'text',
    required: true,
    reasoning: 'エアフィルター渁E��の持E��',
    expectedOutcome: '空気供給の改喁E
  },
  {
    id: 'key_switch_check',
    question: 'キースイチE��の状態を確認してください、E,
    type: 'choice',
    options: ['正常', '異常', '確認できなぁE],
    required: true,
    reasoning: 'キースイチE��の動作確誁E,
    expectedOutcome: 'キースイチE��の敁E��判宁E,
    nextStepCondition: [
      { condition: '正常', nextStepId: 'starter_sound_check' },
      { condition: '異常', nextStepId: 'replace_key_switch' },
      { condition: '確認できなぁE, nextStepId: 'replace_key_switch' }
    ]
  },
  {
    id: 'replace_key_switch',
    question: 'キースイチE��の交換が忁E��です。専門家に相諁E��てください、E,
    type: 'text',
    required: true,
    reasoning: '専門修琁E�E持E��',
    expectedOutcome: 'キースイチE��の修琁E
  },
  {
    id: 'starter_diagnosis',
    question: 'スターターの詳細診断が忁E��です。専門家に相諁E��てください、E,
    type: 'text',
    required: true,
    reasoning: '専門診断の持E��',
    expectedOutcome: 'スターターの専門修琁E
  },
  {
    id: 'final_diagnosis',
    question: '基本皁E��確認が完亁E��ました。エンジンを始動してみてください、E,
    type: 'choice',
    options: ['始動した', '始動しなぁE, '異常音がすめE],
    required: true,
    reasoning: '最終確誁E,
    expectedOutcome: '問題解決の確誁E,
    nextStepCondition: [
      { condition: '始動した', nextStepId: 'success' },
      { condition: '始動しなぁE, nextStepId: 'expert_consultation' },
      { condition: '異常音がすめE, nextStepId: 'expert_consultation' }
    ]
  },
  {
    id: 'success',
    question: 'エンジンが正常に始動しました�E�問題�E解決されました、E,
    type: 'text',
    required: true,
    reasoning: '成功の確誁E,
    expectedOutcome: '問題解決完亁E
  },
  {
    id: 'expert_consultation',
    question: '専門皁E��診断が忁E��です。技術支援センターに連絡してください、E,
    type: 'text',
    required: true,
    reasoning: '専門家への相諁E��示',
    expectedOutcome: '専門家による対忁E
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

  // 初期匁E
  useEffect(() => {
    if (flowSteps.length > 0) {
      setCurrentStep(flowSteps[0]);
      setProgress(5);
    }
  }, []);

  // 次のスチE��プを決宁E
  const getNextStep = useCallback((currentStepId: string, answer: string): QAFlowStep | null => {
    const currentStep = flowSteps.find(step => step.id === currentStepId);
    if (!currentStep || !currentStep.nextStepCondition) {
      return null;
    }

    // 条件に基づぁE��次のスチE��プを決宁E
    for (const condition of currentStep.nextStepCondition) {
      if (answer.includes(condition.condition)) {
        return flowSteps.find(step => step.id === condition.nextStepId) || null;
      }
    }

    // チE��ォルト�E次のスチE��プ（頁E��で決定！E
    const currentIndex = flowSteps.findIndex(step => step.id === currentStepId);
    if (currentIndex < flowSteps.length - 1) {
      return flowSteps[currentIndex + 1];
    }

    return null;
  }, [flowSteps]);

  // 回答を処琁E
  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !currentStep) return;

    setIsLoading(true);
    
    try {
      // 緊急対応チェチE��
      if (currentStep.emergencyAction && currentStep.timeLimit) {
        const timeAnswer = currentAnswer.toLowerCase();
        if (timeAnswer.includes(`${currentStep.timeLimit}刁E��下`) || 
            timeAnswer.includes('20刁E��丁E) || 
            timeAnswer.includes('30刁E��丁E)) {
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

      // 次のスチE��プを決宁E
      const nextStep = getNextStep(currentStep.id, currentAnswer);
      
      if (nextStep) {
        setCurrentStep(nextStep);
        setCurrentAnswer('');
      } else {
        // フロー完亁E
        setProgress(100);
        const solution = generateSolution(newAnswers);
        onComplete(solution, newAnswers);
      }
    } catch (error) {
      console.error('回答�E琁E��ラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 解決策を生�E
  const generateSolution = (allAnswers: QAAnswer[]): string => {
    const lastAnswer = allAnswers[allAnswers.length - 1];
    
    if (lastAnswer.stepId === 'success') {
      return `
## ✁E問題解決完亁E

エンジンが正常に始動しました�E�E

### 📋 実施した対忁E
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回筁E ${answer.answer}`
).join('\n')}

### 🔧 今後�E予防筁E
1. **定期皁E��バッチE��ーチェチE��**: 朁E回�E電圧確誁E
2. **燁E��管琁E*: 燁E��残量の定期皁E��確誁E
3. **エアフィルター渁E��**: 作業環墁E��応じた渁E��頻度の設宁E
4. **定期点椁E*: メーカー推奨の定期点検�E実施

### 📞 緊急時�E連絡允E
- 技術支援センター: 0123-456-789
- 緊急晁E 0123-456-000
      `;
    } else if (lastAnswer.stepId === 'expert_consultation') {
      return `
## 🚨 専門家による対応が忁E��E

### 📞 技術支援センターに連絡してください
- 電話番号: 0123-456-789
- 緊急晁E 0123-456-000

### 📋 伝えるべき情報
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回筁E ${answer.answer}`
).join('\n')}

### 🔧 専門家による対応�E容
1. **詳細診断**: 専門機器による精寁E��査
2. **部品交揁E*: 忁E��に応じた部品�E交揁E
3. **調整作業**: エンジンの調整・最適匁E
4. **予防保�E**: 再発防止のための対筁E
      `;
    } else {
      return `
## 🔧 対応完亁E

### 📋 実施した対忁E
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   回筁E ${answer.answer}`
).join('\n')}

### ✁E次のスチE��チE
${lastAnswer.answer}

### 📞 サポ�EチE
問題が解決しなぁE��合�E、技術支援センターに連絡してください、E
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
                リセチE��
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
              >
                終亁E
              </Button>
            </div>
          </div>
          
          {/* 進捗バー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>診断進捁E/span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* 緊急対応アラーチE*/}
      {emergencyAction && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>緊急対忁E</strong> {emergencyAction}
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
                    回筁E {answer.answer}
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

      {/* 現在の質啁E*/}
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
                    } else if (questionText.includes('照昁E) || questionText.includes('点灯')) {
                      return <Zap className="h-4 w-4 text-yellow-600" />;
                    } else if (questionText.includes('スターター') || questionText.includes('キー')) {
                      return <Key className="h-4 w-4 text-blue-600" />;
                    } else if (questionText.includes('バッチE��ー')) {
                      return <Battery className="h-4 w-4 text-green-600" />;
                    } else if (questionText.includes('燁E��')) {
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
                        忁E��E
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
                      <strong>期征E��れる結果:</strong> {currentStep.expectedOutcome}
                    </div>
                  )}
                  {currentStep.emergencyAction && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">
                      <strong>⚠�E�E緊急晁E</strong> {currentStep.emergencyAction}
                    </div>
                  )}
                </div>
              </div>

              {/* 回答�E劁E*/}
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
                          <span>処琁E��...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="h-4 w-4" />
                          <span>回答すめE/span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* ヒンチE*/}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  段階的な診断により、エンジン始動不良の原因を特定します、E
                  時間が限られてぁE��場合�E、すぐに支援老E��連絡してください、E
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 完亁E��の表示 */}
      {progress === 100 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">診断完亁E/span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
