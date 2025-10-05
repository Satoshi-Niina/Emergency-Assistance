import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
import RagPerformanceDisplay from '../components/RagPerformanceDisplay';
import {
  Database,
  FileText,
  Upload,
  Settings,
  Edit,
  Wrench,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Brain,
  RefreshCw,
  Target,
  Activity,
  Sliders,
  FileSearch,
  Zap,
  MessageCircle,
  Bot,
  Users,
  Lightbulb,
  Save,
} from 'lucide-react';
import VehicleMaintenanceForm from '../components/maintenance/VehicleMaintenanceForm';
import { useNavigate } from 'react-router-dom';

interface ImportStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

export default function BaseDataPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ragSettings, setRagSettings] = useState({
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
    maxResults: 5,
    enableSemantic: true,
    enableKeyword: true,
    customPrompt: '',
    preprocessing: {
      removeStopWords: true,
      normalizeCasing: true,
      removeSpecialChars: false,
    },
  });
  
  // AI支援カスタマイズ設定
  const [aiAssistSettings, setAiAssistSettings] = useState({
    initialPrompt: '何か問題がありましたか？お困りの事象を教えてください！',
    conversationStyle: 'frank', // 'frank', 'business', 'technical'
    questionFlow: {
      step1: '具体的な症状を教えてください',
      step2: 'いつ頃から発生していますか？',
      step3: '作業環境や状況を教えてください',
      step4: '他に気になることはありますか？',
      step5: '緊急度を教えてください'
    },
    branchingConditions: {
      timeCheck: true,
      detailsCheck: true,
      toolsCheck: true,
      safetyCheck: true
    },
    responsePattern: 'step_by_step', // 'step_by_step', 'comprehensive', 'minimal'
    escalationTime: 20, // 分
    customInstructions: '',
    enableEmergencyContact: true
  });
  const navigate = useNavigate();

  // ファイル選択の処理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);

    if (files) {
      const statusList: ImportStatus[] = Array.from(files).map(file => ({
        fileName: file.name,
        status: 'pending',
      }));
      setImportStatus(statusList);
    }
  };

  // ファイルのインポート処理
  const handleImport = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('ファイルを選択してください');
      return;
    }

    setIsProcessing(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // ステータスを「処理中」に更新
        setImportStatus(prev =>
          prev.map((status, index) =>
            index === i ? { ...status, status: 'processing' as const } : status
          )
        );

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/files/import', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            setImportStatus(prev =>
              prev.map((status, index) =>
                index === i
                  ? {
                      ...status,
                      status: 'success' as const,
                      message: result.message || 'インポート完了',
                    }
                  : status
              )
            );
          } else {
            const error = await response.json();
            setImportStatus(prev =>
              prev.map((status, index) =>
                index === i
                  ? {
                      ...status,
                      status: 'error' as const,
                      message: error.message || 'インポートエラー',
                    }
                  : status
              )
            );
          }
        } catch (_error) {
          setImportStatus(prev =>
            prev.map((status, index) =>
              index === i
                ? {
                    ...status,
                    status: 'error' as const,
                    message: 'ネットワークエラー',
                  }
                : status
            )
          );
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ImportStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant='secondary'>待機中</Badge>;
      case 'processing':
        return <Badge variant='default'>処理中</Badge>;
      case 'success':
        return (
          <Badge variant='default' className='bg-green-500'>
            完了
          </Badge>
        );
      case 'error':
        return <Badge variant='destructive'>エラー</Badge>;
      default:
        return <Badge variant='secondary'>不明</Badge>;
    }
  };

  // RAG設定の保存
  const saveRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ragSettings),
        credentials: 'include',
      });

      if (response.ok) {
        alert('RAG設定が保存されました');
      } else {
        throw new Error('設定の保存に失敗しました');
      }
    } catch (_error) {
      // RAG設定保存エラー
      alert('設定の保存中にエラーが発生しました');
    }
  };

  // RAG設定の読み込み
  const loadRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const settings = data.success ? data.data : data;

        // デフォルト値とマージして、不足しているプロパティを補完
        setRagSettings(prev => ({
          ...prev,
          ...settings,
          preprocessing: {
            removeStopWords: true,
            normalizeCasing: true,
            removeSpecialChars: false,
            ...settings.preprocessing,
          },
        }));
      }
    } catch (_error) {
      // RAG設定読み込みエラー - デフォルト値を使用
    }
  };

  // AI支援設定の保存
  const saveAiAssistSettings = async () => {
    try {
      // ローカルストレージに一時保存（実際の実装ではAPIに保存）
      localStorage.setItem('aiAssistSettings', JSON.stringify(aiAssistSettings));
      
      // 実際の実装では、サーバーAPIに送信
      // const response = await fetch('/api/ai-assist/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(aiAssistSettings)
      // });
      
      alert('AI支援設定を保存しました');
    } catch (_error) {
      alert('AI支援設定の保存に失敗しました');
    }
  };

  // AI支援設定の読み込み
  const loadAiAssistSettings = async () => {
    try {
      const saved = localStorage.getItem('aiAssistSettings');
      if (saved) {
        setAiAssistSettings(JSON.parse(saved));
      }
    } catch (_error) {
      // AI支援設定読み込みエラー（無視）
    }
  };

  // コンポーネントマウント時に設定を読み込み
  useEffect(() => {
    loadRagSettings();
    loadAiAssistSettings();
  }, []);

  return (
    <div className='container mx-auto p-6'>
      {/* ヘッダー */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>
          <Database className='inline mr-2' />
          基礎データ管理
        </h1>
        <p className='text-gray-600'>
          保守用車両データの管理とAIの設定を行います
        </p>
      </div>

      {/* メインコンテンツ */}
      <Tabs defaultValue='import' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='import' className='flex items-center gap-2'>
            <Upload className='h-4 w-4' />
            データインポート
          </TabsTrigger>
          <TabsTrigger value='manual' className='flex items-center gap-2'>
            <Edit className='h-4 w-4' />
            手動入力
          </TabsTrigger>
          <TabsTrigger value='settings' className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            AI調整
          </TabsTrigger>
        </TabsList>

        {/* インポートタブ */}
        <TabsContent value='import' className='space-y-6'>
          <div className='p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl shadow-sm'>
          <Card className='border-indigo-300 shadow-md'>
            <CardHeader className='bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-indigo-200'>
              <CardTitle className='flex items-center gap-2 text-indigo-800'>
                <FileText className='h-5 w-5 text-indigo-600' />
                ファイルインポート
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='file-upload'>
                  ファイルを選択 (TXT, PDF, XLSX, PPTX)
                </Label>
                <Input
                  id='file-upload'
                  type='file'
                  multiple
                  accept='.txt,.pdf,.xlsx,.pptx'
                  onChange={handleFileSelect}
                  className='mt-1'
                />
              </div>

              {selectedFiles && (
                <div className='space-y-2'>
                  <h4 className='font-medium'>選択されたファイル:</h4>
                  <div className='space-y-2'>
                    {importStatus.map((status, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between p-2 bg-gray-50 rounded'
                      >
                        <div className='flex items-center gap-2'>
                          <FileText className='h-4 w-4' />
                          <span className='text-sm'>{status.fileName}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          {getStatusBadge(status.status)}
                          {status.message && (
                            <span className='text-xs text-gray-500'>
                              {status.message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFiles || isProcessing}
                className='w-full'
              >
                {isProcessing ? (
                  <>
                    <AlertTriangle className='mr-2 h-4 w-4' />
                    処理中...
                  </>
                ) : (
                  <>
                    <Upload className='mr-2 h-4 w-4' />
                    インポート実行
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ナレッジデータ管理カード */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Brain className='h-5 w-5 text-purple-600' />
                ナレッジデータ管理（ライフサイクル）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KnowledgeLifecycleManagement />
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* 手動入力タブ */}
        <TabsContent value='manual' className='space-y-6'>
          <div className='p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl shadow-sm'>
          <Card className='border-teal-300 shadow-md'>
            <CardHeader className='bg-gradient-to-r from-teal-100 to-cyan-100 border-b border-teal-200'>
              <CardTitle className='flex items-center gap-2 text-teal-800'>
                <Wrench className='h-5 w-5 text-teal-600' />
                機械故情報入力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleMaintenanceForm />
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* 設定タブ */}
        <TabsContent value='settings' className='space-y-6'>
          <div className='p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl shadow-sm space-y-6'>
          {/* 基本設定 */}
          <Card className='border-purple-300 shadow-md'>
            <CardHeader className='bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200'>
              <CardTitle className='flex items-center gap-2 text-purple-800'>
                <Settings className='h-5 w-5 text-purple-600' />
                基本システム設定
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>データディレクトリ</Label>
                  <div className='flex items-center gap-2 p-3 bg-gray-50 rounded'>
                    <FolderOpen className='h-4 w-4 text-gray-500' />
                    <span className='text-sm text-gray-700'>
                      /knowledge-base/vehicle-maintenance
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>許可ファイル形式</Label>
                  <div className='flex gap-2'>
                    <Badge variant='outline'>TXT</Badge>
                    <Badge variant='outline'>PDF</Badge>
                    <Badge variant='outline'>XLSX</Badge>
                    <Badge variant='outline'>PPTX</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI支援カスタマイズ設定 */}
          <Card className='border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100'>
            <CardHeader className='bg-gradient-to-r from-purple-100 to-purple-200 border-b border-purple-300'>
              <CardTitle className='flex items-center gap-2 text-purple-800'>
                <MessageCircle className='h-5 w-5 text-purple-700' />
                AI支援カスタマイズ設定
              </CardTitle>
              <p className='text-sm text-purple-700'>
                チャットUIのAI支援機能をカスタマイズします
              </p>
            </CardHeader>
            <CardContent className='space-y-6 bg-white'>
              {/* 初期プロンプト設定 */}
              <div className='space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-blue-800'>
                  <Bot className='h-4 w-4 text-blue-600' />
                  初期対話設定
                </h4>
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='initialPrompt'>初期メッセージ</Label>
                    <Textarea
                      id='initialPrompt'
                      value={aiAssistSettings.initialPrompt}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          initialPrompt: e.target.value,
                        }))
                      }
                      placeholder='AI支援開始時の最初の問いかけ...'
                      rows={2}
                    />
                    <p className='text-xs text-gray-500'>
                      AI支援が開始されたときの最初のメッセージ
                    </p>
                  </div>
                </div>
              </div>

              {/* 会話スタイル設定 */}
              <div className='space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-green-800'>
                  <Users className='h-4 w-4 text-green-600' />
                  会話スタイル
                </h4>
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label>話し方・トーン</Label>
                    <div className='grid grid-cols-3 gap-2'>
                      <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                        <input
                          type='radio'
                          name='conversationStyle'
                          value='frank'
                          checked={aiAssistSettings.conversationStyle === 'frank'}
                          onChange={e =>
                            setAiAssistSettings(prev => ({
                              ...prev,
                              conversationStyle: e.target.value,
                            }))
                          }
                          className='rounded'
                        />
                        <div className='text-sm'>
                          <div className='font-medium'>フランク</div>
                          <div className='text-gray-500'>親しみやすい</div>
                        </div>
                      </label>
                      <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                        <input
                          type='radio'
                          name='conversationStyle'
                          value='business'
                          checked={aiAssistSettings.conversationStyle === 'business'}
                          onChange={e =>
                            setAiAssistSettings(prev => ({
                              ...prev,
                              conversationStyle: e.target.value,
                            }))
                          }
                          className='rounded'
                        />
                        <div className='text-sm'>
                          <div className='font-medium'>ビジネス</div>
                          <div className='text-gray-500'>丁寧・正式</div>
                        </div>
                      </label>
                      <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                        <input
                          type='radio'
                          name='conversationStyle'
                          value='technical'
                          checked={aiAssistSettings.conversationStyle === 'technical'}
                          onChange={e =>
                            setAiAssistSettings(prev => ({
                              ...prev,
                              conversationStyle: e.target.value,
                            }))
                          }
                          className='rounded'
                        />
                        <div className='text-sm'>
                          <div className='font-medium'>技術的</div>
                          <div className='text-gray-500'>専門用語中心</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 質問フロー設定 */}
              <div className='space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-yellow-800'>
                  <Lightbulb className='h-4 w-4 text-yellow-600' />
                  質問の流れ設定
                </h4>
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label htmlFor='step1'>ステップ1：症状確認</Label>
                    <Input
                      id='step1'
                      value={aiAssistSettings.questionFlow.step1}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          questionFlow: {
                            ...prev.questionFlow,
                            step1: e.target.value,
                          },
                        }))
                      }
                      placeholder='具体的な症状を聞く質問...'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='step2'>ステップ2：発生時期</Label>
                    <Input
                      id='step2'
                      value={aiAssistSettings.questionFlow.step2}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          questionFlow: {
                            ...prev.questionFlow,
                            step2: e.target.value,
                          },
                        }))
                      }
                      placeholder='いつから発生しているかを聞く質問...'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='step3'>ステップ3：環境確認</Label>
                    <Input
                      id='step3'
                      value={aiAssistSettings.questionFlow.step3}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          questionFlow: {
                            ...prev.questionFlow,
                            step3: e.target.value,
                          },
                        }))
                      }
                      placeholder='作業環境や状況を聞く質問...'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='step4'>ステップ4：追加情報</Label>
                    <Input
                      id='step4'
                      value={aiAssistSettings.questionFlow.step4}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          questionFlow: {
                            ...prev.questionFlow,
                            step4: e.target.value,
                          },
                        }))
                      }
                      placeholder='他に気になることを聞く質問...'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='step5'>ステップ5：緊急度確認</Label>
                    <Input
                      id='step5'
                      value={aiAssistSettings.questionFlow.step5}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          questionFlow: {
                            ...prev.questionFlow,
                            step5: e.target.value,
                          },
                        }))
                      }
                      placeholder='緊急度を確認する質問...'
                    />
                  </div>
                </div>
              </div>

              {/* 分岐条件設定 */}
              <div className='space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-orange-800'>
                  <Target className='h-4 w-4 text-orange-600' />
                  分岐条件設定
                </h4>
                <div className='space-y-2'>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={aiAssistSettings.branchingConditions.timeCheck}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          branchingConditions: {
                            ...prev.branchingConditions,
                            timeCheck: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>時間経過での分岐（「時間はありますか？」）</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={aiAssistSettings.branchingConditions.detailsCheck}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          branchingConditions: {
                            ...prev.branchingConditions,
                            detailsCheck: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>詳細確認での分岐（「詳細を教えていただけますか？」）</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={aiAssistSettings.branchingConditions.toolsCheck}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          branchingConditions: {
                            ...prev.branchingConditions,
                            toolsCheck: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>工具確認での分岐（「必要な工具はありますか？」）</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={aiAssistSettings.branchingConditions.safetyCheck}
                      onChange={e =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          branchingConditions: {
                            ...prev.branchingConditions,
                            safetyCheck: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>安全確認での分岐（「安全に作業できる状況ですか？」）</span>
                  </label>
                </div>
              </div>

              {/* 応答パターン設定 */}
              <div className='space-y-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-cyan-800'>
                  <Activity className='h-4 w-4 text-cyan-600' />
                  応答パターン
                </h4>
                <div className='space-y-2'>
                  <Label>情報提供の方法</Label>
                  <div className='grid grid-cols-1 gap-2'>
                    <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                      <input
                        type='radio'
                        name='responsePattern'
                        value='step_by_step'
                        checked={aiAssistSettings.responsePattern === 'step_by_step'}
                        onChange={e =>
                          setAiAssistSettings(prev => ({
                            ...prev,
                            responsePattern: e.target.value,
                          }))
                        }
                        className='rounded'
                      />
                      <div className='text-sm'>
                        <div className='font-medium'>段階的表示（推奨）</div>
                        <div className='text-gray-500'>1つずつ質問し、1つずつ対策を表示</div>
                      </div>
                    </label>
                    <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                      <input
                        type='radio'
                        name='responsePattern'
                        value='comprehensive'
                        checked={aiAssistSettings.responsePattern === 'comprehensive'}
                        onChange={e =>
                          setAiAssistSettings(prev => ({
                            ...prev,
                            responsePattern: e.target.value,
                          }))
                        }
                        className='rounded'
                      />
                      <div className='text-sm'>
                        <div className='font-medium'>包括的表示</div>
                        <div className='text-gray-500'>まとめて複数の対策を表示</div>
                      </div>
                    </label>
                    <label className='flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50'>
                      <input
                        type='radio'
                        name='responsePattern'
                        value='minimal'
                        checked={aiAssistSettings.responsePattern === 'minimal'}
                        onChange={e =>
                          setAiAssistSettings(prev => ({
                            ...prev,
                            responsePattern: e.target.value,
                          }))
                        }
                        className='rounded'
                      />
                      <div className='text-sm'>
                        <div className='font-medium'>最小限表示</div>
                        <div className='text-gray-500'>要点のみ簡潔に表示</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* エスカレーション設定 */}
              <div className='space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                <h4 className='font-medium flex items-center gap-2 text-red-800'>
                  <AlertTriangle className='h-4 w-4 text-red-600' />
                  エスカレーション設定
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='escalationTime'>
                      救援要請タイムアウト: {aiAssistSettings.escalationTime}分
                    </Label>
                    <Slider
                      id='escalationTime'
                      min={10}
                      max={60}
                      step={5}
                      value={[aiAssistSettings.escalationTime]}
                      onValueChange={value =>
                        setAiAssistSettings(prev => ({
                          ...prev,
                          escalationTime: value[0],
                        }))
                      }
                      className='w-full'
                    />
                    <p className='text-xs text-gray-500'>
                      この時間経過後に専門家への連絡を推奨
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <label className='flex items-center space-x-2'>
                      <input
                        type='checkbox'
                        checked={aiAssistSettings.enableEmergencyContact}
                        onChange={e =>
                          setAiAssistSettings(prev => ({
                            ...prev,
                            enableEmergencyContact: e.target.checked,
                          }))
                        }
                        className='rounded'
                      />
                      <span className='text-sm'>緊急連絡機能を有効化</span>
                    </label>
                    <p className='text-xs text-gray-500'>
                      自動で救援要請や支援者への連絡オプションを表示
                    </p>
                  </div>
                </div>
              </div>

              {/* カスタム指示 */}
              <div className='space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-lg'>
                <Label htmlFor='customInstructions' className='text-gray-800 font-medium'>追加のカスタム指示</Label>
                <Textarea
                  id='customInstructions'
                  value={aiAssistSettings.customInstructions}
                  onChange={e =>
                    setAiAssistSettings(prev => ({
                      ...prev,
                      customInstructions: e.target.value,
                    }))
                  }
                  placeholder='GPTに対する追加の指示や制約条件を入力...'
                  rows={3}
                />
                <p className='text-xs text-gray-500'>
                  AI支援の動作をさらに細かくカスタマイズするための指示
                </p>
              </div>

              {/* 設定保存ボタン */}
              <div className='flex gap-2 pt-4 border-t border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg'>
                <Button
                  onClick={saveAiAssistSettings}
                  className='flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white'
                >
                  <Save className='h-4 w-4' />
                  AI支援設定を保存
                </Button>
                <Button
                  variant='outline'
                  onClick={() => navigate('/chat')}
                  className='flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-100'
                >
                  <MessageCircle className='h-4 w-4' />
                  AI支援を試す
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RAG設定 */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Brain className='h-5 w-5' />
                RAG (Retrieval-Augmented Generation) 設定
              </CardTitle>
              <p className='text-sm text-gray-600'>
                GPTレスポンスの精度向上のための事前処理パラメーター
              </p>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* チャンク設定 */}
              <div className='space-y-4'>
                <h4 className='font-medium flex items-center gap-2'>
                  <FileSearch className='h-4 w-4' />
                  テキスト分割設定
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='chunkSize'>
                      チャンクサイズ: {ragSettings.chunkSize}文字
                    </Label>
                    <Slider
                      id='chunkSize'
                      min={200}
                      max={2000}
                      step={100}
                      value={[ragSettings.chunkSize]}
                      onValueChange={value =>
                        setRagSettings(prev => ({
                          ...prev,
                          chunkSize: value[0],
                        }))
                      }
                      className='w-full'
                    />
                    <p className='text-xs text-gray-500'>
                      テキストを分割する際の1チャンクあたりの文字数
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='chunkOverlap'>
                      オーバーラップ: {ragSettings.chunkOverlap}文字
                    </Label>
                    <Slider
                      id='chunkOverlap'
                      min={0}
                      max={500}
                      step={50}
                      value={[ragSettings.chunkOverlap]}
                      onValueChange={value =>
                        setRagSettings(prev => ({
                          ...prev,
                          chunkOverlap: value[0],
                        }))
                      }
                      className='w-full'
                    />
                    <p className='text-xs text-gray-500'>
                      チャンク間で重複させる文字数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索設定 */}
              <div className='space-y-4'>
                <h4 className='font-medium flex items-center gap-2'>
                  <Sliders className='h-4 w-4' />
                  検索精度設定
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='similarityThreshold'>
                      類似度閾値: {ragSettings.similarityThreshold}
                    </Label>
                    <Slider
                      id='similarityThreshold'
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={[ragSettings.similarityThreshold]}
                      onValueChange={value =>
                        setRagSettings(prev => ({
                          ...prev,
                          similarityThreshold: value[0],
                        }))
                      }
                      className='w-full'
                    />
                    <p className='text-xs text-gray-500'>
                      検索結果として採用する最小類似度
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='maxResults'>
                      最大取得件数: {ragSettings.maxResults}件
                    </Label>
                    <Slider
                      id='maxResults'
                      min={1}
                      max={20}
                      step={1}
                      value={[ragSettings.maxResults]}
                      onValueChange={value =>
                        setRagSettings(prev => ({
                          ...prev,
                          maxResults: value[0],
                        }))
                      }
                      className='w-full'
                    />
                    <p className='text-xs text-gray-500'>
                      1回の検索で取得する最大結果数
                    </p>
                  </div>
                </div>
              </div>

              {/* 検索手法 */}
              <div className='space-y-4'>
                <h4 className='font-medium flex items-center gap-2'>
                  <Zap className='h-4 w-4' />
                  検索手法
                </h4>
                <div className='flex gap-4'>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={ragSettings.enableSemantic}
                      onChange={e =>
                        setRagSettings(prev => ({
                          ...prev,
                          enableSemantic: e.target.checked,
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>セマンティック検索</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={ragSettings.enableKeyword}
                      onChange={e =>
                        setRagSettings(prev => ({
                          ...prev,
                          enableKeyword: e.target.checked,
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>キーワード検索</span>
                  </label>
                </div>
              </div>

              {/* 前処理設定 */}
              <div className='space-y-4'>
                <h4 className='font-medium'>テキスト前処理</h4>
                <div className='space-y-2'>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={ragSettings.preprocessing.removeStopWords}
                      onChange={e =>
                        setRagSettings(prev => ({
                          ...prev,
                          preprocessing: {
                            ...prev.preprocessing,
                            removeStopWords: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>ストップワード除去</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={ragSettings.preprocessing.normalizeCasing}
                      onChange={e =>
                        setRagSettings(prev => ({
                          ...prev,
                          preprocessing: {
                            ...prev.preprocessing,
                            normalizeCasing: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>大文字小文字正規化</span>
                  </label>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={ragSettings.preprocessing.removeSpecialChars}
                      onChange={e =>
                        setRagSettings(prev => ({
                          ...prev,
                          preprocessing: {
                            ...prev.preprocessing,
                            removeSpecialChars: e.target.checked,
                          },
                        }))
                      }
                      className='rounded'
                    />
                    <span className='text-sm'>特殊文字除去</span>
                  </label>
                </div>
              </div>

              {/* カスタムプロンプト */}
              <div className='space-y-2'>
                <Label htmlFor='customPrompt'>カスタムプロンプト</Label>
                <Textarea
                  id='customPrompt'
                  value={ragSettings.customPrompt}
                  onChange={e =>
                    setRagSettings(prev => ({
                      ...prev,
                      customPrompt: e.target.value,
                    }))
                  }
                  placeholder='RAG検索結果を活用する際の追加指示を入力...'
                  rows={3}
                />
                <p className='text-xs text-gray-500'>
                  検索結果をGPTに渡す際の追加指示
                </p>
              </div>

              {/* 設定保存ボタン */}
              <div className='flex gap-2 pt-4 border-t'>
                <Button
                  onClick={saveRagSettings}
                  className='flex items-center gap-2'
                >
                  <Settings className='h-4 w-4' />
                  RAG設定を保存
                </Button>
                <Button
                  variant='outline'
                  onClick={() => navigate('/chat')}
                  className='flex items-center gap-2'
                >
                  <CheckCircle className='h-4 w-4' />
                  チャット画面に戻る
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RAGパフォーマンス表示 */}
          <RagPerformanceDisplay />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ナレッジデータライフサイクル管理コンポーネント
function KnowledgeLifecycleManagement() {
  const [storageStats, setStorageStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    duplicates: 0,
    lastMaintenance: null,
    exportFiles: 0,
    documentFiles: 0,
    archivedFiles: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState('manual');

  // ストレージ統計の取得
  const fetchStorageStats = async () => {
    try {
      // まずナレッジベース統計APIから取得
      const knowledgeResponse = await fetch('/api/knowledge-base/stats');
      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        if (knowledgeData.success && knowledgeData.data) {
          const data = knowledgeData.data;
          setStorageStats({
            totalFiles: data.total || 0,
            totalSize: data.totalSize || 0,
            duplicates: 0, // 重複データは別途計算
            lastMaintenance: data.lastMaintenance,
            exportFiles: data.typeStats?.json || 0,
            documentFiles: data.typeStats?.document || 0,
            archivedFiles: data.oldData || 0,
          });
          return;
        }
      }

      // フォールバック: 管理ダッシュボードAPIから取得
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStorageStats(data.storageStats || {
          totalFiles: 0,
          totalSize: 0,
          duplicates: 0,
          lastMaintenance: null,
          exportFiles: 0,
          documentFiles: 0,
          archivedFiles: 0,
        });
      }
    } catch (_error) {
      // エラーは無視してデフォルト値を使用
      setStorageStats({
        totalFiles: 0,
        totalSize: 0,
        duplicates: 0,
        lastMaintenance: null,
        exportFiles: 0,
        documentFiles: 0,
        archivedFiles: 0,
      });
    }
  };

  // メンテナンス実行
  const runMaintenance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge/maintenance/run', {
        method: 'POST',
      });
      if (response.ok) {
        await fetchStorageStats();
      }
    } catch (_error) {
      // エラーは無視
    } finally {
      setIsLoading(false);
    }
  };

  // 重複解決
  const resolveDuplicates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge/deduplication/resolve', {
        method: 'POST',
      });
      if (response.ok) {
        await fetchStorageStats();
      }
    } catch (_error) {
      // エラーは無視
    } finally {
      setIsLoading(false);
    }
  };

  // 自動削除（1年以上経過データ）
  const handleAutoCleanup = async () => {
    if (!confirm('1年以上経過したナレッジデータを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/cleanup/auto', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        const resultsDiv = document.getElementById('cleanup-results');
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div class="text-green-600">
              <strong>削除完了:</strong> ${result.deletedCount}件のファイルを削除しました<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        }
        await fetchStorageStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }
    } catch (error) {
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="text-red-600">
            <strong>削除エラー:</strong> ${error.message}<br>
            <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 手動削除（6ヶ月以上経過データ）
  const handleOldDataCleanup = async () => {
    if (!confirm('6ヶ月以上経過したナレッジデータを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/cleanup/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          olderThanDays: 180, // 6ヶ月
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const resultsDiv = document.getElementById('cleanup-results');
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div class="text-green-600">
              <strong>削除完了:</strong> ${result.deletedCount}件のファイルを削除しました<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        }
        await fetchStorageStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }
    } catch (error) {
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="text-red-600">
            <strong>削除エラー:</strong> ${error.message}<br>
            <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 全削除
  const handleFullCleanup = async () => {
    const confirmation = prompt('全てのナレッジデータを削除します。この操作は取り消せません。\n「DELETE ALL」と入力して確認してください:');
    if (confirmation !== 'DELETE ALL') {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/cleanup/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleteAll: true,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const resultsDiv = document.getElementById('cleanup-results');
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div class="text-green-600">
              <strong>全削除完了:</strong> ${result.deletedCount}件のファイルを削除しました<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        }
        await fetchStorageStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }
    } catch (error) {
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="text-red-600">
            <strong>削除エラー:</strong> ${error.message}<br>
            <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        // ファイルダウンロード処理
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge-export-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        const resultsDiv = document.getElementById('cleanup-results');
        if (resultsDiv) {
          resultsDiv.innerHTML = `
            <div class="text-green-600">
              <strong>📦 エクスポート完了:</strong> ダウンロードが開始されました<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'エクスポートに失敗しました');
      }
    } catch (error) {
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="text-red-600">
            <strong>❌ エクスポートエラー:</strong> ${error.message}<br>
            <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewArchives = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge-base/archives');
      const data = await response.json();
      
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        if (data.success && data.data.length > 0) {
          const archiveList = data.data.map(archive => 
            `• ${archive.name} (${(archive.size / 1024).toFixed(1)}KB) - ${new Date(archive.createdAt).toLocaleString('ja-JP')}`
          ).join('<br>');
          
          resultsDiv.innerHTML = `
            <div class="text-blue-600">
              <strong>📁 アーカイブ一覧 (${data.total}件):</strong><br>
              ${archiveList}<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        } else {
          resultsDiv.innerHTML = `
            <div class="text-gray-600">
              <strong>📁 アーカイブ一覧:</strong> アーカイブが見つかりません<br>
              <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
            </div>
          `;
        }
      }
    } catch (error) {
      const resultsDiv = document.getElementById('cleanup-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="text-red-600">
            <strong>❌ アーカイブ取得エラー:</strong> ${error.message}<br>
            <small>実行時刻: ${new Date().toLocaleString('ja-JP')}</small>
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  return (
    <div className='space-y-6'>
      {/* ストレージ状況サマリー */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200'>
          <div className='flex items-center gap-2 mb-2'>
            <FileText className='h-5 w-5 text-blue-600' />
            <span className='text-sm font-medium text-blue-800'>総ファイル数</span>
          </div>
          <p className='text-2xl font-bold text-blue-600'>{storageStats.totalFiles}</p>
          <p className='text-xs text-blue-600 mt-1'>
            エクスポート: {storageStats.exportFiles || 0} | ドキュメント: {storageStats.documentFiles || 0}
          </p>
        </div>
        
        <div className='p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200'>
          <div className='flex items-center gap-2 mb-2'>
            <Database className='h-5 w-5 text-green-600' />
            <span className='text-sm font-medium text-green-800'>総容量</span>
          </div>
          <p className='text-2xl font-bold text-green-600'>
            {(storageStats.totalSize / 1024 / 1024).toFixed(1)}MB
          </p>
          <p className='text-xs text-green-600 mt-1'>
            アーカイブ: {storageStats.archivedFiles || 0} ファイル
          </p>
        </div>
        
        <div className='p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200'>
          <div className='flex items-center gap-2 mb-2'>
            <AlertTriangle className='h-5 w-5 text-yellow-600' />
            <span className='text-sm font-medium text-yellow-800'>重複データ</span>
          </div>
          <p className='text-2xl font-bold text-yellow-600'>{storageStats.duplicates}</p>
          <p className='text-xs text-yellow-600 mt-1'>
            要整理データあり
          </p>
        </div>
        
        <div className='p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200'>
          <div className='flex items-center gap-2 mb-2'>
            <CheckCircle className='h-5 w-5 text-purple-600' />
            <span className='text-sm font-medium text-purple-800'>最終整理</span>
          </div>
          <p className='text-lg font-bold text-purple-600'>
            {storageStats.lastMaintenance 
              ? new Date(storageStats.lastMaintenance).toLocaleDateString('ja-JP')
              : '未実行'
            }
          </p>
          <p className='text-xs text-purple-600 mt-1'>
            次回: 2026/1/1
          </p>
        </div>
      </div>

      {/* ライフサイクル管理操作 */}
      <div className='bg-gray-50 p-4 rounded-lg'>
        <h4 className='font-medium text-gray-800 mb-3 flex items-center gap-2'>
          <Settings className='h-4 w-4' />
          ライフサイクル管理操作
        </h4>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* データ整理ポリシー選択 */}
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>整理ポリシー</Label>
            <div className='space-y-2'>
              <label className='flex items-center space-x-2'>
                <input
                  type='radio'
                  name='policy'
                  value='manual'
                  checked={selectedPolicy === 'manual'}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  className='form-radio'
                />
                <span className='text-sm'>手動整理のみ</span>
              </label>
              <label className='flex items-center space-x-2'>
                <input
                  type='radio'
                  name='policy'
                  value='aggressive'
                  checked={selectedPolicy === 'aggressive'}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  className='form-radio'
                />
                <span className='text-sm'>積極的整理（6ヶ月以上の古いデータ）</span>
              </label>
              <label className='flex items-center space-x-2'>
                <input
                  type='radio'
                  name='policy'
                  value='conservative'
                  checked={selectedPolicy === 'conservative'}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  className='form-radio'
                />
                <span className='text-sm'>保守的整理（1年以上の古いデータ）</span>
              </label>
            </div>
          </div>

          {/* 管理操作ボタン */}
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>管理操作</Label>
            <div className='grid grid-cols-2 gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={runMaintenance}
                disabled={isLoading}
                className='flex items-center gap-2 text-xs'
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                自動整理
              </Button>
              
              <Button
                variant='outline'
                size='sm'
                onClick={resolveDuplicates}
                disabled={isLoading}
                className='flex items-center gap-2 text-xs'
              >
                <Target className='h-3 w-3' />
                重複解決
              </Button>
              
              <Button
                variant='outline'
                size='sm'
                onClick={fetchStorageStats}
                disabled={isLoading}
                className='flex items-center gap-2 text-xs'
              >
                <Activity className='h-3 w-3' />
                状況更新
              </Button>
              
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  // アーカイブ表示機能（今後実装予定）
                  alert('アーカイブ表示機能は準備中です');
                }}
                disabled={isLoading}
                className='flex items-center gap-2 text-xs'
              >
                <Database className='h-3 w-3' />
                アーカイブ
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 手動削除セクション */}
      <div className='bg-red-50 border border-red-200 p-4 rounded-lg'>
        <h4 className='font-medium text-red-800 mb-3 flex items-center gap-2'>
          <AlertTriangle className='h-4 w-4' />
          ナレッジデータ削除
        </h4>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* 削除オプション */}
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>削除オプション</Label>
            <div className='space-y-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleAutoCleanup}
                disabled={isLoading}
                className='w-full flex items-center gap-2 text-xs text-orange-700 border-orange-300 hover:bg-orange-50'
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                1年以上経過データを削除
              </Button>
              
              <Button
                variant='outline'
                size='sm'
                onClick={handleOldDataCleanup}
                disabled={isLoading}
                className='w-full flex items-center gap-2 text-xs text-orange-700 border-orange-300 hover:bg-orange-50'
              >
                <AlertTriangle className='h-3 w-3' />
                6ヶ月以上経過データを削除
              </Button>
              
              <Button
                variant='destructive'
                size='sm'
                onClick={handleFullCleanup}
                disabled={isLoading}
                className='w-full flex items-center gap-2 text-xs'
              >
                <Database className='h-3 w-3' />
                全ナレッジデータを削除
              </Button>
            </div>
          </div>

          {/* エクスポートオプション */}
          <div className='space-y-3'>
            <Label className='text-sm font-medium'>エクスポートオプション</Label>
            <div className='space-y-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleExport('all')}
                disabled={isLoading}
                className='w-full flex items-center gap-2 text-xs text-green-700 border-green-300 hover:bg-green-50'
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                全データエクスポート
              </Button>
              
              <Button
                variant='outline'
                size='sm'
                onClick={handleViewArchives}
                disabled={isLoading}
                className='w-full flex items-center gap-2 text-xs text-blue-700 border-blue-300 hover:bg-blue-50'
              >
                <Database className='h-3 w-3' />
                アーカイブ一覧表示
              </Button>
            </div>
          </div>

          {/* 操作実行結果 */}
          <div className='space-y-2'>
            <Label className='text-sm font-medium'>操作実行結果</Label>
            <div className='p-3 bg-white rounded border text-xs'>
              <div id='cleanup-results' className='text-gray-600'>
                削除・エクスポート操作を実行するとここに結果が表示されます
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div className='bg-amber-50 border border-amber-200 p-4 rounded-lg'>
        <h5 className='font-medium text-amber-800 mb-2 flex items-center gap-2'>
          <AlertTriangle className='h-4 w-4' />
          注意事項
        </h5>
        <div className='text-sm text-amber-700 space-y-1'>
          <p>• <strong>自動削除:</strong> 毎日午前2時に1年以上経過したデータを自動削除</p>
          <p>• <strong>手動削除:</strong> 上記のボタンでいつでも任意に削除可能</p>
          <p>• <strong>削除したデータ:</strong> 復元できませんので慎重に実行してください</p>
          <p>• <strong>バックアップ:</strong> 重要なデータは事前にエクスポートを推奨</p>
        </div>
      </div>

      {/* ライフサイクル管理の説明 */}
      <div className='bg-blue-50 border border-blue-200 p-4 rounded-lg'>
        <h5 className='font-medium text-blue-800 mb-2 flex items-center gap-2'>
          <CheckCircle className='h-4 w-4' />
          ナレッジデータライフサイクル管理について
        </h5>
        <div className='text-sm text-blue-700 space-y-1'>
          <p>• <strong>自動削除:</strong> 毎日午前2時に1年以上経過したデータを自動削除</p>
          <p>• <strong>手動削除:</strong> 上記のボタンでいつでも任意に削除可能</p>
          <p>• <strong>自動収集:</strong> チャット画面からのデータ送信時に自動でナレッジベースに追加</p>
          <p>• <strong>手動更新:</strong> 機械故障履歴の編集保存時に自動でGPTナレッジに反映</p>
          <p>• <strong>重複チェック:</strong> 30分間隔で重複データを自動検出</p>
        </div>
      </div>
    </div>
  );
}
