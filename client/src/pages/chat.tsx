import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";
import KeywordButtons from "../components/troubleshooting/keyword-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Activity, X, Camera, Trash2, Brain } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import TroubleshootingQABubble from "../components/chat/troubleshooting-qa-bubble";
import SolutionBubble from "../components/chat/solution-bubble";
// import InteractiveDiagnosisChat from "../components/InteractiveDiagnosisChat";
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

  // インタラクティブ診断モードの状態管理
  const [interactiveDiagnosisMode, setInteractiveDiagnosisMode] = useState(false);
  // 追加: 機種と機械番号のオートコンプリート状態管理
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string}>>([]);
  const [selectedMachineType, setSelectedMachineType] = useState<string>('');
  const [selectedMachineNumber, setSelectedMachineNumber] = useState<string>('');
  const [isLoadingMachineTypes, setIsLoadingMachineTypes] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  
  // オートコンプリート用の状態
  const [machineTypeInput, setMachineTypeInput] = useState('');
  const [machineNumberInput, setMachineNumberInput] = useState('');
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] = useState(false);
  const [showMachineNumberSuggestions, setShowMachineNumberSuggestions] = useState(false);
  const [filteredMachineTypes, setFilteredMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [filteredMachines, setFilteredMachines] = useState<Array<{id: string, machine_number: string}>>([]);

  // トラブルシューティングQAの状態管理
  const [troubleshootingMode, setTroubleshootingMode] = useState(false);
  const [troubleshootingSession, setTroubleshootingSession] = useState<{
    problemDescription: string;
    answers: any[];
    currentQuestion?: string;
    currentOptions?: string[];
    reasoning?: string;
  } | null>(null);

  // ナレッジデータ管理の状態
  const [knowledgeData, setKnowledgeData] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  // 機種データの初期読み込み
  useEffect(() => {
    fetchMachineTypes();
    fetchKnowledgeData();
  }, []);

  // 機種データが更新された時にフィルタリングリストも更新
  useEffect(() => {
    console.log('🔍 機種データ更新検知:', {
      machineTypesCount: machineTypes.length,
      machineTypes: machineTypes,
      filteredMachineTypesCount: filteredMachineTypes.length
    });
    setFilteredMachineTypes(machineTypes);
  }, [machineTypes]);

  // 機械データが更新された時にフィルタリングリストも更新
  useEffect(() => {
    console.log('🔍 機械番号データ更新検知:', {
      machinesCount: machines.length,
      machines: machines,
      filteredMachinesCount: filteredMachines.length
    });
    setFilteredMachines(machines);
  }, [machines]);

  // ナレッジデータを取得
  const fetchKnowledgeData = async () => {
    try {
      setIsLoadingKnowledge(true);
      const response = await fetch(`/api/knowledge-base`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setKnowledgeData(result.data);
          console.log('✅ ナレッジデータ取得成功:', result.data.length + '件');
        } else {
          console.error('❌ ナレッジデータ取得失敗:', result.message);
          setKnowledgeData([]);
        }
      } else {
        throw new Error(`Failed to fetch knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ ナレッジデータ取得エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ナレッジデータの取得に失敗しました",
        variant: "destructive"
      });
      setKnowledgeData([]);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // ナレッジデータのベクトル化処理
  const processKnowledgeData = async () => {
    try {
      setIsLoadingKnowledge(true);
      const response = await fetch(`/api/knowledge-base/process`, {
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
            description: "ナレッジデータのベクトル化処理が完了しました",
          });
          // データを再取得
          await fetchKnowledgeData();
        } else {
          throw new Error(result.message || "ベクトル化処理に失敗しました");
        }
      } else {
        throw new Error(`Failed to process knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ ナレッジデータ処理エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ナレッジデータの処理に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // ドロップダウンの表示/非表示制御
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
  
  // AIサポートシステムのセッション管理
  const [aiSupportSessionData, setAiSupportSessionData] = useState<{
    answers: string[];
    solution: string;
    knowledgeContext: string[];
    questions: string[];
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 追加: 機種一覧を取得する関数（設定UIと同じAPIを使用）
  const fetchMachineTypes = useCallback(async () => {
    try {
      setIsLoadingMachineTypes(true);
      console.log('🔍 機種一覧取得開始');
      
  // プロキシ経由でアクセス（相対パスを使用）
  const apiUrl = `/api/machines/machine-types`;
      console.log('🔍 機種一覧取得URL:', apiUrl);
      console.log('🔍 現在のURL:', window.location.href);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include' // セッション維持のため
      });
      console.log('🔍 機種一覧取得レスポンスステータス:', response.status);
      console.log('🔍 機種一覧取得レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 機種一覧取得結果:', result);
        if (result.success && Array.isArray(result.data)) {
          console.log('✅ 機種一覧設定完了:', result.data.length, '件');
          console.log('✅ 機種データ:', result.data);
          setMachineTypes(result.data);
          setFilteredMachineTypes(result.data); // 初期表示用にも設定
          
          if (result.data.length === 0) {
            console.log('⚠️ 機種データが0件です');
          }
        } else {
          console.error('❌ 機種一覧取得成功だがデータが無効:', result);
          setMachineTypes([]);
          setFilteredMachineTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ 機種一覧取得エラー:', response.status, errorText);
        
        if (response.status === 401) {
          console.log('🔐 認証エラーが発生しました。ログインが必要です。');
        }
        
        setMachineTypes([]);
        setFilteredMachineTypes([]);
      }
    } catch (error) {
      console.error('❌ 機種一覧取得エラー:', error);
      setMachineTypes([]);
      setFilteredMachineTypes([]);
    } finally {
      setIsLoadingMachineTypes(false);
      console.log('🔍 機種一覧取得完了、最終状態:', {
        machineTypesCount: machineTypes.length,
        filteredMachineTypesCount: filteredMachineTypes.length
      });
    }
  }, []);

  // 機種入力のフィルタリング
  const filterMachineTypes = (input: string) => {
    console.log('🔍 機種フィルタリング開始:', input, '機種数:', machineTypes.length);
    if (!input.trim()) {
      console.log('✅ 入力が空のため全機種を表示:', machineTypes.length, '件');
      setFilteredMachineTypes(machineTypes);
      return;
    }
    
    const filtered = machineTypes.filter(type => 
      type.machine_type_name.toLowerCase().includes(input.toLowerCase())
    );
    console.log('✅ フィルタリング結果:', filtered.length, '件');
    setFilteredMachineTypes(filtered);
  };

  // 機械番号入力のフィルタリング
  const filterMachines = (input: string) => {
    console.log('🔍 機械番号フィルタリング開始:', input, '機械数:', machines.length);
    if (!input.trim()) {
      console.log('✅ 入力が空のため全機械を表示:', machines.length, '件');
      setFilteredMachines(machines);
      return;
    }
    
    const filtered = machines.filter(machine => 
      machine.machine_number.toLowerCase().includes(input.toLowerCase())
    );
    console.log('✅ フィルタリング結果:', filtered.length, '件');
    setFilteredMachines(filtered);
  };

  // 機種選択処理
  const handleMachineTypeSelect = (type: {id: string, machine_type_name: string}) => {
    console.log('🔍 機種選択処理開始 ===========================');
    console.log('🔍 選択された機種:', type);
    
    try {
      // バッチ状態更新を使用
      setMachineTypeInput(type.machine_type_name);
      setSelectedMachineType(type.id);
      setShowMachineTypeSuggestions(false);
      
      // 機種変更時は機械番号をリセット
      setSelectedMachineNumber('');
      setMachineNumberInput('');
      setMachines([]);
      setFilteredMachines([]);
      
      console.log('✅ 機種選択完了:', type.machine_type_name);
      
      // 対応する機械番号を取得
      fetchMachines(type.id);
      
    } catch (error) {
      console.error('❌ 機種選択処理中にエラー:', error);
    }
  };

  // 機械番号選択処理
  const handleMachineNumberSelect = (machine: {id: string, machine_number: string}) => {
    console.log('🔍 機械番号選択開始:', machine);
    
    try {
      // 状態を確実に更新
      setSelectedMachineNumber(machine.id);
      setMachineNumberInput(machine.machine_number);
      setShowMachineNumberSuggestions(false);
      
      console.log('✅ 機械番号選択完了:', machine.machine_number);
      
    } catch (error) {
      console.error('❌ 機械番号選択処理中にエラー:', error);
    }
  };

  // 追加: 指定機種に紐づく機械番号一覧を取得する関数（設定UIと同じAPIを使用）
  const fetchMachines = useCallback(async (typeId: string) => {
    try {
      setIsLoadingMachines(true);
      console.log('🔍 機械番号一覧取得開始, 機種ID:', typeId);
      
      // プロキシ経由でアクセス（相対パスを使用）
      const apiUrl = `/api/machines/machines?type_id=${typeId}`;
      console.log('🔍 機械番号一覧取得URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include' // セッション維持のため
      });
      console.log('🔍 機械番号一覧取得レスポンスステータス:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ 機械番号一覧取得結果:', result);
        if (result.success) {
          console.log('✅ 機械番号一覧設定完了:', result.data.length, '件');
          console.log('✅ 機械番号データ:', result.data);
          setMachines(result.data);
          setFilteredMachines(result.data); // 初期表示用
          
          // 機械番号データ取得完了のデバッグ情報
          console.log('🔧 機械番号取得後の状態:', {
            machinesCount: result.data.length,
            machines: result.data,
            machineNumberInput,
            selectedMachineNumber,
            showMachineNumberSuggestions
          });
        } else {
          console.error('❌ 機械番号一覧取得成功だがsuccess=false:', result);
          setMachines([]);
          setFilteredMachines([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ 機械番号一覧取得エラー:', response.status, errorText);
        setMachines([]);
        setFilteredMachines([]);
      }
    } catch (error) {
      console.error('❌ 機械番号一覧取得エラー:', error);
      setMachines([]);
      setFilteredMachines([]);
    } finally {
      setIsLoadingMachines(false);
      console.log('🔍 機械番号一覧取得完了、最終状態:', {
        machinesCount: machines.length,
        filteredMachinesCount: filteredMachines.length
      });
    }
  }, [machines.length, filteredMachines.length, machineNumberInput, selectedMachineNumber, showMachineNumberSuggestions]);

  // 追加: 機種選択時の処理（オートコンプリート用）
  const handleMachineTypeChange = (typeId: string) => {
    setSelectedMachineType(typeId);
    setSelectedMachineNumber(''); // 機種変更時は機械番号をリセット
    setMachineNumberInput(''); // 機械番号入力もリセット
    
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

  // コンポーネントマウント時の初期化
  useEffect(() => {
    console.log('🚀 チャットページマウント - 初期化開始');
    
    // チャットIDの初期化を確実に行う
    if (!chatId) {
      console.log('🔄 チャットIDが未設定のため初期化を実行');
      try {
        initializeChat();
      } catch (error) {
        console.error('❌ チャットID初期化エラー:', error);
      }
    }
  // 初期表示時は何もしない（AIサポートボタン押下時のみ質問を表示）
    // 機種データの取得
    fetchMachineTypes().catch(error => {
      console.error('❌ 機種データ取得でエラーが発生しましたが、チャット画面は表示されます:', error);
    });
  }, [chatId, initializeChat, fetchMachineTypes]);

  // 機種データの状態変更を監視してフィルタリングを更新
  useEffect(() => {
    console.log('📊 機種データ状態更新:', {
      machineTypesCount: machineTypes.length,
      selectedMachineType,
      machineTypeInput,
      isLoadingMachineTypes
    });
    
    // 機種データが更新されたら、現在の入力に基づいてフィルタリングを更新
    if (machineTypes.length > 0) {
      filterMachineTypes(machineTypeInput);
    }
  }, [machineTypes, machineTypeInput]);

  // 機種入力の状態変更を監視（デバッグ用）
  useEffect(() => {
    console.log('📊 機種入力状態更新:', {
      machineTypeInput,
      selectedMachineType
    });
  }, [machineTypeInput, selectedMachineType]);

  // machineTypeInputの値の変更を詳細に監視
  useEffect(() => {
    console.log('🔍 machineTypeInput値変更検出:', {
      currentValue: machineTypeInput,
      length: machineTypeInput.length,
      timestamp: new Date().toISOString()
    });
  }, [machineTypeInput]);

  // 機械番号データの状態変更を監視してフィルタリングを更新
  useEffect(() => {
    console.log('📊 機械番号データ状態更新:', {
      machinesCount: machines.length,
      selectedMachineNumber,
      machineNumberInput,
      isLoadingMachines
    });
    
    // 機械番号データが更新されたら、現在の入力に基づいてフィルタリングを更新
    if (machines.length > 0) {
      filterMachines(machineNumberInput);
    }
  }, [machines, machineNumberInput]);

  // 機械番号入力の状態変更を監視（デバッグ用）
  useEffect(() => {
    console.log('📊 機械番号入力状態更新:', {
      machineNumberInput,
      selectedMachineNumber
    });
  }, [machineNumberInput, selectedMachineNumber]);

  // 追加: Q&Aモードの初期化（動的質問生成システムに変更済み）

  // AIサポート開始（インタラクティブ診断モードに変更）
  const handleStartAiSupport = async () => {
    try {
      // インタラクティブ診断モードを開始
      setInteractiveDiagnosisMode(true);
      
      toast({
        title: "AIサポート開始",
        description: "インタラクティブ故障診断を開始します",
      });

  // 最初の質問を送信
  sendMessage("サポートします。どのような事象が発生しましたか？お気軽に教えてください。", [], true);
    } catch (error) {
      console.error('AIサポート開始エラー:', error);
      toast({
        title: "エラー",
        description: "AIサポートの開始に失敗しました",
        variant: "destructive",
      });
      setInteractiveDiagnosisMode(false);
    }
  };

  // AIサポート終了（インタラクティブ診断モード終了）
  const handleAiSupportExit = () => {
    setInteractiveDiagnosisMode(false);
    
    toast({
      title: "AIサポート終了",
      description: "インタラクティブ故障診断を終了しました",
    });
  };

  const handleExport = async () => {
    try {
      await exportChatHistory();
      toast({
        title: "エクスポート成功",
        description: "チャット履歴をエクスポートしました。",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "エクスポートエラー",
        description: "チャット履歴のエクスポートに失敗しました。",
        variant: "destructive",
      });
    }
  };

  // サーバーへ送信する機能
  const handleSendToServer = async () => {
    try {
      // デバッグ情報を追加
      console.log('🚀 送信前の状態確認:', {
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

      // より詳細な条件チェック
      const hasValidChatId = !!chatId;
      const hasMessages = messages.length > 0;
      const hasValidMessages = messages.some(msg => msg.content && msg.content.trim());
      
      console.log('🔍 送信条件チェック:', {
        hasValidChatId,
        hasMessages,
        hasValidMessages,
        messagesCount: messages.length,
        messagesWithContent: messages.filter(msg => msg.content && msg.content.trim()).length
      });

      if (!hasValidChatId) {
        console.log('❌ 送信エラー: チャットIDが無効 - 初期化を試行');
        try {
          // チャットIDが無効な場合は初期化を試行
          await initializeChat();
          console.log('✅ チャットID初期化成功');
          // 初期化成功後、再度送信処理を実行
          setTimeout(() => {
            handleSendToServer();
          }, 100);
          return;
        } catch (initError) {
          console.error('❌ チャットID初期化エラー:', initError);
          toast({
            title: "送信エラー",
            description: "チャットIDの初期化に失敗しました。",
            variant: "destructive",
          });
          return;
        }
      }

      if (!hasValidMessages) {
        console.log('❌ 送信エラー: 有効なメッセージがありません');
        toast({
          title: "送信エラー",
          description: "送信するチャット内容がありません。",
          variant: "destructive",
        });
        return;
      }

      // チャット内容をJSON形式で整形
      const chatData = {
        chatId: chatId,
        timestamp: new Date().toISOString(),
        // 機種と機械番号の情報を追加
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

      console.log('📤 送信データ:', {
        chatId: chatData.chatId,
        messageCount: chatData.messages.length,
        machineInfo: chatData.machineInfo,
        totalDataSize: JSON.stringify(chatData).length
      });

      // サーバーに送信（開発環境ではテスト用エンドポイントを使用）
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      const apiUrl = isDevelopment 
        ? `/api/chats/${chatId}/send-test`
        : `/api/chats/${chatId}/send`;
      
      console.log('🌐 送信URL:', apiUrl);
      console.log('🏗️ 開発環境:', isDevelopment);
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
        
        // 機種と機械番号の情報を含む送信成功メッセージ
        const machineInfoText = selectedMachineType && selectedMachineNumber 
          ? ` (機種: ${machineTypeInput}, 機械番号: ${machineNumberInput})`
          : '';
        
        console.log('✅ サーバー送信成功:', result);
        
        toast({
          title: "送信成功",
          description: `チャット内容をサーバーに送信しました。(${messages.filter(msg => msg.content && msg.content.trim()).length}件のメッセージ)${machineInfoText}`,
        });

        // 送信完了後にチャットをクリア
        await clearChatHistory();
        
        // 機種と機械番号の選択状態もリセット
        setSelectedMachineType('');
        setSelectedMachineNumber('');
        setMachineTypeInput('');
        setMachineNumberInput('');
        setFilteredMachineTypes([]);
        setFilteredMachines([]);

        toast({
          title: "チャットクリア完了",
          description: "送信後にチャット履歴をクリアしました。",
        });
        
        console.log('🧹 チャット状態をリセットしました');
      } else {
        // エラーレスポンスの詳細を取得
        let errorMessage = `送信失敗: ${response.status} ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.error || '';
          console.error('❌ サーバーエラーレスポンス:', errorData);
        } catch (parseError) {
          console.warn('⚠️ エラーレスポンスの解析に失敗:', parseError);
        }
        
        // より詳細なエラーメッセージを構築
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n詳細: ${errorDetails}`
          : errorMessage;
        
        throw new Error(fullErrorMessage);
      }
    } catch (error) {
      console.error('❌ サーバー送信エラー:', error);
      toast({
        title: "送信エラー",
        description: error instanceof Error ? error.message : "サーバーへの送信に失敗しました。",
        variant: "destructive",
      });
    }
  };

  // ローカル保存機能（削除済み）

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // importChat関数は現在実装されていないため、簡易的な実装
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (importedData.messages && Array.isArray(importedData.messages)) {
          // メッセージを設定（既存のメッセージに追加）
          setMessages([...messages, ...importedData.messages]);
          toast({
            title: "インポート成功",
            description: "チャット履歴をインポートしました。",
          });
        } else {
          throw new Error('無効なファイル形式です');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "インポートエラー",
          description: "チャット履歴のインポートに失敗しました。",
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
      const response = await fetch(`/api/troubleshooting/list`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableGuides(data.data || []);
          setFilteredGuides(data.data || []);
          console.log('✅ 応急処置ガイド取得成功:', data.data?.length + '件');
        } else {
          console.error('❌ 応急処置ガイド取得失敗:', data.message);
          setAvailableGuides([]);
          setFilteredGuides([]);
        }
      } else {
        throw new Error(`Failed to fetch emergency guides: ${response.statusText}`);
      }
    } catch (error) {
      console.error('ガイド一覧の取得に失敗:', error);
      toast({
        title: "エラー",
        description: "応急処置データの取得に失敗しました",
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

  // 検索処理
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredGuides(availableGuides);
      return;
    }

    try {
      // クライアントサイド検索を実行
      const searchResults = availableGuides.filter((guide) => {
        const searchText = `${guide.title} ${guide.description} ${guide.keyword || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      setFilteredGuides(searchResults);
      console.log(`🔍 検索結果: "${query}" -> ${searchResults.length}件`);
    } catch (error) {
      console.error('検索処理エラー:', error);
      setFilteredGuides(availableGuides);
    }
  };

  // キーワードボタンクリック時の処理
  const handleKeywordClick = (keyword: string) => {
    handleSearch(keyword);
  };

  // カメラボタンのクリック処理
  const handleCameraClick = () => {
    console.log('📸 カメラボタンがクリックされました');
    // カメラモーダルを開くイベントを発火
    window.dispatchEvent(new CustomEvent('open-camera'));

    // デバッグ用: イベントが正しく発火されたかを確認
    console.log('📸 open-camera イベントを発火しました');
  };

  // トラブルシューティングQA開始
  const startTroubleshootingQA = async (problemDescription: string) => {
    try {
      setTroubleshootingMode(true);
      setTroubleshootingSession({
        problemDescription,
        answers: []
      });

      // トラブルシューティングQA APIを呼び出し
      const response = await fetch(`/api/troubleshooting-qa/start`, {
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

        // 初期質問をメッセージとして追加
        sendMessage(qaResponse.question, [], true);
      } else {
        throw new Error('トラブルシューティングQAの開始に失敗しました');
      }
    } catch (error) {
      console.error('❌ トラブルシューティングQA開始エラー:', error);
      toast({
        title: "エラー",
        description: "トラブルシューティングQAの開始に失敗しました",
        variant: "destructive",
      });
    }
  };

  // トラブルシューティングQA回答処理
  const handleTroubleshootingAnswer = async (answer: string) => {
    if (!troubleshootingSession) return;

    try {
      // 回答をセッションに追加
      const updatedSession = {
        ...troubleshootingSession,
        answers: [...troubleshootingSession.answers, {
          stepId: `step_${Date.now()}`,
          answer,
          timestamp: new Date()
        }]
      };
      setTroubleshootingSession(updatedSession);

      // 回答をメッセージとして追加
      sendMessage(answer, [], false);

      // トラブルシューティングQA APIを呼び出し
      const response = await fetch(`/api/troubleshooting-qa/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          problemDescription: troubleshootingSession.problemDescription,
          previousAnswers: updatedSession.answers.slice(0, -1), // 現在の回答を除く
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
        throw new Error('回答の処理に失敗しました');
      }
    } catch (error) {
      console.error('❌ トラブルシューティングQA回答処理エラー:', error);
      toast({
        title: "エラー",
        description: "回答の処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  // メッセージ送信処理を拡張
  const handleSendMessage = async (content: string, media: any[] = []) => {
    if (!content.trim() && media.length === 0) return;

    // トラブルシューティングモードの場合は特別な処理
    if (troubleshootingMode && troubleshootingSession) {
      await handleTroubleshootingAnswer(content);
      return;
    }

    // --- AIサポート一問一答・多様化・重複防止 ---
    // 既存メッセージ履歴からAIサポートのやりとりを抽出
    const aiHistory = messages.filter(m => m.isAiResponse || !m.isAiResponse).map(m => m.content);
    // ユーザーの新しい回答を履歴に追加
    sendMessage(content, media, false);

    // 質問観点リスト（順序優先）
    const questionPoints = [
      { key: 'symptom', label: '機械の調子はいかがですか？', variations: [
        "機械の調子はいかがですか？",
        "何か気になる症状やトラブルはありますか？",
        "最近、機械で気になることはありませんか？"
      ] },
      { key: 'location', label: 'どこで発生していますか？', variations: ["どの部位・場所で発生していますか？","トラブルの箇所はどこですか？"] },
      { key: 'timing', label: 'いつから発生していますか？', variations: ["いつから症状が出ていますか？","発生時期を教えてください"] },
      { key: 'sound', label: '異音はありますか？', variations: ["異音はどこから聞こえますか？","音の種類や場所を教えてください"] },
      { key: 'warning', label: '警告やランプは点灯していますか？', variations: ["どんな警告やランプが点灯していますか？"] },
      { key: 'leak', label: '液体や油の漏れはありますか？', variations: ["何が漏れていますか？"] },
      { key: 'vibration', label: '振動はありますか？', variations: ["どこが振動していますか？"] },
      { key: 'safety', label: '現場は安全ですか？', variations: ["作業現場の安全は確保されていますか？"] },
      { key: 'tool', label: '必要な工具は揃っていますか？', variations: ["作業に必要な工具は揃っていますか？"] },
    ];

    // 既に質問・回答済みの観点を抽出
  const usedPoints: string[] = [];
    for (const msg of aiHistory) {
      for (const pt of questionPoints) {
        if (pt.variations.some(v => msg.includes(v)) || msg.includes(pt.label)) {
          usedPoints.push(pt.key);
        }
      }
    }

    // 直前のユーザー回答から新たな観点を推定
    const lastUser = content.trim();
    let nextPoint = null;
    for (const pt of questionPoints) {
      if (!usedPoints.includes(pt.key)) {
        // 回答内容に関連する観点を優先
        if (
          (pt.key === 'sound' && lastUser.match(/(異音|音|ガタガタ|キュルキュル)/)) ||
          (pt.key === 'warning' && lastUser.match(/(警告|ランプ|アラーム|点灯)/)) ||
          (pt.key === 'leak' && lastUser.match(/(漏れ|漏れる|液体|油|水)/)) ||
          (pt.key === 'vibration' && lastUser.match(/(振動|揺れ|ブルブル)/)) ||
          (pt.key === 'location' && lastUser.match(/(場所|部位|箇所|どこ)/)) ||
          (pt.key === 'timing' && lastUser.match(/(時期|いつ|発生|昨日|今日)/)) ||
          (pt.key === 'safety' && lastUser.match(/(安全|危険|怪我|火花)/)) ||
          (pt.key === 'tool' && lastUser.match(/(工具|道具|レンチ|ドライバー)/))
        ) {
          nextPoint = pt;
          break;
        }
      }
    }
    // まだ未質問の観点があれば順に質問
    if (!nextPoint) {
      nextPoint = questionPoints.find(pt => !usedPoints.includes(pt.key));
    }

    let nextQuestion = "";
    let suggestSolution = "";
    if (nextPoint) {
      // 最初の質問（symptom）は必ず親しみやすい文言で
      if (nextPoint.key === 'symptom' && aiHistory.length === 0) {
        const v = nextPoint.variations;
        nextQuestion = v[Math.floor(Math.random() * v.length)];
      } else {
        // 2問目以降はバリエーションからランダム
        const v = nextPoint.variations;
        nextQuestion = v[Math.floor(Math.random() * v.length)];
      }
    } else {
      // すべての観点を聞き終えたら応急処置案
      suggestSolution = "状況から推定される原因に応じて、\n・電源や配線の確認\n・異音箇所の点検\n・油や液体の漏れ止め\nなど、基本的な応急処置を行ってみてください。\nさらに詳しい手順が必要な場合は、現場の状況をもう少し教えてください。";
    }
    // 空レスポンスは追加しない
    if (suggestSolution) {
      sendMessage(suggestSolution, [], true);
    } else if (nextQuestion) {
      sendMessage(nextQuestion, [], true);
    }
  };

  // トラブルシューティングQA開始ボタンの追加
  const handleStartTroubleshooting = () => {
    const problemDescription = prompt('発生した事象を教えてください（例：エンジンが止まった、ブレーキが効かないなど）:');
    if (problemDescription && problemDescription.trim()) {
      startTroubleshootingQA(problemDescription.trim());
    }
  };

  // クリア機能
  const handleClearChat = async () => {
    try {
      await clearChatHistory();
      setTroubleshootingMode(false);
      setTroubleshootingSession(null);
      toast({
        title: "成功",
        description: "チャット履歴をクリアしました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "クリアに失敗しました",
        variant: "destructive",
      });
    }
  };

  // カメラモーダルの表示管理
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // AIサポートの質問生成（GPTとの一問一答チャット）
  const generateEmergencyQuestion = async (context: string, previousAnswers: string[]): Promise<{ question: string; options?: string[] }> => {
    // 使わない（handleSendMessageで一問一答・応急処置まで制御）
    return { question: "", options: [] };
  };

  // エクスポート機能
  const handleExportChat = async () => {
    try {
      // チャット履歴をエクスポート
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
      
      console.log('✅ チャット履歴をエクスポートしました');
    } catch (error) {
      console.error('❌ エクスポートエラー:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        {/* 左側：機種・機械番号選択 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="machine-type" className="text-sm font-medium text-gray-700">
              機種:
            </Label>
            <div className="relative">
              <Input
                id="machine-type"
                type="text"
                placeholder={isLoadingMachineTypes ? "読み込み中..." : "機種を選択..."}
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
                  // ドロップダウン内のクリックの場合は閉じない
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-type-dropdown')) {
                    return;
                  }
                  // 少し遅延させてクリックイベントが処理されるのを待つ
                  setTimeout(() => {
                    setShowMachineTypeSuggestions(false);
                  }, 150);
                }}
                disabled={isLoadingMachineTypes}
                className="w-48"
              />
              {(() => {
                console.log('🔍 機種ドロップダウン表示条件:', {
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
                          // マウスダウンイベントでブラウザのフォーカス変更を防ぐ
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
                       machineTypes.length === 0 ? "機種データを読み込み中..." : 
                       "機種を入力してください"}
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
                placeholder={isLoadingMachines ? "読み込み中..." : "機械番号を選択..."}
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
                  console.log('🔧 フォーカス時の状態:', {
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
                    console.log('✅ フォーカス時に機械番号リストを設定:', machines.length, '件');
                  } else {
                    console.log('⚠️ フォーカス時に機械番号がありません');
                  }
                }}
                onBlur={(e) => {
                  // ドロップダウン内のクリックの場合は閉じない
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-number-dropdown')) {
                    return;
                  }
                  // 少し遅延させてクリックイベントが処理されるのを待つ
                  setTimeout(() => {
                    setShowMachineNumberSuggestions(false);
                  }, 150);
                }}
                disabled={!selectedMachineType || isLoadingMachines}
                className="w-48"
              />
              {(() => {
                console.log('🔍 機械番号ドロップダウン表示条件:', {
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
                          // マウスダウンイベントでブラウザのフォーカス変更を防ぐ
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
                       selectedMachineType ? "この機種に登録されている機械番号がありません" : 
                       "先に機種を選択してください"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
    </div>

  {/* 中央：AIサポート・カメラ・応急処置ガイドボタン */}
        <div className="flex items-center gap-6">
          {/* AIサポート開始/終了ボタン */}
          {!interactiveDiagnosisMode ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handleStartAiSupport}
              disabled={isLoading}
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <Brain className="w-6 h-6 mr-3" />
              AIサポート
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAiSupportExit}
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <X className="w-6 h-6 mr-3" />
              AIサポート終了
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

          {/* 応急処置ガイドボタン */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleEmergencyGuide}
            disabled={isLoadingGuides}
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 mr-6 px-8 py-3 text-base font-semibold"
          >
            <Activity className="w-6 h-6 mr-3" />
            応急処置ガイド
          </Button>
  </div>

  {/* 右側：アクションボタン */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendToServer}
            disabled={isLoading || messages.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            サーバー送信
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

      {/* メインコンテンツエリア */}
      {/* メインコンテンツエリア：常に既存チャットUIのみ */}
      <>
        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isAiResponse ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl ${message.isAiResponse ? 'w-auto' : 'w-full'}`}>
                {message.isAiResponse && troubleshootingMode && troubleshootingSession?.currentQuestion === message.content ? (
                  // トラブルシューティングQAバブル
                  <TroubleshootingQABubble
                    question={message.content}
                    options={troubleshootingSession?.currentOptions || []}
                    reasoning={troubleshootingSession?.reasoning}
                    onAnswer={handleTroubleshootingAnswer}
                    isLoading={isLoading}
                  />
                ) : message.isAiResponse && (message.content.includes('解決策') || message.content.includes('緊急対応')) ? (
                  // 解決策バブル
                  <SolutionBubble
                    solution={message.content}
                    problemDescription={troubleshootingSession?.problemDescription}
                    isEmergency={message.content.includes('緊急対応')}
                  />
                ) : (
                  // 通常のメッセージバブル
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
                  <span className="text-gray-600">AIが応答を生成中...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* メッセージ入力エリア */}
        <div className="border-t bg-white p-4">
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={troubleshootingMode && !troubleshootingSession?.currentQuestion}
          />
        </div>
      </>

      {/* カメラモーダル */}
      <CameraModal />

      {/* 画像プレビューモーダル */}
      {showImagePreview && selectedImage && (
        <ImagePreviewModal />
      )}

      {/* 応急処置ガイドモーダル */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">応急処置ガイド</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitGuide}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                閉じる
              </Button>
            </div>
            
            {/* 検索機能 */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="ガイドを検索..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* キーワードボタン */}
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
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">説明</th>
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
            
            {/* 選択されたガイドの表示 */}
            {selectedGuideId && (
              <div className="mt-6">
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={() => setSelectedGuideId(null)}
                  backButtonText="一覧に戻る"
                  onSendToChat={() => {
                    console.log('応急処置ガイドをチャットに送信');
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
