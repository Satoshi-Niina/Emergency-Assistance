import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { convertImageUrl } from '../../lib/image-utils';
import { buildApiUrl } from '../../lib/api-unified';

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
        
        // 統一APIクライアントを使用（トップレベルインポートを使用）
        const apiUrl = buildApiUrl(`/api/emergency-flow/detail/${flowId}`);
        console.log('🌐 フロープレビューAPI URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include', // セッション維持のため必須
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
        // プレビュー用APIは直接フローデータを返す、または { data: ... } 形式で返す
        const data = responseData.data || responseData;
        console.log('📋 フロープレビュー処理対象データ:', data);

        // データ構造をFlowDataインターフェースに合わせる
        if (!data) {
          throw new Error('APIレスポンスにデータがありません');
        }

        // idが存在するか確認（idが数値の場合も文字列に変換）
        const resolvedFlowId = data.id?.toString() || data.flowId?.toString() || flowId?.toString() || '';
        if (!resolvedFlowId && !data.title && !data.name) {
          throw new Error('APIレスポンスに有効なフローデータがありません。レスポンス: ' + JSON.stringify(responseData).substring(0, 200));
        }

        // stepsが配列でない場合の処理
        let steps = [];
        if (Array.isArray(data.steps)) {
          steps = data.steps;
        } else if (data.flowData?.steps && Array.isArray(data.flowData.steps)) {
          steps = data.flowData.steps;
        }

        const flowData: FlowData = {
          id: resolvedFlowId || data.id?.toString() || 'unknown',
          title: data.title || data.name || data.flowData?.title || '無題のフロー',
          description: data.description || data.flowData?.description || '',
          steps: steps
        };
        
        console.log('📋 変換済みフローデータ:', flowData);
        
        if (flowData.steps.length === 0) {
          console.warn('⚠️ ステップが0件です');
        }
        
        setFlowData(flowData);
      } catch (err) {
        console.error('Flow data fetch error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`フローデータの取得に失敗しました: ${errorMessage}`);
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
          <CardTitle className='text-red-600'>エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4'>{error || 'フローデータが見つかりません'}</p>
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
                <h4 className='font-medium text-gray-900'>条件分岐:</h4>
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
                        次ステップ:{' '}
                        {(() => {
                          const targetStep = flowData.steps.find(
                            s => s.id === condition.nextId
                          );
                          const targetIndex = flowData.steps.findIndex(
                            s => s.id === condition.nextId
                          );
                          return targetStep
                            ? `${targetStep.title || `ステップ ${targetIndex + 1}`}`
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
              <h4 className='font-medium text-gray-900'>画像:</h4>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {currentStep.images.map((img, index) => {
                  // 画像情報がオブジェクトの場合はプロパティを参照、文字列の場合はそのまま
                  const imageUrl =
                    typeof img === 'object' && img !== null
                      ? convertImageUrl(
                          (img as { url: string; fileName: string }).url
                        )
                      : convertImageUrl(img);
                  const altText =
                    typeof img === 'object' && img !== null
                      ? (img as { url: string; fileName: string }).fileName
                      : String(img);
                  // minimal debug for image URL
                  console.debug('[FlowPreview] image', { index, fileName: altText, convertedUrl: imageUrl });
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
                          console.error('❌ 画像読み込みエラー:', {
                            fileName: altText,
                            convertedUrl: imageUrl?.substring(0, 100) + '...',
                            originalImg: img,
                            error: e,
                            target: e.currentTarget,
                          });
                          // フォールバック処理
                          if (typeof img === 'object' && img !== null) {
                            const imgElement = e.currentTarget;
                            const fileName = (img as { url: string; fileName: string }).fileName;
                            if (fileName) {
                              const fallbackUrl = buildApiUrl(`/api/emergency-flow/image/${fileName}`);
                              imgElement.src = fallbackUrl;
                            }
                          }
                          const target = e.currentTarget;
                          target.style.display = 'none';

                          const errorDiv = document.createElement('div');
                          errorDiv.className =
                            'w-full h-48 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center';
                          errorDiv.textContent = `画像の読み込みに失敗しました: ${altText}`;
                          target.parentNode?.appendChild(errorDiv);
                        }}
                      />
                      <div className='mt-2 text-xs text-gray-500 text-center'>
                        {altText}
                      </div>
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
