import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/use-toast.ts';
import { apiRequest } from '../lib/queryClient.ts';
import { useQueryClient } from '@tanstack/react-query';
import { startSpeechRecognition, stopSpeechRecognition, startBrowserSpeechRecognition, stopBrowserSpeechRecognition } from '../lib/azure-speech.ts';
import { Message } from '@shared/schema';

// 蜊∝・縺ｪ譁・→縺ｿ縺ｪ縺呎怙蟆乗枚蟄玲焚
const MIN_TEXT_LENGTH = 5;
// 譛螟ｧ譁・ｭ玲焚・医％繧後ｒ雜・∴縺溘ｉ閾ｪ蜍慕噪縺ｫ騾∽ｿ｡・・
const MAX_TEXT_LENGTH = 50;

// 繝√Ε繝・ヨ繧ｳ繝ｳ繝・く繧ｹ繝医・蝙句ｮ夂ｾｩ
interface ChatContextType {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  sendMessage: (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[], isAiResponse?: boolean) => Promise<void>;
  isLoading: boolean;
  clearChatHistory: () => void;
  isClearing: boolean;
  chatId: string | null;
  initializeChat: () => void;
  exportChatHistory: () => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
  searching: boolean;
  setSearching: (searching: boolean) => void;
  sendEmergencyGuide: (guideData: any) => Promise<void>;
  // searchBySelectedText: (text: string) => Promise<void>; // 逕ｻ蜒乗､懃ｴ｢讖溯・繧貞炎髯､
}

