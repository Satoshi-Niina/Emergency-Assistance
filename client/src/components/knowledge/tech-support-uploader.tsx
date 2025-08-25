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
    // 繧ｳ繝ｳ繝昴・繝阪Φ繝医′繝槭え繝ｳ繝医＆繧後◆縺ｨ縺阪↓繧｢繝・・繝ｭ繝ｼ繝画ｸ医∩繝峨く繝･繝｡繝ｳ繝医ｒ隱ｭ縺ｿ霎ｼ繧
    loadVehicleData();
  }, []);

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭ワ繝ｳ繝峨Λ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // 繝輔ぃ繧､繝ｫ驕ｸ謚槫ｾ後↓input隕∫ｴ繧偵Μ繧ｻ繝・ヨ縺励※縲∝酔縺倥ヵ繧｡繧､繝ｫ繧貞・驕ｸ謚槭〒縺阪ｋ繧医≧縺ｫ縺吶ｋ
      event.target.value = '';
    }
  };

  // extracted_data.json縺九ｉ霆贋ｸ｡繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/extracted_data.json');
      if (!response.ok) {
        throw new Error('vehicle data loading failed');
      }
      
      const data = await response.json();
      
      // 霆贋ｸ｡繝・・繧ｿ縺九ｉ繝峨く繝･繝｡繝ｳ繝亥ｽ｢蠑擾ｼ・DF, Excel, PowerPoint・峨・縺ｿ繧呈歓蜃ｺ
      const documents: TechDocument[] = [];
      
      if (data.vehicleData && Array.isArray(data.vehicleData)) {
        for (const item of data.vehicleData) {
          if (['PDF', 'XLSX', 'PPTX', 'DOCX'].includes(item.category)) {
            documents.push({
              id: item.id,
              name: item.title,
              path: item.image_path || '',
              type: item.category,
              size: 0, // 繧ｵ繧､繧ｺ諠・ｱ縺後↑縺・・縺ｧ0繧定ｨｭ螳・
              extractedTextPreview: item.details
            });
          }
        }
      }
      
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Failed to load vehicle data:', error);
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧り｡ｨ遉ｺ縺励↑縺・- 謌仙粥譎ゅ・縺ｿ繝・・繧ｿ陦ｨ遉ｺ縺吶ｋ莉墓ｧ倥↓螟画峩
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｯ髢狗匱譎ゅ・縺ｿ繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｫ陦ｨ遉ｺ
    } finally {
      setIsLoading(false);
    }
  };

  // 蜃ｦ逅・ち繧､繝励・驕ｸ謚櫁い
  const [processingType, setProcessingType] = useState<'document' | 'image_search'>('document');

  // 繝輔ぃ繧､繝ｫ蠖｢蠑上ヰ繝ｪ繝・・繧ｷ繝ｧ繝ｳ
  const isValidFileFormat = (file: File, type: 'document' | 'image_search'): boolean => {
    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
    
    if (type === 'document') {
      // 繝峨く繝･繝｡繝ｳ繝亥・逅・・蟇ｾ蠢懷ｽ｢蠑・
      const validDocumentExts = [".pdf", ".docx", ".xlsx", ".pptx"];
      return validDocumentExts.includes(fileExt);
    } else {
      // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ蜃ｦ逅・・蟇ｾ蠢懷ｽ｢蠑・
      const validImageExts = [".svg", ".png", ".jpg", ".jpeg", ".gif"];
      return validImageExts.includes(fileExt);
    }
  };

  // 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝峨ワ繝ｳ繝峨Λ
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ",
        description: "繧｢繝・・繝ｭ繝ｼ繝峨☆繧九ヵ繧｡繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞",
        variant: "destructive",
      });
      return;
    }

    // 繝輔ぃ繧､繝ｫ蠖｢蠑上メ繧ｧ繝・け
    if (!isValidFileFormat(selectedFile, processingType)) {
      if (processingType === 'document') {
        toast({
          title: "譛ｪ蟇ｾ蠢懊・繝輔ぃ繧､繝ｫ蠖｢蠑・,
          description: "PDF, Word, Excel, PowerPoint 繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・,
          variant: "destructive",
        });
      } else {
        toast({
          title: "譛ｪ蟇ｾ蠢懊・逕ｻ蜒丞ｽ｢蠑・,
          description: "SVG, PNG, JPG, GIF 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・,
          variant: "destructive",
        });
      }
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      // 蜃ｦ逅・ち繧､繝励ｒ繝輔か繝ｼ繝繝・・繧ｿ縺ｫ霑ｽ蜉
      formData.append("processingType", processingType);
      // 蜈・ヵ繧｡繧､繝ｫ菫晏ｭ倩ｨｭ螳壹ｒ霑ｽ蜉
      formData.append("keepOriginalFile", keepOriginalFile.toString());

      console.log(`繝輔ぃ繧､繝ｫ繧偵い繝・・繝ｭ繝ｼ繝・ ${selectedFile.name}, 蜃ｦ逅・ち繧､繝・ ${processingType}`);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/tech-support/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆");
      }

      const result = await response.json();
      console.log("繧｢繝・・繝ｭ繝ｼ繝臥ｵ先棡:", result);

      const successMessage = processingType === 'document' 
        ? `${selectedFile.name} 縺後リ繝ｬ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆`
        : `${selectedFile.name} 縺檎判蜒乗､懃ｴ｢繝・・繧ｿ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆`;

      toast({
        title: "繧｢繝・・繝ｭ繝ｼ繝画・蜉・,
        description: successMessage,
      });

      // 蠢・ｦ√↓蠢懊§縺ｦ繝・・繧ｿ繧呈峩譁ｰ
      if (processingType === 'document') {
        loadVehicleData();
      } else {
        // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧堤峩謗･繝ｪ繝ｭ繝ｼ繝・
        reloadImageSearchData();
        // 繝舌ャ繧ｯ繧｢繝・・縺ｨ縺励※繧､繝吶Φ繝医ｂ逋ｺ陦・
        window.dispatchEvent(new Event('image-search-data-updated'));
      }
      
      setSelectedFile(null);
      
      // 繝輔ぃ繧､繝ｫ蜈･蜉帙ｒ繝ｪ繧ｻ繝・ヨ
      const fileInput = document.getElementById("tech-file-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励↓蠢懊§縺溘い繧､繧ｳ繝ｳ繧定ｿ斐☆髢｢謨ｰ
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

  // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繧剃ｺｺ髢薙′隱ｭ縺ｿ繧・☆縺・ｽ｢蠑上〒陦ｨ遉ｺ縺吶ｋ髢｢謨ｰ
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '繧ｵ繧､繧ｺ荳肴・';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 荳譎ゅヵ繧｡繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺吶ｋ髢｢謨ｰ
  const handleCleanupTempFiles = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/cleanup-uploads', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
      
      const result = await response.json();
      console.log("繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・邨先棡:", result);
      
      toast({
        title: "繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・謌仙粥",
        description: `荳譎ゅヵ繧｡繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・縺悟ｮ御ｺ・＠縺ｾ縺励◆縲・{result.details.removedFiles}莉ｶ縺ｮ繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆縲Ａ,
      });
      
    } catch (error) {
      console.error("繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧ｨ繝ｩ繝ｼ:", error);
      toast({
        title: "繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // 驥崎､・判蜒上ｒ讀懷・縺励※蜑企勁縺吶ｋ髢｢謨ｰ
  const handleDetectDuplicateImages = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch('/api/tech-support/detect-duplicate-images', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "驥崎､・判蜒上・讀懷・縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
      
      const result = await response.json();
      console.log("驥崎､・判蜒乗､懷・邨先棡:", result);
      
      // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
      reloadImageSearchData();
      
      toast({
        title: "驥崎､・判蜒乗､懷・螳御ｺ・,
        description: `蜀・ｮｹ縺悟酔縺倬㍾隍・判蜒上・讀懷・縺ｨ蜑企勁縺悟ｮ御ｺ・＠縺ｾ縺励◆縲・{result.details.removedFiles}莉ｶ縺ｮ驥崎､・ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺励◆縲Ａ,
      });
      
    } catch (error) {
      console.error("驥崎､・判蜒乗､懷・繧ｨ繝ｩ繝ｼ:", error);
      toast({
        title: "驥崎､・判蜒乗､懷・繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // 繝・ぅ繝ｬ繧ｯ繝医Μ繧貞酔譛溘☆繧矩未謨ｰ
  const handleSyncDirectories = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fetch('/api/tech-support/sync-directories', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
      
      const result = await response.json();
      console.log("繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄邨先棡:", result);
      
      toast({
        title: "蜷梧悄謌仙粥",
        description: `
          繝・ぅ繝ｬ繧ｯ繝医Μ蜷梧悄縺悟ｮ御ｺ・＠縺ｾ縺励◆縲・
          繝ｻ遏･隴倥・繝ｼ繧ｹ縺ｸ遘ｻ蜍・ ${result.details.toKnowledgeBase}莉ｶ
          繝ｻ荳譎ゅヵ繧ｩ繝ｫ繝縺ｸ蜷梧悄: ${result.details.fromKnowledgeBase}莉ｶ
        `,
      });
      
      // 逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
      reloadImageSearchData();
      
    } catch (error) {
      console.error("蜷梧悄繧ｨ繝ｩ繝ｼ:", error);
      toast({
        title: "蜷梧悄繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>謚陦捺枚譖ｸ繧｢繝・・繝ｭ繝ｼ繝・/CardTitle>
        <CardDescription>
          菫晏ｮ医・繝九Η繧｢繝ｫ繧・ョ繝ｼ繧ｿ繧ｷ繝ｼ繝医ｒ繧｢繝・・繝ｭ繝ｼ繝峨＠縺ｦ讀懃ｴ｢蜿ｯ閭ｽ縺ｫ縺励∪縺・
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 蜃ｦ逅・ち繧､繝励・驕ｸ謚・*/}
          <div className="flex flex-col space-y-2">
            <Label>蜃ｦ逅・ち繧､繝励ｒ驕ｸ謚・/Label>
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
                  繝翫Ξ繝・ず繝吶・繧ｹ譁・嶌・・DF, Excel, PowerPoint・・
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
                  逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ・・VG, PNG, JPG・・
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="tech-file-upload">
              {processingType === 'document' 
                ? '繝輔ぃ繧､繝ｫ繧帝∈謚橸ｼ・DF, Excel, PowerPoint縺ｪ縺ｩ・・ 
                : '逕ｻ蜒上ヵ繧｡繧､繝ｫ繧帝∈謚橸ｼ・VG, PNG, JPG・・}
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
                繧｢繝・・繝ｭ繝ｼ繝・
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-blue-600">
                驕ｸ謚樔ｸｭ: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            
            {/* 繧ｹ繝医Ξ繝ｼ繧ｸ譛驕ｩ蛹悶が繝励す繝ｧ繝ｳ */}
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="keep-original-file"
                checked={keepOriginalFile}
                onChange={(e) => setKeepOriginalFile(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="keep-original-file" className="text-sm">
                蜈・ヵ繧｡繧､繝ｫ繧剃ｿ晏ｭ倥☆繧具ｼ医メ繧ｧ繝・け繧貞､悶☆縺ｨ繧ｹ繝医Ξ繝ｼ繧ｸ螳ｹ驥上ｒ遽邏・〒縺阪∪縺呻ｼ・
              </label>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">繧｢繝・・繝ｭ繝ｼ繝画ｸ医∩謚陦捺枚譖ｸ</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</span>
              </div>
            ) : uploadedDocuments.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>繧ｿ繧､繝・/TableHead>
                      <TableHead>繝輔ぃ繧､繝ｫ蜷・/TableHead>
                      <TableHead>隧ｳ邏ｰ</TableHead>
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
                          {doc.extractedTextPreview || "隧ｳ邏ｰ縺ｪ縺・}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 border rounded-md">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆謚陦捺枚譖ｸ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 繧ｷ繧ｹ繝・Β繝｡繝ｳ繝・リ繝ｳ繧ｹ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
        <div className="mt-8 border-t pt-4">
          <h3 className="text-lg font-medium mb-2">繧ｷ繧ｹ繝・Β繝｡繝ｳ繝・リ繝ｳ繧ｹ</h3>
          <p className="text-sm text-gray-500 mb-4">
            荳譎ゅヵ繧｡繧､繝ｫ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧・衍隴倥・繝ｼ繧ｹ縺ｮ蜷梧悄縺ｪ縺ｩ縺ｮ繧ｷ繧ｹ繝・Β繝｡繝ｳ繝・リ繝ｳ繧ｹ讖溯・繧呈署萓帙＠縺ｾ縺吶・
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
                    荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>荳譎ゅヵ繧｡繧､繝ｫ繧偵け繝ｪ繝ｼ繝ｳ繧｢繝・・縺励※繧ｹ繝医Ξ繝ｼ繧ｸ繧ｹ繝壹・繧ｹ繧定ｧ｣謾ｾ縺励∪縺・/p>
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
                    驥崎､・判蜒上ｒ讀懷・繝ｻ蜑企勁
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>蜷後§蜀・ｮｹ縺ｮ驥崎､・判蜒上ｒ讀懷・縺励※蜑企勁縺励∪縺呻ｼ医ち繧､繝繧ｹ繧ｿ繝ｳ繝励′逡ｰ縺ｪ繧句酔縺倡判蜒上ｒ蜑企勁・・/p>
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
                    繝・ぅ繝ｬ繧ｯ繝医Μ繧貞酔譛・
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>遏･隴倥・繝ｼ繧ｹ縺ｨ荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ髢薙〒繝輔ぃ繧､繝ｫ繧貞酔譛溘＠縺ｾ縺・/p>
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
                      // 繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺励※繝・・繧ｿ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
                      reloadImageSearchData();
                      loadVehicleData();
                      toast({
                        title: "繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢",
                        description: "逕ｻ蜒乗､懃ｴ｢繝・・繧ｿ縺ｨ繝峨く繝･繝｡繝ｳ繝医ョ繝ｼ繧ｿ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ縺励∪縺励◆",
                      });
                    }}
                  >
                    <Database className="mr-2 h-4 w-4 text-purple-600" />
                    繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺励※譛譁ｰ縺ｮ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ縺ｾ縺・/p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <p className="text-xs text-gray-500">
          繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆繝輔ぃ繧､繝ｫ縺ｯ閾ｪ蜍慕噪縺ｫ蜃ｦ逅・＆繧後∵､懃ｴ｢蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺吶ょ・逅・ｾ後・蠢・ｦ√↓蠢懊§縺ｦ荳譎ゅヵ繧｡繧､繝ｫ繧貞炎髯､縺励※繧ｹ繝医Ξ繝ｼ繧ｸ螳ｹ驥上ｒ譛驕ｩ蛹悶〒縺阪∪縺吶・
        </p>
      </CardFooter>
    </Card>
  );
};

export default TechSupportUploader;