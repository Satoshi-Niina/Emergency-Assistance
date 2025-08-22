import React, { useState } from "react";
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
import { FileText, Upload, Trash2, FileType } from "lucide-react";
import { Loader2 } from "lucide-react";

interface KnowledgeDocument {
  id: string;
  title: string;
  type: string;
  addedAt: string;
}

const KnowledgeUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭ワ繝ｳ繝峨Λ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      
      // 繝輔ぃ繧､繝ｫ驕ｸ謚槫ｾ後↓input隕∫ｴ繧偵Μ繧ｻ繝・ヨ縺励※縲∝酔縺倥ヵ繧｡繧､繝ｫ繧貞・驕ｸ謚槭〒縺阪ｋ繧医≧縺ｫ縺吶ｋ
      event.target.value = '';
    }
  };

  // 蜀榊・逅・ワ繝ｳ繝峨Λ
  const handleProcessDocument = async (docId: string, title: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/knowledge/${docId}/process`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆");
      }

      toast({
        title: "蜃ｦ逅・・蜉・,
        description: `${title} 繧貞・蜃ｦ逅・＠縺ｾ縺励◆`,
      });
      
      // 繝峨く繝･繝｡繝ｳ繝井ｸ隕ｧ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
      await fetchDocuments();
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "蜃ｦ逅・お繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

    // 蟇ｾ蠢懊＠縺ｦ縺・ｋ繝輔ぃ繧､繝ｫ蠖｢蠑上ｒ繝√ぉ繝・け
    const validExtensions = [".pdf", ".docx", ".txt", ".xlsx", ".pptx"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast({
        title: "譛ｪ蟇ｾ蠢懊・繝輔ぃ繧､繝ｫ蠖｢蠑・,
        description: "PDF, Word, Excel, PowerPoint, 縺ｾ縺溘・繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/knowledge/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆");
      }

      const result = await response.json();

      toast({
        title: "繧｢繝・・繝ｭ繝ｼ繝画・蜉・,
        description: `${selectedFile.name} 縺檎衍隴倥・繝ｼ繧ｹ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆`,
      });

      // 繝峨く繝･繝｡繝ｳ繝医Μ繧ｹ繝医ｒ譖ｴ譁ｰ
      fetchDocuments();
      setSelectedFile(null);
      
      // 繝輔ぃ繧､繝ｫ蜈･蜉帙ｒ繝ｪ繧ｻ繝・ヨ
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
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

  // 繝峨く繝･繝｡繝ｳ繝亥炎髯､繝上Φ繝峨Λ
  const handleDeleteDocument = async (docId: string, title: string) => {
    try {
      const response = await fetch(`/api/knowledge/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }

      toast({
        title: "蜑企勁謌仙粥",
        description: `${title} 縺檎衍隴倥・繝ｼ繧ｹ縺九ｉ蜑企勁縺輔ｌ縺ｾ縺励◆`,
      });

      // 繝峨く繝･繝｡繝ｳ繝医Μ繧ｹ繝医ｒ譖ｴ譁ｰ
      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "蜑企勁繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 繝峨く繝･繝｡繝ｳ繝医Μ繧ｹ繝亥叙蠕・
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/knowledge`);
      if (!response.ok) {
        throw new Error("繝峨く繝･繝｡繝ｳ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆");
      }
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Fetch documents error:", error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝峨く繝･繝｡繝ｳ繝医・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｦ繝ｳ繝域凾縺ｫ繝峨く繝･繝｡繝ｳ繝医Μ繧ｹ繝医ｒ蜿門ｾ・
  React.useEffect(() => {
    fetchDocuments();
  }, []);

  // 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励↓蠢懊§縺溘い繧､繧ｳ繝ｳ繧定ｿ斐☆
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "word":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "excel":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "powerpoint":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "text":
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return <FileType className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-white border border-cyan-200 shadow-sm mb-6">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
          <CardTitle className="text-cyan-700">繝翫Ξ繝・ず繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝・/CardTitle>
          <CardDescription className="text-cyan-600">
            菫晏ｮ育畑霆翫・繝槭ル繝･繧｢繝ｫ繧・ぎ繧､繝峨Λ繧､繝ｳ繧偵い繝・・繝ｭ繝ｼ繝峨＠縲、I繝√Ε繝・ヨ縺ｮ遏･隴倥・繝ｼ繧ｹ縺ｨ縺励※豢ｻ逕ｨ縺励∪縺・
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <Label htmlFor="file-upload" className="text-cyan-700 font-medium">繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞</Label>
            <div className="flex mt-2">
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="bg-cyan-50 border-cyan-200 text-cyan-900"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="ml-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    蜃ｦ逅・ｸｭ...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    繧｢繝・・繝ｭ繝ｼ繝・
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-cyan-600 mt-2">
              蟇ｾ蠢懊ヵ繧ｩ繝ｼ繝槭ャ繝・ PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), 繝・く繧ｹ繝医ヵ繧｡繧､繝ｫ (.txt)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-cyan-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
          <CardTitle className="text-cyan-700">逋ｻ骭ｲ貂医∩繝翫Ξ繝・ず荳隕ｧ</CardTitle>
          <CardDescription className="text-cyan-600">
            AI縺後Θ繝ｼ繧ｶ繝ｼ縺ｮ雉ｪ蝠上↓蝗樒ｭ斐☆繧矩圀縺ｫ蜿ら・縺吶ｋ遏･隴倥・繝ｼ繧ｹ繝輔ぃ繧､繝ｫ
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-cyan-400 bg-cyan-50 rounded-lg border border-cyan-100">
              逋ｻ骭ｲ縺輔ｌ縺ｦ縺・ｋ繝峨く繝･繝｡繝ｳ繝医・縺ゅｊ縺ｾ縺帙ｓ
            </div>
          ) : (
            <Table>
              <TableCaption className="text-cyan-500">AI蝗樒ｭ皮函謌舌↓菴ｿ逕ｨ縺輔ｌ繧九リ繝ｬ繝・ず譁・嶌荳隕ｧ</TableCaption>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-cyan-50 to-blue-50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="text-cyan-700">繝輔ぃ繧､繝ｫ蜷・/TableHead>
                  <TableHead className="text-cyan-700">繧ｿ繧､繝・/TableHead>
                  <TableHead className="text-cyan-700">霑ｽ蜉譌･譎・/TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-cyan-50">
                    <TableCell>{getFileIcon(doc.type)}</TableCell>
                    <TableCell className="font-medium text-cyan-900">{doc.title}</TableCell>
                    <TableCell className="text-cyan-700">{doc.type}</TableCell>
                    <TableCell className="text-cyan-700">{new Date(doc.addedAt).toLocaleString("ja-JP")}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleProcessDocument(doc.id, doc.title)}
                          className="hover:bg-blue-100 text-blue-500"
                          title="繝輔ぃ繧､繝ｫ繧貞・蜃ｦ逅・
                        >
                          <FileText className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="hover:bg-red-100 text-red-500"
                          title="繝輔ぃ繧､繝ｫ繧貞炎髯､"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeUploader;
