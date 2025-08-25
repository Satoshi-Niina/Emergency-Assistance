import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Slider } from '../components/ui/slider';
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
  Sliders,
  FileSearch,
  Zap
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
      removeSpecialChars: false
    }
  });
  const navigate = useNavigate();

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭・蜃ｦ逅・
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    
    if (files) {
      const statusList: ImportStatus[] = Array.from(files).map(file => ({
        fileName: file.name,
        status: 'pending'
      }));
      setImportStatus(statusList);
    }
  };

  // 繝輔ぃ繧､繝ｫ縺ｮ繧､繝ｳ繝昴・繝亥・逅・
  const handleImport = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞');
      return;
    }

    setIsProcessing(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // 繧ｹ繝・・繧ｿ繧ｹ繧偵悟・逅・ｸｭ縲阪↓譖ｴ譁ｰ
        setImportStatus(prev => prev.map((status, index) => 
          index === i 
            ? { ...status, status: 'processing' as const }
            : status
        ));

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/files/import', {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });

          if (response.ok) {
            const result = await response.json();
            setImportStatus(prev => prev.map((status, index) => 
              index === i 
                ? { 
                    ...status, 
                    status: 'success' as const, 
                    message: result.message || '繧､繝ｳ繝昴・繝亥ｮ御ｺ・
                  }
                : status
            ));
          } else {
            const error = await response.json();
            setImportStatus(prev => prev.map((status, index) => 
              index === i 
                ? { 
                    ...status, 
                    status: 'error' as const, 
                    message: error.message || '繧､繝ｳ繝昴・繝医お繝ｩ繝ｼ'
                  }
                : status
            ));
          }
        } catch (error) {
          setImportStatus(prev => prev.map((status, index) => 
            index === i 
              ? { 
                  ...status, 
                  status: 'error' as const, 
                  message: '繝阪ャ繝医Ρ繝ｼ繧ｯ繧ｨ繝ｩ繝ｼ'
                }
              : status
          ));
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ImportStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">蠕・ｩ滉ｸｭ</Badge>;
      case 'processing':
        return <Badge variant="default">蜃ｦ逅・ｸｭ</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">螳御ｺ・/Badge>;
      case 'error':
        return <Badge variant="destructive">繧ｨ繝ｩ繝ｼ</Badge>;
      default:
        return <Badge variant="secondary">荳肴・</Badge>;
    }
  };

  // RAG險ｭ螳壹・菫晏ｭ・
  const saveRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ragSettings),
        credentials: 'include'
      });

      if (response.ok) {
        alert('RAG險ｭ螳壹′菫晏ｭ倥＆繧後∪縺励◆');
      } else {
        throw new Error('險ｭ螳壹・菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('RAG險ｭ螳壻ｿ晏ｭ倥お繝ｩ繝ｼ:', error);
      alert('險ｭ螳壹・菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
    }
  };

  // RAG險ｭ螳壹・隱ｭ縺ｿ霎ｼ縺ｿ
  const loadRagSettings = async () => {
    try {
      const response = await fetch('/api/settings/rag', {
        credentials: 'include'
      });

      if (response.ok) {
        const settings = await response.json();
        setRagSettings(settings);
      }
    } catch (error) {
      console.error('RAG險ｭ螳夊ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
    }
  };

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｦ繝ｳ繝域凾縺ｫ險ｭ螳壹ｒ隱ｭ縺ｿ霎ｼ縺ｿ
  useEffect(() => {
    loadRagSettings();
  }, []);

  return (
    <div className="container mx-auto p-6">
      {/* 繝倥ャ繝繝ｼ */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Database className="inline mr-2" />
          蝓ｺ貅悶ョ繝ｼ繧ｿ邂｡逅・
        </h1>
        <p className="text-gray-600">
          菫晏ｮ育畑霆贋ｸ｡繝・・繧ｿ縺ｮ邂｡逅・→險ｭ螳壹ｒ陦後＞縺ｾ縺・
        </p>
      </div>

      {/* 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・*/}
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            繝・・繧ｿ繧､繝ｳ繝昴・繝・
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            謇句虚蜈･蜉・
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            險ｭ螳・
          </TabsTrigger>
        </TabsList>

        {/* 繧､繝ｳ繝昴・繝医ち繝・*/}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                繝輔ぃ繧､繝ｫ繧､繝ｳ繝昴・繝・
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">
                  繝輔ぃ繧､繝ｫ繧帝∈謚・(TXT, PDF, XLSX, PPTX)
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".txt,.pdf,.xlsx,.pptx"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {selectedFiles && (
                <div className="space-y-2">
                  <h4 className="font-medium">驕ｸ謚槭＆繧後◆繝輔ぃ繧､繝ｫ:</h4>
                  <div className="space-y-2">
                    {importStatus.map((status, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{status.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status.status)}
                          {status.message && (
                            <span className="text-xs text-gray-500">{status.message}</span>
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
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    蜃ｦ逅・ｸｭ...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    繧､繝ｳ繝昴・繝亥ｮ溯｡・
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 謇句虚蜈･蜉帙ち繝・*/}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                菫晏ｮ育畑霆贋ｸ｡繝・・繧ｿ蜈･蜉・
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleMaintenanceForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 險ｭ螳壹ち繝・*/}
        <TabsContent value="settings" className="space-y-6">
          {/* 蝓ｺ譛ｬ險ｭ螳・*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                蝓ｺ譛ｬ繧ｷ繧ｹ繝・Β險ｭ螳・
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>繝・・繧ｿ繝・ぅ繝ｬ繧ｯ繝医Μ</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      /knowledge-base/vehicle-maintenance
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>險ｱ蜿ｯ繝輔ぃ繧､繝ｫ蠖｢蠑・/Label>
                  <div className="flex gap-2">
                    <Badge variant="outline">TXT</Badge>
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">XLSX</Badge>
                    <Badge variant="outline">PPTX</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RAG險ｭ螳・*/}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                RAG (Retrieval-Augmented Generation) 險ｭ螳・
              </CardTitle>
              <p className="text-sm text-gray-600">
                GPT繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ邊ｾ蠎ｦ蜷台ｸ翫・縺溘ａ縺ｮ莠句燕蜃ｦ逅・ヱ繝ｩ繝｡繝ｼ繧ｿ繝ｼ
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 繝√Ε繝ｳ繧ｯ險ｭ螳・*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  繝・く繧ｹ繝亥・蜑ｲ險ｭ螳・
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chunkSize">
                      繝√Ε繝ｳ繧ｯ繧ｵ繧､繧ｺ: {ragSettings.chunkSize}譁・ｭ・
                    </Label>
                    <Slider
                      id="chunkSize"
                      min={200}
                      max={2000}
                      step={100}
                      value={[ragSettings.chunkSize]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, chunkSize: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      繝・く繧ｹ繝医ｒ蛻・牡縺吶ｋ髫帙・1繝√Ε繝ｳ繧ｯ縺ゅ◆繧翫・譁・ｭ玲焚
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chunkOverlap">
                      繧ｪ繝ｼ繝舌・繝ｩ繝・・: {ragSettings.chunkOverlap}譁・ｭ・
                    </Label>
                    <Slider
                      id="chunkOverlap"
                      min={0}
                      max={500}
                      step={50}
                      value={[ragSettings.chunkOverlap]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, chunkOverlap: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      繝√Ε繝ｳ繧ｯ髢薙〒驥崎､・＆縺帙ｋ譁・ｭ玲焚
                    </p>
                  </div>
                </div>
              </div>

              {/* 讀懃ｴ｢險ｭ螳・*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  讀懃ｴ｢邊ｾ蠎ｦ險ｭ螳・
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="similarityThreshold">
                      鬘樔ｼｼ蠎ｦ髢ｾ蛟､: {ragSettings.similarityThreshold}
                    </Label>
                    <Slider
                      id="similarityThreshold"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={[ragSettings.similarityThreshold]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, similarityThreshold: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      讀懃ｴ｢邨先棡縺ｨ縺励※謗｡逕ｨ縺吶ｋ譛蟆城｡樔ｼｼ蠎ｦ
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxResults">
                      譛螟ｧ蜿門ｾ嶺ｻｶ謨ｰ: {ragSettings.maxResults}莉ｶ
                    </Label>
                    <Slider
                      id="maxResults"
                      min={1}
                      max={20}
                      step={1}
                      value={[ragSettings.maxResults]}
                      onValueChange={(value) => 
                        setRagSettings(prev => ({ ...prev, maxResults: value[0] }))
                      }
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      1蝗槭・讀懃ｴ｢縺ｧ蜿門ｾ励☆繧区怙螟ｧ邨先棡謨ｰ
                    </p>
                  </div>
                </div>
              </div>

              {/* 讀懃ｴ｢謇区ｳ・*/}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  讀懃ｴ｢謇区ｳ・
                </h4>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.enableSemantic}
                      onChange={(e) => 
                        setRagSettings(prev => ({ ...prev, enableSemantic: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">繧ｻ繝槭Φ繝・ぅ繝・け讀懃ｴ｢</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.enableKeyword}
                      onChange={(e) => 
                        setRagSettings(prev => ({ ...prev, enableKeyword: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢</span>
                  </label>
                </div>
              </div>

              {/* 蜑榊・逅・ｨｭ螳・*/}
              <div className="space-y-4">
                <h4 className="font-medium">繝・く繧ｹ繝亥燕蜃ｦ逅・/h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.removeStopWords}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            removeStopWords: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">繧ｹ繝医ャ繝励Ρ繝ｼ繝蛾勁蜴ｻ</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.normalizeCasing}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            normalizeCasing: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">螟ｧ譁・ｭ怜ｰ乗枚蟄玲ｭ｣隕丞喧</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={ragSettings.preprocessing.removeSpecialChars}
                      onChange={(e) => 
                        setRagSettings(prev => ({ 
                          ...prev, 
                          preprocessing: { 
                            ...prev.preprocessing, 
                            removeSpecialChars: e.target.checked 
                          }
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm">迚ｹ谿頑枚蟄鈴勁蜴ｻ</span>
                  </label>
                </div>
              </div>

              {/* 繧ｫ繧ｹ繧ｿ繝繝励Ο繝ｳ繝励ヨ */}
              <div className="space-y-2">
                <Label htmlFor="customPrompt">繧ｫ繧ｹ繧ｿ繝繝励Ο繝ｳ繝励ヨ</Label>
                <Textarea
                  id="customPrompt"
                  value={ragSettings.customPrompt}
                  onChange={(e) => 
                    setRagSettings(prev => ({ ...prev, customPrompt: e.target.value }))
                  }
                  placeholder="RAG讀懃ｴ｢邨先棡繧呈ｴｻ逕ｨ縺吶ｋ髫帙・霑ｽ蜉謖・､ｺ繧貞・蜉・.."
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  讀懃ｴ｢邨先棡繧竪PT縺ｫ貂｡縺咎圀縺ｮ霑ｽ蜉謖・､ｺ
                </p>
              </div>

              {/* 險ｭ螳壻ｿ晏ｭ倥・繧ｿ繝ｳ */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={saveRagSettings} className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  RAG險ｭ螳壹ｒ菫晏ｭ・
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  繝√Ε繝・ヨ逕ｻ髱｢縺ｫ謌ｻ繧・
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
