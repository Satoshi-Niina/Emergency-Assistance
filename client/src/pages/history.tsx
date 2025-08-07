
import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, CheckSquare, Square, FileDown, History, FileText as FileTextIcon, Table, BarChart3, Grid3X3, List, ClipboardList, FileSpreadsheet, Grid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { SupportHistoryItem, HistorySearchFilters, ExportHistoryItem } from '../types/history';
import { 
  fetchHistoryList, 
  fetchMachineData,
  deleteHistory, 
  exportHistoryItem, 
  exportSelectedHistory, 
  exportAllHistory,
  fetchExportHistory,
  advancedSearch,
  generateReport
} from '../lib/api/history-api';
import ChatExportReport from '../components/report/chat-export-report';
import MachineFailureReport from '../components/report/machine-failure-report';

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
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [showExportHistory, setShowExportHistory] = useState(false);
  
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

  // データ取得（サーバーAPIから取得）
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchHistoryData().catch(error => {
            console.error('履歴データ取得エラー:', error);
          }),
          fetchMachineDataFromAPI().catch(error => {
            console.error('機種データ取得エラー:', error);
          }),
          fetchExportHistoryData().catch(error => {
            console.error('エクスポート履歴取得エラー:', error);
          })
        ]);
      } catch (error) {
        console.error('データ初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // 機種・機械番号マスターデータ取得
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);
      
      // knowledge-base/exportsのJSONファイルから機種・機械番号データを取得
      const response = await fetch('/api/history');
      const data = await response.json();
      
      if (data.success && data.items) {
        // 機種一覧を構築（重複除去）
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];
        
        // 機械番号一覧を構築（重複除去）
        const machineSet = new Set<string>();
        const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];
        
        data.items.forEach((item: any, index: number) => {
          const machineInfo = item.machineInfo;
          if (machineInfo) {
            // 機種データを追加
            if (machineInfo.machineTypeName && !machineTypeSet.has(machineInfo.machineTypeName)) {
              machineTypeSet.add(machineInfo.machineTypeName);
              machineTypes.push({
                id: `type_${index}`,
                machineTypeName: machineInfo.machineTypeName
              });
            }
            
            // 機械番号データを追加
            if (machineInfo.machineNumber && machineInfo.machineTypeName) {
              const key = `${machineInfo.machineNumber}_${machineInfo.machineTypeName}`;
              if (!machineSet.has(key)) {
                machineSet.add(key);
                machines.push({
                  id: `machine_${index}`,
                  machineNumber: machineInfo.machineNumber,
                  machineTypeName: machineInfo.machineTypeName
                });
              }
            }
          }
        });
        
        const result = {
          machineTypes,
          machines
        };
        
        console.log('🔍 機種・機械番号データ取得結果:', result);
        setMachineData(result);
      } else {
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


  const fetchExportHistoryData = async () => {
    try {
      const data = await fetchExportHistory();
      setExportHistory(data);
    } catch (error) {
      console.error('エクスポート履歴の取得に失敗しました:', error);
      setExportHistory([]);
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
    try {
      setReportLoading(true);
      
      // 機械故障報告書形式のレポートデータを生成
      const reportData = {
        reportId: `R${Date.now().toString().slice(-5)}`,
        machineId: filters.machineNumber || 'M98765',
        date: new Date().toISOString().split('T')[0],
        location: '○○線',
        failureCode: 'FC01',
        description: '履歴検索結果による機械故障報告',
        status: '報告完了',
        engineer: 'システム管理者',
        notes: `検索条件:\n機種: ${filters.machineType || '全機種'}\n機械番号: ${filters.machineNumber || '全機械'}\n検索テキスト: ${filters.searchText || 'なし'}\n検索日付: ${filters.searchDate || '全期間'}\n\n検索結果: ${filteredItems.length}件`,
        repairSchedule: '要確認',
        repairLocation: '要確認',
        images: undefined,
        chatHistory: undefined
      };
      
      setMachineFailureReportData(reportData);
      setShowMachineFailureReport(true);
    } catch (error) {
      console.error('レポート生成エラー:', error);
    } finally {
      setReportLoading(false);
    }
  };



  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(`/api/chats/exports/${fileName}`);
      if (!response.ok) {
        throw new Error('チャットエクスポートファイルの取得に失敗しました');
      }
      
      const data = await response.json();
      setSelectedReportData(data);
      setSelectedFileName(fileName);
      setShowReport(true);
    } catch (error) {
      console.error('レポート表示エラー:', error);
    }
  };

  const handleShowMachineFailureReport = (item: SupportHistoryItem) => {
    const jsonInfo = extractJsonInfo(item.jsonData);
    
    const reportData = {
      reportId: `R${item.id.slice(-5).toUpperCase()}`,
      machineId: item.machineNumber || 'M98765',
      date: new Date(item.createdAt).toISOString().split('T')[0],
      location: '○○線',
      failureCode: 'FC01',
      description: jsonInfo.description || '機械故障による応急処置',
      status: '応急処置完了',
      engineer: '担当エンジニア',
      notes: `機種: ${item.machineType}\n機械番号: ${item.machineNumber}\n作成日時: ${new Date(item.createdAt).toLocaleString('ja-JP')}\n${jsonInfo.emergencyMeasures ? `応急処置: ${jsonInfo.emergencyMeasures}` : ''}`,
      repairSchedule: '2025年9月',
      repairLocation: '工場内修理スペース',
      images: item.imagePath ? [{
        id: '1',
        url: item.imagePath,
        fileName: '故障箇所画像',
        description: '機械故障箇所の写真'
      }] : undefined,
      chatHistory: undefined
    };
    
    setMachineFailureReportData(reportData);
    setShowMachineFailureReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportData(null);
    setSelectedFileName('');
  };

  const handleCloseMachineFailureReport = () => {
    setShowMachineFailureReport(false);
    setMachineFailureReportData(null);
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
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>応急処置サポート履歴一覧</h1>
          <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          <p>検索条件: ${filters.machineType || 'すべて'} / ${filters.machineNumber || 'すべて'} / ${filters.searchText || 'なし'} / ${filters.searchDate || 'なし'}</p>
        </div>
        
        <div class="summary">
          <strong>検索結果: ${filteredItems.length}件</strong>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>機種</th>
              <th>機械番号</th>
              <th>タイトル</th>
              <th>説明</th>
              <th>応急処置</th>
              <th>作成日時</th>
              <th>画像</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map((item) => {
              const jsonInfo = extractJsonInfo(item.jsonData);
              return `
                <tr>
                  <td>${item.machineType}</td>
                  <td>${item.machineNumber}</td>
                  <td>${jsonInfo.title}</td>
                  <td>${jsonInfo.description}</td>
                  <td>${jsonInfo.emergencyMeasures}</td>
                  <td>${formatDate(item.createdAt)}</td>
                  <td>${item.imagePath ? 'あり' : 'なし'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">印刷</button>
          <button onclick="window.close()">閉じる</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(tableContent);
    printWindow.document.close();
  };

  const handlePrintReport = (item: SupportHistoryItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const jsonInfo = extractJsonInfo(item.jsonData);
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
            body { margin: 0; }
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
          <h2>故障詳細</h2>
          <div class="content-box">
            <p><strong>説明:</strong> ${jsonInfo.description || '機械故障による応急処置'}</p>
            <p><strong>ステータス:</strong> 応急処置完了</p>
            <p><strong>担当エンジニア:</strong> 担当者</p>
            <p><strong>備考:</strong> 機種: ${item.machineType}, 機械番号: ${item.machineNumber}</p>
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
        
        ${item.imagePath ? `
        <div class="section">
          <h2>故障箇所画像</h2>
          <div class="image-section">
            <p>機械故障箇所の画像</p>
            <img src="${item.imagePath}" alt="故障箇所画像" />
            <p style="font-size: 12px; color: #666;">上記は故障箇所の写真です。</p>
          </div>
        </div>
        ` : ''}
        
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
                onClick={() => setShowReportDialog(true)}
                disabled={filteredItems.length === 0}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                レポート生成
              </Button>
                              <Button
                  onClick={handlePrintTable}
                  disabled={filteredItems.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  故障報告書印刷
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
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">タイトル/種類</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">説明/エクスポート種別</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">応急処置/ファイル名</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">作成日時</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">画像</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      // JSONファイルのデータ構造に合わせて表示
                      const machineInfo = item.machineInfo;
                      const messages = item.chatData?.messages || [];
                      const messageCount = messages.length;
                      
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
                            {machineInfo?.machineTypeName || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {machineInfo?.machineNumber || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={`チャットID: ${item.chatId}`}>
                            チャット履歴 ({messageCount}件)
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={item.exportType}>
                            {item.exportType || 'manual_send'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={item.fileName}>
                            {item.fileName}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{formatDate(item.exportTimestamp)}</td>
                          <td className="border border-gray-300 px-3 py-2">
                            {item.savedImages && item.savedImages.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.savedImages.slice(0, 3).map((image: any, index: number) => (
                                  <img
                                    key={index}
                                    src={image.url}
                                    alt={`画像 ${index + 1}`}
                                    className="w-8 h-8 object-cover rounded border cursor-pointer"
                                    title={image.fileName}
                                    onClick={() => handleShowReport(item.fileName)}
                                  />
                                ))}
                                {item.savedImages.length > 3 && (
                                  <span className="text-xs text-gray-500">+{item.savedImages.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
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


      {/* エクスポート機能エリア */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              エクスポート機能
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportHistory(!showExportHistory)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              エクスポート履歴
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {/* 選択項目一括エクスポート */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleExportSelected('json')}
                disabled={selectedItems.size === 0 || exportLoading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                選択項目をJSONエクスポート ({selectedItems.size}件)
              </Button>
              <Button
                onClick={() => handleExportSelected('csv')}
                disabled={selectedItems.size === 0 || exportLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                選択項目をCSVエクスポート
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

          {/* エクスポート履歴表示 */}
          {showExportHistory && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-2">エクスポート履歴</h4>
              {exportHistory.length === 0 ? (
                <p className="text-sm text-gray-600">エクスポート履歴がありません</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {exportHistory.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{item.filename}</span>
                      <span className="text-gray-500">{new Date(item.exportedAt).toLocaleString('ja-JP')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                    onClick={() => {
                      // ここで保存処理を実装
                      console.log('保存:', editingItem);
                      setShowEditDialog(false);
                    }}
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
        />
      )}

      {/* 機械故障報告書表示 */}
      {showMachineFailureReport && machineFailureReportData && (
        <MachineFailureReport
          data={machineFailureReportData}
          onClose={handleCloseMachineFailureReport}
          onSave={(reportData) => {
            console.log('機械故障報告書を保存:', reportData);
            // 保存後にローカルストレージに保存
            const savedReports = JSON.parse(localStorage.getItem('savedMachineFailureReports') || '[]');
            const newReport = {
              id: Date.now(),
              reportData: reportData,
              savedAt: new Date().toISOString()
            };
            savedReports.push(newReport);
            localStorage.setItem('savedMachineFailureReports', JSON.stringify(savedReports));
            alert('機械故障報告書が保存されました。');
            handleCloseMachineFailureReport();
          }}
          onPrint={(reportData) => {
            console.log('機械故障報告書を印刷:', reportData);
            window.print();
          }}
        />
      )}
    </div>
  );
};

export default HistoryPage;

