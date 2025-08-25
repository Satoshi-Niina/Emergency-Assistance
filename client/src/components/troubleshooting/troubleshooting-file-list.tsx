import React, { useState, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useToast } from "../../hooks/use-toast.ts";
import { Plus, RefreshCw, Edit, Trash2, FileEdit } from 'lucide-react';
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

interface TroubleshootingFileListProps {
  onEdit: (flowId: string) => void;
  onNew: () => void;
}

const TroubleshootingFileList: React.FC<TroubleshootingFileListProps> = ({
  onEdit,
  onNew
}) => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<Array<{
    id: string;
    title: string;
    description: string;
    fileName: string;
    createdAt: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  const fetchFlowList = async () => {
    try {
      setIsLoading(true);
      console.log('売 繝輔ぃ繧､繝ｫ荳隕ｧ繧貞叙蠕嶺ｸｭ...');
      
      // 繧ｭ繝｣繝・す繝･辟｡蜉ｹ蛹悶・縺溘ａ縺ｫ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ霑ｽ蜉
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error('繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
      const data = await response.json();
      
      console.log('笨・繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ怜ｮ御ｺ・', data.length + '莉ｶ');
      setFlowList(data);
    } catch (error) {
      console.error('繝輔ぃ繧､繝ｫ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowList();
  }, []);

  const handleDeleteClick = async (id: string) => {
    if (!confirm('縺薙・繝輔ぃ繧､繝ｫ繧貞炎髯､縺励※繧ゅｈ繧阪＠縺・〒縺吶°・・)) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('繝輔ぃ繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      
      // 荳隕ｧ繧呈峩譁ｰ
      fetchFlowList();
    } catch (error) {
      console.error('繝輔ぃ繧､繝ｫ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝輔ぃ繧､繝ｫ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ荳隕ｧ</CardTitle>
            <CardDescription>
              菫晏ｭ倥＆繧後※縺・ｋ繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ繧堤ｮ｡逅・＠縺ｾ縺・
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchFlowList}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              譖ｴ譁ｰ
            </Button>
            <Button
              variant="default"
              onClick={onNew}
            >
              <Plus className="h-4 w-4 mr-1" />
              譁ｰ隕丈ｽ懈・
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>繧ｿ繧､繝医Ν</TableHead>
                    <TableHead>隱ｬ譏・/TableHead>
                    <TableHead className="text-right">謫堺ｽ・/TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowList.map((flow) => (
                    <TableRow key={flow.id}>
                      <TableCell className="font-medium max-w-md">
                        <div className="break-words leading-tight">{flow.title}</div>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="break-words leading-tight text-sm text-gray-600">{flow.description}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(flow.id)}
                          >
                            <FileEdit className="h-4 w-4 mr-1" />
                            邱ｨ髮・
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(flow.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            蜑企勁
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 蜑企勁遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>繝輔Ο繝ｼ繧貞炎髯､縺励∪縺吶°・・/AlertDialogTitle>
            <AlertDialogDescription>
              縺薙・繝輔Ο繝ｼ繧貞炎髯､縺吶ｋ縺ｨ縲√☆縺ｹ縺ｦ縺ｮ髢｢騾｣繝・・繧ｿ縺悟､ｱ繧上ｌ縺ｾ縺吶ゅ％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺吶％縺ｨ縺後〒縺阪∪縺帙ｓ縲・
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteClick(flowToDelete || '')} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              蜑企勁縺吶ｋ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TroubleshootingFileList;
