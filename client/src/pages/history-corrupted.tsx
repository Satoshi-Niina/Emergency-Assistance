import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  FileText,
  Image,
  Calendar,
  MapPin,
  Settings,
  Download,
  Trash2,
  Printer,
  Wand2,
  Upload,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { SupportHistoryItem, HistorySearchFilters } from '../types/history';
import {
  fetchHistoryList,
  fetchMachineData,
  deleteHistory,
  exportHistoryItem,
  exportSelectedHistory,
  exportAllHistory,
  advancedSearch,
  generateReport,
  summarizeWithGPT,
} from '../lib/api/history-api';
import { storage } from '../lib/api';
import ChatExportReport from '../components/report/chat-export-report';

// 画像ユーティリティ関数
const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')
  : import.meta.env.VITE_API_BASE_URL || window.location.origin;

async function fetchDetailFile(name: string) {
  // IDベースのエンドポイントを試す
  const endpoints = [
    `${API_BASE}/api/history/${name}`,
    `${API_BASE}/api/history/detail/${name}`,
    `${API_BASE}/api/history/file/${name}`,
  ];

  for (const url of endpoints) {
    try {
      console.log('[fetchDetailFile] リクエスト開始:', url);
      const r = await fetch(url, { credentials: 'include' });
      console.log('[fetchDetailFile] レスポンス受信:', {
        status: r.status,
        ok: r.ok,
        url,
      });

      if (r.ok) {
        const json = await r.json();
        console.log('[fetchDetailFile] JSON解析完亁E', {
          hasData: !!json,
          keys: Object.keys(json || {}),
        });
        return json;
      }
    } catch (error) {
      console.warn('[fetchDetailFile] エンド�Eイント失敁E', url, error);
    }
  }

  // すべてのエンド�Eイントが失敗した場吁E  throw new Error(`detail 404 - IDが見つかりません: ${name}`);
}

function getSelectedItemWithFallback(list: any[], selected: Set<number>) {
  if (selected && selected.size > 0) {
    const idx = [...selected][0];
    return list[idx];
  }
  return list?.[0];
}

interface SearchFilters {
  machineType: string;
  machineNumber: string;
  searchText: string;
  searchDate: string;
}

interface MachineData {
  machineTypes: Array<{ id: string; machineTypeName: string }>;
  machines: Array<{
    id: string;
    machineNumber: string;
    machineTypeName: string;
  }>;
}

