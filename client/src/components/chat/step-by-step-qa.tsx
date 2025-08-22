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
  Eye
} from 'lucide-react';
import { QAFlowManager, QAFlowStep, QAAnswer } from '../../lib/qa-flow-manager';

interface StepByStepQAProps {
  onAnswer: (answer: QAAnswer) => void;
  onComplete: (solution: string, allAnswers: QAAnswer[]) => void;
  onExit: () => void;
  initialContext?: string;
  knowledgeBase?: string[];
  initialProblemDescription?: string; // 蛻晄悄蝠城｡瑚ｪｬ譏・
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

  // 蛻晄悄雉ｪ蝠上・逕滓・
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
      // 蝠城｡悟・鬘槭→繝輔Ο繝ｼ莠域ｸｬ
      const result = await qaManager.classifyProblemAndPredictFlow(
        initialProblemDescription,
        knowledgeBase
      );
      
      if (result) {
        setProblemCategory(result.category);
        qaManager.setProblemCategory(result.category);
        qaManager.setCurrentFlow(result.flow);
        
        // 譛蛻昴・雉ｪ蝠上ｒ險ｭ螳・
        if (result.flow.steps.length > 0) {
          setCurrentStep(result.flow.steps[0]);
          setProgress(10);
        }
      } else {
        // 蛻・｡槭↓螟ｱ謨励＠縺溷ｴ蜷医・騾壼ｸｸ縺ｮ雉ｪ蝠冗函謌・
        await generateInitialQuestion();
      }
    } catch (error) {
      console.error('蝠城｡悟・鬘槭お繝ｩ繝ｼ:', error);
      await generateInitialQuestion();
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialQuestion = async () => {
    setIsLoading(true);
    try {
      const firstQuestion = await qaManager.generateNextQuestion(
        initialContext || '蝠城｡後・隧ｳ邏ｰ繧堤｢ｺ隱阪☆繧九◆繧√∵ｮｵ髫守噪縺ｫ雉ｪ蝠上＆縺帙※縺・◆縺縺阪∪縺吶・,
        [],
        knowledgeBase
      );
      
      if (firstQuestion) {
        setCurrentStep(firstQuestion);
        setProgress(10);
      }
    } catch (error) {
      console.error('蛻晄悄雉ｪ蝠冗函謌舌お繝ｩ繝ｼ:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !currentStep) return;

    setIsLoading(true);
    
    try {
      // 蝗樒ｭ斐ｒ險倬鹸
      const answer: QAAnswer = {
        stepId: currentStep.id,
        answer: currentAnswer.trim(),
        timestamp: new Date()
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);
      qaManager.addAnswer(answer);

      // 蝗樒ｭ斐ｒ隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓騾∽ｿ｡
      onAnswer(answer);

      // 騾ｲ謐励ｒ譖ｴ譁ｰ
      const newProgress = Math.min(90, progress + 20);
      setProgress(newProgress);

      // 谺｡縺ｮ雉ｪ蝠上ｒ逕滓・
      const nextStep = await qaManager.generateNextQuestion(
        `縺薙ｌ縺ｾ縺ｧ縺ｮ蝗樒ｭ・ ${newAnswers.map(a => a.answer).join(', ')}`,
        newAnswers,
        knowledgeBase
      );

      if (nextStep) {
        setCurrentStep(nextStep);
        setCurrentAnswer('');
      } else {
        // 雉ｪ蝠上′邨ゆｺ・＠縺溷ｴ蜷医∬ｧ｣豎ｺ遲悶ｒ逕滓・
        await generateSolution(newAnswers);
      }
    } catch (error) {
      console.error('蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSolution = async (allAnswers: QAAnswer[]) => {
    try {
      const solution = await qaManager.generateSolution(allAnswers, knowledgeBase);
      setProgress(100);
      
      // 隗｣豎ｺ遲悶ｒ隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓騾∽ｿ｡
      onComplete(solution, allAnswers);
    } catch (error) {
      console.error('隗｣豎ｺ遲也函謌舌お繝ｩ繝ｼ:', error);
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
            <span>雉ｪ蝠上ｒ逕滓・荳ｭ...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* 繝倥ャ繝繝ｼ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">谿ｵ髫守噪蝠城｡瑚ｧ｣豎ｺ</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                螻･豁ｴ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetQA}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                繝ｪ繧ｻ繝・ヨ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
              >
                邨ゆｺ・
              </Button>
            </div>
          </div>
          
          {/* 騾ｲ謐励ヰ繝ｼ */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>騾ｲ謐・/span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* 蝗樒ｭ泌ｱ･豁ｴ */}
      {showHistory && answers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <History className="h-4 w-4 mr-2" />
              蝗樒ｭ泌ｱ･豁ｴ
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
                    蝗樒ｭ・ {answer.answer}
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

      {/* 迴ｾ蝨ｨ縺ｮ雉ｪ蝠・*/}
      {currentStep && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
                             {/* 雉ｪ蝠剰｡ｨ遉ｺ */}
               <div className="flex items-start space-x-3">
                 <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                   {(() => {
                     const questionText = currentStep.question.toLowerCase();
                     if (questionText.includes('螳牙・') || questionText.includes('蜊ｱ髯ｺ')) {
                       return <Shield className="h-4 w-4 text-red-600" />;
                     } else if (questionText.includes('逞・憾') || questionText.includes('逡ｰ蟶ｸ')) {
                       return <AlertCircle className="h-4 w-4 text-orange-600" />;
                     } else if (questionText.includes('蜴溷屏') || questionText.includes('縺ｪ縺・)) {
                       return <Search className="h-4 w-4 text-blue-600" />;
                     } else if (questionText.includes('蟇ｾ蠢・) || questionText.includes('蜃ｦ鄂ｮ')) {
                       return <Wrench className="h-4 w-4 text-green-600" />;
                     } else if (questionText.includes('遒ｺ隱・) || questionText.includes('繝√ぉ繝・け')) {
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
                         蠢・・
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
                       <strong>譛溷ｾ・＆繧後ｋ邨先棡:</strong> {currentStep.expectedOutcome}
                     </div>
                   )}
                 </div>
               </div>

              {/* 蝗樒ｭ泌・蜉・*/}
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
                      placeholder="蝗樒ｭ斐ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞..."
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
                          <span>蜃ｦ逅・ｸｭ...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="h-4 w-4" />
                          <span>蝗樒ｭ斐☆繧・/span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* 繝偵Φ繝・*/}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  蟆る摩逧・↑繝翫Ξ繝・ず繝吶・繧ｹ繧呈ｴｻ逕ｨ縺励※縲∵怙驕ｩ縺ｪ雉ｪ蝠上ｒ逕滓・縺励※縺・∪縺吶・
                  隧ｳ邏ｰ縺ｪ蝗樒ｭ斐ｒ縺・◆縺縺上％縺ｨ縺ｧ縲√ｈ繧頑ｭ｣遒ｺ縺ｪ隗｣豎ｺ遲悶ｒ謠先｡医〒縺阪∪縺吶・
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 螳御ｺ・凾縺ｮ陦ｨ遉ｺ */}
      {progress === 100 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">蝠城｡瑚ｧ｣豎ｺ螳御ｺ・/span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
