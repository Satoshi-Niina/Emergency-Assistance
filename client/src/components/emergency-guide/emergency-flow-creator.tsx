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
  dit,
  dit3,
  File,
  FileText,
  Plus,
  Download,
  FolderOpen,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ye,
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
import mergencyFlowditor from './emergency-flow-editor';
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

interface mergencyFlowCreatorProps {
  initialData?: any;
  onSave: (data: any) => void;
}

const mergencyFlowCreator: React.FC<mergencyFlowCreatorProps> = ({
  initialData,
  onSave,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputlement>(null);
  const hasInitialized = useRef(false);

  // 状態管理
  const [activeTab, setActiveTab] = useState<'new' | 'upload' | 'edit'>('new');
  const [flowList, setFlowList] = useState<FlowFile[]>([]);
  const [isLoadingFlowList, setIsLoadingFlowList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedFlowFordit, setSelectedFlowFordit] = useState<string | null>(
    null
  );
  const [currentFlowData, setCurrentFlowData] = useState<FlowData | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // 削除関連
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<FlowFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [slides, setSlides] = useState<Slide[]>(initialData?.slides || []);

  // フロー一覧を取得する関数
  const fetchFlowList = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsFetching(true);
        setIsLoadingFlowList(true);
        console.log(
          '🔄 応急処置デ�タ一覧の取得を開始しまぁ(forceRefresh: ' +
            forceRefresh +
            ')'
        );

        // 🧹 キャデ��ュクリア��古い��ータの完�削除��
        if (forceRefresh && 'caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('🧹 全キャデ��ュ��古い��ータ含む��クリア完了);
          } catch (cacherror) {
            console.warn('⚠��キャデ��ュクリアエラー:', cacherror);
          }
        }

        // キャデ��ュバスターパラメータを追加
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        
        // buildApiUrlを使用して正しいURLを構築
        const { buildApiUrl } = await import('../../lib/api');
        const url = `${buildApiUrl('/emergency-flow/list')}?ts=${timestamp}&_r=${randomId}${forceRefresh ? '&force=true' : ''}`;

        console.log('🌐 フロー一覧API呼び出し', url);

        const response = await fetch(url, {
          method: 'GT',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            Pragma: 'no-cache',
            xpires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            'X-Force-Refresh': forceRefresh.toString(),
            'X-Timestamp': timestamp.toString(),
          },
        });

        console.log(
          '📡 フロー一覧APIレスポンス状態',
          response.status,
          response.statusText
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌フロー一覧API エラー:', errorText);
          throw new rror(
            'フロー一覧の取得に失敗しました: ' +
              response.status +
              ' - ' +
              errorText
          );
        }

        const data = await response.json();
        console.log('📊 フロー一覧生APIレスポンス:', data);

        // APIレスポンスの構造に合わせてデ�タを�理
        const flows =
          data.success && data.data
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        console.log(
          '全フローデ�タを表示: ' + flows.length + '件��フィルタリング無効��
        );
        console.log('フローデ�タ詳細:', flows);
        setFlowList(flows);

        // 他�コンポ�ネントにフロー一覧更新を通知
        setTimeout(() => {
          window.dispatchvent(
            new Customvent('flowListUpdated', {
              detail: {
                flowList: data,
                timestamp: Date.now(),
                source: 'flow-creator',
              },
            })
          );
        }, 100);
      } catch (error) {
        console.error('❌フロー一覧取得エラー:', error);
        toast({
          title: '取得エラー',
          description: 'フロー一覧の取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingFlowList(false);
        setIsFetching(false);
      }
    },
    [toast]
  );

  // 初期化時にフロー一覧を取得（一度だけ！
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchFlowList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  // 強制更新イベントリスナ�
  useffect(() => {
    const handleForceRefresh = (event: any) => {
      console.log('🔄 強制フロー一覧更新イベント受信');
      fetchFlowList(true);
    };

    window.addEventListener('forceRefreshFlowList', handleForceRefresh);

    return () => {
      window.removeEventListener('forceRefreshFlowList', handleForceRefresh);
    };
  }, [fetchFlowList]);

  // ファイル選抁
  const handleFileSelect = (event: React.Changevent<HTMLInputlement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadedFileName('');
    }
  };

  // ファイルアデ�ローデ
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'エラー',
        description: 'ファイルを選択してください',
        variant: 'destructive',
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
        throw new rror('アデ�ロードに失敗しました');
      }

      const result = await response.json();

      setUploadSuccess(true);
      setUploadedFileName(selectedFile.name);

      toast({
        title: 'アデ�ロード完了,
        description: `${selectedFile.name} がアデ�ロードされました`,
      });

      // フロー一覧を更新
      await fetchFlowList(true);

      // 編集��ブに刁��替ぁ
      setActiveTab('edit');
    } catch (error) {
      console.error('アデ�ロードエラー:', error);
      toast({
        title: 'アデ�ロードエラー',
        description: 'ファイルのアデ�ロードに失敗しました',
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

  // フロー編集��のデ�タ読み込み
  const loadFlowFordit = async (flowId: string) => {
    try {
      console.log('🔄 フロー編集��ータ読み込み開始', flowId);

      // 🎯 フロー一覧からファイル情報��を取得
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new rror('フローが見つかりません: ' + flowId);
      }

      console.log('📋 対象フロー情報��:', targetFlow);

      // 🎯 ファイルパスを確実に設定！roubleshootingデ��レクトリ限定！
      const fileName = targetFlow.fileName.endsWith('.json')
        ? targetFlow.fileName
        : flowId + '.json';
      const filePath = 'knowledge-base/troubleshooting/' + fileName;
      setSelectedFilePath(filePath);
      console.log('📁 編集��象ファイルパス設定', filePath);

      // 🚫 ブラウザキャデ��ュを強制クリア
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 ブラウザキャデ��ュクリア完了);
      }

      // 🎯 統一されたAPIエンド�イントで直接取得
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      
      // buildApiUrlを使用して正しいURLを構築
      const { buildApiUrl } = await import('../../lib/api');
      const apiUrl = `${buildApiUrl(`/emergency-flow/${flowId}`)}?ts=${timestamp}&_r=${randomId}`;

      console.log('🌐 API呼び出し', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GT',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          xpires: 'Thu, 01 Jan 1970 00:00:00 GMT',
          'X-Force-Fresh': 'true',
        },
      });

      console.log(
        '📡 APIレスポンス状態',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌API エラー:', errorText);
        throw new rror(
          'フローデ�タの取得に失敗しました (' +
            response.status +
            '): ' +
            errorText
        );
      }

      const responseData = await response.json();
      console.log('📊 生APIレスポンス:', responseData);

      const data =
        responseData.success && responseData.data
          ? responseData.data
          : responseData;
      console.log('🔍 処理��象デ�タ:', data);

      // 🎯 デ��デ��: APIレスポンスの詳細確認
      console.log('🔍 APIレスポンス詳細:', {
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

      // 🎯 フロー一覧のデ�タ構造をエデ��ター用に変換��lides/steps統一��
      const sourceSteps = data.steps || data.slides || [];
      console.log('📋 ソーススデ��デ', sourceSteps);

      // デ�タが空の場合�処理
      if (!sourceSteps || sourceSteps.length === 0) {
        console.warn('⚠��フローデ�タにスデ��プが含まれてぁ��せん');
        toast({
          title: 'デ�タ警告,
          description: 'フローデ�タにスデ��プが含まれてぁ��せん',
          variant: 'destructive',
        });
      }

      const editorData = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        triggerKeywords: data.trigger || data.triggerKeywords || [],
        steps: sourceSteps.map((step, index) => {
          console.log(`🔧 スデ��プ[${index}]処理��開始`, step);

          // 画像情報の処理��改善
          let processedImages = [];

          // 新しい 'images' 配�が存在する場合
          if (step.images && Array.isArray(step.images)) {
            console.log(
              `📸 スデ��プ[${index}]で新しいimages形式を検�:`,
              step.images
            );
            processedImages = step.images
              .filter(img => img && img.url && img.url.trim() !== '')
              .map(img => ({
                url: convertImageUrl(img.url),
                fileName: img.fileName,
              }));
          }
          // 古い��式�画像情報がある場合、新しい形式に変換
          else if (step.imageUrl && step.imageFileName) {
            console.log(`🔧 スデ��プ[${index}]を古い��式から変換:`, {
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
          // 古い��式�imageUrlのみの場合
          else if (step.imageUrl) {
            console.log(`🔧 スデ��プ[${index}]をimageUrlのみから変換:`, {
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
            // description と message の同期
            description: step.description || step.message || '',
            message: step.message || step.description || '',
            // 画像情報を確実に設定（空配�をデフォルトに��
            images: processedImages || [],
            // 古い�ププロパティを削除
            imageUrl: undefined,
            imageFileName: undefined,
            // オプションの整合性確保
            options: (step.options || []).map(option => ({
              text: option.text || '',
              nextStepId: option.nextStepId || '',
              isTerminal: Boolean(option.isTerminal),
              conditionType: option.conditionType || 'other',
              condition: option.condition || '',
            })),
          };

          console.log(`✅スデ��プ[${index}]処理��完了`, processedStep);
          return processedStep;
        }),
        updatedAt: data.createdAt || data.updatedAt || new Date().toISOString(),
      };

      console.log('🎯 最終的なエデ��ターデ�タ:', editorData);

      // デ�タ整合性の厳密��ェデ��
      console.log('取得したフローデ�タ:', {
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

      // スデ��プ数不一致の警告（任意�スデ��プ数を許可��
      if (editorData.steps?.length === 0) {
        console.warn('スデ��プデータが存在しません');
        toast({
          title: 'デ�タ警告,
          description: 'フローデ�タにスデ��プが含まれてぁ��せん',
          variant: 'destructive',
        });
      }

      // 🎯 編集��面の状態を更新
      console.log('🔄 状態更新開始);
      setCurrentFlowData(editorData);
      setSelectedFlowFordit(flowId);

      console.log('🔄 状態更新完了', {
        selectedFlowFordit: flowId,
        currentFlowData: editorData,
      });

      // 強制的��再レンダリングをトリガー
      setTimeout(() => {
        console.log('🔄 強制再レンダリング実行);
        setCurrentFlowData({ ...editorData });
      }, 100);

      console.log('✅フロー編集��ータ読み込み完了);
    } catch (error) {
      console.error('❌フロー編集��ータ読み込みエラー:', error);
      toast({
        title: 'エラー',
        description: `フローデ�タの読み込みに失敗しました: ${error instanceof rror ? error.message : ''}`,
        variant: 'destructive',
      });
    }
  };

  // フロー削除 - 物理��ァイル削除とフロー一覧からの完�除去
  const deleteFlow = async (flowId: string) => {
    setIsDeleting(true);
    try {
      console.log('🗑��フロー削除開始 ' + flowId);

      // 削除対象のフロー情報��を取得
      const targetFlow = flowList.find(flow => flow.id === flowId);
      if (!targetFlow) {
        throw new rror('削除対象のフローが見つかりません');
      }

      console.log('🎯 削除対象:', {
        id: targetFlow.id,
        title: targetFlow.title,
        fileName: targetFlow.fileName,
      });

      // 削除APIを呼び出し
      const fileName = targetFlow.fileName || flowId + '.json';
      const url = `/api/emergency-flow/${flowId}?fileName=${encodeURIComponent(fileName)}`;
      console.log('🌐 削除API呼び出し', url);

      const response = await fetch(url, {
        method: 'DLT',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        },
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
          console.log('❌削除エラーデ�タ:', errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parserror) {
          console.warn('⚠��エラーレスポンスの解析に失敗', parserror);
        }
        throw new rror(errorMessage);
      }

      const result = await response.json();
      console.log('✅削除レスポンス:', result);

      // 成功メデ��ージを表示
      toast({
        title: '削除完了,
        description: `、{targetFlow.title}」が正常に削除されました`,
      });

      // 削除されたアイテム��が現在編集��の場合�クリア
      if (selectedFlowFordit === flowId) {
        setSelectedFlowFordit(null);
        setCurrentFlowData(null);
        setSelectedFilePath(null);
      }

      // フロー一覧から削除されたアイテム��を即座に除去
      setFlowList(prevList => {
        const filteredList = prevList.filter(flow => flow.id !== flowId);
        console.log(
          '📋 フロー一覧から除去: ' +
            flowId +
            ' (残り: ' +
            filteredList.length +
            '件)'
        );
        return filteredList;
      });

      // サーバ�から最新のフロー一覧を強制取得
      console.log('🔄 フロー一覧を�取得中...');
      await fetchFlowList(true);

      // 他�コンポ�ネントに削除完了��通知
      if (typeof window !== 'undefined') {
        window.dispatchvent(
          new Customvent('flowDeleted', {
            detail: { deletedId: flowId, deletedTitle: targetFlow.title },
          })
        );
        window.dispatchvent(new Customvent('forceRefreshFlowList'));
      }
    } catch (error) {
      console.error('❌削除エラー:', error);
      const errorMessage =
        error instanceof rror ? error.message : 'フローの削除に失敗しました';
      toast({
        title: '削除エラー',
        description: errorMessage,
        variant: 'destructive',
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
      console.log('💾 フロー保存開始', {
        id: savedData.id,
        title: savedData.title,
        stepsCount: savedData.steps?.length,
      });

      // 画像URLの存在確認
      const stepsWithImages = savedData.steps.map(step => {
        console.log('🔍 スデ��プ画像�理��開始', {
          stepId: step.id,
          stepTitle: step.title,
          originalImages: step.images,
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
        });

        // 新しい images 配�を優先的に使用する
        const images = step.images
          ?.filter(img => img && img.url && img.url.trim() !== '')
          .map(img => {
            console.log('🖼��画像�理', {
              originalImg: img,
              url: img.url,
              fileName: img.fileName,
              urlValid: img.url && img.url.trim() !== '',
              fileNameValid: img.fileName && img.fileName.trim() !== '',
            });
            
            // 画像URLが有効でない��合�スキデ�
            if (!img.url || img.url.trim() === '') {
              console.log('❌無効な画像URLをスキデ�:', img);
              return null;
            }
            
            // ファイル名が無い��合�URLから抽出
            let fileName = img.fileName;
            if (!fileName || fileName.trim() === '') {
              // URLからファイル名を抽出
              if (img.url.includes('/')) {
                fileName = img.url.split('/').pop() || '';
              } else if (img.url.includes('\\')) {
                fileName = img.url.split('\\').pop() || '';
              } else {
                fileName = img.url;
              }
              console.log('📁 URLからファイル名を抽出:', { url: img.url, fileName });
            }
            
            return {
              url: img.url,
              fileName: fileName,
            };
          })
          .filter(img => img !== null) || []; // nullを除外

        if (images && images.length > 0) {
          console.log('✅有効な画像情報:', {
            stepId: step.id,
            stepTitle: step.title,
            imagesCount: images.length,
            images: images,
          });
        } else {
          console.log('❌有効な画像ない', {
            stepId: step.id,
            stepTitle: step.title,
            originalImages: step.images,
            processedImages: images,
          });
        }

        // 古い�ププロパティを削除し、新しい `images` プププロパティのみにする
        const { imageUrl, imageFileName, ...restOfStep } = step;
        const processedStep = {
          ...restOfStep,
          images: images || [], // 確実に空配�を設定
        };

        console.log('🔍 処理���スデ��デ', {
          stepId: processedStep.id,
          stepTitle: processedStep.title,
          finalImages: processedStep.images,
          hasFinalImages: !!processedStep.images,
          finalImagesLength: processedStep.images?.length || 0,
        });

        return processedStep;
      });

      // フローデ�タを更新
      const updatedFlowData = {
        ...savedData,
        steps: stepsWithImages,
        updatedAt: new Date().toISOString(),
      };

      console.log('📤 送信デ�タ詳細:', {
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

      // APIにデ�タを送信
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

      console.log('📡 レスポンス状態', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌API エラー:', errorText);
        throw new rror(
          `保存に失敗しました: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log('✅フロー保存完了', {
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

      // 成功メデ��ージを表示
      toast({
        title: '保存完了,
        description: 'フローが正常に保存されました',
      });

      // フロー一覧を更新
      await fetchFlowList(true);
    } catch (error) {
      console.error('❌フロー保存エラー:', error);
      toast({
        title: '保存エラー',
        description:
          error instanceof rror ? error.message : 'フローの保存に失敗しました',
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

  const handleConditiondit = (
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
    // idがUUID形式でなければ新規発衁
    let validId = initialData?.id || '';
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(validId)) {
      validId = uuidv4();
    }
    // triggerKeywordsがundefinedなら空配�
    const triggerKeywords = Array.isArray(initialData?.triggerKeywords)
      ? initialData.triggerKeywords
      : [];
    
    // currentFlowDataが存在する場合�それを使用、そぁ��なければslidesを使用
    const dataToSave = currentFlowData || {
      id: validId,
      title,
      description,
      triggerKeywords,
      steps: slides,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('💾 フロー保存データ:', {
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

  // 画像追加時�自動保存（ファイル一覧に戻らない��
  const handleAutoSave = async () => {
    try {
      // idがUUID形式でなければ新規発衁
      let validId = initialData?.id || '';
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(validId)) {
        validId = uuidv4();
      }
      // triggerKeywordsがundefinedなら空配�
      const triggerKeywords = Array.isArray(initialData?.triggerKeywords)
        ? initialData.triggerKeywords
        : [];
      
      // currentFlowDataが存在する場合�それを使用、そぁ��なければslidesを使用
      const dataToSave = currentFlowData || {
        id: validId,
        title,
        description,
        triggerKeywords,
        steps: slides,
        updatedAt: new Date().toISOString(),
      };

      // 統一された保存�理��使用して自動保孁
      const { saveFlowData } = await import('../../lib/flow-save-manager');
      const result = await saveFlowData(dataToSave);
      
      if (result.success) {
        console.log('画像追加後�自動保存完了);
      } else {
        console.error('自動保存エラー:', result.error);
      }
    } catch (error) {
      console.error('自動保存エラー:', error);
    }
  };

  const handleImageUpload = async (stepId: string, file: File) => {
    try {
      // ファイルサイズチェック����0MB��
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`ファイル "${file.name}" のサイズが大きすぎます、0MB以下�ファイルを選択してください。`);
        return;
      }

      console.log('🖼��画像アデ�ロード開始', { stepId, fileName: file.name, fileSize: file.size });

      // 重褁��ェデ��: 同じファイル名�画像が既に存在するかチェック��
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
                img.fileName === file.name.replace(/\.[^/.]+$/, '') // 拡張子を除ぁ��比輁
            );

          if (existingImage) {
            const confirmReplace = window.confirm(
              `同じファイル名�画僁"${file.name}" が既に存在します、n` +
                `既存�画像を置き換えますか��`
            );

            if (!confirmReplace) {
              return;
            }

            // 既存�画像を削除
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
        throw new rror('画像�アデ�ロードに失敗しました');
      }

      const result = await response.json();

      if (result.success && currentFlowData) {
        // imageFileNameが返されてぁ��ぁ��合�fileNameを使用
        const imageFileName = result.imageFileName || result.fileName;

        const newImage = {
          url: result.imageUrl, // サーバ�から返された正しいURLを使用
          fileName: imageFileName,
        };

        // 重褁��像�場合�通知
        if (result.isDuplicate) {
          console.log(
            '🔄 重褁��像を検�、既存ファイルを使用:',
            result.fileName
          );
        }

        // 該当するスデ��プ�images配�を更新
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

        // フローデ�タを更新
        setCurrentFlowData({
          ...currentFlowData,
          steps: updatedSteps,
        });

        // 自動保存を実行（ファイル一覧に戻らない��
        handleAutoSave();

        const message = result.isDuplicate
          ? `重褁��像を検�しました。既存�画僁"${result.fileName}" を使用します。`
          : '画像が正常にアデ�ロードされました';

        toast({
          title: '画像アデ�ロード完了,
          description: message,
        });
      }
    } catch (error) {
      console.error('画像アデ�ロードエラー:', error);
      toast({
        title: 'エラー',
        description: '画像�アデ�ロードに失敗しました',
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
      `画僁"${imageToRemove.fileName}" を削除しますか��\nサーバ�からファイルが削除され、この操作�允��戻せません。`
    );

    if (confirmDelete) {
      try {
        // APIを呼び出してサーバ�から画像を削除
        const { buildApiUrl } = await import('../../lib/api');
        const response = await fetch(
          buildApiUrl(`/emergency-flow/image/${imageToRemove.fileName}`),
          {
            method: 'DLT',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new rror(
            errorData.error || 'サーバ�上�画像ファイル削除に失敗しました、
          );
        }

        // フロントエンド�状態を更新
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

        // 変更を保孁
        handleSave();

        toast({
          title: '画像削除完了,
          description: `画僁"${imageToRemove.fileName}" を削除しました。`,
        });
      } catch (error) {
        console.error('画像削除エラー:', error);
        toast({
          title: 'エラー',
          description: `画像�削除に失敗しました: ${error instanceof rror ? error.message : '未知のエラー'}`,
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
            placeholder='スライド�冁��を�劁
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
                document.getlementById(`image-upload-${slide.id}`)?.click()
              }
              className='text-base-2x h-12 px-4'
            >
              <Upload className='w-6 h-6 mr-2' />
              画像アデ�ローデ
            </Button>
          </div>
        </div>

        {/* 画像表示部刁��改善*/}
        {currentFlowData &&
          (() => {
            const step = currentFlowData.steps.find(s => s.id === slide.id);
            if (step && step.images && step.images.length > 0) {
              return (
                <div className='mt-6'>
                  <Label className='text-base-2x font-medium'>
                    アデ�ロード済み画僁
                  </Label>
                  <div className='mt-3 grid grid-cols-2 md:grid-cols-3 gap-3'>
                    {step.images.map((image, index) => (
                      <div key={index} className='relative group'>
                        <img
                          src={convertImageUrl(image.url)}
                          alt={image.fileName}
                          className='w-full h-32 object-cover rounded border'
                          onrror={e => {
                            console.error('画像読み込みエラー:', image.url);
                            e.currentTarget.style.display = 'none';
                            // エラー表示を追加
                            const errorDiv = document.createlement('div');
                            errorDiv.className =
                              'w-full h-32 bg-red-100 border border-red-300 text-red-700 flex items-center justify-center text-base-2x rounded';
                            errorDiv.textContent = '画像読み込み失敗;
                            e.currentTarget.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('画像読み込み成功:', image.fileName);
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
                    handleConditiondit(
                      slide.id,
                      condition.id,
                      e.target.value,
                      condition.nextSlideId
                    )
                  }
                  placeholder='条件を�劁..'
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
        <h2 className='text-xl font-bold'>応急処置フロー管理/h2>
        <Button onClick={() => fetchFlowList(true)} variant='outline' size='sm'>
          <RefreshCw className='w-4 h-4 mr-2' />
          更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='new'>新規作�</TabsTrigger>
          <TabsTrigger value='upload'>アデ�ローデ/TabsTrigger>
          <TabsTrigger value='edit' disabled={!flowList.length}>
            編集
          </TabsTrigger>
        </TabsList>

        <TabsContent value='new' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Plus className='w-5 h-5' />
                新規フロー作�
              </CardTitle>
              <CardDescription>
                フローエデ��ターを使用して新しい応急処置フローを作�しまぁ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <mergencyFlowditor flowData={null} onSave={handleFlowSave} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='upload' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Upload className='w-5 h-5' />
                ファイルアデ�ローデ
              </CardTitle>
              <CardDescription>
                既存�フローファイル��SON形式）をアデ�ロードしまぁ
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
                      JSONファイルを選択してください
                    </p>
                  </div>
                )}
                <Button
                  variant='outline'
                  onClick={() => fileInputRef.current?.click()}
                  className='mt-2'
                >
                  ファイル選抁
                </Button>
              </div>

              {isUploading && (
                <div className='space-y-2'>
                  <Progress value={uploadProgress} />
                  <p className='text-sm text-center'>
                    アデ�ロード中... {uploadProgress}%
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
                  {isUploading ? 'アデ�ロード中...' : 'アデ�ローデ}
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
            {/* フロー一覧 */}
            <Card>
              <CardHeader>
                <CardTitle>フロー一覧</CardTitle>
                <CardDescription>
                  編集��るフローを選択してください ({flowList.length}件)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* デ��デ��情報��表示 */}
                <div className='p-3 bg-yellow-50 border border-yellow-200 rounded mb-4'>
                  <h4 className='text-sm font-medium text-yellow-800 mb-2'>
                    デ��デ��情報��
                  </h4>
                  <div className='text-xs text-yellow-700 space-y-1'>
                    <p>フロー一覧数: {flowList.length}</p>
                    <p>読み込み中: {isLoadingFlowList.toString()}</p>
                    <p>選択中フロー: {selectedFlowFordit || 'ない}</p>
                    <p>
                      現在のフローデ�タ: {currentFlowData ? 'あり' : 'ない}
                    </p>
                    <p>フロー一覧詳細: {flowList.map(f => f.id).join(', ')}</p>
                  </div>
                </div>

                {isLoadingFlowList ? (
                  <div className='text-center py-4'>
                    <p className='text-sm text-gray-500'>読み込み中...</p>
                  </div>
                ) : flowList.length === 0 ? (
                  <div className='text-center py-4'>
                    <p className='text-sm text-gray-500'>フローがありません</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => fetchFlowList(true)}
                      className='mt-2'
                    >
                      再読み込み
                    </Button>
                  </div>
                ) : (
                  <div className='space-y-2 max-h-96 overflow-y-auto'>
                    {flowList.map(flow => (
                      <div
                        key={flow.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedFlowFordit === flow.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <div
                            className='flex-1'
                            onClick={() => {
                              console.log(
                                '🖱��フロー選抁',
                                flow.id,
                                flow.title
                              );
                              loadFlowFordit(flow.id);
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

            {/* フロー編集��リア */}
            <Card>
              <CardHeader>
                <CardTitle>フロー編集/CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFlowFordit && currentFlowData ? (
                  <>
                    {console.log('🎯 mergencyFlowditorに渡すデータ:', {
                      selectedFlowFordit,
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

                    {/* デ��デ��情報��表示 */}
                    <div className='p-3 bg-blue-50 border border-blue-200 rounded mb-4'>
                      <h4 className='text-sm font-medium text-blue-800 mb-2'>
                        デ�タ確認
                      </h4>
                      <div className='text-xs text-blue-700 space-y-1'>
                        <p>選択されたフローID: {selectedFlowFordit}</p>
                        <p>フローデ�タID: {currentFlowData.id}</p>
                        <p>フロータイトル: {currentFlowData.title}</p>
                        <p>スデ��プ数: {currentFlowData.steps?.length || 0}</p>
                        <p>ファイルパス: {selectedFilePath}</p>
                      </div>
                    </div>

                    <mergencyFlowditor
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
                      編集��るフローを選択してください
                    </p>
                    {console.log('📝 フロー編集��面の状態', {
                      selectedFlowFordit,
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

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フローを削除しますか��/AlertDialogTitle>
            <AlertDialogDescription>
              {'、 +
                flowToDelete?.title +
                '」を削除します。この操作�取り消せません、}
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

export default mergencyFlowCreator;
