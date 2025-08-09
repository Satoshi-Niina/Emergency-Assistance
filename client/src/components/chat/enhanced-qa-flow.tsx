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
  Key,
  BookOpen,
  AlertTriangle,
  Info,
  HelpCircle
} from 'lucide-react';
import { enhancedQAManager } from '../../lib/enhanced-qa-manager';
import { QAFlowStep, QAAnswer, QAFlow, ProblemCategory } from '../../lib/qa-flow-manager';

interface ContextualQuestion {
  question: string;
  reasoning: string;
  expectedOutcome: string;
  followUpQuestions?: string[];
  emergencyTriggers?: string[];
  knowledgeReferences?: string[];
}

interface EnhancedQAFlowProps {
  initialProblemDescription: string;
  onComplete: (solution: string, allAnswers: QAAnswer[]) => void;
  onEmergencyContact: () => void;
  onExit: () => void;
}

export default function EnhancedQAFlow({
  initialProblemDescription,
  onComplete,
  onEmergencyContact,
  onExit
}: EnhancedQAFlowProps) {
  const [currentStep, setCurrentStep] = useState<QAFlowStep | null>(null);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState<string | null>(null);
  const [contextualQuestion, setContextualQuestion] = useState<ContextualQuestion | null>(null);
  const [showKnowledgeInfo, setShowKnowledgeInfo] = useState(false);
  const [problemCategory, setProblemCategory] = useState<ProblemCategory | null>(null);
  const [flow, setFlow] = useState<QAFlow | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化
  useEffect(() => {
    initializeQA();
  }, []);

  const initializeQA = async () => {
    setIsLoading(true);
    try {
      // ナレッジベースと応急処置情報の初期化
      await enhancedQAManager.initializeKnowledgeBase();
      
      // 問題の分析とフロー生成
      const analysis = await enhancedQAManager.analyzeProblemAndGenerateFlow(
        initialProblemDescription
      );
      
      setProblemCategory(analysis.category);
      setFlow(analysis.flow);
      enhancedQAManager.setProblemCategory(analysis.category);
      enhancedQAManager.setCurrentFlow(analysis.flow);
      
      // 最初のステップを設定
      if (analysis.flow.steps.length > 0) {
        setCurrentStep(analysis.flow.steps[0]);
        setProgress(10);
      }
      
      // 文脈質問があれば設定
      if (analysis.contextualQuestions.length > 0) {
        setContextualQuestion(analysis.contextualQuestions[0]);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('QA初期化エラー:', error);
      // フォールバック用の基本的な質問を設定
      setCurrentStep({
        id: 'basic_question',
        question: '問題の詳細を教えてください。',
        type: 'text',
        required: true,
        reasoning: '基本的な情報収集'
      });
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 回答を処理
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
      enhancedQAManager.addAnswer(answer);

      // 進捗を更新
      const newProgress = Math.min(90, progress + 15);
      setProgress(newProgress);

      // 次のステップを決定
      const nextStepResult = await enhancedQAManager.determineNextStep(
        answer,
        newAnswers,
        currentStep
      );

      // 緊急対応のチェック
      if (nextStepResult.emergencyAction) {
        setEmergencyAction(nextStepResult.emergencyAction);
        onEmergencyContact();
        return;
      }

      // 次のステップを設定
      if (nextStepResult.nextStep) {
        setCurrentStep(nextStepResult.nextStep);
        setCurrentAnswer('');
        
        // 文脈質問があれば設定
        if (nextStepResult.contextualQuestion) {
          setContextualQuestion(nextStepResult.contextualQuestion);
        }
      } else {
        // フロー完了
        setProgress(100);
        const solution = await enhancedQAManager.generateComprehensiveSolution(
          newAnswers,
          problemCategory
        );
        
        // 学習データの保存
        await enhancedQAManager.learnFromSession(
          initialProblemDescription,
          newAnswers,
          solution,
          true
        );
        
        onComplete(solution, newAnswers);
      }
    } catch (error) {
      console.error('回答処理エラー:', error);
    } finally {
      setIsLoading(false);
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
    setContextualQuestion(null);
    enhancedQAManager.reset();
    initializeQA();
  };

  if (isLoading && !isInitialized) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>AI診断を初期化中...</span>
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
              <CardTitle className="text-lg">AI診断システム</CardTitle>
              <Badge variant="secondary" className="text-xs">
                OpenAI活用
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKnowledgeInfo(!showKnowledgeInfo)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                ナレッジ
              </Button>
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

          {/* 問題カテゴリ表示 */}
          {problemCategory && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>カテゴリ:</span>
              <Badge variant="outline">{problemCategory.name}</Badge>
              <span>緊急度:</span>
              <Badge 
                variant={problemCategory.emergencyLevel === 'critical' ? 'destructive' : 'secondary'}
              >
                {problemCategory.emergencyLevel}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* ナレッジ情報 */}
      {showKnowledgeInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              活用中のナレッジ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">ナレッジベース</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {enhancedQAManager.getKnowledgeBase().slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Info className="h-3 w-3" />
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">応急処置情報</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {enhancedQAManager.getEmergencyProcedures().slice(0, 3).map((proc, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{proc.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <HelpCircle className="h-4 w-4 text-blue-600" />
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

              {/* 文脈質問の表示 */}
              {contextualQuestion && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <div>
                        <strong>追加情報:</strong> {contextualQuestion.question}
                      </div>
                      {contextualQuestion.knowledgeReferences && contextualQuestion.knowledgeReferences.length > 0 && (
                        <div className="text-xs">
                          <strong>参考:</strong> {contextualQuestion.knowledgeReferences.join(', ')}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
                          <span>AI分析中...</span>
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

              {/* AI診断の説明 */}
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AIがナレッジベースと応急処置情報を活用して、最適な質問を生成しています。
                  回答に基づいて、より具体的で実用的な解決策を提案します。
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
              <span className="text-lg font-medium">AI診断完了</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
