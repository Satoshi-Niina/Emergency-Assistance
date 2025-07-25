import { useState, useCallback } from 'react';
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
        title: 'エラー',
        description: 'ファイルを選択するか、キーワードを入力してください。',
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
        toast({ title: '成功', description: 'ファイルからフローが生成されました。' });
      } else {
        // Generate from keywords
        const response = await apiRequest('POST', '/api/flow-generator/keywords', { keywords });
        flowData = await response.json();
        toast({ title: '成功', description: 'キーワードからフローが生成されました。' });
      }
      
      // Pass the generated flow data to the parent component
      onFlowGenerated(flowData);

    } catch (error: any) {
      toast({
        title: '生成エラー',
        description: error.message || 'フローの生成中に不明なエラーが発生しました。',
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
          AIによるフロー自動生成
        </CardTitle>
        <CardDescription>
          ドキュメントファイルまたはキーワードから、応急処置フローの草案を自動で生成します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
            <FileUp className="w-10 h-10" />
            {isDragActive ? (
              <p>ここにファイルをドロップ</p>
            ) : (
              <p>ここにファイルをドラッグ＆ドロップするか、クリックして選択</p>
            )}
            <p className="text-xs">(.pptx, .pdf, .txt ファイルに対応)</p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-auto">X</Button>
          </div>
        )}

        <div className="relative flex items-center justify-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 font-semibold">または</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Keyword Input Section */}
        <div className="space-y-2">
            <Label htmlFor="keywords" className="text-lg font-semibold">キーワードで生成</Label>
            <p className="text-sm text-gray-500">フローの核となるキーワードや症状をカンマ区切りで入力してください。</p>
            <Input
                id="keywords"
                placeholder="例: エンジン停止, 警告灯点灯, 異音"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={!!file}
            />
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                フローを生成
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 