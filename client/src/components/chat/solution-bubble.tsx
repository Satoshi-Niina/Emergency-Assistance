import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Volume2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { speakText, stopSpeaking } from '../../lib/text-to-speech';
import type { VerifiedSourceInfo } from './troubleshooting-qa-bubble';
import CardInlineInput from './card-inline-input';

interface SolutionBubbleProps {
  solution: string;
  problemDescription?: string;
  reasoning?: string;
  isEmergency?: boolean;
  safetyWarning?: string;
  steps?: string[];
  detailDescription?: string;
  verifiedSource?: VerifiedSourceInfo;
  options?: string[];
  selectedAnswer?: string;
  onAnswer?: (answer: string, media?: any[]) => Promise<boolean | void> | void;
  onOpenGuide?: (guideId: string) => void;
  isLoading?: boolean;
  isLatestBubble?: boolean;
  canGoBack?: boolean;
  onGoBack?: () => void;
  contained?: boolean;
}

export default function SolutionBubble({
  solution,
  problemDescription,
  reasoning,
  isEmergency = false,
  safetyWarning,
  steps: propSteps,
  detailDescription,
  verifiedSource,
  options,
  selectedAnswer,
  onAnswer,
  onOpenGuide,
  isLoading = false,
  isLatestBubble = true,
  canGoBack = false,
  onGoBack,
  contained = false,
}: SolutionBubbleProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(
    selectedAnswer || null
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const submittingRef = React.useRef(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setSelectedOption(selectedAnswer || null);
    if (isLatestBubble && !selectedAnswer && !isLoading) {
      setIsSubmittingLocal(false);
      submittingRef.current = false;
    }
  }, [selectedAnswer, isLatestBubble, isLoading]);

  const isInteractionDisabled = isLoading || isSubmittingLocal || !isLatestBubble;

  // 解決策を構造化された形式に変換（既存のテキストパース互換維持）
  const parseSolution = (solutionText: string) => {
    const sections = {
      problem: '',
      cause: '',
      steps: [] as string[],
      safety: '',
      expert: '',
    };

    const lines = (solutionText || '').split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.includes('問題の特定') || trimmedLine.includes('問題:')) {
        currentSection = 'problem';
        sections.problem = trimmedLine.replace(/^.*?[:：]\s*/, '');
      } else if (
        trimmedLine.includes('原因分析') ||
        trimmedLine.includes('原因:')
      ) {
        currentSection = 'cause';
        sections.cause = trimmedLine.replace(/^.*?[:：]\s*/, '');
      } else if (
        trimmedLine.includes('具体的な処置手順') ||
        trimmedLine.includes('応急処置手順') ||
        trimmedLine.includes('手順:')
      ) {
        currentSection = 'steps';
      } else if (
        trimmedLine.includes('安全上の注意') ||
        trimmedLine.includes('安全確認') ||
        trimmedLine.includes('注意:')
      ) {
        currentSection = 'safety';
        sections.safety = trimmedLine.replace(/^.*?[:：]\s*/, '');
      } else if (
        trimmedLine.includes('専門家への相談') ||
        trimmedLine.includes('相談:')
      ) {
        currentSection = 'expert';
        sections.expert = trimmedLine.replace(/^.*?[:：]\s*/, '');
      } else if (
        currentSection === 'steps' &&
        (trimmedLine.startsWith('•') ||
          trimmedLine.startsWith('-') ||
          trimmedLine.match(/^\d+[\.．、]/))
      ) {
        sections.steps.push(trimmedLine.replace(/^[•\-\d\.．、\s]+/, ''));
      } else if (
        currentSection &&
        sections[currentSection as keyof typeof sections] === ''
      ) {
        if (
          typeof sections[currentSection as keyof typeof sections] === 'string'
        ) {
          (sections as any)[currentSection] = trimmedLine;
        }
      }
    }

    return sections;
  };

  const parsedSolution = parseSolution(solution);
  const effectiveSafety = safetyWarning || parsedSolution.safety;
  const effectiveSteps =
    propSteps && propSteps.length > 0 ? propSteps : parsedSolution.steps;
  const isVerified = verifiedSource ? verifiedSource.isVerified : !isEmergency;

  const effectiveDetails =
    detailDescription ||
    [
      parsedSolution.problem ? `【問題の特定】${parsedSolution.problem}` : '',
      parsedSolution.cause ? `【原因候補】${parsedSolution.cause}` : '',
      parsedSolution.expert ? `【専門部署相談】${parsedSolution.expert}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const followUpOptions =
    options && options.length > 0
      ? options
      : [
          '処置を実施し解決した（完了）',
          '処置を実施したが解決しない（診断を続ける）',
          '現場対応が困難なため技術支援センターへ連絡する',
        ];

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

    const parts: string[] = [];
    if (effectiveSafety) {
      parts.push(`安全確認。${effectiveSafety}`);
    }
    if (effectiveSteps.length > 0) {
      if (showAllSteps) {
        parts.push(
          `処置手順。${effectiveSteps
            .map((s, idx) => `手順${idx + 1}、${s}`)
            .join('。')}`
        );
      } else {
        parts.push(
          `手順${currentStepIndex + 1}。${effectiveSteps[currentStepIndex]}`
        );
      }
    } else if (solution) {
      parts.push(solution);
    }

    const textToRead = parts.join('。');
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

  const handleSelectFollowUp = async (opt: string) => {
    if (!onAnswer || submittingRef.current || isInteractionDisabled) return;
    submittingRef.current = true;
    setIsSubmittingLocal(true);
    setSelectedOption(opt);
    try {
      const ok = await onAnswer(opt);
      if (ok === false) {
        setSelectedOption(null);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmittingLocal(false);
    }
  };

  return (
    <Card
      className={`w-full ${
        contained
          ? `max-w-none border-0 shadow-none rounded-none ${
              isEmergency || !isVerified ? 'bg-red-50/40' : 'bg-green-50/40'
            }`
          : `border-2 ${
              isLatestBubble ? 'max-w-4xl mx-auto shadow-lg' : 'max-w-3xl shadow-sm'
            } ${
              isEmergency || !isVerified
                ? 'border-red-300 bg-red-50/40'
                : 'border-green-300 bg-green-50/40'
            }`
      }`}
    >
      <CardContent className='p-5 md:p-6 space-y-4'>
        {/* 1. 安全確認が必要な場合は最優先表示 */}
        {effectiveSafety && (
          <div
            role='alert'
            className='p-4 rounded-lg border-2 border-red-400 bg-red-50 flex items-start gap-3'
          >
            <ShieldAlert className='w-6 h-6 text-red-600 flex-shrink-0 mt-1' />
            <div className='flex-1 min-w-0'>
              <div className='font-bold text-red-800 text-base leading-relaxed break-words mb-1'>
                安全上の注意（最優先確認）
              </div>
              <div className='text-red-900 font-medium text-base leading-relaxed break-words whitespace-pre-wrap'>
                {effectiveSafety}
              </div>
            </div>
          </div>
        )}

        {/* 2. ヘッダー＋根拠資料照合ステータス＋音声読み上げ */}
        <div className='flex items-start gap-3'>
          <div className='flex-shrink-0'>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isEmergency || !isVerified ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              {isEmergency || !isVerified ? (
                <AlertTriangle className='w-6 h-6 text-white' />
              ) : (
                <CheckCircle className='w-6 h-6 text-white' />
              )}
            </div>
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
              <div className='flex flex-wrap items-center gap-2 min-w-0'>
                <Badge
                  variant='secondary'
                  className={`h-auto py-1 whitespace-normal break-words ${
                    isEmergency || !isVerified
                      ? 'bg-red-100 text-red-800 font-semibold'
                      : 'bg-green-100 text-green-800 font-semibold'
                  }`}
                >
                  {isEmergency
                    ? '緊急対応・エスカレーション案内'
                    : isVerified
                      ? '応急処置手順（根拠資料照合済）'
                      : '参考確認事項（標準フロー該当なし）'}
                </Badge>

                {verifiedSource?.sourceName && (
                  <Badge
                    variant='outline'
                    className='text-xs border-green-500 text-green-800 bg-white h-auto py-1 whitespace-normal break-words'
                  >
                    根拠: {verifiedSource.sourceName}
                  </Badge>
                )}
              </div>

              <button
                type='button'
                onClick={handleTextToSpeech}
                className={`w-10 h-10 p-2 flex-shrink-0 flex items-center justify-center rounded-full shadow-sm transition-colors ${
                  isSpeaking
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-200'
                }`}
                title={isSpeaking ? '音声読み上げを停止' : '音声読み上げ'}
                aria-label={isSpeaking ? '音声読み上げを停止' : '音声読み上げ'}
              >
                <Volume2 size={18} />
              </button>
            </div>

            {problemDescription && (
              <div className='text-sm text-gray-700 mb-2 leading-relaxed break-words'>
                <strong>対象事象:</strong> {problemDescription}
              </div>
            )}
          </div>
        </div>

        {/* 未承認手順の安全警告（LLMの推測のみによる確定手順表示を防止） */}
        {verifiedSource && !verifiedSource.isVerified && (
          <div className='p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium leading-relaxed break-words'>
            ⚠️ 現在の症状に完全一致する承認済み標準フロー・根拠資料が見つかりませんでした。推測による無理な処置は行わず、安全を確保のうえ指令または技術支援センターへ連絡してください。
          </div>
        )}

        {/* 3. 応急処置は短い手順を1件ずつ表示 */}
        {effectiveSteps.length > 0 ? (
          <div className='bg-white p-4 rounded-lg border-2 border-green-200 space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <Wrench className='w-5 h-5 text-green-600' />
                <h4 className='font-bold text-gray-900 text-base'>
                  {showAllSteps
                    ? `応急処置手順（全${effectiveSteps.length}件）`
                    : `手順 ${currentStepIndex + 1} / ${effectiveSteps.length}`}
                </h4>
              </div>

              {effectiveSteps.length > 1 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowAllSteps(prev => !prev)}
                  className='text-xs text-blue-700 hover:text-blue-800 h-8'
                >
                  {showAllSteps ? '1件ずつ表示に戻す' : '全手順を一覧表示'}
                </Button>
              )}
            </div>

            {showAllSteps ? (
              <ol className='list-decimal list-inside space-y-2.5'>
                {effectiveSteps.map((step, index) => (
                  <li
                    key={index}
                    className='text-gray-900 font-medium text-base p-2.5 rounded bg-gray-50 border border-gray-200'
                  >
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <div className='space-y-3'>
                <div className='p-4 rounded-lg bg-green-50/70 border border-green-300 text-gray-900 font-bold text-lg leading-relaxed'>
                  {effectiveSteps[currentStepIndex]}
                </div>

                {effectiveSteps.length > 1 && (
                  <div className='flex items-center justify-between gap-2 pt-1'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={currentStepIndex === 0}
                      onClick={() =>
                        setCurrentStepIndex(prev => Math.max(0, prev - 1))
                      }
                      className='min-h-[44px] px-4 font-semibold'
                    >
                      前の手順
                    </Button>
                    <span className='text-sm text-gray-600 font-medium'>
                      {currentStepIndex + 1} / {effectiveSteps.length}
                    </span>
                    <Button
                      type='button'
                      variant='default'
                      disabled={currentStepIndex >= effectiveSteps.length - 1}
                      onClick={() =>
                        setCurrentStepIndex(prev =>
                          Math.min(effectiveSteps.length - 1, prev + 1)
                        )
                      }
                      className='min-h-[44px] px-4 bg-green-600 hover:bg-green-700 text-white font-semibold'
                    >
                      次の手順へ
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className='bg-white p-4 rounded-lg border border-gray-200'>
            <div className='flex items-center gap-2 mb-2'>
              <CheckCircle className='w-5 h-5 text-green-600' />
              <h4 className='font-bold text-gray-900'>対応案内</h4>
            </div>
            <div className='text-gray-900 font-medium text-base whitespace-pre-line'>
              {solution}
            </div>
          </div>
        )}

        {/* 4. 承認済み標準フロー（画像付き）へのリンク */}
        {verifiedSource?.matchedGuideId && onOpenGuide && (
          <div>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenGuide(verifiedSource.matchedGuideId!)}
              className='w-full justify-start border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-bold h-auto py-3 px-4 whitespace-normal break-words'
            >
              <BookOpen className='w-5 h-5 mr-2 flex-shrink-0 text-yellow-700' />
              <span className='text-left leading-relaxed break-words'>
                承認済み標準フロー（画像付き）で確認する:{' '}
                {verifiedSource.matchedGuideTitle || '応急復旧マニュアル'}
              </span>
            </Button>
          </div>
        )}

        {/* 5. 判断理由・詳細説明は必要に応じて折りたたみ展開 */}
        {(reasoning || effectiveDetails) && (
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
                  判断理由・詳細説明を閉じる
                </>
              ) : (
                <>
                  <ChevronDown className='w-4 h-4 mr-1 flex-shrink-0' />
                  判断理由・詳細説明を表示
                </>
              )}
            </Button>
            {showDetails && (
              <div className='mt-2 p-3.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 space-y-2 leading-relaxed break-words'>
                {reasoning && (
                  <div className='text-gray-800 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md leading-relaxed break-words whitespace-pre-wrap'>
                    <span className='font-semibold'>判断理由: </span>
                    {reasoning}
                  </div>
                )}
                {effectiveDetails && (
                  <div className='whitespace-pre-line leading-relaxed break-words'>
                    {effectiveDetails}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. 処置後の結果選択ボタン（履歴記録・継続連携＋最上部に自由文・音声・カメラ入力） */}
        {onAnswer && (followUpOptions.length > 0 || isLatestBubble) && (
          <div className='space-y-2.5 pt-2 border-t border-gray-200'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='text-sm font-bold text-gray-700 leading-relaxed break-words'>
                {isLatestBubble
                  ? '確認・処置後の状況を選択してください（または最上部の欄から自由文・音声・写真で回答）：'
                  : '選択済みの対応結果：'}
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
              <CardInlineInput
                isDisabled={isInteractionDisabled}
                isLatestBubble={isLatestBubble}
                resetKey={solution}
                onSubmitAnswer={onAnswer}
                onAfterError={() => setSelectedOption(null)}
                onLockChange={setIsSubmittingLocal}
                submittingRef={submittingRef}
              />

              {followUpOptions.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                return (
                  <Button
                    key={idx}
                    type='button'
                    variant='outline'
                    disabled={isInteractionDisabled}
                    onClick={() => handleSelectFollowUp(opt)}
                    className={`min-h-[58px] md:min-h-[62px] h-auto py-3.5 px-5 text-left justify-start border-2 whitespace-normal break-words leading-relaxed font-semibold text-base md:text-lg ${
                      isSelected
                        ? 'border-green-600 bg-green-100 text-green-950'
                        : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                    }`}
                  >
                    {opt}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
