import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast";






import { BrainCircuit, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Component for Unified Data Processing
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";
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
                基礎データ管理
              </h1>
              <p className="text-gray-500">
                保守用車に関する、仕様や機械故障の情報等をGPTの学習用データに変換します。
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
            onClick={() => setActiveTab("knowledge")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "knowledge"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Wrench className="h-4 w-4 inline mr-2" />
            AI設定
          </button>
        </div>

        {/* タブコンテンツ */}
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