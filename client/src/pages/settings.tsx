import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast.ts";
import { API_BASE_URL } from "../lib/api/config";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { 
  Settings, 
  Volume2, 
  Mic, 
  Monitor, 
  Smartphone, 
  LogOut, 
  User, 
  Shield, 
  Save, 
  Trash2, 
  FileX, 
  UserPlus, 
  FileType, 
  Info, 
  Plus, 
  Database, 
  X,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Edit3,
  Wrench
} from "lucide-react";
import { WarningDialog } from "../components/shared/warning-dialog";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../components/ui/select";
import { Link } from "react-router-dom";
import MachineList from "../components/machine-list";

// SystemHealth interface is removed - integrated into system diagnostic page

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [textToSpeech, setTextToSpeech] = useState(true);
  const [speechVolume, setSpeechVolume] = useState([80]);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [useOnlyKnowledgeBase, setUseOnlyKnowledgeBase] = useState(true);

  // 繧ｷ繧ｹ繝・Β蛛･蜈ｨ諤ｧ繝√ぉ繝・け
  // System health state removed - integrated into system diagnostic page



  // Q&A雉ｪ蝠冗ｮ｡逅・畑縺ｮ迥ｶ諷・
  const [qaQuestions, setQaQuestions] = useState<string[]>([
    "逋ｺ逕溘＠縺溽憾豕√・・・,
    "縺ｩ縺薙°諠ｳ螳壹＆繧後ｋ・・,
    "縺ｩ縺ｮ繧医≧縺ｪ蜃ｦ鄂ｮ縺励∪縺励◆縺具ｼ・
  ]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');

  // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ邂｡逅・畑縺ｮ迥ｶ諷・
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string, machine_type_id: string}>>([]);
  const [newMachineType, setNewMachineType] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isLoadingMachineData, setIsLoadingMachineData] = useState(false);

  // 讖溽ｨｮ繝・・繧ｿ繧貞・譛溯ｪｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    fetchMachineData();
  }, []);

  // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ縺ｮ繝・・繧ｿ繧貞叙蠕・
  const fetchMachineData = async () => {
    try {
      setIsLoadingMachineData(true);
      const typesResponse = await fetch(`/api/machines/machine-types`);
      if (typesResponse.ok) {
        const typesResult = await typesResponse.json();
        if (typesResult.success) {
          setMachineTypes(typesResult.data);
        }
      }
      const machinesResponse = await fetch(`/api/machines/all-machines`);
      if (machinesResponse.ok) {
        const machinesResult = await machinesResponse.json();
        if (machinesResult.success) {
          const flatMachines: Array<{id: string, machine_number: string, machine_type_id: string}> = [];
          machinesResult.data.forEach((typeGroup: any) => {
            if (typeGroup.machines && Array.isArray(typeGroup.machines)) {
              typeGroup.machines.forEach((machine: any) => {
                flatMachines.push({
                  id: machine.id,
                  machine_number: machine.machine_number,
                  machine_type_id: typeGroup.type_id
                });
              });
            }
          });
          setMachines(flatMachines);
        }
      }
    } finally {
      setIsLoadingMachineData(false);
    }
  };

  const addMachineType = async () => {
    if (!newMachineType.trim()) return;
    const response = await fetch(`/api/machines/machine-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_type_name: newMachineType.trim() })
    });
    if (response.ok) {
      setNewMachineType('');
      fetchMachineData();
    }
  };

  const addMachineNumber = async () => {
    if (!selectedMachineType || !newMachineNumber.trim()) return;
    const response = await fetch(`/api/machines/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_number: newMachineNumber.trim(), machine_type_id: selectedMachineType })
    });
    if (response.ok) {
      setNewMachineNumber('');
      setSelectedMachineType('');
      fetchMachineData();
    }
  };

  const deleteMachineType = async (typeId: string, typeName: string) => {
    if (!confirm(`讖溽ｨｮ縲・{typeName}縲阪ｒ蜑企勁縺励※繧ゅｈ繧阪＠縺・〒縺吶°・歃n髢｢騾｣縺吶ｋ讖滓｢ｰ逡ｪ蜿ｷ繧ょ炎髯､縺輔ｌ縺ｾ縺吶Ａ)) return;
    const response = await fetch(`/api/machines/machine-types/${typeId}`, { method: 'DELETE' });
    if (response.ok) fetchMachineData();
  };

  const deleteMachineNumber = async (machineId: string, machineNumber: string) => {
    if (!confirm(`讖滓｢ｰ逡ｪ蜿ｷ縲・{machineNumber}縲阪ｒ蜑企勁縺励※繧ゅｈ繧阪＠縺・〒縺吶°・歔)) return;
    const response = await fetch(`/api/machines/machines/${machineId}`, { method: 'DELETE' });
    if (response.ok) fetchMachineData();
  };

  // LocalStorage縺九ｉ縺ｮ險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('emergencyRecoverySettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);

                  if (settings.notifications !== undefined) setNotifications(settings.notifications);
        if (settings.textToSpeech !== undefined) setTextToSpeech(settings.textToSpeech);
        if (settings.speechVolume !== undefined) setSpeechVolume(settings.speechVolume);
        if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
        if (settings.autoSave !== undefined) setAutoSave(settings.autoSave);
        if (settings.useOnlyKnowledgeBase !== undefined) setUseOnlyKnowledgeBase(settings.useOnlyKnowledgeBase);
        if (settings.qaQuestions !== undefined) setQaQuestions(settings.qaQuestions);
        }
      } catch (error) {
        console.error('險ｭ螳壹・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
      }
    };

    loadSettings();
  }, []);

  // 險ｭ螳壻ｿ晏ｭ倬未謨ｰ・医ヨ繝・・繝ｬ繝吶Ν縺ｫ遘ｻ蜍包ｼ・
  const saveSettings = () => {
    try {
      const settings = {
        notifications,
        textToSpeech,
        speechVolume,
        darkMode,
        autoSave,
        useOnlyKnowledgeBase,
        qaQuestions
      };
      localStorage.setItem('emergencyRecoverySettings', JSON.stringify(settings));
      localStorage.setItem('useOnlyKnowledgeBase', useOnlyKnowledgeBase.toString());
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    } catch (error) {
      console.error('險ｭ螳壹・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    }
  };

  // 險ｭ螳壼､画峩譎ゅ・閾ｪ蜍穂ｿ晏ｭ・
  useEffect(() => {
    saveSettings();
  }, [notifications, textToSpeech, speechVolume, darkMode, autoSave, useOnlyKnowledgeBase, qaQuestions]);


  const handleLogout = async () => {
    setShowWarningDialog(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "繝ｭ繧ｰ繧｢繧ｦ繝亥､ｱ謨・,
        description: "繝ｭ繧ｰ繧｢繧ｦ繝井ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
        variant: "destructive",
      });
    } finally {
      setShowWarningDialog(false);
    }
  };

  const handleCleanupUploads = async () => {
    try {
      const response = await fetch('/api/tech-support/cleanup-uploads', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      toast({
        title: "繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・螳御ｺ・,
        description: `繧｢繝・・繝ｭ繝ｼ繝峨ヵ繧｡繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励∪縺励◆`
      });
    } catch (error) {
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive"
      });
    }
  };

  const handleCleanupLogs = async () => {
    try {
      const response = await fetch('/api/tech-support/cleanup-logs', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      toast({
        title: "繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・螳御ｺ・,
        description: `${result.deletedCount}莉ｶ縺ｮ繝ｭ繧ｰ繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆ (${(result.totalSize / 1024 / 1024).toFixed(2)} MB)`
      });
    } catch (error) {
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝ｭ繧ｰ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive"
      });
    }
  };

  // Q&A雉ｪ蝠冗ｮ｡逅・・髢｢謨ｰ
  const handleEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
    setEditingQuestionText(qaQuestions[index]);
  };

  const handleSaveQuestion = () => {
    if (editingQuestionIndex !== null && editingQuestionText.trim()) {
      const newQuestions = [...qaQuestions];
      newQuestions[editingQuestionIndex] = editingQuestionText.trim();
      setQaQuestions(newQuestions);
      setEditingQuestionIndex(null);
      setEditingQuestionText('');
      toast({
        title: "雉ｪ蝠上ｒ譖ｴ譁ｰ縺励∪縺励◆",
        description: "Q&A雉ｪ蝠上′豁｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestionIndex(null);
    setEditingQuestionText('');
  };

  const handleAddQuestion = () => {
    if (newQuestionText.trim()) {
      setQaQuestions([...qaQuestions, newQuestionText.trim()]);
      setNewQuestionText('');
      toast({
        title: "雉ｪ蝠上ｒ霑ｽ蜉縺励∪縺励◆",
        description: "譁ｰ縺励＞Q&A雉ｪ蝠上′霑ｽ蜉縺輔ｌ縺ｾ縺励◆"
      });
    }
  };

  const handleDeleteQuestion = (index: number) => {
    if (qaQuestions.length > 1) {
      const newQuestions = qaQuestions.filter((_, i) => i !== index);
      setQaQuestions(newQuestions);
      toast({
        title: "雉ｪ蝠上ｒ蜑企勁縺励∪縺励◆",
        description: "Q&A雉ｪ蝠上′蜑企勁縺輔ｌ縺ｾ縺励◆"
      });
    } else {
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "譛菴・縺､縺ｮ雉ｪ蝠上′蠢・ｦ√〒縺・,
        variant: "destructive"
      });
    }
  };

  const handleMoveQuestion = (fromIndex: number, direction: 'up' | 'down') => {
    const newQuestions = [...qaQuestions];
    if (direction === 'up' && fromIndex > 0) {
      [newQuestions[fromIndex], newQuestions[fromIndex - 1]] = [newQuestions[fromIndex - 1], newQuestions[fromIndex]];
    } else if (direction === 'down' && fromIndex < newQuestions.length - 1) {
      [newQuestions[fromIndex], newQuestions[fromIndex + 1]] = [newQuestions[fromIndex + 1], newQuestions[fromIndex]];
    }
    setQaQuestions(newQuestions);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <Settings className="mr-2 h-6 w-6 text-indigo-500" />
          險ｭ螳・
        </h1>
        <p className="text-blue-400">繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ險ｭ螳壹ｒ邂｡逅・＠縺ｾ縺・/p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5" />
              繝ｦ繝ｼ繧ｶ繝ｼ繝励Ο繝輔ぅ繝ｼ繝ｫ
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-blue-800">{user?.displayName}</p>
                  <p className="text-sm text-blue-400">{user?.username}</p>
                  <p className="text-sm text-blue-400">{user?.department || '驛ｨ鄂ｲ譛ｪ險ｭ螳・}</p>
                </div>
                <div className={`text-white text-xs px-3 py-1 rounded-full ${user?.role === 'admin' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}>
                  {user?.role === 'admin' ? '邂｡逅・・ : '荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ'}
                </div>
              </div>
              
              {/* 縺薙・繧｢繝励Μ縺ｫ縺､縺・※縺ｮ隱ｬ譏・*/}
              <div className="border-t border-blue-100 pt-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">Emergency Recovery Chat</p>
                  <p className="text-sm text-blue-500">繝舌・繧ｸ繝ｧ繝ｳ 1.0.0</p>
                  <p className="text-sm text-blue-500">ﾂｩ 2024 All Rights Reserved</p>
                  <p className="text-xs text-blue-400">
                    蠢懈･蠕ｩ譌ｧ繧ｵ繝昴・繝医・縺溘ａ縺ｮ蟇ｾ隧ｱ蝙九い繧ｷ繧ｹ繧ｿ繝ｳ繝医す繧ｹ繝・Β
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Settings (only shown for admins) */}
        {user?.role === 'admin' && (
          <Card className="border border-blue-200 shadow-md overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
              <CardTitle className="text-lg flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                邂｡逅・・ｨｭ螳・
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・/p>
                    <p className="text-sm text-blue-400">繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医ｒ邂｡逅・☆繧・/p>
                  </div>
                  <Link to="/users">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <UserPlus className="mr-2 h-4 w-4 text-blue-500" />
                      邂｡逅・
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">繧ｷ繧ｹ繝・Β險ｺ譁ｭ</p>
                    <p className="text-sm text-blue-400">DB謗･邯壹→GPT謗･邯壹・迥ｶ諷九ｒ遒ｺ隱・/p>
                  </div>
                  <Link to="/system-diagnostic">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                      險ｺ譁ｭ
                    </Button>
                  </Link>
                </div>



                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <Button
                    onClick={handleCleanupUploads}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､
                  </Button>

                  <Button
                    onClick={handleCleanupLogs}
                    variant="outline"
                    className="w-full"
                  >
                    <FileX className="mr-2 h-4 w-4" />
                    繝ｭ繧ｰ繝輔ぃ繧､繝ｫ繧貞炎髯､
                  </Button>
                </div>

                {/* 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ邂｡逅・I */}
                <div className="border-t border-blue-100 pt-4 space-y-4">
                  {/* 讖溽ｨｮ霑ｽ蜉 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">譁ｰ隕乗ｩ溽ｨｮ霑ｽ蜉</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="讖溽ｨｮ蜷阪ｒ蜈･蜉・
                        value={newMachineType}
                        onChange={(e) => setNewMachineType(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={addMachineType}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        霑ｽ蜉
                      </Button>
                    </div>
                  </div>
                  {/* 讖滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">譁ｰ隕乗ｩ滓｢ｰ逡ｪ蜿ｷ霑ｽ蜉</Label>
                    <div className="flex gap-2">
                      <Select value={selectedMachineType} onValueChange={setSelectedMachineType}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="讖溽ｨｮ繧帝∈謚・ />
                        </SelectTrigger>
                        <SelectContent>
                          {machineTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.machine_type_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="讖滓｢ｰ逡ｪ蜿ｷ繧貞・蜉・
                        value={newMachineNumber}
                        onChange={(e) => setNewMachineNumber(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={addMachineNumber}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        霑ｽ蜉
                      </Button>
                    </div>
                  </div>
                  {/* 迴ｾ蝨ｨ縺ｮ讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">迴ｾ蝨ｨ縺ｮ逋ｻ骭ｲ迥ｶ豕・/Label>
                    {isLoadingMachineData ? (
                      <div className="text-sm text-blue-400">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {machineTypes.map((type) => {
                          const typeMachines = machines.filter(m => m.machine_type_id === type.id);
                          return (
                            <div key={type.id} className="text-sm border border-blue-200 rounded p-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-blue-700">{type.machine_type_name}</div>
                                <Button
                                  onClick={() => deleteMachineType(type.id, type.machine_type_name)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-blue-500 mt-1">
                                {typeMachines.length > 0 ? (
                                  <div className="space-y-1">
                                    {typeMachines.map((machine) => (
                                      <div key={machine.id} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
                                        <span>{machine.machine_number}</span>
                                        <Button
                                          onClick={() => deleteMachineNumber(machine.id, machine.machine_number)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="h-2 w-2" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">讖滓｢ｰ逡ｪ蜿ｷ譛ｪ逋ｻ骭ｲ</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Q&A雉ｪ蝠冗ｮ｡逅・*/}
        <Card className="border border-blue-200 shadow-md overflow-hidden col-span-2">
          <CardHeader className="pb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardTitle className="text-lg flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Q&A雉ｪ蝠冗ｮ｡逅・
            </CardTitle>
            <CardDescription className="text-purple-100">
              繝√Ε繝・ヨ逕ｻ髱｢縺ｮQ&A繝｢繝ｼ繝峨〒菴ｿ逕ｨ縺輔ｌ繧玖ｳｪ蝠上ｒ邱ｨ髮・〒縺阪∪縺・
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              {/* 迴ｾ蝨ｨ縺ｮ雉ｪ蝠丈ｸ隕ｧ */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-700">迴ｾ蝨ｨ縺ｮ雉ｪ蝠丈ｸ隕ｧ</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {qaQuestions.map((question, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border border-blue-200 rounded">
                      {editingQuestionIndex === index ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editingQuestionText}
                            onChange={(e) => setEditingQuestionText(e.target.value)}
                            className="flex-1"
                            placeholder="雉ｪ蝠上ｒ蜈･蜉・
                          />
                          <Button
                            onClick={handleSaveQuestion}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-blue-700">Q{index + 1}:</span>
                            <span className="text-sm text-blue-600 ml-2">{question}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleMoveQuestion(index, 'up')}
                              size="sm"
                              variant="ghost"
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              竊・
                            </Button>
                            <Button
                              onClick={() => handleMoveQuestion(index, 'down')}
                              size="sm"
                              variant="ghost"
                              disabled={index === qaQuestions.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              竊・
                            </Button>
                            <Button
                              onClick={() => handleEditQuestion(index)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteQuestion(index)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 譁ｰ縺励＞雉ｪ蝠剰ｿｽ蜉 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-700">譁ｰ縺励＞雉ｪ蝠上ｒ霑ｽ蜉</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="譁ｰ縺励＞雉ｪ蝠上ｒ蜈･蜉・
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddQuestion}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    霑ｽ蜉
                  </Button>
                </div>
              </div>

              {/* 隱ｬ譏・*/}
              <div className="text-xs text-blue-400 bg-blue-50 p-2 rounded">
                <p>窶｢ 雉ｪ蝠上・鬆・ｺ上・荳贋ｸ狗泙蜊ｰ繝懊ち繝ｳ縺ｧ螟画峩縺ｧ縺阪∪縺・/p>
                <p>窶｢ 譛菴・縺､縺ｮ雉ｪ蝠上′蠢・ｦ√〒縺・/p>
                <p>窶｢ 螟画峩縺ｯ閾ｪ蜍慕噪縺ｫ菫晏ｭ倥＆繧後∪縺・/p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-400 to-sky-500 text-white">
            <CardTitle className="text-lg flex items-center">
              <Mic className="mr-2 h-5 w-5" />
              騾夂衍險ｭ螳・
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-blue-700">騾夂衍繧呈怏蜉ｹ縺ｫ縺吶ｋ</p>
                  <p className="text-sm text-blue-400">譁ｰ縺励＞繝｡繝・そ繝ｼ繧ｸ縺ｮ騾夂衍繧貞女縺大叙繧・/p>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-blue-700">髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡</p>
                  <p className="text-sm text-blue-400">AI蠢懃ｭ斐ｒ髻ｳ螢ｰ縺ｧ隱ｭ縺ｿ荳翫￡繧・/p>
                </div>
                <Switch 
                  checked={textToSpeech} 
                  onCheckedChange={setTextToSpeech}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {textToSpeech && (
                <div className="py-2 border-t border-blue-100 pt-3">
                  <p className="font-medium mb-2 text-blue-700">髻ｳ螢ｰ縺ｮ髻ｳ驥・/p>
                  <Slider 
                    value={speechVolume} 
                    onValueChange={setSpeechVolume}
                    max={100}
                    step={1}
                    className="data-[state=checked]:bg-blue-500"
                  />
                  <div className="flex justify-between mt-1">
                    <Volume2 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-500 font-medium">{speechVolume[0]}%</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white">
            <CardTitle className="text-lg flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              繧｢繝励Μ險ｭ螳・
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-indigo-700">繝繝ｼ繧ｯ繝｢繝ｼ繝・/p>
                  <p className="text-sm text-indigo-400">證励＞濶ｲ縺ｮ繝・・繝槭ｒ菴ｿ逕ｨ縺吶ｋ</p>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">閾ｪ蜍穂ｿ晏ｭ・/p>
                  <p className="text-sm text-indigo-400">莨夊ｩｱ繧定・蜍慕噪縺ｫ菫晏ｭ倥☆繧・/p>
                </div>
                <Switch 
                  checked={autoSave} 
                  onCheckedChange={setAutoSave}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">迢ｬ閾ｪ縺ｮ謚陦楢ｳ・侭縺ｮ縺ｿ繧剃ｽｿ逕ｨ</p>
                  <p className="text-sm text-indigo-400">AI蠢懃ｭ斐↓逋ｻ骭ｲ貂医∩繝翫Ξ繝・ず縺ｮ縺ｿ繧剃ｽｿ逕ｨ縺吶ｋ</p>
                </div>
                <Switch 
                  checked={useOnlyKnowledgeBase} 
                  onCheckedChange={setUseOnlyKnowledgeBase}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="py-2 border-t border-blue-100 pt-3 flex justify-end">
                <Button
                  onClick={saveSettings}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
                >
                  <Save className="mr-2 h-4 w-4" />
                  險ｭ螳壹ｒ菫晏ｭ・
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Dialog */}
      <WarningDialog
        open={showWarningDialog}
        title="繝ｭ繧ｰ繧｢繧ｦ繝育｢ｺ隱・
        message="繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｦ繧ゅｈ繧阪＠縺・〒縺吶°・滓悴菫晏ｭ倥・繝・・繧ｿ縺ｯ螟ｱ繧上ｌ繧句庄閭ｽ諤ｧ縺後≠繧翫∪縺吶・
        onCancel={() => setShowWarningDialog(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}