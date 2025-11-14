import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
    `${API_BASE}/api/history/item/${name}`,
    `${API_BASE}/api/history/detail/${name}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`エンドポイント ${endpoint} でエラー:`, error);
    }
  }

  throw new Error(`詳細データの取得に失敗しました: ${name}`);
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [machineDataLoading, setMachineDataLoading] = useState(false);
  const [searchFilterLoading, setSearchFilterLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SupportHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [machineData, setMachineData] = useState({
    machineTypes: [] as Array<{ id: string; machineTypeName: string }>,
    machines: [] as Array<{ id: string; machineNumber: string; machineTypeName: string }>,
  });
  const [filters, setFilters] = useState({
    machineType: '',
    machineNumber: '',
    searchText: '',
    searchDate: '',
  });

  // データ初期化
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
        }),
      ]);
    } catch (error) {
      console.error('データ初期化エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 機種・機械番号マスターデータ取得
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);

      // 機種・機械番号データを専用APIから取得
      console.log('🔍 機種・機械番号データ取得開始');
      const { buildApiUrl } = await import('../lib/api');
      const response = await fetch(buildApiUrl('/history/machine-data'));
      console.log('🔍 APIレスポンス:', response.status, response.statusText);
      const data = await response.json();
      console.log('🔍 APIレスポンスデータ:', data);

      if (data.success && data.machineTypes && data.machines) {
        // 機種一覧を構築（重複除去）
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];

        // 機械番号一覧を構築（重複除去）
        const machineNumberSet = new Set<string>();
        const machines: Array<{
          id: string;
          machineNumber: string;
          machineTypeName: string;
        }> = [];

        data.machines.forEach((machine: any) => {
          if (machine.machineTypeName && !machineTypeSet.has(machine.machineTypeName)) {
            machineTypeSet.add(machine.machineTypeName);
            machineTypes.push({
              id: machine.machineTypeName,
              machineTypeName: machine.machineTypeName,
            });
          }

          if (machine.machineNumber && !machineNumberSet.has(machine.machineNumber)) {
            machineNumberSet.add(machine.machineNumber);
            machines.push({
              id: machine.machineNumber,
              machineNumber: machine.machineNumber,
              machineTypeName: machine.machineTypeName,
            });
          }
        });

        // ソート
        machineTypes.sort((a, b) => a.machineTypeName.localeCompare(b.machineTypeName));
        machines.sort((a, b) => a.machineNumber.localeCompare(b.machineNumber));

        setMachineData({
          machineTypes,
          machines,
        });

        console.log('🔍 setMachineData呼び出し完了');
      } else {
        console.warn('機種データの取得に失敗しました:', data);
        setMachineData({
          machineTypes: [],
          machines: [],
        });
      }
    } catch (error) {
      console.error('機種データ取得エラー:', error);
      setMachineData({
        machineTypes: [],
        machines: [],
      });
    } finally {
      setMachineDataLoading(false);
    }
  };

  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('🔍 履歴検索フィルターデータ生成開始');

      // すべての履歴アイテムから機種と機械番号を抽出
      const machineTypes = [...new Set(historyItems.map(item => item.machineType).filter(Boolean))];
      const machineNumbers = [...new Set(historyItems.map(item => item.machineNumber).filter(Boolean))];

      console.log('🔍 検索フィルター生成結果:', {
        machineTypes: machineTypes.length,
        machineNumbers: machineNumbers.length,
      });
    } catch (error) {
      console.error('履歴検索フィルターデータ生成エラー:', error);
    } finally {
      setSearchFilterLoading(false);
    }
  };

  const fetchHistoryData = async (page: number = 1) => {
    try {
      setLoading(true);

      // 機械故障履歴ファイル一覧を取得
      console.log('🔍 機械故障履歴ファイル一覧取得開始');
      const { buildApiUrl } = await import('../lib/api');
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

      if (data.success && data.data) {
        console.log('🔍 取得件数:', data.data.length);

        // 機械故障履歴ファイルを履歴アイテムとして変換
        const historyItems = data.data.map((file: any) => ({
          id: file.id,
          chatId: file.id,
          fileName: file.name,
          title: file.title || file.name,
          machineType: 'Unknown',
          machineNumber: 'Unknown',
          createdAt: file.createdAt,
          lastModified: file.createdAt,
          extractedComponents: [],
          extractedSymptoms: [],
          possibleModels: [],
          machineInfo: `ファイル: ${file.filePath}`,
          description: file.description || '',
          userId: 'system',
          sessionId: file.id,
          conversationData: [],
          tags: [],
          metadata: {
            source: 'history-file',
            originalFile: file.name
          }
        }));

        setHistoryItems(historyItems);
        setFilteredItems(historyItems);
        setCurrentPage(page);
        setTotalPages(Math.ceil(historyItems.length / 20));

        console.log('✅ 履歴データ設定完了:', {
          totalItems: historyItems.length,
          currentPage: page,
          totalPages: Math.ceil(historyItems.length / 20)
        });
      } else {
        console.warn('履歴データが見つかりません:', data);
        setHistoryItems([]);
        setFilteredItems([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('❌ 履歴データ取得エラー:', error);
      setHistoryItems([]);
      setFilteredItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // フィルタリング処理
  useEffect(() => {
    if (!historyItems.length) return;

    let filtered = [...historyItems];

    // 機種フィルター
    if (filters.machineType) {
      filtered = filtered.filter(item =>
        item.machineType === filters.machineType
      );
    }

    // 機械番号フィルター
    if (filters.machineNumber) {
      filtered = filtered.filter(item =>
        item.machineNumber === filters.machineNumber
      );
    }

    // テキスト検索
    if (filters.searchText) {
      const searchTerms = filters.searchText.toLowerCase().split(' ').filter(term => term.trim());
      filtered = filtered.filter(item => {
        const searchableText = [
          item.title,
          typeof item.machineInfo === 'string' ? item.machineInfo : '',
          ...item.extractedComponents,
          ...item.extractedSymptoms,
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // 日付フィルター
    if (filters.searchDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        const searchDate = new Date(filters.searchDate);
        return itemDate.toDateString() === searchDate.toDateString();
      });
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
    setTotalPages(Math.ceil(filtered.length / 20));
  }, [filters, historyItems]); // filtersの変更を監視

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // フィルターはuseEffectで自動的に適用される
    console.log('🔍 検索実行:', filters);
  };

  const handleDeleteHistory = async (id: string, title?: string) => {
    const displayTitle = title || id;
    if (window.confirm(`「${displayTitle}」を削除しますか？\n\nこの操作は取り消せません。関連する画像ファイルも同時に削除されます。`)) {
      try {
        console.log('🗑️ 履歴削除開始:', id);

        // 統一APIを使用して削除リクエスト
        const { buildApiUrl } = await import('../lib/api');
        const response = await fetch(buildApiUrl(`/history/${id}`), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const result = await response.json();

        if (result.success) {
          console.log('✅ 履歴削除成功:', result);

          // 成功メッセージを表示
          alert(`削除が完了しました。\n・JSONファイル: ${result.deletedFile}\n・関連画像: ${result.deletedImages}件`);

          // 一覧を再読み込み
          await fetchHistoryData(currentPage);
        } else {
          throw new Error(result.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('❌ 履歴削除エラー:', error);
        alert(`削除に失敗しました: ${error.message || error}`);
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">履歴管理</h1>
        <p className="text-gray-600 mt-2">
          機械故障履歴の検索、表示、管理を行います。
        </p>
      </div>

      {/* 検索・フィルターセクション */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                機種
              </label>
              <Select
                value={filters.machineType}
                onValueChange={(value) => handleFilterChange('machineType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="すべての機種" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての機種</SelectItem>
                  {machineData.machineTypes.map((type) => (
                    <SelectItem key={type.id} value={type.machineTypeName}>
                      {type.machineTypeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                ※ JSONファイルから機種を取得しています ({machineData.machineTypes.length}件)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                機械番号
              </label>
              <Select
                value={filters.machineNumber}
                onValueChange={(value) => handleFilterChange('machineNumber', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="すべての機械番号" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">すべての機械番号</SelectItem>
                  {machineData.machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.machineNumber}>
                      {machine.machineNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワード検索
              </label>
              <Input
                type="text"
                placeholder="故障内容、部品名など"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 複数のキーワードをスペース区切りで入力すると、すべてのキーワードを含む履歴を検索します
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作成日
              </label>
              <Input
                type="date"
                value={filters.searchDate}
                onChange={(e) => handleFilterChange('searchDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              🔍 検索
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  machineType: '',
                  machineNumber: '',
                  searchText: '',
                  searchDate: '',
                });
              }}
            >
              フィルタークリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>
            機械故障履歴一覧 ({filteredItems.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">読み込み中...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <p>該当する履歴が見つかりません。</p>
                  <p className="text-sm mt-2">検索条件を変更してお試しください。</p>
                </div>
              ) : (
                filteredItems
                  .slice((currentPage - 1) * 20, currentPage * 20)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {item.title}
                        </h3>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {item.machineType}
                          </Badge>
                          <Badge variant="outline">
                            {item.machineNumber}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-2">
                        {typeof item.machineInfo === 'string' ? item.machineInfo : '詳細情報なし'}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          作成日: {new Date(item.createdAt).toLocaleString('ja-JP')}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // 履歴詳細表示の処理
                              console.log('履歴詳細表示:', item.id);
                            }}
                          >
                            詳細
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteHistory(item.id, item.title)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* エクスポート処理 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>エクスポート処理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" disabled={filteredItems.length === 0}>
              選択した履歴をエクスポート
            </Button>
            <Button variant="outline" disabled={filteredItems.length === 0}>
              すべての履歴をエクスポート
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              前へ
            </Button>
            <span className="px-3 py-2 text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
