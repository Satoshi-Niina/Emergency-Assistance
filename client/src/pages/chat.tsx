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
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft, X, Search, Send, Camera, Trash2, RefreshCw, Brain, Wrench, Database } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { searchTroubleshootingFlows, japaneseGuideTitles } from "../lib/troubleshooting-search";
import { QAAnswer } from "../lib/qa-flow-manager";
import TroubleshootingQABubble from "../components/chat/troubleshooting-qa-bubble";
import SolutionBubble from "../components/chat/solution-bubble";
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

  // AI支援システムの状態管理（Q&A統合版）
  const [aiSupportMode, setAiSupportMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [aiSupportAnswers, setAiSupportAnswers] = useState<string[]>([]);
  const [aiSupportCompleted, setAiSupportCompleted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  
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
    console.log('🔍 機械データ更新検知:', {
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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#machine-type') && !target.closest('#machine-number')) {
        setShowMachineTypeSuggestions(false);
        setShowMachineNumberSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // AI支援システムのセッション管理
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
        if (result.success) {
          console.log('✅ 機種一覧設定完了:', result.data.length, '件');
          console.log('✅ 機種データ:', result.data);
          setMachineTypes(result.data);
          setFilteredMachineTypes(result.data); // 初期表示用にも設定
        } else {
          console.error('❌ 機種一覧取得成功だがsuccess=false:', result);
          setMachineTypes([]);
          setFilteredMachineTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ 機種一覧取得エラー:', response.status, errorText);
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
    console.log('🔍 機種選択処理関数が呼び出されました');
    console.log('🔍 機種選択開始:', type);
    console.log('🔍 選択前の状態:', {
      selectedMachineType,
      machineTypeInput,
      showMachineTypeSuggestions
    });
    
    // 状態を確実に更新
    setSelectedMachineType(type.id);
    setMachineTypeInput(type.machine_type_name);
    setShowMachineTypeSuggestions(false);
    
    console.log('🔍 選択後の状態:', {
      selectedMachineType: type.id,
      machineTypeInput: type.machine_type_name,
      showMachineTypeSuggestions: false
    });
    
    // 機種変更時は機械番号をリセット
    setSelectedMachineNumber('');
    setMachineNumberInput('');
    setMachines([]);
    setFilteredMachines([]);
    
    // 対応する機械番号を取得
    fetchMachines(type.id);
    
    // デバッグ: 状態更新後の確認
    setTimeout(() => {
      console.log('🔍 機種選択後の状態確認:', {
        selectedMachineType: type.id,
        machineTypeInput: type.machine_type_name,
        showMachineTypeSuggestions: false
      });
    }, 0);
  };

  // 機械番号選択処理
  const handleMachineNumberSelect = (machine: {id: string, machine_number: string}) => {
    console.log('🔍 機械番号選択開始:', machine);
    console.log('🔍 選択前の状態:', {
      selectedMachineNumber,
      machineNumberInput,
      showMachineNumberSuggestions
    });
    
    // 状態を確実に更新
    setSelectedMachineNumber(machine.id);
    setMachineNumberInput(machine.machine_number);
    setShowMachineNumberSuggestions(false);
    
    console.log('🔍 選択後の状態:', {
      selectedMachineNumber: machine.id,
      machineNumberInput: machine.machine_number,
      showMachineNumberSuggestions: false
    });
    
    // デバッグ: 状態更新後の確認
    setTimeout(() => {
      console.log('🔍 機械番号選択後の状態確認:', {
        selectedMachineNumber: machine.id,
        machineNumberInput: machine.machine_number,
        showMachineNumberSuggestions: false
      });
    }, 0);
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
  }, []);

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
      initializeChat().catch(error => {
        console.error('❌ チャットID初期化エラー:', error);
      });
    }
    
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

  // 機種入力の状態変更を監視
  useEffect(() => {
    console.log('📊 機種入力状態更新:', {
      machineTypeInput,
      selectedMachineType
    });
  }, [machineTypeInput, selectedMachineType]);

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

  // 機械番号入力の状態変更を監視
  useEffect(() => {
    console.log('📊 機械番号入力状態更新:', {
      machineNumberInput,
      selectedMachineNumber
    });
  }, [machineNumberInput, selectedMachineNumber]);

  // 追加: Q&Aモードの初期化（動的質問生成システムに変更済み）

  // AI支援の回答処理
  const handleAiSupportAnswer = async (answer: string) => {
    try {
      const newAnswers = [...aiSupportAnswers, answer];
      setAiSupportAnswers(newAnswers);
      
      // 回答をメッセージとして追加
      const answerMessage = {
        id: Date.now(),
        content: answer,
        isAiResponse: false,
        senderId: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, answerMessage]);
      
      // 最低3つの質問を生成してから解決策を生成
      if (newAnswers.length < 3) {
        // 次の質問を生成
        const nextQuestion = await generateNextQuestion(answer, newAnswers);
        
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion.question);
          setCurrentOptions(nextQuestion.options || []);
          setCurrentQuestionIndex(prev => prev + 1);
          
          // 質問をメッセージとして追加
          const questionMessage = {
            id: Date.now() + 1,
            content: nextQuestion.question,
            isAiResponse: true,
            senderId: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, questionMessage]);
        }
      } else {
        // 3つ以上の回答が集まったら解決策を生成
        const solution = await generateSolution(newAnswers);
        setAiSupportCompleted(true);
        setCurrentQuestion("");
        setCurrentOptions([]);
        
        // 解決策をメッセージとして追加
        const solutionMessage = {
          id: Date.now(),
          content: solution,
          isAiResponse: true,
          senderId: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, solutionMessage]);
        
        toast({
          title: "AI支援完了",
          description: "解決策を生成しました",
        });
      }
    } catch (error) {
      console.error('AI支援回答エラー:', error);
      toast({
        title: "エラー",
        description: "回答の処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  // カメラボタンのクリック処理
  const handleCameraClick = () => {
    console.log('📸 カメラボタンがクリックされました');
    // カメラモーダルを開くイベントを発火
    window.dispatchEvent(new CustomEvent('open-camera'));

    // デバッグ用: イベントが正しく発火されたかを確認
    console.log('📸 open-camera イベントを発火しました');
  };

  // AI支援モード開始（統合版）
  const startAiSupport = async () => {
    setAiSupportMode(true);
    setCurrentQuestionIndex(0);
    setAiSupportAnswers([]);
    setAiSupportCompleted(false);
    
    // 初期メッセージを送信
    const initialMessage = "🤖 AI支援システムを開始します。\n\n発生した事象を教えてください。専門的なナレッジベースを活用して、問題の原因を特定し、具体的な解決策を提案します。";
    sendMessage(initialMessage, [], true);
    
    // 少し遅延してから初期質問を送信
    setTimeout(() => {
      const initialQuestion = "どのような事象が発生しましたか？\n\n※具体的な症状や状況を教えてください。\n例：「エンジンが始動しない」「ブレーキが効かない」「異音がする」など\n\n👉 発生した事象を教えてください：";
      setCurrentQuestion(initialQuestion);
      setCurrentOptions([
        "エンジンが始動しない",
        "ブレーキが効かない",
        "異音がする",
        "警告ランプが点灯する",
        "その他の問題"
      ]);
      
      // 初期質問をメッセージとして追加
      const questionMessage = {
        id: Date.now(),
        content: initialQuestion,
        isAiResponse: true,
        senderId: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, questionMessage]);
    }, 500);
  };

  // AI支援の質問生成
  const generateDynamicQuestion = async (context: string, previousAnswers: string[]): Promise<{ question: string; options?: string[] }> => {
    try {
      // 最低3つの質問を生成するまで続行
      if (previousAnswers.length >= 3) {
        return {
          question: "",
          options: []
        };
      }

      // 前の回答に基づいて次の質問を生成
      if (previousAnswers.length === 0) {
        return {
          question: "どのような事象が発生しましたか？\n\n※具体的な症状や状況を教えてください。",
          options: [
            "エンジンが始動しない",
            "ブレーキが効かない",
            "異音がする",
            "警告ランプが点灯する",
            "その他の問題"
          ]
        };
      } else if (previousAnswers.length === 1) {
        const firstAnswer = previousAnswers[0].toLowerCase();
        
        if (firstAnswer.includes("エンジン") && firstAnswer.includes("始動")) {
          return {
            question: "エンジンを始動しようとしたとき、どのような状態になりましたか？",
            options: [
              "キーを回しても何も起きない",
              "セルモーターは回るが、エンジンがかからない",
              "カチカチ音はするが、エンジンが動かない",
              "始動しかけるが、すぐ止まる",
              "異音や警告ランプが出た"
            ]
          };
        } else if (firstAnswer.includes("ブレーキ")) {
          return {
            question: "ブレーキの状態について、どのような症状がありますか？",
            options: [
              "ブレーキペダルが柔らかい",
              "ブレーキペダルが硬い",
              "ブレーキを踏んでも効かない",
              "ブレーキを踏むと異音がする",
              "ブレーキランプが点灯する"
            ]
          };
        } else if (firstAnswer.includes("異音")) {
          return {
            question: "どのような異音が聞こえますか？",
            options: [
              "エンジンから異音がする",
              "ブレーキから異音がする",
              "タイヤから異音がする",
              "ギアから異音がする",
              "その他の異音"
            ]
          };
        } else if (firstAnswer.includes("警告") || firstAnswer.includes("ランプ")) {
          return {
            question: "どのような警告ランプが点灯していますか？",
            options: [
              "エンジン警告ランプ",
              "オイル警告ランプ",
              "バッテリー警告ランプ",
              "ブレーキ警告ランプ",
              "その他の警告ランプ"
            ]
          };
        } else {
          return {
            question: "問題の詳細について教えてください。どのような症状がありますか？",
            options: [
              "動作しない",
              "動作が不安定",
              "異音がする",
              "警告が出る",
              "その他の症状"
            ]
          };
        }
      } else if (previousAnswers.length === 2) {
        // 3つ目の質問：具体的な状況や環境について
        return {
          question: "問題が発生した状況について教えてください。",
          options: [
            "作業中に発生",
            "起動時に発生",
            "運転中に発生",
            "停止中に発生",
            "その他の状況"
          ]
        };
      }

      return {
        question: "",
        options: []
      };
    } catch (error) {
      console.error('質問生成エラー:', error);
      return {
        question: "どのような問題が発生していますか？",
        options: []
      };
    }
  };

  // 次の質問生成
  const generateNextQuestion = async (currentAnswer: string, allAnswers: string[]): Promise<{ question: string; options?: string[] } | null> => {
    try {
      // ナレッジベースから関連情報を取得
      const knowledgeContext = await fetchKnowledgeContext();
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting-qa/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: currentAnswer,
          previousAnswers: allAnswers,
          knowledgeContext: knowledgeContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.question) {
          return {
            question: data.question,
            options: data.options || []
          };
        } else {
          return null; // 質問終了
        }
      } else {
        throw new Error('次の質問生成に失敗しました');
      }
    } catch (error) {
      console.error('次の質問生成エラー:', error);
      return null;
    }
  };

  // AI支援の解決策生成
  const generateSolution = async (allAnswers: string[]): Promise<string> => {
    try {
      // ナレッジベースから関連情報を取得
      const knowledgeContext = await fetchKnowledgeContext();
      
      // 回答内容を分析して解決策を生成
      const problemDescription = allAnswers.join('、');
      let solution = "";
      
      // エンジン関連の問題
      if (problemDescription.includes("エンジン") && problemDescription.includes("始動")) {
        solution = `🔧 エンジン始動問題の解決策

【確認事項】
1. バッテリー電圧の確認（12V以上必要）
2. 燃料残量の確認
3. エンジンオイルの確認

【対処方法】
1. バッテリー端子の清掃・締め付け確認
2. 燃料フィルターの確認・交換
3. スパークプラグの確認・清掃
4. エンジンオイルの確認・交換

【緊急時】
- バッテリーが弱い場合は、ブースターケーブルでの応急処置
- 燃料切れの場合は、燃料の補充

専門的な点検が必要な場合は、メーカーまたは専門業者に相談してください。`;
      }
      // ブレーキ関連の問題
      else if (problemDescription.includes("ブレーキ")) {
        solution = `🔧 ブレーキ問題の解決策

【確認事項】
1. ブレーキフルードの残量確認
2. ブレーキパッドの摩耗状況
3. ブレーキホースの損傷確認

【対処方法】
1. ブレーキフルードの補充・交換
2. ブレーキパッドの交換
3. ブレーキホースの交換
4. ブレーキシステムの空気抜き

【緊急時】
- ブレーキが効かない場合は、エンジンブレーキとサイドブレーキを併用
- 安全な場所に停車し、専門業者に連絡

安全のため、ブレーキの問題は早期に専門業者に相談してください。`;
      }
      // 異音の問題
      else if (problemDescription.includes("異音")) {
        solution = `🔧 異音問題の解決策

【確認事項】
1. 異音の発生箇所の特定
2. 異音の種類（金属音、摩擦音、振動音など）
3. 異音の発生タイミング

【対処方法】
1. ボルト・ナットの締め付け確認
2. ベルトの張り具合確認・交換
3. 潤滑油の確認・補充
4. 部品の摩耗・損傷確認

【緊急時】
- 大きな異音がする場合は、安全な場所に停車
- エンジンを停止し、専門業者に連絡

異音の原因特定には専門的な知識が必要です。専門業者に相談してください。`;
      }
      // 警告ランプの問題
      else if (problemDescription.includes("警告") || problemDescription.includes("ランプ")) {
        solution = `🔧 警告ランプ問題の解決策

【確認事項】
1. 点灯している警告ランプの種類
2. エンジンオイルの残量
3. 冷却水の残量
4. バッテリーの状態

【対処方法】
1. エンジンオイルの確認・補充
2. 冷却水の確認・補充
3. バッテリー端子の清掃・締め付け
4. フィルター類の確認・交換

【緊急時】
- 赤い警告ランプが点灯している場合は、即座にエンジンを停止
- 安全な場所に停車し、専門業者に連絡

警告ランプの点灯は重大な問題の可能性があります。専門業者に相談してください。`;
      }
      // その他の問題
      else {
        solution = `🔧 一般的な問題解決策

【確認事項】
1. 問題の発生状況の詳細確認
2. 使用環境・条件の確認
3. メンテナンス履歴の確認

【対処方法】
1. 基本的な点検項目の確認
2. 清掃・調整の実施
3. 消耗品の確認・交換
4. 設定値の確認・調整

【緊急時】
- 安全を最優先に行動
- 必要に応じて専門業者に連絡

問題の詳細な分析が必要です。専門業者に相談することをお勧めします。`;
      }
      
      // ナレッジベースの情報があれば追加
      if (knowledgeContext && knowledgeContext.length > 0) {
        solution += `\n\n📚 ナレッジベース情報：
${knowledgeContext.slice(0, 3).join('\n')}`;
      }
      
      return solution || "解決策を生成できませんでした。専門家に相談してください。";
    } catch (error) {
      console.error('解決策生成エラー:', error);
      return "解決策を生成できませんでした。専門家に相談してください。";
    }
  };

  // デフォルトの質問生成関数
  const generateDefaultQuestion = (context: string, previousAnswers: string[]): { question: string; options: string[] } => {
    if (previousAnswers.length === 0) {
      return {
        question: "どのような事象が発生しましたか？\n\n※具体的な症状や状況を教えてください。",
        options: [
          "エンジンが始動しない",
          "ブレーキが効かない",
          "異音がする",
          "警告ランプが点灯する",
          "その他の問題"
        ]
      };
    } else if (previousAnswers.length === 1) {
      // 最初の回答（発生事象）に基づいて次の質問を決定
      const firstAnswer = previousAnswers[0].toLowerCase();
      
      if (firstAnswer.includes("エンジン") && firstAnswer.includes("始動")) {
        return {
          question: "エンジンを始動しようとしたとき、どのような状態になりましたか？",
          options: [
            "キーを回しても何も起きない",
            "セルモーターは回るが、エンジンがかからない",
            "カチカチ音はするが、エンジンが動かない",
            "始動しかけるが、すぐ止まる",
            "異音や警告ランプが出た"
          ]
        };
      } else if (firstAnswer.includes("ブレーキ")) {
        return {
          question: "ブレーキの状態について、どのような症状がありますか？",
          options: [
            "ブレーキペダルが柔らかい",
            "ブレーキペダルが硬い",
            "ブレーキを踏んでも効かない",
            "ブレーキを踏むと異音がする",
            "ブレーキランプが点灯する"
          ]
        };
      } else if (firstAnswer.includes("異音")) {
        return {
          question: "どのような異音が聞こえますか？",
          options: [
            "エンジンから異音がする",
            "ブレーキから異音がする",
            "タイヤから異音がする",
            "ギアから異音がする",
            "その他の異音"
          ]
        };
      } else if (firstAnswer.includes("警告") || firstAnswer.includes("ランプ")) {
        return {
          question: "どのような警告ランプが点灯していますか？",
          options: [
            "エンジン警告ランプ",
            "オイル警告ランプ",
            "バッテリー警告ランプ",
            "ブレーキ警告ランプ",
            "その他の警告ランプ"
          ]
        };
      } else {
        return {
          question: "問題の詳細について教えてください。どのような症状がありますか？",
          options: [
            "動作しない",
            "動作が不安定",
            "異音がする",
            "警告が出る",
            "その他の症状"
          ]
        };
      }
    } else if (previousAnswers.length === 2) {
      // 2つ目の回答に基づいて次の質問を決定
      const secondAnswer = previousAnswers[1].toLowerCase();
      
      if (secondAnswer.includes("何も起きない") || secondAnswer.includes("無反応")) {
        return {
          question: "バッテリーの状態を確認してください。どのような状態ですか？",
          options: [
            "バッテリーが弱い（電圧が低い）",
            "バッテリーは正常（電圧は12V以上）",
            "バッテリー端子が緩んでいる",
            "バッテリー端子が腐食している",
            "その他"
          ]
        };
      } else if (secondAnswer.includes("セルモーター") || secondAnswer.includes("セルが回る")) {
        return {
          question: "燃料の状態を確認してください。どのような状態ですか？",
          options: [
            "燃料が不足している",
            "燃料は十分にある",
            "燃料フィルターが詰まっている可能性",
            "燃料ポンプの音がしない",
            "その他"
          ]
        };
      } else if (secondAnswer.includes("カチカチ") || secondAnswer.includes("音がする")) {
        return {
          question: "バッテリーの状態を確認してください。どのような状態ですか？",
          options: [
            "バッテリーが弱い（電圧が低い）",
            "バッテリーは正常（電圧は12V以上）",
            "バッテリー端子が緩んでいる",
            "バッテリー端子が腐食している",
            "その他"
          ]
        };
      } else if (secondAnswer.includes("すぐ止まる") || secondAnswer.includes("始動しかける")) {
        return {
          question: "エンジンが始動した後、どのくらいの時間で止まりますか？",
          options: [
            "数秒で止まる",
            "10-30秒程度で止まる",
            "1分以上動くが不安定",
            "アイドリングは安定している",
            "その他"
          ]
        };
      } else {
        return {
          question: "現在の状況で最も重要な確認事項は？",
          options: [
            "バッテリー電圧の確認",
            "燃料残量の確認",
            "エンジンオイルの確認",
            "エアフィルターの確認",
            "その他"
          ]
        };
      }
    } else if (previousAnswers.length === 3) {
      // 3つ目の回答に基づいて次の質問を決定
      const thirdAnswer = previousAnswers[2].toLowerCase();
      
      if (thirdAnswer.includes("バッテリー")) {
        return {
          question: "バッテリーの対処を行いましたか？どのような対応をしましたか？",
          options: [
            "バッテリーを充電した",
            "バッテリー端子を清掃・締め直した",
            "新しいバッテリーに交換した",
            "まだ何もしていない",
            "その他"
          ]
        };
      } else if (thirdAnswer.includes("燃料")) {
        return {
          question: "燃料の対処を行いましたか？どのような対応をしましたか？",
          options: [
            "燃料を補給した",
            "燃料フィルターを交換した",
            "燃料ポンプを確認した",
            "まだ何もしていない",
            "その他"
          ]
        };
      } else {
        return {
          question: "これまでの対応で状況は改善しましたか？",
          options: [
            "完全に解決した",
            "一部改善したが、まだ問題がある",
            "変化なし",
            "悪化した",
            "その他"
          ]
        };
      }
    } else {
      return {
        question: "これまでの対応で状況は改善しましたか？",
        options: [
          "完全に解決した",
          "一部改善したが、まだ問題がある",
          "変化なし",
          "悪化した",
          "その他"
        ]
      };
    }
  };



  // デフォルト解決策生成関数
  const generateDefaultSolution = (allAnswers: string[]): string => {
    const problemDescription = allAnswers.join(' ');
    
    // 回答内容に基づいて具体的な解決策を生成
    let specificSolution = "";
    
    if (allAnswers.length >= 1) {
      const firstAnswer = allAnswers[0].toLowerCase();
      
      if (firstAnswer.includes("何も起きない") || firstAnswer.includes("無反応")) {
        specificSolution = `
### 🔋 バッテリー関連の対処
1. **バッテリー電圧の確認**
   - マルチメーターでバッテリー電圧を測定
   - 12V未満の場合は充電または交換が必要

2. **バッテリー端子の確認**
   - 端子の緩みや腐食をチェック
   - 必要に応じて清掃・締め直し

3. **充電器での充電**
   - 適切な充電器を使用
   - 過充電に注意
`;
      } else if (firstAnswer.includes("セルモーター") || firstAnswer.includes("セルが回る")) {
        specificSolution = `
### ⛽ 燃料系の対処
1. **燃料残量の確認**
   - 燃料ゲージの確認
   - 必要に応じて燃料補給

2. **燃料フィルターの確認**
   - フィルターの詰まりチェック
   - 必要に応じて交換

3. **燃料ポンプの確認**
   - ポンプの動作音を確認
   - 異常がある場合は専門家に相談
`;
      } else if (firstAnswer.includes("カチカチ") || firstAnswer.includes("音がする")) {
        specificSolution = `
### 🔋 バッテリー関連の対処
1. **バッテリー電圧の確認**
   - マルチメーターでバッテリー電圧を測定
   - 12V未満の場合は充電または交換が必要

2. **バッテリー端子の確認**
   - 端子の緩みや腐食をチェック
   - 必要に応じて清掃・締め直し

3. **充電器での充電**
   - 適切な充電器を使用
   - 過充電に注意
`;
      } else if (firstAnswer.includes("すぐ止まる") || firstAnswer.includes("始動しかける")) {
        specificSolution = `
### 🔧 エンジン系の対処
1. **燃料供給の確認**
   - 燃料ポンプの動作確認
   - 燃料フィルターの状態確認

2. **点火系の確認**
   - スパークプラグの状態確認
   - 点火コイルの動作確認

3. **エアフィルターの確認**
   - フィルターの詰まりチェック
   - 必要に応じて清掃・交換
`;
      } else {
        specificSolution = `
### 🔍 一般的な対処
1. **基本確認**
   - バッテリー電圧の確認
   - 燃料残量の確認
   - エアフィルターの状態確認

2. **段階的診断**
   - キーを回したときの反応確認
   - パネルランプの点灯状況
   - セルモーターの動作確認
`;
      }
    }
    
    return `## 🔍 問題の特定
保守用車のエンジン停止に関する問題が発生しています。

**症状**: ${allAnswers.join(' → ')}

## ⚠️ 安全確認
1. 作業環境の安全確認
2. 適切な安全装備の着用
3. 作業前の機器停止確認
4. 作業中の安全確保

## 🛠️ 具体的な処置手順

${specificSolution}

### 📋 作業手順
1. **作業前の準備**
   - 安全装備の着用
   - 作業環境の確認
   - 工具の準備

2. **段階的診断**
   - 症状の詳細確認
   - 原因の特定
   - 対処方法の決定

3. **対処実施**
   - 安全に配慮した作業
   - 段階的な確認
   - 結果の検証

## 🚨 注意事項
- 作業前の安全確認を必ず実施
- 専門知識が必要な場合は専門家に相談
- 緊急時は安全を最優先に行動
- 作業後は必ず動作確認を実施

## 📞 専門家への相談
以下の場合は専門家に相談してください：
- 作業に自信がない場合
- 安全上の懸念がある場合
- 問題が解決しない場合
- 緊急対応が必要な場合
`;
  };



  // ナレッジベースから関連情報を取得
  const fetchKnowledgeContext = async (query?: string): Promise<string[]> => {
    try {
      // 検索クエリがない場合は、現在の回答から自動生成
      let searchQuery = query;
      if (!searchQuery && aiSupportAnswers.length > 0) {
        // 最新の回答からキーワードを抽出
        const latestAnswer = aiSupportAnswers[aiSupportAnswers.length - 1];
        searchQuery = `${latestAnswer} 保守用車 トラブルシューティング`;
      } else if (!searchQuery) {
        searchQuery = "保守用車 トラブルシューティング 故障診断";
      }

      console.log('🔍 ナレッジベース検索開始:', searchQuery);

      // 複数の検索エンドポイントを試行
      const searchEndpoints = [
        `${import.meta.env.VITE_API_BASE_URL}/api/knowledge-base/search?query=${encodeURIComponent(searchQuery)}`,
        `${import.meta.env.VITE_API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`,
        `${import.meta.env.VITE_API_BASE_URL}/api/knowledge?q=${encodeURIComponent(searchQuery)}`
      ];

      let results: any[] = [];
      
      for (const endpoint of searchEndpoints) {
        try {
          const response = await fetch(endpoint, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            const endpointResults = data.results || data.data || [];
            
            if (endpointResults.length > 0) {
              results = endpointResults;
              console.log(`✅ ナレッジベース検索成功 (${endpoint}): ${results.length}件`);
              break;
            }
          }
        } catch (error) {
          console.log(`❌ ナレッジベース検索エンドポイント ${endpoint} でエラー:`, error);
          continue;
        }
      }
      
      // 結果がない場合は、基本的なキーワードで再検索
      if (results.length === 0) {
        console.log('⚠️ 検索結果が0件のため、フォールバック検索を実行');
        const fallbackQuery = "保守用車 マニュアル 整備 点検";
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/knowledge-base/search?query=${encodeURIComponent(fallbackQuery)}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            results = data.results || [];
            console.log(`✅ フォールバック検索成功: ${results.length}件`);
          }
        } catch (error) {
          console.error('❌ フォールバック検索エラー:', error);
        }
      }
      
      // それでも結果がない場合は、デフォルトのナレッジ情報を提供
      if (results.length === 0) {
        console.log('⚠️ ナレッジベース検索が失敗したため、デフォルト情報を使用');
        return [
          "保守用車マニュアル: エンジン始動不良の基本的な対処法",
          "保守用車整備ガイド: バッテリー、燃料、エアフィルターの点検手順",
          "トラブルシューティング: 段階的な故障診断の手順",
          "安全作業指針: 作業前の安全確認事項",
          "緊急対応: 専門家への連絡方法と緊急時の対処法"
        ];
      }
      
      // 関連性の高い情報のみを返す（最大5件）
      return results.slice(0, 5).map((item: any) => {
        const title = item.title || item.metadata?.title || '';
        const content = item.text || item.content || '';
        const similarity = item.similarity ? ` (関連度: ${Math.round(item.similarity * 100)}%)` : '';
        return `${title}${similarity}: ${content.substring(0, 200)}...`;
      });
    } catch (error) {
      console.error('❌ ナレッジベース取得エラー:', error);
      // エラー時もデフォルト情報を返す
      return [
        "保守用車マニュアル: エンジン始動不良の基本的な対処法",
        "保守用車整備ガイド: バッテリー、燃料、エアフィルターの点検手順",
        "トラブルシューティング: 段階的な故障診断の手順",
        "安全作業指針: 作業前の安全確認事項",
        "緊急対応: 専門家への連絡方法と緊急時の対処法"
      ];
    }
  };

  // AI支援の完了処理（統合版）
  const handleAiSupportComplete = async (solution: string, allAnswers: string[]) => {
    // 解決策をチャットに追加
    sendMessage(solution, [], true);
    
    // 学習データを生成・保存
    try {
      await generateLearningData(allAnswers, solution);
    } catch (error) {
      console.error('学習データ生成エラー:', error);
    }
    
    // セッションデータを保存
    setAiSupportSessionData({
      answers: allAnswers,
      solution,
      knowledgeContext: [],
      questions: [currentQuestion]
    });
    
    // AI支援モードを終了
    setAiSupportMode(false);
    
    toast({
      title: "問題解決完了",
      description: "AI支援による問題解決が完了しました。学習データも保存されました。",
    });
  };

  // 学習データの生成・保存
  const generateLearningData = async (answers: string[], solution: string) => {
    try {
      const question = answers.join(' ');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/qa-learning/generate-learning-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          question: question,
          answer: answers.join(' | '),
          solution: solution,
          success: true,
          category: 'troubleshooting',
          machineType: selectedMachineType,
          machineNumber: selectedMachineNumber,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('学習データ生成成功:', result);
      } else {
        console.error('学習データ生成失敗:', response.status);
      }
    } catch (error) {
      console.error('学習データ生成エラー:', error);
    }
  };

  // AI支援モード終了
  const handleAiSupportExit = () => {
    setAiSupportMode(false);
    setAiSupportAnswers([]);
    setAiSupportCompleted(false);
    setCurrentQuestionIndex(0);
    setCurrentQuestion("");
    setCurrentOptions([]);
    
    toast({
      title: "AI支援終了",
      description: "AI支援モードを終了しました",
    });
  };

  // AI支援のリセット処理
  const handleAiSupportReset = () => {
    setAiSupportMode(false);
    setAiSupportSessionData(null);
    setCurrentQuestionIndex(0);
    setAiSupportAnswers([]);
    setAiSupportCompleted(false);
    setCurrentQuestion("");
    
    toast({
      title: "AI支援リセット",
      description: "AI支援セッションをリセットしました。",
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
      console.log('送信前の状態確認:', {
        chatId: chatId,
        messagesLength: messages.length,
        hasChatId: !!chatId,
        hasMessages: messages.length > 0
      });

      // より詳細な条件チェック
      const hasValidChatId = !!chatId;
      const hasMessages = messages.length > 0;
      const hasValidMessages = messages.some(msg => msg.content && msg.content.trim());
      
      console.log('送信条件チェック:', {
        hasValidChatId,
        hasMessages,
        hasValidMessages,
        messagesCount: messages.length,
        messagesWithContent: messages.filter(msg => msg.content && msg.content.trim()).length
      });

      if (!hasValidChatId) {
        console.log('送信エラー: チャットIDが無効 - 初期化を試行');
        try {
          // チャットIDが無効な場合は初期化を試行
          const newChatId = await initializeChat();
          if (newChatId) {
            console.log('チャットID初期化成功:', newChatId);
            // 初期化成功後、再度送信処理を実行
            setTimeout(() => {
              handleSendToServer();
            }, 100);
            return;
          } else {
            console.log('チャットID初期化失敗');
            toast({
              title: "送信エラー",
              description: "チャットIDの初期化に失敗しました。",
              variant: "destructive",
            });
            return;
          }
        } catch (initError) {
          console.error('チャットID初期化エラー:', initError);
          toast({
            title: "送信エラー",
            description: "チャットIDの初期化に失敗しました。",
            variant: "destructive",
          });
          return;
        }
      }

      if (!hasValidMessages) {
        console.log('送信エラー: 有効なメッセージがありません');
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
          media: msg.media?.map(media => ({
            id: media.id,
            type: media.type,
            url: media.url,
            title: media.title,
            fileName: media.fileName || ''
          })) || []
        }))
      };

      console.log('送信データ:', {
        chatId: chatData.chatId,
        messageCount: chatData.messages.length,
        machineInfo: chatData.machineInfo
      });

      // サーバーに送信（開発環境ではテスト用エンドポイントを使用）
      const isDevelopment = import.meta.env.NODE_ENV === 'development';
      const apiUrl = isDevelopment 
        ? `${import.meta.env.VITE_API_BASE_URL}/api/chats/${chatId}/send-test`
        : `${import.meta.env.VITE_API_BASE_URL}/api/chats/${chatId}/send`;
      
      console.log('送信URL:', apiUrl);
      console.log('開発環境:', isDevelopment);
      console.log('送信データ詳細:', JSON.stringify(chatData, null, 2));

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

      console.log('送信レスポンス:', {
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
        
        toast({
          title: "送信成功",
          description: `チャット内容をサーバーに送信しました。(${messages.filter(msg => msg.content && msg.content.trim()).length}件のメッセージ)${machineInfoText}`,
        });
        console.log('サーバー送信結果:', result);

        // 送信完了後にチャットをクリア
        await clearChatHistory();
        
        // AI支援モードの状態もリセット
        setAiSupportMode(false);
        setCurrentQuestionIndex(0);
        setAiSupportAnswers([]);
        setAiSupportCompleted(false);
        setCurrentQuestion("");
        
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
      } else {
        // エラーレスポンスの詳細を取得
        let errorMessage = `送信失敗: ${response.status} ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.error || '';
        } catch (parseError) {
          console.warn('エラーレスポンスの解析に失敗:', parseError);
        }
        
        // より詳細なエラーメッセージを構築
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n詳細: ${errorDetails}`
          : errorMessage;
        
        throw new Error(fullErrorMessage);
      }
    } catch (error) {
      console.error('サーバー送信エラー:', error);
      toast({
        title: "送信エラー",
        description: error instanceof Error ? error.message : "サーバーへの送信に失敗しました。",
        variant: "destructive",
      });
    }
  };

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
          setMessages(prev => [...prev, ...importedData.messages]);
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list`);
      
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

  // AI支援開始関数
  const handleStartAiSupport = async () => {
    try {
      setAiSupportMode(true);
      setAiSupportAnswers([]);
      setAiSupportCompleted(false);
      setCurrentQuestionIndex(0);
      
      // 最初の質問を生成
      const firstQuestion = await generateDynamicQuestion("", []);
      if (firstQuestion) {
        setCurrentQuestion(firstQuestion.question);
        setCurrentOptions(firstQuestion.options || []);
      } else {
        // デフォルトの質問
        setCurrentQuestion("どのような問題が発生していますか？");
        setCurrentOptions([]);
      }
      
      toast({
        title: "AI支援開始",
        description: "AIが問題解決をサポートします",
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

  // トラブルシューティングQA開始
  const startTroubleshootingQA = async (problemDescription: string) => {
    try {
      setTroubleshootingMode(true);
      setTroubleshootingSession({
        problemDescription,
        answers: []
      });

      // トラブルシューティングQA APIを呼び出し
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting-qa/start`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting-qa/answer`, {
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

    // AI支援モードの場合は特別な処理
    if (aiSupportMode && currentQuestion) {
      await handleAiSupportAnswer(content);
      return;
    }

    // トラブルシューティングモードの場合は特別な処理
    if (troubleshootingMode && troubleshootingSession) {
      await handleTroubleshootingAnswer(content);
      return;
    }

    // 通常のメッセージ送信処理
    sendMessage(content, media, false);
  };

  // トラブルシューティングQA開始ボタンの追加
  const handleStartTroubleshooting = () => {
    const problemDescription = prompt('発生した事象を教えてください（例：エンジンが止まった、ブレーキが効かないなど）:');
    if (problemDescription && problemDescription.trim()) {
      startTroubleshootingQA(problemDescription.trim());
    }
  };

  // エクスポート機能
  const handleExportChat = async () => {
    try {
      await exportChatHistory();
      toast({
        title: "成功",
        description: "チャット履歴をエクスポートしました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "エクスポートに失敗しました",
        variant: "destructive",
      });
    }
  };

  // クリア機能
  const handleClearChat = async () => {
    try {
      await clearChatHistory();
      setTroubleshootingMode(false);
      setTroubleshootingSession(null);
      setAiSupportMode(false);
      setAiSupportAnswers([]);
      setAiSupportCompleted(false);
      setCurrentQuestionIndex(0);
      setCurrentQuestion("");
      setCurrentOptions([]);
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
                disabled={isLoadingMachineTypes}
                className="w-48"
              />
              {showMachineTypeSuggestions && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {console.log('🔍 ドロップダウン表示条件:', {
                    showMachineTypeSuggestions,
                    filteredMachineTypesCount: filteredMachineTypes.length,
                    filteredMachineTypes: filteredMachineTypes
                  })}
                  {filteredMachineTypes.length > 0 ? (
                    filteredMachineTypes.map((type) => (
                      <div
                        key={type.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔍 機種クリックイベント発火:', type);
                          handleMachineTypeSelect(type);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                      >
                        {type.machine_type_name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineTypeInput.trim() ? "該当する機種が見つかりません" : "機種を入力してください"}
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
                  setShowMachineNumberSuggestions(true);
                  // フォーカス時に全機械番号を表示
                  if (machines.length > 0) {
                    setFilteredMachines(machines);
                  }
                }}
                disabled={!selectedMachineType || isLoadingMachines}
                className="w-48"
              />
              {showMachineNumberSuggestions && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredMachines.length > 0 ? (
                    filteredMachines.map((machine) => (
                      <div
                        key={machine.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔍 機械番号クリックイベント発火:', machine);
                          handleMachineNumberSelect(machine);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                      >
                        {machine.machine_number}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineNumberInput.trim() ? "該当する機械番号が見つかりません" : "機械番号を入力してください"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 中央：AI支援・カメラ・応急処置ガイドボタン */}
        <div className="flex items-center gap-6">
          {/* AI支援開始/終了ボタン */}
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
              AI支援終了
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
        
        {/* 右側：サーバー送信・クリアボタン */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportChat}
            disabled={isLoading || messages.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
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
        
        {/* AI支援モードの質問表示 */}
        {aiSupportMode && currentQuestion && !aiSupportCompleted && (
          <div className="flex justify-end">
            <div className="max-w-2xl w-auto">
              <TroubleshootingQABubble
                question={currentQuestion}
                options={currentOptions}
                onAnswer={handleAiSupportAnswer}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
        
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

      {/* カメラモーダル */}
      <CameraModal />

      {/* 画像プレビューモーダル */}
      {showImagePreview && selectedImage && (
        <ImagePreviewModal
          image={selectedImage}
          onClose={() => setShowImagePreview(false)}
          onConfirm={(imageData) => {
            // 画像確認処理
            console.log('画像確認:', imageData);
            setShowImagePreview(false);
          }}
        />
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
                <X className="w-4 h-4" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGuides.map((guide) => (
                  <Card
                    key={guide.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedGuideId === guide.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleSelectGuide(guide.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{guide.description}</p>
                      {guide.keyword && (
                        <div className="mt-2">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {guide.keyword}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* 選択されたガイドの表示 */}
            {selectedGuideId && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGuideId(null)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    一覧に戻る
                  </Button>
                </div>
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={handleExitGuide}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
