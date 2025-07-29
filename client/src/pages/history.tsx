
import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";

interface HistoryItem {
  id: string;
  chatId: string;
  title: string;
  description: string;
  machineModel?: string;
  office?: string;
  emergencyGuideTitle?: string;
  emergencyGuideContent?: string;
  images: Array<{
    id: string;
    url: string;
    description?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  category?: string;
  keywords?: string[];
}

interface SearchFilters {
  machineModel: string;
  office: string;
  category: string;
  dateRange: string;
}

const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    machineModel: '',
    office: '',
    category: '',
    dateRange: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // データ取得（サーバーAPIから取得）
  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      
      // サーバーAPIから履歴データを取得
      const response = await fetch('/api/history/list');
      if (response.ok) {
        const data = await response.json();
        setHistoryItems(data.items || []);
        setFilteredItems(data.items || []);
      } else {
        console.warn('履歴データの取得に失敗、モックデータを使用');
        // フォールバック: モックデータ
        const mockData: HistoryItem[] = [
          {
            id: '1',
            chatId: 'chat-001',
            title: 'エンジン停止トラブル',
            description: '走行中に突然エンジンが停止した',
            machineModel: 'MT-100',
            office: '東京事業所',
            emergencyGuideTitle: 'エンジン停止対応',
            emergencyGuideContent: '燃料カットレバーの確認を行う',
            images: [
              { id: 'img1', url: '/knowledge-base/images/emergency-flow-step1.jpg', description: 'エンジンルーム' }
            ],
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
            category: 'エンジン',
            keywords: ['エンジン停止', '燃料カット', 'MT-100']
          }
        ];
        setHistoryItems(mockData);
        setFilteredItems(mockData);
      }
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
    let filtered = historyItems;

    // テキスト検索
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.machineModel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.office?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.emergencyGuideTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.emergencyGuideContent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords?.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 機種フィルタ
    if (filters.machineModel) {
      filtered = filtered.filter(item => item.machineModel === filters.machineModel);
    }

    // 事業所フィルタ
    if (filters.office) {
      filtered = filtered.filter(item => item.office === filters.office);
    }

    // カテゴリフィルタ
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // 日付範囲フィルタ
    if (filters.dateRange) {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case '1day':
          startDate.setDate(now.getDate() - 1);
          break;
        case '1week':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.createdAt) >= startDate);
    }

    setFilteredItems(filtered);
  }, [searchQuery, filters, historyItems]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      machineModel: '',
      office: '',
      category: '',
      dateRange: ''
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
            <Select value={filters.machineModel} onValueChange={(value) => handleFilterChange('machineModel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="機種を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべての機種</SelectItem>
                <SelectItem value="MT-100">MT-100</SelectItem>
                <SelectItem value="MR-400">MR-400</SelectItem>
                <SelectItem value="TC-250">TC-250</SelectItem>
                <SelectItem value="SS-750">SS-750</SelectItem>
              </SelectContent>
            </Select>

            {/* 事業所フィルタ */}
            <Select value={filters.office} onValueChange={(value) => handleFilterChange('office', value)}>
              <SelectTrigger>
                <SelectValue placeholder="事業所を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべての事業所</SelectItem>
                <SelectItem value="東京事業所">東京事業所</SelectItem>
                <SelectItem value="大阪事業所">大阪事業所</SelectItem>
                <SelectItem value="名古屋事業所">名古屋事業所</SelectItem>
                <SelectItem value="福岡事業所">福岡事業所</SelectItem>
              </SelectContent>
            </Select>

            {/* カテゴリフィルタ */}
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべてのカテゴリ</SelectItem>
                <SelectItem value="エンジン">エンジン</SelectItem>
                <SelectItem value="ブレーキ">ブレーキ</SelectItem>
                <SelectItem value="電気系統">電気系統</SelectItem>
                <SelectItem value="油圧系統">油圧系統</SelectItem>
              </SelectContent>
            </Select>

            {/* 日付範囲フィルタ */}
            <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="期間を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべての期間</SelectItem>
                <SelectItem value="1day">過去1日</SelectItem>
                <SelectItem value="1week">過去1週間</SelectItem>
                <SelectItem value="1month">過去1ヶ月</SelectItem>
                <SelectItem value="3months">過去3ヶ月</SelectItem>
              </SelectContent>
            </Select>

            {/* フィルタクリア */}
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              フィルタクリア
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            {filteredItems.length}件の履歴が見つかりました
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
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <Badge variant="secondary">{item.category}</Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{item.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">機種: {item.machineModel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">事業所: {item.office}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">作成日時: {formatDate(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">画像: {item.images.length}枚</span>
                      </div>
                    </div>

                    {/* 応急処置ガイド情報 */}
                    {item.emergencyGuideTitle && (
                      <div className="bg-blue-50 p-3 rounded-md mb-4">
                        <h4 className="font-medium text-blue-900 mb-1">応急処置ガイド</h4>
                        <p className="text-sm text-blue-800">{item.emergencyGuideTitle}</p>
                        {item.emergencyGuideContent && (
                          <p className="text-sm text-blue-700 mt-1">{item.emergencyGuideContent}</p>
                        )}
                      </div>
                    )}

                    {/* キーワード */}
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 画像プレビュー */}
                  {item.images.length > 0 && (
                    <div className="lg:w-64">
                      <h4 className="font-medium mb-2">関連画像</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {item.images.slice(0, 4).map((image) => (
                          <div key={image.id} className="relative">
                            <img
                              src={image.url}
                              alt={image.description || '履歴画像'}
                              className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80"
                              onClick={() => setSelectedItem(item)}
                            />
                          </div>
                        ))}
                        {item.images.length > 4 && (
                          <div className="bg-gray-200 rounded-md flex items-center justify-center h-20 text-sm text-gray-600">
                            +{item.images.length - 4}枚
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    チャットID: {item.chatId}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItem(item)}
                  >
                    詳細を見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 詳細モーダル（簡易実装） */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{selectedItem.title}</h2>
                <Button variant="ghost" onClick={() => setSelectedItem(null)}>×</Button>
              </div>
              
              <div className="space-y-4">
                <p>{selectedItem.description}</p>
                
                {selectedItem.images.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">画像一覧</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedItem.images.map((image) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={image.description || '履歴画像'}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
