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
  isPreview?: boolean; // プレビューモードかどぁE��のフラグ
  onSendToChat: () => void;
  backButtonText?: string; // 戻る�EタンのチE��スチE
}

// フロー実行履歴の型定義
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

// 画像URL変換の改喁E

// 画像エラーハンドリングの改喁E
function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, imageUrl: string) {
  const imgElement = e.currentTarget;
  console.error('画像表示エラー:', imageUrl);

  // 允E�EURLをログ出劁E
  console.log('允E�E画像URL:', imageUrl);
  console.log('変換後�EURL:', imgElement.src);

  // エラー時�Eフォールバック処琁E
  try {
    // API設宁E- VITE_API_BASE_URLのみを使用
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    // 1. ファイル名�Eみで再試衁E
    const fileName = imageUrl.split('/').pop()?.split('\\').pop();
    if (fileName && fileName !== imageUrl) {
      console.log('ファイル名�Eみで再試衁E', fileName);
      imgElement.src = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
      return;
    }

    // 2. 允E�EURLをそのまま使用
    console.log('允E�EURLをそのまま使用');
    imgElement.src = imageUrl;

  } catch (error) {
    console.error('画像エラーハンドリング失敁E', error);
    // エラー画像を表示
    imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
  }
}

// 画像URLを正しく構築する関数
function buildImageUrl(imageUrl: string): string {
  // API設宁E- VITE_API_BASE_URLのみを使用
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  // 既に完�EなURLの場合�Eそ�Eまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 既にAPIエンド�Eイント形式�E場合�Eベ�EスURLを追加
  if (imageUrl.startsWith('/api/emergency-flow/image/')) {
    return `${apiBaseUrl}${imageUrl}`;
  }
  if (imageUrl.startsWith('/api/troubleshooting/image/')) {
    return `${apiBaseUrl}${imageUrl}`;
  }

  // ファイル名を抽出
  let fileName = imageUrl;
  if (imageUrl.includes('/')) {
    fileName = imageUrl.split('/').pop() || imageUrl;
  } else if (imageUrl.includes('\\')) {
    fileName = imageUrl.split('\\').pop() || imageUrl;
  }

  // 新しいAPIエンド�Eイント形式に変換
  return `${apiBaseUrl}/api/troubleshooting/image/${fileName}`;
}