const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SupportHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    machineType: '',
    machineNumber: '',
    searchText: '',
    searchDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SupportHistoryItem | null>(
    null
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // エクスポ�Eト機�Eの状慁E
  const [exportLoading, setExportLoading] = useState(false);

  // レポ�Eト機�Eの状慁E  const [reportLoading, setReportLoading] = useState(false);

  // 自動ファイル読み込み機�Eの状慁E  const [fileLoading, setFileLoading] = useState(false);

  // 編雁E�Eプレビュー機�Eの状慁E  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(
    null
  );
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // 削除確認ダイアログの状慁E  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    title: string;
  }>({
    show: false,
    id: '',
    title: '',
  });

  // 印刷機�Eの状慁E  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'report'>('table');

  // レポ�Eト表示の状慁E  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // 機械敁E��報告書の状慁E  const [showMachineFailureReport, setShowMachineFailureReport] = useState(false);
  const [machineFailureReportData, setMachineFailureReportData] = useState<any>(null);

  // 機種・機械番号マスターチE�Eタ�E�編雁EI用 - PostgreSQLから�E�E  const [machineData, setMachineData] = useState<MachineData>({
    machineTypes: [],
    machines: [],
  });

  // 履歴検索フィルター用チE�Eタ�E�保存されたJSONファイルから�E�E  const [searchFilterData, setSearchFilterData] = useState<{
    machineTypes: string[];
    machineNumbers: string[];
  }>({
    machineTypes: [],
    machineNumbers: [],
  });

  const [searchFilterLoading, setSearchFilterLoading] = useState(false);
  const lastApiCallRef = useRef<number>(0);
  const isInitialLoadedRef = useRef<boolean>(false);
  // 要紁E��自動生成済みかどぁE��を追跡するRef
  const autoSummaryGenerated = useRef<Set<string>>(new Set());

  // アイチE��選択ハンドラー
  const handleItemSelect = (itemId: string, isSelected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  // JSONチE�Eタを正規化する関数
  const normalizeJsonData = (item: SupportHistoryItem): SupportHistoryItem => {
    console.log('正規化前�EアイチE��:', item);

    if (!item.jsonData) {
      console.log('jsonDataが存在しません');
      return item;
    }

    // 既にitem直接にmachineTypeとmachineNumberが存在する場吁E    if (item.machineType && item.machineNumber) {
      console.log('既に正規化済み:', {
        machineType: item.machineType,
        machineNumber: item.machineNumber,
      });
      return item;
    }

    // サーバ�Eから送信されたデータを基に正規化
    const normalizedItem = {
      ...item,
      machineType: item.machineType || item.jsonData.machineType || '',
      machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
      jsonData: {
        ...item.jsonData, // 既存�EjsonDataをすべて含める�E�EhatDataも含む�E�E        // 忁E��なフィールドを確実に含める
        // 事象タイトル: JSONのtitleから優先的に取得、ファイル名からも抽出
        title: item.jsonData?.title || (() => {
          // まずitem.titleをチェチE���E�ESONがルートレベルにある場合！E          if (item.title) {
            return item.title;
          }
        // ファイル名から日本語部刁E��けを抽出�E�例：エンジンが�Eく始動しない_0a9f4736-82fa... -> エンジンが�Eく始動しなぁE��E        if (item.fileName) {
          // 最初�E「_」までが日本語部刁E          const firstUnderscoreIndex = item.fileName.indexOf('_');
          if (firstUnderscoreIndex > 0) {
            return item.fileName.substring(0, firstUnderscoreIndex);
          }
          // 「_」がなぁE��合�E、拡張子を除ぁE��全体を返す�E�日本語�Eみの場合！E          const withoutExtension = item.fileName.replace(/\.json$/, '');
          return withoutExtension;
        }
        return '';
        })(),
        problemDescription: item.jsonData?.problemDescription || '',
        machineType: item.machineType || item.jsonData.machineType || '',
        machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
        extractedComponents:
          item.jsonData.extractedComponents || item.extractedComponents || [],
        extractedSymptoms:
          item.jsonData.extractedSymptoms || item.extractedSymptoms || [],
        possibleModels:
          item.jsonData.possibleModels || item.possibleModels || [],
        conversationHistory: item.jsonData.conversationHistory || [],
        savedImages: item.jsonData.savedImages || [],
        // chatDataを確実に含める
        chatData: item.jsonData.chatData || item.jsonData,
      },
    };

    // chatDataが存在する場合�E追加処琁E    if (item.jsonData.chatData || normalizedItem.jsonData.chatData) {
      console.log('chatData形式を検�E');
      const chatData = item.jsonData.chatData || normalizedItem.jsonData.chatData;

      // machineInfoからmachineTypeとmachineNumberを取征E      const machineTypeName = chatData.machineInfo?.machineTypeName || '';
      const machineNumber = chatData.machineInfo?.machineNumber || '';

      console.log('chatDataから抽出:', { machineTypeName, machineNumber });

      // chatDataの値で上書ぁE      normalizedItem.machineType =
        machineTypeName || normalizedItem.machineType;
      normalizedItem.machineNumber =
        machineNumber || normalizedItem.machineNumber;
      normalizedItem.jsonData.machineType =
        machineTypeName || normalizedItem.jsonData.machineType;
      normalizedItem.jsonData.machineNumber =
        machineNumber || normalizedItem.jsonData.machineNumber;
    }

    console.log('正規化後�EアイチE��:', normalizedItem);
    return normalizedItem;
  };

  // JSONの冁E��から発生事象から処置までの要紁E��生�Eする関数
  const generateSummaryFromJson = useCallback((jsonData: any): string => {
    try {
      const parts: string[] = [];

      // 1. 事象タイトル
      const title = jsonData?.title || '';
      if (title) {
        parts.push(`【事象、E{title}`);
      }

      // 2. 発生事象の詳細�E�EroblemDescription + conversationHistory + chatData.messages�E�E      const problemDesc = jsonData?.problemDescription || '';
      const conversationHistory = jsonData?.conversationHistory || [];
      const chatData = jsonData?.chatData || jsonData;
      const chatMessages = chatData?.messages || [];

      // conversationHistoryからチE��ストメチE��ージを抽出�E�画像�E除外！E      const conversationTexts: string[] = [];
      if (Array.isArray(conversationHistory)) {
        conversationHistory.forEach((msg: any) => {
          if (msg && typeof msg === 'object') {
            const content = msg.content;
            if (typeof content === 'string' && !content.startsWith('data:image/')) {
              conversationTexts.push(content);
            }
          }
        });
      }

      // chatData.messagesからユーザーメチE��ージを抽出�E�画像�E除外！E      const userMessages: string[] = [];
      if (Array.isArray(chatMessages)) {
        chatMessages.forEach((msg: any) => {
          if (msg && typeof msg === 'object' && !msg.isAiResponse) {
            const content = msg.content;
            if (typeof content === 'string' && !content.startsWith('data:image/')) {
              userMessages.push(content);
            }
          }
        });
      }

      const eventDetails: string[] = [];
      if (problemDesc) {
        eventDetails.push(problemDesc);
      }
      if (conversationTexts.length > 0) {
        eventDetails.push(...conversationTexts);
      }
      if (userMessages.length > 0) {
        eventDetails.push(...userMessages);
      }

      if (eventDetails.length > 0) {
        parts.push(`【発生事象の詳細、E{eventDetails.join(' ')}`);
      }

      // 3. 影響コンポ�EネンチE      const components = jsonData?.extractedComponents || [];
      if (components.length > 0) {
        parts.push(`【影響コンポ�Eネント、E{components.join(', ')}`);
      }

      // 4. 痁E��
      const symptoms = jsonData?.extractedSymptoms || [];
      if (symptoms.length > 0) {
        parts.push(`【症状、E{symptoms.join(', ')}`);
      }

      // 5. 処置冁E���E�Enswer�E�E      const answer = jsonData?.answer || '';
      if (answer) {
        parts.push(`【�E置冁E��、E{answer}`);
      }

      // 要紁E��生�EできなぁE��合�E空斁E��を返す
      if (parts.length === 0) {
        return '';
      }

      return parts.join('\n\n');
    } catch (error) {
      console.error('要紁E��成エラー:', error);
      return '';
    }
  }, []);

  // 編雁E��面が開かれた時にGPT要紁E��自動生成（一度だけ実行！E  useEffect(() => {
    if (showEditDialog && editingItem && editingItem.id) {
      // 既にこ�EアイチE��の要紁E��生�E済みの場合�EスキチE�E
      if (autoSummaryGenerated.current.has(editingItem.id)) {
        return;
      }

      // 編雁E��面を開ぁE��ら、既存�E説明があってめEPT要紁E��自動生成して上書ぁE      autoSummaryGenerated.current.add(editingItem.id);

      // GPT要紁E��非同期で生�E
      (async () => {
        try {
          // JSONチE�Eタに要紁E��忁E��なチE�EタがあるかチェチE��
          const chatData = editingItem.jsonData?.chatData || editingItem.jsonData;
          const hasDataForSummary =
            editingItem.jsonData?.title ||
            editingItem.jsonData?.problemDescription ||
            (Array.isArray(editingItem.jsonData?.conversationHistory) && editingItem.jsonData.conversationHistory.length > 0) ||
            (Array.isArray(chatData?.messages) && chatData.messages.length > 0) ||
            editingItem.jsonData?.answer;

          if (!hasDataForSummary) {
            console.log('⚠�E�E要紁E��忁E��なチE�Eタがありません、EPT要紁E��スキチE�Eします、E);
            return;
          }

          console.log('📝 編雁E��面を開ぁE��際にGPT要紁E��自動生成中...');

          // chatData.messagesからユーザーメチE��ージを抽出してGPT要紁E��使用
          const chatDataForSummary = editingItem.jsonData?.chatData || editingItem.jsonData;
          let summaryJsonData = { ...editingItem.jsonData };

          // chatData.messagesが存在する場合�E、それを優先してGPT要紁E��使用
          if (chatDataForSummary?.messages && Array.isArray(chatDataForSummary.messages)) {
            const userMessages = chatDataForSummary.messages
              .filter((msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/'))
              .map((msg: any) => msg.content);

            if (userMessages.length > 0) {
              // chatData.messagesを確実に含める
              summaryJsonData = {
                ...summaryJsonData,
                chatData: {
                  ...summaryJsonData.chatData,
                  messages: chatDataForSummary.messages,
                },
              };
              console.log('🔍 GPT要紁E��使用するユーザーメチE��ージ数:', userMessages.length);
            }
          }

          const gptSummary = await summarizeWithGPT(summaryJsonData);
          if (gptSummary) {
            console.log('✁EGPT要紁E��成完亁E', gptSummary.substring(0, 100) + '...');
            setEditingItem({
              ...editingItem,
              jsonData: {
                ...editingItem.jsonData,
                problemDescription: gptSummary,
                answer: gptSummary,
              },
            });
          }
        } catch (error: any) {
          // 400エラー�E�要紁E��る�E容がなぁE���E静かに処琁E��てフォールバック
          const isNoContentError = error?.message?.includes('要紁E��る�E容がありません') ||
                                   error?.message?.includes('400');

          if (!isNoContentError) {
            console.error('❁EGPT要紁E�E動生成エラー:', error);
          } else {
            console.log('⚠�E�E要紁E��忁E��なチE�Eタが不足してぁE��す。簡易要紁E��使用します、E);
          }

          // GPT要紁E��失敗した場合�E簡易要紁E��フォールバック
          const fallbackSummary = generateSummaryFromJson(editingItem.jsonData);
          if (fallbackSummary) {
            console.log('📝 簡易要紁E��フォールバックとして生�E:', fallbackSummary);
            setEditingItem({
              ...editingItem,
              jsonData: {
                ...editingItem.jsonData,
                problemDescription: fallbackSummary,
                answer: fallbackSummary,
              },
            });
          }
        }
      })();
    }
  }, [showEditDialog, editingItem?.id]);

  // 履歴チE�Eタ更新のメチE��ージリスナ�E
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_HISTORY_ITEM') {
        const updatedData = event.data.data;
        console.log('履歴チE�Eタ更新メチE��ージを受信:', updatedData);

        // 履歴一覧表の該当アイチE��を更新
        setHistoryItems(prevItems =>
          prevItems.map(item =>
            item.id === updatedData.id || item.chatId === updatedData.chatId
              ? { ...item, ...updatedData }
              : item
          )
        );

        // フィルタリングされたアイチE��も更新
        setFilteredItems(prevItems =>
          prevItems.map(item =>
            item.id === updatedData.id || item.chatId === updatedData.chatId
              ? { ...item, ...updatedData }
              : item
          )
        );

        // 選択中のアイチE��も更新
        if (
          selectedItem &&
          (selectedItem.id === updatedData.id ||
            selectedItem.chatId === updatedData.chatId)
        ) {
          setSelectedItem(prev => (prev ? { ...prev, ...updatedData } : null));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedItem]);
  const [machineDataLoading, setMachineDataLoading] = useState(false);

  // machineDataの状態変化を監要E  useEffect(() => {
    console.log('🔍 machineData状態変化:', machineData);
  }, [machineData]);

  // チE�Eタ取得（サーバ�EAPIから取得！E- こ�E処琁E�E初期ロードに統合済み

  // 機種・機械番号マスターチE�Eタ取征E  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);

      // 機種・機械番号チE�Eタを専用APIから取征E      console.log('🔍 機種・機械番号チE�Eタ取得開姁E);
      const { buildApiUrl } = await import('../lib/api');
      const response = await fetch(buildApiUrl('/machines/machine-types'));
      console.log('🔍 APIレスポンス:', response.status, response.statusText);
      const data = await response.json();
      console.log('🔍 APIレスポンスチE�Eタ:', data);

      if (data.success && data.data) {
        // 機種一覧を構築（重褁E��去�E�E        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];

        // 機械番号一覧を構築（重褁E��去�E�E        const machineSet = new Set<string>();
        const machines: Array<{
          id: string;
          machineNumber: string;
          machineTypeName: string;
        }> = [];

        console.log('🔍 機種・機械番号チE�Eタは専用APIから取得されまぁE);

        // 機種チE�Eタを�E琁E        data.data.forEach((type: any) => {
          if (type.machine_type_name && !machineTypeSet.has(type.machine_type_name)) {
            machineTypeSet.add(type.machine_type_name);
            machineTypes.push({
              id: type.id,
              machineTypeName: type.machine_type_name,
            });
          }
        });

        const result = {
          machineTypes: machineTypes,
          machines: [], // 機械番号は別途取征E        };

        console.log('🔍 機種・機械番号チE�Eタ取得結果:', result);
        console.log('🔍 機種数:', result.machineTypes.length);
        console.log('🔍 機械番号数:', result.machines.length);
        console.log(
          '🔍 機種一覧:',
          result.machineTypes.map(t => t.machineTypeName)
        );
        console.log(
          '🔍 機械番号一覧:',
          result.machines.map(m => `${m.machineNumber} (${m.machineTypeName})`)
        );
        console.log('🔍 setMachineData呼び出し前:', result);
        setMachineData(result);
        console.log('🔍 setMachineData呼び出し完亁E);
      } else {
        console.log(
          '⚠�E�E機種・機械番号チE�Eタが正しく取得できませんでした:',
          data
        );
        console.log('⚠�E�Edata.success:', data.success);
        console.log('⚠�E�Edata.machineTypes:', data.machineTypes);
        console.log('⚠�E�Edata.machines:', data.machines);
        setMachineData({ machineTypes: [], machines: [] });
      }
    } catch (error) {
      console.error('機種・機械番号チE�Eタの取得に失敗しました:', error);
      setMachineData({ machineTypes: [], machines: [] });
    } finally {
      setMachineDataLoading(false);
    }
  };

  // 履歴検索フィルター用チE�Eタ�E�エクスポ�EチESONから取得！E  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('🔍 エクスポ�EチESONからフィルターチE�Eタ取得開姁E);

      const response = await fetch('/api/history/exports/filter-data');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchFilterData({
            machineTypes: data.machineTypes || [],
            machineNumbers: data.machineNumbers || [],
          });
          console.log('🔍 フィルターチE�Eタ取得完亁E', {
            machineTypes: data.machineTypes?.length || 0,
            machineNumbers: data.machineNumbers?.length || 0,
          });
        } else {
          console.warn('⚠�E�EフィルターチE�Eタ取得失敁E', data);
          setSearchFilterData({ machineTypes: [], machineNumbers: [] });
        }
      } else {
        console.error('⚠�E�EフィルターチE�Eタ取得エラー:', response.statusText);
        setSearchFilterData({ machineTypes: [], machineNumbers: [] });
      }
    } catch (error) {
      console.error('履歴検索フィルターチE�Eタ取得エラー:', error);
      setSearchFilterData({ machineTypes: [], machineNumbers: [] });
    } finally {
      setSearchFilterLoading(false);
    }
  };

  const fetchHistoryData = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);

      // レート制限チェチE��
      const now = Date.now();
      if (lastApiCallRef.current && now - lastApiCallRef.current < 1000) {
        console.log('🔍 APIリクエスト制限中...');
        return;
      }
      lastApiCallRef.current = now;

      // 現在のフィルター値を取征E      const currentFilters = {
        machineType: filters.machineType,
        machineNumber: filters.machineNumber,
        searchText: filters.searchText,
        searchDate: filters.searchDate
      };

      // サーバ�E側でフィルタリングを行う
      const params = new URLSearchParams();
      if (currentFilters.machineType)
        params.append('machineType', currentFilters.machineType);
      if (currentFilters.machineNumber)
        params.append('machineNumber', currentFilters.machineNumber);
      if (currentFilters.searchText) params.append('searchText', currentFilters.searchText);
      if (currentFilters.searchDate) params.append('searchDate', currentFilters.searchDate);
      params.append('limit', '20');
      params.append('offset', ((page - 1) * 20).toString());

      const { buildApiUrl } = await import('../lib/api');
      const requestUrl = buildApiUrl('/history');
      console.log('🔍 APIリクエスチERL:', requestUrl);

      const response = await fetch(requestUrl);
      console.log('🔍 レスポンススチE�Eタス:', response.status, response.statusText);

      const data = await response.json();

      console.log('🔍 取得したデータ:', data);
      console.log('🔍 レスポンス構造:', {
        success: data.success,
        hasItems: !!data.items,
        hasData: !!data.data,
        itemsLength: data.items?.length,
        dataLength: data.data?.length,
        total: data.total
      });

      // チE��チE��用にローカルストレージにも保孁E      localStorage.setItem('debug_api_response', JSON.stringify(data, null, 2));

      if (Array.isArray(data)) {
        console.log('🔍 取得件数:', data.length);

        // エクスポ�EトファイルチE�Eタの確誁E        data.forEach((item: any, index: number) => {
          console.log(`🔍 アイチE�� ${index + 1}:`, {
            fileName: item.fileName,
            title: item.title,
            chatId: item.chatId,
          });
        });

               // エクスポ�Eトファイルを履歴アイチE��として変換
               const updatedItems = data.map((file: any) => {
                 // titleはサーバ�Eから返されたも�Eを使用
                 const displayTitle = file.title || 'タイトルなぁE;

                 // JSONチE�Eタから詳細惁E��を取征E                 const content = file.content || {};
                 // サーバ�E側で抽出済みの値を優先使用、なければJSONから抽出
                 const machineType =
                   file.machineType ||
                   content.machineType ||
                   content.chatData?.machineInfo?.machineTypeName ||
                   content.machineInfo?.machineTypeName ||
                   '';
                 const machineNumber =
                   file.machineNumber ||
                   content.machineNumber ||
                   content.chatData?.machineInfo?.machineNumber ||
                   content.machineInfo?.machineNumber ||
                   '';
                 const problemDescription = content.problemDescription || content.answer || '';

                 // SupportHistoryItem型に変換
                 const convertedItem: SupportHistoryItem = {
                   id: file.chatId || file.fileName,
                   chatId: file.chatId || file.fileName,
                   fileName: file.fileName,
                   machineType: machineType,
                   machineNumber: machineNumber,
                   title: displayTitle,
                   createdAt: file.createdAt,
                   lastModified: file.lastModified,
                   extractedComponents: content.extractedComponents || [],
                   extractedSymptoms: content.extractedSymptoms || [],
                   possibleModels: content.possibleModels || [],
                   machineInfo: {
                     machineTypeName: machineType,
                     machineNumber: machineNumber
                   },
                   jsonData: {
                     ...content, // 完�EなJSONチE�Eタを含める
                     title: displayTitle,
                     problemDescription: problemDescription,
                     machineType: machineType,
                     machineNumber: machineNumber,
                     extractedComponents: content.extractedComponents || [],
                     extractedSymptoms: content.extractedSymptoms || [],
                     possibleModels: content.possibleModels || [],
                     conversationHistory: content.conversationHistory || content.chatData?.messages || [],
                     savedImages: content.savedImages || [],
                     fileName: file.fileName,
                     chatData: content.chatData || content, // chatDataも含める
                   },
                 };

          console.log('変換されたアイチE��:', {
            fileName: convertedItem.fileName,
            machineType: convertedItem.machineType,
            machineNumber: convertedItem.machineNumber,
            jsonData: convertedItem.jsonData,
          });

          return convertedItem;
        });

        console.log('🔍 設定前の状慁E', {
          historyItemsLength: historyItems.length,
          filteredItemsLength: filteredItems.length,
          updatedItemsLength: updatedItems.length
        });

        // DB専用履歴取得に統一
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();

        // DB専用チE�Eタを統合（従来のupdatedItemsは無視してDB優先！E        const allItems = dbHistoryItems;

        setHistoryItems(allItems);
        setFilteredItems(allItems);
        setTotalPages(Math.ceil(allItems.length / 20));
        setCurrentPage(page);

        console.log('🔍 DB専用履歴設定完亁E', {
          dbItemsLength: dbHistoryItems.length,
          totalPages: Math.ceil(allItems.length / 20)
        });
      } else {
        console.log('🔍 チE�Eタ取得�E功せぁE', data);

        // サーバ�EからのチE�EタがなぁE��合でめEB専用履歴取得を実衁E        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();

        if (dbHistoryItems.length > 0) {
          setHistoryItems(dbHistoryItems);
          setFilteredItems(dbHistoryItems);
          setTotalPages(Math.ceil(dbHistoryItems.length / 20));
          console.log(`🔍 DB専用履歴取得完亁E ${dbHistoryItems.length}件`);
        } else {
          setHistoryItems([]);
          setFilteredItems([]);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('履歴チE�Eタの取得に失敗しました:', error);
      console.error('エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // エラーが発生した場合でめEB専用履歴取得を試衁E      try {
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();
        if (dbHistoryItems.length > 0) {
          setHistoryItems(dbHistoryItems);
          setFilteredItems(dbHistoryItems);
          setTotalPages(Math.ceil(dbHistoryItems.length / 20));
          console.log(`🔍 エラー晁EB履歴取得完亁E ${dbHistoryItems.length}件`);
        } else {
          setHistoryItems([]);
          setFilteredItems([]);
          setTotalPages(1);
        }
      } catch (dbLoadError) {
        console.error('DB履歴取得もエラー:', dbLoadError);
        setHistoryItems([]);
        setFilteredItems([]);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期ロード（一度だけ実行！E  useEffect(() => {
    if (!isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      fetchHistoryData(1);
      // fetchMachineDataFromAPI(); // 機種チE�Eタは編雁E��に忁E��に応じて取征E    }
  }, []); // 初期ロード時のみ実衁E
  // 履歴チE�Eタが変更された時にフィルターチE�Eタを更新
  // 初期ロード時にエクスポ�EチESONからフィルターチE�Eタを取征E  useEffect(() => {
    fetchSearchFilterData(); // エクスポ�EチESONからフィルターチE�Eタを取征E  }, []); // 初回のみ実衁E
  // フィルター変更時�E処琁E  useEffect(() => {
    // キーワード検索がある場合�EスキチE�E�E�検索ボタンで手動実行！E    if (filters.searchText && filters.searchText.trim()) {
      return;
    }

    // フィルターが変更された時のみ再取得（�E期ロード時は除外！E    if (historyItems.length > 0) {
      fetchHistoryData(1);
    }
  }, [filters.machineType, filters.machineNumber, filters.searchDate]); // キーワード検索は除夁E
  // フィルター変更時�E処琁E  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    // filters を更新
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));

    // 編雁E��イアログが開ぁE��ぁE��場合�E、編雁E��のアイチE��にも反映する
    // 期征E��れる動佁E フィルタで機種/機械番号を選択すると、すでに編雁E��のフォームに即座に反映されめE    try {
      if (editingItem) {
        if (key === 'machineType' || key === 'machineNumber') {
          setEditingItem(prev =>
            prev ? ({ ...prev, [key]: value } as SupportHistoryItem) : prev
          );
          console.log(`filters -> editingItem sync: ${key} = ${value}`);
        }
      }
    } catch (syncError) {
      console.warn(
        'フィルターから編雁E��イチE��への同期に失敗しました:',
        syncError
      );
    }
  };

  const handleSearch = useCallback(async () => {
    // キーワード検索がある場合、エクスポ�EチESONから検索
    if (filters.searchText && filters.searchText.trim()) {
      try {
        setLoading(true);
        const keyword = filters.searchText.trim();
        const searchUrl = `/api/history/exports/search?keyword=${encodeURIComponent(keyword)}`;
        console.log('🔍 検索実衁E', { keyword, searchUrl });

        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 検索結果:', { success: data.success, total: data.total, keyword: data.keyword });

          if (data.success && data.data) {
            // エクスポ�EチESONから検索した結果を取征E            let results = data.data;
            console.log('🔍 検索結果アイチE��数:', results.length);

            // 機種フィルターを適用
            if (filters.machineType) {
              results = results.filter((item: SupportHistoryItem) => {
                const machineType = item.machineType || item.jsonData?.machineType || item.jsonData?.chatData?.machineInfo?.machineTypeName || '';
                return machineType === filters.machineType;
              });
            }

            // 機械番号フィルターを適用
            if (filters.machineNumber) {
              results = results.filter((item: SupportHistoryItem) => {
                const machineNumber = item.machineNumber || item.jsonData?.machineNumber || item.jsonData?.chatData?.machineInfo?.machineNumber || '';
                return machineNumber === filters.machineNumber;
              });
            }

            // 日付フィルターを適用
            if (filters.searchDate) {
              results = results.filter((item: SupportHistoryItem) => {
                const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
                return itemDate === filters.searchDate;
              });
            }

            setFilteredItems(results);
          } else {
            setFilteredItems([]);
          }
        } else {
          console.error('検索エラー:', response.statusText);
          setFilteredItems([]);
        }
      } catch (error) {
        console.error('検索エラー:', error);
        setFilteredItems([]);
      } finally {
        setLoading(false);
      }
    } else {
      // キーワード検索がなぁE��合�E通常のフィルタリングを使用
      fetchHistoryData(1);
    }
  }, [filters.searchText, filters.machineType, filters.machineNumber, filters.searchDate]);

  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      setLoading(true);
      await deleteHistory(id);

      // 削除後、現在のペ�Eジを�E読み込み
      await fetchHistoryData(currentPage);

      // 削除確認ダイアログを閉じる
      setDeleteConfirm({
        show: false,
        id: '',
        title: '',
      });
    } catch (error) {
      console.error('履歴削除エラー:', error);
      alert('履歴の削除に失敗しました、E);
    } finally {
      setLoading(false);
    }
  };

  // 選択チェチE��機�E
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleExportSelected = async (format: 'json' | 'csv' = 'json') => {
    if (selectedItems.size === 0) {
      alert('エクスポ�Eトする履歴を選択してください、E);
      return;
    }

    try {
      setExportLoading(true);
      const selectedItemsArray = filteredItems.filter(item =>
        selectedItems.has(item.id)
      );
      const blob = await exportSelectedHistory(selectedItemsArray, format);
      downloadFile(blob, `selected_history.${format}`);
    } catch (error) {
      console.error('選択履歴エクスポ�Eトエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      const blob = await exportHistoryItem(item.id, 'json');
      downloadFile(blob, `history_${item.id}.json`);
    } catch (error) {
      console.error('エクスポ�Eトエラー:', error);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportItem = async (
    item: SupportHistoryItem,
    format: 'json' | 'csv' = 'json'
  ) => {
    try {
      setExportLoading(true);
      const blob = await exportHistoryItem(item.id, format);
      downloadFile(blob, `history_${item.id}.${format}`);
    } catch (error) {
      console.error('エクスポ�Eトエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAll = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportAllHistory(filters, format);
      downloadFile(blob, `all_history.${format}`);
    } catch (error) {
      console.error('エクスポ�Eトエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    // フィルターをクリアして、�Eの履歴一覧を表示
    setFilters({
      machineType: '',
      machineNumber: '',
      searchText: '',
      searchDate: '',
    });
    // 検索結果をクリアして、�EのhistoryItemsを表示
    setFilteredItems(historyItems);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const handleGenerateReport = async () => {
    // 既にレポ�Eト生成中の場合�E処琁E��停止
    if (reportLoading) {
      console.log('レポ�Eト生成中です。�E琁E��停止します、E);
      return;
    }

    try {
      console.log('=== レポ�Eト生成開姁E===');
      setReportLoading(true);

      // 選択されたアイチE��のみを対象とする
      // 全件を対象とする
      const targetItems = filteredItems;

      console.log('レポ�Eト生成開姁E', {
        filteredItemsCount: filteredItems.length,
        targetItemsCount: targetItems.length,
      });

      // 対象アイチE��がなぁE��合�E処琁E��停止
      if (targetItems.length === 0) {
        alert('対象アイチE��がありません、E);
        setReportLoading(false);
        return;
      }

      // 吁E��イチE��のチE�Eタ構造を確誁E      targetItems.forEach((item, index) => {
        console.log(`アイチE��${index + 1}のチE�Eタ構造:`, {
          id: item.id,
          fileName: item.fileName,
          hasJsonData: !!item.jsonData,
          jsonDataKeys: item.jsonData ? Object.keys(item.jsonData) : [],
          machineInfo: item.machineInfo,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
        });
      });

      // 選択されたアイチE��からJSONチE�Eタを�E析してレポ�Eトデータを生戁E      const allTitles: string[] = [];
      const allComponents: string[] = [];
      const allSymptoms: string[] = [];
      const allModels: string[] = [];

      targetItems.forEach(item => {
        const jsonData = item?.jsonData ?? item?.data ?? {};

        // 事象タイトルを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E        let title = null;

        // まずファイル名から事象冁E��を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }

        // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E        if (!title) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
            const userMessages = jsonData?.chatData?.messages?.filter(
              (msg: any) => !msg.isAiResponse
            );
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }

        if (title) allTitles.push(title);

        if (jsonData?.extractedComponents)
          allComponents.push(...jsonData.extractedComponents);
        if (jsonData?.extractedSymptoms)
          allSymptoms.push(...jsonData.extractedSymptoms);
        if (jsonData?.possibleModels)
          allModels.push(...jsonData.possibleModels);
      });

      console.log('抽出されたデータ:', {
        titles: allTitles,
        components: allComponents,
        symptoms: allSymptoms,
        models: allModels,
      });

      // 吁E��イチE��ごとに個別のレポ�Eトを生�E
      const reportDataArray = targetItems.map((item, index) => {
        console.log(`レポ�EチE{index + 1}の生�E開姁E`, item.fileName);

        const jsonData = item?.jsonData ?? item?.data ?? {};

        // 事象タイトルを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E        let title = '事象なぁE;

        // まずファイル名から事象冁E��を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }

        // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E        if (title === '事象なぁE) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
            const userMessages = jsonData?.chatData?.messages?.filter(
              (msg: any) => !msg.isAiResponse
            );
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }

        // 機種と機械番号を抽出
        const machineType =
          item.machineInfo?.machineTypeName ||
          jsonData?.machineType ||
          jsonData?.chatData?.machineInfo?.machineTypeName ||
          item.machineType ||
          '';
        const machineNumber =
          item.machineInfo?.machineNumber ||
          jsonData?.machineNumber ||
          jsonData?.chatData?.machineInfo?.machineNumber ||
          item.machineNumber ||
          '';

        console.log(`レポ�EチE{index + 1}の基本惁E��:`, {
          title,
          machineType,
          machineNumber,
        });

        // 画像データを収雁E��優先頁E��付き�E�E        const images = [];

        try {
          // 優先頁E��E: savedImagesから画像を取得（最優先！E          if (jsonData?.savedImages && Array.isArray(jsonData.savedImages) && jsonData.savedImages.length > 0) {
            console.log(
              'handleGenerateReport: savedImagesから画像を取征E',
              jsonData.savedImages.length
            );
            jsonData.savedImages.forEach((img: any, index: number) => {
              const imageUrl = typeof img === 'string' ? img : (img.url || img.path || img.fileName);
              if (imageUrl && !imageUrl.startsWith('data:image/')) {
                images.push({
                  id: `saved-${index}`,
                  url: imageUrl,
                  fileName: typeof img === 'object' ? img.fileName || `敁E��画像_${index + 1}` : `敁E��画像_${index + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'savedImages',
                });
              }
            });
          }

          // 優先頁E��E: conversationHistoryから画像URLを取征E          if (jsonData?.conversationHistory?.length > 0) {
            console.log(
              'handleGenerateReport: conversationHistoryから画像URLを検索中...',
              jsonData.conversationHistory.length
            );
            const imageMessages = jsonData.conversationHistory.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
            );
            console.log(
              'handleGenerateReport: conversationHistoryで画像URLを発要E',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像�E除夁E              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `conv-${index}`,
                  url: msg.content,
                  fileName: `敁E��画像_${images.length + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'conversationHistory',
                });
              }
            });
          }

          // 優先頁E��E: originalChatData.messagesから画像URLを取征E          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: originalChatData.messagesから画像URLを検索中...',
              jsonData.originalChatData.messages.length
            );
            const imageMessages = jsonData.originalChatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
            );
            console.log(
              'handleGenerateReport: originalChatData.messagesで画像URLを発要E',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像�E除夁E              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `敁E��画像_${images.length + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'originalChatData',
                });
              }
            });
          }

          // 優先頁E��E: chatData.messagesから画像URLを取征E          if (jsonData?.chatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: chatData.messagesから画像URLを検索中...',
              jsonData.chatData.messages.length
            );
            const imageMessages = jsonData.chatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
            );
            console.log(
              'handleGenerateReport: chatData.messagesで画像URLを発要E',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像�E除夁E              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `敁E��画像_${images.length + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'chatData',
                });
              }
            });
          }


          // 優先頁E��E: 再帰皁E��JSONチE�Eタ冁E�E画像URLを検索�E�Ease64は除外！E          const findImagesRecursively = (
            obj: any,
            path: string = ''
          ): string[] => {
            const foundImages: string[] = [];

            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;

                if (
                  typeof value === 'string' &&
                  (value.startsWith('/api/images/') || value.startsWith('http'))
                ) {
                  foundImages.push(value);
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    foundImages.push(
                      ...findImagesRecursively(item, `${currentPath}[${index}]`)
                    );
                  });
                } else if (typeof value === 'object' && value !== null) {
                  foundImages.push(
                    ...findImagesRecursively(value, currentPath)
                  );
                }
              });
            }

            return foundImages;
          };

          const recursiveImages = findImagesRecursively(jsonData);
          console.log(
            'handleGenerateReport: 再帰検索で画像URLを発要E',
            recursiveImages.length
          );
          recursiveImages.forEach((imgUrl, index) => {
            // 既に追加済みの画像�E除夁E            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `敁E��画像_${images.length + 1}`,
                description: '機械敁E��箁E��の写真',
                source: 'recursive',
              });
            }
          });

          // 優先頁E��E: imagePathフィールド（最終フォールバック�E�E          if (
            jsonData?.imagePath &&
            typeof jsonData.imagePath === 'string' &&
            !images.some(img => img.url === jsonData.imagePath)
          ) {
            console.log('handleGenerateReport: imagePathから画像を取得中...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '敁E��画僁E,
              description: '機械敁E��箁E��の写真',
              source: 'imagePath',
            });
          }
        } catch (imageError) {
          console.error('画像データ処琁E��にエラーが発生しました:', imageError);
          // 画像�E琁E��ラーが発生してもレポ�Eト生成�E続衁E        }

        console.log(`レポ�EチE{index + 1}の画像数:`, images.length, '极E);

        const reportData = {
          reportId: `R${Date.now().toString().slice(-5)}-${index + 1}`,
          machineId: machineNumber || '不�E',
          date: new Date(item.createdAt).toISOString().split('T')[0],
          location: '○○緁E,
          failureCode: 'FC01',
          description: title,
          status: '報告完亁E,
          engineer: 'シスチE��管琁E��E,
          notes: `事象タイトル: ${title}\n機種: ${machineType}\n機械番号: ${machineNumber}\n作�E日晁E ${new Date(item.createdAt).toLocaleString('ja-JP')}\n影響コンポ�EネンチE ${jsonData?.extractedComponents?.join(', ') || 'なぁE}\n痁E��: ${jsonData?.extractedSymptoms?.join(', ') || 'なぁE}\n可能性のある機種: ${jsonData?.possibleModels?.join(', ') || 'なぁE}`,
          repairRequestDate: new Date().toISOString().split('T')[0],
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          repairLocation: '工場冁E��琁E��ペ�Eス',
          images: images.length > 0 ? images : undefined,
          chatHistory:
            jsonData?.conversationHistory ||
            jsonData?.chatData?.messages ||
            undefined,
        };

        console.log(`レポ�EチE{index + 1}の生�E完亁E`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0,
        });

        return reportData;
      });

      console.log('=== レポ�Eトデータ生�E完亁E===');
      console.log('レポ�Eト�E列�E長ぁE', reportDataArray.length);
      console.log(
        '吁E��ポ�Eト�E詳細:',
        reportDataArray.map((report, index) => ({
          index,
          reportId: report.reportId,
          description: report.description,
          images: report.images?.map(img => ({
            url: img.url.substring(0, 50) + (img.url.length > 50 ? '...' : ''),
            fileName: img.fileName,
            isBase64: img.url.startsWith('data:image/'),
          })),
        }))
      );

      setMachineFailureReportData(reportDataArray);
      setShowMachineFailureReport(true);
      console.log('レポ�Eト表示状態を設定完亁E);

      // 成功通知
      alert(
        `レポ�Eトが正常に生�Eされました、En対象アイチE��: ${targetItems.length}件 (選択済み)\n${targetItems.length > 1 ? '褁E��ペ�Eジで表示されます、E : ''}`
      );

      console.log('=== レポ�Eト生成完亁E===');
    } catch (error) {
      console.error('=== レポ�Eト生成エラー ===');
      console.error('エラー詳細:', error);
      console.error(
        'エラースタチE��:',
        error instanceof Error ? error.stack : 'スタチE��トレースなぁE
      );
      alert(
        'レポ�Eト生成中にエラーが発生しました: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      // エラーが発生しても確実にローチE��ング状態をリセチE��
      setReportLoading(false);
      console.log('レポ�Eト生成状態をリセチE��完亁E);
    }
  };

  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/history/file?name=${encodeURIComponent(fileName)}`
      );
      if (!response.ok) {
        throw new Error('チャチE��エクスポ�Eトファイルの取得に失敗しました');
      }

      const data = await response.json();

      // 新しいフォーマット�EチE�Eタを確認して、E��刁E��形式に変換
      const reportData = {
        ...data,
        // 新しいフォーマット�Eフィールドを追加
        title:
          data.title ||
          data.chatData?.machineInfo?.machineTypeName ||
          'タイトルなぁE,
        problemDescription: data.problemDescription || '説明なぁE,
        machineType:
          data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
        machineNumber:
          data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
        extractedComponents: data.extractedComponents || [],
        extractedSymptoms: data.extractedSymptoms || [],
        possibleModels: data.possibleModels || [],
        conversationHistory:
          data.conversationHistory || data.chatData?.messages || [],
        metadata: data.metadata || {
          total_messages: data.chatData?.messages?.length || 0,
          user_messages: 0,
          ai_messages: 0,
          total_media: data.savedImages?.length || 0,
          export_format_version: '1.0',
        },
      };

      setSelectedReportData(reportData);
      setSelectedFileName(fileName);
      setShowReport(true);
    } catch (error) {
      console.error('レポ�Eト表示エラー:', error);
    }
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportData(null);
    setSelectedFileName('');
    // レポ�Eト生成�E状態もリセチE��
    setReportLoading(false);
  };

  const handleSaveReport = (reportData: any) => {
    console.log('レポ�Eトデータを保孁E', reportData);

    // レポ�Eトデータをローカルストレージに保孁E    const savedReports = JSON.parse(
      localStorage.getItem('savedReports') || '[]'
    );
    const newReport = {
      id: Date.now(),
      fileName: selectedFileName,
      reportData: reportData,
      savedAt: new Date().toISOString(),
    };
    savedReports.push(newReport);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));

    console.log('レポ�Eトが保存されました:', newReport);
  };

  // 【削除済み】破損したautoLoadHistoryFiles関数を削除
  // 代わりにdb-history-loader.tsxのloadHistoryFromDBを使用



  // 履歴アイチE��の編雁E��ータをサーバ�Eに保孁E  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編雁E��れた履歴アイチE��を保孁E', editedItem);
      console.log('編雁E��れた履歴アイチE��のID:', editedItem.id);
      console.log('編雁E��れた履歴アイチE��のJSONチE�Eタ:', editedItem.jsonData);

      // IDの確認と準備�E�Export_プレフィチE��スを除去�E�E      let itemId = editedItem.id || editedItem.chatId;
      if (!itemId) {
        alert('アイチE��IDが見つかりません。保存できません、E);
        return;
      }

      // export_プレフィチE��スがある場合�E除去
      if (itemId.startsWith('export_')) {
        itemId = itemId.replace('export_', '');
        // ファイル名�E場合�E拡張子も除去
        if (itemId.endsWith('.json')) {
          itemId = itemId.replace('.json', '');
        }
        // ファイル名からchatIdを抽出�E�Eで区刁E��れた2番目の部刁E��E        const parts = itemId.split('_');
        if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
          itemId = parts[1];
        }
      }

      console.log(
        '使用するID:',
        itemId,
        '允E�EID:',
        editedItem.id || editedItem.chatId
      );

      // 更新チE�Eタの準備�E�変更されたフィールド�Eみを送信�E�E      // 既存�EチE�Eタは保持し、変更された部刁E��けを更新
      const updatePayload = {
        updatedData: {
          // JSONチE�Eタの主要フィールド�Eみ更新�E�既存�EチE�Eタは保持�E�E          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          ...(editedItem.jsonData?.problemDescription && { problemDescription: editedItem.jsonData.problemDescription }),
          ...(editedItem.jsonData?.answer && { answer: editedItem.jsonData.answer }),
          ...(editedItem.jsonData?.machineType && { machineType: editedItem.jsonData.machineType }),
          ...(editedItem.jsonData?.machineNumber && { machineNumber: editedItem.jsonData.machineNumber }),
          ...(editedItem.jsonData?.repairSchedule && { repairSchedule: editedItem.jsonData.repairSchedule }),
          ...(editedItem.jsonData?.location && { location: editedItem.jsonData.location }),
          ...(editedItem.jsonData?.status && { status: editedItem.jsonData.status }),
          ...(editedItem.jsonData?.remarks && { remarks: editedItem.jsonData.remarks }),
          // 画像情報を更新
          ...(editedItem.jsonData?.savedImages && { savedImages: editedItem.jsonData.savedImages }),
          // 基本惁E��も更新�E�ルートレベル�E�E          ...(editedItem.machineType && { machineType: editedItem.machineType }),
          ...(editedItem.machineNumber && { machineNumber: editedItem.machineNumber }),
          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          lastModified: new Date().toISOString(),
        },
        updatedBy: 'user',
      };

      console.log('送信するペイローチE', updatePayload);

      // サーバ�Eに更新リクエストを送信
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      console.log('サーバ�Eレスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('サーバ�Eエラー詳細:', errorText);
        let errorMessage = `履歴の更新に失敗しました (${response.status})`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage += ': ' + errorText;
        }

        alert(errorMessage);
        return;
      }

      const result = await response.json();
      console.log('履歴更新完亁E', result);

      // ローカルストレージも更新
      if (itemId) {
        const savedKey = 'savedMachineFailureReport_' + itemId;
        localStorage.setItem(savedKey, JSON.stringify(editedItem.jsonData));
        console.log('ローカルストレージ更新:', savedKey);
      }

      // 履歴リスト�E該当アイチE��を更新�E�EavedImagesの頁E��も保持�E�E      const updatedItem = {
        ...editedItem,
        jsonData: editedItem.jsonData,
        lastModified: new Date().toISOString(),
        // 基本惁E��も更新
        machineType: editedItem.jsonData?.machineType || editedItem.machineType,
        machineNumber: editedItem.jsonData?.machineNumber || editedItem.machineNumber,
        title: editedItem.jsonData?.title || editedItem.title,
        incidentTitle: editedItem.jsonData?.title || editedItem.incidentTitle,
        // savedImagesを直接設定（一覧表で正しく表示されるよぁE���E�E        savedImages: editedItem.jsonData?.savedImages || [],
      };

      setHistoryItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? updatedItem
            : item
        )
      );

      setFilteredItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? updatedItem
            : item
        )
      );

      // 成功通知
      alert('履歴が正常に更新され、�Eのファイルに上書き保存されました、E);

      // 編雁E��イアログを閉じる
      setShowEditDialog(false);
      setEditingItem(null);

      // 履歴リスト�E再読み込みは行わなぁE��既に更新済み�E�E      console.log('履歴更新完亁E- リスト�E読み込みをスキチE�E');
    } catch (error) {
      console.error('履歴保存エラー:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert('履歴の保存に失敗しました: ' + errorMessage);
    }
  };

  const extractJsonInfo = (jsonData: any) => {
    try {
      const data =
        typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return {
        title: data.title || data.name || '',
        description: data.description || data.content || '',
        emergencyMeasures: data.emergencyMeasures || data.measures || '',
      };
    } catch (error) {
      return {
        title: '',
        description: '',
        emergencyMeasures: '',
      };
    }
  };

  // 機械敁E��報告書のHTML生�E関数
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // JSONチE�Eタを安�Eにエスケープする関数�E�強化版�E�E    const safeJsonStringify = (obj: any): string => {
      try {
        let jsonStr = JSON.stringify(obj);
        // HTMLとJavaScriptで問題になる文字を徹底的にエスケーチE        jsonStr = jsonStr
          .replace(/\\/g, '\\\\') // バックスラチE��ュを最初にエスケーチE          .replace(/"/g, '\\"') // ダブルクォーチE          .replace(/'/g, "\\'") // シングルクォーチE          .replace(/</g, '\\u003c') // <
          .replace(/>/g, '\\u003e') // >
          .replace(/&/g, '\\u0026') // &
          .replace(/\//g, '\\/') // スラチE��ュ
          .replace(/:/g, '\\u003a') // コロン�E�重要E��E          .replace(/\r/g, '\\r') // キャリチE��リターン
          .replace(/\n/g, '\\n') // 改衁E          .replace(/\t/g, '\\t') // タチE          .replace(/\f/g, '\\f') // フォームフィーチE          .replace(/\b/g, '\\b') // バックスペ�Eス
          .replace(/\u2028/g, '\\u2028') // ラインセパレータ
          .replace(/\u2029/g, '\\u2029'); // パラグラフセパレータ

        console.log('🔧 safeJsonStringify result length:', jsonStr.length);
        console.log(
          '🔧 safeJsonStringify sample:',
          jsonStr.substring(0, 100) + '...'
        );
        return jsonStr;
      } catch (e) {
        console.error('JSONのシリアライズに失敁E', e);
        return '{}';
      }
    };
    // 画像を収集�E�ERL形式�Eみ、base64は使用しなぁE��E    const collectImages = (
      data: any
    ): Array<{
      id: string;
      url: string;
      fileName: string;
      description?: string;
    }> => {
      console.log('🖼�E�E画像収雁E��姁E- reportData:', data);
      console.log('🖼�E�EreportData keys:', Object.keys(data || {}));

      const images: Array<{
        id: string;
        url: string;
        fileName: string;
        description?: string;
      }> = [];
      const imageUrls = new Set<string>();

      // 優先頁E��E: savedImagesから画像を取得（最優先！E      if (data?.savedImages && Array.isArray(data.savedImages) && data.savedImages.length > 0) {
        console.log('🖼�E�EsavedImagesから画像を取征E', data.savedImages.length);
        data.savedImages.forEach((img: any, index: number) => {
          const imageUrl = typeof img === 'string' ? img : (img.url || img.path || img.fileName);
          if (imageUrl && !imageUrl.startsWith('data:image/') && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            images.push({
              id: `saved-${index}`,
              url: imageUrl,
              fileName: typeof img === 'object' ? img.fileName || `敁E��画像_${index + 1}` : `敁E��画像_${index + 1}`,
              description: '敁E��箁E��画像！EavedImages�E�E,
            });
          }
        });
      }

      // 優先頁E��E: chatData.messages から画像URLを探ぁE      if (data?.chatData?.messages && Array.isArray(data.chatData.messages)) {
        console.log('🖼�E�EchatData.messagesをスキャン中...');
        data.chatData.messages.forEach((message: any, messageIndex: number) => {
          if (
            message?.content &&
            typeof message.content === 'string' &&
            (message.content.startsWith('/api/images/') || message.content.startsWith('http'))
          ) {
            if (!imageUrls.has(message.content)) {
              imageUrls.add(message.content);
              images.push({
                id: `chatdata-${messageIndex}`,
                url: message.content,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！EhatData.messages�E�E,
              });
              console.log(
                '🖼�E�E画像URL見つかりました�E�EhatData.messages�E�E',
                images.length
              );
            }
          }
        });
      }

      // 優先頁E��E: conversationHistory から画像URLを探ぁE      if (
        data?.conversationHistory &&
        Array.isArray(data.conversationHistory)
      ) {
        console.log('🖼�E�EconversationHistoryをスキャン中...');
        data.conversationHistory.forEach(
          (message: any, messageIndex: number) => {
            if (
              message?.content &&
              typeof message.content === 'string' &&
              (message.content.startsWith('/api/images/') || message.content.startsWith('http'))
            ) {
              if (!imageUrls.has(message.content)) {
                imageUrls.add(message.content);
                images.push({
                  id: `conversation-${messageIndex}`,
                  url: message.content,
                  fileName: `敁E��画僁E{images.length + 1}`,
                  description: '敁E��箁E��画像！EonversationHistory�E�E,
                });
                console.log(
                  '🖼�E�E画像URL見つかりました�E�EonversationHistory�E�E',
                  images.length
                );
              }
            }
          }
        );
      }

      // 優先頁E��E: originalChatData.messages から画像URLを探ぁE      if (
        data?.originalChatData?.messages &&
        Array.isArray(data.originalChatData.messages)
      ) {
        console.log('🖼�E�EoriginalChatData.messagesをスキャン中...');
        data.originalChatData.messages.forEach(
          (message: any, messageIndex: number) => {
            if (
              message?.content &&
              typeof message.content === 'string' &&
              (message.content.startsWith('/api/images/') || message.content.startsWith('http'))
            ) {
              if (!imageUrls.has(message.content)) {
                imageUrls.add(message.content);
                images.push({
                  id: `original-${messageIndex}`,
                  url: message.content,
                  fileName: `敁E��画僁E{images.length + 1}`,
                  description: '敁E��箁E��画像！EriginalChatData�E�E,
                });
                console.log(
                  '🖼�E�E画像URL見つかりました�E�EriginalChatData�E�E',
                  images.length
                );
              }
            }
          }
        );
      }

      // 優先頁E��E: messages から画像URLを探ぁE      if (data?.messages && Array.isArray(data.messages)) {
        console.log('🖼�E�Emessagesをスキャン中...');
        data.messages.forEach((message: any, messageIndex: number) => {
          if (
            message?.content &&
            typeof message.content === 'string' &&
            (message.content.startsWith('/api/images/') || message.content.startsWith('http'))
          ) {
            if (!imageUrls.has(message.content)) {
              imageUrls.add(message.content);
              images.push({
                id: `messages-${messageIndex}`,
                url: message.content,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！Eessages�E�E,
              });
              console.log(
                '🖼�E�E画像URL見つかりました�E�Eessages�E�E',
                images.length
              );
            }
          }
        });
      }

      // 5) savedImages から画像を取得（サーバ�E上�Eファイル�E�E      if (data?.savedImages && Array.isArray(data.savedImages)) {
        console.log('🖼�E�EsavedImagesをスキャン中...');
        data.savedImages.forEach((img: any, index: number) => {
          let imageUrl = '';

          // fileNameがある場合�E、それを優先してURLを生戁E          if (img && typeof img === 'object' && img.fileName) {
            const imagePath = `/api/images/chat-exports/${img.fileName}`;
            let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
            baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
            imageUrl = `${baseUrl}${imagePath}`;
          } else if (img && typeof img === 'object' && img.url) {
            imageUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
          } else if (typeof img === 'string' && !img.startsWith('data:image/')) {
            imageUrl = img.startsWith('http') ? img : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img}`;
          }

          if (imageUrl && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            images.push({
              id: `saved-${index}`,
              url: imageUrl,
              fileName: typeof img === 'object' ? (img.fileName || `敁E��画僁E{images.length + 1}`) : `敁E��画僁E{images.length + 1}`,
              description: '敁E��箁E��画像！EavedImages�E�E,
            });
            console.log('🖼�E�EsavedImagesから画像を取征E', images.length);
          }
        });
      }

      console.log('🖼�E�E画像収雁E��果�E��E種類！E', images.length + '件の画僁E);
      images.forEach((img, index) => {
        console.log(
          '🖼�E�E画像[' + index + ']:',
          img.description,
          '-',
          img.url.substring(0, 50) + '...'
        );
      });

      return images;
    };

    const collectedImages = collectImages(reportData);
    const imageSection =
      collectedImages && collectedImages.length > 0
        ? `             <div class="image-section">
               <h3>敁E��箁E��画僁E/h3>
               <div class="image-grid">
                 ${collectedImages
                   .map(
                     (image, index) => `
                   <div class="image-item">
                     <img class="report-img"
                          src="${image.url}"
                          alt="敁E��画僁E{index + 1}" />
                   </div>
                 `
                   )
                   .join('')}
               </div>
             </div>`
        : '';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>機械敁E��報告書</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'HGS明朝', 'MS Mincho', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: white;
            max-width: 100%;
            overflow-x: hidden;
          }

          /* 印刷時�Eみ斁E��サイズをさらに縮小してA4一枚に収めめE*/
          @media print {
            body {
              font-size: 10pt;
              line-height: 1.2;
            }

            .header h1 {
              font-size: 16pt;
              margin-bottom: 5px;
            }

            .section h2 {
              font-size: 12pt;
              margin-bottom: 5px;
            }

            .info-item strong,
            .info-item span,
            .info-item input,
            .info-item textarea,
            .content-box strong,
            .content-box p {
              font-size: 10pt;
            }

            .header p {
              font-size: 10pt;
            }

            input, textarea, .editable {
              font-size: 10pt;
            }

            /* 印刷時�Eレイアウト最適匁E*/
            .section {
              margin-bottom: 8px;
              page-break-inside: avoid;
            }

            .info-grid {
              gap: 4px;
              margin-bottom: 8px;
            }

            .info-item {
              padding: 4px;
            }

            .content-box {
              padding: 4px;
              margin-top: 4px;
            }

            .image-grid {
              gap: 4px;
              margin: 4px 0;
              grid-template-columns: repeat(2, 1fr);
              max-width: 300px;
            }

            .report-img {
              max-width: 120px;
              max-height: 80px;
            }

            /* A4一枚に収めるため�E調整 */
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            .container {
              max-height: 260mm;
              overflow: hidden;
            }

            .action-buttons {
              display: none !important;
            }

            body {
              margin: 0;
              padding: 0;
            }
          }

          .container {
            max-width: 100%;
            padding: 0;
          }

          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }

          .header h1 {
            font-size: 27pt;
            font-weight: bold;
            margin-bottom: 8px;
          }

          /* 編雁E��ード時のヘッダー統一 */
          .edit-mode .header h1 {
            font-size: 27pt;
            font-weight: bold;
          }

          .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }

          /* 編雁E��ード時のセクション見�Eし統一 */
          .edit-mode .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
          }

          .info-item strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }

          .info-item span,
          .info-item input,
          .info-item textarea {
            font-size: 18pt;
            color: #000;
          }

          .header p {
            font-size: 18pt;
            color: #000;
          }

          /* 編雁E��ード時のヘッダー日付統一 */
          .edit-mode .header p {
            font-size: 18pt;
            color: #000;
          }

          .section {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }



          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 8px;
          }

          .info-item {
            padding: 8px;
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 3px;
          }



          .content-box {
            background-color: #f8f8f8;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 4px;
          }

          .content-box p {
            font-size: 8pt;
            line-height: 1.3;
            margin: 0;
          }

          .image-section {
            margin: 12px 0;
            padding-left: 20px;
            page-break-inside: avoid;
          }

          .image-section h3 {
            font-size: 10pt;
            margin-bottom: 8px;
            text-align: left;
          }

          .image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 8px 0;
            max-width: 100%;
          }

          .image-item {
            text-align: center;
            page-break-inside: avoid;
          }

          .report-img {
            max-width: 120px;
            max-height: 80px;
            width: auto;
            height: auto;
            border: 1px solid #ccc;
            border-radius: 3px;
            object-fit: cover;
            transition: all 0.2s ease;
          }

          .resizable-image {
            position: relative;
            cursor: move;
            user-select: none;
          }

          .resizable-image:hover {
            border: 2px solid #007bff;
            transform: scale(1.02);
          }

          .resizable-image.dragging {
            opacity: 0.7;
            transform: scale(1.1);
            z-index: 1000;
          }

          .image-caption {
            text-align: center;
            margin-top: 5px;
            font-size: 8pt;
            color: #666;
          }

          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #ccc;
            font-size: 7pt;
            color: #666;
          }

          .action-buttons {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
          }

          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }

          .btn-print {
            background: #28a745;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }

          .btn-save {
            background: #ffc107;
            color: #000;
          }

          .btn-cancel {
            background: #6c757d;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }

          .btn-close {
            background: #6c757d;
            color: white;
          }

          .readonly {
            display: block;
          }

          .editable {
            display: none;
            background-color: #f0f0f0;
            color: #000;
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 8px;
            font-size: 18pt;
          }

          /* 編雁E��ード時の斁E��サイズを機械敁E��報告書UIに合わせる */
          .edit-mode .editable {
            font-size: 18pt;
          }

          .edit-mode .info-item strong {
            font-size: 18pt;
          }

          .edit-mode .info-item span {
            font-size: 18pt;
          }

          .edit-mode .content-box strong {
            font-size: 18pt;
          }

          .edit-mode .content-box p {
            font-size: 18pt;
          }

          /* 編雁E��ード時の表示刁E��替ぁE- 確実に動作するよぁE��強匁E*/
          .edit-mode .readonly {
            display: none !important;
            visibility: hidden !important;
          }

          .edit-mode .editable {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            padding: 8px !important;
            border: 2px solid #007bff !important;
            border-radius: 3px !important;
            font-size: 14pt !important;
            color: #000 !important;
            background-color: #fff !important;
            font-family: inherit !important;
          }

          /* チE��ォルトで編雁E��素を確実に非表示 */
          .editable {
            display: none !important;
            visibility: hidden !important;
          }

          /* 読み取り専用要素をデフォルトで表示 */
          .readonly {
            display: inline !important;
            visibility: visible !important;
          }

          input, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 18pt;
            color: #000;
          }

          /* 編雁E��ード時の入力フィールドスタイル統一 */
          .edit-mode input,
          .edit-mode textarea {
            font-size: 18pt;
            color: #000;
          }

          .content-box strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }

          .content-box p {
            font-size: 18pt;
            color: #000;
          }

          @media print {
            .action-buttons { display: none !important; }
            body { margin: 0; }
          }

          /* 編雁E��ード用スタイル */
          .readonly {
            display: inline;
          }

          .editable {
            display: none !important;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
          }

          .edit-mode .readonly {
            display: none !important;
          }

          .edit-mode .editable {
            display: block !important;
            background-color: #ffffcc;
            border: 2px solid #007bff;
          }

          .btn {
            padding: 8px 16px;
            margin: 0 4px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }

          .btn-save {
            background-color: #28a745;
            color: white;
          }

          .btn-cancel {
            background-color: #6c757d;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }

          .btn-print {
            background-color: #17a2b8;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }

          .btn-close {
            background-color: #dc3545;
            color: white;
          }
        </style>
      </head>
      <body>
        <script>
          // シンプルで確実な設宁E          window.reportData = {};
          console.log('Script starting...');
        </script>
        <div class="action-buttons">
          <button class="btn btn-save" id="save-btn" style="display: none;">保孁E/button>
          <button class="btn btn-print" onclick="window.print()">印刷</button>
          <button class="btn btn-cancel" id="cancel-btn" style="display: none;">キャンセル</button>
          <button class="btn btn-close" onclick="window.close()">閉じる</button>
        </div>

        <div class="container">
          <div class="header">
            <h1>機械敁E��報告書</h1>
            <p>印刷日晁E ${new Date().toLocaleString('ja-JP')}</p>
          </div>

          <div class="section">
            <h2>報告概要E/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>報告書ID</strong>
                <span class="readonly">${(reportData.reportId || reportData.id || '').substring(0, 8)}...</span>
                <input class="editable" value="${reportData.reportId || reportData.id || ''}" />
              </div>
              <div class="info-item">
                <strong>機種</strong>
                <span class="readonly">${reportData.machineType || reportData.machineTypeName || '-'}</span>
                <input class="editable" value="${reportData.machineType || reportData.machineTypeName || ''}" />
              </div>
              <div class="info-item">
                <strong>機械番号</strong>
                <span class="readonly">${reportData.machineNumber || '-'}</span>
                <input class="editable" value="${reportData.machineNumber || ''}" />
              </div>
              <div class="info-item">
                <strong>日仁E/strong>
                <span class="readonly">${reportData.date ? new Date(reportData.date).toLocaleDateString('ja-JP') : reportData.timestamp ? new Date(reportData.timestamp).toLocaleDateString('ja-JP') : reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                <input class="editable" type="date" value="${reportData.date || reportData.timestamp || reportData.createdAt || ''}" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${reportData.location || '-'}</span>
                <input class="editable" value="${reportData.location || ''}" />
              </div>
            </div>
          </div>

          <div class="section">
            <h2>敁E��詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>スチE�Eタス</strong>
                <span class="readonly">${reportData.status || '-'}</span>
                <input class="editable" value="${reportData.status || ''}" />
              </div>
              <div class="info-item">
                <strong>責任老E/strong>
                <span class="readonly">${reportData.engineer || '-'}</span>
                <input class="editable" value="${reportData.engineer || ''}" />
              </div>
            </div>

            <div class="content-box">
              <strong>説昁E/strong>
              <p class="readonly">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '説明なぁE}</p>
              <textarea class="editable" rows="4">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || ''}</textarea>
            </div>

            <div class="content-box">
              <strong>備老E/strong>
              <p class="readonly">${reportData.notes || '-'}</p>
              <textarea class="editable" rows="4">${reportData.notes || ''}</textarea>
            </div>
          </div>

          ${imageSection}

          <div class="section">
            <h2>修繕計画</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>依頼月日</strong>
                <span class="readonly">${reportData.requestDate || '-'}</span>
                <input class="editable" type="date" value="${reportData.requestDate || ''}" />
              </div>
              <div class="info-item">
                <strong>予定月日</strong>
                <span class="readonly">${reportData.repairSchedule || '-'}</span>
                <input class="editable" type="date" value="${reportData.repairSchedule || ''}" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${reportData.repairLocation || '-'}</span>
                <input class="editable" value="${reportData.repairLocation || ''}" />
              </div>
            </div>
          </div>

          <div class="section">
            <h2>記事欁E/h2>
            <div class="info-item">
              <strong>備老E�E記亁E/strong>
              <p class="readonly">${reportData.remarks || '-'}</p>
              <textarea class="editable" rows="4" maxlength="200">${reportData.remarks || ''}</textarea>
            </div>
          </div>

          <div class="footer">
            <p>© 2025 機械敁E��報告書. All rights reserved.</p>
          </div>
        </div>

        <script>
          let isEditMode = false;
          let originalData = {};

          // チE�Eタを安�Eに設定する関数
          function setOriginalData(data) {
            try {
              originalData = data;
              console.log('🔧 originalData set:', originalData);
            } catch (e) {
              console.error('originalDataの設定に失敁E', e);
              originalData = {};
            }
          }

          // レポ�Eトデータを設定（グローバル変数から読み取り�E�E          try {
            if (window.reportData) {
              setOriginalData(window.reportData);
              console.log('🔧 チE�Eタをグローバル変数から正常に読み込みました');
            } else {
              console.error('🔧 グローバル変数window.reportDataが見つかりません');
              setOriginalData({});
            }
          } catch (e) {
            console.error('🔧 グローバル変数からのチE�Eタ読み込みに失敁E', e);
            setOriginalData({});
          }

          // 画像表示の初期化とボタンイベント�E設宁E          document.addEventListener('DOMContentLoaded', function() {
            console.log('🔧 DOMContentLoaded - Document ready');
            console.log('🔧 Available edit elements:');
            console.log('🔧 - Readonly elements:', document.querySelectorAll('.readonly').length);
            console.log('🔧 - Editable elements:', document.querySelectorAll('.editable').length);
            console.log('🔧 - Edit button:', !!document.querySelector('.btn-edit'));
            console.log('🔧 Initial CSS classes:', document.body.classList.toString());
            console.log('🔧 originalData:', originalData);

            // 初期状態では編雁E��ードをオフにする
            isEditMode = false;
            document.body.classList.remove('edit-mode');

            // ボタンイベント�E設宁E            setupButtonEvents();

            // 褁E��回実行して確実に設宁E            setTimeout(() => {
              setupButtonEvents();
            }, 100);

            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });

          // ボタンイベントを設定する関数
          function setupButtonEvents() {
            console.log('🔧 setupButtonEvents called');

            // DOM要素の確実な取得�Eため少し征E��E            setTimeout(() => {
              const editBtn = document.getElementById('edit-btn');
              const saveBtn = document.getElementById('save-btn');
              const cancelBtn = document.getElementById('cancel-btn');

              console.log('🔧 ボタンの取得状況E', {
                editBtn: !!editBtn,
                saveBtn: !!saveBtn,
                cancelBtn: !!cancelBtn
              });

              if (editBtn) {
                console.log('🔧 Edit button found, setting up event listener');

                // 既存�Eイベントリスナ�Eをクリア
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode?.replaceChild(newEditBtn, editBtn);

                // 新しいイベントリスナ�Eを追加
                newEditBtn.addEventListener('click', function(e) {
                  console.log('🔧 Edit button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    console.log('🔧 Calling toggleEditMode()...');
                    toggleEditMode();
                  } catch (error) {
                    console.error('🔧 Error in toggleEditMode:', error);
                    alert('編雁E��ード�E刁E��替えでエラーが発生しました: ' + error.message);
                  }
                });

                // ボタンスタイルを設宁E                newEditBtn.style.pointerEvents = 'auto';
                newEditBtn.style.cursor = 'pointer';
                newEditBtn.style.backgroundColor = '#007bff';
                newEditBtn.style.color = 'white';
                newEditBtn.style.border = '1px solid #007bff';
                newEditBtn.style.borderRadius = '4px';
                newEditBtn.style.padding = '8px 16px';
                newEditBtn.style.fontSize = '14px';

                console.log('🔧 Edit button event listener added successfully');
              } else {
              console.error('🔧 Edit button not found!');
              }

              if (saveBtn) {
                const newSaveBtn = saveBtn.cloneNode(true);
                saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);

                newSaveBtn.addEventListener('click', function(e) {
                  console.log('🔧 Save button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    saveReport();
                  } catch (error) {
                    console.error('🔧 Error in saveReport:', error);
                    alert('保存でエラーが発生しました: ' + error.message);
                  }
                });
              }

              if (cancelBtn) {
                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

                newCancelBtn.addEventListener('click', function(e) {
                  console.log('🔧 Cancel button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    toggleEditMode();
                  } catch (error) {
                    console.error('🔧 Error in toggleEditMode (cancel):', error);
                  }
                });
              }

              console.log('🔧 Button event setup complete');
            }, 200); // DOM要素が確実に存在するまで征E��E          }          function toggleEditMode() {
            console.log('🔧 toggleEditMode called, current isEditMode:', isEditMode);
            console.log('🔧 Current document body classList before toggle:', document.body.classList.toString());

            isEditMode = !isEditMode;
            console.log('🔧 toggled isEditMode to:', isEditMode);

            const editBtn = document.getElementById('edit-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            const saveBtn = document.getElementById('save-btn');

            console.log('🔧 Found buttons:', { editBtn: !!editBtn, cancelBtn: !!cancelBtn, saveBtn: !!saveBtn });

            if (isEditMode) {
              console.log('🔧 Entering edit mode...');

              // ボタン表示の変更
              if (editBtn) {
                editBtn.style.display = 'none';
                console.log('🔧 Edit button hidden');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'inline-block';
                cancelBtn.style.backgroundColor = '#6c757d';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = '1px solid #6c757d';
                cancelBtn.style.borderRadius = '4px';
                cancelBtn.style.padding = '8px 16px';
                cancelBtn.style.fontSize = '14px';
                cancelBtn.style.cursor = 'pointer';
                console.log('🔧 Cancel button shown');
              }
              if (saveBtn) {
                saveBtn.style.display = 'inline-block';
                saveBtn.style.backgroundColor = '#28a745';
                saveBtn.style.color = 'white';
                saveBtn.style.border = '1px solid #28a745';
                saveBtn.style.borderRadius = '4px';
                saveBtn.style.padding = '8px 16px';
                saveBtn.style.fontSize = '14px';
                saveBtn.style.cursor = 'pointer';
                console.log('🔧 Save button shown');
              }

              // 編雁E��ードクラスを追加
              document.body.classList.add('edit-mode');
              console.log('🔧 Added edit-mode class, classList:', document.body.classList.toString());

              // 要素の表示を確実に刁E��替ぁE              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');

              console.log('🔧 Found elements for toggle:', {
                readonly: readonlyElements.length,
                editable: editableElements.length
              });

              readonlyElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden readonly element', index);
              });

              editableElements.forEach((el, index) => {
                el.style.display = 'block !important';
                el.style.visibility = 'visible';
                // 入力フィールド�E背景色を変更して編雁E��であることを�E確にする
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.style.backgroundColor = '#ffffcc';
                  el.style.border = '2px solid #007bff';
                  el.removeAttribute('readonly');
                  el.removeAttribute('disabled');
                }
                console.log('🔧 Shown editable element', index, 'tag:', el.tagName);
              });

              // 編雁E��ード時に入力フィールド�E値を設宁E              setupEditFields();

              console.log('🔧 Edit mode setup complete');
            } else {
              console.log('🔧 Exiting edit mode...');

              // ボタン表示の変更
              if (editBtn) {
                editBtn.style.display = 'inline-block';
                console.log('🔧 Edit button shown');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'none';
                console.log('🔧 Cancel button hidden');
              }
              if (saveBtn) {
                saveBtn.style.display = 'none';
                console.log('🔧 Save button hidden');
              }

              // 編雁E��ードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());

              // 要素の表示を確実に刁E��替ぁE              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');

              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('🔧 Shown readonly element', index);
              });

              editableElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden editable element', index);
              });

              // 編雁E�E容を�Eに戻ぁE              resetToOriginal();

              console.log('🔧 Read-only mode setup complete');
            }
          }
                console.log('🔧 Save button hidden');
              }

              // 編雁E��ードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());

              // 要素の表示を強制皁E��刁E��替ぁE              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('🔧 Shown readonly element', index);
              });

              editableElements.forEach((el, index) => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden editable element', index);
              });

              // 編雁E�E容を�Eに戻ぁE              resetToOriginal();

              console.log('🔧 Read-only mode setup complete');
            }
          }

          // グローバルスコープでも利用可能にする
          window.toggleEditMode = toggleEditMode;

          // ペ�Eジが完�Eに読み込まれた後にも�Eタンイベントを再設宁E          window.addEventListener('load', function() {
            console.log('🔧 Window load event - page fully loaded');
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });

          function setupEditFields() {
            console.log('🔧 setupEditFields called');
            // 吁E�E力フィールドに適刁E��値を設宁E            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');

            console.log('🔧 Found inputs:', inputs.length, 'textareas:', textareas.length);

            // 入力フィールド�E値を設宁E            inputs.forEach((input, index) => {
              console.log('🔧 Setting up input', index, input);
              if (index === 0) input.value = originalData.reportId || originalData.id || '';
              if (index === 1) input.value = originalData.machineType || originalData.machineTypeName || '';
              if (index === 2) input.value = originalData.machineNumber || '';
              if (index === 3) {
                const dateValue = originalData.date || originalData.timestamp || originalData.createdAt;
                if (dateValue) {
                  const date = new Date(dateValue);
                  input.value = date.toISOString().split('T')[0];
                }
              }
              if (index === 4) input.value = originalData.location || '';
              if (index === 5) input.value = originalData.status || '';
              if (index === 6) input.value = originalData.engineer || '';
              if (index === 7) input.value = originalData.requestDate || '';
              if (index === 8) input.value = originalData.repairSchedule || '';
              if (index === 9) input.value = originalData.repairLocation || '';
            });

            // チE��ストエリアの値を設宁E            textareas.forEach((textarea, index) => {
              if (index === 0) {
                textarea.value = originalData.problemDescription || originalData.description || originalData.incidentTitle || originalData.title || '';
              }
              if (index === 1) {
                textarea.value = originalData.notes || '';
              }
            });
          }

          function resetToOriginal() {
            // 入力フィールドを允E�E値に戻ぁE            setupEditFields();
          }

          async function saveReport() {
            console.log('保存�E琁E��姁E);
            console.log('originalData:', originalData);
            console.log('originalData.id:', originalData.id);
            console.log('originalData.chatId:', originalData.chatId);
            console.log('originalData.reportId:', originalData.reportId);
            console.log('originalData.fileName:', originalData.fileName);

            // 編雁E��れたチE�Eタを収雁E            const updatedData = { ...originalData };

            // 吁E�E力フィールドから値を取征E            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');

            console.log('入力フィールド数:', inputs.length);
            console.log('チE��ストエリア数:', textareas.length);

            // 入力フィールド�E値を取征E            inputs.forEach((input, index) => {
              if (index === 0) updatedData.reportId = input.value;
              if (index === 1) updatedData.machineType = input.value;
              if (index === 2) updatedData.machineNumber = input.value;
              if (index === 3) updatedData.date = input.value;
              if (index === 4) updatedData.location = input.value;
              if (index === 5) updatedData.status = input.value;
              if (index === 6) updatedData.engineer = input.value;
              if (index === 7) updatedData.requestDate = input.value;
              if (index === 8) updatedData.repairSchedule = input.value;
              if (index === 9) updatedData.repairLocation = input.value;
            });

            // チE��ストエリアの値を取征E            textareas.forEach((textarea, index) => {
              if (index === 0) {
                updatedData.problemDescription = textarea.value;
              }
              if (index === 1) {
                updatedData.notes = textarea.value;
              }
            });

            console.log('更新されたデータ:', updatedData);
            console.log('使用するchatId:', updatedData.chatId || updatedData.id);

            // ローカルストレージに保孁E            localStorage.setItem('savedMachineFailureReport_' + updatedData.id, JSON.stringify(updatedData));

            // 履歴チE�Eタを更新�E�親ウィンドウの履歴一覧表を更新�E�E            try {
              if (window.opener && !window.opener.closed) {
                // 親ウィンドウの履歴チE�Eタを更新
                window.opener.postMessage({
                  type: 'UPDATE_HISTORY_ITEM',
                  data: updatedData
                }, '*');

                // 親ウィンドウのローカルストレージも更新
                try {
                  const parentStorage = window.opener.localStorage;
                  const historyKey = 'savedMachineFailureReport_' + updatedData.id;
                  parentStorage.setItem(historyKey, JSON.stringify(updatedData));
                } catch (storageError) {
                  console.warn('親ウィンドウのローカルストレージ更新に失敁E', storageError);
                }
              }
            } catch (error) {
              console.warn('親ウィンドウへの通知に失敁E', error);
            }

            // 允E�EチE�Eタを更新
            originalData = updatedData;

            // UIを更新
            updateUIAfterSave(updatedData);

            // 編雁E��ードを終亁E            toggleEditMode();

            // 成功メチE��ージを表示
            alert('レポ�Eトが保存されました。履歴アイチE��も更新されます、E);

            // サーバ�Eへの保存も試衁E            try {
              await saveToJsonFile(updatedData);
            } catch (error) {
              console.warn('サーバ�Eへの保存�E失敗しましたが、ローカルには保存されてぁE��ぁE', error);
            }
          }

          async function saveToJsonFile(updatedData) {
            try {
              console.log('サーバ�Eへの保存開姁E', updatedData);

              // 正しいIDを取征E              let targetId = originalData.id || originalData.chatId || originalData.reportId;

              // IDが取得できなぁE��合�E、ファイル名からUUIDを抽出
              if (!targetId && originalData.fileName) {
                console.log('ファイル名からUUID抽出を試衁E', originalData.fileName);

                // UUIDパターン1: 標準的なUUID形弁E                let fileNameMatch = originalData.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);

                if (fileNameMatch) {
                  targetId = fileNameMatch[1];
                  console.log('標準UUIDから抽出したID:', targetId);
                } else {
                  // UUIDパターン2: アンダースコア区刁E��のUUID
                  fileNameMatch = originalData.fileName.match(/_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                  if (fileNameMatch) {
                    targetId = fileNameMatch[1];
                    console.log('アンダースコア区刁E��UUIDから抽出したID:', targetId);
                  }
                }
              }

              if (!targetId) {
                console.error('対象IDが特定できません:', originalData);
                throw new Error('対象IDが特定できません');
              }

              console.log('保存対象ID:', targetId);

              // 更新チE�Eタの準備
              const updatePayload = {
                updatedData: updatedData,
                updatedBy: 'user'
              };

              console.log('送信するペイローチE', updatePayload);

              // サーバ�EAPIを呼び出して履歴アイチE��を更新
              const response = await fetch('/api/history/update-item/' + targetId, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload)
              });

              console.log('サーバ�Eレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));

              if (response.ok) {
                const result = await response.json();
                console.log('履歴ファイルが正常に更新されました:', result);

                // 成功メチE��ージを表示
                alert('レポ�Eトが允E�Eファイルに正常に上書き保存されました、E);

                return result;
              } else {
                const errorData = await response.json();
                console.error('サーバ�Eエラー:', errorData);
                throw new Error(errorData.error || 'サーバ�Eエラー: ' + response.status);
              }

            } catch (error) {
              console.error('JSONファイル保存エラー:', error);
              throw error;
            }
          }
                    engineer: updatedData.engineer,
                    location: updatedData.location,
                    requestDate: updatedData.requestDate,
                    repairSchedule: updatedData.repairSchedule,
                    repairLocation: updatedData.repairLocation,
                    lastModified: new Date().toISOString()
                  },
                  updatedBy: 'user'
                })
              });

              console.log('サーバ�Eレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));

              if (response.ok) {
                try {
                  const result = await response.json();
                  console.log('履歴アイチE��が正常に更新されました:', result);

                  // 保存�E功後�E処琁E                  updateUIAfterSave(updatedData);

                  // 成功メチE��ージを表示
                  alert('履歴アイチE��が正常に更新されました、E);
                } catch (parseError) {
                  console.warn('レスポンスの解析に失敗しましたが、保存�E成功してぁE��ぁE', parseError);
                  updateUIAfterSave(updatedData);
                  alert('履歴アイチE��が更新されました、E);
                }
              } else {
                let errorMessage = 'サーバ�Eエラー';
                try {
                  // レスポンスのContent-Typeを確誁E                  const contentType = response.headers.get('content-type');
                  if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('エラーレスポンス詳細:', errorData);
                    if (errorData.error) {
                      errorMessage = errorData.error;
                    } else if (errorData.message) {
                      errorMessage = errorData.message;
                    } else {
                      errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                    }
                  } else {
                    // HTMLレスポンスの場吁E                    const textResponse = await response.text();
                    console.error('HTMLレスポンス:', textResponse.substring(0, 200));
                    errorMessage = 'HTTP ' + response.status + ': ' + response.statusText + ' (HTMLレスポンス)';
                  }
                } catch (parseError) {
                  console.error('エラーレスポンスの解析に失敁E', parseError);
                  errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                }

                console.error('履歴アイチE��の更新に失敗しました:', errorMessage);
                alert('履歴アイチE��の更新に失敗しました: ' + errorMessage);
              }
            } catch (error) {
              console.error('保存エラー:', error);
              console.error('エラースタチE��:', error.stack);
              alert('保存中にエラーが発生しました: ' + error.message);
            }
          }

          function updateUIAfterSave(updatedData) {
            // 保存後にUIを更新
            const readonlyElements = document.querySelectorAll('.readonly');

            // 報告書ID
            if (readonlyElements[0]) {
              readonlyElements[0].textContent = (updatedData.reportId || updatedData.id || '').substring(0, 8) + '...';
            }

            // 機種
            if (readonlyElements[1]) {
              readonlyElements[1].textContent = updatedData.machineType || updatedData.machineTypeName || '-';
            }

            // 機械番号
            if (readonlyElements[2]) {
              readonlyElements[2].textContent = updatedData.machineNumber || '-';
            }

            // 日仁E            if (readonlyElements[3]) {
              const dateValue = updatedData.date || updatedData.timestamp || updatedData.createdAt;
              if (dateValue) {
                const date = new Date(dateValue);
                readonlyElements[3].textContent = date.toLocaleDateString('ja-JP');
              } else {
                readonlyElements[3].textContent = '-';
              }
            }

            // 場所
            if (readonlyElements[4]) {
              readonlyElements[4].textContent = updatedData.location || '-';
            }

            // スチE�Eタス
            if (readonlyElements[5]) {
              readonlyElements[5].textContent = updatedData.status || '-';
            }

            // 責任老E            if (readonlyElements[6]) {
              readonlyElements[6].textContent = updatedData.engineer || '-';
            }

            // 説昁E            if (readonlyElements[7]) {
              readonlyElements[7].textContent = updatedData.problemDescription || updatedData.description || updatedData.incidentTitle || updatedData.title || '説明なぁE;
            }

            // 備老E            if (readonlyElements[8]) {
              readonlyElements[8].textContent = updatedData.notes || '-';
            }

            // 依頼月日
            if (readonlyElements[9]) {
              readonlyElements[9].textContent = updatedData.requestDate || '-';
            }

            // 予定月日
            if (readonlyElements[10]) {
              readonlyElements[10].textContent = updatedData.repairSchedule || '-';
            }

            // 修繕場所
            if (readonlyElements[11]) {
              readonlyElements[11].textContent = updatedData.repairLocation || '-';
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  // 画像取得�E共通関数�E�EB画像レコード優先版�E�E  function pickFirstImage(data: any): string | null {
    console.log('🖼�E�EpickFirstImage - チE�Eタ刁E��:', {
      hasImages: !!data?.images,
      imagesLength: data?.images?.length || 0,
      hasSavedImages: !!data?.savedImages,
      savedImagesLength: data?.savedImages?.length || 0,
      hasConversationHistory: !!data?.conversationHistory,
      hasImagePath: !!data?.imagePath,
      hasImageUrl: !!data?.imageUrl,
      dataKeys: Object.keys(data || {})
    });

    // 1) imageUrl を最優先（直接設定された画像URL�E�E    if (typeof data?.imageUrl === 'string' && data.imageUrl.trim()) {
      console.log('🖼�E�EpickFirstImage - imageUrl:', data.imageUrl);
      return data.imageUrl.startsWith('http') ? data.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${data.imageUrl}`;
    }

    // 2) imagePath(URL) を優允E    if (typeof data?.imagePath === 'string' && data.imagePath.trim()) {
      console.log('🖼�E�EpickFirstImage - imagePath:', data.imagePath);
      return data.imagePath.startsWith('http') ? data.imagePath : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${data.imagePath}`;
    }

    // 3) savedImages から URL を取得！EB画像レコード優先！E    // まず、ルートレベルのsavedImagesを確誁E    let savedImagesArray = data?.savedImages;
    // 次に、jsonData.savedImagesを確認（編雁E��に更新される可能性がある！E    if (!savedImagesArray || savedImagesArray.length === 0) {
      savedImagesArray = data?.jsonData?.savedImages;
    }

    if (Array.isArray(savedImagesArray) && savedImagesArray.length > 0) {
      const firstImage = savedImagesArray[0];
      console.log('🖼�E�EpickFirstImage - savedImages[0]:', firstImage);

      if (typeof firstImage === 'string') {
        // base64チE�EタではなぁE��合�Eみ返す
        if (!firstImage.startsWith('data:image/')) {
          return firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${firstImage}`;
        }
      }

      if (firstImage && typeof firstImage === 'object') {
        // fileNameがある場合�E、それを優先して使用
        if (firstImage.fileName) {
          const imagePath = `/api/images/chat-exports/${firstImage.fileName}`;
          console.log('🖼�E�EpickFirstImage - savedImagesからfileName取征E', imagePath);
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          return `${baseUrl}${imagePath}`;
        }
        // urlやpathがある場吁E        const imageUrl = firstImage.url || firstImage.path;
        if (imageUrl && !imageUrl.startsWith('data:image/')) {
          const finalUrl = imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
          console.log('🖼�E�EpickFirstImage - savedImagesからurl/path取征E', finalUrl);
          return finalUrl;
        }
      }
    }

    // 4) images配�Eから直接ファイル名を取得！EB画像レコード！E    if (Array.isArray(data?.images) && data.images.length > 0) {
      const firstImage = data.images[0];
      console.log('🖼�E�EpickFirstImage - images[0]:', firstImage);

      if (firstImage && typeof firstImage === 'object' && firstImage.fileName) {
        const imagePath = `/api/images/chat-exports/${firstImage.fileName}`;
        console.log('🖼�E�EpickFirstImage - DB画像レコードから取征E', imagePath);
        // ベ�EスURLを取得（末尾の/apiめEを削除�E�E        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        return `${baseUrl}${imagePath}`;
      }
    }

    // 5) conversationHistory から画像URLを検索
    if (Array.isArray(data?.conversationHistory)) {
      for (const msg of data.conversationHistory) {
        if (msg.content && typeof msg.content === 'string' && (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))) {
          console.log('🖼�E�EpickFirstImage - conversationHistoryから画像URLを発要E);
          return msg.content;
        }
      }
    }

    // 6) 履歴IDから画像ファイルを推測�E�最後�E手段�E�E    if (typeof data?.id === 'string' || typeof data?.chatId === 'string') {
      const historyId = data.id || data.chatId;
      console.log('🖼�E�EpickFirstImage - 履歴IDから画像を推測:', historyId);

      // 褁E��のファイル名パターンを試衁E      const possibleFilenames = [
        `${historyId}_3_0.jpeg`,  // 新しい形弁E        `${historyId}_2_0.jpeg`,
        `${historyId}_1_0.jpeg`,
        `${historyId}_0_0.jpeg`,
        `${historyId}.jpg`,       // シンプル形弁E        `${historyId}.jpeg`,
        `chat_image_${historyId}_*.jpg`  // 古ぁE��式（ワイルドカード�E後で処琁E��E      ];

      // 実際のファイル存在確認�Eサーバ�E側で行うため、最初�Eパターンを返す
      const imagePath = `/api/images/chat-exports/${possibleFilenames[0]}`;
      console.log('🖼�E�EpickFirstImage - 推測された画像パス:', imagePath);
      // ベ�EスURLを取得（末尾の/apiめEを削除�E�E      let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      return `${baseUrl}${imagePath}`;
    }

    // 7) fileNameから推測
    if (typeof data?.fileName === 'string') {
      const fileName = data.fileName;
      const baseFileName = fileName.replace(/\.json$/, '');
      const imagePath = `/api/images/chat-exports/${baseFileName}_3_0.jpeg`;
      console.log('🖼�E�EpickFirstImage - fileNameから推測:', imagePath);
      // ベ�EスURLを取得（末尾の/apiめEを削除�E�E      let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      return `${baseUrl}${imagePath}`;
    }

    console.log('🖼�E�EpickFirstImage - 画像が見つかりませんでした');
    return null;
  }

  // 印刷用CSS
  const PRINT_STYLES = `
<style>
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body { margin: 0; padding: 0; }
    .no-print, .print:hidden { display: none !important; }
    img, .image-cell, .image-section { page-break-inside: avoid; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
  }
  /* 画面プレビュー用�E�印刷専用ウィンドウでは最小限でOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

  // 一覧印刷用HTML生�E
  const generateListPrintHTML = (items: any[]): string => {
    const rows = items
      .map(item => {
        const imageUrl = pickFirstImage(item);
        const imageCell = imageUrl
          ? `<img class="thumb" src="${imageUrl}" alt="画僁E />`
          : '-';

        return `
        <tr>
          <td>${item.title || item.incidentTitle || 'タイトルなぁE}</td>
          <td>${item.machineType || item.machineTypeName || '-'}</td>
          <td>${item.machineNumber || '-'}</td>
          <td>${item.date || item.timestamp || '-'}</td>
          <td>${item.status || '-'}</td>
          <td>${imageCell}</td>
        </tr>
      `;
      })
      .join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>敁E��一覧印刷</title>
        ${PRINT_STYLES}
      </head>
      <body>
        <h1>敁E��一覧</h1>
        <table>
          <thead>
            <tr>
              <th>タイトル</th>
              <th>機種</th>
              <th>機械番号</th>
              <th>日仁E/th>
              <th>スチE�Eタス</th>
              <th>画僁E/th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  // 一覧印刷実衁E  const printList = (items: any[]) => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;

    const contentHTML = generateListPrintHTML(items);
    w.document.write(contentHTML);
    w.document.close();

    // 印刷ダイアログを表示
    setTimeout(() => {
      w.print();
    }, 100);
  };

  // 印刷機�E
  const handlePrintTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 選択された履歴のみを印刷対象とする
    const targetItems =
      selectedItems.size > 0
        ? filteredItems.filter(item => selectedItems.has(item.id))
        : filteredItems;

    const tableContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>履歴一覧 - 印刷</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            html, body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            img, .image-cell { break-inside: avoid; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
          .image-cell img { max-width: 100px; max-height: 100px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; display: block; margin: 0 auto; }
          .image-cell { text-align: center; vertical-align: middle; }
          img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>敁E��履歴一覧</h1>
          <p>印刷日晁E ${new Date().toLocaleString('ja-JP')}</p>
          <p>対象件数: ${targetItems.length}件${selectedItems.size > 0 ? ' (選択された履歴)' : ''}</p>
        </div>

        <div class="summary">
          <strong>印刷対象:</strong> ${selectedItems.size > 0 ? '選択された履歴' : '敁E��履歴一覧'}<br>
          <strong>印刷日晁E</strong> ${new Date().toLocaleString('ja-JP')}<br>
          <strong>対象件数:</strong> ${targetItems.length}件
        </div>

        <table>
          <thead>
            <tr>
              <th>機種</th>
              <th>機械番号</th>
              <th>事象</th>
              <th>説昁E/th>
              <th>作�E日晁E/th>
              <th>画僁E/th>
            </tr>
          </thead>
          <tbody>
            ${targetItems
              .map(item => {
                const jsonData = item.jsonData;
                const machineType =
                  jsonData?.machineType ||
                  jsonData?.originalChatData?.machineInfo?.machineTypeName ||
                  jsonData?.chatData?.machineInfo?.machineTypeName ||
                  item.machineType ||
                  '';
                const machineNumber =
                  jsonData?.machineNumber ||
                  jsonData?.originalChatData?.machineInfo?.machineNumber ||
                  jsonData?.chatData?.machineInfo?.machineNumber ||
                  item.machineNumber ||
                  '';
                const incidentTitle =
                  jsonData?.title || jsonData?.question || '事象なぁE;
                const problemDescription =
                  jsonData?.problemDescription ||
                  jsonData?.answer ||
                  '説明なぁE;

                // pickFirstImage関数を使用して画像URLを取征E                const imageUrl = pickFirstImage(item);

                return `
                <tr>
                  <td>${machineType}</td>
                  <td>${machineNumber}</td>
                  <td>${incidentTitle}</td>
                  <td>${problemDescription}</td>
                  <td>${formatDate(item.createdAt)}</td>
                  <td class="image-cell">${imageUrl ? `<img class="thumb" src="${imageUrl}" alt="敁E��画僁E onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span style="display:none; color: #999; font-size: 10px;">画像読み込みエラー</span>` : 'なぁE}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.close()">閉じる</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(tableContent);
    printWindow.document.close();

    // 印刷ダイアログを�E動的に表示
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  const handlePrintReport = (item: SupportHistoryItem) => {
    console.log('🖨�E�E印刷レポ�Eト開姁E', item);

    // 編雁E��面が開ぁE��ぁE��場合�E、編雁E��面のチE�Eタを優先的に使用
    const sourceItem = showEditDialog && editingItem && editingItem.id === item.id ? editingItem : item;
    console.log('🔍 印刷チE�Eタソース:', {
      fromEditDialog: showEditDialog && editingItem && editingItem.id === item.id,
      editingItemTitle: editingItem?.jsonData?.title,
      itemTitle: item.jsonData?.title,
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('❁E印刷ウィンドウを開けませんでした');
      alert('印刷ウィンドウを開けませんでした。�EチE�EアチE�EブロチE��を無効にしてください、E);
      return;
    }
    console.log('✁E印刷ウィンドウを開きました');

    // jsonDataの取得を確実にする�E�文字�Eの場合�Eパ�Eス�E�E    let jsonData = sourceItem.jsonData;
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (e) {
        console.error('JSONチE�Eタのパ�Eスに失敁E', e);
        jsonData = {};
      }
    }

    // 事象タイトルを取得（編雁E��面のロジチE��と同じ�E�E    // 編雁E��面では: editingItem.jsonData.title を直接使用、なければファイル名から抽出
    let incidentTitle = sourceItem.jsonData?.title || sourceItem.jsonData?.question || '';

    // 編雁E��面と同じロジチE��でファイル名から抽出
    if (!incidentTitle || incidentTitle.trim() === '') {
      if (sourceItem.fileName) {
        const firstUnderscoreIndex = sourceItem.fileName.indexOf('_');
        if (firstUnderscoreIndex > 0) {
          incidentTitle = sourceItem.fileName.substring(0, firstUnderscoreIndex);
        } else {
          // 「_」がなぁE��合�E、拡張子を除ぁE��全体を返す
          incidentTitle = sourceItem.fileName.replace(/\.json$/, '');
        }
      }
    }

    // 最終的に取得できなぁE��合�E、chatData.messagesから抽出
    if ((!incidentTitle || incidentTitle.trim() === '') && jsonData?.chatData?.messages) {
      const userMessages = jsonData.chatData.messages.filter(
        (msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/')
      );
      if (userMessages.length > 0) {
        incidentTitle = userMessages[0].content || '';
      }
    }

    // チE��チE��用ログ�E�詳細版！E    console.log('🔍 印刷用事象タイトル�E�詳細�E�E', {
      '最終的なincidentTitle': incidentTitle,
      'incidentTitleの垁E: typeof incidentTitle,
      'incidentTitleの長ぁE: incidentTitle?.length,
      '編雁E��面から取征E: showEditDialog && editingItem && editingItem.id === item.id,
      'sourceItem.jsonData.title': sourceItem.jsonData?.title,
      'sourceItem.jsonData.question': sourceItem.jsonData?.question,
      'jsonData.title': jsonData?.title,
      'jsonData.question': jsonData?.question,
      'sourceItem.title': sourceItem.title,
      'sourceItem.fileName': sourceItem.fileName,
      'sourceItem.jsonData全佁E: JSON.stringify(sourceItem.jsonData || {}, null, 2).substring(0, 500),
    });

    // 事象説明を抽出�E�編雁E��面から優先的に取得！E    // 優先頁E��E 編雁E��面のjsonData.problemDescription > 編雁E��面のjsonData.answer > 通常のjsonData > chatData.messages
    let problemDescription = '';

    // 1. 編雁E��面から直接取得（最優先！E    if (sourceItem.jsonData?.problemDescription && sourceItem.jsonData.problemDescription.trim() !== '') {
      problemDescription = sourceItem.jsonData.problemDescription;
    } else if (sourceItem.jsonData?.answer && sourceItem.jsonData.answer.trim() !== '') {
      problemDescription = sourceItem.jsonData.answer;
    } else if (jsonData?.problemDescription && jsonData.problemDescription.trim() !== '') {
      problemDescription = jsonData.problemDescription;
    } else if (jsonData?.answer && jsonData.answer.trim() !== '') {
      problemDescription = jsonData.answer;
    }

    // 2. 事象説明がなぁE��合�E、chatData.messagesからユーザーメチE��ージを抽出
    if (!problemDescription && jsonData?.chatData?.messages) {
      const userMessages = jsonData.chatData.messages
        .filter((msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/'))
        .map((msg: any) => msg.content)
        .join('\n');
      if (userMessages) {
        problemDescription = userMessages;
      }
    }

    if (!problemDescription) {
      problemDescription = '説明なぁE;
    }

    // 機種と機械番号を抽出�E�編雁E��面から優先的に取得！E    const machineType =
      sourceItem.machineInfo?.machineTypeName ||
      sourceItem.jsonData?.machineType ||
      jsonData?.machineType ||
      jsonData?.chatData?.machineInfo?.machineTypeName ||
      sourceItem.machineType ||
      item.machineInfo?.machineTypeName ||
      item.machineType ||
      '';
    const machineNumber =
      sourceItem.machineInfo?.machineNumber ||
      sourceItem.jsonData?.machineNumber ||
      jsonData?.machineNumber ||
      jsonData?.chatData?.machineInfo?.machineNumber ||
      sourceItem.machineNumber ||
      item.machineInfo?.machineNumber ||
      item.machineNumber ||
      '';

    const extractedComponents = jsonData?.extractedComponents || [];
    const extractedSymptoms = jsonData?.extractedSymptoms || [];
    const possibleModels = jsonData?.possibleModels || [];

    // 場所を取得（編雁E��面から優先的に取得！E    const location =
      sourceItem.jsonData?.location ||
      jsonData?.location ||
      '○○緁E;

    // チE��チE��用ログ
    console.log('🔍 印刷用チE�Eタ:', {
      incidentTitle,
      location,
      problemDescription: problemDescription.substring(0, 50) + '...',
    });

    // 画像URLを取得（優先頁E��付き�E�E    let imageUrl = '';
    let imageFileName = '';

    console.log('個別レポ�Eト印刷用画像読み込み処琁E', {
      itemId: item.id,
      hasJsonData: !!jsonData,
      jsonDataKeys: jsonData ? Object.keys(jsonData) : [],
      savedImages: jsonData?.savedImages,
      conversationHistory: jsonData?.conversationHistory,
      originalChatData: jsonData?.originalChatData,
      chatData: jsonData?.chatData,
      imagePath: item.imagePath,
    });

    // 優先頁E��E: savedImagesから画像を取得（最優先！E    if (
      jsonData?.savedImages &&
      Array.isArray(jsonData.savedImages) &&
      jsonData.savedImages.length > 0
    ) {
      const firstImage = jsonData.savedImages[0];
      const imgUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage.path || firstImage.fileName);
      if (imgUrl && !imgUrl.startsWith('data:image/')) {
        imageUrl = imgUrl;
        imageFileName = typeof firstImage === 'object' ? firstImage.fileName || `敁E��画像_${item.id}` : `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: savedImagesから画像を取得（最優先！E
        );
      }
    }

    // 優先頁E��E: conversationHistoryから画像URLを取征E    if (
      !imageUrl &&
      jsonData?.conversationHistory &&
      jsonData.conversationHistory.length > 0
    ) {
      const imageMessage = jsonData.conversationHistory.find(
        (msg: any) => msg.content && (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: conversationHistoryから画像URLを取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: originalChatData.messagesから画像URLを取征E    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find(
        (msg: any) => msg.content && (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: originalChatDataから画像URLを取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: chatData.messagesから画像URLを取征E    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find(
        (msg: any) => msg.content && (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: chatDataから画像URLを取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: 直接のmessagesフィールドから画像URLを検索
    if (!imageUrl && jsonData?.messages && Array.isArray(jsonData.messages)) {
      const imageMessage = jsonData.messages.find(
        (msg: any) => msg.content && (msg.content.startsWith('/api/images/') || msg.content.startsWith('http'))
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: messagesフィールドから画像URLを取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: savedImagesから画像を取得（サーバ�E上�Eファイル�E�E    if (!imageUrl && jsonData?.savedImages && jsonData.savedImages.length > 0) {
      const savedImage = jsonData.savedImages[0];

      // fileNameがある場合�E、それを優先してURLを生戁E      if (savedImage.fileName) {
        const imagePath = `/api/images/chat-exports/${savedImage.fileName}`;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        imageUrl = `${baseUrl}${imagePath}`;
        imageFileName = savedImage.fileName;
        console.log('個別レポ�Eト印刷用: savedImagesからfileName取得（優先頁E��E�E�E', imageUrl);
      } else if (savedImage.url) {
        // urlがある場吁E        if (savedImage.url.startsWith('http')) {
          imageUrl = savedImage.url;
        } else {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${savedImage.url}`;
        }
        imageFileName = savedImage.fileName || `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: savedImagesからurl取得（優先頁E��E�E�E', imageUrl);
      } else if (savedImage.path) {
        // pathがある場吁E        if (savedImage.path.startsWith('http')) {
          imageUrl = savedImage.path;
        } else {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          const imagePath = savedImage.path.startsWith('/') ? savedImage.path : `/api/images/chat-exports/${savedImage.path}`;
          imageUrl = `${baseUrl}${imagePath}`;
        }
        imageFileName = savedImage.fileName || `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: savedImagesからpath取得（優先頁E��E�E�E', imageUrl);
      }

      if (!imageUrl) {
        console.log('個別レポ�Eト印刷用: savedImagesから画像を取得（優先頁E��E�E�E- URL生�E失敁E);
      }
    }

    // 優先頁E��E: originalChatData.messagesからBase64画像を取征E    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: originalChatDataからBase64画像を取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: 従来フォーマット�EchatData.messagesからBase64画像を取征E    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log(
          '個別レポ�Eト印刷用: chatDataからBase64画像を取得（優先頁E��E�E�E
        );
      }
    }

    // 優先頁E��E: そ�E他�E可能性のあるフィールドから画像を検索
    if (!imageUrl) {
      // 画像データが含まれる可能性のあるフィールドを再帰皁E��検索
      const findImagesRecursively = (obj: any, path: string = ''): any[] => {
        const foundImages = [];
        if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof value === 'string' && value.startsWith('data:image/')) {
              foundImages.push({
                path: currentPath,
                content: value,
              });
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                foundImages.push(
                  ...findImagesRecursively(item, `${currentPath}[${index}]`)
                );
              });
            } else if (typeof value === 'object' && value !== null) {
              foundImages.push(...findImagesRecursively(value, currentPath));
            }
          }
        }
        return foundImages;
      };

      const recursiveImages = findImagesRecursively(jsonData);
      if (recursiveImages.length > 0) {
        imageUrl = recursiveImages[0].content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: 再帰皁E��索で画像を取得（優先頁E��E�E�E);
      }
    }

    // 優先頁E��E: 従来のimagePathフィールド（最終フォールバック�E�E    if (!imageUrl && item.imagePath) {
      if (item.imagePath.startsWith('http')) {
        imageUrl = item.imagePath;
      } else if (item.imagePath.startsWith('/')) {
        // /で始まる場吁E        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        // パスが既に/apiで始まってぁE��場合�Eそ�Eまま使用、そぁE��なければ/apiを追加
        const path = item.imagePath.startsWith('/api') ? item.imagePath : `/api${item.imagePath}`;
        imageUrl = `${baseUrl}${path}`;
      } else {
        // 相対パスの場吁E        const imagePath = `/api/images/chat-exports/${item.imagePath}`;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        imageUrl = `${baseUrl}${imagePath}`;
      }
      imageFileName = `敁E��画像_${item.id}`;
      console.log(
        '個別レポ�Eト印刷用: imagePathから画像を取得（最終フォールバック�E�E
      );
    }

    console.log('個別レポ�Eト印刷用: 最終的な画像情報:', {
      hasImage: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'なぁE,
      imageFileName,
      isBase64: imageUrl ? imageUrl.startsWith('data:image/') : false,
    });

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>機械敁E��報告書 - 印刷</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #333; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item { padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
          .info-item strong { display: block; margin-bottom: 5px; color: #333; }
          .content-box { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; }
          .image-section { text-align: center; margin: 20px 0; }
          .image-section img { max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 5px; }
          @media print {
            .no-print { display: none; }
            body {
              margin: 0;
              font-size: 10px;
              line-height: 1.2;
            }
            .header h1 {
              font-size: 16px;
              margin: 5px 0;
            }
            .header p {
              font-size: 8px;
              margin: 2px 0;
            }
            .section {
              margin: 8px 0;
              page-break-inside: avoid;
            }
            .section h2 {
              font-size: 12px;
              margin: 5px 0;
            }
            .info-grid {
              gap: 4px;
            }
            .info-item {
              font-size: 9px;
              padding: 2px;
            }
            .content {
              font-size: 9px;
              line-height: 1.1;
            }
            .image-section {
              margin: 8px 0;
            }
            .image-section img {
              max-height: 150px;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
                      <h1>機械敁E��報告書</h1>
          <p>印刷日晁E ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div class="section">
          <h2>報告概要E/h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>報告書ID</strong>
              R${item.id.slice(-5).toUpperCase()}
            </div>
            <div class="info-item">
              <strong>機種</strong>
              ${machineType || '-'}
            </div>
            <div class="info-item">
              <strong>機械番号</strong>
              ${machineNumber || '-'}
            </div>
            <div class="info-item">
              <strong>日仁E/strong>
              ${item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ${location || '-'}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>敁E��詳細</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>スチE�Eタス</strong>
              ${String(incidentTitle || '').trim() || '-'}
            </div>
            <div class="info-item">
              <strong>責任老E/strong>
              -
            </div>
          </div>
          <div class="content-box">
            <strong>説昁E/strong>
            <p>${problemDescription || '説明なぁE}</p>
          </div>
          <div class="content-box">
            <strong>備老E/strong>
            <p>${sourceItem.jsonData?.remarks || jsonData?.remarks || '-'}</p>
          </div>
        </div>

        ${
          imageUrl
            ? `
        <div class="section">
          <h2>敁E��箁E��画僁E/h2>
          <div class="image-section">
            <p>機械敁E��箁E��の画僁E/p>
            <img src="${imageUrl}" alt="敁E��箁E��画僁E />
            <p style="font-size: 12px; color: #666;">上記�E敁E��箁E��の写真です、E/p>
          </div>
        </div>
        `
            : ''
        }

        <div class="section">
          <h2>修繕計画</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>予定月日</strong>
              ${item.jsonData?.repairSchedule || '-'}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ${item.jsonData?.location || '-'}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>記事欁E/h2>
          <div class="content-box">
            <p>${item.jsonData?.remarks || '記載なぁE}</p>
          </div>
        </div>

        <div class="section">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © 2025 機械敁E��報告書. All rights reserved.
          </p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">印刷</button>
          <button onclick="window.close()">閉じる</button>
        </div>
      </body>
      </html>
    `;

    console.log('🖨�E�EHTMLコンチE��チE�E長ぁE', reportContent.length);
    console.log('🖨�E�EHTMLコンチE��チE�E先頭100斁E��E', reportContent.substring(0, 100));

    // HTMLコンチE��チE��書き込み
    try {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      console.log('✁Edocument.write()でHTMLを書き込みました');
    } catch (writeError) {
      console.error('❁Edocument.write()でエラー:', writeError);
      // 代替方況E innerHTMLを使用
      try {
        printWindow.document.documentElement.innerHTML = reportContent;
        console.log('✁EinnerHTMLでHTMLを書き込みました');
      } catch (innerError) {
        console.error('❁EinnerHTMLでもエラー:', innerError);
        // 最終手段: 新しいドキュメントを作�E
        printWindow.document.open();
        printWindow.document.write(reportContent);
        printWindow.document.close();
        console.log('✁E新しいドキュメントでHTMLを書き込みました');
      }
    }

    // 追加の確誁E 書き込まれたHTMLを確誁E    setTimeout(() => {
      console.log('🖨�E�E書き込まれたHTMLの長ぁE', printWindow.document.documentElement.innerHTML.length);
      console.log('🖨�E�E書き込まれたHTMLの先頭100斁E��E', printWindow.document.documentElement.innerHTML.substring(0, 100));
    }, 100);

    console.log('✁E印刷レポ�EチETMLを書き込みました');

    // 印刷ウィンドウが読み込まれた後に印刷ダイアログを表示
    printWindow.onload = () => {
      console.log('✁E印刷ウィンドウが読み込まれました');
      // 印刷ウィンドウをフォーカスして表示
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        console.log('✁E印刷ダイアログを表示しました');
      }, 1000);
    };

    // フォールバック: 一定時間後に印刷ダイアログを表示
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
        console.log('✁Eフォールバック: 印刷ダイアログを表示しました');
      }
    }, 2000);
  };

  // ローチE��ング状態�E表示
  if (loading) {
    return (
      <div className='p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>履歴チE�Eタを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // メインコンチE��チE�E表示
  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>履歴管琁E/h1>
        <p className='text-gray-600'>
          送信されたデータと関連画像�E履歴を管琁E�E検索できまぁE        </p>
      </div>

      {/* 検索・フィルタエリア */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Search className='h-5 w-5' />
            検索フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4'>
            {/* チE��スト検索 */}
            <div className='lg:col-span-2'>
              <div className='space-y-2'>
                <Input
                  placeholder='タイトル、機種、事業所、応急処置冁E��、キーワードなどで検索...'
                  value={filters.searchText}
                  onChange={e =>
                    handleFilterChange('searchText', e.target.value)
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className='w-full'
                />
                <p className='text-xs text-gray-500'>
                  ※
                  褁E��のキーワードをスペ�Eス区刁E��で入力すると、すべてのキーワードを含む履歴を検索しまぁE                </p>
              </div>
            </div>

            {/* 日付検索 */}
            <div>
              {/* UI表示時に自動取得するため�Eタンは削除 */}
              <div className='space-y-2'>
                <Input
                  type='date'
                  value={filters.searchDate}
                  onChange={e =>
                    handleFilterChange('searchDate', e.target.value)
                  }
                  className='w-full'
                />
                <p className='text-xs text-gray-500'>
                  ※ 持E��した日付�E履歴を検索しまぁE                </p>
              </div>
            </div>

            {/* 機種フィルタ */}
            <div>
              <div className='space-y-2'>
                <Select
                  value={filters.machineType || 'all'}
                  onValueChange={value =>
                    handleFilterChange(
                      'machineType',
                      value === 'all' ? '' : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='機種を選抁E />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>すべての機種</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value='loading' disabled>
                        読み込み中...
                      </SelectItem>
                    ) : searchFilterData.machineTypes &&
                      searchFilterData.machineTypes.length > 0 ? (
                      searchFilterData.machineTypes.map((type, index) => (
                        <SelectItem key={`type-${index}`} value={type}>
                          {type}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-data' disabled>
                        チE�Eタがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機種を取得してぁE��ぁE                  {searchFilterData.machineTypes &&
                    ` (${searchFilterData.machineTypes.length}件)`}
                </p>
              </div>
            </div>

            {/* 機械番号フィルタ */}
            <div>
              <div className='space-y-2'>
                <Select
                  value={filters.machineNumber || 'all'}
                  onValueChange={value =>
                    handleFilterChange(
                      'machineNumber',
                      value === 'all' ? '' : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='機械番号を選抁E />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>すべての機械番号</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value='loading' disabled>
                        読み込み中...
                      </SelectItem>
                    ) : searchFilterData.machineNumbers &&
                      searchFilterData.machineNumbers.length > 0 ? (
                      searchFilterData.machineNumbers.map((number, index) => (
                        <SelectItem key={`number-${index}`} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-data' disabled>
                        チE�Eタがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機械番号を取得してぁE��ぁE                  {searchFilterData.machineNumbers &&
                    ` (${searchFilterData.machineNumbers.length}件)`}
                </p>
              </div>
            </div>
          </div>

          <div className='flex gap-2'>
            <Button onClick={handleSearch} className='flex items-center gap-2'>
              <Search className='h-4 w-4' />
              検索
            </Button>
            <Button variant='outline' onClick={clearFilters}>
              フィルタークリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              敁E��履歴一覧 ({filteredItems.length}件)
            </div>
            <div className='flex items-center gap-2'>
              {fileLoading && (
                <span className='text-sm text-gray-500'>
                  ファイル自動読み込み中...
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>

          {filteredItems.length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>履歴チE�Eタがありません</p>
            </div>
          ) : (
            // チE�Eブル形式表示
            <div className='space-y-4'>
              {/* チE�Eブル */}
              <div className='overflow-x-auto'>
                <table className='w-full border-collapse border border-gray-300'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='border border-gray-300 px-3 py-2 text-center text-sm font-medium'>
                        <input
                          type='checkbox'
                          checked={
                            selectedItems.size === filteredItems.length &&
                            filteredItems.length > 0
                          }
                          onChange={handleSelectAll}
                          className='mr-2 w-6 h-6'
                        />
                        選抁E                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機種
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機械番号
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        事象冁E��
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        作�E日晁E                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        画僁E                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 履歴アイチE��を表示 */}
                    {filteredItems.map(item => {
                      // 新しいフォーマット�EチE�Eタ構造に合わせて表示
                      const jsonData = item.jsonData;

                      // タイトルを優先的にJSONチE�Eタのtitleフィールドから取征E                      let incidentTitle = jsonData?.title || '';

                      // titleがなぁE��合�E、ファイル名から事象冁E��を抽出
                      if (!incidentTitle && item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // ファイル名�E最初�E部刁E��事象冁E��
                          incidentTitle = fileNameParts[0];
                        }
                      }

                      // まだタイトルが取得できなぁE��合�E、その他�Eフィールドから取征E                      if (!incidentTitle) {
                        incidentTitle = jsonData?.question || '事象なぁE;
                        if (incidentTitle === '事象なぁE && jsonData?.chatData?.messages) {
                          // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
                          const userMessages = jsonData.chatData.messages.filter(
                            (msg: any) => !msg.isAiResponse
                          );
                          if (userMessages.length > 0) {
                            // 最初�EユーザーメチE��ージを事象として使用
                            incidentTitle = userMessages[0].content || '事象なぁE;
                          }
                        }
                      }

                      // まだタイトルがなぁE��合�E、デフォルト値を設宁E                      if (!incidentTitle) {
                        incidentTitle = '事象なぁE;
                      }

                      // 機種と機械番号を抽出�E�EPIから返されるチE�Eタ構造に合わせる�E�E                      const machineType =
                        jsonData?.machineType ||
                        jsonData?.chatData?.machineInfo?.machineTypeName ||
                        item.machineInfo?.machineTypeName ||
                        item.machineType ||
                        '';
                      const machineNumber =
                        jsonData?.machineNumber ||
                        jsonData?.chatData?.machineInfo?.machineNumber ||
                        item.machineInfo?.machineNumber ||
                        item.machineNumber ||
                        '';



                      return (
                        <tr
                          key={item.id}
                          className='hover:bg-gray-50 bg-blue-50'
                        >
                          <td className='border border-gray-300 px-3 py-2 text-center text-sm'>
                            <input
                              type='checkbox'
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className='w-6 h-6'
                            />
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {machineType || '-'}
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {machineNumber || '-'}
                          </td>
                          <td
                            className='border border-gray-300 px-3 py-2 text-sm max-w-xs truncate'
                            title={incidentTitle}
                          >
                            {incidentTitle}
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {formatDate(item.createdAt)}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {(() => {
                              console.log('🖼�E�E画像表示処琁E��姁E', {
                                itemId: item.id,
                                itemTitle: item.title,
                                hasImagePath: !!item.imagePath,
                                hasImageUrl: !!item.imageUrl,
                                hasJsonData: !!item.jsonData,
                                jsonDataKeys: Object.keys(item.jsonData || {})
                              });

                              const imageUrl = pickFirstImage(item);
                              console.log('🖼�E�EpickFirstImage結果:', imageUrl);

                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt='画僁E
                                    className='w-12 h-12 object-cover rounded border cursor-pointer hover:scale-110 transition-transform'
                                    title='敁E��画像（クリチE��で拡大�E�E
                                    onClick={() => {
                                      // 画像を拡大表示
                                      const imgWindow = window.open('', '_blank');
                                      if (imgWindow) {
                                        imgWindow.document.write(`
                                          <html>
                                            <head><title>画像拡大表示</title></head>
                                            <body style="margin:0;padding:20px;text-align:center;background:#f0f0f0;">
                                              <img src="${imageUrl}" style="max-width:90%;max-height:90vh;border:2px solid #333;box-shadow:0 4px 8px rgba(0,0,0,0.3);" alt="敁E��画僁E />
                                            </body>
                                          </html>
                                        `);
                                      }
                                    }}
                                    onError={e => {
                                      console.error('🖼�E�E画像読み込みエラー:', imageUrl);
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('🖼�E�E画像読み込み成功:', imageUrl);
                                    }}
                                  />
                                );
                              }
                              return <span className='text-gray-500'>-</span>;
                            })()}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  console.log(
                                    '🔍 編雁E�EタンクリチE�� - 允E�EアイチE��:',
                                    item
                                  );
                                  console.log(
                                    '🔍 item.machineType:',
                                    item.machineType
                                  );
                                  console.log(
                                    '🔍 item.machineNumber:',
                                    item.machineNumber
                                  );
                                  console.log(
                                    '🔍 item.jsonData:',
                                    item.jsonData
                                  );

                                  const normalizedItem =
                                    normalizeJsonData(item);
                                  console.log(
                                    '🔍 正規化後�EアイチE��:',
                                    normalizedItem
                                  );
                                  console.log(
                                    '🔍 正規化征EmachineType:',
                                    normalizedItem.machineType
                                  );
                                  console.log(
                                    '🔍 正規化征EmachineNumber:',
                                    normalizedItem.machineNumber
                                  );
                                  console.log(
                                    '🔍 正規化征EjsonData.title:',
                                    normalizedItem.jsonData?.title
                                  );

                                  // chatData.messagesからユーザーメチE��ージを抽出�E�一時的に保存、GPT要紁E��使用するため�E�E                                  const chatData = normalizedItem.jsonData?.chatData || normalizedItem.jsonData;
                                  let extractedUserMessages = '';
                                  if (chatData?.messages && Array.isArray(chatData.messages)) {
                                    const userMessages = chatData.messages
                                      .filter((msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/'))
                                      .map((msg: any) => msg.content)
                                      .join('\n');
                                    if (userMessages) {
                                      extractedUserMessages = userMessages;
                                      // problemDescriptionがなぁE��合�Eみ設定！EPT要紁E�E前に一時的に表示�E�E                                      if (!normalizedItem.jsonData?.problemDescription || normalizedItem.jsonData.problemDescription === '') {
                                        normalizedItem.jsonData.problemDescription = userMessages;
                                        normalizedItem.jsonData.answer = userMessages;
                                        console.log('🔍 chatData.messagesから事象説明を抽出:', userMessages);
                                      }
                                    }
                                  }

                                  // 編雁E��面を開く際に簡易要紁E��生�E�E�EPT要紁E��生�Eされるまでの一時的な表示�E�E                                  if (!normalizedItem.jsonData?.problemDescription || normalizedItem.jsonData.problemDescription === '') {
                                    const autoSummary = generateSummaryFromJson(normalizedItem.jsonData);
                                    if (autoSummary) {
                                      normalizedItem.jsonData.problemDescription = autoSummary;
                                      normalizedItem.jsonData.answer = autoSummary;
                                      console.log('🔍 自動要紁E��生�E:', autoSummary);
                                    }
                                  }

                                  setEditingItem(normalizedItem);
                                  setShowEditDialog(true);
                                }}
                                className='flex items-center gap-1 text-xs'
                                title='編雁E��面を開ぁE
                              >
                                <Settings className='h-3 w-3' />
                                編雁E                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setDeleteConfirm({
                                    show: true,
                                    id: item.id,
                                    title: incidentTitle,
                                  });
                                }}
                                className='flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50'
                                title='履歴を削除'
                              >
                                <Trash2 className='h-3 w-3' />
                                削除
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* エクスポ�Eト�E琁E��リア */}
      <div className='bg-white rounded-lg shadow p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold'>エクスポ�Eト�E琁E/h2>
        </div>

        <div className='flex flex-wrap gap-4 mb-4'>
          {/* 選択履歴エクスポ�EチE*/}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をJSONエクスポ�EチE({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をCSVエクスポ�EチE({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant='outline'
              className='flex items-center gap-2'
            >
              <FileText className='h-4 w-4' />
              選択�E一覧を印刷 ({selectedItems.size})
            </Button>
          </div>

          {/* 全履歴エクスポ�EチE*/}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をJSONエクスポ�EチE            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をCSVエクスポ�EチE            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className='flex items-center gap-2 text-blue-600'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            エクスポ�Eト�E琁E��...
          </div>
        )}
      </div>

      {/* ペ�Eジネ�Eション */}
      {totalPages > 1 && (
        <div className='flex justify-center mt-6'>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              前へ
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page =
                Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant='outline'
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              次へ
            </Button>
          </div>
        </div>
      )}

      {/* プレビューダイアログ */}
      {showPreviewDialog && previewItem && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-bold'>履歴プレビュー</h2>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => handlePrintReport(previewItem)}
                    className='flex items-center gap-2'
                  >
                    <FileText className='h-4 w-4' />
                    印刷
                  </Button>
                  <Button
                    onClick={() => {
                      const normalizedItem = normalizeJsonData(previewItem);

                      // 編雁E��面を開く際に要紁E��自動生戁E                      const autoSummary = generateSummaryFromJson(normalizedItem.jsonData);
                      if (autoSummary && (!normalizedItem.jsonData?.problemDescription || normalizedItem.jsonData.problemDescription === '')) {
                        normalizedItem.jsonData.problemDescription = autoSummary;
                        normalizedItem.jsonData.answer = autoSummary;
                      }

                      setEditingItem(normalizedItem);
                      setShowPreviewDialog(false);
                      setShowEditDialog(true);
                    }}
                    className='flex items-center gap-2'
                  >
                    <Settings className='h-4 w-4' />
                    編雁E��移勁E                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => setShowPreviewDialog(false)}
                  >
                    ÁE                  </Button>
                </div>
              </div>

              <div className='space-y-6'>
                {/* レポ�Eト�EチE��ー */}
                <div className='text-center border-b pb-4'>
                  <h1 className='text-2xl font-bold mb-2'>
                    応急処置サポ�Eト履歴
                  </h1>
                  <p className='text-sm text-gray-500'>
                    作�E日晁E {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 基本惁E�� */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <h3 className='text-lg font-semibold mb-3'>基本惁E��</h3>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Settings className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>機種:</strong> {previewItem.machineType}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>機械番号:</strong> {previewItem.machineNumber}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Calendar className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>作�E日晁E</strong>{' '}
                          {formatDate(previewItem.createdAt)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Image className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>画僁E</strong>{' '}
                          {previewItem.imagePath ? 'あり' : 'なぁE}
                        </span>
                      </div>
                    </div>
                  </div>

                  {previewItem.imagePath && (
                    <div>
                      <h3 className='text-lg font-semibold mb-3'>関連画僁E/h3>
                      <img
                        src={previewItem.imagePath}
                        alt='履歴画僁E
                        className='w-full h-48 object-cover rounded-md'
                      />
                    </div>
                  )}
                </div>

                {/* 詳細惁E�� */}
                <div>
                  <h3 className='text-lg font-semibold mb-3'>詳細惁E��</h3>
                  <div className='bg-gray-50 p-4 rounded-md'>
                    <pre className='text-sm overflow-auto max-h-64'>
                      {JSON.stringify(previewItem.jsonData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編雁E��イアログ */}
      {showEditDialog && editingItem && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page {
                size: A4;
                margin: 1mm 15mm 2mm 10mm;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                overflow: visible !important;
              }
              body > * {
                visibility: hidden;
              }
              .print-content-wrapper,
              .print-content-wrapper * {
                visibility: visible !important;
              }
              .print-content-wrapper {
                position: relative !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                font-size: 8pt !important;
                line-height: 1.2 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .print-content-wrapper > div {
                padding: 2mm !important;
              }
              .no-print {
                display: none !important;
              }
              .print-content-wrapper h2,
              .print-content-wrapper h3 {
                font-size: 9pt !important;
                margin: 3pt 0 2pt 0 !important;
                color: #000 !important;
                font-weight: bold !important;
                page-break-after: avoid;
              }
              .print-content-wrapper .bg-gray-50,
              .print-content-wrapper .bg-blue-50,
              .print-content-wrapper .bg-yellow-50,
              .print-content-wrapper .bg-purple-50 {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                border-radius: 3px !important;
                padding: 4pt !important;
                margin-bottom: 3pt !important;
                page-break-inside: avoid;
              }
              .print-content-wrapper label {
                font-size: 7pt !important;
                font-weight: bold !important;
                display: block !important;
                margin-bottom: 2pt !important;
                color: #000 !important;
              }
              .print-content-wrapper input,
              .print-content-wrapper textarea,
              .print-content-wrapper select {
                width: 100% !important;
                padding: 1pt 2pt !important;
                border: none !important;
                border-bottom: 1px solid #ccc !important;
                border-radius: 0 !important;
                font-size: 7pt !important;
                background: transparent !important;
                color: #000 !important;
                margin-bottom: 2pt !important;
                display: block !important;
              }
              /* 機種・機械番号・ファイル名を1行表示�E�ラベルと入力フィールドを横並び�E�E*/
              .print-content-wrapper .print-basic-info-grid {
                display: flex !important;
                gap: 4pt !important;
                margin-bottom: 1pt !important;
                align-items: center !important;
              }
              .print-content-wrapper .print-basic-info-item {
                display: flex !important;
                align-items: center !important;
                gap: 2pt !important;
                margin-bottom: 0 !important;
              }
              .print-content-wrapper .print-basic-info-item .print-inline-label {
                margin-bottom: 0 !important;
                font-size: 7pt !important;
                width: auto !important;
                min-width: 40pt !important;
                display: inline-block !important;
              }
              .print-content-wrapper .print-basic-info-item input,
              .print-content-wrapper .print-basic-info-item select,
              .print-content-wrapper .print-basic-info-item [data-radix-select-trigger]::before,
              .print-content-wrapper .print-basic-info-item .print-select-trigger::before {
                border: none !important;
                border-bottom: 1px solid #ccc !important;
                padding: 0.5pt 1pt !important;
                margin-bottom: 0 !important;
                min-height: auto !important;
                width: auto !important;
                flex: 1 !important;
              }
              /* 場所の行を詰めて1行で、狭ぁE*/
              .print-content-wrapper .print-location-field {
                width: 40% !important;
                margin-top: 1pt !important;
                display: flex !important;
                align-items: center !important;
                gap: 2pt !important;
              }
              .print-content-wrapper .print-location-field label {
                margin-bottom: 0 !important;
                font-size: 7pt !important;
                width: auto !important;
                min-width: 30pt !important;
                display: inline-block !important;
              }
              .print-content-wrapper .print-location-field input {
                width: auto !important;
                flex: 1 !important;
                padding: 0.5pt 1pt !important;
                border: none !important;
                border-bottom: 1px solid #ccc !important;
                margin-bottom: 0 !important;
              }
              /* 事象の説明セクション全体�Eマ�Eジンを調整 */
              .print-content-wrapper .bg-blue-50 {
                padding: 4pt !important;
                margin-bottom: 4pt !important;
              }
              /* 事象説明�Eヘッダー�E�タイトルと補足説明を横並び�E�E*/
              .print-content-wrapper .bg-blue-50 h3 {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                margin-bottom: 3pt !important;
              }
              .print-content-wrapper .bg-blue-50 h3 > span:last-child {
                font-size: 6pt !important;
                font-weight: normal !important;
                color: #666 !important;
                margin-left: auto !important;
              }
              .print-content-wrapper [data-radix-select-content],
              .print-content-wrapper [data-radix-portal] {
                display: none !important;
              }
              .print-content-wrapper .print-select-trigger,
              .print-content-wrapper [data-radix-select-trigger] {
                display: block !important;
              }
              .print-content-wrapper .print-select-trigger > span,
              .print-content-wrapper [data-radix-select-trigger] > span {
                display: none !important;
              }
              .print-content-wrapper .print-select-trigger::before,
              .print-content-wrapper [data-radix-select-trigger]::before {
                content: attr(data-value) !important;
                display: block !important;
                padding: 0.5pt 1pt !important;
                border: none !important;
                border-bottom: 1px solid #ccc !important;
                border-radius: 0 !important;
                font-size: 7pt !important;
                background: transparent !important;
                color: #000 !important;
                margin-bottom: 0 !important;
                min-height: auto !important;
              }
              .print-content-wrapper .print-select-trigger > *,
              .print-content-wrapper [data-radix-select-trigger] > * {
                display: none !important;
              }
              .print-content-wrapper textarea {
                min-height: 25pt !important;
                max-height: 35pt !important;
                resize: none !important;
              }
              /* 事象説明�E1.3倍にする */
              .print-content-wrapper .bg-blue-50 textarea {
                min-height: 65pt !important;
                max-height: 78pt !important;
              }
              /* 記事欁E�E調整可能�E�E4に収まらなぁE��合�E減らす！E*/
              .print-content-wrapper .print-remarks-section textarea {
                min-height: 60pt !important;
                max-height: 90pt !important;
              }
              .print-content-wrapper .bg-gray-50:last-of-type {
                padding: 3pt !important;
                margin-bottom: 2pt !important;
              }
              .print-content-wrapper .bg-gray-50:last-of-type h3 {
                margin-bottom: 2pt !important;
              }
              /* 記事欁E�E補足説明をタイトルの右側に移勁E*/
              .print-content-wrapper .print-remarks-header {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                margin-bottom: 2pt !important;
              }
              .print-content-wrapper .print-remarks-hint {
                font-size: 6pt !important;
                font-weight: normal !important;
                color: #666 !important;
                margin-left: auto !important;
              }
              /* 記事欁E��行�E下線（細ぁE��線）を表示、外枠の線�E不要E*/
              .print-content-wrapper .print-remarks-section {
                position: relative !important;
              }
              .print-content-wrapper .print-remarks-textarea {
                border: none !important;
                background: transparent !important;
                padding: 2pt 0 !important;
                min-height: 60pt !important;
                max-height: 90pt !important;
                line-height: 1.5em !important;
                position: relative !important;
                /* 破線パターンで吁E���E下に細線�E灰色破線を引く */
                background-image:
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='1.5em'%3E%3Cline x1='0' y1='1.48em' x2='100%25' y2='1.48em' stroke='%23ccc' stroke-width='0.3' stroke-dasharray='2,2'/%3E%3C/svg%3E") !important;
                background-repeat: repeat-y !important;
                background-size: 100% 1.5em !important;
                background-position: 0 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .print-content-wrapper .grid {
                display: grid !important;
                gap: 3pt !important;
                margin-bottom: 3pt !important;
              }
              .print-content-wrapper .space-y-4 > * + * {
                margin-top: 3pt !important;
              }
              .print-content-wrapper .space-y-6 > * + * {
                margin-top: 4pt !important;
              }
              /* 全体�Eコンパクト化 */
              .print-content-wrapper .bg-gray-50,
              .print-content-wrapper .bg-blue-50,
              .print-content-wrapper .bg-yellow-50,
              .print-content-wrapper .bg-purple-50 {
                padding: 3pt !important;
                margin-bottom: 3pt !important;
              }
              .print-content-wrapper .bg-gray-50 h3,
              .print-content-wrapper .bg-blue-50 h3,
              .print-content-wrapper .bg-yellow-50 h3,
              .print-content-wrapper .bg-purple-50 h3 {
                margin-bottom: 2pt !important;
                font-size: 9pt !important;
              }
              .print-content-wrapper .grid.grid-cols-1 {
                grid-template-columns: 1fr;
              }
              .print-content-wrapper .grid.grid-cols-2,
              .print-content-wrapper .grid.md\\:grid-cols-2 {
                grid-template-columns: repeat(2, 1fr);
              }
              /* 修繕計画の修繕予定日・場所は横1行にする */
              .print-content-wrapper .print-repair-plan-grid {
                display: flex !important;
                gap: 4pt !important;
                margin-bottom: 2pt !important;
                align-items: center !important;
              }
              .print-content-wrapper .bg-yellow-50 {
                padding: 3pt !important;
                margin-bottom: 2pt !important;
              }
              .print-content-wrapper .bg-yellow-50 h3 {
                margin-bottom: 2pt !important;
              }
              .print-content-wrapper .print-repair-plan-item {
                display: flex !important;
                align-items: center !important;
                gap: 2pt !important;
                margin-bottom: 0 !important;
              }
              .print-content-wrapper .print-repair-plan-item .print-inline-label {
                margin-bottom: 0 !important;
                font-size: 7pt !important;
                width: auto !important;
                min-width: 50pt !important;
                display: inline-block !important;
              }
              .print-content-wrapper .print-repair-plan-item input {
                border: none !important;
                border-bottom: 1px solid #ccc !important;
                padding: 0.5pt 1pt !important;
                margin-bottom: 0 !important;
                width: auto !important;
                flex: 1 !important;
              }
              .print-content-wrapper .grid.grid-cols-3,
              .print-content-wrapper .grid.md\\:grid-cols-3 {
                grid-template-columns: repeat(3, 1fr);
              }
              .print-content-wrapper .space-y-4 > * + * {
                margin-top: 6pt;
              }
              .print-content-wrapper img {
                max-width: 100% !important;
                max-height: 45pt !important;
                border: 1px solid #ddd !important;
                margin: 3pt 0 !important;
              }
              .print-content-wrapper .grid.grid-cols-3 img {
                max-height: 40pt !important;
              }
              .print-content-wrapper svg {
                display: none !important;
              }
              .print-content-wrapper .flex {
                display: flex !important;
                gap: 3pt !important;
              }
              .print-content-wrapper .flex.items-center {
                align-items: center !important;
              }
              .print-content-wrapper button,
              .print-content-wrapper [role="button"],
              .print-content-wrapper .no-print {
                display: none !important;
              }
              .print-content-wrapper [data-radix-portal] {
                display: none !important;
              }
              .print-content-wrapper .print-header {
                display: block !important;
                margin-bottom: 0.5pt !important;
                page-break-after: avoid;
                text-align: center !important;
              }
              .print-content-wrapper .print-header h1 {
                font-size: 15pt !important;
                font-weight: bold !important;
                text-align: center !important;
                margin: 0 0 0.25pt 0 !important;
                border-bottom: 1px solid #000 !important;
                padding-bottom: 0.25pt !important;
                color: #000 !important;
                line-height: 1.2 !important;
              }
              .print-content-wrapper .print-header p {
                font-size: 5pt !important;
                text-align: center !important;
                margin: 0 0 0.25pt 0 !important;
                color: #666 !important;
                line-height: 1.2 !important;
              }
              .print-content-wrapper .bg-yellow-50 {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                border-radius: 3px !important;
                padding: 4pt !important;
                margin-bottom: 4pt !important;
                page-break-inside: avoid;
              }
              /* 記事欁E��確実に表示 */
              .print-content-wrapper .bg-gray-50:last-of-type,
              .print-content-wrapper .bg-gray-50.print-remarks-section {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                border-radius: 3px !important;
                padding: 4pt !important;
                margin-bottom: 4pt !important;
                page-break-inside: avoid;
                display: block !important;
              }
            }
          `}} />
          <div className='bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-auto print-content-wrapper'>
            <div className='p-6'>
              {/* 機種・機械番号チE�Eタが読み込まれてぁE��ぁE��合�E再取征E*/}
              {(() => {
                if (
                  machineData.machineTypes.length === 0 &&
                  !machineDataLoading
                ) {
                  fetchMachineDataFromAPI();
                }

                // チE��チE��: 編雁E��イアログが開かれた時の初期値をログ出劁E                console.log('編雁E��イアログ表示時�EeditingItem:', {
                  machineType: editingItem.machineType,
                  machineNumber: editingItem.machineNumber,
                  fileName: editingItem.fileName,
                  title: editingItem.jsonData?.title,
                  question: editingItem.jsonData?.question,
                  jsonData: editingItem.jsonData,
                });

                return null;
              })()}

              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-bold no-print'>機械敁E��惁E��編雁E/h2>
                <div className='flex gap-2 no-print'>
                  <Button
                    onClick={() => {
                      console.log('編雁E��ータを保存しまぁE', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className='flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white'
                  >
                    <Download className='h-4 w-4' />
                    保孁E                  </Button>
                  <Button
                    onClick={() => {
                      console.log('🖨�E�E編雁E��面をそのまま印刷しまぁE);
                      // 編雁E��面をそのまま印刷
                      window.print();
                    }}
                    className='flex items-center gap-2'
                  >
                    <Printer className='h-4 w-4' />
                    印刷
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      console.log('編雁E��キャンセルしまぁE);
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>

              <div className='space-y-6 print-content'>
                {/* 印刷時�Eタイトル�E�画面では非表示�E�E*/}
                <div className='print-header no-print' style={{ display: 'none' }}>
                  <h1>機械敁E��報告書</h1>
                  <p>印刷日晁E {new Date().toLocaleString('ja-JP')}</p>
                </div>

                {/* 基本惁E��編雁E*/}
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                    <Settings className='h-5 w-5' />
                    基本惁E��
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 print-basic-info-grid'>
                    <div className='print-basic-info-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        機種
                      </label>
                      {/* 既存�E機種があれ�E表示、なければ選択肢を提侁E*/}
                      <Select
                        value={editingItem.machineType || ''}
                        onValueChange={value => {
                          console.log('機種を変更:', value);
                          setEditingItem({
                            ...editingItem,
                            machineType: value,
                            jsonData: {
                              ...editingItem.jsonData,
                              machineType: value,
                            },
                          });
                        }}
                      >
                          <SelectTrigger
                          data-value={editingItem.machineType || '機種を選抁E}
                          className='print-select-trigger'
                        >
                            <SelectValue
                              placeholder={
                                editingItem.machineType
                                  ? editingItem.machineType
                                  : '機種を選抁E
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 既存�E機種がある場合�E最初に表示 */}
                            {editingItem.machineType && (
                              <SelectItem value={editingItem.machineType}>
                                {editingItem.machineType} (現在の値)
                              </SelectItem>
                            )}
                            {/* マスターチE�Eタからの選択肢 */}
                            {machineDataLoading ? (
                              <SelectItem value="loading" disabled>
                                マスターチE�Eタ読み込み中...
                              </SelectItem>
                            ) : (
                              machineData.machineTypes
                                ?.filter(mt => mt?.machineTypeName && mt.machineTypeName !== editingItem.machineType)
                                ?.map(machineType => (
                                  <SelectItem
                                    key={machineType.id || `machine-type-${Date.now()}-${Math.random()}`}
                                    value={machineType.machineTypeName || ''}
                                  >
                                    {machineType.machineTypeName || '不�E'}
                                  </SelectItem>
                                )) || []
                            )}
                          </SelectContent>
                        </Select>
                    </div>
                    <div className='print-basic-info-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        機械番号
                      </label>
                      {/* 既存�E機械番号があれ�E表示、なければ選択肢を提侁E*/}
                      <Select
                        value={editingItem.machineNumber || ''}
                        onValueChange={value => {
                          console.log('機械番号を変更:', value);
                          setEditingItem({
                            ...editingItem,
                            machineNumber: value,
                            jsonData: {
                              ...editingItem.jsonData,
                              machineNumber: value,
                            },
                          });
                        }}
                      >
                          <SelectTrigger
                            data-value={editingItem.machineNumber || '機械番号を選抁E}
                            className='print-select-trigger'
                          >
                            <SelectValue
                              placeholder={
                                editingItem.machineNumber
                                  ? editingItem.machineNumber
                                  : '機械番号を選抁E
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 既存�E機械番号がある場合�E最初に表示 */}
                            {editingItem.machineNumber && (
                              <SelectItem value={editingItem.machineNumber}>
                                {editingItem.machineNumber} (現在の値)
                              </SelectItem>
                            )}
                            {/* マスターチE�Eタからの選択肢 */}
                            {machineDataLoading ? (
                              <SelectItem value="loading" disabled>
                                マスターチE�Eタ読み込み中...
                              </SelectItem>
                            ) : (
                              machineData.machines
                                ?.filter(
                                  machine =>
                                    machine?.machineNumber &&
                                    machine?.machineTypeName &&
                                    (!editingItem.machineType ||
                                      machine.machineTypeName === editingItem.machineType) &&
                                    machine.machineNumber !== editingItem.machineNumber
                                )
                                ?.map(machine => (
                                  <SelectItem
                                    key={machine.id || `machine-${Date.now()}-${Math.random()}`}
                                    value={machine.machineNumber || ''}
                                  >
                                    {machine.machineNumber || '不�E'} ({machine.machineTypeName || '不�E'})
                                  </SelectItem>
                                )) || []
                            )}
                          </SelectContent>
                        </Select>
                    </div>
                    <div className='print-basic-info-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        ファイル吁E                      </label>
                      <Input
                        value={editingItem.fileName || ''}
                        onChange={e => {
                          console.log('ファイル名を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            fileName: e.target.value,
                          });
                        }}
                        placeholder='ファイル吁E
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 事象の説明編雁E*/}
                <div className='bg-blue-50 p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                    <FileText className='h-5 w-5' />
                    <span>事象の説昁E/span>
                    <span className='text-xs font-normal text-gray-600 ml-auto'>事象の詳細説明を入劁E/span>
                  </h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-2'>
                        事象タイトル
                      </label>
                      <Input
                        value={
                          (() => {
                            // ファイル名から日本語部刁E��けを抽出して表示
                            if (editingItem.fileName) {
                              const firstUnderscoreIndex = editingItem.fileName.indexOf('_');
                              if (firstUnderscoreIndex > 0) {
                                return editingItem.fileName.substring(0, firstUnderscoreIndex);
                              }
                              // 「_」がなぁE��合�E、拡張子を除ぁE��全体を返す
                              return editingItem.fileName.replace(/\.json$/, '');
                            }
                            // ファイル名がなぁE��合�EJSONのtitleを使用
                            return editingItem.jsonData?.title ||
                              editingItem.jsonData?.question ||
                              '';
                          })()
                        }
                        onChange={e => {
                          console.log('事象タイトルを変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              title: e.target.value,
                              question: e.target.value,
                            },
                          });
                        }}
                        placeholder='事象タイトルを�E劁E
                      />
                      {/* チE��チE��: 事象タイトルの値を確誁E*/}
                      {(() => {
                        const titleValue =
                          editingItem.jsonData?.title ||
                          editingItem.jsonData?.question ||
                          '';
                        console.log('🔍 事象タイトル - 表示値:', titleValue);
                        console.log(
                          '🔍 事象タイトル - jsonData.title:',
                          editingItem.jsonData?.title
                        );
                        console.log(
                          '🔍 事象タイトル - jsonData.question:',
                          editingItem.jsonData?.question
                        );
                        return null;
                      })()}
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-2'>
                        事象説昁E                      </label>
                      <textarea
                        value={
                          editingItem.jsonData?.problemDescription ||
                          editingItem.jsonData?.answer ||
                          ''
                        }
                        onChange={e => {
                          console.log('事象説明を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              problemDescription: e.target.value,
                              answer: e.target.value,
                            },
                          });
                        }}
                        className='w-full h-32 p-3 border border-gray-300 rounded-md'
                        placeholder=''
                      />
                    </div>
                    <div className='print-location-field'>
                      <label className='block text-sm font-medium mb-2'>
                        場所
                      </label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={e => {
                          console.log('場所を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value,
                            },
                          });
                        }}
                        placeholder='場所を�E力（侁E ○○線！E
                      />
                    </div>
                  </div>
                </div>

                {/* 敁E��個所の画像（修繕計画の上に移動！E*/}
                <div className='bg-purple-50 p-4 rounded-lg'>
                  <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-lg font-semibold flex items-center gap-2'>
                      <Image className='h-5 w-5' />
                      敁E��個所の画僁E                    </h3>
                    <input
                      type='file'
                      accept='image/*'
                      multiple
                      className='hidden'
                      id='image-upload-input'
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        const newImages: any[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const formData = new FormData();
                          formData.append('image', file);

                          try {
                            const response = await fetch('/api/history/upload-image', {
                              method: 'POST',
                              body: formData,
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.error || '画像�EアチE�Eロードに失敗しました');
                            }

                            const result = await response.json();
                            newImages.push({
                              fileName: result.fileName,
                              url: result.imageUrl || result.url,
                            });
                          } catch (error) {
                            console.error('画像アチE�Eロードエラー:', error);
                            alert(`画像�EアチE�Eロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }

                        if (newImages.length > 0) {
                          const currentSavedImages = editingItem.jsonData?.savedImages || [];
                          // 新しく追加した画像を先頭に配置�E�一覧表で最初に表示されるよぁE���E�E                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              savedImages: [...newImages, ...currentSavedImages],
                            },
                          });
                        }

                        // 入力フィールドをリセチE��
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type='button'
                      onClick={() => {
                        document.getElementById('image-upload-input')?.click();
                      }}
                      className='text-sm'
                      variant='outline'
                    >
                      <Upload className='h-4 w-4 mr-1' />
                      画像を追加
                    </Button>
                  </div>
                  {(() => {
                    // 褁E��の画像を取征E                    const getAllImages = (item: SupportHistoryItem): Array<{ url: string; fileName?: string; index: number }> => {
                      const images: Array<{ url: string; fileName?: string; index: number }> = [];

                      // 1) savedImages から画像を取征E                      if (Array.isArray(item?.savedImages) && item.savedImages.length > 0) {
                        item.savedImages.forEach((img: any, idx: number) => {
                          if (typeof img === 'string' && !img.startsWith('data:image/')) {
                            images.push({ url: img, index: idx });
                          } else if (img && typeof img === 'object') {
                            if (img.fileName) {
                              const imagePath = `/api/images/chat-exports/${img.fileName}`;
                              let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                              baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                              images.push({ url: `${baseUrl}${imagePath}`, fileName: img.fileName, index: idx });
                            } else if (img.url) {
                              const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx });
                            } else if (img.path) {
                              const finalUrl = img.path.startsWith('http') ? img.path : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.path}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx });
                            }
                          }
                        });
                      }

                      // 2) images配�Eから取征E                      if (Array.isArray(item?.images) && item.images.length > 0) {
                        item.images.forEach((img: any, idx: number) => {
                          if (typeof img === 'string') {
                            images.push({ url: img, index: idx + 1000 });
                          } else if (img && typeof img === 'object') {
                            const url = img.url || img.path || img.fileName;
                            if (url && !url.startsWith('data:image/')) {
                              const finalUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx + 1000 });
                            }
                          }
                        });
                      }

                      // 3) jsonData.savedImagesからも取征E                      if (Array.isArray(item?.jsonData?.savedImages) && item.jsonData.savedImages.length > 0) {
                        item.jsonData.savedImages.forEach((img: any, idx: number) => {
                          if (typeof img === 'string' && !img.startsWith('data:image/')) {
                            images.push({ url: img, index: idx + 2000 });
                          } else if (img && typeof img === 'object') {
                            if (img.fileName) {
                              const imagePath = `/api/images/chat-exports/${img.fileName}`;
                              let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                              baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                              images.push({ url: `${baseUrl}${imagePath}`, fileName: img.fileName, index: idx + 2000 });
                            } else if (img.url) {
                              const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx + 2000 });
                            }
                          }
                        });
                      }

                      // 重褁E��除去�E�ERLベ�Eス�E�E                      const uniqueImages: Array<{ url: string; fileName?: string; index: number }> = [];
                      const seenUrls = new Set<string>();
                      images.forEach(img => {
                        if (!seenUrls.has(img.url)) {
                          seenUrls.add(img.url);
                          uniqueImages.push(img);
                        }
                      });

                      return uniqueImages;
                    };

                    const imageList = getAllImages(editingItem);
                    if (imageList.length > 0) {
                      return (
                        <div className='grid grid-cols-3 gap-4'>
                          {imageList.map((image, index) => (
                            <div key={index} className='relative group'>
                              <img
                                src={image.url}
                                alt={`敁E��画僁E{index + 1}`}
                                className='w-full h-auto max-h-48 object-contain border border-gray-300 rounded-md shadow-sm'
                                onError={(e) => {
                                  console.error(`🖼�E�E画像読み込みエラー (編雁E��面):`, image.url);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <Button
                                type='button'
                                variant='destructive'
                                size='sm'
                                className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity'
                                onClick={() => {
                                  // 画像を削除
                                  const currentSavedImages = editingItem.jsonData?.savedImages || [];
                                  const updatedSavedImages = currentSavedImages.filter((img: any, idx: number) => {
                                    if (image.fileName && img.fileName === image.fileName) return false;
                                    if (img.url === image.url) return false;
                                    if (img.path === image.url) return false;
                                    return true;
                                  });

                                  setEditingItem({
                                    ...editingItem,
                                    jsonData: {
                                      ...editingItem.jsonData,
                                      savedImages: updatedSavedImages,
                                    },
                                  });
                                }}
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <p className='text-sm text-gray-500 text-center py-4'>
                        画像がありません。上記�E「画像を追加」�Eタンから画像を追加してください、E                      </p>
                    );
                  })()}
                </div>

                {/* 修繕計画編雁E*/}
                <div className='bg-yellow-50 p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                    <MapPin className='h-5 w-5' />
                    修繕計画
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print-repair-plan-grid'>
                    <div className='print-repair-plan-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        修繕予定月日
                      </label>
                      <Input
                        type='date'
                        value={editingItem.jsonData?.repairSchedule || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              repairSchedule: e.target.value,
                            },
                          });
                        }}
                        placeholder='修繕予定月日'
                      />
                    </div>
                    <div className='print-repair-plan-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        場所
                      </label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value,
                            },
                          });
                        }}
                        placeholder='設置場所'
                      />
                    </div>
                  </div>
                </div>

                {/* 記事欁E��E00斁E��程度�E�E*/}
                <div className='bg-gray-50 p-4 rounded-lg print-remarks-section'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2 print-remarks-header'>
                    <FileText className='h-5 w-5' />
                    <span>記事欁E/span>
                    <span className='print-remarks-hint'>修繕に関する備老E��追加惁E��を記載してください�E�E00斁E��以冁E��E/span>
                  </h3>
                  <div>
                    <textarea
                      value={editingItem.jsonData?.remarks || ''}
                      onChange={e => {
                        if (e.target.value.length <= 200) {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              remarks: e.target.value,
                            },
                          });
                        }
                      }}
                      className='w-full h-24 p-3 border border-gray-300 rounded-md print-remarks-textarea'
                      placeholder=''
                      maxLength={200}
                    />
                    <p className='text-xs text-gray-500 mt-1 no-print'>
                      {editingItem.jsonData?.remarks?.length || 0}/200斁E��E                    </p>
                  </div>
                </div>

                {/* 保存�Eタン�E�下部�E�E*/}
                <div className='flex justify-end gap-2 pt-4 border-t no-print'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      console.log('編雁E��キャンセルしまぁE);
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('編雁E��ータを保存しまぁE', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className='bg-green-600 hover:bg-green-700 text-white'
                  >
                    保存して適用
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm.show && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold mb-4 text-red-600'>履歴削除の確誁E/h3>
            <p className='text-gray-700 mb-6'>
              以下�E履歴を削除しますか�E�この操作�E取り消せません、E            </p>
            <div className='bg-gray-50 p-3 rounded-lg mb-6'>
              <p className='font-medium text-sm text-gray-800'>
                {deleteConfirm.title}
              </p>
            </div>
            <div className='flex justify-end gap-3'>
              <Button
                variant='outline'
                onClick={() =>
                  setDeleteConfirm({
                    show: false,
                    id: '',
                    title: '',
                  })
                }
              >
                キャンセル
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleDeleteHistory(deleteConfirm.id)}
                className='bg-red-600 hover:bg-red-700'
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* チャチE��エクスポ�Eトレポ�Eト表示 */}
      {showReport && selectedReportData && (
        <ChatExportReport
          data={selectedReportData}
          fileName={selectedFileName}
          onClose={handleCloseReport}
          onSave={handleSaveReport}
          onPrint={reportData => {
            console.log('チャチE��エクスポ�Eトレポ�Eトを印刷:', reportData);
            window.print();
          }}
        />
      )}
    </div>
  );
};

export default HistoryPage;
