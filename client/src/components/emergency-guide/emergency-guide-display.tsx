import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon, Send, X } from 'lucide-react';
import { convertImageUrl } from '../../lib/utils.ts';

interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'condition' | 'end';
  imageUrl?: string;
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  conditions?: Array<{
    label: string;
    nextId: string;
  }>;
}

interface EmergencyGuideData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: Step[];
  updatedAt?: string;
}

interface EmergencyGuideDisplayProps {
  guideId: string;
  onExit: () => void;
  isPreview?: boolean; // 繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝峨°縺ｩ縺・°縺ｮ繝輔Λ繧ｰ
  onSendToChat: () => void;
  backButtonText?: string; // 謌ｻ繧九・繧ｿ繝ｳ縺ｮ繝・く繧ｹ繝・
}

// 繝輔Ο繝ｼ螳溯｡悟ｱ･豁ｴ縺ｮ蝙句ｮ夂ｾｩ
interface FlowExecutionStep {
  stepId: string;
  title: string;
  message: string;
  type: string;
  imageUrl?: string;
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  selectedCondition?: string;
  timestamp: Date;
}

// 逕ｻ蜒酋RL螟画鋤縺ｮ謾ｹ蝟・

// 逕ｻ蜒上お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ縺ｮ謾ｹ蝟・
function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, imageUrl: string) {
  const imgElement = e.currentTarget;
  console.error('逕ｻ蜒剰｡ｨ遉ｺ繧ｨ繝ｩ繝ｼ:', imageUrl);

  // 蜈・・URL繧偵Ο繧ｰ蜃ｺ蜉・
  console.log('蜈・・逕ｻ蜒酋RL:', imageUrl);
  console.log('螟画鋤蠕後・URL:', imgElement.src);

  // 繧ｨ繝ｩ繝ｼ譎ゅ・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・
  try {
    // API險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    // 1. 繝輔ぃ繧､繝ｫ蜷阪・縺ｿ縺ｧ蜀崎ｩｦ陦・
    const fileName = imageUrl.split('/').pop()?.split('\\').pop();
    if (fileName && fileName !== imageUrl) {
      console.log('繝輔ぃ繧､繝ｫ蜷阪・縺ｿ縺ｧ蜀崎ｩｦ陦・', fileName);
      imgElement.src = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
      return;
    }

    // 2. 蜈・・URL繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ
    console.log('蜈・・URL繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ');
    imgElement.src = imageUrl;

  } catch (error) {
    console.error('逕ｻ蜒上お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ螟ｱ謨・', error);
    // 繧ｨ繝ｩ繝ｼ逕ｻ蜒上ｒ陦ｨ遉ｺ
    imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
  }
}

// 逕ｻ蜒酋RL繧呈ｭ｣縺励￥讒狗ｯ峨☆繧矩未謨ｰ
function buildImageUrl(imageUrl: string): string {
  // API險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  // 譌｢縺ｫ螳悟・縺ｪURL縺ｮ蝣ｴ蜷医・縺昴・縺ｾ縺ｾ霑斐☆
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 譌｢縺ｫAPI繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥ｽ｢蠑上・蝣ｴ蜷医・繝吶・繧ｹURL繧定ｿｽ蜉
  if (imageUrl.startsWith('/api/emergency-flow/image/')) {
    return `${apiBaseUrl}${imageUrl}`;
  }
  if (imageUrl.startsWith('/api/troubleshooting/image/')) {
    return `${apiBaseUrl}${imageUrl}`;
  }

  // 繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ
  let fileName = imageUrl;
  if (imageUrl.includes('/')) {
    fileName = imageUrl.split('/').pop() || imageUrl;
  } else if (imageUrl.includes('\\')) {
    fileName = imageUrl.split('\\').pop() || imageUrl;
  }

  // 譁ｰ縺励＞API繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥ｽ｢蠑上↓螟画鋤
  return `${apiBaseUrl}/api/troubleshooting/image/${fileName}`;
}

