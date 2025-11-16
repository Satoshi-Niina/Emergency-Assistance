import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
import {
  Settings,
  FileText,
  Image as ImageIcon,
  MapPin,
  Upload,
  X,
  Printer,
  Save,
} from 'lucide-react';
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(null);
  const [originalEditingItem, setOriginalEditingItem] = useState<SupportHistoryItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

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
      console.log('🔍 履歴検索フィルターデータ生成開始（jsonDataから）');

      // すべての履歴アイテムから機種と機械番号を抽出（jsonDataも含む）
      const machineTypeSet = new Set<string>();
      const machineNumberSet = new Set<string>();

      historyItems.forEach(item => {
        // 機種を抽出
        const machineType = item.machineType || item.jsonData?.machineType || '';
        if (machineType) {
          machineTypeSet.add(machineType);
        }

        // 機械番号を抽出
        const machineNumber = item.machineNumber || item.jsonData?.machineNumber || '';
        if (machineNumber) {
          machineNumberSet.add(machineNumber);
        }
      });

      const machineTypes = Array.from(machineTypeSet).sort();
      const machineNumbers = Array.from(machineNumberSet).sort();

      // マスターデータを更新（jsonDataから抽出したデータを使用）
      setMachineData({
        machineTypes: machineTypes.map((name, index) => ({
          id: `json-${index}`,
          machineTypeName: name,
        })),
        machines: machineNumbers.map((number, index) => ({
          id: `json-${index}`,
          machineNumber: number,
          machineTypeName: '', // jsonDataからは機種名の関連付けが難しいため空
        })),
      });

      console.log('🔍 検索フィルター生成結果（jsonDataから）:', {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ APIエラーレスポンス:', response.status, errorText);
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

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

      // レスポンスが配列の場合（後方互換性）
      let items: any[] = [];

      if (Array.isArray(data)) {
        items = data;
        console.log('🔍 レスポンスは配列形式:', items.length, '件');
      } else if (data && data.success && Array.isArray(data.data)) {
        items = data.data;
        console.log('🔍 レスポンスはsuccess形式:', items.length, '件');
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
        console.log('🔍 レスポンスはdata配列形式:', items.length, '件');
      } else if (data && data.items && Array.isArray(data.items)) {
        items = data.items;
        console.log('🔍 レスポンスはitems配列形式:', items.length, '件');
      } else {
        console.warn('🔍 予期しないレスポンス形式:', data);
        items = [];
      }

      console.log('🔍 最終的な取得件数:', items.length);
      console.log('🔍 最初のアイテム:', items[0]);

      // データを変換（空配列でも処理を続行）
      const historyItems = items.map((file: any) => ({
        id: file.id || file.chatId,
        chatId: file.chatId || file.id,
        fileName: file.fileName || file.name || `${file.title}_${file.id}.json`,
        title: file.title || '故障履歴',
        machineType: file.machineType || file.machineInfo?.machineTypeName || 'Unknown',
        machineNumber: file.machineNumber || file.machineInfo?.machineNumber || 'Unknown',
        createdAt: file.createdAt || file.exportTimestamp || new Date().toISOString(),
        lastModified: file.updatedAt || file.createdAt || file.exportTimestamp || new Date().toISOString(),
        extractedComponents: file.extractedComponents || file.keywords || [],
        extractedSymptoms: file.extractedSymptoms || [],
        possibleModels: file.possibleModels || [],
        machineInfo: file.machineInfo || {
          machineTypeName: file.machineType,
          machineNumber: file.machineNumber,
        },
        description: file.description || file.problemDescription || '',
        userId: file.userId || 'system',
        sessionId: file.chatId || file.id,
        conversationData: file.conversationHistory || [],
        tags: file.tags || [],
        images: file.images || file.savedImages || [],
        jsonData: file.jsonData || {
          title: file.title,
          problemDescription: file.description || file.problemDescription,
          machineType: file.machineType,
          machineNumber: file.machineNumber,
          conversationHistory: file.conversationHistory || [],
          savedImages: file.savedImages || file.images || [],
          metadata: file.metadata || {},
        },
        metadata: {
          source: 'history-file',
          originalFile: file.fileName || file.name,
          ...file.metadata,
        }
      }));

      setHistoryItems(historyItems);
      setFilteredItems(historyItems);
      setCurrentPage(page);
      setTotalPages(Math.max(1, Math.ceil(historyItems.length / 20)));

      console.log('✅ 履歴データ設定完了:', {
        totalItems: historyItems.length,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(historyItems.length / 20)),
        firstItem: historyItems[0]
      });
    } catch (error) {
      console.error('❌ 履歴データ取得エラー:', error);
      setHistoryItems([]);
      setFilteredItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    console.log('🔍 コンポーネントマウント - データ初期化開始');
    initializeData();
  }, []);

  // 履歴データが読み込まれたら、jsonDataから検索フィルターデータを生成
  useEffect(() => {
    if (historyItems.length > 0) {
      fetchSearchFilterData();
    }
  }, [historyItems]);

  // フィルタリング処理（jsonDataから検索）
  useEffect(() => {
    if (!historyItems.length) return;

    let filtered = [...historyItems];

    // 機種フィルター（jsonDataも検索対象）
    if (filters.machineType && filters.machineType !== 'all') {
      filtered = filtered.filter(item => {
        const itemMachineType = item.machineType || item.jsonData?.machineType || '';
        return itemMachineType === filters.machineType;
      });
    }

    // 機械番号フィルター（jsonDataも検索対象）
    if (filters.machineNumber && filters.machineNumber !== 'all') {
      filtered = filtered.filter(item => {
        const itemMachineNumber = item.machineNumber || item.jsonData?.machineNumber || '';
        return itemMachineNumber === filters.machineNumber;
      });
    }

    // テキスト検索（jsonData内のすべてのフィールドを検索対象）
    if (filters.searchText) {
      const searchTerms = filters.searchText.toLowerCase().split(' ').filter(term => term.trim());
      filtered = filtered.filter(item => {
        const jsonData = item.jsonData || {};

        // 検索対象となるテキストを収集
        const searchableText = [
          item.title,
          jsonData.title,
          jsonData.question,
          jsonData.problemDescription,
          jsonData.answer,
          jsonData.remarks,
          jsonData.location,
          jsonData.status,
          ...(Array.isArray(jsonData.extractedComponents) ? jsonData.extractedComponents : []),
          ...(Array.isArray(jsonData.extractedSymptoms) ? jsonData.extractedSymptoms : []),
          ...(Array.isArray(jsonData.possibleModels) ? jsonData.possibleModels : []),
          ...(Array.isArray(item.extractedComponents) ? item.extractedComponents : []),
          ...(Array.isArray(item.extractedSymptoms) ? item.extractedSymptoms : []),
          ...(Array.isArray(item.possibleModels) ? item.possibleModels : []),
          item.machineType,
          item.machineNumber,
          jsonData.machineType,
          jsonData.machineNumber,
        ]
          .filter(Boolean)
          .map(text => String(text))
          .join(' ')
          .toLowerCase();

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

  // ファイル名からタイトル部分のみを抽出
  const getDisplayFileName = (fileName: string | undefined, title: string | undefined): string => {
    if (title) return title;
    if (!fileName) return '無題';
    // ファイル名から最初のアンダースコアまでの部分（タイトル部分）を取得
    const titleMatch = fileName.match(/^([^_]+)/);
    return titleMatch ? titleMatch[1] : fileName;
  };

  // 履歴アイテムの編集データをサーバーに保存
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編集された履歴アイテムを保存', editedItem);

      // IDの確認と準備
      let itemId = editedItem.id || editedItem.chatId;
      if (!itemId) {
        alert('アイテムIDが見つかりません。保存できません。');
        return;
      }

      // export_プレフィックスがある場合は除去
      if (itemId.startsWith('export_')) {
        itemId = itemId.replace('export_', '');
        if (itemId.endsWith('.json')) {
          itemId = itemId.replace('.json', '');
        }
        const parts = itemId.split('_');
        if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
          itemId = parts[1];
        }
      }

      // 更新データの準備
      const updatePayload = {
        updatedData: {
          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          ...(editedItem.jsonData?.problemDescription && { problemDescription: editedItem.jsonData.problemDescription }),
          ...(editedItem.jsonData?.answer && { answer: editedItem.jsonData.answer }),
          ...(editedItem.jsonData?.machineType && { machineType: editedItem.jsonData.machineType }),
          ...(editedItem.jsonData?.machineNumber && { machineNumber: editedItem.jsonData.machineNumber }),
          ...(editedItem.jsonData?.repairSchedule && { repairSchedule: editedItem.jsonData.repairSchedule }),
          ...(editedItem.jsonData?.location && { location: editedItem.jsonData.location }),
          ...(editedItem.jsonData?.status && { status: editedItem.jsonData.status }),
          ...(editedItem.jsonData?.remarks && { remarks: editedItem.jsonData.remarks }),
          ...(editedItem.jsonData?.savedImages && { savedImages: editedItem.jsonData.savedImages }),
          ...(editedItem.machineType && { machineType: editedItem.machineType }),
          ...(editedItem.machineNumber && { machineNumber: editedItem.machineNumber }),
          ...(editedItem.jsonData?.title && { title: editedItem.jsonData.title }),
          lastModified: new Date().toISOString(),
        },
        updatedBy: 'user',
      };

      // サーバーに更新リクエストを送信
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
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
      console.log('履歴更新完了', result);

      // 履歴リストの該当アイテムを更新
      const updatedItem = {
        ...editedItem,
        jsonData: editedItem.jsonData,
        lastModified: new Date().toISOString(),
        machineType: editedItem.jsonData?.machineType || editedItem.machineType,
        machineNumber: editedItem.jsonData?.machineNumber || editedItem.machineNumber,
        title: editedItem.jsonData?.title || editedItem.title,
        incidentTitle: editedItem.jsonData?.title || editedItem.incidentTitle,
        savedImages: editedItem.jsonData?.savedImages || [],
      };

      setHistoryItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? updatedItem
            : item
        )
      );

      setFilteredItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? updatedItem
            : item
        )
      );

      // 成功通知
      alert('履歴が正常に更新され、元のファイルに上書き保存されました。');

      // 編集ダイアログを閉じる
      setShowEditDialog(false);
      setEditingItem(null);
      setOriginalEditingItem(null);

      // 一覧を再読み込み
      fetchHistoryData(currentPage);
    } catch (error) {
      console.error('履歴保存エラー:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert('履歴の保存に失敗しました: ' + errorMessage);
    }
  };

  // 編集データが変更されているかチェック
  const hasChanges = (current: SupportHistoryItem | null, original: SupportHistoryItem | null): boolean => {
    if (!current || !original) return false;

    // 基本情報の比較
    if (current.machineType !== original.machineType) return true;
    if (current.machineNumber !== original.machineNumber) return true;

    // jsonDataの比較
    const currentJson = current.jsonData || {};
    const originalJson = original.jsonData || {};

    if (currentJson.title !== originalJson.title) return true;
    if (currentJson.question !== originalJson.question) return true;
    if (currentJson.problemDescription !== originalJson.problemDescription) return true;
    if (currentJson.answer !== originalJson.answer) return true;
    if (currentJson.location !== originalJson.location) return true;
    if (currentJson.repairSchedule !== originalJson.repairSchedule) return true;
    if (currentJson.remarks !== originalJson.remarks) return true;

    // savedImagesの比較（配列の長さと内容）
    const currentImages = currentJson.savedImages || [];
    const originalImages = originalJson.savedImages || [];
    if (currentImages.length !== originalImages.length) return true;

    // 画像の内容を比較（簡易版：ファイル名で比較）
    const currentImageNames = currentImages.map((img: any) =>
      typeof img === 'string' ? img : (img.fileName || img.url || img.path || '')
    ).sort();
    const originalImageNames = originalImages.map((img: any) =>
      typeof img === 'string' ? img : (img.fileName || img.url || img.path || '')
    ).sort();
    if (JSON.stringify(currentImageNames) !== JSON.stringify(originalImageNames)) return true;

    return false;
  };

  // 編集ダイアログを閉じる（変更チェック付き）
  const handleCloseEditDialog = () => {
    if (hasChanges(editingItem, originalEditingItem)) {
      if (window.confirm('編集内容を破棄しますか？')) {
        setShowEditDialog(false);
        setEditingItem(null);
        setOriginalEditingItem(null);
      }
    } else {
      // 変更がない場合はそのまま閉じる
      setShowEditDialog(false);
      setEditingItem(null);
      setOriginalEditingItem(null);
    }
  };

  // 編集画面の印刷プレビュー
  const handlePrintEditReport = (item: SupportHistoryItem) => {
    console.log('🖨️ 編集画面から印刷レポートを開きます', item);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('❌ 印刷ウィンドウを開けませんでした');
      alert('印刷ウィンドウを開けませんでした。ポップアップブロッカーを無効にしてください。');
      return;
    }

    // jsonDataの取得を確実にする
    let jsonData = item.jsonData;
    if (typeof jsonData === 'string') {
      try {
        jsonData = JSON.parse(jsonData);
      } catch (e) {
        console.error('JSONデータのパースに失敗', e);
        jsonData = {};
      }
    }

    // 事象タイトルを取得
    let incidentTitle = item.jsonData?.title || item.jsonData?.question || '';
    if (!incidentTitle || incidentTitle.trim() === '') {
      if (item.fileName) {
        const firstUnderscoreIndex = item.fileName.indexOf('_');
        if (firstUnderscoreIndex > 0) {
          incidentTitle = item.fileName.substring(0, firstUnderscoreIndex);
        } else {
          incidentTitle = item.fileName.replace(/\.json$/, '');
        }
      }
    }

    // 事象説明を取得
    let problemDescription = item.jsonData?.problemDescription || item.jsonData?.answer || '';
    if (!problemDescription && jsonData?.chatData?.messages) {
      const userMessages = jsonData.chatData.messages
        .filter((msg: any) => !msg.isAiResponse && msg.content && !msg.content.startsWith('data:image/') && !msg.content.startsWith('/api/images/'))
        .map((msg: any) => msg.content)
        .join('\n');
      if (userMessages) {
        problemDescription = userMessages;
      }
    }
    if (!problemDescription) {
      problemDescription = '説明なし';
    }

    // 機種と機械番号を取得
    const machineType = item.jsonData?.machineType || jsonData?.machineType || item.machineType || '';
    const machineNumber = item.jsonData?.machineNumber || jsonData?.machineNumber || item.machineNumber || '';
    const location = item.jsonData?.location || jsonData?.location || '○○線';

    // 画像URLを取得
    let imageUrl = '';
    let imageFileName = '';

    // savedImagesから画像を取得（最優先）
    if (jsonData?.savedImages && Array.isArray(jsonData.savedImages) && jsonData.savedImages.length > 0) {
      const firstImage = jsonData.savedImages[0];
      const imgUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage.path || firstImage.fileName);
      if (imgUrl && !imgUrl.startsWith('data:image/')) {
        if (imgUrl.startsWith('http')) {
          imageUrl = imgUrl;
        } else if (imgUrl.startsWith('/')) {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          const path = imgUrl.startsWith('/api') ? imgUrl : `/api${imgUrl}`;
          imageUrl = `${baseUrl}${path}`;
        } else {
          const imagePath = `/api/images/chat-exports/${imgUrl}`;
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${imagePath}`;
        }
        imageFileName = typeof firstImage === 'object' ? firstImage.fileName || `故障画像_${item.id}` : `故障画像_${item.id}`;
      }
    }

    // images配列からも取得
    if (!imageUrl && item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      const imgUrl = typeof firstImage === 'string' ? firstImage : (firstImage.url || firstImage.path || firstImage.fileName);
      if (imgUrl && !imgUrl.startsWith('data:image/')) {
        if (imgUrl.startsWith('http')) {
          imageUrl = imgUrl;
        } else {
          const imagePath = `/api/images/chat-exports/${imgUrl}`;
          let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
          imageUrl = `${baseUrl}${imagePath}`;
        }
        imageFileName = `故障画像_${item.id}`;
      }
    }

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
            .content-box {
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
              <strong>機種</strong>
              ${machineType || '-'}
            </div>
            <div class="info-item">
              <strong>機械番号</strong>
              ${machineNumber || '-'}
            </div>
            <div class="info-item">
              <strong>日付</strong>
              ${item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ${location || '-'}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>故障詳細</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>事象タイトル</strong>
              ${incidentTitle || '-'}
            </div>
            <div class="info-item">
              <strong>ステータス</strong>
              ${item.jsonData?.status || '-'}
            </div>
          </div>
          <div class="content-box">
            <strong>説明</strong>
            <p>${problemDescription || '説明なし'}</p>
          </div>
          <div class="content-box">
            <strong>備考</strong>
            <p>${item.jsonData?.remarks || jsonData?.remarks || '-'}</p>
          </div>
        </div>

        ${imageUrl
        ? `
        <div class="section">
          <h2>故障箇所の画像</h2>
          <div class="image-section">
            <p>機械故障箇所の画像</p>
            <img src="${imageUrl}" alt="故障箇所の画像" />
            <p style="font-size: 12px; color: #666;">上記の故障箇所の写真です。</p>
          </div>
        </div>
        `
        : ''
      }

        <div class="section">
          <h2>修繕計画</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>予定月日</strong>
              ${item.jsonData?.repairSchedule || jsonData?.repairSchedule || '-'}
            </div>
            <div class="info-item">
              <strong>場所</strong>
              ${item.jsonData?.location || jsonData?.location || '-'}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>記事欄</h2>
          <div class="content-box">
            <p>${item.jsonData?.remarks || jsonData?.remarks || '記載なし'}</p>
          </div>
        </div>

        <div class="section">
          <p style="text-align: center; color: #666; font-size: 12px;">
            © 2025 機械故障報告書. All rights reserved.
          </p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">印刷</button>
          <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">閉じる</button>
        </div>
      </body>
      </html>
    `;

    try {
      printWindow.document.write(reportContent);
      printWindow.document.close();
    } catch (writeError) {
      console.error('❌ document.write()でエラー:', writeError);
      try {
        printWindow.document.open();
        printWindow.document.write(reportContent);
        printWindow.document.close();
      } catch (innerError) {
        console.error('❌ 代替方法でもエラー:', innerError);
        alert('印刷プレビューの表示に失敗しました。');
        return;
      }
    }

    // 印刷ウィンドウが読み込まれた後に印刷ダイアログを表示
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    };

    // フォールバック: 一定時間後に印刷ダイアログを表示
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    }, 2000);
  };

  // SupportHistoryItemをChatExportDataに変換
  const convertToChatExportData = (item: SupportHistoryItem): any => {
    const jsonData = item.jsonData || {};
    const jsonDataAny = jsonData as any;
    return {
      chatId: item.chatId || item.id,
      userId: (item as any).userId || jsonDataAny.userId || 'system',
      exportType: jsonDataAny.exportType || 'manual_send',
      exportTimestamp: item.createdAt || jsonDataAny.exportTimestamp || new Date().toISOString(),
      title: item.title || jsonData.title,
      problemDescription: item.problemDescription || jsonData.problemDescription || '',
      machineType: item.machineType || jsonData.machineType,
      machineNumber: item.machineNumber || jsonData.machineNumber,
      extractedComponents: item.extractedComponents || jsonData.extractedComponents || [],
      extractedSymptoms: item.extractedSymptoms || jsonData.extractedSymptoms || [],
      possibleModels: item.possibleModels || jsonData.possibleModels || [],
      conversationHistory: (item as any).conversationData || jsonData.conversationHistory || [],
      metadata: (item as any).metadata || jsonData.metadata || {},
      chatData: jsonData.chatData,
      savedImages: item.images || jsonData.savedImages || [],
      ...jsonDataAny,
    };
  };

  // チェックボックスのハンドラー
  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageItems = filteredItems
        .slice((currentPage - 1) * 20, currentPage * 20)
        .map(item => item.id);
      setSelectedItems(new Set(currentPageItems));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Excelファイル作成ヘルパー関数
  const createExcelBlob = (items: SupportHistoryItem[]): Blob => {
    const worksheetData = items.map(item => ({
      '日時': new Date(item.createdAt).toLocaleString('ja-JP'),
      'タイトル': item.title || '',
      '機種': item.machineType || '',
      '機械番号': item.machineNumber || '',
      '問題内容': item.problemDescription || '',
      '抽出された部品': (item.extractedComponents || []).join(', '),
      '抽出された症状': (item.extractedSymptoms || []).join(', '),
      '可能性のある型式': (item.possibleModels || []).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '履歴');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // テキストファイル作成ヘルパー関数
  const createTextBlob = (items: SupportHistoryItem[]): Blob => {
    const textContent = items.map(item => {
      return `
========================================
日時: ${new Date(item.createdAt).toLocaleString('ja-JP')}
タイトル: ${item.title || ''}
機種: ${item.machineType || ''}
機械番号: ${item.machineNumber || ''}
問題内容: ${item.problemDescription || ''}
抽出された部品: ${(item.extractedComponents || []).join(', ')}
抽出された症状: ${(item.extractedSymptoms || []).join(', ')}
可能性のある型式: ${(item.possibleModels || []).join(', ')}
========================================
`;
    }).join('\n');
    return new Blob([textContent], { type: 'text/plain; charset=utf-8' });
  };

  // ファイルダウンロード処理（保存先選択対応）
  const downloadFile = async (blob: Blob, filename: string) => {
    // File System Access API がサポートされている場合は保存先を選択
    if ('showSaveFilePicker' in window) {
      try {
        const extension = filename.split('.').pop() || '';
        const fileTypes: Record<string, { description: string; accept: Record<string, string[]> }> = {
          'xlsx': {
            description: 'Excel ファイル',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          },
          'json': {
            description: 'JSON ファイル',
            accept: { 'application/json': ['.json'] }
          },
          'txt': {
            description: 'テキスト ファイル',
            accept: { 'text/plain': ['.txt'] }
          },
          'csv': {
            description: 'CSV ファイル',
            accept: { 'text/csv': ['.csv'] }
          },
          'pdf': {
            description: 'PDF ファイル',
            accept: { 'application/pdf': ['.pdf'] }
          }
        };

        const opts = {
          suggestedName: filename,
          types: [fileTypes[extension] || { description: 'ファイル', accept: { '*/*': ['.' + extension] } }]
        };

        const handle = await (window as any).showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        // ユーザーがキャンセルした場合
        if (err.name === 'AbortError') {
          console.log('ファイル保存がキャンセルされました');
          return;
        }
        console.warn('File System Access API でのエラー、従来の方法にフォールバック:', err);
      }
    }

    // フォールバック: 従来のダウンロード方法
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // エクスポート処理
  const handleExportSelected = async (format: 'xlsx' | 'json' | 'txt' = 'xlsx') => {
    if (selectedItems.size === 0) {
      alert('エクスポートする履歴を選択してください');
      return;
    }
    try {
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.id));
      let blob: Blob;

      if (format === 'xlsx') {
        blob = createExcelBlob(selectedItemsArray);
      } else if (format === 'txt') {
        blob = createTextBlob(selectedItemsArray);
      } else {
        blob = await exportSelectedHistory(selectedItemsArray, 'json');
      }

      await downloadFile(blob, `selected_history_${new Date().toISOString().split('T')[0]}.${format}`);
    } catch (error) {
      console.error('選択履歴エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const handleExportAll = async (format: 'xlsx' | 'json' | 'txt' = 'xlsx') => {
    if (filteredItems.length === 0) {
      alert('エクスポートする履歴がありません');
      return;
    }
    try {
      let blob: Blob;

      if (format === 'xlsx') {
        blob = createExcelBlob(filteredItems);
      } else if (format === 'txt') {
        blob = createTextBlob(filteredItems);
      } else {
        blob = await exportAllHistory(filters, 'json');
      }

      await downloadFile(blob, `all_history_${new Date().toISOString().split('T')[0]}.${format}`);
    } catch (error) {
      console.error('全履歴エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  };

  return (
    <div className="mx-auto p-6" style={{ maxWidth: '2168px', width: '100%' }}>
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
                  <SelectItem value="all">すべての機種</SelectItem>
                  {machineData?.machineTypes?.map?.((type) => (
                    <SelectItem key={type.id} value={type.machineTypeName}>
                      {type.machineTypeName}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
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
                  <SelectItem value="all">すべての機械番号</SelectItem>
                  {machineData?.machines?.map?.((machine) => (
                    <SelectItem key={machine.id} value={machine.machineNumber}>
                      {machine.machineNumber}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <textarea
              placeholder="故障内容、部品名など（jsonData内を検索）"
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md resize-none"
              style={{
                width: '98ch',
                minHeight: '4.5rem',
                maxHeight: '4.5rem',
                lineHeight: '1.25rem',
                fontFamily: 'inherit',
                fontSize: '0.875rem'
              }}
              rows={2}
            />
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>該当する履歴が見つかりません。</p>
              <p className="text-sm mt-2">検索条件を変更してお試しください。</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-center text-sm font-medium" style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && filteredItems
                          .slice((currentPage - 1) * 20, currentPage * 20)
                          .every(item => selectedItems.has(item.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="cursor-pointer"
                        style={{ width: '25px', height: '25px' }}
                      />
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-sm font-medium">
                      ファイル名
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-sm font-medium">
                      機種
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-sm font-medium">
                      機械番号
                    </th>
                    <th className="border border-gray-300 p-3 text-left text-sm font-medium">
                      作成日
                    </th>
                    <th className="border border-gray-300 p-3 text-center text-sm font-medium">
                      画像
                    </th>
                    <th className="border border-gray-300 p-3 text-center text-sm font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems
                    .slice((currentPage - 1) * 20, currentPage * 20)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                            className="cursor-pointer"
                            style={{ width: '25px', height: '25px' }}
                          />
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="font-medium text-gray-900">
                            {getDisplayFileName(item.fileName, item.title)}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <Badge variant="outline" className="text-xs">
                            {item.machineType || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <Badge variant="outline" className="text-xs">
                            {item.machineNumber || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="text-sm text-gray-700">
                            {new Date(item.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(item.createdAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="flex justify-center gap-1 flex-wrap">
                            {item.images && item.images.length > 0 ? (
                              <>
                                {item.images.slice(0, 3).map((image: any, idx: number) => {
                                  // 画像URLを生成（優先順位: fileName > url > path）
                                  let imageUrl = '';
                                  let fileName = '';

                                  if (image.fileName) {
                                    fileName = image.fileName;
                                    const actualFileName = fileName.includes('/')
                                      ? fileName.split('/').pop()
                                      : fileName.includes('\\')
                                        ? fileName.split('\\').pop()
                                        : fileName;
                                    imageUrl = `/api/images/chat-exports/${actualFileName}`;
                                  } else if (image.url) {
                                    imageUrl = image.url;
                                    fileName = image.originalFileName || `画像${idx + 1}`;
                                  } else if (image.path) {
                                    const pathParts = image.path.split(/[/\\]/);
                                    fileName = pathParts[pathParts.length - 1] || `画像${idx + 1}`;
                                    imageUrl = `/api/images/chat-exports/${fileName}`;
                                  } else {
                                    return null;
                                  }

                                  if (!imageUrl) return null;

                                  return (
                                    <img
                                      key={idx}
                                      src={imageUrl}
                                      alt={fileName}
                                      className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80"
                                      onError={(e) => {
                                        const fallbackUrl = `/api/fault-history/images/${fileName}`;
                                        (e.target as HTMLImageElement).src = fallbackUrl;
                                      }}
                                      onClick={() => {
                                        window.open(imageUrl, '_blank');
                                      }}
                                      title={fileName}
                                    />
                                  );
                                })}
                                {item.images.length > 3 && (
                                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded border border-gray-300 text-xs text-gray-500">
                                    +{item.images.length - 3}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">画像なし</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 編集開始時に元のデータをディープコピーで保存
                                const originalItem = JSON.parse(JSON.stringify(item));
                                setEditingItem(item);
                                setOriginalEditingItem(originalItem);
                                setShowEditDialog(true);
                              }}
                              className="px-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              style={{ height: '42px' }}
                            >
                              編集
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteHistory(item.id, item.title)}
                              className="px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                              style={{ height: '42px' }}
                            >
                              削除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">選択履歴のエクスポート ({selectedItems.size}件)</div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  disabled={selectedItems.size === 0}
                  onClick={() => handleExportSelected('xlsx')}
                >
                  Excel形式
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedItems.size === 0}
                  onClick={() => handleExportSelected('json')}
                >
                  JSON形式
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedItems.size === 0}
                  onClick={() => handleExportSelected('txt')}
                >
                  テキスト形式
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">全履歴のエクスポート ({filteredItems.length}件)</div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  disabled={filteredItems.length === 0}
                  onClick={() => handleExportAll('xlsx')}
                >
                  すべての履歴をエクスポート
                </Button>
              </div>
            </div>
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

      {/* 編集ダイアログ */}
      {showEditDialog && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">機械故障履歴編集</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log('編集データを保存します', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4" />
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingItem) {
                        handlePrintEditReport(editingItem);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    印刷
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseEditDialog}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseEditDialog}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* 基本情報編集 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    基本情報
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        機種
                      </label>
                      <Select
                        value={editingItem.machineType || ''}
                        onValueChange={value => {
                          setEditingItem({
                            ...editingItem,
                            machineType: value,
                            jsonData: {
                              ...editingItem.jsonData,
                              machineType: value,
                            },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              editingItem.machineType
                                ? editingItem.machineType
                                : '機種を選択'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {editingItem.machineType && (
                            <SelectItem value={editingItem.machineType}>
                              {editingItem.machineType} (現在の値)
                            </SelectItem>
                          )}
                          {machineData.machineTypes
                            ?.filter(mt => mt?.machineTypeName && mt.machineTypeName !== editingItem.machineType)
                            ?.map(machineType => (
                              <SelectItem
                                key={machineType.id || `machine-type-${Date.now()}-${Math.random()}`}
                                value={machineType.machineTypeName || ''}
                              >
                                {machineType.machineTypeName || '不明'}
                              </SelectItem>
                            )) || []}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        機械番号
                      </label>
                      <Select
                        value={editingItem.machineNumber || ''}
                        onValueChange={value => {
                          setEditingItem({
                            ...editingItem,
                            machineNumber: value,
                            jsonData: {
                              ...editingItem.jsonData,
                              machineNumber: value,
                            },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              editingItem.machineNumber
                                ? editingItem.machineNumber
                                : '機械番号を選択'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {editingItem.machineNumber && (
                            <SelectItem value={editingItem.machineNumber}>
                              {editingItem.machineNumber} (現在の値)
                            </SelectItem>
                          )}
                          {machineData.machines
                            ?.filter(
                              machine =>
                                machine?.machineNumber &&
                                machine?.machineTypeName &&
                                (!editingItem.machineType ||
                                  machine.machineTypeName === editingItem.machineType) &&
                                machine.machineNumber !== editingItem.machineNumber
                            )
                            ?.map(machine => (
                              <SelectItem
                                key={machine.id || `machine-${Date.now()}-${Math.random()}`}
                                value={machine.machineNumber || ''}
                              >
                                {machine.machineNumber || '不明'} ({machine.machineTypeName || '不明'})
                              </SelectItem>
                            )) || []}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ファイル名
                      </label>
                      <Input
                        value={editingItem.fileName || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            fileName: e.target.value,
                          });
                        }}
                        placeholder="ファイル名"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 事象の説明編集 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span>事象の説明</span>
                    <span className="text-xs font-normal text-gray-600 ml-auto">事象の詳細説明を入力</span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        事象タイトル
                      </label>
                      <Input
                        value={
                          (() => {
                            if (editingItem.fileName) {
                              const firstUnderscoreIndex = editingItem.fileName.indexOf('_');
                              if (firstUnderscoreIndex > 0) {
                                return editingItem.fileName.substring(0, firstUnderscoreIndex);
                              }
                              return editingItem.fileName.replace(/\.json$/, '');
                            }
                            return editingItem.jsonData?.title ||
                              editingItem.jsonData?.question ||
                              '';
                          })()
                        }
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              title: e.target.value,
                              question: e.target.value,
                            },
                          });
                        }}
                        placeholder="事象タイトルを入力"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        事象説明
                      </label>
                      <textarea
                        value={
                          editingItem.jsonData?.problemDescription ||
                          editingItem.jsonData?.answer ||
                          ''
                        }
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              problemDescription: e.target.value,
                              answer: e.target.value,
                            },
                          });
                        }}
                        className="w-full h-32 p-3 border border-gray-300 rounded-md"
                        placeholder=""
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        場所
                      </label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value,
                            },
                          });
                        }}
                        placeholder="場所を入力（例：○○線）"
                      />
                    </div>
                  </div>
                </div>

                {/* 故障個所の画像 */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      故障個所の画像
                    </h3>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="image-upload-input"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        const newImages: any[] = [];
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const formData = new FormData();
                          formData.append('image', file);

                          try {
                            const response = await fetch('/api/history/upload-image', {
                              method: 'POST',
                              body: formData,
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.error || '画像のアップロードに失敗しました');
                            }

                            const result = await response.json();
                            newImages.push({
                              fileName: result.fileName,
                              url: result.imageUrl || result.url,
                            });
                          } catch (error) {
                            console.error('画像アップロードエラー:', error);
                            alert(`画像のアップロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }

                        if (newImages.length > 0) {
                          const currentSavedImages = editingItem.jsonData?.savedImages || [];
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              savedImages: [...newImages, ...currentSavedImages],
                            },
                          });
                        }

                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        document.getElementById('image-upload-input')?.click();
                      }}
                      className="text-sm"
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      画像を追加
                    </Button>
                  </div>
                  {(() => {
                    const getAllImages = (item: SupportHistoryItem): Array<{ url: string; fileName?: string; index: number }> => {
                      const images: Array<{ url: string; fileName?: string; index: number }> = [];

                      if (Array.isArray(item?.savedImages) && item.savedImages.length > 0) {
                        item.savedImages.forEach((img: any, idx: number) => {
                          if (typeof img === 'string' && !img.startsWith('data:image/')) {
                            images.push({ url: img, index: idx });
                          } else if (img && typeof img === 'object') {
                            if (img.fileName) {
                              const imagePath = `/api/images/chat-exports/${img.fileName}`;
                              let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                              baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                              images.push({ url: `${baseUrl}${imagePath}`, fileName: img.fileName, index: idx });
                            } else if (img.url) {
                              const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx });
                            } else if (img.path) {
                              const finalUrl = img.path.startsWith('http') ? img.path : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.path}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx });
                            }
                          }
                        });
                      }

                      if (Array.isArray(item?.images) && item.images.length > 0) {
                        item.images.forEach((img: any, idx: number) => {
                          if (typeof img === 'string') {
                            images.push({ url: img, index: idx + 1000 });
                          } else if (img && typeof img === 'object') {
                            const url = img.url || img.path || img.fileName;
                            if (url && !url.startsWith('data:image/')) {
                              const finalUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx + 1000 });
                            }
                          }
                        });
                      }

                      if (Array.isArray(item?.jsonData?.savedImages) && item.jsonData.savedImages.length > 0) {
                        item.jsonData.savedImages.forEach((img: any, idx: number) => {
                          if (typeof img === 'string' && !img.startsWith('data:image/')) {
                            images.push({ url: img, index: idx + 2000 });
                          } else if (img && typeof img === 'object') {
                            if (img.fileName) {
                              const imagePath = `/api/images/chat-exports/${img.fileName}`;
                              let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                              baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
                              images.push({ url: `${baseUrl}${imagePath}`, fileName: img.fileName, index: idx + 2000 });
                            } else if (img.url) {
                              const finalUrl = img.url.startsWith('http') ? img.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${img.url}`;
                              images.push({ url: finalUrl, fileName: img.fileName, index: idx + 2000 });
                            }
                          }
                        });
                      }

                      const uniqueImages: Array<{ url: string; fileName?: string; index: number }> = [];
                      const seenUrls = new Set<string>();
                      images.forEach(img => {
                        if (!seenUrls.has(img.url)) {
                          seenUrls.add(img.url);
                          uniqueImages.push(img);
                        }
                      });

                      return uniqueImages;
                    };

                    const imageList = getAllImages(editingItem);
                    if (imageList.length > 0) {
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          {imageList.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.url}
                                alt={`故障画像${index + 1}`}
                                className="w-full h-auto max-h-48 object-contain border border-gray-300 rounded-md shadow-sm"
                                onError={(e) => {
                                  console.error(`🖼️ 画像読み込みエラー (編集画面):`, image.url);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const currentSavedImages = editingItem.jsonData?.savedImages || [];
                                  const updatedSavedImages = currentSavedImages.filter((img: any, idx: number) => {
                                    if (image.fileName && img.fileName === image.fileName) return false;
                                    if (img.url === image.url) return false;
                                    if (img.path === image.url) return false;
                                    return true;
                                  });

                                  setEditingItem({
                                    ...editingItem,
                                    jsonData: {
                                      ...editingItem.jsonData,
                                      savedImages: updatedSavedImages,
                                    },
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return (
                      <p className="text-sm text-gray-500 text-center py-4">
                        画像がありません。上記の「画像を追加」ボタンから画像を追加してください。
                      </p>
                    );
                  })()}
                </div>

                {/* 修繕計画編集 */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    修繕計画
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        修繕予定月日
                      </label>
                      <Input
                        type="date"
                        value={editingItem.jsonData?.repairSchedule || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              repairSchedule: e.target.value,
                            },
                          });
                        }}
                        placeholder="修繕予定月日"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        場所
                      </label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={e => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value,
                            },
                          });
                        }}
                        placeholder="設置場所"
                      />
                    </div>
                  </div>
                </div>

                {/* 記事欄（200文字程度） */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span>記事欄</span>
                    <span className="text-xs font-normal text-gray-600 ml-auto">修繕に関する備考や追加情報を記載してください（200文字以内）</span>
                  </h3>
                  <div>
                    <textarea
                      value={editingItem.jsonData?.remarks || ''}
                      onChange={e => {
                        if (e.target.value.length <= 200) {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              remarks: e.target.value,
                            },
                          });
                        }
                      }}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md"
                      placeholder=""
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.jsonData?.remarks?.length || 0}/200文字
                    </p>
                  </div>
                </div>

                {/* 保存ボタン（下部） */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleCloseEditDialog}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('編集データを保存します', editingItem);
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
    </div>
  );
}
