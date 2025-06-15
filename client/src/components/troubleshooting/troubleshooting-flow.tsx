
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  message: string;
  imageUrl?: string;
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

export default function TroubleshootingFlow({
  id,
  onComplete,
  onExit,
}: TroubleshootingFlowProps) {
  const [flowData, setFlowData] = useState<TroubleshootingFlowData | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/troubleshooting/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch flow data: ${response.status}`);
        }

        const data = await response.json();
        setFlowData(data);
        
        // 最初のステップを設定
        if (data.steps && data.steps.length > 0) {
          setCurrentStepId(data.steps[0].id);
        }
      } catch (err) {
        console.error("Flow data fetch error:", err);
        setError("フローデータの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlowData();
    }
  }, [id]);

  const getCurrentStep = (): FlowStep | null => {
    if (!flowData || !currentStepId) return null;
    return flowData.steps.find(step => step.id === currentStepId) || null;
  };

  const handleNext = (nextStepId?: string) => {
    if (!flowData) return;

    if (!nextStepId) {
      // 次のステップIDが指定されていない場合、順次進む
      const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
      if (currentIndex < flowData.steps.length - 1) {
        setCurrentStepId(flowData.steps[currentIndex + 1].id);
      } else {
        onComplete();
      }
    } else if (nextStepId === "complete") {
      onComplete();
    } else {
      setCurrentStepId(nextStepId);
    }
  };

  const handlePrevious = () => {
    if (!flowData) return;
    
    const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
    if (currentIndex > 0) {
      setCurrentStepId(flowData.steps[currentIndex - 1].id);
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
          <p className="mb-4">{error || "フローデータが見つかりません"}</p>
          <Button onClick={onExit}>戻る</Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const currentIndex = flowData.steps.findIndex(step => step.id === currentStepId);
  const isLastStep = currentIndex === flowData.steps.length - 1;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onExit}>
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <CardTitle className="text-xl">{flowData.title}</CardTitle>
          </div>
          <div className="text-sm text-gray-500">
            ステップ {currentIndex + 1} / {flowData.steps.length}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {currentStep && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                {currentStep.title}
              </h3>
              <div className="text-blue-800 whitespace-pre-line">
                {currentStep.message || currentStep.description}
              </div>
            </div>

            {currentStep.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={currentStep.imageUrl}
                  alt={currentStep.title}
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                前へ
              </Button>

              <div className="flex gap-2">
                {currentStep.options && currentStep.options.length > 0 ? (
                  currentStep.options.map((option, index) => (
                    <Button
                      key={index}
                      onClick={() => handleNext(option.nextStepId)}
                      className="min-w-[120px]"
                    >
                      {option.text}
                    </Button>
                  ))
                ) : (
                  <Button
                    onClick={() => handleNext()}
                    className="min-w-[120px]"
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        完了
                      </>
                    ) : (
                      "次へ"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
