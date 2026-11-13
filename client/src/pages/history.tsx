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
  summarizeWithGPT,
} from '../lib/api/history-api';
import { storage } from '../lib/api';
import ChatExportReport from '../components/report/chat-export-report';

// 画像ユーティリティ関数
// API_BASEから末尾の/apiを除去（二重パス防止）
const getCleanApiBase = () => {
  const base = import.meta.env.DEV
    ? (import.meta.env.VITE_API_BASE_URL || '')
    : import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return base.replace(/\/api\/?$/, '');
};
const API_BASE = getCleanApiBase();

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
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [reportGenerationError, setReportGenerationError] = useState('');
  const reportGenerationRef = React.useRef(false);

  const handleGenerateFailureReport = async (item: SupportHistoryItem) => {
    if (reportGenerationRef.current) return;
    if (item.jsonData?.problemDescription?.trim() &&
      !window.confirm('既存の事象説明を基にAI下書きを生成します。保存するまでは元の履歴を変更しません。続行しますか？')) return;

    reportGenerationRef.current = true;
    setGeneratingReportId(item.id);
    setReportGenerationError('');
    try {
      const originalItem: SupportHistoryItem = JSON.parse(JSON.stringify(item));
      const jsonData = originalItem.jsonData || {};
      const conversationHistory = [
        jsonData.chatData?.messages,
        jsonData.originalChatData?.messages,
        jsonData.conversationHistory,
        jsonData.messages,
        originalItem.conversationHistory,
        originalItem.messages,
      ].find(messages => Array.isArray(messages) && messages.length > 0) || [];
      const summary = await summarizeWithGPT({
        ...jsonData,
        title: jsonData.title || originalItem.title || originalItem.incidentTitle,
        conversationHistory,
      });
      if (!summary.trim()) throw new Error('AIから下書きが返されませんでした。');

      setOriginalEditingItem(originalItem);
      setEditingItem({
        ...originalItem,
        jsonData: {
          ...jsonData,
          title: jsonData.title || originalItem.title || originalItem.incidentTitle || '',
          problemDescription: summary,
          answer: summary,
        },
      });
      setShowEditDialog(true);
    } catch (error) {
      console.error('機械故障報告書の下書き生成エラー:', error);
      setReportGenerationError(
        `下書きを生成できませんでした。元の履歴は変更していません。${error instanceof Error ? error.message : 'AI設定と通信状態を確認してください。'}`
      );
    } finally {
      reportGenerationRef.current = false;
      setGeneratingReportId(null);
    }
  };

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
      // キャッシュバスターを追加して最新データを確実に取得
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const requestUrl = `${buildApiUrl('/history')}?_t=${timestamp}&_r=${randomId}&no_cache=true`;
      console.log('🔍 APIリクエストURL:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        },
      });
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
      const historyItems = items.map((file: any) => {
        // 画像データの正規化（初期ロード時）
        const savedImages = file.jsonData?.savedImages || file.savedImages || file.images || [];
        const baseUrl = API_BASE || window.location.origin;
        const normalizedImages = savedImages.map((img: any) => {
          if (typeof img === 'string') {
            const fileName = img.split('/').pop()?.split('\\').pop() || img;
            const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
            return { 
              url: `${cleanBaseUrl}/api/images/chat-exports/${fileName}`, 
              fileName: fileName 
            };
          }
          if (img && typeof img === 'object') {
            const fileName = img.fileName || img.url?.split('/').pop()?.split('\\').pop() || img.path?.split('/').pop()?.split('\\').pop() || '';
            const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
            return {
              url: `${cleanBaseUrl}/api/images/chat-exports/${fileName}`,
              fileName: fileName,
              ...img
            };
          }
          return img;
        }).filter(Boolean);

        console.log('🖼️ 画像データ処理:', {
          id: file.id,
          savedImagesCount: savedImages.length,
          normalizedImagesCount: normalizedImages.length,
          firstImage: normalizedImages[0]
        });

        // jsonData.chatData.machineInfoから機種と機械番号を抽出
        const chatDataMachineInfo = file.jsonData?.chatData?.machineInfo || {};
        const machineType = chatDataMachineInfo.machineTypeName || file.machineType || file.machineInfo?.machineTypeName || file.jsonData?.machineType || 'Unknown';
        const machineNumber = chatDataMachineInfo.machineNumber || file.machineNumber || file.machineInfo?.machineNumber || file.jsonData?.machineNumber || 'Unknown';

        return {
          id: file.id || file.chatId,
          chatId: file.chatId || file.id,
          fileName: file.fileName || file.name || `${file.title}_${file.id}.json`,
          title: file.title || '故障履歴',
          machineType: machineType,
          machineNumber: machineNumber,
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
          images: normalizedImages,
          savedImages: normalizedImages,
          jsonData: {
            ...(file.jsonData || {}),
            title: file.title || file.jsonData?.title,
            problemDescription: file.description || file.problemDescription || file.jsonData?.problemDescription,
            machineType: file.machineType || file.jsonData?.machineType,
            machineNumber: file.machineNumber || file.jsonData?.machineNumber,
            conversationHistory: file.conversationHistory || file.jsonData?.conversationHistory || [],
            savedImages: normalizedImages,
            metadata: file.metadata || file.jsonData?.metadata || {},
          },
          metadata: {
            source: 'history-file',
            originalFile: file.fileName || file.name,
            ...file.metadata,
          }
        };
      });

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

  // ファイル名から事象名のみを抽出（UUIDとタイムスタンプを削除）
  const getDisplayFileName = (fileName: string | undefined, title: string | undefined, jsonData?: any): string => {
    // 1. JSONデータのtitleを最優先
    if (jsonData?.title) return jsonData.title;
    
    // 2. 引数のtitleを使用
    if (title) return title;
    
    // 3. ファイル名から抽出
    if (!fileName) return '無題';
    
    // .json拡張子を削除
    const nameWithoutExt = fileName.replace(/\.json$/, '');
    
    // UUIDとタイムスタンプ部分を削除するパターン
    // 例: "エンジンがゆっくり止まった_29754ea5-bba0-459a-9847-3346e46497fd_2025-11-29T07-33-37-419Z"
    // -> "エンジンがゆっくり止まった"
    const eventNameMatch = nameWithoutExt.match(/^(.+?)_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_/);
    if (eventNameMatch) {
      return eventNameMatch[1];
    }
    
    // UUIDがない場合は最初のアンダースコアまでを事象名とする
    const titleMatch = nameWithoutExt.match(/^([^_]+)/);
    return titleMatch ? titleMatch[1] : nameWithoutExt;
  };

  // 履歴アイテムの編集データをサーバーに保存
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編集された履歴アイテムを保存', editedItem);

      // IDの確認と準備
      let itemId = editedItem.id || editedItem.chatId || editedItem.fileName;
      if (!itemId) {
        alert('アイテムIDが見つかりません。保存できません。');
        return;
      }

      // .json拡張子を除去
      if (itemId.endsWith('.json')) {
        itemId = itemId.replace('.json', '');
      }

      console.log('💾 保存対象のID:', itemId);

      // 🔧 修正: すべてのソースから画像を収集（重複削除）
      console.log('🔍 編集保存: editedItem構造確認:', {
        hasSavedImages: !!editedItem.savedImages,
        savedImagesLength: editedItem.savedImages?.length,
        savedImagesData: editedItem.savedImages,
        hasJsonData: !!editedItem.jsonData,
        hasJsonDataSavedImages: !!editedItem.jsonData?.savedImages,
        jsonDataSavedImagesLength: editedItem.jsonData?.savedImages?.length,
        jsonDataSavedImagesData: editedItem.jsonData?.savedImages,
        hasChatData: !!(editedItem.jsonData as any)?.chatData,
        hasChatDataSavedImages: !!(editedItem.jsonData as any)?.chatData?.savedImages,
        chatDataSavedImagesLength: (editedItem.jsonData as any)?.chatData?.savedImages?.length,
        chatDataSavedImagesData: (editedItem.jsonData as any)?.chatData?.savedImages,
        hasImages: !!editedItem.images,
        imagesLength: editedItem.images?.length,
        imagesData: editedItem.images
      });
      
      const rawImageSources = [
        ...(editedItem.savedImages || []),
        ...(editedItem.jsonData?.savedImages || []),
        ...((editedItem.jsonData as any)?.chatData?.savedImages || []),
        ...(editedItem.images || [])
      ];
      
      console.log('🔍 編集保存: rawImageSources統合:', {
        totalCount: rawImageSources.length,
        sources: rawImageSources
      });
      
      // 重複を除外してrawImagesを作成
      const rawImageMap = new Map<string, any>();
      rawImageSources.forEach(img => {
        const fileName = typeof img === 'string' 
          ? img.split('/').pop()?.split('\\').pop()
          : img.fileName || img.url?.split('/').pop();
        console.log('  - 画像処理:', { img, fileName });
        if (fileName && !fileName.startsWith('data:image/') && !rawImageMap.has(fileName)) {
          rawImageMap.set(fileName, img);
        }
      });
      const rawImages = Array.from(rawImageMap.values());
      
      console.log('🔍 編集保存: 収集した画像数:', {
        savedImages: editedItem.savedImages?.length || 0,
        jsonDataSavedImages: editedItem.jsonData?.savedImages?.length || 0,
        chatDataSavedImages: (editedItem.jsonData as any)?.chatData?.savedImages?.length || 0,
        images: editedItem.images?.length || 0,
        rawImages統合後: rawImages.length,
        rawImagesData: rawImages
      });
      
      // 元のアイテムから全画像を取得（削除検出用）
      const originalImages = new Set<string>();
      if (originalEditingItem) {
        const collectImageFileNames = (item: any) => {
          const images: string[] = [];
          
          // savedImagesから取得
          if (item.savedImages && Array.isArray(item.savedImages)) {
            item.savedImages.forEach((img: any) => {
              const fileName = typeof img === 'string' 
                ? img.split('/').pop()?.split('\\').pop() 
                : img.fileName || img.url?.split('/').pop();
              if (fileName) images.push(fileName);
            });
          }
          
          // jsonData.savedImagesから取得
          if (item.jsonData?.savedImages && Array.isArray(item.jsonData.savedImages)) {
            item.jsonData.savedImages.forEach((img: any) => {
              const fileName = typeof img === 'string' 
                ? img.split('/').pop()?.split('\\').pop() 
                : img.fileName || img.url?.split('/').pop();
              if (fileName) images.push(fileName);
            });
          }
          
          // chatData.savedImagesから取得
          if (item.jsonData?.chatData?.savedImages && Array.isArray(item.jsonData.chatData.savedImages)) {
            item.jsonData.chatData.savedImages.forEach((img: any) => {
              const fileName = typeof img === 'string' 
                ? img.split('/').pop()?.split('\\').pop() 
                : img.fileName || img.url?.split('/').pop();
              if (fileName) images.push(fileName);
            });
          }
          
          return images;
        };
        
        collectImageFileNames(originalEditingItem).forEach(fileName => originalImages.add(fileName));
      }
      
      // 重複削除と正規化
      const seenFileNames = new Set<string>();
      const normalizedImages = rawImages
        .map((img: any) => {
          let fileName = '';
          
          if (typeof img === 'string') {
            fileName = img.split('/').pop()?.split('\\').pop() || img;
          } else {
            fileName = img.fileName || img.url?.split('/').pop()?.split('\\').pop() || img.path?.split('/').pop()?.split('\\').pop() || '';
          }
          
          // ファイル名が取得できない、またはdata URIの場合はスキップ対象になるが、ここでは空文字にしてfilterで弾く
          if (!fileName || fileName.startsWith('data:image/')) {
             return null;
          }

          // 常に標準的なオブジェクト形式に変換
          // URLは絶対URL形式に統一
          const baseUrl = API_BASE || window.location.origin;
          const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
          return {
            url: `${cleanBaseUrl}/api/images/chat-exports/${fileName}`,
            fileName: fileName
          };
        })
        .filter((img: any) => {
          if (!img) return false;
          const fileName = img.fileName;
          if (seenFileNames.has(fileName)) {
            return false;
          }
          seenFileNames.add(fileName);
          return true;
        });

      // 削除された画像を検出
      const currentFileNames = new Set(normalizedImages.map((img: any) => img.fileName));
      const deletedImages = Array.from(originalImages).filter(fileName => !currentFileNames.has(fileName));

      console.log('📤 サーバーへ送信する画像データ:', {
        元の画像数: rawImages.length,
        正規化後: normalizedImages.length,
        削除された画像: deletedImages.length,
        画像リスト: normalizedImages.map((img: any) => img.fileName),
        削除リスト: deletedImages
      });

      // chatData全体を更新（messages と savedImages の両方）
      const updatedChatData = editedItem.jsonData?.chatData ? {
        ...editedItem.jsonData.chatData,
        // chatData.savedImages も同期
        savedImages: normalizedImages,
        // messages内のmediaも更新
        messages: (editedItem.jsonData.chatData.messages || []).map((msg: any) => ({
          ...msg,
          media: msg.media ? msg.media.filter((m: any) => {
            const mediaFileName = m.fileName || m.url?.split('/').pop();
            return normalizedImages.some((img: any) => img.fileName === mediaFileName);
          }) : []
        }))
      } : undefined;

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
          savedImages: normalizedImages,
          ...(updatedChatData && { chatData: updatedChatData }),
          ...(editedItem.machineType && { machineType: editedItem.machineType }),
          ...(editedItem.machineNumber && { machineNumber: editedItem.machineNumber }),
          lastModified: new Date().toISOString(),
        },
        updatedBy: 'user',
        // 削除された画像のファイル名を送信（サーバー側で物理削除）
        deletedImages: deletedImages.length > 0 ? deletedImages : undefined,
      };

      // サーバーに更新リクエストを送信
      const { buildApiUrl } = await import('../lib/api');
      const response = await fetch(buildApiUrl(`/history/update-item/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `履歴の更新に失敗しました (${response.status})`;
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || '';
          console.error('❌ サーバーエラー詳細:', {
            status: response.status,
            error: errorData.error,
            details: errorData.details,
            updatePayload: updatePayload
          });
        } catch (e) {
          errorMessage += ': ' + errorText.substring(0, 200);
          errorDetails = errorText;
          console.error('❌ サーバーエラー（JSONパース失敗）:', {
            status: response.status,
            errorText: errorText.substring(0, 500),
            updatePayload: updatePayload
          });
        }
        alert(errorMessage + (errorDetails ? '\n詳細: ' + errorDetails.substring(0, 200) : ''));
        return;
      }

      const result = await response.json();
      console.log('履歴更新完了', result);

      // サーバーからのレスポンスから最新の画像データを取得（優先的に使用）
      const serverUpdatedData = result.updatedData || {};
      const serverImages = serverUpdatedData.savedImages || serverUpdatedData.images || serverUpdatedData.jsonData?.savedImages || [];

      // サーバーからの画像データが存在する場合はそれを使用、なければローカルのnormalizedImagesを使用
      const finalImages = serverImages.length > 0 ? serverImages : normalizedImages;

      // 画像データの正規化（既にnormalizedImagesがあるので、サーバーから取得した場合のみ正規化）
      const finalNormalizedImages = serverImages.length > 0 ? finalImages.map((img: any) => {
        if (typeof img === 'string') {
          return { url: img, fileName: img };
        }
        if (img && typeof img === 'object') {
          return {
            url: img.url || img.fileName || img.path || '',
            fileName: img.fileName || img.url || img.path || '',
            ...img
          };
        }
        return img;
      }) : normalizedImages;

      console.log('✅ 保存後の画像データ:', {
        itemId,
        serverImagesCount: serverImages.length,
        normalizedImagesCount: normalizedImages.length,
        finalImagesCount: finalImages.length,
        finalNormalizedImagesCount: finalNormalizedImages.length,
        images: finalNormalizedImages,
        usingServerData: serverImages.length > 0
      });

      // サーバーからのレスポンスデータを優先的に使用して履歴リストを更新
      const updatedItem = {
        ...editedItem,
        // サーバーからのデータを優先的に使用
        ...(serverUpdatedData.title && { title: serverUpdatedData.title }),
        ...(serverUpdatedData.machineType && { machineType: serverUpdatedData.machineType }),
        ...(serverUpdatedData.machineNumber && { machineNumber: serverUpdatedData.machineNumber }),
        jsonData: {
          ...editedItem.jsonData,
          ...(serverUpdatedData.jsonData || {}),
          savedImages: finalNormalizedImages,
        },
        images: finalNormalizedImages,  // imagesフィールドも更新
        savedImages: finalNormalizedImages,
        lastModified: serverUpdatedData.lastModified || new Date().toISOString(),
        incidentTitle: serverUpdatedData.title || editedItem.jsonData?.title || editedItem.incidentTitle,
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

      // 一覧を再読み込み（最新データを取得）
      // サーバーから返された更新済みデータはすでにステートに反映されているため、
      // ここでは単純に最新データを取得するだけで二重更新を避ける
      await fetchHistoryData(currentPage);
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
    console.log('🖼️ 印刷時の画像データ:', {
      'item.jsonData?.savedImages': item.jsonData?.savedImages,
      'item.savedImages': item.savedImages,
      'item.images': item.images,
      savedImagesCount: item.jsonData?.savedImages?.length || 0,
    });

    // iframeを使用して直接印刷ダイアログを開く
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
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

    // 全ての画像URLを取得
    const savedImages = item.jsonData?.savedImages || jsonData?.savedImages || item.savedImages || item.images || [];
    console.log('🖼️ 印刷用画像データ取得:', {
      savedImages,
      savedImagesCount: savedImages?.length || 0,
    });

    // 画像URL変換関数
    const convertToImageUrl = (img: any): string | null => {
      const imgUrl = typeof img === 'string' ? img : (img?.url || img?.path || img?.fileName);
      if (!imgUrl || imgUrl.startsWith('data:image/')) return null;

      if (imgUrl.startsWith('http')) {
        return imgUrl;
      } else if (imgUrl.startsWith('/')) {
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const path = imgUrl.startsWith('/api') ? imgUrl : `/api${imgUrl}`;
        return `${baseUrl}${path}`;
      } else {
        const imagePath = `/api/images/chat-exports/${imgUrl}`;
        let baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        baseUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        return `${baseUrl}${imagePath}`;
      }
    };

    // 全ての画像URLを変換
    const imageUrls: string[] = [];
    if (Array.isArray(savedImages) && savedImages.length > 0) {
      savedImages.forEach((img) => {
        const url = convertToImageUrl(img);
        if (url) imageUrls.push(url);
      });
    }

    console.log('🖼️ 印刷用画像URL一覧:', imageUrls);

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
          .image-section { margin: 20px 0; }
          .image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
          .image-grid img { width: 100%; height: auto; max-height: 250px; object-fit: contain; border: 1px solid #ddd; border-radius: 5px; }
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
            .image-grid {
              gap: 8px;
            }
            .image-grid img {
              max-height: 150px;
              page-break-inside: avoid;
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

        ${imageUrls.length > 0
        ? `
        <div class="section">
          <h2>故障箇所の画像</h2>
          <div class="image-section">
            <p>機械故障箇所の画像（${imageUrls.length}枚）</p>
            <div class="image-grid">
              ${imageUrls.map((url, index) => `
                <img src="${url}" alt="故障箇所の画像${index + 1}" />
              `).join('')}
            </div>
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

    if (!printWindow) {
      console.error('❌ 印刷フレームのwindowオブジェクトを取得できませんでした');
      alert('印刷の準備に失敗しました。');
      document.body.removeChild(printFrame);
      return;
    }

    try {
      printWindow.document.open();
      printWindow.document.write(reportContent);
      printWindow.document.close();

      // 画像が読み込まれるまで待ってから印刷ダイアログを開く
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

          // 印刷後にiframeを削除
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    } catch (error) {
      console.error('❌ 印刷HTMLの書き込みに失敗:', error);
      alert('印刷の準備に失敗しました。');
      document.body.removeChild(printFrame);
    }
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
  // CSV作成ヘルパー関数
  const createCSVBlob = (items: SupportHistoryItem[]): Blob => {
    const headers = ['日時', 'タイトル', '機種', '機械番号', '問題内容', '抽出された部品', '抽出された症状', '可能性のある型式'];
    const rows = items.map(item => [
      new Date(item.createdAt).toLocaleString('ja-JP'),
      item.title || '',
      item.machineType || '',
      item.machineNumber || '',
      item.problemDescription || '',
      (item.extractedComponents || []).join(', '),
      (item.extractedSymptoms || []).join(', '),
      (item.possibleModels || []).join(', '),
    ]);

    // CSVフォーマットに変換（引用符でエスケープ）
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // BOM付きUTF-8でエンコード（Excel対応）
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    return new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  };

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
  const handleExportSelected = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (selectedItems.size === 0) {
      alert('エクスポートする履歴を選択してください');
      return;
    }
    try {
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.id));
      let blob: Blob;
      let extension: string;
      let mimeType: string;

      if (format === 'xlsx') {
        blob = createExcelBlob(selectedItemsArray);
        extension = 'xlsx';
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        // CSV形式
        blob = createCSVBlob(selectedItemsArray);
        extension = 'csv';
        mimeType = 'text/csv;charset=utf-8;';
      }

      // ファイル保存ダイアログを開く
      const fileName = `selected_history_${new Date().toISOString().split('T')[0]}.${extension}`;

      // File System Access API が使用可能な場合
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: format === 'xlsx' ? 'Excel ファイル' : 'CSV ファイル',
              accept: format === 'xlsx'
                ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                : { 'text/csv': ['.csv'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          alert('エクスポートが完了しました');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            throw err;
          }
        }
      } else {
        // フォールバック: 通常のダウンロード
        await downloadFile(blob, fileName);
      }
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
        <h1 className="text-3xl font-bold text-gray-900">機械故障管理</h1>
        <p className="text-gray-600 mt-2">
          機械故障履歴の検索・管理と、機械故障報告書の下書き生成・確認・保存・印刷を行います。
        </p>
        <p className="text-sm text-gray-600 mt-2">
          「報告書の下書き生成」で履歴をAI要約し、既存の編集画面で確認・修正できます。AIの推測と事実を確認してから保存してください。自動保存・自動送信はしません。
        </p>
        {reportGenerationError && (
          <p role="alert" className="mt-2 text-sm text-red-700">{reportGenerationError}</p>
        )}
        {generatingReportId !== null && (
          <p role="status" className="mt-2 text-sm text-blue-700">機械故障報告書の下書きを生成中...</p>
        )}
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
                            {getDisplayFileName(item.fileName, item.title, item.jsonData)}
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
                            {(() => {
                              // 複数のパスから画像を抽出して統合（重複排除）
                              let displayImages: any[] = [];
                              const imageMap = new Map<string, any>(); // fileName をキーとして重複排除
                              
                              // 1. item.savedImagesから取得（編集で追加された画像）
                              if (item.savedImages && Array.isArray(item.savedImages) && item.savedImages.length > 0) {
                                item.savedImages.forEach((img: any) => {
                                  const fileName = img.fileName || img.url?.split('/').pop();
                                  if (fileName && !imageMap.has(fileName)) {
                                    imageMap.set(fileName, img);
                                  }
                                });
                                console.log(`📸 [一覧表示] アイテム[${item.id}] savedImages: ${item.savedImages.length}件`);
                              }
                              
                              // 2. item.jsonData.savedImagesから取得
                              if (item.jsonData?.savedImages && Array.isArray(item.jsonData.savedImages) && item.jsonData.savedImages.length > 0) {
                                item.jsonData.savedImages.forEach((img: any) => {
                                  const fileName = img.fileName || img.url?.split('/').pop();
                                  if (fileName && !imageMap.has(fileName)) {
                                    imageMap.set(fileName, img);
                                  }
                                });
                                console.log(`📸 [一覧表示] アイテム[${item.id}] jsonData.savedImages: ${item.jsonData.savedImages.length}件`);
                              }
                              
                              // 3. item.jsonData.chatData.savedImagesから取得
                              if (item.jsonData?.chatData?.savedImages && Array.isArray(item.jsonData.chatData.savedImages) && item.jsonData.chatData.savedImages.length > 0) {
                                item.jsonData.chatData.savedImages.forEach((img: any) => {
                                  const fileName = img.fileName || img.url?.split('/').pop();
                                  if (fileName && !imageMap.has(fileName)) {
                                    imageMap.set(fileName, img);
                                  }
                                });
                                console.log(`📸 [一覧表示] アイテム[${item.id}] chatData.savedImages: ${item.jsonData.chatData.savedImages.length}件`);
                              }
                              
                              // 4. item.imagesから取得（DB由来）
                              if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                                item.images.forEach((img: any) => {
                                  const fileName = img.fileName || img.url?.split('/').pop();
                                  if (fileName && !imageMap.has(fileName)) {
                                    imageMap.set(fileName, img);
                                  }
                                });
                                console.log(`📸 [一覧表示] アイテム[${item.id}] images: ${item.images.length}件`);
                              }
                              
                              // 5. chatData.messagesから画像を抽出（最後のフォールバック）
                              if (item.jsonData?.chatData?.messages) {
                                const messages = item.jsonData.chatData.messages || [];
                                const messageImages = messages.flatMap((msg: any) => msg.media || []);
                                messageImages.forEach((img: any) => {
                                  const fileName = img.fileName || img.url?.split('/').pop();
                                  if (fileName && !imageMap.has(fileName)) {
                                    imageMap.set(fileName, img);
                                  }
                                });
                                if (messageImages.length > 0) {
                                  console.log(`📸 [一覧表示] アイテム[${item.id}] chatData.messages: ${messageImages.length}件`);
                                }
                              }
                              
                              // Mapから配列に変換
                              displayImages = Array.from(imageMap.values());
                              console.log(`📸 [一覧表示] アイテム[${item.id}] 統合後の合計画像数: ${displayImages.length}件`);

                              return displayImages.length > 0 ? (
                                <>
                                  {displayImages.slice(0, 3).map((image: any, idx: number) => {
                                    // 画像データの正規化
                                    const normalizeImageUrl = (img: any): { url: string; fileName: string } | null => {
                                      let fileName = '';
                                      
                                      // ファイル名の抽出
                                      if (typeof img === 'string') {
                                        fileName = img.split('/').pop()?.split('\\').pop() || img;
                                      } else if (img && typeof img === 'object') {
                                        fileName = img.fileName || img.url?.split('/').pop()?.split('\\').pop() || img.path?.split('/').pop()?.split('\\').pop() || '';
                                      }

                                      if (!fileName) return null;

                                      // 本番環境では絶対URL、開発環境では相対パス
                                      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                                      // baseUrlに/apiが含まれている場合は除去
                                      const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
                                      return {
                                        url: `${cleanBaseUrl}/api/images/chat-exports/${fileName}`,
                                        fileName
                                      };
                                    };

                                    const normalized = normalizeImageUrl(image);
                                    if (!normalized) {
                                      console.warn('⚠️ 画像正規化失敗:', image);
                                      return null;
                                    }

                                    const { url: imageUrl, fileName } = normalized;

                                    if (!imageUrl) {
                                      console.warn('⚠️ 画像URL不明:', normalized);
                                      return null;
                                    }

                                    console.log('📸 一覧表画像表示:', { 
                                      fileName, 
                                      imageUrl, 
                                      originalImage: image,
                                      baseUrl: import.meta.env.VITE_API_BASE_URL
                                    });

                                    // 一意なキーを生成
                                    const imageKey = `${item.id}-${fileName || idx}-${idx}`;

                                    return (
                                      <img
                                        key={imageKey}
                                        src={imageUrl}
                                        alt={fileName || `画像${idx + 1}`}
                                        className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                                        onError={(e) => {
                                          const img = e.target as HTMLImageElement;
                                          console.warn('画像読み込みエラー:', imageUrl);
                                          // エラー時は画像を非表示
                                          img.style.display = 'none';
                                        }}
                                        onClick={() => {
                                          window.open(imageUrl, '_blank');
                                        }}
                                        title={fileName || `画像${idx + 1}`}
                                      />
                                    );
                                  })}
                                  {displayImages.length > 3 && (
                                    <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded border border-gray-300 text-xs text-gray-500">
                                      +{displayImages.length - 3}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">画像なし</span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          <div className="flex flex-wrap justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={generatingReportId !== null}
                              onClick={() => handleGenerateFailureReport(item)}
                              className="px-3 text-sm text-blue-700"
                              style={{ height: '42px' }}
                            >
                              {generatingReportId === item.id ? '下書き生成中...' : '報告書の下書き生成'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 既に読み込まれている一覧データから該当アイテムを使用
                                console.log('📝 編集開始:', item);
                                console.log('📝 item.machineType:', item.machineType);
                                console.log('📝 item.machineNumber:', item.machineNumber);
                                console.log('📝 item.jsonData:', item.jsonData);

                                // 元のデータをディープコピーで保存
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
                  onClick={() => handleExportSelected('csv')}
                >
                  CSV形式でエクスポート
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedItems.size === 0}
                  onClick={() => handleExportSelected('xlsx')}
                >
                  Excel形式でエクスポート
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
                <h2 className="text-xl font-bold">機械故障報告書・履歴編集</h2>
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
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                        value={editingItem.jsonData?.title || editingItem.jsonData?.question || ''}
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
                      <span className="text-xs text-gray-500 font-normal ml-2">(JPG/PNG/BMP対応)</span>
                    </h3>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/bmp"
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
                            const { buildApiUrl } = await import('../lib/api');
                            const uploadUrl = buildApiUrl('/history/upload-image');
                            console.log('📎 編集画面画像アップロードURL:', uploadUrl);
                            const response = await fetch(uploadUrl, {
                              method: 'POST',
                              credentials: 'include',
                              body: formData,
                            });

                            if (!response.ok) {
                              const errorText = await response.text();
                              console.error('画像アップロードエラー:', errorText);
                              let errorData;
                              try {
                                errorData = JSON.parse(errorText);
                              } catch (e) {
                                throw new Error(`画像のアップロードに失敗しました (${response.status}): ${errorText.substring(0, 100)}`);
                              }
                              throw new Error(errorData.error || '画像のアップロードに失敗しました');
                            }

                            const result = await response.json();
                            console.log('✅ 画像アップロード成功:', result);
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
                          const updatedSavedImages = [...newImages, ...currentSavedImages];

                          console.log('🖼️ 画像追加処理:', {
                            新規画像数: newImages.length,
                            既存画像数: currentSavedImages.length,
                            合計画像数: updatedSavedImages.length,
                            新規画像: newImages,
                            既存画像: currentSavedImages,
                            統合後: updatedSavedImages
                          });

                          // 🔧 修正: すべてのフィールドを同期
                          setEditingItem({
                            ...editingItem,
                            savedImages: updatedSavedImages, // ルートレベルにも追加
                            jsonData: {
                              ...editingItem.jsonData,
                              savedImages: updatedSavedImages,
                              chatData: {
                                ...(editingItem.jsonData?.chatData || {}),
                                savedImages: updatedSavedImages, // chatData.savedImagesにも追加
                              },
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

                      // 画像URLを正規化する関数（本番環境では絶対URL）
                      const normalizeImageUrl = (url: string): string => {
                        if (!url) {
                          console.warn('🖼️ 編集画面: 空のURL');
                          return '';
                        }
                        
                        // 既に完全なURLの場合はそのまま返す
                        if (url.startsWith('http://') || url.startsWith('https://')) {
                          return url;
                        }
                        
                        const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                        // baseUrlから/apiを除去（二重パス防止）
                        const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, '');
                        
                        // /api/api/ のような重複を削除
                        let cleanUrl = url;
                        while (cleanUrl.includes('/api/api/')) {
                          cleanUrl = cleanUrl.replace('/api/api/', '/api/');
                        }
                        
                        // /api/images/chat-exports/exports/ のような2重パスを修正
                        cleanUrl = cleanUrl.replace('/chat-exports/exports/', '/chat-exports/');
                        cleanUrl = cleanUrl.replace('/emergency-flows/exports/', '/emergency-flows/');
                        
                        // 既に /api/images/ で始まっている場合は絶対URLに変換
                        if (cleanUrl.startsWith('/api/images/')) {
                          return `${cleanBaseUrl}${cleanUrl}`;
                        }
                        
                        // ファイル名のみの場合は /api/images/chat-exports/ を追加
                        if (!cleanUrl.startsWith('/') && !cleanUrl.includes('/')) {
                          cleanUrl = `/api/images/chat-exports/${cleanUrl}`;
                        }
                        
                        // 絶対URLに変換
                        if (cleanUrl.startsWith('/api')) {
                          return `${cleanBaseUrl}${cleanUrl}`;
                        }
                        
                        const finalPath = cleanUrl.startsWith('/') ? `/api${cleanUrl}` : `/api/${cleanUrl}`;
                        return `${cleanBaseUrl}${finalPath}`;
                      };

                      // 🔧 修正: 複数のソースから画像を統合
                      // 優先順位: savedImages > jsonData.savedImages > jsonData.chatData.savedImages > images
                      const imageMap = new Map<string, any>();
                      const sources = [
                        { data: item?.savedImages, name: 'savedImages' },
                        { data: item?.jsonData?.savedImages, name: 'jsonData.savedImages' },
                        { data: (item?.jsonData as any)?.chatData?.savedImages, name: 'chatData.savedImages' },
                        { data: item?.images, name: 'images' }
                      ];
                      
                      sources.forEach(source => {
                        if (Array.isArray(source.data) && source.data.length > 0) {
                          console.log(`🔍 編集画面: ${source.name}から${source.data.length}件の画像を検出`);
                          source.data.forEach((img: any) => {
                            const fileName = typeof img === 'string' 
                              ? img.split('/').pop()?.split('\\').pop()
                              : img.fileName || img.url?.split('/').pop();
                            if (fileName && !fileName.startsWith('data:image/') && !imageMap.has(fileName)) {
                              imageMap.set(fileName, img);
                            }
                          });
                        }
                      });
                      
                      const sourceImages = Array.from(imageMap.values());
                      console.log(`🔍 編集画面: 統合後の画像数=${sourceImages.length}`, Array.from(imageMap.keys()));
                      
                      sourceImages.forEach((img: any, idx: number) => {
                        // 文字列の場合
                        if (typeof img === 'string' && !img.startsWith('data:image/')) {
                          const imageUrl = normalizeImageUrl(img);
                          const actualFileName = img.split('/').pop();
                          images.push({ url: imageUrl, fileName: actualFileName, index: images.length });
                          console.log(`  ✅ [${idx}] 文字列: ${actualFileName}`);
                        } 
                        // オブジェクトの場合
                        else if (img && typeof img === 'object') {
                          let imageUrl = '';
                          let actualFileName = '';
                          
                          if (img.url) {
                            imageUrl = normalizeImageUrl(img.url);
                            actualFileName = img.url.split('/').pop() || img.fileName || '';
                          } else if (img.fileName) {
                            const cleanFileName = img.fileName.includes('/')
                              ? img.fileName.split('/').pop()
                              : img.fileName.includes('\\')
                                ? img.fileName.split('\\').pop()
                                : img.fileName;
                            imageUrl = normalizeImageUrl(`/api/images/chat-exports/${cleanFileName}`);
                            actualFileName = cleanFileName;
                          } else if (img.path) {
                            // パスからファイル名を抽出してURLを構築
                            const fileName = img.path.split('/').pop()?.split('\\').pop() || img.path;
                            imageUrl = normalizeImageUrl(`/api/images/chat-exports/${fileName}`);
                            actualFileName = fileName;
                          }
                          
                          if (imageUrl && actualFileName) {
                            images.push({ url: imageUrl, fileName: actualFileName, index: images.length });
                            console.log(`  ✅ [${idx}] オブジェクト: ${actualFileName}`);
                          }
                        }
                      });

                      console.log(`📊 編集画面: 最終画像数=${images.length}`);
                      console.log('📋 画像一覧:', images.map(img => img.fileName || img.url.split('/').pop()));

                      return images;
                    };

                    const imageList = getAllImages(editingItem);
                    if (imageList.length > 0) {
                      // 最大6枚まで表示（横3列×縦2行）
                      const displayImages = imageList.slice(0, 6);
                      const hasMoreImages = imageList.length > 6;
                      
                      return (
                        <>
                        <div className="grid grid-cols-3 gap-4">
                          {displayImages.map((image, mapIndex) => {
                            // 一意なキーを生成（fileName + index の組み合わせ）
                            const imageKey = `${image.fileName || 'img'}-${image.index}-${mapIndex}`;

                            return (
                              <div key={imageKey} className="relative group">
                                <img
                                  src={image.url}
                                  alt={image.fileName || '故障画像'}
                                  className="w-full h-auto max-h-48 object-contain rounded-md"
                                  onLoad={() => {
                                    console.log(`✅ 画像読み込み成功 (編集画面):`, {
                                      fileName: image.fileName,
                                      url: image.url
                                    });
                                  }}
                                  onError={(e) => {
                                    console.error(`❌ 画像読み込みエラー (編集画面):`, {
                                      fileName: image.fileName,
                                      url: image.url,
                                      error: '画像の取得に失敗しました'
                                    });
                                    const imgElement = e.target as HTMLImageElement;
                                    imgElement.style.display = 'none';
                                    // エラー表示を追加
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'text-red-500 text-xs p-2 border border-red-300 rounded bg-red-50';
                                    errorDiv.textContent = `画像読み込み失敗: ${image.fileName || 'unknown'}`;
                                    imgElement.parentElement?.appendChild(errorDiv);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    console.log('🗑️ 画像削除リクエスト:', {
                                      fileName: image.fileName,
                                      url: image.url
                                    });

                                    // 比較用の正規化関数
                                    const normalizeForCompare = (str: string): string => {
                                      if (!str) return '';
                                      return str.split('/').pop()?.split('\\').pop() || str;
                                    };
                                    
                                    const targetFileName = normalizeForCompare(image.fileName || image.url || '');
                                    
                                    // 画像削除フィルター関数
                                    const filterOutImage = (img: any) => {
                                      const imgFileName = normalizeForCompare(img.fileName || img.url || img.path || '');
                                      const shouldDelete = imgFileName && targetFileName && imgFileName === targetFileName;
                                      if (shouldDelete) {
                                        console.log(`  ✅ 削除: ${imgFileName}`);
                                      }
                                      return !shouldDelete;
                                    };

                                    // 🔧 修正: すべてのソースから削除
                                    const updatedJsonDataSavedImages = (editingItem.jsonData?.savedImages || []).filter(filterOutImage);
                                    const updatedSavedImages = (editingItem.savedImages || []).filter(filterOutImage);
                                    const updatedImages = (editingItem.images || []).filter(filterOutImage);
                                    const updatedChatDataSavedImages = ((editingItem.jsonData as any)?.chatData?.savedImages || []).filter(filterOutImage);
                                    
                                    // chatData.messages[].media からも削除
                                    const updatedMessages = (editingItem.jsonData?.chatData?.messages || []).map((msg: any) => ({
                                      ...msg,
                                      media: (msg.media || []).filter(filterOutImage)
                                    }));

                                    console.log('📝 削除結果:', {
                                      'jsonData.savedImages': `${(editingItem.jsonData?.savedImages || []).length} → ${updatedJsonDataSavedImages.length}`,
                                      'savedImages': `${(editingItem.savedImages || []).length} → ${updatedSavedImages.length}`,
                                      'images': `${(editingItem.images || []).length} → ${updatedImages.length}`,
                                      'messages.media': `更新済み`
                                    });

                                    // state を更新（すべてのソース）
                                    const newEditingItem = {
                                      ...editingItem,
                                      savedImages: updatedSavedImages,
                                      images: updatedImages,
                                      jsonData: {
                                        ...editingItem.jsonData,
                                        savedImages: updatedJsonDataSavedImages,
                                        chatData: {
                                          ...(editingItem.jsonData?.chatData || {}),
                                          savedImages: updatedChatDataSavedImages, // 🔧 修正: chatData.savedImagesも更新
                                          messages: updatedMessages
                                        }
                                      },
                                    };
                                    
                                    setEditingItem(newEditingItem);
                                    console.log('✅ 画像削除完了 - すべてのソース更新済み');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        {hasMoreImages && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                            ⚠️ 画像が6枚を超えています（全{imageList.length}枚）。最初の6枚のみ表示しています。
                          </div>
                        )}
                        </>
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
