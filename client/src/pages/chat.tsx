import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";
import KeywordButtons from "../components/troubleshooting/keyword-buttons";
import StepByStepQA from "../components/chat/step-by-step-qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft, X, Search, Send, Camera, Trash2, RefreshCw, Brain, Wrench, Database, Save } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { searchTroubleshootingFlows, japaneseGuideTitles } from "../lib/troubleshooting-search";
import { QAAnswer } from "../lib/qa-flow-manager";
import TroubleshootingQABubble from "../components/chat/troubleshooting-qa-bubble";
import SolutionBubble from "../components/chat/solution-bubble";
import { MACHINE_API, KNOWLEDGE_API, TROUBLESHOOTING_API, AI_API, CHAT_API, API_REQUEST_OPTIONS } from "../lib/api/config";

// API URL構築�Eルパ�E関数
const buildApiUrl = (endpoint: string): string => {
  const isAzureStaticWebApp = window.location.hostname.includes('azurestaticapps.net');
  const apiBaseUrl = isAzureStaticWebApp 
    ? 'https://emergency-backend-api-v2.azurewebsites.net'
    : (import.meta.env.VITE_API_BASE_URL || '');
  
  return `${apiBaseUrl}${endpoint}`;
};
import { Label } from "@/components/ui/label";

