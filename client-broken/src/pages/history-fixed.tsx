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

  return null;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [machineDataLoading, setMachineDataLoading] = useState(false);
  const [searchFilterLoading, setSearchFilterLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [machineData, setMachineData] = useState<{
    machineTypes: Array<{ id: string; machineTypeName: string }>;
    machines: Array<{
      id: string;
      machineNumber: string;
      machineTypeName: string;
    }>;
  }>({ machineTypes: [], machines: [] });
  const [searchFilterData, setSearchFilterData] = useState<{
    machineTypes: string[];
    machineNumbers: string[];
  }>({ machineTypes: [], machineNumbers: [] });

  // 検索フィルター
  const [filters, setFilters] = useState<HistorySearchFilters>({
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
      const { buildApiUrl } = await import('../lib/api-unified');
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
              machineTypeName: machine.machineTypeName || 'Unknown',
            });
          }
        });

        const result = { machineTypes, machines };
        console.log('🔍 機種・機械番号データ処理完了:', {
          machineTypes: machineTypes.length,
          machines: machines.length,
          machineTypesList: machineTypes.map(mt => mt.machineTypeName),
          machinesList: machines.map(m => `${m.machineNumber} (${m.machineTypeName})`)
        });
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

  // 履歴検索フィルター用データ（履歴データから動的に生成）
  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('🔍 履歴検索フィルターデータ生成開始');

      // 履歴データから動的にフィルターデータを生成
      const allItems = [...historyItems];
      const machineTypes = [...new Set(allItems.map(item => item.machineType).filter(Boolean))];
      const machineNumbers = [...new Set(allItems.map(item => item.machineNumber).filter(Boolean))];

      setSearchFilterData({
        machineTypes,
        machineNumbers,
      });
      
      console.log('🔍 履歴検索フィルターデータ生成完了:', {
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
      const { buildApiUrl } = await import('../lib/api-unified');
      const requestUrl = buildApiUrl('/history/machine-data');
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
          jsonData: {
            id: file.id,
            name: file.name,
            title: file.title || file.name,
            filePath: file.filePath,
            size: file.size,
            createdAt: file.createdAt,
            category: file.category || 'history'
          }
        }));

        setHistoryItems(historyItems);
        setTotalItems(data.total || historyItems.length);
        console.log('🔍 履歴アイテム設定完了:', historyItems.length);
      } else {
        console.log('🔍 データが空またはエラー');
        setHistoryItems([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('🔍 履歴データ取得エラー:', error);
      setHistoryItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // 初期ロード
  useEffect(() => {
    fetchHistoryData(1);
    fetchSearchFilterData(); // 履歴検索用フィルターデータを取得
  }, []); // 初期ロード時のみ実行

  // フィルター変更時の処理
  useEffect(() => {
    // フィルターが変更された時のみ再取得（初期ロード時は除外）
    if (historyItems.length > 0) {
      fetchHistoryData(1);
    }
  }, [filters]); // filtersの変更を監視

  // フィルター変更時の処理
  const handleFilterChange = (key: keyof HistorySearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    fetchHistoryData(1);
  };

  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  const handleDeleteHistory = async (id: string, title?: string) => {
    const displayTitle = title || id;
    if (window.confirm(`「${displayTitle}」を削除しますか？\n\nこの操作は取り消せません。関連する画像ファイルも同時に削除されます。`)) {
      try {
        console.log('🗑️ 履歴削除開始:', id);
        
        // 統一APIを使用して削除リクエスト
        const { buildApiUrl } = await import('../lib/api-unified');
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
              <p className="text-xs text-gray-500 mt-1">
                ※ JSONファイルから機械番号を取得しています ({machineData.machines.length}件)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                キーワード検索
              </label>
              <Input
                placeholder="キーワードを入力"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 複数のキーワードをスペース区切りで入力すると、すべてのキーワードを含む履歴を検索します
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付検索
              </label>
              <Input
                type="date"
                value={filters.searchDate}
                onChange={(e) => handleFilterChange('searchDate', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 指定した日付の履歴を検索します
              </p>
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
            機械故障履歴一覧 ({historyItems.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-600">履歴データを読み込み中...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center p-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  履歴データがありません
                </h3>
                <p className="text-gray-600 mb-4">
                  機械故障履歴ファイルが見つかりません。
                </p>
                <Button onClick={() => fetchHistoryData(1)}>
                  再読み込み
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 mt-1">{item.machineInfo}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{item.machineType}</Badge>
                        <Badge variant="outline">{item.machineNumber}</Badge>
                        <Badge variant="outline">
                          {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                        </Badge>
                      </div>
                    </div>
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
              ))}
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
            <Button variant="outline" disabled={selectedItems.length === 0}>
              選択履歴をJSONエクスポート ({selectedItems.length})
            </Button>
            <Button variant="outline" disabled={selectedItems.length === 0}>
              選択履歴をCSVエクスポート ({selectedItems.length})
            </Button>
            <Button variant="outline" disabled={selectedItems.length === 0}>
              選択の一覧を印刷 ({selectedItems.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
