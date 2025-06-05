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
  const BUFFER_INTERVAL = 300; // バッファリング間隔を300ミリ秒に戻す
  const SILENCE_THRESHOLD = 1000; // 無音検出時間は1秒のまま

  const initializeChat = async (): Promise<void> => {
    console.log('チャット初期化開始');

    try {
      console.log('認証状態確認中...');

      // 認証状態を確認
      const authResponse = await fetch('/api/auth/me');
      let isAuthenticated = false;
      let userId = null;

      if (authResponse.ok) {
        const userData = await authResponse.json();
        isAuthenticated = !!userData?.id;
        userId = userData?.id;
        console.log('ユーザーは認証済みです:', userData);
      } else {
        console.log('ユーザーは未認証です');
      }

      // 新しいチャットを作成
      let createResponse;
      if (isAuthenticated) {
        createResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        // 未認証ユーザー用のダミー認証を実行
        console.log('認証API呼び出しに失敗、デフォルトチャットを使用');
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'default@example.com',
            password: 'default123'
          }),
        });

        if (loginResponse.ok) {
          console.log('デフォルトユーザーでログイン成功');
          createResponse = await fetch('/api/chats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else {
          console.log('認証API呼び出しに失敗、デフォルトチャットを使用:', await loginResponse.json());
          // 認証に失敗した場合でもUUIDダミーチャットIDを設定
          const dummyChatId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
          setChatId(dummyChatId);
          return;
        }
      }

      if (!createResponse || !createResponse.ok) {
        throw new Error('チャット作成に失敗しました');
      }

      const newChat = await createResponse.json();
      console.log('新しいチャットを作成しました:', newChat);

      // newChat.idがUUID形式であることを確認
      if (newChat.id && typeof newChat.id === 'string' && newChat.id.length > 10) {
        setChatId(newChat.id);
        console.log('UUIDチャットIDを設定:', newChat.id);
      } else {
        console.warn('サーバーから無効なチャットIDが返されました:', newChat.id);
        // フォールバック用のUUID
        const fallbackId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        setChatId(fallbackId);
      }

    } catch (error) {
      console.error('チャット初期化エラー:', error);
      // エラーが発生した場合はUUIDフォーマットのデフォルトIDを使用
      const fallbackId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      setChatId(fallbackId);
    }
  };

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
      const response = await apiRequest('POST', '/api/tech-support/search-image', { 
        query: text,
        count: 10
      });

      console.log('画像検索APIレスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('画像検索APIエラー詳細:', errorText);
        throw new Error(`画像検索に失敗しました: ${response.status} ${errorText}`);
      }

      const results = await response.json();
      console.log('検索結果数:', results.images?.length || 0);
      console.log('検索結果詳細:', results);

      // レスポンスがHTMLかチェック
      if (typeof results === 'string' && results.includes('<!DOCTYPE html>')) {
        console.error('画像検索APIがHTMLを返しました - エンドポイントエラー');
        setSearchResults([]);
        return;
      }

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
      console.error('検索エラー詳細:', error);
      toast({
        title: '検索エラー',
        description: `画像の検索に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    let currentChatId = chatId;

    try {
      console.log('メッセージ送信開始:', content);

      if (!currentChatId) {
        console.log('チャットIDが無いため初期化します');
        const newChatId = await initializeChat();
        if (!newChatId) {
          throw new Error('チャットの初期化に失敗しました');
        }
        currentChatId = newChatId;
        setChatId(newChatId);
        console.log('新しいチャットIDを設定しました:', newChatId);
      }

      setIsLoading(true);
      setDraftMessage(null);

      // ユーザーメッセージを即座にUIに表示（楽観的更新）
      const allMedia = [
        ...(tempMedia || []),
        ...(mediaUrls || [])
      ];

      const userMessage = {
        id: Date.now(),
        content,
        role: 'user' as const,
        timestamp: new Date(),
        media: allMedia.length > 0 ? allMedia.map((media, idx) => ({
          id: Date.now() + idx,
          messageId: Date.now(),
          ...media
        })) : []
      };

      // ユーザーメッセージを即座に表示
      setMessages(prev => [...prev, userMessage]);

      const useOnlyKnowledgeBase = localStorage.getItem('useOnlyKnowledgeBase') !== 'false';

      console.log('APIリクエスト送信:', {
        chatId: currentChatId,
        content,
        useOnlyKnowledgeBase
      });

      const response = await apiRequest('POST', `/api/chats/${currentChatId}/messages`, { 
        content,
        useOnlyKnowledgeBase,
        usePerplexity: false
      });

      console.log('APIレスポンス:', response.status, response.statusText);

      if (!response.ok) {
        // 404エラーの場合はchatIdをクリア
        if (response.status === 404) {
          localStorage.removeItem('currentChatId');
          setChatId(null);
        }
        const errorText = await response.text();
        console.error('APIエラー詳細:', errorText);

        // エラー時はダミーのAIレスポンスを表示
        const errorMessage = {
          id: Date.now() + 1,
          content: `申し訳ございません。現在システムにアクセスできません。入力されたメッセージ「${content}」について、後ほど再度お試しください。`,
          role: 'assistant' as const,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorMessage]);
        throw new Error(`メッセージの送信に失敗しました: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('受信データ:', data);

      // APIレスポンスの形式チェック
      if (!data.userMessage || !data.aiMessage) {
        console.error('APIレスポンス形式エラー:', data);
        throw new Error('サーバーから無効なレスポンスを受信しました');
      }

      // APIレスポンスでメッセージを更新
      setMessages(prev => {
        // 最後のユーザーメッセージを正式なデータで置き換え、AIメッセージを追加
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...data.userMessage,
          timestamp: new Date(data.userMessage.timestamp),
          media: allMedia.length > 0 ? allMedia.map((media, idx) => ({
            id: Date.now() + idx,
            messageId: data.userMessage.id,
            ...media
          })) : []
        };

        newMessages.push({
          ...data.aiMessage,
          timestamp: new Date(data.aiMessage.timestamp)
        });

        return newMessages;
      });

      setTempMedia([]);
      setRecordedText('');
      searchBySelectedText(content);

      console.log('メッセージ送信完了');
    } catch (error) {
      console.error('メッセージ送信エラー詳細:', error);
      toast({
        title: 'メッセージ送信エラー',
        description: `メッセージを送信できませんでした: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      let currentChatId = chatId;
      if (!currentChatId) {
        const newChatId = await initializeChat();
        if (!newChatId) {
          throw new Error('チャットの初期化に失敗しました');
        }
        currentChatId = newChatId;
        setChatId(newChatId);
      }

      setIsLoading(true);
      localStorage.setItem('currentChatId', String(currentChatId));
      console.log('応急処置ガイド: チャットID', currentChatId, 'にデータを送信します');

      // ログ出力を追加（デバッグ用）
      console.log('送信データ:', {
        chatId: currentChatId,
        guideData: {
          ...guideData,
          content: guideData.content ? guideData.content.substring(0, 100) + '...' : null
        }
      });

      try {
        // 緊急ガイド専用のエンドポイントを使用
        const response = await apiRequest('POST', `/api/emergency-guide/send`, {
          chatId: currentChatId,
          guideData
        });

        // レスポンスをチェック
        if (!response.ok) {
          // 404エラーの場合はchatIdをクリア
          if (response.status === 404) {
            localStorage.removeItem('currentChatId');
            setChatId(null);
          }
          // エラーの詳細情報を取得
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || 'ガイドの送信に失敗しました');
          } catch (parseError) {
            throw new Error(`ガイドの送信に失敗しました (${response.status})`);
          }
        }

        // レスポンスデータを取得
        const data = await response.json();
        console.log('応急処置ガイド: 送信成功', data);
        // メッセージリストに追加
        setMessages(prev => [
          ...prev,
          { 
            ...data.userMessage, 
            timestamp: new Date(data.userMessage.timestamp)
          },
          {
            ...data.aiMessage,
            timestamp: new Date(data.aiMessage.timestamp)
          }
        ]);

        // 関連する画像検索も実行
        if (guideData.title) {
          searchBySelectedText(guideData.title);
        }

        return data;
      } catch (apiError) {
        console.error('APIリクエストエラー:', apiError);
        toast({
          title: 'API通信エラー',
          description: 'サーバーとの通信中にエラーが発生しました',
          variant: 'destructive',
        });
        throw apiError; // 上位のエラーハンドラーに再スロー
      }
    } catch (error) {
      console.error('緊急ガイド送信エラー:', error);
      toast({
        title: '緊急ガイド送信エラー',
        description: '応急処置ガイドの送信に失敗しました。ログインしているか確認してください。',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [chatId, searchBySelectedText, toast]);

  // チャット履歴を全て削除する関数
  const clearChatHistory = useCallback(async () => {
    try {
      // まずローカルの状態をクリア
      setMessages([]);
      setSearchResults([]);
      setHasUnexportedMessages(false);
      setLastExportTimestamp(null);
      setDraftMessage(null);
      setRecordedText('');
      setLastSentText('');
      setRecognitionPhrases([]);
      setBlockSending(false);
      setIsProcessing(false);

      // 音声認識を停止
      stopSpeechRecognition();
      stopBrowserSpeechRecognition();

      // カスタムイベントを発行
      if (typeof window !== 'undefined') {
        const clearEvent = new CustomEvent('clear-draft-message');
        window.dispatchEvent(clearEvent);

        const resetEvent = new CustomEvent('reset-recognition-phrases');
        window.dispatchEvent(resetEvent);
      }

      // クリア時のタイムスタンプを保存
      const clearTimestamp = Date.now().toString();
      localStorage.setItem('chat_cleared_timestamp', clearTimestamp);

      // React Queryのキャッシュをクリア
      try {
        // @ts-ignore
        if (window.queryClient) {
          window.queryClient.removeQueries({ queryKey: ['/api/chats/1/messages'] });
          window.queryClient.setQueryData(['/api/chats/1/messages'], []);
        }
      } catch (cacheError) {
        console.error('キャッシュクリアエラー:', cacheError);
      }

      // サーバーへのリクエストは最後に実行
      if (chatId) {
        setIsClearing(true);
        try {
          const response = await apiRequest('POST', `/api/chats/${chatId}/clear`);
          if (!response.ok) {
            console.warn(`サーバーでのチャット履歴削除に失敗しました (${response.status})`);
          }
        } catch (error) {
          console.error('APIリクエストエラー:', error);
          // エラーは無視（ローカルの状態は既にクリア済み）
        } finally {
          setIsClearing(false);
        }
      }

      toast({
        title: 'チャット履歴を削除しました',
        description: '全てのメッセージが削除されました。',
      });
    }Implement UUID chat ID and fallback mechanism for unauthenticated users.    } catch (error) {
      console.error('チャット履歴削除エラー:', error);
      toast({
        title: 'チャット履歴削除エラー',
        description: 'チャット履歴の削除に失敗しました。ローカルの状態はクリアされました。',
        variant: 'destructive',
      });
    }
  }, [chatId, toast]);

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