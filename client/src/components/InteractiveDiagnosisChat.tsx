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

  // 險ｺ譁ｭ繧ｻ繝・す繝ｧ繝ｳ縺ｮ髢句ｧ・
  const startDiagnosis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/interactive-diagnosis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('險ｺ譁ｭ繧ｻ繝・す繝ｧ繝ｳ髢句ｧ九↓螟ｱ謨・);

      const data = await response.json();
      setDiagnosisState(data.diagnosisState);
      setCurrentResponse(data.interactiveResponse);
      setSessionId(data.sessionId);

      // 蛻晄悄繝｡繝・そ繝ｼ繧ｸ繧定ｿｽ蜉
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
      console.error('險ｺ譁ｭ髢句ｧ九お繝ｩ繝ｼ:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 繝ｦ繝ｼ繧ｶ繝ｼ蝗樒ｭ斐・騾∽ｿ｡
  const sendResponse = async (userResponse: string) => {
    if (!userResponse.trim() || !diagnosisState) return;

    setIsLoading(true);

    // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繝｡繝・そ繝ｼ繧ｸ繧定ｿｽ蜉
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

      if (!response.ok) throw new Error('險ｺ譁ｭ蜃ｦ逅・↓螟ｱ謨・);

      const data = await response.json();
      setDiagnosisState(data.updatedState);
      setCurrentResponse(data.interactiveResponse);

      // AI縺ｮ蠢懃ｭ斐ｒ霑ｽ蜉
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        content: data.interactiveResponse.message,
        isAiResponse: true,
        timestamp: new Date(),
        type: getMessageType(data.interactiveResponse.priority)
      };

      const newMessages = [aiMessage];

      // 谺｡縺ｮ雉ｪ蝠上′縺ゅｋ蝣ｴ蜷医・霑ｽ蜉
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
      console.error('險ｺ譁ｭ蜃ｦ逅・お繝ｩ繝ｼ:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        content: '繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ょ・蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・,
        isAiResponse: true,
        timestamp: new Date(),
        type: 'message'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 繧ｪ繝励す繝ｧ繝ｳ驕ｸ謚槭・蜃ｦ逅・
  const selectOption = (option: string) => {
    sendResponse(option);
  };

  // 繝｡繝・そ繝ｼ繧ｸ繧ｿ繧､繝励・豎ｺ螳・
  const getMessageType = (priority: string): ChatMessage['type'] => {
    switch (priority) {
      case 'safety': return 'safety';
      case 'action': return 'action';
      case 'diagnosis': return 'question';
      default: return 'message';
    }
  };

  // 邱頑･蠎ｦ縺ｮ陦ｨ遉ｺ濶ｲ
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // 繝｡繝・そ繝ｼ繧ｸ繧｢繧､繧ｳ繝ｳ縺ｮ蜿門ｾ・
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
              繧､繝ｳ繧ｿ繝ｩ繧ｯ繝・ぅ繝匁腐髫懆ｨｺ譁ｭ
            </CardTitle>
            {diagnosisState && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getUrgencyColor(diagnosisState.collectedInfo.urgency)}>
                  邱頑･蠎ｦ: {diagnosisState.collectedInfo.urgency}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  菫｡鬆ｼ蠎ｦ: {Math.round(diagnosisState.confidence * 100)}%
                </Badge>
                <Badge variant="outline">
                  繝輔ぉ繝ｼ繧ｺ: {diagnosisState.phase}
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
                <h3 className="text-lg font-semibold mb-2">謨・囿險ｺ譁ｭ繧帝幕蟋・/h3>
                <p className="text-gray-600 mb-4">
                  AI縺ｨ縺ｮ蟇ｾ隧ｱ繧帝壹§縺ｦ縲∵ｮｵ髫守噪縺ｫ謨・囿縺ｮ蜴溷屏繧堤音螳壹＠縲・br />
                  驕ｩ蛻・↑蠢懈･蜃ｦ鄂ｮ繧偵し繝昴・繝医＠縺ｾ縺吶・
                </p>
                <Button onClick={startDiagnosis} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? '髢句ｧ倶ｸｭ...' : '險ｺ譁ｭ髢句ｧ・}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ陦ｨ遉ｺ繧ｨ繝ｪ繧｢ */}
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
                            AI險ｺ譁ｭ繧ｷ繧ｹ繝・Β
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
                        <span className="text-sm text-gray-600">蛻・梵荳ｭ...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 繧ｪ繝励す繝ｧ繝ｳ驕ｸ謚槭・繧ｿ繝ｳ */}
              {currentResponse?.options && currentResponse.options.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">繧ｯ繧､繝・け驕ｸ謚・</p>
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

              {/* 蜈･蜉帙お繝ｪ繧｢ */}
              {currentResponse?.requiresInput && diagnosisState.phase !== 'completed' && (
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="蝗樒ｭ斐ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞..."
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
                    騾∽ｿ｡
                  </Button>
                </div>
              )}

              {/* 螳御ｺ・憾諷・*/}
              {diagnosisState.phase === 'completed' && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">險ｺ譁ｭ繝ｻ蟇ｾ蠢懊′螳御ｺ・＠縺ｾ縺励◆</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="mt-2"
                    variant="outline"
                  >
                    譁ｰ縺励＞險ｺ譁ｭ繧帝幕蟋・
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
