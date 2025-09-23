import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  MessageCircle,
} from 'lucide-react';

interface DiagnosisState {
  phase:
    | 'initial'
    | 'investigation'
    | 'diagnosis'
    | 'action'
    | 'verification'
    | 'completed';
  collectedInfo: {
    symptoms: string[];
    vehicleType: string | null;
    safetyStatus: string | null;
    timing: string | null;
    tools: string | null;
    environment: string | null;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  suspectedCauses: string[];
  currentFocus: string | null;
  nextActions: string[];
  confidence: number;
}

interface InteractiveResponse {
  message: string;
  nextQuestion?: string;
  details?: string; // 追加の詳細（サーバ側 details フィールド）
  suggestedActions?: string[];
  options?: string[];
  priority: 'safety' | 'diagnosis' | 'action' | 'info';
  requiresInput: boolean;
  phase: DiagnosisState['phase'];
}

interface ChatMessage {
  id: number;
  content: string;
  isAiResponse: boolean;
  timestamp: Date;
  type?: 'message' | 'question' | 'action' | 'safety';
}

export default function InteractiveDiagnosisChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState | null>(
    null
  );
  const [currentResponse, setCurrentResponse] =
    useState<InteractiveResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 診断セッションの開始（外部トリガ無し / マウント時自動）
  const startDiagnosis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/interactive-diagnosis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('診断セッション開始に失敗');

      const data = await response.json();
      setDiagnosisState(data.diagnosisState);
      setCurrentResponse(data.interactiveResponse);
      setSessionId(data.sessionId);

