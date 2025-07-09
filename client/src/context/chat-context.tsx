import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/use-toast.ts';
import { apiRequest } from '../lib/queryClient.ts';
import { useQueryClient } from '@tanstack/react-query';
import { startSpeechRecognition, stopSpeechRecognition, startBrowserSpeechRecognition, stopBrowserSpeechRecognition } from '../lib/azure-speech.ts';
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
  sendFlowExecutionResult: (flowData: any) => Promise<void>; // フロー実行結果送信関数を追加
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
      sendFlowExecutionResult: async () => {},
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
  const [chatId, setChatId] = useState<string | null>(null);
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

      // UUIDを生成してチャットIDを設定
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const chatId = generateUUID();
      setChatId(chatId);
      console.log('チャットIDを設定しました:', chatId);
      return chatId;
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // エラーが発生した場合もUUIDを生成
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const chatId = generateUUID();
      setChatId(chatId);
      return chatId;
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
    // メッセージの基本構造を詳しく確認
    console.log('🔍 メッセージ正規化開始:', {
      id: message.id,
      hasContent: !!message.content,
      contentType: typeof message.content,
      hasText: !!message.text,
      hasMessage: !!message.message,
      messageKeys: Object.keys(message || {}),
      fullMessage: message // 完全なメッセージオブジェクトをログ出力
    });

    // contentが文字列でない場合の正規化
    let normalizedContent = '';

    // 1. まず直接的な文字列プロパティをチェック
    if (typeof message.content === 'string' && message.content.trim()) {
      normalizedContent = message.content;
      console.log('✅ 文字列contentを使用:', normalizedContent.substring(0, 50) + '...');
    } else if (typeof message.text === 'string' && message.text.trim()) {
      normalizedContent = message.text;
      console.log('✅ textプロパティを使用:', normalizedContent.substring(0, 50) + '...');
    } else if (typeof message.message === 'string' && message.message.trim()) {
      normalizedContent = message.message;
      console.log('✅ messageプロパティを使用:', normalizedContent.substring(0, 50) + '...');
    }
    // 2. サーバーレスポンスの特殊な構造をチェック（OpenAI APIレスポンス等）
    else if (message.choices && Array.isArray(message.choices) && message.choices.length > 0) {
      const choice = message.choices[0];
      if (choice.message && typeof choice.message.content === 'string') {
        normalizedContent = choice.message.content;
        console.log('✅ OpenAI API形式のレスポンスから抽出:', normalizedContent.substring(0, 50) + '...');
      }
    }
    // 3. ネストされたオブジェクトからの抽出
    else if (typeof message.content === 'object' && message.content !== null) {
      console.warn('⚠️ オブジェクト型のcontentを正規化します:', message.content);

      // 画像データの場合は preview プロパティを優先
      if (message.content.preview && typeof message.content.preview === 'string') {
        normalizedContent = message.content.preview;
        console.log('🖼️ 画像データのpreviewを抽出:', normalizedContent.substring(0, 50) + '...');
      } else if (message.content.url && typeof message.content.url === 'string') {
        normalizedContent = message.content.url;
        console.log('🔗 画像データのurlを抽出:', normalizedContent);
      } else {
        // その他のプロパティから抽出を試行
        const possibleContent = message.content.text || 
                               message.content.content || 
                               message.content.message || 
                               message.content.data || 
                               message.content.response ||
                               message.content.answer;

        if (typeof possibleContent === 'string' && possibleContent.trim()) {
          normalizedContent = possibleContent;
          console.log('📝 ネストされたプロパティから抽出:', normalizedContent.substring(0, 50) + '...');
        } else {
          // オブジェクトをJSON文字列として表示（最後の手段）
          normalizedContent = JSON.stringify(message.content, null, 2);
          console.log('📄 オブジェクトをJSON文字列として表示');
        }
      }
    }
    // 4. どのプロパティからも文字列が取得できない場合
    else {
      console.error('❌ メッセージコンテンツを正規化できませんでした:', {
        message,
        contentType: typeof message.content,
        hasText: !!message.text,
        hasMessage: !!message.message,
        hasChoices: !!message.choices
      });

      // より詳細なデバッグ情報を表示
      console.log('🔍 詳細デバッグ - 利用可能なプロパティ:', {
        messageKeys: Object.keys(message),
        contentKeys: message.content ? Object.keys(message.content) : 'content is null/undefined',
        textType: typeof message.text,
        messageType: typeof message.message
      });

      normalizedContent = `[メッセージ内容を読み込めませんでした - デバッグ: ${JSON.stringify({
        id: message.id,
        keys: Object.keys(message),
        contentType: typeof message.content
      })}]`;
    }

    // 空のコンテンツの場合のフォールバック
    if (!normalizedContent || !normalizedContent.trim()) {
      normalizedContent = '[空のメッセージです]';
      console.warn('⚠️ 空のコンテンツのためフォールバック文字列を使用');
    }

    // 正規化されたメッセージを作成
    const normalizedMessage = {
      ...message,
      content: normalizedContent,
      text: normalizedContent, // 互換性のため
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(message.createdAt || new Date())
    };

    console.log('✅ メッセージ正規化完了:', {
      id: normalizedMessage.id,
      contentLength: normalizedContent.length,
      contentPreview: normalizedContent.substring(0, 100) + '...',
      originalMessageType: typeof message.content,
      normalizedSuccessfully: !!normalizedContent && normalizedContent.trim().length > 0
    });

    return normalizedMessage;
  }, []);

  // メッセージ送信関数（シンプル化）
  const sendMessage = useCallback(async (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[]) => {
    if (isLoading || !content.trim()) return;

    // チャットIDが設定されているかチェック
    if (!chatId) {
      console.log('チャットIDが設定されていません。初期化を待機します...');
      await initializeChat();
      return;
    }

    setIsLoading(true);

    // ユーザーメッセージを即座に表示
    const userMessage: Message = {
      id: Date.now(),
      content: content,
      isAiResponse: false,
      timestamp: new Date(),
      media: mediaUrls || []
    };

    setMessages(prev => [...prev, userMessage]);
    setDraftMessage(null);

    try {
      // AIレスポンスを取得
      console.log('📤 メッセージ送信リクエスト:', {
        url: `/api/chats/${chatId}/messages`,
        content: content.substring(0, 100) + '...',
        contentLength: content.length,
        media: mediaUrls
      });
      
      const response = await apiRequest('POST', `/api/chats/${chatId}/messages`, {
        content,
        media: mediaUrls
      });

      console.log('📥 メッセージ送信レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const aiResponse = await response.json();
        
        console.log('📥 AIレスポンス解析:', {
          responseType: typeof aiResponse,
          responseKeys: Object.keys(aiResponse || {}),
          content: aiResponse?.content?.substring(0, 100) + '...',
          text: aiResponse?.text?.substring(0, 100) + '...',
          hasContent: !!aiResponse?.content,
          hasText: !!aiResponse?.text
        });

        // AIメッセージを追加
        const aiMessage: Message = {
          id: Date.now() + 1,
          content: aiResponse.content || aiResponse.text || 'レスポンスエラー',
          isAiResponse: true,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);

        // 新規メッセージに対して画像検索を実行
        try {
          console.log('✅ AI応答受信完了、画像検索を開始します...');
          const { searchByText, reloadImageSearchData } = await import('../lib/image-search.ts');

          // まず画像検索データの初期化を確認
          console.log('🔄 画像検索データをリロードします...');
          await reloadImageSearchData();

          console.log(`🔍 検索を実行します... クエリ: "${content}"`);
          const searchResults = await searchByText(content, true);
          console.log('📊 検索結果（生データ）:', searchResults);

          if (searchResults && searchResults.length > 0) {
            // 検索結果を処理して画像パスを修正（Fuse.js結果構造に対応）
            const processedResults = searchResults.map((result: any) => {
              // Fuse.jsの検索結果の場合、itemプロパティに実データが格納される
              const actualResult = result.item || result;
              
              return {
                ...actualResult,
                id: actualResult.id || Math.random(),
                url: actualResult.file || actualResult.url,
                file: actualResult.file || actualResult.url,
                title: actualResult.title || '関連画像',
                description: actualResult.description || '',
                category: actualResult.category || ''
              };
            });
            console.log('🎨 表示用に加工した検索結果:', processedResults);
            console.log(`🖼️ 関係画像エリアに ${processedResults.length} 件の画像を設定します`);
            setSearchResults(processedResults);
          } else {
            console.log('❌ 画像検索結果は0件でした。');
            setSearchResults([]);
          }
        } catch (searchError) {
          console.error('❌ 画像検索処理中にエラーが発生しました:', searchError);
          setSearchResults([]);
        }
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      
      // エラーの詳細情報を取得
      let errorMessage = "メッセージの送信に失敗しました";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // APIレスポンスエラーの場合
        if ('status' in error && 'statusText' in error) {
          errorMessage = `HTTP ${error.status}: ${error.statusText}`;
        } else if ('message' in error) {
          errorMessage = String(error.message);
        }
      }
      
      toast({
        title: "送信エラー",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, toast, chatId, initializeChat]);

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
      const currentChatId = chatId || "1";
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

      // 応急処置ガイドの画像を収集
      const guideImages = guideData.steps?.filter((step: any) => step.imageUrl && step.imageUrl.trim())
        .map((step: any, index: number) => ({
          id: `guide_img_${index}`,
          type: 'image',
          url: step.imageUrl,
          thumbnail: step.imageUrl,
          title: step.title || `ステップ${index + 1}`,
          fileName: step.imageFileName
        })) || [];

      console.log('🖼️ 応急処置ガイド画像収集:', guideImages.length, '件');

      // AI応答メッセージ（右側）- 構造統一（画像情報を含む）
      const aiMessageContent = `■ 応急処置ガイド実施記録\n\n**${guideData.title}**\n\n${guideData.content}\n\n---\n**AI分析**: 応急処置手順が正常に記録されました。実施状況に関して追加のご質問がございましたらお聞かせください。`;
      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: aiMessageContent,
        text: aiMessageContent,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date(),
        media: guideImages // 画像情報を追加
      };

      console.log('🏥 ChatMessage形式でメッセージを作成しました:');
      console.log('- ユーザーメッセージ:', userMessage);
      console.log('- AIメッセージ:', aiMessage);
      console.log('- 含まれる画像数:', guideImages.length);

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
          guideData: {
            title: guideData.title,
            content: guideData.content,
            steps: guideData.steps || [],
            images: guideImages // 画像情報も送信
          }
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

      // 新規メッセージに対して画像検索を実行
      try {
        const { searchImages } = await import('../lib/image-search.ts');
        const searchResults = await searchImages(userMessageContent);
        console.log('🔍 緊急ガイド用画像検索結果:', searchResults?.length || 0, '件');

        if (searchResults && searchResults.length > 0) {
          // 検索結果を処理して画像パスを修正
          const processedResults = searchResults.map((result: any, index: number) => ({
            ...result,
            id: result?.id || `img_${index}`,
            url: result?.file || result?.url,
            title: result?.title || '関連画像',
            type: 'image'
          }));

          console.log('🖼️ 緊急ガイド関連画像表示:', processedResults.length, '件');
          setSearchResults(processedResults);
        } else {
          console.log('🔍 緊急ガイド用画像検索結果なし');
          setSearchResults([]);
        }
      } catch (searchError) {
        console.warn('緊急ガイド画像検索エラー:', searchError);
        setSearchResults([]);
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

    } catch (error) {
      console.error('応急処置ガイド送信エラー:', error);
      toast({
        title: 'エラー',
        description: '応急処置ガイドの送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, setMessages, setSearchResults, toast, apiRequest]);

  // フロー実行結果をチャットに送信する関数（新規追加）
  const sendFlowExecutionResult = useCallback(async (flowData: any) => {
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
      const currentChatId = chatId || "1";
      console.log('フロー実行結果: チャットID', currentChatId, 'にデータを送信します');

      const timestamp = Date.now();

      // ユーザーメッセージ（左側）
      const userMessageContent = flowData.isPartial 
        ? `応急処置ガイド「${flowData.title}」の途中経過を送信しました`
        : `応急処置ガイド「${flowData.title}」のフローを実行しました`;
      const userMessage = {
        id: timestamp,
        chatId: currentChatId,
        content: userMessageContent,
        text: userMessageContent,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };

      // 実行したステップから画像を収集
      const executedImages = flowData.executedSteps
        ?.flatMap((step: any) => {
          const images: any[] = [];
          
          // imageUrlがある場合
          if (step.imageUrl && step.imageUrl.trim()) {
            images.push({
              id: `flow_img_${step.stepId}_url`,
              type: 'image',
              url: step.imageUrl,
              thumbnail: step.imageUrl,
              title: step.title || `ステップ画像`,
              fileName: `step_${step.stepId}.jpg`
            });
          }
          
          // images配列がある場合
          if (step.images && Array.isArray(step.images)) {
            step.images.forEach((image: any, index: number) => {
              if (image.url && image.url.trim()) {
                images.push({
                  id: `flow_img_${step.stepId}_${index}`,
                  type: 'image',
                  url: image.url,
                  thumbnail: image.url,
                  title: step.title || `ステップ${index + 1}`,
                  fileName: image.fileName || `step_${step.stepId}_${index}.jpg`
                });
              }
            });
          }
          
          return images;
        }) || [];

      console.log('🖼️ フロー実行画像収集:', executedImages.length, '件');

      // 実行したステップの詳細をフォーマット
      const stepDetails = flowData.executedSteps
        ?.map((step: any, index: number) => {
          let stepText = `${index + 1}. **${step.title}**\n${step.message}`;
          if (step.selectedCondition) {
            stepText += `\n選択: ${step.selectedCondition}`;
          }
          return stepText;
        })
        .join('\n\n') || '';

      // AI応答メッセージ（右側）- フロー実行結果
      const aiMessageContent = flowData.isPartial
        ? `■ 応急処置フロー途中経過\n\n**${flowData.title}**\n\n**実行済みステップ:**\n${stepDetails}\n\n**送信時刻:** ${flowData.completedAt.toLocaleString('ja-JP')}\n\n---\n**AI分析**: 応急処置フローの途中経過が記録されました。続行する場合はガイドを継続してください。`
        : `■ 応急処置フロー実行記録\n\n**${flowData.title}**\n\n**実行したステップ:**\n${stepDetails}\n\n**実行完了時刻:** ${flowData.completedAt.toLocaleString('ja-JP')}\n\n---\n**AI分析**: 応急処置フローが正常に実行されました。各ステップの実施状況を確認し、必要に応じて追加の対応を行ってください。`;
      
      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: aiMessageContent,
        text: aiMessageContent,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date(),
        media: executedImages // 実行したステップの画像を追加
      };

      console.log('🏥 フロー実行結果メッセージを作成しました:');
      console.log('- ユーザーメッセージ:', userMessage);
      console.log('- AIメッセージ:', aiMessage);
      console.log('- 含まれる画像数:', executedImages.length);

      // メッセージを即座にローカル状態に追加
      setMessages(prevMessages => {
        console.log('✅ フロー実行結果メッセージをローカル状態に追加 - 現在のメッセージ数:', prevMessages.length);
        const newMessages = [...prevMessages, userMessage, aiMessage];
        console.log('✅ フロー実行結果メッセージ追加完了:', newMessages.length, '件');
        return newMessages;
      });

      // 成功トーストを表示
      toast({
        title: flowData.isPartial ? '途中経過送信完了' : 'フロー実行記録完了',
        description: flowData.isPartial 
          ? 'チャット履歴に応急処置フローの途中経過が追加されました'
          : 'チャット履歴に応急処置フローの実行記録が追加されました',
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
      window.dispatchEvent(new CustomEvent('flow-execution-sent', {
        detail: { 
          flowData, 
          timestamp: new Date(), 
          success: true,
          userMessage,
          aiMessage
        }
      }));

    } catch (error) {
      console.error('フロー実行結果送信エラー:', error);
      toast({
        title: 'エラー',
        description: 'フロー実行結果の送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, setMessages, toast]);

  // イベントリスナーの設定
  useEffect(() => {
    // 既存のイベントリスナー
    const handleEmergencyGuideSent = (event: CustomEvent) => {
      console.log('🏥 応急処置ガイド送信イベントを受信:', event.detail);
      // 既存の処理はそのまま
    };

    // 新しいフロー実行完了イベントリスナー
    const handleEmergencyGuideCompleted = (event: CustomEvent) => {
      console.log('🏥 応急処置ガイド完了イベントを受信:', event.detail);
      sendFlowExecutionResult(event.detail);
    };

    window.addEventListener('emergency-guide-sent', handleEmergencyGuideSent as EventListener);
    window.addEventListener('emergency-guide-completed', handleEmergencyGuideCompleted as EventListener);

    return () => {
      window.removeEventListener('emergency-guide-sent', handleEmergencyGuideSent as EventListener);
      window.removeEventListener('emergency-guide-completed', handleEmergencyGuideCompleted as EventListener);
    };
  }, [sendFlowExecutionResult]);

  // チャット履歴をクリアする関数（表面的にクリア→新しいチャット開始）
  const clearChatHistory = useCallback(async () => {
    try {
      setIsClearing(true);
      console.log('🗑️ チャット履歴クリア開始: 表面的にクリア→新しいチャット開始');

      // 1. ローカル状態の即座完全リセット（表面的にクリア）
      console.log('🔄 画面上のチャット履歴を即座にクリアします');
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
      setTempMedia([]);
      setDraftMessage(null);
      setRecordedText('');
      setSelectedText('');
      clearSearchResults();

      // 2. ローカルキャッシュのクリア（強制的にクリア）
      try {
        queryClient.removeQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        queryClient.removeQueries({ queryKey: ['search_results'] });
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        queryClient.clear(); // 全キャッシュをクリア
        console.log('📦 ローカルキャッシュを強制的にクリアしました');
      } catch (localError) {
        console.warn('ローカルキャッシュクリアエラー:', localError);
            }

      // 3. 新しいチャットセッションとして初期化
      console.log('🆕 新しいチャットセッションを開始します');

      toast({
        title: 'クリア完了',
        description: '新しいチャットを開始しました',
      });

    } catch (error) {
      console.error('🚨 チャット履歴クリアエラー:', error);

      // エラー時もローカル状態は確実にクリア
      setMessages([]);
      setSearchResults([]);
      setHasUnexportedMessages(false);

      toast({
        title: 'クリアエラー',
        description: 'エラーが発生しましたが、画面はクリアされました',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  }, [chatId, clearSearchResults, toast, queryClient]);

  // 起動時は常に新しいチャットとして開始（無駄な処理なし）
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
    
    // UUIDの形式チェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId)) {
      console.log('Invalid chat ID format - skipping last export fetch');
      return;
    }

    try {
      console.log('🔄 最後のエクスポート履歴を取得中:', {
        chatId,
        url: `/api/chats/${chatId}/last-export`,
        location: window.location.href,
        origin: window.location.origin
      });

      const response = await apiRequest('GET', `/api/chats/${chatId}/last-export`);
      
      console.log('📡 最後のエクスポート履歴レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url
      });

      // レスポンスの内容を確認
      const responseText = await response.text();
      console.log('📄 レスポンス内容:', responseText);

      // JSONとして解析
      const data = JSON.parse(responseText);

      if (data.timestamp) {
        setLastExportTimestamp(new Date(data.timestamp));
        console.log('✅ 最後のエクスポート履歴を設定:', data.timestamp);
      }
    } catch (error) {
      console.error('❌ Failed to fetch last export:', error);
      console.error('詳細エラー情報:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
    sendFlowExecutionResult,
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
// The image search logic is modified to ensure its execution and handle potential errors.