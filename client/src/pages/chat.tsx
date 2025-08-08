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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft, X, Search, Send, Camera, Trash2, RefreshCw, Brain } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { searchTroubleshootingFlows, japaneseGuideTitles } from "../lib/troubleshooting-search";
import { QAAnswer } from "../lib/qa-flow-manager";

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



  // 追加: Q&Aモードの初期化（動的質問生成システムに変更済み）

  // AI支援回答処理（統合版）
  const handleAiSupportAnswer = async (answer: string) => {
    const newAnswers = [...aiSupportAnswers, answer];
    setAiSupportAnswers(newAnswers);
    
    // 回答をチャットに追加（左側に表示）
    sendMessage(answer, [], false);
    
    // AI支援回答をサーバーに送信
    try {
      if (chatId) {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: answer,
            useOnlyKnowledgeBase: true
          })
        });
        
        if (!response.ok) {
          console.error('AI支援回答のサーバー送信に失敗:', response.status);
        } else {
          console.log('AI支援回答をサーバーに送信しました:', answer);
        }
      }
    } catch (error) {
      console.error('AI支援回答のサーバー送信エラー:', error);
    }
    
    // 次の質問を動的に生成
    setTimeout(async () => {
      try {
        const nextQuestionResult = await generateNextQuestion(answer, newAnswers);
        
        if (nextQuestionResult) {
          // 次の質問がある場合
          setCurrentQuestion(nextQuestionResult.question);
          setCurrentOptions(nextQuestionResult.options || []);
          setCurrentQuestionIndex(prev => prev + 1);
          sendMessage(nextQuestionResult.question, [], true);
          
          // 次の質問をサーバーにシステムメッセージとして送信
          if (chatId) {
            const response = await fetch(`/api/chats/${chatId}/messages/system`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                content: nextQuestionResult.question,
                isUserMessage: false
              })
            });
            
            if (!response.ok) {
              console.error('次の質問のサーバー送信に失敗:', response.status);
            } else {
              console.log('次の質問をサーバーに送信しました:', nextQuestionResult.question);
            }
          }
        } else {
          // 質問終了、解決策を生成
          const solution = await generateSolution(newAnswers);
          sendMessage(solution, [], true);
          
          // 解決策をサーバーにシステムメッセージとして送信
          if (chatId) {
            const response = await fetch(`/api/chats/${chatId}/messages/system`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                content: solution,
                isUserMessage: false
              })
            });
            
            if (!response.ok) {
              console.error('解決策のサーバー送信に失敗:', response.status);
            } else {
              console.log('解決策をサーバーに送信しました');
            }
          }
          
          // AI支援モード終了
          setTimeout(() => {
            setAiSupportMode(false);
            setCurrentQuestionIndex(0);
            setAiSupportAnswers([]);
            setAiSupportCompleted(false);
            setCurrentQuestion("");
            setCurrentOptions([]);
          }, 1000);
        }
      } catch (error) {
        console.error('次の質問生成エラー:', error);
        // エラー時のフォールバック
        sendMessage("質問生成中にエラーが発生しました。専門家に相談してください。", [], true);
        setAiSupportMode(false);
        setCurrentQuestionIndex(0);
        setAiSupportAnswers([]);
        setAiSupportCompleted(false);
        setCurrentQuestion("");
        setCurrentOptions([]);
      }
    }, 500);
  };

  // AI支援モード開始（統合版）
  const startAiSupport = async () => {
    setAiSupportMode(true);
    setCurrentQuestionIndex(0);
    setAiSupportAnswers([]);
    setAiSupportCompleted(false);
    setCurrentQuestion("何が起こりましたか？");
    setCurrentOptions([]);
    
    // 初期メッセージと質問を送信
    sendMessage("🤖 AI支援システムを開始します。\n\n専門的なナレッジベースを活用して、問題の原因を特定し、具体的な解決策を提案します。", [], true);
    
    // 少し遅延してから初期質問を送信
    setTimeout(() => {
      sendMessage("何が起こりましたか？", [], true);
    }, 500);
  };

  // 動的質問生成関数（選択肢付き）
  const generateDynamicQuestion = async (context: string, previousAnswers: string[]): Promise<{ question: string; options?: string[] }> => {
    try {
      // ナレッジベースから関連情報を取得
      const knowledgeContext = await fetchKnowledgeContext();
      
      console.log('🔍 動的質問生成開始:', {
        context: context,
        previousAnswersCount: previousAnswers.length,
        knowledgeContextCount: knowledgeContext.length
      });
      
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: `保守用車の故障診断の専門家として、以下の状況に基づいて次の質問と選択肢を生成してください。

**現在の状況**: ${context}
**これまでの回答**: ${previousAnswers.map((answer, index) => `Q${index + 1}: ${answer}`).join(', ')}
**利用可能なナレッジベース情報**: ${knowledgeContext.join(', ')}

以下の条件を満たす質問と選択肢を生成してください：
1. **問題の原因特定に直結する**: 症状から原因を絞り込む質問
2. **具体的な対応策を導く**: 回答によって具体的な処置が決まる質問
3. **安全確認を優先**: 危険性の有無を最初に確認
4. **段階的な診断**: 簡単な確認から複雑な診断へ
5. **実用的な選択肢**: 具体的で分かりやすい選択肢を提示
6. **ナレッジベース活用**: 利用可能な専門知識を活用した質問

以下のJSON形式で返してください：
{
  "question": "具体的な質問内容",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4", "選択肢5"]
}

選択肢は3-5個程度で、具体的で分かりやすい内容にしてください。`,
          useOnlyKnowledgeBase: true
        })
      });

      if (!response.ok) {
        throw new Error(`API呼び出しエラー: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.response || "";
      
      // 応答が空またはエラーの場合は、デフォルトの質問を生成
      if (!responseText || responseText.includes("解決策を生成できませんでした") || responseText.includes("専門家に相談してください")) {
        console.log('⚠️ GPT応答が不適切なため、デフォルト質問を生成');
        return generateDefaultQuestion(context, previousAnswers);
      }
      
      try {
        // JSONとしてパースを試行
        const parsed = JSON.parse(responseText);
        return {
          question: parsed.question || "次の質問",
          options: parsed.options || []
        };
      } catch {
        // JSONパースに失敗した場合は、テキストから質問のみを抽出
        return {
          question: responseText || "次の質問",
          options: []
        };
      }
    } catch (error) {
      console.error('❌ 動的質問生成エラー:', error);
      return generateDefaultQuestion(context, previousAnswers);
    }
  };

  // デフォルト質問生成関数
  const generateDefaultQuestion = (context: string, previousAnswers: string[]): { question: string; options: string[] } => {
    if (previousAnswers.length === 0) {
      return {
        question: "キーを回したときの状態は？以下から近いものを教えてください：",
        options: [
          "🔋 パネルのランプが全く点灯しない（無反応）",
          "🔦 ランプは点灯するが、セルモーターが全く回らない",
          "🚗 カチカチ音がするが、セルが回らない",
          "🔄 セルが回るが、エンジンがかからない"
        ]
      };
    } else if (previousAnswers.length === 1) {
      return {
        question: "エンジン停止前の状況を教えてください：",
        options: [
          "⚡ 突然停止した",
          "🔧 作業中に停止した",
          "🚗 走行中に停止した",
          "⏰ 長時間放置後に停止した"
        ]
      };
    } else {
      return {
        question: "現在の状況で最も重要な確認事項は？",
        options: [
          "🔋 バッテリー電圧の確認",
          "⛽ 燃料残量の確認",
          "🔧 エンジンオイルの確認",
          "🌬️ エアフィルターの確認"
        ]
      };
    }
  };

  // 次の質問を生成する関数（選択肢付き）
  const generateNextQuestion = async (currentAnswer: string, allAnswers: string[]): Promise<{ question: string; options?: string[] } | null> => {
    try {
      // ナレッジベースから関連情報を取得
      const knowledgeContext = await fetchKnowledgeContext();
      
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: `保守用車の故障診断の専門家として、以下の回答を分析して次の質問と選択肢を決定してください。

**現在の回答**: ${currentAnswer}
**これまでの回答**: ${allAnswers.map((answer, index) => `Q${index + 1}: ${answer}`).join(', ')}
**利用可能なナレッジベース情報**: ${knowledgeContext.join(', ')}

以下の条件で次の質問を決定してください：
1. **問題解決に十分な情報が得られた場合**: "解決策を提示します" と返す
2. **まだ情報が不足している場合**: 原因特定や処置決定に必要な次の質問と選択肢を生成
3. **緊急対応が必要な場合**: "緊急対応が必要です" と返す
4. **ナレッジベース活用**: 利用可能な専門知識を活用した質問

質問が必要な場合は以下のJSON形式で返してください：
{
  "question": "具体的な質問内容",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4", "選択肢5"]
}

解決策提示や緊急対応の場合は "解決策を提示します" または "緊急対応が必要です" と返してください。`,
          useOnlyKnowledgeBase: true
        })
      });

      if (!response.ok) {
        throw new Error(`API呼び出しエラー: ${response.status}`);
      }

      const data = await response.json();
      const result = data.response || "";
      
      // 解決策提示や緊急対応の判定
      if (result.includes("解決策を提示") || result.includes("緊急対応")) {
        return null; // 質問終了
      }
      
      try {
        // JSONとしてパースを試行
        const parsed = JSON.parse(result);
        return {
          question: parsed.question || "次の質問",
          options: parsed.options || []
        };
      } catch {
        // JSONパースに失敗した場合は、テキストから質問のみを抽出
        return {
          question: result || "次の質問",
          options: []
        };
      }
    } catch (error) {
      console.error('次の質問生成エラー:', error);
      return null;
    }
  };

  // 解決策生成関数
  const generateSolution = async (allAnswers: string[]): Promise<string> => {
    try {
      // ナレッジベースから関連情報を取得
      const knowledgeContext = await fetchKnowledgeContext();
      
      console.log('🔍 解決策生成開始:', {
        answersCount: allAnswers.length,
        knowledgeContextCount: knowledgeContext.length
      });
      
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: `保守用車の故障診断の専門家として、以下の回答に基づいて具体的な解決策を提示してください。

**これまでの回答**: ${allAnswers.map((answer, index) => `Q${index + 1}: ${answer}`).join(', ')}
**利用可能なナレッジベース情報**: ${knowledgeContext.join(', ')}

以下の形式で解決策を提示してください：
1. **問題の特定**: 回答から推測される問題
2. **原因分析**: 考えられる原因
3. **具体的な処置手順**: 段階的な対処方法
4. **安全上の注意**: 作業時の注意事項
5. **専門家への相談**: 必要に応じて専門家への相談タイミング
6. **ナレッジベース参照**: 関連する技術情報やマニュアル

実用的で安全な解決策を提示してください。
必ず具体的な手順と安全上の注意を含めてください。`,
          useOnlyKnowledgeBase: true
        })
      });

      if (!response.ok) {
        throw new Error(`API呼び出しエラー: ${response.status}`);
      }

      const data = await response.json();
      const solution = data.response || "";
      
      // 解決策が空またはエラーメッセージの場合は、デフォルトの解決策を生成
      if (!solution || solution.includes("解決策を生成できませんでした") || solution.includes("専門家に相談してください")) {
        console.log('⚠️ GPT応答が不適切なため、デフォルト解決策を生成');
        return generateDefaultSolution(allAnswers);
      }
      
      return solution;
    } catch (error) {
      console.error('❌ 解決策生成エラー:', error);
      return generateDefaultSolution(allAnswers);
    }
  };

  // デフォルト解決策生成関数
  const generateDefaultSolution = (allAnswers: string[]): string => {
    const problemDescription = allAnswers.join(' ');
    
    return `## 🔍 問題の特定
保守用車のエンジン停止に関する問題が発生しています。

## ⚠️ 安全確認
1. 作業環境の安全確認
2. 適切な安全装備の着用
3. 作業前の機器停止確認

## 🛠️ 具体的な処置手順

### 1. 初期確認
- バッテリー電圧の確認
- 燃料残量の確認
- エアフィルターの状態確認

### 2. 段階的診断
- キーを回したときの反応確認
- パネルランプの点灯状況
- セルモーターの動作確認

### 3. 対処方法
- バッテリー充電または交換
- 燃料補給
- エアフィルター清掃または交換

## 📋 注意事項
- 作業前の安全確認を必ず実施
- 専門知識が必要な場合は専門家に相談
- 緊急時は安全を最優先に行動

## 🚨 緊急時の対応
問題が解決しない場合は、技術支援センターに連絡してください。
- 電話番号: 0123-456-789
- 緊急時: 0123-456-000

## 📚 参考情報
保守用車マニュアルの該当箇所を参照し、適切な手順で作業を進めてください。`;
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

  // AI支援の終了処理
  const handleAiSupportExit = () => {
    setAiSupportMode(false);
    setAiSupportSessionData(null);
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

  const fetchAvailableGuides = async () => {
    try {
      setIsLoadingGuides(true);
      console.log('🔄 応急処置データ一覧の取得を開始');

      // トラブルシューティングデータの取得
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const troubleshootingData = await response.json();
        console.log('✅ トラブルシューティングデータ取得:', troubleshootingData);
        
        // APIレスポンスの構造に合わせてデータをマッピング
        const flows = troubleshootingData.success && troubleshootingData.data ? troubleshootingData.data : (Array.isArray(troubleshootingData) ? troubleshootingData : []);
        console.log('✅ 処理対象フロー数:', flows.length + '件');

        // データを整形して表示用にフォーマット
        const formattedGuides = flows.map((item: any) => ({
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
          <div className="flex items-center" style={{ gap: '126px', marginLeft: '-58px' }}>
            <Button 
              onClick={startAiSupport}
              className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 px-6 py-3 font-bold text-lg shadow-lg"
              size="lg"
              disabled={aiSupportMode}
            >
              <FileText className="h-6 w-6" />
              AI支援開始
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

            <Button 
              onClick={handleEmergencyGuide}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-6 py-3 font-bold text-lg shadow-lg"
              size="lg"
            >
              <BookOpen className="h-6 w-6" />
              🚨 応急処置ガイド 🚨
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
                  disabled={!messages.some(msg => msg.content && msg.content.trim())}
                  onClick={() => {
                    console.log('送信ボタンクリック時の状態:', {
                      messagesLength: messages.length,
                      messages: messages,
                      chatId: chatId
                    });
                  }}
                >
                  <Send className="h-3 w-3" />
                  サーバーへ送信
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>サーバーへ送信</AlertDialogTitle>
                  <AlertDialogDescription>
                    現在のチャット内容（{messages.filter(msg => msg.content && msg.content.trim()).length}件のメッセージ）をサーバーに送信します。送信完了後、チャット履歴はクリアされます。
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
            {aiSupportMode && !aiSupportCompleted ? (
              // AI支援モード用の入力エリア
              <div className="p-4">
                <div className="mb-2 text-sm text-gray-600">
                  AI支援質問 {currentQuestionIndex + 1}: {currentQuestion || "回答を入力してください"}
                </div>
                
                {/* 選択肢ボタン */}
                {currentOptions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 mb-2">選択肢から選んでください：</div>
                    <div className="grid grid-cols-1 gap-2">
                      {currentOptions.map((option, index) => (
                        <Button
                          key={index}
                          onClick={() => handleAiSupportAnswer(option)}
                          variant="outline"
                          className="justify-start text-left h-auto py-2 px-3"
                          disabled={isLoading}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="回答を入力してください..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handleAiSupportAnswer(e.currentTarget.value.trim());
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        handleAiSupportAnswer(input.value.trim());
                        input.value = '';
                      }
                    }}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    回答
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAiSupportReset}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    リセット
                  </Button>
                  <Button
                    onClick={handleAiSupportExit}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    終了
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
}