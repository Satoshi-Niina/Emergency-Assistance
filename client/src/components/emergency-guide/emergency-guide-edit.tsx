import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast.ts";
import { FileText, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import EmergencyFlowEditor from './emergency-flow-editor';
import EmergencyGuideDisplay from './emergency-guide-display';

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    message: string;
    type: 'start' | 'step' | 'decision' | 'condition' | 'end';
    imageUrl?: string;
    options?: Array<{
      text: string;
      nextStepId: string;
      isTerminal: boolean;
      conditionType: 'yes' | 'no' | 'other';
      condition?: string;
    }>;
    conditions?: Array<{
      label: string;
      nextId: string;
    }>;
  }>;
  updatedAt?: string;
  filePath: string;
}

// 譌･莉倥ヵ繧ｩ繝ｼ繝槭ャ繝磯未謨ｰ
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '譌･莉倅ｸ肴・';
    }
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '譌･莉倅ｸ肴・';
  }
}

// 蟾ｮ蛻・ｒ險育ｮ励☆繧九Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
function getObjectDiff(original: any, fixed: any, path = ''): string[] {
  const diffs: string[] = [];
  for (const key of new Set([...Object.keys(original || {}), ...Object.keys(fixed || {})])) {
    const origVal = original ? original[key] : undefined;
    const fixVal = fixed ? fixed[key] : undefined;
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof origVal === 'object' && typeof fixVal === 'object' && origVal && fixVal && !Array.isArray(origVal) && !Array.isArray(fixVal)) {
      diffs.push(...getObjectDiff(origVal, fixVal, currentPath));
    } else if (Array.isArray(origVal) && Array.isArray(fixVal)) {
      if (origVal.length !== fixVal.length) {
        diffs.push(`${currentPath}: 驟榊・縺ｮ髟ｷ縺輔′ ${origVal.length} 竊・${fixVal.length} 縺ｫ菫ｮ豁｣`);
      }
      // 驟榊・縺ｮ蜷・ｦ∫ｴ繧よｯ碑ｼ・ｼ域怙螟ｧ5莉ｶ縺ｾ縺ｧ・・
      for (let i = 0; i < Math.min(origVal.length, fixVal.length, 5); i++) {
        diffs.push(...getObjectDiff(origVal[i], fixVal[i], `${currentPath}[${i}]`));
      }
    } else if (origVal !== fixVal) {
      diffs.push(`${currentPath}: 縲・{origVal ?? '譛ｪ險ｭ螳・}縲坂・縲・{fixVal ?? '譛ｪ險ｭ螳・}縲港);
    }
  }
  return diffs;
}

interface FlowListProps {
  flows: any[];
  onSelectFlow: (flow: any) => void;
  onDeleteFlow: (flowId: string, filePath: string) => void;
  onPreviewFlow: (flow: any) => void;
  isLoading: boolean;
}

const FlowList: React.FC<FlowListProps> = ({ flows, onSelectFlow, onDeleteFlow, onPreviewFlow, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">繝輔Ο繝ｼ荳隕ｧ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">繝輔Ο繝ｼ縺後≠繧翫∪縺帙ｓ</h3>
          <p className="text-gray-600 mb-4">
            縺ｾ縺繝輔Ο繝ｼ縺御ｽ懈・縺輔ｌ縺ｦ縺・∪縺帙ｓ縲よ眠隕上ヵ繝ｭ繝ｼ逕滓・繧ｿ繝悶〒繝輔Ο繝ｼ繧剃ｽ懈・縺励※縺上□縺輔＞縲・
          </p>
          <div className="flex justify-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => window.dispatchEvent(new CustomEvent('switchToGenerator'))}
            >
              譁ｰ隕上ヵ繝ｭ繝ｼ逕滓・縺ｸ
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              蜀崎ｪｭ縺ｿ霎ｼ縺ｿ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">繧ｿ繧､繝医Ν</th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">隱ｬ譏・/th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">繧ｹ繝・ャ繝玲焚</th>
              <th className="border border-gray-300 p-3 text-left text-sm font-medium">譖ｴ譁ｰ譌･譎・/th>
              <th className="border border-gray-300 p-3 text-center text-sm font-medium">謫堺ｽ・/th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow) => (
              <tr key={flow.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-3">
                  <div className="break-words leading-tight text-sm font-semibold cursor-pointer hover:text-blue-600" 
                       onClick={() => onSelectFlow(flow)}>
                    {flow.title}
                  </div>
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="break-words leading-tight text-sm text-gray-600">
                    {flow.description || '隱ｬ譏弱↑縺・}
                  </div>
                </td>
                <td className="border border-gray-300 p-3 text-center">
                  <span className="text-sm">{flow.steps?.length || 0}</span>
                </td>
                <td className="border border-gray-300 p-3">
                  <span className="text-xs text-gray-500">{formatDate(flow.updatedAt)}</span>
                </td>
                <td className="border border-gray-300 p-3">
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectFlow(flow)}
                      title="邱ｨ髮・
                      className="h-7 px-2 text-xs"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewFlow(flow)}
                      title="繝励Ξ繝薙Η繝ｼ"
                      className="h-7 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteFlow(flow.id, flow.filePath)}
                      title="蜑企勁"
                      className="h-7 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmergencyGuideEdit: React.FC = () => {
  const { toast } = useToast();
  const [flowList, setFlowList] = useState<FlowData[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editorTab, setEditorTab] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("list"); // 'list' or 'editor'
  const [previewFlow, setPreviewFlow] = useState<FlowData | null>(null);

  const fetchFlowList = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      console.log('売 繝輔Ο繝ｼ荳隕ｧ蜿門ｾ鈴幕蟋・);
      
      // 繧ｭ繝｣繝・す繝･辟｡蜉ｹ蛹悶・縺溘ａ縺ｫ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励ｒ霑ｽ蜉
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const cacheBuster = `?ts=${timestamp}&r=${randomId}`;
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      console.log('藤 繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('笶・API 繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(`HTTP ${response.status}: 繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆ - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('投 蜿門ｾ励＠縺溘ョ繝ｼ繧ｿ:', data);
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧偵・繝・ヴ繝ｳ繧ｰ
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log('売 蜃ｦ逅・ｯｾ雎｡繝輔Ο繝ｼ謨ｰ:', flows.length);
      
      const mappedFlows = flows.map((flow: any) => ({
        id: flow.id || flow.fileName?.replace('.json', '') || '',
        title: flow.title || '繧ｿ繧､繝医Ν縺ｪ縺・,
        description: flow.description || '',
        triggerKeywords: flow.triggerKeywords || flow.trigger || [],
        steps: flow.steps || [],
        updatedAt: flow.createdAt || flow.updatedAt || flow.savedAt || new Date().toISOString(),
        filePath: flow.filePath || `knowledge-base/troubleshooting/${flow.fileName || flow.id + '.json'}`,
        fileName: flow.fileName || flow.id + '.json'
      }));
      
      console.log('笨・繝槭ャ繝斐Φ繧ｰ螳御ｺ・', mappedFlows.length + '莉ｶ');
      setFlowList(mappedFlows);
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: error instanceof Error ? error.message : "繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
      setFlowList([]); // 繧ｨ繝ｩ繝ｼ譎ゅ・遨ｺ驟榊・繧定ｨｭ螳・
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFlowList();

    const handleForceRefresh = (event: Event) => {
      console.log('売 蠑ｷ蛻ｶ譖ｴ譁ｰ繧､繝吶Φ繝医ｒ蜿嶺ｿ｡:', (event as CustomEvent).detail);
      fetchFlowList(true);
    };
    
    const refreshList = () => fetchFlowList(true);

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);
    window.addEventListener('fileSystemUpdated', refreshList);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
      window.removeEventListener('fileSystemUpdated', refreshList);
    };
  }, [fetchFlowList]);

  const handleFlowSelect = async (flow: FlowData) => {
    console.log('識 繝輔Ο繝ｼ驕ｸ謚樣幕蟋・', {
      flowId: flow.id,
      flowTitle: flow.title,
      flowKeys: Object.keys(flow),
      hasSteps: !!flow.steps,
      stepsLength: flow.steps?.length || 0
    });
    
    try {
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);
      
      console.log('藤 繝輔Ο繝ｼ隧ｳ邏ｰ繝・・繧ｿ繧貞叙蠕嶺ｸｭ:', flow.id);
      console.log('搭 驕ｸ謚槭＆繧後◆繝輔Ο繝ｼ:', flow);
      
      // 繝輔Ο繝ｼ縺ｮ隧ｳ邏ｰ繝・・繧ｿ繧貞叙蠕・
      const timestamp = Date.now();
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flow.id}?_t=${timestamp}`;
      console.log('倹 API蜻ｼ縺ｳ蜃ｺ縺・', apiUrl);
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('藤 API繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('笶・API 繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(`繝輔Ο繝ｼ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status} - ${errorText}`);
      }
      
      const flowDetail = await response.json();
      console.log('投 逕蘗PI繝ｬ繧ｹ繝昴Φ繧ｹ:', flowDetail);
      console.log('笨・繝輔Ο繝ｼ隧ｳ邏ｰ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・', flowDetail);
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩繧定ｩｳ縺励￥遒ｺ隱・
      console.log('剥 API繝ｬ繧ｹ繝昴Φ繧ｹ讒矩:', {
        hasSuccess: 'success' in flowDetail,
        hasData: 'data' in flowDetail,
        hasSteps: 'steps' in flowDetail,
        stepsType: typeof flowDetail.steps,
        stepsIsArray: Array.isArray(flowDetail.steps),
        stepsLength: flowDetail.steps?.length || 0,
        allKeys: Object.keys(flowDetail)
      });
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蠢懊§縺ｦ繝・・繧ｿ繧貞叙蠕・
      const actualFlowData = flowDetail.success && flowDetail.data ? flowDetail.data : flowDetail;
      console.log('剥 螳滄圀縺ｮ繝輔Ο繝ｼ繝・・繧ｿ:', actualFlowData);
      
      // 隧ｳ邏ｰ繝・・繧ｿ縺ｨ荳隕ｧ繝・・繧ｿ繧偵・繝ｼ繧ｸ
      const completeFlowData = {
        ...flow,
        ...actualFlowData,
        steps: actualFlowData.steps || flow.steps || []
      };
      
      console.log('肌 繝槭・繧ｸ蠕後・繝・・繧ｿ:', completeFlowData);
      console.log('笨・繝輔Ο繝ｼ驕ｸ謚槫ｮ御ｺ・', { 
        flowId: completeFlowData.id, 
        stepsLength: completeFlowData.steps?.length || 0,
        title: completeFlowData.title,
        hasSteps: !!completeFlowData.steps,
        stepsType: typeof completeFlowData.steps,
        stepsIsArray: Array.isArray(completeFlowData.steps),
        stepsContent: completeFlowData.steps
      });
      
      setSelectedFlow(completeFlowData);
      setEditorTab('metadata');
      setPreviewFlow(null);
      
      console.log('売 迥ｶ諷区峩譁ｰ螳御ｺ・', {
        selectedFlow: completeFlowData,
        editorTab: 'metadata',
        previewFlow: null
      });
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: `繝輔Ο繝ｼ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
      // 繧ｨ繝ｩ繝ｼ譎ゅ・荳隕ｧ繝・・繧ｿ繧剃ｽｿ逕ｨ
      console.log('売 繧ｨ繝ｩ繝ｼ譎ゅ・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・);
      setSelectedFlow(flow);
      setEditorTab('metadata');
      setPreviewFlow(null);
    }
  };

  const handlePreviewFlow = async (flow: FlowData) => {
    try {
      console.log('売 繝励Ξ繝薙Η繝ｼ逕ｨ繝輔Ο繝ｼ隧ｳ邏ｰ繝・・繧ｿ繧貞叙蠕嶺ｸｭ:', flow.id);
      
      // 繝輔Ο繝ｼ縺ｮ隧ｳ邏ｰ繝・・繧ｿ繧貞叙蠕・
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flow.id}?_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Fresh': 'true',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`繝輔Ο繝ｼ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status}`);
      }
      
      const flowDetail = await response.json();
      console.log('笨・繝励Ξ繝薙Η繝ｼ逕ｨ繝輔Ο繝ｼ隧ｳ邏ｰ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・', flowDetail);
      
      // 隧ｳ邏ｰ繝・・繧ｿ縺ｨ荳隕ｧ繝・・繧ｿ繧偵・繝ｼ繧ｸ
      const completeFlowData = {
        ...flow,
        ...flowDetail,
        steps: flowDetail.steps || flow.steps || []
      };
      
      setPreviewFlow(completeFlowData);
      setSelectedFlow(null);
    } catch (error) {
      console.error('笶・繝励Ξ繝薙Η繝ｼ逕ｨ繝輔Ο繝ｼ隧ｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: `繝輔Ο繝ｼ隧ｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
      // 繧ｨ繝ｩ繝ｼ譎ゅ・荳隕ｧ繝・・繧ｿ繧剃ｽｿ逕ｨ
      setPreviewFlow(flow);
      setSelectedFlow(null);
    }
  };

  const handleDisplayFlow = (flow: FlowData) => {
    // 繧ｫ繧ｹ繧ｿ繝繧､繝吶Φ繝医〒繧ｬ繧､繝芽｡ｨ遉ｺ繧帝夂衍
    window.dispatchEvent(new CustomEvent('display-emergency-guide', {
      detail: { guideId: flow.id }
    }));
  };

  const handleSaveFlow = async (updatedFlowData: any) => {
    try {
      console.log("沈 菫晏ｭ倥Μ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡:", {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length,
        filePath: updatedFlowData.filePath
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${updatedFlowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFlowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      console.log("笨・菫晏ｭ俶・蜉・", result);
      toast({
        title: "謌仙粥",
        description: "繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆縲・,
      });
      
      // 菫晏ｭ伜ｾ後√Μ繧ｹ繝医ｒ蠑ｷ蛻ｶ逧・↓蜀崎ｪｭ縺ｿ霎ｼ縺ｿ縺励※譛譁ｰ縺ｮ迥ｶ諷九ｒ蜿肴丐
      await fetchFlowList(true);
      
      // 譖ｴ譁ｰ縺輔ｌ縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ繧堤音螳壹＠縺ｦ蜀埼∈謚・
      setSelectedFlow(prev => updatedFlowData);

    } catch (error) {
      console.error("笶・繝輔Ο繝ｼ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆:", error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: `繝輔Ο繝ｼ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteFlow = async (flowId: string, filePath: string) => {
    try {
      console.log("卵・・繝輔Ο繝ｼ蜑企勁繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡:", {
        id: flowId,
        filePath: filePath
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flowId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();
      console.log("笨・蜑企勁謌仙粥:", result);
      toast({
        title: "謌仙粥",
        description: "繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆縲・,
      });
      
      // 蜑企勁蠕後√Μ繧ｹ繝医ｒ蠑ｷ蛻ｶ逧・↓蜀崎ｪｭ縺ｿ霎ｼ縺ｿ縺励※譛譁ｰ縺ｮ迥ｶ諷九ｒ蜿肴丐
      await fetchFlowList(true);
      
      // 蜑企勁縺輔ｌ縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ繧堤音螳壹＠縺ｦ蜀埼∈謚・
      setSelectedFlow(null);

    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: `繝輔Ο繝ｼ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  const handleBackToList = () => {
    setSelectedFlow(null);
    setPreviewFlow(null);
  };

  const handleForceRefresh = async () => {
    try {
      console.log('売 蠑ｷ蛻ｶ繝ｪ繝輔Ξ繝・す繝･髢句ｧ・);
      
      // 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('ｧｹ 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢螳御ｺ・);
      }
      
      // 繝輔Ο繝ｼ荳隕ｧ繧貞・蜿門ｾ・
      await fetchFlowList(true);
      
      toast({
        title: "謌仙粥",
        description: "繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢縺励※繝輔Ο繝ｼ荳隕ｧ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ縺励∪縺励◆",
      });
    } catch (error) {
      console.error('笶・蠑ｷ蛻ｶ繝ｪ繝輔Ξ繝・す繝･繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: "繧ｨ繝ｩ繝ｼ",
        description: "繝ｪ繝輔Ξ繝・す繝･縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {selectedFlow ? (
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{selectedFlow.title}</CardTitle>
              <Button variant="ghost" onClick={handleBackToList}>
                <X className="h-4 w-4 mr-2" />
                荳隕ｧ縺ｫ謌ｻ繧・
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <Tabs value={editorTab || 'metadata'} onValueChange={(value) => {
              console.log('売 繧ｿ繝門・繧頑崛縺・', { from: editorTab, to: value });
              setEditorTab(value);
            }} className="w-full h-full flex flex-col">
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="metadata">繝｡繧ｿ繝・・繧ｿ</TabsTrigger>
                <TabsTrigger value="slides">繧ｹ繝ｩ繧､繝牙・螳ｹ</TabsTrigger>
              </TabsList>
              <TabsContent value="metadata" className="flex-1 flex flex-col min-h-0">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab="metadata"
                  selectedFilePath={selectedFlow?.filePath}
                />
              </TabsContent>
              <TabsContent value="slides" className="flex-1 flex flex-col min-h-0">
                <EmergencyFlowEditor
                  flowData={selectedFlow}
                  onSave={handleSaveFlow}
                  onTabChange={setEditorTab}
                  currentTab="slides"
                  selectedFilePath={selectedFlow?.filePath}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : previewFlow ? (
        <EmergencyGuideDisplay
          guideId={previewFlow.id}
          onExit={handleBackToList}
          isPreview={true}
          onSendToChat={() => {}}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">繝輔Ο繝ｼ荳隕ｧ</h2>
            <Button
              variant="outline"
              onClick={handleForceRefresh}
              className="text-sm"
            >
              売 蠑ｷ蛻ｶ繝ｪ繝輔Ξ繝・す繝･
            </Button>
          </div>
          <FlowList
            flows={flowList}
            onSelectFlow={handleFlowSelect}
            onDeleteFlow={handleDeleteFlow}
            onPreviewFlow={handlePreviewFlow}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};

export default EmergencyGuideEdit;
