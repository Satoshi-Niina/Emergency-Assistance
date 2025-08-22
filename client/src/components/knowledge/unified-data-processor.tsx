import { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast.ts";
import { Loader2, Upload, Trash2, FileText, RefreshCw, Database, Image, AlertTriangle } from "lucide-react";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import FileIngestPanel from "../../components/FileIngestPanel";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { buildApiUrl } from "../../lib/api/config.ts";

// タイプ定義
interface ProcessedDocument {
  id: string;
  title: string;
  type: string;
  addedAt: string;
}

interface ProcessingOptions {
  keepOriginalFile: boolean;
  extractKnowledgeBase: boolean;
  extractImageSearch: boolean;
  createQA: boolean;
}

const UnifiedDataProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 処琁E��プション�E��E動化するため、すべてチE��ォルトで有効に設定！E
  const [options, setOptions] = useState<ProcessingOptions>({
    keepOriginalFile: false, // 允E��ァイルを保存するオプションのみユーザーが選択可能�E�デフォルトでは無効�E�E
    extractKnowledgeBase: true,
    extractImageSearch: true,
    createQA: true
  });

  // コンポ�Eネントがマウントされたときに斁E��リストを読み込む
  useEffect(() => {
    fetchDocuments();
  }, []);

  // ドラチE��&ドロチE�Eエリアのイベントハンドラー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  // クリチE��してファイル選択するため�Eハンドラー
  const handleFileSelectClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択ハンドラー
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // 同じファイルを�E選択可能にするために入力をリセチE��
      event.target.value = '';
    }
  };

  // オプション変更ハンドラー
  const handleOptionChange = (option: keyof ProcessingOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // ファイルサイズのフォーマッチE
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ファイルのアチE�Eロードと処琁E
  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({
        title: "ファイルが選択されてぁE��せん",
        description: "処琁E��るファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    // 対応してぁE��ファイル形式をチェチE��
    const validExtensions = [".pdf", ".docx", ".txt", ".xlsx", ".pptx", ".ppt", ".doc"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast({
        title: "未対応�Eファイル形弁E,
        description: "PDF, Word, Excel, PowerPoint, また�EチE��ストファイルのみ処琁E��能でぁE,
        variant: "destructive",
      });
      return;
    }
    
    // 処琁E��プションは自動的に有効化されてぁE��ので確認不要E

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("keepOriginalFile", options.keepOriginalFile.toString());
      formData.append("extractKnowledgeBase", options.extractKnowledgeBase.toString());
      formData.append("extractImageSearch", options.extractImageSearch.toString());
      formData.append("createQA", options.createQA.toString());

      // 統合データ処琁EPIを呼び出ぁE
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data-processor/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "処琁E��失敗しました");
      }

      const result = await response.json();

      toast({
        title: "処琁E�E劁E,
        description: `${selectedFile.name} を�E琁E��ました、E{result.message || ""}`,
      });

      // 処琁E��亁E��、画像検索チE�Eタを更新するイベントを発生させる
      window.dispatchEvent(new CustomEvent('image-search-data-updated'));

      // 斁E��リストを更新
      fetchDocuments();
      setSelectedFile(null);
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "処琁E��ラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 斁E��の削除
  const handleDeleteDocument = async (docId: string, title: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/knowledge/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "削除に失敗しました");
      }

      toast({
        title: "削除成功",
        description: `${title} を削除しました`,
      });

      // 斁E��リストを更新
      fetchDocuments();
      
      // 画像検索チE�Eタも更新
      window.dispatchEvent(new CustomEvent('image-search-data-updated'));
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "削除エラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // 斁E��リスト�E取征E
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/knowledge'));
      if (!response.ok) {
        throw new Error("斁E��の取得に失敗しました");
      }
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Fetch documents error:", error);
      toast({
        title: "エラー",
        description: "斁E��リスト�E取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 日付�EフォーマッチE
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString || '不�E';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">ファイルアチE�Eロード�E琁E/h2>
        
        {/* ファイルアチE�Eロード説昁E*/}
        <div className="mb-4">
          <p className="text-base font-semibold text-gray-700">
            PPTX, PDF, DOCX、PDFをアチE�Eロードすると、シスチE��は自動的に冁E��を解析し、検索とAIの応答に適した形式に変換します。この処琁E��は数刁E��かることがあります、E
          </p>
        </div>

        {/* ドラチE��&ドロチE�Eエリア */}
        <div
          className={`border-2 border-dashed border-blue-300 rounded-lg p-8 mb-4 text-center cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors ${
            selectedFile ? 'border-blue-600 bg-blue-100' : ''
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleFileSelectClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-blue-700 mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-lg font-medium text-blue-700">{selectedFile.name}</p>
                <p className="text-sm text-blue-600">({formatFileSize(selectedFile.size)})</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-blue-700">ここにファイルをドラチE��&ドロチE�E</p>
                <p className="text-sm text-gray-500">また�E<span className="text-blue-600 font-medium">クリチE��して選抁E/span></p>
              </div>
            )}
          </div>
        </div>

        {/* 処琁E��プション�E��Eファイル保存�Eみ表示�E�E*/}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="keepOriginalFile" 
            checked={options.keepOriginalFile}
            onCheckedChange={() => handleOptionChange('keepOriginalFile')}
          />
          <Label htmlFor="keepOriginalFile" className="cursor-pointer">
            允E��ァイルを保存すめE
          </Label>
        </div>

        {/* 処琁E�Eタン */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleProcessFile}
            disabled={!selectedFile || isUploading}
            className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                処琁E��...
              </>
            ) : (
              <>
                <Database className="mr-2 h-5 w-5" />
                処琁E��姁E
              </>
            )}
          </Button>
        </div>

        {/* 敁E��惁E��取込 */}
        <FileIngestPanel />

      </div>

      {/* 処琁E��み斁E��一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">処琁E��み斁E��一覧</h2>
          <Button
            onClick={fetchDocuments}
            variant="outline"
            className="text-blue-600 border-blue-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-blue-600">読み込み中...</span>
          </div>
        ) : documents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>種顁E/TableHead>
                  <TableHead>追加日晁E/TableHead>
                  <TableHead className="text-right">操佁E/TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title || "無顁E}</TableCell>
                    <TableCell>{doc.type || "不�E"}</TableCell>
                    <TableCell>{formatDate(doc.addedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>処琁E��み斁E��はありません</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDataProcessor;
