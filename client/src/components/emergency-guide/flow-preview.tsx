import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { convertImageUrl } from '../../lib/utils.ts';
import { buildApiUrl } from '../../lib/api/config.ts';

interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'step' | 'decision';
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  conditions?: Array<{
    label: string;
    nextId: string;
  }>;
}

interface FlowData {
  id: string;
  title: string;
  description: string;
  steps: Step[];
}

interface FlowPreviewProps {
  flowId: string;
  onClose: () => void;
}

const FlowPreview: React.FC<FlowPreviewProps> = ({ flowId, onClose }) => {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl(`/api/emergency-flow/${flowId}`));
        
        if (!response.ok) {
          throw new Error(`Failed to fetch flow data: ${response.status}`);
        }

        const data = await response.json();
        setFlowData(data);
      } catch (err) {
        console.error("Flow data fetch error:", err);
        setError("繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
      } finally {
        setLoading(false);
      }
    };

    if (flowId) {
      fetchFlowData();
    }
  }, [flowId]);

  const getCurrentStep = (): Step | null => {
    if (!flowData || !flowData.steps[currentStepIndex]) return null;
    return flowData.steps[currentStepIndex];
  };

  const handleNext = () => {
    if (flowData && currentStepIndex < flowData.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !flowData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">繧ｨ繝ｩ繝ｼ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{error || "繝輔Ο繝ｼ繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ"}</p>
          <Button onClick={onClose}>髢峨§繧・/Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const isLastStep = currentStepIndex === flowData.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  if (!currentStep) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent>
          <p className="text-center py-8">繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ</p>
          <Button onClick={onClose} className="w-full">髢峨§繧・/Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
              謌ｻ繧・
            </Button>
            <CardTitle className="text-xl break-words leading-tight">
              {flowData.title} (繝励Ξ繝薙Η繝ｼ)
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 flex-shrink-0 ml-4">
              繧ｹ繝・ャ繝・{currentStepIndex + 1} / {flowData.steps.length}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="h-8 px-3 border-gray-300 hover:bg-gray-100"
            >
              髢峨§繧・
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
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

          {/* 譚｡莉ｶ蛻・ｲ撰ｼ医・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝会ｼ・*/}
          {currentStep.type === 'decision' && currentStep.conditions && currentStep.conditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">譚｡莉ｶ蛻・ｲ・</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentStep.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="font-medium text-sm">{condition.label}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      谺｡繧ｹ繝・ャ繝・ {(() => {
                        const targetStep = flowData.steps.find(s => s.id === condition.nextId);
                        const targetIndex = flowData.steps.findIndex(s => s.id === condition.nextId);
                        return targetStep ? 
                          `${targetStep.title || `繧ｹ繝・ャ繝・${targetIndex + 1}`}` : 
                          '譛ｪ險ｭ螳・;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 逕ｻ蜒剰｡ｨ遉ｺ繧ｨ繝ｪ繧｢ */}
          {currentStep.images && currentStep.images.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">逕ｻ蜒・</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStep.images.map((image, index) => {
                  const imageUrl = convertImageUrl(image.url);
                  console.log('逕ｻ蜒酋RL螟画鋤:', { original: image.url, converted: imageUrl });
                  
                  return (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={image.fileName}
                        className="w-full h-48 object-cover rounded-lg border"
                        onError={(e) => {
                          console.error('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', image.url);
                          console.error('螟画鋤蠕後・URL:', imageUrl);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'w-full h-48 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center';
                          errorDiv.textContent = '逕ｻ蜒上・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
                          target.parentNode?.appendChild(errorDiv);
                        }}
                      />
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        {image.fileName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              蜑阪∈
            </Button>
            
            <div className="text-sm text-gray-500">
              {currentStepIndex + 1} / {flowData.steps.length}
            </div>
            
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={isLastStep}
            >
              谺｡縺ｸ
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowPreview; 