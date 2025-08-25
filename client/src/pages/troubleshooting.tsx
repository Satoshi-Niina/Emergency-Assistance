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
  title: '譁ｰ縺励＞繝輔Ο繝ｼ',
  description: '',
  category: 'general',
  keywords: [],
  steps: [
    {
      id: 'start_node', type: 'start', title: '髢句ｧ・, description: '縺薙・繝輔Ο繝ｼ繧帝幕蟋九＠縺ｾ縺・, nextId: 'step_1'
    },
    {
      id: 'step_1', type: 'step', title: '譛蛻昴・繧ｹ繝・ャ繝・, description: '縺薙％縺ｫ譛蛻昴・謖・､ｺ繧貞・蜉帙＠縺ｾ縺吶・, images: [], nextId: 'end_node'
    },
    {
      id: 'end_node', type: 'end', title: '邨ゆｺ・, description: '繝輔Ο繝ｼ縺悟ｮ御ｺ・＠縺ｾ縺励◆縲・
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
    queryKey: ['/api/troubleshooting/list'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/troubleshooting/list');
      if (!res.ok) throw new Error('繝輔ぃ繧､繝ｫ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
      return await res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (flowData: Partial<Flow>) => {
      const url = flowData.id ? `/api/troubleshooting/${flowData.id}` : '/api/troubleshooting';
      const method = flowData.id ? 'PUT' : 'POST';
      return apiRequest(method, url, flowData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/troubleshooting/list'] });
      toast({ title: '謌仙粥', description: '繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆縲・ });
      setIsEditorOpen(false);
      setSelectedFlow(null);
      setFlowState({ view: 'list' });
    },
    onError: (error) => toast({ title: '繧ｨ繝ｩ繝ｼ', description: `繝輔ぃ繧､繝ｫ縺ｮ菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${error.message}`, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (flowId: string) => apiRequest('DELETE', `/api/troubleshooting/${flowId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/troubleshooting/list'] });
      toast({ title: '謌仙粥', description: '繝輔ぃ繧､繝ｫ縺悟炎髯､縺輔ｌ縺ｾ縺励◆縲・ });
      setFlowToDelete(null);
      setIsWarningOpen(false);
    },
    onError: (error) => toast({ title: '繧ｨ繝ｩ繝ｼ', description: `繝輔ぃ繧､繝ｫ縺ｮ蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${error.message}`, variant: 'destructive' }),
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
    apiRequest('GET', `/api/troubleshooting/detail/${flowId}`).then(res => res.json()).then(fullFlowData => {
      setSelectedFlow(fullFlowData);
      setIsEditorOpen(true);
    }).catch(err => toast({ title: '繧ｨ繝ｩ繝ｼ', description: `繝輔ぃ繧､繝ｫ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${err.message}`, variant: 'destructive' }));
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

  // 繝励Ξ繝薙Η繝ｼ縺碁幕縺・※縺・ｋ蝣ｴ蜷・
  if (previewFlowId) {
    return (
      <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
        <FlowPreview flowId={previewFlowId} onClose={handleClosePreview} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen max-w-7xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Workflow className="w-8 h-8 text-blue-600" />
            蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ邂｡逅・
          </h1>
          <p className="text-gray-500 mt-1">繝輔Ο繝ｼ縺ｮ譁ｰ隕丈ｽ懈・縲√♀繧医・譌｢蟄倥ヵ繝ｭ繝ｼ縺ｮ邱ｨ髮・ｒ陦後＞縺ｾ縺吶・/p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-200 p-1 rounded-lg">
          <TabsTrigger value="generator" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md">
            <BrainCircuit className="h-5 w-5" />
            譁ｰ隕上ヵ繝ｭ繝ｼ逕滓・
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md">
            <ListChecks className="h-5 w-5" />
            繝輔Ο繝ｼ縺ｮ邂｡逅・・邱ｨ髮・
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
        title="繝輔Ο繝ｼ縺ｮ蜑企勁"
        description="譛ｬ蠖薙↓縺薙・繝輔Ο繝ｼ繧貞炎髯､縺励∪縺吶°・溘％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲・
      />
    </div>
  );
}