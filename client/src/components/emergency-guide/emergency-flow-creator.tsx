import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { Upload, X, File, FileText, Plus, FolderOpen, Trash2, RefreshCw } from 'lucide-react';
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




import { v4 as uuidv4 } from 'uuid';
import { convertImageUrl, normalizeImages } from '../../lib/utils';

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

interface ImageInfo {
  url: string;
  fileName: string;
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

  // 状態管理
  // use string here to match Tabs onValueChange signature and avoid unnecessary casting
  const [activeTab, setActiveTab] = useState<string>('new');
  const [flowList, setFlowList] = useState<FlowFile[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowForEdit, setSelectedFlowForEdit] = useState<string | null>(null);
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  // make this undefined/optional so it matches component props that accept string | undefined
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
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
      console.log('🔄 応急処置データ一覧の取得を開始します (forceRefresh: ' + forceRefresh + ')');

      // 🧹 キャッシュクリア（古いデータの完全削除）
      if (forceRefresh && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('🧹 全キャッシュ（古いデータ含む）クリア完了');
        } catch (cacheError) {
          console.warn('⚠️ キャッシュクリアエラー:', cacheError);
        }
      }

      // キャッシュバスターパラメータを追加
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list?ts=${timestamp}&_r=${randomId}${forceRefresh ? '&force=true' : ''}`;

      console.log('🌐 フロー一覧API呼び出し:', url);
      console.log('🔧 API設定:', {
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

      console.log('📡 フロー一覧APIレスポンス状態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ フロー一覧API エラー:', errorText);
        throw new Error('フロー一覧の取得に失敗しました: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();
      console.log('📊 フロー一覧生APIレスポンス:', data);

      // APIレスポンスの構造に合わせてデータを処理
      const flows = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log('全フローデータを表示: ' + flows.length + '件（フィルタリング無効）');
      console.log('フローデータ詳細:', flows);
      setFlowList(flows);

      // 他のコンポーネントにフロー一覧更新を通知
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
      console.error('❌ フロー一覧取得エラー:', error);
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

  // 初期化時にフロー一覧を取得（一度だけ）
  useEffect(() => {
    fetchFlowList();
  }, []); // 依存配列を空にして一度だけ実行

  // 強制更新イベントリスナー
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

  // ファイル選択
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // ファイルアップロード
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
        throw new Error('アップロードに失敗しました');
      }

      const result = await response.json();

      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);

      toast({
        title: "アップロード完了",
        description: `${selectedFile.name} がアップロードされました`,
      });

      // フロー一覧を更新
      await fetchFlowList(true);

      // 編集タブに切り替え
      setActiveTab('edit');

    } catch (error) {
      console.error('アップロードエラー:', error);
      toast({
        title: "アップロードエラー",
        description: "ファイルのアップロードに失敗しました",
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

  // フロー編集用のデータ読み込み
  const loadFlowForEdit = async (flowId: string) => {
    try {
      console.log('🔄 フロー編集データ読み込み開始:', flowId);

      // 🎯 フロー一覧からファイル情報を取得
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('フローが見つかりません: ' + flowId);
      }

      console.log('📋 対象フロー情報:', targetFlow);

      // 🎯 ファイルパスを確実に設定（troubleshootingディレクトリ限定）
      const fileName = targetFlow.fileName.endsWith('.json') ? targetFlow.fileName : flowId + '.json';
      const filePath = 'knowledge-base/troubleshooting/' + fileName;
      setSelectedFilePath(filePath);
      console.log('📁 編集対象ファイルパス設定:', filePath);

      // 🚫 ブラウザキャッシュを強制クリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャッシュクリア完了');
      }

      // 🎯 統一されたAPIエンドポイントで直接取得
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/${flowId}?ts=${timestamp}&_r=${randomId}`;

      console.log('🌐 API呼び出し:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Fresh': 'true'
        }
      });

      console.log('📡 APIレスポンス状態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API エラー:', errorText);
        throw new Error('フローデータの取得に失敗しました (' + response.status + '): ' + errorText);
      }

      const responseData = await response.json();
      console.log('📊 生APIレスポンス:', responseData);

      const data = responseData.success && responseData.data ? responseData.data : responseData;
      console.log('🔍 処理対象データ:', data);

      // 🎯 デバッグ: APIレスポンスの詳細確認
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

      // 🎯 フロー一覧のデータ構造をエディター用に変換（slides/steps統一）
      const sourceSteps = data.steps || data.slides || [];
      console.log('📋 ソースステップ:', sourceSteps);
      
      // データが空の場合の処理
      if (!sourceSteps || sourceSteps.length === 0) {
        console.warn('⚠️ フローデータにステップが含まれていません');
        toast({
          title: "データ警告",
          description: 'フローデータにステップが含まれていません',
          variant: "destructive"
        });
      }

      const editorData = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        triggerKeywords: data.trigger || data.triggerKeywords || [],
        // annotate step/index to avoid implicit any errors
        steps: sourceSteps.map((step: any, index: number) => {
          console.log(`🔧 ステップ[${index}]処理開始:`, step);

          // 画像情報の処理を改善 -> normalize to string[] of URLs
          let processedImages: string[] = [];
          // 新しい 'images' 配列が存在する場合
          if (step.images && Array.isArray(step.images)) {
            console.log(`📸 ステップ[${index}]で新しいimages形式を検出:`, step.images);
            processedImages = step.images
              .map((img: any) => typeof img === 'string' ? img : (img && (img.url || img.path || img.imageUrl)))
              .filter((u: any) => typeof u === 'string' && u.length > 0)
              .map((u: string) => convertImageUrl(u));
          }
          // 古い形式の画像情報がある場合、新しい形式に変換
          else if (step.imageUrl && step.imageFileName) {
            console.log(`🔧 ステップ[${index}]を古い形式から変換:`, { imageUrl: step.imageUrl, imageFileName: step.imageFileName });
            processedImages = [convertImageUrl(step.imageUrl)];
          }
          // 古い形式のimageUrlのみの場合
          else if (step.imageUrl) {
            console.log(`🔧 ステップ[${index}]をimageUrlのみから変換:`, { imageUrl: step.imageUrl });
            processedImages = [convertImageUrl(step.imageUrl)];
          }

          const processedStep = {
            ...step,
            // description と message の同期
            description: step.description || step.message || '',
            message: step.message || step.description || '',
            // 画像情報を確実に設定 (normalized string[])
            images: normalizeImages(processedImages),
            // 古いプロパティを削除
            imageUrl: undefined,
            imageFileName: undefined,
            // オプションの整合性確保
            options: (step.options || []).map((option: any) => ({
              text: option.text || '',
              nextStepId: option.nextStepId || '',
              isTerminal: Boolean(option.isTerminal),
              conditionType: option.conditionType || 'other',
              condition: option.condition || ''
            }))
          };

          console.log(`✅ ステップ[${index}]処理完了:`, processedStep);
          return processedStep;
        }),
  updatedAt: data.createdAt || data.updatedAt || new Date().toISOString()
      };

      console.log('🎯 最終的なエディターデータ:', editorData);

      // データ整合性の厳密チェック
      console.log('取得したフローデータ:', {
        requestedId: flowId,
        retrievedId: editorData.id,
        title: editorData.title,
        stepsCount: editorData.steps?.length || 0,
        fileName: targetFlow.fileName,
        filePath: filePath,
  allStepIds: editorData.steps?.map((s: any) => s.id) || [],
  stepsWithImages: editorData.steps?.filter((s: any) => s.images && s.images.length > 0).length || 0,
        timestamp: Date.now(),
        dataSource: 'emergency-flow-api'
      });

      // ステップ数不一致の警告（任意のステップ数を許可）
      if (editorData.steps?.length === 0) {
        console.warn('ステップデータが存在しません');
        toast({
          title: "データ警告",
          description: 'フローデータにステップが含まれていません',
          variant: "destructive"
        });
      }

      // 🎯 編集画面の状態を更新
      console.log('🔄 状態更新開始');
      setCurrentFlowData(editorData);
      setSelectedFlowForEdit(flowId);
      
      console.log('🔄 状態更新完了:', {
        selectedFlowForEdit: flowId,
        currentFlowData: editorData
      });
      
      // 強制的に再レンダリングをトリガー
      setTimeout(() => {
        console.log('🔄 強制再レンダリング実行');
        setCurrentFlowData({...editorData});
      }, 100);

      console.log('✅ フロー編集データ読み込み完了');
    } catch (error) {
      console.error('❌ フロー編集データ読み込みエラー:', error);
      toast({
        title: "エラー",
        description: `フローデータの読み込みに失敗しました: ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    }
  };

  // フロー削除 - 物理ファイル削除とフロー一覧からの完全除去
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      console.log('🗑️ フロー削除開始: ' + flowId);

      // 削除対象のフロー情報を取得
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new Error('削除対象のフローが見つかりません');
      }

      console.log('🎯 削除対象:', {
        id: targetFlow.id,
        title: targetFlow.title,
        fileName: targetFlow.fileName
      });

      // 削除APIを呼び出し
      const fileName = targetFlow.fileName || flowId + '.json';
      const url = `/api/emergency-flow/${flowId}?fileName=${encodeURIComponent(fileName)}`;
      console.log('🌐 削除API呼び出し:', url);
      
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
          console.log('❌ 削除エラーデータ:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.warn('⚠️ エラーレスポンスの解析に失敗:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ 削除レスポンス:', result);

      // 成功メッセージを表示
      toast({
        title: "削除完了",
        description: `「${targetFlow.title}」が正常に削除されました`,
      });

      // 削除されたアイテムが現在編集中の場合はクリア
      if (selectedFlowForEdit === flowId) {
        setSelectedFlowForEdit(null);
        setCurrentFlowData(null);
        setSelectedFilePath(undefined);
      }

      // フロー一覧から削除されたアイテムを即座に除去
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowId);
        console.log('📋 フロー一覧から除去: ' + flowId + ' (残り: ' + filteredList.length + '件)');
        return filteredList;
      });

      // サーバーから最新のフロー一覧を強制取得
      console.log('🔄 フロー一覧を再取得中...');
      await fetchFlowList(true);

      // 他のコンポーネントに削除完了を通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowDeleted', {
          detail: { deletedId: flowId, deletedTitle: targetFlow.title }
        }));
        window.dispatchEvent(new CustomEvent('forceRefreshFlowList'));
      }

    } catch (error) {
      console.error('❌ 削除エラー:', error);
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
      console.log('💾 フロー保存開始:', {
        id: savedData.id,
        title: savedData.title,
        stepsCount: savedData.steps?.length
      });

      // 画像URLの存在確認
      const stepsWithImages = savedData.steps.map((step: unknown) => {
        const s = step as any;
        // 新しい images 配列を優先的に使用する
        const images = s.images?.map((img: unknown) => {
          const im = img as any;
          return {
            url: im.url && im.url.trim() !== '' ? im.url : undefined,
            fileName: im.fileName && im.fileName.trim() !== '' ? im.fileName : undefined
          };
        }).filter((img: unknown) => {
          const im = img as any;
          return im.url && im.fileName;
        });

        if (images && images.length > 0) {
          console.log('🖼️ 画像情報確認:', {
            stepId: s.id,
            images: images
          });
        }

        // 古いプロパティを削除し、新しい `images` プロパティのみにする
        const { imageUrl, imageFileName, ...restOfStep } = s as any;
        return {
          ...restOfStep,
          images: images && images.length > 0 ? images : undefined,
        };
      });

      // フローデータを更新
      const updatedFlowData = {
        ...savedData,
        steps: stepsWithImages,
        updatedAt: new Date().toISOString()
      };

      console.log('📤 送信データ:', {
        id: updatedFlowData.id,
        title: updatedFlowData.title,
        stepsCount: updatedFlowData.steps.length
      });

      // APIにデータを送信
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${updatedFlowData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFlowData),
      });

      console.log('📡 レスポンス状態:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API エラー:', errorText);
        throw new Error(`保存に失敗しました: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ フロー保存完了:', {
        success: result.success,
        data: result.data,
        stepsCount: updatedFlowData.steps.length,
        stepsWithImages: updatedFlowData.steps.filter(s => s.images && s.images.length > 0).length
      });

      // 成功メッセージを表示
      toast({
        title: "保存完了",
        description: "フローが正常に保存されました",
      });

      // フロー一覧を更新
      await fetchFlowList(true);

    } catch (error) {
      console.error('❌ フロー保存エラー:', error);
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
    // idがUUID形式でなければ新規発行
    let validId = initialData?.id || '';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validId)) {
      validId = uuidv4();
    }
    // triggerKeywordsがundefinedなら空配列
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
      // 重複チェック: 同じファイル名の画像が既に存在するかチェック
      if (currentFlowData) {
        const stepToUpdate = currentFlowData.steps.find(step => step.id === stepId);
        if (stepToUpdate && stepToUpdate.images) {
          const existingImage = stepToUpdate.images.find((img: ImageInfo) => 
            img.fileName === file.name || 
            img.fileName === file.name.replace(/\.[^/.]+$/, '') // 拡張子を除いた比較
          );
          
          if (existingImage) {
            const confirmReplace = window.confirm(
              `同じファイル名の画像 "${file.name}" が既に存在します。\n` +
              `既存の画像を置き換えますか？`
            );
            
            if (!confirmReplace) {
              return;
            }
            
            // 既存の画像を削除
            const updatedSteps = currentFlowData.steps.map(step => {
              if (step.id === stepId) {
                const updatedImages = step.images?.filter((img: ImageInfo) => img.fileName !== existingImage.fileName) || [];
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
        throw new Error('画像のアップロードに失敗しました');
      }

      const result = await response.json();

      if (result.success && currentFlowData) {
        // imageFileNameが返されていない場合はfileNameを使用
        const imageFileName = result.imageFileName || result.fileName;

        const newImage = {
          url: result.imageUrl,
          fileName: imageFileName
        };

        // 重複画像の場合は通知
        if (result.isDuplicate) {
          console.log('🔄 重複画像を検出、既存ファイルを使用:', result.fileName);
        }

        // 該当するステップのimages配列を更新
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

        // フローデータを更新
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps
        });

        // 自動保存を実行
        handleSave();

        const message = result.isDuplicate 
          ? `重複画像を検出しました。既存の画像 "${result.fileName}" を使用します。`
          : "画像が正常にアップロードされました";

        toast({
          title: "画像アップロード完了",
          description: message,
        });
      }
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
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
      `画像 "${imageToRemove.fileName}" を削除しますか？\nサーバーからファイルが削除され、この操作は元に戻せません。`
    );

    if (confirmDelete) {
      try {
        // APIを呼び出してサーバーから画像を削除
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/image/${imageToRemove.fileName}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'サーバー上の画像ファイル削除に失敗しました。');
        }

        // フロントエンドの状態を更新
        const updatedSteps = currentFlowData.steps.map((s: any) => {
          if (s.id === slideId) {
            const updatedImages = s.images?.filter((_: any, i: number) => i !== imageIndex) || [];
            return { ...s, images: updatedImages };
          }
          return s;
        });
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps
        });

        // 変更を保存
        handleSave();
        
        toast({
          title: "画像削除完了",
          description: `画像 "${imageToRemove.fileName}" を削除しました。`
        });

      } catch (error) {
        console.error('画像削除エラー:', error);
        toast({
          title: "エラー",
          description: `画像の削除に失敗しました: ${error instanceof Error ? error.message : "未知のエラー"}`,
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
            placeholder="スライドの内容を入力"
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
              画像アップロード
            </Button>
          </div>
        </div>
        
        {/* 画像表示部分を改善 */}
        {currentFlowData && (() => {
          const step = currentFlowData.steps.find(s => s.id === slide.id);
          if (step && step.images && step.images.length > 0) {
            return (
              <div className="mt-6">
                <Label className="text-base-2x font-medium">アップロード済み画像:</Label>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {step.images.map((image: any, index: number) => (
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
                          errorDiv.textContent = '画像読み込み失敗';
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
                        placeholder="条件を入力..."
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
        <h2 className="text-xl font-bold">応急処置フロー管理</h2>
        <Button onClick={() => fetchFlowList(true)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new">新規作成</TabsTrigger>
          <TabsTrigger value="upload">アップロード</TabsTrigger>
          <TabsTrigger value="edit" disabled={!flowList.length}>編集</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                新規フロー作成
              </CardTitle>
              <CardDescription>
                フローエディターを使用して新しい応急処置フローを作成します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyFlowEditor flowData={null} currentTab={activeTab} onTabChange={setActiveTab} onSave={handleFlowSave} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                ファイルアップロード
              </CardTitle>
              <CardDescription>
                既存のフローファイル（JSON形式）をアップロードします
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
                  ファイル選択
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center">アップロード中... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'アップロード中...' : 'アップロード'}
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
                  編集するフローを選択してください ({flowList.length}件)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* デバッグ情報表示 */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">デバッグ情報</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p>フロー一覧数: {flowList.length}</p>
                    <p>読み込み中: {isLoadingFlowList.toString()}</p>
                    <p>選択中フロー: {selectedFlowForEdit || 'なし'}</p>
                    <p>現在のフローデータ: {currentFlowData ? 'あり' : 'なし'}</p>
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
                              console.log('🖱️ フロー選択:', flow.id, flow.title);
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

            {/* フロー編集エリア */}
            <Card>
              <CardHeader>
                <CardTitle>フロー編集</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFlowForEdit && currentFlowData ? (
                  <>
                    {(() => {
                      // Pre-render debug logs (safe — returns null)
                      console.log('🎯 EmergencyFlowEditorに渡すデータ:', {
                        selectedFlowForEdit,
                        currentFlowDataId: currentFlowData.id,
                        currentFlowDataTitle: currentFlowData.title,
                        selectedFilePath,
                        hasSteps: !!currentFlowData.steps,
                        stepsLength: currentFlowData.steps?.length || 0,
                        stepsDetails: currentFlowData.steps?.map((s: any) => ({ id: s.id, title: s.title, type: s.type })) || [],
                        timestamp: Date.now()
                      });

                      return null;
                    })()}
                    {/* debug logs moved out of JSX to avoid returning void in render */}
                    
                    {/* デバッグ情報表示 */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">データ確認</h4>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>選択されたフローID: {selectedFlowForEdit}</p>
                        <p>フローデータID: {currentFlowData.id}</p>
                        <p>フロータイトル: {currentFlowData.title}</p>
                        <p>ステップ数: {currentFlowData.steps?.length || 0}</p>
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
                    <p className="text-gray-500">編集するフローを選択してください</p>
                    {/* debug logs moved out of JSX to avoid returning void in render */}
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
            <AlertDialogTitle>フローを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {'「' + flowToDelete?.title + '」を削除します。この操作は取り消せません。'}
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
