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

  // シスチE��健全性チェチE��機�Eは削除されました - シスチE��診断ペ�Eジに統吁E

  // Q&A質問管琁E���Eは削除されました

  // 機種と機械番号管琁E��の状慁E
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string, machine_type_id: string}>>([]);
  const [newMachineType, setNewMachineType] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isLoadingMachineData, setIsLoadingMachineData] = useState(false);

  // 機種チE�Eタを�E期読み込み
  useEffect(() => {
    fetchMachineData();
  }, []);

  // 機種と機械番号のチE�Eタを取征E
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
    if (!confirm(`機種、E{typeName}」を削除してもよろしぁE��すか�E�\n関連する機械番号も削除されます。`)) return;
    const response = await fetch(`/api/machines/machine-types/${typeId}`, { method: 'DELETE' });
    if (response.ok) fetchMachineData();
  };

  const deleteMachineNumber = async (machineId: string, machineNumber: string) => {
    if (!confirm(`機械番号、E{machineNumber}」を削除してもよろしぁE��すか�E�`)) return;
    const response = await fetch(`/api/machines/machines/${machineId}`, { method: 'DELETE' });
    if (response.ok) fetchMachineData();
  };

  // LocalStorageからの設定読み込み
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
        // Q&A質問管琁E���Eは削除されました
        }
      } catch (error) {
        console.error('設定�E読み込みに失敗しました:', error);
      }
    };

    loadSettings();
  }, []);

  // 設定保存関数�E�トチE�Eレベルに移動！E
  const saveSettings = () => {
    try {
      const settings = {
        notifications,
        textToSpeech,
        speechVolume,
        darkMode,
        autoSave,
        useOnlyKnowledgeBase
        // qaQuestions は削除されました
      };
      localStorage.setItem('emergencyRecoverySettings', JSON.stringify(settings));
      localStorage.setItem('useOnlyKnowledgeBase', useOnlyKnowledgeBase.toString());
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    } catch (error) {
      console.error('設定�E保存に失敗しました:', error);
    }
  };

  // 設定変更時�E自動保孁E
  useEffect(() => {
    saveSettings();
  }, [notifications, textToSpeech, speechVolume, darkMode, autoSave, useOnlyKnowledgeBase]);


  const handleLogout = async () => {
    setShowWarningDialog(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "ログアウト失敁E,
        description: "ログアウト中にエラーが発生しました、E,
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
        throw new Error('クリーンアチE�Eに失敗しました');
      }

      const result = await response.json();
      toast({
        title: "クリーンアチE�E完亁E,
        description: `アチE�EロードファイルをクリーンアチE�Eしました`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "クリーンアチE�Eに失敗しました",
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
        throw new Error('ログクリーンアチE�Eに失敗しました');
      }

      const result = await response.json();
      toast({
        title: "ログクリーンアチE�E完亁E,
        description: `${result.deletedCount}件のログファイルを削除しました (${(result.totalSize / 1024 / 1024).toFixed(2)} MB)`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログクリーンアチE�Eに失敗しました",
        variant: "destructive"
      });
    }
  };

  // Q&A質問管琁E�E関数は削除されました

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <Settings className="mr-2 h-6 w-6 text-indigo-500" />
          設宁E
        </h1>
        <p className="text-blue-400">アプリケーションの設定を管琁E��まぁE/p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5" />
              ユーザープロフィール
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-blue-800">{user?.displayName}</p>
                  <p className="text-sm text-blue-400">{user?.username}</p>
                  <p className="text-sm text-blue-400">{user?.department || '部署未設宁E}</p>
                </div>
                <div className={`text-white text-xs px-3 py-1 rounded-full ${user?.role === 'admin' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}>
                  {user?.role === 'admin' ? '管琁E��E : '一般ユーザー'}
                </div>
              </div>
              
              {/* こ�EアプリにつぁE��の説昁E*/}
              <div className="border-t border-blue-100 pt-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">Emergency Recovery Chat</p>
                  <p className="text-sm text-blue-500">バ�Eジョン 1.0.0</p>
                  <p className="text-sm text-blue-500">© 2024 All Rights Reserved</p>
                  <p className="text-xs text-blue-400">
                    応急復旧サポ�Eト�Eための対話型アシスタントシスチE��
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
                管琁E��E��宁E
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">ユーザー管琁E/p>
                    <p className="text-sm text-blue-400">ユーザーアカウントを管琁E��めE/p>
                  </div>
                  <Link to="/users">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <UserPlus className="mr-2 h-4 w-4 text-blue-500" />
                      管琁E
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">シスチE��診断</p>
                    <p className="text-sm text-blue-400">DB接続とGPT接続�E状態を確誁E/p>
                  </div>
                  <Link to="/system-diagnostic">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <CheckCircle className="mr-2 h-4 w-4 text-blue-500" />
                      診断
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
                    一時ファイルを削除
                  </Button>

                  <Button
                    onClick={handleCleanupLogs}
                    variant="outline"
                    className="w-full"
                  >
                    <FileX className="mr-2 h-4 w-4" />
                    ログファイルを削除
                  </Button>
                </div>

                {/* 機種・機械番号管琁EI */}
                <div className="border-t border-blue-100 pt-4 space-y-4">
                  {/* 機種追加 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">新規機種追加</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="機種名を入劁E
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
                        追加
                      </Button>
                    </div>
                  </div>
                  {/* 機械番号追加 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">新規機械番号追加</Label>
                    <div className="flex gap-2">
                      <Select value={selectedMachineType} onValueChange={setSelectedMachineType}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="機種を選抁E />
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
                        placeholder="機械番号を�E劁E
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
                        追加
                      </Button>
                    </div>
                  </div>
                  {/* 現在の機種・機械番号一覧 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">現在の登録状況E/Label>
                    {isLoadingMachineData ? (
                      <div className="text-sm text-blue-400">読み込み中...</div>
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
                                  <span className="text-gray-400">機械番号未登録</span>
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

        {/* Q&A質問管琁E��クションは削除されました */}

        {/* Notifications */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-400 to-sky-500 text-white">
            <CardTitle className="text-lg flex items-center">
              <Mic className="mr-2 h-5 w-5" />
              通知設宁E
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-blue-700">通知を有効にする</p>
                  <p className="text-sm text-blue-400">新しいメチE��ージの通知を受け取めE/p>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-blue-700">音声読み上げ</p>
                  <p className="text-sm text-blue-400">AI応答を音声で読み上げめE/p>
                </div>
                <Switch 
                  checked={textToSpeech} 
                  onCheckedChange={setTextToSpeech}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {textToSpeech && (
                <div className="py-2 border-t border-blue-100 pt-3">
                  <p className="font-medium mb-2 text-blue-700">音声の音釁E/p>
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
              アプリ設宁E
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-indigo-700">ダークモーチE/p>
                  <p className="text-sm text-indigo-400">暗い色のチE�Eマを使用する</p>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">自動保孁E/p>
                  <p className="text-sm text-indigo-400">会話を�E動的に保存すめE/p>
                </div>
                <Switch 
                  checked={autoSave} 
                  onCheckedChange={setAutoSave}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">独自の技術賁E��のみを使用</p>
                  <p className="text-sm text-indigo-400">AI応答に登録済みナレチE��のみを使用する</p>
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
                  設定を保孁E
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Dialog */}
      <WarningDialog
        open={showWarningDialog}
        title="ログアウト確誁E
        message="ログアウトしてもよろしぁE��すか�E�未保存�EチE�Eタは失われる可能性があります、E
        onCancel={() => setShowWarningDialog(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