export default function EmergencyGuideDisplay({ 
  guideId, 
  onExit, 
  isPreview = false,
  onSendToChat,
  backButtonText = "戻めE
}: EmergencyGuideDisplayProps) {
  const [guideData, setGuideData] = useState<EmergencyGuideData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  // フロー実行履歴を追跡
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

        // 初期スチE��プを履歴に追加
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
        setError("ガイドデータの取得に失敗しました");
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
      // 条件刁E��で持E��された次のスチE��プに移勁E
      const nextIndex = guideData.steps.findIndex(step => step.id === nextStepId);
      if (nextIndex !== -1) {
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 次のスチE��プを履歴に追加
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
      // 次のスチE��プに移勁E
      if (currentStepIndex < guideData.steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setSelectedCondition(null);

        // 次のスチE��プを履歴に追加
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

      // 履歴から最後�EスチE��プを削除
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

  // フロー実行結果をチャチE��に送信
  const sendToChat = () => {
    if (!guideData || executionHistory.length === 0) return;

    // 実行履歴からチャチE��用のチE�Eタを作�E
    const chatData = {
      title: guideData.title,
      description: guideData.description,
      executedSteps: executionHistory.filter(step => 
        step.type !== 'start' && step.type !== 'end'
      ),
      totalSteps: executionHistory.length,
      completedAt: new Date(),
      isPartial: !isCompleted // 表示したフローをチャチE��に送信かどぁE��のフラグ
    };

    // カスタムイベントでチャチE��コンチE��ストに送信
    window.dispatchEvent(new CustomEvent('emergency-guide-completed', {
      detail: chatData
    }));

    // onSendToChat関数が提供されてぁE��場合�E呼び出ぁE
    if (onSendToChat) {
      onSendToChat();
    }

    // 表示したフローをチャチE��に送信の場合�Eガイド画面を閉じなぁE
    if (isCompleted) {
      onExit();
    } else {
      // 表示したフローをチャチE��に送信の場合�E成功メチE��ージを表示
      console.log('表示したフローをチャチE��に送信完亁E', chatData);
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
          <CardTitle className="text-red-600">エラー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{error || "ガイドデータが見つかりません"}</p>
          <Button onClick={onExit}>戻めE/Button>
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
          <p className="text-center py-8">スチE��プが見つかりません</p>
          <Button onClick={onExit} className="w-full">戻めE/Button>
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
              {guideData.title}{isPreview && ' (プレビュー)'}
            </CardTitle>
          </div>
          <div className="text-sm text-gray-500 flex-shrink-0 ml-4">
            スチE��チE{currentStepIndex + 1} / {guideData.steps.length}
          </div>
        </div>
      </CardHeader>

      <CardContent key={currentStep.id}>
        <div className="space-y-6">
          {/* スチE��プタイトル */}
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

          {/* 条件刁E��E*/}
          {currentStep.type === 'decision' && currentStep.conditions && currentStep.conditions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {isPreview ? '条件刁E��E' : '選択してください�E�E}
              </h4>
              {isPreview ? (
                // プレビューモードでは条件刁E���E惁E��のみ表示
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentStep.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="font-medium text-sm">{condition.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        次スチE��チE {(() => {
                          const targetStep = guideData.steps.find(s => s.id === condition.nextId);
                          const targetIndex = guideData.steps.findIndex(s => s.id === condition.nextId);
                          return targetStep ? 
                            `${targetStep.title || `スチE��チE${targetIndex + 1}`}` : 
                            '未設宁E;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // 本番モードでは選択�Eタンを表示
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

          {/* 画像表示エリア - 横並び表示 */}
          {(currentStep.images && currentStep.images.length > 0) ? (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStep.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={buildImageUrl(image.url)}
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
                src={buildImageUrl(currentStep.imageUrl)}
                alt={currentStep.title}
                className="w-full h-auto rounded-lg shadow-md"
                onError={(e) => handleImageError(e, currentStep.imageUrl)}
              />
            </div>
          ) : (
            <div className="mt-4 text-center py-4 bg-gray-50 rounded-lg">
              <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">こ�EスチE��プに画像�Eありません</p>
            </div>
          )}

          {/* ナビゲーションボタン */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              前へ
            </Button>

            <div className="flex gap-2">
              {/* スチE��チE以降で送信ボタンを表示�E��Eレビューモードでは非表示�E�E*/}
              {currentStepIndex >= 1 && !isCompleted && !isPreview && (
                <Button
                  onClick={sendToChat}
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  表示したフローをチャチE��に送信
                </Button>
              )}

              {/* プレビューモードでは常に次へボタンを表示、本番モードでは条件刁E��以外で表示 */}
              {(isPreview || currentStep.type !== 'decision') && (
                <Button
                  onClick={isLastStep ? handleComplete : () => handleNext()}
                  className="flex items-center gap-2"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      完亁E
                    </>
                  ) : (
                    <>
                      次へ
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 完亁E���EチャチE��送信ボタン�E��Eレビューモードでは非表示�E�E*/}
          {isCompleted && !isPreview && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">応急処置ガイドが完亁E��ました</span>
                </div>
                <Button
                  onClick={sendToChat}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  チャチE��に送信
                </Button>
              </div>
              <p className="text-green-700 text-sm mt-2">
                実行したスチE��プと画像をチャチE��履歴に記録しまぁE
              </p>
            </div>
          )}

          {/* プレビューモードでの完亁E��チE��ージ */}
          {isCompleted && isPreview && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">プレビュー完亁E/span>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                フローのプレビューが完亁E��ました。実際の使用時にはチャチE��送信機�Eが利用できます、E
              </p>
            </div>
          )}

          {/* 表示したフローをチャチE��に送信成功メチE��ージ�E��Eレビューモードでは非表示�E�E*/}
          {showPartialSuccess && !isPreview && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">表示したフローをチャチE��に送信しました</span>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                現在までの実行履歴がチャチE��履歴に記録されました。ガイドを続行できます、E
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
