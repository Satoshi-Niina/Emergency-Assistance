import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast";
import { buildApiUrl } from "../lib/api/config";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { 
  Settings, 
  Volume2, 
  Mic, 
  User, 
  Shield, 
  Save, 
  Trash2, 
  FileX, 
  UserPlus, 
  Plus, 
  X,
  CheckCircle
} from "lucide-react";
import { WarningDialog } from "../components/shared/warning-dialog";
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

  // システム健全性チェック
  // System health state removed - integrated into system diagnostic page



  // Q&A質問管理用の状態・関数は削除

  // 機種と機械番号管理用の状態
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string, machine_type_id: string}>>([]);
  const [newMachineType, setNewMachineType] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isLoadingMachineData, setIsLoadingMachineData] = useState(false);

  // 機種データを初期読み込み
  useEffect(() => {
    fetchMachineData();
  }, []);

  // 機種と機械番号のデータを取得
  const fetchMachineData = async () => {
    try {
      setIsLoadingMachineData(true);
      const typesResponse = await fetch(buildApiUrl('/api/machines/machine-types'), {
        credentials: 'include'
      });
      if (typesResponse.ok) {
        const typesResult = await typesResponse.json();
        if (typesResult.success) {
          setMachineTypes(typesResult.data);
        }
      }
      const machinesResponse = await fetch(buildApiUrl('/api/machines/all-machines'), {
        credentials: 'include'
      });
      if (machinesResponse.ok) {
        const machinesResult = await machinesResponse.json();
        if (machinesResult.success) {
          const flatMachines: Array<{id: string, machine_number: string, machine_type_id: string}> = [];
          machinesResult.data.forEach((typeGroup: { type_id: string; machines?: Array<{ id: string; machine_number: string }>; }) => {
            if (typeGroup.machines && Array.isArray(typeGroup.machines)) {
              typeGroup.machines.forEach((machine: { id: string; machine_number: string }) => {
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
    const response = await fetch(buildApiUrl('/api/machines/machine-types'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ machine_type_name: newMachineType.trim() })
    });
    if (response.ok) {
      setNewMachineType('');
      fetchMachineData();
    }
  };

  const addMachineNumber = async () => {
    if (!selectedMachineType || !newMachineNumber.trim()) return;
    const response = await fetch(buildApiUrl('/api/machines/machines'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ machine_number: newMachineNumber.trim(), machine_type_id: selectedMachineType })
    });
    if (response.ok) {
      setNewMachineNumber('');
      setSelectedMachineType('');
      fetchMachineData();
    }
  };

  const deleteMachineType = async (typeId: string, typeName: string) => {
    if (!confirm(`機種「${typeName}」を削除してもよろしいですか？\n関連する機械番号も削除されます。`)) return;
    const response = await fetch(buildApiUrl(`/api/machines/machine-types/${typeId}`), { method: 'DELETE', credentials: 'include' });
    if (response.ok) fetchMachineData();
  };

  const deleteMachineNumber = async (machineId: string, machineNumber: string) => {
    if (!confirm(`機械番号「${machineNumber}」を削除してもよろしいですか？`)) return;
    const response = await fetch(buildApiUrl(`/api/machines/machines/${machineId}`), { method: 'DELETE', credentials: 'include' });
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
  // Q&A質問管理用の設定は削除
        }
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
      }
    };

    loadSettings();
  }, []);

  // 設定保存関数（トップレベルに移動）
  const saveSettings = useCallback(() => {
    try {
      const settings = {
        notifications,
        textToSpeech,
        speechVolume,
        darkMode,
        autoSave,
        useOnlyKnowledgeBase,
  // Q&A質問管理用の設定は削除
      };
      localStorage.setItem('emergencyRecoverySettings', JSON.stringify(settings));
      localStorage.setItem('useOnlyKnowledgeBase', useOnlyKnowledgeBase.toString());
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  }, [notifications, textToSpeech, speechVolume, darkMode, autoSave, useOnlyKnowledgeBase]);

  // 設定変更時の自動保存
  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // ログアウトは確認ダイアログから直接実行

  const confirmLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "ログアウト失敗",
        description: "ログアウト中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setShowWarningDialog(false);
    }
  };

  const handleCleanupUploads = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/tech-support/cleanup-uploads'), {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('クリーンアップに失敗しました');
      }

  await response.json().catch(() => ({}));
      toast({
        title: "クリーンアップ完了",
        description: `アップロードファイルをクリーンアップしました`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "クリーンアップに失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleCleanupLogs = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/tech-support/cleanup-logs'), {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('ログクリーンアップに失敗しました');
      }

      const result = await response.json();
      const count = result.backupCount ?? result.deletedCount ?? 0;
      toast({
        title: "ログバックアップ完了",
        description: `${count}件のログファイルをバックアップしました (${(result.totalSize / 1024 / 1024).toFixed(2)} MB)`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログバックアップに失敗しました",
        variant: "destructive"
      });
    }
  };

  // Q&A質問管理用の関数は削除

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <Settings className="mr-2 h-6 w-6 text-indigo-500" />
          設定
        </h1>
        <p className="text-blue-400">アプリケーションの設定を管理します</p>
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
                  <p className="text-sm text-blue-400">{user?.department || '部署未設定'}</p>
                </div>
                <div className={`text-white text-xs px-3 py-1 rounded-full ${user?.role === 'admin' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}>
                  {user?.role === 'admin' ? '管理者' : '一般ユーザー'}
                </div>
              </div>
              
              {/* このアプリについての説明 */}
              <div className="border-t border-blue-100 pt-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">Emergency Recovery Chat</p>
                  <p className="text-sm text-blue-500">バージョン 1.0.0</p>
                  <p className="text-sm text-blue-500">© 2024 All Rights Reserved</p>
                  <p className="text-xs text-blue-400">
                    応急復旧サポートのための対話型アシスタントシステム
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
                管理者設定
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">ユーザー管理</p>
                    <p className="text-sm text-blue-400">ユーザーアカウントを管理する</p>
                  </div>
                  <Link to="/users">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <UserPlus className="mr-2 h-4 w-4 text-blue-500" />
                      管理
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">システム診断</p>
                    <p className="text-sm text-blue-400">DB接続とGPT接続の状態を確認</p>
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
                    ログのバックアップ
                  </Button>
                </div>

                {/* 機種・機械番号管理UI */}
                <div className="border-t border-blue-100 pt-4 space-y-4">
                  {/* 機種追加 */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-blue-700">新規機種追加</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="機種名を入力"
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
                          <SelectValue placeholder="機種を選択" />
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
                        placeholder="機械番号を入力"
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
                    <Label className="text-sm font-medium text-blue-700">現在の登録状況</Label>
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

  {/* Q&A質問管理UIは削除済み */}

        {/* Notifications */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-400 to-sky-500 text-white">
            <CardTitle className="text-lg flex items-center">
              <Mic className="mr-2 h-5 w-5" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-blue-700">通知を有効にする</p>
                  <p className="text-sm text-blue-400">新しいメッセージの通知を受け取る</p>
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
                  <p className="text-sm text-blue-400">AI応答を音声で読み上げる</p>
                </div>
                <Switch 
                  checked={textToSpeech} 
                  onCheckedChange={setTextToSpeech}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {textToSpeech && (
                <div className="py-2 border-t border-blue-100 pt-3">
                  <p className="font-medium mb-2 text-blue-700">音声の音量</p>
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
              アプリ設定
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-indigo-700">ダークモード</p>
                  <p className="text-sm text-indigo-400">暗い色のテーマを使用する</p>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">自動保存</p>
                  <p className="text-sm text-indigo-400">会話を自動的に保存する</p>
                </div>
                <Switch 
                  checked={autoSave} 
                  onCheckedChange={setAutoSave}
                  className="data-[state=checked]:bg-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                <div>
                  <p className="font-medium text-indigo-700">独自の技術資料のみを使用</p>
                  <p className="text-sm text-indigo-400">AI応答に登録済みナレッジのみを使用する</p>
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
                  設定を保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Dialog */}
      <WarningDialog
        open={showWarningDialog}
        title="ログアウト確認"
        message="ログアウトしてもよろしいですか？未保存のデータは失われる可能性があります。"
        onCancel={() => setShowWarningDialog(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}