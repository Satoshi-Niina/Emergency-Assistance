import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { startSpeechRecognition, stopSpeechRecognition, startBrowserSpeechRecognition, stopBrowserSpeechRecognition } from '../lib/azure-speech';
import { Message } from '@shared/schema';

// 十分な文とみなす最小文字数
const MIN_TEXT_LENGTH = 5;
// 最大文字数（これを超えたら自動的に送信）
const MAX_TEXT_LENGTH = 50;

// チャットコンテキストの型定義
interface ChatContextValue {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  isLoading: boolean;
  searching: boolean;
  searchResults: any[];
  selectedText: string;
  setSelectedText: (text: string) => void;
  sendMessage: (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[]) => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  recordedText: string;
  searchBySelectedText: (text: string) => Promise<void>;
  clearSearchResults: () => void;
  captureImage: () => Promise<void>;
  exportChatHistory: () => Promise<void>;
  exportFormattedData: () => Promise<any>;
  lastExportTimestamp: Date | null;
  isExporting: boolean;
  hasUnexportedMessages: boolean;
  sendEmergencyGuide: (guideData: any) => Promise<any>; // 戻り値の型を変更
  draftMessage: { content: string, media?: { type: string, url: string, thumbnail?: string }[] } | null;
  setDraftMessage: (message: { content: string, media?: { type: string, url: string, thumbnail?: string }[] } | null) => void;
  clearChatHistory: () => Promise<void>;
  isClearing: boolean;
}

