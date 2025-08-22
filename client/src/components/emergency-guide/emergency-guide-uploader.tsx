import React, { useState, useRef } from 'react';
import { useToast } from "../../hooks/use-toast.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Loader2, FileText, CheckCircle, Sparkles, Wand2 } from 'lucide-react';
import { Progress } from "../../components/ui/progress";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";

interface EmergencyGuideUploaderProps {
  onUploadSuccess?: (guideId: string) => void;
}

const EmergencyGuideUploader: React.FC<EmergencyGuideUploaderProps> = ({ onUploadSuccess }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [saveOriginalFile, setSaveOriginalFile] = useState(false);
  // 自動フロー生�Eは常に有効
  const autoGenerateFlow = true;
  
  // キーワード�Eースのフロー生�E機�E
  const [keywordsInput, setKeywordsInput] = useState<string>('');
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  
  // キーワードからフローを生成すめE
  const generateFlowFromKeywords = async () => {
    if (!keywordsInput.trim()) {
      toast({
        title: "入力エラー",
        description: "キーワードを入力してください",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsGeneratingFlow(true);
      
      toast({
        title: "フロー生�E中",
        description: `キーワード、E{keywordsInput}」からフローを生成してぁE��ぁE..`,
      });
      
      // まず高度なフロー生�Eを試行！EpenAI APIキーが忁E��E��E
      let response;
      try {
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/flow-generator/generate-from-keywords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keywords: keywordsInput }),
        });
      } catch (error) {
        // 高度なフロー生�Eが失敗した場合、基本皁E��フロー生�Eにフォールバック
        console.log('高度なフロー生�Eが失敗、基本皁E��フロー生�Eにフォールバック');
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/flow-generator/keywords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keywords: keywordsInput }),
        });
      }
      
      const data = await response.json();
      console.log("APIからの応答データ:", data);
      
      if (!response.ok) {
        // エラーレスポンスの場吁E
        const errorMessage = data.error || '生�Eに失敗しました';
        const errorDetails = data.details || '';
        
        // OpenAI APIキーエラーの場合�E特別な処琁E
        if (errorMessage.includes('OpenAI APIキー') || errorMessage.includes('APIキーが無効')) {
          toast({
            title: "OpenAI APIキーエラー",
            description: "高度なフロー生�Eが利用できません。基本皁E��フロー生�Eを使用します、E,
            variant: "destructive",
          });
          
          // 基本皁E��フロー生�Eにフォールバック
          try {
            const fallbackResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/flow-generator/keywords`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ keywords: keywordsInput }),
            });
            
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.success && fallbackData.flowData) {
              toast({
                title: "基本皁E��フロー生�E完亁E,
                description: `、E{fallbackData.flowData.title || 'タイトルなぁE}」が生�Eされました。`,
              });
              
              // 生�Eされたフローの詳細ペ�Eジに移動するため�Eイベントを発火
              if (onUploadSuccess) {
                onUploadSuccess(fallbackData.flowData.id);
              }
              
              // キーワード�E力をクリア
              setKeywordsInput('');
              return;
            }
          } catch (fallbackError) {
            console.error('基本皁E��フロー生�Eも失敁E', fallbackError);
          }
        }
        
        // そ�E他�EエラーメチE��ージの表示
        toast({
          title: "生�Eエラー",
          description: errorMessage,
          variant: "destructive",
        });
        
        // 詳細惁E��をコンソールに出劁E
        console.error('フロー生�Eエラー詳細:', {
          error: errorMessage,
          details: errorDetails,
          status: response.status
        });
        return;
      }
      
      if (data.success && data.flowData) {
        toast({
          title: "フロー生�E完亁E,
          description: `、E{data.flowData.title || 'タイトルなぁE}」が生�Eされました。`,
        });
        
        // 生�Eされたフローの詳細ペ�Eジに移動するため�Eイベントを発火
        if (onUploadSuccess) {
          onUploadSuccess(data.flowData.id);
        }
        
        // キーワード�E力をクリア
        setKeywordsInput('');
      } else {
        throw new Error('フローチE�Eタの形式が無効でぁE);
      }
    } catch (error) {
      console.error('フロー生�Eエラー:', error);
      toast({
        title: "生�Eエラー",
        description: error instanceof Error ? error.message : "フローの生�Eに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFlow(false);
    }
  };

  // クリチE��してファイルを選抁E
  const handleFileSelectClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択ハンドラー
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // 拡張子チェチE��
      const extension = file.name.toLowerCase().split('.').pop() || '';
      const allowedExtensions = ['pptx', 'ppt', 'xlsx', 'xls', 'pdf', 'json'];
      
      if (!allowedExtensions.includes(extension)) {
        toast({
          title: "未対応�Eファイル形弁E,
          description: "PowerPoint(.pptx, .ppt)、Excel(.xlsx, .xls)、PDF(.pdf)、また�EJSON(.json)ファイルのみアチE�Eロード可能でぁE,
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // アチE�Eロード�E琁E
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "ファイルが選択されてぁE��せん",
        description: "アチE�Eロードするファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("saveOriginalFile", saveOriginalFile.toString());
      formData.append("autoGenerateFlow", autoGenerateFlow.toString());
      
      // 模擬皁E��進捗表示用のインターバル
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-guide/process`, {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('ファイルのアチE�Eロードに失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUploadProgress(100);
        setUploadSuccess(true);
        
        toast({
          title: "アチE�Eロード�E劁E,
          description: "ファイルが正常に処琁E��れました",
        });
        
        if (onUploadSuccess) {
          onUploadSuccess(data.guideId);
        }
        
        // 数秒後にリセチE��
        setTimeout(() => {
          setSelectedFile(null);
          setUploadSuccess(false);
          setUploadProgress(0);
        }, 3000);
      } else {
        throw new Error(data.error || 'ファイル処琁E��にエラーが発生しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ファイルのアチE�Eロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>応急処置フロー生�E</CardTitle>
        <CardDescription>キーワードやファイルから応急処置フローを生成�E編雁E��きまぁE/CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="keywords" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="keywords">キーワードから生戁E/TabsTrigger>
            <TabsTrigger value="file">ファイルから生�E</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keywords" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">発生事象キーワーチE/h3>
                <Textarea
                  placeholder="具体的な事象めE��況、機器名などを�E力してください�E��E動的に判断します、E
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{keywordsInput.length}/100斁E��E/span>
                </div>
              </div>
              
              <Button
                className="w-full"
                variant="default"
                onClick={generateFlowFromKeywords}
                disabled={isGeneratingFlow || !keywordsInput.trim()}
              >
                {isGeneratingFlow ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生�E中...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    GPTフロー生�E
                  </>
                )}
              </Button>
              
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">主な流れ:</p>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>キーワードを入力してGPTフロー生�E</li>
                    <li>生�Eされた最適な応急処置フローを選抁E/li>
                    <li>選択したフローは以下�E方法で編雁E��能�E�E/li>
                    <ul className="list-disc list-inside pl-6 space-y-1">
                      <li>「テキスト編雁E��タブ：フローの冁E��をテキスト�Eースで編雁E/li>
                      <li>「キャラクター編雁E��タブ：フローチャートとして視覚的に編雁E/li>
                    </ul>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4">
            <div>
              {/* ファイル入劁E(非表示) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pptx,.ppt,.xlsx,.xls,.pdf,.json"
                className="hidden"
              />
              
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">ファイルアチE�EローチE/h3>
                <Button 
                  variant="outline" 
                  className="w-full h-24 border-dashed" 
                  onClick={handleFileSelectClick}
                >
                  <div className="flex flex-col items-center">
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-700 font-medium">クリチE��してファイルを選抁E/p>
                    <p className="text-xs text-gray-500 mt-1">
                      PowerPoint、Excel、PDF、また�EJSONファイル
                    </p>
                  </div>
                </Button>
              </div>
              
              {selectedFile && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                    <div>
                      <p className="font-medium text-indigo-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* アチE�Eロード進捁E*/}
              {(isUploading || uploadSuccess) && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {uploadSuccess ? "完亁E : "処琁E��..."}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              {/* チE�Eタ保存オプション */}
              <div className="flex mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="saveOriginalFile" 
                    checked={saveOriginalFile} 
                    onCheckedChange={(checked) => setSaveOriginalFile(checked === true)}
                  />
                  <Label htmlFor="saveOriginalFile" className="text-sm text-gray-700">
                    允E�Eファイルも保存すめE
                  </Label>
                </div>
              </div>
              
              {/* 自動フロー生�Eの惁E��表示 */}
              <div className="flex items-center space-x-2 mb-4 bg-amber-50 p-2 rounded-md border border-amber-200">
                <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  アチE�Eロード後、�E動的に応急処置フローが生成されまぁE
                </p>
              </div>
              
              {/* アチE�Eロード�Eタン */}
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || uploadSuccess}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処琁E��...
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    完亁E��ました
                  </>
                ) : (
                  "アチE�Eロードして処琁E
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmergencyGuideUploader;