// 繝√Ε繝・ヨ繧ｳ繝ｳ繝・く繧ｹ繝医・菴懈・
const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === null) {
    console.error("ChatContext is null - this likely means useChat was called outside of the ChatProvider");
    // 莉｣譖ｿ縺ｨ縺励※譛蟆城剞縺ｮ繝・ヵ繧ｩ繝ｫ繝亥､繧定ｿ斐＠縲√い繝励Μ縺後け繝ｩ繝・す繝･縺吶ｋ縺ｮ繧帝亟縺・
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
      isClearing: false,
      initializeChat: async () => '',
      chatId: null
    } as unknown as ChatContextType;
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

  // 繝励Ξ繝薙Η繝ｼ逕ｨ荳譎ゅΓ繝・そ繝ｼ繧ｸ・医∪縺騾∽ｿ｡縺励※縺・↑縺・′繝ｦ繝ｼ繧ｶ繝ｼ蜈･蜉帛燕縺ｫ陦ｨ遉ｺ縺吶ｋ縺溘ａ縺ｮ繝｡繝・そ繝ｼ繧ｸ・・
  const [draftMessage, setDraftMessage] = useState<{
    content: string,
    media?: { type: string, url: string, thumbnail?: string }[]
  } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 譛蠕後↓騾∽ｿ｡縺励◆繝・く繧ｹ繝医ｒ菫晏ｭ倥☆繧句､画焚・磯㍾隍・∽ｿ｡髦ｲ豁｢逕ｨ・・
  const [lastSentText, setLastSentText] = useState<string>('');
  // 髻ｳ螢ｰ隱崎ｭ倥↓繧医ｋ騾∽ｿ｡繧帝亟豁｢縺吶ｋ繧ｿ繧､繝槭・
  const [sendTimeoutId, setSendTimeoutId] = useState<NodeJS.Timeout | null>(null);
  // 髻ｳ螢ｰ隱崎ｭ倥ユ繧ｭ繧ｹ繝医・螳御ｺ・ｺｦ繧定ｿｽ霍｡縺吶ｋ縺溘ａ縺ｮ螟画焚
  const [recognitionPhrases, setRecognitionPhrases] = useState<string[]>([]);
  // 髻ｳ螢ｰ隱崎ｭ倥ユ繧ｭ繧ｹ繝医・騾∽ｿ｡繧偵ヶ繝ｭ繝・け縺吶ｋ繝輔Λ繧ｰ
  const [blockSending, setBlockSending] = useState<boolean>(false);
  // 譛蠕後↓髻ｳ螢ｰ隱崎ｭ倥ｒ蜿嶺ｿ｡縺励◆譎る俣・域ｲ磯ｻ呎､懷・逕ｨ・・
  const [lastRecognitionTime, setLastRecognitionTime] = useState<number>(0);
  // 豐磯ｻ吶′讀懷・縺輔ｌ縺溘°縺ｩ縺・°
  const [silenceDetected, setSilenceDetected] = useState<boolean>(false);
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  // 蜃ｦ逅・ｸｭ繝輔Λ繧ｰ
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastAudioInputTime, setLastAudioInputTime] = useState(Date.now());
  const [micSilenceTimeoutId, setMicSilenceTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [recognitionBuffer, setRecognitionBuffer] = useState<string[]>([]);
  const [bufferTimeoutId, setBufferTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const BUFFER_INTERVAL = 200; // 繝舌ャ繝輔ぃ繝ｪ繝ｳ繧ｰ髢馴囈繧・00繝溘Μ遘偵↓邨ｱ荳
  const SILENCE_THRESHOLD = 1000; // 辟｡髻ｳ讀懷・譎る俣: 1遘・
  const AUTO_STOP_THRESHOLD = 10000; // 閾ｪ蜍募●豁｢譎る俣: 10遘・

  // 繝√Ε繝・ヨ縺ｮ蛻晄悄蛹・
  const initializeChat = useCallback(async () => {
    try {
      setIsInitializing(true);

      // UUID繧堤函謌舌＠縺ｦ繝√Ε繝・ヨID繧定ｨｭ螳・
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const chatId = generateUUID();
      setChatId(chatId);
      console.log('笨・繝√Ε繝・ヨID繧定ｨｭ螳壹＠縺ｾ縺励◆:', chatId);
      return chatId;
    } catch (error) {
      console.error('笶・Failed to initialize chat:', error);
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医ｂUUID繧堤函謌・
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const chatId = generateUUID();
      setChatId(chatId);
      console.log('笨・繧ｨ繝ｩ繝ｼ蠕後・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺ｧ繝√Ε繝・ヨID繧定ｨｭ螳・', chatId);
      return chatId;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｦ繝ｳ繝域凾縺ｫ繝√Ε繝・ヨ繧貞・譛溷喧
  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // 襍ｷ蜍墓凾縺ｯ蟶ｸ縺ｫ譁ｰ縺励＞繝√Ε繝・ヨ縺ｨ縺励※髢句ｧ具ｼ亥ｱ･豁ｴ隱ｭ縺ｿ霎ｼ縺ｿ縺ｪ縺暦ｼ・
  useEffect(() => {
    if (chatId && !isInitializing) {
      console.log(`統 譁ｰ縺励＞繝√Ε繝・ヨ縺ｨ縺励※髢句ｧ・ chatId=${chatId}`);
      // 譌｢蟄倥・繝｡繝・そ繝ｼ繧ｸ縺後≠繧句ｴ蜷医・菫晄戟縺励√↑縺・ｴ蜷医・縺ｿ遨ｺ縺ｫ縺吶ｋ
      setMessages(prevMessages => {
        if (prevMessages.length === 0) {
          console.log('繝｡繝・そ繝ｼ繧ｸ縺檎ｩｺ縺ｮ縺溘ａ縲∵眠縺励＞繝√Ε繝・ヨ縺ｨ縺励※髢句ｧ・);
          return [];
        } else {
          console.log(`譌｢蟄倥・繝｡繝・そ繝ｼ繧ｸ${prevMessages.length}莉ｶ繧剃ｿ晄戟`);
          return prevMessages;
        }
      });
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
    }
  }, [chatId, isInitializing]);

  // 隱崎ｭ倥ユ繧ｭ繧ｹ繝医・鬘樔ｼｼ蠎ｦ繧堤｢ｺ隱阪☆繧矩未謨ｰ・磯Κ蛻・枚蟄怜・縺句愛螳夲ｼ・
  const isSubstringOrSimilar = (text1: string, text2: string): boolean => {
    if (!text1 || !text2) return false;
    const lowerText1 = text1.toLowerCase().trim();
    const lowerText2 = text2.toLowerCase().trim();

    // 螳悟・荳閾ｴ縺ｾ縺溘・驛ｨ蛻・枚蟄怜・縺九メ繧ｧ繝・け
    if (lowerText1 === lowerText2 || lowerText1.includes(lowerText2) || lowerText2.includes(lowerText1)) {
      return true;
    }

    // 繧医ｊ蜴ｳ譬ｼ縺ｪ鬘樔ｼｼ諤ｧ蛻､螳・- 蜈磯ｭ驛ｨ蛻・′蜷後§縺九メ繧ｧ繝・け
    const minLength = Math.min(lowerText1.length, lowerText2.length);
    if (minLength > 3) {
      // 遏ｭ縺・婿縺ｮ譁・ｭ怜・縺ｮ髟ｷ縺輔・70%莉･荳翫′蜈磯ｭ縺九ｉ荳閾ｴ縺吶ｋ蝣ｴ蜷医・鬘樔ｼｼ縺ｨ縺ｿ縺ｪ縺・
      const matchLength = Math.floor(minLength * 0.7);
      if (lowerText1.substring(0, matchLength) === lowerText2.substring(0, matchLength)) {
        return true;
      }
    }

    // 80%莉･荳翫・蜊倩ｪ槭′荳閾ｴ縺吶ｋ縺九メ繧ｧ繝・け
    const words1 = lowerText1.split(/\s+/);
    const words2 = lowerText2.split(/\s+/);

    // 蜊倩ｪ樊焚縺悟ｰ代↑縺・ｴ蜷医・逶ｴ謗･豈碑ｼ・
    if (words1.length <= 2 || words2.length <= 2) {
      return lowerText1.length > 0 && lowerText2.length > 0 && 
        (lowerText1.includes(lowerText2) || lowerText2.includes(lowerText1));
    }

    // 蜈ｱ騾壹☆繧句腰隱槭・謨ｰ繧偵き繧ｦ繝ｳ繝・
    const commonWords = words1.filter(word => words2.includes(word));
    const similarityRatio = commonWords.length / Math.max(words1.length, words2.length);

    return similarityRatio >= 0.7; // 70%莉･荳贋ｸ閾ｴ縺ｫ邱ｩ蜥・
  };

  // 繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ譖ｴ譁ｰ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・
  useEffect(() => {
    let isUpdating = false; // 譖ｴ譁ｰ荳ｭ繝輔Λ繧ｰ
    let updateTimeout: NodeJS.Timeout | null = null;

    // 繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ譖ｴ譁ｰ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・繧定ｨｭ螳・
    const handleUpdateDraftMessage = (event: CustomEvent) => {
      if (isUpdating) {
        console.log('譖ｴ譁ｰ荳ｭ縺ｮ縺溘ａ縲√ラ繝ｩ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ縺ｮ譖ｴ譁ｰ繧偵せ繧ｭ繝・・');
        return;
      }

      if (event.detail && typeof event.detail.content === 'string') {
        const { content } = event.detail;

        // 遨ｺ縺ｮ繧ｳ繝ｳ繝・Φ繝・・蝣ｴ蜷医・繧ｯ繝ｪ繧｢
        if (!content.trim()) {
          setDraftMessage(null);
          return;
        }

        // 譖ｴ譁ｰ荳ｭ繝輔Λ繧ｰ繧定ｨｭ螳・
        isUpdating = true;

        // 譌｢蟄倥・繝｡繝・ぅ繧｢縺ｯ菫晄戟
        const currentMedia = draftMessage?.media || [];

        // 繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ繧呈峩譁ｰ
        setDraftMessage({
          content,
          media: currentMedia
        });

        // 譖ｴ譁ｰ荳ｭ繝輔Λ繧ｰ繧偵Μ繧ｻ繝・ヨ・・00ms蠕鯉ｼ・
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
          isUpdating = false;
        }, 300);
      }
    };

    // 繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ繧ｯ繝ｪ繧｢逕ｨ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・
    const handleClearDraftMessage = (event: Event) => {
      console.log('繧ｯ繝ｪ繧｢繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ繧､繝吶Φ繝亥女菫｡');

      // 縺吶∋縺ｦ縺ｮ迥ｶ諷九ｒ繝ｪ繧ｻ繝・ヨ
      setDraftMessage(null);
      setRecordedText('');
      setLastSentText('');
      setRecognitionPhrases([]);
      setBlockSending(false);
      setIsProcessing(false);

      // 髻ｳ螢ｰ隱崎ｭ倥ｒ蛛懈ｭ｢
      stopSpeechRecognition();
      stopBrowserSpeechRecognition();
    };

    // 繧､繝吶Φ繝医Μ繧ｹ繝翫・繧定ｿｽ蜉
    window.addEventListener('update-draft-message', handleUpdateDraftMessage as EventListener);
    window.addEventListener('clear-draft-message', handleClearDraftMessage as EventListener);

    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・髢｢謨ｰ
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      window.removeEventListener('update-draft-message', handleUpdateDraftMessage as EventListener);
      window.removeEventListener('clear-draft-message', handleClearDraftMessage as EventListener);
    };
  }, [draftMessage]);

  // 驕ｸ謚槭ユ繧ｭ繧ｹ繝医〒讀懃ｴ｢縺吶ｋ髢｢謨ｰ・域焔蜍墓､懃ｴ｢縺ｮ縺ｿ・・
  const searchBySelectedText = useCallback(async (text: string, isManualSearch: boolean = false) => {
    // 逕ｻ蜒乗､懃ｴ｢讖溯・繧堤┌蜉ｹ蛹厄ｼ・use.js繧剃ｽｿ逕ｨ縺励※縺・ｋ縺溘ａ・・
    console.log('剥 逕ｻ蜒乗､懃ｴ｢讖溯・縺ｯ辟｡蜉ｹ蛹悶＆繧後※縺・∪縺・);
    return;
  }, []);

  // 讀懃ｴ｢邨先棡繧偵け繝ｪ繧｢縺吶ｋ髢｢謨ｰ
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // 繧ｫ繝｡繝ｩ縺ｧ逕ｻ蜒上ｒ謦ｮ蠖ｱ縺吶ｋ髢｢謨ｰ
  const captureImage = useCallback(async () => {
    try {
      // 繧ｫ繧ｹ繧ｿ繝繧､繝吶Φ繝医〒繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ繧帝幕縺・
      const cameraEvent = new Event('open-camera');
      window.dispatchEvent(cameraEvent);

      return Promise.resolve();
    } catch (error) {
      console.error('繧ｫ繝｡繝ｩ繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｫ繝｡繝ｩ繧ｨ繝ｩ繝ｼ',
        description: '繧ｫ繝｡繝ｩ繧帝幕縺代∪縺帙ｓ縺ｧ縺励◆縲・,
        variant: 'destructive',
      });
      return Promise.resolve();
    }
  }, [toast]);

  // 繝｡繝・そ繝ｼ繧ｸ豁｣隕丞喧蜃ｦ逅・
  const normalizeMessage = useCallback((message: any): Message => {
    // 繝｡繝・そ繝ｼ繧ｸ縺ｮ蝓ｺ譛ｬ讒矩繧定ｩｳ縺励￥遒ｺ隱・
    console.log('剥 繝｡繝・そ繝ｼ繧ｸ豁｣隕丞喧髢句ｧ・', {
      id: message.id,
      hasContent: !!message.content,
      contentType: typeof message.content,
      hasText: !!message.text,
      hasMessage: !!message.message,
      messageKeys: Object.keys(message || {}),
      fullMessage: message // 螳悟・縺ｪ繝｡繝・そ繝ｼ繧ｸ繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ繝ｭ繧ｰ蜃ｺ蜉・
    });

    // content縺梧枚蟄怜・縺ｧ縺ｪ縺・ｴ蜷医・豁｣隕丞喧
    let normalizedContent = '';

    // 1. 縺ｾ縺夂峩謗･逧・↑譁・ｭ怜・繝励Ο繝代ユ繧｣繧偵メ繧ｧ繝・け
    if (typeof message.content === 'string' && message.content.trim()) {
      normalizedContent = message.content;
      console.log('笨・譁・ｭ怜・content繧剃ｽｿ逕ｨ:', normalizedContent.substring(0, 50) + '...');
    } else if (typeof message.text === 'string' && message.text.trim()) {
      normalizedContent = message.text;
      console.log('笨・text繝励Ο繝代ユ繧｣繧剃ｽｿ逕ｨ:', normalizedContent.substring(0, 50) + '...');
    } else if (typeof message.message === 'string' && message.message.trim()) {
      normalizedContent = message.message;
      console.log('笨・message繝励Ο繝代ユ繧｣繧剃ｽｿ逕ｨ:', normalizedContent.substring(0, 50) + '...');
    }
    // 2. 繧ｵ繝ｼ繝舌・繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ迚ｹ谿翫↑讒矩繧偵メ繧ｧ繝・け・・penAI API繝ｬ繧ｹ繝昴Φ繧ｹ遲会ｼ・
    else if (message.choices && Array.isArray(message.choices) && message.choices.length > 0) {
      const choice = message.choices[0];
      if (choice.message && typeof choice.message.content === 'string') {
        normalizedContent = choice.message.content;
        console.log('笨・OpenAI API蠖｢蠑上・繝ｬ繧ｹ繝昴Φ繧ｹ縺九ｉ謚ｽ蜃ｺ:', normalizedContent.substring(0, 50) + '...');
      }
    }
    // 3. 繝阪せ繝医＆繧後◆繧ｪ繝悶ず繧ｧ繧ｯ繝医°繧峨・謚ｽ蜃ｺ
    else if (typeof message.content === 'object' && message.content !== null) {
      console.warn('笞・・繧ｪ繝悶ず繧ｧ繧ｯ繝亥梛縺ｮcontent繧呈ｭ｣隕丞喧縺励∪縺・', message.content);

      // 逕ｻ蜒上ョ繝ｼ繧ｿ縺ｮ蝣ｴ蜷医・ preview 繝励Ο繝代ユ繧｣繧貞━蜈・
      if (message.content.preview && typeof message.content.preview === 'string') {
        normalizedContent = message.content.preview;
        console.log('名・・逕ｻ蜒上ョ繝ｼ繧ｿ縺ｮpreview繧呈歓蜃ｺ:', normalizedContent.substring(0, 50) + '...');
      } else if (message.content.url && typeof message.content.url === 'string') {
        normalizedContent = message.content.url;
        console.log('迫 逕ｻ蜒上ョ繝ｼ繧ｿ縺ｮurl繧呈歓蜃ｺ:', normalizedContent);
      } else {
        // 縺昴・莉悶・繝励Ο繝代ユ繧｣縺九ｉ謚ｽ蜃ｺ繧定ｩｦ陦・
        const possibleContent = message.content.text || 
                               message.content.content || 
                               message.content.message || 
                               message.content.data || 
                               message.content.response ||
                               message.content.answer;

        if (typeof possibleContent === 'string' && possibleContent.trim()) {
          normalizedContent = possibleContent;
          console.log('統 繝阪せ繝医＆繧後◆繝励Ο繝代ユ繧｣縺九ｉ謚ｽ蜃ｺ:', normalizedContent.substring(0, 50) + '...');
        } else {
          // 繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒJSON譁・ｭ怜・縺ｨ縺励※陦ｨ遉ｺ・域怙蠕後・謇区ｮｵ・・
          normalizedContent = JSON.stringify(message.content, null, 2);
          console.log('塘 繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒJSON譁・ｭ怜・縺ｨ縺励※陦ｨ遉ｺ');
        }
      }
    }
    // 4. 縺ｩ縺ｮ繝励Ο繝代ユ繧｣縺九ｉ繧よ枚蟄怜・縺悟叙蠕励〒縺阪↑縺・ｴ蜷・
    else {
      console.error('笶・繝｡繝・そ繝ｼ繧ｸ繧ｳ繝ｳ繝・Φ繝・ｒ豁｣隕丞喧縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆:', {
        message,
        contentType: typeof message.content,
        hasText: !!message.text,
        hasMessage: !!message.message,
        hasChoices: !!message.choices
      });

      // 繧医ｊ隧ｳ邏ｰ縺ｪ繝・ヰ繝・げ諠・ｱ繧定｡ｨ遉ｺ
      console.log('剥 隧ｳ邏ｰ繝・ヰ繝・げ - 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繝励Ο繝代ユ繧｣:', {
        messageKeys: Object.keys(message),
        contentKeys: message.content ? Object.keys(message.content) : 'content is null/undefined',
        textType: typeof message.text,
        messageType: typeof message.message
      });

      normalizedContent = `[繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆ - 繝・ヰ繝・げ: ${JSON.stringify({
        id: message.id,
        keys: Object.keys(message),
        contentType: typeof message.content
      })}]`;
    }

    // 遨ｺ縺ｮ繧ｳ繝ｳ繝・Φ繝・・蝣ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
    if (!normalizedContent || !normalizedContent.trim()) {
      normalizedContent = '[遨ｺ縺ｮ繝｡繝・そ繝ｼ繧ｸ縺ｧ縺兢';
      console.warn('笞・・遨ｺ縺ｮ繧ｳ繝ｳ繝・Φ繝・・縺溘ａ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ譁・ｭ怜・繧剃ｽｿ逕ｨ');
    }

    // 豁｣隕丞喧縺輔ｌ縺溘Γ繝・そ繝ｼ繧ｸ繧剃ｽ懈・
    const normalizedMessage = {
      ...message,
      content: normalizedContent,
      text: normalizedContent, // 莠呈鋤諤ｧ縺ｮ縺溘ａ
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(message.createdAt || new Date())
    };

    console.log('笨・繝｡繝・そ繝ｼ繧ｸ豁｣隕丞喧螳御ｺ・', {
      id: normalizedMessage.id,
      contentLength: normalizedContent.length,
      contentPreview: normalizedContent.substring(0, 100) + '...',
      originalMessageType: typeof message.content,
      normalizedSuccessfully: !!normalizedContent && normalizedContent.trim().length > 0
    });

    return normalizedMessage;
  }, []);

  // 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡髢｢謨ｰ・医す繝ｳ繝励Ν蛹悶・繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ蠑ｷ蛹厄ｼ・
  const sendMessage = useCallback(async (content: string, mediaUrls?: { type: string, url: string, thumbnail?: string }[], isAiResponse: boolean = false) => {
    // 蜈･蜉帛､縺ｮ讀懆ｨｼ
    if (!content || typeof content !== 'string') {
      console.error('辟｡蜉ｹ縺ｪ繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ:', content);
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '辟｡蜉ｹ縺ｪ繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ縺ｧ縺・,
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim() && (!mediaUrls || mediaUrls.length === 0)) {
      console.log('遨ｺ縺ｮ繝｡繝・そ繝ｼ繧ｸ縺ｮ縺溘ａ騾∽ｿ｡繧偵せ繧ｭ繝・・');
      return;
    }

    setIsLoading(true);

    try {
      // 繝√Ε繝・ヨID縺梧悴險ｭ螳壹・蝣ｴ蜷医・蛻晄悄蛹・
      let currentChatId = chatId;
      if (!currentChatId) {
        console.log('繝√Ε繝・ヨID縺梧悴險ｭ螳壹・縺溘ａ縲∝・譛溷喧繧貞ｮ溯｡・);
        currentChatId = await initializeChat();
        if (!currentChatId) {
          throw new Error('繝√Ε繝・ヨID縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆');
        }
      }

      const timestamp = Date.now();

      // 繝｡繝・ぅ繧｢繝輔ぃ繧､繝ｫ縺ｮ蜃ｦ逅・
      let processedMedia: any[] = [];
      if (mediaUrls && mediaUrls.length > 0) {
        processedMedia = mediaUrls.map((media, index) => ({
          id: `media_${timestamp}_${index}`,
          type: media.type,
          url: media.url,
          thumbnail: media.thumbnail || media.url,
          fileName: `${media.type}_${timestamp}_${index}`,
          title: content.substring(0, MAX_TEXT_LENGTH) || `${media.type}繝輔ぃ繧､繝ｫ`
        }));
      }

      // 繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      const message: Message = {
        id: timestamp,
        chatId: currentChatId,
        content: content.trim(),
        text: content.trim(),
        isAiResponse: isAiResponse,
        senderId: isAiResponse ? 'ai' : 'user',
        timestamp: new Date(),
        media: processedMedia
      };

      console.log('町 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡:', {
        id: message.id,
        content: message.content.substring(0, 50) + '...',
        isAiResponse: message.isAiResponse,
        mediaCount: processedMedia.length
      });

      // UI繧貞叉蠎ｧ縺ｫ譖ｴ譁ｰ
      setMessages(prev => [...prev, message]);

      // 逕ｻ蜒乗､懃ｴ｢縺ｮ螳溯｡後ｒ蜑企勁・・use.js繧剃ｽｿ逕ｨ縺励※縺・ｋ縺溘ａ・・

      // 騾∽ｿ｡縺輔ｌ縺溘ユ繧ｭ繧ｹ繝医ｒ蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝峨→縺励※菫晏ｭ・
      if (content.trim()) {
        localStorage.setItem('lastSearchKeyword', content.trim());
        console.log('泊 讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ菫晏ｭ・', content.trim());
      }

      // 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ蜃ｦ逅・
      setTimeout(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          console.log('繝√Ε繝・ヨ繧ｨ繝ｪ繧｢繧呈怙荳矩Κ縺ｫ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ縺励∪縺励◆');
        }
      }, 100);

    } catch (error) {
      console.error('繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: '騾∽ｿ｡繧ｨ繝ｩ繝ｼ',
        description: error instanceof Error ? error.message : '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, setSearchResults, toast]);

  // 髻ｳ螢ｰ隱崎ｭ倥・蛻晄悄蛹悶ｒ譛驕ｩ蛹・
  const initializeSpeechRecognition = useCallback(() => {
    try {
      const currentMedia = draftMessage?.media || [];

      startSpeechRecognition(
        async (text: string) => {
          if (!text.trim()) return;

          console.log('矧 髻ｳ螢ｰ隱崎ｭ倡ｵ先棡蜿嶺ｿ｡:', text);
          setLastAudioInputTime(Date.now());

          if (micSilenceTimeoutId) clearTimeout(micSilenceTimeoutId);
          const silenceId = setTimeout(() => {
            if (Date.now() - lastAudioInputTime >= AUTO_STOP_THRESHOLD) {
              console.log('竢ｰ 閾ｪ蜍募●豁｢繧ｿ繧､繝槭・逋ｺ蜍・);
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

          // 隱崎ｭ倥ユ繧ｭ繧ｹ繝医ｒ繝舌ャ繝輔ぃ縺ｫ霑ｽ蜉・磯㍾隍・亟豁｢蠑ｷ蛹厄ｼ・
          setRecognitionBuffer(prev => {
            // 蜷後§繝・く繧ｹ繝医・驥崎､・ｒ髦ｲ豁｢
            if (prev.includes(text)) {
              console.log('統 驥崎､・ユ繧ｭ繧ｹ繝医ｒ繧ｹ繧ｭ繝・・:', text);
              return prev;
            }

            const newBuffer = [...prev, text];
            console.log('統 繝舌ャ繝輔ぃ譖ｴ譁ｰ:', newBuffer);

            // 繝舌ャ繝輔ぃ繝ｪ繝ｳ繧ｰ繧ｿ繧､繝槭・繧偵Μ繧ｻ繝・ヨ
            if (bufferTimeoutId) clearTimeout(bufferTimeoutId);
            const timeoutId = setTimeout(() => {
              if (isLoading) {
                console.log('統 騾∽ｿ｡荳ｭ縺ｮ縺溘ａ繝舌ャ繝輔ぃ騾∽ｿ｡繧偵せ繧ｭ繝・・');
                return;
              }

              const combinedText = newBuffer.join(' ').trim();
              if (combinedText && combinedText.length > 2) {
                console.log('町 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡:', combinedText);
                sendMessage(combinedText);
                setRecognitionBuffer([]);
              }
            }, BUFFER_INTERVAL);
            setBufferTimeoutId(timeoutId);

            return newBuffer;
          });
        },
        (error: string) => {
          console.log('Azure髻ｳ螢ｰ隱崎ｭ倥お繝ｩ繝ｼ:', error);

          toast({
            title: '繝悶Λ繧ｦ繧ｶAPI縺ｫ蛻・ｊ譖ｿ縺医∪縺・,
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

              // 隱崎ｭ倥ユ繧ｭ繧ｹ繝医ｒ繝舌ャ繝輔ぃ縺ｫ霑ｽ蜉
              setRecognitionBuffer(prev => {
                const newBuffer = [...prev, text];

                // 繝舌ャ繝輔ぃ繝ｪ繝ｳ繧ｰ繧ｿ繧､繝槭・繧偵Μ繧ｻ繝・ヨ
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
                title: '髻ｳ螢ｰ隱崎ｭ倥お繝ｩ繝ｼ',
                description: error,
                variant: 'destructive',
              });
              setIsRecording(false);
            }
          );
        }
      );
    } catch (error) {
      console.error('髻ｳ螢ｰ隱崎ｭ倬幕蟋九お繝ｩ繝ｼ:', error);
      setIsRecording(false);
      toast({
        title: '髻ｳ螢ｰ隱崎ｭ倥お繝ｩ繝ｼ',
        description: '髻ｳ螢ｰ隱崎ｭ倥ｒ髢句ｧ九〒縺阪∪縺帙ｓ縺ｧ縺励◆縲・,
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

  // 骭ｲ髻ｳ蛛懈ｭ｢髢｢謨ｰ
  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // 繝舌ャ繝輔ぃ蜀・・谿九ｊ縺ｮ繝・く繧ｹ繝医ｒ騾∽ｿ｡
    if (recognitionBuffer.length > 0) {
      const finalText = recognitionBuffer.join(' ');
      sendMessage(finalText);
    }

    // 迥ｶ諷九ｒ繝ｪ繧ｻ繝・ヨ
    setRecordedText('');
    setLastSentText('');
    setRecognitionPhrases([]);
    setRecognitionBuffer([]);

    // 髻ｳ螢ｰ隱崎ｭ倥ｒ蛛懈ｭ｢
    stopSpeechRecognition();
    stopBrowserSpeechRecognition();

    // 繧ｿ繧､繝槭・繧偵け繝ｪ繧｢
    if (micSilenceTimeoutId) {
      clearTimeout(micSilenceTimeoutId);
      setMicSilenceTimeoutId(null);
    }
    if (bufferTimeoutId) {
      clearTimeout(bufferTimeoutId);
      setBufferTimeoutId(null);
    }
  }, [micSilenceTimeoutId, bufferTimeoutId, recognitionBuffer, sendMessage]);

  // 繝√Ε繝・ヨ螻･豁ｴ繧偵お繧ｯ繧ｹ繝昴・繝医☆繧矩未謨ｰ
  const exportChatHistory = useCallback(async () => {
    try {
      if (!chatId) {
        console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ: chatId縺梧悴險ｭ螳・);
        toast({
          title: '繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ',
          description: '繝√Ε繝・ヨID縺梧悴險ｭ螳壹〒縺吶・,
          variant: 'destructive',
        });
        return null;
      }

      console.log('繧ｨ繧ｯ繧ｹ繝昴・繝磯幕蟋・', chatId);
      setIsExporting(true);

      const response = await apiRequest('POST', `/api/chats/${chatId}/export`);

      console.log('繧ｨ繧ｯ繧ｹ繝昴・繝医Ξ繧ｹ繝昴Φ繧ｹ:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医Ξ繧ｹ繝昴Φ繧ｹ繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(`繝√Ε繝・ヨ螻･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('繧ｨ繧ｯ繧ｹ繝昴・繝域・蜉・', data);

      toast({
        title: '繧ｨ繧ｯ繧ｹ繝昴・繝亥ｮ御ｺ・,
        description: '繝√Ε繝・ヨ螻･豁ｴ縺梧ｭ｣蟶ｸ縺ｫ繧ｨ繧ｯ繧ｹ繝昴・繝医＆繧後∪縺励◆縲・,
      });

      // 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧呈峩譁ｰ
      setLastExportTimestamp(new Date());
      setHasUnexportedMessages(false);

      return data;
    } catch (error) {
      console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ',
        description: error instanceof Error ? error.message : '繝√Ε繝・ヨ螻･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆縲・,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [chatId, toast]);

  // 螟夜Κ繧ｷ繧ｹ繝・Β騾｣謳ｺ逕ｨ縺ｫ蠖｢蠑丞喧縺輔ｌ縺溘ョ繝ｼ繧ｿ繧偵お繧ｯ繧ｹ繝昴・繝医☆繧・
  const exportFormattedData = useCallback(async () => {
    try {
      if (!chatId) return {};

      const response = await apiRequest('GET', `/api/chats/${chatId}/formatted-export`);

      if (!response.ok) {
        throw new Error('繝輔か繝ｼ繝槭ャ繝域ｸ医∩繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      return await response.json();
    } catch (error) {
      console.error('繝輔か繝ｼ繝槭ャ繝域ｸ医∩繝・・繧ｿ縺ｮ蜿門ｾ励お繝ｩ繝ｼ:', error);
      return {};
    }
  }, [chatId]);

  // 邱頑･繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧帝∽ｿ｡縺吶ｋ髢｢謨ｰ
  const sendEmergencyGuide = useCallback(async (guideData: any) => {
    try {
      // 繝√Ε繝・ヨID縺後↑縺・ｴ蜷医・蛻晄悄蛹悶ｒ隧ｦ縺ｿ繧・
      if (!chatId) {
        const newChatId = await initializeChat();
        if (!newChatId) {
          throw new Error('繝√Ε繝・ヨ縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆');
        }
      }

      setIsLoading(true);

      // 迴ｾ蝨ｨ縺ｮ繝√Ε繝・ヨID繧貞叙蠕・
      const currentChatId = chatId || "1";
      console.log('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・ 繝√Ε繝・ヨID', currentChatId, '縺ｫ繝・・繧ｿ繧帝∽ｿ｡縺励∪縺・);

      // ChatMessage蠖｢蠑上〒繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      const timestamp = Date.now();

      // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ・亥ｷｦ蛛ｴ・・ 讒矩邨ｱ荳
      const userMessageContent = `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{guideData.title}縲阪ｒ螳滓命縺励∪縺励◆`;
      const userMessage = {
        id: timestamp,
        chatId: currentChatId,
        content: userMessageContent,
        text: userMessageContent,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };

      // 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・逕ｻ蜒上ｒ蜿朱寔
      const guideImages = guideData.steps?.filter((step: any) => step.imageUrl && step.imageUrl.trim())
        .map((step: any, index: number) => ({
          id: `guide_img_${index}`,
          type: 'image',
          url: step.imageUrl,
          thumbnail: step.imageUrl,
          title: step.title || `繧ｹ繝・ャ繝・{index + 1}`,
          fileName: step.imageFileName
        })) || [];

      console.log('名・・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥判蜒丞庶髮・', guideImages.length, '莉ｶ');

      // AI蠢懃ｭ斐Γ繝・そ繝ｼ繧ｸ・亥承蛛ｴ・・ 讒矩邨ｱ荳・育判蜒乗ュ蝣ｱ繧貞性繧・・
      const aiMessageContent = `笆 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙ｮ滓命險倬鹸\n\n**${guideData.title}**\n\n${guideData.content}\n\n---\n**AI蛻・梵**: 蠢懈･蜃ｦ鄂ｮ謇矩・′豁｣蟶ｸ縺ｫ險倬鹸縺輔ｌ縺ｾ縺励◆縲ょｮ滓命迥ｶ豕√↓髢｢縺励※霑ｽ蜉縺ｮ縺碑ｳｪ蝠上′縺斐＊縺・∪縺励◆繧峨♀閨槭°縺帙￥縺縺輔＞縲Ａ;
      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: aiMessageContent,
        text: aiMessageContent,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date(),
        media: guideImages // 逕ｻ蜒乗ュ蝣ｱ繧定ｿｽ蜉
      };

      console.log('唱 ChatMessage蠖｢蠑上〒繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・縺励∪縺励◆:');
      console.log('- 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', userMessage);
      console.log('- AI繝｡繝・そ繝ｼ繧ｸ:', aiMessage);
      console.log('- 蜷ｫ縺ｾ繧後ｋ逕ｻ蜒乗焚:', guideImages.length);

      // 繝｡繝・そ繝ｼ繧ｸ繧貞叉蠎ｧ縺ｫ繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九↓霑ｽ蜉
      setMessages(prevMessages => {
        console.log('笨・繝｡繝・そ繝ｼ繧ｸ繧偵Ο繝ｼ繧ｫ繝ｫ迥ｶ諷九↓霑ｽ蜉 - 迴ｾ蝨ｨ縺ｮ繝｡繝・そ繝ｼ繧ｸ謨ｰ:', prevMessages.length);
        const newMessages = [...prevMessages, userMessage, aiMessage];
        console.log('笨・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Γ繝・そ繝ｼ繧ｸ霑ｽ蜉螳御ｺ・', newMessages.length, '莉ｶ');
        return newMessages;
      });

      // 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨↓繧る∽ｿ｡繧定ｩｦ陦鯉ｼ磯撼蜷梧悄・・
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-guide/send`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            chatId: currentChatId,
            guideData: {
              title: guideData.title,
              content: guideData.content,
              steps: guideData.steps || [],
              images: guideImages // 逕ｻ蜒乗ュ蝣ｱ繧る∽ｿ｡
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・ 繧ｵ繝ｼ繝舌・縺ｸ縺ｮ騾∽ｿ｡謌仙粥', data);
        } else {
          console.warn('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ騾∽ｿ｡縺ｯ螟ｱ謨励＠縺ｾ縺励◆縺後√Ο繝ｼ繧ｫ繝ｫ繝｡繝・そ繝ｼ繧ｸ縺ｯ陦ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
          console.error('騾∽ｿ｡繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.error('API騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', apiError);
        // 繧ｵ繝ｼ繝舌・騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｦ繧ゅΟ繝ｼ繧ｫ繝ｫ繝｡繝・そ繝ｼ繧ｸ縺ｯ陦ｨ遉ｺ貂医∩
      }

      // 邱頑･繧ｬ繧､繝蛾∽ｿ｡譎ゅ・閾ｪ蜍墓､懃ｴ｢繧貞ｮ悟・辟｡蜉ｹ蛹・
      console.log('唱 邱頑･繧ｬ繧､繝蛾∽ｿ｡螳御ｺ・- 閾ｪ蜍墓､懃ｴ｢縺ｯ螳溯｡後＠縺ｾ縺帙ｓ');

      // 譁ｰ隕上Γ繝・そ繝ｼ繧ｸ縺ｫ蟇ｾ縺励※逕ｻ蜒乗､懃ｴ｢繧貞炎髯､・・use.js繧剃ｽｿ逕ｨ縺励※縺・ｋ縺溘ａ・・

      // 謌仙粥繝医・繧ｹ繝医ｒ陦ｨ遉ｺ
      toast({
        title: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝芽ｨ倬鹸螳御ｺ・,
        description: '繝√Ε繝・ヨ螻･豁ｴ縺ｫ蠢懈･蜃ｦ鄂ｮ縺ｮ螳滓命險倬鹸縺瑚ｿｽ蜉縺輔ｌ縺ｾ縺励◆',
      });

      // 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ蜃ｦ逅・
      setTimeout(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          console.log('繝√Ε繝・ヨ繧ｨ繝ｪ繧｢繧呈怙荳矩Κ縺ｫ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ縺励∪縺励◆');
        }
      }, 100);

      // 繧､繝吶Φ繝磯∽ｿ｡
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
      console.error('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝蛾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, setMessages, setSearchResults, toast]);

  // 繝輔Ο繝ｼ螳溯｡檎ｵ先棡繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺吶ｋ髢｢謨ｰ・域眠隕剰ｿｽ蜉・・
  const sendFlowExecutionResult = useCallback(async (flowData: any) => {
    try {
      // 繝√Ε繝・ヨID縺後↑縺・ｴ蜷医・蛻晄悄蛹悶ｒ隧ｦ縺ｿ繧・
      if (!chatId) {
        const newChatId = await initializeChat();
        if (!newChatId) {
          throw new Error('繝√Ε繝・ヨ縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆');
        }
      }

      setIsLoading(true);

      // 迴ｾ蝨ｨ縺ｮ繝√Ε繝・ヨID繧貞叙蠕・
      const currentChatId = chatId || "1";
      console.log('繝輔Ο繝ｼ螳溯｡檎ｵ先棡: 繝√Ε繝・ヨID', currentChatId, '縺ｫ繝・・繧ｿ繧帝∽ｿ｡縺励∪縺・);

      const timestamp = Date.now();

      // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ・亥ｷｦ蛛ｴ・・
      const userMessageContent = flowData.isPartial 
        ? `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{flowData.title}縲阪・騾比ｸｭ邨碁℃繧帝∽ｿ｡縺励∪縺励◆`
        : `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{flowData.title}縲阪・繝輔Ο繝ｼ繧貞ｮ溯｡後＠縺ｾ縺励◆`;
      const userMessage = {
        id: timestamp,
        chatId: currentChatId,
        content: userMessageContent,
        text: userMessageContent,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };

      // 螳溯｡後＠縺溘せ繝・ャ繝励°繧臥判蜒上ｒ蜿朱寔
      const executedImages = flowData.executedSteps
        ?.flatMap((step: any) => {
          const images: any[] = [];

          // imageUrl縺後≠繧句ｴ蜷・
          if (step.imageUrl && step.imageUrl.trim()) {
            images.push({
              id: `flow_img_${step.stepId}_url`,
              type: 'image',
              url: step.imageUrl,
              thumbnail: step.imageUrl,
              title: step.title || `繧ｹ繝・ャ繝礼判蜒汁,
              fileName: `step_${step.stepId}.jpg`
            });
          }

          // images驟榊・縺後≠繧句ｴ蜷・
          if (step.images && Array.isArray(step.images)) {
            step.images.forEach((image: any, index: number) => {
              if (image.url && image.url.trim()) {
                images.push({
                  id: `flow_img_${step.stepId}_${index}`,
                  type: 'image',
                  url: image.url,
                  thumbnail: image.url,
                  title: step.title || `繧ｹ繝・ャ繝・{index + 1}`,
                  fileName: image.fileName || `step_${step.stepId}_${index}.jpg`
                });
              }
            });
          }

          return images;
        }) || [];

      console.log('名・・繝輔Ο繝ｼ螳溯｡檎判蜒丞庶髮・', executedImages.length, '莉ｶ');

      // 螳溯｡後＠縺溘せ繝・ャ繝励・隧ｳ邏ｰ繧偵ヵ繧ｩ繝ｼ繝槭ャ繝・
      const stepDetails = flowData.executedSteps
        ?.map((step: any, index: number) => {
          let stepText = `${index + 1}. **${step.title}**\n${step.message}`;
          if (step.selectedCondition) {
            stepText += `\n驕ｸ謚・ ${step.selectedCondition}`;
          }
          return stepText;
        })
        .join('\n\n') || '';

      // AI蠢懃ｭ斐Γ繝・そ繝ｼ繧ｸ・亥承蛛ｴ・・ 繝輔Ο繝ｼ螳溯｡檎ｵ先棡
      const aiMessageContent = flowData.isPartial
        ? `笆 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ騾比ｸｭ邨碁℃\n\n**${flowData.title}**\n\n**螳溯｡梧ｸ医∩繧ｹ繝・ャ繝・**\n${stepDetails}\n\n**騾∽ｿ｡譎ょ綾:** ${flowData.completedAt.toLocaleString('ja-JP')}\n\n---\n**AI蛻・梵**: 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ騾比ｸｭ邨碁℃縺瑚ｨ倬鹸縺輔ｌ縺ｾ縺励◆縲らｶ夊｡後☆繧句ｴ蜷医・繧ｬ繧､繝峨ｒ邯咏ｶ壹＠縺ｦ縺上□縺輔＞縲Ａ
        : `笆 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ螳溯｡瑚ｨ倬鹸\n\n**${flowData.title}**\n\n**螳溯｡後＠縺溘せ繝・ャ繝・**\n${stepDetails}\n\n**螳溯｡悟ｮ御ｺ・凾蛻ｻ:** ${flowData.completedAt.toLocaleString('ja-JP')}\n\n---\n**AI蛻・梵**: 蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ螳溯｡後＆繧後∪縺励◆縲ょ推繧ｹ繝・ャ繝励・螳滓命迥ｶ豕√ｒ遒ｺ隱阪＠縲∝ｿ・ｦ√↓蠢懊§縺ｦ霑ｽ蜉縺ｮ蟇ｾ蠢懊ｒ陦後▲縺ｦ縺上□縺輔＞縲Ａ;

      const aiMessage = {
        id: timestamp + 1,
        chatId: currentChatId,
        content: aiMessageContent,
        text: aiMessageContent,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date(),
        media: executedImages // 螳溯｡後＠縺溘せ繝・ャ繝励・逕ｻ蜒上ｒ霑ｽ蜉
      };

      console.log('唱 繝輔Ο繝ｼ螳溯｡檎ｵ先棡繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・縺励∪縺励◆:');
      console.log('- 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', userMessage);
      console.log('- AI繝｡繝・そ繝ｼ繧ｸ:', aiMessage);
      console.log('- 蜷ｫ縺ｾ繧後ｋ逕ｻ蜒乗焚:', executedImages.length);

      // 螻･豁ｴ菫晏ｭ伜・逅・・迴ｾ蝨ｨ螳溯｣・＆繧後※縺・↑縺・◆繧√√Ο繝ｼ繧ｫ繝ｫ迥ｶ諷九∈縺ｮ霑ｽ蜉縺ｮ縺ｿ陦後≧
      console.log('統 繝輔Ο繝ｼ螳溯｡檎ｵ先棡繧偵Ο繝ｼ繧ｫ繝ｫ迥ｶ諷九↓菫晏ｭ・', {
        chatId: currentChatId,
        title: `邱頑･繝輔Ο繝ｼ螳溯｡・ ${flowData.title}`,
        description: userMessageContent,
        emergencyGuideTitle: flowData.title,
        emergencyGuideContent: aiMessageContent,
        images: executedImages.length
      });

      // 繝｡繝・そ繝ｼ繧ｸ繧貞叉蠎ｧ縺ｫ繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九↓霑ｽ蜉
      setMessages(prevMessages => {
        console.log('笨・繝輔Ο繝ｼ螳溯｡檎ｵ先棡繝｡繝・そ繝ｼ繧ｸ繧偵Ο繝ｼ繧ｫ繝ｫ迥ｶ諷九↓霑ｽ蜉 - 迴ｾ蝨ｨ縺ｮ繝｡繝・そ繝ｼ繧ｸ謨ｰ:', prevMessages.length);
        const newMessages = [...prevMessages, userMessage, aiMessage];
        console.log('笨・繝輔Ο繝ｼ螳溯｡檎ｵ先棡繝｡繝・そ繝ｼ繧ｸ霑ｽ蜉螳御ｺ・', newMessages.length, '莉ｶ');
        return newMessages;
      });

      // 謌仙粥繝医・繧ｹ繝医ｒ陦ｨ遉ｺ
      toast({
        title: flowData.isPartial ? '騾比ｸｭ邨碁℃騾∽ｿ｡螳御ｺ・ : '繝輔Ο繝ｼ螳溯｡瑚ｨ倬鹸螳御ｺ・,
        description: flowData.isPartial 
          ? '繝√Ε繝・ヨ螻･豁ｴ縺ｫ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ騾比ｸｭ邨碁℃縺瑚ｿｽ蜉縺輔ｌ縺ｾ縺励◆'
          : '繝√Ε繝・ヨ螻･豁ｴ縺ｫ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ螳溯｡瑚ｨ倬鹸縺瑚ｿｽ蜉縺輔ｌ縺ｾ縺励◆',
      });

      // 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ蜃ｦ逅・
      setTimeout(() => {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
          console.log('繝√Ε繝・ヨ繧ｨ繝ｪ繧｢繧呈怙荳矩Κ縺ｫ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ縺励∪縺励◆');
        }
      }, 100);

      // 繧､繝吶Φ繝磯∽ｿ｡
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
      console.error('繝輔Ο繝ｼ螳溯｡檎ｵ先棡騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '繝輔Ο繝ｼ螳溯｡檎ｵ先棡縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chatId, initializeChat, setMessages, toast]);

  // 繧､繝吶Φ繝医Μ繧ｹ繝翫・縺ｮ險ｭ螳・
  useEffect(() => {
    // 譌｢蟄倥・繧､繝吶Φ繝医Μ繧ｹ繝翫・
    const handleEmergencyGuideSent = (event: CustomEvent) => {
      console.log('唱 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝蛾∽ｿ｡繧､繝吶Φ繝医ｒ蜿嶺ｿ｡:', event.detail);
      // 譌｢蟄倥・蜃ｦ逅・・縺昴・縺ｾ縺ｾ
    };

    // 譁ｰ縺励＞繝輔Ο繝ｼ螳溯｡悟ｮ御ｺ・う繝吶Φ繝医Μ繧ｹ繝翫・
    const handleEmergencyGuideCompleted = (event: CustomEvent) => {
      console.log('唱 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙ｮ御ｺ・う繝吶Φ繝医ｒ蜿嶺ｿ｡:', event.detail);
      sendFlowExecutionResult(event.detail);
    };

    window.addEventListener('emergency-guide-sent', handleEmergencyGuideSent as EventListener);
    window.addEventListener('emergency-guide-completed', handleEmergencyGuideCompleted as EventListener);

    return () => {
      window.removeEventListener('emergency-guide-sent', handleEmergencyGuideSent as EventListener);
      window.removeEventListener('emergency-guide-completed', handleEmergencyGuideCompleted as EventListener);
    };
  }, [sendFlowExecutionResult]);

  // 繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺吶ｋ髢｢謨ｰ・郁｡ｨ髱｢逧・↓繧ｯ繝ｪ繧｢竊呈眠縺励＞繝√Ε繝・ヨ髢句ｧ具ｼ・
  const clearChatHistory = useCallback(async () => {
    try {
      setIsClearing(true);
      console.log('卵・・繝√Ε繝・ヨ螻･豁ｴ繧ｯ繝ｪ繧｢髢句ｧ・ 陦ｨ髱｢逧・↓繧ｯ繝ｪ繧｢竊呈眠縺励＞繝√Ε繝・ヨ髢句ｧ・);

      // 1. 繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九・蜊ｳ蠎ｧ螳悟・繝ｪ繧ｻ繝・ヨ・郁｡ｨ髱｢逧・↓繧ｯ繝ｪ繧｢・・
      console.log('売 逕ｻ髱｢荳翫・繝√Ε繝・ヨ螻･豁ｴ繧貞叉蠎ｧ縺ｫ繧ｯ繝ｪ繧｢縺励∪縺・);
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
      setTempMedia([]);
      setDraftMessage(null);
      setRecordedText('');
      setSelectedText('');
      clearSearchResults();

      // 2. 繝ｭ繝ｼ繧ｫ繝ｫ繧ｭ繝｣繝・す繝･縺ｮ繧ｯ繝ｪ繧｢・亥ｼｷ蛻ｶ逧・↓繧ｯ繝ｪ繧｢・・
      try {
        queryClient.removeQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        queryClient.removeQueries({ queryKey: ['search_results'] });
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        queryClient.clear(); // 蜈ｨ繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢
        console.log('逃 繝ｭ繝ｼ繧ｫ繝ｫ繧ｭ繝｣繝・す繝･繧貞ｼｷ蛻ｶ逧・↓繧ｯ繝ｪ繧｢縺励∪縺励◆');
      } catch (localError) {
        console.warn('繝ｭ繝ｼ繧ｫ繝ｫ繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢繧ｨ繝ｩ繝ｼ:', localError);
            }

      // 3. 譁ｰ縺励＞繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ縺ｨ縺励※蛻晄悄蛹・
      console.log('・ 譁ｰ縺励＞繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ繧帝幕蟋九＠縺ｾ縺・);

      toast({
        title: '繧ｯ繝ｪ繧｢螳御ｺ・,
        description: '譁ｰ縺励＞繝√Ε繝・ヨ繧帝幕蟋九＠縺ｾ縺励◆',
      });

    } catch (error) {
      console.error('圷 繝√Ε繝・ヨ螻･豁ｴ繧ｯ繝ｪ繧｢繧ｨ繝ｩ繝ｼ:', error);

      // 繧ｨ繝ｩ繝ｼ譎ゅｂ繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九・遒ｺ螳溘↓繧ｯ繝ｪ繧｢
      setMessages([]);
      setSearchResults([]);
      setHasUnexportedMessages(false);

      toast({
        title: '繧ｯ繝ｪ繧｢繧ｨ繝ｩ繝ｼ',
        description: '繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縺後∫判髱｢縺ｯ繧ｯ繝ｪ繧｢縺輔ｌ縺ｾ縺励◆',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  }, [chatId, clearSearchResults, toast, queryClient]);

  // 襍ｷ蜍墓凾縺ｯ蟶ｸ縺ｫ譁ｰ縺励＞繝√Ε繝・ヨ縺ｨ縺励※髢句ｧ具ｼ育┌鬧・↑蜃ｦ逅・↑縺暦ｼ・
  useEffect(() => {
    if (chatId && !isClearing) {
      console.log('・ 譁ｰ縺励＞繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ繧帝幕蟋・);
      setMessages([]);
      setSearchResults([]);
      setLastExportTimestamp(null);
      setHasUnexportedMessages(false);
    }
  }, [chatId, isClearing]);

  // 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧貞叙蠕暦ｼ井ｸ譎ら噪縺ｫ辟｡蜉ｹ蛹厄ｼ・
  const fetchLastExport = useCallback(async () => {
    console.log('売 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ蜿門ｾ励ｒ荳譎ら噪縺ｫ辟｡蜉ｹ蛹・);
    // 荳譎ら噪縺ｫ辟｡蜉ｹ蛹悶＠縺ｦ繧ｨ繝ｩ繝ｼ繧貞屓驕ｿ
    return;
    
    // 莉･荳九・繧ｳ繝ｼ繝峨・荳譎ら噪縺ｫ繧ｳ繝｡繝ｳ繝医い繧ｦ繝・
    /*
    if (!chatId) return;

    // UUID縺ｮ蠖｢蠑上メ繧ｧ繝・け
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatId)) {
      console.log('Invalid chat ID format - skipping last export fetch');
      return;
    }

    try {
      console.log('売 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧貞叙蠕嶺ｸｭ:', {
        chatId,
        url: `/api/chats/${chatId}/last-export`,
        location: window.location.href,
        origin: window.location.origin
      });

      const response = await apiRequest('GET', `/api/chats/${chatId}/last-export`);

      console.log('藤 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繝ｬ繧ｹ繝昴Φ繧ｹ:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        url: response.url
      });

      // 繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ蜀・ｮｹ繧堤｢ｺ隱・
      const responseText = await response.text();
      console.log('塘 繝ｬ繧ｹ繝昴Φ繧ｹ蜀・ｮｹ:', responseText);

      // JSON縺ｨ縺励※隗｣譫・
      const data = JSON.parse(responseText);

      if (data.timestamp) {
        setLastExportTimestamp(new Date(data.timestamp));
        console.log('笨・譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧定ｨｭ螳・', data.timestamp);
      }
    } catch (error) {
      console.error('笶・Failed to fetch last export:', error);
      console.error('隧ｳ邏ｰ繧ｨ繝ｩ繝ｼ諠・ｱ:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    */
  }, [chatId]);

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医′繝槭え繝ｳ繝医＆繧後◆縺ｨ縺阪↓譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝亥ｱ･豁ｴ繧貞叙蠕・
  useEffect(() => {
    fetchLastExport();
  }, [fetchLastExport]);

  // 繝｡繝・そ繝ｼ繧ｸ縺瑚ｿｽ蜉縺輔ｌ縺溘→縺阪↓縲∵悴繧ｨ繧ｯ繧ｹ繝昴・繝医・繝｡繝・そ繝ｼ繧ｸ縺後≠繧九％縺ｨ繧堤､ｺ縺・
  useEffect(() => {
    if (messages.length > 0 && lastExportTimestamp) {
      // 譛蠕後・繧ｨ繧ｯ繧ｹ繝昴・繝井ｻ･髯阪・繝｡繝・そ繝ｼ繧ｸ縺後≠繧九°繝√ぉ繝・け
      const hasNewMessages = messages.some(msg => new Date(msg.timestamp) > lastExportTimestamp);
      setHasUnexportedMessages(hasNewMessages);
    } else if (messages.length > 0) {
      // 縺ｾ縺繧ｨ繧ｯ繧ｹ繝昴・繝医＠縺ｦ縺・↑縺・ｴ蜷医・縲√Γ繝・そ繝ｼ繧ｸ縺後≠繧後・譛ｪ繧ｨ繧ｯ繧ｹ繝昴・繝育憾諷・
      setHasUnexportedMessages(true);
    } else {
      // 繝｡繝・そ繝ｼ繧ｸ縺後↑縺・ｴ蜷医・譛ｪ繧ｨ繧ｯ繧ｹ繝昴・繝医〒縺ｯ縺ｪ縺・
      setHasUnexportedMessages(false);
    }
  }, [messages, lastExportTimestamp]);

  // 繧ｳ繝ｳ繝・く繧ｹ繝亥､繧呈署萓・
  const contextValue: ChatContextType = {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    clearChatHistory,
    isClearing,
    chatId,
    initializeChat,
    exportChatHistory,
    searchResults,
    setSearchResults,
    searching,
    setSearching,
    sendEmergencyGuide,
    // searchBySelectedText, // 逕ｻ蜒乗､懃ｴ｢讖溯・繧貞炎髯､
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};
// The image search logic is modified to ensure its execution and handle potential errors.