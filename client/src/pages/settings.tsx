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
  AlertCircle
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

  // 機種と機械番号管理用の状態
  const [machineTypes, setMachineTypes] = useState<Array<{id: string, machine_type_name: string}>>([]);
  const [machines, setMachines] = useState<Array<{id: string, machine_number: string, machine_type_id: string}>>([]);
  const [newMachineType, setNewMachineType] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isLoadingMachineData, setIsLoadingMachineData] = useState(false);

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
        }
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
      }
    };

    loadSettings();
  }, []);

  // 設定変更時の保存
  useEffect(() => {
    const saveSettings = () => {
      try {
        const settings = {
          notifications,
          textToSpeech,
          speechVolume,
          darkMode,
          autoSave,
          useOnlyKnowledgeBase
        };

        localStorage.setItem('emergencyRecoverySettings', JSON.stringify(settings));

        // ナレッジベース使用設定を別途保存 (チャットコンテキストで参照するため)
        localStorage.setItem('useOnlyKnowledgeBase', useOnlyKnowledgeBase.toString());
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
      }
    };

    saveSettings();
  }, [notifications, textToSpeech, speechVolume, darkMode, autoSave, useOnlyKnowledgeBase]);

  // 機種データを初期読み込み
  useEffect(() => {
    fetchMachineData();
  }, []);

  // システム健全性チェックは削除 - システム診断ページに統合

  // 機種と機械番号のデータを取得
  const fetchMachineData = async () => {
    try {
      setIsLoadingMachineData(true);
      console.log('機種・機械番号データ取得開始');
      
      // 機種一覧を取得
      console.log('機種一覧取得URL:', `${API_BASE_URL}/api/machine-types`);
      const typesResponse = await fetch(`${API_BASE_URL}/api/machine-types`);
      console.log('機種一覧レスポンスステータス:', typesResponse.status);
      
      if (typesResponse.ok) {
        const typesResult = await typesResponse.json();
        console.log('機種一覧結果:', typesResult);
        if (typesResult.success) {
          setMachineTypes(typesResult.data);
        } else {
          console.error('機種一覧取得成功だがsuccess=false:', typesResult);
        }
      } else {
        const errorText = await typesResponse.text();
        console.error('機種一覧取得エラー:', typesResponse.status, errorText);
      }

      // 機械番号一覧を取得（全機種）
      console.log('機械番号一覧取得URL:', `${API_BASE_URL}/api/all-machines`);
      const machinesResponse = await fetch(`${API_BASE_URL}/api/all-machines`);
      console.log('機械番号一覧レスポンスステータス:', machinesResponse.status);
      
      if (machinesResponse.ok) {
        const machinesResult = await machinesResponse.json();
        console.log('機械番号一覧結果:', machinesResult);
        if (machinesResult.success) {
          // フラットな配列に変換
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
        } else {
          console.error('機械番号一覧取得成功だがsuccess=false:', machinesResult);
        }
      } else {
        const errorText = await machinesResponse.text();
        console.error('機械番号一覧取得エラー:', machinesResponse.status, errorText);
      }
    } catch (error) {
      console.error('機種・機械番号データ取得エラー:', error);
      toast({
        title: "エラー",
        description: `機種・機械番号データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingMachineData(false);
    }
  };

  // 機種を追加
  const addMachineType = async () => {
    if (!newMachineType.trim()) {
      toast({
        title: "エラー",
        description: "機種名を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('機種追加開始:', newMachineType.trim());
      console.log('API URL:', `${API_BASE_URL}/api/machine-types`);
      
      const response = await fetch(`${API_BASE_URL}/api/machine-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_type_name: newMachineType.trim() })
      });

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('成功レスポンス:', result);
        toast({
          title: "成功",
          description: "機種を追加しました",
        });
        setNewMachineType('');
        fetchMachineData(); // データを再取得
      } else {
        const errorText = await response.text();
        console.error('エラーレスポンス:', errorText);
        throw new Error(`機種の追加に失敗しました: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('機種追加エラー:', error);
      toast({
        title: "エラー",
        description: `機種の追加に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // 機械番号を追加
  const addMachineNumber = async () => {
    if (!selectedMachineType || !newMachineNumber.trim()) {
      toast({
        title: "エラー",
        description: "機種と機械番号を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('機械番号追加開始:', newMachineNumber.trim(), '機種ID:', selectedMachineType);
      console.log('API URL:', `${import.meta.env.VITE_API_BASE_URL}/api/machines`);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          machine_number: newMachineNumber.trim(),
          machine_type_id: selectedMachineType
        })
      });

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('成功レスポンス:', result);
        toast({
          title: "成功",
          description: "機械番号を追加しました",
        });
        setNewMachineNumber('');
        setSelectedMachineType('');
        fetchMachineData(); // データを再取得
      } else {
        const errorText = await response.text();
        console.error('エラーレスポンス:', errorText);
        throw new Error(`機械番号の追加に失敗しました: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('機械番号追加エラー:', error);
      toast({
        title: "エラー",
        description: `機械番号の追加に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // 機種を削除
  const deleteMachineType = async (typeId: string, typeName: string) => {
    if (!confirm(`機種「${typeName}」を削除しますか？\n関連する機械番号も削除されます。`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/machine-types/${typeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "機種を削除しました",
        });
        fetchMachineData(); // データを再取得
      } else {
        throw new Error('機種の削除に失敗しました');
      }
    } catch (error) {
      console.error('機種削除エラー:', error);
      toast({
        title: "エラー",
        description: "機種の削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 機械番号を削除
  const deleteMachineNumber = async (machineId: string, machineNumber: string) => {
    if (!confirm(`機械番号「${machineNumber}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/machines/${machineId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "成功",
          description: "機械番号を削除しました",
        });
        fetchMachineData(); // データを再取得
      } else {
        throw new Error('機械番号の削除に失敗しました');
      }
    } catch (error) {
      console.error('機械番号削除エラー:', error);
      toast({
        title: "エラー",
        description: "機械番号の削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 設定の保存
  const saveSettings = () => {
    try {
      const settings = {
        notifications,
        textToSpeech,
        speechVolume,
        darkMode,
        autoSave,
        useOnlyKnowledgeBase
      };

      localStorage.setItem('emergencyRecoverySettings', JSON.stringify(settings));

      // 設定を別途保存 (チャットコンテキストで参照するため)
      localStorage.setItem('useOnlyKnowledgeBase', useOnlyKnowledgeBase.toString());

      toast({
        title: "設定を保存しました",
        description: `設定が正常に保存されました。`,
      });
    } catch (error) {
      toast({
        title: "設定の保存に失敗しました",
        description: "設定の保存中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    setShowWarningDialog(true);
  };

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
      const response = await fetch('/api/tech-support/cleanup-uploads', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('クリーンアップに失敗しました');
      }

      const result = await response.json();
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
      const response = await fetch('/api/tech-support/cleanup-logs', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('ログクリーンアップに失敗しました');
      }

      const result = await response.json();
      toast({
        title: "ログクリーンアップ完了",
        description: `${result.deletedCount}件のログファイルを削除しました (${(result.totalSize / 1024 / 1024).toFixed(2)} MB)`
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログクリーンアップに失敗しました",
        variant: "destructive"
      });
    }
  };

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
            </div>
          </CardContent>
        </Card>

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
                {/* システム健全性チェックは削除 - システム診断ページに統合 */}

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
                    <p className="font-medium text-blue-800">ドキュメント管理</p>
                    <p className="text-sm text-blue-400">検索対象の資料を管理する</p>
                  </div>
                  <Link to="/documents">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <FileType className="mr-2 h-4 w-4 text-blue-500" />
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
                    ログファイルを削除
                  </Button>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">機種・機械番号管理</p>
                    <p className="text-sm text-blue-400">機種と機械番号を登録・管理する</p>
                  </div>
                  <Button 
                    onClick={fetchMachineData} 
                    variant="outline" 
                    size="sm" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Database className="mr-2 h-4 w-4 text-blue-500" />
                    更新
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

                <div className="flex items-center justify-between py-2 border-t border-blue-100 pt-3">
                  <div>
                    <p className="font-medium text-blue-800">ログアウト</p>
                    <p className="text-sm text-blue-400">システムからログアウトする</p>
                  </div>
                  <Button 
                    onClick={handleLogout} 
                    variant="outline" 
                    size="sm" 
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4 text-red-500" />
                    ログアウト
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* About */}
        <Card className="border border-blue-200 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
            <CardTitle className="text-lg flex items-center">
              <Info className="mr-2 h-5 w-5" />
              このアプリについて
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-700">Emergency Recovery Chat</p>
              <p className="text-sm text-cyan-500">バージョン 1.0.0</p>
              <p className="text-sm text-cyan-500">© 2024 All Rights Reserved</p>
              <div className="pt-2 mt-2 border-t border-blue-100">
                <p className="text-xs text-blue-400">
                  応急復旧サポートのための対話型アシスタントシステム
                </p>
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