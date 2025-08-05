import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";
import KeywordButtons from "../components/troubleshooting/keyword-buttons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft, X, Search, Send, Camera, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { searchTroubleshootingFlows, japaneseGuideTitles } from "../lib/troubleshooting-search";

export default function ChatPage() {
  try {
    const {
      messages,
      sendMessage,
      isLoading,
      clearChatHistory,
      isClearing,
      chatId
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

  // 追加: Q&A形式のチャット状態管理
  const [qaMode, setQaMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [qaAnswers, setQaAnswers] = useState<string[]>([]);
  const [qaCompleted, setQaCompleted] = useState(false);
  
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

  // 機種データの初期読み込み
  useEffect(() => {
    fetchMachineTypes();
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.machine-dropdown')) {
        setShowMachineTypeSuggestions(false);
        setShowMachineNumberSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Q&A質問を設定から読み込み
  const [qaQuestions, setQaQuestions] = useState<string[]>([
    "発生した状況は？",
    "どこか想定される？",
    "どのような処置しましたか？"
  ]);

  // 設定からQ&A質問を読み込む
  useEffect(() => {
    const loadQaQuestions = () => {
      try {
        const savedSettings = localStorage.getItem('emergencyRecoverySettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.qaQuestions && Array.isArray(settings.qaQuestions)) {
            setQaQuestions(settings.qaQuestions);
          }
        }
      } catch (error) {
        console.error('Q&A質問の読み込みに失敗しました:', error);
      }
    };

    loadQaQuestions();

    // 設定変更を監視するイベントリスナー
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'emergencyRecoverySettings') {
        loadQaQuestions();
      }
    };

    // カスタムイベントで設定変更を監視
    const handleSettingsChanged = (e: CustomEvent) => {
      if (e.detail && e.detail.qaQuestions) {
        setQaQuestions(e.detail.qaQuestions);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsChanged', handleSettingsChanged as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsChanged', handleSettingsChanged as EventListener);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 追加: 機種一覧を取得する関数（設定UIと同じAPIを使用）
  const fetchMachineTypes = useCallback(async () => {
    try {
      setIsLoadingMachineTypes(true);
      // プロキシ経由でアクセス（相対パスを使用）
      const apiUrl = '/api/machines/machine-types';
      console.log('🔍 機種一覧取得開始:', apiUrl);
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
          setMachineTypes(result.data);
        } else {
          console.error('❌ 機種一覧取得成功だがsuccess=false:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ 機種一覧取得エラー:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ 機種一覧取得エラー:', error);
      // エラーが発生してもチャット画面は表示されるようにする
    } finally {
      setIsLoadingMachineTypes(false);
    }
  }, []);

  // 機種入力のフィルタリング
  const filterMachineTypes = (input: string) => {
    if (!input.trim()) {
      setFilteredMachineTypes([]);
      return;
    }
    
    const filtered = machineTypes.filter(type => 
      type.machine_type_name.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredMachineTypes(filtered);
  };

  // 機械番号入力のフィルタリング
  const filterMachines = (input: string) => {
    if (!input.trim()) {
      setFilteredMachines([]);
      return;
    }
    
    const filtered = machines.filter(machine => 
      machine.machine_number.toLowerCase().includes(input.toLowerCase())
    );
    setFilteredMachines(filtered);
  };

  // 機種選択処理
  const handleMachineTypeSelect = (type: {id: string, machine_type_name: string}) => {
    console.log('🔍 機種選択:', type);
    setSelectedMachineType(type.id);
    setMachineTypeInput(type.machine_type_name);
    setShowMachineTypeSuggestions(false);
    setFilteredMachineTypes([]);
    
    // 機種変更時は機械番号をリセット
    setSelectedMachineNumber('');
    setMachineNumberInput('');
    setFilteredMachines([]);
    
    // 対応する機械番号を取得
    fetchMachines(type.id);
  };

  // 機械番号選択処理
  const handleMachineNumberSelect = (machine: {id: string, machine_number: string}) => {
    console.log('🔍 機械番号選択:', machine);
    setSelectedMachineNumber(machine.id);
    setMachineNumberInput(machine.machine_number);
    setShowMachineNumberSuggestions(false);
    setFilteredMachines([]);
  };

  // 追加: 指定機種に紐づく機械番号一覧を取得する関数（設定UIと同じAPIを使用）
  const fetchMachines = useCallback(async (typeId: string) => {
    try {
      setIsLoadingMachines(true);
      // プロキシ経由でアクセス（相対パスを使用）
      const apiUrl = `/api/machines/machines?type_id=${typeId}`;
      console.log('🔍 機械番号一覧取得開始, 機種ID:', typeId);
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
          setMachines(result.data);
        } else {
          console.error('❌ 機械番号一覧取得成功だがsuccess=false:', result);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ 機械番号一覧取得エラー:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ 機械番号一覧取得エラー:', error);
      // エラーが発生してもチャット画面は表示されるようにする
    } finally {
      setIsLoadingMachines(false);
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
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // コンポーネントマウント時に機種データを取得
  useEffect(() => {
    console.log('🚀 チャットページマウント - 機種データ取得開始');
    // エラーハンドリングを追加
    fetchMachineTypes().catch(error => {
      console.error('❌ 機種データ取得でエラーが発生しましたが、チャット画面は表示されます:', error);
    });
  }, [fetchMachineTypes]);

  // 機種データの状態変更を監視（デバッグ用）- 一時的に無効化
  // useEffect(() => {
  //   console.log('📊 機種データ状態更新:', {
  //     machineTypesCount: machineTypes.length,
  //     selectedMachineType,
  //     machineTypeInput,
  //     isLoadingMachineTypes
  //   });
  // }, [machineTypes.length, selectedMachineType, machineTypeInput, isLoadingMachineTypes]);

  // 機械番号データの状態変更を監視（デバッグ用）- 一時的に無効化
  // useEffect(() => {
  //   console.log('📊 機械番号データ状態更新:', {
  //     machinesCount: machines.length,
  //     selectedMachineNumber,
  //     machineNumberInput,
  //     isLoadingMachines
  //   });
  // }, [machines.length, selectedMachineNumber, machineNumberInput, isLoadingMachines]);



  // 追加: Q&Aモードの初期化（一時的に無効化）
  // useEffect(() => {
  //   if (qaMode && currentQuestionIndex === 0 && qaAnswers.length === 0) {
  //     // 最初の質問を表示（右側に表示するためisAiResponse=false）
  //     sendMessage(qaQuestions[0]);
  //   }
  // }, [qaMode, currentQuestionIndex, qaAnswers.length, sendMessage]);

  // 追加: Q&A回答処理
  const handleQaAnswer = (answer: string) => {
    const newAnswers = [...qaAnswers, answer];
    setQaAnswers(newAnswers);
    
    // 回答をチャットに追加（左側に表示）
    sendMessage(answer, undefined, false);
    
    // 次の質問があるかチェック
    if (currentQuestionIndex < qaQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // 次の質問を表示（右側に表示するためisAiResponse=true）
      setTimeout(() => {
        sendMessage(qaQuestions[nextIndex], undefined, true);
      }, 500);
    } else {
      // 質問終了
      setQaCompleted(true);
      setTimeout(() => {
        sendMessage("入力ありがとうございました。応急処置情報を記録しました。", undefined, true);
        setQaMode(false);
        setCurrentQuestionIndex(0);
        setQaAnswers([]);
        setQaCompleted(false);
      }, 1000);
    }
  };

  // 追加: Q&Aモード開始
  const startQaMode = () => {
    setQaMode(true);
    setCurrentQuestionIndex(0);
    setQaAnswers([]);
    setQaCompleted(false);
    
    // 最初の質問を表示（右側に表示するためisAiResponse=true）
    setTimeout(() => {
      sendMessage(qaQuestions[0], undefined, true);
    }, 100);
  };

  const handleExport = async () => {
    try {
      await exportChat();
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
      if (!chatId || messages.length === 0) {
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

      // サーバーに送信
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chats/${chatId}/export`, {
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

      if (response.ok) {
        const result = await response.json();
        
        // 機種と機械番号の情報を含む送信成功メッセージ
        const machineInfoText = selectedMachineType && selectedMachineNumber 
          ? ` (機種: ${machineTypeInput}, 機械番号: ${machineNumberInput})`
          : '';
        
        toast({
          title: "送信成功",
          description: `チャット内容をサーバーに送信しました。(${messages.length}件のメッセージ)${machineInfoText}`,
        });
        console.log('サーバー送信結果:', result);
        console.log('送信された機種情報:', {
          selectedMachineType,
          selectedMachineNumber,
          machineTypeName: machineTypeInput,
          machineNumber: machineNumberInput
        });

        // 送信完了後にチャットをクリア
        await clearChatHistory();
        
        // Q&Aモードの状態もリセット
        setQaMode(false);
        setCurrentQuestionIndex(0);
        setQaAnswers([]);
        setQaCompleted(false);
        
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
        throw new Error(`送信失敗: ${response.status}`);
      }
    } catch (error) {
      console.error('サーバー送信エラー:', error);
      toast({
        title: "送信エラー",
        description: "サーバーへの送信に失敗しました。",
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
        await importChat(file);
        toast({
          title: "インポート成功",
          description: "チャット履歴をインポートしました。",
        });
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

  const fetchAvailableGuides = async () => {
    try {
      setIsLoadingGuides(true);
      console.log('🔄 応急処置データ一覧の取得を開始');

      // トラブルシューティングデータの取得
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const troubleshootingData = await response.json();
        console.log('✅ トラブルシューティングデータ取得:', troubleshootingData.length + '件');

        // データを整形して表示用にフォーマット
        const formattedGuides = troubleshootingData.map((item: any) => ({
          id: item.id,
          title: item.title || japaneseGuideTitles[item.id] || item.id,
          description: item.description || '',
          keyword: item.keyword || '',
          steps: item.steps || [],
          fileName: item.fileName || '',
          createdAt: item.createdAt || ''
        }));

        setAvailableGuides(formattedGuides);
        setFilteredGuides(formattedGuides);
      } else {
        console.error('応急処置データの取得に失敗:', response.status);
        setAvailableGuides([]);
        setFilteredGuides([]);
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

    // 最後に送信されたテキストを検索キーワードとして設定
    const lastKeyword = localStorage.getItem('lastSearchKeyword');
    if (lastKeyword) {
      setSearchQuery(lastKeyword);
      handleSearch(lastKeyword);
      console.log('🔍 保存された検索キーワードを使用:', lastKeyword);
    }

    setShowEmergencyGuide(true);
  };

  const handleSelectGuide = (guideId: string) => {
    setSelectedGuideId(guideId);
  };

  const handleExitGuide = () => {
    setShowEmergencyGuide(false);
    setSelectedGuideId(null);
    setSearchQuery("");
    // 検索キーワードもクリア
    localStorage.removeItem('lastSearchKeyword');
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



  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーエリア - 固定表示 */}
      <div className="bg-white shadow-sm border-b p-3 flex-shrink-0 sticky top-0 z-10">
        <div className="flex justify-between items-center w-full">
          {/* 左側: 機種と機械番号のドロップダウン選択 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 relative">
              <label className="text-xs text-gray-600 font-medium">機種:</label>
              {isLoadingMachineTypes ? (
                <div className="w-48 h-10 text-sm border border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                  読み込み中...
                </div>
              ) : (
                <div className="relative machine-dropdown">
                  <div 
                    className="w-48 h-10 text-sm border border-gray-300 rounded-md flex items-center justify-between px-3 py-2 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => setShowMachineTypeSuggestions(!showMachineTypeSuggestions)}
                  >
                    <span className={machineTypeInput ? 'text-gray-900' : 'text-gray-500'}>
                      {machineTypeInput || '機種を選択'}
                    </span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {showMachineTypeSuggestions && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {machineTypes.length > 0 ? (
                        machineTypes.map((type) => (
                          <div
                            key={type.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleMachineTypeSelect(type)}
                          >
                            {type.machine_type_name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          機種が登録されていません
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 relative">
              <label className="text-xs text-gray-600 font-medium">機械番号:</label>
              {!selectedMachineType ? (
                <div className="w-48 h-10 text-sm border border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                  機種を先に選択
                </div>
              ) : isLoadingMachines ? (
                <div className="w-48 h-10 text-sm border border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                  読み込み中...
                </div>
              ) : (
                <div className="relative machine-dropdown">
                  <div 
                    className="w-48 h-10 text-sm border border-gray-300 rounded-md flex items-center justify-between px-3 py-2 bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => setShowMachineNumberSuggestions(!showMachineNumberSuggestions)}
                  >
                    <span className={machineNumberInput ? 'text-gray-900' : 'text-gray-500'}>
                      {machineNumberInput || '機械番号を選択'}
                    </span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {showMachineNumberSuggestions && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {machines.length > 0 ? (
                        machines.map((machine) => (
                          <div
                            key={machine.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleMachineNumberSelect(machine)}
                          >
                            {machine.machine_number}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          この機種に機械番号が登録されていません
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 中央のボタングループ */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleEmergencyGuide}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-6 py-3 font-bold text-lg shadow-lg"
              size="lg"
            >
              <BookOpen className="h-6 w-6" />
              🚨 応急処置ガイド 🚨
            </Button>

            <Button 
              onClick={handleCameraClick}
              variant="outline"
              className="border-2 border-black hover:bg-gray-100 flex items-center gap-2 px-6 py-3 font-bold text-lg"
              size="lg"
            >
              <Camera className="h-6 w-6" />
              カメラ
            </Button>

            {/* 追加: Q&Aモード開始ボタン */}
            <Button 
              onClick={startQaMode}
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 px-6 py-3 font-bold text-lg shadow-lg"
              size="lg"
              disabled={qaMode}
            >
              <FileText className="h-6 w-6" />
              Q&A 開始
            </Button>
          </div>

          {/* 右側のボタングループ */}
          <div className="flex justify-end gap-2">
            {/* 機種データ再取得ボタン */}
            <Button 
              onClick={() => {
                console.log('🔄 機種データ手動再取得開始');
                fetchMachineTypes();
              }}
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 hover:bg-green-100 border-green-300"
              disabled={isLoadingMachineTypes}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingMachineTypes ? 'animate-spin' : ''}`} />
              {isLoadingMachineTypes ? "取得中..." : "機種更新"}
            </Button>

            {/* クリアボタン */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 border-red-300"
                  disabled={messages.length === 0 || isClearing}
                >
                  <Trash2 className="h-3 w-3" />
                  {isClearing ? "クリア中..." : "クリア"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>チャット履歴をクリア</AlertDialogTitle>
                  <AlertDialogDescription>
                    現在表示されているチャット内容をすべて削除します。この操作は元に戻すことができません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>戻る</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    clearChatHistory();
                    // Q&Aモードの状態もリセット
                    setQaMode(false);
                    setCurrentQuestionIndex(0);
                    setQaAnswers([]);
                    setQaCompleted(false);
                    // 機種と機械番号の選択状態もリセット
                    setSelectedMachineType('');
                    setSelectedMachineNumber('');
                    setMachineTypeInput('');
                    setMachineNumberInput('');
                    setFilteredMachineTypes([]);
                    setFilteredMachines([]);
                  }}>
                    OK
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* サーバー送信ボタン */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 border-blue-300"
                  disabled={messages.length === 0}
                >
                  <Send className="h-3 w-3" />
                  サーバーへ送信
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>サーバーへ送信</AlertDialogTitle>
                  <AlertDialogDescription>
                    現在のチャット内容（{messages.length}件のメッセージ）をサーバーに送信します。送信完了後、チャット履歴はクリアされます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendToServer}>
                    OK
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* チャットエリア - 3D効果のある外枠 */}
        <div className="flex-1 overflow-auto p-4 space-y-3 bg-white rounded-xl shadow-2xl border-4 border-gray-300 relative"
             style={{
               boxShadow: `
                 inset 3px 3px 8px rgba(0, 0, 0, 0.15),
                 inset -3px -3px 8px rgba(255, 255, 255, 0.9),
                 6px 6px 16px rgba(0, 0, 0, 0.2),
                 -2px -2px 8px rgba(255, 255, 255, 0.8)
               `,
               background: 'linear-gradient(145deg, #f8fafc, #e2e8f0)'
             }}>

          {/* 内側の装飾的な境界線 */}
          <div className="absolute inset-2 border border-blue-200 rounded-lg pointer-events-none opacity-50"></div>

          {/* メッセージ表示エリア */}
          <div className="relative z-10">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 入力エリア - 3D効果のある外枠 */}
        <div className="flex-shrink-0 p-4 pt-2">
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300"
               style={{
                 boxShadow: `
                   inset 2px 2px 6px rgba(0, 0, 0, 0.1),
                   inset -2px -2px 6px rgba(255, 255, 255, 0.9),
                   4px 4px 12px rgba(0, 0, 0, 0.15)
                 `
               }}>
            {qaMode && !qaCompleted ? (
              // 追加: Q&Aモード用の入力エリア
              <div className="p-4">
                <div className="mb-2 text-sm text-gray-600">
                  質問 {currentQuestionIndex + 1}/{qaQuestions.length}: {qaQuestions[currentQuestionIndex]}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="回答を入力してください..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleQaAnswer(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        handleQaAnswer(input.value.trim());
                        input.value = '';
                      }
                    }}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    回答
                  </Button>
                </div>
              </div>
            ) : (
              <MessageInput sendMessage={sendMessage} isLoading={isLoading} />
            )}
          </div>
        </div>
      </div>

      {/* モーダル類 */}
      <CameraModal />
      <ImagePreviewModal />

      {/* ファイル入力（隠し要素） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 応急処置ガイドポップアップ */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[75vh] overflow-hidden shadow-xl">
            {selectedGuideId ? (
              // フロー実行画面
              <div className="h-full max-h-[75vh] overflow-auto">
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={handleExitGuide}
                  onSendToChat={() => console.log('チャットに送信されました')}
                />
              </div>
            ) : (
              // ガイド一覧表示
              <div className="flex flex-col h-full max-h-[75vh]">
                <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-800">応急処置ガイド選択</h1>
                    <Button 
                      onClick={handleExitGuide}
                      variant="outline"
                      className="flex items-center gap-1"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      閉じる
                    </Button>
                  </div>

                  {/* 検索エリア */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="応急処置を検索..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* キーワードボタン */}
                    <KeywordButtons onKeywordClick={handleKeywordClick} />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {isLoadingGuides ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 text-sm text-gray-600">
                        {searchQuery ? (
                          <span>検索結果: {filteredGuides.length}件 (検索語: "{searchQuery}")</span>
                        ) : (
                          <span>利用可能なガイド: {filteredGuides.length}件</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredGuides.map((guide) => (
                          <Card
                            key={guide.id}
                            className="hover:shadow-lg cursor-pointer transition-shadow"
                            onClick={() => handleSelectGuide(guide.id)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg font-semibold">{guide.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {guide.description && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{guide.description}</p>
                              )}
                              {guide.keyword && (
                                <div className="mb-3">
                                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {guide.keyword}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>{guide.steps?.length || 0} ステップ</span>
                                <Button size="sm" className="text-xs">
                                  ガイドを開く
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {filteredGuides.length === 0 && !isLoadingGuides && (
                        <div className="text-center py-8">
                          {searchQuery ? (
                            <div>
                              <p className="text-gray-500 mb-2">検索結果が見つかりませんでした</p>
                              <p className="text-sm text-gray-400">別のキーワードで検索してみてください</p>
                            </div>
                          ) : (
                            <p className="text-gray-500">利用可能な応急処置ガイドがありません</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  } catch (error) {
    console.error('❌ ChatPage エラー:', error);
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
            <p className="text-gray-600 mb-4">チャットページの読み込み中にエラーが発生しました。</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }
}