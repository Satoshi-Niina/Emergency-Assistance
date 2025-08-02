
import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { SupportHistoryItem, HistorySearchFilters } from '../types/history';
import { fetchHistoryList, deleteHistory } from '../lib/api/history-api';

interface SearchFilters {
  machineType: string;
  machineNumber: string;
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

  // データ取得（サーバーAPIから取得）
  useEffect(() => {
    fetchHistoryData();
  }, []);

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
      setHistoryItems(data.items);
      setFilteredItems(data.items);
      setTotalPages(Math.ceil(data.total / 20));
      setCurrentPage(page);
    } catch (error) {
      console.error('履歴データの取得に失敗しました:', error);
      setHistoryItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 検索とフィルタリング
  useEffect(() => {
    fetchHistoryData(1);
  }, [filters]);

  // フィルター変更時の処理
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
            検索・フィルタ
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
            <Input
              placeholder="機種を入力"
              value={filters.machineType}
              onChange={(e) => handleFilterChange('machineType', e.target.value)}
            />

            {/* 機械番号フィルタ */}
            <Input
              placeholder="機械番号を入力"
              value={filters.machineNumber}
              onChange={(e) => handleFilterChange('machineNumber', e.target.value)}
            />

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
          filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* 基本情報 */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold">応急処置サポート履歴</h3>
                      <div className="flex gap-2">
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
          ))
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

