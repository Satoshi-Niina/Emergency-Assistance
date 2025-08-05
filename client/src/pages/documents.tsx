import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast.ts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Upload, FileText, Trash2, Download, Eye, Edit, Plus, AlertCircle, BrainCircuit, Info, History } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Component for Unified Data Processing
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";
import { fetchBaseData, fetchHistoryList, fetchProcessedFiles } from "../lib/api/history-api";
import { BaseDataItem, SupportHistoryItem } from "../types/history";

export default function DocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("processor");
  const [baseData, setBaseData] = useState<BaseDataItem[]>([]);
  const [historyData, setHistoryData] = useState<SupportHistoryItem[]>([]);
  const [processedFiles, setProcessedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 管理者チェックを無効化 - 常に表示
  console.log('📄 基礎データ管理ページ - 認証チェック無効化モード');

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔄 基礎データ取得開始');
        
        const [baseDataResult, historyResult, processedFilesResult] = await Promise.all([
          fetchBaseData(),
          fetchHistoryList({ limit: 10 }),
          fetchProcessedFiles()
        ]);
        
        console.log('📊 基礎データ結果:', baseDataResult);
        console.log('📊 履歴データ結果:', historyResult);
        console.log('📊 処理済みファイル結果:', processedFilesResult);
        
        // APIレスポンスの構造に合わせてデータを取得
        if (baseDataResult.success && baseDataResult.data) {
          console.log('✅ 基礎データ取得成功:', baseDataResult.data.length + '件');
          setBaseData(baseDataResult.data);
        } else if (Array.isArray(baseDataResult)) {
          console.log('✅ 基礎データ取得成功（配列形式）:', baseDataResult.length + '件');
          setBaseData(baseDataResult);
        } else {
          console.log('⚠️ 基礎データ形式不明:', baseDataResult);
          setBaseData([]);
        }
        
        if (historyResult.items) {
          console.log('✅ 履歴データ取得成功:', historyResult.items.length + '件');
          setHistoryData(historyResult.items);
        } else {
          console.log('⚠️ 履歴データなし');
          setHistoryData([]);
        }
        
        if (processedFilesResult.success && processedFilesResult.data) {
          console.log('✅ 処理済みファイル取得成功:', processedFilesResult.data.length + '件');
          setProcessedFiles(processedFilesResult.data);
        } else {
          console.log('⚠️ 処理済みファイルなし');
          setProcessedFiles([]);
        }
      } catch (error) {
        console.error('❌ データ取得エラー:', error);
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : "データの取得に失敗しました",
          variant: "destructive"
        });
        setBaseData([]);
        setHistoryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-full">
              <BrainCircuit className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                ナレッジベース管理
              </h1>
              <p className="text-gray-500">
                AIの知識源となるすべてのドキュメントとデータを一元管理します。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="py-1">
              <Info className="h-5 w-5 text-yellow-400 mr-3" />
            </div>
            <div>
              <p className="font-bold">重要：データ処理について</p>
              <p className="text-sm">
                ファイル（PPTX, PDF, DOCX）をアップロードすると、システムは自動的に内容を解析し、検索とAIの応答に適した形式に変換します。この処理には数分かかることがあります。
              </p>
            </div>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("processor")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "processor"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BrainCircuit className="h-4 w-4 inline mr-2" />
            データ処理
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            履歴一覧
          </button>
        </div>

        {/* タブコンテンツ */}
        {activeTab === "processor" && <UnifiedDataProcessor />}
        
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* 処理済みデータ一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  処理済み文章データ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">データを読み込み中...</p>
                  </div>
                ) : processedFiles.length > 0 ? (
                  <div className="space-y-3">
                    {processedFiles.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600">
                            処理日時: {formatDate(item.processedAt)}
                          </p>
                          <p className="text-xs text-gray-500">
                            チャンク数: {item.chunkCount} | タイプ: {item.type}
                          </p>
                        </div>
                        <Badge variant="secondary">{item.type}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">処理済みデータがありません</h3>
                      <p className="text-gray-600 mb-4">
                        まだファイルが処理されていません。データ処理タブでファイルをアップロードしてください。
                      </p>
                      <div className="flex justify-center space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("processor")}
                        >
                          データ処理へ
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.reload()}
                        >
                          再読み込み
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}