import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

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

  // 起動時は常に新しいチャットとして開始（履歴読み込みなし）
  useEffect(() => {
    if (chatId && !isInitializing) {
      console.log(`📝 新しいチャットとして開始: chatId=${chatId}`);
      setMessages([]); // 常に空のメッセージリストで開始
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
    }
  }, [chatId, isInitializing]);

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

  // 選択テキストで検索する関数（手動検索のみ）
  const searchBySelectedText = useCallback(async (text: string, isManualSearch: boolean = false) => {
    // 手動検索以外は完全に無効化
    if (!isManualSearch) {
      console.log('⚠️ 自動検索は無効化されています - 手動検索のみ実行可能');
      return;
    }

    // 既に検索中の場合はスキップ
    if (searching) {
      console.log('既に検索中のため、新しい検索をスキップします');
      return;
    }

    try {
      if (!text || !text.trim()) {
        console.log('検索テキストが空のため、検索をスキップします');
        return;
      }

      console.log('🔍 手動画像検索開始:', text);

      setSearching(true);

      // タイムアウト付きで画像検索APIを呼び出す
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      try {
        const response = await apiRequest('POST', '/api/tech-support/image-search', { 
          query: text,
          count: 10
        }, undefined, { signal: controller.signal });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('画像検索に失敗しました');
        }

        const results = await response.json();
        console.log('検索結果数:', results.images?.length || 0);

        if (!results.images || results.images.length === 0) {
          console.log(`「${text}」に関する検索結果はありませんでした`);
          setSearchResults([]);
        } else {
          const validResults = results.images
            .filter((img: any) => img && (img.url || img.file))
            .map((img: any) => ({
              ...img,
              src: img.url || img.file,
              alt: img.title || img.description || '画像',
              title: img.title || '',
              description: img.description || ''
            }));

          setSearchResults(validResults);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log('検索がタイムアウトしました');
          toast({
            title: '検索タイムアウト',
            description: '検索に時間がかかりすぎたため中断しました。',
            variant: 'destructive',
          });
        } else {
          throw fetchError;
        }
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
  }, [searching, toast]);

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

  // メッセージ正規化処理
  const normalizeMessage = useCallback((message: any): Message => {
    // contentが文字列でない場合の正規化
    let normalizedContent = '';
    
    if (typeof message.content === 'string') {
      normalizedContent = message.content;
    } else if (typeof message.content === 'object' && message.content !== null) {
      // オブジェクト型からの文字列抽出
      console.warn('オブジェクト型のcontentを正規化します:', message.content);
      
      // 画像データの場合は preview プロパティを優先
      if (message.content.preview && typeof message.content.preview === 'string') {
        normalizedContent = message.content.preview;
        console.log('画像データのpreviewを抽出:', normalizedContent.substring(0, 50) + '...');
      } else if (message.content.url && typeof message.content.url === 'string') {
        normalizedContent = message.content.url;
        console.log('画像データのurlを抽出:', normalizedContent);
      } else {
        // その他のプロパティから抽出
        normalizedContent = message.content.text || 
                           message.content.content || 
                           message.content.message || 
                           message.content.data ||
                           JSON.stringify(message.content);
      }
    } else if (message.text && typeof message.text === 'string') {
      normalizedContent = message.text;
    } else {
      console.warn('メッセージコンテンツを正規化できませんでした:', message);
      normalizedContent = '[メッセージ内容を読み込めませんでした]';
    }

    return {
      ...message,
      content: normalizedContent,
      text: normalizedContent, // 互換性のため
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(message.createdAt || new Date())
    };
  }, []);

  // メッセージ送信関数
  const sendMessage = useCallback(async (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[]) => {
    // 重複送信防止
    if (isLoading || !content.trim()) {
      console.log('メッセージ送信をスキップ: 読み込み中または空のコンテンツ');
      return;
    }

    // コンテンツの型安全性を保証
    const safeContent = typeof content === 'string' ? content : String(content || '');

    try {
      setIsLoading(true);
      console.log('メッセージ送信開始:', safeContent);

      // 一意のIDを生成（時間ベース + ランダム）
      const messageId = Date.now() + Math.random();

      // 新しいメッセージを作成（構造統一：contentは必ず文字列）
      const newMessage: Message = {
        id: messageId,
        content: safeContent,
        text: safeContent, // 旧形式互換性のためtextも保持
        media: mediaUrls || [],
        role: 'user' as const,
        createdAt: new Date(),
        chatId: chatId
      };

      // メッセージの内容をログで確認
      console.log('送信メッセージ作成:', {
        id: messageId,
        contentType: typeof safeContent,
        contentPreview: safeContent.substring(0, 100) + '...',
        isBase64: safeContent.startsWith('data:image/'),
        mediaCount: mediaUrls?.length || 0
      });

      // ドラフトメッセージをクリア
      setDraftMessage(null);
      setRecordedText('');

      // 楽観的にメッセージを追加
      setMessages(prev => [...prev, newMessage]);

      // サーバーにメッセージを送信
      const response = await apiRequest('POST', '/api/chats/1/messages', {
        content,
        media: mediaUrls,
        chatId: chatId
      });

      if (!response.ok) {
        throw new Error('メッセージの送信に失敗しました');
      }

      const savedMessage = await response.json();
      console.log('メッセージ送信完了:', savedMessage);

      // サーバーから返されたメッセージでローカルメッセージを更新
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === messageId 
            ? { ...normalizeMessage(savedMessage), timestamp: new Date(savedMessage.timestamp) } 
            : msg
        );

        // サーバーとの同期を確実にする
        queryClient.setQueryData([`/api/chats/${chatId}/messages`], updatedMessages);
        console.log('📝 メッセージをサーバーと同期しました:', savedMessage.id);

        return updatedMessages;
      });

      // 未エクスポートフラグを設定
      setHasUnexportedMessages(true);

    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました",
        variant: "destructive",
      });

      // エラー時は楽観的に追加したメッセージを削除
      setMessages(prev => prev.filter(msg => msg.content !== content));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, queryClient, toast, chatId]);

  // 音声認識の初期化を最適化
  const initializeSpeechRecognition = useCallback(() => {
    try {
      const currentMedia = draftMessage?.media || [];

      startSpeechRecognition(
        async (text: string) => {
          if (!text.trim()) return;

          console.log('🔊 音声認識結果受信:', text);
          setLastAudioInputTime(Date.now());

          if (micSilenceTimeoutId) clearTimeout(micSilenceTimeoutId);
          const silenceId = setTimeout(() => {
            if (Date.now() - lastAudioInputTime >= AUTO_STOP_THRESHOLD) {
              console.log('⏰ 自動停止タイマー発動');
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

          // 認識テキストをバッファに追加（重複防止強化）
          setRecognitionBuffer(prev => {
            // 同じテキストの重複を防止
            if (prev.includes(text)) {
              console.log('📝 重複テキストをスキップ:', text);
              return prev;
            }

            const newBuffer = [...prev, text];
            console.log('📝 バッファ更新:', newBuffer);

            // バッファリングタイマーをリセット
            if (bufferTimeoutId) clearTimeout(bufferTimeoutId);
            const timeoutId = setTimeout(() => {
              if (isLoading) {
                console.log('📝 送信中のためバッファ送信をスキップ');
                return;
              }

              const combinedText = newBuffer.join(' ').trim();
              if (combinedText && combinedText.length > 2) {
                console.log('💬 メッセージ送信:', combinedText);
                sendMessage(combinedText);
                setRecognitionBuffer([]);
              }
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

      // ユーザーメッセージ（左側）- 構造統一
      const userMessageContent = `応急処置ガイド「${guideData.title}」を実施しました`;
      const userMessage = {
        id: timestamp,
        chatId: currentChatId,
        content: userMessageContent,
        text: userMessageContent,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };

      // AI応答メッセージ（右側）- 構造統一
      const aiMessageContent = `■ 応急処置ガイド実施記録\n\n**${guideData.title}**\n\n${guideData.content}\n\n---\n**AI分析**: 応急処置手順が正常に記録されました。実施状況に関して追加のご質問がございましたらお聞かせください。`;
      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: aiMessageContent,
        text: aiMessageContent,
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

      // 緊急ガイド送信時は自動検索を完全無効化
      console.log('🏥 緊急ガイド送信完了 - 自動検索は実行しません');

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

  // チャット履歴をクリアする関数（履歴送信→データベース削除→新しいチャット開始）
  const clearChatHistory = useCallback(async () => {
    try {
      setIsClearing(true);
      console.log('🗑️ チャット履歴クリア開始: 履歴送信→データベース削除→新しいチャット開始');

      // 1. まず未送信メッセージがある場合は履歴送信
      if (hasUnexportedMessages && messages.length > 0) {
        console.log('📤 未送信メッセージを先に送信します');
        try {
          await exportChatHistory();
          console.log('✅ 履歴送信完了');
        } catch (exportError) {
          console.error('履歴送信エラー:', exportError);
          toast({
            title: '履歴送信エラー',
            description: '履歴の送信に失敗しましたが、クリアを続行します',
            variant: 'destructive',
          });
        }
      }

      // 2. データベースからチャット履歴を削除
      if (chatId) {
        console.log('🗄️ データベースからチャット履歴を削除します');
        try {
          const response = await apiRequest('POST', `/api/chats/${chatId}/clear`, {
            force: true,
            clearAll: true
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ データベース削除完了:', result);
          } else {
            throw new Error('データベース削除に失敗しました');
          }
        } catch (dbError) {
          console.error('データベース削除エラー:', dbError);
          toast({
            title: 'データベース削除エラー',
            description: 'サーバーでの削除に失敗しましたが、ローカルをクリアします',
            variant: 'destructive',
          });
        }
      }

      // 3. ローカル状態の完全リセット
      console.log('🔄 ローカル状態をリセットします');
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
      setTempMedia([]);
      setDraftMessage(null);
      setRecordedText('');
      setSelectedText('');
      clearSearchResults();

      // 4. ローカルキャッシュのクリア
      try {
        queryClient.removeQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        queryClient.removeQueries({ queryKey: ['search_results'] });
        console.log('📦 ローカルキャッシュをクリアしました');
      } catch (localError) {
        console.warn('ローカルキャッシュクリアエラー:', localError);
      }

      // 5. 新しいチャットとして再初期化
      console.log('🆕 新しいチャットセッションを開始します');
      
      toast({
        title: 'クリア完了',
        description: '履歴をデータベースに送信し、新しいチャットを開始しました',
      });

    } catch (error) {
      console.error('🚨 チャット履歴クリアエラー:', error);
      
      // エラー時もローカル状態は確実にクリア
      setMessages([]);
      setSearchResults([]);
      setHasUnexportedMessages(false);
      
      toast({
        title: 'クリアエラー',
        description: 'エラーが発生しましたが、ローカル画面はクリアされました',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  }, [chatId, messages.length, hasUnexportedMessages, exportChatHistory, clearSearchResults, toast, queryClient]);

  // 起動時は常に新しいチャットとして開始（復元処理なし）
  useEffect(() => {
    if (chatId && !isClearing) {
      console.log('🆕 新しいチャットセッションを開始');
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
    }
  }, [chatId, isClearing]);

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
// Disable automatic image search feature due to stability issues.