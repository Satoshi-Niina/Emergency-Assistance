
import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, CheckSquare, Square, FileDown, History } from 'lucide-react';
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
  fetchExportHistory 
} from '../lib/api/history-api';

interface SearchFilters {
  machineType: string;
  machineNumber: string;
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
    machineNumber: ''
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

  // 機種・機械番号マスターデータ
  const [machineData, setMachineData] = useState<MachineData>({ 
    machineTypes: [], 
    machines: [] 
  });
  const [machineDataLoading, setMachineDataLoading] = useState(false);

  // データ取得（サーバーAPIから取得）
  useEffect(() => {
    fetchHistoryData();
    fetchMachineDataFromAPI();
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

  // 検索実行
  const handleSearch = () => {
    fetchHistoryData(1);
  };

  // ページネーション
  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  // 履歴削除
  const handleDeleteHistory = async (id: string) => {
    if (window.confirm('この履歴を削除しますか？')) {
      try {
        await deleteHistory(id);
        fetchHistoryData(currentPage);
      } catch (error) {
        console.error('履歴削除に失敗しました:', error);
        alert('履歴の削除に失敗しました');
      }
    }
  };

  // PDFエクスポート
  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      const response = await fetch(`/api/history/${item.id}/export-pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `support_history_${item.machineType}_${item.machineNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('PDFエクスポートに失敗しました:', error);
      alert('PDFエクスポートに失敗しました');
    }
  };

  // エクスポート履歴取得
  useEffect(() => {
    fetchExportHistoryData();
  }, []);

  const fetchExportHistoryData = async () => {
    try {
      const data = await fetchExportHistory();
      setExportHistory(data || []);
    } catch (error) {
      console.error('エクスポート履歴の取得に失敗しました:', error);
      setExportHistory([]);
    }
  };

  // 選択状態の管理
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

  // ファイルダウンロード用ヘルパー関数
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

  // 個別エクスポート
  const handleExportItem = async (item: SupportHistoryItem, format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportHistoryItem(item.id, format);
      const filename = `emergency_support_${item.machineType}_${item.machineNumber}_${new Date().toISOString().split('T')[0]}.${format}`;
      downloadFile(blob, filename);
      await fetchExportHistoryData(); // エクスポート履歴を更新
    } catch (error) {
      console.error('エクスポートに失敗しました:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  // 選択項目一括エクスポート
  const handleExportSelected = async (format: 'json' | 'csv' = 'json') => {
    if (selectedItems.size === 0) {
      alert('エクスポートする項目を選択してください');
      return;
    }

    try {
      setExportLoading(true);
      const blob = await exportSelectedHistory(Array.from(selectedItems), format);
      const filename = `emergency_support_selected_${new Date().toISOString().split('T')[0]}.${format}`;
      downloadFile(blob, filename);
      await fetchExportHistoryData();
    } catch (error) {
      console.error('一括エクスポートに失敗しました:', error);
      alert('一括エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  // 全履歴エクスポート
  const handleExportAll = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportAllHistory(filters, format);
      const filename = `emergency_support_all_${new Date().toISOString().split('T')[0]}.${format}`;
      downloadFile(blob, filename);
      await fetchExportHistoryData();
    } catch (error) {
      console.error('全エクスポートに失敗しました:', error);
      alert('全エクスポートに失敗しました');
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      machineType: '',
      machineNumber: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

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
            検索フィルタ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* テキスト検索 */}
            <div className="lg:col-span-3">
              <Input
                placeholder="タイトル、機種、事業所、応急処置内容などで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                    {machine.machineNumber} ({machine.machineTypeName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 検索ボタン */}
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              検索
            </Button>

            {/* フィルタクリア */}
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              フィルタクリア
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {filteredItems.length}件の履歴が見つかりました (全{totalPages}ページ)
          </div>
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

      {/* 履歴一覧 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">条件に一致する履歴が見つかりませんでした</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 全選択ヘッダー */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
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
              </CardContent>
            </Card>

            {/* 履歴アイテム */}
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* 選択チェックボックス */}
                    <div className="flex items-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectItem(item.id)}
                        className="p-1"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </Button>
                    </div>

                    {/* 基本情報 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold">応急処置サポート履歴</h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportItem(item, 'json')}
                            disabled={exportLoading}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            JSON
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportItem(item, 'csv')}
                            disabled={exportLoading}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            CSV
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportPDF(item)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteHistory(item.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            削除
                          </Button>
                        </div>
                      </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">機種: {item.machineType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">機械番号: {item.machineNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">作成日時: {formatDate(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">画像: {item.imagePath ? 'あり' : 'なし'}</span>
                      </div>
                    </div>

                    {/* JSONデータの表示 */}
                    <div className="bg-gray-50 p-3 rounded-md mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">データ内容</h4>
                      <pre className="text-xs text-gray-700 overflow-auto max-h-32">
                        {JSON.stringify(item.jsonData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* 画像プレビュー */}
                  {item.imagePath && (
                    <div className="lg:w-64">
                      <h4 className="font-medium mb-2">関連画像</h4>
                      <div className="relative">
                        <img
                          src={item.imagePath}
                          alt="履歴画像"
                          className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedItem(item)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </>
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

      {/* 詳細モーダル（簡易実装） */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">応急処置サポート履歴詳細</h2>
                <Button variant="ghost" onClick={() => setSelectedItem(null)}>×</Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">基本情報</h3>
                    <p><strong>機種:</strong> {selectedItem.machineType}</p>
                    <p><strong>機械番号:</strong> {selectedItem.machineNumber}</p>
                    <p><strong>作成日時:</strong> {formatDate(selectedItem.createdAt)}</p>
                  </div>
                  
                  {selectedItem.imagePath && (
                    <div>
                      <h3 className="font-medium mb-2">関連画像</h3>
                      <img
                        src={selectedItem.imagePath}
                        alt="履歴画像"
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">データ内容</h3>
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-64">
                    {JSON.stringify(selectedItem.jsonData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;

