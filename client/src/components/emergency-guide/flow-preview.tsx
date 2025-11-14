import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { convertImageUrl, buildImageUrl, handleImageError } from '../../lib/image-utils';

interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'step' | 'decision';
  images?: Array<{
    url: string;
    fileName: string;
  }>; // 逕ｻ蜒上が繝悶ず繧ｧ繧ｯ繝医・驟榊・
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
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        
        // 邨ｱ荳API繧ｯ繝ｩ繧､繧｢繝ｳ繝医ｒ菴ｿ逕ｨ - /detail/:id 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ菴ｿ逕ｨ
        const { buildApiUrl } = await import('../../lib/api');
        const apiUrl = buildApiUrl(`/emergency-flow/detail/${flowId}`);
        console.log('倹 繝輔Ο繝ｼ繝励Ξ繝薙Η繝ｼAPI URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include', // 繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√・縺溘ａ蠢・・
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('笶・API 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch flow data: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('投 繝輔Ο繝ｼ繝励Ξ繝薙Η繝ｼAPI繝ｬ繧ｹ繝昴Φ繧ｹ:', responseData);

        // 繧ｵ繝ｼ繝舌・縺九ｉ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧貞叙蠕・
        // /detail/:id 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・ success: true, data: {...} 蠖｢蠑上〒霑斐☆
        const data = responseData.success && responseData.data ? responseData.data : responseData;
        console.log('搭 繝輔Ο繝ｼ繝励Ξ繝薙Η繝ｼ蜃ｦ逅・ｯｾ雎｡繝・・繧ｿ:', data);

        // 繝・・繧ｿ讒矩繧巽lowData繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ縺ｫ蜷医ｏ縺帙ｋ
        const flowData: FlowData = {
          id: data.id.toString(),
          title: data.title || data.name,
          description: data.description || '',
          steps: data.steps || []
        };
        
        console.log('搭 螟画鋤貂医∩繝輔Ο繝ｼ繝・・繧ｿ:', flowData);
        setFlowData(flowData);
      } catch (err) {
        console.error('Flow data fetch error:', err);
        setError('繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
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
      <Card className='w-full max-w-4xl mx-auto'>
        <CardContent className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !flowData) {
    return (
      <Card className='w-full max-w-4xl mx-auto'>
        <CardHeader>
          <CardTitle className='text-red-600'>繧ｨ繝ｩ繝ｼ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4'>{error || '繝輔Ο繝ｼ繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ'}</p>
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
      <Card className='w-full max-w-4xl mx-auto'>
        <CardContent>
          <p className='text-center py-8'>繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ</p>
          <Button onClick={onClose} className='w-full'>
            髢峨§繧・
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-4xl mx-auto'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-2 flex-1 min-w-0'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onClose}
              className='flex-shrink-0'
            >
              <ArrowLeft className='h-4 w-4' />
              謌ｻ繧・
            </Button>
            <CardTitle className='text-xl break-words leading-tight'>
              {flowData.title} (繝励Ξ繝薙Η繝ｼ)
            </CardTitle>
          </div>
          <div className='flex items-center gap-2'>
            <div className='text-sm text-gray-500 flex-shrink-0 ml-4'>
              繧ｹ繝・ャ繝・{currentStepIndex + 1} / {flowData.steps.length}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={onClose}
              className='h-8 px-3 border-gray-300 hover:bg-gray-100'
            >
              髢峨§繧・
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className='space-y-6'>
          {/* 繧ｹ繝・ャ繝励ち繧､繝医Ν */}
          <div className='bg-blue-50 p-4 rounded-lg border border-blue-200'>
            <h3 className='font-semibold text-blue-900 mb-2 text-lg'>
              {currentStep.title}
            </h3>
            {currentStep.description && (
              <p className='text-blue-800 text-sm mb-3'>
                {currentStep.description}
              </p>
            )}
            <div className='text-blue-800 whitespace-pre-line'>
              {currentStep.message}
            </div>
          </div>

          {/* 譚｡莉ｶ蛻・ｲ撰ｼ医・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝会ｼ・*/}
          {currentStep.type === 'decision' &&
            currentStep.conditions &&
            currentStep.conditions.length > 0 && (
              <div className='space-y-3'>
                <h4 className='font-medium text-gray-900'>譚｡莉ｶ蛻・ｲ・</h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {currentStep.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className='p-3 border border-gray-200 rounded-lg bg-gray-50'
                    >
                      <div className='font-medium text-sm'>
                        {condition.label}
                      </div>
                      <div className='text-xs text-gray-500 mt-1'>
                        谺｡繧ｹ繝・ャ繝・{' '}
                        {(() => {
                          const targetStep = flowData.steps.find(
                            s => s.id === condition.nextId
                          );
                          const targetIndex = flowData.steps.findIndex(
                            s => s.id === condition.nextId
                          );
                          return targetStep
                            ? `${targetStep.title || `繧ｹ繝・ャ繝・${targetIndex + 1}`}`
                            : '譛ｪ險ｭ螳・;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 逕ｻ蜒剰｡ｨ遉ｺ繧ｨ繝ｪ繧｢ */}
          {currentStep.images && currentStep.images.length > 0 && (
            <div className='space-y-3'>
              <h4 className='font-medium text-gray-900'>逕ｻ蜒・</h4>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {currentStep.images.map((img, index) => {
                  // 逕ｻ蜒乗ュ蝣ｱ縺後が繝悶ず繧ｧ繧ｯ繝医・蝣ｴ蜷医・繝励Ο繝代ユ繧｣繧貞盾辣ｧ縲∵枚蟄怜・縺ｮ蝣ｴ蜷医・縺昴・縺ｾ縺ｾ
                  // buildImageUrl繧剃ｽｿ逕ｨ縺励※邨ｱ荳縺輔ｌ縺欟RL螟画鋤繧帝←逕ｨ
                  const imageUrl =
                    typeof img === 'object' && img !== null
                      ? buildImageUrl(
                          (img as { url: string; fileName: string }).url
                        )
                      : buildImageUrl(img);
                  const altText =
                    typeof img === 'object' && img !== null
                      ? (img as { url: string; fileName: string }).fileName
                      : String(img);
                  console.log('名・・[FlowPreview] 逕ｻ蜒剰｡ｨ遉ｺ繝・ヰ繝・げ:', {
                    index,
                    fileName: altText,
                    convertedUrl: imageUrl,
                    originalImg: img,
                    imgType: typeof img,
                    hasUrl: typeof img === 'object' && img !== null && !!(img as any).url,
                    urlValue: typeof img === 'object' && img !== null ? (img as any).url : img
                  });
                  return (
                    <div key={index} className='relative'>
                      <img
                        src={imageUrl}
                        alt={altText}
                        className='w-full h-48 object-cover rounded-lg border'
                        crossOrigin="anonymous"
                        onLoad={() => {
                          console.log('笨・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                            fileName: altText,
                            imageUrl: imageUrl?.substring(0, 100) + '...',
                          });
                        }}
                        onError={e => {
                          const originalUrl = typeof img === 'object' && img !== null
                            ? (img as { url: string; fileName: string }).url
                            : String(img);
                          console.error('笶・逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ (flow-preview):', {
                            fileName: altText,
                            convertedUrl: imageUrl?.substring(0, 100) + '...',
                            originalImg: img,
                            originalUrl: originalUrl,
                            error: e,
                          });
                          // 邨ｱ荳縺輔ｌ縺溘お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繧剃ｽｿ逕ｨ
                          handleImageError(e, originalUrl);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
          <div className='flex justify-between items-center pt-4 border-t'>
            <Button
              variant='outline'
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className='h-4 w-4 mr-1' />
              蜑阪∈
            </Button>

            <div className='text-sm text-gray-500'>
              {currentStepIndex + 1} / {flowData.steps.length}
            </div>

            <Button
              variant='outline'
              onClick={handleNext}
              disabled={isLastStep}
            >
              谺｡縺ｸ
              <ArrowRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowPreview;
