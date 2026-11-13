import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  Mic,
  MicOff,
  Send,
  X,
} from 'lucide-react';
import { useVoiceInput } from '../../hooks/use-voice-input';

export interface CardInlineInputProps {
  isDisabled: boolean;
  isLatestBubble: boolean;
  resetKey?: string;
  onSubmitAnswer: (
    answer: string,
    media?: any[]
  ) => Promise<boolean | void> | void;
  onBeforeSubmit?: () => void;
  onAfterError?: () => void;
  onLockChange?: (locked: boolean) => void;
  submittingRef: React.MutableRefObject<boolean>;
}

/**
 * C方式カード内の選択肢最上部に表示する、自由文・音声・カメラ統合入力コンポーネント
 */
export default function CardInlineInput({
  isDisabled,
  isLatestBubble,
  resetKey,
  onSubmitAnswer,
  onBeforeSubmit,
  onAfterError,
  onLockChange,
  submittingRef,
}: CardInlineInputProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<any[]>([]);

  const voiceInput = useVoiceInput(voiceText => {
    setCustomInputText(prev =>
      prev.trim() ? `${prev.trim()} ${voiceText}` : voiceText
    );
  });

  // 質問やカード内容が切り替わったらパネルを初期状態に戻す
  useEffect(() => {
    setShowCustomInput(false);
    setCustomInputText('');
    setAttachedMedia([]);
  }, [resetKey]);

  // カード内カメラボタン経由の画像添付を受信（最新カードのみ）
  useEffect(() => {
    if (!isLatestBubble) return;
    const handleMediaAttached = (event: Event) => {
      const mediaItem = (event as CustomEvent)?.detail?.mediaItem;
      if (!mediaItem) return;
      setAttachedMedia(prev => [...prev, mediaItem]);
      setShowCustomInput(true);
    };
    window.addEventListener('camera-media-attached', handleMediaAttached);
    return () => {
      window.removeEventListener('camera-media-attached', handleMediaAttached);
    };
  }, [isLatestBubble]);

  if (!isLatestBubble) return null;

  const handleToggle = () => {
    if (isDisabled) return;
    setShowCustomInput(prev => !prev);
  };

  const handleVoiceToggle = () => {
    if (isDisabled) return;
    if (voiceInput.recording) {
      voiceInput.stop();
    } else {
      voiceInput.start();
    }
  };

  const handleCameraClick = () => {
    if (isDisabled) return;
    window.dispatchEvent(
      new CustomEvent('open-camera', {
        detail: { attachToCard: true },
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInputText.trim();
    if ((!trimmed && attachedMedia.length === 0) || submittingRef.current || isDisabled) {
      return;
    }

    if (voiceInput.recording) {
      voiceInput.stop();
    }

    const submitText = trimmed || '状況画像を送信しました';
    const mediaToSend = [...attachedMedia];

    submittingRef.current = true;
    onLockChange?.(true);
    onBeforeSubmit?.();

    try {
      const ok = await onSubmitAnswer(submitText, mediaToSend);
      if (ok !== false) {
        setCustomInputText('');
        setAttachedMedia([]);
        setShowCustomInput(false);
      } else {
        setShowCustomInput(true);
        onAfterError?.();
      }
    } catch {
      setShowCustomInput(true);
      onAfterError?.();
    } finally {
      submittingRef.current = false;
      onLockChange?.(false);
    }
  };

  return (
    <div className='space-y-2'>
      <Button
        type='button'
        variant='outline'
        onClick={handleToggle}
        disabled={isDisabled}
        aria-expanded={showCustomInput}
        className={`w-full min-h-[54px] h-auto py-3.5 px-4 text-left justify-start border-2 transition-all whitespace-normal break-words ${
          showCustomInput
            ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
            : 'border-dashed border-blue-400 bg-blue-50/40 hover:border-blue-600 hover:bg-blue-50 text-blue-900'
        }`}
      >
        <div className='flex items-center justify-between gap-3 w-full min-w-0'>
          <div className='flex items-center gap-3 min-w-0 flex-1'>
            <MessageSquarePlus className='w-5 h-5 text-blue-600 flex-shrink-0' />
            <span className='font-semibold text-base leading-relaxed break-words'>
              状況を自由文・音声で送信してください
            </span>
          </div>
          {showCustomInput ? (
            <ChevronUp className='w-5 h-5 text-blue-600 flex-shrink-0' />
          ) : (
            <ChevronDown className='w-5 h-5 text-blue-600 flex-shrink-0' />
          )}
        </div>
      </Button>

      {showCustomInput && (
        <div
          className='p-3.5 rounded-lg bg-gray-50 border-2 border-blue-300 space-y-2.5'
          data-testid='card-inline-input-panel'
        >
          {attachedMedia.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {attachedMedia.map((item, idx) => (
                <div
                  key={idx}
                  className='relative inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white p-1.5 pr-2'
                >
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.title || '添付画像'}
                    className='w-12 h-12 object-cover rounded'
                  />
                  <span className='text-xs text-gray-700 font-medium'>
                    {item.title || '写真添付'}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      setAttachedMedia(prev => prev.filter((_, i) => i !== idx))
                    }
                    className='p-1 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600'
                    aria-label='添付画像を削除'
                    title='削除'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className='flex flex-wrap sm:flex-nowrap items-center gap-2'
          >
            <Input
              type='text'
              value={customInputText}
              onChange={e => setCustomInputText(e.target.value)}
              placeholder='状況を自由文または音声で入力してください...'
              disabled={isDisabled}
              aria-label='状況を自由文・音声で入力'
              className='flex-1 min-w-[200px] bg-white h-auto min-h-[48px] py-2.5 px-3.5 text-base leading-relaxed'
              autoFocus
            />

            <div className='flex items-center gap-2 flex-shrink-0'>
              <Button
                type='button'
                variant='outline'
                onClick={handleVoiceToggle}
                disabled={isDisabled || voiceInput.processing}
                aria-label={
                  voiceInput.recording ? '音声入力を停止' : 'マイクで音声入力'
                }
                title={
                  voiceInput.recording ? '音声入力を停止' : 'マイクで音声入力'
                }
                className={`h-auto min-h-[48px] px-3 py-2.5 flex-shrink-0 ${
                  voiceInput.recording
                    ? 'bg-red-50 border-red-500 text-red-700 animate-pulse'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50'
                }`}
              >
                {voiceInput.recording ? (
                  <MicOff className='w-5 h-5' />
                ) : (
                  <Mic className='w-5 h-5' />
                )}
              </Button>

              <Button
                type='button'
                variant='outline'
                onClick={handleCameraClick}
                disabled={isDisabled}
                aria-label='カメラ撮影・写真添付'
                title='カメラ撮影・写真添付'
                className='h-auto min-h-[48px] px-3 py-2.5 bg-white border-blue-300 text-blue-700 hover:bg-blue-50 flex-shrink-0'
              >
                <Camera className='w-5 h-5' />
              </Button>

              <Button
                type='submit'
                disabled={
                  (!customInputText.trim() && attachedMedia.length === 0) ||
                  isDisabled
                }
                className='h-auto min-h-[48px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap flex-shrink-0'
              >
                <Send className='w-4 h-4 mr-1.5' />
                送信
              </Button>
            </div>
          </form>

          {voiceInput.recording && (
            <p className='text-xs font-medium text-red-700 leading-relaxed'>
              音声を認識しています...（マイクボタンで停止）
            </p>
          )}
          {voiceInput.error && (
            <p className='text-xs font-medium text-red-700 leading-relaxed'>
              {voiceInput.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

