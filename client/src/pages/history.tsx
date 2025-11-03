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
import { storage } from '../lib/api-unified';
import ChatExportReport from '../components/report/chat-export-report';

// 画像ユーティリティ関数
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8081'
  : import.meta.env.VITE_API_BASE_URL || window.location.origin;

async function fetchDetailFile(name: string) {
  // IDベースのエンドポイントを試行
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
        console.log('[fetchDetailFile] JSON解析完了:', {
          hasData: !!json,
          keys: Object.keys(json || {}),
        });
        return json;
      }
    } catch (error) {
      console.warn('[fetchDetailFile] エンドポイント失敗:', url, error);
    }
  }

  // すべてのエンドポイントが失敗した場合
  throw new Error(`detail 404 - IDが見つかりません: ${name}`);
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

  // エクスポート機能の状態

  const [exportLoading, setExportLoading] = useState(false);

  // レポート機能の状態
  const [reportLoading, setReportLoading] = useState(false);

  // 自動ファイル読み込み機能の状態
  const [fileLoading, setFileLoading] = useState(false);

  // 編集・プレビュー機能の状態
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(
    null
  );
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // 削除確認ダイアログの状態
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    title: string;
  }>({
    show: false,
    id: '',
    title: '',
  });

  // 印刷機能の状態
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'report'>('table');

  // レポート表示の状態
  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // 機械故障報告書の状態
  const [showMachineFailureReport, setShowMachineFailureReport] = useState(false);
  const [machineFailureReportData, setMachineFailureReportData] = useState<any>(null);

  // 機種・機械番号マスターデータ（編集UI用 - PostgreSQLから）
  const [machineData, setMachineData] = useState<MachineData>({
    machineTypes: [],
    machines: [],
  });

  // 履歴検索フィルター用データ（保存されたJSONファイルから）
  const [searchFilterData, setSearchFilterData] = useState<{
    machineTypes: string[];
    machineNumbers: string[];
  }>({
    machineTypes: [],
    machineNumbers: [],
  });

  const [searchFilterLoading, setSearchFilterLoading] = useState(false);
  const lastApiCallRef = useRef<number>(0);
  const isInitialLoadedRef = useRef<boolean>(false);
  // 要約が自動生成済みかどうかを追跡するRef
  const autoSummaryGenerated = useRef<Set<string>>(new Set());

  // アイテム選択ハンドラー
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

  // JSONデータを正規化する関数
  const normalizeJsonData = (item: SupportHistoryItem): SupportHistoryItem => {
    console.log('正規化前のアイテム:', item);

    if (!item.jsonData) {
      console.log('jsonDataが存在しません');
      return item;
    }

    // 既にitem直接にmachineTypeとmachineNumberが存在する場合
    if (item.machineType && item.machineNumber) {
      console.log('既に正規化済み:', {
        machineType: item.machineType,
        machineNumber: item.machineNumber,
      });
      return item;
    }

    // サーバーから送信されたデータを基に正規化
    const normalizedItem = {
      ...item,
      machineType: item.machineType || item.jsonData.machineType || '',
      machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
      jsonData: {
        ...item.jsonData, // 既存のjsonDataをすべて含める（chatDataも含む）
        // 必要なフィールドを確実に含める
        // 事象タイトル: JSONのtitleから優先的に取得、ファイル名からも抽出
        title: item.jsonData?.title || (() => {
          // まずitem.titleをチェック（JSONがルートレベルにある場合）
          if (item.title) {
            return item.title;
          }
        // ファイル名から日本語部分だけを抽出（例：エンジンが全く始動しない_0a9f4736-82fa... -> エンジンが全く始動しない）
        if (item.fileName) {
          // 最初の「_」までが日本語部分
          const firstUnderscoreIndex = item.fileName.indexOf('_');
          if (firstUnderscoreIndex > 0) {
            return item.fileName.substring(0, firstUnderscoreIndex);
          }
          // 「_」がない場合は、拡張子を除いた全体を返す（日本語のみの場合）
          const withoutExtension = item.fileName.replace(/\.json$/, '');
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

    // chatDataが存在する場合の追加処理
    if (item.jsonData.chatData || normalizedItem.jsonData.chatData) {
      console.log('chatData形式を検出');
      const chatData = item.jsonData.chatData || normalizedItem.jsonData.chatData;

      // machineInfoからmachineTypeとmachineNumberを取得
      const machineTypeName = chatData.machineInfo?.machineTypeName || '';
      const machineNumber = chatData.machineInfo?.machineNumber || '';

      console.log('chatDataから抽出:', { machineTypeName, machineNumber });

      // chatDataの値で上書き
      normalizedItem.machineType =
        machineTypeName || normalizedItem.machineType;
      normalizedItem.machineNumber =
        machineNumber || normalizedItem.machineNumber;
      normalizedItem.jsonData.machineType =
        machineTypeName || normalizedItem.jsonData.machineType;
      normalizedItem.jsonData.machineNumber =
        machineNumber || normalizedItem.jsonData.machineNumber;
    }

    console.log('正規化後のアイテム:', normalizedItem);
    return normalizedItem;
  };

  // JSONの内容から発生事象から処置までの要約を生成する関数
  const generateSummaryFromJson = useCallback((jsonData: any): string => {
    try {
      const parts: string[] = [];

      // 1. 事象タイトル
      const title = jsonData?.title || '';
      if (title) {
        parts.push(`【事象】${title}`);
      }

      // 2. 発生事象の詳細（problemDescription + conversationHistory + chatData.messages）
      const problemDesc = jsonData?.problemDescription || '';
      const conversationHistory = jsonData?.conversationHistory || [];
      const chatData = jsonData?.chatData || jsonData;
      const chatMessages = chatData?.messages || [];
      
      // conversationHistoryからテキストメッセージを抽出（画像は除外）
      const conversationTexts: string[] = [];
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
      
      // chatData.messagesからユーザーメッセージを抽出（画像は除外）
      const userMessages: string[] = [];
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
        parts.push(`【発生事象の詳細】${eventDetails.join(' ')}`);
      }

      // 3. 影響コンポーネント
      const components = jsonData?.extractedComponents || [];
      if (components.length > 0) {
        parts.push(`【影響コンポーネント】${components.join(', ')}`);
      }

      // 4. 症状
      const symptoms = jsonData?.extractedSymptoms || [];
      if (symptoms.length > 0) {
        parts.push(`【症状】${symptoms.join(', ')}`);
      }

      // 5. 処置内容（answer）
      const answer = jsonData?.answer || '';
      if (answer) {
        parts.push(`【処置内容】${answer}`);
      }

      // 要約が生成できない場合は空文字を返す
      if (parts.length === 0) {
        return '';
      }

      return parts.join('\n\n');
    } catch (error) {
      console.error('要約生成エラー:', error);
      return '';
    }
  }, []);

  // 編集画面が開かれた時にGPT要約を自動生成（一度だけ実行）
  useEffect(() => {
    if (showEditDialog && editingItem && editingItem.id) {
      // 既にこのアイテムの要約を生成済みの場合はスキップ
      if (autoSummaryGenerated.current.has(editingItem.id)) {
        return;
      }
      
      // 編集画面を開いたら、既存の説明があってもGPT要約を自動生成して上書き
      autoSummaryGenerated.current.add(editingItem.id);
      
      // GPT要約を非同期で生成
      (async () => {
        try {
          // JSONデータに要約に必要なデータがあるかチェック
          const chatData = editingItem.jsonData?.chatData || editingItem.jsonData;
          const hasDataForSummary = 
            editingItem.jsonData?.title ||
            editingItem.jsonData?.problemDescription ||
            (Array.isArray(editingItem.jsonData?.conversationHistory) && editingItem.jsonData.conversationHistory.length > 0) ||
            (Array.isArray(chatData?.messages) && chatData.messages.length > 0) ||
            editingItem.jsonData?.answer;
          
          if (!hasDataForSummary) {
            console.log('⚠️ 要約に必要なデータがありません。GPT要約をスキップします。');
            return;
          }

          console.log('📝 編集画面を開いた際にGPT要約を自動生成中...');
          
          // chatData.messagesからユーザーメッセージを抽出してGPT要約に使用
          const chatDataForSummary = editingItem.jsonData?.chatData || editingItem.jsonData;
          let summaryJsonData = { ...editingItem.jsonData };
          
          // chatData.messagesが存在する場合は、それを優先してGPT要約に使用
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
              console.log('🔍 GPT要約に使用するユーザーメッセージ数:', userMessages.length);
            }
          }
          
          const gptSummary = await summarizeWithGPT(summaryJsonData);
          if (gptSummary) {
            console.log('✅ GPT要約生成完了:', gptSummary.substring(0, 100) + '...');
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
          // 400エラー（要約する内容がない）は静かに処理してフォールバック
          const isNoContentError = error?.message?.includes('要約する内容がありません') || 
                                   error?.message?.includes('400');
          
          if (!isNoContentError) {
            console.error('❌ GPT要約自動生成エラー:', error);
          } else {
            console.log('⚠️ 要約に必要なデータが不足しています。簡易要約を使用します。');
          }
          
          // GPT要約に失敗した場合は簡易要約をフォールバック
          const fallbackSummary = generateSummaryFromJson(editingItem.jsonData);
          if (fallbackSummary) {
            console.log('📝 簡易要約をフォールバックとして生成:', fallbackSummary);
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

  // 履歴データ更新のメッセージリスナー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_HISTORY_ITEM') {
        const updatedData = event.data.data;
        console.log('履歴データ更新メッセージを受信:', updatedData);

        // 履歴一覧表の該当アイテムを更新
        setHistoryItems(prevItems =>
          prevItems.map(item =>
            item.id === updatedData.id || item.chatId === updatedData.chatId
              ? { ...item, ...updatedData }
              : item
          )
        );

        // フィルタリングされたアイテムも更新
        setFilteredItems(prevItems =>
          prevItems.map(item =>
            item.id === updatedData.id || item.chatId === updatedData.chatId
              ? { ...item, ...updatedData }
              : item
          )
        );

        // 選択中のアイテムも更新
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

  // machineDataの状態変化を監視
  useEffect(() => {
    console.log('🔍 machineData状態変化:', machineData);
  }, [machineData]);

  // データ取得（サーバーAPIから取得） - この処理は初期ロードに統合済み

  // 機種・機械番号マスターデータ取得
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);

      // 機種・機械番号データを専用APIから取得
      console.log('🔍 機種・機械番号データ取得開始');
      const { buildApiUrl } = await import('../lib/api-unified');
      const response = await fetch(buildApiUrl('/machines/machine-types'));
      console.log('🔍 APIレスポンス:', response.status, response.statusText);
      const data = await response.json();
      console.log('🔍 APIレスポンスデータ:', data);

      if (data.success && data.data) {
        // 機種一覧を構築（重複除去）
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];

        // 機械番号一覧を構築（重複除去）
        const machineSet = new Set<string>();
        const machines: Array<{
          id: string;
          machineNumber: string;
          machineTypeName: string;
        }> = [];

        console.log('🔍 機種・機械番号データは専用APIから取得されます');

        // 機種データを処理
        data.data.forEach((type: any) => {
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
          machines: [], // 機械番号は別途取得
        };

        console.log('🔍 機種・機械番号データ取得結果:', result);
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
        console.log('🔍 setMachineData呼び出し完了');
      } else {
        console.log(
          '⚠️ 機種・機械番号データが正しく取得できませんでした:',
          data
        );
        console.log('⚠️ data.success:', data.success);
        console.log('⚠️ data.machineTypes:', data.machineTypes);
        console.log('⚠️ data.machines:', data.machines);
        setMachineData({ machineTypes: [], machines: [] });
      }
    } catch (error) {
      console.error('機種・機械番号データの取得に失敗しました:', error);
      setMachineData({ machineTypes: [], machines: [] });
    } finally {
      setMachineDataLoading(false);
    }
  };

  // 履歴検索フィルター用データ（エクスポートJSONから取得）
  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('🔍 エクスポートJSONからフィルターデータ取得開始');
      
      const response = await fetch('/api/history/exports/filter-data');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchFilterData({
            machineTypes: data.machineTypes || [],
            machineNumbers: data.machineNumbers || [],
          });
          console.log('🔍 フィルターデータ取得完了:', {
            machineTypes: data.machineTypes?.length || 0,
            machineNumbers: data.machineNumbers?.length || 0,
          });
        } else {
          console.warn('⚠️ フィルターデータ取得失敗:', data);
          setSearchFilterData({ machineTypes: [], machineNumbers: [] });
        }
      } else {
        console.error('⚠️ フィルターデータ取得エラー:', response.statusText);
        setSearchFilterData({ machineTypes: [], machineNumbers: [] });
      }
    } catch (error) {
      console.error('履歴検索フィルターデータ取得エラー:', error);
      setSearchFilterData({ machineTypes: [], machineNumbers: [] });
    } finally {
      setSearchFilterLoading(false);
    }
  };

  const fetchHistoryData = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);

      // レート制限チェック
      const now = Date.now();
      if (lastApiCallRef.current && now - lastApiCallRef.current < 1000) {
        console.log('🔍 APIリクエスト制限中...');
        return;
      }
      lastApiCallRef.current = now;

      // 現在のフィルター値を取得
      const currentFilters = {
        machineType: filters.machineType,
        machineNumber: filters.machineNumber,
        searchText: filters.searchText,
        searchDate: filters.searchDate
      };

      // サーバー側でフィルタリングを行う
      const params = new URLSearchParams();
      if (currentFilters.machineType)
        params.append('machineType', currentFilters.machineType);
      if (currentFilters.machineNumber)
        params.append('machineNumber', currentFilters.machineNumber);
      if (currentFilters.searchText) params.append('searchText', currentFilters.searchText);
      if (currentFilters.searchDate) params.append('searchDate', currentFilters.searchDate);
      params.append('limit', '20');
      params.append('offset', ((page - 1) * 20).toString());

      const { buildApiUrl } = await import('../lib/api-unified');
      const requestUrl = buildApiUrl('/history');
      console.log('🔍 APIリクエストURL:', requestUrl);
      
      const response = await fetch(requestUrl);
      console.log('🔍 レスポンスステータス:', response.status, response.statusText);
      
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

      // デバッグ用にローカルストレージにも保存
      localStorage.setItem('debug_api_response', JSON.stringify(data, null, 2));

      if (Array.isArray(data)) {
        console.log('🔍 取得件数:', data.length);

        // エクスポートファイルデータの確認
        data.forEach((item: any, index: number) => {
          console.log(`🔍 アイテム ${index + 1}:`, {
            fileName: item.fileName,
            title: item.title,
            chatId: item.chatId,
          });
        });

               // エクスポートファイルを履歴アイテムとして変換
               const updatedItems = data.map((file: any) => {
                 // titleはサーバーから返されたものを使用
                 const displayTitle = file.title || 'タイトルなし';
                 
                 // JSONデータから詳細情報を取得
                 const content = file.content || {};
                 // サーバー側で抽出済みの値を優先使用、なければJSONから抽出
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
                     ...content, // 完全なJSONデータを含める
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

          console.log('変換されたアイテム:', {
            fileName: convertedItem.fileName,
            machineType: convertedItem.machineType,
            machineNumber: convertedItem.machineNumber,
            jsonData: convertedItem.jsonData,
          });

          return convertedItem;
        });

        console.log('🔍 設定前の状態:', {
          historyItemsLength: historyItems.length,
          filteredItemsLength: filteredItems.length,
          updatedItemsLength: updatedItems.length
        });
        
        // DB専用履歴取得に統一
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();
        
        // DB専用データを統合（従来のupdatedItemsは無視してDB優先）
        const allItems = dbHistoryItems;
        
        setHistoryItems(allItems);
        setFilteredItems(allItems);
        setTotalPages(Math.ceil(allItems.length / 20));
        setCurrentPage(page);
        
        console.log('🔍 DB専用履歴設定完了:', {
          dbItemsLength: dbHistoryItems.length,
          totalPages: Math.ceil(allItems.length / 20)
        });
      } else {
        console.log('🔍 データ取得成功せず:', data);
        
        // サーバーからのデータがない場合でもDB専用履歴取得を実行
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();
        
        if (dbHistoryItems.length > 0) {
          setHistoryItems(dbHistoryItems);
          setFilteredItems(dbHistoryItems);
          setTotalPages(Math.ceil(dbHistoryItems.length / 20));
          console.log(`🔍 DB専用履歴取得完了: ${dbHistoryItems.length}件`);
        } else {
          setHistoryItems([]);
          setFilteredItems([]);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('履歴データの取得に失敗しました:', error);
      console.error('エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // エラーが発生した場合でもDB専用履歴取得を試行
      try {
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const dbHistoryItems = await loadHistoryFromDB();
        if (dbHistoryItems.length > 0) {
          setHistoryItems(dbHistoryItems);
          setFilteredItems(dbHistoryItems);
          setTotalPages(Math.ceil(dbHistoryItems.length / 20));
          console.log(`🔍 エラー時DB履歴取得完了: ${dbHistoryItems.length}件`);
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

  // 初期ロード（一度だけ実行）
  useEffect(() => {
    if (!isInitialLoadedRef.current) {
      isInitialLoadedRef.current = true;
      fetchHistoryData(1);
      // fetchMachineDataFromAPI(); // 機種データは編集時に必要に応じて取得
    }
  }, []); // 初期ロード時のみ実行

  // 履歴データが変更された時にフィルターデータを更新
  // 初期ロード時にエクスポートJSONからフィルターデータを取得
  useEffect(() => {
    fetchSearchFilterData(); // エクスポートJSONからフィルターデータを取得
  }, []); // 初回のみ実行

  // フィルター変更時の処理
  useEffect(() => {
    // キーワード検索がある場合はスキップ（検索ボタンで手動実行）
    if (filters.searchText && filters.searchText.trim()) {
      return;
    }
    
    // フィルターが変更された時のみ再取得（初期ロード時は除外）
    if (historyItems.length > 0) {
      fetchHistoryData(1);
    }
  }, [filters.machineType, filters.machineNumber, filters.searchDate]); // キーワード検索は除外

  // フィルター変更時の処理
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    // filters を更新
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));

    // 編集ダイアログが開いている場合は、編集中のアイテムにも反映する
    // 期待される動作: フィルタで機種/機械番号を選択すると、すでに編集中のフォームに即座に反映される
    try {
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
        'フィルターから編集アイテムへの同期に失敗しました:',
        syncError
      );
    }
  };

  const handleSearch = useCallback(async () => {
    // キーワード検索がある場合、エクスポートJSONから検索
    if (filters.searchText && filters.searchText.trim()) {
      try {
        setLoading(true);
        const keyword = filters.searchText.trim();
        const searchUrl = `/api/history/exports/search?keyword=${encodeURIComponent(keyword)}`;
        console.log('🔍 検索実行:', { keyword, searchUrl });
        
        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 検索結果:', { success: data.success, total: data.total, keyword: data.keyword });
          
          if (data.success && data.data) {
            // エクスポートJSONから検索した結果を取得
            let results = data.data;
            console.log('🔍 検索結果アイテム数:', results.length);
            
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
      // キーワード検索がない場合は通常のフィルタリングを使用
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
      
      // 削除後、現在のページを再読み込み
      await fetchHistoryData(currentPage);
      
      // 削除確認ダイアログを閉じる
      setDeleteConfirm({
        show: false,
        id: '',
        title: '',
      });
    } catch (error) {
      console.error('履歴削除エラー:', error);
      alert('履歴の削除に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 選択チェック機能
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
      alert('エクスポートする履歴を選択してください。');
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
      console.error('選択履歴エクスポートエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      const blob = await exportHistoryItem(item.id, 'json');
      downloadFile(blob, `history_${item.id}.json`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
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
      console.error('エクスポートエラー:', error);
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
      console.error('エクスポートエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    // フィルターをクリアして、元の履歴一覧を表示
    setFilters({
      machineType: '',
      machineNumber: '',
      searchText: '',
      searchDate: '',
    });
    // 検索結果をクリアして、元のhistoryItemsを表示
    setFilteredItems(historyItems);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const handleGenerateReport = async () => {
    // 既にレポート生成中の場合は処理を停止
    if (reportLoading) {
      console.log('レポート生成中です。処理を停止します。');
      return;
    }

    try {
      console.log('=== レポート生成開始 ===');
      setReportLoading(true);

      // 選択されたアイテムのみを対象とする
      // 全件を対象とする
      const targetItems = filteredItems;

      console.log('レポート生成開始:', {
        filteredItemsCount: filteredItems.length,
        targetItemsCount: targetItems.length,
      });

      // 対象アイテムがない場合は処理を停止
      if (targetItems.length === 0) {
        alert('対象アイテムがありません。');
        setReportLoading(false);
        return;
      }

      // 各アイテムのデータ構造を確認
      targetItems.forEach((item, index) => {
        console.log(`アイテム${index + 1}のデータ構造:`, {
          id: item.id,
          fileName: item.fileName,
          hasJsonData: !!item.jsonData,
          jsonDataKeys: item.jsonData ? Object.keys(item.jsonData) : [],
          machineInfo: item.machineInfo,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
        });
      });

      // 選択されたアイテムからJSONデータを分析してレポートデータを生成
      const allTitles: string[] = [];
      const allComponents: string[] = [];
      const allSymptoms: string[] = [];
      const allModels: string[] = [];

      targetItems.forEach(item => {
        const jsonData = item?.jsonData ?? item?.data ?? {};

        // 事象タイトルを抽出（ファイル名から優先的に取得、次にJSONデータから）
        let title = null;

        // まずファイル名から事象内容を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }

        // ファイル名から取得できない場合は、JSONデータから取得
        if (!title) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
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

      // 各アイテムごとに個別のレポートを生成
      const reportDataArray = targetItems.map((item, index) => {
        console.log(`レポート${index + 1}の生成開始:`, item.fileName);

        const jsonData = item?.jsonData ?? item?.data ?? {};

        // 事象タイトルを抽出（ファイル名から優先的に取得、次にJSONデータから）
        let title = '事象なし';

        // まずファイル名から事象内容を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }

        // ファイル名から取得できない場合は、JSONデータから取得
        if (title === '事象なし') {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
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

        console.log(`レポート${index + 1}の基本情報:`, {
          title,
          machineType,
          machineNumber,
        });

        // 画像データを収集（優先順位付き）
        const images = [];

        try {
          // 優先順位1: conversationHistoryからBase64画像を取得（最優先）
          if (jsonData?.conversationHistory?.length > 0) {
            console.log(
              'handleGenerateReport: conversationHistoryからBase64画像を検索中...',
              jsonData.conversationHistory.length
            );
            const imageMessages = jsonData.conversationHistory.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: conversationHistoryでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              images.push({
                id: `conv-${index}`,
                url: msg.content,
                fileName: `故障画像_${index + 1}`,
                description: '機械故障箇所の写真',
                source: 'conversationHistory',
              });
            });
          }

          // 優先順位2: originalChatData.messagesからBase64画像を取得
          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: originalChatData.messagesからBase64画像を検索中...',
              jsonData.originalChatData.messages.length
            );
            const imageMessages = jsonData.originalChatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: originalChatData.messagesでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'originalChatData',
                });
              }
            });
          }

          // 優先順位3: chatData.messagesからBase64画像を取得
          if (jsonData?.chatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: chatData.messagesからBase64画像を検索中...',
              jsonData.chatData.messages.length
            );
            const imageMessages = jsonData.chatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: chatData.messagesでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'chatData',
                });
              }
            });
          }

          // 優先順位4: savedImagesフィールドから画像を取得
          if (jsonData?.savedImages?.length > 0) {
            console.log(
              'handleGenerateReport: savedImagesから画像を取得中...',
              jsonData.savedImages.length
            );
            jsonData.savedImages.forEach((img: any, index: number) => {
              // 既に追加済みの画像は除外
              let imageUrl = '';
              
              // fileNameがある場合は、それを優先してURLを生成
              if (img.fileName) {
                const imagePath = `/api/images/chat-exports/${img.fileName}`;
                let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                imageUrl = `${baseUrl}${imagePath}`;
              } else if (img.url) {
                // urlがある場合
                imageUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
              } else if (img.path) {
                // pathがある場合
                imageUrl = img.path.startsWith('http') ? img.path : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.path}`;
              }
              
              if (imageUrl && !images.some(existingImg => existingImg.url === imageUrl)) {
                images.push({
                  id: `saved-${index}`,
                  url: imageUrl,
                  fileName: img.fileName || `故障画像_${images.length + 1}`,
                  description: img.description || '機械故障箇所の写真',
                  source: 'savedImages',
                });
              }
            });
          }

          // 優先順位5: 再帰的にJSONデータ内の画像を検索
          const findImagesRecursively = (
            obj: any,
            path: string = ''
          ): string[] => {
            const foundImages: string[] = [];

            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;

                if (
                  typeof value === 'string' &&
                  value.startsWith('data:image/')
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
            'handleGenerateReport: 再帰検索で画像を発見:',
            recursiveImages.length
          );
          recursiveImages.forEach((imgUrl, index) => {
            // 既に追加済みの画像は除外
            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `故障画像_${images.length + 1}`,
                description: '機械故障箇所の写真',
                source: 'recursive',
              });
            }
          });

          // 優先順位6: imagePathフィールド（最終フォールバック）
          if (
            jsonData?.imagePath &&
            typeof jsonData.imagePath === 'string' &&
            !images.some(img => img.url === jsonData.imagePath)
          ) {
            console.log('handleGenerateReport: imagePathから画像を取得中...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '故障画像',
              description: '機械故障箇所の写真',
              source: 'imagePath',
            });
          }
        } catch (imageError) {
          console.error('画像データ処理中にエラーが発生しました:', imageError);
          // 画像処理エラーが発生してもレポート生成は続行
        }

        console.log(`レポート${index + 1}の画像数:`, images.length, '枚');

        const reportData = {
          reportId: `R${Date.now().toString().slice(-5)}-${index + 1}`,
          machineId: machineNumber || '不明',
          date: new Date(item.createdAt).toISOString().split('T')[0],
          location: '○○線',
          failureCode: 'FC01',
          description: title,
          status: '報告完了',
          engineer: 'システム管理者',
          notes: `事象タイトル: ${title}\n機種: ${machineType}\n機械番号: ${machineNumber}\n作成日時: ${new Date(item.createdAt).toLocaleString('ja-JP')}\n影響コンポーネント: ${jsonData?.extractedComponents?.join(', ') || 'なし'}\n症状: ${jsonData?.extractedSymptoms?.join(', ') || 'なし'}\n可能性のある機種: ${jsonData?.possibleModels?.join(', ') || 'なし'}`,
          repairRequestDate: new Date().toISOString().split('T')[0],
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          repairLocation: '工場内修理スペース',
          images: images.length > 0 ? images : undefined,
          chatHistory:
            jsonData?.conversationHistory ||
            jsonData?.chatData?.messages ||
            undefined,
        };

        console.log(`レポート${index + 1}の生成完了:`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0,
        });

        return reportData;
      });

      console.log('=== レポートデータ生成完了 ===');
      console.log('レポート配列の長さ:', reportDataArray.length);
      console.log(
        '各レポートの詳細:',
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
      console.log('レポート表示状態を設定完了');

      // 成功通知
      alert(
        `レポートが正常に生成されました。\n対象アイテム: ${targetItems.length}件 (選択済み)\n${targetItems.length > 1 ? '複数ページで表示されます。' : ''}`
      );

      console.log('=== レポート生成完了 ===');
    } catch (error) {
      console.error('=== レポート生成エラー ===');
      console.error('エラー詳細:', error);
      console.error(
        'エラースタック:',
        error instanceof Error ? error.stack : 'スタックトレースなし'
      );
      alert(
        'レポート生成中にエラーが発生しました: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      // エラーが発生しても確実にローディング状態をリセット
      setReportLoading(false);
      console.log('レポート生成状態をリセット完了');
    }
  };

  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/history/file?name=${encodeURIComponent(fileName)}`
      );
      if (!response.ok) {
        throw new Error('チャットエクスポートファイルの取得に失敗しました');
      }

      const data = await response.json();

      // 新しいフォーマットのデータを確認して、適切な形式に変換
      const reportData = {
        ...data,
        // 新しいフォーマットのフィールドを追加
        title:
          data.title ||
          data.chatData?.machineInfo?.machineTypeName ||
          'タイトルなし',
        problemDescription: data.problemDescription || '説明なし',
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
      console.error('レポート表示エラー:', error);
    }
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportData(null);
    setSelectedFileName('');
    // レポート生成の状態もリセット
    setReportLoading(false);
  };

  const handleSaveReport = (reportData: any) => {
    console.log('レポートデータを保存:', reportData);

    // レポートデータをローカルストレージに保存
    const savedReports = JSON.parse(
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

    console.log('レポートが保存されました:', newReport);
  };

  // 【削除済み】破損したautoLoadHistoryFiles関数を削除
  // 代わりにdb-history-loader.tsxのloadHistoryFromDBを使用



  // 履歴アイテムの編集データをサーバーに保存
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編集された履歴アイテムを保存:', editedItem);
      console.log('編集された履歴アイテムのID:', editedItem.id);
      console.log('編集された履歴アイテムのJSONデータ:', editedItem.jsonData);

      // IDの確認と準備（export_プレフィックスを除去）
      let itemId = editedItem.id || editedItem.chatId;
      if (!itemId) {
        alert('アイテムIDが見つかりません。保存できません。');
        return;
      }

      // export_プレフィックスがある場合は除去
      if (itemId.startsWith('export_')) {
        itemId = itemId.replace('export_', '');
        // ファイル名の場合は拡張子も除去
        if (itemId.endsWith('.json')) {
          itemId = itemId.replace('.json', '');
        }
        // ファイル名からchatIdを抽出（_で区切られた2番目の部分）
        const parts = itemId.split('_');
        if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
          itemId = parts[1];
        }
      }

      console.log(
        '使用するID:',
        itemId,
        '元のID:',
        editedItem.id || editedItem.chatId
      );

      // 更新データの準備（変更されたフィールドのみを送信）
      // 既存のデータは保持し、変更された部分だけを更新
      const updatePayload = {
        updatedData: {
          // JSONデータの主要フィールドのみ更新（既存のデータは保持）
          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          ...(editedItem.jsonData?.problemDescription && { problemDescription: editedItem.jsonData.problemDescription }),
          ...(editedItem.jsonData?.answer && { answer: editedItem.jsonData.answer }),
          ...(editedItem.jsonData?.machineType && { machineType: editedItem.jsonData.machineType }),
          ...(editedItem.jsonData?.machineNumber && { machineNumber: editedItem.jsonData.machineNumber }),
          ...(editedItem.jsonData?.repairSchedule && { repairSchedule: editedItem.jsonData.repairSchedule }),
          ...(editedItem.jsonData?.location && { location: editedItem.jsonData.location }),
          ...(editedItem.jsonData?.status && { status: editedItem.jsonData.status }),
          ...(editedItem.jsonData?.remarks && { remarks: editedItem.jsonData.remarks }),
          // 基本情報も更新（ルートレベル）
          ...(editedItem.machineType && { machineType: editedItem.machineType }),
          ...(editedItem.machineNumber && { machineNumber: editedItem.machineNumber }),
          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          lastModified: new Date().toISOString(),
        },
        updatedBy: 'user',
      };

      console.log('送信するペイロード:', updatePayload);

      // サーバーに更新リクエストを送信
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      console.log('サーバーレスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('サーバーエラー詳細:', errorText);
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
      console.log('履歴更新完了:', result);

      // ローカルストレージも更新
      if (itemId) {
        const savedKey = 'savedMachineFailureReport_' + itemId;
        localStorage.setItem(savedKey, JSON.stringify(editedItem.jsonData));
        console.log('ローカルストレージ更新:', savedKey);
      }

      // 履歴リストの該当アイテムを更新
      setHistoryItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? {
                ...item,
                jsonData: editedItem.jsonData,
                lastModified: new Date().toISOString(),
                // 基本情報も更新
                machineType:
                  editedItem.jsonData?.machineType || item.machineType,
                machineNumber:
                  editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle,
              }
            : item
        )
      );

      setFilteredItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? {
                ...item,
                jsonData: editedItem.jsonData,
                lastModified: new Date().toISOString(),
                // 基本情報も更新
                machineType:
                  editedItem.jsonData?.machineType || item.machineType,
                machineNumber:
                  editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle,
              }
            : item
        )
      );

      // 成功通知
      alert('履歴が正常に更新され、元のファイルに上書き保存されました。');

      // 編集ダイアログを閉じる
      setShowEditDialog(false);
      setEditingItem(null);

      // 履歴リストの再読み込みは行わない（既に更新済み）
      console.log('履歴更新完了 - リスト再読み込みをスキップ');
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

  // 機械故障報告書のHTML生成関数
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // JSONデータを安全にエスケープする関数（強化版）
    const safeJsonStringify = (obj: any): string => {
      try {
        let jsonStr = JSON.stringify(obj);
        // HTMLとJavaScriptで問題になる文字を徹底的にエスケープ
        jsonStr = jsonStr
          .replace(/\\/g, '\\\\') // バックスラッシュを最初にエスケープ
          .replace(/"/g, '\\"') // ダブルクォート
          .replace(/'/g, "\\'") // シングルクォート
          .replace(/</g, '\\u003c') // <
          .replace(/>/g, '\\u003e') // >
          .replace(/&/g, '\\u0026') // &
          .replace(/\//g, '\\/') // スラッシュ
          .replace(/:/g, '\\u003a') // コロン（重要）
          .replace(/\r/g, '\\r') // キャリッジリターン
          .replace(/\n/g, '\\n') // 改行
          .replace(/\t/g, '\\t') // タブ
          .replace(/\f/g, '\\f') // フォームフィード
          .replace(/\b/g, '\\b') // バックスペース
          .replace(/\u2028/g, '\\u2028') // ラインセパレータ
          .replace(/\u2029/g, '\\u2029'); // パラグラフセパレータ

        console.log('🔧 safeJsonStringify result length:', jsonStr.length);
        console.log(
          '🔧 safeJsonStringify sample:',
          jsonStr.substring(0, 100) + '...'
        );
        return jsonStr;
      } catch (e) {
        console.error('JSONのシリアライズに失敗:', e);
        return '{}';
      }
    };
    // 画像を収集（base64のみ、詳細なデバッグ付き）
    const collectImages = (
      data: any
    ): Array<{
      id: string;
      url: string;
      fileName: string;
      description?: string;
    }> => {
      console.log('🖼️ 画像収集開始 - reportData:', data);
      console.log('🖼️ reportData keys:', Object.keys(data || {}));

      const images: Array<{
        id: string;
        url: string;
        fileName: string;
        description?: string;
      }> = [];
      const imageUrls = new Set<string>();

      // デバッグ: データ構造を詳細確認
      console.log('🖼️ データ構造確認:');
      console.log('🖼️ - chatData:', data?.chatData ? 'あり' : 'なし');
      console.log(
        '🖼️ - chatData.messages:',
        data?.chatData?.messages
          ? 'あり(' + data.chatData.messages.length + '件)'
          : 'なし'
      );
      console.log(
        '🖼️ - conversationHistory:',
        data?.conversationHistory
          ? 'あり(' +
              (Array.isArray(data.conversationHistory)
                ? data.conversationHistory.length
                : 'non-array') +
              ')'
          : 'なし'
      );
      console.log(
        '🖼️ - originalChatData.messages:',
        data?.originalChatData?.messages
          ? 'あり(' + data.originalChatData.messages.length + ')'
          : 'なし'
      );
      console.log(
        '🖼️ - messages:',
        data?.messages
          ? 'あり(' +
              (Array.isArray(data.messages)
                ? data.messages.length
                : 'non-array') +
              ')'
          : 'なし'
      );

      // 1) chatData.messages から base64 画像を探す（メイン）
      if (data?.chatData?.messages && Array.isArray(data.chatData.messages)) {
        console.log('🖼️ chatData.messagesをスキャン中...');
        data.chatData.messages.forEach((message: any, messageIndex: number) => {
          console.log('🖼️ message[' + messageIndex + ']:', {
            id: message?.id,
            content: message?.content
              ? message.content.substring(0, 50) + '...'
              : 'なし',
            isBase64: message?.content?.startsWith('data:image/'),
          });

          if (
            message?.content &&
            typeof message.content === 'string' &&
            message.content.startsWith('data:image/')
          ) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();

            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `chatdata-${messageIndex}`,
                url: normalizedContent,
                fileName: `故障画像${images.length + 1}`,
                description: '故障箇所画像（chatData.messages）',
              });
              console.log(
                '🖼️ Base64画像見つかりました（chatData.messages）:',
                images.length
              );
            }
          }
        });
      }

      // 2) conversationHistory から base64 画像を探す
      if (
        data?.conversationHistory &&
        Array.isArray(data.conversationHistory)
      ) {
        console.log('🖼️ conversationHistoryをスキャン中...');
        data.conversationHistory.forEach(
          (message: any, messageIndex: number) => {
            if (
              message?.content &&
              typeof message.content === 'string' &&
              message.content.startsWith('data:image/')
            ) {
              const normalizedContent = message.content
                .replace(/\r?\n/g, '')
                .replace(/[""]/g, '"')
                .trim();

              if (!imageUrls.has(normalizedContent)) {
                imageUrls.add(normalizedContent);
                images.push({
                  id: `conversation-${messageIndex}`,
                  url: normalizedContent,
                  fileName: `故障画像${images.length + 1}`,
                  description: '故障箇所画像（conversationHistory）',
                });
                console.log(
                  '🖼️ Base64画像見つかりました（conversationHistory）:',
                  images.length
                );
              }
            }
          }
        );
      }

      // 3) originalChatData.messages から base64 画像を探す
      if (
        data?.originalChatData?.messages &&
        Array.isArray(data.originalChatData.messages)
      ) {
        console.log('🖼️ originalChatData.messagesをスキャン中...');
        data.originalChatData.messages.forEach(
          (message: any, messageIndex: number) => {
            if (
              message?.content &&
              typeof message.content === 'string' &&
              message.content.startsWith('data:image/')
            ) {
              const normalizedContent = message.content
                .replace(/\r?\n/g, '')
                .replace(/[""]/g, '"')
                .trim();

              if (!imageUrls.has(normalizedContent)) {
                imageUrls.add(normalizedContent);
                images.push({
                  id: `original-${messageIndex}`,
                  url: normalizedContent,
                  fileName: `故障画像${images.length + 1}`,
                  description: '故障箇所画像（originalChatData）',
                });
                console.log(
                  '🖼️ Base64画像見つかりました（originalChatData）:',
                  images.length
                );
              }
            }
          }
        );
      }

      // 4) messages から base64 画像を探す
      if (data?.messages && Array.isArray(data.messages)) {
        console.log('🖼️ messagesをスキャン中...');
        data.messages.forEach((message: any, messageIndex: number) => {
          if (
            message?.content &&
            typeof message.content === 'string' &&
            message.content.startsWith('data:image/')
          ) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();

            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `messages-${messageIndex}`,
                url: normalizedContent,
                fileName: `故障画像${images.length + 1}`,
                description: '故障箇所画像（messages）',
              });
              console.log(
                '🖼️ Base64画像見つかりました（messages）:',
                images.length
              );
            }
          }
        });
      }

      // 5) savedImages から画像を取得（サーバー上のファイル）
      if (data?.savedImages && Array.isArray(data.savedImages)) {
        console.log('🖼️ savedImagesをスキャン中...');
        data.savedImages.forEach((img: any, index: number) => {
          let imageUrl = '';
          
          // fileNameがある場合は、それを優先してURLを生成
          if (img && typeof img === 'object' && img.fileName) {
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
              fileName: typeof img === 'object' ? (img.fileName || `故障画像${images.length + 1}`) : `故障画像${images.length + 1}`,
              description: '故障箇所画像（savedImages）',
            });
            console.log('🖼️ savedImagesから画像を取得:', images.length);
          }
        });
      }

      console.log('🖼️ 画像収集結果（全種類）:', images.length + '件の画像');
      images.forEach((img, index) => {
        console.log(
          '🖼️ 画像[' + index + ']:',
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
               <h3>故障箇所画像</h3>
               <div class="image-grid">
                 ${collectedImages
                   .map(
                     (image, index) => `
                   <div class="image-item">
                     <img class="report-img" 
                          src="${image.url}" 
                          alt="故障画像${index + 1}" />
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
        <title>機械故障報告書</title>
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
          
          /* 印刷時のみ文字サイズをさらに縮小してA4一枚に収める */
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
            
            /* 印刷時のレイアウト最適化 */
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
            
            /* A4一枚に収めるための調整 */
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
          
          /* 編集モード時のヘッダー統一 */
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
          
          /* 編集モード時のセクション見出し統一 */
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
          
          /* 編集モード時のヘッダー日付統一 */
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
          
          /* 編集モード時の文字サイズを機械故障報告書UIに合わせる */
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
          
          /* 編集モード時の表示切り替え - 確実に動作するように強化 */
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
          
          /* デフォルトで編集要素を確実に非表示 */
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
          
          /* 編集モード時の入力フィールドスタイル統一 */
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
          
          /* 編集モード用スタイル */
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
          // シンプルで確実な設定
          window.reportData = {};
          console.log('Script starting...');
        </script>
        <div class="action-buttons">
          <button class="btn btn-save" id="save-btn" style="display: none;">保存</button>
          <button class="btn btn-print" onclick="window.print()">印刷</button>
          <button class="btn btn-cancel" id="cancel-btn" style="display: none;">キャンセル</button>
          <button class="btn btn-close" onclick="window.close()">閉じる</button>
        </div>
        
        <div class="container">
          <div class="header">
            <h1>機械故障報告書</h1>
            <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>報告概要</h2>
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
                <strong>日付</strong>
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
            <h2>故障詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>ステータス</strong>
                <span class="readonly">${reportData.status || '-'}</span>
                <input class="editable" value="${reportData.status || ''}" />
              </div>
              <div class="info-item">
                <strong>責任者</strong>
                <span class="readonly">${reportData.engineer || '-'}</span>
                <input class="editable" value="${reportData.engineer || ''}" />
              </div>
            </div>
            
            <div class="content-box">
              <strong>説明</strong>
              <p class="readonly">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '説明なし'}</p>
              <textarea class="editable" rows="4">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || ''}</textarea>
            </div>
            
            <div class="content-box">
              <strong>備考</strong>
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
            <h2>記事欄</h2>
            <div class="info-item">
              <strong>備考・記事</strong>
              <p class="readonly">${reportData.remarks || '-'}</p>
              <textarea class="editable" rows="4" maxlength="200">${reportData.remarks || ''}</textarea>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2025 機械故障報告書. All rights reserved.</p>
          </div>
        </div>
        
        <script>
          let isEditMode = false;
          let originalData = {};
          
          // データを安全に設定する関数
          function setOriginalData(data) {
            try {
              originalData = data;
              console.log('🔧 originalData set:', originalData);
            } catch (e) {
              console.error('originalDataの設定に失敗:', e);
              originalData = {};
            }
          }
          
          // レポートデータを設定（グローバル変数から読み取り）
          try {
            if (window.reportData) {
              setOriginalData(window.reportData);
              console.log('🔧 データをグローバル変数から正常に読み込みました');
            } else {
              console.error('🔧 グローバル変数window.reportDataが見つかりません');
              setOriginalData({});
            }
          } catch (e) {
            console.error('🔧 グローバル変数からのデータ読み込みに失敗:', e);
            setOriginalData({});
          }
          
          // 画像表示の初期化とボタンイベントの設定
          document.addEventListener('DOMContentLoaded', function() {
            console.log('🔧 DOMContentLoaded - Document ready');
            console.log('🔧 Available edit elements:');
            console.log('🔧 - Readonly elements:', document.querySelectorAll('.readonly').length);
            console.log('🔧 - Editable elements:', document.querySelectorAll('.editable').length);
            console.log('🔧 - Edit button:', !!document.querySelector('.btn-edit'));
            console.log('🔧 Initial CSS classes:', document.body.classList.toString());
            console.log('🔧 originalData:', originalData);
            
            // 初期状態では編集モードをオフにする
            isEditMode = false;
            document.body.classList.remove('edit-mode');
            
            // ボタンイベントの設定
            setupButtonEvents();
            
            // 複数回実行して確実に設定
            setTimeout(() => {
              setupButtonEvents();
            }, 100);
            
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          // ボタンイベントを設定する関数
          function setupButtonEvents() {
            console.log('🔧 setupButtonEvents called');
            
            // DOM要素の確実な取得のため少し待機
            setTimeout(() => {
              const editBtn = document.getElementById('edit-btn');
              const saveBtn = document.getElementById('save-btn');
              const cancelBtn = document.getElementById('cancel-btn');
              
              console.log('🔧 ボタンの取得状況:', {
                editBtn: !!editBtn,
                saveBtn: !!saveBtn,
                cancelBtn: !!cancelBtn
              });
              
              if (editBtn) {
                console.log('🔧 Edit button found, setting up event listener');
                
                // 既存のイベントリスナーをクリア
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
                
                // 新しいイベントリスナーを追加
                newEditBtn.addEventListener('click', function(e) {
                  console.log('🔧 Edit button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    console.log('🔧 Calling toggleEditMode()...');
                    toggleEditMode();
                  } catch (error) {
                    console.error('🔧 Error in toggleEditMode:', error);
                    alert('編集モードの切り替えでエラーが発生しました: ' + error.message);
                  }
                });
                
                // ボタンスタイルを設定
                newEditBtn.style.pointerEvents = 'auto';
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
            }, 200); // DOM要素が確実に存在するまで待機
          }          function toggleEditMode() {
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
              
              // 編集モードクラスを追加
              document.body.classList.add('edit-mode');
              console.log('🔧 Added edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に切り替え
              const readonlyElements = document.querySelectorAll('.readonly');
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
                // 入力フィールドの背景色を変更して編集中であることを明確にする
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.style.backgroundColor = '#ffffcc';
                  el.style.border = '2px solid #007bff';
                  el.removeAttribute('readonly');
                  el.removeAttribute('disabled');
                }
                console.log('🔧 Shown editable element', index, 'tag:', el.tagName);
              });
              
              // 編集モード時に入力フィールドの値を設定
              setupEditFields();
              
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
              
              // 編集モードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に切り替え
              const readonlyElements = document.querySelectorAll('.readonly');
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
              
              // 編集内容を元に戻す
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
                console.log('🔧 Save button hidden');
              }
              
              // 編集モードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を強制的に切り替え
              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('🔧 Shown readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden editable element', index);
              });
              
              // 編集内容を元に戻す
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
          
          // グローバルスコープでも利用可能にする
          window.toggleEditMode = toggleEditMode;
          
          // ページが完全に読み込まれた後にもボタンイベントを再設定
          window.addEventListener('load', function() {
            console.log('🔧 Window load event - page fully loaded');
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          function setupEditFields() {
            console.log('🔧 setupEditFields called');
            // 各入力フィールドに適切な値を設定
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('🔧 Found inputs:', inputs.length, 'textareas:', textareas.length);
            
            // 入力フィールドの値を設定
            inputs.forEach((input, index) => {
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
            
            // テキストエリアの値を設定
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                textarea.value = originalData.problemDescription || originalData.description || originalData.incidentTitle || originalData.title || '';
              }
              if (index === 1) {
                textarea.value = originalData.notes || '';
              }
            });
          }
          
          function resetToOriginal() {
            // 入力フィールドを元の値に戻す
            setupEditFields();
          }
          
          async function saveReport() {
            console.log('保存処理開始');
            console.log('originalData:', originalData);
            console.log('originalData.id:', originalData.id);
            console.log('originalData.chatId:', originalData.chatId);
            console.log('originalData.reportId:', originalData.reportId);
            console.log('originalData.fileName:', originalData.fileName);
            
            // 編集されたデータを収集
            const updatedData = { ...originalData };
            
            // 各入力フィールドから値を取得
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('入力フィールド数:', inputs.length);
            console.log('テキストエリア数:', textareas.length);
            
            // 入力フィールドの値を取得
            inputs.forEach((input, index) => {
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
            
            // テキストエリアの値を取得
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                updatedData.problemDescription = textarea.value;
              }
              if (index === 1) {
                updatedData.notes = textarea.value;
              }
            });
            
            console.log('更新されたデータ:', updatedData);
            console.log('使用するchatId:', updatedData.chatId || updatedData.id);
            
            // ローカルストレージに保存
            localStorage.setItem('savedMachineFailureReport_' + updatedData.id, JSON.stringify(updatedData));
            
            // 履歴データを更新（親ウィンドウの履歴一覧表を更新）
            try {
              if (window.opener && !window.opener.closed) {
                // 親ウィンドウの履歴データを更新
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
                  console.warn('親ウィンドウのローカルストレージ更新に失敗:', storageError);
                }
              }
            } catch (error) {
              console.warn('親ウィンドウへの通知に失敗:', error);
            }
            
            // 元のデータを更新
            originalData = updatedData;
            
            // UIを更新
            updateUIAfterSave(updatedData);
            
            // 編集モードを終了
            toggleEditMode();
            
            // 成功メッセージを表示
            alert('レポートが保存されました。履歴アイテムも更新されます。');
            
            // サーバーへの保存も試行
            try {
              await saveToJsonFile(updatedData);
            } catch (error) {
              console.warn('サーバーへの保存は失敗しましたが、ローカルには保存されています:', error);
            }
          }
          
          async function saveToJsonFile(updatedData) {
            try {
              console.log('サーバーへの保存開始:', updatedData);
              
              // 正しいIDを取得
              let targetId = originalData.id || originalData.chatId || originalData.reportId;
              
              // IDが取得できない場合は、ファイル名からUUIDを抽出
              if (!targetId && originalData.fileName) {
                console.log('ファイル名からUUID抽出を試行:', originalData.fileName);
                
                // UUIDパターン1: 標準的なUUID形式
                let fileNameMatch = originalData.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                
                if (fileNameMatch) {
                  targetId = fileNameMatch[1];
                  console.log('標準UUIDから抽出したID:', targetId);
                } else {
                  // UUIDパターン2: アンダースコア区切りのUUID
                  fileNameMatch = originalData.fileName.match(/_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                  if (fileNameMatch) {
                    targetId = fileNameMatch[1];
                    console.log('アンダースコア区切りUUIDから抽出したID:', targetId);
                  }
                }
              }
              
              if (!targetId) {
                console.error('対象IDが特定できません:', originalData);
                throw new Error('対象IDが特定できません');
              }
              
              console.log('保存対象ID:', targetId);
              
              // 更新データの準備
              const updatePayload = {
                updatedData: updatedData,
                updatedBy: 'user'
              };
              
              console.log('送信するペイロード:', updatePayload);
              
              // サーバーAPIを呼び出して履歴アイテムを更新
              const response = await fetch('/api/history/update-item/' + targetId, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload)
              });
              
              console.log('サーバーレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const result = await response.json();
                console.log('履歴ファイルが正常に更新されました:', result);
                
                // 成功メッセージを表示
                alert('レポートが元のファイルに正常に上書き保存されました。');
                
                return result;
              } else {
                const errorData = await response.json();
                console.error('サーバーエラー:', errorData);
                throw new Error(errorData.error || 'サーバーエラー: ' + response.status);
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
              
              console.log('サーバーレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                try {
                  const result = await response.json();
                  console.log('履歴アイテムが正常に更新されました:', result);
                  
                  // 保存成功後の処理
                  updateUIAfterSave(updatedData);
                  
                  // 成功メッセージを表示
                  alert('履歴アイテムが正常に更新されました。');
                } catch (parseError) {
                  console.warn('レスポンスの解析に失敗しましたが、保存は成功しています:', parseError);
                  updateUIAfterSave(updatedData);
                  alert('履歴アイテムが更新されました。');
                }
              } else {
                let errorMessage = 'サーバーエラー';
                try {
                  // レスポンスのContent-Typeを確認
                  const contentType = response.headers.get('content-type');
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
                    // HTMLレスポンスの場合
                    const textResponse = await response.text();
                    console.error('HTMLレスポンス:', textResponse.substring(0, 200));
                    errorMessage = 'HTTP ' + response.status + ': ' + response.statusText + ' (HTMLレスポンス)';
                  }
                } catch (parseError) {
                  console.error('エラーレスポンスの解析に失敗:', parseError);
                  errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                }
                
                console.error('履歴アイテムの更新に失敗しました:', errorMessage);
                alert('履歴アイテムの更新に失敗しました: ' + errorMessage);
              }
            } catch (error) {
              console.error('保存エラー:', error);
              console.error('エラースタック:', error.stack);
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
            
            // 日付
            if (readonlyElements[3]) {
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
            
            // ステータス
            if (readonlyElements[5]) {
              readonlyElements[5].textContent = updatedData.status || '-';
            }
            
            // 責任者
            if (readonlyElements[6]) {
              readonlyElements[6].textContent = updatedData.engineer || '-';
            }
            
            // 説明
            if (readonlyElements[7]) {
              readonlyElements[7].textContent = updatedData.problemDescription || updatedData.description || updatedData.incidentTitle || updatedData.title || '説明なし';
            }
            
            // 備考
            if (readonlyElements[8]) {
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

  // 画像取得の共通関数（DB画像レコード優先版）
  function pickFirstImage(data: any): string | null {
    console.log('🖼️ pickFirstImage - データ分析:', {
      hasImages: !!data?.images,
      imagesLength: data?.images?.length || 0,
      hasSavedImages: !!data?.savedImages,
      savedImagesLength: data?.savedImages?.length || 0,
      hasConversationHistory: !!data?.conversationHistory,
      hasImagePath: !!data?.imagePath,
      hasImageUrl: !!data?.imageUrl,
      dataKeys: Object.keys(data || {})
    });

    // 1) imageUrl を最優先（直接設定された画像URL）
    if (typeof data?.imageUrl === 'string' && data.imageUrl.trim()) {
      console.log('🖼️ pickFirstImage - imageUrl:', data.imageUrl);
      return data.imageUrl.startsWith('http') ? data.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${data.imageUrl}`;
    }

    // 2) imagePath(URL) を優先
    if (typeof data?.imagePath === 'string' && data.imagePath.trim()) {
      console.log('🖼️ pickFirstImage - imagePath:', data.imagePath);
      return data.imagePath.startsWith('http') ? data.imagePath : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${data.imagePath}`;
    }

    // 3) savedImages から URL を取得（DB画像レコード優先）
    if (Array.isArray(data?.savedImages) && data.savedImages.length > 0) {
      const firstImage = data.savedImages[0];
      console.log('🖼️ pickFirstImage - savedImages[0]:', firstImage);

      if (typeof firstImage === 'string') {
        // base64データではない場合のみ返す
        if (!firstImage.startsWith('data:image/')) {
          return firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${firstImage}`;
        }
      }

      if (firstImage && typeof firstImage === 'object') {
        // fileNameがある場合は、それを優先して使用
        if (firstImage.fileName) {
          const imagePath = `/api/images/chat-exports/${firstImage.fileName}`;
          console.log('🖼️ pickFirstImage - savedImagesからfileName取得:', imagePath);
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          return `${baseUrl}${imagePath}`;
        }
        // urlやpathがある場合
        const imageUrl = firstImage.url || firstImage.path;
        if (imageUrl && !imageUrl.startsWith('data:image/')) {
          const finalUrl = imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
          console.log('🖼️ pickFirstImage - savedImagesからurl/path取得:', finalUrl);
          return finalUrl;
        }
      }
    }

    // 4) images配列から直接ファイル名を取得（DB画像レコード）
    if (Array.isArray(data?.images) && data.images.length > 0) {
      const firstImage = data.images[0];
      console.log('🖼️ pickFirstImage - images[0]:', firstImage);
      
      if (firstImage && typeof firstImage === 'object' && firstImage.fileName) {
        const imagePath = `/api/images/chat-exports/${firstImage.fileName}`;
        console.log('🖼️ pickFirstImage - DB画像レコードから取得:', imagePath);
        // ベースURLを取得（末尾の/apiや/を削除）
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        return `${baseUrl}${imagePath}`;
      }
    }

    // 5) conversationHistory から Base64画像を検索
    if (Array.isArray(data?.conversationHistory)) {
      for (const msg of data.conversationHistory) {
        if (msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')) {
          console.log('🖼️ pickFirstImage - conversationHistoryからBase64画像を発見');
          return msg.content;
        }
      }
    }

    // 6) 履歴IDから画像ファイルを推測（最後の手段）
    if (typeof data?.id === 'string' || typeof data?.chatId === 'string') {
      const historyId = data.id || data.chatId;
      console.log('🖼️ pickFirstImage - 履歴IDから画像を推測:', historyId);
      
      // 複数のファイル名パターンを試行
      const possibleFilenames = [
        `${historyId}_3_0.jpeg`,  // 新しい形式
        `${historyId}_2_0.jpeg`,
        `${historyId}_1_0.jpeg`,
        `${historyId}_0_0.jpeg`,
        `${historyId}.jpg`,       // シンプル形式
        `${historyId}.jpeg`,
        `chat_image_${historyId}_*.jpg`  // 古い形式（ワイルドカードは後で処理）
      ];
      
      // 実際のファイル存在確認はサーバー側で行うため、最初のパターンを返す
      const imagePath = `/api/images/chat-exports/${possibleFilenames[0]}`;
      console.log('🖼️ pickFirstImage - 推測された画像パス:', imagePath);
      // ベースURLを取得（末尾の/apiや/を削除）
      let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      return `${baseUrl}${imagePath}`;
    }

    // 7) fileNameから推測
    if (typeof data?.fileName === 'string') {
      const fileName = data.fileName;
      const baseFileName = fileName.replace(/\.json$/, '');
      const imagePath = `/api/images/chat-exports/${baseFileName}_3_0.jpeg`;
      console.log('🖼️ pickFirstImage - fileNameから推測:', imagePath);
      // ベースURLを取得（末尾の/apiや/を削除）
      let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      return `${baseUrl}${imagePath}`;
    }

    console.log('🖼️ pickFirstImage - 画像が見つかりませんでした');
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
  /* 画面プレビュー用：印刷専用ウィンドウでは最小限でOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

  // 一覧印刷用HTML生成
  const generateListPrintHTML = (items: any[]): string => {
    const rows = items
      .map(item => {
        const imageUrl = pickFirstImage(item);
        const imageCell = imageUrl
          ? `<img class="thumb" src="${imageUrl}" alt="画像" />`
          : '-';

        return `
        <tr>
          <td>${item.title || item.incidentTitle || 'タイトルなし'}</td>
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
        <title>故障一覧印刷</title>
        ${PRINT_STYLES}
      </head>
      <body>
        <h1>故障一覧</h1>
        <table>
          <thead>
            <tr>
              <th>タイトル</th>
              <th>機種</th>
              <th>機械番号</th>
              <th>日付</th>
              <th>ステータス</th>
              <th>画像</th>
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

  // 一覧印刷実行
  const printList = (items: any[]) => {
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

  // 印刷機能
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
          <h1>故障履歴一覧</h1>
          <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          <p>対象件数: ${targetItems.length}件${selectedItems.size > 0 ? ' (選択された履歴)' : ''}</p>
        </div>
        
        <div class="summary">
          <strong>印刷対象:</strong> ${selectedItems.size > 0 ? '選択された履歴' : '故障履歴一覧'}<br>
          <strong>印刷日時:</strong> ${new Date().toLocaleString('ja-JP')}<br>
          <strong>対象件数:</strong> ${targetItems.length}件
        </div>
        
        <table>
          <thead>
            <tr>
              <th>機種</th>
              <th>機械番号</th>
              <th>事象</th>
              <th>説明</th>
              <th>作成日時</th>
              <th>画像</th>
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
                  jsonData?.title || jsonData?.question || '事象なし';
                const problemDescription =
                  jsonData?.problemDescription ||
                  jsonData?.answer ||
                  '説明なし';

                // pickFirstImage関数を使用して画像URLを取得
                const imageUrl = pickFirstImage(item);

                return `
                <tr>
                  <td>${machineType}</td>
                  <td>${machineNumber}</td>
                  <td>${incidentTitle}</td>
                  <td>${problemDescription}</td>
                  <td>${formatDate(item.createdAt)}</td>
                  <td class="image-cell">${imageUrl ? `<img class="thumb" src="${imageUrl}" alt="故障画像" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span style="display:none; color: #999; font-size: 10px;">画像読み込みエラー</span>` : 'なし'}</td>
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

    // 印刷ダイアログを自動的に表示
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  const handlePrintReport = (item: SupportHistoryItem) => {
    console.log('🖨️ 印刷レポート開始:', item);
    
    // 編集画面が開いている場合は、編集画面のデータを優先的に使用
    const sourceItem = showEditDialog && editingItem && editingItem.id === item.id ? editingItem : item;
    console.log('🔍 印刷データソース:', {
      fromEditDialog: showEditDialog && editingItem && editingItem.id === item.id,
      editingItemTitle: editingItem?.jsonData?.title,
      itemTitle: item.jsonData?.title,
    });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('❌ 印刷ウィンドウを開けませんでした');
      alert('印刷ウィンドウを開けませんでした。ポップアップブロックを無効にしてください。');
      return;
    }
    console.log('✅ 印刷ウィンドウを開きました');

    // jsonDataの取得を確実にする（文字列の場合はパース）
    let jsonData = sourceItem.jsonData;
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (e) {
        console.error('JSONデータのパースに失敗:', e);
        jsonData = {};
      }
    }

    // 事象タイトルを取得（編集画面のロジックと同じ）
    // 編集画面では: editingItem.jsonData.title を直接使用、なければファイル名から抽出
    let incidentTitle = sourceItem.jsonData?.title || sourceItem.jsonData?.question || '';
    
    // 編集画面と同じロジックでファイル名から抽出
    if (!incidentTitle || incidentTitle.trim() === '') {
      if (sourceItem.fileName) {
        const firstUnderscoreIndex = sourceItem.fileName.indexOf('_');
        if (firstUnderscoreIndex > 0) {
          incidentTitle = sourceItem.fileName.substring(0, firstUnderscoreIndex);
        } else {
          // 「_」がない場合は、拡張子を除いた全体を返す
          incidentTitle = sourceItem.fileName.replace(/\.json$/, '');
        }
      }
    }
    
    // 最終的に取得できない場合は、chatData.messagesから抽出
    if ((!incidentTitle || incidentTitle.trim() === '') && jsonData?.chatData?.messages) {
      const userMessages = jsonData.chatData.messages.filter(
        (msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/')
      );
      if (userMessages.length > 0) {
        incidentTitle = userMessages[0].content || '';
      }
    }
    
    // デバッグ用ログ（詳細版）
    console.log('🔍 印刷用事象タイトル（詳細）:', {
      '最終的なincidentTitle': incidentTitle,
      'incidentTitleの型': typeof incidentTitle,
      'incidentTitleの長さ': incidentTitle?.length,
      '編集画面から取得': showEditDialog && editingItem && editingItem.id === item.id,
      'sourceItem.jsonData.title': sourceItem.jsonData?.title,
      'sourceItem.jsonData.question': sourceItem.jsonData?.question,
      'jsonData.title': jsonData?.title,
      'jsonData.question': jsonData?.question,
      'sourceItem.title': sourceItem.title,
      'sourceItem.fileName': sourceItem.fileName,
      'sourceItem.jsonData全体': JSON.stringify(sourceItem.jsonData || {}, null, 2).substring(0, 500),
    });

    // 事象説明を抽出（編集画面から優先的に取得）
    // 優先順位: 編集画面のjsonData.problemDescription > 編集画面のjsonData.answer > 通常のjsonData > chatData.messages
    let problemDescription = '';
    
    // 1. 編集画面から直接取得（最優先）
    if (sourceItem.jsonData?.problemDescription && sourceItem.jsonData.problemDescription.trim() !== '') {
      problemDescription = sourceItem.jsonData.problemDescription;
    } else if (sourceItem.jsonData?.answer && sourceItem.jsonData.answer.trim() !== '') {
      problemDescription = sourceItem.jsonData.answer;
    } else if (jsonData?.problemDescription && jsonData.problemDescription.trim() !== '') {
      problemDescription = jsonData.problemDescription;
    } else if (jsonData?.answer && jsonData.answer.trim() !== '') {
      problemDescription = jsonData.answer;
    }
    
    // 2. 事象説明がない場合は、chatData.messagesからユーザーメッセージを抽出
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
      problemDescription = '説明なし';
    }

    // 機種と機械番号を抽出（編集画面から優先的に取得）
    const machineType =
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
    
    // 場所を取得（編集画面から優先的に取得）
    const location = 
      sourceItem.jsonData?.location ||
      jsonData?.location ||
      '○○線';
    
    // デバッグ用ログ
    console.log('🔍 印刷用データ:', {
      incidentTitle,
      location,
      problemDescription: problemDescription.substring(0, 50) + '...',
    });

    // 画像URLを取得（優先順位付き）
    let imageUrl = '';
    let imageFileName = '';

    console.log('個別レポート印刷用画像読み込み処理:', {
      itemId: item.id,
      hasJsonData: !!jsonData,
      jsonDataKeys: jsonData ? Object.keys(jsonData) : [],
      savedImages: jsonData?.savedImages,
      conversationHistory: jsonData?.conversationHistory,
      originalChatData: jsonData?.originalChatData,
      chatData: jsonData?.chatData,
      imagePath: item.imagePath,
    });

    // 優先順位1: conversationHistoryからBase64画像を取得（最優先）
    if (
      jsonData?.conversationHistory &&
      jsonData.conversationHistory.length > 0
    ) {
      const imageMessage = jsonData.conversationHistory.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: conversationHistoryからBase64画像を取得（最優先）'
        );
      }
    }

    // 優先順位2: originalChatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: originalChatDataからBase64画像を取得（優先順位2）'
        );
      }
    }

    // 優先順位3: chatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: chatDataからBase64画像を取得（優先順位3）'
        );
      }
    }

    // 優先順位4: 直接のmessagesフィールドからBase64画像を検索
    if (!imageUrl && jsonData?.messages && Array.isArray(jsonData.messages)) {
      const imageMessage = jsonData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: messagesフィールドからBase64画像を取得（優先順位4）'
        );
      }
    }

    // 優先順位5: savedImagesから画像を取得（サーバー上のファイル）
    if (!imageUrl && jsonData?.savedImages && jsonData.savedImages.length > 0) {
      const savedImage = jsonData.savedImages[0];
      
      // fileNameがある場合は、それを優先してURLを生成
      if (savedImage.fileName) {
        const imagePath = `/api/images/chat-exports/${savedImage.fileName}`;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        imageUrl = `${baseUrl}${imagePath}`;
        imageFileName = savedImage.fileName;
        console.log('個別レポート印刷用: savedImagesからfileName取得（優先順位5）:', imageUrl);
      } else if (savedImage.url) {
        // urlがある場合
        if (savedImage.url.startsWith('http')) {
          imageUrl = savedImage.url;
        } else {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${savedImage.url}`;
        }
        imageFileName = savedImage.fileName || `故障画像_${item.id}`;
        console.log('個別レポート印刷用: savedImagesからurl取得（優先順位5）:', imageUrl);
      } else if (savedImage.path) {
        // pathがある場合
        if (savedImage.path.startsWith('http')) {
          imageUrl = savedImage.path;
        } else {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          const imagePath = savedImage.path.startsWith('/') ? savedImage.path : `/api/images/chat-exports/${savedImage.path}`;
          imageUrl = `${baseUrl}${imagePath}`;
        }
        imageFileName = savedImage.fileName || `故障画像_${item.id}`;
        console.log('個別レポート印刷用: savedImagesからpath取得（優先順位5）:', imageUrl);
      }
      
      if (!imageUrl) {
        console.log('個別レポート印刷用: savedImagesから画像を取得（優先順位5） - URL生成失敗');
      }
    }

    // 優先順位3: originalChatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: originalChatDataからBase64画像を取得（優先順位3）'
        );
      }
    }

    // 優先順位4: 従来フォーマットのchatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find(
        (msg: any) => msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log(
          '個別レポート印刷用: chatDataからBase64画像を取得（優先順位4）'
        );
      }
    }

    // 優先順位6: その他の可能性のあるフィールドから画像を検索
    if (!imageUrl) {
      // 画像データが含まれる可能性のあるフィールドを再帰的に検索
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
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: 再帰的検索で画像を取得（優先順位6）');
      }
    }

    // 優先順位7: 従来のimagePathフィールド（最終フォールバック）
    if (!imageUrl && item.imagePath) {
      if (item.imagePath.startsWith('http')) {
        imageUrl = item.imagePath;
      } else if (item.imagePath.startsWith('/')) {
        // /で始まる場合
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        // パスが既に/apiで始まっている場合はそのまま使用、そうでなければ/apiを追加
        const path = item.imagePath.startsWith('/api') ? item.imagePath : `/api${item.imagePath}`;
        imageUrl = `${baseUrl}${path}`;
      } else {
        // 相対パスの場合
        const imagePath = `/api/images/chat-exports/${item.imagePath}`;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        imageUrl = `${baseUrl}${imagePath}`;
      }
      imageFileName = `故障画像_${item.id}`;
      console.log(
        '個別レポート印刷用: imagePathから画像を取得（最終フォールバック）'
      );
    }

    console.log('個別レポート印刷用: 最終的な画像情報:', {
      hasImage: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'なし',
      imageFileName,
      isBase64: imageUrl ? imageUrl.startsWith('data:image/') : false,
    });

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>機械故障報告書 - 印刷</title>
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
                      <h1>機械故障報告書</h1>
          <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="section">
          <h2>報告概要</h2>
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
              <strong>日付</strong>
              ${item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ${location || '-'}
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>故障詳細</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>ステータス</strong>
              ${String(incidentTitle || '').trim() || '-'}
            </div>
            <div class="info-item">
              <strong>責任者</strong>
              -
            </div>
          </div>
          <div class="content-box">
            <strong>説明</strong>
            <p>${problemDescription || '説明なし'}</p>
          </div>
          <div class="content-box">
            <strong>備考</strong>
            <p>${sourceItem.jsonData?.remarks || jsonData?.remarks || '-'}</p>
          </div>
        </div>
        
        ${
          imageUrl
            ? `
        <div class="section">
          <h2>故障箇所画像</h2>
          <div class="image-section">
            <p>機械故障箇所の画像</p>
            <img src="${imageUrl}" alt="故障箇所画像" />
            <p style="font-size: 12px; color: #666;">上記は故障箇所の写真です。</p>
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
          <h2>記事欄</h2>
          <div class="content-box">
            <p>${item.jsonData?.remarks || '記載なし'}</p>
          </div>
        </div>
        
        <div class="section">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © 2025 機械故障報告書. All rights reserved.
          </p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">印刷</button>
          <button onclick="window.close()">閉じる</button>
        </div>
      </body>
      </html>
    `;

    console.log('🖨️ HTMLコンテンツの長さ:', reportContent.length);
    console.log('🖨️ HTMLコンテンツの先頭100文字:', reportContent.substring(0, 100));
    
    // HTMLコンテンツを書き込み
    try {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      console.log('✅ document.write()でHTMLを書き込みました');
    } catch (writeError) {
      console.error('❌ document.write()でエラー:', writeError);
      // 代替方法: innerHTMLを使用
      try {
        printWindow.document.documentElement.innerHTML = reportContent;
        console.log('✅ innerHTMLでHTMLを書き込みました');
      } catch (innerError) {
        console.error('❌ innerHTMLでもエラー:', innerError);
        // 最終手段: 新しいドキュメントを作成
        printWindow.document.open();
        printWindow.document.write(reportContent);
        printWindow.document.close();
        console.log('✅ 新しいドキュメントでHTMLを書き込みました');
      }
    }
    
    // 追加の確認: 書き込まれたHTMLを確認
    setTimeout(() => {
      console.log('🖨️ 書き込まれたHTMLの長さ:', printWindow.document.documentElement.innerHTML.length);
      console.log('🖨️ 書き込まれたHTMLの先頭100文字:', printWindow.document.documentElement.innerHTML.substring(0, 100));
    }, 100);
    
    console.log('✅ 印刷レポートHTMLを書き込みました');
    
    // 印刷ウィンドウが読み込まれた後に印刷ダイアログを表示
    printWindow.onload = () => {
      console.log('✅ 印刷ウィンドウが読み込まれました');
      // 印刷ウィンドウをフォーカスして表示
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        console.log('✅ 印刷ダイアログを表示しました');
      }, 1000);
    };
    
    // フォールバック: 一定時間後に印刷ダイアログを表示
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
        console.log('✅ フォールバック: 印刷ダイアログを表示しました');
      }
    }, 2000);
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <div className='p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>履歴データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // メインコンテンツの表示
  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>履歴管理</h1>
        <p className='text-gray-600'>
          送信されたデータと関連画像の履歴を管理・検索できます
        </p>
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
            {/* テキスト検索 */}
            <div className='lg:col-span-2'>
              <div className='space-y-2'>
                <Input
                  placeholder='タイトル、機種、事業所、応急処置内容、キーワードなどで検索...'
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
                  複数のキーワードをスペース区切りで入力すると、すべてのキーワードを含む履歴を検索します
                </p>
              </div>
            </div>

            {/* 日付検索 */}
            <div>
              {/* UI表示時に自動取得するためボタンは削除 */}
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
                  ※ 指定した日付の履歴を検索します
                </p>
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
                    <SelectValue placeholder='機種を選択' />
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
                        データがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機種を取得しています
                  {searchFilterData.machineTypes &&
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
                    <SelectValue placeholder='機械番号を選択' />
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
                        データがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機械番号を取得しています
                  {searchFilterData.machineNumbers &&
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
              故障履歴一覧 ({filteredItems.length}件)
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
              <p className='text-gray-600'>履歴データがありません</p>
            </div>
          ) : (
            // テーブル形式表示
            <div className='space-y-4'>
              {/* テーブル */}
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
                        選択
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機種
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機械番号
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        事象内容
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        作成日時
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        画像
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 履歴アイテムを表示 */}
                    {filteredItems.map(item => {
                      // 新しいフォーマットのデータ構造に合わせて表示
                      const jsonData = item.jsonData;

                      // タイトルを優先的にJSONデータのtitleフィールドから取得
                      let incidentTitle = jsonData?.title || '';

                      // titleがない場合は、ファイル名から事象内容を抽出
                      if (!incidentTitle && item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // ファイル名の最初の部分が事象内容
                          incidentTitle = fileNameParts[0];
                        }
                      }

                      // まだタイトルが取得できない場合は、その他のフィールドから取得
                      if (!incidentTitle) {
                        incidentTitle = jsonData?.question || '事象なし';
                        if (incidentTitle === '事象なし' && jsonData?.chatData?.messages) {
                          // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
                          const userMessages = jsonData.chatData.messages.filter(
                            (msg: any) => !msg.isAiResponse
                          );
                          if (userMessages.length > 0) {
                            // 最初のユーザーメッセージを事象として使用
                            incidentTitle = userMessages[0].content || '事象なし';
                          }
                        }
                      }
                      
                      // まだタイトルがない場合は、デフォルト値を設定
                      if (!incidentTitle) {
                        incidentTitle = '事象なし';
                      }

                      // 機種と機械番号を抽出（APIから返されるデータ構造に合わせる）
                      const machineType =
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
                              console.log('🖼️ 画像表示処理開始:', {
                                itemId: item.id,
                                itemTitle: item.title,
                                hasImagePath: !!item.imagePath,
                                hasImageUrl: !!item.imageUrl,
                                hasJsonData: !!item.jsonData,
                                jsonDataKeys: Object.keys(item.jsonData || {})
                              });
                              
                              const imageUrl = pickFirstImage(item);
                              console.log('🖼️ pickFirstImage結果:', imageUrl);
                              
                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt='画像'
                                    className='w-8 h-8 object-cover rounded border'
                                    title='故障画像'
                                    onError={e => {
                                      console.error('🖼️ 画像読み込みエラー:', imageUrl);
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('🖼️ 画像読み込み成功:', imageUrl);
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
                                    '🔍 編集ボタンクリック - 元のアイテム:',
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
                                    '🔍 正規化後のアイテム:',
                                    normalizedItem
                                  );
                                  console.log(
                                    '🔍 正規化後 machineType:',
                                    normalizedItem.machineType
                                  );
                                  console.log(
                                    '🔍 正規化後 machineNumber:',
                                    normalizedItem.machineNumber
                                  );
                                  console.log(
                                    '🔍 正規化後 jsonData.title:',
                                    normalizedItem.jsonData?.title
                                  );

                                  // chatData.messagesからユーザーメッセージを抽出（一時的に保存、GPT要約に使用するため）
                                  const chatData = normalizedItem.jsonData?.chatData || normalizedItem.jsonData;
                                  let extractedUserMessages = '';
                                  if (chatData?.messages && Array.isArray(chatData.messages)) {
                                    const userMessages = chatData.messages
                                      .filter((msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/'))
                                      .map((msg: any) => msg.content)
                                      .join('\n');
                                    if (userMessages) {
                                      extractedUserMessages = userMessages;
                                      // problemDescriptionがない場合のみ設定（GPT要約の前に一時的に表示）
                                      if (!normalizedItem.jsonData?.problemDescription || normalizedItem.jsonData.problemDescription === '') {
                                        normalizedItem.jsonData.problemDescription = userMessages;
                                        normalizedItem.jsonData.answer = userMessages;
                                        console.log('🔍 chatData.messagesから事象説明を抽出:', userMessages);
                                      }
                                    }
                                  }
                                  
                                  // 編集画面を開く際に簡易要約を生成（GPT要約が生成されるまでの一時的な表示）
                                  if (!normalizedItem.jsonData?.problemDescription || normalizedItem.jsonData.problemDescription === '') {
                                    const autoSummary = generateSummaryFromJson(normalizedItem.jsonData);
                                    if (autoSummary) {
                                      normalizedItem.jsonData.problemDescription = autoSummary;
                                      normalizedItem.jsonData.answer = autoSummary;
                                      console.log('🔍 自動要約を生成:', autoSummary);
                                    }
                                  }

                                  setEditingItem(normalizedItem);
                                  setShowEditDialog(true);
                                }}
                                className='flex items-center gap-1 text-xs'
                                title='編集画面を開く'
                              >
                                <Settings className='h-3 w-3' />
                                編集
                              </Button>
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

      {/* エクスポート処理エリア */}
      <div className='bg-white rounded-lg shadow p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold'>エクスポート処理</h2>
        </div>

        <div className='flex flex-wrap gap-4 mb-4'>
          {/* 選択履歴エクスポート */}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をJSONエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をCSVエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant='outline'
              className='flex items-center gap-2'
            >
              <FileText className='h-4 w-4' />
              選択の一覧を印刷 ({selectedItems.size})
            </Button>
          </div>

          {/* 全履歴エクスポート */}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をJSONエクスポート
            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をCSVエクスポート
            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className='flex items-center gap-2 text-blue-600'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            エクスポート処理中...
          </div>
        )}
      </div>

      {/* ページネーション */}
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
                      
                      // 編集画面を開く際に要約を自動生成
                      const autoSummary = generateSummaryFromJson(normalizedItem.jsonData);
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
                    編集に移動
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => setShowPreviewDialog(false)}
                  >
                    ×
                  </Button>
                </div>
              </div>

              <div className='space-y-6'>
                {/* レポートヘッダー */}
                <div className='text-center border-b pb-4'>
                  <h1 className='text-2xl font-bold mb-2'>
                    応急処置サポート履歴
                  </h1>
                  <p className='text-sm text-gray-500'>
                    作成日時: {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 基本情報 */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <h3 className='text-lg font-semibold mb-3'>基本情報</h3>
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
                          <strong>作成日時:</strong>{' '}
                          {formatDate(previewItem.createdAt)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Image className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>画像:</strong>{' '}
                          {previewItem.imagePath ? 'あり' : 'なし'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {previewItem.imagePath && (
                    <div>
                      <h3 className='text-lg font-semibold mb-3'>関連画像</h3>
                      <img
                        src={previewItem.imagePath}
                        alt='履歴画像'
                        className='w-full h-48 object-cover rounded-md'
                      />
                    </div>
                  )}
                </div>

                {/* 詳細情報 */}
                <div>
                  <h3 className='text-lg font-semibold mb-3'>詳細情報</h3>
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

      {/* 編集ダイアログ */}
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
              /* 機種・機械番号・ファイル名を1行表示（ラベルと入力フィールドを横並び） */
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
              /* 場所の行を詰めて1行で、狭く */
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
              /* 事象の説明セクション全体のマージンを調整 */
              .print-content-wrapper .bg-blue-50 {
                padding: 4pt !important;
                margin-bottom: 4pt !important;
              }
              /* 事象説明のヘッダー（タイトルと補足説明を横並び） */
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
              /* 事象説明は1.3倍にする */
              .print-content-wrapper .bg-blue-50 textarea {
                min-height: 65pt !important;
                max-height: 78pt !important;
              }
              /* 記事欄は調整可能（A4に収まらない場合は減らす） */
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
              /* 記事欄の補足説明をタイトルの右側に移動 */
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
              /* 記事欄に行の下線（細い破線）を表示、外枠の線は不要 */
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
                /* 破線パターンで各行の下に細線の灰色破線を引く */
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
              /* 全体のコンパクト化 */
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
              /* 記事欄を確実に表示 */
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
              {/* 機種・機械番号データが読み込まれていない場合は再取得 */}
              {(() => {
                if (
                  machineData.machineTypes.length === 0 &&
                  !machineDataLoading
                ) {
                  fetchMachineDataFromAPI();
                }

                // デバッグ: 編集ダイアログが開かれた時の初期値をログ出力
                console.log('編集ダイアログ表示時のeditingItem:', {
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
                <h2 className='text-xl font-bold no-print'>機械故障情報編集</h2>
                <div className='flex gap-2 no-print'>
                  <Button
                    onClick={() => {
                      console.log('編集データを保存します:', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className='flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white'
                  >
                    <Download className='h-4 w-4' />
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('🖨️ 編集画面をそのまま印刷します');
                      // 編集画面をそのまま印刷
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
                      console.log('編集をキャンセルします');
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
              
              <div className='space-y-6 print-content'>
                {/* 印刷時のタイトル（画面では非表示） */}
                <div className='print-header no-print' style={{ display: 'none' }}>
                  <h1>機械故障報告書</h1>
                  <p>印刷日時: {new Date().toLocaleString('ja-JP')}</p>
                </div>

                {/* 基本情報編集 */}
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                    <Settings className='h-5 w-5' />
                    基本情報
                  </h3>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 print-basic-info-grid'>
                    <div className='print-basic-info-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        機種
                      </label>
                      {/* 既存の機種があれば表示、なければ選択肢を提供 */}
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
                          data-value={editingItem.machineType || '機種を選択'}
                          className='print-select-trigger'
                        >
                            <SelectValue 
                              placeholder={
                                editingItem.machineType 
                                  ? editingItem.machineType 
                                  : '機種を選択'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 既存の機種がある場合は最初に表示 */}
                            {editingItem.machineType && (
                              <SelectItem value={editingItem.machineType}>
                                {editingItem.machineType} (現在の値)
                              </SelectItem>
                            )}
                            {/* マスターデータからの選択肢 */}
                            {machineDataLoading ? (
                              <SelectItem value="loading" disabled>
                                マスターデータ読み込み中...
                              </SelectItem>
                            ) : (
                              machineData.machineTypes
                                ?.filter(mt => mt?.machineTypeName && mt.machineTypeName !== editingItem.machineType)
                                ?.map(machineType => (
                                  <SelectItem
                                    key={machineType.id || `machine-type-${Date.now()}-${Math.random()}`}
                                    value={machineType.machineTypeName || ''}
                                  >
                                    {machineType.machineTypeName || '不明'}
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
                      {/* 既存の機械番号があれば表示、なければ選択肢を提供 */}
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
                            data-value={editingItem.machineNumber || '機械番号を選択'}
                            className='print-select-trigger'
                          >
                            <SelectValue 
                              placeholder={
                                editingItem.machineNumber 
                                  ? editingItem.machineNumber 
                                  : '機械番号を選択'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 既存の機械番号がある場合は最初に表示 */}
                            {editingItem.machineNumber && (
                              <SelectItem value={editingItem.machineNumber}>
                                {editingItem.machineNumber} (現在の値)
                              </SelectItem>
                            )}
                            {/* マスターデータからの選択肢 */}
                            {machineDataLoading ? (
                              <SelectItem value="loading" disabled>
                                マスターデータ読み込み中...
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
                                    {machine.machineNumber || '不明'} ({machine.machineTypeName || '不明'})
                                  </SelectItem>
                                )) || []
                            )}
                          </SelectContent>
                        </Select>
                    </div>
                    <div className='print-basic-info-item'>
                      <label className='block text-sm font-medium mb-2 print-inline-label'>
                        ファイル名
                      </label>
                      <Input
                        value={editingItem.fileName || ''}
                        onChange={e => {
                          console.log('ファイル名を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            fileName: e.target.value,
                          });
                        }}
                        placeholder='ファイル名'
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 事象の説明編集 */}
                <div className='bg-blue-50 p-4 rounded-lg'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                    <FileText className='h-5 w-5' />
                    <span>事象の説明</span>
                    <span className='text-xs font-normal text-gray-600 ml-auto'>事象の詳細説明を入力</span>
                  </h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-2'>
                        事象タイトル
                      </label>
                      <Input
                        value={
                          (() => {
                            // ファイル名から日本語部分だけを抽出して表示
                            if (editingItem.fileName) {
                              const firstUnderscoreIndex = editingItem.fileName.indexOf('_');
                              if (firstUnderscoreIndex > 0) {
                                return editingItem.fileName.substring(0, firstUnderscoreIndex);
                              }
                              // 「_」がない場合は、拡張子を除いた全体を返す
                              return editingItem.fileName.replace(/\.json$/, '');
                            }
                            // ファイル名がない場合はJSONのtitleを使用
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
                        placeholder='事象タイトルを入力'
                      />
                      {/* デバッグ: 事象タイトルの値を確認 */}
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
                        事象説明
                      </label>
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
                        placeholder='場所を入力（例: ○○線）'
                      />
                    </div>
                  </div>
                </div>

                {/* 故障個所の画像（修繕計画の上に移動） */}
                {(() => {
                  // 複数の画像を取得
                  const getAllImages = (item: SupportHistoryItem): string[] => {
                    const images: string[] = [];
                    
                    // 1) savedImages から画像を取得
                    if (Array.isArray(item?.savedImages) && item.savedImages.length > 0) {
                      item.savedImages.forEach((img: any) => {
                        if (typeof img === 'string' && !img.startsWith('data:image/')) {
                          images.push(img);
                        } else if (img && typeof img === 'object') {
                          if (img.fileName) {
                            const imagePath = `/api/images/chat-exports/${img.fileName}`;
                            let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                            baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                            images.push(`${baseUrl}${imagePath}`);
                          } else if (img.url) {
                            const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                            images.push(finalUrl);
                          } else if (img.path) {
                            const finalUrl = img.path.startsWith('http') ? img.path : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.path}`;
                            images.push(finalUrl);
                          }
                        }
                      });
                    }
                    
                    // 2) images配列から取得
                    if (Array.isArray(item?.images) && item.images.length > 0) {
                      item.images.forEach((img: any) => {
                        if (typeof img === 'string') {
                          images.push(img);
                        } else if (img && typeof img === 'object') {
                          const url = img.url || img.path || img.fileName;
                          if (url && !url.startsWith('data:image/')) {
                            const finalUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
                            images.push(finalUrl);
                          }
                        }
                      });
                    }
                    
                    // 3) jsonData.savedImagesからも取得
                    if (Array.isArray(item?.jsonData?.savedImages) && item.jsonData.savedImages.length > 0) {
                      item.jsonData.savedImages.forEach((img: any) => {
                        if (typeof img === 'string' && !img.startsWith('data:image/')) {
                          images.push(img);
                        } else if (img && typeof img === 'object') {
                          if (img.fileName) {
                            const imagePath = `/api/images/chat-exports/${img.fileName}`;
                            let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                            baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                            images.push(`${baseUrl}${imagePath}`);
                          } else if (img.url) {
                            const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                            images.push(finalUrl);
                          }
                        }
                      });
                    }
                    
                    // 重複を除去
                    return Array.from(new Set(images));
                  };
                  
                  const imageUrls = getAllImages(editingItem);
                  if (imageUrls.length > 0) {
                    return (
                      <div className='bg-purple-50 p-4 rounded-lg'>
                        <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
                          <Image className='h-5 w-5' />
                          故障個所の画像 ({imageUrls.length}枚)
                        </h3>
                        <div className='grid grid-cols-3 gap-4'>
                          {imageUrls.map((imageUrl, index) => (
                            <div key={index} className='text-center'>
                              <img
                                src={imageUrl}
                                alt={`故障画像${index + 1}`}
                                className='w-full h-auto max-h-48 object-contain border border-gray-300 rounded-md shadow-sm'
                                onError={(e) => {
                                  console.error(`🖼️ 画像読み込みエラー (編集画面):`, imageUrl);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 修繕計画編集 */}
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

                {/* 記事欄（200文字程度） */}
                <div className='bg-gray-50 p-4 rounded-lg print-remarks-section'>
                  <h3 className='text-lg font-semibold mb-3 flex items-center gap-2 print-remarks-header'>
                    <FileText className='h-5 w-5' />
                    <span>記事欄</span>
                    <span className='print-remarks-hint'>修繕に関する備考や追加情報を記載してください（200文字以内）</span>
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
                      {editingItem.jsonData?.remarks?.length || 0}/200文字
                    </p>
                  </div>
                </div>

                {/* 保存ボタン（下部） */}
                <div className='flex justify-end gap-2 pt-4 border-t no-print'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      console.log('編集をキャンセルします');
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('編集データを保存します:', editingItem);
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
            <h3 className='text-lg font-semibold mb-4 text-red-600'>履歴削除の確認</h3>
            <p className='text-gray-700 mb-6'>
              以下の履歴を削除しますか？この操作は取り消せません。
            </p>
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

      {/* チャットエクスポートレポート表示 */}
      {showReport && selectedReportData && (
        <ChatExportReport
          data={selectedReportData}
          fileName={selectedFileName}
          onClose={handleCloseReport}
          onSave={handleSaveReport}
          onPrint={reportData => {
            console.log('チャットエクスポートレポートを印刷:', reportData);
            window.print();
          }}
        />
      )}
    </div>
  );
};

export default HistoryPage;
