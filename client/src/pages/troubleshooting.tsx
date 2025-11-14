import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
// import { apiRequest, queryClient } from '../lib/queryClient'; // ファイルが存在しません
// import { storage } from '../lib/api'; // 簡略化�Eため一時的にコメントアウチE
import { saveFlowData, validateAndCleanFlowData, getFlowImageInfo, FlowData } from '../lib/flow-save-manager';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  FilePlus,
  Edit,
  Trash2,
  Eye,
  Workflow,
  List,
  BrainCircuit,
  ListChecks,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

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
      id: 'start_node',
      type: 'start',
      title: '開始',
      description: 'このフローを開始します',
      nextId: 'step_1',
    },
    {
      id: 'step_1',
      type: 'step',
      title: '最初のステップ',
      description: 'ここに最初の手順を入力します',
      images: [],
      nextId: 'end_node',
    },
    {
      id: 'end_node',
      type: 'end',
      title: '終了',
      description: 'フローが完了しました',
    },
  ],
};

type ViewState = { view: 'list' } | { view: 'edit'; flowId: string | null };

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
    queryKey: ['/api/emergency-flow/list'],
    queryFn: async () => {
      // emergency-flow APIを使用
      const { buildApiUrl } = await import('../lib/api');
      const response = await fetch(buildApiUrl('/emergency-flow/list'));
      const data = await response.json();
      console.log('🔍 フロー一覧取得結果:', data);

      if (data.success) {
        // APIレスポンス形式に対応！ElowsキーにチE�Eタが�EってぁE���E�E
        const flowsData = data.flows || data.data || [];
        console.log('🔍 フローチE�Eタ:', flowsData);

        // チE�Eタ形式を統一�E�Eitleフィールドに統一�E�E
        const formattedFlows = flowsData.map((flow: any) => ({
          id: flow.id.toString(),
          title: flow.name || flow.title,
          description: flow.description || '',
          category: flow.category || 'その他',
          keywords: flow.triggerKeywords || [],
          steps: flow.steps || [],
          createdAt: flow.createdAt || new Date().toISOString(),
          updatedAt: flow.updatedAt || new Date().toISOString()
        }));

        console.log('🔍 フォーマット済みフロー:', formattedFlows);
        return formattedFlows;
      }

      return [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (flowData: Partial<Flow>) => {
      console.log('💾 saveMutation 保存�E琁E��姁E', {
        flowDataId: flowData.id,
        stepsCount: flowData.steps?.length || 0,
        stepsWithImages: flowData.steps?.filter(step => step.images && step.images.length > 0).length || 0,
        allStepsImages: flowData.steps?.map(step => ({
          stepId: step.id,
          stepTitle: step.title,
          imagesCount: step.images?.length || 0,
          images: step.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 100) + '...'
          })) || []
        })) || []
      });

      // 統一された保存�E琁E��使用
      const result = await saveFlowData(flowData as FlowData, {
        validateImages: true,
        logDetails: true
      });

      if (result.success) {
        console.log('✁EsaveMutation 保存�E劁E', {
          flowId: result.data?.id || flowData.id,
          title: result.data?.title || flowData.title,
          stepsCount: result.data?.steps?.length || flowData.steps?.length || 0,
        });
        return result.data || flowData;
      } else {
        throw new Error(result.error || '保存に失敗しました');
      }
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({
      //   queryKey: ['/api/emergency-flow/list'],
      // });
      toast({
        title: '成功', description: 'ファイルが正常に保存されました'
      });
      setIsEditorOpen(false);
      setSelectedFlow(null);
      setFlowState({ view: 'list' });
    },
    onError: error =>
      toast({
        title: 'エラー',
        description: `ファイルの保存中にエラーが発生しました: ${error.message}`,
        variant: 'destructive',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (flowId: string) => {
      console.log('🗑�E�Eフロー削除開姁E', flowId);

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiBase}/api/emergency-flow/${flowId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📡 削除レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorMessage = `削除に失敗しました: ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.log('❁E削除エラーチE�Eタ:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.warn('⚠�E�Eエラーレスポンスの解析に失敁E', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✁E削除レスポンス:', result);
      return result;
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({
      //   queryKey: ['/api/emergency-flow/list'],
      // });

      // カスタムイベントを発火してフロー一覧を更新
      window.dispatchEvent(new CustomEvent('flowDeleted'));

      toast({
        title: '成功', description: 'ファイルが削除されました'
      });
      setFlowToDelete(null);
      setIsWarningOpen(false);
    },
    onError: error => {
      console.error('❁E削除エラー:', error);
      toast({
        title: 'エラー',
        description: `ファイルの削除中にエラーが発生しました: ${error.message}`,
        variant: 'destructive',
      });
    },
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
    // フロー生�E後�Eフロー一覧を表示
    setActiveTab('editor');
    setFlowState({ view: 'list' });

    // フロー一覧を再読み込み
    // queryClient.invalidateQueries({
    //   queryKey: ['/api/emergency-flow/list'],
    // });

    // カスタムイベントを発火してフロー一覧を更新
    window.dispatchEvent(new CustomEvent('flowGenerated', {
      detail: { generatedFlow }
    }));

    console.log('Generated Flow, showing in list:', generatedFlow);

    // 成功メッセージを表示
    toast({
      title: 'フロー生成完了',
      description: `「${generatedFlow.title || '新しいフロー'}」が生成されました。フロー一覧で確認できます。`,
    });
  };

  const handleOpenEditor = (flowId: string) => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    fetch(`${apiBase}/api/emergency-flow/detail/${flowId}`)
      .then(res => res.json())
      .then(fullFlowData => {
        setSelectedFlow(fullFlowData);
        setIsEditorOpen(true);
      })
      .catch(err =>
        toast({
          title: 'エラー',
          description: `ファイルチE�Eタの取得に失敗しました: ${err.message}`,
          variant: 'destructive',
        })
      );
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
    if (flowToDelete) deleteMutation.mutate(flowToDelete);
  };

  const handleSaveFlow = (flowData: any) => {
    console.log('💾 handleSaveFlow 呼び出ぁE', {
      flowId: flowData.id,
      title: flowData.title,
      stepsCount: flowData.steps?.length || 0,
      stepsWithImages: flowData.steps?.filter(step => step.images && step.images.length > 0).length || 0,
      allStepsImages: flowData.steps?.map(step => ({
        stepId: step.id,
        stepTitle: step.title,
        imagesCount: step.images?.length || 0,
        images: step.images?.map(img => ({
          fileName: img.fileName,
          url: img.url?.substring(0, 100) + '...'
        })) || []
      })) || []
    });
    saveMutation.mutate(flowData);
  };

  const handleCancelFlow = () => {
    setFlowState({ view: 'list' });
  };

  const handleClosePreview = () => {
    setPreviewFlowId(null);
  };

  // プレビューが開ぁE��ぁE��場吁E
  if (previewFlowId) {
    return (
      <div className='container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen'>
        <FlowPreview flowId={previewFlowId} onClose={handleClosePreview} />
      </div>
    );
  }

  return (
    <div className='container mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen max-w-7xl'>
      <div className='flex justify-between items-start mb-6'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3'>
            <Workflow className='w-8 h-8 text-blue-600' />
            応急処置チE�Eタ管琁E
          </h1>
          <p className='text-gray-500 mt-1'>
            フローの新規作�E、およ�E既存フローの編雁E��行います、E
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-2 bg-gray-200 p-1 rounded-lg'>
          <TabsTrigger
            value='generator'
            className='flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md'
          >
            <BrainCircuit className='h-5 w-5' />
            新規フロー生�E
          </TabsTrigger>
          <TabsTrigger
            value='editor'
            className='flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md'
          >
            <ListChecks className='h-5 w-5' />
            フローの管琁E�E編雁E
          </TabsTrigger>
        </TabsList>

        <TabsContent value='generator' className='mt-4'>
          <div className='bg-white p-6 rounded-lg shadow-md'>
            <EmergencyFlowGenerator onFlowGenerated={handleFlowGenerated} />
          </div>
        </TabsContent>

        <TabsContent value='editor' className='mt-4'>
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
        <DialogContent className='max-w-full w-full h-full flex flex-col p-0'>
          {selectedFlow && (
            <EmergencyFlowEditor
              key={selectedFlow.id}
              flowData={selectedFlow}
              onSave={data => saveMutation.mutate(data)}
              onClose={() => setIsEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className='max-w-4xl w-full'>
          <DialogHeader>
            <DialogTitle>{selectedFlow?.title}</DialogTitle>
            <DialogDescription>{selectedFlow?.description}</DialogDescription>
          </DialogHeader>
          <div className='max-h-[80vh] overflow-y-auto p-4'>
            {selectedFlow && <EmergencyGuideDisplay flowId={selectedFlow.id} />}
          </div>
        </DialogContent>
      </Dialog>

      <WarningDialog
        isOpen={isWarningOpen}
        onOpenChange={setIsWarningOpen}
        onConfirm={confirmDelete}
        title='フローの削除'
        description='本当にこのフローを削除しますか？この操作は元に戻せません。'
      />
    </div>
  );
}
