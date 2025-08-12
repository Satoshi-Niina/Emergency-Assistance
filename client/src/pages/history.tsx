import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, FileDown, FileText as FileTextIcon, Table, Grid3X3, List, ClipboardList, FileSpreadsheet, Grid, Printer, AlertTriangle } from 'lucide-react';
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



// 画像ユーティリティ関数
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

async function fetchDetailFile(name: string) {
  // IDベースのエンドポイントを試行
  const endpoints = [
    `${API_BASE}/api/history/${name}`,
    `${API_BASE}/api/history/detail/${name}`,
    `${API_BASE}/api/history/file/${name}`
  ];
  
  for (const url of endpoints) {
    try {
      console.log('[fetchDetailFile] リクエスト開始:', url);
      const r = await fetch(url, { credentials: 'include' });
      console.log('[fetchDetailFile] レスポンス受信:', { status: r.status, ok: r.ok, url });
      
      if (r.ok) {
        const json = await r.json();
        console.log('[fetchDetailFile] JSON解析完了:', { hasData: !!json, keys: Object.keys(json || {}) });
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
  
  // エクスポート機能の状態

  const [exportLoading, setExportLoading] = useState(false);
  
  // レポート機能の状態
  const [reportLoading, setReportLoading] = useState(false);
  
  // 編集・プレビュー機能の状態
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // 印刷機能の状態
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'report'>('table');
  
  // レポート表示の状態
  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  

  


  // 機種・機械番号マスターデータ
  const [machineData, setMachineData] = useState<MachineData>({ 
    machineTypes: [], 
    machines: [] 
  });

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
        if (selectedItem && (selectedItem.id === updatedData.id || selectedItem.chatId === updatedData.chatId)) {
          setSelectedItem(prev => prev ? { ...prev, ...updatedData } : null);
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

  // データ取得（サーバーAPIから取得）
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('🔍 データ初期化開始');
        setLoading(true);
        await Promise.all([
          fetchHistoryData().catch(error => {
            console.error('履歴データ取得エラー:', error);
          }),
          fetchMachineDataFromAPI().catch(error => {
            console.error('機種データ取得エラー:', error);
          })
        ]);
        console.log('🔍 データ初期化完了');
      } catch (error) {
        console.error('データ初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔍 useEffect実行');
    initializeData();
  }, []);

  // 機種・機械番号マスターデータ取得
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);
      
      // 機種・機械番号データを専用APIから取得
      console.log('🔍 機種・機械番号データ取得開始');
      const response = await fetch('/api/history/machine-data');
      console.log('🔍 APIレスポンス:', response.status, response.statusText);
      const data = await response.json();
      console.log('🔍 APIレスポンスデータ:', data);
      
      if (data.success && data.machineTypes && data.machines) {
        // 機種一覧を構築（重複除去）
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];
        
        // 機械番号一覧を構築（重複除去）
        const machineSet = new Set<string>();
        const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];
        
        console.log('🔍 機種・機械番号データは専用APIから取得されます');
        
        const result = {
          machineTypes: data.machineTypes || [],
          machines: data.machines || []
        };
        
        console.log('🔍 機種・機械番号データ取得結果:', result);
        console.log('🔍 機種数:', result.machineTypes.length);
        console.log('🔍 機械番号数:', result.machines.length);
        console.log('🔍 機種一覧:', result.machineTypes.map(t => t.machineTypeName));
        console.log('🔍 機械番号一覧:', result.machines.map(m => `${m.machineNumber} (${m.machineTypeName})`));
        console.log('🔍 setMachineData呼び出し前:', result);
        setMachineData(result);
        console.log('🔍 setMachineData呼び出し完了');
      } else {
        console.log('⚠️ 機種・機械番号データが正しく取得できませんでした:', data);
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

  const fetchHistoryData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // サーバー側でフィルタリングを行う
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
        
        // 機種・機械番号データの確認
        data.items.forEach((item: any, index: number) => {
          console.log(`🔍 アイテム ${index + 1}:`, {
            fileName: item.fileName,
            machineType: item.machineType,
            machineNumber: item.machineNumber,
            machineInfo: item.machineInfo
          });
        });
        
        // ローカルストレージから保存されたデータを読み込んで履歴データを更新
        const updatedItems = data.items.map((item: any) => {
          const savedKey = 'savedMachineFailureReport_' + (item.id || item.chatId);
          const savedData = localStorage.getItem(savedKey);
          if (savedData) {
            try {
              const parsedData = JSON.parse(savedData);
              console.log('ローカルストレージから保存されたデータを読み込み:', parsedData);
              return { ...item, ...parsedData };
            } catch (parseError) {
              console.warn('保存されたデータの解析に失敗:', parseError);
              return item;
            }
          }
          return item;
        });
        
        setHistoryItems(updatedItems);
        setFilteredItems(updatedItems);
        setTotalPages(Math.ceil(data.total / 20));
        setCurrentPage(page);
      } else {
        console.log('🔍 データ取得成功せず:', data);
        setHistoryItems([]);
        setFilteredItems([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('履歴データの取得に失敗しました:', error);
      setHistoryItems([]);
      setFilteredItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 検索とフィルタリング
  useEffect(() => {
    // 初期ロード時のみ実行
    if (currentPage === 1 && historyItems.length === 0) {
      fetchHistoryData(1);
    }
  }, []); // filtersの依存を削除

  // フィルター変更時の処理
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    fetchHistoryData(1);
  };

  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm('この履歴を削除しますか？')) {
      try {
        await deleteHistory(id);
        fetchHistoryData(currentPage);
      } catch (error) {
        console.error('履歴削除エラー:', error);
      }
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
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.id));
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


  const handleExportItem = async (item: SupportHistoryItem, format: 'json' | 'csv' = 'json') => {
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
        targetItemsCount: targetItems.length
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
          machineNumber: item.machineNumber
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
        
        console.log(`レポート${index + 1}の基本情報:`, {
          title,
          machineType,
          machineNumber
        });
        
        // 画像データを収集（優先順位付き）
        const images = [];
        
        try {
          // 優先順位1: conversationHistoryからBase64画像を取得（最優先）
          if (jsonData?.conversationHistory?.length > 0) {
            console.log('handleGenerateReport: conversationHistoryからBase64画像を検索中...', jsonData.conversationHistory.length);
            const imageMessages = jsonData.conversationHistory.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: conversationHistoryでBase64画像を発見:', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              images.push({
                id: `conv-${index}`,
                url: msg.content,
                fileName: `故障画像_${index + 1}`,
                description: '機械故障箇所の写真',
                source: 'conversationHistory'
              });
            });
          }
          
          // 優先順位2: originalChatData.messagesからBase64画像を取得
          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log('handleGenerateReport: originalChatData.messagesからBase64画像を検索中...', jsonData.originalChatData.messages.length);
            const imageMessages = jsonData.originalChatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: originalChatData.messagesでBase64画像を発見:', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'originalChatData'
                });
              }
            });
          }
          
          // 優先順位3: chatData.messagesからBase64画像を取得
          if (jsonData?.chatData?.messages?.length > 0) {
            console.log('handleGenerateReport: chatData.messagesからBase64画像を検索中...', jsonData.chatData.messages.length);
            const imageMessages = jsonData.chatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: chatData.messagesでBase64画像を発見:', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'chatData'
                });
              }
            });
          }
          
          // 優先順位4: savedImagesフィールドから画像を取得
          if (jsonData?.savedImages?.length > 0) {
            console.log('handleGenerateReport: savedImagesから画像を取得中...', jsonData.savedImages.length);
            jsonData.savedImages.forEach((img: any, index: number) => {
              // 既に追加済みの画像は除外
              if (!images.some(existingImg => existingImg.url === img.url || existingImg.url === img.path)) {
                images.push({
                  id: `saved-${index}`,
                  url: img.url || img.path,
                  fileName: img.fileName || `故障画像_${images.length + 1}`,
                  description: img.description || '機械故障箇所の写真',
                  source: 'savedImages'
                });
              }
            });
          }
          
          // 優先順位5: 再帰的にJSONデータ内の画像を検索
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
          console.log('handleGenerateReport: 再帰検索で画像を発見:', recursiveImages.length);
          recursiveImages.forEach((imgUrl, index) => {
            // 既に追加済みの画像は除外
            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `故障画像_${images.length + 1}`,
                description: '機械故障箇所の写真',
                source: 'recursive'
              });
            }
          });
          
          // 優先順位6: imagePathフィールド（最終フォールバック）
          if (jsonData?.imagePath && typeof jsonData.imagePath === 'string' && !images.some(img => img.url === jsonData.imagePath)) {
            console.log('handleGenerateReport: imagePathから画像を取得中...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '故障画像',
              description: '機械故障箇所の写真',
              source: 'imagePath'
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
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          repairLocation: '工場内修理スペース',
          images: images.length > 0 ? images : undefined,
          chatHistory: jsonData?.conversationHistory || jsonData?.chatData?.messages || undefined
        };
        
        console.log(`レポート${index + 1}の生成完了:`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0
        });
        
        return reportData;
      });
      
      console.log('=== レポートデータ生成完了 ===');
      console.log('レポート配列の長さ:', reportDataArray.length);
      console.log('各レポートの詳細:', reportDataArray.map((report, index) => ({
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
      console.log('レポート表示状態を設定完了');
      
      // 成功通知
      alert(`レポートが正常に生成されました。\n対象アイテム: ${targetItems.length}件 (選択済み)\n${targetItems.length > 1 ? '複数ページで表示されます。' : ''}`);
      
      console.log('=== レポート生成完了 ===');
    } catch (error) {
      console.error('=== レポート生成エラー ===');
      console.error('エラー詳細:', error);
      console.error('エラースタック:', error instanceof Error ? error.stack : 'スタックトレースなし');
      alert('レポート生成中にエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // エラーが発生しても確実にローディング状態をリセット
      setReportLoading(false);
      console.log('レポート生成状態をリセット完了');
    }
  };



  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(`/api/history/file?name=${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        throw new Error('チャットエクスポートファイルの取得に失敗しました');
      }
      
      const data = await response.json();
      
      // 新しいフォーマットのデータを確認して、適切な形式に変換
      const reportData = {
        ...data,
        // 新しいフォーマットのフィールドを追加
        title: data.title || data.chatData?.machineInfo?.machineTypeName || 'タイトルなし',
        problemDescription: data.problemDescription || '説明なし',
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
      console.error('レポート表示エラー:', error);
    }
  };

    const handleShowMachineFailureReport = async (item: SupportHistoryItem) => {
    console.log('[REPORT DETAIL] 関数開始 - item:', item);
    console.log('[REPORT DETAIL] item.fileName:', item?.fileName);
    console.log('[REPORT DETAIL] item.id:', item?.id);
    
    // 正しいIDを取得（UUID部分を抽出）
    let identifier = item?.id;
    
    // IDが取得できない場合は、ファイル名からUUIDを抽出
    if (!identifier && item?.fileName) {
      console.log('[REPORT DETAIL] ファイル名からUUID抽出を試行:', item.fileName);
      
      // UUIDパターン1: 標準的なUUID形式
      let fileNameMatch = item.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
      
      if (fileNameMatch) {
        identifier = fileNameMatch[1];
        console.log('[REPORT DETAIL] 標準UUIDから抽出したID:', identifier);
      } else {
        // UUIDパターン2: アンダースコア区切りのUUID
        fileNameMatch = item.fileName.match(/_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
        if (fileNameMatch) {
          identifier = fileNameMatch[1];
          console.log('[REPORT DETAIL] アンダースコア区切りUUIDから抽出したID:', identifier);
        }
      }
    }
    
    // それでもIDが取得できない場合は、ファイル名全体を使用
    if (!identifier) {
      identifier = item?.fileName;
      console.log('[REPORT DETAIL] ファイル名全体をIDとして使用:', identifier);
    }
    
    if (!identifier) {
      console.warn('[REPORT DETAIL] no target - IDもfileNameもありません'); 
      return;
    }
    
    console.log('[REPORT DETAIL] fetchDetailFile開始:', identifier);
          // 基本的なレポートデータを準備（画像データも含む）
      const reportData = {
        id: item.id,
        chatId: item.id,
        reportId: item.id,
        machineId: item.machineNumber,
        machineNumber: item.machineNumber,
        machineType: item.machineTypeName || item.machineType || '-',
        machineTypeName: item.machineTypeName || item.machineType || '-',
        date: item.createdAt,
        timestamp: item.createdAt,
        createdAt: item.createdAt,
        location: item.location || '-',
        failureCode: item.failureCode || '-',
        status: item.status || '-',
        engineer: item.engineer || '-',
        problemDescription: item.title || item.incidentTitle || '説明なし',
        description: item.title || item.incidentTitle || '説明なし',
        incidentTitle: item.title || item.incidentTitle || '説明なし',
        notes: item.notes || '-',
        extractedComponents: item.extractedComponents || [],
        extractedSymptoms: item.extractedSymptoms || [],
        possibleModels: item.possibleModels || [],
        repairSchedule: item.repairSchedule || '-',
        repairLocation: item.repairLocation || '-',
        requestDate: item.requestDate || '-',
        // 画像データを復旧
        conversationHistory: item.conversationHistory || [],
        originalChatData: item.originalChatData || {},
        chatData: item.chatData || {},
        messages: item.messages || [],
        savedImages: item.savedImages || [],
        imageUrl: item.imageUrl || null,
        // ファイル名も追加
        fileName: item.fileName
      };
    
    console.log('[REPORT DETAIL] 基本的なレポートデータ準備完了:', reportData);
      
      // 新しいウィンドウで機械故障報告書を開く
      console.log('新しいウィンドウを開いています...');
      const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (newWindow) {
        console.log('ウィンドウが開かれました。HTMLを生成中...');
        // fileNameをreportDataに追加（確実に設定）
        const reportDataWithFileName = {
          ...reportData,
          fileName: item.fileName || identifier // item.fileNameを優先、なければidentifierを使用
        };
        
        console.log('reportDataWithFileName:', reportDataWithFileName);
        console.log('使用するfileName:', item.fileName || identifier);
        
        // 機械故障報告書のHTMLを生成
        const reportHTML = generateMachineFailureReportHTML(reportDataWithFileName);
        console.log('HTML生成完了。長さ:', reportHTML.length);
        newWindow.document.write(reportHTML);
        newWindow.document.close();
        console.log('HTMLの書き込み完了');
      } else {
        console.error('ポップアップがブロックされています');
        alert('ポップアップがブロックされています。ポップアップを許可してから再度お試しください。');
      }
      
      console.log('[REPORT DETAIL] 新しいウィンドウで機械故障報告書を開きました');
    // エラーハンドリングは不要（API呼び出しなし）
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
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    const newReport = {
      id: Date.now(),
      fileName: selectedFileName,
      reportData: reportData,
      savedAt: new Date().toISOString()
    };
    savedReports.push(newReport);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
    
    console.log('レポートが保存されました:', newReport);
  };

  // 履歴アイテムの編集データをサーバーに保存
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編集された履歴アイテムを保存:', editedItem);
      
      // サーバーに更新リクエストを送信
      const response = await fetch(`/api/history/update-item/${editedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updatedData: editedItem.jsonData,
          updatedBy: 'user' // 実際のユーザーIDに置き換える
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '履歴の更新に失敗しました');
      }
      
      const result = await response.json();
      console.log('履歴更新完了:', result);
      
      // 成功通知
      alert('履歴が正常に更新されました。');
      
      // 編集ダイアログを閉じる
      setShowEditDialog(false);
      setEditingItem(null);
      
      // 履歴リストを再読み込み
      fetchHistory();
      
    } catch (error) {
      console.error('履歴保存エラー:', error);
      alert('履歴の保存に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  // 機械故障報告書のHTML生成関数
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // 画像を収集（base64優先、重複防止）
    const collectImages = (data: any): Array<{ id: string; url: string; fileName: string; description?: string }> => {
      const images: Array<{ id: string; url: string; fileName: string; description?: string }> = [];
      const imageUrls = new Set<string>();
      
      // 1) conversationHistory から base64 画像を探す（最優先）
      if (data?.conversationHistory && Array.isArray(data.conversationHistory)) {
        data.conversationHistory.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `base64-${messageIndex}`,
                url: normalizedContent,
                fileName: `故障画像${images.length + 1}`,
                description: '故障箇所画像（Base64）'
              });
            }
          }
        });
      }
      
      // 2) originalChatData.messages から base64 画像を探す（conversationHistoryにない場合のみ）
      if (images.length === 0 && data?.originalChatData?.messages && Array.isArray(data.originalChatData.messages)) {
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
                fileName: `故障画像${images.length + 1}`,
                description: '故障箇所画像（Base64）'
              });
            }
          }
        });
      }
      
      // 3) savedImages から配信URLを取得（base64がない場合のフォールバック）
      if (images.length === 0 && data?.savedImages && Array.isArray(data.savedImages)) {
        data.savedImages.forEach((item: any, index: number) => {
          let imageUrl: string | null = null;
          
          if (item?.path) {
            if (item.path.includes('\\') && item.path.includes('chat-exports')) {
              const fileName = item.path.split('\\').pop();
              if (fileName) {
                imageUrl = `/api/images/chat-exports/${fileName}`;
              }
            }
          }
          
          if (!imageUrl && item?.url) {
            imageUrl = item.url;
          }
          
          if (imageUrl && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            images.push({
              id: `saved-${index}`,
              url: imageUrl,
              fileName: item.fileName || `保存画像${index + 1}`,
              description: '故障箇所画像（配信URL）'
            });
          }
        });
      }
      
      return images;
    };
    
    const collectedImages = collectImages(reportData);
    const imageSection = collectedImages && collectedImages.length > 0 
      ? `             <div class="image-section">
               <h3>故障箇所画像</h3>
               <div class="image-grid">
                 ${collectedImages.map((image, index) => `
                   <div class="image-item">
                     <img class="report-img" 
                          src="${image.url}" 
                          alt="故障画像${index + 1}" />
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
              font-size: 3pt;
            }
            
            .header h1 {
              font-size: 6pt;
            }
            
            .section h2 {
              font-size: 5pt;
            }
            
            .info-item strong,
            .info-item span,
            .info-item input,
            .info-item textarea,
            .content-box strong,
            .content-box p {
              font-size: 4pt;
            }
            
            .header p {
              font-size: 4pt;
            }
            
            input, textarea, .editable {
              font-size: 4pt;
            }
            
            /* 印刷時のレイアウト最適化 */
            .section {
              margin-bottom: 5px;
            }
            
            .info-grid {
              gap: 3px;
              margin-bottom: 5px;
            }
            
            .info-item {
              padding: 4px;
            }
            
            .content-box {
              padding: 3px;
              margin-top: 2px;
            }
            
            .image-grid {
              gap: 4px;
              margin: 4px 0;
            }
            
            .report-img {
              max-width: 60px;
              max-height: 40px;
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
            text-align: center;
            margin: 12px 0;
            page-break-inside: avoid;
          }
          
          .image-section h3 {
            font-size: 10pt;
            margin-bottom: 8px;
          }
          
          .image-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin: 8px 0;
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
          
          .btn-edit {
            background: #007bff;
            color: white;
          }
          
          .btn-print {
            background: #28a745;
            color: white;
          }
          
          .btn-save {
            background: #ffc107;
            color: #000;
          }
          
          .btn-cancel {
            background: #6c757d;
            color: white;
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
          
          .edit-mode .readonly {
            display: none !important;
          }
          
          .edit-mode .editable {
            display: block !important;
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
        </style>
      </head>
      <body>
        <div class="action-buttons">
          <button class="btn btn-edit" onclick="toggleEditMode()">編集</button>
          <button class="btn btn-save" onclick="saveReport()" style="display: none;">保存</button>
          <button class="btn btn-print" onclick="window.print()">印刷</button>
          <button class="btn btn-cancel" onclick="toggleEditMode()" style="display: none;">キャンセル</button>
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
                <input class="editable" value="${reportData.reportId || reportData.id || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>機種</strong>
                <span class="readonly">${reportData.machineType || reportData.machineTypeName || '-'}</span>
                <input class="editable" value="${reportData.machineType || reportData.machineTypeName || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>機械番号</strong>
                <span class="readonly">${reportData.machineNumber || '-'}</span>
                <input class="editable" value="${reportData.machineNumber || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>日付</strong>
                <span class="readonly">${reportData.date ? new Date(reportData.date).toLocaleDateString('ja-JP') : reportData.timestamp ? new Date(reportData.timestamp).toLocaleDateString('ja-JP') : reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                <input class="editable" type="date" value="${reportData.date || reportData.timestamp || reportData.createdAt || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${reportData.location || '-'}</span>
                <input class="editable" value="${reportData.location || ''}" style="display: none;" />
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>故障詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>ステータス</strong>
                <span class="readonly">${reportData.status || '-'}</span>
                <input class="editable" value="${reportData.status || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>責任者</strong>
                <span class="readonly">${reportData.engineer || '-'}</span>
                <input class="editable" value="${reportData.engineer || ''}" style="display: none;" />
              </div>
            </div>
            
            <div class="content-box">
              <strong>説明</strong>
              <p class="readonly">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '説明なし'}</p>
              <textarea class="editable" rows="4" style="display: none;">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || ''}</textarea>
            </div>
            
            <div class="content-box">
              <strong>備考</strong>
              <p class="readonly">${reportData.notes || '-'}</p>
              <textarea class="editable" rows="4" style="display: none;">${reportData.notes || ''}</textarea>
            </div>
          </div>
          
          ${imageSection}
          
          <div class="section">
            <h2>修繕計画</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>依頼月日</strong>
                <span class="readonly">${reportData.requestDate || '-'}</span>
                <input class="editable" type="date" value="${reportData.requestDate || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>予定月日</strong>
                <span class="readonly">${reportData.repairSchedule || '-'}</span>
                <input class="editable" type="date" value="${reportData.repairSchedule || ''}" style="display: none;" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${reportData.repairLocation || '-'}</span>
                <input class="editable" value="${reportData.repairLocation || ''}" style="display: none;" />
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2025 機械故障報告書. All rights reserved.</p>
          </div>
        </div>
        
        <script>
          let isEditMode = false;
          let originalData = ${JSON.stringify(reportData)};
          
          // 画像表示の初期化（シンプルな3列表示）
          document.addEventListener('DOMContentLoaded', function() {
            console.log('画像表示の初期化完了');
          });
          
          function toggleEditMode() {
            isEditMode = !isEditMode;
            const editBtn = document.querySelector('.btn-edit');
            const cancelBtn = document.querySelector('.btn-cancel');
            const saveBtn = document.querySelector('.btn-save');
            
            if (isEditMode) {
              editBtn.style.display = 'none';
              cancelBtn.style.display = 'inline-block';
              saveBtn.style.display = 'inline-block';
              document.body.classList.add('edit-mode');
              // 編集モード時に入力フィールドの値を設定
              setupEditFields();
            } else {
              editBtn.style.display = 'inline-block';
              cancelBtn.style.display = 'none';
              saveBtn.style.display = 'none';
              document.body.classList.remove('edit-mode');
              // 編集内容を元に戻す
              resetToOriginal();
            }
          }
          
          function setupEditFields() {
            // 各入力フィールドに適切な値を設定
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            // 入力フィールドの値を設定
            inputs.forEach((input, index) => {
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
              console.log('保存開始:', updatedData);
              
              // 元のJSONファイルの場所を特定
              const originalFileName = originalData.fileName || originalData.id;
              console.log('元のファイル名:', originalFileName);
              
              // 更新されたデータを作成（元のデータをベースに編集内容を反映）
              const updatedJsonData = {
                ...originalData,
                machineType: updatedData.machineType,
                machineNumber: updatedData.machineNumber,
                problemDescription: updatedData.problemDescription,
                notes: updatedData.notes,
                status: updatedData.status,
                engineer: updatedData.engineer,
                location: updatedData.location,
                requestDate: updatedData.requestDate,
                repairSchedule: updatedData.repairSchedule,
                repairLocation: updatedData.repairLocation,
                lastModified: new Date().toISOString()
              };
              
              console.log('更新されたJSONデータ:', updatedJsonData);
              console.log('元のファイル名:', originalFileName);
              
              // 正しいIDを取得（UI表示時に設定されたデータから）
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
              
              // それでもIDが取得できない場合は、ファイル名全体を使用
              if (!targetId && originalData.fileName) {
                targetId = originalData.fileName.replace(/\.json$/, '');
                console.log('ファイル名全体をIDとして使用:', targetId);
              }
              
              console.log('保存処理で使用するID:', targetId);
              console.log('originalData:', originalData);
              
              // 既存のAPIエンドポイントを使用して履歴アイテムを更新
              const apiUrl = '/api/history/update-item/' + targetId;
              console.log('保存APIエンドポイント:', apiUrl);
              console.log('送信データ:', {
                updatedData: {
                  machineType: updatedData.machineType,
                  machineNumber: updatedData.machineNumber,
                  problemDescription: updatedData.problemDescription,
                  notes: updatedData.notes,
                  status: updatedData.status,
                  engineer: updatedData.engineer,
                  location: updatedData.location,
                  requestDate: updatedData.requestDate,
                  repairSchedule: updatedData.repairSchedule,
                  repairLocation: updatedData.repairLocation,
                  lastModified: new Date().toISOString()
                },
                updatedBy: 'user'
              });
              
              const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  updatedData: {
                    machineType: updatedData.machineType,
                    machineNumber: updatedData.machineNumber,
                    problemDescription: updatedData.problemDescription,
                    notes: updatedData.notes,
                    status: updatedData.status,
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

  // 画像取得の共通関数（編集対象ファイル内のみで完結）
  function pickFirstImage(data: any): string | null {
    // 1) 直下 or ネスト配列に dataURL があれば優先
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
  /* 画面プレビュー用：印刷専用ウィンドウでは最小限でOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

  // 一覧印刷用HTML生成
  const generateListPrintHTML = (items: any[]): string => {
    const rows = items.map(item => {
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
    }).join('');

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
          <h1>機械故障履歴一覧</h1>
          <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          <p>対象件数: ${targetItems.length}件${selectedItems.size > 0 ? ' (選択された履歴)' : ''}</p>
        </div>
        
        <div class="summary">
          <strong>印刷対象:</strong> ${selectedItems.size > 0 ? '選択された履歴' : '機械故障履歴一覧'}<br>
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
              const incidentTitle = jsonData?.title || jsonData?.question || '事象なし';
              const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なし';
              
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
            }).join('')}
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const jsonData = item.jsonData;
    
    // 事象データを抽出（ファイル名から優先的に取得、次にJSONデータから）
    let incidentTitle = '事象なし';
    
    // まずファイル名から事象内容を抽出
    if (item.fileName) {
      const fileNameParts = item.fileName.split('_');
      if (fileNameParts.length > 1) {
        // ファイル名の最初の部分が事象内容
        incidentTitle = fileNameParts[0];
      }
    }
    
    // ファイル名から取得できない場合は、JSONデータから取得
    if (incidentTitle === '事象なし') {
      incidentTitle = jsonData?.title || jsonData?.question || '事象なし';
      if (incidentTitle === '事象なし' && jsonData?.chatData?.messages) {
        // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
        const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
        if (userMessages.length > 0) {
          // 最初のユーザーメッセージを事象として使用
          incidentTitle = userMessages[0].content || '事象なし';
        }
      }
    }
    
    const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なし';
    
    // 機種と機械番号を抽出（APIから返されるデータ構造に合わせる）
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
      imagePath: item.imagePath
    });
    
    // 優先順位1: conversationHistoryからBase64画像を取得（最優先）
    if (jsonData?.conversationHistory && jsonData.conversationHistory.length > 0) {
      const imageMessage = jsonData.conversationHistory.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: conversationHistoryからBase64画像を取得（最優先）');
      }
    }
    
    // 優先順位2: originalChatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: originalChatDataからBase64画像を取得（優先順位2）');
      }
    }
    
    // 優先順位3: chatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: chatDataからBase64画像を取得（優先順位3）');
      }
    }
    
    // 優先順位4: 直接のmessagesフィールドからBase64画像を検索
    if (!imageUrl && jsonData?.messages && Array.isArray(jsonData.messages)) {
      const imageMessage = jsonData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: messagesフィールドからBase64画像を取得（優先順位4）');
      }
    }
    
    // 優先順位5: savedImagesから画像を取得（サーバー上のファイル）
    if (!imageUrl && jsonData?.savedImages && jsonData.savedImages.length > 0) {
      const savedImage = jsonData.savedImages[0];
      imageUrl = savedImage.url;
      imageFileName = savedImage.fileName || `故障画像_${item.id}`;
      console.log('個別レポート印刷用: savedImagesから画像を取得（優先順位5）');
    }
    
    // 優先順位3: originalChatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: originalChatDataからBase64画像を取得（優先順位3）');
      }
    }
    
    // 優先順位4: 従来フォーマットのchatData.messagesからBase64画像を取得
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: chatDataからBase64画像を取得（優先順位4）');
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
        imageFileName = `故障画像_${item.id}`;
        console.log('個別レポート印刷用: 再帰的検索で画像を取得（優先順位6）');
      }
    }
    
    // 優先順位7: 従来のimagePathフィールド（最終フォールバック）
    if (!imageUrl && item.imagePath) {
      imageUrl = item.imagePath.startsWith('http') ? item.imagePath : 
               item.imagePath.startsWith('/') ? `${window.location.origin}${item.imagePath}` :
               `${window.location.origin}/api/images/chat-exports/${item.imagePath}`;
      imageFileName = `故障画像_${item.id}`;
      console.log('個別レポート印刷用: imagePathから画像を取得（最終フォールバック）');
    }
    
    console.log('個別レポート印刷用: 最終的な画像情報:', {
      hasImage: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'なし',
      imageFileName,
      isBase64: imageUrl ? imageUrl.startsWith('data:image/') : false
    });
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>報告書 - 印刷</title>
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
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
                      <h1>報告書</h1>
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
              <strong>機械ID</strong>
              ${item.machineNumber}
            </div>
            <div class="info-item">
              <strong>日付</strong>
              ${new Date(item.createdAt).toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ○○線
            </div>
            <div class="info-item">
              <strong>故障コード</strong>
              FC01
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>事象詳細</h2>
          <div class="content-box">
            <p><strong>事象タイトル:</strong> ${incidentTitle}</p>
            <p><strong>事象説明:</strong> ${problemDescription}</p>
            <p><strong>ステータス:</strong> 応急処置完了</p>
            <p><strong>担当エンジニア:</strong> 担当者</p>
            <p><strong>機種:</strong> ${machineType}</p>
            <p><strong>機械番号:</strong> ${machineNumber}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>抽出情報</h2>
          <div class="content-box">
            <p><strong>影響コンポーネント:</strong> ${extractedComponents.join(', ') || 'なし'}</p>
            <p><strong>症状:</strong> ${extractedSymptoms.join(', ') || 'なし'}</p>
            <p><strong>可能性のある機種:</strong> ${possibleModels.join(', ') || 'なし'}</p>
          </div>
        </div>
        
        <div class="section">
          <h2>修繕予定</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>予定月日</strong>
              2025年9月
            </div>
            <div class="info-item">
              <strong>場所</strong>
              工場内修理スペース
            </div>
          </div>
        </div>
        
        ${imageUrl ? `
        <div class="section">
          <h2>故障箇所画像</h2>
          <div class="image-section">
            <p>機械故障箇所の画像</p>
            <img src="${imageUrl}" alt="故障箇所画像" />
            <p style="font-size: 12px; color: #666;">上記は故障箇所の写真です。</p>
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © 2025 報告書. All rights reserved.
          </p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">印刷</button>
          <button onclick="window.close()">閉じる</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportContent);
    printWindow.document.close();
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">履歴データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // メインコンテンツの表示
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">履歴管理</h1>
        <p className="text-gray-600">送信されたデータと関連画像の履歴を管理・検索できます</p>
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
            {/* テキスト検索 */}
            <div className="lg:col-span-2">
              <div className="space-y-2">
                <Input
                  placeholder="タイトル、機種、事業所、応急処置内容、キーワードなどで検索..."
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
                  ※ 複数のキーワードをスペース区切りで入力すると、すべてのキーワードを含む履歴を検索します
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
                  ※ 指定した日付の履歴を検索します
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
                    <SelectValue placeholder="機種を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての機種</SelectItem>
                    {machineDataLoading ? (
                      <SelectItem value="loading" disabled>読み込み中...</SelectItem>
                    ) : machineData.machineTypes && machineData.machineTypes.length > 0 ? (
                      machineData.machineTypes.map((type) => (
                        <SelectItem key={type.id} value={type.machineTypeName}>
                          {type.machineTypeName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>データがありません</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ※ JSONファイルから機種を取得しています
                  {machineData.machineTypes && ` (${machineData.machineTypes.length}件)`}
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
                    <SelectValue placeholder="機械番号を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての機械番号</SelectItem>
                    {machineDataLoading ? (
                      <SelectItem value="loading" disabled>読み込み中...</SelectItem>
                    ) : machineData.machines && machineData.machines.length > 0 ? (
                      machineData.machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.machineNumber}>
                          {machine.machineNumber} ({machine.machineTypeName})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>データがありません</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  ※ JSONファイルから機械番号を取得しています
                  {machineData.machines && ` (${machineData.machines.length}件)`}
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
              機械故障履歴一覧 ({filteredItems.length}件)
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">履歴データがありません</p>
            </div>
          ) : (
            // テーブル形式表示
            <div className="space-y-4">


              {/* テーブル */}
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
                        選択
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機種</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機械番号</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">事象内容</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">説明/エクスポート種別</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">作成日時</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">画像</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      // 新しいフォーマットのデータ構造に合わせて表示
                      const jsonData = item.jsonData;
                      
                      // 事象データを抽出（ファイル名から優先的に取得、次にJSONデータから）
                      let incidentTitle = '事象なし';
                      
                      // まずファイル名から事象内容を抽出
                      if (item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // ファイル名の最初の部分が事象内容
                          incidentTitle = fileNameParts[0];
                        }
                      }
                      
                      // ファイル名から取得できない場合は、JSONデータから取得
                      if (incidentTitle === '事象なし') {
                        incidentTitle = jsonData?.title || jsonData?.question || '事象なし';
                        if (incidentTitle === '事象なし' && jsonData?.chatData?.messages) {
                          // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
                          const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
                          if (userMessages.length > 0) {
                            // 最初のユーザーメッセージを事象として使用
                            incidentTitle = userMessages[0].content || '事象なし';
                          }
                        }
                      }
                      
                      const problemDescription = jsonData?.problemDescription || jsonData?.answer || '説明なし';
                      
                      // 機種と機械番号を抽出（APIから返されるデータ構造に合わせる）
                      const machineType = jsonData?.machineType || 
                                        jsonData?.chatData?.machineInfo?.machineTypeName || 
                                        item.machineInfo?.machineTypeName || 
                                        item.machineType || '';
                      const machineNumber = jsonData?.machineNumber || 
                                          jsonData?.chatData?.machineInfo?.machineNumber || 
                                          item.machineInfo?.machineNumber || 
                                          item.machineNumber || '';
                      
                      // デバッグ情報
                      console.log(`🔍 アイテム表示: ${item.fileName}`, {
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
                                    alt="画像" 
                                    className="w-8 h-8 object-cover rounded border cursor-pointer"
                                    title="故障画像"
                                    onClick={() => {
                                      console.log('画像クリックイベント発生:', item);
                                      handleShowMachineFailureReport(item);
                                    }}
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
                                onClick={() => handleShowMachineFailureReport(item)}
                                className="flex items-center gap-1 text-xs"
                                title="機械故障報告書で開く"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                故障報告
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">エクスポート処理</h2>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {/* 選択履歴エクスポート */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              選択履歴をJSONエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              選択履歴をCSVエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              選択の一覧を印刷 ({selectedItems.size})
            </Button>
          </div>

          {/* 全履歴エクスポート */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              全履歴をJSONエクスポート
            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              全履歴をCSVエクスポート
            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            エクスポート処理中...
          </div>
        )}
      </div>

      {/* ページネーション */}
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
                      setEditingItem(previewItem);
                      setShowPreviewDialog(false);
                      setShowEditDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    編集に移動
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPreviewDialog(false)}>×</Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* レポートヘッダー */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">応急処置サポート履歴</h1>
                  <p className="text-sm text-gray-500">
                    作成日時: {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 基本情報 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">基本情報</h3>
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
                        <span><strong>作成日時:</strong> {formatDate(previewItem.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-500" />
                        <span><strong>画像:</strong> {previewItem.imagePath ? 'あり' : 'なし'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {previewItem.imagePath && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">関連画像</h3>
                      <img
                        src={previewItem.imagePath}
                        alt="履歴画像"
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                {/* 詳細情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">詳細情報</h3>
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

      {/* 編集ダイアログ */}
      {showEditDialog && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">履歴編集</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintReport(editingItem)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    印刷
                  </Button>
                  <Button
                    onClick={() => {
                      setPreviewItem(editingItem);
                      setShowEditDialog(false);
                      setShowPreviewDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    プレビューに移動
                  </Button>
                  <Button variant="ghost" onClick={() => setShowEditDialog(false)}>×</Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 基本情報編集 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">基本情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">機種</label>
                      <Input
                        value={editingItem.machineType}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          machineType: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">機械番号</label>
                      <Input
                        value={editingItem.machineNumber}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          machineNumber: e.target.value
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* JSONデータ編集 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">データ内容</h3>
                  <textarea
                    value={JSON.stringify(editingItem.jsonData, null, 2)}
                    onChange={(e) => {
                      try {
                        const newJsonData = JSON.parse(e.target.value);
                        setEditingItem({
                          ...editingItem,
                          jsonData: newJsonData
                        });
                      } catch (error) {
                        // JSON解析エラーは無視（編集中のため）
                      }
                    }}
                    className="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="JSONデータを編集してください"
                  />
                </div>

                {/* 保存ボタン */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => handleSaveEditedItem(editingItem)}
                  >
                    保存
                  </Button>
                </div>
              </div>
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
          onPrint={(reportData) => {
            console.log('チャットエクスポートレポートを印刷:', reportData);
            window.print();
          }}
        />
      )}



    </div>
  );
};

export default HistoryPage;


