import { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast.ts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  Eye, 
  Edit, 
  Plus, 
  AlertCircle, 
  BrainCircuit, 
  Info, 
  History,
  Filter,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

// 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蝙句ｮ夂ｾｩ
interface KnowledgeData {
  id: string;
  title: string;
  type: string;
  category?: string;
  tags?: string[];
  path: string;
  size?: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  chunkCount?: number;
  processedAt?: string;
}

interface KnowledgeType {
  value: string;
  label: string;
}

const KnowledgeManager: React.FC = () => {
  const { toast } = useToast();
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData[]>([]);
  const [knowledgeTypes, setKnowledgeTypes] = useState<KnowledgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: '',
    tags: '',
    description: ''
  });

  // 繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ繧貞叙蠕・
  const fetchKnowledgeData = async () => {
    try {
      setLoading(true);
      const params = filterType ? `?type=${filterType}` : '';
      const response = await fetch(`/api/knowledge-base${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge data: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setKnowledgeData(result.data);
        console.log('笨・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ玲・蜉・', result.data.length + '莉ｶ');
      } else {
        console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ怜､ｱ謨・', result.message);
        setKnowledgeData([]);
      }
    } catch (error) {
      console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝翫Ξ繝・ず繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive"
      });
      setKnowledgeData([]);
    } finally {
      setLoading(false);
    }
  };

  // 繝翫Ξ繝・ず繝・・繧ｿ縺ｮ遞ｮ鬘樔ｸ隕ｧ繧貞叙蠕・
  const fetchKnowledgeTypes = async () => {
    try {
      const response = await fetch('/api/knowledge-base/types/list');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch knowledge types: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setKnowledgeTypes(result.data);
      } else {
        console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ遞ｮ鬘槫叙蠕怜､ｱ謨・', result.message);
      }
    } catch (error) {
      console.error('笶・繝翫Ξ繝・ず繝・・繧ｿ遞ｮ鬘槫叙蠕励お繝ｩ繝ｼ:', error);
    }
  };

  // 繧ｳ繝ｳ繝昴・繝阪Φ繝医・繧ｦ繝ｳ繝域凾縺ｫ繝・・繧ｿ繧貞叙蠕・
  useEffect(() => {
    fetchKnowledgeData();
    fetchKnowledgeTypes();
  }, [filterType]);

  // 繝輔ぃ繧､繝ｫ驕ｸ謚槭ワ繝ｳ繝峨Λ繝ｼ
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setUploadForm(prev => ({
        ...prev,
        title: file.name
      }));
    }
  };

  // 繧｢繝・・繝ｭ繝ｼ繝峨ワ繝ｳ繝峨Λ繝ｼ
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('tags', uploadForm.tags);
      formData.append('description', uploadForm.description);

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "繧｢繝・・繝ｭ繝ｼ繝画・蜉・,
          description: `${selectedFile.name} 縺後リ繝ｬ繝・ず繝吶・繧ｹ縺ｫ霑ｽ蜉縺輔ｌ縺ｾ縺励◆`,
        });

        // 繝輔か繝ｼ繝繧偵Μ繧ｻ繝・ヨ
        setSelectedFile(null);
        setUploadForm({
          title: '',
          category: '',
          tags: '',
          description: ''
        });
        setUploadDialogOpen(false);

        // 繝・・繧ｿ繧貞・蜿門ｾ・
        fetchKnowledgeData();
      } else {
        throw new Error(result.message || "繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 蜑企勁繝上Φ繝峨Λ繝ｼ
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`縲・{title}縲阪ｒ蜑企勁縺励∪縺吶°・歔)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "蜑企勁謌仙粥",
          description: `${title} 繧貞炎髯､縺励∪縺励◆`,
        });

        // 繝・・繧ｿ繧貞・蜿門ｾ・
        fetchKnowledgeData();
      } else {
        throw new Error(result.message || "蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "蜑企勁繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繧剃ｺｺ髢薙′隱ｭ縺ｿ繧・☆縺・ｽ｢蠑上↓螟画鋤
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '荳肴・';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 譌･莉倥ｒ繝輔か繝ｼ繝槭ャ繝・
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm');
  };

  // 繧ｿ繧､繝励↓蠢懊§縺溘い繧､繧ｳ繝ｳ繧貞叙蠕・
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'troubleshooting':
        return <AlertCircle className="h-4 w-4" />;
      case 'qa':
        return <BrainCircuit className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Info className="h-4 w-4" />;
      case 'ppt':
        return <FileText className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 繝倥ャ繝繝ｼ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">繝翫Ξ繝・ず繝・・繧ｿ邂｡逅・/h2>
          <p className="text-gray-600">繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ繝・・繧ｿ繧堤ｮ｡逅・＠縺ｾ縺・/p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchKnowledgeData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            譖ｴ譁ｰ
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                譁ｰ隕剰ｿｽ蜉
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>繝翫Ξ繝・ず繝・・繧ｿ繧定ｿｽ蜉</DialogTitle>
                <DialogDescription>
                  譁ｰ縺励＞繝翫Ξ繝・ず繝・・繧ｿ繧偵い繝・・繝ｭ繝ｼ繝峨＠縺ｾ縺・
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">繝輔ぃ繧､繝ｫ</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".txt,.json,.md,.pdf,.doc,.docx,.ppt,.pptx"
                  />
                </div>
                <div>
                  <Label htmlFor="title">繧ｿ繧､繝医Ν</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="繝輔ぃ繧､繝ｫ縺ｮ繧ｿ繧､繝医Ν"
                  />
                </div>
                <div>
                  <Label htmlFor="category">繧ｫ繝・ざ繝ｪ</Label>
                  <Input
                    id="category"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="繧ｫ繝・ざ繝ｪ"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">繧ｿ繧ｰ・医き繝ｳ繝槫玄蛻・ｊ・・/Label>
                  <Input
                    id="tags"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="繧ｿ繧ｰ1, 繧ｿ繧ｰ2, 繧ｿ繧ｰ3"
                  />
                </div>
                <div>
                  <Label htmlFor="description">隱ｬ譏・/Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="繝輔ぃ繧､繝ｫ縺ｮ隱ｬ譏・
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                </Button>
                <Button onClick={handleUpload} disabled={!selectedFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  繧｢繝・・繝ｭ繝ｼ繝・
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 繝輔ぅ繝ｫ繧ｿ繝ｼ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            繝輔ぅ繝ｫ繧ｿ繝ｼ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-type">繧ｿ繧､繝・</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="縺吶∋縺ｦ縺ｮ繧ｿ繧､繝・ />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">縺吶∋縺ｦ縺ｮ繧ｿ繧､繝・/SelectItem>
                  {knowledgeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            繝翫Ξ繝・ず繝・・繧ｿ荳隕ｧ ({knowledgeData.length}莉ｶ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
            </div>
          ) : knowledgeData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>繧ｿ繧､繝医Ν</TableHead>
                  <TableHead>繧ｿ繧､繝・/TableHead>
                  <TableHead>繧ｫ繝・ざ繝ｪ</TableHead>
                  <TableHead>繧ｵ繧､繧ｺ</TableHead>
                  <TableHead>菴懈・譌･譎・/TableHead>
                  <TableHead>謫堺ｽ・/TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knowledgeData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <Badge variant="outline">
                          {knowledgeTypes.find(t => t.value === item.type)?.label || item.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category || '-'}
                    </TableCell>
                    <TableCell>
                      {formatFileSize(item.size)}
                    </TableCell>
                    <TableCell>
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id, item.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">繝翫Ξ繝・ず繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</p>
              <p className="text-sm text-gray-500">譁ｰ縺励＞繝・・繧ｿ繧偵い繝・・繝ｭ繝ｼ繝峨＠縺ｦ縺上□縺輔＞</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManager; 