export default function ChatPage() {
  const {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    clearChatHistory,
    isClearing,
    chatId,
    initializeChat,
    exportChatHistory
  } = useChat();

  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<any[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingGuides, setIsLoadingGuides] = useState(false);

  // AI支援モード�E状態管琁E
  const [aiSupportMode, setAiSupportMode] = useState(false);
  const [aiSessionData, setAiSessionData] = useState<{
    sessionId: string;
    step: number;
    context: string[];
    lastQuestion: string;
  } | null>(null);
  
  // 追加: 機種と機械番号のオートコンプリート状態管琁E
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string}>>([]);
  const [selectedMachineType, setSelectedMachineType] = useState<string>('');
  const [selectedMachineNumber, setSelectedMachineNumber] = useState<string>('');
  const [isLoadingMachineTypes, setIsLoadingMachineTypes] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  
  // オートコンプリート用の状慁E
  const [machineTypeInput, setMachineTypeInput] = useState('');
  const [machineNumberInput, setMachineNumberInput] = useState('');
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] = useState(false);
  const [showMachineNumberSuggestions, setShowMachineNumberSuggestions] = useState(false);
  const [filteredMachineTypes, setFilteredMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [filteredMachines, setFilteredMachines] = useState<Array<{id: string, machine_number: string}>>([]);

  // トラブルシューチE��ングQAの状態管琁E
  const [troubleshootingMode, setTroubleshootingMode] = useState(false);
  const [troubleshootingSession, setTroubleshootingSession] = useState<{
    problemDescription: string;
    answers: any[];
    currentQuestion?: string;
    currentOptions?: string[];
    reasoning?: string;
  } | null>(null);

  // ナレチE��チE�Eタ管琁E�E状慁E
  const [knowledgeData, setKnowledgeData] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  // 機種チE�Eタの初期読み込み
  useEffect(() => {
    fetchMachineTypes();
    fetchKnowledgeData();
  }, []);

  // 機種チE�Eタが更新された時にフィルタリングリストも更新
  useEffect(() => {
    console.log('🔍 機種チE�Eタ更新検知:', {
      machineTypesCount: machineTypes.length,
      machineTypes: machineTypes,
      filteredMachineTypesCount: filteredMachineTypes.length
    });
    setFilteredMachineTypes(machineTypes);
  }, [machineTypes]);

  // 機械チE�Eタが更新された時にフィルタリングリストも更新
  useEffect(() => {
    console.log('🔍 機械番号チE�Eタ更新検知:', {
      machinesCount: machines.length,
      machines: machines,
      filteredMachinesCount: filteredMachines.length
    });
    setFilteredMachines(machines);
  }, [machines]);

  // ナレチE��チE�Eタを取征E
  const fetchKnowledgeData = async () => {
    try {
      setIsLoadingKnowledge(true);
      const response = await fetch(KNOWLEDGE_API.BASE, API_REQUEST_OPTIONS);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setKnowledgeData(result.data);
          console.log('✁EナレチE��チE�Eタ取得�E劁E', result.data.length + '件');
        } else {
          console.error('❁EナレチE��チE�Eタ取得失敁E', result.message);
          setKnowledgeData([]);
        }
      } else {
        throw new Error(`Failed to fetch knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❁EナレチE��チE�Eタ取得エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ナレチE��チE�Eタの取得に失敗しました",
        variant: "destructive"
      });
      setKnowledgeData([]);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // ナレチE��チE�Eタのベクトル化�E琁E
  const processKnowledgeData = async () => {
    try {
      setIsLoadingKnowledge(true);
      const response = await fetch(buildApiUrl('/api/knowledge-base/process'), {
        ...API_REQUEST_OPTIONS,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast({
            title: "成功",
            description: "ナレチE��チE�Eタのベクトル化�E琁E��完亁E��ました",
          });
          // チE�Eタを�E取征E
          await fetchKnowledgeData();
        } else {
          throw new Error(result.message || "ベクトル化�E琁E��失敗しました");
        }
      } else {
        throw new Error(`Failed to process knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❁EナレチE��チE�Eタ処琁E��ラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ナレチE��チE�Eタの処琁E��失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // ドロチE�Eダウンの表示/非表示制御
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (!target.closest('#machine-type') && !target.closest('#machine-number') && !target.closest('#machine-type-menu') && !target.closest('#machine-number-menu')) {
        setShowMachineTypeSuggestions(false);
        setShowMachineNumberSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // AI支援シスチE��のセチE��ョン管琁E
  const [aiSupportSessionData, setAiSupportSessionData] = useState<{
    answers: string[];
    solution: string;
    knowledgeContext: string[];
    questions: string[];
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 追加: 機種一覧を取得する関数�E�設定UIと同じAPIを使用�E�E
  const fetchMachineTypes = useCallback(async () => {
    try {
      setIsLoadingMachineTypes(true);
      console.log('🔍 機種一覧取得開姁E);
      
      // Azure Static Web Apps環墁E��は外部APIを直接呼び出ぁE
      const apiUrl = MACHINE_API.MACHINE_TYPES;
      console.log('🔍 機種一覧取得URL:', apiUrl);
      console.log('🔍 現在のURL:', window.location.href);
      
      const response = await fetch(apiUrl, {
        ...API_REQUEST_OPTIONS
        // CORSエラーを避けるためキャチE��ュ関連ヘッダーを削除
      });
      console.log('🔍 機種一覧取得レスポンススチE�Eタス:', response.status);
      console.log('🔍 機種一覧取得レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('✁E機種一覧取得結果:', result);
        if (result.success && Array.isArray(result.data)) {
          console.log('✁E機種一覧設定完亁E', result.data.length, '件');
          console.log('✁E機種チE�Eタ:', result.data);
          setMachineTypes(result.data);
          setFilteredMachineTypes(result.data); // 初期表示用にも設宁E
          
          if (result.data.length === 0) {
            console.log('⚠�E�E機種チE�EタぁE件でぁE);
          }
        } else {
          console.error('❁E機種一覧取得�E功だがデータが無効:', result);
          setMachineTypes([]);
          setFilteredMachineTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❁E機種一覧取得エラー:', response.status, errorText);
        
        if (response.status === 401) {
          console.log('🔐 認証エラーが発生しました。ログインが忁E��です、E);
        }
        
        setMachineTypes([]);
        setFilteredMachineTypes([]);
      }
    } catch (error) {
      console.error('❁E機種一覧取得エラー:', error);
      setMachineTypes([]);
      setFilteredMachineTypes([]);
    } finally {
      setIsLoadingMachineTypes(false);
      console.log('🔍 機種一覧取得完亁E��最終状慁E', {
        machineTypesCount: machineTypes.length,
        filteredMachineTypesCount: filteredMachineTypes.length
      });
    }
  }, []);

  // 機種入力�Eフィルタリング
  const filterMachineTypes = (input: string) => {
    console.log('🔍 機種フィルタリング開姁E', input, '機種数:', machineTypes.length);
    if (!input.trim()) {
      console.log('✁E入力が空のため全機種を表示:', machineTypes.length, '件');
      setFilteredMachineTypes(machineTypes);
      return;
    }
    
    const filtered = machineTypes.filter(type => 
      type.machine_type_name.toLowerCase().includes(input.toLowerCase())
    );
    console.log('✁Eフィルタリング結果:', filtered.length, '件');
    setFilteredMachineTypes(filtered);
  };

  // 機械番号入力�Eフィルタリング
  const filterMachines = (input: string) => {
    console.log('🔍 機械番号フィルタリング開姁E', input, '機械数:', machines.length);
    if (!input.trim()) {
      console.log('✁E入力が空のため全機械を表示:', machines.length, '件');
      setFilteredMachines(machines);
      return;
    }
    
    const filtered = machines.filter(machine => 
      machine.machine_number.toLowerCase().includes(input.toLowerCase())
    );
    console.log('✁Eフィルタリング結果:', filtered.length, '件');
    setFilteredMachines(filtered);
  };

  // 機種選択�E琁E
  const handleMachineTypeSelect = (type: {id: string, machine_type_name: string}) => {
    console.log('🔍 機種選択�E琁E��姁E===========================');
    console.log('🔍 選択された機種:', type);
    
    try {
      // バッチ状態更新を使用
      setMachineTypeInput(type.machine_type_name);
      setSelectedMachineType(type.id);
      setShowMachineTypeSuggestions(false);
      
      // 機種変更時�E機械番号をリセチE��
      setSelectedMachineNumber('');
      setMachineNumberInput('');
      setMachines([]);
      setFilteredMachines([]);
      
      console.log('✁E機種選択完亁E', type.machine_type_name);
      
      // 対応する機械番号を取征E
      fetchMachines(type.id);
      
    } catch (error) {
      console.error('❁E機種選択�E琁E��にエラー:', error);
    }
  };

  // 機械番号選択�E琁E
  const handleMachineNumberSelect = (machine: {id: string, machine_number: string}) => {
    console.log('🔍 機械番号選択開姁E', machine);
    
    try {
      // 状態を確実に更新
      setSelectedMachineNumber(machine.id);
      setMachineNumberInput(machine.machine_number);
      setShowMachineNumberSuggestions(false);
      
      console.log('✁E機械番号選択完亁E', machine.machine_number);
      
    } catch (error) {
      console.error('❁E機械番号選択�E琁E��にエラー:', error);
    }
  };

  // 追加: 持E��機種に紐づく機械番号一覧を取得する関数�E�設定UIと同じAPIを使用�E�E
  const fetchMachines = useCallback(async (typeId: string) => {
    try {
      setIsLoadingMachines(true);
      console.log('🔍 機械番号一覧取得開姁E 機種ID:', typeId);
      
      // プロキシ経由でアクセス�E�相対パスを使用�E�E
      const apiUrl = `/api/machines/machines?type_id=${typeId}`;
      console.log('🔍 機械番号一覧取得URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        ...API_REQUEST_OPTIONS
        // CORSエラーを避けるためキャチE��ュ関連ヘッダーを削除
      });
      console.log('🔍 機械番号一覧取得レスポンススチE�Eタス:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✁E機械番号一覧取得結果:', result);
        if (result.success) {
          console.log('✁E機械番号一覧設定完亁E', result.data.length, '件');
          console.log('✁E機械番号チE�Eタ:', result.data);
          setMachines(result.data);
          setFilteredMachines(result.data); // 初期表示用
          
          // 機械番号チE�Eタ取得完亁E�EチE��チE��惁E��
          console.log('🔧 機械番号取得後�E状慁E', {
            machinesCount: result.data.length,
            machines: result.data,
            machineNumberInput,
            selectedMachineNumber,
            showMachineNumberSuggestions
          });
        } else {
          console.error('❁E機械番号一覧取得�E功だがsuccess=false:', result);
          setMachines([]);
          setFilteredMachines([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❁E機械番号一覧取得エラー:', response.status, errorText);
        setMachines([]);
        setFilteredMachines([]);
      }
    } catch (error) {
      console.error('❁E機械番号一覧取得エラー:', error);
      setMachines([]);
      setFilteredMachines([]);
    } finally {
      setIsLoadingMachines(false);
      console.log('🔍 機械番号一覧取得完亁E��最終状慁E', {
        machinesCount: machines.length,
        filteredMachinesCount: filteredMachines.length
      });
    }
  }, [machines.length, filteredMachines.length, machineNumberInput, selectedMachineNumber, showMachineNumberSuggestions]);

  // 追加: 機種選択時の処琁E��オートコンプリート用�E�E
  const handleMachineTypeChange = (typeId: string) => {
    setSelectedMachineType(typeId);
    setSelectedMachineNumber(''); // 機種変更時�E機械番号をリセチE��
    setMachineNumberInput(''); // 機械番号入力もリセチE��
    
    if (typeId) {
      fetchMachines(typeId);
    } else {
      setMachines([]);
      setFilteredMachines([]);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // コンポ�Eネント�Eウント時の初期匁E
  useEffect(() => {
    console.log('🚀 チャチE��ペ�EジマウンチE- 初期化開姁E);
    
    // チャチE��IDの初期化を確実に行う
    if (!chatId) {
      console.log('🔄 チャチE��IDが未設定�Eため初期化を実衁E);
      try {
        initializeChat();
      } catch (error) {
        console.error('❁EチャチE��ID初期化エラー:', error);
      }
    }
    
    // 機種チE�Eタの取征E
    fetchMachineTypes().catch(error => {
      console.error('❁E機種チE�Eタ取得でエラーが発生しましたが、チャチE��画面は表示されまぁE', error);
    });
  }, [chatId, initializeChat, fetchMachineTypes]);

  // 機種チE�Eタの状態変更を監視してフィルタリングを更新
  useEffect(() => {
    console.log('📊 機種チE�Eタ状態更新:', {
      machineTypesCount: machineTypes.length,
      selectedMachineType,
      machineTypeInput,
      isLoadingMachineTypes
    });
    
    // 機種チE�Eタが更新されたら、現在の入力に基づぁE��フィルタリングを更新
    if (machineTypes.length > 0) {
      filterMachineTypes(machineTypeInput);
    }
  }, [machineTypes, machineTypeInput]);

  // 機種入力�E状態変更を監視（デバッグ用�E�E
  useEffect(() => {
    console.log('📊 機種入力状態更新:', {
      machineTypeInput,
      selectedMachineType
    });
  }, [machineTypeInput, selectedMachineType]);

  // machineTypeInputの値の変更を詳細に監要E
  useEffect(() => {
    console.log('🔍 machineTypeInput値変更検�E:', {
      currentValue: machineTypeInput,
      length: machineTypeInput.length,
      timestamp: new Date().toISOString()
    });
  }, [machineTypeInput]);

  // 機械番号チE�Eタの状態変更を監視してフィルタリングを更新
  useEffect(() => {
    console.log('📊 機械番号チE�Eタ状態更新:', {
      machinesCount: machines.length,
      selectedMachineNumber,
      machineNumberInput,
      isLoadingMachines
    });
    
    // 機械番号チE�Eタが更新されたら、現在の入力に基づぁE��フィルタリングを更新
    if (machines.length > 0) {
      filterMachines(machineNumberInput);
    }
  }, [machines, machineNumberInput]);

  // 機械番号入力�E状態変更を監視（デバッグ用�E�E
  useEffect(() => {
    console.log('📊 機械番号入力状態更新:', {
      machineNumberInput,
      selectedMachineNumber
    });
  }, [machineNumberInput, selectedMachineNumber]);

  // 追加: Q&Aモード�E初期化（動皁E��問生成シスチE��に変更済み�E�E

  // AI支援開始（チャチE��冁E��問一答形式！E
  const handleStartAiSupport = async () => {
    try {
      setAiSupportMode(true);
      
      // AI支援開始メチE��ージを送信
      const welcomeMessage = "🤁E**AI敁E��診断を開始しまぁE*\n\n発生してぁE��痁E��を教えてください、E;
      
      sendMessage(welcomeMessage, [], true);
      
      // セチE��ョンチE�Eタを�E期化
      setAiSessionData({
        sessionId: `ai_${Date.now()}`,
        step: 1,
        context: [],
        lastQuestion: "発生してぁE��痁E��を教えてください、E
      });
      
      toast({
        title: "AI支援開姁E,
        description: "チャチE��冁E��AI敁E��診断を開始しました",
      });
    } catch (error) {
      console.error('AI支援開始エラー:', error);
      toast({
        title: "エラー",
        description: "AI支援の開始に失敗しました",
        variant: "destructive",
      });
      setAiSupportMode(false);
    }
  };

  // AI支援終亁E
  const handleAiSupportExit = () => {
    setAiSupportMode(false);
    setAiSessionData(null);
    
    // 終亁E��チE��ージを送信
    const exitMessage = "🤁E**AI診断を終亁E��ました**\n\n診断結果は上記�EチャチE��履歴に保存されてぁE��す、E;
    sendMessage(exitMessage, [], true);
    
    toast({
      title: "AI支援終亁E,
      description: "AI敁E��診断を終亁E��ました",
    });
  };

  const handleExport = async () => {
    try {
      await exportChatHistory();
      toast({
        title: "エクスポ�Eト�E劁E,
        description: "チャチE��履歴をエクスポ�Eトしました、E,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "エクスポ�Eトエラー",
        description: "チャチE��履歴のエクスポ�Eトに失敗しました、E,
        variant: "destructive",
      });
    }
  };

  // サーバ�Eへ送信する機�E
  const handleSendToServer = async () => {
    try {
      // チE��チE��惁E��を追加
      console.log('🚀 送信前�E状態確誁E', {
        chatId: chatId,
        messagesLength: messages.length,
        hasChatId: !!chatId,
        hasMessages: messages.length > 0,
        messagesWithContent: messages.filter(msg => msg.content && msg.content.trim()).length,
        machineInfo: {
          selectedMachineType,
          selectedMachineNumber,
          machineTypeInput,
          machineNumberInput
        }
      });

      // より詳細な条件チェチE��
      const hasValidChatId = !!chatId;
      const hasMessages = messages.length > 0;
      const hasValidMessages = messages.some(msg => msg.content && msg.content.trim());
      
      console.log('🔍 送信条件チェチE��:', {
        hasValidChatId,
        hasMessages,
        hasValidMessages,
        messagesCount: messages.length,
        messagesWithContent: messages.filter(msg => msg.content && msg.content.trim()).length
      });

      if (!hasValidChatId) {
        console.log('❁E送信エラー: チャチE��IDが無効 - 初期化を試衁E);
        try {
          // チャチE��IDが無効な場合�E初期化を試衁E
          await initializeChat();
          console.log('✁EチャチE��ID初期化�E劁E);
          // 初期化�E功後、�E度送信処琁E��実衁E
          setTimeout(() => {
            handleSendToServer();
          }, 100);
          return;
        } catch (initError) {
          console.error('❁EチャチE��ID初期化エラー:', initError);
          toast({
            title: "送信エラー",
            description: "チャチE��IDの初期化に失敗しました、E,
            variant: "destructive",
          });
          return;
        }
      }

      if (!hasValidMessages) {
        console.log('❁E送信エラー: 有効なメチE��ージがありません');
        toast({
          title: "送信エラー",
          description: "送信するチャチE��冁E��がありません、E,
          variant: "destructive",
        });
        return;
      }

      // チャチE��冁E��をJSON形式で整形
      const chatData = {
        chatId: chatId,
        timestamp: new Date().toISOString(),
        // 機種と機械番号の惁E��を追加
        machineInfo: {
          selectedMachineType: selectedMachineType,
          selectedMachineNumber: selectedMachineNumber,
          machineTypeName: machineTypeInput,
          machineNumber: machineNumberInput
        },
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isAiResponse: msg.isAiResponse,
          timestamp: msg.timestamp,
          media: msg.media?.map((media: any) => ({
            id: media.id,
            type: media.type,
            url: media.url,
            title: media.title,
            fileName: media.fileName || ''
          })) || []
        }))
      };

      console.log('📤 送信チE�Eタ:', {
        chatId: chatData.chatId,
        messageCount: chatData.messages.length,
        machineInfo: chatData.machineInfo,
        totalDataSize: JSON.stringify(chatData).length
      });

      // サーバ�Eに送信�E�開発環墁E��はチE��ト用エンド�Eイントを使用�E�E
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      const apiUrl = isDevelopment 
        ? `/api/chats/${chatId}/send-test`
        : `/api/chats/${chatId}/send`;
      
      console.log('🌐 送信URL:', apiUrl);
      console.log('🏗�E�E開発環墁E', isDevelopment);
      console.log('🏠 ホスト名:', window.location.hostname);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatData: chatData,
          exportType: 'manual_send'
        })
      });

      console.log('📡 送信レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const result = await response.json();
        
        // 機種と機械番号の惁E��を含む送信成功メチE��ージ
        const machineInfoText = selectedMachineType && selectedMachineNumber 
          ? ` (機種: ${machineTypeInput}, 機械番号: ${machineNumberInput})`
          : '';
        
        console.log('✁Eサーバ�E送信成功:', result);
        
        toast({
          title: "送信成功",
          description: `チャチE��冁E��をサーバ�Eに送信しました、E${messages.filter(msg => msg.content && msg.content.trim()).length}件のメチE��ージ)${machineInfoText}`,
        });

        // 送信完亁E��にチャチE��をクリア
        await clearChatHistory();
        
        // 機種と機械番号の選択状態もリセチE��
        setSelectedMachineType('');
        setSelectedMachineNumber('');
        setMachineTypeInput('');
        setMachineNumberInput('');
        setFilteredMachineTypes([]);
        setFilteredMachines([]);

        // AI支援モードもリセチE��
        setAiSupportMode(false);
        setAiSessionData(null);

        toast({
          title: "チャチE��クリア完亁E,
          description: "送信後にチャチE��履歴をクリアしました、E,
        });
        
        console.log('🧹 チャチE��状態をリセチE��しました');
      } else {
        // エラーレスポンスの詳細を取征E
        let errorMessage = `送信失敁E ${response.status} ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.error || '';
          console.error('❁Eサーバ�Eエラーレスポンス:', errorData);
        } catch (parseError) {
          console.warn('⚠�E�Eエラーレスポンスの解析に失敁E', parseError);
        }
        
        // より詳細なエラーメチE��ージを構篁E
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n詳細: ${errorDetails}`
          : errorMessage;
        
        throw new Error(fullErrorMessage);
      }
    } catch (error) {
      console.error('❁Eサーバ�E送信エラー:', error);
      toast({
        title: "送信エラー",
        description: error instanceof Error ? error.message : "サーバ�Eへの送信に失敗しました、E,
        variant: "destructive",
      });
    }
  };

  // ローカル保存機�E�E�削除済み�E�E

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // importChat関数は現在実裁E��れてぁE��ぁE��め、簡易的な実裁E
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (importedData.messages && Array.isArray(importedData.messages)) {
          // メチE��ージを設定（既存�EメチE��ージに追加�E�E
          setMessages([...messages, ...importedData.messages]);
          toast({
            title: "インポ�Eト�E劁E,
            description: "チャチE��履歴をインポ�Eトしました、E,
          });
        } else {
          throw new Error('無効なファイル形式でぁE);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "インポ�Eトエラー",
          description: "チャチE��履歴のインポ�Eトに失敗しました、E,
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 応急処置ガイド関連の関数
  const fetchAvailableGuides = async () => {
    try {
      setIsLoadingGuides(true);
      const response = await fetch(TROUBLESHOOTING_API.LIST, API_REQUEST_OPTIONS);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableGuides(data.data || []);
          setFilteredGuides(data.data || []);
          console.log('✁E応急処置ガイド取得�E劁E', data.data?.length + '件');
        } else {
          console.error('❁E応急処置ガイド取得失敁E', data.message);
          setAvailableGuides([]);
          setFilteredGuides([]);
        }
      } else {
        throw new Error(`Failed to fetch emergency guides: ${response.statusText}`);
      }
    } catch (error) {
      console.error('ガイド一覧の取得に失敁E', error);
      toast({
        title: "エラー",
        description: "応急処置チE�Eタの取得に失敗しました",
        variant: "destructive",
      });
      setAvailableGuides([]);
      setFilteredGuides([]);
    } finally {
      setIsLoadingGuides(false);
    }
  };

  const handleEmergencyGuide = async () => {
    await fetchAvailableGuides();
    setShowEmergencyGuide(true);
  };

  const handleSelectGuide = (guideId: string) => {
    setSelectedGuideId(guideId);
  };

  const handleExitGuide = () => {
    setShowEmergencyGuide(false);
    setSelectedGuideId(null);
    setSearchQuery("");
  };

  // 検索処琁E
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredGuides(availableGuides);
      return;
    }

    try {
      // クライアントサイド検索を実衁E
      const searchResults = availableGuides.filter((guide) => {
        const searchText = `${guide.title} ${guide.description} ${guide.keyword || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      setFilteredGuides(searchResults);
      console.log(`🔍 検索結果: "${query}" -> ${searchResults.length}件`);
    } catch (error) {
      console.error('検索処琁E��ラー:', error);
      setFilteredGuides(availableGuides);
    }
  };

  // キーワード�EタンクリチE��時�E処琁E
  const handleKeywordClick = (keyword: string) => {
    handleSearch(keyword);
  };

  // カメラボタンのクリチE��処琁E
  const handleCameraClick = () => {
    console.log('📸 カメラボタンがクリチE��されました');
    // カメラモーダルを開くイベントを発火
    window.dispatchEvent(new CustomEvent('open-camera'));

    // チE��チE��用: イベントが正しく発火されたかを確誁E
    console.log('📸 open-camera イベントを発火しました');
  };

  // トラブルシューチE��ングQA開姁E
  const startTroubleshootingQA = async (problemDescription: string) => {
    try {
      setTroubleshootingMode(true);
      setTroubleshootingSession({
        problemDescription,
        answers: []
      });

      // トラブルシューチE��ングQA APIを呼び出ぁE
      const response = await fetch(TROUBLESHOOTING_API.START_QA, {
        ...API_REQUEST_OPTIONS,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          problemDescription
        })
      });

      if (response.ok) {
        const data = await response.json();
        const qaResponse = data.data;

        setTroubleshootingSession(prev => ({
          ...prev!,
          currentQuestion: qaResponse.question,
          currentOptions: qaResponse.options || [],
          reasoning: qaResponse.reasoning
        }));

        // 初期質問をメチE��ージとして追加
        sendMessage(qaResponse.question, [], true);
      } else {
        throw new Error('トラブルシューチE��ングQAの開始に失敗しました');
      }
    } catch (error) {
      console.error('❁EトラブルシューチE��ングQA開始エラー:', error);
      toast({
        title: "エラー",
        description: "トラブルシューチE��ングQAの開始に失敗しました",
        variant: "destructive",
      });
    }
  };

  // トラブルシューチE��ングQA回答�E琁E
  const handleTroubleshootingAnswer = async (answer: string) => {
    if (!troubleshootingSession) return;

    try {
      // 回答をセチE��ョンに追加
      const updatedSession = {
        ...troubleshootingSession,
        answers: [...troubleshootingSession.answers, {
          stepId: `step_${Date.now()}`,
          answer,
          timestamp: new Date()
        }]
      };
      setTroubleshootingSession(updatedSession);

      // 回答をメチE��ージとして追加
      sendMessage(answer, [], false);

      // トラブルシューチE��ングQA APIを呼び出ぁE
      const response = await fetch(TROUBLESHOOTING_API.ANSWER_QA, {
        ...API_REQUEST_OPTIONS,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          problemDescription: troubleshootingSession.problemDescription,
          previousAnswers: updatedSession.answers.slice(0, -1), // 現在の回答を除ぁE
          currentAnswer: answer
        })
      });

      if (response.ok) {
        const data = await response.json();
        const qaResponse = data.data;

        if (qaResponse.status === 'complete') {
          // 解決策を表示
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: undefined,
            currentOptions: undefined
          }));
          sendMessage(qaResponse.solution, [], true);
          setTroubleshootingMode(false);
        } else if (qaResponse.status === 'emergency') {
          // 緊急対応を表示
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: undefined,
            currentOptions: undefined
          }));
          sendMessage(qaResponse.emergencyAction, [], true);
          setTroubleshootingMode(false);
        } else {
          // 次の質問を表示
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: qaResponse.question,
            currentOptions: qaResponse.options || [],
            reasoning: qaResponse.reasoning
          }));
          sendMessage(qaResponse.question, [], true);
        }
      } else {
        throw new Error('回答�E処琁E��失敗しました');
      }
    } catch (error) {
      console.error('❁EトラブルシューチE��ングQA回答�E琁E��ラー:', error);
      toast({
        title: "エラー",
        description: "回答�E処琁E��失敗しました",
        variant: "destructive",
      });
    }
  };

  // メチE��ージ送信処琁E��拡張
  const handleSendMessage = async (content: string, media: any[] = []) => {
    if (!content.trim() && media.length === 0) return;

    // AI支援モード�E場合�E特別な処琁E
    if (aiSupportMode && aiSessionData) {
      await handleAiSupportMessage(content);
      return;
    }

    // トラブルシューチE��ングモード�E場合�E特別な処琁E
    if (troubleshootingMode && troubleshootingSession) {
      await handleTroubleshootingAnswer(content);
      return;
    }

    // 通常のメチE��ージ送信処琁E
    sendMessage(content, media, false);
  };

  // AI支援モードでのメチE��ージ処琁E
  const handleAiSupportMessage = async (userMessage: string) => {
    if (!aiSessionData) return;

    try {
      // ユーザーメチE��ージをチャチE��に追加
      sendMessage(userMessage, [], false);

      // コンチE��ストを更新
      const updatedContext = [...aiSessionData.context, userMessage];
      
      // GPT APIに送信してレスポンスを取征E
      const response = await fetch(AI_API.DIAGNOSIS, {
        ...API_REQUEST_OPTIONS,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: aiSessionData.sessionId,
          step: aiSessionData.step,
          userMessage,
          context: updatedContext,
          machineInfo: {
            selectedMachineType,
            selectedMachineNumber,
            machineTypeName: machineTypeInput,
            machineNumber: machineNumberInput
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // AIからの返答をチャチE��に追加�E�E回だけ！E
        if (data.response) {
          sendMessage(data.response, [], true);
        }

        // セチE��ョンチE�Eタを更新
        setAiSessionData({
          ...aiSessionData,
          step: aiSessionData.step + 1,
          context: [...updatedContext, data.response || ''],
          lastQuestion: data.nextQuestion || aiSessionData.lastQuestion
        });

        // 診断完亁E�E場吁E
        if (data.completed) {
          setTimeout(() => {
            const completionMessage = "🎯 診断が完亁E��ました。他にもお困り�Eことがあれ�E、お気軽にお尋�Eください、E;
            sendMessage(completionMessage, [], true);
            setAiSupportMode(false);
            setAiSessionData(null);
          }, 1500);
        }
      } else {
        throw new Error('AI診断APIの呼び出しに失敗しました');
      }
    } catch (error) {
      console.error('AI支援メチE��ージ処琁E��ラー:', error);
      const errorMessage = "申し訳ござぁE��せん。エラーが発生しました。もぁE��度お試しください、E;
      sendMessage(errorMessage, [], true);
    }
  };

  // トラブルシューチE��ングQA開始�Eタンの追加
  const handleStartTroubleshooting = () => {
    const problemDescription = prompt('発生した事象を教えてください�E�例：エンジンが止まった、ブレーキが効かなぁE��ど�E�E');
    if (problemDescription && problemDescription.trim()) {
      startTroubleshootingQA(problemDescription.trim());
    }
  };

  // クリア機�E
  const handleClearChat = async () => {
    try {
      await clearChatHistory();
      setTroubleshootingMode(false);
      setTroubleshootingSession(null);
      setAiSupportMode(false);
      setAiSessionData(null);
      toast({
        title: "成功",
        description: "チャチE��履歴をクリアしました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "クリアに失敗しました",
        variant: "destructive",
      });
    }
  };

  // カメラモーダルの表示管琁E
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // AI支援の質問生成！EPTとの一問一答チャチE���E�E
  const generateEmergencyQuestion = async (context: string, previousAnswers: string[]): Promise<{ question: string; options?: string[] }> => {
    try {
      // 最佁Eつの質問を生�Eするまで続衁E
      if (previousAnswers.length >= 5) {
        return {
          question: "",
          options: []
        };
      }

      // 前�E回答に基づぁE��次の質問を生�E
      if (previousAnswers.length === 0) {
        return {
          question: "具体的な痁E��を教えてください",
          options: []
        };
      } else if (previousAnswers.length === 1) {
        const firstAnswer = previousAnswers[0].toLowerCase();
        
        // 敁E��の種類を動的に判断
        if (firstAnswer.includes("動佁E) || firstAnswer.includes("動かなぁE) || firstAnswer.includes("効かなぁE)) {
          return {
            question: "敁E��部位�Eどこですか�E�E,
            options: []
          };
        } else if (firstAnswer.includes("異音") || firstAnswer.includes("音")) {
          return {
            question: "異音の発生箁E��は�E�E,
            options: []
          };
        } else if (firstAnswer.includes("警呁E) || firstAnswer.includes("ランチE) || firstAnswer.includes("アラーム")) {
          return {
            question: "警告�E冁E��は�E�E,
            options: []
          };
        } else if (firstAnswer.includes("漏れ") || firstAnswer.includes("漏れめE)) {
          return {
            question: "何が漏れてぁE��すか�E�E,
            options: []
          };
        } else if (firstAnswer.includes("振勁E) || firstAnswer.includes("揺れる")) {
          return {
            question: "振動箁E��はどこですか�E�E,
            options: []
          };
        } else {
          return {
            question: "問題�E詳細を教えてください",
            options: []
          };
        }
      } else if (previousAnswers.length === 2) {
        const firstAnswer = previousAnswers[0].toLowerCase();
        const secondAnswer = previousAnswers[1].toLowerCase();
        
        // 敁E��部位や機器の惁E��を収雁E
        return {
          question: "作業現場は安�Eですか�E�E,
          options: []
        };
      } else if (previousAnswers.length === 3) {
        // 3つ目の質問：故障�E詳細惁E��
        return {
          question: "敁E��の発生時期�E�E�E,
          options: []
        };
      } else if (previousAnswers.length === 4) {
        // 4つ目の質問：作業環墁E�E確誁E
        return {
          question: "作業に忁E��な工具はありますか�E�E,
          options: []
        };
      }
      
      return {
        question: "詳細を教えてください",
        options: []
      };
    } catch (error) {
      console.error('AI支援質問生成エラー:', error);
      return {
        question: "詳細な状況を教えてください",
        options: []
      };
    }
  };

  // エクスポ�Eト機�E
  const handleExportChat = async () => {
    try {
      // チャチE��履歴をエクスポ�EチE
      const chatData = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString()
      }));
      
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_history_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✁EチャチE��履歴をエクスポ�Eトしました');
    } catch (error) {
      console.error('❁Eエクスポ�Eトエラー:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        {/* 左側�E�機種・機械番号選抁E*/}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="machine-type" className="text-sm font-medium text-gray-700">
              機種:
            </Label>
            <div className="relative">
              <Input
                id="machine-type"
                type="text"
                placeholder={isLoadingMachineTypes ? "読み込み中..." : "機種を選抁E.."}
                value={machineTypeInput}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('🔍 機種入力変更:', value);
                  setMachineTypeInput(value);
                  filterMachineTypes(value);
                  setShowMachineTypeSuggestions(true);
                }}
                onFocus={() => {
                  console.log('🔍 機種入力フォーカス:', {
                    machineTypesCount: machineTypes.length,
                    machineTypes: machineTypes,
                    filteredMachineTypesCount: filteredMachineTypes.length,
                    showMachineTypeSuggestions: showMachineTypeSuggestions
                  });
                  setShowMachineTypeSuggestions(true);
                  // フォーカス時に全機種を表示
                  if (machineTypes.length > 0) {
                    setFilteredMachineTypes(machineTypes);
                  }
                }}
                onBlur={(e) => {
                  // ドロチE�Eダウン冁E�EクリチE��の場合�E閉じなぁE
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-type-dropdown')) {
                    return;
                  }
                  // 少し遁E��させてクリチE��イベントが処琁E��れるのを征E��
                  setTimeout(() => {
                    setShowMachineTypeSuggestions(false);
                  }, 150);
                }}
                disabled={isLoadingMachineTypes}
                className="w-48"
              />
              {(() => {
                console.log('🔍 機種ドロチE�Eダウン表示条件:', {
                  showMachineTypeSuggestions,
                  filteredMachineTypesCount: filteredMachineTypes.length,
                  filteredMachineTypes: filteredMachineTypes,
                  machineTypesCount: machineTypes.length,
                  machineTypes: machineTypes,
                  isLoadingMachineTypes
                });
                return null;
              })()}
              {showMachineTypeSuggestions && (
                <div id="machine-type-menu" className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto machine-type-dropdown">
                  {isLoadingMachineTypes ? (
                    <div className="px-3 py-2 text-sm text-gray-500">読み込み中...</div>
                  ) : filteredMachineTypes.length > 0 ? (
                    filteredMachineTypes.map((type) => (
                      <div
                        key={type.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMachineTypeSelect(type);
                        }}
                        onMouseDown={(e) => {
                          // マウスダウンイベントでブラウザのフォーカス変更を防ぁE
                          e.preventDefault();
                        }}
                        tabIndex={0}
                      >
                        {type.machine_type_name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineTypeInput.trim() ? "該当する機種が見つかりません" : 
                       machineTypes.length === 0 ? "機種チE�Eタを読み込み中..." : 
                       "機種を�E力してください"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="machine-number" className="text-sm font-medium text-gray-700">
              機械番号:
            </Label>
            <div className="relative">
              <Input
                id="machine-number"
                type="text"
                placeholder={isLoadingMachines ? "読み込み中..." : "機械番号を選抁E.."}
                value={machineNumberInput}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('🔍 機械番号入力変更:', value);
                  setMachineNumberInput(value);
                  filterMachines(value);
                  setShowMachineNumberSuggestions(true);
                }}
                onFocus={() => {
                  console.log('🔍 機械番号入力フォーカス');
                  console.log('🔧 フォーカス時�E状慁E', {
                    selectedMachineType,
                    machinesCount: machines.length,
                    machines: machines,
                    filteredMachinesCount: filteredMachines.length,
                    filteredMachines: filteredMachines,
                    isLoadingMachines,
                    machineNumberInput,
                    showMachineNumberSuggestions
                  });
                  setShowMachineNumberSuggestions(true);
                  // フォーカス時に全機械番号を表示
                  if (machines.length > 0) {
                    setFilteredMachines(machines);
                    console.log('✁Eフォーカス時に機械番号リストを設宁E', machines.length, '件');
                  } else {
                    console.log('⚠�E�Eフォーカス時に機械番号がありません');
                  }
                }}
                onBlur={(e) => {
                  // ドロチE�Eダウン冁E�EクリチE��の場合�E閉じなぁE
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-number-dropdown')) {
                    return;
                  }
                  // 少し遁E��させてクリチE��イベントが処琁E��れるのを征E��
                  setTimeout(() => {
                    setShowMachineNumberSuggestions(false);
                  }, 150);
                }}
                disabled={!selectedMachineType || isLoadingMachines}
                className="w-48"
              />
              {(() => {
                console.log('🔍 機械番号ドロチE�Eダウン表示条件:', {
                  showMachineNumberSuggestions,
                  filteredMachinesCount: filteredMachines.length,
                  filteredMachines: filteredMachines,
                  selectedMachineType,
                  machineNumberInput,
                  isLoadingMachines
                });
                return null;
              })()}
              {showMachineNumberSuggestions && (
                <div id="machine-number-menu" className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto machine-number-dropdown">
                  {filteredMachines.length > 0 ? (
                    filteredMachines.map((machine) => (
                      <div
                        key={machine.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMachineNumberSelect(machine);
                        }}
                        onMouseDown={(e) => {
                          // マウスダウンイベントでブラウザのフォーカス変更を防ぁE
                          e.preventDefault();
                        }}
                        tabIndex={0}
                      >
                        {machine.machine_number}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineNumberInput.trim() ? "該当する機械番号が見つかりません" : 
                       selectedMachineType ? "こ�E機種に登録されてぁE��機械番号がありません" : 
                       "先に機種を選択してください"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 中央�E�AI支援・カメラ・応急処置ガイド�Eタン */}
        <div className="flex items-center gap-6">
          {/* AI支援開姁E終亁E�Eタン */}
          {!aiSupportMode ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handleStartAiSupport}
              disabled={isLoading}
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <Brain className="w-6 h-6 mr-3" />
              AI支援
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAiSupportExit}
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <X className="w-6 h-6 mr-3" />
              AI支援終亁E
            </Button>
          )}

          {/* カメラボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCameraClick}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-6"
          >
            <Camera className="w-4 h-4 mr-2" />
            カメラ
          </Button>

          {/* 応急処置ガイド�Eタン */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleEmergencyGuide}
            disabled={isLoadingGuides}
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 mr-6 px-8 py-3 text-base font-semibold"
          >
            <Activity className="w-6 h-6 mr-3" />
            応急処置ガイチE
          </Button>
        </div>
        
        {/* 右側�E�アクションボタン */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendToServer}
            disabled={isLoading || messages.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            サーバ�E送信
          </Button>

          <Button 
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={isLoading || isClearing || messages.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            クリア
          </Button>
        </div>
      </div>

      {/* メインコンチE��チE��リア - 常にチャチE��表示 */}
      {/* メチE��ージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isAiResponse ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${message.isAiResponse ? 'w-auto' : 'w-full'}`}>
              {message.isAiResponse && troubleshootingMode && troubleshootingSession?.currentQuestion === message.content ? (
                // トラブルシューチE��ングQAバブル
                <TroubleshootingQABubble
                  question={message.content}
                  options={troubleshootingSession?.currentOptions || []}
                  reasoning={troubleshootingSession?.reasoning}
                  onAnswer={handleTroubleshootingAnswer}
                  isLoading={isLoading}
                />
              ) : message.isAiResponse && (message.content.includes('解決筁E) || message.content.includes('緊急対忁E)) ? (
                // 解決策バブル
                <SolutionBubble
                  solution={message.content}
                  problemDescription={troubleshootingSession?.problemDescription}
                  isEmergency={message.content.includes('緊急対忁E)}
                />
              ) : (
                // 通常のメチE��ージバブル
                <MessageBubble message={message} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-end">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">AIが応答を生�E中...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メチE��ージ入力エリア */}
      <div className="border-t bg-white p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={troubleshootingMode && !troubleshootingSession?.currentQuestion}
        />
      </div>

      {/* カメラモーダル */}
      <CameraModal />

      {/* 画像�Eレビューモーダル */}
      {showImagePreview && selectedImage && (
        <ImagePreviewModal />
      )}

      {/* 応急処置ガイドモーダル */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">応急処置ガイチE/h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitGuide}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                閉じめE
              </Button>
            </div>
            
            {/* 検索機�E */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="ガイドを検索..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* キーワード�Eタン */}
            <div className="mb-4">
              <KeywordButtons onKeywordClick={handleKeywordClick} />
            </div>
            
            {/* ガイド一覧 */}
            {!selectedGuideId && (
              <div className="overflow-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">タイトル</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">説昁E/th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuides.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-gray-300 p-4 text-center text-gray-500">
                          ガイドが見つかりません
                        </td>
                      </tr>
                    ) : (
                      filteredGuides.map((guide) => (
                        <tr 
                          key={guide.id} 
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedGuideId === guide.id ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => handleSelectGuide(guide.id)}
                        >
                          <td className="border border-gray-300 p-3">
                            <div className="break-words leading-tight text-sm font-semibold hover:text-blue-600">
                              {guide.title}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3">
                            <div className="break-words leading-tight text-sm text-gray-600">
                              {guide.description}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* 選択されたガイド�E表示 */}
            {selectedGuideId && (
              <div className="mt-6">
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={() => setSelectedGuideId(null)}
                  backButtonText="一覧に戻めE
                  onSendToChat={() => {
                    console.log('応急処置ガイドをチャチE��に送信');
                    setShowEmergencyGuide(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
