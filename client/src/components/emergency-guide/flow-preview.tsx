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
  }>; // 画像オブジェクトの配列
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

        // 統一APIクライアントを使用 - /detail/:id エンドポイントを使用
        const { buildApiUrl } = await import('../../lib/api');
        const apiUrl = buildApiUrl(`/emergency-flow/detail/${flowId}`);
        console.log('🌐 フロープレビューAPI URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include', // セッション維持のため
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API エラーレスポンス:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch flow data: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('📊 フロープレビューAPIレスポンス:', responseData);

        // サーバーからのレスポンス構造に合わせてデータを取得
        // /detail/:id エンドポイントは success: true, data: {...} 形式で返す
        const data = responseData.success && responseData.data ? responseData.data : responseData;
        console.log('📋 フロープレビュー処理対象データ:', data);

        // データ構造をFlowDataインターフェースに合わせる
        const flowData: FlowData = {
          id: data.id.toString(),
          title: data.title || data.name,
          description: data.description || '',
          steps: data.steps || []
        };

        console.log('📋 変換済みフローデータ:', flowData);
        setFlowData(flowData);
      } catch (err) {
        console.error('Flow data fetch error:', err);
        setError('フローデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (flowId) {
      fetchFlowData();
    }
  }, [flowId]);

  const getCurrentStep = (): Step | null => {
    if (!flowData || !flowData.steps || !flowData.steps[currentStepIndex]) return null;
    return flowData.steps[currentStepIndex];
  };

  const handleNext = () => {
    if (flowData && flowData.steps && currentStepIndex < flowData.steps.length - 1) {
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
          <CardTitle className='text-red-600'>エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4'>{error || 'フローデータが見つかりません'}</p>
          <Button onClick={onClose}>閉じる</Button>
        </CardContent>
      </Card>
    );
  }

  // flowData.stepsが存在し、有効な配列であることを確認
  if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
    return (
      <Card className='w-full max-w-4xl mx-auto'>
        <CardHeader>
          <CardTitle className='text-red-600'>エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4'>フローデータにステップが含まれていません</p>
          <Button onClick={onClose}>閉じる</Button>
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
          <p className='text-center py-8'>ステップが見つかりません</p>
          <Button onClick={onClose} className='w-full'>
            閉じる
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
              戻る
            </Button>
            <CardTitle className='text-xl break-words leading-tight'>
              {flowData.title} (プレビュー)
            </CardTitle>
          </div>
          <div className='flex items-center gap-2'>
            <div className='text-sm text-gray-500 flex-shrink-0 ml-4'>
              ステップ {currentStepIndex + 1} / {flowData.steps.length}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={onClose}
              className='h-8 px-3 border-gray-300 hover:bg-gray-100'
            >
              閉じる
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className='space-y-6'>
          {/* ステップタイトル */}
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

          {/* 条件分岐（プレビューモード） */}
          {currentStep.type === 'decision' &&
            currentStep.conditions &&
            currentStep.conditions.length > 0 && (
              <div className='space-y-3'>
                <h4 className='font-medium text-gray-900'>条件分岐</h4>
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
                        次ステップ{' '}
                        {(() => {
                          const targetStep = flowData.steps.find(
                            s => s.id === condition.nextId
                          );
                          const targetIndex = flowData.steps.findIndex(
                            s => s.id === condition.nextId
                          );
                          return targetStep
                            ? `${targetStep.title || `ステップ${targetIndex + 1}`}`
                            : '未設定';
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 画像表示エリア */}
          {currentStep.images && currentStep.images.length > 0 && (
            <div className='space-y-3'>
              <h4 className='font-medium text-gray-900'>画像</h4>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {currentStep.images.map((img, index) => {
                  // 画像情報がオブジェクトの場合、プププロパティを参照、文字列の場合はそのまま
                  // buildImageUrlを使用して統一されたURL変換を適用
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
                  console.log('🖼️ [FlowPreview] 画像表示処理:', {
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
                          console.log('✅ 画像読み込み成功:', {
                            fileName: altText,
                            imageUrl: imageUrl?.substring(0, 100) + '...',
                          });
                        }}
                        onError={e => {
                          const originalUrl = typeof img === 'object' && img !== null
                            ? (img as { url: string; fileName: string }).url
                            : String(img);
                          console.error('❌ 画像読み込みエラー (flow-preview):', {
                            fileName: altText,
                            convertedUrl: imageUrl?.substring(0, 100) + '...',
                            originalImg: img,
                            originalUrl: originalUrl,
                            error: e,
                          });
                          // 統一されたエラーハンドリングを使用
                          handleImageError(e, originalUrl);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className='flex justify-between items-center pt-4 border-t'>
            <Button
              variant='outline'
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className='h-4 w-4 mr-1' />
              前へ
            </Button>

            <div className='text-sm text-gray-500'>
              {currentStepIndex + 1} / {flowData.steps.length}
            </div>

            <Button
              variant='outline'
              onClick={handleNext}
              disabled={isLastStep}
            >
              次へ
              <ArrowRight className='h-4 w-4 ml-1' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlowPreview;
