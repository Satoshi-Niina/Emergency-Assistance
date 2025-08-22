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
import { Upload, FileText, Trash2, Download, Eye, Edit, Plus, AlertCircle, BrainCircuit, Info, History, Wrench, AlertTriangle } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Component for Unified Data Processing
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";
import FileIngestPanel from "../components/FileIngestPanel";
import RagSettingsPanel from "../components/RagSettingsPanel";
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

  // 管琁E��E��ェチE��を無効匁E- 常に表示
  console.log('📄 基礎データ管琁E�Eージ - 認証チェチE��無効化モーチE);

  // チE�Eタ取征E
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔄 基礎データ取得開姁E);
        
        const [baseDataResult, historyResult, processedFilesResult] = await Promise.all([
          fetchBaseData(),
          fetchHistoryList({ limit: 10 }),
          fetchProcessedFiles()
        ]);
        
        console.log('📊 基礎データ結果:', baseDataResult);
        console.log('📊 履歴チE�Eタ結果:', historyResult);
        console.log('📊 処琁E��みファイル結果:', processedFilesResult);
        
        // APIレスポンスの構造に合わせてチE�Eタを取征E
        if (baseDataResult.success && baseDataResult.data) {
          console.log('✁E基礎データ取得�E劁E', baseDataResult.data.length + '件');
          setBaseData(baseDataResult.data);
        } else if (Array.isArray(baseDataResult)) {
          console.log('✁E基礎データ取得�E功（�E列形式！E', baseDataResult.length + '件');
          setBaseData(baseDataResult);
        } else {
          console.log('⚠�E�E基礎データ形式不�E:', baseDataResult);
          setBaseData([]);
        }
        
        if (historyResult.items) {
          console.log('✁E履歴チE�Eタ取得�E劁E', historyResult.items.length + '件');
          setHistoryData(historyResult.items);
        } else {
          console.log('⚠�E�E履歴チE�EタなぁE);
          setHistoryData([]);
        }
        
        if (processedFilesResult.success && processedFilesResult.data) {
          console.log('✁E処琁E��みファイル取得�E劁E', processedFilesResult.data.length + '件');
          setProcessedFiles(processedFilesResult.data);
        } else {
          console.log('⚠�E�E処琁E��みファイルなぁE);
          setProcessedFiles([]);
        }
      } catch (error) {
        console.error('❁EチE�Eタ取得エラー:', error);
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : "チE�Eタの取得に失敗しました",
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
                基礎データ管琁E
              </h1>
              <p className="text-gray-500">
                保守用車に関する、仕様や機械敁E��の惁E��等をGPTの学習用チE�Eタに変換します、E
              </p>
            </div>
          </div>

        </div>



        {/* タブ�Eり替ぁE*/}
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
            チE�Eタ処琁E
          </button>

          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "knowledge"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Wrench className="h-4 w-4 inline mr-2" />
            AI設宁E
          </button>
        </div>

        {/* タブコンチE��チE*/}
        {activeTab === "processor" && <UnifiedDataProcessor />}
        


        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <RagSettingsPanel />
          </div>
        )}

      </div>
    </div>
  );
}
