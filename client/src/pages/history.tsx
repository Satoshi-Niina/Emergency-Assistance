import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, FileDown, FileText as FileTextIcon, Table, Grid3X3, List, ClipboardList, FileSpreadsheet, Grid, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { SupportHistoryItem, HistorySearchFilters } from '../types/history';
import { 
  fetchHistoryList, 
  fetchMachineData,
  deleteHistory, 
  exportHistoryItem, 
  exportSelectedHistory, 
  exportAllHistory,
  advancedSearch,
  generateReport
} from '../lib/api/history-api';
import ChatExportReport from '../components/report/chat-export-report';



// 画像ユーチE��リチE��関数
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

async function fetchDetailFile(name: string) {
  // IDベ�Eスのエンド�Eイントを試衁E
  const endpoints = [
    `${API_BASE}/api/history/${name}`,
    `${API_BASE}/api/history/detail/${name}`,
    `${API_BASE}/api/history/file/${name}`
  ];
  
  for (const url of endpoints) {
    try {
      console.log('[fetchDetailFile] リクエスト開姁E', url);
      const r = await fetch(url, { credentials: 'include' });
      console.log('[fetchDetailFile] レスポンス受信:', { status: r.status, ok: r.ok, url });
      
      if (r.ok) {
        const json = await r.json();
        console.log('[fetchDetailFile] JSON解析完亁E', { hasData: !!json, keys: Object.keys(json || {}) });
        return json;
      }
    } catch (error) {
      console.warn('[fetchDetailFile] エンド�Eイント失敁E', url, error);
    }
  }
  
  // すべてのエンド�Eイントが失敗した場吁E
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
  machines: Array<{ id: string; machineNumber: string; machineTypeName: string }>;
}

