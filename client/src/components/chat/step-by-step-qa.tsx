import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
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
  Eye
} from 'lucide-react';
import { QAFlowManager, QAFlowStep, QAAnswer } from '../../lib/qa-flow-manager';

interface StepByStepQAProps {
  onAnswer: (answer: QAAnswer) => void;
  onComplete: (solution: string, allAnswers: QAAnswer[]) => void;
  onExit: () => void;
  initialContext?: string;
  knowledgeBase?: string[];
  initialProblemDescription?: string; // 初期問題説明
}

export default function StepByStepQA({
  onAnswer,
  onComplete,
  onExit,
  initialContext = '',
  knowledgeBase = [],
  initialProblemDescription = ''
}: StepByStepQAProps) {
  const [currentStep, setCurrentStep] = useState<QAFlowStep | null>(null);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState<string | null>(null);
  const [problemCategory, setProblemCategory] = useState<any>(null);
  const [qaManager] = useState(() => new QAFlowManager());

  // 初期質問の生成
  useEffect(() => {
    if (initialProblemDescription) {
      classifyProblemAndStartFlow();
    } else {
      generateInitialQuestion();
    }
  }, [initialProblemDescription]);

  const classifyProblemAndStartFlow = async () => {
    setIsLoading(true);
    try {
      // 問題分類とフロー予測
      const result = await qaManager.classifyProblemAndPredictFlow(
        initialProblemDescription,
        knowledgeBase
      );
      
      if (result) {
        setProblemCategory(result.category);
        qaManager.setProblemCategory(result.category);
        qaManager.setCurrentFlow(result.flow);
        
        // 最初の質問を設定
        if (result.flow.steps.length > 0) {
          setCurrentStep(result.flow.steps[0]);
          setProgress(10);
        }
      } else {
        // 分類に失敗した場合は通常の質問生成
        await generateInitialQuestion();
      }
    } catch (error) {
      console.error('問題分類エラー:', error);
      await generateInitialQuestion();
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialQuestion = async () => {
    setIsLoading(true);
    try {
      const firstQuestion = await qaManager.generateNextQuestion(
        initialContext || '問題の詳細を確認するため、段階的に質問させていただきます。',
        [],
        knowledgeBase
      );
      
      if (firstQuestion) {
        setCurrentStep(firstQuestion);
        setProgress(10);
      }
    } catch (error) {
      console.error('初期質問生成エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !currentStep) return;

    setIsLoading(true);
    
    try {
      // 回答を記録
      const answer: QAAnswer = {
        stepId: currentStep.id,
        answer: currentAnswer.trim(),
        timestamp: new Date()
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);
      qaManager.addAnswer(answer);

      // 回答を親コンポーネントに送信
      onAnswer(answer);

      // 進捗を更新
      const newProgress = Math.min(90, progress + 20);
      setProgress(newProgress);

      // 次の質問を生成
      const nextStep = await qaManager.generateNextQuestion(
        `これまでの回答: ${newAnswers.map(a => a.answer).join(', ')}`,
        newAnswers,
        knowledgeBase
      );

      if (nextStep) {
        setCurrentStep(nextStep);
        setCurrentAnswer('');
      } else {
        // 質問が終了した場合、解決策を生成
        await generateSolution(newAnswers);
      }
    } catch (error) {
      console.error('回答処理エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSolution = async (allAnswers: QAAnswer[]) => {
    try {
      const solution = await qaManager.generateSolution(allAnswers, knowledgeBase);
      setProgress(100);
      
      // 解決策を親コンポーネントに送信
      onComplete(solution, allAnswers);
    } catch (error) {
      console.error('解決策生成エラー:', error);
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
    qaManager.reset();
    generateInitialQuestion();
  };

  if (isLoading && !currentStep) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>質問を生成中...</span>
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
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">段階的問題解決</CardTitle>
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
              <span>進捗</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* 回答履歴 */}
      {showHistory && answers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <History className="h-4 w-4 mr-2" />
              回答履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, index) => (
              <div key={answer.stepId} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="mt-1">
                  Q{index + 1}
                </Badge>
                <div className="flex-1">
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
                     if (questionText.includes('安全') || questionText.includes('危険')) {
                       return <Shield className="h-4 w-4 text-red-600" />;
                     } else if (questionText.includes('症状') || questionText.includes('異常')) {
                       return <AlertCircle className="h-4 w-4 text-orange-600" />;
                     } else if (questionText.includes('原因') || questionText.includes('なぜ')) {
                       return <Search className="h-4 w-4 text-blue-600" />;
                     } else if (questionText.includes('対応') || questionText.includes('処置')) {
                       return <Wrench className="h-4 w-4 text-green-600" />;
                     } else if (questionText.includes('確認') || questionText.includes('チェック')) {
                       return <Eye className="h-4 w-4 text-purple-600" />;
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
                  専門的なナレッジベースを活用して、最適な質問を生成しています。
                  詳細な回答をいただくことで、より正確な解決策を提案できます。
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
              <span className="text-lg font-medium">問題解決完了</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
