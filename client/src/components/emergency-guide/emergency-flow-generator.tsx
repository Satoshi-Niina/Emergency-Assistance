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
        description: 'ファイルを選択するか、キーワードを入力してください、E,
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
        toast({ title: '成功', description: 'ファイルからフローが生成されました、E });
      } else {
        // Generate from keywords
        const response = await apiRequest('POST', '/api/flow-generator/keywords', { keywords });
        flowData = await response.json();
        toast({ title: '成功', description: 'キーワードからフローが生成されました、E });
      }
      
      // Pass the generated flow data to the parent component
      onFlowGenerated(flowData);

    } catch (error: any) {
      toast({
        title: '生�Eエラー',
        description: error.message || 'フローの生�E中に不�Eなエラーが発生しました、E,
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
          AIによるフロー自動生戁E
        </CardTitle>
        <CardDescription>
          ドキュメントファイルまた�Eキーワードから、応急処置フローの草案を自動で生�Eします、E
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Keyword Input Section - 上段に移勁E*/}
        <div className="space-y-2">
            <Label htmlFor="keywords" className="text-lg font-semibold">キーワードから生戁E/Label>
            <p className="text-sm text-gray-500">フローの核となるキーワードや痁E��をカンマ区刁E��で入力してください、E/p>
            <textarea
                id="keywords"
                placeholder="侁E エンジン停止, 警告�E点灯, 異音"
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
                    生�E中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    フローを生戁E
                  </>
                )}
              </Button>
            </div>
        </div>

        <div className="relative flex items-center justify-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 font-semibold">また�E</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* File Upload Section - 下段に移勁E*/}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
            <FileUp className="w-10 h-10" />
            {isDragActive ? (
              <p>ここにファイルをドロチE�E</p>
            ) : (
              <p>ここにファイルをドラチE���E�E��ロチE�Eするか、クリチE��して選抁E/p>
            )}
            <p className="text-xs">(.pptx, .pdf, .txt ファイルに対忁E</p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-auto">X</Button>
          </div>
        )}

        {/* Generate Button - サイズめE0%に変更、中央配置 */}
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
                生�E中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-3 w-3" />
                フローを生戁E
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
