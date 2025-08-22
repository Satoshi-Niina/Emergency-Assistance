import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ArrowLeft, CheckCircle, Send, ArrowRight, X } from "lucide-react";
import { convertImageUrl } from '../../lib/utils.ts';

interface FlowStep {
  id: string;
  title: string;
  description: string;
  message: string;
  imageUrl?: string;
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  type: string;
  options: Array<{
    text: string;
    nextStepId: string;
  }>;
}

interface TroubleshootingFlowData {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
}

interface TroubleshootingFlowProps {
  id: string;
  onComplete: () => void;
  onExit: () => void;
}

// 画像URL変換の改喁E

// 画像�E読み込みエラーを�E琁E��る関数
function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, imageUrl: string) {
  console.error('画像読み込みエラー:', imageUrl);
  const target = e.currentTarget;
  target.style.display = 'none';
  
  // エラー表示用の要素を追加
  const errorDiv = document.createElement('div');
  errorDiv.className = 'bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-sm';
  errorDiv.textContent = '画像�E読み込みに失敗しました';
  target.parentNode?.appendChild(errorDiv);
}

// フロー実行履歴の型定義
interface FlowExecutionStep {
  stepId: string;
  title: string;
  message: string;
  imageUrl?: string;
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  selectedOption?: string;
  timestamp: Date;
}

export default function TroubleshootingFlow({
  id,
  onComplete,
  onExit,
}: TroubleshootingFlowProps) {
  const [flowData, setFlowData] = useState<TroubleshootingFlowData | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // フロー実行履歴を追跡
  const [executionHistory, setExecutionHistory] = useState<FlowExecutionStep[]>([]);
  const [showPartialSuccess, setShowPartialSuccess] = useState(false);

  const sendToChat = useCallback(() => {
    if (!flowData || executionHistory.length === 0) return;
    const chatData = {
      title: flowData.title,
      description: flowData.description,
      executedSteps: executionHistory,
      totalSteps: executionHistory.length,
      completedAt: new Date(),
      isPartial: true,
    };
    window.dispatchEvent(new CustomEvent('emergency-guide-completed', { detail: chatData }));
    setShowPartialSuccess(true);
    setTimeout(() => setShowPartialSuccess(false), 3000);
  }, [flowData, executionHistory]);

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        console.log(`🔄 フローチE�Eタ取得開姁E ${id}`);
        
        // 正しいAPIエンド�Eイントを使用
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch flow data: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✁EフローチE�Eタ取得完亁E`, data);
        setFlowData(data);
        
        // 最初�EスチE��プを設宁E
        if (data.steps && data.steps.length > 0) {
          setCurrentStepId(data.steps[0].id);
          
          // 初期スチE��プを履歴に追加
          const initialStep = data.steps[0];
          setExecutionHistory([{
            stepId: initialStep.id,
            title: initialStep.title,
            message: initialStep.message || initialStep.description || '',
            imageUrl: initialStep.imageUrl,
            images: initialStep.images,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error("❁EFlow data fetch error:", err);
        setError("フローチE�Eタの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlowData();
    }
  }, [id]);

  useEffect(() => {
    window.addEventListener('request-send-to-chat', sendToChat);
    return () => {
      window.removeEventListener('request-send-to-chat', sendToChat);
    };
  }, [sendToChat]);

  const getCurrentStep = (): FlowStep | null => {
    if (!flowData || !currentStepId) return null;
    return flowData.steps.find(step => step.id === currentStepId) || null;
  };

  const handleNext = (nextStepId?: string) => {
    if (!flowData) return;
    let nextStep: FlowStep | undefined;

    if (nextStepId) {
      nextStep = flowData.steps.find(step => step.id === nextStepId);
    } else {
      const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
      if (currentIndex < flowData.steps.length - 1) {
        nextStep = flowData.steps[currentIndex + 1];
      }
    }

    if (nextStep) {
      setCurrentStepId(nextStep.id);
      setExecutionHistory(prev => [...prev, {
        stepId: nextStep!.id,
        title: nextStep!.title,
        message: nextStep!.message || nextStep!.description || '',
        imageUrl: nextStep!.imageUrl,
        images: nextStep!.images,
        timestamp: new Date()
      }]);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (!flowData) return;
    
    const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
    if (currentIndex > 0) {
      setCurrentStepId(flowData.steps[currentIndex - 1].id);
      
      // 履歴から最後�EスチE��プを削除
      setExecutionHistory(prev => prev.slice(0, -1));
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !flowData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{error || "フローチE�Eタが見つかりません"}</p>
          <Button onClick={onExit}>戻めE/Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
  const isLastStep = currentIndex === flowData.steps.length - 1;
  
  // 確実な画像表示ロジチE��
  const imagesToShow = [];
  if (currentStep?.images && currentStep.images.length > 0) {
    imagesToShow.push(...currentStep.images);
  } else if (currentStep?.imageUrl) {
    imagesToShow.push({ url: currentStep.imageUrl, fileName: 'image' });
  }

  return (
    <Card className="w-full h-full flex flex-col mx-auto border-0 shadow-none text-base md:text-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="lg" onClick={onExit}>
              <ArrowLeft className="h-5 w-5" />
              戻めE
            </Button>
            <CardTitle className="text-2xl md:text-3xl">{flowData?.title}</CardTitle>
          </div>
          <div className="text-base text-gray-500">
            スチE��チE{currentIndex + 1} / {flowData?.steps.length}
          </div>
        </div>
      </CardHeader>

      <CardContent key={currentStep.id}>
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2 text-lg">
              {currentStep.title}
            </h3>
            {currentStep.description && (
              <p className="text-blue-800 text-sm mb-3">
                {currentStep.description}
              </p>
            )}
            <div className="text-blue-800 whitespace-pre-line">
              {currentStep.message}
            </div>
          </div>
          
          {currentStep.type === 'decision' && currentStep.options.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">選択してください�E�E/h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentStep.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 text-left justify-start"
                    onClick={() => handleNext(option.nextStepId)}
                  >
                    <span className="font-medium">{option.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 画像表示エリア - 横並び表示 */}
          {(currentStep.images && currentStep.images.length > 0) ? (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStep.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={convertImageUrl(image.url)}
                      alt={`${currentStep.title} - ${image.fileName || '画僁E}`}
                      className="w-full h-auto rounded-lg shadow-md"
                      onError={(e) => handleImageError(e, image.url)}
                    />
                    {image.fileName && (
                      <div className="text-sm text-gray-600 mt-1">
                        {image.fileName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : currentStep.imageUrl ? (
            // 古ぁE��式�E imageUrl のみのフォールバック
            <div className="mt-4">
              <img
                src={convertImageUrl(currentStep.imageUrl)}
                alt={currentStep.title}
                className="w-full h-auto rounded-lg shadow-md"
                onError={(e) => handleImageError(e, currentStep.imageUrl)}
              />
            </div>
          ) : (
            <div className="mt-4 text-center py-4 bg-gray-50 rounded-lg">
              {/* <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">こ�EスチE��プに画像�Eありません</p> */}
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={flowData.steps.findIndex(s => s.id === currentStep.id) === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              前へ
            </Button>

            <div className="flex gap-2">
              {currentStep.type !== 'decision' && (
                <Button onClick={() => handleNext()}>
                  次へ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
