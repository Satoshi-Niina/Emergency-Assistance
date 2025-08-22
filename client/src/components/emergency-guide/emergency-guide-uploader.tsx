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
  // 閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・縺ｯ蟶ｸ縺ｫ譛牙柑
  const autoGenerateFlow = true;
  
  // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨・繝ｼ繧ｹ縺ｮ繝輔Ο繝ｼ逕滓・讖溯・
  const [keywordsInput, setKeywordsInput] = useState<string>('');
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  
  // 繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨ヵ繝ｭ繝ｼ繧堤函謌舌☆繧・
  const generateFlowFromKeywords = async () => {
    if (!keywordsInput.trim()) {
      toast({
        title: "蜈･蜉帙お繝ｩ繝ｼ",
        description: "繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsGeneratingFlow(true);
      
      toast({
        title: "繝輔Ο繝ｼ逕滓・荳ｭ",
        description: `繧ｭ繝ｼ繝ｯ繝ｼ繝峨・{keywordsInput}縲阪°繧峨ヵ繝ｭ繝ｼ繧堤函謌舌＠縺ｦ縺・∪縺・..`,
      });
      
      // 縺ｾ縺夐ｫ伜ｺｦ縺ｪ繝輔Ο繝ｼ逕滓・繧定ｩｦ陦鯉ｼ・penAI API繧ｭ繝ｼ縺悟ｿ・ｦ・ｼ・
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
        // 鬮伜ｺｦ縺ｪ繝輔Ο繝ｼ逕滓・縺悟､ｱ謨励＠縺溷ｴ蜷医∝渕譛ｬ逧・↑繝輔Ο繝ｼ逕滓・縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
        console.log('鬮伜ｺｦ縺ｪ繝輔Ο繝ｼ逕滓・縺悟､ｱ謨励∝渕譛ｬ逧・↑繝輔Ο繝ｼ逕滓・縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ');
        response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/flow-generator/keywords`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keywords: keywordsInput }),
        });
      }
      
      const data = await response.json();
      console.log("API縺九ｉ縺ｮ蠢懃ｭ斐ョ繝ｼ繧ｿ:", data);
      
      if (!response.ok) {
        // 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ蝣ｴ蜷・
        const errorMessage = data.error || '逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
        const errorDetails = data.details || '';
        
        // OpenAI API繧ｭ繝ｼ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・迚ｹ蛻･縺ｪ蜃ｦ逅・
        if (errorMessage.includes('OpenAI API繧ｭ繝ｼ') || errorMessage.includes('API繧ｭ繝ｼ縺檎┌蜉ｹ')) {
          toast({
            title: "OpenAI API繧ｭ繝ｼ繧ｨ繝ｩ繝ｼ",
            description: "鬮伜ｺｦ縺ｪ繝輔Ο繝ｼ逕滓・縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ縲ょ渕譛ｬ逧・↑繝輔Ο繝ｼ逕滓・繧剃ｽｿ逕ｨ縺励∪縺吶・,
            variant: "destructive",
          });
          
          // 蝓ｺ譛ｬ逧・↑繝輔Ο繝ｼ逕滓・縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
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
                title: "蝓ｺ譛ｬ逧・↑繝輔Ο繝ｼ逕滓・螳御ｺ・,
                description: `縲・{fallbackData.flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・}縲阪′逕滓・縺輔ｌ縺ｾ縺励◆縲Ａ,
              });
              
              // 逕滓・縺輔ｌ縺溘ヵ繝ｭ繝ｼ縺ｮ隧ｳ邏ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍輔☆繧九◆繧√・繧､繝吶Φ繝医ｒ逋ｺ轣ｫ
              if (onUploadSuccess) {
                onUploadSuccess(fallbackData.flowData.id);
              }
              
              // 繧ｭ繝ｼ繝ｯ繝ｼ繝牙・蜉帙ｒ繧ｯ繝ｪ繧｢
              setKeywordsInput('');
              return;
            }
          } catch (fallbackError) {
            console.error('蝓ｺ譛ｬ逧・↑繝輔Ο繝ｼ逕滓・繧ょ､ｱ謨・', fallbackError);
          }
        }
        
        // 縺昴・莉悶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｮ陦ｨ遉ｺ
        toast({
          title: "逕滓・繧ｨ繝ｩ繝ｼ",
          description: errorMessage,
          variant: "destructive",
        });
        
        // 隧ｳ邏ｰ諠・ｱ繧偵さ繝ｳ繧ｽ繝ｼ繝ｫ縺ｫ蜃ｺ蜉・
        console.error('繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:', {
          error: errorMessage,
          details: errorDetails,
          status: response.status
        });
        return;
      }
      
      if (data.success && data.flowData) {
        toast({
          title: "繝輔Ο繝ｼ逕滓・螳御ｺ・,
          description: `縲・{data.flowData.title || '繧ｿ繧､繝医Ν縺ｪ縺・}縲阪′逕滓・縺輔ｌ縺ｾ縺励◆縲Ａ,
        });
        
        // 逕滓・縺輔ｌ縺溘ヵ繝ｭ繝ｼ縺ｮ隧ｳ邏ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍輔☆繧九◆繧√・繧､繝吶Φ繝医ｒ逋ｺ轣ｫ
        if (onUploadSuccess) {
          onUploadSuccess(data.flowData.id);
        }
        
        // 繧ｭ繝ｼ繝ｯ繝ｼ繝牙・蜉帙ｒ繧ｯ繝ｪ繧｢
        setKeywordsInput('');
      } else {
        throw new Error('繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蠖｢蠑上′辟｡蜉ｹ縺ｧ縺・);
      }
    } catch (error) {
      console.error('繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "逕滓・繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝輔Ο繝ｼ縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFlow(false);
    }
  };

  // 繧ｯ繝ｪ繝・け縺励※繝輔ぃ繧､繝ｫ繧帝∈謚・
  const handleFileSelectClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭ワ繝ｳ繝峨Λ繝ｼ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // 諡｡蠑ｵ蟄舌メ繧ｧ繝・け
      const extension = file.name.toLowerCase().split('.').pop() || '';
      const allowedExtensions = ['pptx', 'ppt', 'xlsx', 'xls', 'pdf', 'json'];
      
      if (!allowedExtensions.includes(extension)) {
        toast({
          title: "譛ｪ蟇ｾ蠢懊・繝輔ぃ繧､繝ｫ蠖｢蠑・,
          description: "PowerPoint(.pptx, .ppt)縲・xcel(.xlsx, .xls)縲￣DF(.pdf)縲√∪縺溘・JSON(.json)繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・,
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  // 繧｢繝・・繝ｭ繝ｼ繝牙・逅・
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ",
        description: "繧｢繝・・繝ｭ繝ｼ繝峨☆繧九ヵ繧｡繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞",
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
      
      // 讓｡謫ｬ逧・↑騾ｲ謐苓｡ｨ遉ｺ逕ｨ縺ｮ繧､繝ｳ繧ｿ繝ｼ繝舌Ν
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
        throw new Error('繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUploadProgress(100);
        setUploadSuccess(true);
        
        toast({
          title: "繧｢繝・・繝ｭ繝ｼ繝画・蜉・,
          description: "繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ蜃ｦ逅・＆繧後∪縺励◆",
        });
        
        if (onUploadSuccess) {
          onUploadSuccess(data.guideId);
        }
        
        // 謨ｰ遘貞ｾ後↓繝ｪ繧ｻ繝・ヨ
        setTimeout(() => {
          setSelectedFile(null);
          setUploadSuccess(false);
          setUploadProgress(0);
        }, 3000);
      } else {
        throw new Error(data.error || '繝輔ぃ繧､繝ｫ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ逕滓・</CardTitle>
        <CardDescription>繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｄ繝輔ぃ繧､繝ｫ縺九ｉ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧堤函謌舌・邱ｨ髮・〒縺阪∪縺・/CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="keywords" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="keywords">繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧臥函謌・/TabsTrigger>
            <TabsTrigger value="file">繝輔ぃ繧､繝ｫ縺九ｉ逕滓・</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keywords" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">逋ｺ逕滉ｺ玖ｱ｡繧ｭ繝ｼ繝ｯ繝ｼ繝・/h3>
                <Textarea
                  placeholder="蜈ｷ菴鍋噪縺ｪ莠玖ｱ｡繧・憾豕√∵ｩ溷勣蜷阪↑縺ｩ繧貞・蜉帙＠縺ｦ縺上□縺輔＞・∬・蜍慕噪縺ｫ蛻､譁ｭ縺励∪縺吶・
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{keywordsInput.length}/100譁・ｭ・/span>
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
                    逕滓・荳ｭ...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    GPT繝輔Ο繝ｼ逕滓・
                  </>
                )}
              </Button>
              
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">荳ｻ縺ｪ豬√ｌ:</p>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦGPT繝輔Ο繝ｼ逕滓・</li>
                    <li>逕滓・縺輔ｌ縺滓怙驕ｩ縺ｪ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧帝∈謚・/li>
                    <li>驕ｸ謚槭＠縺溘ヵ繝ｭ繝ｼ縺ｯ莉･荳九・譁ｹ豕輔〒邱ｨ髮・庄閭ｽ・・/li>
                    <ul className="list-disc list-inside pl-6 space-y-1">
                      <li>縲後ユ繧ｭ繧ｹ繝育ｷｨ髮・阪ち繝厄ｼ壹ヵ繝ｭ繝ｼ縺ｮ蜀・ｮｹ繧偵ユ繧ｭ繧ｹ繝医・繝ｼ繧ｹ縺ｧ邱ｨ髮・/li>
                      <li>縲後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・阪ち繝厄ｼ壹ヵ繝ｭ繝ｼ繝√Ε繝ｼ繝医→縺励※隕冶ｦ夂噪縺ｫ邱ｨ髮・/li>
                    </ul>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="file" className="space-y-4">
            <div>
              {/* 繝輔ぃ繧､繝ｫ蜈･蜉・(髱櫁｡ｨ遉ｺ) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pptx,.ppt,.xlsx,.xls,.pdf,.json"
                className="hidden"
              />
              
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・/h3>
                <Button 
                  variant="outline" 
                  className="w-full h-24 border-dashed" 
                  onClick={handleFileSelectClick}
                >
                  <div className="flex flex-col items-center">
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-700 font-medium">繧ｯ繝ｪ繝・け縺励※繝輔ぃ繧､繝ｫ繧帝∈謚・/p>
                    <p className="text-xs text-gray-500 mt-1">
                      PowerPoint縲・xcel縲￣DF縲√∪縺溘・JSON繝輔ぃ繧､繝ｫ
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
              
              {/* 繧｢繝・・繝ｭ繝ｼ繝蛾ｲ謐・*/}
              {(isUploading || uploadSuccess) && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {uploadSuccess ? "螳御ｺ・ : "蜃ｦ逅・ｸｭ..."}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              {/* 繝・・繧ｿ菫晏ｭ倥が繝励す繝ｧ繝ｳ */}
              <div className="flex mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="saveOriginalFile" 
                    checked={saveOriginalFile} 
                    onCheckedChange={(checked) => setSaveOriginalFile(checked === true)}
                  />
                  <Label htmlFor="saveOriginalFile" className="text-sm text-gray-700">
                    蜈・・繝輔ぃ繧､繝ｫ繧ゆｿ晏ｭ倥☆繧・
                  </Label>
                </div>
              </div>
              
              {/* 閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・縺ｮ諠・ｱ陦ｨ遉ｺ */}
              <div className="flex items-center space-x-2 mb-4 bg-amber-50 p-2 rounded-md border border-amber-200">
                <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  繧｢繝・・繝ｭ繝ｼ繝牙ｾ後∬・蜍慕噪縺ｫ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺檎函謌舌＆繧後∪縺・
                </p>
              </div>
              
              {/* 繧｢繝・・繝ｭ繝ｼ繝峨・繧ｿ繝ｳ */}
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || uploadSuccess}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    蜃ｦ逅・ｸｭ...
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    螳御ｺ・＠縺ｾ縺励◆
                  </>
                ) : (
                  "繧｢繝・・繝ｭ繝ｼ繝峨＠縺ｦ蜃ｦ逅・
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
