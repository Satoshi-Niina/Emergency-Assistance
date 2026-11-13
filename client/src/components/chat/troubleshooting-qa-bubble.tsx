import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  HelpCircle,
  Volume2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { speakText, stopSpeaking } from '../../lib/text-to-speech';
import CardInlineInput from './card-inline-input';

export interface VerifiedSourceInfo {
  isVerified: boolean;
  sourceName?: string;
  matchedGuideId?: string;
  matchedGuideTitle?: string;
}

export interface TroubleshootingQABubbleProps {
  question: string;
  options?: string[];
  reasoning?: string;
  safetyWarning?: string;
  detailDescription?: string;
  steps?: string[];
  verifiedSource?: VerifiedSourceInfo;
  selectedAnswer?: string;
  onAnswer: (answer: string, media?: any[]) => Promise<boolean | void> | void;
  onOpenGuide?: (guideId: string) => void;
  isLoading?: boolean;
  isLatestBubble?: boolean;
  canGoBack?: boolean;
  onGoBack?: () => void;
  contained?: boolean;
}

export default function TroubleshootingQABubble({
  question,
  options = [],
  reasoning,
  safetyWarning,
  detailDescription,
  steps = [],
  verifiedSource,
  selectedAnswer,
  onAnswer,
  onOpenGuide,
  isLoading = false,
  isLatestBubble = true,
  canGoBack = false,
  onGoBack,
  contained = false,
}: TroubleshootingQABubbleProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    selectedAnswer || null
  );
  const [showDetails, setShowDetails] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const submittingRef = React.useRef(false);
  const { toast } = useToast();

  // 親からの回答状態・最新バブル状態・通信状態の同期（戻る操作や送信失敗時のロック解除に対応）
  React.useEffect(() => {
    setSelectedOption(selectedAnswer || null);
    if (isLatestBubble && !selectedAnswer && !isLoading) {
      setIsSubmittingLocal(false);
      submittingRef.current = false;
    }
  }, [selectedAnswer, isLatestBubble, isLoading]);

  React.useEffect(() => {
    setCurrentStepIndex(0);
    setShowDetails(false);
  }, [question]);

  const isInteractionDisabled = isLoading || isSubmittingLocal || !isLatestBubble;

  // 「分からない」系の選択肢が含まれていない場合は自動補完
  const normalizedOptions = React.useMemo(() => {
    const base = Array.isArray(options)
      ? options.filter(opt => typeof opt === 'string' && opt.trim().length > 0)
      : [];
    const hasUnknown = base.some(
      opt =>
        opt.includes('分から') ||
        opt.includes('わから') ||
        opt.includes('不明') ||
        opt.includes('判断できない')
    );
    const filtered = base.filter(
      opt => !opt.startsWith('その他') && !opt.includes('自由入力')
    );
    if (!hasUnknown && filtered.length > 0) {
      return [...filtered, '分からない（判断できない）'];
    }
    return filtered;
  }, [options]);

  const handleOptionSelect = async (option: string) => {
    if (submittingRef.current || isInteractionDisabled) return;
    submittingRef.current = true;
    setIsSubmittingLocal(true);
    setSelectedOption(option);
    try {
      const ok = await onAnswer(option);
      if (ok === false) {
        setSelectedOption(null);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmittingLocal(false);
    }
  };

  const handleTextToSpeech = async () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      toast({
        title: '音声読み上げを停止しました',
        duration: 2000,
      });
      return;
    }

    const speechParts: string[] = [];
    if (safetyWarning) {
      speechParts.push(`安全確認。${safetyWarning}`);
    }
    if (question) {
      speechParts.push(question);
    }
    if (normalizedOptions.length > 0) {
      speechParts.push(`選択肢は、${normalizedOptions.join('、')}、です。`);
    }
    const textToRead = speechParts.join('。');
    if (!textToRead.trim()) return;

    setIsSpeaking(true);
    toast({
      title: '音声読み上げを開始します',
      duration: 2000,
    });

    try {
      await speakText(textToRead, {
        rate: 1.0,
        pitch: 1.0,
        lang: 'ja-JP',
      });
    } catch (error) {
      toast({
        title: '音声読み上げエラー',
        description:
          error instanceof Error
            ? error.message
            : '音声の読み上げに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <Card
      className={`w-full ${
        contained
          ? 'max-w-none border-0 shadow-none rounded-none bg-transparent'
          : isLatestBubble
            ? 'max-w-4xl mx-auto border-2 border-blue-400 bg-white shadow-lg'
            : 'max-w-3xl border border-blue-200 bg-white/95 shadow-sm'
      }`}
    >
      <CardContent className='p-5 md:p-6 space-y-4'>
        {/* 1. 安全確認が必要な場合は最優先表示（質問より上に表示） */}
        {safetyWarning && (
          <div
            role='alert'
            className='p-4 rounded-lg border-2 border-red-400 bg-red-50 flex items-start gap-3'
          >
            <ShieldAlert className='w-6 h-6 text-red-600 flex-shrink-0 mt-1' />
            <div className='flex-1 min-w-0'>
              <div className='font-bold text-red-800 text-base leading-relaxed break-words mb-1'>
                安全確認（最優先）
              </div>
              <div className='text-red-900 font-medium text-base leading-relaxed break-words whitespace-pre-wrap'>
                {safetyWarning}
              </div>
            </div>
          </div>
        )}

        {/* 2. ヘッダー＋音声読み上げボタン＋質問（1回につき原則1つ） */}
        <div className='flex items-start gap-3'>
          <div className='flex-shrink-0'>
            <div className='w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center'>
              <HelpCircle className='w-6 h-6 text-white' />
            </div>
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
              <div className='flex flex-wrap items-center gap-2 min-w-0'>
                <Badge
                  variant='secondary'
                  className='bg-blue-100 text-blue-800 font-semibold h-auto py-1 whitespace-normal break-words'
                >
                  AI故障診断（1問1答）
                </Badge>
                {verifiedSource?.isVerified && (
                  <Badge
                    variant='outline'
                    className='border-green-500 text-green-700 bg-green-50 text-xs h-auto py-1 whitespace-normal break-words'
                  >
                    根拠資料照合済
                    {verifiedSource.sourceName
                      ? `: ${verifiedSource.sourceName}`
                      : ''}
                  </Badge>
                )}
              </div>

              <button
                type='button'
                onClick={handleTextToSpeech}
                className={`w-10 h-10 p-2 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm transition-colors ${
                  isSpeaking
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title={isSpeaking ? '音声読み上げを停止' : '音声読み上げ'}
                aria-label={isSpeaking ? '音声読み上げを停止' : '音声読み上げ'}
              >
                <Volume2 size={18} />
              </button>
            </div>

            {/* 質問本文 */}
            <div className='text-gray-900 font-bold text-xl md:text-2xl leading-relaxed break-words whitespace-pre-wrap mb-1'>
              {question}
            </div>
          </div>
        </div>

        {/* 3. 確認手順がある場合は短い手順を1件ずつ表示 */}
        {steps && steps.length > 0 && (
          <div className='p-4 rounded-lg border border-blue-200 bg-blue-50/60 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-bold text-blue-900'>
                確認手順 ({currentStepIndex + 1} / {steps.length})
              </span>
              {steps.length > 1 && (
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={currentStepIndex === 0}
                    onClick={() =>
                      setCurrentStepIndex(prev => Math.max(0, prev - 1))
                    }
                  >
                    前へ
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled={currentStepIndex >= steps.length - 1}
                    onClick={() =>
                      setCurrentStepIndex(prev =>
                        Math.min(steps.length - 1, prev + 1)
                      )
                    }
                  >
                    次へ
                  </Button>
                </div>
              )}
            </div>
            <div className='text-base font-medium text-gray-900 bg-white p-3 rounded border border-blue-100'>
              {steps[currentStepIndex]}
            </div>
          </div>
        )}

        {/* 4. 質問理由・詳細説明は折りたたみ表示 */}
        {(reasoning || detailDescription) && (
          <div>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowDetails(prev => !prev)}
              className='text-gray-700 hover:text-blue-700 px-3 py-1.5 h-auto font-medium whitespace-normal text-left'
            >
              {showDetails ? (
                <>
                  <ChevronUp className='w-4 h-4 mr-1 flex-shrink-0' />
                  確認理由・詳細説明を閉じる
                </>
              ) : (
                <>
                  <ChevronDown className='w-4 h-4 mr-1 flex-shrink-0' />
                  確認理由・詳細説明を表示
                </>
              )}
            </Button>
            {showDetails && (
              <div className='mt-2 p-3.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 space-y-2 leading-relaxed break-words'>
                {reasoning && (
                  <div className='text-blue-900 bg-blue-50/80 px-3 py-2 rounded border border-blue-200 leading-relaxed break-words whitespace-pre-wrap'>
                    <span className='font-semibold'>確認理由: </span>
                    {reasoning}
                  </div>
                )}
                {detailDescription && (
                  <div className='whitespace-pre-line text-gray-700 leading-relaxed break-words'>
                    {detailDescription}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. 承認済み標準フロー（画像付きマニュアル）へのショートカット */}
        {verifiedSource?.matchedGuideId && onOpenGuide && (
          <div className='pt-1'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenGuide(verifiedSource.matchedGuideId!)}
              className='w-full justify-start border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-bold h-auto py-3 px-4 whitespace-normal break-words'
            >
              <BookOpen className='w-5 h-5 mr-2 flex-shrink-0 text-yellow-700' />
              <span className='text-left leading-relaxed break-words'>
                承認済み標準フロー（画像付き）を開く:{' '}
                {verifiedSource.matchedGuideTitle || '応急復旧マニュアル'}
              </span>
            </Button>
          </div>
        )}

        {/* 6. 状況に応じた大きな選択ボタン（最上部に自由文・音声・カメラ入力を配置） */}
        {(normalizedOptions.length > 0 || isLatestBubble) && (
          <div className='space-y-3 pt-1'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-sm font-bold text-gray-700 leading-relaxed break-words'>
                {isLatestBubble
                  ? '当てはまるものを選択してください（または最上部の欄から自由文・音声・写真で回答）：'
                  : '回答済みの質問（過去の質問からは再送信できません）：'}
              </div>

              {isLatestBubble && canGoBack && onGoBack && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isInteractionDisabled}
                  onClick={onGoBack}
                  className='border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold h-auto py-2 px-3 whitespace-normal text-left'
                >
                  <RotateCcw className='w-4 h-4 mr-1.5 flex-shrink-0' />
                  <span>1つ前の質問に戻る（回答を変更する）</span>
                </Button>
              )}
            </div>

            <div className='grid grid-cols-1 gap-2.5'>
              {/* 最上部：自由文・音声・カメラ入力の起動ボタン＆カード内統合入力欄（最新質問カードのみ） */}
              <CardInlineInput
                isDisabled={isInteractionDisabled}
                isLatestBubble={isLatestBubble}
                resetKey={question}
                onSubmitAnswer={onAnswer}
                onAfterError={() => setSelectedOption(null)}
                onLockChange={setIsSubmittingLocal}
                submittingRef={submittingRef}
              />

              {normalizedOptions.map((option, index) => {
                const isSelected = selectedOption === option;
                const isUnknownOption =
                  option.includes('分から') ||
                  option.includes('わから') ||
                  option.includes('不明');

                return (
                  <Button
                    key={index}
                    type='button'
                    variant='outline'
                    className={`min-h-[60px] md:min-h-[64px] h-auto py-4 px-5 text-left justify-start border-2 transition-all whitespace-normal break-words ${
                      isSelected
                        ? 'border-blue-600 bg-blue-100 text-blue-950 shadow-sm'
                        : isUnknownOption
                          ? 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 text-gray-800'
                          : 'border-blue-200 bg-blue-50/40 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                    }`}
                    onClick={() => handleOptionSelect(option)}
                    disabled={isInteractionDisabled}
                  >
                    <div className='flex items-start gap-3 w-full min-w-0'>
                      <div
                        className={`flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-400 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle className='w-4 h-4 text-white' />
                        )}
                      </div>
                      <span className='font-semibold text-base md:text-lg leading-relaxed break-words whitespace-normal flex-1 min-w-0'>
                        {option}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {(isLoading || isSubmittingLocal) && isLatestBubble && (
          <div className='pt-2 flex items-center gap-2 text-blue-600'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            <span className='text-sm font-medium'>AIが次の確認事項を分析中...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
