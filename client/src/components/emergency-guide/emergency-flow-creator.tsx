import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast.ts";
import { Upload, Save, X, Edit, Edit3, File, FileText, Plus, Download, FolderOpen, Trash2, RefreshCw, AlertTriangle, Eye } from 'lucide-react';
import { Progress } from "../../components/ui/progress";
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
import EmergencyFlowEditor from './emergency-flow-editor';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { v4 as uuidv4 } from 'uuid';
import { convertImageUrl } from '../../lib/utils.ts';

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

  // 状態管琁E
  const [activeTab, setActiveTab] = useState<'new' | 'upload' | 'edit'>('new');
  const [flowList, setFlowList] = useState<FlowFile[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<string | null>(null);
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // 削除関連
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<FlowFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [slides, setSlides] = useState<Slide[]>(initialData?.slides || []);

  // フロー一覧を取得する関数
  const fetchFlowList = useCallback(async (forceRefresh = false) => {
    try {
      setIsFetching(true);
      setIsLoadingFlowList(true);
      console.log('🔄 応急処置チE�Eタ一覧の取得を開始しまぁE(forceRefresh: ' + forceRefresh + ')');

      // 🧹 キャチE��ュクリア�E�古ぁE��ータの完�E削除�E�E
      if (forceRefresh && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 全キャチE��ュ�E�古ぁE��ータ含む�E�クリア完亁E);
        } catch (cacheError) {
          console.warn('⚠�E�EキャチE��ュクリアエラー:', cacheError);
        }
      }

      // キャチE��ュバスターパラメータを追加
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list?ts=${timestamp}&_r=${randomId}${forceRefresh ? '&force=true' : ''}`;

      console.log('🌐 フロー一覧API呼び出ぁE', url);
      console.log('🔧 API設宁E', {
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        url: url
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Refresh': forceRefresh.toString(),
          'X-Timestamp': timestamp.toString()
        }
      });

      console.log('📡 フロー一覧APIレスポンス状慁E', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁Eフロー一覧API エラー:', errorText);
        throw new Error('フロー一覧の取得に失敗しました: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      console.log('📊 フロー一覧生APIレスポンス:', data);

      // APIレスポンスの構造に合わせてチE�Eタを�E琁E
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log('全フローチE�Eタを表示: ' + flows.length + '件�E�フィルタリング無効�E�E);
      console.log('フローチE�Eタ詳細:', flows);
      setFlowList(flows);

      // 他�Eコンポ�Eネントにフロー一覧更新を通知
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('flowListUpdated', {
          detail: { 
            flowList: data,
            timestamp: Date.now(),
            source: 'flow-creator'
          }
        }));
      }, 100);
    } catch (error) {
      console.error('❁Eフロー一覧取得エラー:', error);
      toast({
        title: "取得エラー",
        description: "フロー一覧の取得に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFlowList(false);
      setIsFetching(false);
    }
  }, [toast, isFetching]);

  // 初期化時にフロー一覧を取得（一度だけ！E
  useEffect(() => {
    fetchFlowList();
  }, []); // 依存�E列を空にして一度だけ実衁E

  // 強制更新イベントリスナ�E
  useEffect(() => {
    const handleForceRefresh = (event: any) => {
      console.log('🔄 強制フロー一覧更新イベント受信');
      fetchFlowList(true);
    };

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
    };
  }, [fetchFlowList]);

  // ファイル選抁E
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // ファイルアチE�EローチE
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // プログレス更新
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/upload`, {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('アチE�Eロードに失敗しました');
      }

      const result = await response.json();

      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);

      toast({
        title: "アチE�Eロード完亁E,
        description: `${selectedFile.name} がアチE�Eロードされました`,
      });

      // フロー一覧を更新
      await fetchFlowList(true);

      // 編雁E��ブに刁E��替ぁE
      setActiveTab('edit');

    } catch (error) {
      console.error('アチE�Eロードエラー:', error);
      toast({
        title: "アチE�Eロードエラー",
        description: "ファイルのアチE�Eロードに失敗しました",
        variant: "destructive"
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

  // フロー編雁E��のチE�Eタ読み込み
  const loadFlowForEdit = async (flowId: string) => {
    try {
      console.log('🔄 フロー編雁E��ータ読み込み開姁E', flowId);

      // 🎯 フロー一覧からファイル惁E��を取征E
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('フローが見つかりません: ' + flowId);
      }

      console.log('📋 対象フロー惁E��:', targetFlow);

      // 🎯 ファイルパスを確実に設定！EroubleshootingチE��レクトリ限定！E
      const fileName = targetFlow.fileName.endsWith('.json') ? targetFlow.fileName : flowId + '.json';
      const filePath = 'knowledge-base/troubleshooting/' + fileName;
      setSelectedFilePath(filePath);
      console.log('📁 編雁E��象ファイルパス設宁E', filePath);

      // 🚫 ブラウザキャチE��ュを強制クリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャチE��ュクリア完亁E);
      }

      // 🎯 統一されたAPIエンド�Eイントで直接取征E
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/${flowId}?ts=${timestamp}&_r=${randomId}`;

      console.log('🌐 API呼び出ぁE', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Fresh': 'true'
        }
      });

      console.log('📡 APIレスポンス状慁E', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁EAPI エラー:', errorText);
        throw new Error('フローチE�Eタの取得に失敗しました (' + response.status + '): ' + errorText);
      }

      const responseData = await response.json();
      console.log('📊 生APIレスポンス:', responseData);

      const data = responseData.success && responseData.data ? responseData.data : responseData;
      console.log('🔍 処琁E��象チE�Eタ:', data);

      // 🎯 チE��チE��: APIレスポンスの詳細確誁E
      console.log('🔍 APIレスポンス詳細:', {
        responseData: responseData,
        data: data,
        hasSlides: !!data.slides,
        hasSteps: !!data.steps,
        slidesLength: data.slides?.length || 0,
        stepsLength: data.steps?.length || 0,
        slidesType: typeof data.slides,
        stepsType: typeof data.steps,
        dataKeys: Object.keys(data)
      });

      // 🎯 フロー一覧のチE�Eタ構造をエチE��ター用に変換�E�Elides/steps統一�E�E
      const sourceSteps = data.steps || data.slides || [];
      console.log('📋 ソーススチE��チE', sourceSteps);
      
      // チE�Eタが空の場合�E処琁E
      if (!sourceSteps || sourceSteps.length === 0) {
        console.warn('⚠�E�EフローチE�EタにスチE��プが含まれてぁE��せん');
        toast({
          title: "チE�Eタ警呁E,
          description: 'フローチE�EタにスチE��プが含まれてぁE��せん',
          variant: "destructive"
        });
      }

      const editorData = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        triggerKeywords: data.trigger || data.triggerKeywords || [],
        steps: sourceSteps.map((step, index) => {
          console.log(`🔧 スチE��プ[${index}]処琁E��姁E`, step);
          
          // 画像情報の処琁E��改喁E
          let processedImages = [];
          
          // 新しい 'images' 配�Eが存在する場吁E
          if (step.images && Array.isArray(step.images)) {
            console.log(`📸 スチE��プ[${index}]で新しいimages形式を検�E:`, step.images);
            processedImages = step.images.map(img => ({
              url: convertImageUrl(img.url),
              fileName: img.fileName
            }));
          }
          // 古ぁE��式�E画像情報がある場合、新しい形式に変換
          else if (step.imageUrl && step.imageFileName) {
            console.log(`🔧 スチE��プ[${index}]を古ぁE��式から変換:`, { imageUrl: step.imageUrl, imageFileName: step.imageFileName });
            processedImages = [{
              url: convertImageUrl(step.imageUrl),
              fileName: step.imageFileName
            }];
          }
          // 古ぁE��式�EimageUrlのみの場吁E
          else if (step.imageUrl) {
            console.log(`🔧 スチE��プ[${index}]をimageUrlのみから変換:`, { imageUrl: step.imageUrl });
            const fileName = step.imageUrl.split('/').pop() || 'unknown.jpg';
            processedImages = [{
              url: convertImageUrl(step.imageUrl),
              fileName: fileName
            }];
          }

          const processedStep = {
            ...step,
            // description と message の同期
            description: step.description || step.message || '',
            message: step.message || step.description || '',
            // 画像情報を確実に設宁E
            images: processedImages,
            // 古ぁE�Eロパティを削除
            imageUrl: undefined,
            imageFileName: undefined,
            // オプションの整合性確俁E
            options: (step.options || []).map(option => ({
              text: option.text || '',
              nextStepId: option.nextStepId || '',
              isTerminal: Boolean(option.isTerminal),
              conditionType: option.conditionType || 'other',
              condition: option.condition || ''
            }))
          };

          console.log(`✁EスチE��プ[${index}]処琁E��亁E`, processedStep);
          return processedStep;
        }),
        updatedAt: data.createdAt || data.updatedAt || new Date().toISOString()
      };

      console.log('🎯 最終的なエチE��ターチE�Eタ:', editorData);

      // チE�Eタ整合性の厳寁E��ェチE��
      console.log('取得したフローチE�Eタ:', {
        requestedId: flowId,
        retrievedId: editorData.id,
        title: editorData.title,
        stepsCount: editorData.steps?.length || 0,
        fileName: targetFlow.fileName,
        filePath: filePath,
        allStepIds: editorData.steps?.map(s => s.id) || [],
        stepsWithImages: editorData.steps?.filter(s => s.images && s.images.length > 0).length || 0,
        timestamp: Date.now(),
        dataSource: 'emergency-flow-api'
      });

      // スチE��プ数不一致の警告（任意�EスチE��プ数を許可�E�E
      if (editorData.steps?.length === 0) {
        console.warn('スチE��プデータが存在しません');
        toast({
          title: "チE�Eタ警呁E,
          description: 'フローチE�EタにスチE��プが含まれてぁE��せん',
          variant: "destructive"
        });
      }

      // 🎯 編雁E��面の状態を更新
      console.log('🔄 状態更新開姁E);
      setCurrentFlowData(editorData);
      setSelectedFlowForEdit(flowId);
      
      console.log('🔄 状態更新完亁E', {
        selectedFlowForEdit: flowId,
        currentFlowData: editorData
      });
      
      // 強制皁E��再レンダリングをトリガー
      setTimeout(() => {
        console.log('🔄 強制再レンダリング実衁E);
        setCurrentFlowData({...editorData});
      }, 100);

      console.log('✁Eフロー編雁E��ータ読み込み完亁E);
    } catch (error) {
      console.error('❁Eフロー編雁E��ータ読み込みエラー:', error);
      toast({
        title: "エラー",
        description: `フローチE�Eタの読み込みに失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  // フロー削除 - 物琁E��ァイル削除とフロー一覧からの完�E除去
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      console.log('🗑�E�Eフロー削除開姁E ' + flowId);

      // 削除対象のフロー惁E��を取征E
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('削除対象のフローが見つかりません');
      }

      console.log('🎯 削除対象:', {
        id: targetFlow.id,
        title: targetFlow.title,
        fileName: targetFlow.fileName
      });

      // 削除APIを呼び出ぁE
      const fileName = targetFlow.fileName || flowId + '.json';
      const url = `/api/emergency-flow/${flowId}?fileName=${encodeURIComponent(fileName)}`;
      console.log('🌐 削除API呼び出ぁE', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 削除レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
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

      // 成功メチE��ージを表示
      toast({
        title: "削除完亁E,
        description: `、E{targetFlow.title}」が正常に削除されました`,
      });

      // 削除されたアイチE��が現在編雁E��の場合�Eクリア
      if (selectedFlowForEdit === flowId) {
        setSelectedFlowForEdit(null);
        setCurrentFlowData(null);
        setSelectedFilePath(null);
      }

      // フロー一覧から削除されたアイチE��を即座に除去
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowId);
        console.log('📋 フロー一覧から除去: ' + flowId + ' (残り: ' + filteredList.length + '件)');
        return filteredList;
      });

      // サーバ�Eから最新のフロー一覧を強制取征E
      console.log('🔄 フロー一覧を�E取得中...');
      await fetchFlowList(true);

      // 他�Eコンポ�Eネントに削除完亁E��通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowDeleted', {
          detail: { deletedId: flowId, deletedTitle: targetFlow.title }
        }));
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList'));
      }

    } catch (error) {
      console.error('❁E削除エラー:', error);
      const errorMessage = error instanceof Error ? error.message : "フローの削除に失敗しました";
      toast({
        title: "削除エラー",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setFlowToDelete(null);
    }
  };

  // フロー保存コールバック
  const handleFlowSave = async (savedData: FlowData) => {
    try {
      console.log('💾 フロー保存開姁E', {
        id: savedData.id,
        title: savedData.title,
        stepsCount: savedData.steps?.length
      });

      // 画像URLの存在確誁E
      const stepsWithImages = savedData.steps.map(step => {
        // 新しい images 配�Eを優先的に使用する
        const images = step.images?.map(img => ({
          url: img.url && img.url.trim() !== '' ? img.url : undefined,
          fileName: img.fileName && img.fileName.trim() !== '' ? img.fileName : undefined
        })).filter(img => img.url && img.fileName);

        if (images && images.length > 0) {
          console.log('🖼�E�E画像情報確誁E', {
            stepId: step.id,
            images: images
          });
        }
        
        // 古ぁE�Eロパティを削除し、新しい `images` プロパティのみにする
        const { imageUrl, imageFileName, ...restOfStep } = step;
        return {
          ...restOfStep,
          images: images && images.length > 0 ? images : undefined,
        };
      });

      // フローチE�Eタを更新
      const updatedFlowData = {
        ...savedData,
        steps: stepsWithImages,
        updatedAt: new Date().toISOString()
      };

      console.log('📤 送信チE�Eタ:', {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length
      });

      // APIにチE�Eタを送信
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${updatedFlowData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFlowData),
      });

      console.log('📡 レスポンス状慁E', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❁EAPI エラー:', errorText);
        throw new Error(`保存に失敗しました: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✁Eフロー保存完亁E', {
        success: result.success,
        data: result.data,
        stepsCount: updatedFlowData.steps.length,
        stepsWithImages: updatedFlowData.steps.filter(s => s.images && s.images.length > 0).length
      });

      // 成功メチE��ージを表示
      toast({
        title: "保存完亁E,
        description: "フローが正常に保存されました",
      });

      // フロー一覧を更新
      await fetchFlowList(true);

    } catch (error) {
      console.error('❁Eフロー保存エラー:', error);
      toast({
        title: "保存エラー",
        description: error instanceof Error ? error.message : "フローの保存に失敗しました",
        variant: "destructive"
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
    if (slide && slide.type === 'decision' && (!slide.conditions || slide.conditions.length < 4)) {
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

  const handleConditionEdit = (slideId: string, conditionId: string, text: string, nextSlideId?: string) => {
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
          conditions: (slide.conditions || []).filter(c => c.id !== conditionId),
        };
      }
      return slide;
    });
    
    setSlides(updatedSlides);
  };

  const handleSave = () => {
    // idがUUID形式でなければ新規発衁E
    let validId = initialData?.id || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validId)) {
      validId = uuidv4();
    }
    // triggerKeywordsがundefinedなら空配�E
    const triggerKeywords = Array.isArray(initialData?.triggerKeywords) ? initialData.triggerKeywords : [];
    onSave({
      id: validId,
      title,
      description,
      triggerKeywords,
      steps: slides,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleImageUpload = async (stepId: string, file: File) => {
    try {
      // 重褁E��ェチE��: 同じファイル名�E画像が既に存在するかチェチE��
      if (currentFlowData) {
        const stepToUpdate = currentFlowData.steps.find(step => step.id === stepId);
        if (stepToUpdate && stepToUpdate.images) {
          const existingImage = stepToUpdate.images.find(img => 
            img.fileName === file.name || 
            img.fileName === file.name.replace(/\.[^/.]+$/, '') // 拡張子を除ぁE��比輁E
          );
          
          if (existingImage) {
            const confirmReplace = window.confirm(
              `同じファイル名�E画僁E"${file.name}" が既に存在します、En` +
              `既存�E画像を置き換えますか�E�`
            );
            
            if (!confirmReplace) {
              return;
            }
            
            // 既存�E画像を削除
            const updatedSteps = currentFlowData.steps.map(step => {
              if (step.id === stepId) {
                const updatedImages = step.images?.filter(img => img.fileName !== existingImage.fileName) || [];
                return { ...step, images: updatedImages };
              }
              return step;
            });
            
            setCurrentFlowData({
              ...currentFlowData,
              steps: updatedSteps
            });
          }
        }
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('stepId', stepId);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/upload-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('画像�EアチE�Eロードに失敗しました');
      }

      const result = await response.json();

      if (result.success && currentFlowData) {
        // imageFileNameが返されてぁE��ぁE��合�EfileNameを使用
        const imageFileName = result.imageFileName || result.fileName;

        const newImage = {
          url: result.imageUrl,
          fileName: imageFileName
        };

        // 重褁E��像�E場合�E通知
        if (result.isDuplicate) {
          console.log('🔄 重褁E��像を検�E、既存ファイルを使用:', result.fileName);
        }

        // 該当するスチE��プ�Eimages配�Eを更新
        const updatedSteps = currentFlowData.steps.map(step => {
          if (step.id === stepId) {
            const currentImages = step.images || [];
            if (currentImages.length < 3) {
              return {
                ...step,
                images: [...currentImages, newImage]
              };
            }
          }
          return step;
        });

        // フローチE�Eタを更新
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps
        });

        // 自動保存を実衁E
        handleSave();

        const message = result.isDuplicate 
          ? `重褁E��像を検�Eしました。既存�E画僁E"${result.fileName}" を使用します。`
          : "画像が正常にアチE�Eロードされました";

        toast({
          title: "画像アチE�Eロード完亁E,
          description: message,
        });
      }
    } catch (error) {
      console.error('画像アチE�Eロードエラー:', error);
      toast({
        title: "エラー",
        description: "画像�EアチE�Eロードに失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleImageRemove = async (slideId: string, imageIndex: number) => {
    if (!currentFlowData) return;

    const step = currentFlowData.steps.find(s => s.id === slideId);
    if (!step || !step.images || imageIndex < 0 || imageIndex >= step.images.length) {
      return;
    }

    const imageToRemove = step.images[imageIndex];

    const confirmDelete = window.confirm(
      `画僁E"${imageToRemove.fileName}" を削除しますか�E�\nサーバ�Eからファイルが削除され、この操作�E允E��戻せません。`
    );

    if (confirmDelete) {
      try {
        // APIを呼び出してサーバ�Eから画像を削除
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/image/${imageToRemove.fileName}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'サーバ�E上�E画像ファイル削除に失敗しました、E);
        }

        // フロントエンド�E状態を更新
        const updatedSteps = currentFlowData.steps.map(s => {
          if (s.id === slideId) {
            const updatedImages = s.images?.filter((_, i) => i !== imageIndex) || [];
            return { ...s, images: updatedImages };
          }
          return s;
        });
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps
        });

        // 変更を保孁E
        handleSave();
        
        toast({
          title: "画像削除完亁E,
          description: `画僁E"${imageToRemove.fileName}" を削除しました。`
        });

      } catch (error) {
        console.error('画像削除エラー:', error);
        toast({
          title: "エラー",
          description: `画像�E削除に失敗しました: ${error instanceof Error ? error.message : "未知のエラー"}`,
          variant: "destructive"
        });
      }
    }
  };

  const renderSlideContent = (slide: Slide) => {
      return (
        <div className="space-y-4">
        <div className="flex items-center gap-6">
          <Input
            value={slide.content}
            onChange={(e) => {
              const updatedSlides = slides.map(s =>
                s.id === slide.id ? { ...s, content: e.target.value } : s
              );
              setSlides(updatedSlides);
            }}
            placeholder="スライド�E冁E��を�E劁E
            className="text-base-2x h-12"
          />
          <div className="flex items-center gap-3">
            <input
              type="file"
              id={`image-upload-${slide.id}`}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(slide.id, file);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`image-upload-${slide.id}`)?.click()}
              className="text-base-2x h-12 px-4"
            >
              <Upload className="w-6 h-6 mr-2" />
              画像アチE�EローチE
            </Button>
          </div>
        </div>
        
        {/* 画像表示部刁E��改喁E*/}
        {currentFlowData && (() => {
          const step = currentFlowData.steps.find(s => s.id === slide.id);
          if (step && step.images && step.images.length > 0) {
            return (
              <div className="mt-6">
                <Label className="text-base-2x font-medium">アチE�Eロード済み画僁E</Label>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {step.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={convertImageUrl(image.url)}
                        alt={image.fileName}
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          console.error('画像読み込みエラー:', image.url);
                          e.currentTarget.style.display = 'none';
                          // エラー表示を追加
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'w-full h-32 bg-red-100 border border-red-300 text-red-700 flex items-center justify-center text-base-2x rounded';
                          errorDiv.textContent = '画像読み込み失敁E;
                          e.currentTarget.parentNode?.appendChild(errorDiv);
                        }}
                        onLoad={() => {
                          console.log('画像読み込み成功:', image.fileName);
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full opacity-80 group-hover:opacity-100"
                        onClick={() => handleImageRemove(slide.id, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-base-2x p-2 truncate rounded-b">
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
          <div className="space-y-3">
            {slide.conditions?.map((condition) => (
              <div key={condition.id} className="flex items-center gap-3">
                      <Input
                        value={condition.text}
                        onChange={(e) => handleConditionEdit(slide.id, condition.id, e.target.value, condition.nextSlideId)}
                        placeholder="条件を�E劁E.."
                        className="text-base-2x h-12"
                      />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 h-12 w-12"
                      onClick={() => handleConditionDelete(slide.id, condition.id)}
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">応急処置フロー管琁E/h2>
        <Button onClick={() => fetchFlowList(true)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">新規作�E</TabsTrigger>
          <TabsTrigger value="upload">アチE�EローチE/TabsTrigger>
          <TabsTrigger value="edit" disabled={!flowList.length}>編雁E/TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新規フロー作�E
              </CardTitle>
              <CardDescription>
                フローエチE��ターを使用して新しい応急処置フローを作�EしまぁE
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyFlowEditor flowData={null} onSave={handleFlowSave} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                ファイルアチE�EローチE
              </CardTitle>
              <CardDescription>
                既存�Eフローファイル�E�ESON形式）をアチE�EロードしまぁE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto h-8 w-8 text-blue-500" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FolderOpen className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-500">JSONファイルを選択してください</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  ファイル選抁E
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center">アチE�Eロード中... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'アチE�Eロード中...' : 'アチE�EローチE}
                </Button>
                {selectedFile && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* フロー一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>フロー一覧</CardTitle>
                <CardDescription>
                  編雁E��るフローを選択してください ({flowList.length}件)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* チE��チE��惁E��表示 */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">チE��チE��惁E��</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p>フロー一覧数: {flowList.length}</p>
                    <p>読み込み中: {isLoadingFlowList.toString()}</p>
                    <p>選択中フロー: {selectedFlowForEdit || 'なぁE}</p>
                    <p>現在のフローチE�Eタ: {currentFlowData ? 'あり' : 'なぁE}</p>
                    <p>フロー一覧詳細: {flowList.map(f => f.id).join(', ')}</p>
                  </div>
                </div>

                {isLoadingFlowList ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">読み込み中...</p>
                  </div>
                ) : flowList.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">フローがありません</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchFlowList(true)}
                      className="mt-2"
                    >
                      再読み込み
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {flowList.map((flow) => (
                      <div
                        key={flow.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFlowForEdit === flow.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1"
                            onClick={() => {
                              console.log('🖱�E�Eフロー選抁E', flow.id, flow.title);
                              loadFlowForEdit(flow.id);
                            }}
                          >
                            <h4 className="font-medium text-sm">{flow.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {flow.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {flow.fileName}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                ID: {flow.id}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlowToDelete(flow);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* フロー編雁E��リア */}
            <Card>
              <CardHeader>
                <CardTitle>フロー編雁E/CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFlowForEdit && currentFlowData ? (
                  <>
                    {console.log('🎯 EmergencyFlowEditorに渡すデータ:', {
                      selectedFlowForEdit,
                      currentFlowDataId: currentFlowData.id,
                      currentFlowDataTitle: currentFlowData.title,
                      selectedFilePath,
                      hasSteps: !!currentFlowData.steps,
                      stepsLength: currentFlowData.steps?.length || 0,
                      stepsDetails: currentFlowData.steps?.map(s => ({ id: s.id, title: s.title, type: s.type })) || [],
                      timestamp: Date.now()
                    })}
                    
                    {/* チE��チE��惁E��表示 */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">チE�Eタ確誁E/h4>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>選択されたフローID: {selectedFlowForEdit}</p>
                        <p>フローチE�EタID: {currentFlowData.id}</p>
                        <p>フロータイトル: {currentFlowData.title}</p>
                        <p>スチE��プ数: {currentFlowData.steps?.length || 0}</p>
                        <p>ファイルパス: {selectedFilePath}</p>
                      </div>
                    </div>
                    
                    <EmergencyFlowEditor
                      key={`${currentFlowData.id}-${Date.now()}`}
                      flowData={currentFlowData}
                      currentTab="slides"
                      onSave={handleFlowSave}
                      onTabChange={() => {}}
                      selectedFilePath={selectedFilePath}
                    />
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">編雁E��るフローを選択してください</p>
                    {console.log('📝 フロー編雁E��面の状慁E', {
                      selectedFlowForEdit,
                      hasCurrentFlowData: !!currentFlowData,
                      currentFlowDataId: currentFlowData?.id,
                      currentFlowDataTitle: currentFlowData?.title,
                      timestamp: Date.now()
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フローを削除しますか�E�E/AlertDialogTitle>
            <AlertDialogDescription>
              {'、E + flowToDelete?.title + '」を削除します。この操作�E取り消せません、E}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => flowToDelete && deleteFlow(flowToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmergencyFlowCreator;