// チャットコンテキストの作成
const ChatContext = createContext<ChatContextValue | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    console.error("ChatContext is null - this likely means useChat was called outside of the ChatProvider");
    // 代替として最小限のデフォルト値を返し、アプリがクラッシュするのを防ぐ
    return {
      messages: [],
      isLoading: false,
      searching: false,
      searchResults: [],
      selectedText: '',
      setSelectedText: () => {},
      sendMessage: async () => {},
      startRecording: () => {},
      stopRecording: () => {},
      isRecording: false,
      recordedText: '',
      searchBySelectedText: async () => {},
      clearSearchResults: () => {},
      captureImage: async () => {},
      exportChatHistory: async () => {},
      exportFormattedData: async () => ({}),
      lastExportTimestamp: null,
      isExporting: false,
      hasUnexportedMessages: false,
      sendEmergencyGuide: async () => {},
      draftMessage: null,
      setDraftMessage: () => {},
      clearChatHistory: async () => {},
      isClearing: false
    } as unknown as ChatContextValue;
  }
  return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [lastExportTimestamp, setLastExportTimestamp] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hasUnexportedMessages, setHasUnexportedMessages] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [tempMedia, setTempMedia] = useState<{ type: string, url: string, thumbnail?: string }[]>([]);

  // プレビュー用一時メッセージ（まだ送信していないがユーザー入力前に表示するためのメッセージ）
  const [draftMessage, setDraftMessage] = useState<{
    content: string,
    media?: { type: string, url: string, thumbnail?: string }[]
  } | null>(null);

  const { toast } = useToast();

  // 最後に送信したテキストを保存する変数（重複送信防止用）
  const [lastSentText, setLastSentText] = useState<string>('');
  // 音声認識による送信を防止するタイマー
  const [sendTimeoutId, setSendTimeoutId] = useState<NodeJS.Timeout | null>(null);
  // 音声認識テキストの完了度を追跡するための変数
  const [recognitionPhrases, setRecognitionPhrases] = useState<string[]>([]);
  // 音声認識テキストの送信をブロックするフラグ
  const [blockSending, setBlockSending] = useState<boolean>(false);
  // 最後に音声認識を受信した時間（沈黙検出用）
  const [lastRecognitionTime, setLastRecognitionTime] = useState<number>(0);
  // 沈黙が検出されたかどうか
  const [silenceDetected, setSilenceDetected] = useState<boolean>(false);
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  // 処理中フラグ
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastAudioInputTime, setLastAudioInputTime] = useState(Date.now());
  const [micSilenceTimeoutId, setMicSilenceTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [recognitionBuffer, setRecognitionBuffer] = useState<string[]>([]);
  const [bufferTimeoutId, setBufferTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const BUFFER_INTERVAL = 200; // バッファリング間隔を200ミリ秒に統一
  const SILENCE_THRESHOLD = 1000; // 無音検出時間: 1秒
  const AUTO_STOP_THRESHOLD = 10000; // 自動停止時間: 10秒

  // チャットの初期化
  const initializeChat = useCallback(async () => {
    try {
      setIsInitializing(true);

      // 認証をスキップして直接チャットIDを設定
      // 認証が必要な場合は後で個別に処理
      const defaultChatId = 1;
      setChatId(defaultChatId);
      console.log('チャットIDを設定しました:', defaultChatId);
      return defaultChatId;
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // デフォルトのチャットIDを設定
      const defaultChatId = 1;
      setChatId(defaultChatId);
      return defaultChatId;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // コンポーネントマウント時にチャットを初期化
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // チャットメッセージの初期読み込み
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) return;

      try {
        const response = await apiRequest('GET', `/api/chats/${chatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  // 認識テキストの類似度を確認する関数（部分文字列か判定）
  const isSubstringOrSimilar = (text1: string, text2: string): boolean => {
    if (!text1 || !text2) return false;
    const lowerText1 = text1.toLowerCase().trim();
    const lowerText2 = text2.toLowerCase().trim();

    // 完全一致または部分文字列かチェック
    if (lowerText1 === lowerText2 || lowerText1.includes(lowerText2) || lowerText2.includes(lowerText1)) {
      return true;
    }

    // より厳格な類似性判定 - 先頭部分が同じかチェック
    const minLength = Math.min(lowerText1.length, lowerText2.length);
    if (minLength > 3) {
      // 短い方の文字列の長さの70%以上が先頭から一致する場合は類似とみなす
      const matchLength = Math.floor(minLength * 0.7);
      if (lowerText1.substring(0, matchLength) === lowerText2.substring(0, matchLength)) {
        return true;
      }
    }

    // 80%以上の単語が一致するかチェック
    const words1 = lowerText1.split(/\s+/);
    const words2 = lowerText2.split(/\s+/);

    // 単語数が少ない場合は直接比較
    if (words1.length <= 2 || words2.length <= 2) {
      return lowerText1.length > 0 && lowerText2.length > 0 && 
        (lowerText1.includes(lowerText2) || lowerText2.includes(lowerText1));
    }

    // 共通する単語の数をカウント
    const commonWords = words1.filter(word => words2.includes(word));
    const similarityRatio = commonWords.length / Math.max(words1.length, words2.length);

    return similarityRatio >= 0.7; // 70%以上一致に緩和
  };

  // ドラフトメッセージ更新のイベントリスナー
  useEffect(() => {
    let isUpdating = false; // 更新中フラグ
    let updateTimeout: NodeJS.Timeout | null = null;

    // ドラフトメッセージ更新のイベントリスナーを設定
    const handleUpdateDraftMessage = (event: CustomEvent) => {
      if (isUpdating) {
        console.log('更新中のため、ドラフトメッセージの更新をスキップ');
        return;
      }

      if (event.detail && typeof event.detail.content === 'string') {
        const { content } = event.detail;

        // 空のコンテンツの場合はクリア
        if (!content.trim()) {
          setDraftMessage(null);
          return;
        }

        // 更新中フラグを設定
        isUpdating = true;

        // 既存のメディアは保持
        const currentMedia = draftMessage?.media || [];

        // ドラフトメッセージを更新
        setDraftMessage({
          content,
          media: currentMedia
        });

        // 更新中フラグをリセット（300ms後）
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
          isUpdating = false;
        }, 300);
      }
    };

    // ドラフトメッセージクリア用のイベントリスナー
    const handleClearDraftMessage = (event: Event) => {
      console.log('クリアドラフトメッセージイベント受信');

      // すべての状態をリセット
      setDraftMessage(null);
      setRecordedText('');
      setLastSentText('');
      setRecognitionPhrases([]);
      setBlockSending(false);
      setIsProcessing(false);

      // 音声認識を停止
      stopSpeechRecognition();
      stopBrowserSpeechRecognition();
    };

    // イベントリスナーを追加
    window.addEventListener('update-draft-message', handleUpdateDraftMessage as EventListener);
    window.addEventListener('clear-draft-message', handleClearDraftMessage as EventListener);

    // クリーンアップ関数
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      window.removeEventListener('update-draft-message', handleUpdateDraftMessage as EventListener);
      window.removeEventListener('clear-draft-message', handleClearDraftMessage as EventListener);
    };
  }, [draftMessage]);

  // 選択テキストで検索する関数
  const searchBySelectedText = useCallback(async (text: string) => {
    try {
      if (!text) return;
      console.log('検索キーワード:', text);

      // カンマやスペースで区切られた複数のキーワード対応
      const keywords = text.split(/[,\s]+/).map(k => k.trim()).filter(Boolean);
      const keywordType = keywords.map(k => {
        // 特定のパターンに基づいてキーワードタイプを判断
        if (/^[A-Z0-9]{2,}-\d+$/.test(k)) return 'model';
        if (/部品|装置|ユニット|モジュール/.test(k)) return 'component';
        return '';
      });

      console.log('キーワードタイプ:', ...keywordType);

      setSearching(true);

      console.log('画像検索開始:', text);

      // 画像検索APIを呼び出す
      const response = await apiRequest('POST', '/api/tech-support/image-search', { 
        query: text,
        count: 10
      });

      if (!response.ok) {
        throw new Error('画像検索に失敗しました');
      }

      const results = await response.json();
      console.log('検索結果数:', results.images?.length || 0);

      if (!results.images || results.images.length === 0) {
        console.log(`「${text}」に関する検索結果はありませんでした`);
        setSearchResults([]);
      } else {
        setSearchResults(results.images.map((img: any) => ({
          ...img,
          src: img.url || img.file,
          alt: img.title || img.description || '画像',
          title: img.title || '',
          description: img.description || ''
        })));
      }
    } catch (error) {
      console.error('検索エラー:', error);
      toast({
        title: '検索エラー',
        description: '画像の検索に失敗しました。',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [toast]);

  // 検索結果をクリアする関数
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // カメラで画像を撮影する関数
  const captureImage = useCallback(async () => {
    try {
      // カスタムイベントでカメラモーダルを開く
      const cameraEvent = new Event('open-camera');
      window.dispatchEvent(cameraEvent);

      return Promise.resolve();
    } catch (error) {
      console.error('カメラエラー:', error);
      toast({
        title: 'カメラエラー',
        description: 'カメラを開けませんでした。',
        variant: 'destructive',
      });
      return Promise.resolve();
    }
  }, [toast]);

  // メッセージ送信関数
  const sendMessage = useCallback(async (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[]) => {
    if (!content.trim() && (!mediaUrls || mediaUrls.length === 0)) return;

    setIsLoading(true);

    try {
      //   const userMessage: Message = {
      //     id: Date.now(),
      //     content: content.trim(),
      //     sender: 'user',
      //     timestamp: new Date(),
      //     mediaUrls: mediaUrls
      //   };

      //   console.log('メッセージ送信開始:', { chatId, content, mediaUrls });

      //   // メディアURLsのデバッグログ
      //   if (mediaUrls && mediaUrls.length > 0) {
      //     console.log('送信するメディア情報:');
      //     mediaUrls.forEach((media, index) => {
      //       console.log(`  ${index + 1}. タイプ: ${media.type}, URL: ${media.url}`);
      //       // URLが有効かチェック
      //       if (media.type === 'image' && media.url.startsWith('data:image/')) {
      //         console.log(`    Base64画像データ: ${media.url.substring(0, 50)}...`);
      //       }
      //     });
      //   }

      //   setMessages(prev => [...prev, userMessage]);

      //   // チャットIDが設定されていない場合は初期化
      //   let currentChatId = chatId;
      //   if (!currentChatId) {
      //     currentChatId = await initializeChat();
      //     if (!currentChatId) {
      //       currentChatId = 1; // フォールバック
      //     }
      //   }

      //   setIsLoading(true);
      //   setDraftMessage(null);

      //   console.log('メッセージ送信開始:', { chatId: currentChatId, content });

      //   // ローカルでメッセージを即座に表示
      //   const userMessage = {
      //     id: Date.now(),
      //     chatId: currentChatId,
      //     content,
      //     isAiResponse: false,
      //     senderId: 'user',
      //     timestamp: new Date(),
      //     media: (mediaUrls || []).map((media, idx) => ({
      //       id: Date.now() + idx,
      //       messageId: Date.now(),
      //       ...media
      //     }))
      //   };
      console.log('メッセージ送信開始:', { chatId, content, mediaUrls });

      // メディアURLsのデバッグログ
      if (mediaUrls && mediaUrls.length > 0) {
        console.log('送信するメディア情報:');
        mediaUrls.forEach((media, index) => {
          console.log(`  ${index + 1}. タイプ: ${media.type}, URL: ${media.url}`);
          // URLが有効かチェック
          if (media.type === 'image' && media.url.startsWith('data:image/')) {
            console.log(`    Base64画像データ: ${media.url.substring(0, 50)}...`);
          }
        });
      }

      // チャットIDが設定されていない場合は初期化
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await initializeChat();
        if (!currentChatId) {
          currentChatId = 1; // フォールバック
        }
      }

      setIsLoading(true);
      setDraftMessage(null);

      console.log('メッセージ送信開始:', { chatId: currentChatId, content, mediaUrls });

      // ローカルでメッセージを即座に表示
      const userMessage = {
        id: Date.now(),
        chatId: currentChatId,
        content: content || '', // 空文字列の場合もサポート
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date(),
        media: (mediaUrls || []).map((media, idx) => ({
          id: Date.now() + idx,
          messageId: Date.now(),
          ...media
        }))
      };

      const aiMessage = {
        id: Date.now() + 1,
        chatId: currentChatId,
        content: '処理中...',
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date()
      };

      // メッセージを一度だけ追加
      setMessages(prev => [...prev, userMessage, aiMessage]);

      // バックグラウンドでAPIに送信を試行
      try {
        const requestData = { 
          content,
          useOnlyKnowledgeBase: localStorage.getItem('useOnlyKnowledgeBase') !== 'false',
          usePerplexity: false
        };

        // メディアがある場合のみmediaUrlsを追加
        if (mediaUrls && mediaUrls.length > 0) {
          requestData.mediaUrls = mediaUrls;
        }

        console.log('API送信データ:', {
          content: requestData.content,
          useOnlyKnowledgeBase: requestData.useOnlyKnowledgeBase,
          usePerplexity: requestData.usePerplexity,
          mediaCount: mediaUrls?.length || 0,
          mediaDetails: mediaUrls?.map(m => ({
            type: m.type,
            urlLength: m.url.length,
            isBase64: m.url.startsWith('data:'),
            urlPrefix: m.url.substring(0, 50) + '...'
          }))
        });

        const response = await apiRequest('POST', `/api/chats/${currentChatId}/messages`, requestData);

        if (response.ok) {
          const data = await response.json();
          console.log('API応答データ:', data);
          
          // APIからの応答でメッセージを更新
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...data.aiMessage, timestamp: new Date(data.aiMessage.timestamp) }
              : msg.id === userMessage.id
              ? { ...data.userMessage, timestamp: new Date(data.userMessage.timestamp) }
              : msg
          ));
        } else {
          const errorText = await response.text();
          console.error('API応答エラー:', response.status, errorText);
          
          // API失敗時はローカルの応答メッセージを更新
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: 'サーバーとの通信に失敗しました。ローカルでメッセージを保持しています。' }
              : msg
          ));
        }
      } catch (apiError) {
        console.error('API送信エラー:', apiError);
        // API失敗時はローカルの応答メッセージを更新
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: 'サーバーとの通信に失敗しました。ローカルでメッセージを保持しています。' }
            : msg
        ));
      }

      setTempMedia([]);
      setRecordedText('');
      searchBySelectedText(content);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      toast({
        title: 'メッセージ送信エラー',
        description: 'メッセージを送信できませんでした。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, searchBySelectedText, tempMedia, toast]);

  // 音声認識の初期化を最適化
  const initializeSpeechRecognition = useCallback(() => {
    try {
      const currentMedia = draftMessage?.media || [];

      startSpeechRecognition(
        async (text: string) => {
          if (!text.trim()) return;

          setLastAudioInputTime(Date.now());

          if (micSilenceTimeoutId) clearTimeout(micSilenceTimeoutId);
          const silenceId = setTimeout(() => {
            if (Date.now() - lastAudioInputTime >= AUTO_STOP_THRESHOLD) {
              stopSpeechRecognition();
              stopBrowserSpeechRecognition();
              setIsRecording(false);
              setDraftMessage(null);
              setRecognitionPhrases([]);
              setRecognitionBuffer([]);
              setLastSentText('');
              setRecordedText('');
            }
          }, AUTO_STOP_THRESHOLD);
          setMicSilenceTimeoutId(silenceId);

          // 認識テキストをバッファに追加
          setRecognitionBuffer(prev => {
            const newBuffer = [...prev, text];

            // バッファリングタイマーをリセット
            if (bufferTimeoutId) clearTimeout(bufferTimeoutId);
            const timeoutId = setTimeout(() => {
              const combinedText = newBuffer.join(' ');
              sendMessage(combinedText);
              setRecognitionBuffer([]);
            }, BUFFER_INTERVAL);
            setBufferTimeoutId(timeoutId);

            return newBuffer;
          });
        },
        (error: string) => {
          console.log('Azure音声認識エラー:', error);

          toast({
            title: 'ブラウザAPIに切り替えます',
            duration: 1000,
          });

          stopSpeechRecognition();

          setRecordedText('');
          setLastSentText('');
          setRecognitionPhrases([]);
          setRecognitionBuffer([]);
          setBlockSending(false);

          startBrowserSpeechRecognition(
            async (text: string) => {
              if (!text.trim()) return;

              setLastAudioInputTime(Date.now());

              if (micSilenceTimeoutId) clearTimeout(micSilenceTimeoutId);
              const silenceId = setTimeout(() => {
                if (Date.now() - lastAudioInputTime >= SILENCE_THRESHOLD) {
                  stopSpeechRecognition();
                  stopBrowserSpeechRecognition();
                  setIsRecording(false);
                  setDraftMessage(null);
                  setRecognitionPhrases([]);
                  setRecognitionBuffer([]);
                  setLastSentText('');
                  setRecordedText('');
                }
              }, SILENCE_THRESHOLD);
              setMicSilenceTimeoutId(silenceId);

              // 認識テキストをバッファに追加
              setRecognitionBuffer(prev => {
                const newBuffer = [...prev, text];

                // バッファリングタイマーをリセット
                if (bufferTimeoutId) clearTimeout(bufferTimeoutId);
                const timeoutId = setTimeout(() => {
                  const combinedText = newBuffer.join(' ');
                  sendMessage(combinedText);
                  setRecognitionBuffer([]);
                }, BUFFER_INTERVAL);
                setBufferTimeoutId(timeoutId);

                return newBuffer;
              });
            },
            (error: string) => {
              toast({
                title: '音声認識エラー',
                description: error,
                variant: 'destructive',
              });
              setIsRecording(false);
            }
          );
        }
      );
    } catch (error) {
      console.error('音声認識開始エラー:', error);
      setIsRecording(false);
      toast({
        title: '音声認識エラー',
        description: '音声認識を開始できませんでした。',
        variant: 'destructive',
      });
    }
  }, [draftMessage?.media, lastAudioInputTime, micSilenceTimeoutId, bufferTimeoutId, sendMessage, toast]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedText('');
    setLastSentText('');
    setRecognitionPhrases([]);
    setRecognitionBuffer([]);
    setBlockSending(false);
    setLastAudioInputTime(Date.now());

    initializeSpeechRecognition();
  }, [initializeSpeechRecognition]);

  // 録音停止関数
  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // バッファ内の残りのテキストを送信
    if (recognitionBuffer.length > 0) {
      const finalText = recognitionBuffer.join(' ');
      sendMessage(finalText);
    }

    // 状態をリセット
    setRecordedText('');
    setLastSentText('');
    setRecognitionPhrases([]);
    setRecognitionBuffer([]);

    // 音声認識を停止
    stopSpeechRecognition();
    stopBrowserSpeechRecognition();

    // タイマーをクリア
    if (micSilenceTimeoutId) {
      clearTimeout(micSilenceTimeoutId);
      setMicSilenceTimeoutId(null);
    }
    if (bufferTimeoutId) {
      clearTimeout(bufferTimeoutId);
      setBufferTimeoutId(null);
    }
  }, [micSilenceTimeoutId, bufferTimeoutId, recognitionBuffer, sendMessage]);

  // チャット履歴をエクスポートする関数
  const exportChatHistory = useCallback(async () => {
    try {
      if (!chatId) return;

      setIsExporting(true);

      const response = await apiRequest('POST', `/api/chats/${chatId}/export`);

      if (!response.ok) {
        throw new Error('チャット履歴のエクスポートに失敗しました');
      }

      const data = await response.json();

      toast({
        title: 'エクスポート完了',
        description: 'チャット履歴が正常にエクスポートされました。',
      });

      // 最後のエクスポート履歴を更新
      setLastExportTimestamp(new Date());
      setHasUnexportedMessages(false);

      return data;
    } catch (error) {
      console.error('エクスポートエラー:', error);
      toast({
        title: 'エクスポートエラー',
        description: 'チャット履歴のエクスポートに失敗しました。',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [chatId, toast]);

  // 外部システム連携用に形式化されたデータをエクスポートする
  const exportFormattedData = useCallback(async () => {
    try {
      if (!chatId) return {};

      const response = await apiRequest('GET', `/api/chats/${chatId}/formatted-export`);

      if (!response.ok) {
        throw new Error('フォーマット済みデータの取得に失敗しました');
      }

      return await response.json();
    } catch (error) {
      console.error('フォーマット済みデータの取得エラー:', error);
      return {};
    }
  }, [chatId]);

  // 緊急ガイドデータを送信する関数
  const sendEmergencyGuide = useCallback(async (guideData: any) => {
    try {
      // チャットIDがない場合は初期化を試みる
      if (!chatId) {
        const newChatId = await initializeChat();
        if (!newChatId) {
          throw new Error('チャットの初期化に失敗しました');
        }
      }

      setIsLoading(true);

      // 現在のチャットIDを取得
      const currentChatId = chatId || 1;
      console.log('応急処置ガイド: チャットID', currentChatId, 'にデータを送信します');

      // ChatMessage形式でメッセージを作成
      const timestamp = Date.now();

      // ユーザーメッセージ（左側）
      const userMessage = {
        id: timestamp,
        chatId: currentChatId,
        content: `応急処置ガイド「${guideData.title}」を実施しました`,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };

      // AI応答メッセージ（右側）
      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: `■ 応急処置ガイド実施記録\n\n**${guideData.title}**\n\n${guideData.content}\n\n---\n**AI分析**: 応急処置手順が正常に記録されました。実施状況に関して追加のご質問がございましたらお聞かせください。`,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date()
      };

      console.log('🏥 ChatMessage形式でメッセージを作成しました:');
      console.log('- ユーザーメッセージ:', userMessage);
      console.log('- AIメッセージ:', aiMessage);

      // メッセージを即座にローカル状態に追加
      setMessages(prevMessages => {
        console.log('✅ メッセージをローカル状態に追加 - 現在のメッセージ数:', prevMessages.length);
        const newMessages = [...prevMessages, userMessage, aiMessage];
        console.log('✅ 応急処置ガイドメッセージ追加完了:', newMessages.length, '件');
        return newMessages;
      });

      // バックエンドにも送信を試行（非同期）
      try {
        const response = await apiRequest('POST', `/api/emergency-guide/send`, {
          chatId: currentChatId,
          guideData,
          userMessage,
          aiMessage
        });

        if (response.ok) {
          const data = await response.json();
          console.log('応急処置ガイド: サーバーへの送信成功', data);
        } else {
          console.warn('サーバーへの送信は失敗しましたが、ローカルメッセージは表示されています');
        }
      } catch (apiError) {
        console.error('API送信エラー:', apiError);
        // サーバー送信に失敗してもローカルメッセージは表示済み
      }

      // 関連する画像検索も実行
      if (guideData.title) {
        searchBySelectedText(guideData.title);
      }

      // 成功トーストを表示
      toast({
        title: '応急処置ガイド記録完了',
        description: 'チャット履歴に応急処置の実施記録が追加されました',
      });

      // スクロール処理
      setTimeout(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          console.log('チャットエリアを最下部にスクロールしました');
        }
      }, 100);

      // イベント送信
      window.dispatchEvent(new CustomEvent('emergency-guide-sent', {
        detail: { 
          guideData, 
          timestamp: new Date(), 
          success: true,
          userMessage,
          aiMessage
        }
      }));

      // ChatMessage形式で結果を返す
      return {
        success: true,
        userMessage,
        aiMessage,
        guideData
      };

    } catch (error) {
      console.error('緊急ガイド送信エラー:', error);

      // エラーの種類に応じてメッセージを分岐
      if (error instanceof Error && error.message.includes('API')) {
        toast({
          title: 'API通信エラー',
          description: 'サーバーとの通信中にエラーが発生しました',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '緊急ガイド送信エラー',
          description: '応急処置ガイドの送信に失敗しました。',
          variant: 'destructive',
        });
      }

      // エラーが発生してもチャット機能は継続
      return {
        success: false,
        error: error,
        userMessage: null,
        aiMessage: null,
        guideData
      };
    } finally {
      setIsLoading(false);
    }
  }, [chatId, searchBySelectedText, toast]);

  // チャット履歴を全て削除する関数
  const clearChatHistory = useCallback(async () => {
    try {
      setIsClearing(true);

      // まずローカル状態を即座にクリア（UIの即座の反映のため）
      console.log('ローカル状態を即座にクリアします');
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
      setTempMedia([]);
      setDraftMessage(null);
      setRecordedText('');
      setSelectedText('');
      clearSearchResults();

      // 応急処置ガイドメッセージもローカルストレージから削除
      try {
        localStorage.removeItem('emergencyGuideMessage');
        console.log('応急処置ガイドメッセージをローカルストレージから削除しました');
      } catch (error) {
        console.warn('ローカルストレージからの削除に失敗:', error);
      }

      // サーバーへのリクエストを実行してデータベースをクリア
      if (chatId) {
        try {
          console.log(`チャット履歴削除開始: chatId=${chatId}`);

          // 強制クリアフラグ付きでサーバーに送信
          const response = await apiRequest('POST', `/api/chats/${chatId}/clear`, {
            force: true,
            clearAll: true
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`サーバーでのチャット履歴削除に失敗: ${response.status} - ${errorText}`);
            throw new Error(`削除APIエラー: ${response.status}`);
          }

          const result = await response.json();
          console.log('サーバー側削除結果:', result);

          // サーバー削除成功後、再度ローカル状態をクリア（確実に空にするため）
          setMessages([]);
          setSearchResults([]);
          clearSearchResults();

        } catch (error) {
          console.error('サーバー側削除エラー:', error);
          // サーバー側の削除に失敗した場合もローカルクリアは維持
          setMessages([]);
          setSearchResults([]);
          clearSearchResults();
        }
      }

      // 成功メッセージを表示
      toast({
        title: '削除完了',
        description: 'チャット履歴が削除されました',
      });

      // クリア状態を少し長めに保持してから解除
      setTimeout(() => {
        setIsClearing(false);
      }, 2000);

    } catch (error) {
      console.error('チャット履歴削除エラー:', error);
      // エラーが発生してもローカル状態はクリアを維持
      setMessages([]);
      setSearchResults([]);
      clearSearchResults();

      toast({
        title: '削除エラー',
        description: 'チャット履歴の削除に失敗しました',
        variant: 'destructive',
      });
      
      setTimeout(() => {
        setIsClearing(false);
      }, 1000);
    }
  }, [chatId, clearSearchResults, toast]);

  // チャットIDが変更されたときにメッセージを読み込む
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId || isInitializing) return;

      // クリア操作中は読み込みをスキップ
      if (isClearing) {
        console.log('クリア操作中のためメッセージ読み込みをスキップしました');
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiRequest('GET', `/api/chats/${chatId}/messages`);

        if (response.ok) {
          const data = await response.json();

          // レスポンスヘッダーでクリア状態を確認
          const isChatCleared = response.headers.get('X-Chat-Cleared') === 'true';

          if (isChatCleared || data.length === 0) {
            console.log(`チャットID ${chatId} はクリアされています`);
            setMessages([]);
          } else {
            console.log(`チャットID ${chatId} のメッセージを読み込みました: ${data.length}件`);
            setMessages(data.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })));
          }
        } else {
          console.error('メッセージの読み込みに失敗しました');
        }
      } catch (error) {
        console.error('メッセージ読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // クリア操作が完了してから一定時間待ってからメッセージを読み込む
    const timeoutId = setTimeout(() => {
      if (!isClearing) {
        loadMessages();
      }
    }, isClearing ? 1000 : 0);

    return () => clearTimeout(timeoutId);
  }, [chatId, isInitializing, isClearing]);

  // 最後のエクスポート履歴を取得
  const fetchLastExport = useCallback(async () => {
    if (!chatId) return;

    try {
      const response = await apiRequest('GET', `/api/chats/${chatId}/last-export`);
      const data = await response.json();

      if (data.timestamp) {
        setLastExportTimestamp(new Date(data.timestamp));
      }
    } catch (error) {
      console.error('Failed to fetch last export:', error);
    }
  }, [chatId]);

  // コンポーネントがマウントされたときに最後のエクスポート履歴を取得
  useEffect(() => {
    fetchLastExport();
  }, [fetchLastExport]);

  // メッセージが追加されたときに、未エクスポートのメッセージがあることを示す
  useEffect(() => {
    if (messages.length > 0 && lastExportTimestamp) {
      // 最後のエクスポート以降のメッセージがあるかチェック
      const hasNewMessages = messages.some(msg => new Date(msg.timestamp) > lastExportTimestamp);
      setHasUnexportedMessages(hasNewMessages);
    } else if (messages.length > 0) {
      // まだエクスポートしていない場合は、メッセージがあれば未エクスポート状態
      setHasUnexportedMessages(true);
    } else {
      // メッセージがない場合は未エクスポートではない
      setHasUnexportedMessages(false);
    }
  }, [messages, lastExportTimestamp]);

  // コンテキスト値を提供
  const contextValue: ChatContextValue = {
    messages,
    setMessages,
    isLoading,
    searching,
    searchResults,
    selectedText,
    setSelectedText,
    sendMessage,
    startRecording,
    stopRecording,
    isRecording,
    recordedText,
    searchBySelectedText,
    clearSearchResults,
    captureImage,
    exportChatHistory,
    exportFormattedData,
    lastExportTimestamp,
    isExporting,
    hasUnexportedMessages,
    sendEmergencyGuide,
    draftMessage,
    setDraftMessage,
    clearChatHistory,
    isClearing
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};