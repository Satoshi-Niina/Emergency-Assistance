import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Wrench, MessageCircle } from 'lucide-react';

interface DiagnosisState {
  phase: 'initial' | 'investigation' | 'diagnosis' | 'action' | 'verification' | 'completed';
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
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState | null>(null);
  const [currentResponse, setCurrentResponse] = useState<InteractiveResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 診断セチE��ョンの開姁E
  const startDiagnosis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/interactive-diagnosis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('診断セチE��ョン開始に失敁E);

      const data = await response.json();
      setDiagnosisState(data.diagnosisState);
      setCurrentResponse(data.interactiveResponse);
      setSessionId(data.sessionId);

      // 初期メチE��ージを追加
      const initialMessage: ChatMessage = {
        id: Date.now(),
        content: data.interactiveResponse.message,
        isAiResponse: true,
        timestamp: new Date(),
        type: 'message'
      };

      if (data.interactiveResponse.nextQuestion) {
        const questionMessage: ChatMessage = {
          id: Date.now() + 1,
          content: data.interactiveResponse.nextQuestion,
          isAiResponse: true,
          timestamp: new Date(),
          type: 'question'
        };
        setMessages([initialMessage, questionMessage]);
      } else {
        setMessages([initialMessage]);
      }

    } catch (error) {
      console.error('診断開始エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー回答�E送信
  const sendResponse = async (userResponse: string) => {
    if (!userResponse.trim() || !diagnosisState) return;

    setIsLoading(true);

    // ユーザーのメチE��ージを追加
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: userResponse,
      isAiResponse: false,
      timestamp: new Date(),
      type: 'message'
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
          currentState: diagnosisState
        })
      });

      if (!response.ok) throw new Error('診断処琁E��失敁E);

      const data = await response.json();
      setDiagnosisState(data.updatedState);
      setCurrentResponse(data.interactiveResponse);

      // AIの応答を追加
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        content: data.interactiveResponse.message,
        isAiResponse: true,
        timestamp: new Date(),
        type: getMessageType(data.interactiveResponse.priority)
      };

      const newMessages = [aiMessage];

      // 次の質問がある場合�E追加
      if (data.interactiveResponse.nextQuestion) {
        const questionMessage: ChatMessage = {
          id: Date.now() + 2,
          content: data.interactiveResponse.nextQuestion,
          isAiResponse: true,
          timestamp: new Date(),
          type: 'question'
        };
        newMessages.push(questionMessage);
      }

      setMessages(prev => [...prev, ...newMessages]);

    } catch (error) {
      console.error('診断処琁E��ラー:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        content: 'エラーが発生しました。�E度お試しください、E,
        isAiResponse: true,
        timestamp: new Date(),
        type: 'message'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // オプション選択�E処琁E
  const selectOption = (option: string) => {
    sendResponse(option);
  };

  // メチE��ージタイプ�E決宁E
  const getMessageType = (priority: string): ChatMessage['type'] => {
    switch (priority) {
      case 'safety': return 'safety';
      case 'action': return 'action';
      case 'diagnosis': return 'question';
      default: return 'message';
    }
  };

  // 緊急度の表示色
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // メチE��ージアイコンの取征E
  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'safety': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'action': return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'question': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="h-[700px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              インタラクチE��ブ故障診断
            </CardTitle>
            {diagnosisState && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getUrgencyColor(diagnosisState.collectedInfo.urgency)}>
                  緊急度: {diagnosisState.collectedInfo.urgency}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  信頼度: {Math.round(diagnosisState.confidence * 100)}%
                </Badge>
                <Badge variant="outline">
                  フェーズ: {diagnosisState.phase}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {!diagnosisState ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">敁E��診断を開姁E/h3>
                <p className="text-gray-600 mb-4">
                  AIとの対話を通じて、段階的に敁E��の原因を特定し、Ebr />
                  適刁E��応急処置をサポ�Eトします、E
                </p>
                <Button onClick={startDiagnosis} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? '開始中...' : '診断開姁E}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* チャチE��メチE��ージ表示エリア */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isAiResponse ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.isAiResponse
                          ? 'bg-white border border-gray-200 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {message.isAiResponse && (
                        <div className="flex items-center gap-2 mb-2">
                          {getMessageIcon(message.type)}
                          <span className="text-xs font-medium text-gray-500">
                            AI診断シスチE��
                          </span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm text-gray-600">刁E��中...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* オプション選択�Eタン */}
              {currentResponse?.options && currentResponse.options.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">クイチE��選抁E</p>
                  <div className="flex flex-wrap gap-2">
                    {currentResponse.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => selectOption(option)}
                        disabled={isLoading}
                        className="text-sm"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 入力エリア */}
              {currentResponse?.requiresInput && diagnosisState.phase !== 'completed' && (
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="回答を入力してください..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendResponse(currentInput);
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendResponse(currentInput)}
                    disabled={isLoading || !currentInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    送信
                  </Button>
                </div>
              )}

              {/* 完亁E��慁E*/}
              {diagnosisState.phase === 'completed' && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">診断・対応が完亁E��ました</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="mt-2"
                    variant="outline"
                  >
                    新しい診断を開姁E
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
