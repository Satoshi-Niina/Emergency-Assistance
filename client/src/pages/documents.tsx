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

  // 邂｡逅・・メ繧ｧ繝・け繧堤┌蜉ｹ蛹・- 蟶ｸ縺ｫ陦ｨ遉ｺ
  console.log('塘 蝓ｺ遉弱ョ繝ｼ繧ｿ邂｡逅・・繝ｼ繧ｸ - 隱崎ｨｼ繝√ぉ繝・け辟｡蜉ｹ蛹悶Δ繝ｼ繝・);

  // 繝・・繧ｿ蜿門ｾ・
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('売 蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ鈴幕蟋・);
        
        const [baseDataResult, historyResult, processedFilesResult] = await Promise.all([
          fetchBaseData(),
          fetchHistoryList({ limit: 10 }),
          fetchProcessedFiles()
        ]);
        
        console.log('投 蝓ｺ遉弱ョ繝ｼ繧ｿ邨先棡:', baseDataResult);
        console.log('投 螻･豁ｴ繝・・繧ｿ邨先棡:', historyResult);
        console.log('投 蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ邨先棡:', processedFilesResult);
        
        // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧貞叙蠕・
        if (baseDataResult.success && baseDataResult.data) {
          console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ玲・蜉・', baseDataResult.data.length + '莉ｶ');
          setBaseData(baseDataResult.data);
        } else if (Array.isArray(baseDataResult)) {
          console.log('笨・蝓ｺ遉弱ョ繝ｼ繧ｿ蜿門ｾ玲・蜉滂ｼ磯・蛻怜ｽ｢蠑擾ｼ・', baseDataResult.length + '莉ｶ');
          setBaseData(baseDataResult);
        } else {
          console.log('笞・・蝓ｺ遉弱ョ繝ｼ繧ｿ蠖｢蠑丈ｸ肴・:', baseDataResult);
          setBaseData([]);
        }
        
        if (historyResult.items) {
          console.log('笨・螻･豁ｴ繝・・繧ｿ蜿門ｾ玲・蜉・', historyResult.items.length + '莉ｶ');
          setHistoryData(historyResult.items);
        } else {
          console.log('笞・・螻･豁ｴ繝・・繧ｿ縺ｪ縺・);
          setHistoryData([]);
        }
        
        if (processedFilesResult.success && processedFilesResult.data) {
          console.log('笨・蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ蜿門ｾ玲・蜉・', processedFilesResult.data.length + '莉ｶ');
          setProcessedFiles(processedFilesResult.data);
        } else {
          console.log('笞・・蜃ｦ逅・ｸ医∩繝輔ぃ繧､繝ｫ縺ｪ縺・);
          setProcessedFiles([]);
        }
      } catch (error) {
        console.error('笶・繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
        toast({
          title: "繧ｨ繝ｩ繝ｼ",
          description: error instanceof Error ? error.message : "繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
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
                蝓ｺ遉弱ョ繝ｼ繧ｿ邂｡逅・
              </h1>
              <p className="text-gray-500">
                菫晏ｮ育畑霆翫↓髢｢縺吶ｋ縲∽ｻ墓ｧ倥ｄ讖滓｢ｰ謨・囿縺ｮ諠・ｱ遲峨ｒGPT縺ｮ蟄ｦ鄙堤畑繝・・繧ｿ縺ｫ螟画鋤縺励∪縺吶・
              </p>
            </div>
          </div>

        </div>



        {/* 繧ｿ繝門・繧頑崛縺・*/}
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
            繝・・繧ｿ蜃ｦ逅・
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
            AI險ｭ螳・
          </button>
        </div>

        {/* 繧ｿ繝悶さ繝ｳ繝・Φ繝・*/}
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