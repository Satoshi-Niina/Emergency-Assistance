import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Image as ImageIcon,
  Send,
  X,
} from 'lucide-react';
import { convertImageUrl } from '../../lib/image-utils';

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

interface mergencyGuideData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: Step[];
  updatedAt?: string;
}

interface mergencyGuideDisplayProps {
  guideId: string;
  onxit: () => void;
  isPreview?: boolean; // プレビューモードかどうかのフラグ
  onSendToChat: () => void;
  backButtonText?: string; // 戻るボタンのテキスト
}

// フロー実行履歴の型定義
interface FlowxecutionStep {
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

// 画像URL変換の改善
// 画像エラーハンドリングの改善
// 統一されたユーティリティを使用
import { handleImageError } from '../../lib/image-utils';

// 画像URLを正しく構築する関数
// 統一されたユーティリティを使用
import { buildImageUrl } from '../../lib/image-utils';

export default function mergencyGuideDisplay({
  guideId,
  onxit,
  isPreview = false,
  onSendToChat,
  backButtonText = '戻る',
}: mergencyGuideDisplayProps) {
  const [guideData, setGuideData] = useState<mergencyGuideData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string | null>(
    null
  );

  // フロー実行履歴を追跡
  const [executionHistory, setxecutionHistory] = useState<FlowxecutionStep[]>(
    []
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPartialSuccess, setShowPartialSuccess] = useState(false);

  useEffect(() => {
    const fetchGuideData = async () => {
      try {
        setLoading(true);
        console.log('🔄 応急処置ガイドデータ取得開始', guideId);

        // キャッシュ無効化のためにタイムスタンプを追加
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const cacheBuster = `?ts=${timestamp}&r=${randomId}`;

        // 統一API設定を使用 - emergency-flow APIを使用
        const { buildApiUrl } = await import('../../lib/api');
        const apiUrl = buildApiUrl(`/emergency-flow/${guideId}${cacheBuster}`);

        console.log('🌐 ガイド詳細API URL:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });

        console.log('📡 レスポンス状態', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API エラー:', errorText);
          throw new Error(`Failed to fetch guide data: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        console.log('📊 取得したデータ:', responseData);

        const data =
          responseData.success && responseData.data
            ? responseData.data
            : responseData;

        console.log('📋 処理対象データ:', data);
        setGuideData(data);

        // 初期ステップを履歴に追加
        if (data.steps && data.steps.length > 0) {
          const initialStep = data.steps[0];
          setxecutionHistory([
            {
              stepId: initialStep.id,
              title: initialStep.title,
              message: initialStep.message,
              type: initialStep.type,
              imageUrl: initialStep.imageUrl,
              images: initialStep.images,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        console.error('Guide data fetch error:', err);
        setError('ガイドデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (guideId) {
      fetchGuideData();
    }
  }, [guideId]);

  const getCurrentStep = (): Step | null => {
    if (!guideData || !guideData.steps || guideData.steps.length === 0)
      return null;
    return guideData.steps[currentStepIndex] || null;
  };

  const handleNext = (nextStepId?: string) => {
    if (!guideData) return;

    if (nextStepId) {
      // 条件分岐で指定された次のステップに移動
      const nextIndex = guideData.steps.findIndex(
        step => step.id === nextStepId
      );
      if (nextIndex !== -1) {
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 次のステップを履歴に追加
        const nextStep = guideData.steps[nextIndex];
        const newHistoryStep: FlowxecutionStep = {
          stepId: nextStep.id,
          title: nextStep.title,
          message: nextStep.message,
          type: nextStep.type,
          imageUrl: nextStep.imageUrl,
          images: nextStep.images,
          selectedCondition: selectedCondition,
          timestamp: new Date(),
        };
        setxecutionHistory(prev => [...prev, newHistoryStep]);
      }
    } else {
      // 次のステップに移動
      if (currentStepIndex < guideData.steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 次のステップを履歴に追加
        const nextStep = guideData.steps[nextIndex];
        const newHistoryStep: FlowxecutionStep = {
          stepId: nextStep.id,
          title: nextStep.title,
          message: nextStep.message,
          type: nextStep.type,
          imageUrl: nextStep.imageUrl,
          images: nextStep.images,
          timestamp: new Date(),
        };
        setxecutionHistory(prev => [...prev, newHistoryStep]);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSelectedCondition(null);

      // 履歴から最後のステップを削除
      setxecutionHistory(prev => prev.slice(0, -1));
    }
  };

  const handleConditionSelect = (condition: {
    label: string;
    nextId: string;
  }) => {
    setSelectedCondition(condition.nextId);
    handleNext(condition.nextId);
  };

  const handleComplete = () => {
    setIsCompleted(true);
  };

  // フロー実行結果を履歴として保存
  const sendToChat = () => {
    if (!guideData || executionHistory.length === 0) return;

    // 実行履歴から保存用のデータを作成
    const chatData = {
      title: guideData.title,
      description: guideData.description,
      executedSteps: executionHistory.filter(
        step => step.type !== 'start' && step.type !== 'end'
      ),
      totalSteps: executionHistory.length,
      completedAt: new Date(),
      isPartial: !isCompleted, // 部分的な履歴保存かどうかのフラグ
    };

    // カスタムイベントで履歴保存データを送信
    window.dispatchvent(
      new Customvent('emergency-guide-completed', {
        detail: chatData,
      })
    );

    // onSendToChat関数が提供されている場合は呼び出し
    if (onSendToChat) {
      onSendToChat();
    }

    // 完了していない場合はガイド画面を閉じない
    if (isCompleted) {
      onxit();
    } else {
      // 部分的な履歴保存の場合は成功メッセージを表示
      console.log('履歴保存完了', chatData);
      setShowPartialSuccess(true);
      setTimeout(() => {
        setShowPartialSuccess(false);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <Card className='w-full max-w-4xl mx-auto'>
        <CardContent className='flex justify-center items-center py-12'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary'></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !guideData) {
    return (
      <Card className='w-full max-w-4xl mx-auto'>
        <CardHeader>
          <CardTitle className='text-red-600'>エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4'>{error || 'ガイドデータが見つかりません'}</p>
          <Button onClick={onxit}>戻る</Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const isLastStep = currentStepIndex === guideData.steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  if (!currentStep) {
    return (
      <Card className='w-full max-w-4xl mx-auto'>
        <CardContent>
          <p className='text-center py-8'>ステップが見つかりません</p>
          <Button onClick={onxit} className='w-full'>
            戻め          </Button>
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
              onClick={onxit}
              className='flex-shrink-0'
            >
              <ArrowLeft className='h-4 w-4' />
              {backButtonText}
            </Button>
            <CardTitle className='text-xl break-words leading-tight'>
              {guideData.title}
              {isPreview && ' (プレビュー)'}
            </CardTitle>
          </div>
          <div className='text-sm text-gray-500 flex-shrink-0 ml-4'>
            ステップ {currentStepIndex + 1} / {guideData.steps.length}
          </div>
        </div>
      </CardHeader>

      <CardContent key={currentStep.id}>
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

          {/* 条件分岐 */}
          {currentStep.type === 'decision' &&
            currentStep.conditions &&
            currentStep.conditions.length > 0 && (
              <div className='space-y-3'>
                <h4 className='font-medium text-gray-900'>
                  {isPreview ? '条件分岐' : '選択してください'}
                </h4>
                {isPreview ? (
                  // プレビューモードでは条件分岐の選択肢のみ表示
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
                            const targetStep = guideData.steps.find(
                              s => s.id === condition.nextId
                            );
                            const targetIndex = guideData.steps.findIndex(
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
                ) : (
                  // 本番モードでは選択ボタンを表示
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    {currentStep.conditions.map((condition, index) => (
                      <Button
                        key={index}
                        variant='outline'
                        className='h-auto p-4 text-left justify-start'
                        onClick={() => handleConditionSelect(condition)}
                      >
                        <div className='flex flex-col items-start'>
                          <span className='font-medium'>{condition.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* 画像表示エリア - 横並び表示 */}
          {currentStep.images && currentStep.images.length > 0 ? (
            <div className='mt-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {currentStep.images.map((image, index) => (
                  <div key={index} className='relative'>
                    <img
                      src={buildImageUrl(image.url)}
                      alt={`${currentStep.title} - ${image.fileName || '画像'}`}
                      className='w-full h-auto rounded-lg shadow-md'
                      crossOrigin="anonymous"
                      onError={e => {
                        console.error('❌ 画像読み込みエラー (emergency-guide-display):', {
                          imageUrl: image.url,
                          builtUrl: buildImageUrl(image.url),
                          fileName: image.fileName,
                          stepTitle: currentStep.title,
                          index,
                        });
                        handleImageError(e, image.url);
                      }}
                      onLoad={() => {
                        console.log('✅画像読み込み成功 (emergency-guide-display):', {
                          imageUrl: image.url,
                          builtUrl: buildImageUrl(image.url),
                          fileName: image.fileName,
                          stepTitle: currentStep.title,
                          index,
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : currentStep.imageUrl ? (
            // 古い形式の imageUrl のみのフォールバック
            <div className='mt-4'>
              <img
                src={buildImageUrl(currentStep.imageUrl)}
                alt={currentStep.title}
                className='w-full h-auto rounded-lg shadow-md'
                crossOrigin="anonymous"
                onError={e => {
                  console.error('❌画像読み込みエラー (legacy imageUrl):', {
                    imageUrl: currentStep.imageUrl,
                    builtUrl: buildImageUrl(currentStep.imageUrl),
                    stepTitle: currentStep.title,
                  });
                  handleImageError(e, currentStep.imageUrl);
                }}
                onLoad={() => {
                  console.log('✅画像読み込み成功 (legacy imageUrl):', {
                    imageUrl: currentStep.imageUrl,
                    builtUrl: buildImageUrl(currentStep.imageUrl),
                    stepTitle: currentStep.title,
                  });
                }}
              />
            </div>
          ) : (
            <div className='mt-4 text-center py-4 bg-gray-50 rounded-lg'>
              <ImageIcon className='mx-auto h-8 w-8 text-gray-400' />
              <p className='mt-2 text-sm text-gray-600'>
                このステップに画像はありません
              </p>
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className='flex justify-between items-center pt-4 border-t'>
            <Button
              variant='outline'
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              前へ
            </Button>

            <div className='flex gap-2'>
              {/* ステップ2以降でチャット履歴送信ボタンを表示、プレビューモードでは非表示 */}
              {currentStepIndex >= 1 && !isCompleted && !isPreview && (
                <Button
                  onClick={sendToChat}
                  variant='outline'
                  className='bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                >
                  <Send className='h-4 w-4 mr-2' />
                  チャット履歴送信
                </Button>
              )}

              {/* プレビューモードでは常に次へボタンを表示、本番モードでは条件分岐以外で表示 */}
              {(isPreview || currentStep.type !== 'decision') && (
                <Button
                  onClick={isLastStep ? handleComplete : () => handleNext()}
                  className='flex items-center gap-2'
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className='h-4 w-4' />
                      完了
                    </>
                  ) : (
                    <>
                      次へ
                      <ArrowRight className='h-4 w-4' />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 完了後のチャット履歴送信ボタン、プレビューモードでは非表示 */}
          {isCompleted && !isPreview && (
            <div className='mt-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5 text-green-600' />
                  <span className='text-green-800 font-medium'>
                    応急処置ガイドが完了しました
                  </span>
                </div>
                <Button
                  onClick={sendToChat}
                  className='bg-green-600 hover:bg-green-700 text-white'
                >
                  <Send className='h-4 w-4 mr-2' />
                  チャット履歴送信
                </Button>
              </div>
              <p className='text-green-700 text-sm mt-2'>
                実行したステップと画像をチャット履歴に記録しました。
              </p>
            </div>
          )}

          {/* プレビューモードでの完了メッセージ */}
          {isCompleted && isPreview && (
            <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-5 w-5 text-blue-600' />
                <span className='text-blue-800 font-medium'>
                  プレビュー完了
                </span>
              </div>
              <p className='text-blue-700 text-sm mt-2'>
                フローのプレビューが完了しました。実際の使用時にはチャット履歴送信機能が利用できます。
              </p>
            </div>
          )}

          {/* チャット履歴送信成功メッセージ、プレビューモードでは非表示 */}
          {showPartialSuccess && !isPreview && (
            <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-5 w-5 text-blue-600' />
                <span className='text-blue-800 font-medium'>
                  チャット履歴に送信しました
                </span>
              </div>
              <p className='text-blue-700 text-sm mt-2'>
                現在までの実行履歴をチャットに送信しました。ガイドを続行できます。
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
