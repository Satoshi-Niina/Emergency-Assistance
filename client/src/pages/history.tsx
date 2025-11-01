import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SupportHistoryItem } from '../types/history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Trash2, Download, Settings, Image, MapPin, Calendar } from 'lucide-react';
import { api } from '../lib/api-unified';
import ChatExportReport from '@/components/report/chat-export-report';

type MachineData = {
  machineTypes: Array<{ id: string; machineTypeName: string }>;
};

function HistoryPage() {
  // useState declarations
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SupportHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; title: string }>({ show: false, id: '', title: '' });
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(null);
  const [originalJsonData, setOriginalJsonData] = useState<any>(null); // 元のJSONデータを保持
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    machineType: '',
    machineNumber: '',
    searchText: '',
    searchDate: '',
  });
  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(null);
  const [searchFilterData, setSearchFilterData] = useState<{ machineTypes: string[]; machineNumbers: string[] }>({ machineTypes: [], machineNumbers: [] });

  // useRef declarations
  const searchFilterLoading = false;
  const totalPages = 1;
  const currentPage = 1;

  // Helper functions
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleString('ja-JP');
  };

  const normalizeJsonData = (item: SupportHistoryItem): SupportHistoryItem => {
    return {
      ...item,
      jsonData: item.jsonData || {},
    };
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (editingItem && (key === 'machineType' || key === 'machineNumber')) {
      setEditingItem(prev => prev ? ({ ...prev, [key]: value } as SupportHistoryItem) : prev);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleOpenEdit = async (item: SupportHistoryItem) => {
    // 元のJSONファイルからデータを取得（差分計算のため）
    try {
      let itemId = item.id || item.chatId;
      if (!itemId) {
        setEditingItem(item);
        setOriginalJsonData(item.jsonData || {});
        setShowEditDialog(true);
        return;
      }
      
      // IDの正規化
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
      
      // 元のJSONファイルを取得
      const response = await fetch(`/api/history/${itemId}`);
      if (response.ok) {
        const data = await response.json();
        const originalData = data.data || data;
        setOriginalJsonData(originalData);
      } else {
        // 取得に失敗した場合は現在のjsonDataを使用
        setOriginalJsonData(item.jsonData || {});
      }
    } catch (error) {
      console.error('元のJSONデータ取得エラー:', error);
      // エラーの場合は現在のjsonDataを使用
      setOriginalJsonData(item.jsonData || {});
    }
    
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const generateListPrintHTML = (items: SupportHistoryItem[]): string => {
    let html = '';
    html += '<!DOCTYPE html>';
    html += '<html>';
    html += '<head>';
    html += '  <title>履歴一覧 - 印刷</title>';
    html += '  <style>';
    html += '    @page { size: A4 portrait; margin: 10mm; }';
    html += '    @media print {';
    html += '      html, body { margin: 0; padding: 0; }';
    html += '      .no-print { display: none !important; }';
    html += '      img, .image-cell { break-inside: avoid; page-break-inside: avoid; }';
    html += '      table { width: 100%; border-collapse: collapse; table-layout: fixed; }';
    html += '      th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }';
    html += '    }';
    html += '    body { font-family: Arial, sans-serif; margin: 20px; }';
    html += '    .header { text-align: center; margin-bottom: 20px; }';
    html += '    table { width: 100%; border-collapse: collapse; margin-top: 20px; }';
    html += '    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }';
    html += '    th { background-color: #f5f5f5; font-weight: bold; }';
    html += '  </style>';
    html += '</head>';
    html += '<body>';
    html += '  <div class="header">';
    html += '    <h1>故障履歴一覧</h1>';
    html += '    <p>印刷日時: ' + new Date().toLocaleString('ja-JP') + '</p>';
    html += '  </div>';
    html += '  <table>';
    html += '    <thead>';
    html += '      <tr>';
    html += '        <th>機種</th>';
    html += '        <th>機械番号</th>';
    html += '        <th>事象</th>';
    html += '        <th>作成日時</th>';
    html += '      </tr>';
    html += '    </thead>';
    html += '    <tbody>';
    html += items.map(item => {
      const jsonData = item.jsonData || {};
      const machineType = jsonData?.machineType || item.machineType || '';
      const machineNumber = jsonData?.machineNumber || item.machineNumber || '';
      const incidentTitle = jsonData?.title || item.title || '事象なし';
      return '<tr>' +
        '<td>' + machineType + '</td>' +
        '<td>' + machineNumber + '</td>' +
        '<td>' + incidentTitle + '</td>' +
        '<td>' + formatDate(item.createdAt) + '</td>' +
        '</tr>';
    }).join('');
    html += '    </tbody>';
    html += '  </table>';
    html += '</body>';
    html += '</html>';
    return html;
  };

  const handleSearch = () => {
    // フィルターに基づいてフィルタリングは既にuseEffectで行われている
    // 必要に応じて追加の処理をここに追加
  };

  const handlePageChange = (page: number) => {
  // fetchHistoryData(page); // 未定義関数呼び出しを削除
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      setLoading(true);
      console.log(`🗑️ 削除リクエスト開始 - ID: ${id}`);
      // /api/history/:sessionId で削除
      const response = await api.delete(`/history/${id}`);
      console.log(`✅ 削除成功:`, response);
      // 削除後、履歴リストを再読み込み
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
        setHistoryItems(items);
        setFilteredItems(items);
      }
      setDeleteConfirm({ show: false, id: '', title: '' });
      alert('履歴を削除しました。');
    } catch (error: any) {
      console.error('履歴削除エラー:', error);
      const errorMessage = error?.response?.data?.error || error?.message || '不明なエラー';
      alert(`履歴の削除に失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSelected = async (format: 'json' | 'csv' = 'json') => {
    if (selectedItems.size === 0) {
      alert('エクスポートする履歴を選択してください。');
      return;
    }
    try {
      setExportLoading(true);
      // /api/history/export-selected へIDリストでPOST
      const ids = Array.from(selectedItems);
      const res = await fetch('/api/history/export-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, format }),
      });
      if (!res.ok) throw new Error('エクスポートに失敗しました');
      const blob = await res.blob();
      downloadFile(blob, `selected_history.${format}`);
    } catch (error) {
      console.error('選択履歴エクスポートエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      // /api/history/export/:sessionId?format=json
      const res = await fetch(`/api/history/export/${item.id}?format=json`);
      if (!res.ok) throw new Error('エクスポートに失敗しました');
      const blob = await res.blob();
      downloadFile(blob, `history_${item.id}.json`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
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

  const handleExportItem = async (
    item: SupportHistoryItem,
    format: 'json' | 'csv' = 'json'
  ) => {
    try {
      setExportLoading(true);
      // /api/history/export/:sessionId?format=json|csv
      const res = await fetch(`/api/history/export/${item.id}?format=${format}`);
      if (!res.ok) throw new Error('エクスポートに失敗しました');
      const blob = await res.blob();
      downloadFile(blob, `history_${item.id}.${format}`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAll = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      // /api/history/export-all?format=json|csv
      const params = new URLSearchParams({ format });
      const res = await fetch(`/api/history/export-all?${params.toString()}`);
      if (!res.ok) throw new Error('エクスポートに失敗しました');
      const blob = await res.blob();
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
      searchDate: '',
    });
  };



  const handleGenerateReport = async () => {
    // 既にレポート生成中の場合は処理を停止
    if (reportLoading) {
  console.log('Report is being generated. Stopping process.');
      return;
    }

    try {
  console.log('=== Report generation started ===');
      setReportLoading(true);

      // 選択されたアイテムのみを対象とする
      // 全件を対象とする
      const targetItems = filteredItems;

  console.log('Report generation started:', {
        filteredItemsCount: filteredItems.length,
        targetItemsCount: targetItems.length,
      });

      // 対象アイテムがない場合は処理を停止
      if (targetItems.length === 0) {
        alert('対象アイテムがありません。');
        setReportLoading(false);
        return;
      }

      // 各アイテムのデータ構造を確認
      targetItems.forEach((item, index) => {
        console.log(`アイテム${index + 1}のデータ構造:`, {
          id: item.id,
          fileName: item.fileName,
          hasJsonData: !!item.jsonData,
          jsonDataKeys: item.jsonData ? Object.keys(item.jsonData) : [],
          machineInfo: item.machineInfo,
          machineType: item.machineType,
          machineNumber: item.machineNumber,
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
            const userMessages = jsonData?.chatData?.messages?.filter(
              (msg: any) => !msg.isAiResponse
            );
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }

        if (title) allTitles.push(title);

        if (jsonData?.extractedComponents)
          allComponents.push(...jsonData.extractedComponents);
        if (jsonData?.extractedSymptoms)
          allSymptoms.push(...jsonData.extractedSymptoms);
        if (jsonData?.possibleModels)
          allModels.push(...jsonData.possibleModels);
      });

      console.log('抽出されたデータ:', {
        titles: allTitles,
        components: allComponents,
        symptoms: allSymptoms,
        models: allModels,
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
            const userMessages = jsonData?.chatData?.messages?.filter(
              (msg: any) => !msg.isAiResponse
            );
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }

        // 機種と機械番号を抽出
        const machineType =
          item.machineInfo?.machineTypeName ||
          jsonData?.machineType ||
          jsonData?.chatData?.machineInfo?.machineTypeName ||
          item.machineType ||
          '';
        const machineNumber =
          item.machineInfo?.machineNumber ||
          jsonData?.machineNumber ||
          jsonData?.chatData?.machineInfo?.machineNumber ||
          item.machineNumber ||
          '';

        console.log(`レポート${index + 1}の基本情報:`, {
          title,
          machineType,
          machineNumber,
        });

        // 画像データを収集（優先順位付き）
        const images = [];

        try {
          // 優先順位1: conversationHistoryからBase64画像を取得（最優先）
          if (jsonData?.conversationHistory?.length > 0) {
            console.log(
              'handleGenerateReport: conversationHistoryからBase64画像を検索中...',
              jsonData.conversationHistory.length
            );
            const imageMessages = jsonData.conversationHistory.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: conversationHistoryでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              images.push({
                id: `conv-${index}`,
                url: msg.content,
                fileName: `故障画像_${index + 1}`,
                description: '機械故障箇所の写真',
                source: 'conversationHistory',
              });
            });
          }

          // 優先順位2: originalChatData.messagesからBase64画像を取得
          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: originalChatData.messagesからBase64画像を検索中...',
              jsonData.originalChatData.messages.length
            );
            const imageMessages = jsonData.originalChatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: originalChatData.messagesでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'originalChatData',
                });
              }
            });
          }

          // 優先順位3: chatData.messagesからBase64画像を取得
          if (jsonData?.chatData?.messages?.length > 0) {
            console.log(
              'handleGenerateReport: chatData.messagesからBase64画像を検索中...',
              jsonData.chatData.messages.length
            );
            const imageMessages = jsonData.chatData.messages.filter(
              (msg: any) =>
                msg.content &&
                typeof msg.content === 'string' &&
                msg.content.startsWith('data:image/')
            );
            console.log(
              'handleGenerateReport: chatData.messagesでBase64画像を発見:',
              imageMessages.length
            );
            imageMessages.forEach((msg, index) => {
              // 既に追加済みの画像は除外
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `故障画像_${images.length + 1}`,
                  description: '機械故障箇所の写真',
                  source: 'chatData',
                });
              }
            });
          }

          // 優先順位4: savedImagesフィールドから画像を取得
          if (jsonData?.savedImages?.length > 0) {
            console.log(
              'handleGenerateReport: savedImagesから画像を取得中...',
              jsonData.savedImages.length
            );
            jsonData.savedImages.forEach((img: any, index: number) => {
              // 既に追加済みの画像は除外
              if (
                !images.some(
                  existingImg =>
                    existingImg.url === img.url || existingImg.url === img.path
                )
              ) {
                images.push({
                  id: `saved-${index}`,
                  url: img.url || img.path,
                  fileName: img.fileName || `故障画像_${images.length + 1}`,
                  description: img.description || '機械故障箇所の写真',
                  source: 'savedImages',
                });
              }
            });
          }

          // 優先順位5: 再帰的にJSONデータ内の画像を検索
          const findImagesRecursively = (
            obj: any,
            path: string = ''
          ): string[] => {
            const foundImages: string[] = [];

            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;

                if (
                  typeof value === 'string' &&
                  value.startsWith('data:image/')
                ) {
                  foundImages.push(value);
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    foundImages.push(
                      ...findImagesRecursively(item, `${currentPath}[${index}]`)
                    );
                  });
                } else if (typeof value === 'object' && value !== null) {
                  foundImages.push(
                    ...findImagesRecursively(value, currentPath)
                  );
                }
              });
            }

            return foundImages;
          };

          const recursiveImages = findImagesRecursively(jsonData);
          console.log(
            'handleGenerateReport: 再帰検索で画像を発見:',
            recursiveImages.length
          );
          recursiveImages.forEach((imgUrl, index) => {
            // 既に追加済みの画像は除外
            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `故障画像_${images.length + 1}`,
                description: '機械故障箇所の写真',
                source: 'recursive',
              });
            }
          });

          // 優先順位6: imagePathフィールド（最終フォールバック）
          if (
            jsonData?.imagePath &&
            typeof jsonData.imagePath === 'string' &&
            !images.some(img => img.url === jsonData.imagePath)
          ) {
            console.log('handleGenerateReport: imagePathから画像を取得中...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '故障画像',
              description: '機械故障箇所の写真',
              source: 'imagePath',
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
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          repairLocation: '工場内修理スペース',
          images: images.length > 0 ? images : undefined,
          savedImages: images.length > 0 ? images : undefined, // collectImagesで使用
          chatHistory:
            jsonData?.conversationHistory ||
            jsonData?.chatData?.messages ||
            undefined,
          // collectImagesで使用するためのデータを含める
          chatData: jsonData?.chatData || item.jsonData?.chatData || undefined,
          conversationHistory: jsonData?.conversationHistory || undefined,
          // その他のフィールド
          machineType: machineType,
          machineNumber: machineNumber,
          title: title,
          problemDescription: title,
          id: item.id,
          chatId: item.chatId || item.id,
          createdAt: item.createdAt,
        };

        console.log(`レポート${index + 1}の生成完了:`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0,
        });

        return reportData;
      });

      console.log('=== レポートデータ生成完了 ===');
      console.log('レポート配列の長さ:', reportDataArray.length);
      console.log(
        '各レポートの詳細:',
        reportDataArray.map((report, index) => ({
          index,
          reportId: report.reportId,
          description: report.description,
          images: report.images?.map(img => ({
            url: img.url.substring(0, 50) + (img.url.length > 50 ? '...' : ''),
            fileName: img.fileName,
            isBase64: img.url.startsWith('data:image/'),
          })),
        }))
      );

      // 各レポートデータに対して印刷プレビューウィンドウを開く
      reportDataArray.forEach((reportData, index) => {
        try {
          console.log(`🖼️ レポート${index + 1}の印刷プレビューを開きます:`, reportData.reportId);
          
          // HTML生成
          const html = generateMachineFailureReportHTML(reportData);
          
          // 新しいウィンドウを開く
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            
            // ウィンドウが読み込まれたらフォーカス
            printWindow.onload = () => {
              console.log(`✅ レポート${index + 1}の印刷プレビューを開きました`);
            };
            
            // 複数のレポートがある場合は少し遅延させる
            if (reportDataArray.length > 1 && index < reportDataArray.length - 1) {
              setTimeout(() => {}, 500); // 次のレポートまで500ms待機
            }
          } else {
            console.error(`❌ レポート${index + 1}の印刷プレビューウィンドウを開けませんでした`);
            alert(`レポート${index + 1}の印刷プレビューウィンドウを開けませんでした。ポップアップブロッカーを無効にしてください。`);
          }
        } catch (error) {
          console.error(`❌ レポート${index + 1}の印刷プレビュー生成エラー:`, error);
          alert(`レポート${index + 1}の印刷プレビュー生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // 成功通知
      if (reportDataArray.length > 0) {
        alert(
          `レポートが正常に生成されました。\n対象アイテム: ${targetItems.length}件 (選択済み)\n${reportDataArray.length > 1 ? '複数の印刷プレビューウィンドウが開きます。' : '印刷プレビューウィンドウが開きます。'}`
        );
      }

  // console.log削除
    } catch (error) {
      // console.error削除
      alert(
        'レポート生成中にエラーが発生しました: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      // エラーが発生しても確実にローディング状態をリセット
      setReportLoading(false);
  // console.log削除
    }
  };

  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/emergency-flow/file?name=${encodeURIComponent(fileName)}`
      );
      if (!response.ok) {
        throw new Error('チャットエクスポートファイルの取得に失敗しました');
      }

      const data = await response.json();

      // 新しいフォーマットのデータを確認して、適切な形式に変換
      const reportData = {
        ...data,
        // 新しいフォーマットのフィールドを追加
        title:
          data.title ||
          data.chatData?.machineInfo?.machineTypeName ||
          'タイトルなし',
        problemDescription: data.problemDescription || '説明なし',
        machineType:
          data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
        machineNumber:
          data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
        extractedComponents: data.extractedComponents || [],
        extractedSymptoms: data.extractedSymptoms || [],
        possibleModels: data.possibleModels || [],
        conversationHistory:
          data.conversationHistory || data.chatData?.messages || [],
        metadata: data.metadata || {
          total_messages: data.chatData?.messages?.length || 0,
          user_messages: 0,
          ai_messages: 0,
          total_media: data.savedImages?.length || 0,
          export_format_version: '1.0',
        },
      };

      setSelectedReportData(reportData);
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
    // レポート生成の状態もリセット
    setReportLoading(false);
  };

  const handleSaveReport = (reportData: any) => {
    console.log('レポートデータを保存:', reportData);

    // レポートデータをローカルストレージに保存
    const savedReports = JSON.parse(
      localStorage.getItem('savedReports') || '[]'
    );
    const newReport = {
      id: Date.now(),
      fileName: selectedFileName,
      reportData: reportData,
      savedAt: new Date().toISOString(),
    };
    savedReports.push(newReport);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));

    console.log('レポートが保存されました:', newReport);
  };

  // 【削除済み】破損したautoLoadHistoryFiles関数を削除
  // 代わりにdb-history-loader.tsxのloadHistoryFromDBを使用

  // 履歴データの読み込み
  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        setLoading(true);
        const { loadHistoryFromDB } = await import('../components/db-history-loader');
        const items = await loadHistoryFromDB();
        setHistoryItems(items);
        setFilteredItems(items);
      } catch (error) {
        console.error('履歴データの読み込みエラー:', error);
        // フォールバック: APIから直接取得
        try {
          const res = await fetch('/api/history');
          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
            setHistoryItems(items);
            setFilteredItems(items);
          }
        } catch (fallbackError) {
          console.error('フォールバック読み込みエラー:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadHistoryData();
  }, []);

  // フィルター変更時にフィルタリング
  useEffect(() => {
    let filtered = [...historyItems];

    // 機種フィルター
    if (filters.machineType) {
      filtered = filtered.filter(item => {
        const machineType = item.machineType || item.jsonData?.machineType || '';
        return machineType === filters.machineType;
      });
    }

    // 機械番号フィルター
    if (filters.machineNumber) {
      filtered = filtered.filter(item => {
        const machineNumber = item.machineNumber || item.jsonData?.machineNumber || '';
        return machineNumber === filters.machineNumber;
      });
    }

    // テキスト検索
    if (filters.searchText) {
      const searchTerms = filters.searchText.toLowerCase().split(/\s+/);
      filtered = filtered.filter(item => {
        const searchableText = [
          item.title || '',
          item.incidentTitle || '',
          item.machineType || '',
          item.machineNumber || '',
          item.jsonData?.title || '',
          item.jsonData?.problemDescription || '',
          item.jsonData?.description || '',
        ].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // 日付検索
    if (filters.searchDate) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === filters.searchDate;
      });
    }

    setFilteredItems(filtered);
  }, [historyItems, filters]);

  // 履歴アイテムの編集データをサーバーに保存
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('編集された履歴アイテムを保存:', editedItem);
      let itemId = editedItem.id || editedItem.chatId;
      if (!itemId) {
        alert('アイテムIDが見つかりません。保存できません。');
        return;
      }
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
      // 差分を計算（変更された部分のみを抽出）
      const originalData = originalJsonData || {};
      const editedData = editedItem.jsonData || {};
      
      // 差分オブジェクトを作成（変更されたフィールドのみ）
      const diffData: any = {};
      
      // 各フィールドを比較して変更があったものだけを追加
      const fieldsToCompare = [
        'machineType',
        'machineNumber',
        'title',
        'problemDescription',
        'description',
        'location',
        'repairSchedule',
        'repairLocation',
        'repairDetails',
        'repairNotes',
      ];
      
      fieldsToCompare.forEach(field => {
        const originalValue = originalData[field];
        let editedValue: any;
        
        if (field === 'machineType') {
          editedValue = editedItem.machineType || editedData.machineType;
        } else if (field === 'machineNumber') {
          editedValue = editedItem.machineNumber || editedData.machineNumber;
        } else if (field === 'title') {
          editedValue = editedItem.jsonData?.title || editedItem.title || editedData.title;
        } else {
          editedValue = editedData[field];
        }
        
        // 値を比較（null/undefined/空文字の扱いを統一）
        const originalValueNormalized = originalValue === null || originalValue === undefined ? '' : String(originalValue);
        const editedValueNormalized = editedValue === null || editedValue === undefined ? '' : String(editedValue);
        
        if (originalValueNormalized !== editedValueNormalized) {
          diffData[field] = editedValue;
          console.log(`📝 差分検出 [${field}]: "${originalValueNormalized}" → "${editedValueNormalized}"`);
        }
      });
      
      console.log('📝 差分データ:', diffData);
      console.log('📝 元のデータ（主要フィールド）:', {
        machineType: originalData.machineType,
        machineNumber: originalData.machineNumber,
        title: originalData.title,
        problemDescription: originalData.problemDescription,
      });
      console.log('📝 編集後のデータ（主要フィールド）:', {
        machineType: editedItem.machineType,
        machineNumber: editedItem.machineNumber,
        title: editedItem.jsonData?.title || editedItem.title,
        problemDescription: editedItem.jsonData?.problemDescription,
      });
      
      // 差分データが空の場合は警告
      if (Object.keys(diffData).length === 0) {
        console.warn('⚠️ 差分データが空です。変更がないか、元のデータが取得できていません。');
        const shouldSave = confirm('変更が検出されませんでした。それでも保存しますか？\n（元のJSONファイル全体を更新します）');
        if (!shouldSave) {
          console.log('保存がキャンセルされました');
          return;
        }
        // 差分が空でも保存する場合は、編集後のデータ全体を送信
        Object.assign(diffData, {
          ...editedData,
          machineType: editedItem.machineType,
          machineNumber: editedItem.machineNumber,
          title: editedItem.jsonData?.title || editedItem.title,
        });
        console.log('📝 全体データで保存します:', diffData);
      }
      
      const updatePayload = {
        updatedData: diffData, // 差分データのみを送信（または全体データ）
        updatedBy: 'user',
      };
      
      console.log('📤 送信する更新ペイロード:', updatePayload);
      // /api/history/update-item/:id でPUT
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      // ローカルストレージも更新
      if (itemId) {
        const savedKey = 'savedMachineFailureReport_' + itemId;
        localStorage.setItem(savedKey, JSON.stringify(editedItem.jsonData));
      }
      setHistoryItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? {
                ...item,
                jsonData: editedItem.jsonData,
                lastModified: new Date().toISOString(),
                machineType:
                  editedItem.jsonData?.machineType || item.machineType,
                machineNumber:
                  editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle,
              }
            : item
        )
      );
      setFilteredItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId || item.chatId === itemId
            ? {
                ...item,
                jsonData: editedItem.jsonData,
                lastModified: new Date().toISOString(),
                machineType:
                  editedItem.jsonData?.machineType || item.machineType,
                machineNumber:
                  editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle,
              }
            : item
        )
      );
      alert('履歴が正常に更新され、元のファイルに差分で上書き保存されました。');
      setShowEditDialog(false);
      setEditingItem(null);
      setOriginalJsonData(null); // 元のデータをクリア
    } catch (error) {
      console.error('❌ 履歴保存エラー:', error);
      console.error('❌ エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        itemId: editedItem.id || editedItem.chatId,
        originalJsonData: originalJsonData ? 'あり' : 'なし',
        editedItem: editedItem,
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('履歴の保存に失敗しました: ' + errorMessage + '\n\nブラウザのコンソール（F12）で詳細を確認してください。');
    }
  };

  const extractJsonInfo = (jsonData: any) => {
    try {
      const data =
        typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return {
        title: data.title || data.name || '',
        description: data.description || data.content || '',
        emergencyMeasures: data.emergencyMeasures || data.measures || '',
      };
    } catch (error) {
      return {
        title: '',
        description: '',
        emergencyMeasures: '',
      };
    }
  };

  // 機械故障報告書のHTML生成関数
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // JSONデータを安全にエスケープする関数（強化版）
    const safeJsonStringify = (obj: any): string => {
      try {
        let jsonStr = JSON.stringify(obj);
        // HTMLとJavaScriptで問題になる文字を徹底的にエスケープ
        jsonStr = jsonStr
          .replace(/\\/g, '\\\\') // バックスラッシュを最初にエスケープ
          .replace(/"/g, '\\"') // ダブルクォート
          .replace(/'/g, "\\'") // シングルクォート
          .replace(/</g, '\\u003c') // <
          .replace(/>/g, '\\u003e') // >
          .replace(/&/g, '\\u0026') // &
          .replace(/\//g, '\\/') // スラッシュ
          .replace(/:/g, '\\u003a') // コロン（重要）
          .replace(/\r/g, '\\r') // キャリッジリターン
          .replace(/\n/g, '\\n') // 改行
          .replace(/\t/g, '\\t') // タブ
          .replace(/\f/g, '\\f') // フォームフィード
          .replace(/\b/g, '\\b') // バックスペース
          .replace(/\u2028/g, '\\u2028') // ラインセパレータ
          .replace(/\u2029/g, '\\u2029'); // パラグラフセパレータ

        console.log('🔧 safeJsonStringify result length:', jsonStr.length);
        console.log(
          '🔧 safeJsonStringify sample:',
          jsonStr.substring(0, 100) + '...'
        );
        return jsonStr;
      } catch (e) {
        console.error('JSONのシリアライズに失敗:', e);
        return '{}';
      }
    };
    // 画像を収集（base64のみ、詳細なデバッグ付き）
    const collectImages = (
      data: any
    ): Array<{
      id: string;
      url: string;
      fileName: string;
      description?: string;
    }> => {
      console.log('🖼️ 画像収集開始 - reportData:', data);
      console.log('🖼️ reportData keys:', Object.keys(data || {}));

      const images: Array<{
        id: string;
        url: string;
        fileName: string;
        description?: string;
      }> = [];
      const imageUrls = new Set<string>();

      // デバッグ: データ構造を詳細確認
      console.log('🖼️ データ構造確認:');
      console.log('🖼️ - chatData:', data?.chatData ? 'あり' : 'なし');
      console.log(
        '🖼️ - chatData.messages:',
        data?.chatData?.messages
          ? 'あり(' + data.chatData.messages.length + '件)'
          : 'なし'
      );
      console.log(
        '🖼️ - conversationHistory:',
        data?.conversationHistory
          ? 'あり(' +
              (Array.isArray(data.conversationHistory)
                ? data.conversationHistory.length
                : 'non-array') +
              ')'
          : 'なし'
      );
      console.log(
        '🖼️ - originalChatData.messages:',
        data?.originalChatData?.messages
          ? 'あり(' + data.originalChatData.messages.length + ')'
          : 'なし'
      );
      console.log(
        '🖼️ - messages:',
        data?.messages
          ? 'あり(' +
              (Array.isArray(data.messages)
                ? data.messages.length
                : 'non-array') +
              ')'
          : 'なし'
      );

      // savedImagesから画像を取得（Base64処理削除済み）
      if (data?.savedImages && Array.isArray(data.savedImages)) {
        console.log('🖼️ savedImagesから画像を収集:', data.savedImages.length + '件');
        data.savedImages.forEach((img: any) => {
          let imageUrl = img.url || img.path || img.fileName || '';
          
          // URL正規化
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
            // /api/ で始まらない場合は追加
            if (!imageUrl.startsWith('/api/')) {
              const fileName = img.fileName || img.path || imageUrl.split('/').pop() || '';
              imageUrl = `/api/images/chat-exports/${fileName}`;
            }
            // /api/api/ を /api/ に正規化
            imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
          }
          
          if (imageUrl && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            console.log('🖼️ 画像追加:', { url: imageUrl, fileName: img.fileName });
            images.push({
              id: `saved-${images.length}`,
              url: imageUrl,
              fileName: img.fileName || '保存済み画像',
              description: '保存済み画像',
            });
          }
        });
      }
      
      // images配列からも取得
      if (data?.images && Array.isArray(data.images)) {
        console.log('🖼️ images配列から画像を収集:', data.images.length + '件');
        data.images.forEach((img: any) => {
          let imageUrl = img.url || img.path || img.fileName || '';
          
          // URL正規化
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
            // /api/ で始まらない場合は追加
            if (!imageUrl.startsWith('/api/')) {
              const fileName = img.fileName || img.path || imageUrl.split('/').pop() || '';
              imageUrl = `/api/images/chat-exports/${fileName}`;
            }
            // /api/api/ を /api/ に正規化
            imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
          }
          
          if (imageUrl && !imageUrls.has(imageUrl)) {
            imageUrls.add(imageUrl);
            console.log('🖼️ 画像追加:', { url: imageUrl, fileName: img.fileName });
            images.push({
              id: `image-${images.length}`,
              url: imageUrl,
              fileName: img.fileName || '画像',
              description: '画像',
            });
          }
        });
      }

      // chatData.messagesからも取得（印刷プレビュー用）
      if (data?.chatData?.messages && Array.isArray(data.chatData.messages)) {
        console.log('🖼️ [印刷プレビュー] chatData.messagesから画像を収集');
        for (const message of data.chatData.messages) {
          if (message.media && Array.isArray(message.media)) {
            for (const media of message.media) {
              if (media.type === 'image') {
                let imageUrl = media.url || media.path || media.fileName || '';
                
                // URL正規化
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
                  if (!imageUrl.startsWith('/api/')) {
                    const fileName = media.fileName || imageUrl.split('/').pop() || '';
                    imageUrl = `/api/images/chat-exports/${fileName}`;
                  }
                  imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
                }
                
                if (imageUrl && !imageUrls.has(imageUrl)) {
                  imageUrls.add(imageUrl);
                  console.log('🖼️ [印刷プレビュー] chatData.messagesから画像追加:', imageUrl);
                  images.push({
                    id: `message-${images.length}`,
                    url: imageUrl,
                    fileName: media.fileName || '画像',
                    description: '画像',
                  });
                }
              }
            }
          }
        }
      }

      console.log('🖼️ [印刷プレビュー] 画像収集結果:', images.length + '件の画像');
      images.forEach((img, index) => {
        console.log(
          '🖼️ [印刷プレビュー] 画像[' + index + ']:',
          img.description,
          '-',
          img.url ? img.url.substring(0, 50) + '...' : 'URLなし'
        );
      });

      return images;
    };

    const collectedImages = collectImages(reportData);
    const imageSection = `
      <div class="image-section">
        <h3 style="font-size:1.25rem;font-weight:600;margin-bottom:0.5em;">故障箇所画像</h3>
               <div class="image-grid">
          ${
            collectedImages && collectedImages.length > 0
              ? collectedImages
                   .map(
                     (image, index) => `
                   <div class="image-item">
                     <img class="report-img" 
                         src="${String(image.url)}" 
                          alt="故障画像${index + 1}" />
                   </div>
                 `
                   )
                  .join('')
              : '<div class="image-item" style="color:#888;text-align:center;">画像がありません</div>'
          }
               </div>
      </div>
    `;

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>機械故障報告書</title>
        <style>
          html, body {
            background: white;
            width: 100vw;
            max-width: 100vw;
            margin: 0 auto;
            overflow-x: hidden;
          }
          .container {
            width: 100vw;
            max-width: 100vw;
            margin: 0 auto;
            padding: 0;
            overflow-x: hidden;
          }
          /* 印刷時のみA4用紙に収まるように設定 */
          @page {
            size: A4 portrait;
            margin: 10mm 10mm; /* 上下左右10mmのマージン */
          }
          @media print {
            * {
              box-sizing: border-box !important;
            }
            html, body {
              width: 210mm !important;
              max-width: 210mm !important;
              min-width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
            }
            .container {
              width: 190mm !important; /* 210mm - 左右マージン(20mm) = 190mm */
              max-width: 190mm !important;
              min-width: 190mm !important;
              height: 277mm !important; /* 297mm - 上下マージン(20mm) = 277mm */
              max-height: 277mm !important;
              margin: 0 auto !important;
              padding: 3mm !important; /* コンテナ内のパディングを3mmに削減 */
              background: #fff !important;
              overflow: hidden !important;
            }
            body {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
              line-height: 1.2 !important; /* 1.3から1.2に削減 */
            }
            .header {
              margin-bottom: 4px !important;
              padding-bottom: 3px !important;
              border-bottom: 1px solid #333 !important;
            }
            .header h1 {
              font-size: 12pt !important; /* 14ptから12ptに削減 */
              margin-bottom: 2px !important;
              line-height: 1.1 !important;
              padding: 0 !important;
            }
            .header p {
              font-size: 7pt !important; /* 9ptから7ptに削減 */
              margin: 1px 0 !important;
            }
            .section {
              margin-bottom: 3px !important; /* 6pxから3pxに削減 */
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .section h2 {
              font-size: 10pt !important; /* 11ptから10ptに削減 */
              margin-bottom: 2px !important;
              padding-bottom: 2px !important;
              line-height: 1.1 !important;
              border-bottom: 1px solid #ccc !important;
            }
            .info-grid {
              gap: 2px !important; /* 3pxから2pxに削減 */
              margin-bottom: 3px !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              page-break-inside: avoid !important;
            }
            .info-item {
              padding: 2px 3px !important; /* 3px 4pxから2px 3pxに削減 */
              margin-bottom: 2px !important;
            }
            .info-item strong {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
              line-height: 1.2 !important;
              display: block !important;
            }
            .info-item span,
            .info-item input,
            .info-item textarea {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
              line-height: 1.2 !important;
            }
            .content-box {
              padding: 2px 3px !important; /* 4pxから2px 3pxに削減 */
              margin-top: 2px !important;
              margin-bottom: 2px !important;
              page-break-inside: avoid !important;
            }
            .content-box strong {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
              line-height: 1.2 !important;
              display: block !important;
            }
            .content-box p {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
              line-height: 1.3 !important; /* 1.4から1.3に削減 */
              margin: 1px 0 !important;
            }
            .image-section {
              margin: 3px 0 !important; /* 6pxから3pxに削減 */
              padding-left: 0 !important;
              page-break-inside: avoid !important;
              max-height: 80mm !important; /* 120mmから80mmに削減 */
              overflow: hidden !important;
            }
            .image-section h3 {
              font-size: 9pt !important; /* 10ptから9ptに削減 */
              margin-bottom: 2px !important;
            }
            .image-grid {
              gap: 2px !important; /* 4pxから2pxに削減 */
              margin: 2px 0 !important;
              grid-template-columns: repeat(2, 1fr) !important;
              max-width: 100% !important;
              max-height: 70mm !important; /* 100mmから70mmに削減 */
              overflow: hidden !important;
            }
            .image-item {
              page-break-inside: avoid !important;
            }
            .report-img {
              max-width: 85mm !important; /* 90mmから85mmに削減 */
              max-height: 55mm !important; /* 60mmから55mmに削減 */
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
            }
            input, textarea, .editable {
              font-size: 8pt !important; /* 9ptから8ptに削減 */
            }
            .footer {
              margin-top: 3px !important; /* 6pxから3pxに削減 */
              padding-top: 2px !important; /* 4pxから2pxに削減 */
              font-size: 6pt !important; /* 7ptから6ptに削減 */
              border-top: 1px solid #ccc !important;
            }
            .action-buttons { 
              display: none !important; 
            }
          }
          
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 27pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          /* 編集モード時のヘッダー統一 */
          .edit-mode .header h1 {
            font-size: 27pt;
            font-weight: bold;
          }
          
          .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          
          /* 編集モード時のセクション見出し統一 */
          .edit-mode .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
          }
          
          .info-item strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }
          
          .info-item span,
          .info-item input,
          .info-item textarea {
            font-size: 18pt;
            color: #000;
          }
          
          .header p {
            font-size: 18pt;
            color: #000;
          }
          
          /* 編集モード時のヘッダー日付統一 */
          .edit-mode .header p {
            font-size: 18pt;
            color: #000;
          }
          
          .section {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          

          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 8px;
          }
          
          .info-item {
            padding: 8px;
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 3px;
          }
          

          
          .content-box {
            background-color: #f8f8f8;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 4px;
          }
          
          .content-box p {
            font-size: 8pt;
            line-height: 1.3;
            margin: 0;
          }
          
          .image-section {
            margin: 12px 0;
            padding-left: 20px;
            page-break-inside: avoid;
          }
          
          .image-section h3 {
            font-size: 10pt;
            margin-bottom: 8px;
            text-align: left;
          }
          
          .image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 8px 0;
            max-width: 600px;
          }
          
          .image-item {
            text-align: center;
            page-break-inside: avoid;
          }
          
          .report-img {
            max-width: 120px;
            max-height: 80px;
            width: auto;
            height: auto;
            border: 1px solid #ccc;
            border-radius: 3px;
            object-fit: cover;
            transition: all 0.2s ease;
          }
          
          .resizable-image {
            position: relative;
            cursor: move;
            user-select: none;
          }
          
          .resizable-image:hover {
            border: 2px solid #007bff;
            transform: scale(1.02);
          }
          
          .resizable-image.dragging {
            opacity: 0.7;
            transform: scale(1.1);
            z-index: 1000;
          }
          
          .image-caption {
            text-align: center;
            margin-top: 5px;
            font-size: 8pt;
            color: #666;
          }
          
          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #ccc;
            font-size: 7pt;
            color: #666;
          }
          
          .action-buttons {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 10000 !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 10px !important;
            background: rgba(255, 255, 255, 0.95) !important;
            padding: 10px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .action-buttons .btn-print {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          @media print {
            .action-buttons {
              display: none !important;
            }
          }
          
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          
          .btn-print {
            background: #28a745;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }
          
          .btn-save {
            background: #ffc107;
            color: #000;
          }
          
          .btn-cancel {
            background: #6c757d;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }
          
          .btn-close {
            background: #6c757d;
            color: white;
          }
          
          .readonly {
            display: block;
          }
          
          .editable {
            display: none;
            background-color: #f0f0f0;
            color: #000;
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 8px;
            font-size: 18pt;
          }
          
          /* 編集モード時の文字サイズを機械故障報告書UIに合わせる */
          .edit-mode .editable {
            font-size: 18pt;
          }
          
          .edit-mode .info-item strong {
            font-size: 18pt;
          }
          
          .edit-mode .info-item span {
            font-size: 18pt;
          }
          
          .edit-mode .content-box strong {
            font-size: 18pt;
          }
          
          .edit-mode .content-box p {
            font-size: 18pt;
          }
          
          /* 編集モード時の表示切り替え - 確実に動作するように強化 */
          .edit-mode .readonly {
            display: none !important;
            visibility: hidden !important;
          }
          
          .edit-mode .editable {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            padding: 8px !important;
            border: 2px solid #007bff !important;
            border-radius: 3px !important;
            font-size: 14pt !important;
            color: #000 !important;
            background-color: #fff !important;
            font-family: inherit !important;
          }
          
          /* デフォルトで編集要素を確実に非表示 */
          .editable {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* 読み取り専用要素をデフォルトで表示 */
          .readonly {
            display: inline !important;
            visibility: visible !important;
          }
          
          input, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 18pt;
            color: #000;
          }
          
          /* 編集モード時の入力フィールドスタイル統一 */
          .edit-mode input,
          .edit-mode textarea {
            font-size: 18pt;
            color: #000;
          }
          
          .content-box strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }
          
          .content-box p {
            font-size: 18pt;
            color: #000;
          }
          
          @media print {
            .action-buttons { display: none !important; }
            body { margin: 0; }
          }
          
          /* 編集モード用スタイル */
          .readonly {
            display: inline;
          }
          
          .editable {
            display: none !important;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
          }
          
          .edit-mode .readonly {
            display: none !important;
          }
          
          .edit-mode .editable {
            display: block !important;
            background-color: #ffffcc;
            border: 2px solid #007bff;
          }
          
          .btn {
            padding: 8px 16px;
            margin: 0 4px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .btn-save {
            background-color: #28a745;
            color: white;
          }
          
          .btn-cancel {
            background-color: #6c757d;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }
          
          .btn-print {
            background-color: #17a2b8;
            color: white;
            padding: 20px 40px; /* 2倍サイズ */
            font-size: 28px; /* 2倍サイズ */
          }
          
          .btn-close {
            background-color: #dc3545;
            color: white;
          }
        </style>
      </head>
      <body>
        <script>
          // シンプルで確実な設定
          try {
            // JSONデータを安全にエスケープして文字列リテラルとして埋め込み、パース
            const reportDataJson = ${JSON.stringify(JSON.stringify(reportData))};
            window.reportData = JSON.parse(reportDataJson);
            console.log('Script starting...', 'reportData:', window.reportData);
          } catch (e) {
            console.error('reportData設定エラー:', e);
            console.error('reportDataJson:', typeof reportDataJson !== 'undefined' ? reportDataJson.substring(0, 200) : 'undefined');
            window.reportData = {};
          }
        </script>
        <div class="action-buttons">
          <button class="btn btn-save" id="save-btn" style="display: none;">保存</button>
          <button class="btn btn-print" id="print-btn" onclick="if(typeof waitForImagesAndPrint === 'function') { waitForImagesAndPrint(); } else { console.error('waitForImagesAndPrint関数が見つかりません'); window.print(); }" style="display: inline-block !important; visibility: visible !important; opacity: 1 !important; cursor: pointer !important; padding: 10px 20px !important; font-size: 16px !important; font-weight: bold !important; background-color: #17a2b8 !important; color: white !important; border: none !important; border-radius: 5px !important;">印刷</button>
          <button class="btn btn-cancel" id="cancel-btn" style="display: none;">キャンセル</button>
          <button class="btn btn-close" onclick="window.close()" style="display: inline-block !important; visibility: visible !important; opacity: 1 !important; cursor: pointer !important; padding: 10px 20px !important; font-size: 16px !important; font-weight: bold !important; background-color: #dc3545 !important; color: white !important; border: none !important; border-radius: 5px !important;">閉じる</button>
        </div>
        
        <div class="container">
          <div class="header">
            <h1>機械故障報告書</h1>
            <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>報告概要</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>報告書ID</strong>
                <span class="readonly">${String(reportData.reportId || reportData.id || '').substring(0, 8)}...</span>
                <input class="editable" value="${String(reportData.reportId || reportData.id || '')}" />
              </div>
              <div class="info-item">
                <strong>機種</strong>
                <span class="readonly">${String(reportData.machineType || reportData.machineTypeName || '-')}</span>
                <input class="editable" value="${String(reportData.machineType || reportData.machineTypeName || '')}" />
              </div>
              <div class="info-item">
                <strong>機械番号</strong>
                <span class="readonly">${String(reportData.machineNumber || '-')}</span>
                <input class="editable" value="${String(reportData.machineNumber || '')}" />
              </div>
              <div class="info-item">
                <strong>日付</strong>
                <span class="readonly">${String(reportData.date ? new Date(reportData.date).toLocaleDateString('ja-JP') : reportData.timestamp ? new Date(reportData.timestamp).toLocaleDateString('ja-JP') : reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-')}</span>
                <input class="editable" type="date" value="${String(reportData.date || reportData.timestamp || reportData.createdAt || '')}" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${String(reportData.location || '-')}</span>
                <input class="editable" value="${String(reportData.location || '')}" />
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>故障詳細</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>ステータス</strong>
                <span class="readonly">${String(reportData.status || '-')}</span>
                <input class="editable" value="${String(reportData.status || '')}" />
              </div>
              <div class="info-item">
                <strong>責任者</strong>
                <span class="readonly">${String(reportData.engineer || '-')}</span>
                <input class="editable" value="${String(reportData.engineer || '')}" />
              </div>
            </div>
            
            <div class="content-box">
              <strong>説明</strong>
              <p class="readonly">${String(reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '説明なし')}</p>
              <textarea class="editable" rows="4">${String(reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '')}</textarea>
            </div>
            
            <div class="content-box">
              <strong>備考</strong>
              <p class="readonly">${String(reportData.notes || '-')}</p>
              <textarea class="editable" rows="4">${String(reportData.notes || '')}</textarea>
            </div>
          </div>
          
          ${imageSection}
          
          <div class="section">
            <h2>修繕計画</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>依頼月日</strong>
                <span class="readonly">${String(reportData.requestDate || '-')}</span>
                <input class="editable" type="date" value="${String(reportData.requestDate || '')}" />
              </div>
              <div class="info-item">
                <strong>予定月日</strong>
                <span class="readonly">${String(reportData.repairSchedule || '-')}</span>
                <input class="editable" type="date" value="${String(reportData.repairSchedule || '')}" />
              </div>
              <div class="info-item">
                <strong>場所</strong>
                <span class="readonly">${String(reportData.repairLocation || '-')}</span>
                <input class="editable" value="${String(reportData.repairLocation || '')}" />
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>記事欄</h2>
            <div class="info-item">
              <strong>備考・記事</strong>
              <p class="readonly">${String(reportData.remarks || '-')}</p>
              <textarea class="editable" rows="4" maxlength="200">${String(reportData.remarks || '')}</textarea>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2025 機械故障報告書. All rights reserved.</p>
        </div>
        
        <script>
          let isEditMode = false;
          let originalData = {};
          let autoPrintPending = true; // 自動印刷待機フラグ
          
          // データを安全に設定する関数
          function setOriginalData(data) {
            try {
              originalData = data;
              console.log('🔧 originalData set:', originalData);
            } catch (e) {
              console.error('originalDataの設定に失敗:', e);
              originalData = {};
            }
          }
          
          // レポートデータを設定（グローバル変数から読み取り）
          try {
            if (window.reportData) {
              setOriginalData(window.reportData);
              console.log('🔧 データをグローバル変数から正常に読み込みました');
            } else {
              console.error('🔧 グローバル変数window.reportDataが見つかりません');
              setOriginalData({});
            }
          } catch (e) {
            console.error('🔧 グローバル変数からのデータ読み込みに失敗:', e);
            setOriginalData({});
          }
          
          // 画像読み込み完了を待つ関数
          function waitForImagesAndPrint() {
            console.log('🖨️ waitForImagesAndPrintが呼ばれました');
            
            const images = document.querySelectorAll('img.report-img');
            const totalImages = images.length;
            let loadedImages = 0;
            
            console.log('🖼️ 画像読み込み待機開始:', totalImages + '枚の画像');
            
            if (totalImages === 0) {
              // 画像がない場合はすぐに印刷
              console.log('🖼️ 画像がないため、すぐに印刷を実行');
              setTimeout(() => {
                window.print();
                autoPrintPending = false;
              }, 300);
              return;
            }
            
            let allImagesLoaded = false;
            const imageLoadTimeout = setTimeout(() => {
              if (!allImagesLoaded) {
                console.warn('⚠️ 画像読み込みタイムアウト（5秒）、印刷を実行');
                console.log('🖨️ window.print()を実行します（タイムアウト）');
                window.print();
                allImagesLoaded = true;
              }
            }, 5000); // 5秒タイムアウト
            
            images.forEach((img, index) => {
              if (img.complete) {
                loadedImages++;
                console.log('🖼️ 画像[' + index + ']は既に読み込まれています');
              } else {
                img.onload = () => {
                  loadedImages++;
                  console.log('🖼️ 画像[' + index + ']読み込み完了 (' + loadedImages + '/' + totalImages + ')');
                  if (loadedImages === totalImages && !allImagesLoaded) {
                    clearTimeout(imageLoadTimeout);
                    allImagesLoaded = true;
                    console.log('✅ すべての画像が読み込み完了、印刷を実行');
                    setTimeout(() => {
                      console.log('🖨️ window.print()を実行します');
                      window.print();
                    }, 300);
                  }
                };
                img.onerror = () => {
                  loadedImages++;
                  console.warn('⚠️ 画像[' + index + ']読み込みエラー (' + loadedImages + '/' + totalImages + ')');
                  if (loadedImages === totalImages && !allImagesLoaded) {
                    clearTimeout(imageLoadTimeout);
                    allImagesLoaded = true;
                    console.log('⚠️ すべての画像処理完了（エラー含む）、印刷を実行');
                    setTimeout(() => {
                      console.log('🖨️ window.print()を実行します（エラー後）');
                      window.print();
                    }, 300);
                  }
                };
              }
            });
            
            // 既に読み込まれている画像がすべての場合
            if (loadedImages === totalImages && !allImagesLoaded) {
              clearTimeout(imageLoadTimeout);
              allImagesLoaded = true;
              console.log('✅ すべての画像は既に読み込まれています、印刷を実行');
              setTimeout(() => {
                console.log('🖨️ window.print()を実行します（既に読み込み済み）');
                window.print();
              }, 300);
            }
          }
          
          // グローバルスコープにwaitForImagesAndPrintを公開
          window.waitForImagesAndPrint = waitForImagesAndPrint;
          
          // 画像表示の初期化とボタンイベントの設定
          document.addEventListener('DOMContentLoaded', function() {
            console.log('🔧 DOMContentLoaded - Document ready');
            console.log('🔧 Available edit elements:');
            console.log('🔧 - Readonly elements:', document.querySelectorAll('.readonly').length);
            console.log('🔧 - Editable elements:', document.querySelectorAll('.editable').length);
            console.log('🔧 - Edit button:', !!document.querySelector('.btn-edit'));
            console.log('🔧 Initial CSS classes:', document.body.classList.toString());
            console.log('🔧 originalData:', originalData);
            
            // 初期状態では編集モードをオフにする
            isEditMode = false;
            document.body.classList.remove('edit-mode');
            
            // 印刷ボタンにOSのシステム印刷を開くイベントを設定
            const printButton = document.querySelector('.btn-print') || document.getElementById('print-btn');
            if (printButton) {
              console.log('🖨️ 印刷ボタンが見つかりました');
              
              // グローバルスコープにwaitForImagesAndPrintを公開（念のため）
              if (typeof waitForImagesAndPrint === 'function') {
                window.waitForImagesAndPrint = waitForImagesAndPrint;
              }
              
              // 既存のイベントリスナーを削除
              const newPrintButton = printButton.cloneNode(true);
              printButton.parentNode?.replaceChild(newPrintButton, printButton);
              
              // 直接クリックイベントを設定（確実に動作するように）
              newPrintButton.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖨️ 印刷ボタンがクリックされました（onclick） - 印刷を開始します');
                if (typeof waitForImagesAndPrint === 'function') {
                  waitForImagesAndPrint();
                } else if (typeof window.waitForImagesAndPrint === 'function') {
                  window.waitForImagesAndPrint();
                } else {
                  console.error('⚠️ waitForImagesAndPrint関数が見つかりません、直接window.print()を実行します');
                  window.print();
                }
              };
              
              // addEventListenerも設定（念のため）
              newPrintButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖨️ 印刷ボタンがクリックされました（addEventListener） - 印刷を開始します');
                if (typeof waitForImagesAndPrint === 'function') {
                  waitForImagesAndPrint();
                } else if (typeof window.waitForImagesAndPrint === 'function') {
                  window.waitForImagesAndPrint();
                } else {
                  console.error('⚠️ waitForImagesAndPrint関数が見つかりません、直接window.print()を実行します');
                  window.print();
                }
              }, true);
            } else {
              console.error('🖨️ 印刷ボタンが見つかりません');
            }
            
            // 自動印刷は無効化（ユーザーがボタンをクリックしたときにのみ印刷）
            
            // ボタンイベントの設定
            setupButtonEvents();
            
            // 複数回実行して確実に設定
            setTimeout(() => {
              setupButtonEvents();
            }, 100);
            
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          // ボタンイベントを設定する関数
          function setupButtonEvents() {
            console.log('🔧 setupButtonEvents called');
            
            // DOM要素の確実な取得のため少し待機
            setTimeout(() => {
              const editBtn = document.getElementById('edit-btn');
              const saveBtn = document.getElementById('save-btn');
              const cancelBtn = document.getElementById('cancel-btn');
              
              console.log('🔧 ボタンの取得状況:', {
                editBtn: !!editBtn,
                saveBtn: !!saveBtn,
                cancelBtn: !!cancelBtn
              });
              
              if (editBtn) {
                console.log('🔧 Edit button found, setting up event listener');
                
                // 既存のイベントリスナーをクリア
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
                
                // 新しいイベントリスナーを追加
                newEditBtn.addEventListener('click', function(e) {
                  console.log('🔧 Edit button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    console.log('🔧 Calling toggleEditMode()...');
                    toggleEditMode();
                  } catch (error) {
                    console.error('🔧 Error in toggleEditMode:', error);
                    alert('編集モードの切り替えでエラーが発生しました: ' + error.message);
                  }
                });
                
                // ボタンスタイルを設定
                newEditBtn.style.pointerEvents = 'auto';
                newEditBtn.style.cursor = 'pointer';
                newEditBtn.style.backgroundColor = '#007bff';
                newEditBtn.style.color = 'white';
                newEditBtn.style.border = '1px solid #007bff';
                newEditBtn.style.borderRadius = '4px';
                newEditBtn.style.padding = '8px 16px';
                newEditBtn.style.fontSize = '14px';
                
                console.log('🔧 Edit button event listener added successfully');
              } else {
              console.error('🔧 Edit button not found!');
              }
              
              if (saveBtn) {
                const newSaveBtn = saveBtn.cloneNode(true);
                saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);
                
                newSaveBtn.addEventListener('click', function(e) {
                  console.log('🔧 Save button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    saveReport();
                  } catch (error) {
                    console.error('🔧 Error in saveReport:', error);
                    alert('保存でエラーが発生しました: ' + error.message);
                  }
                });
              }
              
              if (cancelBtn) {
                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);
                
                newCancelBtn.addEventListener('click', function(e) {
                  console.log('🔧 Cancel button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    toggleEditMode();
                  } catch (error) {
                    console.error('🔧 Error in toggleEditMode (cancel):', error);
                  }
                });
              }
              
              console.log('🔧 Button event setup complete');
            }, 200); // DOM要素が確実に存在するまで待機
          }          function toggleEditMode() {
            console.log('🔧 toggleEditMode called, current isEditMode:', isEditMode);
            console.log('🔧 Current document body classList before toggle:', document.body.classList.toString());
            
            isEditMode = !isEditMode;
            console.log('🔧 toggled isEditMode to:', isEditMode);
            
            const editBtn = document.getElementById('edit-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            const saveBtn = document.getElementById('save-btn');
            
            console.log('🔧 Found buttons:', { editBtn: !!editBtn, cancelBtn: !!cancelBtn, saveBtn: !!saveBtn });
            
            if (isEditMode) {
              console.log('🔧 Entering edit mode...');
              
              // ボタン表示の変更
              if (editBtn) {
                editBtn.style.display = 'none';
                console.log('🔧 Edit button hidden');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'inline-block';
                cancelBtn.style.backgroundColor = '#6c757d';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = '1px solid #6c757d';
                cancelBtn.style.borderRadius = '4px';
                cancelBtn.style.padding = '8px 16px';
                cancelBtn.style.fontSize = '14px';
                cancelBtn.style.cursor = 'pointer';
                console.log('🔧 Cancel button shown');
              }
              if (saveBtn) {
                saveBtn.style.display = 'inline-block';
                saveBtn.style.backgroundColor = '#28a745';
                saveBtn.style.color = 'white';
                saveBtn.style.border = '1px solid #28a745';
                saveBtn.style.borderRadius = '4px';
                saveBtn.style.padding = '8px 16px';
                saveBtn.style.fontSize = '14px';
                saveBtn.style.cursor = 'pointer';
                console.log('🔧 Save button shown');
              }
              
              // 編集モードクラスを追加
              document.body.classList.add('edit-mode');
              console.log('🔧 Added edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に切り替え
              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');
              
              console.log('🔧 Found elements for toggle:', { 
                readonly: readonlyElements.length, 
                editable: editableElements.length 
              });
              
              readonlyElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'block !important';
                el.style.visibility = 'visible';
                // 入力フィールドの背景色を変更して編集中であることを明確にする
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.style.backgroundColor = '#ffffcc';
                  el.style.border = '2px solid #007bff';
                  el.removeAttribute('readonly');
                  el.removeAttribute('disabled');
                }
                console.log('🔧 Shown editable element', index, 'tag:', el.tagName);
              });
              
              // 編集モード時に入力フィールドの値を設定
              setupEditFields();
              
              console.log('🔧 Edit mode setup complete');
            } else {
              console.log('🔧 Exiting edit mode...');
              
              // ボタン表示の変更
              if (editBtn) {
                editBtn.style.display = 'inline-block';
                console.log('🔧 Edit button shown');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'none';
                console.log('🔧 Cancel button hidden');
              }
              if (saveBtn) {
                saveBtn.style.display = 'none';
                console.log('🔧 Save button hidden');
              }
              
              // 編集モードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を確実に切り替え
              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');
              
              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('🔧 Shown readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden editable element', index);
              });
              
              // 編集内容を元に戻す
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
                console.log('🔧 Save button hidden');
              }
              
              // 編集モードクラスを削除
              document.body.classList.remove('edit-mode');
              console.log('🔧 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 要素の表示を強制的に切り替え
              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('🔧 Shown readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                console.log('🔧 Hidden editable element', index);
              });
              
              // 編集内容を元に戻す
              resetToOriginal();
              
              console.log('🔧 Read-only mode setup complete');
            }
          }
          
          // グローバルスコープでも利用可能にする
          window.toggleEditMode = toggleEditMode;
          
          // ページが完全に読み込まれた後にもボタンイベントを再設定
          window.addEventListener('load', function() {
            console.log('🔧 Window load event - page fully loaded');
            setTimeout(() => {
              setupButtonEvents();
              
              // 印刷ボタンにOSのシステム印刷を開くイベントを設定
              const printButton = document.querySelector('.btn-print') || document.getElementById('print-btn');
              if (printButton) {
                console.log('🖨️ 印刷ボタンが見つかりました（window.onload）');
                
                // グローバルスコープにwaitForImagesAndPrintを公開（念のため）
                if (typeof waitForImagesAndPrint === 'function') {
                  window.waitForImagesAndPrint = waitForImagesAndPrint;
                }
                
                // 既存のイベントリスナーを削除
                const newPrintButton = printButton.cloneNode(true);
                printButton.parentNode?.replaceChild(newPrintButton, printButton);
                
                // 直接クリックイベントを設定（確実に動作するように）
                newPrintButton.onclick = function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖨️ 印刷ボタンがクリックされました（onclick/window.onload） - 印刷を開始します');
                  if (typeof waitForImagesAndPrint === 'function') {
                    waitForImagesAndPrint();
                  } else if (typeof window.waitForImagesAndPrint === 'function') {
                    window.waitForImagesAndPrint();
                  } else {
                    console.error('⚠️ waitForImagesAndPrint関数が見つかりません、直接window.print()を実行します');
                    window.print();
                  }
                };
                
                // addEventListenerも設定（念のため）
                newPrintButton.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖨️ 印刷ボタンがクリックされました（addEventListener/window.onload） - 印刷を開始します');
                  if (typeof waitForImagesAndPrint === 'function') {
                    waitForImagesAndPrint();
                  } else if (typeof window.waitForImagesAndPrint === 'function') {
                    window.waitForImagesAndPrint();
                  } else {
                    console.error('⚠️ waitForImagesAndPrint関数が見つかりません、直接window.print()を実行します');
                    window.print();
                  }
                }, true);
              } else {
                console.error('🖨️ 印刷ボタンが見つかりません（window.onload）');
              }
              
              // 自動印刷は無効化（ユーザーがボタンをクリックしたときにのみ印刷）
            }, 500);
          });
          
          function setupEditFields() {
            console.log('🔧 setupEditFields called');
            // 各入力フィールドに適切な値を設定
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('🔧 Found inputs:', inputs.length, 'textareas:', textareas.length);
            
            // 入力フィールドの値を設定
            inputs.forEach((input, index) => {
              console.log('🔧 Setting up input', index, input);
              if (index === 0) input.value = originalData.reportId || originalData.id || '';
              if (index === 1) input.value = originalData.machineType || originalData.machineTypeName || '';
              if (index === 2) input.value = originalData.machineNumber || '';
              if (index === 3) {
                const dateValue = originalData.date || originalData.timestamp || originalData.createdAt;
                if (dateValue) {
                  const date = new Date(dateValue);
                  input.value = date.toISOString().split('T')[0];
                }
              }
              if (index === 4) input.value = originalData.location || '';
              if (index === 5) input.value = originalData.status || '';
              if (index === 6) input.value = originalData.engineer || '';
              if (index === 7) input.value = originalData.requestDate || '';
              if (index === 8) input.value = originalData.repairSchedule || '';
              if (index === 9) input.value = originalData.repairLocation || '';
            });
            
            // テキストエリアの値を設定
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                textarea.value = originalData.problemDescription || originalData.description || originalData.incidentTitle || originalData.title || '';
              }
              if (index === 1) {
                textarea.value = originalData.notes || '';
              }
            });
          }
          
          function resetToOriginal() {
            // 入力フィールドを元の値に戻す
            setupEditFields();
          }
          
          async function saveReport() {
            console.log('保存処理開始');
            console.log('originalData:', originalData);
            console.log('originalData.id:', originalData.id);
            console.log('originalData.chatId:', originalData.chatId);
            console.log('originalData.reportId:', originalData.reportId);
            console.log('originalData.fileName:', originalData.fileName);
            
            // 編集されたデータを収集
            const updatedData = { ...originalData };
            
            // 各入力フィールドから値を取得
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('入力フィールド数:', inputs.length);
            console.log('テキストエリア数:', textareas.length);
            
            // 入力フィールドの値を取得
            inputs.forEach((input, index) => {
              if (index === 0) updatedData.reportId = input.value;
              if (index === 1) updatedData.machineType = input.value;
              if (index === 2) updatedData.machineNumber = input.value;
              if (index === 3) updatedData.date = input.value;
              if (index === 4) updatedData.location = input.value;
              if (index === 5) updatedData.status = input.value;
              if (index === 6) updatedData.engineer = input.value;
              if (index === 7) updatedData.requestDate = input.value;
              if (index === 8) updatedData.repairSchedule = input.value;
              if (index === 9) updatedData.repairLocation = input.value;
            });
            
            // テキストエリアの値を取得
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                updatedData.problemDescription = textarea.value;
              }
              if (index === 1) {
                updatedData.notes = textarea.value;
              }
            });
            
            console.log('更新されたデータ:', updatedData);
            console.log('使用するchatId:', updatedData.chatId || updatedData.id);
            
            // ローカルストレージに保存
            localStorage.setItem('savedMachineFailureReport_' + updatedData.id, JSON.stringify(updatedData));
            
            // 履歴データを更新（親ウィンドウの履歴一覧表を更新）
            try {
              if (window.opener && !window.opener.closed) {
                // 親ウィンドウの履歴データを更新
                window.opener.postMessage({
                  type: 'UPDATE_HISTORY_ITEM',
                  data: updatedData
                }, '*');
                
                // 親ウィンドウのローカルストレージも更新
                try {
                  const parentStorage = window.opener.localStorage;
                  const historyKey = 'savedMachineFailureReport_' + updatedData.id;
                  parentStorage.setItem(historyKey, JSON.stringify(updatedData));
                } catch (storageError) {
                  console.warn('親ウィンドウのローカルストレージ更新に失敗:', storageError);
                }
              }
            } catch (error) {
              console.warn('親ウィンドウへの通知に失敗:', error);
            }
            
            // 元のデータを更新
            originalData = updatedData;
            
            // UIを更新
            updateUIAfterSave(updatedData);
            
            // 編集モードを終了
            toggleEditMode();
            
            // 成功メッセージを表示
            alert('レポートが保存されました。履歴アイテムも更新されます。');
            
            // サーバーへの保存も試行
            try {
              await saveToJsonFile(updatedData);
            } catch (error) {
              console.warn('サーバーへの保存は失敗しましたが、ローカルには保存されています:', error);
            }
          }
          
          async function saveToJsonFile(updatedData) {
            try {
              console.log('サーバーへの保存開始:', updatedData);
              
              // 正しいIDを取得
              let targetId = originalData.id || originalData.chatId || originalData.reportId;
              
              // IDが取得できない場合は、ファイル名からUUIDを抽出
              if (!targetId && originalData.fileName) {
                console.log('ファイル名からUUID抽出を試行:', originalData.fileName);
                
                // UUIDパターン1: 標準的なUUID形式
                let fileNameMatch = originalData.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                
                if (fileNameMatch) {
                  targetId = fileNameMatch[1];
                  console.log('標準UUIDから抽出したID:', targetId);
                } else {
                  // UUIDパターン2: アンダースコア区切りのUUID
                  fileNameMatch = originalData.fileName.match(/_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                  if (fileNameMatch) {
                    targetId = fileNameMatch[1];
                    console.log('アンダースコア区切りUUIDから抽出したID:', targetId);
                  }
                }
              }
              
              if (!targetId) {
                console.error('対象IDが特定できません:', originalData);
                throw new Error('対象IDが特定できません');
              }
              
              console.log('保存対象ID:', targetId);
              
              // 更新データの準備
              const updatePayload = {
                updatedData: updatedData,
                updatedBy: 'user'
              };
              
              console.log('送信するペイロード:', updatePayload);
              
              // サーバーAPIを呼び出して履歴アイテムを更新
              const response = await fetch('/api/emergency-flow/detail/' + targetId, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload)
              });
              
              console.log('サーバーレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const result = await response.json();
                console.log('履歴ファイルが正常に更新されました:', result);
                
                // 成功メッセージを表示
                alert('レポートが元のファイルに正常に上書き保存されました。');
                
                return result;
              } else {
                const errorData = await response.json();
                console.error('サーバーエラー:', errorData);
                throw new Error(errorData.error || 'サーバーエラー: ' + response.status);
              }
              
            } catch (error) {
              console.error('JSONファイル保存エラー:', error);
              throw error;
            }
          }
                    engineer: updatedData.engineer,
                    location: updatedData.location,
                    requestDate: updatedData.requestDate,
                    repairSchedule: updatedData.repairSchedule,
                    repairLocation: updatedData.repairLocation,
                    lastModified: new Date().toISOString()
                  },
                  updatedBy: 'user'
                })
              });
              
              console.log('サーバーレスポンス:', response.status, response.statusText);
              console.log('レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                try {
                  const result = await response.json();
                  console.log('履歴アイテムが正常に更新されました:', result);
                  
                  // 保存成功後の処理
                  updateUIAfterSave(updatedData);
                  
                  // 成功メッセージを表示
                  alert('履歴アイテムが正常に更新されました。');
                } catch (parseError) {
                  console.warn('レスポンスの解析に失敗しましたが、保存は成功しています:', parseError);
                  updateUIAfterSave(updatedData);
                  alert('履歴アイテムが更新されました。');
                }
              } else {
                let errorMessage = 'サーバーエラー';
                try {
                  // レスポンスのContent-Typeを確認
                  const contentType = response.headers.get('content-type');
                  if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('エラーレスポンス詳細:', errorData);
                    if (errorData.error) {
                      errorMessage = errorData.error;
                    } else if (errorData.message) {
                      errorMessage = errorData.message;
                    } else {
                      errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                    }
                  } else {
                    // HTMLレスポンスの場合
                    const textResponse = await response.text();
                    console.error('HTMLレスポンス:', textResponse.substring(0, 200));
                    errorMessage = 'HTTP ' + response.status + ': ' + response.statusText + ' (HTMLレスポンス)';
                  }
                } catch (parseError) {
                  console.error('エラーレスポンスの解析に失敗:', parseError);
                  errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                }
                
                console.error('履歴アイテムの更新に失敗しました:', errorMessage);
                alert('履歴アイテムの更新に失敗しました: ' + errorMessage);
              }
            } catch (error) {
              console.error('保存エラー:', error);
              console.error('エラースタック:', error.stack);
              alert('保存中にエラーが発生しました: ' + error.message);
            }
          }
          
          function updateUIAfterSave(updatedData) {
            // 保存後にUIを更新
            const readonlyElements = document.querySelectorAll('.readonly');
            
            // 報告書ID
            if (readonlyElements[0]) {
              readonlyElements[0].textContent = (updatedData.reportId || updatedData.id || '').substring(0, 8) + '...';
            }
            
            // 機種
            if (readonlyElements[1]) {
              readonlyElements[1].textContent = updatedData.machineType || updatedData.machineTypeName || '-';
            }
            
            // 機械番号
            if (readonlyElements[2]) {
              readonlyElements[2].textContent = updatedData.machineNumber || '-';
            }
            
            // 日付
            if (readonlyElements[3]) {
              const dateValue = updatedData.date || updatedData.timestamp || updatedData.createdAt;
              if (dateValue) {
                const date = new Date(dateValue);
                readonlyElements[3].textContent = date.toLocaleDateString('ja-JP');
              } else {
                readonlyElements[3].textContent = '-';
              }
            }
            
            // 場所
            if (readonlyElements[4]) {
              readonlyElements[4].textContent = updatedData.location || '-';
            }
            
            // ステータス
            if (readonlyElements[5]) {
              readonlyElements[5].textContent = updatedData.status || '-';
            }
            
            // 責任者
            if (readonlyElements[6]) {
              readonlyElements[6].textContent = updatedData.engineer || '-';
            }
            
            // 説明
            if (readonlyElements[7]) {
              readonlyElements[7].textContent = updatedData.problemDescription || updatedData.description || updatedData.incidentTitle || updatedData.title || '説明なし';
            }
            
            // 備考
            if (readonlyElements[8]) {
              readonlyElements[8].textContent = updatedData.notes || '-';
            }
            
            // 依頼月日
            if (readonlyElements[9]) {
              readonlyElements[9].textContent = updatedData.requestDate || '-';
            }
            
            // 予定月日
            if (readonlyElements[10]) {
              readonlyElements[10].textContent = updatedData.repairSchedule || '-';
            }
            
            // 修繕場所
            if (readonlyElements[11]) {
              readonlyElements[11].textContent = updatedData.repairLocation || '-';
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  // 画像取得の共通関数（DB画像レコード優先版）
  function pickFirstImage(data: any): string | null {
    console.log('🖼️ pickFirstImage - データ分析:', {
      hasImages: !!data?.images,
      imagesLength: data?.images?.length || 0,
      hasSavedImages: !!data?.savedImages,
      savedImagesLength: data?.savedImages?.length || 0,
      hasConversationHistory: !!data?.conversationHistory,
      hasImagePath: !!data?.imagePath,
      hasImageUrl: !!data?.imageUrl,
      dataKeys: Object.keys(data || {})
    });

    // URL正規化ヘルパー関数
    const normalizeImageUrl = (url: string): string => {
      if (!url) return '';
      // /api/api/ を /api/ に正規化
      url = url.replace(/\/api\/api\//g, '/api/');
      // knowledge-base\images\chat-exports パス対応
      if (url.includes('knowledge-base\\images\\chat-exports') || url.includes('knowledge-base/images/chat-exports')) {
        const fileName = url.split(/[\\/]/).pop();
        url = '/api/images/chat-exports/' + fileName;
      }
      // 相対パスの場合はベースURLを追加
      if (url && !url.startsWith('http') && !url.startsWith('data:image/')) {
        // /api/ で始まる場合はそのまま、それ以外は /api/images/chat-exports/ を追加
        if (!url.startsWith('/api/')) {
          url = '/api/images/chat-exports/' + url;
        }
      }
      return url;
    };

    // 1) imageUrl を最優先（直接設定された画像URL）
    if (typeof data?.imageUrl === 'string' && data.imageUrl.trim()) {
      console.log('🖼️ pickFirstImage - imageUrl:', data.imageUrl);
      const url = normalizeImageUrl(data.imageUrl);
      if (url.startsWith('http') || url.startsWith('data:image/') || url.startsWith('/api/')) {
        return url;
      }
    }

    // 2) imagePath(URL) を優先
    if (typeof data?.imagePath === 'string' && data.imagePath.trim()) {
      console.log('🖼️ pickFirstImage - imagePath:', data.imagePath);
      const url = normalizeImageUrl(data.imagePath);
      if (url.startsWith('http') || url.startsWith('data:image/') || url.startsWith('/api/')) {
        return url;
      }
    }

    // 3) savedImages から URL を取得（DB画像レコード優先）
    if (Array.isArray(data?.savedImages) && data.savedImages.length > 0) {
      const firstImage = data.savedImages[0];
      console.log('🖼️ pickFirstImage - savedImages[0]:', firstImage);

      if (typeof firstImage === 'string') {
        // base64データの場合はそのまま返す
        if (firstImage.startsWith('data:image/')) {
          return firstImage;
        }
        const url = normalizeImageUrl(firstImage);
        if (url) return url;
      }

      if (firstImage && typeof firstImage === 'object') {
        const imageUrl = firstImage.url || firstImage.path || firstImage.fileName;
        if (imageUrl && !imageUrl.startsWith('data:image/')) {
          const url = normalizeImageUrl(imageUrl);
          if (url) return url;
        }
      }
    }

    // 4) images配列から直接ファイル名を取得（DB画像レコード）
    if (Array.isArray(data?.images) && data.images.length > 0) {
      const firstImage = data.images[0];
      console.log('🖼️ pickFirstImage - images[0]:', firstImage);
      
      // urlプロパティを優先
      if (firstImage && typeof firstImage === 'object' && firstImage.url) {
        const url = normalizeImageUrl(firstImage.url);
        if (url) {
          console.log('🖼️ pickFirstImage - images配列から取得:', url);
          return url;
        }
      }
      
      // fileNameから生成
      if (firstImage && typeof firstImage === 'object' && firstImage.fileName) {
        const url = normalizeImageUrl(`/api/images/chat-exports/${firstImage.fileName}`);
        console.log('🖼️ pickFirstImage - DB画像レコードから取得:', url);
        return url;
      }
    }

    // 5) conversationHistory から Base64画像を検索
    if (Array.isArray(data?.conversationHistory)) {
      for (const msg of data.conversationHistory) {
        if (msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')) {
          console.log('🖼️ pickFirstImage - conversationHistoryからBase64画像を発見');
          return msg.content;
        }
      }
    }

    // 6) 履歴IDから画像ファイルを推測（最後の手段）
    if (typeof data?.id === 'string' || typeof data?.chatId === 'string') {
      const historyId = data.id || data.chatId;
      console.log('🖼️ pickFirstImage - 履歴IDから画像を推測:', historyId);
      
      // UUIDパターンを抽出（タイムスタンプの場合も含む）
      const uuidPattern = historyId.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      const uuid = uuidPattern ? uuidPattern[1] : null;
      const timestampPart = historyId.match(/\d{13,}/)?.[0]; // タイムスタンプ部分を抽出
      
      // 複数のファイル名パターンを試行（chat_image_パターンを優先）
      const possibleFilenames = [
        `chat_image_${historyId}.png`,  // タイムスタンプベース（最優先）
        `chat_image_${historyId}.jpg`,
        `chat_image_${historyId}.jpeg`,
        `${historyId}_3_0.jpeg`,  // 新しい形式
        `${historyId}_2_0.jpeg`,
        `${historyId}_1_0.jpeg`,
        `${historyId}_0_0.jpeg`,
        `${historyId}.jpg`,       // シンプル形式
        `${historyId}.jpeg`,
        `${historyId}.png`
      ];
      
      // UUIDが存在する場合は追加パターン
      if (uuid) {
        possibleFilenames.push(
          `${uuid}_3_0.jpeg`,
          `${uuid}_2_0.jpeg`,
          `${uuid}_1_0.jpeg`,
          `${uuid}_0_0.jpeg`,
          `${uuid}.jpg`,
          `${uuid}.jpeg`,
          `${uuid}.png`,
          `chat_image_${uuid}.png`,
          `chat_image_${uuid}.jpg`,
          `chat_image_${uuid}.jpeg`
        );
      }
      
      // タイムスタンプ部分が存在する場合も追加
      if (timestampPart && timestampPart !== historyId) {
        possibleFilenames.push(
          `chat_image_${timestampPart}.png`,
          `chat_image_${timestampPart}.jpg`,
          `chat_image_${timestampPart}.jpeg`
        );
      }
      
      // 実際のファイル存在確認はサーバー側で行うため、最初のパターンを返す
      const imagePath = `/api/images/chat-exports/${possibleFilenames[0]}`;
      console.log('🖼️ pickFirstImage - 推測された画像パス:', imagePath, '（サーバー側で実際のファイル名にマッチされます）');
      return imagePath; // ベースURLは不要（相対パスのまま）
    }

    // 7) fileNameから推測（png/jpg/jpegならchat-exports直リンク）
    if (typeof data?.fileName === 'string') {
      const fileName = data.fileName.replace(/^export_/, '');
      if (/\.(png|jpg|jpeg)$/i.test(fileName)) {
        // 画像ファイルなら直リンク
  const imagePath = '/api/images/chat-exports/' + fileName;
        console.log('🖼️ pickFirstImage - fileName画像直リンク:', imagePath);
        return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imagePath}`;
      } else {
        // jsonなら従来通り
      const baseFileName = fileName.replace(/\.json$/, '');
      const imagePath = `/api/images/chat-exports/${baseFileName}_3_0.jpeg`;
      console.log('🖼️ pickFirstImage - fileNameから推測:', imagePath);
        return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imagePath}`;
      }
    }

    console.log('🖼️ pickFirstImage - 画像が見つかりませんでした');
    return null;
  }

  // 一覧印刷用HTML生成はhandlePrintTable内のローカル関数として定義

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

    // 選択された履歴のみを印刷対象とする
    const targetItems =
      selectedItems.size > 0
        ? filteredItems.filter(item => selectedItems.has(item.id))
        : filteredItems;

    // tableContentテンプレートリテラルはこの関数スコープ内でのみ定義
    const tableContent = (() => {
      let html = '';
      html += '<!DOCTYPE html>';
      html += '<html>';
      html += '<head>';
      html += '  <title>履歴一覧 - 印刷</title>';
      html += '  <style>';
      html += '    @page { size: A4 portrait; margin: 10mm; }';
      html += '    @media print {';
      html += '      html, body { margin: 0; padding: 0; }';
      html += '      .no-print { display: none !important; }';
      html += '      img, .image-cell { break-inside: avoid; page-break-inside: avoid; }';
      html += '      table { width: 100%; border-collapse: collapse; table-layout: fixed; }';
      html += '      th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }';
      html += '    }';
      html += '    body { font-family: Arial, sans-serif; margin: 20px; }';
      html += '    .header { text-align: center; margin-bottom: 20px; }';
      html += '    .header h1 { margin: 0; color: #333; }';
      html += '    .header p { margin: 5px 0; color: #666; }';
      html += '    table { width: 100%; border-collapse: collapse; margin-top: 20px; }';
      html += '    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }';
      html += '    th { background-color: #f5f5f5; font-weight: bold; }';
      html += '    .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }';
      html += '    .image-cell img { max-width: 100px; max-height: 100px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; display: block; margin: 0 auto; }';
      html += '    .image-cell { text-align: center; vertical-align: middle; }';
      html += '    img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }';
      html += '  </style>';
      html += '</head>';
      html += '<body>';
      html += '  <div class="header">';
      html += '    <h1>故障履歴一覧</h1>';
      html += '    <p>印刷日時: ' + new Date().toLocaleString('ja-JP') + '</p>';
      html += '    <p>対象件数: ' + targetItems.length + '件' + (selectedItems.size > 0 ? ' (選択された履歴)' : '') + '</p>';
      html += '  </div>';
      html += '  <div class="summary">';
      html += '    <strong>印刷対象:</strong> ' + (selectedItems.size > 0 ? '選択された履歴' : '故障履歴一覧') + '<br>';
      html += '    <strong>印刷日時:</strong> ' + new Date().toLocaleString('ja-JP') + '<br>';
      html += '    <strong>対象件数:</strong> ' + targetItems.length + '件';
      html += '  </div>';
      html += '  <table>';
      html += '    <thead>';
      html += '      <tr>';
      html += '        <th>機種</th>';
      html += '        <th>機械番号</th>';
      html += '        <th>事象</th>';
      html += '        <th>説明</th>';
      html += '        <th>作成日時</th>';
      html += '        <th>画像</th>';
      html += '      </tr>';
      html += '    </thead>';
      html += '    <tbody>';
      html += targetItems.map(item => {
        const jsonData = item.jsonData;
        const machineType =
          jsonData?.machineType ||
          jsonData?.originalChatData?.machineInfo?.machineTypeName ||
          jsonData?.chatData?.machineInfo?.machineTypeName ||
          item.machineType ||
          '';
        const machineNumber =
          jsonData?.machineNumber ||
          jsonData?.originalChatData?.machineInfo?.machineNumber ||
          jsonData?.chatData?.machineInfo?.machineNumber ||
          item.machineNumber ||
          '';
        const incidentTitle =
          jsonData?.title || jsonData?.question || '事象なし';
        const problemDescription =
          jsonData?.problemDescription ||
          jsonData?.answer ||
          '説明なし';
        const imageUrl = pickFirstImage(item);
        return '<tr>' +
          '<td>' + machineType + '</td>' +
          '<td>' + machineNumber + '</td>' +
          '<td>' + incidentTitle + '</td>' +
          '<td>' + problemDescription + '</td>' +
          '<td>' + formatDate(item.createdAt) + '</td>' +
          '<td class="image-cell">' + (imageUrl ? '<img class="thumb" src="' + imageUrl + '" alt="故障画像" onerror="this.style.display=\'none\'; this.nextSibling.style.display=\'inline\';" /><span style="display:none; color: #999; font-size: 10px;">画像読み込みエラー</span>' : 'なし') + '</td>' +
          '</tr>';
      }).join('');
      html += '    </tbody>';
      html += '  </table>';
      html += '  <div class="no-print" style="margin-top: 20px; text-align: center;">';
      html += '    <button onclick="window.close()">閉じる</button>';
      html += '  </div>';
      html += '</body>';
      html += '</html>';
      return html;
    })();

      printWindow.document.write(tableContent);
      printWindow.document.close();

      // 印刷ダイアログを自動的に表示
      setTimeout(() => {
        printWindow.print();
      }, 100);
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <div className='p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-gray-600'>履歴データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // メインコンテンツの表示
  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold mb-2'>履歴管理</h1>
        <p className='text-gray-600'>
          送信されたデータと関連画像の履歴を管理・検索できます
        </p>
      </div>

      {/* 検索・フィルタエリア */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Search className='h-5 w-5' />
            検索フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4'>
            {/* テキスト検索 */}
            <div className='lg:col-span-2'>
              <div className='space-y-2'>
                <Input
                  placeholder='タイトル、機種、事業所、応急処置内容、キーワードなどで検索...'
                  value={filters.searchText}
                  onChange={e =>
                    handleFilterChange('searchText', e.target.value)
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className='w-full'
                />
                <p className='text-xs text-gray-500'>
                  ※
                  複数のキーワードをスペース区切りで入力すると、すべてのキーワードを含む履歴を検索します
                </p>
              </div>
            </div>
            {/* 日付検索 */}
            <div>
              {/* UI表示時に自動取得するためボタンは削除 */}
              <div className='space-y-2'>
                <Input
                  type='date'
                  value={filters.searchDate}
                  onChange={e =>
                    handleFilterChange('searchDate', e.target.value)
                  }
                  className='w-full'
                />
                <p className='text-xs text-gray-500'>
                  ※ 指定した日付の履歴を検索します
                </p>
              </div>
            </div>
            {/* 機種フィルタ */}
            <div>
              <div className='space-y-2'>
                <Select
                  value={filters.machineType || 'all'}
                  onValueChange={value =>
                    handleFilterChange(
                      'machineType',
                      value === 'all' ? '' : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='機種を選択' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>すべての機種</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value='loading' disabled>
                        読み込み中...
                      </SelectItem>
                    ) : searchFilterData.machineTypes &&
                      searchFilterData.machineTypes.length > 0 ? (
                      searchFilterData.machineTypes.map((type, index) => (
                        <SelectItem key={'type-' + index} value={type}>
                          {type}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-data' disabled>
                        データがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機種を取得しています
                    {searchFilterData.machineTypes &&
                      (' (' + searchFilterData.machineTypes.length + '件)')}
                </p>
              </div>
            </div>
            {/* 機械番号フィルタ */}
            <div>
              <div className='space-y-2'>
                <Select
                  value={filters.machineNumber || 'all'}
                  onValueChange={value =>
                    handleFilterChange(
                      'machineNumber',
                      value === 'all' ? '' : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='機械番号を選択' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>すべての機械番号</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value='loading' disabled>
                        読み込み中...
                      </SelectItem>
                    ) : searchFilterData.machineNumbers &&
                      searchFilterData.machineNumbers.length > 0 ? (
                      searchFilterData.machineNumbers.map((number, index) => (
                        <SelectItem key={'number-' + index} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-data' disabled>
                        データがありません
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className='text-xs text-gray-500'>
                  ※ JSONファイルから機械番号を取得しています
                  {searchFilterData.machineNumbers &&
                    (' (' + searchFilterData.machineNumbers.length + '件)')}
                </p>
              </div>
            </div>
          </div>

          <div className='flex gap-2'>
            <Button onClick={handleSearch} className='flex items-center gap-2'>
              <Search className='h-4 w-4' />
              検索
            </Button>
            <Button variant='outline' onClick={clearFilters}>
              フィルタークリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              故障履歴一覧 ({filteredItems.length}件)
            </div>
            <div className='flex items-center gap-2'>
              {/* ファイルローディングUI削除 */}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>

          {filteredItems.length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>履歴データがありません</p>
            </div>
          ) : (
            // テーブル形式表示
            <div className='space-y-4'>
              {/* テーブル */}
              <div className='overflow-x-auto'>
                <table className='w-full border-collapse border border-gray-300'>
                  <thead>
                    <tr className='bg-gray-50'>
                      <th className='border border-gray-300 px-3 py-2 text-center text-sm font-medium'>
                        <input
                          type='checkbox'
                          checked={
                            selectedItems.size === filteredItems.length &&
                            filteredItems.length > 0
                          }
                          onChange={handleSelectAll}
                          className='mr-2 w-6 h-6'
                        />
                        選択
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機種
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        機械番号
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        事象内容
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        作成日時
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        画像
                      </th>
                      <th className='border border-gray-300 px-3 py-2 text-left text-sm font-medium'>
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 履歴アイテムを表示 */}
                    {filteredItems.map((item, index) => {
                      // 新しいフォーマットのデータ構造に合わせて表示
                      const jsonData = item.jsonData;

                      // タイトルを優先的にJSONデータのtitleフィールドから取得
                      let incidentTitle = jsonData?.title || '';

                      // titleがない場合は、ファイル名から事象内容を抽出
                      if (!incidentTitle && item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // ファイル名の最初の部分が事象内容
                          incidentTitle = fileNameParts[0];
                        }
                      }

                      // まだタイトルが取得できない場合は、その他のフィールドから取得
                      if (!incidentTitle) {
                        incidentTitle = jsonData?.question || '事象なし';
                        if (incidentTitle === '事象なし' && jsonData?.chatData?.messages) {
                          // 従来フォーマットの場合、ユーザーメッセージから事象を抽出
                        const userMessages = jsonData.chatData.messages.filter(
                            (msg: any) => !msg.isAiResponse
                        );
                        if (userMessages.length > 0) {
                            // 最初のユーザーメッセージを事象として使用
                          incidentTitle = userMessages[0].content || '事象なし';
                        }
                      }
                      }
                      
                      // まだタイトルがない場合は、デフォルト値を設定
                      if (!incidentTitle) {
                        incidentTitle = '事象なし';
                      }

                      // 機種と機械番号を抽出（APIから返されたデータを優先、次にJSONデータから）
                      const machineType =
                        item.machineType ||
                        item.jsonData?.machineType ||
                        item.jsonData?.chatData?.machineInfo?.machineTypeName ||
                        jsonData?.chatData?.machineInfo?.machineTypeName ||
                        item.machineInfo?.machineTypeName ||
                        '';
                      const machineNumber =
                        item.machineNumber ||
                        item.jsonData?.machineNumber ||
                        item.jsonData?.chatData?.machineInfo?.machineNumber ||
                        jsonData?.chatData?.machineInfo?.machineNumber ||
                        item.machineInfo?.machineNumber ||
                        '';



                      return (
                        <tr
                          key={item.id + '-' + index}
                          className='hover:bg-gray-50 bg-blue-50'
                        >
                          <td className='border border-gray-300 px-3 py-2 text-center text-sm'>
                            <input
                              type='checkbox'
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className='w-6 h-6'
                            />
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {machineType || '-'}
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {machineNumber || '-'}
                          </td>
                          <td
                            className='border border-gray-300 px-3 py-2 text-sm max-w-xs truncate'
                            title={item.jsonData?.title || item.title || incidentTitle}
                          >
                            {(() => {
                              const title = item.jsonData?.title || item.title || incidentTitle;
                              return title.length > 50 ? title.substring(0, 50) + '...' : title;
                            })()}
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-sm'>
                            {formatDate(item.createdAt)}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {(() => {
                              // 画像を取得（複数のソースから）
                              let imageUrl = '';
                              
                              // 1. APIから返されるimages配列から取得（最優先）
                              if ((item as any).images && Array.isArray((item as any).images) && (item as any).images.length > 0) {
                                imageUrl = (item as any).images[0].url || (item as any).images[0].path || (item as any).images[0].fileName || '';
                                console.log('🖼️ [一覧表] images配列から取得:', imageUrl);
                              }
                              
                              // 2. jsonData.savedImagesから取得
                              if (!imageUrl && item.jsonData?.savedImages && Array.isArray(item.jsonData.savedImages) && item.jsonData.savedImages.length > 0) {
                                imageUrl = item.jsonData.savedImages[0].url || item.jsonData.savedImages[0].path || item.jsonData.savedImages[0].fileName || '';
                                console.log('🖼️ [一覧表] savedImagesから取得:', imageUrl);
                              }
                              
                              // 3. jsonData.imagesから取得
                              if (!imageUrl && item.jsonData?.images && Array.isArray(item.jsonData.images) && item.jsonData.images.length > 0) {
                                imageUrl = item.jsonData.images[0].url || item.jsonData.images[0].path || item.jsonData.images[0].fileName || '';
                                console.log('🖼️ [一覧表] jsonData.imagesから取得:', imageUrl);
                              }
                              
                              // 4. chatData.messagesから取得（最優先に変更）
                              if (!imageUrl) {
                                // jsonData.chatData.messagesから取得
                                const chatData = item.jsonData?.chatData || (item as any).chatData;
                                if (chatData?.messages && Array.isArray(chatData.messages)) {
                                  for (const message of chatData.messages) {
                                    if (message.media && Array.isArray(message.media)) {
                                      const media = message.media.find((m: any) => m.type === 'image');
                                      if (media && (media.url || media.path || media.fileName)) {
                                        imageUrl = media.url || media.path || media.fileName || '';
                                        console.log('🖼️ [一覧表] chatData.messagesから取得:', imageUrl, 'message.id:', message.id);
                                        break;
                                      }
                                    }
                                  }
                                }
                                
                                // jsonData.messagesから取得（直接messagesがある場合）
                                if (!imageUrl && item.jsonData?.messages && Array.isArray(item.jsonData.messages)) {
                                  for (const message of item.jsonData.messages) {
                                    if (message.media && Array.isArray(message.media)) {
                                      const media = message.media.find((m: any) => m.type === 'image');
                                      if (media && (media.url || media.path || media.fileName)) {
                                        imageUrl = media.url || media.path || media.fileName || '';
                                        console.log('🖼️ [一覧表] jsonData.messagesから取得:', imageUrl);
                                        break;
                                      }
                                    }
                                  }
                                }
                              }
                              
                              // 5. フォールバック
                              if (!imageUrl) {
                                imageUrl = pickFirstImage(item);
                                if (imageUrl) {
                                  console.log('🖼️ [一覧表] pickFirstImageで推測:', imageUrl);
                                }
                              }
                              
                              // URL正規化とベースURL追加
                              if (imageUrl) {
                                const originalUrl = imageUrl;
                                
                                // /api/api/ を /api/ に正規化
                                imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
                                
                                // knowledge-base\images\chat-exports パス対応
                                if (imageUrl.includes('knowledge-base\\images\\chat-exports') || imageUrl.includes('knowledge-base/images/chat-exports')) {
                                  const fileName = imageUrl.split(/[\\/]/).pop();
                                  imageUrl = '/api/images/chat-exports/' + fileName;
                                }
                                
                                // 相対パスの場合はベースURLを追加
                                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
                                  // /api/ で始まらない場合は /api/images/chat-exports/ を追加
                                  if (!imageUrl.startsWith('/api/')) {
                                    // fileNameから直接生成
                                    const fileName = imageUrl.split(/[\\/]/).pop() || imageUrl;
                                    imageUrl = `/api/images/chat-exports/${fileName}`;
                                  }
                                }
                                
                                if (originalUrl !== imageUrl) {
                                  console.log(`🖼️ [一覧表] URL正規化: ${originalUrl} -> ${imageUrl}`);
                                }
                              }
                              
                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt='画像'
                                    className='w-8 h-8 object-cover rounded border'
                                    title='故障画像'
                                    onError={e => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      console.error('🖼️ [一覧表] 画像読み込みエラー:', imageUrl, 'item.id:', item.id);
                                    }}
                                    onLoad={() => {
                                      console.log('🖼️ [一覧表] 画像読み込み成功:', imageUrl);
                                    }}
                                  />
                                );
                              }
                              console.log('🖼️ [一覧表] 画像URLが見つかりません item.id:', item.id);
                              return <span className='text-gray-500'>-</span>;
                            })()}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleOpenEdit(normalizeJsonData(item))}
                                className='flex items-center gap-1 text-xs'
                                title='編集画面を開く'
                              >
                                <Settings className='h-3 w-3' />
                                編集
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setDeleteConfirm({
                                    show: true,
                                    id: item.id,
                                    title: incidentTitle,
                                  });
                                }}
                                className='flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50'
                                title='履歴を削除'
                              >
                                <Trash2 className='h-3 w-3' />
                                削除
                              </Button>
                            </div>
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

      {/* エクスポート処理エリア */}
      <div className='bg-white rounded-lg shadow p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-bold'>エクスポート処理</h2>
        </div>

        <div className='flex flex-wrap gap-4 mb-4'>
          {/* 選択履歴エクスポート */}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をJSONエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant='default'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              選択履歴をCSVエクスポート ({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant='outline'
              className='flex items-center gap-2'
            >
              <FileText className='h-4 w-4' />
              選択の一覧を印刷 ({selectedItems.size})
            </Button>
          </div>

          {/* 全履歴エクスポート */}
          <div className='flex gap-2'>
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をJSONエクスポート
            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant='secondary'
              className='flex items-center gap-2'
            >
              <Download className='h-4 w-4' />
              全履歴をCSVエクスポート
            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className='flex items-center gap-2 text-blue-600'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            エクスポート処理中...
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className='flex justify-center mt-6'>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              前へ
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page =
                Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}

            <Button
              variant='outline'
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
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-bold'>履歴プレビュー</h2>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => {
                      // generateMachineFailureReportHTMLで印刷用HTMLを生成
                      try {
                        const jsonData = previewItem.jsonData || {};
                        const reportData = {
                          reportId: previewItem.id || `R${Date.now().toString().slice(-5)}`,
                          machineId: previewItem.machineNumber || '不明',
                          date: new Date(previewItem.createdAt).toISOString().split('T')[0],
                          location: '○○線',
                          failureCode: 'FC01',
                          description: previewItem.incidentTitle || previewItem.title || '説明なし',
                          status: '報告完了',
                          engineer: 'システム管理者',
                          notes: `事象タイトル: ${previewItem.incidentTitle || previewItem.title || ''}\n機種: ${previewItem.machineType}\n機械番号: ${previewItem.machineNumber}\n作成日時: ${formatDate(previewItem.createdAt)}`,
                          repairRequestDate: new Date().toISOString().split('T')[0],
                          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          repairLocation: '工場内修理スペース',
                          images: (previewItem as any).images || [],
                          savedImages: (previewItem as any).images || jsonData.savedImages || [],
                          chatData: jsonData.chatData || undefined,
                          conversationHistory: jsonData.conversationHistory || undefined,
                          machineType: previewItem.machineType || '',
                          machineNumber: previewItem.machineNumber || '',
                          title: previewItem.incidentTitle || previewItem.title || '',
                          problemDescription: previewItem.problemDescription || previewItem.incidentTitle || '',
                          id: previewItem.id,
                          chatId: previewItem.chatId || previewItem.id,
                          createdAt: previewItem.createdAt,
                        };
                        
                        // HTML生成
                        const html = generateMachineFailureReportHTML(reportData);
                        
                        // 新しいウィンドウを開く
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(html);
                          printWindow.document.close();
                          
                          // HTML内のスクリプトが自動的に画像読み込み完了後に印刷を実行する
                          // ここでは印刷を呼ばない（HTML内のwaitForImagesAndPrintが実行される）
                        } else {
                          alert('印刷プレビューウィンドウを開けませんでした。ポップアップブロッカーを無効にしてください。');
                        }
                      } catch (error) {
                        console.error('印刷プレビュー生成エラー:', error);
                        alert(`印刷プレビュー生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    className='flex items-center gap-2'
                  >
                    <FileText className='h-4 w-4' />
                    印刷
                  </Button>
                  <Button
                    onClick={() => {
                      const normalizedItem = normalizeJsonData(previewItem);
                      setEditingItem(normalizedItem);
                      setShowPreviewDialog(false);
                      setShowEditDialog(true);
                    }}
                    className='flex items-center gap-2'
                  >
                    <Settings className='h-4 w-4' />
                    編集に移動
                  </Button>
                  <Button
                    variant='ghost'
                    onClick={() => setShowPreviewDialog(false)}
                  >
                    ×
                  </Button>
                </div>
              </div>

              <div className='space-y-6'>
                {/* レポートヘッダー */}
                <div className='text-center border-b pb-4'>
                  <h1 className='text-2xl font-bold mb-2'>
                    応急処置サポート履歴
                  </h1>
                  <p className='text-sm text-gray-500'>
                    作成日時: {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 基本情報 */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <h3 className='text-lg font-semibold mb-3'>基本情報</h3>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Settings className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>機種:</strong> {previewItem.machineType}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>機械番号:</strong> {previewItem.machineNumber}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Calendar className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>作成日時:</strong>{' '}
                          {formatDate(previewItem.createdAt)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Image className='h-4 w-4 text-gray-500' />
                        <span>
                          <strong>画像:</strong>{' '}
                          {previewItem.imagePath ? 'あり' : 'なし'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 関連画像（複数対応・横3列グリッド表示） */}
                  {(() => {
                    // 複数のソースから画像を収集
                    const allImages: any[] = [];
                    
                    // 1. APIから返されるimages配列（最優先）
                    if ((previewItem as any).images && Array.isArray((previewItem as any).images)) {
                      allImages.push(...(previewItem as any).images);
                    }
                    
                    // 2. jsonData.savedImagesから
                    if (previewItem?.jsonData?.savedImages && Array.isArray(previewItem.jsonData.savedImages)) {
                      allImages.push(...previewItem.jsonData.savedImages);
                    }
                    
                    // 3. chatData.messagesから
                    if (previewItem?.jsonData?.chatData?.messages) {
                      for (const message of previewItem.jsonData.chatData.messages) {
                        if (message.media && Array.isArray(message.media)) {
                          for (const media of message.media) {
                            if (media.type === 'image') {
                              allImages.push(media);
                            }
                          }
                        }
                      }
                    }
                    
                    // 重複を除外
                    const uniqueImages = Array.from(
                      new Map(allImages.map(img => [img.url || img.path || img.fileName, img])).values()
                    );
                    
                    if (uniqueImages.length > 0) {
                      return (
                        <div>
                          <h3 className='text-lg font-semibold mb-3'>関連画像（{uniqueImages.length}枚）</h3>
                          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                            {uniqueImages.map((img: any, idx: number) => {
                              let imageUrl = img.url || img.path || img.fileName || '';
                              
                              // URL正規化とベースURL追加
                              if (imageUrl) {
                                // /api/api/ を /api/ に正規化
                                imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
                                // knowledge-base\images\chat-exports パス対応
                                if (imageUrl.includes('knowledge-base\\images\\chat-exports') || imageUrl.includes('knowledge-base/images/chat-exports')) {
                                  const fileName = imageUrl.split(/[\\/]/).pop();
                                  imageUrl = '/api/images/chat-exports/' + fileName;
                                }
                                // 相対パスの場合はベースURLを追加
                                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
                                  // /api/ で始まる場合はそのまま、それ以外は /api/images/chat-exports/ を追加
                                  if (!imageUrl.startsWith('/api/')) {
                                    imageUrl = '/api/images/chat-exports/' + imageUrl;
                                  }
                                }
                              }
                              
                              return (
                                <div key={img.url || img.fileName || idx} className='text-center'>
                                  <img
                                    src={imageUrl}
                                    alt={img.fileName || ('履歴画像' + (idx+1))}
                                    className='w-full h-48 object-cover rounded-md'
                                    onError={e => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.opacity = '0.3';
                                      target.alt = '画像が表示できません';
                                      console.error('画像読み込みエラー:', imageUrl);
                                    }}
                                  />
                                  <div style={{fontSize:'12px',color:'#888',marginTop:'4px'}}>{img.fileName || ''}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 詳細情報 */}
                <div>
                  <h3 className='text-lg font-semibold mb-3'>詳細情報</h3>
                  <div className='bg-gray-50 p-4 rounded-md'>
                    <pre className='text-sm overflow-auto max-h-64'>
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
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          {/* 通常画面では編集ダイアログ、印刷時はA4書類レイアウトのみ表示 */}
          <div className='bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-auto block print:hidden'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-bold'>履歴編集</h2>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => {
                      // generateMachineFailureReportHTMLで印刷用HTMLを生成
                      try {
                        const jsonData = editingItem.jsonData || {};
                        const reportData = {
                          reportId: editingItem.id || `R${Date.now().toString().slice(-5)}`,
                          machineId: editingItem.machineNumber || '不明',
                          date: new Date(editingItem.createdAt).toISOString().split('T')[0],
                          location: '○○線',
                          failureCode: 'FC01',
                          description: editingItem.incidentTitle || editingItem.title || '説明なし',
                          status: '報告完了',
                          engineer: 'システム管理者',
                          notes: `事象タイトル: ${editingItem.incidentTitle || editingItem.title || ''}\n機種: ${editingItem.machineType}\n機械番号: ${editingItem.machineNumber}\n作成日時: ${formatDate(editingItem.createdAt)}`,
                          repairRequestDate: new Date().toISOString().split('T')[0],
                          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          repairLocation: '工場内修理スペース',
                          images: (editingItem as any).images || [],
                          savedImages: (editingItem as any).images || jsonData.savedImages || [],
                          chatData: jsonData.chatData || undefined,
                          conversationHistory: jsonData.conversationHistory || undefined,
                          machineType: editingItem.machineType || '',
                          machineNumber: editingItem.machineNumber || '',
                          title: editingItem.incidentTitle || editingItem.title || '',
                          problemDescription: editingItem.problemDescription || editingItem.incidentTitle || '',
                          id: editingItem.id,
                          chatId: editingItem.chatId || editingItem.id,
                          createdAt: editingItem.createdAt,
                        };
                        
                        // HTML生成
                        const html = generateMachineFailureReportHTML(reportData);
                        
                        // 新しいウィンドウを開く
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(html);
                          printWindow.document.close();
                          
                          // HTML内のスクリプトが自動的に画像読み込み完了後に印刷を実行する
                          // ここでは印刷を呼ばない（HTML内のwaitForImagesAndPrintが実行される）
                        } else {
                          alert('印刷プレビューウィンドウを開けませんでした。ポップアップブロッカーを無効にしてください。');
                        }
                      } catch (error) {
                        console.error('印刷プレビュー生成エラー:', error);
                        alert(`印刷プレビュー生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    className='flex items-center gap-2'
                  >
                    <FileText className='h-4 w-4' />
                    印刷
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => setShowEditDialog(false)}
                  >
                    閉じる
                  </Button>
                </div>
              </div>

              {/* 基本情報編集 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                <div>
                  <h3 className='text-lg font-semibold mb-3'>基本情報</h3>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        機種
                      </label>
                      <Input
                        value={editingItem.machineType || ''}
                        onChange={(e) => {
                          setEditingItem(prev => prev ? {
                            ...prev,
                            machineType: e.target.value,
                            jsonData: {
                              ...prev.jsonData,
                              machineType: e.target.value
                            }
                          } : null);
                        }}
                        placeholder='機種を入力'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        機械番号
                      </label>
                      <Input
                        value={editingItem.machineNumber || ''}
                        onChange={(e) => {
                          setEditingItem(prev => prev ? {
                            ...prev,
                            machineNumber: e.target.value,
                            jsonData: {
                              ...prev.jsonData,
                              machineNumber: e.target.value
                            }
                          } : null);
                        }}
                        placeholder='機械番号を入力'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        タイトル
                      </label>
                      <Input
                        value={editingItem.jsonData?.title || editingItem.title || ''}
                        onChange={(e) => {
                          setEditingItem(prev => prev ? {
                            ...prev,
                            title: e.target.value,
                            jsonData: {
                              ...prev.jsonData,
                              title: e.target.value
                            }
                          } : null);
                        }}
                        placeholder='タイトルを入力'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        発生事象及び処置説明
                      </label>
                      <textarea
                        value={editingItem.jsonData?.problemDescription || ''}
                        onChange={(e) => {
                          setEditingItem(prev => prev ? {
                            ...prev,
                            jsonData: {
                              ...prev.jsonData,
                              problemDescription: e.target.value
                            }
                          } : null);
                        }}
                        placeholder='発生事象及び処置の詳細を入力'
                        className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        留置個所
                      </label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={(e) => {
                          setEditingItem(prev => prev ? {
                            ...prev,
                            jsonData: {
                              ...prev.jsonData,
                              location: e.target.value
                            }
                          } : null);
                        }}
                        placeholder='留置個所を入力'
                      />
                    </div>
                  </div>
                </div>

                {/* 関連画像表示 */}
                <div>
                  <h3 className='text-lg font-semibold mb-3'>関連画像</h3>
                  <div className='space-y-4'>
                    {(() => {
                      // 複数のソースから画像を収集
                      const allImages: any[] = [];
                      
                      console.log('🖼️ [編集画面] 画像収集開始');
                      
                      // 1. APIから返されるimages配列（最優先）
                      if ((editingItem as any).images && Array.isArray((editingItem as any).images)) {
                        console.log('🖼️ [編集画面] images配列:', (editingItem as any).images.length + '件');
                        allImages.push(...(editingItem as any).images);
                      }
                      
                      // 2. jsonData.imagesから
                      if (editingItem.jsonData?.images && Array.isArray(editingItem.jsonData.images)) {
                        console.log('🖼️ [編集画面] jsonData.images:', editingItem.jsonData.images.length + '件');
                        allImages.push(...editingItem.jsonData.images);
                      }
                      
                      // 3. jsonData.savedImagesから
                      if (editingItem.jsonData?.savedImages && Array.isArray(editingItem.jsonData.savedImages)) {
                        console.log('🖼️ [編集画面] savedImages:', editingItem.jsonData.savedImages.length + '件');
                        allImages.push(...editingItem.jsonData.savedImages);
                      }
                      
                      // 4. chatData.messagesから
                      if (editingItem.jsonData?.chatData?.messages) {
                        console.log('🖼️ [編集画面] chatData.messagesを確認中');
                        for (const message of editingItem.jsonData.chatData.messages) {
                          if (message.media && Array.isArray(message.media)) {
                            for (const media of message.media) {
                              if (media.type === 'image') {
                                console.log('🖼️ [編集画面] chatData.messagesから画像発見:', media.url || media.fileName);
                                allImages.push(media);
                              }
                            }
                          }
                        }
                      }
                      
                      console.log('🖼️ [編集画面] 収集した画像数:', allImages.length);
                      
                      // 重複を除外（URL/パスで判定）
                      const uniqueImages = Array.from(
                        new Map(allImages.map(img => {
                          const key = img.url || img.path || img.fileName || '';
                          return [key, img];
                        })).values()
                      );
                      
                      console.log('🖼️ [編集画面] 重複除外後の画像数:', uniqueImages.length);
                      
                      if (uniqueImages.length > 0) {
                        return (
                          <div className='grid grid-cols-3 gap-4'>
                            {uniqueImages.map((img: any, index: number) => {
                              let imageUrl = img.url || img.path || img.fileName || '';
                              const originalUrl = imageUrl;
                              
                              // URL正規化とベースURL追加
                              if (imageUrl) {
                                // /api/api/ を /api/ に正規化
                                imageUrl = imageUrl.replace(/\/api\/api\//g, '/api/');
                                
                                // knowledge-base\images\chat-exports パス対応
                                if (imageUrl.includes('knowledge-base\\images\\chat-exports') || imageUrl.includes('knowledge-base/images/chat-exports')) {
                                  const fileName = imageUrl.split(/[\\/]/).pop();
                                  imageUrl = '/api/images/chat-exports/' + fileName;
                                }
                                
                                // 相対パスの場合はベースURLを追加
                                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
                                  // /api/ で始まらない場合は /api/images/chat-exports/ を追加
                                  if (!imageUrl.startsWith('/api/')) {
                                    const fileName = img.fileName || imageUrl.split(/[\\/]/).pop() || imageUrl;
                                    imageUrl = `/api/images/chat-exports/${fileName}`;
                                  }
                                }
                                
                                if (originalUrl !== imageUrl) {
                                  console.log(`🖼️ [編集画面] URL正規化: ${originalUrl} -> ${imageUrl}`);
                                }
                              }
                              
                              return (
                                <div key={index} className='text-center'>
                                  <img
                                    src={imageUrl}
                                    alt={img.fileName || img.title || ('画像' + (index + 1))}
                                    className='w-full h-32 object-cover rounded border'
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      console.error('🖼️ [編集画面] 画像読み込みエラー:', imageUrl);
                                    }}
                                    onLoad={() => {
                                      console.log('🖼️ [編集画面] 画像読み込み成功:', imageUrl);
                                    }}
                                  />
                                  <p className='text-xs text-gray-500 mt-1'>{img.fileName || img.title || ''}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      console.log('🖼️ [編集画面] 画像が見つかりません');
                      return <p className='text-gray-500'>画像なし</p>;
                    })()}
                  </div>
                </div>
              </div>

              {/* 修繕計画セクション */}
              <div className='mb-6 mt-6 border-t pt-6'>
                <h3 className='text-lg font-semibold mb-4'>修繕計画</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      修繕予定月日
                    </label>
                    <Input
                      type='date'
                      value={editingItem.jsonData?.repairSchedule || ''}
                      onChange={(e) => {
                        setEditingItem(prev => prev ? {
                          ...prev,
                          jsonData: {
                            ...prev.jsonData,
                            repairSchedule: e.target.value
                          }
                        } : null);
                      }}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      箇所 <span className='text-xs text-gray-500'>(20文字まで)</span>
                    </label>
                    <Input
                      value={editingItem.jsonData?.repairLocation || ''}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 20);
                        setEditingItem(prev => prev ? {
                          ...prev,
                          jsonData: {
                            ...prev.jsonData,
                            repairLocation: value
                          }
                        } : null);
                      }}
                      placeholder='修繕箇所を入力'
                      maxLength={20}
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      処置内容 <span className='text-xs text-gray-500'>(200文字まで)</span>
                    </label>
                    <textarea
                      value={editingItem.jsonData?.repairDetails || ''}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 200);
                        setEditingItem(prev => prev ? {
                          ...prev,
                          jsonData: {
                            ...prev.jsonData,
                            repairDetails: value
                          }
                        } : null);
                      }}
                      placeholder='処置内容を入力'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      rows={4}
                      maxLength={200}
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      特記事項 <span className='text-xs text-gray-500'>(100文字まで)</span>
                    </label>
                    <textarea
                      value={editingItem.jsonData?.repairNotes || ''}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 100);
                        setEditingItem(prev => prev ? {
                          ...prev,
                          jsonData: {
                            ...prev.jsonData,
                            repairNotes: value
                          }
                        } : null);
                      }}
                      placeholder='特記事項を入力'
                      className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                      rows={3}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              {/* 保存ボタン */}
              <div className='flex justify-end gap-2 pt-4 border-t mt-4' style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type='button'
                  onClick={() => setShowEditDialog(false)}
                  className='px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50'
                  style={{ display: 'inline-block', visibility: 'visible', opacity: 1 }}
                >
                  キャンセル
                </button>
                <button
                  type='button'
                  onClick={async () => {
                    console.log('💾 保存ボタンがクリックされました');
                    if (!editingItem) {
                      console.error('❌ editingItemがnullです');
                      alert('編集アイテムが見つかりません。');
                      return;
                    }
                    console.log('💾 保存処理を開始:', editingItem);
                    try {
                      await handleSaveEditedItem(editingItem);
                    } catch (error) {
                      console.error('保存エラー:', error);
                      alert('保存中にエラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
                    }
                  }}
                  className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                  style={{ display: 'inline-block !important', visibility: 'visible !important', opacity: 1, minWidth: '80px', fontWeight: 'bold' }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
          {/* PrintMachineFailureReport component removed - not defined */}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm.show && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold mb-4 text-red-600'>履歴削除の確認</h3>
            <p className='text-gray-700 mb-6'>
              以下の履歴を削除しますか？この操作は取り消せません。
            </p>
            <div className='bg-gray-50 p-3 rounded-lg mb-6'>
              <p className='font-medium text-sm text-gray-800'>
                {deleteConfirm.title}
              </p>
            </div>
            <div className='flex justify-end gap-3'>
              <Button
                variant='outline'
                onClick={() =>
                  setDeleteConfirm({
                    show: false,
                    id: '',
                    title: '',
                  })
                }
              >
                キャンセル
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleDeleteHistory(deleteConfirm.id)}
                className='bg-red-600 hover:bg-red-700'
              >
                削除する
              </Button>
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
          onPrint={reportData => {
            console.log('チャットエクスポートレポートを印刷:', reportData);
            window.print();
          }}
        />
      )}





    </div>
  );
}

export default HistoryPage;
