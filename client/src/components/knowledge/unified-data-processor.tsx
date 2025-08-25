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

// 繧ｿ繧､繝怜ｮ夂ｾｩ
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
  
  // 蜃ｦ逅・が繝励す繝ｧ繝ｳ・郁・蜍募喧縺吶ｋ縺溘ａ縲√☆縺ｹ縺ｦ繝・ヵ繧ｩ繝ｫ繝医〒譛牙柑縺ｫ險ｭ螳夲ｼ・
  const [options, setOptions] = useState<ProcessingOptions>({
    keepOriginalFile: false, // 蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧九が繝励す繝ｧ繝ｳ縺ｮ縺ｿ繝ｦ繝ｼ繧ｶ繝ｼ縺碁∈謚槫庄閭ｽ・医ョ繝輔か繝ｫ繝医〒縺ｯ辟｡蜉ｹ・・
    extractKnowledgeBase: true,
    extractImageSearch: true,
    createQA: true
  });

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医′繝槭え繝ｳ繝医＆繧後◆縺ｨ縺阪↓譁・嶌繝ｪ繧ｹ繝医ｒ隱ｭ縺ｿ霎ｼ繧
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 繝峨Λ繝・げ&繝峨Ο繝・・繧ｨ繝ｪ繧｢縺ｮ繧､繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ
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

  // 繧ｯ繝ｪ繝・け縺励※繝輔ぃ繧､繝ｫ驕ｸ謚槭☆繧九◆繧√・繝上Φ繝峨Λ繝ｼ
  const handleFileSelectClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭ワ繝ｳ繝峨Λ繝ｼ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // 蜷後§繝輔ぃ繧､繝ｫ繧貞・驕ｸ謚槫庄閭ｽ縺ｫ縺吶ｋ縺溘ａ縺ｫ蜈･蜉帙ｒ繝ｪ繧ｻ繝・ヨ
      event.target.value = '';
    }
  };

  // 繧ｪ繝励す繝ｧ繝ｳ螟画峩繝上Φ繝峨Λ繝ｼ
  const handleOptionChange = (option: keyof ProcessingOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ縺ｮ繝輔か繝ｼ繝槭ャ繝・
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨→蜃ｦ逅・
  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({
        title: "繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ",
        description: "蜃ｦ逅・☆繧九ヵ繧｡繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    // 蟇ｾ蠢懊＠縺ｦ縺・ｋ繝輔ぃ繧､繝ｫ蠖｢蠑上ｒ繝√ぉ繝・け
    const validExtensions = [".pdf", ".docx", ".txt", ".xlsx", ".pptx", ".ppt", ".doc"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast({
        title: "譛ｪ蟇ｾ蠢懊・繝輔ぃ繧､繝ｫ蠖｢蠑・,
        description: "PDF, Word, Excel, PowerPoint, 縺ｾ縺溘・繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ縺ｮ縺ｿ蜃ｦ逅・庄閭ｽ縺ｧ縺・,
        variant: "destructive",
      });
      return;
    }
    
    // 蜃ｦ逅・が繝励す繝ｧ繝ｳ縺ｯ閾ｪ蜍慕噪縺ｫ譛牙柑蛹悶＆繧後※縺・ｋ縺ｮ縺ｧ遒ｺ隱堺ｸ崎ｦ・

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("keepOriginalFile", options.keepOriginalFile.toString());
      formData.append("extractKnowledgeBase", options.extractKnowledgeBase.toString());
      formData.append("extractImageSearch", options.extractImageSearch.toString());
      formData.append("createQA", options.createQA.toString());

      // 邨ｱ蜷医ョ繝ｼ繧ｿ蜃ｦ逅・PI繧貞他縺ｳ蜃ｺ縺・
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/data-processor/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆");
      }

      const result = await response.json();

      toast({
        title: "蜃ｦ逅・・蜉・,
        description: `${selectedFile.name} 繧貞・逅・＠縺ｾ縺励◆縲・{result.message || ""}`,
      });

      // 蜃ｦ逅・ｮ御ｺ・ｾ後∫判蜒乗､懃ｴ｢繝・・繧ｿ繧呈峩譁ｰ縺吶ｋ繧､繝吶Φ繝医ｒ逋ｺ逕溘＆縺帙ｋ
      window.dispatchEvent(new CustomEvent('image-search-data-updated'));

      // 譁・嶌繝ｪ繧ｹ繝医ｒ譖ｴ譁ｰ
      fetchDocuments();
      setSelectedFile(null);
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "蜃ｦ逅・お繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 譁・嶌縺ｮ蜑企勁
  const handleDeleteDocument = async (docId: string, title: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/knowledge/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }

      toast({
        title: "蜑企勁謌仙粥",
        description: `${title} 繧貞炎髯､縺励∪縺励◆`,
      });

      // 譁・嶌繝ｪ繧ｹ繝医ｒ譖ｴ譁ｰ
      fetchDocuments();
      
      // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧よ峩譁ｰ
      window.dispatchEvent(new CustomEvent('image-search-data-updated'));
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "蜑企勁繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 譁・嶌繝ｪ繧ｹ繝医・蜿門ｾ・
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/knowledge'));
      if (!response.ok) {
        throw new Error("譁・嶌縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
      }
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Fetch documents error:", error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "譁・嶌繝ｪ繧ｹ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 譌･莉倥・繝輔か繝ｼ繝槭ャ繝・
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
      return dateString || '荳肴・';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝牙・逅・/h2>
        
        {/* 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝芽ｪｬ譏・*/}
        <div className="mb-4">
          <p className="text-base font-semibold text-gray-700">
            PPTX, PDF, DOCX縲￣DF繧偵い繝・・繝ｭ繝ｼ繝峨☆繧九→縲√す繧ｹ繝・Β縺ｯ閾ｪ蜍慕噪縺ｫ蜀・ｮｹ繧定ｧ｣譫舌＠縲∵､懃ｴ｢縺ｨAI縺ｮ蠢懃ｭ斐↓驕ｩ縺励◆蠖｢蠑上↓螟画鋤縺励∪縺吶ゅ％縺ｮ蜃ｦ逅・↓縺ｯ謨ｰ蛻・°縺九ｋ縺薙→縺後≠繧翫∪縺吶・
          </p>
        </div>

        {/* 繝峨Λ繝・げ&繝峨Ο繝・・繧ｨ繝ｪ繧｢ */}
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
                <p className="text-lg font-medium text-blue-700">縺薙％縺ｫ繝輔ぃ繧､繝ｫ繧偵ラ繝ｩ繝・げ&繝峨Ο繝・・</p>
                <p className="text-sm text-gray-500">縺ｾ縺溘・<span className="text-blue-600 font-medium">繧ｯ繝ｪ繝・け縺励※驕ｸ謚・/span></p>
              </div>
            )}
          </div>
        </div>

        {/* 蜃ｦ逅・が繝励す繝ｧ繝ｳ・亥・繝輔ぃ繧､繝ｫ菫晏ｭ倥・縺ｿ陦ｨ遉ｺ・・*/}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="keepOriginalFile" 
            checked={options.keepOriginalFile}
            onCheckedChange={() => handleOptionChange('keepOriginalFile')}
          />
          <Label htmlFor="keepOriginalFile" className="cursor-pointer">
            蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧・
          </Label>
        </div>

        {/* 蜃ｦ逅・・繧ｿ繝ｳ */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleProcessFile}
            disabled={!selectedFile || isUploading}
            className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                蜃ｦ逅・ｸｭ...
              </>
            ) : (
              <>
                <Database className="mr-2 h-5 w-5" />
                蜃ｦ逅・幕蟋・
              </>
            )}
          </Button>
        </div>

        {/* 謨・囿諠・ｱ蜿冶ｾｼ */}
        <FileIngestPanel />

      </div>

      {/* 蜃ｦ逅・ｸ医∩譁・嶌荳隕ｧ */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-blue-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800">蜃ｦ逅・ｸ医∩譁・嶌荳隕ｧ</h2>
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
            <span className="ml-2 text-blue-600">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</span>
          </div>
        ) : documents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>繧ｿ繧､繝医Ν</TableHead>
                  <TableHead>遞ｮ鬘・/TableHead>
                  <TableHead>霑ｽ蜉譌･譎・/TableHead>
                  <TableHead className="text-right">謫堺ｽ・/TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title || "辟｡鬘・}</TableCell>
                    <TableCell>{doc.type || "荳肴・"}</TableCell>
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
            <p>蜃ｦ逅・ｸ医∩譁・嶌縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedDataProcessor;