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

// API URL讒狗ｯ峨・繝ｫ繝代・髢｢謨ｰ
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

  // AI謾ｯ謠ｴ繝｢繝ｼ繝峨・迥ｶ諷狗ｮ｡逅・
  const [aiSupportMode, setAiSupportMode] = useState(false);
  const [aiSessionData, setAiSessionData] = useState<{
    sessionId: string;
    step: number;
    context: string[];
    lastQuestion: string;
  } | null>(null);
  
  // 霑ｽ蜉: 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ繧ｪ繝ｼ繝医さ繝ｳ繝励Μ繝ｼ繝育憾諷狗ｮ｡逅・
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string}>>([]);
  const [selectedMachineType, setSelectedMachineType] = useState<string>('');
  const [selectedMachineNumber, setSelectedMachineNumber] = useState<string>('');
  const [isLoadingMachineTypes, setIsLoadingMachineTypes] = useState(false);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  
  // 繧ｪ繝ｼ繝医さ繝ｳ繝励Μ繝ｼ繝育畑縺ｮ迥ｶ諷・
  const [machineTypeInput, setMachineTypeInput] = useState('');
  const [machineNumberInput, setMachineNumberInput] = useState('');
  const [showMachineTypeSuggestions, setShowMachineTypeSuggestions] = useState(false);
  const [showMachineNumberSuggestions, setShowMachineNumberSuggestions] = useState(false);
  const [filteredMachineTypes, setFilteredMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [filteredMachines, setFilteredMachines] = useState<Array<{id: string, machine_number: string}>>([]);

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA縺ｮ迥ｶ諷狗ｮ｡逅・
  const [troubleshootingMode, setTroubleshootingMode] = useState(false);
  const [troubleshootingSession, setTroubleshootingSession] = useState<{
    problemDescription: string;
    answers: any[];
    currentQuestion?: string;
    currentOptions?: string[];
    reasoning?: string;
  } | null>(null);

  // 繝翫Ξ繝・ず繝・・繧ｿ邂｡逅・・迥ｶ諷・
  const [knowledgeData, setKnowledgeData] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  // 讖溽ｨｮ繝・・繧ｿ縺ｮ蛻晄悄隱ｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    fetchMachineTypes();
    fetchKnowledgeData();
  }, []);

  // 讖溽ｨｮ繝・・繧ｿ縺梧峩譁ｰ縺輔ｌ縺滓凾縺ｫ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繝ｪ繧ｹ繝医ｂ譖ｴ譁ｰ
  useEffect(() => {
    console.log('剥 讖溽ｨｮ繝・・繧ｿ譖ｴ譁ｰ讀懃衍:', {
      machineTypesCount: machineTypes.length,
      machineTypes: machineTypes,
      filteredMachineTypesCount: filteredMachineTypes.length
    });
    setFilteredMachineTypes(machineTypes);
  }, [machineTypes]);

  // 讖滓｢ｰ繝・・繧ｿ縺梧峩譁ｰ縺輔ｌ縺滓凾縺ｫ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繝ｪ繧ｹ繝医ｂ譖ｴ譁ｰ
  useEffect(() => {
    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ譖ｴ譁ｰ讀懃衍:', {
      machinesCount: machines.length,
      machines: machines,
      filteredMachinesCount: filteredMachines.length
    });
    setFilteredMachines(machines);
  }, [machines]);

  // 繝翫Ξ繝・ず繝・・繧ｿ繧貞叙蠕・
  const fetchKnowledgeData = async () => {
    try {
      setIsLoadingKnowledge(true);
      const response = await fetch(KNOWLEDGE_API.BASE, API_REQUEST_OPTIONS);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setKnowledgeData(result.data);
          console.log('笨・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ玲・蜉・', result.data.length + '莉ｶ');
        } else {
          console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ怜､ｱ謨・', result.message);
          setKnowledgeData([]);
        }
      } else {
        throw new Error(`Failed to fetch knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive"
      });
      setKnowledgeData([]);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繝吶け繝医Ν蛹門・逅・
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
            title: "謌仙粥",
            description: "繝翫Ξ繝・ず繝・・繧ｿ縺ｮ繝吶け繝医Ν蛹門・逅・′螳御ｺ・＠縺ｾ縺励◆",
          });
          // 繝・・繧ｿ繧貞・蜿門ｾ・
          await fetchKnowledgeData();
        } else {
          throw new Error(result.message || "繝吶け繝医Ν蛹門・逅・↓螟ｱ謨励＠縺ｾ縺励◆");
        }
      } else {
        throw new Error(`Failed to process knowledge data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜃ｦ逅・お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive"
      });
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // 繝峨Ο繝・・繝繧ｦ繝ｳ縺ｮ陦ｨ遉ｺ/髱櫁｡ｨ遉ｺ蛻ｶ蠕｡
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
  
  // AI謾ｯ謠ｴ繧ｷ繧ｹ繝・Β縺ｮ繧ｻ繝・す繝ｧ繝ｳ邂｡逅・
  const [aiSupportSessionData, setAiSupportSessionData] = useState<{
    answers: string[];
    solution: string;
    knowledgeContext: string[];
    questions: string[];
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 霑ｽ蜉: 讖溽ｨｮ荳隕ｧ繧貞叙蠕励☆繧矩未謨ｰ・郁ｨｭ螳啅I縺ｨ蜷後§API繧剃ｽｿ逕ｨ・・
  const fetchMachineTypes = useCallback(async () => {
    try {
      setIsLoadingMachineTypes(true);
      console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ鈴幕蟋・);
      
      // Azure Static Web Apps迺ｰ蠅・〒縺ｯ螟夜ΚAPI繧堤峩謗･蜻ｼ縺ｳ蜃ｺ縺・
      const apiUrl = MACHINE_API.MACHINE_TYPES;
      console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ誘RL:', apiUrl);
      console.log('剥 迴ｾ蝨ｨ縺ｮURL:', window.location.href);
      
      const response = await fetch(apiUrl, {
        ...API_REQUEST_OPTIONS
        // CORS繧ｨ繝ｩ繝ｼ繧帝∩縺代ｋ縺溘ａ繧ｭ繝｣繝・す繝･髢｢騾｣繝倥ャ繝繝ｼ繧貞炎髯､
      });
      console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ励Ξ繧ｹ繝昴Φ繧ｹ繧ｹ繝・・繧ｿ繧ｹ:', response.status);
      console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ励Ξ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('笨・讖溽ｨｮ荳隕ｧ蜿門ｾ礼ｵ先棡:', result);
        if (result.success && Array.isArray(result.data)) {
          console.log('笨・讖溽ｨｮ荳隕ｧ險ｭ螳壼ｮ御ｺ・', result.data.length, '莉ｶ');
          console.log('笨・讖溽ｨｮ繝・・繧ｿ:', result.data);
          setMachineTypes(result.data);
          setFilteredMachineTypes(result.data); // 蛻晄悄陦ｨ遉ｺ逕ｨ縺ｫ繧りｨｭ螳・
          
          if (result.data.length === 0) {
            console.log('笞・・讖溽ｨｮ繝・・繧ｿ縺・莉ｶ縺ｧ縺・);
          }
        } else {
          console.error('笶・讖溽ｨｮ荳隕ｧ蜿門ｾ玲・蜉溘□縺後ョ繝ｼ繧ｿ縺檎┌蜉ｹ:', result);
          setMachineTypes([]);
          setFilteredMachineTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('笶・讖溽ｨｮ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', response.status, errorText);
        
        if (response.status === 401) {
          console.log('柏 隱崎ｨｼ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅΟ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺吶・);
        }
        
        setMachineTypes([]);
        setFilteredMachineTypes([]);
      }
    } catch (error) {
      console.error('笶・讖溽ｨｮ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      setMachineTypes([]);
      setFilteredMachineTypes([]);
    } finally {
      setIsLoadingMachineTypes(false);
      console.log('剥 讖溽ｨｮ荳隕ｧ蜿門ｾ怜ｮ御ｺ・∵怙邨ら憾諷・', {
        machineTypesCount: machineTypes.length,
        filteredMachineTypesCount: filteredMachineTypes.length
      });
    }
  }, []);

  // 讖溽ｨｮ蜈･蜉帙・繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
  const filterMachineTypes = (input: string) => {
    console.log('剥 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ髢句ｧ・', input, '讖溽ｨｮ謨ｰ:', machineTypes.length);
    if (!input.trim()) {
      console.log('笨・蜈･蜉帙′遨ｺ縺ｮ縺溘ａ蜈ｨ讖溽ｨｮ繧定｡ｨ遉ｺ:', machineTypes.length, '莉ｶ');
      setFilteredMachineTypes(machineTypes);
      return;
    }
    
    const filtered = machineTypes.filter(type => 
      type.machine_type_name.toLowerCase().includes(input.toLowerCase())
    );
    console.log('笨・繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ邨先棡:', filtered.length, '莉ｶ');
    setFilteredMachineTypes(filtered);
  };

  // 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帙・繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
  const filterMachines = (input: string) => {
    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ髢句ｧ・', input, '讖滓｢ｰ謨ｰ:', machines.length);
    if (!input.trim()) {
      console.log('笨・蜈･蜉帙′遨ｺ縺ｮ縺溘ａ蜈ｨ讖滓｢ｰ繧定｡ｨ遉ｺ:', machines.length, '莉ｶ');
      setFilteredMachines(machines);
      return;
    }
    
    const filtered = machines.filter(machine => 
      machine.machine_number.toLowerCase().includes(input.toLowerCase())
    );
    console.log('笨・繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ邨先棡:', filtered.length, '莉ｶ');
    setFilteredMachines(filtered);
  };

  // 讖溽ｨｮ驕ｸ謚槫・逅・
  const handleMachineTypeSelect = (type: {id: string, machine_type_name: string}) => {
    console.log('剥 讖溽ｨｮ驕ｸ謚槫・逅・幕蟋・===========================');
    console.log('剥 驕ｸ謚槭＆繧後◆讖溽ｨｮ:', type);
    
    try {
      // 繝舌ャ繝∫憾諷区峩譁ｰ繧剃ｽｿ逕ｨ
      setMachineTypeInput(type.machine_type_name);
      setSelectedMachineType(type.id);
      setShowMachineTypeSuggestions(false);
      
      // 讖溽ｨｮ螟画峩譎ゅ・讖滓｢ｰ逡ｪ蜿ｷ繧偵Μ繧ｻ繝・ヨ
      setSelectedMachineNumber('');
      setMachineNumberInput('');
      setMachines([]);
      setFilteredMachines([]);
      
      console.log('笨・讖溽ｨｮ驕ｸ謚槫ｮ御ｺ・', type.machine_type_name);
      
      // 蟇ｾ蠢懊☆繧区ｩ滓｢ｰ逡ｪ蜿ｷ繧貞叙蠕・
      fetchMachines(type.id);
      
    } catch (error) {
      console.error('笶・讖溽ｨｮ驕ｸ謚槫・逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ:', error);
    }
  };

  // 讖滓｢ｰ逡ｪ蜿ｷ驕ｸ謚槫・逅・
  const handleMachineNumberSelect = (machine: {id: string, machine_number: string}) => {
    console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ驕ｸ謚樣幕蟋・', machine);
    
    try {
      // 迥ｶ諷九ｒ遒ｺ螳溘↓譖ｴ譁ｰ
      setSelectedMachineNumber(machine.id);
      setMachineNumberInput(machine.machine_number);
      setShowMachineNumberSuggestions(false);
      
      console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ驕ｸ謚槫ｮ御ｺ・', machine.machine_number);
      
    } catch (error) {
      console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ驕ｸ謚槫・逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ:', error);
    }
  };

  // 霑ｽ蜉: 謖・ｮ壽ｩ溽ｨｮ縺ｫ邏舌▼縺乗ｩ滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧貞叙蠕励☆繧矩未謨ｰ・郁ｨｭ螳啅I縺ｨ蜷後§API繧剃ｽｿ逕ｨ・・
  const fetchMachines = useCallback(async (typeId: string) => {
    try {
      setIsLoadingMachines(true);
      console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ鈴幕蟋・ 讖溽ｨｮID:', typeId);
      
      // 繝励Ο繧ｭ繧ｷ邨檎罰縺ｧ繧｢繧ｯ繧ｻ繧ｹ・育嶌蟇ｾ繝代せ繧剃ｽｿ逕ｨ・・
      const apiUrl = `/api/machines/machines?type_id=${typeId}`;
      console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ誘RL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        ...API_REQUEST_OPTIONS
        // CORS繧ｨ繝ｩ繝ｼ繧帝∩縺代ｋ縺溘ａ繧ｭ繝｣繝・す繝･髢｢騾｣繝倥ャ繝繝ｼ繧貞炎髯､
      });
      console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ励Ξ繧ｹ繝昴Φ繧ｹ繧ｹ繝・・繧ｿ繧ｹ:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ礼ｵ先棡:', result);
        if (result.success) {
          console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ險ｭ螳壼ｮ御ｺ・', result.data.length, '莉ｶ');
          console.log('笨・讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ:', result.data);
          setMachines(result.data);
          setFilteredMachines(result.data); // 蛻晄悄陦ｨ遉ｺ逕ｨ
          
          // 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・・繝・ヰ繝・げ諠・ｱ
          console.log('肌 讖滓｢ｰ逡ｪ蜿ｷ蜿門ｾ怜ｾ後・迥ｶ諷・', {
            machinesCount: result.data.length,
            machines: result.data,
            machineNumberInput,
            selectedMachineNumber,
            showMachineNumberSuggestions
          });
        } else {
          console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ玲・蜉溘□縺茎uccess=false:', result);
          setMachines([]);
          setFilteredMachines([]);
        }
      } else {
        const errorText = await response.text();
        console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', response.status, errorText);
        setMachines([]);
        setFilteredMachines([]);
      }
    } catch (error) {
      console.error('笶・讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      setMachines([]);
      setFilteredMachines([]);
    } finally {
      setIsLoadingMachines(false);
      console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ蜿門ｾ怜ｮ御ｺ・∵怙邨ら憾諷・', {
        machinesCount: machines.length,
        filteredMachinesCount: filteredMachines.length
      });
    }
  }, [machines.length, filteredMachines.length, machineNumberInput, selectedMachineNumber, showMachineNumberSuggestions]);

  // 霑ｽ蜉: 讖溽ｨｮ驕ｸ謚樊凾縺ｮ蜃ｦ逅・ｼ医が繝ｼ繝医さ繝ｳ繝励Μ繝ｼ繝育畑・・
  const handleMachineTypeChange = (typeId: string) => {
    setSelectedMachineType(typeId);
    setSelectedMachineNumber(''); // 讖溽ｨｮ螟画峩譎ゅ・讖滓｢ｰ逡ｪ蜿ｷ繧偵Μ繧ｻ繝・ヨ
    setMachineNumberInput(''); // 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帙ｂ繝ｪ繧ｻ繝・ヨ
    
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

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｦ繝ｳ繝域凾縺ｮ蛻晄悄蛹・
  useEffect(() => {
    console.log('噫 繝√Ε繝・ヨ繝壹・繧ｸ繝槭え繝ｳ繝・- 蛻晄悄蛹夜幕蟋・);
    
    // 繝√Ε繝・ヨID縺ｮ蛻晄悄蛹悶ｒ遒ｺ螳溘↓陦後≧
    if (!chatId) {
      console.log('売 繝√Ε繝・ヨID縺梧悴險ｭ螳壹・縺溘ａ蛻晄悄蛹悶ｒ螳溯｡・);
      try {
        initializeChat();
      } catch (error) {
        console.error('笶・繝√Ε繝・ヨID蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
      }
    }
    
    // 讖溽ｨｮ繝・・繧ｿ縺ｮ蜿門ｾ・
    fetchMachineTypes().catch(error => {
      console.error('笶・讖溽ｨｮ繝・・繧ｿ蜿門ｾ励〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縺後√メ繝｣繝・ヨ逕ｻ髱｢縺ｯ陦ｨ遉ｺ縺輔ｌ縺ｾ縺・', error);
    });
  }, [chatId, initializeChat, fetchMachineTypes]);

  // 讖溽ｨｮ繝・・繧ｿ縺ｮ迥ｶ諷句､画峩繧堤屮隕悶＠縺ｦ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧呈峩譁ｰ
  useEffect(() => {
    console.log('投 讖溽ｨｮ繝・・繧ｿ迥ｶ諷区峩譁ｰ:', {
      machineTypesCount: machineTypes.length,
      selectedMachineType,
      machineTypeInput,
      isLoadingMachineTypes
    });
    
    // 讖溽ｨｮ繝・・繧ｿ縺梧峩譁ｰ縺輔ｌ縺溘ｉ縲∫樟蝨ｨ縺ｮ蜈･蜉帙↓蝓ｺ縺･縺・※繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧呈峩譁ｰ
    if (machineTypes.length > 0) {
      filterMachineTypes(machineTypeInput);
    }
  }, [machineTypes, machineTypeInput]);

  // 讖溽ｨｮ蜈･蜉帙・迥ｶ諷句､画峩繧堤屮隕厄ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
  useEffect(() => {
    console.log('投 讖溽ｨｮ蜈･蜉帷憾諷区峩譁ｰ:', {
      machineTypeInput,
      selectedMachineType
    });
  }, [machineTypeInput, selectedMachineType]);

  // machineTypeInput縺ｮ蛟､縺ｮ螟画峩繧定ｩｳ邏ｰ縺ｫ逶｣隕・
  useEffect(() => {
    console.log('剥 machineTypeInput蛟､螟画峩讀懷・:', {
      currentValue: machineTypeInput,
      length: machineTypeInput.length,
      timestamp: new Date().toISOString()
    });
  }, [machineTypeInput]);

  // 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ迥ｶ諷句､画峩繧堤屮隕悶＠縺ｦ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧呈峩譁ｰ
  useEffect(() => {
    console.log('投 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ迥ｶ諷区峩譁ｰ:', {
      machinesCount: machines.length,
      selectedMachineNumber,
      machineNumberInput,
      isLoadingMachines
    });
    
    // 讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺梧峩譁ｰ縺輔ｌ縺溘ｉ縲∫樟蝨ｨ縺ｮ蜈･蜉帙↓蝓ｺ縺･縺・※繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧呈峩譁ｰ
    if (machines.length > 0) {
      filterMachines(machineNumberInput);
    }
  }, [machines, machineNumberInput]);

  // 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帙・迥ｶ諷句､画峩繧堤屮隕厄ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
  useEffect(() => {
    console.log('投 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帷憾諷区峩譁ｰ:', {
      machineNumberInput,
      selectedMachineNumber
    });
  }, [machineNumberInput, selectedMachineNumber]);

  // 霑ｽ蜉: Q&A繝｢繝ｼ繝峨・蛻晄悄蛹厄ｼ亥虚逧・ｳｪ蝠冗函謌舌す繧ｹ繝・Β縺ｫ螟画峩貂医∩・・

  // AI謾ｯ謠ｴ髢句ｧ具ｼ医メ繝｣繝・ヨ蜀・ｸ蝠丈ｸ遲泌ｽ｢蠑擾ｼ・
  const handleStartAiSupport = async () => {
    try {
      setAiSupportMode(true);
      
      // AI謾ｯ謠ｴ髢句ｧ九Γ繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
      const welcomeMessage = "､・**AI謨・囿險ｺ譁ｭ繧帝幕蟋九＠縺ｾ縺・*\n\n逋ｺ逕溘＠縺ｦ縺・ｋ逞・憾繧呈蕗縺医※縺上□縺輔＞縲・;
      
      sendMessage(welcomeMessage, [], true);
      
      // 繧ｻ繝・す繝ｧ繝ｳ繝・・繧ｿ繧貞・譛溷喧
      setAiSessionData({
        sessionId: `ai_${Date.now()}`,
        step: 1,
        context: [],
        lastQuestion: "逋ｺ逕溘＠縺ｦ縺・ｋ逞・憾繧呈蕗縺医※縺上□縺輔＞縲・
      });
      
      toast({
        title: "AI謾ｯ謠ｴ髢句ｧ・,
        description: "繝√Ε繝・ヨ蜀・〒AI謨・囿險ｺ譁ｭ繧帝幕蟋九＠縺ｾ縺励◆",
      });
    } catch (error) {
      console.error('AI謾ｯ謠ｴ髢句ｧ九お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "AI謾ｯ謠ｴ縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
      setAiSupportMode(false);
    }
  };

  // AI謾ｯ謠ｴ邨ゆｺ・
  const handleAiSupportExit = () => {
    setAiSupportMode(false);
    setAiSessionData(null);
    
    // 邨ゆｺ・Γ繝・そ繝ｼ繧ｸ繧帝∽ｿ｡
    const exitMessage = "､・**AI險ｺ譁ｭ繧堤ｵゆｺ・＠縺ｾ縺励◆**\n\n險ｺ譁ｭ邨先棡縺ｯ荳願ｨ倥・繝√Ε繝・ヨ螻･豁ｴ縺ｫ菫晏ｭ倥＆繧後※縺・∪縺吶・;
    sendMessage(exitMessage, [], true);
    
    toast({
      title: "AI謾ｯ謠ｴ邨ゆｺ・,
      description: "AI謨・囿險ｺ譁ｭ繧堤ｵゆｺ・＠縺ｾ縺励◆",
    });
  };

  const handleExport = async () => {
    try {
      await exportChatHistory();
      toast({
        title: "繧ｨ繧ｯ繧ｹ繝昴・繝域・蜉・,
        description: "繝√Ε繝・ヨ螻･豁ｴ繧偵お繧ｯ繧ｹ繝昴・繝医＠縺ｾ縺励◆縲・,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ",
        description: "繝√Ε繝・ヨ螻･豁ｴ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆縲・,
        variant: "destructive",
      });
    }
  };

  // 繧ｵ繝ｼ繝舌・縺ｸ騾∽ｿ｡縺吶ｋ讖溯・
  const handleSendToServer = async () => {
    try {
      // 繝・ヰ繝・げ諠・ｱ繧定ｿｽ蜉
      console.log('噫 騾∽ｿ｡蜑阪・迥ｶ諷狗｢ｺ隱・', {
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

      // 繧医ｊ隧ｳ邏ｰ縺ｪ譚｡莉ｶ繝√ぉ繝・け
      const hasValidChatId = !!chatId;
      const hasMessages = messages.length > 0;
      const hasValidMessages = messages.some(msg => msg.content && msg.content.trim());
      
      console.log('剥 騾∽ｿ｡譚｡莉ｶ繝√ぉ繝・け:', {
        hasValidChatId,
        hasMessages,
        hasValidMessages,
        messagesCount: messages.length,
        messagesWithContent: messages.filter(msg => msg.content && msg.content.trim()).length
      });

      if (!hasValidChatId) {
        console.log('笶・騾∽ｿ｡繧ｨ繝ｩ繝ｼ: 繝√Ε繝・ヨID縺檎┌蜉ｹ - 蛻晄悄蛹悶ｒ隧ｦ陦・);
        try {
          // 繝√Ε繝・ヨID縺檎┌蜉ｹ縺ｪ蝣ｴ蜷医・蛻晄悄蛹悶ｒ隧ｦ陦・
          await initializeChat();
          console.log('笨・繝√Ε繝・ヨID蛻晄悄蛹匁・蜉・);
          // 蛻晄悄蛹匁・蜉溷ｾ後∝・蠎ｦ騾∽ｿ｡蜃ｦ逅・ｒ螳溯｡・
          setTimeout(() => {
            handleSendToServer();
          }, 100);
          return;
        } catch (initError) {
          console.error('笶・繝√Ε繝・ヨID蛻晄悄蛹悶お繝ｩ繝ｼ:', initError);
          toast({
            title: "騾∽ｿ｡繧ｨ繝ｩ繝ｼ",
            description: "繝√Ε繝・ヨID縺ｮ蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆縲・,
            variant: "destructive",
          });
          return;
        }
      }

      if (!hasValidMessages) {
        console.log('笶・騾∽ｿ｡繧ｨ繝ｩ繝ｼ: 譛牙柑縺ｪ繝｡繝・そ繝ｼ繧ｸ縺後≠繧翫∪縺帙ｓ');
        toast({
          title: "騾∽ｿ｡繧ｨ繝ｩ繝ｼ",
          description: "騾∽ｿ｡縺吶ｋ繝√Ε繝・ヨ蜀・ｮｹ縺後≠繧翫∪縺帙ｓ縲・,
          variant: "destructive",
        });
        return;
      }

      // 繝√Ε繝・ヨ蜀・ｮｹ繧谷SON蠖｢蠑上〒謨ｴ蠖｢
      const chatData = {
        chatId: chatId,
        timestamp: new Date().toISOString(),
        // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ諠・ｱ繧定ｿｽ蜉
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

      console.log('豆 騾∽ｿ｡繝・・繧ｿ:', {
        chatId: chatData.chatId,
        messageCount: chatData.messages.length,
        machineInfo: chatData.machineInfo,
        totalDataSize: JSON.stringify(chatData).length
      });

      // 繧ｵ繝ｼ繝舌・縺ｫ騾∽ｿ｡・磯幕逋ｺ迺ｰ蠅・〒縺ｯ繝・せ繝育畑繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ菴ｿ逕ｨ・・
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      const apiUrl = isDevelopment 
        ? `/api/chats/${chatId}/send-test`
        : `/api/chats/${chatId}/send`;
      
      console.log('倹 騾∽ｿ｡URL:', apiUrl);
      console.log('女・・髢狗匱迺ｰ蠅・', isDevelopment);
      console.log('匠 繝帙せ繝亥錐:', window.location.hostname);

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

      console.log('藤 騾∽ｿ｡繝ｬ繧ｹ繝昴Φ繧ｹ:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const result = await response.json();
        
        // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ諠・ｱ繧貞性繧騾∽ｿ｡謌仙粥繝｡繝・そ繝ｼ繧ｸ
        const machineInfoText = selectedMachineType && selectedMachineNumber 
          ? ` (讖溽ｨｮ: ${machineTypeInput}, 讖滓｢ｰ逡ｪ蜿ｷ: ${machineNumberInput})`
          : '';
        
        console.log('笨・繧ｵ繝ｼ繝舌・騾∽ｿ｡謌仙粥:', result);
        
        toast({
          title: "騾∽ｿ｡謌仙粥",
          description: `繝√Ε繝・ヨ蜀・ｮｹ繧偵し繝ｼ繝舌・縺ｫ騾∽ｿ｡縺励∪縺励◆縲・${messages.filter(msg => msg.content && msg.content.trim()).length}莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ)${machineInfoText}`,
        });

        // 騾∽ｿ｡螳御ｺ・ｾ後↓繝√Ε繝・ヨ繧偵け繝ｪ繧｢
        await clearChatHistory();
        
        // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ驕ｸ謚樒憾諷九ｂ繝ｪ繧ｻ繝・ヨ
        setSelectedMachineType('');
        setSelectedMachineNumber('');
        setMachineTypeInput('');
        setMachineNumberInput('');
        setFilteredMachineTypes([]);
        setFilteredMachines([]);

        // AI謾ｯ謠ｴ繝｢繝ｼ繝峨ｂ繝ｪ繧ｻ繝・ヨ
        setAiSupportMode(false);
        setAiSessionData(null);

        toast({
          title: "繝√Ε繝・ヨ繧ｯ繝ｪ繧｢螳御ｺ・,
          description: "騾∽ｿ｡蠕後↓繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺励∪縺励◆縲・,
        });
        
        console.log('ｧｹ 繝√Ε繝・ヨ迥ｶ諷九ｒ繝ｪ繧ｻ繝・ヨ縺励∪縺励◆');
      } else {
        // 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隧ｳ邏ｰ繧貞叙蠕・
        let errorMessage = `騾∽ｿ｡螟ｱ謨・ ${response.status} ${response.statusText}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || errorData.error || '';
          console.error('笶・繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ:', errorData);
        } catch (parseError) {
          console.warn('笞・・繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隗｣譫舌↓螟ｱ謨・', parseError);
        }
        
        // 繧医ｊ隧ｳ邏ｰ縺ｪ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈ｧ狗ｯ・
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n隧ｳ邏ｰ: ${errorDetails}`
          : errorMessage;
        
        throw new Error(fullErrorMessage);
      }
    } catch (error) {
      console.error('笶・繧ｵ繝ｼ繝舌・騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "騾∽ｿ｡繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繧ｵ繝ｼ繝舌・縺ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・,
        variant: "destructive",
      });
    }
  };

  // 繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ俶ｩ溯・・亥炎髯､貂医∩・・

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // importChat髢｢謨ｰ縺ｯ迴ｾ蝨ｨ螳溯｣・＆繧後※縺・↑縺・◆繧√∫ｰ｡譏鍋噪縺ｪ螳溯｣・
        const text = await file.text();
        const importedData = JSON.parse(text);
        
        if (importedData.messages && Array.isArray(importedData.messages)) {
          // 繝｡繝・そ繝ｼ繧ｸ繧定ｨｭ螳夲ｼ域里蟄倥・繝｡繝・そ繝ｼ繧ｸ縺ｫ霑ｽ蜉・・
          setMessages([...messages, ...importedData.messages]);
          toast({
            title: "繧､繝ｳ繝昴・繝域・蜉・,
            description: "繝√Ε繝・ヨ螻･豁ｴ繧偵う繝ｳ繝昴・繝医＠縺ｾ縺励◆縲・,
          });
        } else {
          throw new Error('辟｡蜉ｹ縺ｪ繝輔ぃ繧､繝ｫ蠖｢蠑上〒縺・);
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ",
          description: "繝√Ε繝・ヨ螻･豁ｴ縺ｮ繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆縲・,
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝蛾未騾｣縺ｮ髢｢謨ｰ
  const fetchAvailableGuides = async () => {
    try {
      setIsLoadingGuides(true);
      const response = await fetch(TROUBLESHOOTING_API.LIST, API_REQUEST_OPTIONS);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableGuides(data.data || []);
          setFilteredGuides(data.data || []);
          console.log('笨・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙叙蠕玲・蜉・', data.data?.length + '莉ｶ');
        } else {
          console.error('笶・蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙叙蠕怜､ｱ謨・', data.message);
          setAvailableGuides([]);
          setFilteredGuides([]);
        }
      } else {
        throw new Error(`Failed to fetch emergency guides: ${response.statusText}`);
      }
    } catch (error) {
      console.error('繧ｬ繧､繝我ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨・', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
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

  // 讀懃ｴ｢蜃ｦ逅・
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredGuides(availableGuides);
      return;
    }

    try {
      // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝画､懃ｴ｢繧貞ｮ溯｡・
      const searchResults = availableGuides.filter((guide) => {
        const searchText = `${guide.title} ${guide.description} ${guide.keyword || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      setFilteredGuides(searchResults);
      console.log(`剥 讀懃ｴ｢邨先棡: "${query}" -> ${searchResults.length}莉ｶ`);
    } catch (error) {
      console.error('讀懃ｴ｢蜃ｦ逅・お繝ｩ繝ｼ:', error);
      setFilteredGuides(availableGuides);
    }
  };

  // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繧ｿ繝ｳ繧ｯ繝ｪ繝・け譎ゅ・蜃ｦ逅・
  const handleKeywordClick = (keyword: string) => {
    handleSearch(keyword);
  };

  // 繧ｫ繝｡繝ｩ繝懊ち繝ｳ縺ｮ繧ｯ繝ｪ繝・け蜃ｦ逅・
  const handleCameraClick = () => {
    console.log('萄 繧ｫ繝｡繝ｩ繝懊ち繝ｳ縺後け繝ｪ繝・け縺輔ｌ縺ｾ縺励◆');
    // 繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ繧帝幕縺上う繝吶Φ繝医ｒ逋ｺ轣ｫ
    window.dispatchEvent(new CustomEvent('open-camera'));

    // 繝・ヰ繝・げ逕ｨ: 繧､繝吶Φ繝医′豁｣縺励￥逋ｺ轣ｫ縺輔ｌ縺溘°繧堤｢ｺ隱・
    console.log('萄 open-camera 繧､繝吶Φ繝医ｒ逋ｺ轣ｫ縺励∪縺励◆');
  };

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA髢句ｧ・
  const startTroubleshootingQA = async (problemDescription: string) => {
    try {
      setTroubleshootingMode(true);
      setTroubleshootingSession({
        problemDescription,
        answers: []
      });

      // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA API繧貞他縺ｳ蜃ｺ縺・
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

        // 蛻晄悄雉ｪ蝠上ｒ繝｡繝・そ繝ｼ繧ｸ縺ｨ縺励※霑ｽ蜉
        sendMessage(qaResponse.question, [], true);
      } else {
        throw new Error('繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA髢句ｧ九お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA縺ｮ髢句ｧ九↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA蝗樒ｭ泌・逅・
  const handleTroubleshootingAnswer = async (answer: string) => {
    if (!troubleshootingSession) return;

    try {
      // 蝗樒ｭ斐ｒ繧ｻ繝・す繝ｧ繝ｳ縺ｫ霑ｽ蜉
      const updatedSession = {
        ...troubleshootingSession,
        answers: [...troubleshootingSession.answers, {
          stepId: `step_${Date.now()}`,
          answer,
          timestamp: new Date()
        }]
      };
      setTroubleshootingSession(updatedSession);

      // 蝗樒ｭ斐ｒ繝｡繝・そ繝ｼ繧ｸ縺ｨ縺励※霑ｽ蜉
      sendMessage(answer, [], false);

      // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA API繧貞他縺ｳ蜃ｺ縺・
      const response = await fetch(TROUBLESHOOTING_API.ANSWER_QA, {
        ...API_REQUEST_OPTIONS,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          problemDescription: troubleshootingSession.problemDescription,
          previousAnswers: updatedSession.answers.slice(0, -1), // 迴ｾ蝨ｨ縺ｮ蝗樒ｭ斐ｒ髯､縺・
          currentAnswer: answer
        })
      });

      if (response.ok) {
        const data = await response.json();
        const qaResponse = data.data;

        if (qaResponse.status === 'complete') {
          // 隗｣豎ｺ遲悶ｒ陦ｨ遉ｺ
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: undefined,
            currentOptions: undefined
          }));
          sendMessage(qaResponse.solution, [], true);
          setTroubleshootingMode(false);
        } else if (qaResponse.status === 'emergency') {
          // 邱頑･蟇ｾ蠢懊ｒ陦ｨ遉ｺ
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: undefined,
            currentOptions: undefined
          }));
          sendMessage(qaResponse.emergencyAction, [], true);
          setTroubleshootingMode(false);
        } else {
          // 谺｡縺ｮ雉ｪ蝠上ｒ陦ｨ遉ｺ
          setTroubleshootingSession(prev => ({
            ...prev!,
            currentQuestion: qaResponse.question,
            currentOptions: qaResponse.options || [],
            reasoning: qaResponse.reasoning
          }));
          sendMessage(qaResponse.question, [], true);
        }
      } else {
        throw new Error('蝗樒ｭ斐・蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('笶・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "蝗樒ｭ斐・蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡蜃ｦ逅・ｒ諡｡蠑ｵ
  const handleSendMessage = async (content: string, media: any[] = []) => {
    if (!content.trim() && media.length === 0) return;

    // AI謾ｯ謠ｴ繝｢繝ｼ繝峨・蝣ｴ蜷医・迚ｹ蛻･縺ｪ蜃ｦ逅・
    if (aiSupportMode && aiSessionData) {
      await handleAiSupportMessage(content);
      return;
    }

    // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝｢繝ｼ繝峨・蝣ｴ蜷医・迚ｹ蛻･縺ｪ蜃ｦ逅・
    if (troubleshootingMode && troubleshootingSession) {
      await handleTroubleshootingAnswer(content);
      return;
    }

    // 騾壼ｸｸ縺ｮ繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡蜃ｦ逅・
    sendMessage(content, media, false);
  };

  // AI謾ｯ謠ｴ繝｢繝ｼ繝峨〒縺ｮ繝｡繝・そ繝ｼ繧ｸ蜃ｦ逅・
  const handleAiSupportMessage = async (userMessage: string) => {
    if (!aiSessionData) return;

    try {
      // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧偵メ繝｣繝・ヨ縺ｫ霑ｽ蜉
      sendMessage(userMessage, [], false);

      // 繧ｳ繝ｳ繝・く繧ｹ繝医ｒ譖ｴ譁ｰ
      const updatedContext = [...aiSessionData.context, userMessage];
      
      // GPT API縺ｫ騾∽ｿ｡縺励※繝ｬ繧ｹ繝昴Φ繧ｹ繧貞叙蠕・
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
        
        // AI縺九ｉ縺ｮ霑皮ｭ斐ｒ繝√Ε繝・ヨ縺ｫ霑ｽ蜉・・蝗槭□縺托ｼ・
        if (data.response) {
          sendMessage(data.response, [], true);
        }

        // 繧ｻ繝・す繝ｧ繝ｳ繝・・繧ｿ繧呈峩譁ｰ
        setAiSessionData({
          ...aiSessionData,
          step: aiSessionData.step + 1,
          context: [...updatedContext, data.response || ''],
          lastQuestion: data.nextQuestion || aiSessionData.lastQuestion
        });

        // 險ｺ譁ｭ螳御ｺ・・蝣ｴ蜷・
        if (data.completed) {
          setTimeout(() => {
            const completionMessage = "識 險ｺ譁ｭ縺悟ｮ御ｺ・＠縺ｾ縺励◆縲ゆｻ悶↓繧ゅ♀蝗ｰ繧翫・縺薙→縺後≠繧後・縲√♀豌苓ｻｽ縺ｫ縺雁ｰ九・縺上□縺輔＞縲・;
            sendMessage(completionMessage, [], true);
            setAiSupportMode(false);
            setAiSessionData(null);
          }, 1500);
        }
      } else {
        throw new Error('AI險ｺ譁ｭAPI縺ｮ蜻ｼ縺ｳ蜃ｺ縺励↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('AI謾ｯ謠ｴ繝｡繝・そ繝ｼ繧ｸ蜃ｦ逅・お繝ｩ繝ｼ:', error);
      const errorMessage = "逕ｳ縺苓ｨｳ縺斐＊縺・∪縺帙ｓ縲ゅお繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・;
      sendMessage(errorMessage, [], true);
    }
  };

  // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA髢句ｧ九・繧ｿ繝ｳ縺ｮ霑ｽ蜉
  const handleStartTroubleshooting = () => {
    const problemDescription = prompt('逋ｺ逕溘＠縺滉ｺ玖ｱ｡繧呈蕗縺医※縺上□縺輔＞・井ｾ具ｼ壹お繝ｳ繧ｸ繝ｳ縺梧ｭ｢縺ｾ縺｣縺溘√ヶ繝ｬ繝ｼ繧ｭ縺悟柑縺九↑縺・↑縺ｩ・・');
    if (problemDescription && problemDescription.trim()) {
      startTroubleshootingQA(problemDescription.trim());
    }
  };

  // 繧ｯ繝ｪ繧｢讖溯・
  const handleClearChat = async () => {
    try {
      await clearChatHistory();
      setTroubleshootingMode(false);
      setTroubleshootingSession(null);
      setAiSupportMode(false);
      setAiSessionData(null);
      toast({
        title: "謌仙粥",
        description: "繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺励∪縺励◆",
      });
    } catch (error) {
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繧ｯ繝ｪ繧｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ縺ｮ陦ｨ遉ｺ邂｡逅・
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // AI謾ｯ謠ｴ縺ｮ雉ｪ蝠冗函謌撰ｼ・PT縺ｨ縺ｮ荳蝠丈ｸ遲斐メ繝｣繝・ヨ・・
  const generateEmergencyQuestion = async (context: string, previousAnswers: string[]): Promise<{ question: string; options?: string[] }> => {
    try {
      // 譛菴・縺､縺ｮ雉ｪ蝠上ｒ逕滓・縺吶ｋ縺ｾ縺ｧ邯夊｡・
      if (previousAnswers.length >= 5) {
        return {
          question: "",
          options: []
        };
      }

      // 蜑阪・蝗樒ｭ斐↓蝓ｺ縺･縺・※谺｡縺ｮ雉ｪ蝠上ｒ逕滓・
      if (previousAnswers.length === 0) {
        return {
          question: "蜈ｷ菴鍋噪縺ｪ逞・憾繧呈蕗縺医※縺上□縺輔＞",
          options: []
        };
      } else if (previousAnswers.length === 1) {
        const firstAnswer = previousAnswers[0].toLowerCase();
        
        // 謨・囿縺ｮ遞ｮ鬘槭ｒ蜍慕噪縺ｫ蛻､譁ｭ
        if (firstAnswer.includes("蜍穂ｽ・) || firstAnswer.includes("蜍輔°縺ｪ縺・) || firstAnswer.includes("蜉ｹ縺九↑縺・)) {
          return {
            question: "謨・囿驛ｨ菴阪・縺ｩ縺薙〒縺吶°・・,
            options: []
          };
        } else if (firstAnswer.includes("逡ｰ髻ｳ") || firstAnswer.includes("髻ｳ")) {
          return {
            question: "逡ｰ髻ｳ縺ｮ逋ｺ逕溽ｮ・園縺ｯ・・,
            options: []
          };
        } else if (firstAnswer.includes("隴ｦ蜻・) || firstAnswer.includes("繝ｩ繝ｳ繝・) || firstAnswer.includes("繧｢繝ｩ繝ｼ繝")) {
          return {
            question: "隴ｦ蜻翫・蜀・ｮｹ縺ｯ・・,
            options: []
          };
        } else if (firstAnswer.includes("貍上ｌ") || firstAnswer.includes("貍上ｌ繧・)) {
          return {
            question: "菴輔′貍上ｌ縺ｦ縺・∪縺吶°・・,
            options: []
          };
        } else if (firstAnswer.includes("謖ｯ蜍・) || firstAnswer.includes("謠ｺ繧後ｋ")) {
          return {
            question: "謖ｯ蜍慕ｮ・園縺ｯ縺ｩ縺薙〒縺吶°・・,
            options: []
          };
        } else {
          return {
            question: "蝠城｡後・隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞",
            options: []
          };
        }
      } else if (previousAnswers.length === 2) {
        const firstAnswer = previousAnswers[0].toLowerCase();
        const secondAnswer = previousAnswers[1].toLowerCase();
        
        // 謨・囿驛ｨ菴阪ｄ讖溷勣縺ｮ諠・ｱ繧貞庶髮・
        return {
          question: "菴懈･ｭ迴ｾ蝣ｴ縺ｯ螳牙・縺ｧ縺吶°・・,
          options: []
        };
      } else if (previousAnswers.length === 3) {
        // 3縺､逶ｮ縺ｮ雉ｪ蝠擾ｼ壽腐髫懊・隧ｳ邏ｰ諠・ｱ
        return {
          question: "謨・囿縺ｮ逋ｺ逕滓凾譛溘・・・,
          options: []
        };
      } else if (previousAnswers.length === 4) {
        // 4縺､逶ｮ縺ｮ雉ｪ蝠擾ｼ壻ｽ懈･ｭ迺ｰ蠅・・遒ｺ隱・
        return {
          question: "菴懈･ｭ縺ｫ蠢・ｦ√↑蟾･蜈ｷ縺ｯ縺ゅｊ縺ｾ縺吶°・・,
          options: []
        };
      }
      
      return {
        question: "隧ｳ邏ｰ繧呈蕗縺医※縺上□縺輔＞",
        options: []
      };
    } catch (error) {
      console.error('AI謾ｯ謠ｴ雉ｪ蝠冗函謌舌お繝ｩ繝ｼ:', error);
      return {
        question: "隧ｳ邏ｰ縺ｪ迥ｶ豕√ｒ謨吶∴縺ｦ縺上□縺輔＞",
        options: []
      };
    }
  };

  // 繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・
  const handleExportChat = async () => {
    try {
      // 繝√Ε繝・ヨ螻･豁ｴ繧偵お繧ｯ繧ｹ繝昴・繝・
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
      
      console.log('笨・繝√Ε繝・ヨ螻･豁ｴ繧偵お繧ｯ繧ｹ繝昴・繝医＠縺ｾ縺励◆');
    } catch (error) {
      console.error('笶・繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 繝倥ャ繝繝ｼ */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        {/* 蟾ｦ蛛ｴ・壽ｩ溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ驕ｸ謚・*/}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="machine-type" className="text-sm font-medium text-gray-700">
              讖溽ｨｮ:
            </Label>
            <div className="relative">
              <Input
                id="machine-type"
                type="text"
                placeholder={isLoadingMachineTypes ? "隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ..." : "讖溽ｨｮ繧帝∈謚・.."}
                value={machineTypeInput}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('剥 讖溽ｨｮ蜈･蜉帛､画峩:', value);
                  setMachineTypeInput(value);
                  filterMachineTypes(value);
                  setShowMachineTypeSuggestions(true);
                }}
                onFocus={() => {
                  console.log('剥 讖溽ｨｮ蜈･蜉帙ヵ繧ｩ繝ｼ繧ｫ繧ｹ:', {
                    machineTypesCount: machineTypes.length,
                    machineTypes: machineTypes,
                    filteredMachineTypesCount: filteredMachineTypes.length,
                    showMachineTypeSuggestions: showMachineTypeSuggestions
                  });
                  setShowMachineTypeSuggestions(true);
                  // 繝輔か繝ｼ繧ｫ繧ｹ譎ゅ↓蜈ｨ讖溽ｨｮ繧定｡ｨ遉ｺ
                  if (machineTypes.length > 0) {
                    setFilteredMachineTypes(machineTypes);
                  }
                }}
                onBlur={(e) => {
                  // 繝峨Ο繝・・繝繧ｦ繝ｳ蜀・・繧ｯ繝ｪ繝・け縺ｮ蝣ｴ蜷医・髢峨§縺ｪ縺・
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-type-dropdown')) {
                    return;
                  }
                  // 蟆代＠驕・ｻｶ縺輔○縺ｦ繧ｯ繝ｪ繝・け繧､繝吶Φ繝医′蜃ｦ逅・＆繧後ｋ縺ｮ繧貞ｾ・▽
                  setTimeout(() => {
                    setShowMachineTypeSuggestions(false);
                  }, 150);
                }}
                disabled={isLoadingMachineTypes}
                className="w-48"
              />
              {(() => {
                console.log('剥 讖溽ｨｮ繝峨Ο繝・・繝繧ｦ繝ｳ陦ｨ遉ｺ譚｡莉ｶ:', {
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
                    <div className="px-3 py-2 text-sm text-gray-500">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>
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
                          // 繝槭え繧ｹ繝繧ｦ繝ｳ繧､繝吶Φ繝医〒繝悶Λ繧ｦ繧ｶ縺ｮ繝輔か繝ｼ繧ｫ繧ｹ螟画峩繧帝亟縺・
                          e.preventDefault();
                        }}
                        tabIndex={0}
                      >
                        {type.machine_type_name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineTypeInput.trim() ? "隧ｲ蠖薙☆繧区ｩ溽ｨｮ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ" : 
                       machineTypes.length === 0 ? "讖溽ｨｮ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ..." : 
                       "讖溽ｨｮ繧貞・蜉帙＠縺ｦ縺上□縺輔＞"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="machine-number" className="text-sm font-medium text-gray-700">
              讖滓｢ｰ逡ｪ蜿ｷ:
            </Label>
            <div className="relative">
              <Input
                id="machine-number"
                type="text"
                placeholder={isLoadingMachines ? "隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ..." : "讖滓｢ｰ逡ｪ蜿ｷ繧帝∈謚・.."}
                value={machineNumberInput}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帛､画峩:', value);
                  setMachineNumberInput(value);
                  filterMachines(value);
                  setShowMachineNumberSuggestions(true);
                }}
                onFocus={() => {
                  console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ蜈･蜉帙ヵ繧ｩ繝ｼ繧ｫ繧ｹ');
                  console.log('肌 繝輔か繝ｼ繧ｫ繧ｹ譎ゅ・迥ｶ諷・', {
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
                  // 繝輔か繝ｼ繧ｫ繧ｹ譎ゅ↓蜈ｨ讖滓｢ｰ逡ｪ蜿ｷ繧定｡ｨ遉ｺ
                  if (machines.length > 0) {
                    setFilteredMachines(machines);
                    console.log('笨・繝輔か繝ｼ繧ｫ繧ｹ譎ゅ↓讖滓｢ｰ逡ｪ蜿ｷ繝ｪ繧ｹ繝医ｒ險ｭ螳・', machines.length, '莉ｶ');
                  } else {
                    console.log('笞・・繝輔か繝ｼ繧ｫ繧ｹ譎ゅ↓讖滓｢ｰ逡ｪ蜿ｷ縺後≠繧翫∪縺帙ｓ');
                  }
                }}
                onBlur={(e) => {
                  // 繝峨Ο繝・・繝繧ｦ繝ｳ蜀・・繧ｯ繝ｪ繝・け縺ｮ蝣ｴ蜷医・髢峨§縺ｪ縺・
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (relatedTarget && relatedTarget.closest('.machine-number-dropdown')) {
                    return;
                  }
                  // 蟆代＠驕・ｻｶ縺輔○縺ｦ繧ｯ繝ｪ繝・け繧､繝吶Φ繝医′蜃ｦ逅・＆繧後ｋ縺ｮ繧貞ｾ・▽
                  setTimeout(() => {
                    setShowMachineNumberSuggestions(false);
                  }, 150);
                }}
                disabled={!selectedMachineType || isLoadingMachines}
                className="w-48"
              />
              {(() => {
                console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ繝峨Ο繝・・繝繧ｦ繝ｳ陦ｨ遉ｺ譚｡莉ｶ:', {
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
                          // 繝槭え繧ｹ繝繧ｦ繝ｳ繧､繝吶Φ繝医〒繝悶Λ繧ｦ繧ｶ縺ｮ繝輔か繝ｼ繧ｫ繧ｹ螟画峩繧帝亟縺・
                          e.preventDefault();
                        }}
                        tabIndex={0}
                      >
                        {machine.machine_number}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {machineNumberInput.trim() ? "隧ｲ蠖薙☆繧区ｩ滓｢ｰ逡ｪ蜿ｷ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ" : 
                       selectedMachineType ? "縺薙・讖溽ｨｮ縺ｫ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・ｋ讖滓｢ｰ逡ｪ蜿ｷ縺後≠繧翫∪縺帙ｓ" : 
                       "蜈医↓讖溽ｨｮ繧帝∈謚槭＠縺ｦ縺上□縺輔＞"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 荳ｭ螟ｮ・哂I謾ｯ謠ｴ繝ｻ繧ｫ繝｡繝ｩ繝ｻ蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・繧ｿ繝ｳ */}
        <div className="flex items-center gap-6">
          {/* AI謾ｯ謠ｴ髢句ｧ・邨ゆｺ・・繧ｿ繝ｳ */}
          {!aiSupportMode ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handleStartAiSupport}
              disabled={isLoading}
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <Brain className="w-6 h-6 mr-3" />
              AI謾ｯ謠ｴ
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={handleAiSupportExit}
              className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 mr-6 px-8 py-3 text-base font-semibold"
            >
              <X className="w-6 h-6 mr-3" />
              AI謾ｯ謠ｴ邨ゆｺ・
            </Button>
          )}

          {/* 繧ｫ繝｡繝ｩ繝懊ち繝ｳ */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCameraClick}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mr-6"
          >
            <Camera className="w-4 h-4 mr-2" />
            繧ｫ繝｡繝ｩ
          </Button>

          {/* 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・繧ｿ繝ｳ */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleEmergencyGuide}
            disabled={isLoadingGuides}
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 mr-6 px-8 py-3 text-base font-semibold"
          >
            <Activity className="w-6 h-6 mr-3" />
            蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・
          </Button>
        </div>
        
        {/* 蜿ｳ蛛ｴ・壹い繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendToServer}
            disabled={isLoading || messages.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            繧ｵ繝ｼ繝舌・騾∽ｿ｡
          </Button>

          <Button 
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={isLoading || isClearing || messages.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            繧ｯ繝ｪ繧｢
          </Button>
        </div>
      </div>

      {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・お繝ｪ繧｢ - 蟶ｸ縺ｫ繝√Ε繝・ヨ陦ｨ遉ｺ */}
      {/* 繝｡繝・そ繝ｼ繧ｸ陦ｨ遉ｺ繧ｨ繝ｪ繧｢ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isAiResponse ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${message.isAiResponse ? 'w-auto' : 'w-full'}`}>
              {message.isAiResponse && troubleshootingMode && troubleshootingSession?.currentQuestion === message.content ? (
                // 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰQA繝舌ヶ繝ｫ
                <TroubleshootingQABubble
                  question={message.content}
                  options={troubleshootingSession?.currentOptions || []}
                  reasoning={troubleshootingSession?.reasoning}
                  onAnswer={handleTroubleshootingAnswer}
                  isLoading={isLoading}
                />
              ) : message.isAiResponse && (message.content.includes('隗｣豎ｺ遲・) || message.content.includes('邱頑･蟇ｾ蠢・)) ? (
                // 隗｣豎ｺ遲悶ヰ繝悶Ν
                <SolutionBubble
                  solution={message.content}
                  problemDescription={troubleshootingSession?.problemDescription}
                  isEmergency={message.content.includes('邱頑･蟇ｾ蠢・)}
                />
              ) : (
                // 騾壼ｸｸ縺ｮ繝｡繝・そ繝ｼ繧ｸ繝舌ヶ繝ｫ
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
                <span className="text-gray-600">AI縺悟ｿ懃ｭ斐ｒ逕滓・荳ｭ...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 繝｡繝・そ繝ｼ繧ｸ蜈･蜉帙お繝ｪ繧｢ */}
      <div className="border-t bg-white p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={troubleshootingMode && !troubleshootingSession?.currentQuestion}
        />
      </div>

      {/* 繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ */}
      <CameraModal />

      {/* 逕ｻ蜒上・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝繝ｫ */}
      {showImagePreview && selectedImage && (
        <ImagePreviewModal />
      )}

      {/* 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Δ繝ｼ繝繝ｫ */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・/h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitGuide}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                髢峨§繧・
              </Button>
            </div>
            
            {/* 讀懃ｴ｢讖溯・ */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="繧ｬ繧､繝峨ｒ讀懃ｴ｢..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繧ｿ繝ｳ */}
            <div className="mb-4">
              <KeywordButtons onKeywordClick={handleKeywordClick} />
            </div>
            
            {/* 繧ｬ繧､繝我ｸ隕ｧ */}
            {!selectedGuideId && (
              <div className="overflow-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">繧ｿ繧､繝医Ν</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">隱ｬ譏・/th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuides.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-gray-300 p-4 text-center text-gray-500">
                          繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ
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
            
            {/* 驕ｸ謚槭＆繧後◆繧ｬ繧､繝峨・陦ｨ遉ｺ */}
            {selectedGuideId && (
              <div className="mt-6">
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={() => setSelectedGuideId(null)}
                  backButtonText="荳隕ｧ縺ｫ謌ｻ繧・
                  onSendToChat={() => {
                    console.log('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ｒ繝√Ε繝・ヨ縺ｫ騾∽ｿ｡');
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
