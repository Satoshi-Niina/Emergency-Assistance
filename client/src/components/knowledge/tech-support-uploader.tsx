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
    // コンポーネントがマウントされたときにアップロード済みドキュメントを読み込む
    loadVehicleData();
  }, []);

  // ファイル選択ハンドラ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // ファイル選択後にinput要素をリセットして、同じファイルを再選択できるようにする
      event.target.value = '';
    }
  };

  // extracted_data.jsonから車両データを読み込む
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/extracted_data.json');
      if (!response.ok) {
        throw new Error('vehicle data loading failed');
      }
      
      const data = await response.json();
      
      // 車両データからドキュメント形式（PDF, Excel, PowerPoint）のみを抽出
      const documents: TechDocument[] = [];
      
      if (data.vehicleData && Array.isArray(data.vehicleData)) {
        for (const item of data.vehicleData) {
          if (['PDF', 'XLSX', 'PPTX', 'DOCX'].includes(item.category)) {
            documents.push({
              id: item.id,
              name: item.title,
              path: item.image_path || '',
              type: item.category,
              size: 0, // サイズ情報がないので0を設定
              extractedTextPreview: item.details
            });
          }
        }
      }
      
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Failed to load vehicle data:', error);
      // エラーが発生しても表示しない - 成功時のみデータ表示する仕様に変更
      // エラーメッセージは開発時のみコンソールに表示
    } finally {
      setIsLoading(false);
    }
  };

  // 処理タイプの選択肢
  const [processingType, setProcessingType] = useState<'document' | 'image_search'>('document');

  // ファイル形式バリデーション
  const isValidFileFormat = (file: File, type: 'document' | 'image_search'): boolean => {
    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
    
    if (type === 'document') {
      // ドキュメント処理の対応形式
      const validDocumentExts = [".pdf", ".docx", ".xlsx", ".pptx"];
      return validDocumentExts.includes(fileExt);
    } else {
      // 画像検索データ処理の対応形式
      const validImageExts = [".svg", ".png", ".jpg", ".jpeg", ".gif"];
      return validImageExts.includes(fileExt);
    }
  };

  // ファイルアップロードハンドラ
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "ファイルが選択されていません",
        description: "アップロードするファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    // ファイル形式チェック
    if (!isValidFileFormat(selectedFile, processingType)) {
      if (processingType === 'document') {
        toast({
          title: "未対応のファイル形式",
          description: "PDF, Word, Excel, PowerPoint ファイルのみアップロード可能です",
          variant: "destructive",
        });
      } else {
        toast({
          title: "未対応の画像形式",
          description: "SVG, PNG, JPG, GIF 画像ファイルのみアップロード可能です",
          variant: "destructive",
        });
      }
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      // 処理タイプをフォームデータに追加
      formData.append("processingType", processingType);
      // 元ファイル保存設定を追加
      formData.append("keepOriginalFile", keepOriginalFile.toString());

      console.log(`ファイルをアップロード: ${selectedFile.name}, 処理タイプ: ${processingType}`);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/tech-support/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "アップロードに失敗しました");
      }

      const result = await response.json();
      console.log("アップロード結果:", result);

      const successMessage = processingType === 'document' 
        ? `${selectedFile.name} がナレッジベースに追加されました`
        : `${selectedFile.name} が画像検索データに追加されました`;

      toast({
        title: "アップロード成功",
        description: successMessage,
      });

      // 必要に応じてデータを更新
      if (processingType === 'document') {
        loadVehicleData();
      } else {
        // 画像検索データを直接リロード
        reloadImageSearchData();
        // バックアップとしてイベントも発行
        window.dispatchEvent(new Event('image-search-data-updated'));
      }
      
      setSelectedFile(null);
      
      // ファイル入力をリセット
      const fileInput = document.getElementById("tech-file-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "アップロードエラー",
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

  // ファイルサイズを人間が読みやすい形式で表示する関数
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'サイズ不明';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 一時ファイルをクリーンアップする関数
  const handleCleanupTempFiles = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/cleanup-uploads', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "クリーンアップに失敗しました");
      }
      
      const result = await response.json();
      console.log("クリーンアップ結果:", result);
      
      toast({
        title: "クリーンアップ成功",
        description: `一時ファイルのクリーンアップが完了しました。${result.details.removedFiles}件のファイルを削除しました。`,
      });
      
    } catch (error) {
      console.error("クリーンアップエラー:", error);
      toast({
        title: "クリーンアップエラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // 重複画像を検出して削除する関数
  const handleDetectDuplicateImages = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/detect-duplicate-images', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "重複画像の検出に失敗しました");
      }
      
      const result = await response.json();
      console.log("重複画像検出結果:", result);
      
      // 画像検索データを再読み込み
      reloadImageSearchData();
      
      toast({
        title: "重複画像検出完了",
        description: `内容が同じ重複画像の検出と削除が完了しました。${result.details.removedFiles}件の重複ファイルを削除しました。`,
      });
      
    } catch (error) {
      console.error("重複画像検出エラー:", error);
      toast({
        title: "重複画像検出エラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // ディレクトリを同期する関数
  const handleSyncDirectories = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fetch('/api/tech-support/sync-directories', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ディレクトリ同期に失敗しました");
      }
      
      const result = await response.json();
      console.log("ディレクトリ同期結果:", result);
      
      toast({
        title: "同期成功",
        description: `
          ディレクトリ同期が完了しました。
          ・知識ベースへ移動: ${result.details.toKnowledgeBase}件
          ・一時フォルダへ同期: ${result.details.fromKnowledgeBase}件
        `,
      });
      
      // 画像検索データを再読み込み
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
        <CardTitle>技術文書アップロード</CardTitle>
        <CardDescription>
          保守マニュアルやデータシートをアップロードして検索可能にします
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 処理タイプの選択 */}
          <div className="flex flex-col space-y-2">
            <Label>処理タイプを選択</Label>
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
                  ナレッジベース文書（PDF, Excel, PowerPoint）
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
                  画像検索データ（SVG, PNG, JPG）
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="tech-file-upload">
              {processingType === 'document' 
                ? 'ファイルを選択（PDF, Excel, PowerPointなど）' 
                : '画像ファイルを選択（SVG, PNG, JPG）'}
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
                アップロード
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
                元ファイルを保存する（チェックを外すとストレージ容量を節約できます）
              </label>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">アップロード済み技術文書</h3>
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
                      <TableHead>タイプ</TableHead>
                      <TableHead>ファイル名</TableHead>
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
                          {doc.extractedTextPreview || "詳細なし"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 border rounded-md">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>アップロードされた技術文書はありません</p>
              </div>
            )}
          </div>
        </div>
        
        {/* システムメンテナンスセクション */}
        <div className="mt-8 border-t pt-4">
          <h3 className="text-lg font-medium mb-2">システムメンテナンス</h3>
          <p className="text-sm text-gray-500 mb-4">
            一時ファイルのクリーンアップや知識ベースの同期などのシステムメンテナンス機能を提供します。
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
                  <p>一時ファイルをクリーンアップしてストレージスペースを解放します</p>
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
                    重複画像を検出・削除
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>同じ内容の重複画像を検出して削除します（タイムスタンプが異なる同じ画像を削除）</p>
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
                    ディレクトリを同期
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>知識ベースと一時ディレクトリ間でファイルを同期します</p>
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
                      // キャッシュをクリアしてデータを再読み込み
                      reloadImageSearchData();
                      loadVehicleData();
                      toast({
                        title: "キャッシュクリア",
                        description: "画像検索データとドキュメントデータを再読み込みしました",
                      });
                    }}
                  >
                    <Database className="mr-2 h-4 w-4 text-purple-600" />
                    キャッシュをクリア
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>アプリケーションのキャッシュをクリアして最新のデータを読み込みます</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          アップロードされたファイルは自動的に処理され、検索可能になります。処理後は必要に応じて一時ファイルを削除してストレージ容量を最適化できます。
        </p>
      </CardFooter>
    </Card>
  );
};

export default TechSupportUploader;