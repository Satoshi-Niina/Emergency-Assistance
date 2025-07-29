import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast.ts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import { Upload, FileText, Trash2, Download, Eye, Edit, Plus, AlertCircle, BrainCircuit, Info } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Component for Unified Data Processing
import UnifiedDataProcessor from "../components/knowledge/unified-data-processor";

export default function DocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("processor");

  // 管理者チェックを無効化 - 常に表示
  console.log('📄 基礎データ管理ページ - 認証チェック無効化モード');

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
        
        <UnifiedDataProcessor />

      </div>
    </div>
  );
}