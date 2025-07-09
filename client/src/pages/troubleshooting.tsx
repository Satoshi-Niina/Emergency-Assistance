import { useState, useEffect } from "react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient.ts';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FilePlus, Edit, Trash2, Eye, Workflow, List, BrainCircuit, ListChecks } from 'lucide-react';
import { useToast } from '../hooks/use-toast.ts';

// The two main components for the tabs
import EmergencyFlowEditor from '../components/emergency-guide/emergency-flow-editor';
import EmergencyFlowGenerator from '../components/emergency-guide/emergency-flow-generator';
import EmergencyGuideDisplay from '../components/emergency-guide/emergency-guide-display';
import { WarningDialog } from '../components/shared/warning-dialog';
import FlowListManager from '../components/emergency-guide/flow-list-manager';
import FlowEditorAdvanced from '../components/emergency-guide/flow-editor-advanced';
import FlowPreview from '../components/emergency-guide/flow-preview';

interface Flow {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  steps: any[];
  createdAt: string;
  updatedAt: string;
}

const newFlowTemplate: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '新しいフロー',
  description: '',
  category: 'general',
  keywords: [],
  steps: [
    {
      id: 'start_node', type: 'start', title: '開始', description: 'このフローを開始します', nextId: 'step_1'
    },
    {
      id: 'step_1', type: 'step', title: '最初のステップ', description: 'ここに最初の指示を入力します。', images: [], nextId: 'end_node'
    },
    {
      id: 'end_node', type: 'end', title: '終了', description: 'フローが完了しました。'
    },
  ],
};

type ViewState = 
  | { view: 'list' }
  | { view: 'edit'; flowId: string | null };

export default function TroubleshootingPage() {
  const [activeTab, setActiveTab] = useState('generator');
  const [flowState, setFlowState] = useState<ViewState>({ view: 'list' });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
  const [previewFlowId, setPreviewFlowId] = useState<string | null>(null);

  const { toast } = useToast();

  const { data: flows, isLoading } = useQuery<Flow[]>({
    queryKey: ['/api/emergency-flow'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/emergency-flow');
      if (!res.ok) throw new Error('フロー一覧の取得に失敗しました');
      return await res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (flowData: Partial<Flow>) => {
      const url = flowData.id ? `/api/emergency-flow/${flowData.id}` : '/api/emergency-flow';
      const method = flowData.id ? 'PUT' : 'POST';
      return apiRequest(method, url, flowData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-flow'] });
      toast({ title: '成功', description: 'フローが正常に保存されました。' });
      setIsEditorOpen(false);
      setSelectedFlow(null);
      setFlowState({ view: 'list' });
    },
    onError: (error) => toast({ title: 'エラー', description: `フローの保存中にエラーが発生しました: ${error.message}`, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (flowId: string) => apiRequest('DELETE', `/api/emergency-flow/${flowId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-flow'] });
      toast({ title: '成功', description: 'フローが削除されました。' });
      setFlowToDelete(null);
      setIsWarningOpen(false);
    },
    onError: (error) => toast({ title: 'エラー', description: `フローの削除中にエラーが発生しました: ${error.message}`, variant: 'destructive' }),
  });
  
  const handleEdit = (flowId: string) => {
    setFlowState({ view: 'edit', flowId });
  };
  
  const handleNew = () => {
    setFlowState({ view: 'edit', flowId: null });
  };

  const handlePreview = (flowId: string) => {
    setPreviewFlowId(flowId);
  };

  const handleBackToList = () => {
    setFlowState({ view: 'list' });
  };

  const handleFlowGenerated = (generatedFlow: any) => {
    setActiveTab('editor');
    handleNew(); 
    console.log("Generated Flow, ready for editing:", generatedFlow);
  };

  const handleOpenEditor = (flowId: string) => {
    apiRequest('GET', `/api/emergency-flow/${flowId}`).then(res => res.json()).then(fullFlowData => {
      setSelectedFlow(fullFlowData);
      setIsEditorOpen(true);
    }).catch(err => toast({ title: 'エラー', description: `フローデータの取得に失敗しました: ${err.message}`, variant: 'destructive' }));
  };

  const handleOpenViewer = (flow: Flow) => {
    setSelectedFlow(flow);
    setIsViewerOpen(true);
  };

  const handleDeleteClick = (flowId: string) => {
    setFlowToDelete(flowId);
    setIsWarningOpen(true);
  };
  
  const confirmDelete = () => {
      if(flowToDelete) deleteMutation.mutate(flowToDelete);
  }

  const handleSaveFlow = (flowData: any) => {
    saveMutation.mutate(flowData);
  };

  const handleCancelFlow = () => {
    setFlowState({ view: 'list' });
  };

  const handleClosePreview = () => {
    setPreviewFlowId(null);
  };

  // プレビューが開いている場合
  if (previewFlowId) {
    return (
      <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
        <FlowPreview flowId={previewFlowId} onClose={handleClosePreview} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Workflow className="w-8 h-8 text-blue-600" />
            応急処置データ管理
          </h1>
          <p className="text-gray-500 mt-1">フローの新規作成、および既存フローの編集を行います。</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-200 p-1 rounded-lg">
          <TabsTrigger value="generator" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md">
            <BrainCircuit className="h-5 w-5" />
            新規フロー生成
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md">
            <ListChecks className="h-5 w-5" />
            フローの管理・編集
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="mt-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <EmergencyFlowGenerator onFlowGenerated={handleFlowGenerated} />
            </div>
        </TabsContent>

        <TabsContent value="editor" className="mt-4">
           {flowState.view === 'list' && (
             <FlowListManager 
               onEdit={handleEdit} 
               onPreview={handlePreview}
               onNew={handleNew} 
             />
           )}
           {flowState.view === 'edit' && (
             <FlowEditorAdvanced 
               flowId={flowState.flowId || undefined}
               onSave={handleSaveFlow}
               onCancel={handleCancelFlow}
             />
           )}
        </TabsContent>
      </Tabs>
      
      {/* --- Dialogs --- */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-full w-full h-full flex flex-col p-0">
            {selectedFlow && (
                 <EmergencyFlowEditor
                    key={selectedFlow.id}
                    flowData={selectedFlow}
                    onSave={(data) => saveMutation.mutate(data)}
                    onClose={() => setIsEditorOpen(false)}
                 />
            )}
        </DialogContent>
      </Dialog>
      
       <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl w-full">
            <DialogHeader>
                <DialogTitle>{selectedFlow?.title}</DialogTitle>
                <DialogDescription>{selectedFlow?.description}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto p-4">
              {selectedFlow && <EmergencyGuideDisplay flowId={selectedFlow.id} />}
            </div>
        </DialogContent>
      </Dialog>
      
      <WarningDialog
        isOpen={isWarningOpen}
        onOpenChange={setIsWarningOpen}
        onConfirm={confirmDelete}
        title="フローの削除"
        description="本当にこのフローを削除しますか？この操作は元に戻せません。"
      />
    </div>
  );
}