const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SupportHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    machineType: '',
    machineNumber: '',
    searchText: '',
    searchDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SupportHistoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // エクスポ�Eト機�Eの状慁E

  const [exportLoading, setExportLoading] = useState(false);
  
  // レポ�Eト機�Eの状慁E
  const [reportLoading, setReportLoading] = useState(false);
  
  // 編雁E�Eプレビュー機�Eの状慁E
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // 印刷機�Eの状慁E
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'report'>('table');
  
  // レポ�Eト表示の状慁E
  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  

  


  // 機種・機械番号マスターチE�Eタ�E�編雁EI用 - PostgreSQLから�E�E
  const [machineData, setMachineData] = useState<MachineData>({ 
    machineTypes: [], 
    machines: [] 
  });

  // 履歴検索フィルター用チE�Eタ�E�保存されたJSONファイルから�E�E
  const [searchFilterData, setSearchFilterData] = useState<{
    machineTypes: string[];
    machineNumbers: string[];
  }>({
    machineTypes: [],
    machineNumbers: []
  });

  const [searchFilterLoading, setSearchFilterLoading] = useState(false);

  // JSONチE�Eタを正規化する関数
  const normalizeJsonData = (item: SupportHistoryItem): SupportHistoryItem => {
    console.log('正規化前�EアイチE��:', item);
    
    if (!item.jsonData) {
      console.log('jsonDataが存在しません');
      return item;
    }

    // 既にitem直接にmachineTypeとmachineNumberが存在する場吁E
    if (item.machineType && item.machineNumber) {
      console.log('既に正規化済み:', { machineType: item.machineType, machineNumber: item.machineNumber });
      return item;
    }

    // サーバ�Eから送信されたデータを基に正規化
    const normalizedItem = {
      ...item,
      machineType: item.machineType || item.jsonData.machineType || '',
      machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
      jsonData: {
        ...item.jsonData,
        // 忁E��なフィールドを確実に含める
        title: item.jsonData.title || item.title || '',
        problemDescription: item.jsonData.problemDescription || '',
        machineType: item.machineType || item.jsonData.machineType || '',
        machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
        extractedComponents: item.jsonData.extractedComponents || item.extractedComponents || [],
        extractedSymptoms: item.jsonData.extractedSymptoms || item.extractedSymptoms || [],
        possibleModels: item.jsonData.possibleModels || item.possibleModels || [],
        conversationHistory: item.jsonData.conversationHistory || [],
        savedImages: item.jsonData.savedImages || []
      }
    };

    // chatDataが存在する場合�E追加処琁E
    if (item.jsonData.chatData) {
      console.log('chatData形式を検�E');
      const chatData = item.jsonData.chatData;
      
      // machineInfoからmachineTypeとmachineNumberを取征E
      const machineTypeName = chatData.machineInfo?.machineTypeName || '';
      const machineNumber = chatData.machineInfo?.machineNumber || '';
      
      console.log('chatDataから抽出:', { machineTypeName, machineNumber });

      // chatDataの値で上書ぁE
      normalizedItem.machineType = machineTypeName || normalizedItem.machineType;
      normalizedItem.machineNumber = machineNumber || normalizedItem.machineNumber;
      normalizedItem.jsonData.machineType = machineTypeName || normalizedItem.jsonData.machineType;
      normalizedItem.jsonData.machineNumber = machineNumber || normalizedItem.jsonData.machineNumber;
    }

    console.log('正規化後�EアイチE��:', normalizedItem);
    return normalizedItem;
  };

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
        if (selectedItem && (selectedItem.id === updatedData.id || selectedItem.chatId === updatedData.chatId)) {
          setSelectedItem(prev => prev ? { ...prev, ...updatedData } : null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedItem]);
  const [machineDataLoading, setMachineDataLoading] = useState(false);

  // machineDataの状態変化を監要E
  useEffect(() => {
    console.log('🔍 machineData状態変化:', machineData);
  }, [machineData]);

  // チE�Eタ取得（サーバ�EAPIから取得！E
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('🔍 チE�Eタ初期化開姁E);
        setLoading(true);
        await Promise.all([
          fetchHistoryData().catch(error => {
            console.error('履歴チE�Eタ取得エラー:', error);
          }),
          fetchMachineDataFromAPI().catch(error => {
            console.error('機種チE�Eタ取得エラー:', error);
          })
        ]);
        console.log('🔍 チE�Eタ初期化完亁E);
      } catch (error) {
        console.error('チE�Eタ初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔍 useEffect実衁E);
    initializeData();
  }, []);

  // 機種・機械番号マスターチE�Eタ取征E
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);
      
      // 機種・機械番号チE�Eタを専用APIから取征E
      console.log('🔍 機種・機械番号チE�Eタ取得開姁E);
      const response = await fetch('/api/history/machine-data');
      console.log('🔍 APIレスポンス:', response.status, response.statusText);
      const data = await response.json();
      console.log('🔍 APIレスポンスチE�Eタ:', data);
      
      if (data.success && data.machineTypes && data.machines) {
        // 機種一覧を構築（重褁E��去�E�E
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];
        
        // 機械番号一覧を構築（重褁E��去�E�E
        const machineSet = new Set<string>();
        const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];
        
        console.log('🔍 機種・機械番号チE�Eタは専用APIから取得されまぁE);
        
        const result = {
          machineTypes: data.machineTypes || [],
          machines: data.machines || []
        };
        
        console.log('🔍 機種・機械番号チE�Eタ取得結果:', result);
        console.log('🔍 機種数:', result.machineTypes.length);
        console.log('🔍 機械番号数:', result.machines.length);
        console.log('🔍 機種一覧:', result.machineTypes.map(t => t.machineTypeName));
        console.log('🔍 機械番号一覧:', result.machines.map(m => `${m.machineNumber} (${m.machineTypeName})`));
        console.log('🔍 setMachineData呼び出し前:', result);
        setMachineData(result);
        console.log('🔍 setMachineData呼び出し完亁E);
      } else {
        console.log('⚠�E�E機種・機械番号チE�Eタが正しく取得できませんでした:', data);
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

  // 履歴検索フィルター用チE�Eタ�E�保存されたJSONファイルから取得！E
  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('🔍 履歴検索フィルターチE�Eタ取得開姁E);
      
      const response = await fetch('/api/history/search-filters');
      const result = await response.json();
      
      if (result.success) {
        setSearchFilterData({
          machineTypes: result.machineTypes || [],
          machineNumbers: result.machineNumbers || []
        });
        console.log('🔍 履歴検索フィルターチE�Eタ取得完亁E', {
          machineTypes: result.machineTypes?.length || 0,
          machineNumbers: result.machineNumbers?.length || 0
        });
      } else {
        console.error('履歴検索フィルターチE�Eタ取得失敁E', result.error);
      }
    } catch (error) {
      console.error('履歴検索フィルターチE�Eタ取得エラー:', error);
    } finally {
      setSearchFilterLoading(false);
    }
  };

  const fetchHistoryData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // サーバ�E側でフィルタリングを行う
      const params = new URLSearchParams();
      if (filters.machineType) params.append('machineType', filters.machineType);
      if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
      if (filters.searchText) params.append('searchText', filters.searchText);
      if (filters.searchDate) params.append('searchDate', filters.searchDate);
      params.append('limit', '20');
      params.append('offset', ((page - 1) * 20).toString());
      
      const response = await fetch(`/api/history?${params.toString()}`);
      const data = await response.json();
      
      console.log('🔍 取得したデータ:', data);
      
      if (data.success && data.items) {
        console.log('🔍 取得件数:', data.items.length);
        
        // 機種・機械番号チE�Eタの確誁E
        data.items.forEach((item: any, index: number) => {
          console.log(`🔍 アイチE�� ${index + 1}:`, {
            fileName: item.fileName,
            machineType: item.machineType,
            machineNumber: item.machineNumber,
            machineInfo: item.machineInfo
          });
        });
        
        // ローカルストレージから保存されたチE�Eタを読み込んで履歴チE�Eタを更新
        const updatedItems = data.items.map((item: any) => {
          const savedKey = 'savedMachineFailureReport_' + (item.id || item.chatId);
          const savedData = localStorage.getItem(savedKey);
          let processedItem = item;
          
          if (savedData) {
            try {
              const parsedData = JSON.parse(savedData);
              console.log('ローカルストレージから保存されたチE�Eタを読み込み:', parsedData);
              processedItem = { ...item, ...parsedData };
            } catch (parseError) {
              console.warn('保存されたチE�Eタの解析に失敁E', parseError);
            }
          }
          
          // SupportHistoryItem型に変換
          const convertedItem: SupportHistoryItem = {
            id: processedItem.id,
            chatId: processedItem.chatId,
            fileName: processedItem.fileName,
            machineType: processedItem.machineType || '',
            machineNumber: processedItem.machineNumber || '',
            title: processedItem.title,
            createdAt: processedItem.createdAt || processedItem.exportTimestamp || new Date().toISOString(),
            lastModified: processedItem.lastModified,
            extractedComponents: processedItem.extractedComponents,
            extractedSymptoms: processedItem.extractedSymptoms,
            possibleModels: processedItem.possibleModels,
            machineInfo: processedItem.machineInfo,
            jsonData: {
              ...processedItem, // 全ての允E��ータを含める
              machineType: processedItem.machineType || '',
              machineNumber: processedItem.machineNumber || '',
              title: processedItem.title,
              problemDescription: processedItem.problemDescription,
              extractedComponents: processedItem.extractedComponents,
              extractedSymptoms: processedItem.extractedSymptoms,
              possibleModels: processedItem.possibleModels,
              conversationHistory: processedItem.conversationHistory,
              chatData: processedItem.chatData,
              savedImages: processedItem.savedImages,
              metadata: processedItem.metadata
            }
          };
          
          console.log('変換されたアイチE��:', {
            fileName: convertedItem.fileName,
            machineType: convertedItem.machineType,
            machineNumber: convertedItem.machineNumber,
            jsonData: convertedItem.jsonData
          });
          
          return convertedItem;
        });
        
        setHistoryItems(updatedItems);
        setFilteredItems(updatedItems);
        setTotalPages(Math.ceil(data.total / 20));
        setCurrentPage(page);
      } else {
        console.log('🔍 チE�Eタ取得�E功せぁE', data);
        setHistoryItems([]);
        setFilteredItems([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('履歴チE�Eタの取得に失敗しました:', error);
      setHistoryItems([]);
      setFilteredItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 検索とフィルタリング
  useEffect(() => {
    // 初期ロード時のみ実衁E
    if (currentPage === 1 && historyItems.length === 0) {
      fetchHistoryData(1);
      fetchSearchFilterData(); // 履歴検索用フィルターチE�Eタを取征E
    }
  }, []); // filtersの依存を削除

  // フィルター変更時�E処琁E
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    // filters を更新
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));

    // 編雁E��イアログが開ぁE��ぁE��場合�E、編雁E��のアイチE��にも反映する
    // 期征E��れる動佁E フィルタで機種/機械番号を選択すると、すでに編雁E��のフォームに即座に反映されめE
    try {
      if (editingItem) {
        if (key === 'machineType' || key === 'machineNumber') {
          setEditingItem(prev => prev ? { ...prev, [key]: value } as SupportHistoryItem : prev);
          console.log(`filters -> editingItem sync: ${key} = ${value}`);
        }
      }
    } catch (syncError) {
      console.warn('フィルターから編雁E��イチE��への同期に失敗しました:', syncError);
    }
  };

  const handleSearch = () => {
    fetchHistoryData(1);
  };

  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm('こ�E履歴を削除しますか�E�E)) {
      try {
        await deleteHistory(id);
        fetchHistoryData(currentPage);
      } catch (error) {
        console.error('履歴削除エラー:', error);
      }
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
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.id));
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


  const handleExportItem = async (item: SupportHistoryItem, format: 'json' | 'csv' = 'json') => {
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
    setFilters({
      machineType: '',
      machineNumber: '',
      searchText: '',
      searchDate: ''
    });
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
        targetItemsCount: targetItems.length
      });
      
      // 対象アイチE��がなぁE��合�E処琁E��停止
      if (targetItems.length === 0) {
        alert('対象アイチE��がありません、E);
        setReportLoading(false);
        return;
      }
      
      // 吁E��イチE��のチE�Eタ構造を確誁E
      targetItems.forEach((item, index) => {
        console.log(`アイチE��${index + 1}のチE�Eタ構造:`, {
          id: item.id,
          fileName: item.fileName,
          hasJsonData: !!item.jsonData,
          jsonDataKeys: item.jsonData ? Object.keys(item.jsonData) : [],
          machineInfo: item.machineInfo,
          machineType: item.machineType,
          machineNumber: item.machineNumber
        });
      });
      
      // 選択されたアイチE��からJSONチE�Eタを�E析してレポ�Eトデータを生戁E
      const allTitles: string[] = [];
      const allComponents: string[] = [];
      const allSymptoms: string[] = [];
      const allModels: string[] = [];
      
      targetItems.forEach(item => {
        const jsonData = item?.jsonData ?? item?.data ?? {};
        
        // 事象タイトルを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E
        let title = null;
        
        // まずファイル名から事象冁E��を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }
        
        // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E
        if (!title) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
            const userMessages = jsonData?.chatData?.messages?.filter((msg: any) => !msg.isAiResponse);
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }
        
        if (title) allTitles.push(title);
        
        if (jsonData?.extractedComponents) allComponents.push(...jsonData.extractedComponents);
        if (jsonData?.extractedSymptoms) allSymptoms.push(...jsonData.extractedSymptoms);
        if (jsonData?.possibleModels) allModels.push(...jsonData.possibleModels);
      });
      
      console.log('抽出されたデータ:', {
        titles: allTitles,
        components: allComponents,
        symptoms: allSymptoms,
        models: allModels
      });
      
      // 吁E��イチE��ごとに個別のレポ�Eトを生�E
      const reportDataArray = targetItems.map((item, index) => {
        console.log(`レポ�EチE{index + 1}の生�E開姁E`, item.fileName);
        
        const jsonData = item?.jsonData ?? item?.data ?? {};
        
        // 事象タイトルを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E
        let title = '事象なぁE;
        
        // まずファイル名から事象冁E��を抽出
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }
        
        // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E
        if (title === '事象なぁE) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
            const userMessages = jsonData?.chatData?.messages?.filter((msg: any) => !msg.isAiResponse);
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }
        
        // 機種と機械番号を抽出
        const machineType = item.machineInfo?.machineTypeName || 
                          jsonData?.machineType || 
                          jsonData?.chatData?.machineInfo?.machineTypeName || 
                          item.machineType || '';
        const machineNumber = item.machineInfo?.machineNumber || 
                            jsonData?.machineNumber || 
                            jsonData?.chatData?.machineInfo?.machineNumber || 
                            item.machineNumber || '';
        
        console.log(`レポ�EチE{index + 1}の基本惁E��:`, {
          title,
          machineType,
          machineNumber
        });
        
        // 画像データを収雁E��優先頁E��付き�E�E
        const images = [];
        
        try {
          // 優先頁E��E: conversationHistoryからBase64画像を取得（最優先！E
          if (jsonData?.conversationHistory?.length > 0) {
            console.log('handleGenerateReport: conversationHistoryからBase64画像を検索中...', jsonData.conversationHistory.length);
            const imageMessages = jsonData.conversationHistory.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: conversationHistoryでBase64画像を発要E', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              images.push({
                id: `conv-${index}`,
                url: msg.content,
                fileName: `敁E��画像_${index + 1}`,
                description: '機械敁E��箁E��の写真',
                source: 'conversationHistory'
              });
            });
          }
          
          // 優先頁E��E: originalChatData.messagesからBase64画像を取征E
          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log('handleGenerateReport: originalChatData.messagesからBase64画像を検索中...', jsonData.originalChatData.messages.length);
            const imageMessages = jsonData.originalChatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: originalChatData.messagesでBase64画像を発要E', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像�E除夁E
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `敁E��画像_${images.length + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'originalChatData'
                });
              }
            });
          }
          
          // 優先頁E��E: chatData.messagesからBase64画像を取征E
          if (jsonData?.chatData?.messages?.length > 0) {
            console.log('handleGenerateReport: chatData.messagesからBase64画像を検索中...', jsonData.chatData.messages.length);
            const imageMessages = jsonData.chatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: chatData.messagesでBase64画像を発要E', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像�E除夁E
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `敁E��画像_${images.length + 1}`,
                  description: '機械敁E��箁E��の写真',
                  source: 'chatData'
                });
              }
            });
          }
          
          // 優先頁E��E: savedImagesフィールドから画像を取征E
          if (jsonData?.savedImages?.length > 0) {
            console.log('handleGenerateReport: savedImagesから画像を取得中...', jsonData.savedImages.length);
            jsonData.savedImages.forEach((img: any, index: number) => {
              // 既に追加済みの画像�E除夁E
              if (!images.some(existingImg => existingImg.url === img.url || existingImg.url === img.path)) {
                images.push({
                  id: `saved-${index}`,
                  url: img.url || img.path,
                  fileName: img.fileName || `敁E��画像_${images.length + 1}`,
                  description: img.description || '機械敁E��箁E��の写真',
                  source: 'savedImages'
                });
              }
            });
          }
          
          // 優先頁E��E: 再帰皁E��JSONチE�Eタ冁E�E画像を検索
          const findImagesRecursively = (obj: any, path: string = ''): string[] => {
            const foundImages: string[] = [];
            
            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                  foundImages.push(value);
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    foundImages.push(...findImagesRecursively(item, `${currentPath}[${index}]`));
                  });
                } else if (typeof value === 'object' && value !== null) {
                  foundImages.push(...findImagesRecursively(value, currentPath));
                }
              });
            }
            
            return foundImages;
          };
          
          const recursiveImages = findImagesRecursively(jsonData);
          console.log('handleGenerateReport: 再帰検索で画像を発要E', recursiveImages.length);
          recursiveImages.forEach((imgUrl, index) => {
            // 既に追加済みの画像�E除夁E
            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `敁E��画像_${images.length + 1}`,
                description: '機械敁E��箁E��の写真',
                source: 'recursive'
              });
            }
          });
          
          // 優先頁E��E: imagePathフィールド（最終フォールバック�E�E
          if (jsonData?.imagePath && typeof jsonData.imagePath === 'string' && !images.some(img => img.url === jsonData.imagePath)) {
            console.log('handleGenerateReport: imagePathから画像を取得中...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '敁E��画僁E,
              description: '機械敁E��箁E��の写真',
              source: 'imagePath'
            });
          }
        } catch (imageError) {
          console.error('画像データ処琁E��にエラーが発生しました:', imageError);
          // 画像�E琁E��ラーが発生してもレポ�Eト生成�E続衁E
        }
        
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
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          repairLocation: '工場冁E��琁E��ペ�Eス',
          images: images.length > 0 ? images : undefined,
          chatHistory: jsonData?.conversationHistory || jsonData?.chatData?.messages || undefined
        };
        
        console.log(`レポ�EチE{index + 1}の生�E完亁E`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0
        });
        
        return reportData;
      });
      
      console.log('=== レポ�Eトデータ生�E完亁E===');
      console.log('レポ�Eト�E列�E長ぁE', reportDataArray.length);
      console.log('吁E��ポ�Eト�E詳細:', reportDataArray.map((report, index) => ({
        index,
        reportId: report.reportId,
        description: report.description,
        images: report.images?.map(img => ({
          url: img.url.substring(0, 50) + (img.url.length > 50 ? '...' : ''),
          fileName: img.fileName,
          isBase64: img.url.startsWith('data:image/')
        }))
      })));
      
      setMachineFailureReportData(reportDataArray);
      setShowMachineFailureReport(true);
      console.log('レポ�Eト表示状態を設定完亁E);
      
      // 成功通知
      alert(`レポ�Eトが正常に生�Eされました、En対象アイチE��: ${targetItems.length}件 (選択済み)\n${targetItems.length > 1 ? '褁E��ペ�Eジで表示されます、E : ''}`);
      
      console.log('=== レポ�Eト生成完亁E===');
    } catch (error) {
      console.error('=== レポ�Eト生成エラー ===');
      console.error('エラー詳細:', error);
      console.error('エラースタチE��:', error instanceof Error ? error.stack : 'スタチE��トレースなぁE);
      alert('レポ�Eト生成中にエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // エラーが発生しても確実にローチE��ング状態をリセチE��
      setReportLoading(false);
      console.log('レポ�Eト生成状態をリセチE��完亁E);
    }
  };



  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(`/api/history/file?name=${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        throw new Error('チャチE��エクスポ�Eトファイルの取得に失敗しました');
      }
      
      const data = await response.json();
      
      // 新しいフォーマット�EチE�Eタを確認して、E��刁E��形式に変換
      const reportData = {
        ...data,
        // 新しいフォーマット�Eフィールドを追加
        title: data.title || data.chatData?.machineInfo?.machineTypeName || 'タイトルなぁE,
        problemDescription: data.problemDescription || '説明なぁE,
        machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
        machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
        extractedComponents: data.extractedComponents || [],
        extractedSymptoms: data.extractedSymptoms || [],
        possibleModels: data.possibleModels || [],
        conversationHistory: data.conversationHistory || data.chatData?.messages || [],
        metadata: data.metadata || {
          total_messages: data.chatData?.messages?.length || 0,
          user_messages: 0,
          ai_messages: 0,
          total_media: data.savedImages?.length || 0,
          export_format_version: "1.0"
        }
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
    
    // レポ�Eトデータをローカルストレージに保孁E
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    const newReport = {
      id: Date.now(),
      fileName: selectedFileName,
      reportData: reportData,
      savedAt: new Date().toISOString()
    };
    savedReports.push(newReport);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
    
    console.log('レポ�Eトが保存されました:', newReport);
  };

  // 履歴アイチE��の編雁E��ータをサーバ�Eに保孁E
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編雁E��れた履歴アイチE��を保孁E', editedItem);
      console.log('編雁E��れた履歴アイチE��のID:', editedItem.id);
      console.log('編雁E��れた履歴アイチE��のJSONチE�Eタ:', editedItem.jsonData);
      
      // IDの確認と準備�E�Export_プレフィチE��スを除去�E�E
      let itemId = editedItem.id || editedItem.chatId;
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
        // ファイル名からchatIdを抽出�E�Eで区刁E��れた2番目の部刁E��E
        const parts = itemId.split('_');
        if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
          itemId = parts[1];
        }
      }
      
      console.log('使用するID:', itemId, '允E�EID:', editedItem.id || editedItem.chatId);
      
      // 更新チE�Eタの準備�E�EditedItemの惁E��も含める�E�E
      const updatePayload = {
        updatedData: {
          ...editedItem.jsonData,
          // 基本惁E��めESONチE�Eタに含める
          machineType: editedItem.machineType,
          machineNumber: editedItem.machineNumber,
          title: editedItem.jsonData?.title || editedItem.title,
          lastModified: new Date().toISOString()
        },
        updatedBy: 'user'
      };
      
      console.log('送信するペイローチE', updatePayload);
      
      // サーバ�Eに更新リクエストを送信
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
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
      
      // 履歴リスト�E該当アイチE��を更新
      setHistoryItems(prevItems => 
        prevItems.map(item => 
          (item.id === itemId || item.chatId === itemId) 
            ? { 
                ...item, 
                jsonData: editedItem.jsonData, 
                lastModified: new Date().toISOString(),
                // 基本惁E��も更新
                machineType: editedItem.jsonData?.machineType || item.machineType,
                machineNumber: editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle
              }
            : item
        )
      );
      
      setFilteredItems(prevItems => 
        prevItems.map(item => 
          (item.id === itemId || item.chatId === itemId) 
            ? { 
                ...item, 
                jsonData: editedItem.jsonData, 
                lastModified: new Date().toISOString(),
                // 基本惁E��も更新
                machineType: editedItem.jsonData?.machineType || item.machineType,
                machineNumber: editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle
              }
            : item
        )
      );
      
      // 成功通知
      alert('履歴が正常に更新され、�Eのファイルに上書き保存されました、E);
      
      // 編雁E��イアログを閉じる
      setShowEditDialog(false);
      setEditingItem(null);
      
      // 履歴リスト�E再読み込みは行わなぁE��既に更新済み�E�E
      console.log('履歴更新完亁E- リスト�E読み込みをスキチE�E');
      
    } catch (error) {
      console.error('履歴保存エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('履歴の保存に失敗しました: ' + errorMessage);
    }
  };

  const extractJsonInfo = (jsonData: any) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return {
        title: data.title || data.name || '',
        description: data.description || data.content || '',
        emergencyMeasures: data.emergencyMeasures || data.measures || ''
      };
    } catch (error) {
      return {
        title: '',
        description: '',
        emergencyMeasures: ''
      };
    }
  };

  // 機械敁E��報告書のHTML生�E関数
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // JSONチE�Eタを安�Eにエスケープする関数�E�強化版�E�E
    const safeJsonStringify = (obj: any): string => {
      try {
        let jsonStr = JSON.stringify(obj);
        // HTMLとJavaScriptで問題になる文字を徹底的にエスケーチE
        jsonStr = jsonStr
          .replace(/\\/g, '\\\\')     // バックスラチE��ュを最初にエスケーチE
          .replace(/"/g, '\\"')       // ダブルクォーチE
          .replace(/'/g, "\\'")       // シングルクォーチE
          .replace(/</g, '\\u003c')   // <
          .replace(/>/g, '\\u003e')   // >
          .replace(/&/g, '\\u0026')   // &
          .replace(/\//g, '\\/')      // スラチE��ュ
          .replace(/:/g, '\\u003a')   // コロン�E�重要E��E
          .replace(/\r/g, '\\r')      // キャリチE��リターン
          .replace(/\n/g, '\\n')      // 改衁E
          .replace(/\t/g, '\\t')      // タチE
          .replace(/\f/g, '\\f')      // フォームフィーチE
          .replace(/\b/g, '\\b')      // バックスペ�Eス
          .replace(/\u2028/g, '\\u2028') // ラインセパレータ
          .replace(/\u2029/g, '\\u2029'); // パラグラフセパレータ
        
        console.log('🔧 safeJsonStringify result length:', jsonStr.length);
        console.log('🔧 safeJsonStringify sample:', jsonStr.substring(0, 100) + '...');
        return jsonStr;
      } catch (e) {
        console.error('JSONのシリアライズに失敁E', e);
        return '{}';
      }
    };
    // 画像を収集�E�Ease64のみ、詳細なチE��チE��付き�E�E
    const collectImages = (data: any): Array<{ id: string; url: string; fileName: string; description?: string }> => {
      console.log('🖼�E�E画像収雁E��姁E- reportData:', data);
      console.log('🖼�E�EreportData keys:', Object.keys(data || {}));
      
      const images: Array<{ id: string; url: string; fileName: string; description?: string }> = [];
      const imageUrls = new Set<string>();
      
      // チE��チE��: チE�Eタ構造を詳細確誁E
      console.log('🖼�E�EチE�Eタ構造確誁E');
      console.log('🖼�E�E- chatData:', data?.chatData ? 'あり' : 'なぁE);
      console.log('🖼�E�E- chatData.messages:', data?.chatData?.messages ? 'あり(' + data.chatData.messages.length + '件)' : 'なぁE);
      console.log('🖼�E�E- conversationHistory:', data?.conversationHistory ? 'あり(' + (Array.isArray(data.conversationHistory) ? data.conversationHistory.length : 'non-array') + ')' : 'なぁE);
      console.log('🖼�E�E- originalChatData.messages:', data?.originalChatData?.messages ? 'あり(' + data.originalChatData.messages.length + ')' : 'なぁE);
      console.log('🖼�E�E- messages:', data?.messages ? 'あり(' + (Array.isArray(data.messages) ? data.messages.length : 'non-array') + ')' : 'なぁE);
      
      // 1) chatData.messages から base64 画像を探す（メイン�E�E
      if (data?.chatData?.messages && Array.isArray(data.chatData.messages)) {
        console.log('🖼�E�EchatData.messagesをスキャン中...');
        data.chatData.messages.forEach((message: any, messageIndex: number) => {
          console.log('🖼�E�Emessage[' + messageIndex + ']:', { 
            id: message?.id, 
            content: message?.content ? message.content.substring(0, 50) + '...' : 'なぁE,
            isBase64: message?.content?.startsWith('data:image/') 
          });
          
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `chatdata-${messageIndex}`,
                url: normalizedContent,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！EhatData.messages�E�E
              });
              console.log('🖼�E�EBase64画像見つかりました�E�EhatData.messages�E�E', images.length);
            }
          }
        });
      }
      
      // 2) conversationHistory から base64 画像を探ぁE
      if (data?.conversationHistory && Array.isArray(data.conversationHistory)) {
        console.log('🖼�E�EconversationHistoryをスキャン中...');
        data.conversationHistory.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `conversation-${messageIndex}`,
                url: normalizedContent,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！EonversationHistory�E�E
              });
              console.log('🖼�E�EBase64画像見つかりました�E�EonversationHistory�E�E', images.length);
            }
          }
        });
      }
      
      // 3) originalChatData.messages から base64 画像を探ぁE
      if (data?.originalChatData?.messages && Array.isArray(data.originalChatData.messages)) {
        console.log('🖼�E�EoriginalChatData.messagesをスキャン中...');
        data.originalChatData.messages.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `original-${messageIndex}`,
                url: normalizedContent,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！EriginalChatData�E�E
              });
              console.log('🖼�E�EBase64画像見つかりました�E�EriginalChatData�E�E', images.length);
            }
          }
        });
      }
      
      // 4) messages から base64 画像を探ぁE
      if (data?.messages && Array.isArray(data.messages)) {
        console.log('🖼�E�Emessagesをスキャン中...');
        data.messages.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `messages-${messageIndex}`,
                url: normalizedContent,
                fileName: `敁E��画僁E{images.length + 1}`,
                description: '敁E��箁E��画像！Eessages�E�E
              });
              console.log('🖼�E�EBase64画像見つかりました�E�Eessages�E�E', images.length);
            }
          }
        });
      }
      
      console.log('🖼�E�E画像収雁E��果�E�Ease64のみ�E�E', images.length + '件の画僁E);
      images.forEach((img, index) => {
        console.log('🖼�E�E画像[' + index + ']:', img.description, '-', img.url.substring(0, 50) + '...');
      });
      
      return images;
    };
    
    const collectedImages = collectImages(reportData);
    const imageSection = collectedImages && collectedImages.length > 0 
      ? `             <div class="image-section">
               <h3>敁E��箁E��画僁E/h3>
               <div class="image-grid">
                 ${collectedImages.map((image, index) => `
                   <div class="image-item">
                     <img class="report-img" 
                          src="${image.url}" 
                          alt="敁E��画僁E{index + 1}" />
                   </div>
                 `).join('')}
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
            max-width: 600px;
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
          // シンプルで確実な設宁E
          window.reportData = {};
          console.log('Script starting...');
        </script>
        <div class="action-buttons">
          <button class="btn btn-save" id="save-btn" style="display: none;">保孁E/button>
          <button class="btn btn-print" onclick="window.print()">印刷</button>
          <button class="btn btn-cancel" id="cancel-btn" style="display: none;">キャンセル</button>
          <button class="btn btn-close" onclick="window.close()">閉じめE/button>
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
          
          // レポ�Eトデータを設定（グローバル変数から読み取り�E�E
          try {
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
          
          // 画像表示の初期化とボタンイベント�E設宁E
          document.addEventListener('DOMContentLoaded', function() {
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
            
            // ボタンイベント�E設宁E
            setupButtonEvents();
            
            // 褁E��回実行して確実に設宁E
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
            
            // DOM要素の確実な取得�Eため少し征E��E
            setTimeout(() => {
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
                
                // ボタンスタイルを設宁E
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
            }, 200); // DOM要素が確実に存在するまで征E��E
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
              
              // 編雁E��ードクラスを追加
              document.body.classList.add('edit-mode');
              console.log('🔧 Added edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に刁E��替ぁE
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
                // 入力フィールド�E背景色を変更して編雁E��であることを�E確にする
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.style.backgroundColor = '#ffffcc';
                  el.style.border = '2px solid #007bff';
                  el.removeAttribute('readonly');
                  el.removeAttribute('disabled');
                }
                console.log('🔧 Shown editable element', index, 'tag:', el.tagName);
              });
              
              // 編雁E��ード時に入力フィールド�E値を設宁E
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
              
              // 編雁E��ードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に刁E��替ぁE
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
              
              // 編雁E�E容を�Eに戻ぁE
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
                console.log('🔧 Save button hidden');
              }
              
              // 編雁E��ードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を強制皁E��刁E��替ぁE
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
              
              // 編雁E�E容を�Eに戻ぁE
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
          
          // グローバルスコープでも利用可能にする
          window.toggleEditMode = toggleEditMode;
          
          // ペ�Eジが完�Eに読み込まれた後にも�Eタンイベントを再設宁E
          window.addEventListener('load', function() {
            console.log('🔧 Window load event - page fully loaded');
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          function setupEditFields() {
            console.log('🔧 setupEditFields called');
            // 吁E�E力フィールドに適刁E��値を設宁E
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('🔧 Found inputs:', inputs.length, 'textareas:', textareas.length);
            
            // 入力フィールド�E値を設宁E
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
            
            // チE��ストエリアの値を設宁E
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
            // 入力フィールドを允E�E値に戻ぁE
            setupEditFields();
          }
          
          async function saveReport() {
            console.log('保存�E琁E��姁E);
            console.log('originalData:', originalData);
            console.log('originalData.id:', originalData.id);
            console.log('originalData.chatId:', originalData.chatId);
            console.log('originalData.reportId:', originalData.reportId);
            console.log('originalData.fileName:', originalData.fileName);
            
            // 編雁E��れたチE�Eタを収雁E
            const updatedData = { ...originalData };
            
            // 吁E�E力フィールドから値を取征E
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('入力フィールド数:', inputs.length);
            console.log('チE��ストエリア数:', textareas.length);
            
            // 入力フィールド�E値を取征E
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
            
            // チE��ストエリアの値を取征E
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
            
            // ローカルストレージに保孁E
            localStorage.setItem('savedMachineFailureReport_' + updatedData.id, JSON.stringify(updatedData));
            
            // 履歴チE�Eタを更新�E�親ウィンドウの履歴一覧表を更新�E�E
            try {
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
            
            // 編雁E��ードを終亁E
            toggleEditMode();
            
            // 成功メチE��ージを表示
            alert('レポ�Eトが保存されました。履歴アイチE��も更新されます、E);
            
            // サーバ�Eへの保存も試衁E
            try {
              await saveToJsonFile(updatedData);
            } catch (error) {
              console.warn('サーバ�Eへの保存�E失敗しましたが、ローカルには保存されてぁE��ぁE', error);
            }
          }
          
          async function saveToJsonFile(updatedData) {
            try {
              console.log('サーバ�Eへの保存開姁E', updatedData);
              
              // 正しいIDを取征E
              let targetId = originalData.id || originalData.chatId || originalData.reportId;
              
              // IDが取得できなぁE��合�E、ファイル名からUUIDを抽出
              if (!targetId && originalData.fileName) {
                console.log('ファイル名からUUID抽出を試衁E', originalData.fileName);
                
                // UUIDパターン1: 標準的なUUID形弁E
                let fileNameMatch = originalData.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                
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
                  
                  // 保存�E功後�E処琁E
                  updateUIAfterSave(updatedData);
                  
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
                  // レスポンスのContent-Typeを確誁E
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
                    // HTMLレスポンスの場吁E
                    const textResponse = await response.text();
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
            
            // 日仁E
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
            
            // スチE�Eタス
            if (readonlyElements[5]) {
              readonlyElements[5].textContent = updatedData.status || '-';
            }
            
            // 責任老E
            if (readonlyElements[6]) {
              readonlyElements[6].textContent = updatedData.engineer || '-';
            }
            
            // 説昁E
            if (readonlyElements[7]) {
              readonlyElements[7].textContent = updatedData.problemDescription || updatedData.description || updatedData.incidentTitle || updatedData.title || '説明なぁE;
            }
            
            // 備老E
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

  // 画像取得�E共通関数�E�編雁E��象ファイル冁E�Eみで完結！E
  function pickFirstImage(data: any): string | null {
    // 1) 直丁Eor ネスト�E列に dataURL があれ�E優允E
    const dig = (v:any): string | null => {
      if (!v) return null;
      if (typeof v === 'string' && v.startsWith('data:image/')) return v;
      if (Array.isArray(v)) for (const x of v) { const r = dig(x); if (r) return r; }
      if (typeof v === 'object') for (const k of Object.keys(v)) { const r = dig(v[k]); if (r) return r; }
      return null;
    };
    const fromDataUrl = dig(data);
    if (fromDataUrl) return fromDataUrl;

    // 2) savedImages
    const saved = data?.savedImages;
    if (Array.isArray(saved) && saved[0]) return saved[0];

    // 3) imagePath(URL)
    if (typeof data?.imagePath === 'string') return data.imagePath;

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
    const rows = items.map(item => {
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
    }).join('');

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

  // 一覧印刷実衁E
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



  // 印刷機�E
  const handlePrintTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 選択された履歴のみを印刷対象とする
    const targetItems = selectedItems.size > 0 
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
          <h1>機械敁E��履歴一覧</h1>
          <p>印刷日晁E ${new Date().toLocaleString('ja-JP')}</p>
          <p>対象件数: ${targetItems.length}件${selectedItems.size > 0 ? ' (選択された履歴)' : ''}</p>
        </div>
        
        <div class="summary">
          <strong>印刷対象:</strong> ${selectedItems.size > 0 ? '選択された履歴' : '機械敁E��履歴一覧'}<br>
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
            ${targetItems.map((item) => {
              const jsonData = item.jsonData;
              const machineType = jsonData?.machineType || 
                                jsonData?.originalChatData?.machineInfo?.machineTypeName ||
                                jsonData?.chatData?.machineInfo?.machineTypeName || 
                                item.machineType || '';
              const machineNumber = jsonData?.machineNumber || 
                                  jsonData?.originalChatData?.machineInfo?.machineNumber ||
                                  jsonData?.chatData?.machineInfo?.machineNumber || 
                                  item.machineNumber || '';
              const incidentTitle = jsonData?.title || jsonData?.question || '事象なぁE;
              const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なぁE;
              
              // pickFirstImage関数を使用して画像URLを取征E
              const imageUrl = pickFirstImage(item);
              
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
            }).join('')}
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.close()">閉じめE/button>
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const jsonData = item.jsonData;
    
    // 事象チE�Eタを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E
    let incidentTitle = '事象なぁE;
    
    // まずファイル名から事象冁E��を抽出
    if (item.fileName) {
      const fileNameParts = item.fileName.split('_');
      if (fileNameParts.length > 1) {
        // ファイル名�E最初�E部刁E��事象冁E��
        incidentTitle = fileNameParts[0];
      }
    }
    
    // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E
    if (incidentTitle === '事象なぁE) {
      incidentTitle = jsonData?.title || jsonData?.question || '事象なぁE;
      if (incidentTitle === '事象なぁE && jsonData?.chatData?.messages) {
        // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
        const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
        if (userMessages.length > 0) {
          // 最初�EユーザーメチE��ージを事象として使用
          incidentTitle = userMessages[0].content || '事象なぁE;
        }
      }
    }
    
    const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なぁE;
    
    // 機種と機械番号を抽出�E�EPIから返されるチE�Eタ構造に合わせる�E�E
    const machineType = item.machineInfo?.machineTypeName || 
                      jsonData?.machineType || 
                      jsonData?.chatData?.machineInfo?.machineTypeName || 
                      item.machineType || '';
    const machineNumber = item.machineInfo?.machineNumber || 
                        jsonData?.machineNumber || 
                        jsonData?.chatData?.machineInfo?.machineNumber || 
                        item.machineNumber || '';
    
    const extractedComponents = jsonData?.extractedComponents || [];
    const extractedSymptoms = jsonData?.extractedSymptoms || [];
    const possibleModels = jsonData?.possibleModels || [];
    
    // 画像URLを取得（優先頁E��付き�E�E
    let imageUrl = '';
    let imageFileName = '';
    
    console.log('個別レポ�Eト印刷用画像読み込み処琁E', {
      itemId: item.id,
      hasJsonData: !!jsonData,
      jsonDataKeys: jsonData ? Object.keys(jsonData) : [],
      savedImages: jsonData?.savedImages,
      conversationHistory: jsonData?.conversationHistory,
      originalChatData: jsonData?.originalChatData,
      chatData: jsonData?.chatData,
      imagePath: item.imagePath
    });
    
    // 優先頁E��E: conversationHistoryからBase64画像を取得（最優先！E
    if (jsonData?.conversationHistory && jsonData.conversationHistory.length > 0) {
      const imageMessage = jsonData.conversationHistory.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: conversationHistoryからBase64画像を取得（最優先！E);
      }
    }
    
    // 優先頁E��E: originalChatData.messagesからBase64画像を取征E
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: originalChatDataからBase64画像を取得（優先頁E��E�E�E);
      }
    }
    
    // 優先頁E��E: chatData.messagesからBase64画像を取征E
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: chatDataからBase64画像を取得（優先頁E��E�E�E);
      }
    }
    
    // 優先頁E��E: 直接のmessagesフィールドからBase64画像を検索
    if (!imageUrl && jsonData?.messages && Array.isArray(jsonData.messages)) {
      const imageMessage = jsonData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: messagesフィールドからBase64画像を取得（優先頁E��E�E�E);
      }
    }
    
    // 優先頁E��E: savedImagesから画像を取得（サーバ�E上�Eファイル�E�E
    if (!imageUrl && jsonData?.savedImages && jsonData.savedImages.length > 0) {
      const savedImage = jsonData.savedImages[0];
      imageUrl = savedImage.url || '';
      imageFileName = savedImage.fileName || `敁E��画像_${item.id}`;
      console.log('個別レポ�Eト印刷用: savedImagesから画像を取得（優先頁E��E�E�E);
    }
    
    // 優先頁E��E: originalChatData.messagesからBase64画像を取征E
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: originalChatDataからBase64画像を取得（優先頁E��E�E�E);
      }
    }
    
    // 優先頁E��E: 従来フォーマット�EchatData.messagesからBase64画像を取征E
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `敁E��画像_${item.id}`;
        console.log('個別レポ�Eト印刷用: chatDataからBase64画像を取得（優先頁E��E�E�E);
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
                content: value
              });
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                foundImages.push(...findImagesRecursively(item, `${currentPath}[${index}]`));
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
    
    // 優先頁E��E: 従来のimagePathフィールド（最終フォールバック�E�E
    if (!imageUrl && item.imagePath) {
      imageUrl = item.imagePath.startsWith('http') ? item.imagePath : 
               item.imagePath.startsWith('/') ? `${window.location.origin}${item.imagePath}` :
               `${window.location.origin}/api/images/chat-exports/${item.imagePath}`;
      imageFileName = `敁E��画像_${item.id}`;
      console.log('個別レポ�Eト印刷用: imagePathから画像を取得（最終フォールバック�E�E);
    }
    
    console.log('個別レポ�Eト印刷用: 最終的な画像情報:', {
      hasImage: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'なぁE,
      imageFileName,
      isBase64: imageUrl ? imageUrl.startsWith('data:image/') : false
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
              <strong>機械ID</strong>
              ${item.machineNumber}
            </div>
            <div class="info-item">
              <strong>日仁E/strong>
              ${new Date(item.createdAt).toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ○○緁E
            </div>
            <div class="info-item">
              <strong>敁E��コーチE/strong>
              FC01
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>事象詳細</h2>
          <div class="content-box">
            <p><strong>事象タイトル:</strong> ${incidentTitle}</p>
            <p><strong>事象説昁E</strong> ${problemDescription}</p>
            <p><strong>スチE�Eタス:</strong> 応急処置完亁E/p>
            <p><strong>拁E��エンジニア:</strong> 拁E��老E/p>
            <p><strong>機種:</strong> ${machineType}</p>
            <p><strong>機械番号:</strong> ${machineNumber}</p>
          </div>
        </div>
        
        ${imageUrl ? `
        <div class="section">
          <h2>敁E��箁E��画僁E/h2>
          <div class="image-section">
            <p>機械敁E��箁E��の画僁E/p>
            <img src="${imageUrl}" alt="敁E��箁E��画僁E />
            <p style="font-size: 12px; color: #666;">上記�E敁E��箁E��の写真です、E/p>
          </div>
        </div>
        ` : ''}
        
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
          <button onclick="window.close()">閉じめE/button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportContent);
    printWindow.document.close();
  };

  // ローチE��ング状態�E表示
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">履歴チE�Eタを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // メインコンチE��チE�E表示
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">履歴管琁E/h1>
        <p className="text-gray-600">送信されたデータと関連画像�E履歴を管琁E�E検索できまぁE/p>
      </div>

      {/* 検索・フィルタエリア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            検索フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* チE��スト検索 */}
            <div className="lg:col-span-2">
              <div className="space-y-2">
                <Input
                  placeholder="タイトル、機種、事業所、応急処置冁E��、キーワードなどで検索..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  ※ 褁E��のキーワードをスペ�Eス区刁E��で入力すると、すべてのキーワードを含む履歴を検索しまぁE
                </p>
              </div>
            </div>

            {/* 日付検索 */}
            <div>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={filters.searchDate}
                  onChange={(e) => handleFilterChange('searchDate', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  ※ 持E��した日付�E履歴を検索しまぁE
                </p>
              </div>
            </div>

            {/* 機種フィルタ */}
            <div>
              <div className="space-y-2">
                <Select
                  value={filters.machineType || "all"}
                  onValueChange={(value) => handleFilterChange('machineType', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="機種を選抁E />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての機種</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value="loading" disabled>読み込み中...</SelectItem>
                    ) : searchFilterData.machineTypes && searchFilterData.machineTypes.length > 0 ? (
                      searchFilterData.machineTypes.map((type, index) => (
                        <SelectItem key={`type-${index}`} value={type}>
                          {type}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>チE�Eタがありません</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ※ JSONファイルから機種を取得してぁE��ぁE
                  {searchFilterData.machineTypes && ` (${searchFilterData.machineTypes.length}件)`}
                </p>
              </div>
            </div>

            {/* 機械番号フィルタ */}
            <div>
              <div className="space-y-2">
                <Select
                  value={filters.machineNumber || "all"}
                  onValueChange={(value) => handleFilterChange('machineNumber', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="機械番号を選抁E />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての機械番号</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value="loading" disabled>読み込み中...</SelectItem>
                    ) : searchFilterData.machineNumbers && searchFilterData.machineNumbers.length > 0 ? (
                      searchFilterData.machineNumbers.map((number, index) => (
                        <SelectItem key={`number-${index}`} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>チE�Eタがありません</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ※ JSONファイルから機械番号を取得してぁE��ぁE
                  {searchFilterData.machineNumbers && ` (${searchFilterData.machineNumbers.length}件)`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              検索
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              フィルタークリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              機械敁E��履歴一覧 ({filteredItems.length}件)
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">履歴チE�Eタがありません</p>
            </div>
          ) : (
            // チE�Eブル形式表示
            <div className="space-y-4">


              {/* チE�Eブル */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onChange={handleSelectAll}
                          className="mr-2 w-6 h-6"
                        />
                        選抁E
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機種</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機械番号</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">事象冁E��</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">説昁Eエクスポ�Eト種別</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">作�E日晁E/th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">画僁E/th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      // 新しいフォーマット�EチE�Eタ構造に合わせて表示
                      const jsonData = item.jsonData;
                      
                      // 事象チE�Eタを抽出�E�ファイル名から優先的に取得、次にJSONチE�Eタから�E�E
                      let incidentTitle = '事象なぁE;
                      
                      // まずファイル名から事象冁E��を抽出
                      if (item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // ファイル名�E最初�E部刁E��事象冁E��
                          incidentTitle = fileNameParts[0];
                        }
                      }
                      
                      // ファイル名から取得できなぁE��合�E、JSONチE�Eタから取征E
                      if (incidentTitle === '事象なぁE) {
                        incidentTitle = jsonData?.title || jsonData?.question || '事象なぁE;
                        if (incidentTitle === '事象なぁE && jsonData?.chatData?.messages) {
                          // 従来フォーマット�E場合、ユーザーメチE��ージから事象を抽出
                          const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
                          if (userMessages.length > 0) {
                            // 最初�EユーザーメチE��ージを事象として使用
                            incidentTitle = userMessages[0].content || '事象なぁE;
                          }
                        }
                      }
                      
                      const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なぁE;
                      
                      // 機種と機械番号を抽出�E�EPIから返されるチE�Eタ構造に合わせる�E�E
                      const machineType = jsonData?.machineType || 
                                        jsonData?.chatData?.machineInfo?.machineTypeName || 
                                        item.machineInfo?.machineTypeName || 
                                        item.machineType || '';
                      const machineNumber = jsonData?.machineNumber || 
                                          jsonData?.chatData?.machineInfo?.machineNumber || 
                                          item.machineInfo?.machineNumber || 
                                          item.machineNumber || '';
                      
                      // チE��チE��惁E��
                      console.log(`🔍 アイチE��表示: ${item.fileName}`, {
                        machineType,
                        machineNumber,
                        jsonDataMachineType: jsonData?.machineType,
                        jsonDataMachineNumber: jsonData?.machineNumber,
                        itemMachineType: item.machineType,
                        itemMachineNumber: item.machineNumber
                      });
                      
                      const messageCount = jsonData?.metadata?.total_messages || 
                                         jsonData?.chatData?.messages?.length || 
                                         jsonData?.messageCount || 0;
                      const exportType = jsonData?.exportType || 'manual_send';
                      const fileName = jsonData?.metadata?.fileName || '';
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 bg-blue-50">
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className="w-6 h-6"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {machineType || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {machineNumber || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={incidentTitle}>
                            {incidentTitle}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={problemDescription}>
                            {problemDescription}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{formatDate(item.createdAt)}</td>
                          <td className="border border-gray-300 px-3 py-2">
                            {(() => {
                              const imageUrl = pickFirstImage(item);
                              if (imageUrl) {
                                return (
                                  <img 
                                    src={imageUrl} 
                                    alt="画僁E 
                                    className="w-8 h-8 object-cover rounded border"
                                    title="敁E��画僁E
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                );
                              }
                              return <span className="text-gray-500">-</span>;
                            })()}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('🔍 編雁E�EタンクリチE�� - 允E�EアイチE��:', item);
                                  console.log('🔍 item.machineType:', item.machineType);
                                  console.log('🔍 item.machineNumber:', item.machineNumber);
                                  console.log('🔍 item.jsonData:', item.jsonData);
                                  
                                  const normalizedItem = normalizeJsonData(item);
                                  console.log('🔍 正規化後�EアイチE��:', normalizedItem);
                                  console.log('🔍 正規化征EmachineType:', normalizedItem.machineType);
                                  console.log('🔍 正規化征EmachineNumber:', normalizedItem.machineNumber);
                                  
                                  setEditingItem(normalizedItem);
                                  setShowEditDialog(true);
                                }}
                                className="flex items-center gap-1 text-xs"
                                title="編雁E��面を開ぁE
                              >
                                <Settings className="h-3 w-3" />
                                編雁E
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">エクスポ�Eト�E琁E/h2>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {/* 選択履歴エクスポ�EチE*/}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              選択履歴をJSONエクスポ�EチE({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              選択履歴をCSVエクスポ�EチE({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              選択�E一覧を印刷 ({selectedItems.size})
            </Button>
          </div>

          {/* 全履歴エクスポ�EチE*/}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              全履歴をJSONエクスポ�EチE
            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              全履歴をCSVエクスポ�EチE
            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            エクスポ�Eト�E琁E��...
          </div>
        )}
      </div>

      {/* ペ�Eジネ�Eション */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              前へ
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">履歴プレビュー</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintReport(previewItem)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    印刷
                  </Button>
                  <Button
                    onClick={() => {
                      const normalizedItem = normalizeJsonData(previewItem);
                      setEditingItem(normalizedItem);
                      setShowPreviewDialog(false);
                      setShowEditDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    編雁E��移勁E
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPreviewDialog(false)}>ÁE/Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* レポ�Eト�EチE��ー */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">応急処置サポ�Eト履歴</h1>
                  <p className="text-sm text-gray-500">
                    作�E日晁E {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 基本惁E�� */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">基本惁E��</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span><strong>機種:</strong> {previewItem.machineType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span><strong>機械番号:</strong> {previewItem.machineNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span><strong>作�E日晁E</strong> {formatDate(previewItem.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-500" />
                        <span><strong>画僁E</strong> {previewItem.imagePath ? 'あり' : 'なぁE}</span>
                      </div>
                    </div>
                  </div>
                  
                  {previewItem.imagePath && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">関連画僁E/h3>
                      <img
                        src={previewItem.imagePath}
                        alt="履歴画僁E
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                {/* 詳細惁E�� */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">詳細惁E��</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm overflow-auto max-h-64">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-auto">
            <div className="p-6">
              {/* 機種・機械番号チE�Eタが読み込まれてぁE��ぁE��合�E再取征E*/}
              {(() => {
                if (machineData.machineTypes.length === 0 && !machineDataLoading) {
                  fetchMachineDataFromAPI();
                }
                
                // チE��チE��: 編雁E��イアログが開かれた時の初期値をログ出劁E
                console.log('編雁E��イアログ表示時�EeditingItem:', {
                  machineType: editingItem.machineType,
                  machineNumber: editingItem.machineNumber,
                  fileName: editingItem.fileName,
                  title: editingItem.jsonData?.title,
                  question: editingItem.jsonData?.question,
                  jsonData: editingItem.jsonData
                });
                
                return null;
              })()}
              
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">機械敁E��惁E��編雁E/h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log('編雁E��ータを保存しまぁE', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    保孁E
                  </Button>
                  <Button
                    onClick={() => handlePrintReport(editingItem)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    印刷
                  </Button>
                  <Button 
                    variant="outline" 
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
              
              <div className="space-y-6">
                {/* 基本惁E��編雁E*/}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    基本惁E��
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">機種</label>
                      {machineDataLoading ? (
                        <div className="h-10 flex items-center px-3 border border-gray-300 rounded">
                          読み込み中...
                        </div>
                      ) : (
                        <Select
                          value={editingItem.machineType || ''}
                          onValueChange={(value) => {
                            console.log('機種を変更:', value);
                            setEditingItem({
                              ...editingItem,
                              machineType: value,
                              jsonData: {
                                ...editingItem.jsonData,
                                machineType: value
                              }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="機種を選抁E />
                          </SelectTrigger>
                          <SelectContent>
                            {/* チE��チE��: Select要素の値を確誁E*/}
                            {(() => {
                              console.log('🔍 機種Select - editingItem.machineType:', editingItem.machineType);
                              console.log('🔍 機種Select - machineData.machineTypes:', machineData.machineTypes);
                              return null;
                            })()}
                            {machineData.machineTypes.map((machineType) => (
                              <SelectItem key={machineType.id} value={machineType.machineTypeName}>
                                {machineType.machineTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">機械番号</label>
                      {machineDataLoading ? (
                        <div className="h-10 flex items-center px-3 border border-gray-300 rounded">
                          読み込み中...
                        </div>
                      ) : (
                        <Select
                          value={editingItem.machineNumber || ''}
                          onValueChange={(value) => {
                            console.log('機械番号を変更:', value);
                            setEditingItem({
                              ...editingItem,
                              machineNumber: value,
                              jsonData: {
                                ...editingItem.jsonData,
                                machineNumber: value
                              }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="機械番号を選抁E />
                          </SelectTrigger>
                          <SelectContent>
                            {machineData.machines
                              .filter(machine => !editingItem.machineType || machine.machineTypeName === editingItem.machineType)
                              .map((machine) => (
                              <SelectItem key={machine.id} value={machine.machineNumber}>
                                {machine.machineNumber} ({machine.machineTypeName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">ファイル吁E/label>
                      <Input
                        value={editingItem.fileName || ''}
                        onChange={(e) => {
                          console.log('ファイル名を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            fileName: e.target.value
                          });
                        }}
                        placeholder="ファイル吁E
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 事象・説明編雁E*/}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    事象・説昁E
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">事象タイトル</label>
                      <Input
                        value={editingItem.jsonData?.title || editingItem.jsonData?.question || ''}
                        onChange={(e) => {
                          console.log('事象タイトルを変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              title: e.target.value,
                              question: e.target.value
                            }
                          });
                        }}
                        placeholder="事象タイトルを�E劁E
                      />
                      {/* チE��チE��: 事象タイトルの値を確誁E*/}
                      {(() => {
                        const titleValue = editingItem.jsonData?.title || editingItem.jsonData?.question || '';
                        console.log('🔍 事象タイトル - 表示値:', titleValue);
                        console.log('🔍 事象タイトル - jsonData.title:', editingItem.jsonData?.title);
                        console.log('🔍 事象タイトル - jsonData.question:', editingItem.jsonData?.question);
                        return null;
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">事象説昁E/label>
                      <textarea
                        value={editingItem.jsonData?.problemDescription || editingItem.jsonData?.answer || ''}
                        onChange={(e) => {
                          console.log('事象説明を変更:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              problemDescription: e.target.value,
                              answer: e.target.value
                            }
                          });
                        }}
                        className="w-full h-24 p-3 border border-gray-300 rounded-md"
                        placeholder="事象の詳細説明を入劁E
                      />
                    </div>
                  </div>
                </div>

                {/* 敁E��個所の画像（修繕計画の上に移動！E*/}
                {(() => {
                  const imageUrl = pickFirstImage(editingItem);
                  if (imageUrl) {
                    return (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Image className="h-5 w-5" />
                          敁E��個所の画僁E
                        </h3>
                        <div className="text-center">
                          <img
                            src={imageUrl}
                            alt="敁E��画僁E
                            className="max-w-full max-h-64 mx-auto border border-gray-300 rounded-md shadow-sm"
                          />
                          <p className="text-sm text-gray-600 mt-2">
                            敁E��箁E��の画僁E{imageUrl.startsWith('data:image/') ? '(Base64)' : '(URL)'}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 修繕計画編雁E*/}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    修繕計画
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">修繕予定月日</label>
                      <Input
                        type="date"
                        value={editingItem.jsonData?.repairSchedule || ''}
                        onChange={(e) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              repairSchedule: e.target.value
                            }
                          });
                        }}
                        placeholder="修繕予定月日"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">場所</label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={(e) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value
                            }
                          });
                        }}
                        placeholder="設置場所"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">スチE�Eタス</label>
                      <Select
                        value={editingItem.jsonData?.status || ''}
                        onValueChange={(value) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              status: value
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="スチE�Eタスを選抁E />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="報告済み">報告済み</SelectItem>
                          <SelectItem value="対応中">対応中</SelectItem>
                          <SelectItem value="完亁E>完亁E/SelectItem>
                          <SelectItem value="保留">保留</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 記事欁E��E00斁E��程度�E�E*/}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    記事欁E
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">備老E�E記亁E(200斁E��以冁E</label>
                    <textarea
                      value={editingItem.jsonData?.remarks || ''}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              remarks: e.target.value
                            }
                          });
                        }
                      }}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md"
                      placeholder="修繕に関する備老E��追加惁E��を記載してください�E�E00斁E��以冁E��E
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.jsonData?.remarks?.length || 0}/200斁E��E
                    </p>
                  </div>
                </div>

                {/* 保存�Eタン�E�下部�E�E*/}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
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
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    保存して適用
                  </Button>
                </div>
              </div>
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
          onPrint={(reportData) => {
            console.log('チャチE��エクスポ�Eトレポ�Eトを印刷:', reportData);
            window.print();
          }}
        />
      )}



    </div>
  );
};

export default HistoryPage;


