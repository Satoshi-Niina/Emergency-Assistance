import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { FileText, Upload, Trash2, FileType, File, Presentation, FileBox, RefreshCw, Database, Eraser } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { reloadImageSearchData } from "../../lib/image-search.ts";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface TechDocument {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  uploadDate?: string;
  extractedTextPreview?: string;
}

const TechSupportUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<TechDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keepOriginalFile, setKeepOriginalFile] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // コンポ�EネントがマウントされたときにアチE�Eロード済みドキュメントを読み込む
    loadVehicleData();
  }, []);

  // ファイル選択ハンドラ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // ファイル選択後にinput要素をリセチE��して、同じファイルを�E選択できるようにする
      event.target.value = '';
    }
  };

  // extracted_data.jsonから車両チE�Eタを読み込む
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/extracted_data.json');
      if (!response.ok) {
        throw new Error('vehicle data loading failed');
      }
      
      const data = await response.json();
      
      // 車両チE�Eタからドキュメント形式！EDF, Excel, PowerPoint�E��Eみを抽出
      const documents: TechDocument[] = [];
      
      if (data.vehicleData && Array.isArray(data.vehicleData)) {
        for (const item of data.vehicleData) {
          if (['PDF', 'XLSX', 'PPTX', 'DOCX'].includes(item.category)) {
            documents.push({
              id: item.id,
              name: item.title,
              path: item.image_path || '',
              type: item.category,
              size: 0, // サイズ惁E��がなぁE�Eで0を設宁E
              extractedTextPreview: item.details
            });
          }
        }
      }
      
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Failed to load vehicle data:', error);
      // エラーが発生しても表示しなぁE- 成功時�EみチE�Eタ表示する仕様に変更
      // エラーメチE��ージは開発時�Eみコンソールに表示
    } finally {
      setIsLoading(false);
    }
  };

  // 処琁E��イプ�E選択肢
  const [processingType, setProcessingType] = useState<'document' | 'image_search'>('document');

  // ファイル形式バリチE�Eション
  const isValidFileFormat = (file: File, type: 'document' | 'image_search'): boolean => {
    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
    
    if (type === 'document') {
      // ドキュメント�E琁E�E対応形弁E
      const validDocumentExts = [".pdf", ".docx", ".xlsx", ".pptx"];
      return validDocumentExts.includes(fileExt);
    } else {
      // 画像検索チE�Eタ処琁E�E対応形弁E
      const validImageExts = [".svg", ".png", ".jpg", ".jpeg", ".gif"];
      return validImageExts.includes(fileExt);
    }
  };

  // ファイルアチE�Eロードハンドラ
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "ファイルが選択されてぁE��せん",
        description: "アチE�Eロードするファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    // ファイル形式チェチE��
    if (!isValidFileFormat(selectedFile, processingType)) {
      if (processingType === 'document') {
        toast({
          title: "未対応�Eファイル形弁E,
          description: "PDF, Word, Excel, PowerPoint ファイルのみアチE�Eロード可能でぁE,
          variant: "destructive",
        });
      } else {
        toast({
          title: "未対応�E画像形弁E,
          description: "SVG, PNG, JPG, GIF 画像ファイルのみアチE�Eロード可能でぁE,
          variant: "destructive",
        });
      }
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      // 処琁E��イプをフォームチE�Eタに追加
      formData.append("processingType", processingType);
      // 允E��ァイル保存設定を追加
      formData.append("keepOriginalFile", keepOriginalFile.toString());

      console.log(`ファイルをアチE�EローチE ${selectedFile.name}, 処琁E��イチE ${processingType}`);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/tech-support/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "アチE�Eロードに失敗しました");
      }

      const result = await response.json();
      console.log("アチE�Eロード結果:", result);

      const successMessage = processingType === 'document' 
        ? `${selectedFile.name} がナレチE��ベ�Eスに追加されました`
        : `${selectedFile.name} が画像検索チE�Eタに追加されました`;

      toast({
        title: "アチE�Eロード�E劁E,
        description: successMessage,
      });

      // 忁E��に応じてチE�Eタを更新
      if (processingType === 'document') {
        loadVehicleData();
      } else {
        // 画像検索チE�Eタを直接リローチE
        reloadImageSearchData();
        // バックアチE�Eとしてイベントも発衁E
        window.dispatchEvent(new Event('image-search-data-updated'));
      }
      
      setSelectedFile(null);
      
      // ファイル入力をリセチE��
      const fileInput = document.getElementById("tech-file-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "アチE�Eロードエラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ファイルタイプに応じたアイコンを返す関数
  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return <FileBox className="h-5 w-5 text-red-500" />;
      case 'XLSX':
        return <File className="h-5 w-5 text-green-500" />;
      case 'PPTX':
        return <Presentation className="h-5 w-5 text-orange-500" />;
      case 'DOCX':
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <FileType className="h-5 w-5 text-gray-500" />;
    }
  };

  // ファイルサイズを人間が読みめE��ぁE��式で表示する関数
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'サイズ不�E';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 一時ファイルをクリーンアチE�Eする関数
  const handleCleanupTempFiles = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/cleanup-uploads', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "クリーンアチE�Eに失敗しました");
      }
      
      const result = await response.json();
      console.log("クリーンアチE�E結果:", result);
      
      toast({
        title: "クリーンアチE�E成功",
        description: `一時ファイルのクリーンアチE�Eが完亁E��ました、E{result.details.removedFiles}件のファイルを削除しました。`,
      });
      
    } catch (error) {
      console.error("クリーンアチE�Eエラー:", error);
      toast({
        title: "クリーンアチE�Eエラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // 重褁E��像を検�Eして削除する関数
  const handleDetectDuplicateImages = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/detect-duplicate-images', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "重褁E��像�E検�Eに失敗しました");
      }
      
      const result = await response.json();
      console.log("重褁E��像検�E結果:", result);
      
      // 画像検索チE�Eタを�E読み込み
      reloadImageSearchData();
      
      toast({
        title: "重褁E��像検�E完亁E,
        description: `冁E��が同じ重褁E��像�E検�Eと削除が完亁E��ました、E{result.details.removedFiles}件の重褁E��ァイルを削除しました。`,
      });
      
    } catch (error) {
      console.error("重褁E��像検�Eエラー:", error);
      toast({
        title: "重褁E��像検�Eエラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // チE��レクトリを同期する関数
  const handleSyncDirectories = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fetch('/api/tech-support/sync-directories', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "チE��レクトリ同期に失敗しました");
      }
      
      const result = await response.json();
      console.log("チE��レクトリ同期結果:", result);
      
      toast({
        title: "同期成功",
        description: `
          チE��レクトリ同期が完亁E��ました、E
          ・知識�Eースへ移勁E ${result.details.toKnowledgeBase}件
          ・一時フォルダへ同期: ${result.details.fromKnowledgeBase}件
        `,
      });
      
      // 画像検索チE�Eタを�E読み込み
      reloadImageSearchData();
      
    } catch (error) {
      console.error("同期エラー:", error);
      toast({
        title: "同期エラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>技術文書アチE�EローチE/CardTitle>
        <CardDescription>
          保守�EニュアルめE��ータシートをアチE�Eロードして検索可能にしまぁE
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 処琁E��イプ�E選抁E*/}
          <div className="flex flex-col space-y-2">
            <Label>処琁E��イプを選抁E/Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="document-processing"
                  name="processing-type"
                  value="document"
                  checked={processingType === 'document'}
                  onChange={() => setProcessingType('document')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="document-processing" className="text-sm">
                  ナレチE��ベ�Eス斁E���E�EDF, Excel, PowerPoint�E�E
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="image-search-processing"
                  name="processing-type"
                  value="image_search"
                  checked={processingType === 'image_search'}
                  onChange={() => setProcessingType('image_search')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="image-search-processing" className="text-sm">
                  画像検索チE�Eタ�E�EVG, PNG, JPG�E�E
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="tech-file-upload">
              {processingType === 'document' 
                ? 'ファイルを選択！EDF, Excel, PowerPointなど�E�E 
                : '画像ファイルを選択！EVG, PNG, JPG�E�E}
            </Label>
            <div className="flex space-x-2">
              <Input
                id="tech-file-upload"
                type="file"
                accept={processingType === 'document' ? ".pdf,.docx,.xlsx,.pptx" : ".svg,.png,.jpg,.jpeg,.gif"}
                className="flex-1"
                onChange={handleFileChange}
              />
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                アチE�EローチE
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-blue-600">
                選択中: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            
            {/* ストレージ最適化オプション */}
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="keep-original-file"
                checked={keepOriginalFile}
                onChange={(e) => setKeepOriginalFile(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="keep-original-file" className="text-sm">
                允E��ァイルを保存する（チェチE��を外すとストレージ容量を節紁E��きます！E
              </label>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">アチE�Eロード済み技術文書</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">読み込み中...</span>
              </div>
            ) : uploadedDocuments.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイチE/TableHead>
                      <TableHead>ファイル吁E/TableHead>
                      <TableHead>詳細</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getFileIcon(doc.type)}
                            <Badge className="ml-2" variant="outline">
                              {doc.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{doc.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {doc.extractedTextPreview || "詳細なぁE}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 border rounded-md">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>アチE�Eロードされた技術文書はありません</p>
              </div>
            )}
          </div>
        </div>
        
        {/* シスチE��メンチE��ンスセクション */}
        <div className="mt-8 border-t pt-4">
          <h3 className="text-lg font-medium mb-2">シスチE��メンチE��ンス</h3>
          <p className="text-sm text-gray-500 mb-4">
            一時ファイルのクリーンアチE�EめE��識�Eースの同期などのシスチE��メンチE��ンス機�Eを提供します、E
          </p>
          
          <div className="flex flex-wrap gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-blue-200 bg-blue-50"
                    onClick={handleCleanupTempFiles}
                    disabled={isCleaningUp}
                  >
                    {isCleaningUp ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eraser className="mr-2 h-4 w-4 text-blue-600" />
                    )}
                    一時ファイルを削除
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>一時ファイルをクリーンアチE�Eしてストレージスペ�Eスを解放しまぁE/p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-amber-200 bg-amber-50"
                    onClick={handleDetectDuplicateImages}
                    disabled={isCleaningUp}
                  >
                    {isCleaningUp ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4 text-amber-600" />
                    )}
                    重褁E��像を検�E・削除
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>同じ冁E��の重褁E��像を検�Eして削除します（タイムスタンプが異なる同じ画像を削除�E�E/p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-green-200 bg-green-50"
                    onClick={handleSyncDirectories}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4 text-green-600" />
                    )}
                    チE��レクトリを同朁E
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>知識�Eースと一時ディレクトリ間でファイルを同期しまぁE/p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-purple-200 bg-purple-50"
                    onClick={() => {
                      // キャチE��ュをクリアしてチE�Eタを�E読み込み
                      reloadImageSearchData();
                      loadVehicleData();
                      toast({
                        title: "キャチE��ュクリア",
                        description: "画像検索チE�Eタとドキュメントデータを�E読み込みしました",
                      });
                    }}
                  >
                    <Database className="mr-2 h-4 w-4 text-purple-600" />
                    キャチE��ュをクリア
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>アプリケーションのキャチE��ュをクリアして最新のチE�Eタを読み込みまぁE/p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          アチE�Eロードされたファイルは自動的に処琁E��れ、検索可能になります。�E琁E���E忁E��に応じて一時ファイルを削除してストレージ容量を最適化できます、E
        </p>
      </CardFooter>
    </Card>
  );
};

export default TechSupportUploader;