export default function EmergencyGuideDisplay({ 
  guideId, 
  onExit, 
  isPreview = false,
  onSendToChat,
  backButtonText = "謌ｻ繧・
}: EmergencyGuideDisplayProps) {
  const [guideData, setGuideData] = useState<EmergencyGuideData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  // 繝輔Ο繝ｼ螳溯｡悟ｱ･豁ｴ繧定ｿｽ霍｡
  const [executionHistory, setExecutionHistory] = useState<FlowExecutionStep[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPartialSuccess, setShowPartialSuccess] = useState(false);

  useEffect(() => {
    const fetchGuideData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${guideId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch guide data: ${response.status}`);
        }

        const responseData = await response.json();
        const data = responseData.success && responseData.data ? responseData.data : responseData;
        setGuideData(data);

        // 蛻晄悄繧ｹ繝・ャ繝励ｒ螻･豁ｴ縺ｫ霑ｽ蜉
        if (data.steps && data.steps.length > 0) {
          const initialStep = data.steps[0];
          setExecutionHistory([{
            stepId: initialStep.id,
            title: initialStep.title,
            message: initialStep.message,
            type: initialStep.type,
            imageUrl: initialStep.imageUrl,
            images: initialStep.images,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        console.error("Guide data fetch error:", err);
        setError("繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
      } finally {
        setLoading(false);
      }
    };

    if (guideId) {
      fetchGuideData();
    }
  }, [guideId]);

  const getCurrentStep = (): Step | null => {
    if (!guideData || !guideData.steps || guideData.steps.length === 0) return null;
    return guideData.steps[currentStepIndex] || null;
  };

  const handleNext = (nextStepId?: string) => {
    if (!guideData) return;

    if (nextStepId) {
      // 譚｡莉ｶ蛻・ｲ舌〒謖・ｮ壹＆繧後◆谺｡縺ｮ繧ｹ繝・ャ繝励↓遘ｻ蜍・
      const nextIndex = guideData.steps.findIndex(step => step.id === nextStepId);
      if (nextIndex !== -1) {
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ螻･豁ｴ縺ｫ霑ｽ蜉
        const nextStep = guideData.steps[nextIndex];
        const newHistoryStep: FlowExecutionStep = {
          stepId: nextStep.id,
          title: nextStep.title,
          message: nextStep.message,
          type: nextStep.type,
          imageUrl: nextStep.imageUrl,
          images: nextStep.images,
          selectedCondition: selectedCondition,
          timestamp: new Date()
        };
        setExecutionHistory(prev => [...prev, newHistoryStep]);
      }
    } else {
      // 谺｡縺ｮ繧ｹ繝・ャ繝励↓遘ｻ蜍・
      if (currentStepIndex < guideData.steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ螻･豁ｴ縺ｫ霑ｽ蜉
        const nextStep = guideData.steps[nextIndex];
        const newHistoryStep: FlowExecutionStep = {
          stepId: nextStep.id,
          title: nextStep.title,
          message: nextStep.message,
          type: nextStep.type,
          imageUrl: nextStep.imageUrl,
          images: nextStep.images,
          timestamp: new Date()
        };
        setExecutionHistory(prev => [...prev, newHistoryStep]);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSelectedCondition(null);

      // 螻･豁ｴ縺九ｉ譛蠕後・繧ｹ繝・ャ繝励ｒ蜑企勁
      setExecutionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleConditionSelect = (condition: { label: string; nextId: string }) => {
    setSelectedCondition(condition.nextId);
    handleNext(condition.nextId);
  };

  const handleComplete = () => {
    setIsCompleted(true);
  };

  // 繝輔Ο繝ｼ螳溯｡檎ｵ先棡繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡
  const sendToChat = () => {
    if (!guideData || executionHistory.length === 0) return;

    // 螳溯｡悟ｱ･豁ｴ縺九ｉ繝√Ε繝・ヨ逕ｨ縺ｮ繝・・繧ｿ繧剃ｽ懈・
    const chatData = {
      title: guideData.title,
      description: guideData.description,
      executedSteps: executionHistory.filter(step => 
        step.type !== 'start' && step.type !== 'end'
      ),
      totalSteps: executionHistory.length,
      completedAt: new Date(),
      isPartial: !isCompleted // 陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺九←縺・°縺ｮ繝輔Λ繧ｰ
    };

    // 繧ｫ繧ｹ繧ｿ繝繧､繝吶Φ繝医〒繝√Ε繝・ヨ繧ｳ繝ｳ繝・く繧ｹ繝医↓騾∽ｿ｡
    window.dispatchEvent(new CustomEvent('emergency-guide-completed', {
      detail: chatData
    }));

    // onSendToChat髢｢謨ｰ縺梧署萓帙＆繧後※縺・ｋ蝣ｴ蜷医・蜻ｼ縺ｳ蜃ｺ縺・
    if (onSendToChat) {
      onSendToChat();
    }

    // 陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺ｮ蝣ｴ蜷医・繧ｬ繧､繝臥判髱｢繧帝哩縺倥↑縺・
    if (isCompleted) {
      onExit();
    } else {
      // 陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺ｮ蝣ｴ蜷医・謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
      console.log('陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡螳御ｺ・', chatData);
      setShowPartialSuccess(true);
      setTimeout(() => {
        setShowPartialSuccess(false);
      }, 3000);
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

  if (error || !guideData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">繧ｨ繝ｩ繝ｼ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{error || "繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ"}</p>
          <Button onClick={onExit}>謌ｻ繧・/Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const isLastStep = currentStepIndex === guideData.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  if (!currentStep) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent>
          <p className="text-center py-8">繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ</p>
          <Button onClick={onExit} className="w-full">謌ｻ繧・/Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onExit} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
              {backButtonText}
            </Button>
            <CardTitle className="text-xl break-words leading-tight">
              {guideData.title}{isPreview && ' (繝励Ξ繝薙Η繝ｼ)'}
            </CardTitle>
          </div>
          <div className="text-sm text-gray-500 flex-shrink-0 ml-4">
            繧ｹ繝・ャ繝・{currentStepIndex + 1} / {guideData.steps.length}
          </div>
        </div>
      </CardHeader>

      <CardContent key={currentStep.id}>
        <div className="space-y-6">
          {/* 繧ｹ繝・ャ繝励ち繧､繝医Ν */}
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

          {/* 譚｡莉ｶ蛻・ｲ・*/}
          {currentStep.type === 'decision' && currentStep.conditions && currentStep.conditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {isPreview ? '譚｡莉ｶ蛻・ｲ・' : '驕ｸ謚槭＠縺ｦ縺上□縺輔＞・・}
              </h4>
              {isPreview ? (
                // 繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｯ譚｡莉ｶ蛻・ｲ舌・諠・ｱ縺ｮ縺ｿ陦ｨ遉ｺ
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentStep.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="font-medium text-sm">{condition.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        谺｡繧ｹ繝・ャ繝・ {(() => {
                          const targetStep = guideData.steps.find(s => s.id === condition.nextId);
                          const targetIndex = guideData.steps.findIndex(s => s.id === condition.nextId);
                          return targetStep ? 
                            `${targetStep.title || `繧ｹ繝・ャ繝・${targetIndex + 1}`}` : 
                            '譛ｪ險ｭ螳・;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // 譛ｬ逡ｪ繝｢繝ｼ繝峨〒縺ｯ驕ｸ謚槭・繧ｿ繝ｳ繧定｡ｨ遉ｺ
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentStep.conditions.map((condition, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                      onClick={() => handleConditionSelect(condition)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{condition.label}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 逕ｻ蜒剰｡ｨ遉ｺ繧ｨ繝ｪ繧｢ - 讓ｪ荳ｦ縺ｳ陦ｨ遉ｺ */}
          {(currentStep.images && currentStep.images.length > 0) ? (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStep.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={buildImageUrl(image.url)}
                      alt={`${currentStep.title} - ${image.fileName || '逕ｻ蜒・}`}
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
            // 蜿､縺・ｽ｢蠑上・ imageUrl 縺ｮ縺ｿ縺ｮ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
            <div className="mt-4">
              <img
                src={buildImageUrl(currentStep.imageUrl)}
                alt={currentStep.title}
                className="w-full h-auto rounded-lg shadow-md"
                onError={(e) => handleImageError(e, currentStep.imageUrl)}
              />
            </div>
          ) : (
            <div className="mt-4 text-center py-4 bg-gray-50 rounded-lg">
              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">縺薙・繧ｹ繝・ャ繝励↓逕ｻ蜒上・縺ゅｊ縺ｾ縺帙ｓ</p>
            </div>
          )}

          {/* 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              蜑阪∈
            </Button>

            <div className="flex gap-2">
              {/* 繧ｹ繝・ャ繝・莉･髯阪〒騾∽ｿ｡繝懊ち繝ｳ繧定｡ｨ遉ｺ・医・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｯ髱櫁｡ｨ遉ｺ・・*/}
              {currentStepIndex >= 1 && !isCompleted && !isPreview && (
                <Button
                  onClick={sendToChat}
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡
                </Button>
              )}

              {/* 繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｯ蟶ｸ縺ｫ谺｡縺ｸ繝懊ち繝ｳ繧定｡ｨ遉ｺ縲∵悽逡ｪ繝｢繝ｼ繝峨〒縺ｯ譚｡莉ｶ蛻・ｲ蝉ｻ･螟悶〒陦ｨ遉ｺ */}
              {(isPreview || currentStep.type !== 'decision') && (
                <Button
                  onClick={isLastStep ? handleComplete : () => handleNext()}
                  className="flex items-center gap-2"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      螳御ｺ・
                    </>
                  ) : (
                    <>
                      谺｡縺ｸ
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 螳御ｺ・ｾ後・繝√Ε繝・ヨ騾∽ｿ｡繝懊ち繝ｳ・医・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｯ髱櫁｡ｨ遉ｺ・・*/}
          {isCompleted && !isPreview && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨′螳御ｺ・＠縺ｾ縺励◆</span>
                </div>
                <Button
                  onClick={sendToChat}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  繝√Ε繝・ヨ縺ｫ騾∽ｿ｡
                </Button>
              </div>
              <p className="text-green-700 text-sm mt-2">
                螳溯｡後＠縺溘せ繝・ャ繝励→逕ｻ蜒上ｒ繝√Ε繝・ヨ螻･豁ｴ縺ｫ險倬鹸縺励∪縺・
              </p>
            </div>
          )}

          {/* 繝励Ξ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｮ螳御ｺ・Γ繝・そ繝ｼ繧ｸ */}
          {isCompleted && isPreview && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">繝励Ξ繝薙Η繝ｼ螳御ｺ・/span>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                繝輔Ο繝ｼ縺ｮ繝励Ξ繝薙Η繝ｼ縺悟ｮ御ｺ・＠縺ｾ縺励◆縲ょｮ滄圀縺ｮ菴ｿ逕ｨ譎ゅ↓縺ｯ繝√Ε繝・ヨ騾∽ｿ｡讖溯・縺悟茜逕ｨ縺ｧ縺阪∪縺吶・
              </p>
            </div>
          )}

          {/* 陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡謌仙粥繝｡繝・そ繝ｼ繧ｸ・医・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝峨〒縺ｯ髱櫁｡ｨ遉ｺ・・*/}
          {showPartialSuccess && !isPreview && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">陦ｨ遉ｺ縺励◆繝輔Ο繝ｼ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺励∪縺励◆</span>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                迴ｾ蝨ｨ縺ｾ縺ｧ縺ｮ螳溯｡悟ｱ･豁ｴ縺後メ繝｣繝・ヨ螻･豁ｴ縺ｫ險倬鹸縺輔ｌ縺ｾ縺励◆縲ゅぎ繧､繝峨ｒ邯夊｡後〒縺阪∪縺吶・
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}