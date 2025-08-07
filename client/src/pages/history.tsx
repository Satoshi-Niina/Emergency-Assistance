
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
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
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
      const data = await fetchMachineData();
      setMachineData(data || { machineTypes: [], machines: [] });
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
      
      const searchFilters: HistorySearchFilters = {
        limit: 20,
        offset: (page - 1) * 20
      };
      
      if (filters.machineType) searchFilters.machineType = filters.machineType;
      if (filters.machineNumber) searchFilters.machineNumber = filters.machineNumber;
      if (filters.searchText) searchFilters.searchText = filters.searchText;
      if (filters.searchDate) searchFilters.searchDate = filters.searchDate;
      
      const data = await fetchHistoryList(searchFilters);
      setHistoryItems(data?.items || []);
      setFilteredItems(data?.items || []);
      setTotalPages(Math.ceil((data?.total || 0) / 20));
      setCurrentPage(page);
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
    fetchHistoryData(1);
  }, [filters]);

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
      const blob = await generateReport(filters, reportTitle, reportDescription);
      downloadFile(blob, `report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowReportDialog(false);
      setReportTitle('');
      setReportDescription('');
    } catch (error) {
      console.error('レポート生成エラー:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePreviewReport = async () => {
    try {
      setReportLoading(true);
      
      // プレビューデータを構築
      const previewData = {
        title: reportTitle || '履歴検索レポート',
        description: reportDescription || '',
        generatedAt: new Date().toISOString(),
        searchFilters: filters,
        totalCount: filteredItems.length,
        items: filteredItems.map(item => ({
          id: item.id,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
          createdAt: item.createdAt,
          jsonData: item.jsonData,
          imagePath: item.imagePath
        }))
      };
      
      setReportData(previewData);
      setShowReportPreview(true);
    } catch (error) {
      console.error('レポートプレビューエラー:', error);
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

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportData(null);
    setSelectedFileName('');
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
        <title>履歴レポート - 印刷</title>
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
          <h1>応急処置サポート履歴レポート</h1>
          <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="section">
          <h2>基本情報</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>機種</strong>
              ${item.machineType}
            </div>
            <div class="info-item">
              <strong>機械番号</strong>
              ${item.machineNumber}
            </div>
            <div class="info-item">
              <strong>作成日時</strong>
              ${formatDate(item.createdAt)}
            </div>
            <div class="info-item">
              <strong>画像</strong>
              ${item.imagePath ? 'あり' : 'なし'}
            </div>
          </div>
        </div>
        
        ${jsonInfo.title ? `
        <div class="section">
          <h2>タイトル</h2>
          <div class="content-box">
            ${jsonInfo.title}
          </div>
        </div>
        ` : ''}
        
        ${jsonInfo.description ? `
        <div class="section">
          <h2>説明</h2>
          <div class="content-box">
            ${jsonInfo.description}
          </div>
        </div>
        ` : ''}
        
        ${jsonInfo.emergencyMeasures ? `
        <div class="section">
          <h2>応急処置</h2>
          <div class="content-box">
            ${jsonInfo.emergencyMeasures}
          </div>
        </div>
        ` : ''}
        
        ${item.imagePath ? `
        <div class="section">
          <h2>関連画像</h2>
          <div class="image-section">
            <img src="${item.imagePath}" alt="履歴画像" />
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <h2>詳細データ</h2>
          <div class="content-box">
            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${JSON.stringify(item.jsonData, null, 2)}</pre>
          </div>
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
              <Input
                placeholder="タイトル、機種、事業所、応急処置内容などで検索..."
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                className="w-full"
              />
            </div>

            {/* 日付検索 */}
            <div>
              <Input
                type="date"
                value={filters.searchDate}
                onChange={(e) => handleFilterChange('searchDate', e.target.value)}
                className="w-full"
              />
            </div>

            {/* 機種フィルタ */}
            <Select
              value={filters.machineType || "all"}
              onValueChange={(value) => handleFilterChange('machineType', value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="機種を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての機種</SelectItem>
                {machineData.machineTypes && machineData.machineTypes.length > 0 && machineData.machineTypes.map((type) => (
                  <SelectItem key={type.id} value={type.machineTypeName}>
                    {type.machineTypeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 機械番号フィルタ */}
            <Select
              value={filters.machineNumber || "all"}
              onValueChange={(value) => handleFilterChange('machineNumber', value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="機械番号を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての機械番号</SelectItem>
                {machineData.machines && machineData.machines.length > 0 && machineData.machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.machineNumber}>
                    {machine.machineNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              履歴一覧 ({filteredItems.length}件)
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
                テーブル印刷
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
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">編集</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      // チャットエクスポートファイルの場合
                      if (item.type === 'chat_export') {
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
                              {item.machineInfo?.machineTypeName || 'チャットエクスポート'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm">
                              {item.machineInfo?.machineNumber || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={`チャットID: ${item.chatId}`}>
                              チャットエクスポート ({item.messageCount}件)
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={item.exportType}>
                              {item.exportType}
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
                            <td className="border border-gray-300 px-3 py-2">
                              <span className="text-gray-500 text-xs">読み取り専用</span>
                            </td>
                          </tr>
                        );
                      }
                      
                      // 通常の履歴アイテムの場合
                      const jsonInfo = extractJsonInfo(item.jsonData);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
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
                          <td className="border border-gray-300 px-3 py-2 text-sm">{item.machineType}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{item.machineNumber}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={jsonInfo.title}>
                            {jsonInfo.title}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={jsonInfo.description}>
                            {jsonInfo.description}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={jsonInfo.emergencyMeasures}>
                            {jsonInfo.emergencyMeasures}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{formatDate(item.createdAt)}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {item.imagePath ? (
                              <div className="flex items-center gap-1">
                                <Image className="h-4 w-4 text-green-500" />
                                <span>あり</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">なし</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPreviewItem(item);
                                setShowPreviewDialog(true);
                              }}
                              className="text-xs px-2 py-1"
                            >
                              <FileText className="h-3 w-3" />
                              プレビュー
                            </Button>
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item);
                                setShowEditDialog(true);
                              }}
                              className="text-xs px-2 py-1"
                            >
                              <Settings className="h-3 w-3" />
                              編集
                            </Button>
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

      {/* レポート生成ダイアログ */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">レポート生成</h2>
                <Button variant="ghost" onClick={() => setShowReportDialog(false)}>×</Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">レポートタイトル</label>
                  <Input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="履歴検索レポート"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">レポート説明</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="レポートの説明を入力してください"
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>検索条件:</p>
                  <ul className="list-disc list-inside ml-2">
                    {filters.machineType && <li>機種: {filters.machineType}</li>}
                    {filters.machineNumber && <li>機械番号: {filters.machineNumber}</li>}
                    {filters.searchText && <li>検索テキスト: {filters.searchText}</li>}
                    {filters.searchDate && <li>検索日付: {filters.searchDate}</li>}
                  </ul>
                  <p className="mt-2">検索結果: {filteredItems.length}件</p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowReportDialog(false)}
                    disabled={reportLoading}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handlePreviewReport}
                    disabled={reportLoading}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    {reportLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        生成中...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        プレビュー
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={reportLoading}
                    className="flex items-center gap-2"
                  >
                    {reportLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        生成中...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4" />
                        レポート生成
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* レポートプレビューダイアログ */}
      {showReportPreview && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">レポートプレビュー</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGenerateReport()}
                    disabled={reportLoading}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    レポート生成
                  </Button>
                  <Button variant="ghost" onClick={() => setShowReportPreview(false)}>×</Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* レポートヘッダー */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">{reportData.title}</h1>
                  {reportData.description && (
                    <p className="text-gray-600 mb-2">{reportData.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    生成日時: {new Date(reportData.generatedAt).toLocaleString('ja-JP')}
                  </p>
                  <p className="text-sm text-gray-500">検索結果: {reportData.totalCount}件</p>
                </div>

                {/* 検索条件 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">検索条件</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <ul className="space-y-1">
                      {reportData.searchFilters.machineType && (
                        <li>機種: {reportData.searchFilters.machineType}</li>
                      )}
                      {reportData.searchFilters.machineNumber && (
                        <li>機械番号: {reportData.searchFilters.machineNumber}</li>
                      )}
                      {reportData.searchFilters.searchText && (
                        <li>検索テキスト: {reportData.searchFilters.searchText}</li>
                      )}
                      {reportData.searchFilters.searchDate && (
                        <li>検索日付: {reportData.searchFilters.searchDate}</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* 検索結果一覧 */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">検索結果一覧</h3>
                  <div className="space-y-4">
                    {reportData.items.map((item: any, index: number) => {
                      const jsonInfo = extractJsonInfo(item.jsonData);
                      return (
                        <div key={item.id} className="border rounded-md p-4">
                          <h4 className="font-medium mb-2">
                            {index + 1}. {item.machineType} - {item.machineNumber}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>作成日時:</strong> {formatDate(item.createdAt)}</p>
                              {jsonInfo.title && <p><strong>タイトル:</strong> {jsonInfo.title}</p>}
                              {jsonInfo.description && <p><strong>説明:</strong> {jsonInfo.description}</p>}
                            </div>
                            <div>
                              {jsonInfo.emergencyMeasures && (
                                <p><strong>応急処置:</strong> {jsonInfo.emergencyMeasures}</p>
                              )}
                              {item.imagePath && <p><strong>画像:</strong> あり</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
    </div>
  );
};

export default HistoryPage;