      // 1問一答: 次の質問がある場合は質問のみ表示し、まとめて表示しない
      if (data.interactiveResponse.nextQuestion) {
        setMessages([
          {
            id: Date.now(),
            content: data.interactiveResponse.nextQuestion,
            isAiResponse: true,
            timestamp: new Date(),
            type: 'question',
          },
        ]);
      } else {
        setMessages([
          {
            id: Date.now(),
            content: data.interactiveResponse.message,
            isAiResponse: true,
            timestamp: new Date(),
            type: 'message',
          },
        ]);
      }
    } catch (error) {
      console.error('診断開始エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回自動開始
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      startDiagnosis();
    }
  }, []);

  // ユーザー回答の送信
  const sendResponse = async (userResponse: string) => {
    if (!userResponse.trim() || !diagnosisState) return;

    setIsLoading(true);

    // ユーザーのメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: userResponse,
      isAiResponse: false,
      timestamp: new Date(),
      type: 'message',
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');

    try {
      const response = await fetch('/api/interactive-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userResponse,
          currentState: diagnosisState,
        }),
      });

      if (!response.ok) throw new Error('診断処理に失敗');

      const data = await response.json();
      setDiagnosisState(data.updatedState);
      setCurrentResponse(data.interactiveResponse);

      // 1問一答ポリシー: 次の質問があれば質問のみ、なければ指示/結果のみ
      if (data.interactiveResponse.nextQuestion) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            content: data.interactiveResponse.nextQuestion,
            isAiResponse: true,
            timestamp: new Date(),
            type: 'question',
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            content: data.interactiveResponse.message,
            isAiResponse: true,
            timestamp: new Date(),
            type: getMessageType(data.interactiveResponse.priority),
          },
        ]);
      }
    } catch (error) {
      console.error('診断処理エラー:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        content: 'エラーが発生しました。再度お試しください。',
        isAiResponse: true,
        timestamp: new Date(),
        type: 'message',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // オプション選択の処理
  const selectOption = (option: string) => {
    sendResponse(option);
  };

  // メッセージタイプの決定
  const getMessageType = (priority: string): ChatMessage['type'] => {
    switch (priority) {
      case 'safety':
        return 'safety';
      case 'action':
        return 'action';
      case 'diagnosis':
        return 'question';
      default:
        return 'message';
    }
  };

  // 緊急度の表示色
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // メッセージアイコンの取得
  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'safety':
        return <AlertTriangle className='w-4 h-4 text-red-500' />;
      case 'action':
        return <Wrench className='w-4 h-4 text-blue-500' />;
      case 'question':
        return <MessageCircle className='w-4 h-4 text-purple-500' />;
      default:
        return null;
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-4'>
      <Card className='h-[700px] flex flex-col'>
        <CardHeader className='py-2 border-b'>
          <div className='flex items-center justify-between text-sm'>
            <CardTitle className='flex items-center gap-2 text-base font-semibold'>
              <Wrench className='w-4 h-4' /> AIインタラクティブ支援
            </CardTitle>
            {diagnosisState && (
              <div className='flex items-center gap-2 flex-wrap'>
                <Badge
                  variant='outline'
                  className={getUrgencyColor(
                    diagnosisState.collectedInfo.urgency
                  )}
                >
                  {diagnosisState.collectedInfo.urgency}
                </Badge>
                <Badge variant='outline'>
                  <Clock className='w-3 h-3 mr-1' />
                  信頼 {Math.round(diagnosisState.confidence * 100)}%
                </Badge>
                <Badge variant='outline'>{diagnosisState.phase}</Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className='flex-1 flex flex-col'>
          {/* 常時チャット表示（初期化中はスケルトン） */}
          <>
            {/* チャットメッセージ表示エリア */}
            <div className='flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg'>
              {!diagnosisState && (
                <div className='flex justify-center py-8'>
                  <div className='flex items-center gap-2 text-gray-500 text-sm'>
                    <div className='animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full' />
                    初期化中...
                  </div>
                </div>
              )}
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.isAiResponse ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                      message.isAiResponse
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-[18px_18px_4px_18px]'
                        : 'bg-blue-600 text-white rounded-[18px_18px_18px_4px]'
                    }`}
                  >
                    {message.isAiResponse && (
                      <div className='flex items-center gap-2 mb-1'>
                        {getMessageIcon(message.type)}
                        <span className='text-[11px] font-medium text-gray-500 tracking-wide'>
                          GPTサポート
                        </span>
                      </div>
                    )}
                    <div className='whitespace-pre-wrap text-sm leading-relaxed'>
                      {message.content}
                    </div>
                    <div className='text-[10px] opacity-60 mt-1 text-right'>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className='flex justify-start'>
                  <div className='bg-white border border-gray-200 p-3 rounded-lg'>
                    <div className='flex items-center gap-2'>
                      <div className='animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full'></div>
                      <span className='text-sm text-gray-600'>分析中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* オプション選択ボタン */}
            {diagnosisState &&
              currentResponse?.options &&
              currentResponse.options.length > 0 && (
                <div className='mb-4'>
                  <p className='text-sm text-gray-600 mb-2'>クイック選択:</p>
                  <div className='flex flex-wrap gap-2'>
                    {currentResponse.options.map((option, index) => (
                      <Button
                        key={index}
                        variant='outline'
                        size='sm'
                        onClick={() => selectOption(option)}
                        disabled={isLoading}
                        className='text-sm'
                      >
                        {option}
                      </Button>
                    ))}
                    {/* 詳細要求ボタン: details が存在し、まだ表示に含まれていない場合 */}
                    {currentResponse.details &&
                      !messages.some(m =>
                        m.content.includes(currentResponse.details!)
                      ) && (
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => selectOption('詳細')}
                          disabled={isLoading}
                          className='text-sm'
                        >
                          詳細
                        </Button>
                      )}
                  </div>
                </div>
              )}

            {/* 入力エリア */}
            {diagnosisState &&
              currentResponse?.requiresInput &&
              diagnosisState.phase !== 'completed' && (
                <div className='flex gap-2'>
                  <Input
                    value={currentInput}
                    onChange={e => setCurrentInput(e.target.value)}
                    placeholder='回答を入力してください...'
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendResponse(currentInput);
                      }
                    }}
                    disabled={isLoading}
                    className='flex-1'
                  />
                  <Button
                    onClick={() => sendResponse(currentInput)}
                    disabled={isLoading || !currentInput.trim()}
                    className='bg-blue-600 hover:bg-blue-700'
                  >
                    送信
                  </Button>
                </div>
              )}

            {/* 完了状態 */}
            {diagnosisState?.phase === 'completed' && (
              <div className='text-center p-4 bg-green-50 border border-green-200 rounded-lg'>
                <CheckCircle className='w-8 h-8 text-green-600 mx-auto mb-2' />
                <p className='text-green-800 font-medium'>
                  診断・対応が完了しました
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className='mt-2'
                  variant='outline'
                >
                  新しい診断を開始
                </Button>
              </div>
            )}
          </>
        </CardContent>
      </Card>
    </div>
  );
}
