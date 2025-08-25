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

  // 蛻晄悄蛹・
  useEffect(() => {
    initializeQA();
  }, []);

  const initializeQA = async () => {
    setIsLoading(true);
    try {
      // 繝翫Ξ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ縺ｮ蛻晄悄蛹・
      await enhancedQAManager.initializeKnowledgeBase();
      
      // 蝠城｡後・蛻・梵縺ｨ繝輔Ο繝ｼ逕滓・
      const analysis = await enhancedQAManager.analyzeProblemAndGenerateFlow(
        initialProblemDescription
      );
      
      setProblemCategory(analysis.category);
      setFlow(analysis.flow);
      enhancedQAManager.setProblemCategory(analysis.category);
      enhancedQAManager.setCurrentFlow(analysis.flow);
      
      // 譛蛻昴・繧ｹ繝・ャ繝励ｒ險ｭ螳・
      if (analysis.flow.steps.length > 0) {
        setCurrentStep(analysis.flow.steps[0]);
        setProgress(10);
      }
      
      // 譁・ц雉ｪ蝠上′縺ゅｌ縺ｰ險ｭ螳・
      if (analysis.contextualQuestions.length > 0) {
        setContextualQuestion(analysis.contextualQuestions[0]);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('QA蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
      // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ縺ｮ蝓ｺ譛ｬ逧・↑雉ｪ蝠上ｒ險ｭ螳・
      setCurrentStep({
        id: 'basic_question',
        question: '蝠城｡後・隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞縲・,
        type: 'text',
        required: true,
        reasoning: '蝓ｺ譛ｬ逧・↑諠・ｱ蜿朱寔'
      });
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 蝗樒ｭ斐ｒ蜃ｦ逅・
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
      enhancedQAManager.addAnswer(answer);

      // 騾ｲ謐励ｒ譖ｴ譁ｰ
      const newProgress = Math.min(90, progress + 15);
      setProgress(newProgress);

      // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳・
      const nextStepResult = await enhancedQAManager.determineNextStep(
        answer,
        newAnswers,
        currentStep
      );

      // 邱頑･蟇ｾ蠢懊・繝√ぉ繝・け
      if (nextStepResult.emergencyAction) {
        setEmergencyAction(nextStepResult.emergencyAction);
        onEmergencyContact();
        return;
      }

      // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ險ｭ螳・
      if (nextStepResult.nextStep) {
        setCurrentStep(nextStepResult.nextStep);
        setCurrentAnswer('');
        
        // 譁・ц雉ｪ蝠上′縺ゅｌ縺ｰ險ｭ螳・
        if (nextStepResult.contextualQuestion) {
          setContextualQuestion(nextStepResult.contextualQuestion);
        }
      } else {
        // 繝輔Ο繝ｼ螳御ｺ・
        setProgress(100);
        const solution = await enhancedQAManager.generateComprehensiveSolution(
          newAnswers,
          problemCategory
        );
        
        // 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ菫晏ｭ・
        await enhancedQAManager.learnFromSession(
          initialProblemDescription,
          newAnswers,
          solution,
          true
        );
        
        onComplete(solution, newAnswers);
      }
    } catch (error) {
      console.error('蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
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
            <span>AI險ｺ譁ｭ繧貞・譛溷喧荳ｭ...</span>
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
              <CardTitle className="text-lg">AI險ｺ譁ｭ繧ｷ繧ｹ繝・Β</CardTitle>
              <Badge variant="secondary" className="text-xs">
                OpenAI豢ｻ逕ｨ
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKnowledgeInfo(!showKnowledgeInfo)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                繝翫Ξ繝・ず
              </Button>
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
              <span>險ｺ譁ｭ騾ｲ謐・/span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* 蝠城｡後き繝・ざ繝ｪ陦ｨ遉ｺ */}
          {problemCategory && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>繧ｫ繝・ざ繝ｪ:</span>
              <Badge variant="outline">{problemCategory.name}</Badge>
              <span>邱頑･蠎ｦ:</span>
              <Badge 
                variant={problemCategory.emergencyLevel === 'critical' ? 'destructive' : 'secondary'}
              >
                {problemCategory.emergencyLevel}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* 繝翫Ξ繝・ず諠・ｱ */}
      {showKnowledgeInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              豢ｻ逕ｨ荳ｭ縺ｮ繝翫Ξ繝・ず
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">繝翫Ξ繝・ず繝吶・繧ｹ</h4>
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
                <h4 className="font-medium text-sm mb-2">蠢懈･蜃ｦ鄂ｮ諠・ｱ</h4>
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

      {/* 邱頑･蟇ｾ蠢懊い繝ｩ繝ｼ繝・*/}
      {emergencyAction && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>邱頑･蟇ｾ蠢・</strong> {emergencyAction}
          </AlertDescription>
        </Alert>
      )}

      {/* 蝗樒ｭ泌ｱ･豁ｴ */}
      {showHistory && answers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <History className="h-4 w-4 mr-2" />
              險ｺ譁ｭ螻･豁ｴ
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
                  <HelpCircle className="h-4 w-4 text-blue-600" />
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
                  {currentStep.emergencyAction && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">
                      <strong>笞・・邱頑･譎・</strong> {currentStep.emergencyAction}
                    </div>
                  )}
                </div>
              </div>

              {/* 譁・ц雉ｪ蝠上・陦ｨ遉ｺ */}
              {contextualQuestion && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <div>
                        <strong>霑ｽ蜉諠・ｱ:</strong> {contextualQuestion.question}
                      </div>
                      {contextualQuestion.knowledgeReferences && contextualQuestion.knowledgeReferences.length > 0 && (
                        <div className="text-xs">
                          <strong>蜿り・</strong> {contextualQuestion.knowledgeReferences.join(', ')}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
                          <span>AI蛻・梵荳ｭ...</span>
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

              {/* AI險ｺ譁ｭ縺ｮ隱ｬ譏・*/}
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AI縺後リ繝ｬ繝・ず繝吶・繧ｹ縺ｨ蠢懈･蜃ｦ鄂ｮ諠・ｱ繧呈ｴｻ逕ｨ縺励※縲∵怙驕ｩ縺ｪ雉ｪ蝠上ｒ逕滓・縺励※縺・∪縺吶・
                  蝗樒ｭ斐↓蝓ｺ縺･縺・※縲√ｈ繧雁・菴鍋噪縺ｧ螳溽畑逧・↑隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｾ縺吶・
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
              <span className="text-lg font-medium">AI險ｺ譁ｭ螳御ｺ・/span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
