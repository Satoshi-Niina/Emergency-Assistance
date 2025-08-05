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

// ナレッジデータの型定義
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

  // ナレッジデータ一覧を取得
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
        console.log('✅ ナレッジデータ取得成功:', result.data.length + '件');
      } else {
        console.error('❌ ナレッジデータ取得失敗:', result.message);
        setKnowledgeData([]);
      }
    } catch (error) {
      console.error('❌ ナレッジデータ取得エラー:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ナレッジデータの取得に失敗しました",
        variant: "destructive"
      });
      setKnowledgeData([]);
    } finally {
      setLoading(false);
    }
  };

  // ナレッジデータの種類一覧を取得
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
        console.error('❌ ナレッジデータ種類取得失敗:', result.message);
      }
    } catch (error) {
      console.error('❌ ナレッジデータ種類取得エラー:', error);
    }
  };

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
    fetchKnowledgeData();
    fetchKnowledgeTypes();
  }, [filterType]);

  // ファイル選択ハンドラー
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

  // アップロードハンドラー
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "エラー",
        description: "ファイルが選択されていません",
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
        throw new Error(errorText || "アップロードに失敗しました");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "アップロード成功",
          description: `${selectedFile.name} がナレッジベースに追加されました`,
        });

        // フォームをリセット
        setSelectedFile(null);
        setUploadForm({
          title: '',
          category: '',
          tags: '',
          description: ''
        });
        setUploadDialogOpen(false);

        // データを再取得
        fetchKnowledgeData();
      } else {
        throw new Error(result.message || "アップロードに失敗しました");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "アップロードエラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // 削除ハンドラー
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "削除に失敗しました");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "削除成功",
          description: `${title} を削除しました`,
        });

        // データを再取得
        fetchKnowledgeData();
      } else {
        throw new Error(result.message || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "削除エラー",
        description: error instanceof Error ? error.message : "未知のエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '不明';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy/MM/dd HH:mm');
  };

  // タイプに応じたアイコンを取得
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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ナレッジデータ管理</h2>
          <p className="text-gray-600">ナレッジベースのデータを管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchKnowledgeData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新規追加
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>ナレッジデータを追加</DialogTitle>
                <DialogDescription>
                  新しいナレッジデータをアップロードします
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">ファイル</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".txt,.json,.md,.pdf,.doc,.docx,.ppt,.pptx"
                  />
                </div>
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="ファイルのタイトル"
                  />
                </div>
                <div>
                  <Label htmlFor="category">カテゴリ</Label>
                  <Input
                    id="category"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="カテゴリ"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">タグ（カンマ区切り）</Label>
                  <Input
                    id="tags"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="タグ1, タグ2, タグ3"
                  />
                </div>
                <div>
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="ファイルの説明"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleUpload} disabled={!selectedFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  アップロード
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-type">タイプ:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="すべてのタイプ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべてのタイプ</SelectItem>
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

      {/* ナレッジデータ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ナレッジデータ一覧 ({knowledgeData.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">データを読み込み中...</p>
            </div>
          ) : knowledgeData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>サイズ</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead>操作</TableHead>
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
              <p className="text-gray-600">ナレッジデータがありません</p>
              <p className="text-sm text-gray-500">新しいデータをアップロードしてください</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManager; 