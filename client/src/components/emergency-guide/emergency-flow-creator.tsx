import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast.ts';
import {
  Upload,
  Save,
  X,
  Edit,
  Edit3,
  File,
  FileText,
  Plus,
  Download,
  FolderOpen,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import EmergencyFlowEditor from './emergency-flow-editor';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { convertImageUrl } from '../../lib/image-utils.ts';

interface FlowFile {
  id: string;
  title: string;
  description: string;
  fileName: string;
  createdAt: string;
  trigger?: string[];
  slides?: any[];
}

interface FlowData {
  id: string;
  title: string;
  description: string;
  triggerKeywords: string[];
  steps: any[];
  updatedAt?: string;
}

interface DecisionCondition {
  id: string;
  text: string;
  nextSlideId?: string;
}

interface Slide {
  id: string;
  type: 'normal' | 'decision';
  content: string;
  conditions?: DecisionCondition[];
  imageUrl?: string;
}

interface EmergencyFlowCreatorProps {
  initialData?: any;
  onSave: (data: any) => void;
}

const EmergencyFlowCreator: React.FC<EmergencyFlowCreatorProps> = ({
  initialData,
  onSave,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // 迥ｶ諷狗ｮ｡逅・
  const [activeTab, setActiveTab] = useState<'new' | 'upload' | 'edit'>('new');
  const [flowList, setFlowList] = useState<FlowFile[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<string | null>(
    null
  );
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // 蜑企勁髢｢騾｣
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<FlowFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [slides, setSlides] = useState<Slide[]>(initialData?.slides || []);

  // 繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕励☆繧矩未謨ｰ
  const fetchFlowList = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsFetching(true);
        setIsLoadingFlowList(true);
        console.log(
          '売 蠢懈･蜃ｦ鄂ｮ繝・・繧ｿ荳隕ｧ縺ｮ蜿門ｾ励ｒ髢句ｧ九＠縺ｾ縺・(forceRefresh: ' +
            forceRefresh +
            ')'
        );

        // ｧｹ 繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢・亥商縺・ョ繝ｼ繧ｿ縺ｮ螳悟・蜑企勁・・
        if (forceRefresh && 'caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('ｧｹ 蜈ｨ繧ｭ繝｣繝・す繝･・亥商縺・ョ繝ｼ繧ｿ蜷ｫ繧・峨け繝ｪ繧｢螳御ｺ・);
          } catch (cacheError) {
            console.warn('笞・・繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢繧ｨ繝ｩ繝ｼ:', cacheError);
          }
        }

        // 繧ｭ繝｣繝・す繝･繝舌せ繧ｿ繝ｼ繝代Λ繝｡繝ｼ繧ｿ繧定ｿｽ蜉
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        
        // buildApiUrl繧剃ｽｿ逕ｨ縺励※豁｣縺励＞URL繧呈ｧ狗ｯ・
        const { buildApiUrl } = await import('../../lib/api');
        const url = `${buildApiUrl('/emergency-flow/list')}?ts=${timestamp}&_r=${randomId}${forceRefresh ? '&force=true' : ''}`;

        console.log('倹 繝輔Ο繝ｼ荳隕ｧAPI蜻ｼ縺ｳ蜃ｺ縺・', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'X-Force-Refresh': forceRefresh.toString(),
            'X-Timestamp': timestamp.toString(),
          },
        });

        console.log(
          '藤 繝輔Ο繝ｼ荳隕ｧAPI繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・',
          response.status,
          response.statusText
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('笶・繝輔Ο繝ｼ荳隕ｧAPI 繧ｨ繝ｩ繝ｼ:', errorText);
          throw new Error(
            '繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ' +
              response.status +
              ' - ' +
              errorText
          );
        }

        const data = await response.json();
        console.log('投 繝輔Ο繝ｼ荳隕ｧ逕蘗PI繝ｬ繧ｹ繝昴Φ繧ｹ:', data);

        // API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ讒矩縺ｫ蜷医ｏ縺帙※繝・・繧ｿ繧貞・逅・
        const flows =
          data.success && data.data
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        console.log(
          '蜈ｨ繝輔Ο繝ｼ繝・・繧ｿ繧定｡ｨ遉ｺ: ' + flows.length + '莉ｶ・医ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ辟｡蜉ｹ・・
        );
        console.log('繝輔Ο繝ｼ繝・・繧ｿ隧ｳ邏ｰ:', flows);
        setFlowList(flows);

        // 莉悶・繧ｳ繝ｳ繝昴・繝阪Φ繝医↓繝輔Ο繝ｼ荳隕ｧ譖ｴ譁ｰ繧帝夂衍
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('flowListUpdated', {
              detail: {
                flowList: data,
                timestamp: Date.now(),
                source: 'flow-creator',
              },
            })
          );
        }, 100);
      } catch (error) {
        console.error('笶・繝輔Ο繝ｼ荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        toast({
          title: '蜿門ｾ励お繝ｩ繝ｼ',
          description: '繝輔Ο繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingFlowList(false);
        setIsFetching(false);
      }
    },
    [toast]
  );

  // 蛻晄悄蛹匁凾縺ｫ繝輔Ο繝ｼ荳隕ｧ繧貞叙蠕暦ｼ井ｸ蠎ｦ縺縺托ｼ・
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchFlowList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 蛻晏屓縺ｮ縺ｿ螳溯｡・

  // 蠑ｷ蛻ｶ譖ｴ譁ｰ繧､繝吶Φ繝医Μ繧ｹ繝翫・
  useEffect(() => {
    const handleForceRefresh = (event: any) => {
      console.log('売 蠑ｷ蛻ｶ繝輔Ο繝ｼ荳隕ｧ譖ｴ譁ｰ繧､繝吶Φ繝亥女菫｡');
      fetchFlowList(true);
    };

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
    };
  }, [fetchFlowList]);

  // 繝輔ぃ繧､繝ｫ驕ｸ謚・
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 繝励Ο繧ｰ繝ｬ繧ｹ譖ｴ譁ｰ
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { buildApiUrl } = await import('../../lib/api');
      const response = await fetch(
        buildApiUrl('/emergency-flow/upload'),
        {
          method: 'POST',
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();

      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);

      toast({
        title: '繧｢繝・・繝ｭ繝ｼ繝牙ｮ御ｺ・,
        description: `${selectedFile.name} 縺後い繝・・繝ｭ繝ｼ繝峨＆繧後∪縺励◆`,
      });

      // 繝輔Ο繝ｼ荳隕ｧ繧呈峩譁ｰ
      await fetchFlowList(true);

      // 邱ｨ髮・ち繝悶↓蛻・ｊ譖ｿ縺・
      setActiveTab('edit');
    } catch (error) {
      console.error('繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
      toast({
        title: '繧｢繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ',
        description: '繝輔ぃ繧､繝ｫ縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 繝輔Ο繝ｼ邱ｨ髮・畑縺ｮ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ
  const loadFlowForEdit = async (flowId: string) => {
    try {
      console.log('売 繝輔Ο繝ｼ邱ｨ髮・ョ繝ｼ繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ髢句ｧ・', flowId);

      // 識 繝輔Ο繝ｼ荳隕ｧ縺九ｉ繝輔ぃ繧､繝ｫ諠・ｱ繧貞叙蠕・
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ' + flowId);
      }

      console.log('搭 蟇ｾ雎｡繝輔Ο繝ｼ諠・ｱ:', targetFlow);

      // 識 繝輔ぃ繧､繝ｫ繝代せ繧堤｢ｺ螳溘↓險ｭ螳夲ｼ・roubleshooting繝・ぅ繝ｬ繧ｯ繝医Μ髯仙ｮ夲ｼ・
      const fileName = targetFlow.fileName.endsWith('.json')
        ? targetFlow.fileName
        : flowId + '.json';
      const filePath = 'knowledge-base/troubleshooting/' + fileName;
      setSelectedFilePath(filePath);
      console.log('刀 邱ｨ髮・ｯｾ雎｡繝輔ぃ繧､繝ｫ繝代せ險ｭ螳・', filePath);

      // 圻 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･繧貞ｼｷ蛻ｶ繧ｯ繝ｪ繧｢
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('ｧｹ 繝悶Λ繧ｦ繧ｶ繧ｭ繝｣繝・す繝･繧ｯ繝ｪ繧｢螳御ｺ・);
      }

      // 識 邨ｱ荳縺輔ｌ縺蘗PI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医〒逶ｴ謗･蜿門ｾ・
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      
      // buildApiUrl繧剃ｽｿ逕ｨ縺励※豁｣縺励＞URL繧呈ｧ狗ｯ・
      const { buildApiUrl } = await import('../../lib/api');
      const apiUrl = `${buildApiUrl(`/emergency-flow/${flowId}`)}?ts=${timestamp}&_r=${randomId}`;

      console.log('倹 API蜻ｼ縺ｳ蜃ｺ縺・', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Fresh': 'true',
        },
      });

      console.log(
        '藤 API繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('笶・API 繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(
          '繝輔Ο繝ｼ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆ (' +
            response.status +
            '): ' +
            errorText
        );
      }

      const responseData = await response.json();
      console.log('投 逕蘗PI繝ｬ繧ｹ繝昴Φ繧ｹ:', responseData);

      const data =
        responseData.success && responseData.data
          ? responseData.data
          : responseData;
      console.log('剥 蜃ｦ逅・ｯｾ雎｡繝・・繧ｿ:', data);

      // 識 繝・ヰ繝・げ: API繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隧ｳ邏ｰ遒ｺ隱・
      console.log('剥 API繝ｬ繧ｹ繝昴Φ繧ｹ隧ｳ邏ｰ:', {
        responseData: responseData,
        data: data,
        hasSlides: !!data.slides,
        hasSteps: !!data.steps,
        slidesLength: data.slides?.length || 0,
        stepsLength: data.steps?.length || 0,
        slidesType: typeof data.slides,
        stepsType: typeof data.steps,
        dataKeys: Object.keys(data),
      });

      // 識 繝輔Ο繝ｼ荳隕ｧ縺ｮ繝・・繧ｿ讒矩繧偵お繝・ぅ繧ｿ繝ｼ逕ｨ縺ｫ螟画鋤・・lides/steps邨ｱ荳・・
      const sourceSteps = data.steps || data.slides || [];
      console.log('搭 繧ｽ繝ｼ繧ｹ繧ｹ繝・ャ繝・', sourceSteps);

      // 繝・・繧ｿ縺檎ｩｺ縺ｮ蝣ｴ蜷医・蜃ｦ逅・
      if (!sourceSteps || sourceSteps.length === 0) {
        console.warn('笞・・繝輔Ο繝ｼ繝・・繧ｿ縺ｫ繧ｹ繝・ャ繝励′蜷ｫ縺ｾ繧後※縺・∪縺帙ｓ');
        toast({
          title: '繝・・繧ｿ隴ｦ蜻・,
          description: '繝輔Ο繝ｼ繝・・繧ｿ縺ｫ繧ｹ繝・ャ繝励′蜷ｫ縺ｾ繧後※縺・∪縺帙ｓ',
          variant: 'destructive',
        });
      }

      const editorData = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        triggerKeywords: data.trigger || data.triggerKeywords || [],
        steps: sourceSteps.map((step, index) => {
          console.log(`肌 繧ｹ繝・ャ繝夕${index}]蜃ｦ逅・幕蟋・`, step);

          // 逕ｻ蜒乗ュ蝣ｱ縺ｮ蜃ｦ逅・ｒ謾ｹ蝟・
          let processedImages = [];

          // 譁ｰ縺励＞ 'images' 驟榊・縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷・
          if (step.images && Array.isArray(step.images)) {
            console.log(
              `萄 繧ｹ繝・ャ繝夕${index}]縺ｧ譁ｰ縺励＞images蠖｢蠑上ｒ讀懷・:`,
              step.images
            );
            processedImages = step.images
              .filter(img => img && img.url && img.url.trim() !== '')
              .map(img => ({
                url: convertImageUrl(img.url),
                fileName: img.fileName,
              }));
          }
          // 蜿､縺・ｽ｢蠑上・逕ｻ蜒乗ュ蝣ｱ縺後≠繧句ｴ蜷医∵眠縺励＞蠖｢蠑上↓螟画鋤
          else if (step.imageUrl && step.imageFileName) {
            console.log(`肌 繧ｹ繝・ャ繝夕${index}]繧貞商縺・ｽ｢蠑上°繧牙､画鋤:`, {
              imageUrl: step.imageUrl,
              imageFileName: step.imageFileName,
            });
            processedImages = [
              {
                url: convertImageUrl(step.imageUrl),
                fileName: step.imageFileName,
              },
            ];
          }
          // 蜿､縺・ｽ｢蠑上・imageUrl縺ｮ縺ｿ縺ｮ蝣ｴ蜷・
          else if (step.imageUrl) {
            console.log(`肌 繧ｹ繝・ャ繝夕${index}]繧段mageUrl縺ｮ縺ｿ縺九ｉ螟画鋤:`, {
              imageUrl: step.imageUrl,
            });
            const fileName = step.imageUrl.split('/').pop() || 'unknown.jpg';
            processedImages = [
              {
                url: convertImageUrl(step.imageUrl),
                fileName: fileName,
              },
            ];
          }

          const processedStep = {
            ...step,
            // description 縺ｨ message 縺ｮ蜷梧悄
            description: step.description || step.message || '',
            message: step.message || step.description || '',
            // 逕ｻ蜒乗ュ蝣ｱ繧堤｢ｺ螳溘↓險ｭ螳夲ｼ育ｩｺ驟榊・繧偵ョ繝輔か繝ｫ繝医↓・・
            images: processedImages || [],
            // 蜿､縺・・繝ｭ繝代ユ繧｣繧貞炎髯､
            imageUrl: undefined,
            imageFileName: undefined,
            // 繧ｪ繝励す繝ｧ繝ｳ縺ｮ謨ｴ蜷域ｧ遒ｺ菫・
            options: (step.options || []).map(option => ({
              text: option.text || '',
              nextStepId: option.nextStepId || '',
              isTerminal: Boolean(option.isTerminal),
              conditionType: option.conditionType || 'other',
              condition: option.condition || '',
            })),
          };

          console.log(`笨・繧ｹ繝・ャ繝夕${index}]蜃ｦ逅・ｮ御ｺ・`, processedStep);
          return processedStep;
        }),
        updatedAt: data.createdAt || data.updatedAt || new Date().toISOString(),
      };

      console.log('識 譛邨ら噪縺ｪ繧ｨ繝・ぅ繧ｿ繝ｼ繝・・繧ｿ:', editorData);

      // 繝・・繧ｿ謨ｴ蜷域ｧ縺ｮ蜴ｳ蟇・メ繧ｧ繝・け
      console.log('蜿門ｾ励＠縺溘ヵ繝ｭ繝ｼ繝・・繧ｿ:', {
        requestedId: flowId,
        retrievedId: editorData.id,
        title: editorData.title,
        stepsCount: editorData.steps?.length || 0,
        fileName: targetFlow.fileName,
        filePath: filePath,
        allStepIds: editorData.steps?.map(s => s.id) || [],
        stepsWithImages:
          editorData.steps?.filter(s => s.images && s.images.length > 0)
            .length || 0,
        timestamp: Date.now(),
        dataSource: 'emergency-flow-api',
      });

      // 繧ｹ繝・ャ繝玲焚荳堺ｸ閾ｴ縺ｮ隴ｦ蜻奇ｼ井ｻｻ諢上・繧ｹ繝・ャ繝玲焚繧定ｨｱ蜿ｯ・・
      if (editorData.steps?.length === 0) {
        console.warn('繧ｹ繝・ャ繝励ョ繝ｼ繧ｿ縺悟ｭ伜惠縺励∪縺帙ｓ');
        toast({
          title: '繝・・繧ｿ隴ｦ蜻・,
          description: '繝輔Ο繝ｼ繝・・繧ｿ縺ｫ繧ｹ繝・ャ繝励′蜷ｫ縺ｾ繧後※縺・∪縺帙ｓ',
          variant: 'destructive',
        });
      }

      // 識 邱ｨ髮・判髱｢縺ｮ迥ｶ諷九ｒ譖ｴ譁ｰ
      console.log('売 迥ｶ諷区峩譁ｰ髢句ｧ・);
      setCurrentFlowData(editorData);
      setSelectedFlowForEdit(flowId);

      console.log('売 迥ｶ諷区峩譁ｰ螳御ｺ・', {
        selectedFlowForEdit: flowId,
        currentFlowData: editorData,
      });

      // 蠑ｷ蛻ｶ逧・↓蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ繧偵ヨ繝ｪ繧ｬ繝ｼ
      setTimeout(() => {
        console.log('売 蠑ｷ蛻ｶ蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ螳溯｡・);
        setCurrentFlowData({ ...editorData });
      }, 100);

      console.log('笨・繝輔Ο繝ｼ邱ｨ髮・ョ繝ｼ繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・);
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ邱ｨ髮・ョ繝ｼ繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: `繝輔Ο繝ｼ繝・・繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  // 繝輔Ο繝ｼ蜑企勁 - 迚ｩ逅・ヵ繧｡繧､繝ｫ蜑企勁縺ｨ繝輔Ο繝ｼ荳隕ｧ縺九ｉ縺ｮ螳悟・髯､蜴ｻ
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      console.log('卵・・繝輔Ο繝ｼ蜑企勁髢句ｧ・ ' + flowId);

      // 蜑企勁蟇ｾ雎｡縺ｮ繝輔Ο繝ｼ諠・ｱ繧貞叙蠕・
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('蜑企勁蟇ｾ雎｡縺ｮ繝輔Ο繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }

      console.log('識 蜑企勁蟇ｾ雎｡:', {
        id: targetFlow.id,
        title: targetFlow.title,
        fileName: targetFlow.fileName,
      });

      // 蜑企勁API繧貞他縺ｳ蜃ｺ縺・
      const fileName = targetFlow.fileName || flowId + '.json';
      const url = `/api/emergency-flow/${flowId}?fileName=${encodeURIComponent(fileName)}`;
      console.log('倹 蜑企勁API蜻ｼ縺ｳ蜃ｺ縺・', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        },
      });

      console.log('藤 蜑企勁繝ｬ繧ｹ繝昴Φ繧ｹ:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorMessage = `蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.log('笶・蜑企勁繧ｨ繝ｩ繝ｼ繝・・繧ｿ:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.warn('笞・・繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隗｣譫舌↓螟ｱ謨・', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('笨・蜑企勁繝ｬ繧ｹ繝昴Φ繧ｹ:', result);

      // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
      toast({
        title: '蜑企勁螳御ｺ・,
        description: `縲・{targetFlow.title}縲阪′豁｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆`,
      });

      // 蜑企勁縺輔ｌ縺溘い繧､繝・Β縺檎樟蝨ｨ邱ｨ髮・ｸｭ縺ｮ蝣ｴ蜷医・繧ｯ繝ｪ繧｢
      if (selectedFlowForEdit === flowId) {
        setSelectedFlowForEdit(null);
        setCurrentFlowData(null);
        setSelectedFilePath(null);
      }

      // 繝輔Ο繝ｼ荳隕ｧ縺九ｉ蜑企勁縺輔ｌ縺溘い繧､繝・Β繧貞叉蠎ｧ縺ｫ髯､蜴ｻ
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowId);
        console.log(
          '搭 繝輔Ο繝ｼ荳隕ｧ縺九ｉ髯､蜴ｻ: ' +
            flowId +
            ' (谿九ｊ: ' +
            filteredList.length +
            '莉ｶ)'
        );
        return filteredList;
      });

      // 繧ｵ繝ｼ繝舌・縺九ｉ譛譁ｰ縺ｮ繝輔Ο繝ｼ荳隕ｧ繧貞ｼｷ蛻ｶ蜿門ｾ・
      console.log('売 繝輔Ο繝ｼ荳隕ｧ繧貞・蜿門ｾ嶺ｸｭ...');
      await fetchFlowList(true);

      // 莉悶・繧ｳ繝ｳ繝昴・繝阪Φ繝医↓蜑企勁螳御ｺ・ｒ騾夂衍
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('flowDeleted', {
            detail: { deletedId: flowId, deletedTitle: targetFlow.title },
          })
        );
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList'));
      }
    } catch (error) {
      console.error('笶・蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      const errorMessage =
        error instanceof Error ? error.message : '繝輔Ο繝ｼ縺ｮ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
      toast({
        title: '蜑企勁繧ｨ繝ｩ繝ｼ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setFlowToDelete(null);
    }
  };

  // 繝輔Ο繝ｼ菫晏ｭ倥さ繝ｼ繝ｫ繝舌ャ繧ｯ
  const handleFlowSave = async (savedData: FlowData) => {
    try {
      console.log('沈 繝輔Ο繝ｼ菫晏ｭ倬幕蟋・', {
        id: savedData.id,
        title: savedData.title,
        stepsCount: savedData.steps?.length,
      });

      // 逕ｻ蜒酋RL縺ｮ蟄伜惠遒ｺ隱・
      const stepsWithImages = savedData.steps.map(step => {
        console.log('剥 繧ｹ繝・ャ繝礼判蜒丞・逅・幕蟋・', {
          stepId: step.id,
          stepTitle: step.title,
          originalImages: step.images,
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
        });

        // 譁ｰ縺励＞ images 驟榊・繧貞━蜈育噪縺ｫ菴ｿ逕ｨ縺吶ｋ
        const images = step.images
          ?.filter(img => img && img.url && img.url.trim() !== '')
          .map(img => {
            console.log('名・・逕ｻ蜒丞・逅・', {
              originalImg: img,
              url: img.url,
              fileName: img.fileName,
              urlValid: img.url && img.url.trim() !== '',
              fileNameValid: img.fileName && img.fileName.trim() !== '',
            });
            
            // 逕ｻ蜒酋RL縺梧怏蜉ｹ縺ｧ縺ｪ縺・ｴ蜷医・繧ｹ繧ｭ繝・・
            if (!img.url || img.url.trim() === '') {
              console.log('笶・辟｡蜉ｹ縺ｪ逕ｻ蜒酋RL繧偵せ繧ｭ繝・・:', img);
              return null;
            }
            
            // 繝輔ぃ繧､繝ｫ蜷阪′辟｡縺・ｴ蜷医・URL縺九ｉ謚ｽ蜃ｺ
            let fileName = img.fileName;
            if (!fileName || fileName.trim() === '') {
              // URL縺九ｉ繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ
              if (img.url.includes('/')) {
                fileName = img.url.split('/').pop() || '';
              } else if (img.url.includes('\\')) {
                fileName = img.url.split('\\').pop() || '';
              } else {
                fileName = img.url;
              }
              console.log('刀 URL縺九ｉ繝輔ぃ繧､繝ｫ蜷阪ｒ謚ｽ蜃ｺ:', { url: img.url, fileName });
            }
            
            return {
              url: img.url,
              fileName: fileName,
            };
          })
          .filter(img => img !== null) || []; // null繧帝勁螟・

        if (images && images.length > 0) {
          console.log('笨・譛牙柑縺ｪ逕ｻ蜒乗ュ蝣ｱ:', {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: images.length,
            images: images,
          });
        } else {
          console.log('笶・譛牙柑縺ｪ逕ｻ蜒上↑縺・', {
            stepId: step.id,
            stepTitle: step.title,
            originalImages: step.images,
            processedImages: images,
          });
        }

        // 蜿､縺・・繝ｭ繝代ユ繧｣繧貞炎髯､縺励∵眠縺励＞ `images` 繝励Ο繝代ユ繧｣縺ｮ縺ｿ縺ｫ縺吶ｋ
        const { imageUrl, imageFileName, ...restOfStep } = step;
        const processedStep = {
          ...restOfStep,
          images: images || [], // 遒ｺ螳溘↓遨ｺ驟榊・繧定ｨｭ螳・
        };

        console.log('剥 蜃ｦ逅・ｾ後・繧ｹ繝・ャ繝・', {
          stepId: processedStep.id,
          stepTitle: processedStep.title,
          finalImages: processedStep.images,
          hasFinalImages: !!processedStep.images,
          finalImagesLength: processedStep.images?.length || 0,
        });

        return processedStep;
      });

      // 繝輔Ο繝ｼ繝・・繧ｿ繧呈峩譁ｰ
      const updatedFlowData = {
        ...savedData,
        steps: stepsWithImages,
        updatedAt: new Date().toISOString(),
      };

      console.log('豆 騾∽ｿ｡繝・・繧ｿ隧ｳ邏ｰ:', {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length,
        stepsWithImages: updatedFlowData.steps.filter(s => s.images && s.images.length > 0).length,
        allStepsImages: updatedFlowData.steps.map(step => ({
          stepId: step.id,
          stepTitle: step.title,
          imagesCount: step.images?.length || 0,
          images: step.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 100) + '...'
          })) || []
        }))
      });

      // API縺ｫ繝・・繧ｿ繧帝∽ｿ｡
      const { buildApiUrl } = await import('../../lib/api');
      const response = await fetch(
        buildApiUrl(`/emergency-flow/${updatedFlowData.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedFlowData),
        }
      );

      console.log('藤 繝ｬ繧ｹ繝昴Φ繧ｹ迥ｶ諷・', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('笶・API 繧ｨ繝ｩ繝ｼ:', errorText);
        throw new Error(
          `菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log('笨・繝輔Ο繝ｼ菫晏ｭ伜ｮ御ｺ・', {
        success: result.success,
        data: result.data,
        stepsCount: updatedFlowData.steps.length,
        stepsWithImages: updatedFlowData.steps.filter(
          s => s.images && s.images.length > 0
        ).length,
        allStepsImages: updatedFlowData.steps.map(step => ({
          stepId: step.id,
          stepTitle: step.title,
          imagesCount: step.images?.length || 0,
          images: step.images?.map(img => ({
            fileName: img.fileName,
            url: img.url?.substring(0, 100) + '...'
          })) || []
        }))
      });

      // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
      toast({
        title: '菫晏ｭ伜ｮ御ｺ・,
        description: '繝輔Ο繝ｼ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆',
      });

      // 繝輔Ο繝ｼ荳隕ｧ繧呈峩譁ｰ
      await fetchFlowList(true);
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ菫晏ｭ倥お繝ｩ繝ｼ:', error);
      toast({
        title: '菫晏ｭ倥お繝ｩ繝ｼ',
        description:
          error instanceof Error ? error.message : '繝輔Ο繝ｼ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    }
  };

  const handleAddSlide = (type: 'normal' | 'decision') => {
    const newSlide: Slide = {
      id: `slide_${Date.now()}`,
      type,
      content: '',
      conditions: type === 'decision' ? [] : undefined,
    };
    setSlides([...slides, newSlide]);
  };

  const handleSlideDelete = (slideId: string) => {
    setSlides(slides.filter(slide => slide.id !== slideId));
  };

  const handleConditionAdd = (slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (
      slide &&
      slide.type === 'decision' &&
      (!slide.conditions || slide.conditions.length < 4)
    ) {
      const newCondition: DecisionCondition = {
        id: `condition_${Date.now()}`,
        text: '',
      };

      const updatedSlides = slides.map(s => {
        if (s.id === slideId) {
          return {
            ...s,
            conditions: [...(s.conditions || []), newCondition],
          };
        }
        return s;
      });

      setSlides(updatedSlides);
    }
  };

  const handleConditionEdit = (
    slideId: string,
    conditionId: string,
    text: string,
    nextSlideId?: string
  ) => {
    const updatedSlides = slides.map(slide => {
      if (slide.id === slideId && slide.type === 'decision') {
        return {
          ...slide,
          conditions: (slide.conditions || []).map(condition => {
            if (condition.id === conditionId) {
              return {
                ...condition,
                text,
                nextSlideId,
              };
            }
            return condition;
          }),
        };
      }
      return slide;
    });

    setSlides(updatedSlides);
  };

  const handleConditionDelete = (slideId: string, conditionId: string) => {
    const updatedSlides = slides.map(slide => {
      if (slide.id === slideId && slide.type === 'decision') {
        return {
          ...slide,
          conditions: (slide.conditions || []).filter(
            c => c.id !== conditionId
          ),
        };
      }
      return slide;
    });

    setSlides(updatedSlides);
  };

  const handleSave = () => {
    // id縺袈UID蠖｢蠑上〒縺ｪ縺代ｌ縺ｰ譁ｰ隕冗匱陦・
    let validId = initialData?.id || '';
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validId)) {
      validId = uuidv4();
    }
    // triggerKeywords縺蛍ndefined縺ｪ繧臥ｩｺ驟榊・
    const triggerKeywords = Array.isArray(initialData?.triggerKeywords)
      ? initialData.triggerKeywords
      : [];
    
    // currentFlowData縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺昴ｌ繧剃ｽｿ逕ｨ縲√◎縺・〒縺ｪ縺代ｌ縺ｰslides繧剃ｽｿ逕ｨ
    const dataToSave = currentFlowData || {
      id: validId,
      title,
      description,
      triggerKeywords,
      steps: slides,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('沈 繝輔Ο繝ｼ菫晏ｭ倥ョ繝ｼ繧ｿ:', {
      id: dataToSave.id,
      title: dataToSave.title,
      stepsCount: dataToSave.steps?.length || 0,
      stepsWithImages: dataToSave.steps?.filter(s => s.images && s.images.length > 0).length || 0,
      allStepsImages: dataToSave.steps?.map(step => ({
        stepId: step.id,
        stepTitle: step.title,
        imagesCount: step.images?.length || 0,
        images: step.images?.map(img => ({
          fileName: img.fileName,
          url: img.url?.substring(0, 100) + '...'
        })) || []
      })) || []
    });
    
    onSave(dataToSave);
  };

  // 逕ｻ蜒剰ｿｽ蜉譎ゅ・閾ｪ蜍穂ｿ晏ｭ假ｼ医ヵ繧｡繧､繝ｫ荳隕ｧ縺ｫ謌ｻ繧峨↑縺・ｼ・
  const handleAutoSave = async () => {
    try {
      // id縺袈UID蠖｢蠑上〒縺ｪ縺代ｌ縺ｰ譁ｰ隕冗匱陦・
      let validId = initialData?.id || '';
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(validId)) {
        validId = uuidv4();
      }
      // triggerKeywords縺蛍ndefined縺ｪ繧臥ｩｺ驟榊・
      const triggerKeywords = Array.isArray(initialData?.triggerKeywords)
        ? initialData.triggerKeywords
        : [];
      
      // currentFlowData縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺昴ｌ繧剃ｽｿ逕ｨ縲√◎縺・〒縺ｪ縺代ｌ縺ｰslides繧剃ｽｿ逕ｨ
      const dataToSave = currentFlowData || {
        id: validId,
        title,
        description,
        triggerKeywords,
        steps: slides,
        updatedAt: new Date().toISOString(),
      };

      // 邨ｱ荳縺輔ｌ縺滉ｿ晏ｭ伜・逅・ｒ菴ｿ逕ｨ縺励※閾ｪ蜍穂ｿ晏ｭ・
      const { saveFlowData } = await import('../../lib/flow-save-manager');
      const result = await saveFlowData(dataToSave);
      
      if (result.success) {
        console.log('逕ｻ蜒剰ｿｽ蜉蠕後・閾ｪ蜍穂ｿ晏ｭ伜ｮ御ｺ・);
      } else {
        console.error('閾ｪ蜍穂ｿ晏ｭ倥お繝ｩ繝ｼ:', result.error);
      }
    } catch (error) {
      console.error('閾ｪ蜍穂ｿ晏ｭ倥お繝ｩ繝ｼ:', error);
    }
  };

  const handleImageUpload = async (stepId: string, file: File) => {
    try {
      // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繝√ぉ繝・け・・0MB・・
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`繝輔ぃ繧､繝ｫ "${file.name}" 縺ｮ繧ｵ繧､繧ｺ縺悟､ｧ縺阪☆縺弱∪縺吶・0MB莉･荳九・繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲Ａ);
        return;
      }

      console.log('名・・逕ｻ蜒上い繝・・繝ｭ繝ｼ繝蛾幕蟋・', { stepId, fileName: file.name, fileSize: file.size });

      // 驥崎､・メ繧ｧ繝・け: 蜷後§繝輔ぃ繧､繝ｫ蜷阪・逕ｻ蜒上′譌｢縺ｫ蟄伜惠縺吶ｋ縺九メ繧ｧ繝・け
      if (currentFlowData) {
        const stepToUpdate = currentFlowData.steps.find(
          step => step.id === stepId
        );
        if (stepToUpdate && stepToUpdate.images) {
          const existingImage = stepToUpdate.images
            .filter(img => img && img.fileName && img.fileName.trim() !== '')
            .find(
              img =>
                img.fileName === file.name ||
                img.fileName === file.name.replace(/\.[^/.]+$/, '') // 諡｡蠑ｵ蟄舌ｒ髯､縺・◆豈碑ｼ・
            );

          if (existingImage) {
            const confirmReplace = window.confirm(
              `蜷後§繝輔ぃ繧､繝ｫ蜷阪・逕ｻ蜒・"${file.name}" 縺梧里縺ｫ蟄伜惠縺励∪縺吶・n` +
                `譌｢蟄倥・逕ｻ蜒上ｒ鄂ｮ縺肴鋤縺医∪縺吶°・歔
            );

            if (!confirmReplace) {
              return;
            }

            // 譌｢蟄倥・逕ｻ蜒上ｒ蜑企勁
            const updatedSteps = currentFlowData.steps.map(step => {
              if (step.id === stepId) {
                const updatedImages =
                  step.images?.filter(
                    img => img && img.fileName && img.fileName !== existingImage.fileName
                  ) || [];
                return { ...step, images: updatedImages };
              }
              return step;
            });

            setCurrentFlowData({
              ...currentFlowData,
              steps: updatedSteps,
            });
          }
        }
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('stepId', stepId);

      const { buildApiUrl } = await import('../../lib/api');
      const response = await fetch(
        buildApiUrl('/emergency-flow/upload-image'),
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆');
      }

      const result = await response.json();

      if (result.success && currentFlowData) {
        // imageFileName縺瑚ｿ斐＆繧後※縺・↑縺・ｴ蜷医・fileName繧剃ｽｿ逕ｨ
        const imageFileName = result.imageFileName || result.fileName;

        const newImage = {
          url: result.imageUrl, // 繧ｵ繝ｼ繝舌・縺九ｉ霑斐＆繧後◆豁｣縺励＞URL繧剃ｽｿ逕ｨ
          fileName: imageFileName,
        };

        // 驥崎､・判蜒上・蝣ｴ蜷医・騾夂衍
        if (result.isDuplicate) {
          console.log(
            '売 驥崎､・判蜒上ｒ讀懷・縲∵里蟄倥ヵ繧｡繧､繝ｫ繧剃ｽｿ逕ｨ:',
            result.fileName
          );
        }

        // 隧ｲ蠖薙☆繧九せ繝・ャ繝励・images驟榊・繧呈峩譁ｰ
        const updatedSteps = currentFlowData.steps.map(step => {
          if (step.id === stepId) {
            const currentImages = (step.images || []).filter(img => img && img.url && img.url.trim() !== '');
            if (currentImages.length < 3) {
              return {
                ...step,
                images: [...currentImages, newImage],
              };
            }
          }
          return step;
        });

        // 繝輔Ο繝ｼ繝・・繧ｿ繧呈峩譁ｰ
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps,
        });

        // 閾ｪ蜍穂ｿ晏ｭ倥ｒ螳溯｡鯉ｼ医ヵ繧｡繧､繝ｫ荳隕ｧ縺ｫ謌ｻ繧峨↑縺・ｼ・
        handleAutoSave();

        const message = result.isDuplicate
          ? `驥崎､・判蜒上ｒ讀懷・縺励∪縺励◆縲よ里蟄倥・逕ｻ蜒・"${result.fileName}" 繧剃ｽｿ逕ｨ縺励∪縺吶Ａ
          : '逕ｻ蜒上′豁｣蟶ｸ縺ｫ繧｢繝・・繝ｭ繝ｼ繝峨＆繧後∪縺励◆';

        toast({
          title: '逕ｻ蜒上い繝・・繝ｭ繝ｼ繝牙ｮ御ｺ・,
          description: message,
        });
      }
    } catch (error) {
      console.error('逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
      toast({
        title: '繧ｨ繝ｩ繝ｼ',
        description: '逕ｻ蜒上・繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆',
        variant: 'destructive',
      });
    }
  };

  const handleImageRemove = async (slideId: string, imageIndex: number) => {
    if (!currentFlowData) return;

    const step = currentFlowData.steps.find(s => s.id === slideId);
    if (
      !step ||
      !step.images ||
      imageIndex < 0 ||
      imageIndex >= step.images.length
    ) {
      return;
    }

    const imageToRemove = step.images[imageIndex];

    const confirmDelete = window.confirm(
      `逕ｻ蜒・"${imageToRemove.fileName}" 繧貞炎髯､縺励∪縺吶°・歃n繧ｵ繝ｼ繝舌・縺九ｉ繝輔ぃ繧､繝ｫ縺悟炎髯､縺輔ｌ縲√％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲Ａ
    );

    if (confirmDelete) {
      try {
        // API繧貞他縺ｳ蜃ｺ縺励※繧ｵ繝ｼ繝舌・縺九ｉ逕ｻ蜒上ｒ蜑企勁
        const { buildApiUrl } = await import('../../lib/api');
        const response = await fetch(
          buildApiUrl(`/emergency-flow/image/${imageToRemove.fileName}`),
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || '繧ｵ繝ｼ繝舌・荳翫・逕ｻ蜒上ヵ繧｡繧､繝ｫ蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・
          );
        }

        // 繝輔Ο繝ｳ繝医お繝ｳ繝峨・迥ｶ諷九ｒ譖ｴ譁ｰ
        const updatedSteps = currentFlowData.steps.map(s => {
          if (s.id === slideId) {
            const updatedImages =
              s.images?.filter((_, i) => i !== imageIndex) || [];
            return { ...s, images: updatedImages };
          }
          return s;
        });
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps,
        });

        // 螟画峩繧剃ｿ晏ｭ・
        handleSave();

        toast({
          title: '逕ｻ蜒丞炎髯､螳御ｺ・,
          description: `逕ｻ蜒・"${imageToRemove.fileName}" 繧貞炎髯､縺励∪縺励◆縲Ａ,
        });
      } catch (error) {
        console.error('逕ｻ蜒丞炎髯､繧ｨ繝ｩ繝ｼ:', error);
        toast({
          title: '繧ｨ繝ｩ繝ｼ',
          description: `逕ｻ蜒上・蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${error instanceof Error ? error.message : '譛ｪ遏･縺ｮ繧ｨ繝ｩ繝ｼ'}`,
          variant: 'destructive',
        });
      }
    }
  };

  const renderSlideContent = (slide: Slide) => {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-6'>
          <Input
            value={slide.content}
            onChange={e => {
              const updatedSlides = slides.map(s =>
                s.id === slide.id ? { ...s, content: e.target.value } : s
              );
              setSlides(updatedSlides);
            }}
            placeholder='繧ｹ繝ｩ繧､繝峨・蜀・ｮｹ繧貞・蜉・
            className='text-base-2x h-12'
          />
          <div className='flex items-center gap-3'>
            <input
              type='file'
              id={`image-upload-${slide.id}`}
              className='hidden'
              accept='image/*'
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(slide.id, file);
                }
              }}
            />
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                document.getElementById(`image-upload-${slide.id}`)?.click()
              }
              className='text-base-2x h-12 px-4'
            >
              <Upload className='w-6 h-6 mr-2' />
              逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・
            </Button>
          </div>
        </div>

        {/* 逕ｻ蜒剰｡ｨ遉ｺ驛ｨ蛻・ｒ謾ｹ蝟・*/}
        {currentFlowData &&
          (() => {
            const step = currentFlowData.steps.find(s => s.id === slide.id);
            if (step && step.images && step.images.length > 0) {
              return (
                <div className='mt-6'>
                  <Label className='text-base-2x font-medium'>
                    繧｢繝・・繝ｭ繝ｼ繝画ｸ医∩逕ｻ蜒・
                  </Label>
                  <div className='mt-3 grid grid-cols-2 md:grid-cols-3 gap-3'>
                    {step.images.map((image, index) => (
                      <div key={index} className='relative group'>
                        <img
                          src={convertImageUrl(image.url)}
                          alt={image.fileName}
                          className='w-full h-32 object-cover rounded border'
                          onError={e => {
                            console.error('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', image.url);
                            e.currentTarget.style.display = 'none';
                            // 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ繧定ｿｽ蜉
                            const errorDiv = document.createElement('div');
                            errorDiv.className =
                              'w-full h-32 bg-red-100 border border-red-300 text-red-700 flex items-center justify-center text-base-2x rounded';
                            errorDiv.textContent = '逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ螟ｱ謨・;
                            e.currentTarget.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', image.fileName);
                          }}
                        />
                        <Button
                          variant='destructive'
                          size='sm'
                          className='absolute top-2 right-2 h-8 w-8 p-0 rounded-full opacity-80 group-hover:opacity-100'
                          onClick={() => handleImageRemove(slide.id, index)}
                        >
                          <X className='h-4 w-4' />
                        </Button>
                        <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-base-2x p-2 truncate rounded-b'>
                          {image.fileName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

        {slide.type === 'decision' && (
          <div className='space-y-3'>
            {slide.conditions?.map(condition => (
              <div key={condition.id} className='flex items-center gap-3'>
                <Input
                  value={condition.text}
                  onChange={e =>
                    handleConditionEdit(
                      slide.id,
                      condition.id,
                      e.target.value,
                      condition.nextSlideId
                    )
                  }
                  placeholder='譚｡莉ｶ繧貞・蜉・..'
                  className='text-base-2x h-12'
                />
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-red-500 hover:text-red-700 h-12 w-12'
                  onClick={() => handleConditionDelete(slide.id, condition.id)}
                >
                  <Trash2 className='w-6 h-6' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold'>蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ邂｡逅・/h2>
        <Button onClick={() => fetchFlowList(true)} variant='outline' size='sm'>
          <RefreshCw className='w-4 h-4 mr-2' />
          譖ｴ譁ｰ
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='new'>譁ｰ隕丈ｽ懈・</TabsTrigger>
          <TabsTrigger value='upload'>繧｢繝・・繝ｭ繝ｼ繝・/TabsTrigger>
          <TabsTrigger value='edit' disabled={!flowList.length}>
            邱ｨ髮・
          </TabsTrigger>
        </TabsList>

        <TabsContent value='new' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Plus className='w-5 h-5' />
                譁ｰ隕上ヵ繝ｭ繝ｼ菴懈・
              </CardTitle>
              <CardDescription>
                繝輔Ο繝ｼ繧ｨ繝・ぅ繧ｿ繝ｼ繧剃ｽｿ逕ｨ縺励※譁ｰ縺励＞蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ繧剃ｽ懈・縺励∪縺・
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyFlowEditor flowData={null} onSave={handleFlowSave} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='upload' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Upload className='w-5 h-5' />
                繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・
              </CardTitle>
              <CardDescription>
                譌｢蟄倥・繝輔Ο繝ｼ繝輔ぃ繧､繝ｫ・・SON蠖｢蠑擾ｼ峨ｒ繧｢繝・・繝ｭ繝ｼ繝峨＠縺ｾ縺・
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.json'
                  onChange={handleFileSelect}
                  className='hidden'
                />
                {selectedFile ? (
                  <div className='space-y-2'>
                    <FileText className='mx-auto h-8 w-8 text-blue-500' />
                    <p className='text-sm font-medium'>{selectedFile.name}</p>
                    <p className='text-xs text-gray-500'>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    <FolderOpen className='mx-auto h-8 w-8 text-gray-400' />
                    <p className='text-sm text-gray-500'>
                      JSON繝輔ぃ繧､繝ｫ繧帝∈謚槭＠縺ｦ縺上□縺輔＞
                    </p>
                  </div>
                )}
                <Button
                  variant='outline'
                  onClick={() => fileInputRef.current?.click()}
                  className='mt-2'
                >
                  繝輔ぃ繧､繝ｫ驕ｸ謚・
                </Button>
              </div>

              {isUploading && (
                <div className='space-y-2'>
                  <Progress value={uploadProgress} />
                  <p className='text-sm text-center'>
                    繧｢繝・・繝ｭ繝ｼ繝我ｸｭ... {uploadProgress}%
                  </p>
                </div>
              )}

              <div className='flex gap-2'>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className='flex-1'
                >
                  <Upload className='w-4 h-4 mr-2' />
                  {isUploading ? '繧｢繝・・繝ｭ繝ｼ繝我ｸｭ...' : '繧｢繝・・繝ｭ繝ｼ繝・}
                </Button>
                {selectedFile && (
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className='w-4 h-4' />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='edit' className='space-y-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 繝輔Ο繝ｼ荳隕ｧ */}
            <Card>
              <CardHeader>
                <CardTitle>繝輔Ο繝ｼ荳隕ｧ</CardTitle>
                <CardDescription>
                  邱ｨ髮・☆繧九ヵ繝ｭ繝ｼ繧帝∈謚槭＠縺ｦ縺上□縺輔＞ ({flowList.length}莉ｶ)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 繝・ヰ繝・げ諠・ｱ陦ｨ遉ｺ */}
                <div className='p-3 bg-yellow-50 border border-yellow-200 rounded mb-4'>
                  <h4 className='text-sm font-medium text-yellow-800 mb-2'>
                    繝・ヰ繝・げ諠・ｱ
                  </h4>
                  <div className='text-xs text-yellow-700 space-y-1'>
                    <p>繝輔Ο繝ｼ荳隕ｧ謨ｰ: {flowList.length}</p>
                    <p>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ: {isLoadingFlowList.toString()}</p>
                    <p>驕ｸ謚樔ｸｭ繝輔Ο繝ｼ: {selectedFlowForEdit || '縺ｪ縺・}</p>
                    <p>
                      迴ｾ蝨ｨ縺ｮ繝輔Ο繝ｼ繝・・繧ｿ: {currentFlowData ? '縺ゅｊ' : '縺ｪ縺・}
                    </p>
                    <p>繝輔Ο繝ｼ荳隕ｧ隧ｳ邏ｰ: {flowList.map(f => f.id).join(', ')}</p>
                  </div>
                </div>

                {isLoadingFlowList ? (
                  <div className='text-center py-4'>
                    <p className='text-sm text-gray-500'>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
                  </div>
                ) : flowList.length === 0 ? (
                  <div className='text-center py-4'>
                    <p className='text-sm text-gray-500'>繝輔Ο繝ｼ縺後≠繧翫∪縺帙ｓ</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => fetchFlowList(true)}
                      className='mt-2'
                    >
                      蜀崎ｪｭ縺ｿ霎ｼ縺ｿ
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-2 max-h-96 overflow-y-auto'>
                    {flowList.map(flow => (
                      <div
                        key={flow.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFlowForEdit === flow.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <div
                            className='flex-1'
                            onClick={() => {
                              console.log(
                                '務・・繝輔Ο繝ｼ驕ｸ謚・',
                                flow.id,
                                flow.title
                              );
                              loadFlowForEdit(flow.id);
                            }}
                          >
                            <h4 className='font-medium text-sm'>
                              {flow.title}
                            </h4>
                            <p className='text-xs text-gray-500 mt-1'>
                              {flow.description}
                            </p>
                            <div className='flex items-center gap-2 mt-2'>
                              <Badge variant='outline' className='text-xs'>
                                {flow.fileName}
                              </Badge>
                              <Badge variant='secondary' className='text-xs'>
                                ID: {flow.id}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={e => {
                              e.stopPropagation();
                              setFlowToDelete(flow);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 繝輔Ο繝ｼ邱ｨ髮・お繝ｪ繧｢ */}
            <Card>
              <CardHeader>
                <CardTitle>繝輔Ο繝ｼ邱ｨ髮・/CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFlowForEdit && currentFlowData ? (
                  <>
                    {console.log('識 EmergencyFlowEditor縺ｫ貂｡縺吶ョ繝ｼ繧ｿ:', {
                      selectedFlowForEdit,
                      currentFlowDataId: currentFlowData.id,
                      currentFlowDataTitle: currentFlowData.title,
                      selectedFilePath,
                      hasSteps: !!currentFlowData.steps,
                      stepsLength: currentFlowData.steps?.length || 0,
                      stepsDetails:
                        currentFlowData.steps?.map(s => ({
                          id: s.id,
                          title: s.title,
                          type: s.type,
                        })) || [],
                      timestamp: Date.now(),
                    })}

                    {/* 繝・ヰ繝・げ諠・ｱ陦ｨ遉ｺ */}
                    <div className='p-3 bg-blue-50 border border-blue-200 rounded mb-4'>
                      <h4 className='text-sm font-medium text-blue-800 mb-2'>
                        繝・・繧ｿ遒ｺ隱・
                      </h4>
                      <div className='text-xs text-blue-700 space-y-1'>
                        <p>驕ｸ謚槭＆繧後◆繝輔Ο繝ｼID: {selectedFlowForEdit}</p>
                        <p>繝輔Ο繝ｼ繝・・繧ｿID: {currentFlowData.id}</p>
                        <p>繝輔Ο繝ｼ繧ｿ繧､繝医Ν: {currentFlowData.title}</p>
                        <p>繧ｹ繝・ャ繝玲焚: {currentFlowData.steps?.length || 0}</p>
                        <p>繝輔ぃ繧､繝ｫ繝代せ: {selectedFilePath}</p>
                      </div>
                    </div>

                    <EmergencyFlowEditor
                      key={`${currentFlowData.id}-${Date.now()}`}
                      flowData={currentFlowData}
                      currentTab='slides'
                      onSave={handleFlowSave}
                      onTabChange={() => {}}
                      selectedFilePath={selectedFilePath}
                    />
                  </>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>
                      邱ｨ髮・☆繧九ヵ繝ｭ繝ｼ繧帝∈謚槭＠縺ｦ縺上□縺輔＞
                    </p>
                    {console.log('統 繝輔Ο繝ｼ邱ｨ髮・判髱｢縺ｮ迥ｶ諷・', {
                      selectedFlowForEdit,
                      hasCurrentFlowData: !!currentFlowData,
                      currentFlowDataId: currentFlowData?.id,
                      currentFlowDataTitle: currentFlowData?.title,
                      timestamp: Date.now(),
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 蜑企勁遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>繝輔Ο繝ｼ繧貞炎髯､縺励∪縺吶°・・/AlertDialogTitle>
            <AlertDialogDescription>
              {'縲・ +
                flowToDelete?.title +
                '縲阪ｒ蜑企勁縺励∪縺吶ゅ％縺ｮ謫堺ｽ懊・蜿悶ｊ豸医○縺ｾ縺帙ｓ縲・}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => flowToDelete && deleteFlow(flowToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? '蜑企勁荳ｭ...' : '蜑企勁'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyFlowCreator;
