import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast.ts";
import { Edit, Eye, Trash2, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { buildApiUrl } from "../../lib/api/config.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

interface FlowData {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string;
  updatedAt?: string;
}

interface FlowListManagerProps {
  onEdit: (flowId: string) => void;
  onPreview: (flowId: string) => void;
  onNew: () => void;
}

const FlowListManager: React.FC<FlowListManagerProps> = ({
  onEdit,
  onPreview,
  onNew
}) => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  // 螳滄圀縺ｮAPI蜻ｼ縺ｳ蜃ｺ縺・
  useEffect(() => {
    console.log('売 FlowListManager 繝槭え繝ｳ繝亥ｮ御ｺ・);
    fetchFlowList();
  }, []);

  const fetchFlowList = async () => {
    console.log('噫 fetchFlowList髢｢謨ｰ髢句ｧ・);
    try {
      setIsLoading(true);
      console.log('売 繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕嶺ｸｭ...');
      
      const apiUrl = buildApiUrl('/api/troubleshooting/list');
      console.log('迫 API URL:', apiUrl);

      // 繧ｭ繝｣繝・す繝･辟｡蜉ｹ蛹悶・縺溘ａ縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝・
      const timestamp = Date.now();
      const cacheBuster = `?t=${timestamp}`;
      
      const fullUrl = `${apiUrl}${cacheBuster}`;
      console.log('迫 螳悟・縺ｪURL:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      console.log('藤 繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API繧ｨ繝ｩ繝ｼ: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('投 蜿門ｾ励＠縺溘ョ繝ｼ繧ｿ:', data);

      // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧貞叙蠕・
      let flows = [];
      if (data.success && data.data) {
        console.log('笨・data繝励Ο繝代ユ繧｣縺九ｉ繝・・繧ｿ繧貞叙蠕・);
        flows = data.data;
      } else if (data.success && data.flows) {
        console.log('笨・flows繝励Ο繝代ユ繧｣縺九ｉ繝・・繧ｿ繧貞叙蠕・);
        flows = data.flows;
      } else if (Array.isArray(data)) {
        console.log('笨・驟榊・縺ｨ縺励※逶ｴ謗･繝・・繧ｿ繧貞叙蠕・);
        flows = data;
      } else {
        console.error('笶・莠域悄縺励↑縺・ヵ繝ｭ繝ｼ繝・・繧ｿ蠖｢蠑・', data);
        throw new Error("繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蠖｢蠑上′荳肴ｭ｣縺ｧ縺・);
      }

      console.log('搭 蜃ｦ逅・燕縺ｮflows驟榊・:', flows);
      console.log('搭 flows驟榊・縺ｮ隧ｳ邏ｰ:', {
        length: flows.length,
        isArray: Array.isArray(flows),
        firstItem: flows[0]
      });

      // createdAt繝励Ο繝代ユ繧｣縺悟ｭ伜惠縺励↑縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝亥､繧定ｨｭ螳・
      flows = flows.map(flow => ({
        ...flow,
        createdAt: flow.createdAt || flow.updatedAt || flow.savedAt || new Date().toISOString()
      }));

      console.log('笨・繝輔Ο繝ｼ荳隕ｧ蜿門ｾ怜ｮ御ｺ・', flows.length + '莉ｶ');
      setFlowList(flows);
      
    } catch (error) {
      console.error('笶・fetchFlowList髢｢謨ｰ縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕・', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
      setFlowList([]);
    } finally {
      setIsLoading(false);
      console.log('潤 fetchFlowList髢｢謨ｰ邨ゆｺ・);
    }
  };

  const handleRefresh = () => {
    console.log('売 謇句虚譖ｴ譁ｰ髢句ｧ・);
    fetchFlowList();
  };

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!flowToDelete) return;
    console.log('卵・・繝輔Ο繝ｼ蜑企勁:', flowToDelete);
    setShowDeleteConfirm(false);
    setFlowToDelete(null);
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return '譛ｪ險ｭ螳・;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '辟｡蜉ｹ縺ｪ譌･莉・;
      return date.toLocaleString('ja-JP');
    } catch (error) {
      return '繧ｨ繝ｩ繝ｼ';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">繝輔ぃ繧､繝ｫ荳隕ｧ</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  譖ｴ譁ｰ荳ｭ...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  譖ｴ譁ｰ
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">繧ｿ繧､繝医Ν</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">菴懈・譌･譎・/th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">謫堺ｽ・/th>
                  </tr>
                </thead>
                <tbody>
                  {flowList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500">
                        繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ
                      </td>
                    </tr>
                  ) : (
                    flowList.map((flow) => (
                      <tr key={flow.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">
                          <div className="break-words leading-tight text-sm">{flow.title}</div>
                        </td>
                        <td className="border border-gray-300 p-2 text-xs text-gray-500">
                          {formatDate(flow.createdAt)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onPreview(flow.id)}
                              title="繝励Ξ繝薙Η繝ｼ"
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(flow.id)}
                              title="邱ｨ髮・
                              className="h-7 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(flow.id)}
                              title="蜑企勁"
                              className="h-7 px-2 text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>繝輔Ο繝ｼ縺ｮ蜑企勁</AlertDialogTitle>
            <AlertDialogDescription>
              縺薙・繝輔Ο繝ｼ繧貞炎髯､縺励※繧ゅｈ繧阪＠縺・〒縺吶°・溘％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲・
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              蜑企勁
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlowListManager;
