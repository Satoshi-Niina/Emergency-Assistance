﻿import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { FileUp, Cpu, Send, Loader2, FileText } from 'lucide-react';
import { useToast } from "../../hooks/use-toast.ts";
import { apiRequest } from "../../lib/queryClient.ts";
import { Label } from "../../components/ui/label";

interface FlowGeneratorProps {
  onFlowGenerated: (flowData: any) => void;
}

export default function EmergencyFlowGenerator({ onFlowGenerated }: FlowGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleGenerate = async () => {
    if (!file && !keywords) {
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '繝輔ぃ繧､繝ｫ繧帝∈謚槭☆繧九°縲√く繝ｼ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let flowData;
      if (file) {
        // Generate from file
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiRequest('POST', '/api/flow-generator/file', formData);
        flowData = await response.json();
        toast({ title: '謌仙粥', description: '繝輔ぃ繧､繝ｫ縺九ｉ繝輔Ο繝ｼ縺檎函謌舌＆繧後∪縺励◆縲・ });
      } else {
        // Generate from keywords
        const response = await apiRequest('POST', '/api/flow-generator/keywords', { keywords });
        flowData = await response.json();
        toast({ title: '謌仙粥', description: '繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨ヵ繝ｭ繝ｼ縺檎函謌舌＆繧後∪縺励◆縲・ });
      }
      
      // Pass the generated flow data to the parent component
      onFlowGenerated(flowData);

    } catch (error: any) {
      toast({
        title: '逕滓・繧ｨ繝ｩ繝ｼ',
        description: error.message || '繝輔Ο繝ｼ縺ｮ逕滓・荳ｭ縺ｫ荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          AI縺ｫ繧医ｋ繝輔Ο繝ｼ閾ｪ蜍慕函謌・
        </CardTitle>
        <CardDescription>
          繝峨く繝･繝｡繝ｳ繝医ヵ繧｡繧､繝ｫ縺ｾ縺溘・繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧峨∝ｿ懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ縺ｮ闕画｡医ｒ閾ｪ蜍輔〒逕滓・縺励∪縺吶・
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Keyword Input Section - 荳頑ｮｵ縺ｫ遘ｻ蜍・*/}
        <div className="space-y-2">
            <Label htmlFor="keywords" className="text-lg font-semibold">繧ｭ繝ｼ繝ｯ繝ｼ繝峨°繧臥函謌・/Label>
            <p className="text-sm text-gray-500">繝輔Ο繝ｼ縺ｮ譬ｸ縺ｨ縺ｪ繧九く繝ｼ繝ｯ繝ｼ繝峨ｄ逞・憾繧偵き繝ｳ繝槫玄蛻・ｊ縺ｧ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・/p>
            <textarea
                id="keywords"
                placeholder="萓・ 繧ｨ繝ｳ繧ｸ繝ｳ蛛懈ｭ｢, 隴ｦ蜻顔・轤ｹ轣ｯ, 逡ｰ髻ｳ"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={!!file}
                rows={3}
                className="w-full px-3 py-2 border-2 border-blue-800 rounded-md text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-800"
                style={{ fontSize: '120%' }}
            />
            <div className="flex justify-center mt-3">
              <Button 
                onClick={handleGenerate} 
                disabled={isLoading || !keywords.trim() || !!file} 
                size="lg"
                className="px-6 py-3 text-base font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    逕滓・荳ｭ...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    繝輔Ο繝ｼ繧堤函謌・
                  </>
                )}
              </Button>
            </div>
        </div>

        <div className="relative flex items-center justify-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 font-semibold">縺ｾ縺溘・</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* File Upload Section - 荳区ｮｵ縺ｫ遘ｻ蜍・*/}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
            <FileUp className="w-10 h-10" />
            {isDragActive ? (
              <p>縺薙％縺ｫ繝輔ぃ繧､繝ｫ繧偵ラ繝ｭ繝・・</p>
            ) : (
              <p>縺薙％縺ｫ繝輔ぃ繧､繝ｫ繧偵ラ繝ｩ繝・げ・・ラ繝ｭ繝・・縺吶ｋ縺九√け繝ｪ繝・け縺励※驕ｸ謚・/p>
            )}
            <p className="text-xs">(.pptx, .pdf, .txt 繝輔ぃ繧､繝ｫ縺ｫ蟇ｾ蠢・</p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-auto">X</Button>
          </div>
        )}

        {/* Generate Button - 繧ｵ繧､繧ｺ繧・0%縺ｫ螟画峩縲∽ｸｭ螟ｮ驟咲ｽｮ */}
        <div className="flex justify-center">
          <Button 
            onClick={handleGenerate} 
            disabled={isLoading || !!keywords.trim()} 
            size="sm"
            className="px-4 py-2 text-sm font-medium"
            style={{ fontSize: '80%' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                逕滓・荳ｭ...
              </>
            ) : (
              <>
                <Send className="mr-2 h-3 w-3" />
                繝輔Ο繝ｼ繧堤函謌・
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 