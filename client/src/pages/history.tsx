import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, CheckSquare, Square, FileDown, FileText as FileTextIcon, Table, BarChart3, Grid3X3, List, ClipboardList, FileSpreadsheet, Grid, Printer } from 'lucide-react';
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
import MachineFailureReport from '../components/report/machine-failure-report';

// 画像ユーティリティ関数
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

async function fetchDetailFile(name: string) {
  const url = `${API_BASE}/api/history/file?name=${encodeURIComponent(name)}`;
  console.log('[fetchDetailFile] リクエスト開始:', url);
  const r = await fetch(url, { credentials: 'include' });
  console.log('[fetchDetailFile] レスポンス受信:', { status: r.status, ok: r.ok });
  if (!r.ok) throw new Error(`detail ${r.status}`);
  const json = await r.json();
  console.log('[fetchDetailFile] JSON解析完了:', { hasData: !!json, keys: Object.keys(json || {}) });
  return json;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // エクスポート機能の状態
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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
  
  // 機械故障報告書の状態
  const [showMachineFailureReport, setShowMachineFailureReport] = useState(false);
  const [machineFailureReportData, setMachineFailureReportData] = useState<any>(null);

  // 機種・機械番号マスターデータ
  const [machineData, setMachineData] = useState<MachineData>({ 
    machineTypes: [], 
    machines: [] 
  });
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
        
        setHistoryItems(data.items);
        setFilteredItems(data.items);
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

  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      const blob = await exportHistoryItem(item.id, 'json');
      downloadFile(blob, `history_${item.id}.json`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  };




  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
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

  const handleExportSelected = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportSelectedHistory(Array.from(selectedItems), format);
      downloadFile(blob, `selected_history.${format}`);
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
      const selectedItemsList = filteredItems.filter(item => selectedItems.has(item.id));
      
      console.log('レポート生成開始:', { 
        filteredItemsCount: filteredItems.length,
        selectedItemsCount: selectedItemsList.length,
        selectedItems: Array.from(selectedItems)
      });
      
      // 選択されたアイテムがない場合は処理を停止
      if (selectedItemsList.length === 0) {
        alert('ファイルを選択してください。');
        setReportLoading(false);
        return;
      }
      
      const targetItems = selectedItemsList;
      
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
    if (!item?.fileName) {
      console.warn('[REPORT DETAIL] no target - fileNameがありません'); 
      return;
    }
    const name = item.fileName;
    console.log('[REPORT DETAIL] fetchDetailFile開始:', name);
    try {
      const json = await fetchDetailFile(name);
      console.log('[REPORT DETAIL] fetchDetailFile成功:', { 
        hasConv: !!json?.conversationHistory, 
        hasSaved: !!json?.savedImages,
        jsonKeys: Object.keys(json || {})
      });
      console.log('[REPORT DETAIL] 渡すデータ:', {
        hasSavedImages: !!json?.savedImages,
        savedImagesCount: json?.savedImages?.length || 0,
        savedImagesUrls: json?.savedImages?.map((img: any) => img.url) || [],
        machineInfo: json?.originalChatData?.machineInfo
      });
      setMachineFailureReportData(json);  // ← 子に全文渡す
      setShowMachineFailureReport(true);
      console.log('[REPORT DETAIL] 状態更新完了');
    } catch (e) {
      console.error('[REPORT DETAIL] fetchDetailFile失敗:', e);
    }
  };

  const handleCloseMachineFailureReport = () => {
    setShowMachineFailureReport(false);
    setMachineFailureReportData(null);
    // レポート生成の状態もリセット
    setReportLoading(false);
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
          <p>対象件数: ${filteredItems.length}件</p>
        </div>
        
        <div class="summary">
          <strong>印刷対象:</strong> 機械故障履歴一覧<br>
          <strong>印刷日時:</strong> ${new Date().toLocaleString('ja-JP')}<br>
          <strong>対象件数:</strong> ${filteredItems.length}件
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
            ${filteredItems.map((item) => {
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
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  // 既にレポート生成中の場合は処理を停止
                  if (reportLoading) {
                    console.log('レポート生成中です。処理を停止します。');
                    return;
                  }
                  
                  console.log('レポート生成ボタンがクリックされました');
                  console.log('filteredItems:', filteredItems.length);
                  console.log('selectedItems:', selectedItems.size);
                  console.log('reportLoading:', reportLoading);
                  
                  try {
                    await handleGenerateReport();
                  } catch (error) {
                    console.error('レポート生成ボタンクリック時のエラー:', error);
                    // エラーが発生した場合でもボタンの状態をリセット
                    setReportLoading(false);
                  }
                }}
                disabled={filteredItems.length === 0 || reportLoading}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                {reportLoading 
                  ? 'レポート生成中...' 
                  : selectedItems.size > 0 
                    ? `レポート生成 (${selectedItems.size}件選択)` 
                    : 'レポート生成 (全件)'
                }
              </Button>

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
              {/* 全選択ヘッダー */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2"
                  >
                    {selectedItems.size === filteredItems.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedItems.size === filteredItems.length ? '全選択解除' : '全選択'}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedItems.size}件選択中 / {filteredItems.length}件表示
                  </span>
                </div>
              </div>

              {/* テーブル */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">選択</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機種</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">機械番号</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">事象内容</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">説明/エクスポート種別</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">作成日時</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">画像</th>
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
                          <td className="border border-gray-300 px-3 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectItem(item.id)}
                              className="p-1"
                            >
                              {selectedItems.has(item.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
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

      {/* 報告書表示 */}
      {showMachineFailureReport && machineFailureReportData && (
        <MachineFailureReport
          data={machineFailureReportData}
          onClose={handleCloseMachineFailureReport}
          onSave={(reportData) => {
            console.log('報告書を保存:', reportData);
            // 保存後にローカルストレージに保存
            const savedReports = JSON.parse(localStorage.getItem('savedMachineFailureReports') || '[]');
            const newReport = {
              id: Date.now(),
              reportData: reportData,
              savedAt: new Date().toISOString()
            };
            savedReports.push(newReport);
            localStorage.setItem('savedMachineFailureReports', JSON.stringify(savedReports));
            alert('報告書が保存されました。');
            handleCloseMachineFailureReport();
          }}
          onPrint={(reportData) => {
            console.log('報告書を印刷:', reportData);
            window.print();
          }}
        />
      )}

      {/* エクスポート処理エリア */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">エクスポート処理</h2>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {/* 選択項目一括エクスポート */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={selectedItems.size === 0 || exportLoading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              選択項目をエクスポート ({selectedItems.size}件)
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={selectedItems.size === 0 || exportLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSVでエクスポート
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={selectedItems.size === 0 || exportLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              一覧を印刷
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

